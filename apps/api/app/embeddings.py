# ============================================================
# Recherche sémantique locale (le « R » de RAG).
#
# Un petit modèle d'embedding tourne ICI, sur le serveur du TD : aucune
# donnée ne part vers un tiers pour la recherche, et la séance fonctionne
# même sans accès Internet une fois l'image construite.
#
# Pourquoi des embeddings plutôt qu'une recherche par mots-clés : mesuré
# sur la recommandation SPILF, la question « PNA communautaire sans signe
# de gravité » doit ramener le chapitre « PNA SIMPLE » — un mot que la
# question ne contient jamais. La recherche lexicale ne le trouvait pas
# (absent du top 5) ; les embeddings le classent 2e.
#
# Modèle : intfloat/multilingual-e5-small, ONNX quantifié (~118 Mo).
# Il est VOLONTAIREMENT hors du dépôt (voir README) : on ne versionne pas
# 118 Mo de poids. Il est téléchargé à la construction de l'image, ou par
# `scripts/fetch_model.py` en développement.
#
# Si le modèle est absent, le service se désactive proprement et le front
# retombe sur sa recherche lexicale : une séance ne doit jamais être
# bloquée par une dépendance optionnelle.
# ============================================================

from __future__ import annotations

import os
from pathlib import Path

import numpy as np

# Emplacement des poids. Dans l'image Docker, ils sont copiés à cet endroit
# au build ; en local, `scripts/fetch_model.py` les y dépose aussi.
MODEL_DIR = Path(os.environ.get("EMBED_MODEL_DIR", "/models/multilingual-e5-small"))

# e5 attend des préfixes explicites : le modèle a été entraîné ainsi, et les
# omettre dégrade nettement la pertinence.
QUERY_PREFIX = "query: "
PASSAGE_PREFIX = "passage: "

MAX_TOKENS = 512
BATCH = 16


class Embedder:
    """Encodeur de phrases. Chargé une fois, réutilisé pour toute la séance."""

    def __init__(self) -> None:
        self._session = None
        self._tokenizer = None
        self._inputs: set[str] = set()
        self.error: str | None = None

    @property
    def ready(self) -> bool:
        return self._session is not None

    def load(self) -> None:
        """Charge le modèle. Toute erreur est capturée : le service reste optionnel."""
        try:
            import onnxruntime as ort
            from tokenizers import Tokenizer
        except ImportError as exc:  # pragma: no cover - dépend de l'installation
            self.error = f"dépendance manquante ({exc.name})"
            return

        model_path = MODEL_DIR / "model.onnx"
        tokenizer_path = MODEL_DIR / "tokenizer.json"
        if not model_path.exists() or not tokenizer_path.exists():
            self.error = f"modèle absent de {MODEL_DIR}"
            return

        try:
            options = ort.SessionOptions()
            # Le serveur du TD partage sa machine avec Ollama : on limite
            # l'appétit en threads pour ne pas lui prendre tous les cœurs.
            options.intra_op_num_threads = int(os.environ.get("EMBED_THREADS", "2"))
            self._session = ort.InferenceSession(
                str(model_path),
                options,
                providers=["CPUExecutionProvider"],
            )
            self._inputs = {i.name for i in self._session.get_inputs()}
            self._tokenizer = Tokenizer.from_file(str(tokenizer_path))
            self._tokenizer.enable_truncation(max_length=MAX_TOKENS)
            self._tokenizer.enable_padding()
        except Exception as exc:  # pragma: no cover - défensif au démarrage
            self._session = None
            self.error = f"chargement impossible : {exc}"

    def encode(self, texts: list[str], prefix: str) -> np.ndarray:
        """Vecteurs normalisés (une ligne par texte)."""
        if not self.ready or self._tokenizer is None or self._session is None:
            raise RuntimeError("modèle d'embedding indisponible")

        out: list[np.ndarray] = []
        for start in range(0, len(texts), BATCH):
            batch = [prefix + t for t in texts[start : start + BATCH]]
            encoded = self._tokenizer.encode_batch(batch)
            ids = np.array([e.ids for e in encoded], dtype=np.int64)
            mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)

            feed: dict[str, np.ndarray] = {"input_ids": ids, "attention_mask": mask}
            # Certains exports ONNX exigent token_type_ids même quand le
            # modèle n'en fait rien : on fournit des zéros plutôt que d'échouer.
            if "token_type_ids" in self._inputs:
                feed["token_type_ids"] = np.zeros_like(ids)

            hidden = self._session.run(None, {k: v for k, v in feed.items() if k in self._inputs})[0]
            # Moyenne pondérée par le masque : les tokens de remplissage ne
            # doivent pas peser dans le vecteur de la phrase.
            weights = mask[..., None].astype(np.float32)
            pooled = (hidden * weights).sum(axis=1) / np.clip(weights.sum(axis=1), 1e-9, None)
            norms = np.linalg.norm(pooled, axis=1, keepdims=True)
            out.append(pooled / np.clip(norms, 1e-9, None))

        return np.vstack(out)


embedder = Embedder()

# Vecteurs des passages, mémorisés d'une question à l'autre.
#
# Sans ce cache, chaque question ré-encodait les 94 sections du document :
# mesuré à 18 s par requête, inutilisable en séance. Les passages, eux, ne
# changent pas — seule la question change. Après mise en cache, il ne reste
# qu'un seul texte à encoder.
#
# Un seul document à la fois suffit : le TD n'en propose que trois, et
# l'étudiant n'en joint qu'un. La clé est une empreinte du contenu, donc
# joindre un autre document invalide naturellement le cache.
_cache_key: int | None = None
_cache_vectors: np.ndarray | None = None


def _passage_vectors(passages: list[str]) -> np.ndarray:
    global _cache_key, _cache_vectors
    key = hash(tuple(passages))
    if key == _cache_key and _cache_vectors is not None:
        return _cache_vectors
    vectors = embedder.encode(passages, PASSAGE_PREFIX)
    _cache_key, _cache_vectors = key, vectors
    return vectors


def rank(
    question: str,
    passages: list[str],
    budget_tokens: int,
    max_results: int = 5,
) -> list[dict[str, float | int]]:
    """
    Classe les passages par proximité de SENS avec la question, puis en
    retient autant que le budget le permet.

    Le classement complet est renvoyé au front, qui décide quoi garder :
    c'est lui qui connaît la structure du document (pages, sections) et qui
    doit pouvoir montrer à l'étudiant ce qui a été retenu, et pourquoi.
    """
    if not passages:
        return []

    doc_vectors = _passage_vectors(passages)
    query_vector = embedder.encode([question], QUERY_PREFIX)[0]
    scores = doc_vectors @ query_vector

    order = np.argsort(-scores)
    kept: list[dict[str, float | int]] = []
    used = 0
    for index in order:
        # Le coût en tokens est estimé ici comme côté front (≈4 caractères
        # par token) : c'est un budget, pas une facture.
        cost = max(1, len(passages[int(index)]) // 4)
        if used + cost > budget_tokens:
            continue
        kept.append({"index": int(index), "score": float(scores[index])})
        used += cost
        if len(kept) >= max_results:
            break
    return kept

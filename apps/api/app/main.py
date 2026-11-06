# ============================================================
# Backend du TD « Chatbots médicaux ».
#
# Rôle : PROXY entre le front (site statique, apps/web) et un fournisseur
# de modèles (OpenRouter ou Eden AI, au choix via LLM_PROVIDER). La clé
# API reste ICI, côté serveur, dans une variable d'environnement — elle
# n'est JAMAIS envoyée au navigateur.
#
# Le front POST vers :
#   /api/chat  { model, prompt, rag_context? } -> { text }
#   /api/rag   { model, prompt, chunks[] }     -> { text }
#
# Ces deux routes appellent le fournisseur avec la clé du serveur et
# renvoient uniquement le texte de la réponse.
# ============================================================

import asyncio
import json
import os
import random
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from .embeddings import embedder, rank

REQUEST_TIMEOUT_S = 90.0

# --- Configuration via variables d'environnement -------------------

# Le front envoie toujours les slugs OpenRouter (`google/gemma-3-4b-it`) :
# chez Eden, les mêmes modèles portent d'autres noms, traduits ici.
# Le préfixe dit qui fait tourner le modèle : scaleway/ en France,
# azure/…@eu dans l'UE, amazon/google.gemma… sur AWS région UE.
PROVIDERS: dict[str, dict[str, object]] = {
    "openrouter": {
        "label": "OpenRouter",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key_env": "OPENROUTER_API_KEY",
        "model_map": {},
    },
    "edenai": {
        "label": "Eden AI",
        "url": "https://api.edenai.run/v3/chat/completions",
        "key_env": "EDENAI_API_KEY",
        "model_map": {
            "google/gemma-3-4b-it": "amazon/google.gemma-3-4b-it",
            "meta-llama/llama-3.3-70b-instruct": "scaleway/llama-3.3-70b-instruct",
            "openai/gpt-6-luna": "azure/gpt-6-luna@eu",
        },
    },
}

PROVIDER_ID = os.environ.get("LLM_PROVIDER", "openrouter").strip().lower()
if PROVIDER_ID not in PROVIDERS:
    raise RuntimeError(f"LLM_PROVIDER inconnu : {PROVIDER_ID} (attendu : {', '.join(PROVIDERS)})")
PROVIDER = PROVIDERS[PROVIDER_ID]
PROVIDER_LABEL = str(PROVIDER["label"])
PROVIDER_URL = str(PROVIDER["url"])

# Clé du fournisseur choisi. Sans elle le serveur démarre quand même (la
# recherche sémantique et le site restent servis), mais chaque appel à un
# modèle répond 503.
API_KEY = os.environ.get(str(PROVIDER["key_env"]), "").strip()

# Correspondances supplémentaires ou corrigées, sans toucher au code :
# MODEL_MAP="google/gemma-3-4b-it=deepinfra/google/gemma-3-4b-it,…"
MODEL_MAP: dict[str, str] = {
    **PROVIDER["model_map"],  # type: ignore[dict-item]
    **{
        k.strip(): v.strip()
        for k, _, v in (
            pair.partition("=") for pair in os.environ.get("MODEL_MAP", "").split(",")
        )
        if k.strip() and v.strip()
    },
}

# Un fournisseur refuse en 429 au-delà de son débit (Eden : environ 10
# requêtes/s par compte). En salle, 20 postes qui envoient au même signal
# le dépassent : mesuré le 2026-10-14, 38 requêtes sur 60 refusées en
# rafale, toutes passées en 3 tentatives espacées d'une à deux secondes.
RATE_LIMIT_RETRIES = 5

# Origines autorisées (CORS). En prod, mettre l'URL exacte du site,
# ex. "https://teaching-resources-96e174.frama.io". Plusieurs valeurs
# séparées par des virgules.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

# En développement, le port du serveur Vite varie (3000, 3001… selon ce
# qui est déjà occupé). Ce motif autorise n'importe quel port local sans
# avoir à les énumérer. Mettre ALLOW_LOCALHOST_ANY_PORT=0 pour le
# désactiver — à faire en production, où seul ALLOWED_ORIGINS doit valoir.
ALLOW_LOCALHOST_ANY_PORT = os.environ.get("ALLOW_LOCALHOST_ANY_PORT", "1") != "0"
LOCALHOST_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1):\d+"

# En-têtes recommandés par OpenRouter (facultatifs, pour l'attribution ;
# les autres fournisseurs les ignorent).
# Les en-têtes HTTP doivent être en ASCII : on translittère les accents.
def _ascii_header(value: str) -> str:
    return value.encode("ascii", "ignore").decode("ascii").strip()


HTTP_REFERER = _ascii_header(
    os.environ.get("SITE_URL", "https://teaching-resources-96e174.frama.io")
)
X_TITLE = _ascii_header(
    os.environ.get("SITE_NAME", "Ressources pedagogiques - TD chatbots")
)

# Liste blanche des modèles appelables, pour éviter qu'un client
# détourne le proxy vers des modèles coûteux non prévus par le TD.
# Vide = pas de restriction (déconseillé en prod).
ALLOWED_MODELS = {
    m.strip()
    for m in os.environ.get("ALLOWED_MODELS", "").split(",")
    if m.strip()
}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Charge le modèle d'embedding au démarrage, s'il est présent.

    Son absence n'est PAS une erreur : la recherche sémantique est une
    fonctionnalité optionnelle du TD, et le front sait s'en passer.
    """
    embedder.load()
    yield


app = FastAPI(title=f"TD Chatbots médicaux — proxy {PROVIDER_LABEL}", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=LOCALHOST_ORIGIN_REGEX if ALLOW_LOCALHOST_ANY_PORT else None,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# --- Schémas -------------------------------------------------------


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatIn(BaseModel):
    model: str = Field(..., description="Slug OpenRouter, ex. qwen/qwen3-8b (traduit pour les autres fournisseurs)")
    prompt: str = Field(..., min_length=1)
    rag_context: str | None = Field(default=None)
    # System prompt du TD. Envoyé par le front pour que les étudiants
    # puissent le LIRE (bouton dédié) : c'est un objet pédagogique.
    system: str | None = Field(default=None)
    # Échanges précédents, renvoyés à CHAQUE appel : c'est ainsi qu'un
    # modèle « se souvient ». Étape « La mémoire ». Borné pour éviter
    # qu'un historique aberrant ne parte vers le fournisseur.
    history: list[HistoryMessage] = Field(default_factory=list, max_length=100)
    # Réglages d'échantillonnage. Manipulés par l'étudiant à l'étape
    # « Les réglages » ; ailleurs, le défaut du TD s'applique.
    temperature: float | None = Field(default=None, ge=0, le=2)
    top_p: float | None = Field(default=None, gt=0, le=1)
    top_k: int | None = Field(default=None, ge=0)


# Température par défaut : 0,7, proche du comportement d'un ChatGPT
# grand public. Deux appels identiques peuvent donc diverger — c'est
# volontaire, et c'est le sujet d'une étape entière du TD.
DEFAULT_TEMPERATURE = 0.7


class RagIn(BaseModel):
    model: str = Field(..., description="Slug OpenRouter")
    prompt: str = Field(..., min_length=1)
    chunks: list[str] = Field(default_factory=list)


class ChatOut(BaseModel):
    text: str


# --- Appel au fournisseur ------------------------------------------


def _guard_startup() -> None:
    if not API_KEY:
        raise HTTPException(
            status_code=503,
            detail=f"Le serveur n'a pas de clé {PROVIDER_LABEL} (variable {PROVIDER['key_env']}).",
        )


def _guard_model(model: str) -> None:
    if ALLOWED_MODELS and model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Modèle non autorisé : {model}")


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": HTTP_REFERER,
        "X-Title": X_TITLE,
    }


async def _backoff() -> None:
    # Le hasard évite que les requêtes refusées ensemble repartent ensemble.
    await asyncio.sleep(1 + random.random())


async def _call_provider(
    model: str,
    messages: list[dict[str, str]],
    sampling: dict[str, object] | None = None,
) -> str:
    _guard_startup()
    _guard_model(model)

    payload = {
        "model": MODEL_MAP.get(model, model),
        "messages": messages,
        **(sampling or {"temperature": DEFAULT_TEMPERATURE}),
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
            for attempt in range(RATE_LIMIT_RETRIES + 1):
                res = await client.post(PROVIDER_URL, headers=_headers(), json=payload)
                if res.status_code != 429 or attempt == RATE_LIMIT_RETRIES:
                    break
                await _backoff()
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"{PROVIDER_LABEL} injoignable : {exc}") from exc

    if res.status_code != 200:
        # On ne renvoie PAS le corps brut du fournisseur au client (peut
        # contenir des détails de compte) : message générique + code.
        raise HTTPException(status_code=502, detail=f"{PROVIDER_LABEL} a répondu {res.status_code}.")

    data = res.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail=f"Réponse {PROVIDER_LABEL} inattendue.") from exc


def _sampling(body: ChatIn) -> dict[str, object]:
    """Réglages d'échantillonnage à transmettre au fournisseur.

    La température retombe sur le défaut du TD si le client n'en impose
    pas ; top_p et top_k ne sont envoyés que s'ils sont demandés, pour
    ne pas contraindre inutilement les modèles.
    """
    out: dict[str, object] = {
        "temperature": body.temperature if body.temperature is not None else DEFAULT_TEMPERATURE
    }
    if body.top_p is not None:
        out["top_p"] = body.top_p
    if body.top_k is not None:
        out["top_k"] = body.top_k
    return out


async def _stream_provider(
    model: str,
    messages: list[dict[str, str]],
    sampling: dict[str, object] | None = None,
) -> AsyncIterator[str]:
    """Relaie la réponse du fournisseur token par token, en SSE.

    Trois types d'événements :
      {"delta": "..."}  un fragment de texte
      {"usage": {...}}  le décompte de tokens, à la fin du flux
      {"error": "..."}  une erreur survenue APRÈS le début du flux
                        (le code HTTP ne peut plus être changé)
    Le flux se termine par `data: [DONE]`.
    """
    _guard_startup()
    _guard_model(model)

    payload = {
        "model": MODEL_MAP.get(model, model),
        "messages": messages,
        "stream": True,
        # Sans cette option, l'usage n'est pas renvoyé en mode flux.
        "stream_options": {"include_usage": True},
        **(sampling or {"temperature": DEFAULT_TEMPERATURE}),
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
            for attempt in range(RATE_LIMIT_RETRIES + 1):
                req = client.build_request("POST", PROVIDER_URL, headers=_headers(), json=payload)
                res = await client.send(req, stream=True)
                if res.status_code != 429 or attempt == RATE_LIMIT_RETRIES:
                    break
                await res.aclose()
                await _backoff()
            try:
                if res.status_code != 200:
                    await res.aread()
                    yield _sse({"error": f"{PROVIDER_LABEL} a répondu {res.status_code}."})
                    yield "data: [DONE]\n\n"
                    return

                async for line in res.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:].strip()
                    if chunk == "[DONE]":
                        break
                    try:
                        obj = json.loads(chunk)
                    except json.JSONDecodeError:
                        continue

                    # Le décompte arrive dans un événement final, dont la
                    # liste `choices` est vide.
                    usage = obj.get("usage")
                    if usage:
                        yield _sse_obj(
                            {
                                "usage": {
                                    "prompt": usage.get("prompt_tokens", 0),
                                    "completion": usage.get("completion_tokens", 0),
                                    "total": usage.get("total_tokens", 0),
                                }
                            }
                        )
                        continue

                    try:
                        delta = obj["choices"][0]["delta"].get("content")
                    except (KeyError, IndexError, TypeError):
                        continue
                    if delta:
                        yield _sse({"delta": delta})
            finally:
                await res.aclose()
    except httpx.RequestError as exc:
        yield _sse({"error": f"{PROVIDER_LABEL} injoignable : {exc}"})

    yield "data: [DONE]\n\n"


def _sse(obj: dict[str, str]) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _sse_obj(obj: dict[str, object]) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _build_rag_prompt(prompt: str, context: str) -> list[dict[str, str]]:
    system = (
        "Tu es un assistant médical. Réponds UNIQUEMENT à partir des extraits de "
        "recommandations fournis ci-dessous. Si l'information n'y figure pas, dis-le "
        "explicitement plutôt que d'inventer. Cite l'extrait sur lequel tu t'appuies."
    )
    user = f"Extraits de recommandations :\n\n{context}\n\n---\n\nQuestion : {prompt}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def _build_messages(body: ChatIn) -> list[dict[str, str]]:
    """
    Assemble la conversation envoyée au fournisseur.

    L'historique est réinjecté À CHAQUE appel : un LLM est sans état, sa
    « mémoire » n'est rien d'autre que ce renvoi. C'est ce que l'étape
    « La mémoire » donne à voir, compteur de tokens à l'appui.
    """
    if body.rag_context:
        return _build_rag_prompt(body.prompt, body.rag_context)

    messages: list[dict[str, str]] = []
    if body.system:
        messages.append({"role": "system", "content": body.system})
    messages.extend({"role": m.role, "content": m.content} for m in body.history)
    messages.append({"role": "user", "content": body.prompt})
    return messages


# --- Routes --------------------------------------------------------


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "ok": True,
        "provider": PROVIDER_ID,
        "has_key": bool(API_KEY),
        # Le front interroge cette clé pour savoir s'il peut proposer la
        # recherche sémantique, ou s'il doit rester sur sa recherche lexicale.
        "embeddings": embedder.ready,
        "embeddings_error": embedder.error,
    }


class EmbedIn(BaseModel):
    """Une question et les passages parmi lesquels chercher."""

    question: str = Field(..., min_length=1)
    # Bornes larges mais réelles : elles évitent qu'un document aberrant
    # (ou un appel malveillant) fasse tourner le modèle indéfiniment.
    passages: list[str] = Field(..., min_length=1, max_length=400)
    budget_tokens: int = Field(default=900, ge=100, le=20000)
    max_results: int = Field(default=5, ge=1, le=20)


class EmbedHit(BaseModel):
    index: int
    score: float


class EmbedOut(BaseModel):
    hits: list[EmbedHit]


@app.post("/api/embed", response_model=EmbedOut)
async def embed(body: EmbedIn) -> EmbedOut:
    """
    Recherche SÉMANTIQUE dans les passages fournis.

    Le modèle tourne sur ce serveur : aucun texte ne part vers un tiers pour
    la recherche. Renvoie des indices, pas du texte — le front possède déjà
    les passages, les relire coûterait de la bande passante pour rien.
    """
    if not embedder.ready:
        # 503 plutôt que 500 : ce n'est pas une panne, c'est une capacité
        # absente, et le front sait retomber sur sa recherche lexicale.
        raise HTTPException(
            status_code=503,
            detail=embedder.error or "recherche sémantique indisponible",
        )
    try:
        hits = rank(body.question, body.passages, body.budget_tokens, body.max_results)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return EmbedOut(hits=[EmbedHit(**h) for h in hits])


@app.post("/api/chat", response_model=ChatOut)
async def chat(body: ChatIn) -> ChatOut:
    text = await _call_provider(body.model, _build_messages(body), _sampling(body))
    return ChatOut(text=text)


@app.post("/api/chat/stream")
async def chat_stream(body: ChatIn) -> StreamingResponse:
    """Même contrat que /api/chat, mais la réponse arrive en flux SSE."""
    messages = _build_messages(body)

    # Les refus se prononcent AVANT d'ouvrir le flux.
    #
    # Une fois `StreamingResponse` retourné, le 200 est parti : une exception
    # levée dans le générateur ne peut plus changer le code HTTP. Elle laissait
    # un flux vide, que le client lisait comme une réponse valide de zéro mot —
    # l'étudiant voyait une réponse blanche, sans le moindre message. Les mêmes
    # gardes sont conservées dans le générateur, pour ce qui survient ensuite.
    _guard_startup()
    _guard_model(body.model)

    return StreamingResponse(
        _stream_provider(body.model, messages, _sampling(body)),
        media_type="text/event-stream",
        # Désactive la mise en tampon des proxys, qui casserait le direct.
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/rag", response_model=ChatOut)
async def rag(body: RagIn) -> ChatOut:
    context = "\n\n".join(f"[{i + 1}] {c}" for i, c in enumerate(body.chunks))
    messages = _build_rag_prompt(body.prompt, context)
    text = await _call_provider(body.model, messages)
    return ChatOut(text=text)


# --- Le site lui-même ----------------------------------------------
#
# Quand STATIC_DIR contient un build du front, ce serveur sert AUSSI les
# pages. Une seule adresse rend alors le site et répond à l'API, ce qui
# supprime deux obstacles en salle : plus de CORS à configurer, et plus de
# blocage « contenu mixte » (une page HTTPS ne peut pas appeler une API HTTP,
# mais une page HTTP servie par ce même serveur le peut).
#
# Le montage vient APRÈS toutes les routes d'API : sinon il les avalerait.
STATIC_DIR = Path(os.environ.get("STATIC_DIR", "/srv/web")).resolve()

if (STATIC_DIR / "index.html").is_file():

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> FileResponse:
        """Sert un fichier du build, ou `index.html` pour les routes du SPA.

        React Router gère `/courses/...` côté navigateur : le serveur ne
        connaît pas ces chemins et doit renvoyer la page d'entrée, à charge
        pour elle d'afficher la bonne vue. Un fichier réellement absent
        (`/favicon.ico`) reçoit donc lui aussi `index.html` — c'est le
        comportement habituel d'un SPA, et le routeur affiche sa page 404.
        """
        candidate = (STATIC_DIR / full_path).resolve()
        # `resolve()` puis vérification du préfixe : sans elle, un chemin
        # contenant « ../ » sortirait du répertoire servi.
        if full_path and candidate.is_file() and candidate.is_relative_to(STATIC_DIR):
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")

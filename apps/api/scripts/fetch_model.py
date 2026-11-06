#!/usr/bin/env python3
"""
Télécharge le modèle d'embedding utilisé par la recherche sémantique.

Les poids (~118 Mo) ne sont PAS versionnés : on ne met pas un binaire de
cette taille dans un dépôt de cours. Ce script les récupère, en local comme
au build de l'image Docker.

    python scripts/fetch_model.py              # -> ./models/multilingual-e5-small
    EMBED_MODEL_DIR=/models python scripts/... # -> destination explicite

Aucune dépendance : requête HTTP standard, pour que le Dockerfile n'ait pas
à installer `huggingface_hub` juste pour deux fichiers.
"""

from __future__ import annotations

import os
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO = "intfloat/multilingual-e5-small"
BASE = f"https://huggingface.co/{REPO}/resolve/main"

# Variante quantifiée en entiers 8 bits : 118 Mo au lieu de 448, pour une
# perte de pertinence négligeable à notre échelle (94 passages).
FILES = {
    "model.onnx": "onnx/model_qint8_avx512_vnni.onnx",
    "tokenizer.json": "tokenizer.json",
}

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "models" / "multilingual-e5-small"


def main() -> int:
    target = Path(os.environ.get("EMBED_MODEL_DIR", str(DEFAULT_DIR)))
    target.mkdir(parents=True, exist_ok=True)

    for local_name, remote_path in FILES.items():
        destination = target / local_name
        if destination.exists():
            print(f"  déjà présent : {destination}")
            continue
        url = f"{BASE}/{remote_path}"
        print(f"  téléchargement : {url}")
        try:
            urllib.request.urlretrieve(url, destination)
        except Exception as exc:
            # Sur macOS, Python n'utilise pas le trousseau système : la
            # vérification du certificat échoue là où curl réussit. On bascule
            # dessus plutôt que de désactiver la vérification TLS.
            print(f"  urllib a échoué ({exc}) — tentative avec curl", file=sys.stderr)
            code = subprocess.call(["curl", "-sSL", "-o", str(destination), url])
            if code != 0:
                # Un fichier partiel ferait échouer le chargement au démarrage
                # d'une façon bien plus difficile à diagnostiquer qu'une absence.
                destination.unlink(missing_ok=True)
                print("ÉCHEC du téléchargement.", file=sys.stderr)
                return 1
        size = destination.stat().st_size / 1e6
        print(f"  écrit : {destination} ({size:.0f} Mo)")

    print(f"\nModèle prêt dans {target}")
    print("Lancez le backend avec :")
    print(f"  EMBED_MODEL_DIR={target} uvicorn app.main:app --port 8000")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

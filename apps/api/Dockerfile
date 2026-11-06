# ============================================================
# Image du backend du TD « Chatbots médicaux ».
#
# Deux étapes, pour une raison précise : le modèle d'embedding (~118 Mo)
# est téléchargé dans une étape séparée. Tant que `fetch_model.py` ne
# change pas, Docker réutilise cette couche — on ne retélécharge pas
# 118 Mo à chaque modification du code.
#
# Le modèle est EMBARQUÉ dans l'image : en salle de TD, le serveur doit
# fonctionner sans dépendre d'un accès à huggingface.co.
#
# L'image embarque AUSSI le site (apps/web) : une seule adresse sert les
# pages et l'API. Plus de CORS a regler, et plus de blocage « contenu
# mixte » entre une page HTTPS et une API HTTP.
#
# ATTENTION : le contexte de build est la RACINE du depot, pas apps/api,
# puisqu'il faut atteindre apps/web :
#   docker build -f apps/api/Dockerfile -t <image> .
#
# La clé OpenRouter, elle, n'est JAMAIS dans l'image : elle est fournie au
# runtime (--env-file ou -e), comme tout secret.
# ============================================================

FROM python:3.12-slim AS model

WORKDIR /build
COPY apps/api/scripts/fetch_model.py ./
# Le téléchargement a besoin des certificats racine, absents de l'image slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && EMBED_MODEL_DIR=/models/multilingual-e5-small python fetch_model.py


FROM node:20-slim AS web

WORKDIR /src
# Les manifestes d'abord : tant qu'ils ne changent pas, « npm ci » est
# reutilise depuis le cache, ce qui evite de reinstaller tout node_modules.
# Le front est un workspace npm : le lockfile vit a la racine du depot.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY apps/web/ apps/web/

ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
# « build:server » et non « build:client » : le site est servi par le backend,
# donc l'API est sur la meme origine que la page (voir VITE_SAME_ORIGIN).
RUN npm run build:server


FROM python:3.12-slim

WORKDIR /app

# Dépendances d'abord : cette couche ne change qu'avec requirements.txt.
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Puis le modèle (couche stable, ~118 Mo), le site, puis le code.
COPY --from=model /models /models
COPY --from=web /src/apps/web/dist /srv/web
COPY apps/api/app ./app

ENV EMBED_MODEL_DIR=/models/multilingual-e5-small \
    STATIC_DIR=/srv/web \
    PYTHONUNBUFFERED=1

# Le serveur partage souvent sa machine avec Ollama : on lui laisse des cœurs.
ENV EMBED_THREADS=2

EXPOSE 8000

# Vérifie AUSSI que l'application répond, pas seulement que le process vit.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health').read()"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

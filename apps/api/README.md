# apps/api — Backend du TD « Chatbots médicaux »

Petit proxy **FastAPI** entre le site (front statique `apps/web`) et un
fournisseur de modèles, **OpenRouter** ou **Eden AI** (`LLM_PROVIDER`). Son
unique rôle : détenir la clé API **côté serveur** pour qu'elle ne soit
**jamais** exposée au navigateur des étudiants.

```
Navigateur (front)  ──POST /api/chat──▶  Backend (cette API)  ──▶  OpenRouter / Eden AI
   pas de clé                              clé dans une variable d'env
```

## Ce que fait le backend

- `POST /api/chat` — `{ model, prompt, rag_context? }` → `{ text }`
- `POST /api/chat/stream` — même contrat, réponse en flux SSE
- `POST /api/rag`  — `{ model, prompt, chunks[] }` → `{ text }`
- `POST /api/embed` — `{ question, passages[], budget_tokens? }` → `{ hits[] }`
  Recherche **sémantique** locale (voir plus bas). Renvoie des indices de
  passages classés par pertinence, jamais du texte.
- `GET  /health`   — état du service (`{ ok, provider, has_key, embeddings }`)

La clé est lue dans `OPENROUTER_API_KEY` ou `EDENAI_API_KEY` selon
`LLM_PROVIDER`, et n'est jamais renvoyée au client. Le front envoie toujours
les slugs OpenRouter ; avec Eden, le serveur les traduit (table `PROVIDERS`
de `app/main.py`, surchargeable par `MODEL_MAP`). Un refus pour débit (429)
est retenté jusqu'à 5 fois : Eden plafonne à environ 10 requêtes/s par compte,
ce qu'une salle de 20 postes dépasse quand tout le monde envoie au même signal.

## Lancer en local

Prérequis : Python 3.12+.

```bash
cd apps/api

# 1) Environnement virtuel + dépendances
python3 -m venv .venv
source .venv/bin/activate            # Windows : .venv\Scripts\activate
pip install -r requirements.txt

# 2) Configuration : copiez l'exemple et renseignez votre clé
cp .env.example .env
#   éditez .env → OPENROUTER_API_KEY=sk-or-v1-...

# 3) Démarrage (charge .env automatiquement grâce à --env-file d'uvicorn)
uvicorn app.main:app --reload --port 8000 --env-file .env
```

> Sans `--env-file`, exportez les variables à la main
> (`export OPENROUTER_API_KEY=...`) avant de lancer `uvicorn`.

Vérifiez : <http://localhost:8000/health> doit renvoyer `{"ok": true, "has_key": true}`.

### Si le port 8000 est déjà pris

Choisissez un autre port au lancement, et dites-le au front dans
`apps/web/.env.local` (fichier **gitignored**, propre à votre machine) :

```bash
# backend, ex. sur 8010
uvicorn app.main:app --reload --port 8010 --env-file .env
```

```dotenv
# apps/web/.env.local
VITE_API_URL=http://localhost:8010
```

Le front prend alors cette URL comme valeur par défaut. Rien à changer dans
le dépôt : la valeur versionnée reste `http://localhost:8000`.

Test rapide :

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen/qwen3-8b","prompt":"Bonjour, réponds OK."}'
```

## Brancher le front

Dans le module TD (menu réglages, en bas de l'étape « Interroger les modèles ») :

1. renseignez **URL de l'API** = `http://localhost:8000`
2. décochez **Forcer le mode démo**

Le front appelle alors `http://localhost:8000/api/chat`. Sans URL, ou si l'API
est injoignable, le TD retombe automatiquement sur les réponses pré-enregistrées
(mode démo) — la séance n'est jamais bloquée.

## Mode hors ligne (réponses pré-enregistrées)

Le TD doit pouvoir se tenir **sans réseau, sans clé et sans backend** : salle
sans wifi, crédits épuisés, fournisseur en panne. Le mode hors ligne rejoue
alors des réponses **réellement produites** par les mêmes modèles.

Rien n'est écrit à la main : chaque réponse sort d'un appel réel, avec ses
vrais décomptes de tokens et ses vrais temps. Le rejeu reproduit l'attente
avant le premier mot puis le streaming, si bien que « le gros modèle est plus
lent » reste vrai hors ligne.

### Regénérer le corpus

```bash
cd apps/api
node scripts/capture_offline.mjs http://localhost:8000
```

Le fichier produit (`offline-captures.json`, ~84 Ko) est **versionné** avec le
front. Le script est **incrémental** : relancé, il ne capture que ce qui
manque — on peut donc l'interrompre, ou n'ajouter qu'un scénario :

```bash
node scripts/capture_offline.mjs http://localhost:8000 --only "warmup|gemma-4b"
```

Couverture actuelle : **87 captures**.

| Étape        | Contenu capturé                                              |
| ------------ | ------------------------------------------------------------ |
| Échauffement | 3 questions × 4 modèles                                       |
| Le prompt    | les 4 paliers × 4 modèles                                     |
| Le hasard    | 5 tirages à T=0,7 + 2 à T=0 × 4 modèles                       |
| La mémoire   | la séquence de 5 questions, dans les **trois** modes (aucune, complète, résumée) |
| Documents    | 5 questions × (sans PJ, chapitre, recommandation entière), passages RAG inclus |

> **Modèles gratuits et 429.** Gemma 3 4B est limité en débit sur OpenRouter et
> refuse par rafales. Le script réessaie avec une attente croissante (5 s, 15 s,
> 45 s, 135 s) ; il peut donc être long sur ce modèle. En cas d'échec, relancez :
> il reprendra où il s'est arrêté.

La séquence de l'étape « mémoire » étant fixe, l'appel de **synthèse** est lui
aussi déterministe : il est capturé sous la clé `…|summary|<tour>|digest`, et
rejoué comme le reste. Le résumé montré à l'étudiant est donc un vrai résumé,
produit par le modèle — indispensable, puisque l'étape demande précisément de
lire ce qu'il a laissé tomber.

### Ce qui n'est pas rejouable

- **Les questions libres** : seules les questions préparées ont une réponse.
  Le champ de saisie est verrouillé et l'étudiant choisit parmi des pastilles.
- **Les modèles non capturés à une étape donnée.** « La mémoire » et
  « Documents » n'ont que Mistral : y capturer les quatre modèles coûterait
  quatre séquences complètes, pour une comparaison que ces étapes ne font pas.
  Les autres modèles y sont donc **grisés** hors ligne, et un modèle hérité
  d'une session en ligne bascule automatiquement vers celui qui est capturé.

## Recherche sémantique (modèle d'embedding)

L'étape « Documents » du TD joint un PDF au message. Quand le document est trop
gros pour le contexte, l'application ne l'envoie plus en entier : elle le
découpe et ne transmet que les passages utiles — c'est le RAG. Le tri de ces
passages se fait **ici**, sur ce serveur.

### Pourquoi un modèle plutôt qu'une recherche par mots-clés

Mesuré sur la recommandation SPILF : la question « pyélonéphrite communautaire
sans signe de gravité » doit ramener le chapitre « PNA **simple** » — un mot que
la question ne contient jamais.

| Méthode                        | Rang du bon chapitre (p. 19) |
| ------------------------------ | ---------------------------- |
| Recherche lexicale (mots-clés) | absent du top 5              |
| Embeddings                     | **2e**                       |

### Installer le modèle

Les poids (~118 Mo) ne sont **pas versionnés** : on ne met pas un binaire de
cette taille dans un dépôt de cours. Ils se téléchargent en une commande :

```bash
cd apps/api
python scripts/fetch_model.py       # -> apps/api/models/multilingual-e5-small/
```

Le script récupère deux fichiers depuis Hugging Face :

| Fichier          | Source                                                                 | Taille |
| ---------------- | ---------------------------------------------------------------------- | ------ |
| `model.onnx`     | `intfloat/multilingual-e5-small` -> `onnx/model_qint8_avx512_vnni.onnx` | 118 Mo |
| `tokenizer.json` | même dépôt                                                              | 17 Mo  |

C'est la variante **quantifiée en 8 bits** (118 Mo au lieu de 448) : la perte
de pertinence est négligeable à l'échelle du TD.

Puis démarrez en indiquant le dossier :

```bash
EMBED_MODEL_DIR=$PWD/models/multilingual-e5-small \
  .venv/bin/uvicorn app.main:app --port 8000
```

Vérifiez avec `curl localhost:8000/health` -> `"embeddings": true`.

**Le modèle est optionnel.** S'il est absent, `/health` renvoie
`"embeddings": false` avec la raison, `/api/embed` répond `503`, et le front
retombe automatiquement sur sa recherche lexicale. Une séance n'est jamais
bloquée par cette dépendance.

### Contextes des extraits (contextual retrieval)

Une section intitulée « 1.2. Traitement » ne dit pas DE QUOI elle traite :
cherchée seule, elle est indiscernable de « 2.2. Traitement » (à risque de
complication) ou « 3.2. Traitement » (PNA grave). Le moteur remonte alors le
mauvais chapitre, et le modèle répond faux **en citant une page**.

La parade ([Anthropic, *Contextual Retrieval*](https://www.anthropic.com/engineering/contextual-retrieval))
consiste à faire écrire par un LLM une phrase qui situe chaque extrait, puis à
la préfixer au texte avant indexation :

> `Pyélonéphrite aiguë simple sans signe de gravité, traitement probabiliste.`

Mesuré sur 6 vignettes du TD :

| | recall@5 | MRR |
| --- | --- | --- |
| Sans contexte | 5/6 | 0,667 |
| **Avec contexte** | **6/6** | **0,764** |

Les phrases sont **générées hors ligne et versionnées** (`*.contexts.json`
à côté des transcriptions) : rien de tout cela ne tourne en séance. Pour
regénérer, ou traiter un nouveau document :

```bash
cd apps/api
node scripts/build_contexts.mjs \
  ../web/src/features/courses/modules/chatbots/attachments/spilf-full.md \
  ../web/src/features/courses/modules/chatbots/attachments/spilf-full.contexts.json \
  http://localhost:8000
```

Le script est interruptible : relancé, il ne refait que les extraits manquants.

> **Attention aux générations aberrantes.** Llama 3.3 part parfois en boucle
> de ponctuation (`!!!!!!…`) avant de produire sa phrase — 3 cas sur 50
> observés, et précisément sur les extraits cliniques les plus importants. Le
> script nettoie, rejette ce qui ne ressemble pas à une phrase, rejoue une fois
> à température plus haute, puis retombe sur le chemin de titres. **Relisez
> tout de même le fichier produit** avant de le versionner.

### Performance

Les vecteurs des passages sont mis en cache d'une question à l'autre :

| Étape                                                     | Latence mesurée |
| --------------------------------------------------------- | --------------- |
| 1re question sur un document (indexation des 94 sections) | ~10 s           |
| Questions suivantes                                        | **~37 ms**      |

Le cache porte sur le contenu : joindre un autre document le renouvelle.

## Docker

Le modèle est **embarqué dans l'image** : en salle, le serveur ne dépend pas
d'un accès à huggingface.co.

```bash
cd apps/api
docker build -t td-chatbots-api .          # télécharge le modèle au build
docker run --rm -p 8000:8000 --env-file .env td-chatbots-api
```

Le `Dockerfile` est en deux étapes : le téléchargement du modèle vit dans sa
propre couche, donc modifier le code ne retélécharge pas 118 Mo.

Image finale : ~450 Mo (dont 118 de modèle et ~130 d'`onnxruntime`).

La clé est fournie au **runtime** via `--env-file` : elle n'est jamais copiée
dans l'image.

## Variables d'environnement

| Variable             | Obligatoire | Rôle                                                                 |
| -------------------- | :---------: | -------------------------------------------------------------------- |
| `LLM_PROVIDER`       |     non     | `openrouter` (défaut) ou `edenai`.                                   |
| `OPENROUTER_API_KEY` |  si OpenRouter | Clé OpenRouter. Sans elle, chaque appel à un modèle répond 503.   |
| `EDENAI_API_KEY`     |  si Eden AI | Clé Eden AI. Même règle.                                             |
| `MODEL_MAP`          |     non     | Slug OpenRouter → nom chez le fournisseur (`a=b,c=d`), en plus de la table intégrée. |
| `ALLOWED_ORIGINS`    |     non     | Origines CORS autorisées (virgules). En prod : l'URL exacte du site. |
| `ALLOWED_MODELS`     |     non     | Liste blanche de modèles appelables (virgules). Vide = tous.         |
| `SITE_URL`           |     non     | En-tête `HTTP-Referer` d'attribution OpenRouter.                     |
| `SITE_NAME`          |     non     | En-tête `X-Title` d'attribution OpenRouter.                          |
| `EMBED_MODEL_DIR`    |     non     | Dossier des poids d'embedding. Défaut : `/models/multilingual-e5-small` (chemin dans l'image Docker). |
| `EMBED_THREADS`      |     non     | Cœurs alloués à l'embedding (défaut 2), pour cohabiter avec Ollama.  |

## Les 4 modèles du TD (slugs OpenRouter)

| Case du 2×2       | Modèle                              | Slug                                  |
| ----------------- | ----------------------------------- | ------------------------------------- |
| Petit généraliste | Qwen3 8B                            | `qwen/qwen3-8b`                       |
| Petit « médical » | Gemma 3 4B                          | `google/gemma-3-4b-it`               |
| Gros généraliste  | Llama 3.3 70B                       | `meta-llama/llama-3.3-70b-instruct`  |
| Gros « médical »  | Gemma 3 27B                         | `google/gemma-3-27b-it`              |

> OpenRouter n'héberge pas les MedGemma affinés médecine. On utilise donc les
> Gemma généralistes de la **même famille** : la case « médical » du TD montre
> alors qu'un modèle généraliste n'a pas d'avantage médical particulier. La
> distinction se discute en séance ; adaptez les slugs si de vrais modèles
> médicaux deviennent disponibles.

## Sécurité — points clés

- **La clé n'est jamais dans le navigateur.** Elle vit uniquement ici, dans une
  variable d'environnement du serveur. Le front ne connaît que l'URL du backend.
- **`.env` n'est jamais commité** (couvert par le `.gitignore` racine).
- **CORS** : en production, mettez `ALLOWED_ORIGINS` à l'URL exacte du site pour
  qu'un autre site ne puisse pas consommer votre quota.
- **Liste blanche de modèles** : renseignez `ALLOWED_MODELS` en prod pour éviter
  qu'une requête forgée n'appelle un modèle coûteux hors TD.
- **Quota** : surveillez la consommation sur OpenRouter — c'est **votre** clé qui
  paie chaque requête étudiante. Prévoyez un plafond de crédits.

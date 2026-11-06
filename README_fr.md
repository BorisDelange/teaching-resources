<p align="center">
  <img src="apps/web/public/univ-rennes-logo.png" alt="Université de Rennes" height="80">
</p>

<h1 align="center">Ressources pédagogiques — EDucation SAnté Numérique</h1>

<p align="center">
  Modules de cours interactifs sur l'intelligence artificielle et l'évaluation des<br>
  modèles prédictifs, à destination des étudiants en médecine (Université de Rennes).
</p>

<p align="center">
  <a href="https://teaching-resources-96e174.frama.io/">
    <img src="https://img.shields.io/badge/Acc%C3%A9der%20au%20site-GitLab%20Pages-2ea44f?style=for-the-badge" alt="Accéder au site">
  </a>
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>Français</strong>
</p>

---

## À propos

Ce site accompagne les cours dispensés sur le Moodle de l'Université de Rennes. Il
propose des **exemples interactifs, des simulateurs et des travaux dirigés (TD)** qui
permettent aux étudiants de manipuler les notions vues en cours, plutôt que de les
subir passivement.

Le public visé est celui des étudiants de **DFGSM3** (3ᵉ année de médecine) : le
contenu est en français, le jargon est explicité et les exemples sont cliniques
(recommandations HAS/SPILF, scénarios de patients, données réelles anonymisées).

## Accès

Le site est déployé en ligne (GitLab Pages) :

**➡️ https://teaching-resources-96e174.frama.io/**

Miroir de secours (GitHub Pages) : https://borisdelange.github.io/teaching-resources/

Cliquez sur le bouton vert ci-dessus, ou sur le lien, pour y accéder directement. Aucun
compte ni installation n'est nécessaire.

## Contenu

### Introduction à l'intelligence artificielle
- **Grands modèles de langage (LLM)** — comment fonctionnent les LLM et leurs
  applications en médecine.
- **TD Chatbots médicaux** — les étudiants testent plusieurs modèles « à l'aveugle »
  sur un cas d'antibiothérapie, votent sur la justesse des réponses, puis confrontent
  celles-ci aux recommandations. On y aborde les hallucinations, le prompt engineering,
  le RAG et la confidentialité des données.

### Évaluation des modèles prédictifs
- **Reproductibilité** — kappa de Cohen (tests qualitatifs) et méthode de Bland-Altman
  (tests quantitatifs).
- **Performances** — sensibilité, spécificité, VPP, VPN, rapports de vraisemblance,
  courbe ROC, AUC et indice de Youden.
- **Quiz interactif** — questions pour tester ses connaissances et calculer les
  indicateurs de performance.
- **TD Prédire le sepsis** — de la donnée à la décision : entraîner un modèle, lire ses
  performances, choisir un seuil et poser un regard critique.

## Pile technique

Site statique construit avec **React 19 + TypeScript + Vite**, **Tailwind CSS** et
**shadcn/ui**. Bilingue (français par défaut, anglais disponible). Graphiques via
Plotly, formules mathématiques via MathJax.

Le dépôt contient deux applications :

| Dossier                    | Rôle                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| [`apps/web`](apps/web)     | Le site lui-même. Statique : il se déploie sans serveur.          |
| [`apps/api`](apps/api)     | Backend **optionnel**, utile au seul TD « Chatbots médicaux ».     |

## Développement

```bash
cd apps/web
npm install
npm run dev      # serveur de développement (port 3000)
npm run build    # vérification des types + build de production
npm run lint     # ESLint
```

Cela suffit pour tout le site. Le backend n'est nécessaire que si vous voulez
faire interroger de **vrais modèles** pendant le TD chatbots.

## Lancer le TD chatbots avec de vrais modèles (mode serveur)

Le TD « Chatbots médicaux » fonctionne selon **trois modes**, du plus simple au
plus complet. Choisissez selon ce dont vous disposez le jour de la séance.

| Mode           | Réseau | Clé API | Ce que voient les étudiants                                   |
| -------------- | :----: | :-----: | ------------------------------------------------------------- |
| **Démo**       |  non   |   non   | Quelques réponses figées, sans streaming ni compteurs réels.  |
| **Hors ligne** |  non   |   non   | Réponses **réelles pré-enregistrées**, rejouées avec leur streaming, leurs temps et leurs tokens. Questions imposées. |
| **Serveur**    |  oui   |   oui   | Appels en direct : question libre, réponses fraîches.         |

Le **mode hors ligne** est celui à privilégier quand le wifi de la salle est
incertain : rien n'est inventé, ce sont de vrais appels capturés à l'avance
(voir [`apps/api/scripts/capture_offline.mjs`](apps/api/scripts/capture_offline.mjs)).

### Mode serveur, en trois étapes

Le front ne parle **jamais** directement à OpenRouter : il passe par le backend,
qui seul détient la clé. Celle-ci n'atteint donc jamais le navigateur des
étudiants.

```
Navigateur étudiant  ──▶  Backend apps/api  ──▶  OpenRouter
    aucune clé                clé côté serveur
```

**1. Démarrer le backend** (une clé OpenRouter est nécessaire) :

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # puis renseignez OPENROUTER_API_KEY

# le dossier du modèle d'embedding est optionnel (voir plus bas)
EMBED_MODEL_DIR=$PWD/models/multilingual-e5-small \
  .venv/bin/uvicorn app.main:app --reload --port 8000 --env-file .env
```

Vérifiez : <http://localhost:8000/health> doit répondre `{"ok": true, "has_key": true}`.

**2. Démarrer le front**, dans un second terminal :

```bash
cd apps/web
npm run dev
```

**3. Brancher les deux** — dans le TD, onglet **Réglages** : renseignez l'URL du
backend (`http://localhost:8000`) et décochez **Forcer le mode démo**.

> Si le port 8000 est déjà pris, lancez le backend ailleurs (`--port 8010`) et
> créez `apps/web/.env.local` avec `VITE_API_URL=http://localhost:8010`. Ce
> fichier est gitignored : rien à modifier dans le dépôt.

### En salle : un serveur pour toute la classe

Un seul backend suffit pour tous les postes. Lancez-le sur une machine du réseau
local en écoutant sur toutes les interfaces, et donnez son adresse aux étudiants
dans l'onglet Réglages :

```bash
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --env-file .env
```

Renseignez alors `ALLOWED_ORIGINS` dans le `.env` avec l'URL du site, sinon le
navigateur bloquera les appels (CORS).

> ⚠️ **C'est votre clé qui paie chaque requête.** Prévoyez un plafond de crédits
> sur OpenRouter et renseignez `ALLOWED_MODELS` pour qu'une requête forgée ne
> puisse pas appeler un modèle coûteux.

### Recherche documentaire (RAG)

L'étape « Documents » du TD joint un PDF au message. Quand il est trop gros pour
le contexte, le backend trie les passages utiles avec un petit modèle
d'embedding qui tourne **localement** (~118 Mo, non versionné) :

```bash
cd apps/api
python scripts/fetch_model.py     # -> apps/api/models/multilingual-e5-small/
```

Ce modèle est **optionnel** : absent, la recherche retombe sur une méthode
lexicale et la séance continue.

### Déploiement (GitLab Pages)

GitLab Pages ne sert que des **fichiers statiques** : aucun processus Python n'y
tourne, donc le backend `apps/api` **ne peut pas** y être déployé. Le site
public est par conséquent construit en **mode client** (`npm run build:client`,
voir [`.gitlab-ci.yml`](.gitlab-ci.yml)) : le TD chatbots y rejoue ses réponses
enregistrées, le badge affiche « Mode client », et le mode hors ligne ne peut
pas y être désactivé — il n'y aurait rien au bout.

Pour interroger de vrais modèles pendant une séance, il faut donc un backend
qui tourne **quelque part** : le poste du formateur (voir ci-dessus), ou un
hébergeur capable d'exécuter un conteneur — Scalingo, Clever Cloud, Fly.io,
Render, un VPS… Le `Dockerfile` d'`apps/api` sert directement à cela. Il reste
ensuite à renseigner l'URL du backend dans l'onglet Réglages, et
`ALLOWED_ORIGINS` côté serveur.

### Docker

Le modèle d'embedding est embarqué dans l'image, donc la salle n'a pas besoin
d'accéder à huggingface.co :

L'image embarque **aussi le site** : une seule adresse sert les pages *et*
l'API. Le build se lance donc depuis la **racine** du dépôt (il lui faut
`apps/web`), et non depuis `apps/api` :

```bash
docker build -f apps/api/Dockerfile -t td-chatbots-api .
docker run --rm -p 8000:8000 --env-file apps/api/.env td-chatbots-api
```

Le site est alors sur <http://localhost:8000>, l'API sur les mêmes `/api/*`.
Comme la page et l'API partagent l'origine, `ALLOWED_ORIGINS` devient inutile
dans ce montage — le navigateur n'a pas de CORS à vérifier.

#### Image publiée (pour un serveur distant)

Plutôt que de builder sur le serveur, l'image peut être construite par la CI et
récupérée depuis Docker Hub. Le job `build:api-image` de
[`.gitlab-ci.yml`](.gitlab-ci.yml) s'en charge : il est **manuel** (bouton ▶ dans
le pipeline), car le build télécharge le modèle d'embedding et ne sert qu'aux
séances en mode serveur.

Il faut d'abord définir deux variables dans *Settings → CI/CD → Variables* :
`DOCKERHUB_USER` et `DOCKERHUB_TOKEN` (un *access token*, pas le mot de passe).

Le build utilise **Kaniko** plutôt que `docker build` : les runners partagés de
Framagit ne tournent pas en mode privilégié, donc `docker:dind` n'y démarre pas.

Sur le serveur, l'image étant publique, aucun `docker login` n'est nécessaire :

```bash
docker run -d --name td-llm --restart unless-stopped \
  -p 8000:8000 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  -e ALLOWED_MODELS=google/gemma-3-4b-it,mistralai/mistral-small-24b-instruct-2501,meta-llama/llama-3.3-70b-instruct,openai/gpt-6-luna \
  borisdelange/univ-rennes-td-llm:latest
```

Les étudiants ouvrent alors **`http://<adresse-du-serveur>:8000`** : le site
et l'API viennent du même endroit, donc rien à régler côté CORS, et aucun
blocage *contenu mixte* — la page est en HTTP, l'API aussi.

> ⚠️ Ce montage sert le site en **HTTP**, sans certificat. C'est sans
> conséquence pour le TD (aucune donnée personnelle, la clé reste au serveur),
> mais le navigateur affichera « non sécurisé ». Pour du HTTPS, il faut un nom
> de domaine et un reverse proxy (Caddy obtient le certificat tout seul).
>
> Le site public sur Frama.io, lui, reste en HTTPS et **ne peut pas** appeler
> ce backend en HTTP : le navigateur bloque (*mixed content*). D'où l'intérêt
> de servir le site depuis le conteneur.

📖 Détails complets (endpoints, variables d'environnement, sécurité, mesures de
performance) : [`apps/api/README.md`](apps/api/README.md).

## Auteur

**Boris Delange** — Assistant Hospitalo-Universitaire en informatique médicale,
Université de Rennes.

## Licence

Ce dépôt applique un **double licenciement**, les licences Creative Commons
n'étant pas adaptées au logiciel :

| Ce qui est couvert                                            | Licence                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Contenu pédagogique** — textes, cours, illustrations, supports | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr) ([`LICENSE-CONTENT`](LICENSE-CONTENT)) |
| **Code source** du site                                        | [MIT](https://opensource.org/licenses/MIT) ([`LICENSE`](LICENSE))             |

Vous êtes donc libre de **réutiliser, adapter et rediffuser** ces supports, y
compris pour vos propres enseignements, à deux conditions : citer l'auteur, et
publier vos versions dérivées sous cette même licence CC BY-SA. Le contenu est
ainsi une [ressource éducative libre](https://fabriquerel.org/) (REL) au sens de
l'UNESCO.

Certains éléments tiers (figures, extraits, recommandations HAS/SPILF) restent
soumis à leurs propres conditions, indiquées là où ils sont utilisés.

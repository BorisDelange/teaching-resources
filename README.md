<p align="center">
  <img src="apps/web/public/univ-rennes-logo.png" alt="University of Rennes" height="80">
</p>

<h1 align="center">Teaching resources — EDucation SAnté Numérique</h1>

<p align="center">
  Interactive course modules on artificial intelligence and the evaluation of<br>
  predictive models, for medical students (University of Rennes).
</p>

<p align="center">
  <a href="https://teaching-resources-96e174.frama.io/">
    <img src="https://img.shields.io/badge/Open%20the%20site-GitLab%20Pages-2ea44f?style=for-the-badge" alt="Open the site">
  </a>
</p>

<p align="center">
  <strong>English</strong> · <a href="README_fr.md">Français</a>
</p>

---

## About

This site complements the courses taught on the University of Rennes Moodle. It
provides **interactive examples, simulators and lab sessions (TD)** that let
students manipulate the concepts seen in class rather than absorb them
passively.

The target audience is **DFGSM3** students (3rd year of medical school): the
content is in French, jargon is explained, and the examples are clinical (HAS
and SPILF guidelines, patient scenarios, anonymised real-world data).

## Access

The site is deployed online (GitLab Pages):

**➡️ https://teaching-resources-96e174.frama.io/**

Backup mirror (GitHub Pages): https://borisdelange.github.io/teaching-resources/

Click the green button above, or the link, to open it directly. No account and
no installation are required.

## Contents

### Introduction to artificial intelligence
- **Large language models (LLM)** — how LLMs work and how they are used in
  medicine.
- **Medical chatbots lab** — students test several models "blind" on an
  antibiotic-therapy case, vote on the accuracy of the answers, then compare
  them against official guidelines. Covers hallucinations, prompt engineering,
  RAG and data confidentiality.

### Evaluating predictive models
- **Reproducibility** — Cohen's kappa (qualitative tests) and the Bland-Altman
  method (quantitative tests).
- **Performance** — sensitivity, specificity, PPV, NPV, likelihood ratios, ROC
  curve, AUC and Youden's index.
- **Interactive quiz** — questions to test your knowledge and compute the
  performance metrics.
- **Sepsis prediction lab** — from data to decision: train a model, read its
  performance, choose a threshold and take a critical look at the result.

## Tech stack

Static site built with **React 19 + TypeScript + Vite**, **Tailwind CSS** and
**shadcn/ui**. Bilingual (French by default, English available). Charts via
Plotly, mathematical formulas via MathJax.

The repository contains two applications:

| Folder                     | Role                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| [`apps/web`](apps/web)     | The site itself. Static: it deploys without a server.             |
| [`apps/api`](apps/api)     | **Optional** backend, used only by the "Medical chatbots" lab.    |

## Development

```bash
cd apps/web
npm install
npm run dev      # development server (port 3000)
npm run build    # type-check + production build
npm run lint     # ESLint
```

That is enough for the whole site. The backend is only needed if you want to
query **real models** during the chatbots lab.

## Running the chatbots lab against real models (server mode)

The "Medical chatbots" lab runs in **three modes**, from the simplest to the
most complete. Pick the one that matches what you have available on the day.

| Mode        | Network | API key | What students see                                             |
| ----------- | :-----: | :-----: | ------------------------------------------------------------- |
| **Demo**    |   no    |   no    | A few canned answers, without streaming or real counters.     |
| **Offline** |   no    |   no    | **Real pre-recorded answers**, replayed with their streaming, timings and token counts. Fixed questions. |
| **Server**  |  yes    |  yes    | Live calls: free-form questions, fresh answers.               |

**Offline mode** is the one to favour when the room's wifi is unreliable:
nothing is made up, these are real calls captured in advance (see
[`apps/api/scripts/capture_offline.mjs`](apps/api/scripts/capture_offline.mjs)).

### Server mode, in three steps

The frontend **never** talks to OpenRouter directly: it goes through the
backend, which alone holds the key. The key therefore never reaches the
students' browsers.

```
Student browser  ──▶  apps/api backend  ──▶  OpenRouter
     no key              key server-side
```

**1. Start the backend** (an OpenRouter key is required):

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then fill in OPENROUTER_API_KEY

# the embedding model directory is optional (see below)
EMBED_MODEL_DIR=$PWD/models/multilingual-e5-small \
  .venv/bin/uvicorn app.main:app --reload --port 8000 --env-file .env
```

Check that <http://localhost:8000/health> returns `{"ok": true, "has_key": true}`.

**2. Start the frontend**, in a second terminal:

```bash
cd apps/web
npm run dev
```

**3. Connect the two** — in the lab, **Settings** tab: enter the backend URL
(`http://localhost:8000`) and untick **Force demo mode**.

> If port 8000 is already taken, start the backend elsewhere (`--port 8010`)
> and create `apps/web/.env.local` with `VITE_API_URL=http://localhost:8010`.
> That file is gitignored: nothing to change in the repository.

### In the classroom: one server for the whole class

A single backend is enough for every workstation. Run it on a machine on the
local network, listening on all interfaces, and give students its address in
the Settings tab:

```bash
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --env-file .env
```

Then set `ALLOWED_ORIGINS` in `.env` to the site URL, otherwise the browser
will block the calls (CORS).

> ⚠️ **Your key pays for every request.** Set a credit cap on OpenRouter and
> fill in `ALLOWED_MODELS` so that a forged request cannot call an expensive
> model.

### Document retrieval (RAG)

The lab's "Documents" step attaches a PDF to the message. When it is too large
for the context window, the backend ranks the useful passages with a small
embedding model running **locally** (~118 MB, not versioned):

```bash
cd apps/api
python scripts/fetch_model.py     # -> apps/api/models/multilingual-e5-small/
```

This model is **optional**: without it, retrieval falls back to a lexical
method and the session carries on.

### Deployment (GitLab Pages)

GitLab Pages only serves **static files**: no Python process runs there, so the
`apps/api` backend **cannot** be deployed on it. The public site is therefore
built in **client mode** (`npm run build:client`, see
[`.gitlab-ci.yml`](.gitlab-ci.yml)): the chatbots lab replays its recorded
answers, the badge reads "Client mode", and offline mode cannot be disabled
there — there would be nothing at the other end.

To query real models during a session you therefore need a backend running
**somewhere**: the instructor's machine (see above), or a host able to run a
container — Scalingo, Clever Cloud, Fly.io, Render, a VPS… The `apps/api`
`Dockerfile` is made for exactly that. It then remains to fill in the backend
URL in the Settings tab, and `ALLOWED_ORIGINS` server-side.

### Docker

The embedding model is bundled into the image, so the classroom does not need
access to huggingface.co:

The image **also bundles the site**: a single address serves both the pages
*and* the API. The build therefore runs from the **repository root** (it needs
`apps/web`), not from `apps/api`:

```bash
docker build -f apps/api/Dockerfile -t td-chatbots-api .
docker run --rm -p 8000:8000 --env-file apps/api/.env td-chatbots-api
```

The site is then at <http://localhost:8000>, with the API on the same
`/api/*` paths. Since the page and the API share an origin, `ALLOWED_ORIGINS`
becomes unnecessary in this setup — the browser has no CORS to check.

#### Published image (for a remote server)

Rather than building on the server, the image can be built by CI and pulled
from Docker Hub. The `build:api-image` job in
[`.gitlab-ci.yml`](.gitlab-ci.yml) handles this: it is **manual** (▶ button in
the pipeline), because the build downloads the embedding model and is only
needed for server-mode sessions.

Two variables must first be defined in *Settings → CI/CD → Variables*:
`DOCKERHUB_USER` and `DOCKERHUB_TOKEN` (an *access token*, not the password).

The build uses **Kaniko** rather than `docker build`: Framagit's shared runners
do not run in privileged mode, so `docker:dind` will not start there.

On the server, since the image is public, no `docker login` is needed:

```bash
docker run -d --name td-llm --restart unless-stopped \
  -p 8000:8000 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  -e ALLOWED_MODELS=google/gemma-3-4b-it,mistralai/mistral-small-24b-instruct-2501,meta-llama/llama-3.3-70b-instruct,openai/gpt-6-luna \
  borisdelange/univ-rennes-td-llm:latest
```

Students then open **`http://<server-address>:8000`**: the site and the API
come from the same place, so there is nothing to configure for CORS, and no
*mixed content* blocking — the page is over HTTP, and so is the API.

> ⚠️ This setup serves the site over **HTTP**, without a certificate. That is
> harmless for the lab (no personal data, the key stays on the server), but the
> browser will show "not secure". For HTTPS you need a domain name and a
> reverse proxy (Caddy obtains the certificate on its own).
>
> The public site on Frama.io stays on HTTPS and **cannot** call this backend
> over HTTP: the browser blocks it (*mixed content*). Hence the value of
> serving the site from the container.

📖 Full details (endpoints, environment variables, security, performance
measurements): [`apps/api/README.md`](apps/api/README.md).

## Author

**Boris Delange** — Hospital and University Assistant in Medical Informatics,
University of Rennes.

## License

This repository uses **dual licensing**, since Creative Commons licenses are
not suited to software:

| What it covers                                              | License                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Teaching content** — text, courses, illustrations, materials | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) ([`LICENSE-CONTENT`](LICENSE-CONTENT)) |
| **Source code** of the site                                   | [MIT](https://opensource.org/licenses/MIT) ([`LICENSE`](LICENSE))             |

You are therefore free to **reuse, adapt and redistribute** these materials,
including for your own teaching, under two conditions: credit the author, and
publish your derivative versions under the same CC BY-SA license. The content
is thus an [open educational resource](https://fabriquerel.org/) (OER) in the
sense defined by UNESCO.

Some third-party items (figures, excerpts, HAS/SPILF guidelines) remain subject
to their own terms, indicated where they are used.

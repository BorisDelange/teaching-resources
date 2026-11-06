// ============================================================
// Enregistre les réponses du mode HORS LIGNE.
//
// Le TD doit pouvoir tourner sans backend, sans clé API et sans réseau :
// salle sans wifi, budget épuisé, OpenRouter en panne un lundi matin. Le
// mode hors ligne rejoue alors des réponses RÉELLES, capturées ici.
//
// Rien n'est écrit à la main : chaque réponse sort d'un vrai appel au
// modèle, avec ses vrais décomptes de tokens et ses vrais temps. C'est ce
// qui permet au mode hors ligne de rester honnête — un étudiant qui compare
// avec la version en ligne doit retrouver la même chose, erreurs comprises.
//
//   node scripts/capture_offline.mjs [url-backend] [--only scenario]
//
// Le fichier de sortie est mis à jour de façon INCRÉMENTALE : relancer le
// script ne recapture que les scénarios absents. Pour recapturer, supprimer
// l'entrée (ou le fichier).
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(HERE, '../../web/src/features/courses/modules/chatbots')
const OUT = resolve(WEB, 'offline-captures.json')

const args = process.argv.slice(2)
const API = (args.find((a) => !a.startsWith('--')) ?? 'http://localhost:8010').replace(/\/$/, '')
const onlyIndex = args.indexOf('--only')
const ONLY = onlyIndex >= 0 ? args[onlyIndex + 1] : null

// ---------- Les modèles du TD (copie de warmup-data.ts) ----------

const MODELS = {
  'gemma-4b': 'google/gemma-3-4b-it',
  'llama-70b': 'meta-llama/llama-3.3-70b-instruct',
  'gpt-6-luna': 'openai/gpt-6-luna',
}

const SYSTEM_PROMPT = `Réponds DIRECTEMENT et de façon concise : molécule, posologie, durée.
Pas de disclaimer, pas de « consultez un médecin » : ton interlocuteur EST médecin.
Maximum 120 mots.`

const DEFAULT_TEMPERATURE = 0.7

// ---------- Appel réel, en flux, chronométré ----------

/**
 * Appelle le backend en SSE, comme le front. On mesure séparément l'attente
 * du premier fragment et la durée de génération : le mode hors ligne rejoue
 * les deux, et c'est ce qui donne au streaming rejoué sa texture réelle.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function call({ model, prompt, system, history = [], temperature = DEFAULT_TEMPERATURE }) {
  const startedAt = Date.now()
  const res = await fetch(`${API}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system: system?.trim() ? system : null,
      history,
      temperature,
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status} — ${await res.text()}`)

  let full = ''
  let usage
  let firstDeltaAt
  let lastDeltaAt
  // Intervalles entre fragments : rejoués tels quels, le streaming hors ligne
  // a alors le rythme du vrai modèle (saccadé, pas régulier).
  const gaps = []
  let previousAt

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const evt of events) {
      const line = evt.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') continue
      let obj
      try {
        obj = JSON.parse(payload)
      } catch {
        continue
      }
      if (obj.error) throw new Error(obj.error)
      if (obj.usage) usage = obj.usage
      if (obj.delta) {
        const now = Date.now()
        if (firstDeltaAt === undefined) firstDeltaAt = now
        else gaps.push(now - previousAt)
        previousAt = now
        lastDeltaAt = now
        full += obj.delta
      }
    }
  }

  if (!full) throw new Error('réponse vide')
  return {
    text: full,
    usage: usage ?? null,
    waitMs: firstDeltaAt ? firstDeltaAt - startedAt : 0,
    genMs: firstDeltaAt && lastDeltaAt ? lastDeltaAt - firstDeltaAt : 0,
    // Médiane plutôt que moyenne : un unique fragment lent (renégociation
    // réseau) ne doit pas ralentir toute la relecture.
    medianGapMs: gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 20,
  }
}

// ---------- Découpage RAG (copie fidèle de retrieval.ts) ----------

const PAGE_MARK = /<!--page:(\d+)-->/g
const MAX_CHUNK_CHARS = 2000

function splitLong(text, max) {
  if (text.length <= max) return [text]
  const out = []
  let buf = ''
  for (const para of text.split(/\n\n+/)) {
    if (buf && buf.length + para.length > max) {
      out.push(buf.trim())
      buf = ''
    }
    buf += (buf ? '\n\n' : '') + para
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

function chunkDocument(md) {
  const parts = md.split(/\n(?=#{2,4} )/)
  const chunks = []
  let page = 1
  const ancestry = []
  for (const part of parts) {
    const marks = [...part.matchAll(PAGE_MARK)]
    const pageForChunk = page
    if (marks.length > 0) page = Number(marks[marks.length - 1][1])
    const text = part.replace(PAGE_MARK, '').trim()
    if (!text) continue
    const firstLine = text.split('\n')[0]
    const title = firstLine.replace(/^#+\s*/, '').trim()
    const level = (firstLine.match(/^#+/) ?? [''])[0].length
    if (level > 0) {
      ancestry.length = Math.max(0, level - 2)
      ancestry[level - 2] = title
    }
    const path = ancestry.filter(Boolean)
    if (text.length < 80) continue
    for (const piece of splitLong(text, MAX_CHUNK_CHARS)) {
      chunks.push({ title, path, text: piece, page: pageForChunk })
    }
  }
  return chunks
}

function chunkKey(text) {
  const hash = (seed) => {
    let h = seed
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h.toString(16).padStart(8, '0')
  }
  return hash(0x811c9dc5) + hash(0x9e3779b9)
}

/** Question resserrée avant l'encodage (copie de focusQuery). */
const QUERY_NOISE = [
  /\bmme?\s+\w\.?,?/gi,
  /\b\d+\s*ans\b/gi,
  /\b\d+[\s,.]*kg\b/gi,
  /\bdfg\s*(estimé\s*à\s*)?\d+\s*(ml\/min)?\b/gi,
  /\b\d+\s*ml\/min\b/gi,
]

function focusQuery(question) {
  let out = question
  for (const rule of QUERY_NOISE) out = out.replace(rule, ' ')
  return (
    out
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,?!])/g, '$1')
      .replace(/(^|\s)[.,]+(?=\s|$)/g, ' ')
      .replace(/([.,?!])\1+/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim() || question
  )
}

/** Texte indexé d'un extrait — copie fidèle de `indexedText`. */
function indexedText(chunk, contexts) {
  const heading = [...chunk.path, chunk.title].join(' > ')
  const situation = contexts?.[chunkKey(chunk.text)]
  return `${heading}\n${situation ? situation + '\n' : ''}${chunk.text}`
}

async function retrieveSemantic(chunks, question, budgetTokens, contexts) {
  const passages = chunks.map((c) => indexedText(c, contexts))
  const res = await fetch(`${API}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: focusQuery(question),
      passages,
      budget_tokens: budgetTokens,
    }),
  })
  if (!res.ok) throw new Error(`embed ${res.status} — ${await res.text()}`)
  const data = await res.json()
  return (data.hits ?? []).map((h) => ({ ...chunks[h.index], score: h.score }))
}

// ---------- Lecture des documents joints ----------

const hasPna = readFileSync(resolve(WEB, 'attachments/has-pna.md'), 'utf8')
const omedit = readFileSync(resolve(WEB, 'attachments/omedit.md'), 'utf8')

const DOC_HEADER = 'Documents joints par l’utilisateur (contexte, pas une question) :'
const RAG_HEADER =
  'Extraits sélectionnés automatiquement dans un document trop volumineux pour être envoyé en entier. Ce ne sont PAS toutes les pages : appuyez-vous uniquement sur ces extraits, citez la page, et signalez si l’information manque.'

// ---------- Les scénarios ----------
//
// Chaque entrée produit UNE bulle de message pré-enregistré dans le TD.
// Le champ `id` est la clé de rejeu : le front cherche la capture par
// (étape, modèle, id). Changer un `text` invalide la capture — c'est
// voulu, on ne veut pas rejouer une réponse pour une autre question.

const CASE = 'Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois.'

/** Étape « échauffement » : les 3 pistes de départ, sur les 4 modèles. */
const WARMUP = [
  { id: 'naive', text: 'antibio pour une pyélonéphrite ?' },
  {
    id: 'contextual',
    text: 'Femme de 68 ans, 62 kg, pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Précise la molécule, la posologie et la durée.',
  },
  {
    id: 'sourced',
    text: "Femme de 68 ans, 62 kg, pyélonéphrite aiguë communautaire sans signe de gravité, DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Molécule, posologie adaptée à la fonction rénale, durée. Cite pour chaque point la recommandation française sur laquelle tu t'appuies, avec l'année. Si tu n'es pas sûr, dis-le explicitement plutôt que d'inventer.",
  },
]

/** Étape « le prompt » : les 4 paliers. */
const PROMPT_LEVELS = [
  { id: 'raw', text: 'antibio pour une pyélonéphrite ?' },
  {
    id: 'context',
    text: 'Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois. Quelle antibiothérapie probabiliste ? Précise la molécule, la posologie et la durée.',
  },
  {
    id: 'role-source',
    text: `Tu es un médecin infectiologue, à jour des recommandations françaises (HAS).

${CASE}

Quelle antibiothérapie probabiliste ? Donne la molécule, la posologie adaptée à la fonction rénale, et la durée.

Pour chaque point, cite la recommandation sur laquelle tu t’appuies, avec son année.`,
  },
  {
    id: 'humility',
    text: `Tu es un médecin infectiologue, à jour des recommandations françaises (HAS).

${CASE}

Quelle antibiothérapie probabiliste ? Raisonne étape par étape : d’abord la molécule, puis l’adaptation à la fonction rénale, puis la durée.

Pour chaque point, cite la recommandation sur laquelle tu t’appuies, avec son année.

Si tu n’es pas sûr d’un point, dis-le explicitement au lieu de deviner. Signale aussi toute information manquante qui changerait ta réponse.`,
  },
]

/**
 * Étape « la mémoire » : une SÉQUENCE, pas des messages isolés.
 *
 * L'ordre importe — chaque question de suivi n'a de sens que si les
 * précédentes ont été posées. C'est précisément ce que l'étape démontre :
 * en mode « aucune mémoire », la question 2 devient incompréhensible.
 */
const MEMORY_SEQUENCE = [
  {
    id: 'case',
    text: 'Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Quelle antibiothérapie ?',
  },
  { id: 'allergy', text: 'Et si elle était allergique aux bêta-lactamines ?' },
  { id: 'duration', text: 'Quelle durée finalement ?' },
  { id: 'renal', text: 'Faut-il adapter la dose à sa fonction rénale ?' },
  { id: 'recap', text: 'Résume-moi ce qu’on a décidé.' },
]

/**
 * Étape « documents » : plusieurs questions × plusieurs pièces jointes.
 *
 * Les deux documents de l'exercice 2, comme à l'étape en ligne :
 *   - sans pièce jointe          → le modèle récite sa mémoire
 *   - fiche HAS (≈ 1 200 tokens) → dépasse le budget, bascule en RECHERCHE
 *   - table OMEDIT (2 122)       → idem
 *
 * Les questions varient volontairement de difficulté : le traitement du cas
 * (deux sections « traitement » dans la fiche : 7 ou 10 jours), les signes
 * de gravité et la grossesse (absents du document : le modèle le dit-il ?),
 * la durée (le cas facile), l'imagerie (« non, sauf… »).
 */
const DOC_QUESTIONS = [
  {
    id: 'treatment',
    text: 'Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Molécule, posologie, durée. Cite tes sources précisément : le document, la page et le passage mot pour mot.',
  },
  {
    id: 'severity',
    text: 'Quels sont les critères de gravité d’une pyélonéphrite aiguë ?',
  },
  {
    id: 'duration',
    text: 'Quelle est la durée de traitement recommandée pour une pyélonéphrite aiguë simple ?',
  },
  {
    id: 'pregnancy',
    text: 'Quelle antibiothérapie pour une pyélonéphrite aiguë chez la femme enceinte ?',
  },
  {
    id: 'imaging',
    text: 'Faut-il faire une imagerie devant une pyélonéphrite aiguë simple ?',
  },
]

// Tailles mesurées, comme dans attachments-data.ts : c'est sur elles que
// l'étape en ligne décide de la bascule.
const HAS = {
  id: 'has-pna',
  label: 'Fiche HAS 2025 — pyélonéphrite aiguë de la femme',
  content: hasPna,
  contexts: null,
  tokens: 1128,
}
const OMEDIT = {
  id: 'omedit',
  label: 'OMEDIT 2021 — antibiotiques et insuffisance rénale',
  content: omedit,
  contexts: null,
  tokens: 2259,
}
// Chaque combinaison que l'étudiant peut joindre, clé = identifiants triés
// joints par « + », comme dans DocumentsStep.
const DOC_ATTACHMENTS = [
  { id: 'none', docs: [] },
  { id: 'has-pna', docs: [HAS] },
  { id: 'omedit', docs: [OMEDIT] },
  { id: 'has-pna+omedit', docs: [HAS, OMEDIT] },
]

// Budget de contexte par défaut du TD, en tokens (voir settings.ts).
const BUDGET = 1000
// Le même budget qu'en ligne (settings.ts, `documentBudget`) : sinon le
// rejeu hors ligne ne correspondrait pas à ce que l'étape envoie en ligne.
const DOC_BUDGET = 5000

// ---------- Boucle de capture ----------

const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { captures: {} }
out.captures ??= {}

let captured = 0
let skipped = 0
let failed = 0

function save() {
  out.capturedAt = new Date().toISOString().slice(0, 10)
  out.backend = API
  writeFileSync(OUT, JSON.stringify(out, null, 1))
}

/**
 * Capture une réponse, avec reprise sur limitation de débit.
 *
 * Les modèles gratuits d'OpenRouter (Gemma 3 4B au premier chef) répondent
 * 429 par rafales. Abandonner au premier refus laisserait un trou dans le
 * corpus — et c'est justement le modèle qui hallucine une molécule
 * inexistante, donc le plus utile du TD. On attend, puis on réessaie.
 */
const RETRIES = 4

async function capture(key, run) {
  if (out.captures[key]) {
    skipped += 1
    return
  }
  if (ONLY && !key.startsWith(ONLY)) return

  process.stdout.write(`  ${key} … `)
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const result = await run()
      out.captures[key] = result
      captured += 1
      console.log(`${result.usage?.completion ?? '?'} tok · ${(result.genMs / 1000).toFixed(1)} s`)
      if (captured % 5 === 0) save()
      return
    } catch (err) {
      const rateLimited = /429/.test(err.message)
      if (!rateLimited || attempt === RETRIES) {
        failed += 1
        console.log(`ÉCHEC — ${err.message}`)
        return
      }
      // Attente croissante : 5 s, 15 s, 45 s, 135 s.
      const waitMs = 5000 * 3 ** attempt
      process.stdout.write(`429, reprise dans ${waitMs / 1000} s … `)
      await sleep(waitMs)
    }
  }
}

// --- Échauffement + Hasard (mêmes prompts, tous les modèles) ---

console.log('\n== échauffement ==')
for (const [modelId, slug] of Object.entries(MODELS)) {
  for (const p of WARMUP) {
    await capture(`warmup|${modelId}|${p.id}`, async () => ({
      prompt: p.text,
      ...(await call({ model: slug, prompt: p.text, system: SYSTEM_PROMPT })),
    }))
  }
}

// --- Le prompt : 4 paliers × 4 modèles ---

console.log('\n== le prompt ==')
for (const [modelId, slug] of Object.entries(MODELS)) {
  for (const level of PROMPT_LEVELS) {
    await capture(`prompt|${modelId}|${level.id}`, async () => ({
      prompt: level.text,
      ...(await call({ model: slug, prompt: level.text, system: SYSTEM_PROMPT })),
    }))
  }
}

/**
 * --- Hasard : le MÊME prompt rejoué 5 fois ---
 *
 * L'étape montre qu'à température 0,7 le modèle ne redit pas deux fois la
 * même chose. Il faut donc capturer plusieurs générations distinctes, et le
 * mode hors ligne en tire une au sort — sinon la démonstration s'effondre :
 * rejouer une capture unique donnerait 3 réponses identiques, soit
 * exactement le contraire de ce qu'on veut faire voir.
 */
console.log('\n== hasard (5 tirages par modèle) ==')
const CHANCE_PROMPT = `${CASE}

Quelle antibiothérapie probabiliste ? Molécule, posologie, durée.`
for (const [modelId, slug] of Object.entries(MODELS)) {
  for (let i = 0; i < 5; i++) {
    await capture(`chance|${modelId}|hot-${i}`, async () => ({
      prompt: CHANCE_PROMPT,
      ...(await call({ model: slug, prompt: CHANCE_PROMPT, system: SYSTEM_PROMPT, temperature: 0.7 })),
    }))
  }
  // Température 0 : deux tirages suffisent à montrer la quasi-stabilité.
  for (let i = 0; i < 2; i++) {
    await capture(`chance|${modelId}|cold-${i}`, async () => ({
      prompt: CHANCE_PROMPT,
      ...(await call({ model: slug, prompt: CHANCE_PROMPT, system: SYSTEM_PROMPT, temperature: 0 })),
    }))
  }
}

// --- La mémoire : la séquence, dans les 3 modes ---

console.log('\n== la mémoire ==')
const MEMORY_MODEL = 'llama-70b'
for (const mode of ['none', 'full']) {
  const history = []
  for (const turn of MEMORY_SEQUENCE) {
    const key = `memory|${MEMORY_MODEL}|${mode}|${turn.id}`
    // L'historique doit avancer même quand la capture existe déjà, sinon les
    // tours suivants seraient capturés avec un contexte tronqué.
    const existing = out.captures[key]
    if (existing) {
      skipped += 1
      if (mode === 'full') {
        history.push({ role: 'user', content: turn.text })
        history.push({ role: 'assistant', content: existing.text })
      }
      continue
    }
    await capture(key, async () => ({
      prompt: turn.text,
      ...(await call({
        model: MODELS[MEMORY_MODEL],
        prompt: turn.text,
        system: SYSTEM_PROMPT,
        history: mode === 'none' ? [] : [...history],
      })),
    }))
    if (mode === 'full' && out.captures[key]) {
      history.push({ role: 'user', content: turn.text })
      history.push({ role: 'assistant', content: out.captures[key].text })
    }
  }
}

/**
 * --- La mémoire, mode RÉSUMÉ ---
 *
 * Ce mode enchaîne DEUX appels par tour : d'abord une synthèse des échanges
 * qui sortent de la fenêtre, ensuite la réponse à la question. Les deux sont
 * capturés, car les deux sont montrés à l'étudiant — et le coût de la
 * synthèse est précisément ce que l'étape fait observer.
 *
 * La séquence étant fixe, l'entrée de chaque synthèse est déterministe :
 * avec KEEP_RECENT = 3, elle se déclenche au 4e tour (elle condense le tour 1)
 * puis au 5e (elle y ajoute le tour 2, de façon incrémentale). On reproduit
 * ici, à l'identique, ce que fait `MemoryStep.refreshSummary`.
 */
const KEEP_RECENT = 3
const SUMMARY_HEADER = 'Résumé de la conversation jusqu’ici (contexte, pas une question) :'
const SUMMARY_PREVIOUS = 'Résumé de la conversation jusqu’ici :'
const SUMMARY_NEW = 'Nouveaux échanges à intégrer :'
const SUMMARY_PROMPT = `Résume la conversation ci-dessus en 80 mots maximum, pour qu'un autre modèle puisse continuer à répondre sans avoir lu les échanges.

Conserve impérativement les données cliniques chiffrées (âge, poids, fonction rénale, allergies) et les décisions déjà prises. Écris au style télégraphique.`
const SUMMARY_MERGE = `Réécris un résumé unique en 80 mots maximum, intégrant les nouveaux échanges au résumé précédent.

Conserve impérativement les données cliniques chiffrées (âge, poids, fonction rénale, allergies) et les décisions déjà prises. Écris au style télégraphique.`

console.log('\n== la mémoire (mode résumé) ==')
{
  // Les tours déjà joués, dans l'ordre : { prompt, answer }.
  const turns = []
  let summary = ''
  let summarisedCount = 0

  for (let i = 0; i < MEMORY_SEQUENCE.length; i++) {
    const turn = MEMORY_SEQUENCE[i]
    const shouldCover = Math.max(0, turns.length - KEEP_RECENT)

    // 1) La synthèse, quand des tours viennent de sortir de la fenêtre.
    if (shouldCover > summarisedCount) {
      const leaving = turns.slice(summarisedCount, shouldCover)
      const transcript = leaving
        .map((t) => `Question : ${t.prompt}\nRéponse : ${t.answer}`)
        .join('\n\n')
      const summaryPrompt = summary
        ? `${SUMMARY_PREVIOUS}\n${summary}\n\n${SUMMARY_NEW}\n${transcript}\n\n---\n\n${SUMMARY_MERGE}`
        : `${transcript}\n\n---\n\n${SUMMARY_PROMPT}`

      const sumKey = `memory|${MEMORY_MODEL}|summary|${turn.id}|digest`
      const existingSum = out.captures[sumKey]
      if (existingSum) {
        skipped += 1
        summary = existingSum.text
      } else {
        await capture(sumKey, async () => ({
          prompt: summaryPrompt,
          covers: shouldCover,
          added: leaving.length,
          ...(await call({
            model: MODELS[MEMORY_MODEL],
            prompt: summaryPrompt,
            // Pas de consigne système ici : la synthèse n'est pas une réponse
            // clinique, et « maximum 120 mots » la tronquerait.
            system: undefined,
            temperature: 0.3,
          })),
        }))
        if (out.captures[sumKey]) summary = out.captures[sumKey].text
      }
      summarisedCount = shouldCover
    }

    // 2) La réponse. Le résumé rejoint la CONSIGNE SYSTÈME (comme dans
    //    MemoryStep), et seuls les KEEP_RECENT tours récents partent bruts.
    const recent = turns.slice(-KEEP_RECENT)
    const history = recent.flatMap((t) => [
      { role: 'user', content: t.prompt },
      { role: 'assistant', content: t.answer },
    ])
    const systemSent = summary
      ? `${SYSTEM_PROMPT}\n\n${SUMMARY_HEADER}\n${summary}`.trim()
      : SYSTEM_PROMPT

    const key = `memory|${MEMORY_MODEL}|summary|${turn.id}`
    const existing = out.captures[key]
    if (existing) {
      skipped += 1
      turns.push({ prompt: turn.text, answer: existing.text })
      continue
    }
    await capture(key, async () => ({
      prompt: turn.text,
      ...(await call({
        model: MODELS[MEMORY_MODEL],
        prompt: turn.text,
        system: systemSent,
        history,
      })),
    }))
    turns.push({ prompt: turn.text, answer: out.captures[key]?.text ?? '' })
  }
}

// --- Documents : questions × pièces jointes ---

console.log('\n== documents ==')
const DOC_MODEL = 'llama-70b'
for (const attachment of DOC_ATTACHMENTS) {
  for (const q of DOC_QUESTIONS) {
    const key = `documents|${DOC_MODEL}|${attachment.id}|${q.id}`
    await capture(key, async () => {
      let body = q.text
      let sources = null
      let semantic = false

      if (attachment.docs.length) {
        const ragDocs = attachment.docs.filter((d) => d.tokens > DOC_BUDGET / 2)
        const blocks = []
        sources = []
        for (const doc of attachment.docs) {
          let text = doc.content
          if (ragDocs.includes(doc)) {
            const chunks = chunkDocument(doc.content)
            const found = await retrieveSemantic(
              chunks,
              q.text,
              Math.floor((DOC_BUDGET * 0.9) / ragDocs.length),
              doc.contexts,
            )
            semantic = true
            sources.push(
              ...found.map((c) => ({
                docId: doc.id,
                title: c.title,
                path: c.path,
                page: c.page,
                text: c.text,
                score: c.score,
              })),
            )
            text = found.map((c) => `[Page ${c.page} — ${c.title}]\n${c.text}`).join('\n\n')
          }
          blocks.push(`## ${doc.label}\n\n${text}`)
        }
        if (sources.length === 0) sources = null
        const header = ragDocs.length ? RAG_HEADER : DOC_HEADER
        body = `${header}\n\n${blocks.join('\n\n')}\n\n---\n\n${q.text}`
      }

      return {
        prompt: q.text,
        sources,
        semantic,
        ...(await call({ model: MODELS[DOC_MODEL], prompt: body, system: SYSTEM_PROMPT })),
      }
    })
  }
}

save()
console.log(
  `\nterminé : ${captured} capturés, ${skipped} déjà présents, ${failed} en échec -> ${OUT}`,
)

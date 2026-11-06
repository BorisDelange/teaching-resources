// ============================================================
// Benchmark du TD chatbots — comment chaque modèle se comporte d'un palier à l'autre.
//
// Trois conditions, dans l'ordre du TD :
//   raw      → la question brute, sans contexte        (PROMPT_LEVELS[0])
//   prompt   → contexte + rôle + exigence de source    (PROMPT_LEVELS[3])
//   rag      → le même prompt + les deux documents     (étape Documents)
//
// Ce qu'on cherche n'est pas un palmarès : c'est un PROFIL par modèle, pour
// montrer côte à côte des modèles bons d'emblée, d'autres qui progressent
// avec le prompt et les sources, d'autres qui restent mauvais. L'étudiant
// doit voir que la qualité se joue au niveau du modèle, du prompt ET des
// sources.
//
// Ce script RECUEILLE les réponses ; il ne les note pas. La correction se
// fait par relecture, contre la grille RUBRIC ci-dessous, et
// vit dans `bench/verdicts.json`, indexée `modelId/condition/run`. Aucun
// appel de correction n'est facturé.
//
//   node scripts/bench-chatbots.mjs [--models a,b] [--conditions rag] [--repeats 1] [--add] [--dry]
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(HERE, '..')
const TD = resolve(WEB, 'src/features/courses/modules/chatbots')

// ---------- Clef ----------

function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim()
  // Repli sur le .env du backend, seul endroit où la clef du TD vit déjà.
  const env = readFileSync(resolve(WEB, '../api/.env'), 'utf8')
  const m = env.match(/^OPENROUTER_API_KEY=(.+)$/m)
  if (!m) throw new Error('OPENROUTER_API_KEY introuvable (env ou apps/api/.env)')
  return m[1].trim()
}

// ---------- Les modèles testés ----------
//
// Choisis pour couvrir l'axe du TD : du 4B qui ne peut pas savoir, au gros
// modèle qui sait déjà. `expect` note l'hypothèse AVANT la mesure, pour que
// le benchmark puisse la contredire.

// `billions` et `arch` sont structurés (et non déduits de `params`) pour que
// l'interface puisse filtrer dessus : « 120 Md (MoE) » n'est pas un nombre.
// `size` suit les paliers que le TD utilise déjà pour parler des modèles.
const MODELS = [
  { id: 'ministral-3b', slug: 'mistralai/ministral-3b-2512', name: 'Ministral 3B', params: '3 Md', billions: 3, arch: 'dense', expect: 'floor' },
  { id: 'gemma-4b', slug: 'google/gemma-3-4b-it', name: 'Gemma 3 4B', params: '4 Md', billions: 4, arch: 'dense', expect: 'floor' },
  { id: 'qwen3-8b', slug: 'qwen/qwen3-8b', name: 'Qwen3 8B', params: '8 Md', billions: 8, arch: 'dense', expect: 'climber' },
  { id: 'llama-8b', slug: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', params: '8 Md', billions: 8, arch: 'dense', expect: 'climber' },
  { id: 'ministral-8b', slug: 'mistralai/ministral-8b-2512', name: 'Ministral 8B', params: '8 Md', billions: 8, arch: 'dense', expect: 'climber' },
  { id: 'mistral-24b', slug: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small 24B', params: '24 Md', billions: 24, arch: 'dense', expect: 'climber' },
  { id: 'llama-70b', slug: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', params: '70 Md', billions: 70, arch: 'dense', expect: 'climber' },
  { id: 'gpt-oss-120b', slug: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', params: '120 Md (MoE)', billions: 120, arch: 'moe', expect: 'ceiling' },
  // Génération suivante, ajoutée en second temps. `maxTokens` déroge au
  // budget commun pour les modèles à raisonnement : à 700 tokens, Qwen 3.6
  // consomme tout en réflexion et ne rend AUCUNE réponse — il serait noté 0
  // et passerait pour cassé alors qu'il n'a simplement pas eu la place de
  // répondre. Le budget est reporté par modèle dans les résultats.
  { id: 'gemma-4-31b', slug: 'google/gemma-4-31b-it', name: 'Gemma 4 31B', params: '31 Md', billions: 31, arch: 'dense', expect: 'climber' },
  { id: 'qwen35-35b', slug: 'qwen/qwen3.6-35b-a3b', name: 'Qwen 3.6 35B', params: '35 Md (MoE)', billions: 35, arch: 'moe', expect: 'climber', maxTokens: 8000 },
  { id: 'mistral-small-2603', slug: 'mistralai/mistral-small-2603', name: 'Mistral Small 2603', params: '24 Md', billions: 24, arch: 'dense', expect: 'climber' },
  { id: 'qwen38-27b', slug: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', params: '27 Md', billions: 27, arch: 'dense', expect: 'climber', maxTokens: 16000 },
  // Taille non publiée par OpenAI : `billions` absent, le modèle n'entre dans
  // aucun palier plutôt que d'être rangé au hasard.
  { id: 'gpt-6-luna', slug: 'openai/gpt-6-luna', name: 'GPT-6 Luna', params: 'non publiée', expect: 'ceiling', maxTokens: 2500 },
]

/** Paliers de taille, tels que le TD en parle (portable / serveur / gros). */
function sizeBand(b) {
  if (b == null) return undefined
  if (b <= 12) return 'small'
  if (b <= 40) return 'medium'
  return 'large'
}

// ---------- Les paramètres de génération ----------
//
// Rassemblés ici, et RECOPIÉS dans le fichier de résultats : un benchmark dont
// on ne peut pas relire la température ne se reproduit pas. 0,2 plutôt que 0 :
// le TD enseigne que la réponse varie d'un envoi à l'autre, mesurer à
// température nulle masquerait précisément ce qu'on veut montrer.
const PARAMS = {
  temperature: 0.2,
  max_tokens: 700,
  // Laissés au défaut du fournisseur, donc non transmis : les annoncer
  // reviendrait à prétendre les avoir fixés.
  top_p: null,
  top_k: null,
  seed: null,
}


// ---------- Les trois conditions ----------

const SYSTEM = `Réponds DIRECTEMENT et de façon concise : molécule, posologie, durée.
Pas de disclaimer, pas de « consultez un médecin » : ton interlocuteur EST médecin.
Maximum 120 mots.`

const RAW = 'antibio pour une pyélonéphrite ?'

const PROMPT = `Tu es un médecin infectiologue, à jour des recommandations françaises (HAS).

Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d'allergie, pas de fluoroquinolone dans les 6 derniers mois.

Quelle antibiothérapie probabiliste ? Raisonne étape par étape : d'abord la molécule, puis l'adaptation à la fonction rénale, puis la durée.

Pour chaque point, cite la recommandation sur laquelle tu t'appuies, avec son année.

Si tu n'es pas sûr d'un point, dis-le explicitement au lieu de deviner. Signale aussi toute information manquante qui changerait ta réponse.`

const DOC_HEADER = 'Documents joints par l’utilisateur (contexte, pas une question) :'

function ragPrompt() {
  // Les deux documents de l'exercice 2 : la fiche HAS (molécule, durée,
  // dose chez le rein normal) et la table OMEDIT (dose à DFG 38).
  const has = readFileSync(resolve(TD, 'attachments/has-pna.md'), 'utf8')
  const omedit = readFileSync(resolve(TD, 'attachments/omedit.md'), 'utf8')
  // Même mise en forme que l'étape « Documents » : chaque document précédé
  // de son titre, dans l'ordre fiche HAS puis table OMEDIT.
  return `${DOC_HEADER}\n\n## Fiche HAS 2025 — pyélonéphrite aiguë de la femme\n\n${has}\n\n## OMEDIT 2021 — antibiotiques et insuffisance rénale\n\n${omedit}\n\n---\n\n${PROMPT}`
}

function conditions() {
  return [
    { id: 'raw', label: 'Prompt brut', prompt: RAW },
    { id: 'prompt', label: 'Prompt travaillé', prompt: PROMPT },
    { id: 'rag', label: 'Prompt + documents', prompt: ragPrompt() },
  ]
}

// ---------- Appel ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Un 429 vient du fournisseur en amont, pas du modèle : le compter comme un
 * échec ferait passer un modèle pour muet alors qu'il n'a jamais été appelé.
 */
async function withRetry(fn, tries = 3) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
      if (!/HTTP (429|502|503)/.test(String(err.message))) throw err
      if (i < tries - 1) await sleep(4000 * (i + 1))
    }
  }
  throw last
}

async function call(model, prompt, key, { maxTokens = PARAMS.max_tokens } = {}) {
  const started = Date.now()
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://teaching.example/td-chatbots',
      'X-Title': 'TD chatbots benchmark',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: PARAMS.temperature,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const choice = data.choices?.[0]
  // Certains modèles à raisonnement laissent `content` vide et ne remplissent
  // que `reasoning` : sans ce repli, ils seraient notés comme muets.
  const text = (choice?.message?.content || choice?.message?.reasoning || '').trim()
  return {
    text,
    usage: data.usage ?? null,
    ms: Date.now() - started,
    finish: choice?.finish_reason ?? null,
  }
}

// ---------- La grille de correction ----------
//
// Conservée ici comme RÉFÉRENCE de la relecture (elle n'est plus envoyée à
// aucune API) : elle dit exactement ce que « renal » ou « dose » signifient,
// pour que deux relectures successives notent pareil.
// Vérifiée sur attachments/has-pna.md et attachments/omedit.md (et sur les PDF).
//
// Chaque critère juge la JUSTESSE au regard des recommandations, pas la
// simple présence : une posologie chiffrée mais fantaisiste ne rapporte
// rien. Le DFG ne se juge que là où la question le donne — le prompt brut
// (« antibio pour une pyélonéphrite ? ») ne parle d'aucun rein, et pénaliser
// le modèle de ne pas l'avoir deviné mesurerait la question, pas le modèle.

export const RUBRIC = `Tu corriges la réponse d'un modèle de langage à une question d'antibiothérapie, selon la grille du TD.

LES TROIS CONDITIONS :
- raw    : « antibio pour une pyélonéphrite ? » — aucun patient, aucune fonction rénale. Le critère renal est SANS OBJET (null).
- prompt : femme de 68 ans, 62 kg, DFG 38 mL/min, PNA communautaire sans signe de gravité, pas d'allergie, pas de FQ depuis 6 mois.
- rag    : le même cas, avec la fiche HAS (attachments/has-pna.md) et la table OMEDIT 2021 (attachments/omedit.md) joints.

RÉFÉRENCE (fiche mémo HAS « Choix et durées d'antibiothérapies : pyélonéphrite aiguë de la femme », juillet 2021, mise à jour mai 2025 ; table OMEDIT Pays de la Loire, V1 2021) :
- Mme D. n'a AUCUN facteur de risque de complication (insuffisance rénale sévère = DFG < 30 ; âge > 75 ans, ou > 65 ans avec au moins 3 critères de Fried) : PNA SIMPLE.
- Probabiliste, 1re intention (pas de quinolone dans les 6 mois) : fluoroquinolone PER OS — ciprofloxacine 500 mg x2/j OU lévofloxacine 500 mg x1/j.
  2e intention (quinolone dans les 6 mois) : ceftriaxone IM ou IV 1 g/j (2 g/j si signes de gravité ou IMC > 30).
  Le céfotaxime, l'ofloxacine, les aminosides, l'aztréonam, les carbapénèmes NE figurent PAS dans le probabiliste de la PNA simple.
  Relais APRÈS antibiogramme (par ordre de préférence) : amoxicilline, cotrimoxazole, amoxicilline-acide clavulanique, FQ (dont ofloxacine 200 mg x2/j), céfixime, ceftriaxone.
- Posologies de référence (fonction rénale normale) : ciprofloxacine 500 mg x2/j (750 mg x2/j toléré : colonne normorénale OMEDIT « 500 ou 750 mg/8 à 12h ») ;
  lévofloxacine 500 mg/24h ; ceftriaxone 1 g/24h (« 1 à 2 g/24h » accepté : OMEDIT, infection modérée).
- DFG 38 = colonne 44-30 du PDF OMEDIT (tranche « DFG 30 à 59 » dans omedit.md, remis en forme) : ceftriaxone SANS adaptation ; ciprofloxacine 500 ou 750 mg toutes les 12 à 24 h (donc 500 mg x2/j reste conforme,
  x3/j ou toutes les 8 h ne l'est pas) ; lévofloxacine dose de charge 500 mg puis 250 mg/12 à 24h.
- Durée : 7 jours (fluoroquinolone ou ceftriaxone). 10 jours = PNA à risque de complication, donc FAUX ici.

CRITÈRES (true = acquis) :
molecule      : une fluoroquinolone per os (ciprofloxacine ou lévofloxacine) est proposée EN PREMIER, et TOUTES les autres molécules probabilistes
                figurent dans la fiche HAS pour cette indication. La ceftriaxone est acceptée comme alternative de 2e intention ; proposée seule ou
                en premier, = false. Céfotaxime ou ofloxacine en probabiliste = false. Une molécule de relais présentée comme relais selon
                l'antibiogramme est acceptée ; présentée comme traitement probabiliste, elle ne l'est pas.
                Nitrofurantoïne, fosfomycine, pivmécillinam, amoxicilline seule en probabiliste = false. Pas de molécule = false.
dose          : TOUTES les posologies chiffrées correspondent aux posologies de référence ci-dessus (fonction rénale normale ; l'adaptation au rein se juge dans renal).
                Aucune posologie chiffrée = false.
duration      : TOUTES les durées données pour cette PNA simple valent 7 jours. 10 ou 14 jours, ou une fourchette qui ne tranche pas (« 7 à 10 j »), = false.
                Aucune durée = false.
cites         : nomme au moins une recommandation ou source (HAS, SPILF, OMEDIT, RCP...). Une source inventée compte ici, elle est sanctionnée par trap_invented.
renal         : (prompt et rag seulement ; null en raw) la posologie proposée est CONFORME à la colonne 44-30 et le modèle le dit : FQ espacée ou réduite selon la table,
                ou affirmation explicite qu'aucune adaptation n'est requise quand c'est vrai (ceftriaxone ; ciprofloxacine à 12h reste dans « 12 à 24h »).
                Réduire la ceftriaxone, ignorer le DFG, ou recopier « DFG 38 » sans conséquence posologique = false.
trap_invented : (true = le modèle EST tombé dedans) invente une référence (année, numéro de section, grade, titre de recommandation qui n'existe pas),
                ou attribue à un document une information qu'il ne contient pas. Les erreurs cliniques ne vont PAS ici : elles sont déjà dans molecule/dose/duration.
                En rag, vérifier CHAQUE citation dans les documents (grep sur la posologie, pas sur le nom : la table OMEDIT éclate ses lignes).
refusal       : le modèle refuse de répondre sans proposer de molécule. Tous les critères sont alors false (renal reste null en raw).
empty         : aucune réponse (boucle de raisonnement, texte coupé avant toute conclusion) : score 0.

Réponds UNIQUEMENT par un objet JSON :
{"molecule":bool,"dose":bool,"duration":bool,"cites":bool,"renal":bool|null,"trap_invented":bool,"refusal":bool,"comment":"une phrase en français"}`

/**
 * Le barème, sur 100, QUE des points positifs : un critère rapporte quand il
 * est acquis, « aucune référence inventée » quand le piège est évité.
 *
 * Le rein ne compte qu'aux conditions qui le mentionnent. En `raw`, le score
 * est rapporté aux 80 points applicables, pour que « 100 » veuille dire la
 * même chose partout : rien à redire sur ce que la question permettait.
 */
export const WEIGHTS = {
  molecule: 20,
  dose: 20,
  duration: 15,
  cites: 10,
  renal: 20,
  trap_invented: 15,
}

const TRAP_KEYS = new Set(['trap_invented'])

export function score(v, condition) {
  if (!v || v.empty) return 0
  let earned = 0
  let max = 0
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    if (key === 'renal' && (condition === 'raw' || v.renal === null)) continue
    max += weight
    const ok = TRAP_KEYS.has(key) ? v[key] !== true : v[key] === true
    if (ok) earned += weight
  }
  return Math.round((earned / max) * 100)
}

// ---------- Classification ----------
//
// C'est la sortie utile pour les autres facultés : que vaut ce modèle POUR
// CE TD, pas dans l'absolu.

/**
 * Le profil se lit sur la condition finale (prompt + documents), puis sur le
 * point de départ (prompt brut).
 *
 * L'instabilité ne se mesure QUE sur la condition finale : un modèle peut
 * varier sur le prompt brut ou travaillé — il hésite entre plusieurs réponses
 * de mémoire, ce que le TD veut précisément montrer — puis se stabiliser dès
 * qu'il a les recommandations sous les yeux. Le RAG a alors supprimé le
 * hasard, ce n'est pas une instabilité.
 *
 * Les seuils supposent le barème actuel, où aucun point n'est gratuit sauf
 * les 15 de « aucune référence inventée » : une réponse fausse mais sans
 * source tombe autour de 15-30.
 */
function classify(raw, rag, ragSpread) {
  if (rag < 60) return 'floor'           // mauvais même documents en main
  if (ragSpread >= 30) return 'unstable' // le RAG ne suffit pas à le fixer
  if (raw >= 75) return 'ceiling'        // bon dès la question brute
  if (rag >= 80 && rag - raw >= 20) return 'climber' // le prompt et les sources font la différence
  return 'flat'                          // progresse sans devenir fiable
}

const CLASS_LABEL = {
  ceiling: 'Bon d’emblée',
  climber: 'Progresse avec prompt et sources',
  flat: 'Intermédiaire',
  floor: 'Mauvais quoi qu’il arrive',
  unstable: 'Trop instable d’un tirage à l’autre',
}

// ---------- Exécution ----------

async function main() {
  const args = process.argv.slice(2)
  const pick = (f) => {
    const i = args.indexOf(f)
    return i >= 0 ? args[i + 1] : null
  }
  const only = pick('--models')?.split(',').map((s) => s.trim())
  const repeats = Number(pick('--repeats') ?? 1)
  const dry = args.includes('--dry')

  const key = apiKey()
  const models = only ? MODELS.filter((m) => only.includes(m.id)) : MODELS
  // `--conditions rag` ne rejoue que les conditions nommées : les tirages des
  // autres sont conservés tels quels. C'est ce qui permet de changer les
  // documents joints sans repayer les deux conditions qui n'en ont pas.
  const onlyConds = pick('--conditions')?.split(',').map((s) => s.trim())
  const conds = onlyConds ? conditions().filter((c) => onlyConds.includes(c.id)) : conditions()
  // `--add` cumule avec les tirages déjà enregistrés au lieu de les écraser :
  // c'est ce qui permet de rejouer 10 tirages sur les seuls modèles instables
  // sans repayer les six autres, ni perdre leurs résultats.
  const add = args.includes('--add')
  // Aucune correction automatique : le script RECUEILLE les réponses, la
  // notation est faite par relecture (verdicts.json). Un juge appelé par API
  // doublait le coût de chaque run pour un verdict moins fiable.

  if (dry) {
    for (const c of conds) console.log(`--- ${c.id} (${c.prompt.length} car.) ---\n${c.prompt.slice(0, 300)}\n`)
    return
  }

  const outDir = resolve(TD, 'bench')

  // Les verdicts écrits à la main (relecture humaine des réponses), indexés
  // `modelId/condition/run`. Ils PRIMENT sur toute correction automatique :
  // c'est la source de vérité de la notation.
  let manual = {}
  try {
    manual = JSON.parse(readFileSync(resolve(outDir, 'verdicts.json'), 'utf8')).verdicts ?? {}
  } catch {
    // Pas encore de verdicts : les scores resteront nuls jusqu'à relecture.
  }

  let prior = []
  // Les tirages réussis des modèles qu'on rejoue, indexés par clef : ils
  // servent de filet si la nouvelle tentative échoue (voir plus bas).
  let fallback = new Map()
  if (add || onlyConds) {
    try {
      const file = JSON.parse(readFileSync(resolve(outDir, 'results.json'), 'utf8'))
      // On ne garde que les tirages des modèles/conditions qu'on ne rejoue pas
      // ici ; ceux qu'on rejoue sont remplacés par la nouvelle série.
      const touched = new Set(models.map((m) => m.id))
      const replayed = (r) =>
        touched.has(r.modelId) && (!onlyConds || onlyConds.includes(r.condition))
      prior = (file.runs ?? []).filter((r) => !replayed(r))
      for (const r of file.runs ?? []) {
        if (replayed(r) && !r.error) {
          fallback.set(`${r.modelId}/${r.condition}/${r.run}`, r)
        }
      }
      const kept = new Set(prior.map((r) => r.modelId))
      console.log(`+ cumul : ${prior.length} tirages conservés (${[...kept].join(', ')})\n`)
    } catch {
      console.log('+ cumul demandé mais aucun results.json lisible : run complet.\n')
    }
  }

  const results = []
  for (const model of models) {
    for (const cond of conds) {
      for (let r = 0; r < repeats; r++) {
        const tag = `${model.id} / ${cond.id}${repeats > 1 ? ` #${r + 1}` : ''}`
        try {
          const out = await withRetry(() =>
            call(model.slug, cond.prompt, key, {
              maxTokens: model.maxTokens ?? PARAMS.max_tokens,
            }),
          )
          const verdict = null
          const s = null
          results.push({
            modelId: model.id, model: model.name, params: model.params, expect: model.expect,
            condition: cond.id, run: r, score: s, verdict,
            answer: out.text, ms: out.ms, usage: out.usage, finish: out.finish,
          })
          console.log(
            `✓ ${tag.padEnd(34)} ${s === null ? '  —' : String(s).padStart(3)}/100  ${out.ms}ms  ${out.usage?.total_tokens ?? '?'} tok`,
          )
        } catch (err) {
          // Un fournisseur saturé ne doit pas DÉTRUIRE une mesure déjà
          // obtenue : sans ce filet, relancer un modèle rate-limité rendait
          // le fichier plus pauvre qu'avant la relance.
          const keep = fallback.get(`${model.id}/${cond.id}/${r}`)
          if (keep) {
            results.push(keep)
            console.log(`↺ ${tag.padEnd(34)} échec — tirage précédent conservé`)
          } else {
            results.push({ modelId: model.id, model: model.name, condition: cond.id, run: r, error: String(err.message ?? err) })
            console.log(`✗ ${tag.padEnd(34)} ${err.message ?? err}`)
          }
        }
      }
    }
  }

  // Agrégat par modèle : moyenne par condition, puis classification.
  const allRuns = [...prior, ...results].map((r) => {
    const key = `${r.modelId}/${r.condition}/${r.run}`
    const v = manual[key]
    if (!v) return r
    return { ...r, verdict: { ...v, source: 'human' }, score: score(v, r.condition) }
  })
  const allModels = add || onlyConds ? MODELS.filter((m) => allRuns.some((r) => r.modelId === m.id)) : models
  const byModel = []
  for (const model of allModels) {
    const mine = allRuns.filter((r) => r.modelId === model.id && !r.error)
    // La dispersion est une donnée du TD, pas un défaut à lisser : à
    // température non nulle, le même modèle ne répond pas deux fois pareil,
    // et c'est précisément ce que l'étape « Hasard » veut faire voir.
    const stat = (id) => {
      const rs = mine.filter((r) => r.condition === id && typeof r.score === 'number')
      const xs = rs.map((r) => r.score)
      if (!xs.length) return { mean: 0, min: 0, max: 0, n: 0, refusals: 0 }
      const mean = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
      // Un refus n'est pas une erreur clinique. Le compter à part évite de
      // ranger « je ne peux pas prescrire » avec « nitrofurantoïne ».
      const refusals = rs.filter((r) => r.verdict?.refusal === true).length
      return { mean, min: Math.min(...xs), max: Math.max(...xs), n: xs.length, refusals }
    }
    const raw = stat('raw')
    const prompt = stat('prompt')
    const rag = stat('rag')
    // Une condition jamais mesurée n'est pas un zéro : un modèle retiré par
    // le fournisseur avant la relance (Qwen3 8B, octobre 2026) sortirait
    // classé « mauvais quoi qu'il arrive » sur un score qu'il n'a pas eu.
    if (raw.n === 0 || prompt.n === 0 || rag.n === 0) {
      console.log(`  (${model.name} écarté : une condition n'a aucun tirage noté)`)
      continue
    }
    // `spread` reste le pire des trois : c'est ce que la barre d'étendue
    // montre à l'écran. Mais seule la variabilité de la condition finale
    // décide de la classe — voir `classify`.
    const spread = Math.max(raw.max - raw.min, prompt.max - prompt.min, rag.max - rag.min)
    const ragSpread = rag.max - rag.min
    const refusals = raw.refusals + prompt.refusals + rag.refusals
    const klass = classify(raw.mean, rag.mean, ragSpread)
    byModel.push({
      id: model.id, name: model.name, params: model.params, slug: model.slug,
      billions: model.billions, arch: model.arch, size: sizeBand(model.billions),
      // Reporté par modèle : sans lui, la page annoncerait 700 tokens pour
      // tout le monde alors que les modèles à raisonnement mesurent à 2500.
      maxTokens: model.maxTokens ?? PARAMS.max_tokens,
      expect: model.expect, raw, prompt, rag,
      gain: Math.max(prompt.mean, rag.mean) - raw.mean,
      spread, ragSpread, refusals, klass, klassLabel: CLASS_LABEL[klass],
    })
  }

  console.log('\n' + '─'.repeat(78))
  console.log('modèle'.padEnd(20) + 'brut'.padStart(9) + 'prompt'.padStart(10) + 'RAG'.padStart(10) + 'gain'.padStart(7) + '  classification')
  console.log('─'.repeat(78))
  const show = (s) => `${s.mean}${s.n > 1 && s.max > s.min ? `±${Math.round((s.max - s.min) / 2)}` : ''}`
  for (const m of byModel) {
    console.log(
      m.name.padEnd(20) +
      show(m.raw).padStart(9) + show(m.prompt).padStart(10) + show(m.rag).padStart(10) +
      String(m.gain > 0 ? `+${m.gain}` : m.gain).padStart(7) +
      `  ${m.klass}${m.refusals ? ` [${m.refusals} refus]` : ''}${m.klass !== m.expect ? ` (attendu: ${m.expect})` : ''}`,
    )
  }

  mkdirSync(outDir, { recursive: true })
  // `repeats` doit refléter ce que le fichier contient RÉELLEMENT : après un
  // cumul, les modèles n'ont pas tous le même nombre de tirages, et annoncer
  // « 3 tirages » sur une page qui en montre 10 serait faux.
  const perCell = byModel.map((m) => Math.max(m.raw.n, m.prompt.n, m.rag.n))
  const payload = {
    ranAt: new Date().toISOString(),
    judge: 'relecture humaine',
    // Les prompts sont stockés UNE fois, pas par tirage : le prompt RAG pèse
    // ~31 000 caractères, le répéter à chaque ligne rendrait le fichier
    // inexploitable. L'interface les rattache par `condition`.
    system: SYSTEM,
    prompts: Object.fromEntries(conds.map((c) => [c.id, c.prompt])),
    params: PARAMS,
      provider: 'OpenRouter (https://openrouter.ai/api/v1)',
    repeats: perCell.length ? Math.min(...perCell) : repeats,
    repeatsMax: perCell.length ? Math.max(...perCell) : repeats,
    models: byModel,
    runs: allRuns,
  }
  writeFileSync(resolve(outDir, 'results.json'), JSON.stringify(payload, null, 2))
  const pending = allRuns.filter((r) => !r.error && typeof r.score !== 'number').length
  if (pending > 0) {
    console.log(
      `\n⚠ ${pending} tirage(s) sans note : à corriger à la main dans bench/verdicts.json`,
    )
  }
  console.log(`\n→ ${resolve(outDir, 'results.json')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

// ============================================================
// Mode HORS LIGNE — rejoue des réponses réelles, sans backend.
//
// Pourquoi ce mode existe : une salle sans wifi, une clé API épuisée, un
// fournisseur en panne le matin du TD. Sans lui, la séance s'arrête. Avec
// lui, elle se déroule à l'identique — au prix d'un choix de questions
// restreint, ce qui est annoncé franchement à l'étudiant.
//
// Deux partis pris, tous deux importants :
//
//   1. RIEN N'EST ÉCRIT À LA MAIN. Chaque réponse sort d'un appel réel au
//      modèle, capturé par `apps/api/scripts/capture_offline.mjs` avec ses
//      vrais décomptes de tokens et ses vrais temps. Les erreurs cliniques
//      des modèles sont donc AUTHENTIQUES : c'est tout l'objet du TD, et
//      les inventer les rendrait indéfendables.
//
//   2. LE REJEU IMITE LE RÉEL. Attente avant le premier mot, streaming
//      saccadé au rythme mesuré, décompte de tokens : l'étudiant ne doit
//      pas voir une réponse apparaître d'un bloc. Ce qu'il observe (« le
//      gros modèle est plus lent ») doit rester vrai hors ligne.
//
// Ce qui reste impossible hors ligne : poser une question libre. Le champ
// de saisie est donc verrouillé, et l'étudiant choisit parmi des bulles.
// ============================================================

import raw from './offline-captures.json'
// Import de TYPES uniquement : `client.ts` importe `replayKey` d'ici, et un
// import de valeur créerait un cycle à l'exécution. `import type` disparaît
// à la compilation, donc le cycle n'existe pas.
import type { FreeChatResult, HistoryMessage, TokenUsage } from './client'

/** Une réponse capturée, avec de quoi rejouer sa temporalité. */
export interface Capture {
  /** La question posée — sert à retrouver la capture depuis le texte envoyé. */
  prompt: string
  text: string
  usage: TokenUsage | null
  /** Attente mesurée avant le premier fragment, en millisecondes. */
  waitMs: number
  /** Durée de génération mesurée, du premier au dernier fragment. */
  genMs: number
  /** Intervalle médian entre deux fragments : donne son rythme au rejeu. */
  medianGapMs: number
  /** Passages retenus par la recherche, à l'étape « Documents ». */
  sources?: OfflineSource[] | null
  semantic?: boolean
}

/** Un extrait retenu par la recherche, tel que capturé. */
export interface OfflineSource {
  /** Le document dont vient le passage, quand plusieurs sont joints. */
  docId?: string
  title: string
  path: string[]
  page: number
  text: string
  score: number
}

interface CaptureFile {
  capturedAt?: string
  backend?: string
  captures: Record<string, Capture>
}

const FILE = raw as CaptureFile
const CAPTURES = FILE.captures ?? {}

export const CAPTURED_AT = FILE.capturedAt ?? ''

/**
 * Clé de rejeu : `étape|modèle|identifiant`. L'étape et le modèle en font
 * partie parce que la même question, posée à un autre modèle ou dans une
 * autre étape, doit rendre une AUTRE réponse — sinon la comparaison entre
 * modèles, qui est le cœur du TD, ne veut plus rien dire.
 */
export function captureKey(...parts: string[]): string {
  return parts.join('|')
}

export function getCapture(key: string): Capture | null {
  return CAPTURES[key] ?? null
}

export function hasCapture(key: string): boolean {
  return key in CAPTURES
}

/**
 * Existe-t-il au moins une réponse enregistrée pour ce modèle, à cette étape ?
 *
 * Toutes les étapes n'ont pas capturé tous les modèles : « La mémoire » et
 * « Documents » n'ont que Llama 3.3 70B, la comparaison entre modèles n'étant pas
 * leur objet. La barre de modèles s'en sert pour griser ce qui ne peut pas
 * être rejoué, au lieu de laisser survenir une erreur réseau.
 */
export function hasCapturesFor(step: string, modelId: string): boolean {
  const prefix = `${step}|${modelId}|`
  for (const key in CAPTURES) if (key.startsWith(prefix)) return true
  return false
}

/**
 * Les modèles pour lesquels des réponses ont été enregistrées.
 *
 * Hors ligne, la liste des modèles n'est pas une préférence : c'est un FAIT.
 * Rien n'a été capturé pour un modèle ajouté à la main, et le proposer
 * mènerait à un envoi sans réponse. Les clefs sont de la forme
 * `étape|modèle|…` : le deuxième segment est l'identifiant du modèle.
 */
export function capturedModelIds(): string[] {
  const ids = new Set<string>()
  for (const key in CAPTURES) {
    const id = key.split('|')[1]
    if (id) ids.add(id)
  }
  return [...ids]
}

/**
 * Recherche par TEXTE de question, dans une étape et pour un modèle donnés.
 *
 * Sert au repli : si la clé exacte manque (l'étudiant a rejoué une bulle
 * après un changement de modèle, par exemple), on retrouve la capture dont
 * la question correspond. La comparaison est faite sur un texte normalisé,
 * l'espacement et la casse ne devant pas faire échouer un rejeu légitime.
 */
export function findCaptureByPrompt(
  step: string,
  modelId: string,
  prompt: string,
): { key: string; capture: Capture } | null {
  const wanted = normalise(prompt)
  const prefix = `${step}|${modelId}|`
  for (const [key, capture] of Object.entries(CAPTURES)) {
    if (key.startsWith(prefix) && normalise(capture.prompt) === wanted) {
      return { key, capture }
    }
  }
  return null
}

function normalise(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

// ---------- Rejeu ----------

/**
 * Découpe le texte en fragments d'apparence naturelle.
 *
 * On coupe par MOT plutôt que par caractère : c'est ainsi que les vrais
 * modèles émettent (un token vaut à peu près un mot court), et le rendu à
 * l'écran est le même. Couper par caractère donnerait un effet machine à
 * écrire, qui ne ressemble à aucun fournisseur réel.
 */
function toChunks(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text]
}

/** Pause interruptible : `stop` évite d'attendre après une annulation. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve()
      return
    }
    const timer = setTimeout(done, ms)
    function done() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    signal?.addEventListener('abort', done, { once: true })
  })
}

/**
 * Facteur de vitesse du rejeu.
 *
 * 1 = temps réel mesuré. Certaines captures durent 30 secondes (Gemma 3 4B
 * sans consigne système) : c'est authentique, mais insoutenable pour une
 * classe entière qui attend. On accélère donc, sans jamais rendre le rejeu
 * instantané — l'écart entre un petit et un gros modèle doit rester
 * PERCEPTIBLE, puisque c'est une des observations de la séance.
 */
const SPEED = 1.4
/** Plafond d'attente initiale : au-delà, l'écran paraît figé. */
const MAX_WAIT_MS = 2500
/**
 * Plancher de durée d'écriture, en millisecondes.
 *
 * Les réponses courtes des gros modèles se génèrent en moins d'une seconde :
 * rejouées telles quelles, elles apparaissent d'un bloc, et l'étudiant ne voit
 * plus le texte s'écrire — or c'est cette écriture progressive qui rend
 * tangible le fait que le modèle produit mot après mot.
 */
const MIN_GEN_MS = 900

export interface ReplayOptions {
  onDelta: (chunk: string) => void
  signal?: AbortSignal
}

/**
 * Rejoue une capture comme si elle arrivait du réseau.
 *
 * Le résultat a exactement la forme d'un appel réel (`FreeChatResult`), y
 * compris `usage` : les compteurs de tokens et l'empreinte carbone du TD
 * continuent donc de fonctionner hors ligne, sur des chiffres mesurés.
 */
export async function replay(
  capture: Capture,
  { onDelta, signal }: ReplayOptions,
): Promise<FreeChatResult> {
  const chunks = toChunks(capture.text)
  const wait = Math.min(capture.waitMs / SPEED, MAX_WAIT_MS)
  await sleep(wait, signal)

  if (signal?.aborted) return { text: '', source: 'demo', stopped: true }

  // Le rythme vient de la durée totale mesurée, répartie sur les fragments.
  // On repart de `genMs` plutôt que de `medianGapMs` seul : c'est la durée
  // qui a été observée, et elle reste juste même si le découpage en mots
  // diffère un peu de celui du fournisseur.
  const genMs = Math.max(capture.genMs / SPEED, MIN_GEN_MS)
  const perChunk = chunks.length > 0 ? genMs / chunks.length : 0

  let full = ''
  for (const chunk of chunks) {
    if (signal?.aborted) {
      // Interruption VOLONTAIRE : on garde ce qui a déjà été « reçu », comme
      // le fait le vrai client. Sans cela, « Arrêter » ferait disparaître la
      // réponse à moitié écrite.
      return { text: full, source: 'demo', stopped: true, usage: undefined }
    }
    full += chunk
    onDelta(chunk)
    await sleep(perChunk, signal)
  }

  return {
    text: full,
    source: 'demo',
    usage: capture.usage
      ? { ...capture.usage, waitMs: capture.waitMs, genMs: capture.genMs }
      : undefined,
  }
}

/**
 * Rejoue la capture correspondant à une clé, ou signale son absence.
 *
 * `no-capture` n'est pas une panne : c'est le cas normal quand l'étudiant
 * s'écarte des questions préparées. L'appelant l'affiche comme tel.
 */
export async function replayKey(
  key: string,
  options: ReplayOptions,
): Promise<FreeChatResult> {
  const capture = getCapture(key)
  if (!capture) return { text: '', source: 'demo', error: 'no-capture' }
  return replay(capture, options)
}

// ---------- Mémoire : reconstitution de l'historique ----------

/**
 * Historique d'une séquence hors ligne, jusqu'au tour demandé.
 *
 * L'étape « La mémoire » a besoin des tours précédents pour montrer ce qui
 * repart réellement dans la requête. Hors ligne, ils viennent des captures
 * de la même séquence — donc du texte que le modèle a VRAIMENT produit.
 */
export function offlineHistory(
  step: string,
  modelId: string,
  mode: string,
  turnIds: string[],
): HistoryMessage[] {
  const out: HistoryMessage[] = []
  for (const id of turnIds) {
    const capture = getCapture(captureKey(step, modelId, mode, id))
    if (!capture) continue
    out.push({ role: 'user', content: capture.prompt })
    out.push({ role: 'assistant', content: capture.text })
  }
  return out
}

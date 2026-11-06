// ============================================================
// Client "LLM" du TD chatbots.
//
// DEUX DIALECTES, une seule interface pour les étapes.
//
//   'td'     → notre backend (apps/api), qui détient la clef côté serveur.
//              Format maison : POST /api/chat/stream, SSE { delta, usage }.
//   'openai' → Ollama, OpenRouter, ou tout service compatible, appelé
//              DIRECTEMENT depuis le navigateur avec la clef saisie dans les
//              réglages. Format standard : POST {baseUrl}/chat/completions,
//              SSE { choices[].delta.content }.
//
// Les étapes appellent `chatFreeStream` sans savoir lequel répond — ni même
// si la réponse vient d'une capture rejouée hors ligne.
//
// Réglages persistés en localStorage (voir settings.ts).
// ============================================================

import type { Lang } from '@/lib/useLang'
import { tr } from './data'
import type { PromptKind } from './data'
import { DEMO_RESPONSES, FREE_PROMPT_FALLBACK, type DemoResponse } from './demo-responses'
import { replayKey } from './offline'
import { getSettings, providerShape, type ChatbotsSettings, tdModels } from './settings'
import { mixedContent, presetOf } from './providers'

// ---------- Ce qui distingue les deux dialectes ----------

/** Pourquoi aucun appel ne peut partir, dit précisément. */
function configError(s: ChatbotsSettings): string {
  if (s.offlineMode) return 'no-capture'
  const preset = presetOf(s.provider.id)
  if (!s.provider.baseUrl.trim()) return 'no-api'
  if (preset.needsKey && !s.provider.apiKey.trim()) return 'no-key'
  return 'no-api'
}

function authHeaders(s: ChatbotsSettings): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // Jamais d'en-tête vide : certains serveurs (dont Ollama derrière un proxy)
  // rejettent un « Bearer » sans valeur, alors qu'ils acceptent l'absence.
  const key = s.provider.apiKey.trim()
  if (key) headers.Authorization = `Bearer ${key}`
  return headers
}

function root(s: ChatbotsSettings): string {
  return s.provider.baseUrl.replace(/\/$/, '')
}

/**
 * Le nom du modèle chez le fournisseur courant.
 *
 * Les étapes transmettent le slug OpenRouter (`google/gemma-3-4b-it`), seul
 * nom qu'elles connaissent. Ollama, lui, attend `gemma3:4b` : la traduction
 * se fait ICI plutôt que dans chaque étape, pour qu'aucune ne puisse
 * l'oublier. Sans correspondance enregistrée, le slug part tel quel.
 */
function resolveModel(s: ChatbotsSettings, slug: string): string {
  // La table est indexée par identifiant de modèle du TD ; on retrouve donc
  // l'identifiant à partir du slug, seul élément dont on dispose ici.
  const id = tdModels().find((m) => m.slug === slug)?.id
  const mapped = id ? s.provider.modelMap[id] : undefined
  return mapped?.trim() || slug
}

function streamUrl(s: ChatbotsSettings, shape: 'td' | 'openai'): string {
  return shape === 'openai' ? `${root(s)}/chat/completions` : `${root(s)}/api/chat/stream`
}

function plainUrl(s: ChatbotsSettings, shape: 'td' | 'openai'): string {
  return shape === 'openai' ? `${root(s)}/chat/completions` : `${root(s)}/api/chat`
}

/**
 * Corps au format OpenAI. La consigne système et l'historique redeviennent
 * des messages, comme le fait déjà le backend de son côté : le JSON montré
 * en mode développeur reste donc fidèle à ce qui part réellement.
 *
 * `top_k` est volontairement omis : il ne fait pas partie de la spécification
 * OpenAI, et un serveur strict rejette la requête entière à cause de lui.
 */
function openAiBody(
  model: string,
  prompt: string,
  system: string | undefined,
  history: HistoryMessage[] | undefined,
  sampling: Sampling | undefined,
  stream: boolean,
): Record<string, unknown> {
  const messages: { role: string; content: string }[] = []
  if (system?.trim()) messages.push({ role: 'system', content: system })
  for (const h of history ?? []) messages.push({ role: h.role, content: h.content })
  messages.push({ role: 'user', content: prompt })

  const body: Record<string, unknown> = { model, messages, temperature: sampling?.temperature }
  if (sampling?.topP !== undefined) body.top_p = sampling.topP
  if (stream) {
    body.stream = true
    // Sans cela, aucun décompte de tokens n'est renvoyé — or le compteur est
    // une pièce centrale du TD.
    body.stream_options = { include_usage: true }
  }
  return body
}

/**
 * Un statut HTTP traduit en cause identifiable.
 *
 * Sans cela, une clef fausse et un serveur éteint donnaient le même message
 * (« injoignable »), et l'étudiant cherchait la panne du mauvais côté.
 */
function httpError(status: number): string {
  if (status === 401 || status === 403) return 'bad-key'
  if (status === 404) return 'bad-model'
  if (status === 429) return 'rate-limit'
  return `API ${status}`
}

/**
 * Code d'erreur final, à partir de ce qui a été levé.
 *
 * `aborted` ne dit PAS pourquoi : un `AbortError` remonte aussi bien du
 * garde-temps interne (`chat`) que du bouton « Arrêter » de l'étudiant. Seul
 * l'appelant sait lequel, d'où le paramètre — l'annoncer partout comme un
 * dépassement de délai conseillait « choisissez un modèle plus petit » à
 * quelqu'un qui venait simplement d'interrompre une réponse trop longue.
 */
function errorCode(err: unknown, aborted: boolean, abortCode = 'timeout'): string {
  if (aborted) return abortCode
  const msg = err instanceof Error ? err.message : ''
  if (['bad-key', 'bad-model', 'rate-limit', 'mixed-content'].includes(msg)) return msg
  return 'unreachable'
}

/** Le texte d'une réponse NON diffusée, selon le dialecte. */
async function readPlain(res: Response, shape: 'td' | 'openai'): Promise<string> {
  const data = (await res.json()) as Record<string, unknown>
  if (shape === 'td') return (data.text as string) ?? ''
  const choices = data.choices as { message?: { content?: string } }[] | undefined
  return choices?.[0]?.message?.content ?? ''
}

/** Un fragment de flux, ramené à la même forme quel que soit le dialecte. */
interface Frame {
  delta?: string
  usage?: TokenUsage
  error?: string
}

function parseFrame(payload: string, shape: 'td' | 'openai'): Frame {
  const obj = JSON.parse(payload) as Record<string, unknown>

  if (shape === 'td') {
    const o = obj as { delta?: string; error?: string; usage?: TokenUsage }
    return { delta: o.delta, usage: o.usage, error: o.error }
  }

  // Chez OpenAI et compatibles, l'erreur est un OBJET : la passer telle quelle
  // à `new Error()` afficherait « [object Object] » à l'étudiant.
  const err = obj.error as { message?: string } | string | undefined
  const choices = obj.choices as { delta?: { content?: string } }[] | undefined
  const u = obj.usage as
    | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    | undefined

  return {
    delta: choices?.[0]?.delta?.content,
    usage: u
      ? {
          prompt: u.prompt_tokens ?? 0,
          completion: u.completion_tokens ?? 0,
          total: u.total_tokens ?? 0,
        }
      : undefined,
    error: typeof err === 'string' ? err : err?.message,
  }
}

export interface ChatResult {
  modelId: string
  text: string
  /** Provenance de la réponse, pour l'affichage honnête ("mode démo"). */
  source: 'api' | 'demo'
  /** Métadonnées de correction (connues en démo ; côté API on les rattache à part). */
  demo?: DemoResponse
}

const REQUEST_TIMEOUT_MS = 60_000

/** Résout la réponse démo d'un modèle pour un prompt donné. */
function demoFor(modelId: string, promptKind: PromptKind | 'free'): DemoResponse {
  const byPrompt = DEMO_RESPONSES[modelId]
  const kind = promptKind === 'free' ? FREE_PROMPT_FALLBACK : promptKind
  return byPrompt[kind]
}

function toDemoResult(lang: Lang, modelId: string, promptKind: PromptKind | 'free'): ChatResult {
  const demo = demoFor(modelId, promptKind)
  return { modelId, text: tr(lang, demo.text), source: 'demo', demo }
}

interface ChatRequest {
  lang: Lang
  modelId: string
  /** Slug du modèle transmis au backend (proxy OpenRouter), ex. qwen/qwen3-8b. */
  ollamaTag: string
  /** Le texte réellement envoyé (prompt pré-écrit résolu, ou texte libre). */
  promptText: string
  /** Sert à retrouver la bonne réponse démo. */
  promptKind: PromptKind | 'free'
  /** Contexte RAG optionnel (extraits injectés). */
  ragContext?: string
}

/**
 * Envoie un prompt à UN modèle. Tente l'API si configurée et hors mode démo,
 * sinon (ou en cas d'échec) rejoue la réponse placeholder.
 */
export async function chat(req: ChatRequest): Promise<ChatResult> {
  const settings = getSettings()

  const shape = providerShape(settings)
  if (shape === 'none') return toDemoResult(req.lang, req.modelId, req.promptKind)

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(plainUrl(settings, shape), {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify(
        shape === 'openai'
          ? openAiBody(
              resolveModel(settings, req.ollamaTag),
              req.ragContext ? `${req.ragContext}\n\n---\n\n${req.promptText}` : req.promptText,
              undefined,
              undefined,
              undefined,
              false,
            )
          : {
              model: resolveModel(settings, req.ollamaTag),
              prompt: req.promptText,
              rag_context: req.ragContext ?? null,
            },
      ),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(httpError(res.status))
    const text = await readPlain(res, shape)
    if (!text) throw new Error('Réponse API vide')
    return { modelId: req.modelId, text, source: 'api' }
  } catch {
    // Repli silencieux sur la démo : la séance ne doit jamais être bloquée.
    return toDemoResult(req.lang, req.modelId, req.promptKind)
  } finally {
    window.clearTimeout(timeout)
  }
}

/** Envoie le même prompt aux plusieurs modèles en parallèle. */
export async function chatBatch(reqs: ChatRequest[]): Promise<ChatResult[]> {
  return Promise.all(reqs.map(chat))
}

// ---------- Bac à sable (échauffement) ----------

/** Décompte de tokens renvoyé par le fournisseur. */
export interface TokenUsage {
  prompt: number
  completion: number
  total: number
  /**
   * Durée de GÉNÉRATION en millisecondes : du premier fragment reçu à la fin
   * du flux. On exclut volontairement l'attente initiale, qui dépend surtout
   * de la longueur de l'entrée à lire — c'est justement ce qu'on veut pouvoir
   * comparer séparément (voir `waitMs`).
   */
  genMs?: number
  /** Attente avant le premier fragment : le temps de « lire » la requête. */
  waitMs?: number
}

export interface FreeChatResult {
  text: string
  source: 'api' | 'demo'
  usage?: TokenUsage
  /** Message d'erreur lisible quand l'appel a échoué (mode démo indisponible ici). */
  error?: string
  /**
   * La génération a été interrompue par l'étudiant. `text` porte alors ce qui
   * avait déjà été produit ; il n'y a pas de décompte de tokens, le flux
   * s'étant arrêté avant que le fournisseur ne l'envoie.
   */
  stopped?: boolean
}

/**
 * Appel libre pour l'échauffement : prompt écrit par l'étudiant, modèle
 * choisi par lui. Contrairement à `chat`, il n'y a pas de réponse démo
 * pré-écrite possible (le prompt est arbitraire) : en l'absence d'API on
 * le dit franchement plutôt que de rejouer une réponse hors sujet.
 */
export async function chatFree(
  slug: string,
  prompt: string,
  system?: string,
): Promise<FreeChatResult> {
  const settings = getSettings()

  const shape = providerShape(settings)
  if (shape === 'none') {
    return { text: '', source: 'demo', error: configError(settings) }
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(plainUrl(settings, shape), {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify(
        shape === 'openai'
          ? openAiBody(resolveModel(settings, slug), prompt, system, undefined, undefined, false)
          : { model: resolveModel(settings, slug), prompt, system: system ?? null },
      ),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(httpError(res.status))
    const text = await readPlain(res, shape)
    if (!text) throw new Error('empty')
    return { text, source: 'api' }
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    return { text: '', source: 'demo', error: errorCode(err, aborted) }
  } finally {
    window.clearTimeout(timeout)
  }
}

/**
 * Variante en flux : `onDelta` est appelé à chaque fragment reçu, ce qui
 * permet d'afficher la réponse au fil de sa génération. Le texte complet
 * est renvoyé à la fin.
 */
/** Réglages d'échantillonnage, manipulés à l'étape « Les réglages ». */
export interface Sampling {
  temperature?: number
  topP?: number
  topK?: number
}

/** Un tour de conversation déjà joué, renvoyé au modèle pour lui donner une mémoire. */
export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatFreeStream(
  slug: string,
  prompt: string,
  system: string | undefined,
  onDelta: (chunk: string) => void,
  sampling?: Sampling,
  signal?: AbortSignal,
  history?: HistoryMessage[],
  /**
   * Clé de rejeu hors ligne. Quand elle est fournie ET que le mode hors
   * ligne est actif, aucune requête ne part : la réponse enregistrée est
   * rejouée avec sa temporalité réelle.
   *
   * L'interception est ICI, et non dans chaque étape, pour que le mode hors
   * ligne n'ait qu'un seul point d'entrée : les étapes continuent d'appeler
   * `chatFreeStream` sans savoir d'où vient la réponse.
   */
  offlineKey?: string,
): Promise<FreeChatResult> {
  const settings = getSettings()

  if (settings.offlineMode) {
    if (!offlineKey) return { text: '', source: 'demo', error: 'no-capture' }
    return replayKey(offlineKey, { onDelta, signal })
  }

  const shape = providerShape(settings)
  if (shape === 'none') {
    return { text: '', source: 'demo', error: configError(settings) }
  }

  // Une page en https ne peut pas appeler une adresse en http : le navigateur
  // refuse avant d'émettre, et l'erreur est indiscernable d'un serveur éteint.
  // On la nomme, sinon le message affiché envoie chercher au mauvais endroit.
  if (mixedContent(settings.provider.baseUrl)) {
    return { text: '', source: 'demo', error: 'mixed-content' }
  }

  // Hors du `try` : si l'étudiant interrompt la génération, on veut pouvoir
  // rendre ce qui a déjà été produit plutôt que de tout jeter.
  let full = ''

  try {
    const res = await fetch(streamUrl(settings, shape), {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify(
        shape === 'openai'
          ? openAiBody(resolveModel(settings, slug), prompt, system, history, sampling, true)
          : {
              // Une consigne vide est volontaire : on n'envoie alors aucun system.
              model: resolveModel(settings, slug),
              prompt,
              system: system?.trim() ? system : null,
              history: history ?? [],
              temperature: sampling?.temperature,
              top_p: sampling?.topP,
              top_k: sampling?.topK,
            },
      ),
      signal,
    })
    if (!res.ok || !res.body) throw new Error(httpError(res.status))

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let usage: TokenUsage | undefined
    // Chronométrage : on sépare l'attente initiale (le modèle « lit » la
    // requête) de la génération proprement dite. Un gros contexte allonge
    // surtout la première, ce qui se voit mal si on ne mesure que le total.
    const startedAt = performance.now()
    let firstDeltaAt: number | undefined
    let lastDeltaAt: number | undefined

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Les événements SSE sont séparés par une ligne vide.
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const evt of events) {
        // Toutes les lignes `data:` d'un événement, l'espace après les deux
        // points étant facultatif selon les serveurs.
        for (const line of evt.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const frame = parseFrame(payload, shape)
            if (frame.error) throw new Error(frame.error)
            if (frame.usage) usage = frame.usage
            if (frame.delta) {
              if (firstDeltaAt === undefined) firstDeltaAt = performance.now()
              lastDeltaAt = performance.now()
              full += frame.delta
              onDelta(frame.delta)
            }
          } catch (err) {
            // Une erreur signalée dans le flux interrompt la lecture ;
            // un fragment JSON illisible est simplement ignoré.
            if (err instanceof Error && err.message && !err.message.startsWith('Unexpected')) {
              throw err
            }
          }
        }
      }
    }

    if (!full) throw new Error('empty')
    const timed: TokenUsage | undefined =
      usage && firstDeltaAt !== undefined && lastDeltaAt !== undefined
        ? {
            ...usage,
            waitMs: Math.round(firstDeltaAt - startedAt),
            genMs: Math.round(lastDeltaAt - firstDeltaAt),
          }
        : usage
    return { text: full, source: 'api', usage: timed }
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    // Interruption VOLONTAIRE : on garde le texte déjà généré et on le
    // signale comme tel. Sans cela, appuyer sur « Arrêter » ferait
    // disparaître la réponse à moitié écrite, ce qui n'est pas ce qu'on
    // demande en arrêtant un modèle qui s'emballe.
    //
    // Ce flux n'a AUCUN garde-temps : le seul abandon possible vient du bouton
    // « Arrêter ». On le dit donc tel quel, même quand rien n'est encore
    // arrivé — arrêter avant le premier mot reste un arrêt, pas une panne.
    if (aborted) {
      return { text: full, source: 'api', stopped: true }
    }
    return { text: '', source: 'demo', error: errorCode(err, aborted) }
  }
}

// ============================================================
// Échauffement « bac à sable » : historique des essais de l'étudiant.
//
// Chaque essai garde le modèle interrogé, le prompt envoyé, la réponse
// obtenue et le jugement porté À L'AVEUGLE (l'étudiant ne connaît pas
// encore la recommandation). L'historique est confronté à la réponse
// de référence en fin d'étape.
//
// Persisté en localStorage : l'étudiant peut recharger la page sans
// perdre ses essais pendant la séance.
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'

/** Jugement porté à l'aveugle sur une réponse. */
export type Judgement = 'plausible' | 'unsure' | 'wrong'

/**
 * Un message tel qu'il part réellement vers le modèle. `memory` n'est pas
 * un rôle de l'API : c'est un marquage d'affichage pour distinguer, dans
 * la charge utile, ce qui vient du renvoi de l'historique.
 */
export interface SentMessage {
  role:
    | 'system'
    | 'user'
    | 'assistant'
    | 'memory'
    | 'summary'
    /** Les documents joints, recopiés devant la question. */
    | 'document'
    /** Une de VOS questions, renvoyée depuis la mémoire. */
    | 'memory-question'
    /** Une réponse du MODÈLE, renvoyée depuis la mémoire. */
    | 'memory-answer'
  content: string
  /**
   * Numéro de l'échange d'origine, pour les messages de mémoire. Ce sont
   * bien DEUX messages distincts dans la requête ; ce marqueur sert seulement
   * à les regrouper visuellement, tour par tour.
   */
  turn?: number
}

export interface Attempt {
  id: string
  /** Identifiant du modèle interrogé (voir SANDBOX_MODELS). */
  modelId: string
  /** Ce que l'étudiant a tapé (affiché dans la bulle). */
  prompt: string
  answer: string
  /** Provenance : appel réel au backend, ou repli démo. */
  source: 'api' | 'demo'
  /** Jugement de l'étudiant ; absent tant qu'il n'a pas tranché. */
  judgement?: Judgement
  /**
   * La charge utile RÉELLEMENT envoyée : system prompt, historique de
   * conversation, extraits RAG… Consultable depuis la bulle, pour montrer
   * que le message affiché n'est pas tout ce qui part.
   */
  sent?: SentMessage[]
  /** Décompte de tokens renvoyé par le fournisseur. */
  usage?: { prompt: number; completion: number; total: number }
  /** Palier de prompt utilisé (étape « Le prompt » uniquement). */
  levelId?: string
  /**
   * Réglages d'échantillonnage AYANT SERVI à produire cette réponse. Stockés
   * avec l'essai, et non lus depuis l'état courant : une réponse obtenue à
   * température 0 doit continuer à afficher 0 même après qu'on a bougé le
   * curseur. C'est précisément ce qu'on demande à l'étudiant de comparer.
   */
  sampling?: { temperature: number; topP?: number; topK?: number }
  /**
   * Résumé produit AVANT cet échange, en mode « mémoire résumée » (étape
   * « La mémoire »). Refait à chaque tour : il est attaché à l'échange qui
   * l'a déclenché, pour qu'on voie la mémoire se reconstruire dans le fil.
   */
  summary?: {
    text: string
    /** Le prompt de synthèse, pour inspecter la génération. */
    prompt: string
    usage?: { prompt: number; completion: number; total: number }
    /** Nombre total d'échanges que ce résumé condense. */
    covers?: number
    /** Combien d'échanges venaient d'être ajoutés à ce résumé. */
    added?: number
  }
  /** Horodatage relatif à la session, pour ordonner les essais. */
  order: number
  /** Heure d'envoi (ISO) : la durée passée sur chaque étape, pour l'export. */
  at?: string
}

/**
 * Chaque étape a son propre historique : l'échauffement et l'étape
 * « Le prompt » ne partagent pas leurs essais, sans quoi la
 * comparaison entre paliers serait polluée.
 *
 * L'étape « Mémoire » va plus loin : CHAQUE MODE a sa conversation. Sans
 * quoi, passer de « aucune » à « complète » ferait hériter le nouveau
 * mode d'un fil bâti sous les règles de l'ancien, et l'expérience ne
 * voudrait plus rien dire. On revient donc sur la conversation menée
 * dans ce mode, ou on en démarre une neuve.
 */
/**
 * Toutes les portées, dans l'ordre du TD. Énumérées ici plutôt que
 * réécrites ailleurs : l'onglet « Consommation » les parcourt pour totaliser
 * la séance, et une portée oubliée y serait invisible.
 */
export const SCOPES = [
  'warmup',
  'prompt',
  'settings',
  'memory-none',
  'memory-full',
  'memory-summary',
  'documents',
  'rag',
  'synthesis',
] as const

export type Scope = (typeof SCOPES)[number]

function storageKey(scope: Scope): string {
  // L'échauffement garde la clé historique : les essais déjà en place
  // dans les navigateurs restent lisibles.
  return scope === 'warmup' ? 'td-chatbots-sandbox' : `td-chatbots-sandbox-${scope}`
}

const caches = new Map<Scope, Attempt[]>()

function read(scope: Scope): Attempt[] {
  const cached = caches.get(scope)
  if (cached) return cached
  let value: Attempt[] = []
  try {
    const raw = localStorage.getItem(storageKey(scope))
    if (raw) value = JSON.parse(raw) as Attempt[]
  } catch {
    value = []
  }
  caches.set(scope, value)
  return value
}

const listeners = new Set<() => void>()

/**
 * Compteur d'écritures. Il sert de clé de cache au bilan multi-portées
 * (`readAll`) : sans lui, on ne saurait pas qu'une portée a changé.
 */
let version = 0

function commit(scope: Scope, next: Attempt[]): void {
  caches.set(scope, next)
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(next))
  } catch {
    // Environnement sans localStorage : historique en mémoire seulement.
  }
  version += 1
  listeners.forEach((l) => l())
}

/** Enregistre un nouvel essai (sans jugement) et renvoie son identifiant. */
export function addAttempt(scope: Scope, attempt: Omit<Attempt, 'id' | 'order'>): string {
  const current = read(scope)
  const order = current.reduce((m, a) => Math.max(m, a.order), 0) + 1
  const id = `a${current.length}-${order}`
  commit(scope, [...current, { ...attempt, id, order, at: new Date().toISOString() }])
  return id
}

/** Attache (ou change) le jugement porté sur un essai. */
export function judgeAttempt(scope: Scope, id: string, judgement: Judgement): void {
  commit(scope, read(scope).map((a) => (a.id === id ? { ...a, judgement } : a)))
}

/** Supprime un essai isolé. */
export function removeAttempt(scope: Scope, id: string): void {
  commit(scope, read(scope).filter((a) => a.id !== id))
}

export function resetAttempts(scope: Scope): void {
  caches.set(scope, [])
  try {
    localStorage.removeItem(storageKey(scope))
  } catch {
    // Ignore.
  }
  version += 1
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * Snapshot mémorisé de TOUTES les portées, pour l'onglet « Consommation ».
 *
 * `useSyncExternalStore` compare les snapshots par identité : reconstruire le
 * tableau à chaque appel provoquerait une boucle de rendu infinie. On ne le
 * recalcule donc qu'après une écriture réelle (`version`).
 */
/** Un essai, accompagné de l'étape d'où il vient. */
export type ScopedAttempt = Attempt & { scope: Scope }

let allCache: { version: number; value: ScopedAttempt[] } | null = null

function readAll(): ScopedAttempt[] {
  if (allCache && allCache.version === version) return allCache.value
  const value = SCOPES.flatMap((s) => read(s).map((a) => ({ ...a, scope: s })))
  allCache = { version, value }
  return value
}

/**
 * Essais de TOUTES les étapes réunis, chacun étiqueté de sa portée. Lecture
 * seule : c'est un bilan, pas un historique manipulable.
 */
export function useAllAttempts(): ScopedAttempt[] {
  return useSyncExternalStore(subscribe, readAll, readAll)
}

/** Efface l'historique de toutes les étapes d'un coup. */
export function resetAllAttempts(): void {
  SCOPES.forEach((s) => {
    caches.set(s, [])
    try {
      localStorage.removeItem(storageKey(s))
    } catch {
      // Ignore.
    }
  })
  version += 1
  listeners.forEach((l) => l())
}

/** Hook React : historique des essais d'UNE étape + actions. */
export function useAttempts(scope: Scope = 'warmup'): {
  attempts: Attempt[]
  add: (attempt: Omit<Attempt, 'id' | 'order'>) => string
  judge: (id: string, judgement: Judgement) => void
  remove: (id: string) => void
  reset: () => void
} {
  const attempts = useSyncExternalStore(
    subscribe,
    () => read(scope),
    () => read(scope),
  )
  const add = useCallback((a: Omit<Attempt, 'id' | 'order'>) => addAttempt(scope, a), [scope])
  const judge = useCallback((id: string, j: Judgement) => judgeAttempt(scope, id, j), [scope])
  const remove = useCallback((id: string) => removeAttempt(scope, id), [scope])
  const reset = useCallback(() => resetAttempts(scope), [scope])
  return { attempts, add, judge, remove, reset }
}

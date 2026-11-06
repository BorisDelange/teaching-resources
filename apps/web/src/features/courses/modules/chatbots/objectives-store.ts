// ============================================================
// Magasin de l'auto-évaluation (début / fin de séance).
//
// Deux relevés DISTINCTS, chacun noté de 1 à 5 par item, puis figé une fois
// validé : c'est l'écart entre les deux qui renseigne sur ce que le TD a
// apporté, et un relevé de début retouché en fin de séance ne voudrait plus
// rien dire. L'étudiant peut aussi refuser d'y répondre ; le refus est
// enregistré comme tel et débloque la suite.
// ============================================================

import { useSyncExternalStore } from 'react'

/** Identifiants stables des items, dans l'ordre d'affichage (pour l'export). */
export const SELF_ITEM_IDS = [
  'spot-error',
  'fake-reference',
  'prompt-context',
  'variability',
  'memory',
  'grounding',
  'data',
] as const

export type Phase = 'start' | 'end'

export interface PhaseRecord {
  /** Note de 1 à 5 par item, `null` tant que l'item n'est pas noté. */
  ratings: (number | null)[]
  /** Horodatage ISO de la validation. */
  validatedAt?: string
  /** Horodatage ISO du refus de participer. */
  refusedAt?: string
}

export type SelfAssessmentStore = Record<Phase, PhaseRecord>

const STORAGE_KEY = 'td-chatbots-self-assessment'
const EMPTY: SelfAssessmentStore = { start: { ratings: [] }, end: { ratings: [] } }

let cache: SelfAssessmentStore | null = null

export function readSelfAssessment(): SelfAssessmentStore {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<SelfAssessmentStore>) } : EMPTY
  } catch {
    cache = EMPTY
  }
  return cache
}

const listeners = new Set<() => void>()

function commit(phase: Phase, record: PhaseRecord) {
  cache = { ...readSelfAssessment(), [phase]: record }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Sans localStorage, les réponses vivent le temps de la page.
  }
  listeners.forEach((l) => l())
}

export function isClosed(record: PhaseRecord): boolean {
  return !!record.validatedAt || !!record.refusedAt
}

export function setRating(phase: Phase, i: number, value: number) {
  const current = readSelfAssessment()[phase]
  if (isClosed(current)) return
  const ratings = SELF_ITEM_IDS.map((_, k) => current.ratings[k] ?? null)
  ratings[i] = value
  commit(phase, { ratings })
}

export function isComplete(record: PhaseRecord): boolean {
  return SELF_ITEM_IDS.every((_, i) => record.ratings[i] != null)
}

export function validatePhase(phase: Phase) {
  const current = readSelfAssessment()[phase]
  if (!isComplete(current)) return
  commit(phase, { ...current, validatedAt: new Date().toISOString() })
}

export function refusePhase(phase: Phase) {
  commit(phase, { ratings: [], refusedAt: new Date().toISOString() })
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useSelfAssessment(): SelfAssessmentStore {
  return useSyncExternalStore(subscribe, readSelfAssessment, readSelfAssessment)
}

/**
 * Le relevé de cette phase est-il réglé (validé ou refusé) ? Qui a refusé au
 * début n'est pas relancé à la fin.
 */
export function useSelfAssessmentDone(phase: Phase): boolean {
  const store = useSelfAssessment()
  if (phase === 'end' && store.start.refusedAt) return true
  return isClosed(store[phase])
}

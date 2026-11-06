// ============================================================
// Votes vrai/faux de l'étudiant sur les réponses des modèles,
// persistés en localStorage. Individuels (une seule machine) ;
// ressortis à l'étape "évaluation" pour être confrontés à la vérité.
//
// (v2 éventuelle : agrégation collective via le backend — voir PLAN.)
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'

export type VoteValue = 'true' | 'false'

/** Clé de vote : un vote par (modèle, prompt) pour distinguer les essais. */
export type VoteKey = string

export function voteKey(modelId: string, promptKind: string): VoteKey {
  return `${modelId}::${promptKind}`
}

const STORAGE_KEY = 'td-chatbots-votes'

type VoteMap = Record<VoteKey, VoteValue>

let cache: VoteMap | null = null

function read(): VoteMap {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? (JSON.parse(raw) as VoteMap) : {}
  } catch {
    cache = {}
  }
  return cache
}

const listeners = new Set<() => void>()

export function setVote(key: VoteKey, value: VoteValue): void {
  const next = { ...read(), [key]: value }
  cache = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore.
  }
  listeners.forEach((l) => l())
}

export function resetVotes(): void {
  cache = {}
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Hook React : renvoie la map complète des votes + un setter. */
export function useVotes(): {
  votes: VoteMap
  vote: (key: VoteKey, value: VoteValue) => void
  reset: () => void
} {
  const votes = useSyncExternalStore(subscribe, read, read)
  const vote = useCallback((key: VoteKey, value: VoteValue) => setVote(key, value), [])
  const reset = useCallback(() => resetVotes(), [])
  return { votes, vote, reset }
}

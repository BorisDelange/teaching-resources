// ============================================================
// Progression de l'étudiant dans le TD.
//
// Sert surtout à déverrouiller l'accès à la recommandation : pendant
// l'échauffement, tout l'intérêt est de juger SANS la connaître. Une
// fois l'étape « Recommandations » visitée, la reco reste consultable
// depuis les étapes suivantes.
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'

export interface Progress {
  /** L'étudiant a ouvert l'étape « Recommandations ». */
  seenGuidelines: boolean
}

const STORAGE_KEY = 'td-chatbots-progress'

const DEFAULTS: Progress = { seenGuidelines: false }

let cache: Progress | null = null

function read(): Progress {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Progress>) } : DEFAULTS
  } catch {
    cache = DEFAULTS
  }
  return cache
}

const listeners = new Set<() => void>()

export function markProgress(patch: Partial<Progress>): void {
  const next = { ...read(), ...patch }
  // Évite une notification (et un rendu) quand rien ne change.
  if (Object.entries(patch).every(([k, v]) => read()[k as keyof Progress] === v)) return
  cache = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore : environnement sans localStorage.
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useProgress(): [Progress, (patch: Partial<Progress>) => void] {
  const progress = useSyncExternalStore(subscribe, read, read)
  const mark = useCallback((patch: Partial<Progress>) => markProgress(patch), [])
  return [progress, mark]
}

// ============================================================
// Repli des colonnes latérales de la disposition à trois colonnes.
//
// L'état est partagé entre la barre d'onglets (qui porte les boutons de
// bascule) et `ThreeColumns` (qui applique le repli), d'où ce petit
// store plutôt qu'un état local. Persisté : un étudiant qui masque
// l'énoncé le retrouve masqué à l'étape suivante.
// ============================================================

import { useSyncExternalStore } from 'react'

export interface PaneVisibility {
  left: boolean
  right: boolean
}

const STORAGE_KEY = 'td-chatbots-panes'
const DEFAULTS: PaneVisibility = { left: true, right: true }

let cache: PaneVisibility | null = null
const listeners = new Set<() => void>()

function read(): PaneVisibility {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PaneVisibility>) } : DEFAULTS
  } catch {
    cache = DEFAULTS
  }
  return cache
}

export function togglePane(side: 'left' | 'right'): void {
  const current = read()
  const next = { ...current, [side]: !current[side] }
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

export function usePaneVisibility(): PaneVisibility {
  return useSyncExternalStore(subscribe, read, read)
}

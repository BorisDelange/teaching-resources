/**
 * Largeurs et repli des colonnes de la paillasse à trois colonnes.
 *
 * Repris du TD chatbots (`chatbots/panes.ts` et les helpers de largeur de
 * `chat-ui.tsx`), avec ses propres clefs de stockage : les deux TD n'ont
 * aucune raison de partager la largeur de leurs colonnes, et un étudiant qui
 * replie la consigne du TD chatbots ne s'attend pas à retrouver celle du TD
 * modèles prédictifs repliée.
 */

import { useSyncExternalStore } from 'react'

// ---------- Repli ----------

export interface PaneVisibility {
  left: boolean
  right: boolean
}

const PANE_KEY = 'td-sepsis-panes'
const PANE_DEFAULTS: PaneVisibility = { left: true, right: true }

let paneCache: PaneVisibility | null = null
const listeners = new Set<() => void>()

function readPanes(): PaneVisibility {
  if (paneCache) return paneCache
  try {
    const raw = localStorage.getItem(PANE_KEY)
    paneCache = raw ? { ...PANE_DEFAULTS, ...(JSON.parse(raw) as Partial<PaneVisibility>) } : PANE_DEFAULTS
  } catch {
    paneCache = PANE_DEFAULTS
  }
  return paneCache
}

export function togglePane(side: 'left' | 'right'): void {
  const next = { ...readPanes(), [side]: !readPanes()[side] }
  paneCache = next
  try {
    localStorage.setItem(PANE_KEY, JSON.stringify(next))
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
  return useSyncExternalStore(subscribe, readPanes, readPanes)
}

// ---------- Largeurs ----------

const WIDTH_KEY = 'td-sepsis-columns'
export const MIN_W = 180
export const MAX_W = 460
export const DEFAULT_WIDTHS = { left: 280, right: 250 }

export function clampWidth(px: number): number {
  return Math.min(MAX_W, Math.max(MIN_W, Math.round(px)))
}

export function readWidths(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    if (!raw) return DEFAULT_WIDTHS
    const parsed = JSON.parse(raw) as Partial<{ left: number; right: number }>
    return {
      left: clampWidth(parsed.left ?? DEFAULT_WIDTHS.left),
      right: clampWidth(parsed.right ?? DEFAULT_WIDTHS.right),
    }
  } catch {
    return DEFAULT_WIDTHS
  }
}

export function writeWidths(w: { left: number; right: number }): void {
  try {
    localStorage.setItem(WIDTH_KEY, JSON.stringify(w))
  } catch {
    // Ignore : environnement sans localStorage.
  }
}

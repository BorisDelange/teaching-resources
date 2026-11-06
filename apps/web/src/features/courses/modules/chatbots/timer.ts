// ============================================================
// Minuteur de séance : un compte à rebours par étape.
//
// Le temps n'est décompté que sur l'étape AFFICHÉE. Revenir consulter la
// reco pendant l'exercice 3 met donc l'exercice 3 en pause : chaque étape
// garde son propre budget, et c'est ce budget que le formateur séquence.
//
// Persisté en localStorage : un rechargement en pleine séance ne remet pas
// les compteurs à zéro. L'horloge murale continue de tourner pendant le
// rechargement, ce qui est le comportement attendu en salle.
// ============================================================

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { DEFAULT_TIMER_MINUTES, type StepId } from './steps'
import type { ChatbotsSettings } from './settings'

interface TimerState {
  /** Temps déjà écoulé par étape, hors période en cours (ms). */
  elapsed: Record<string, number>
  /** Étape en cours de décompte, et depuis quand. */
  running: { stepId: string; since: number } | null
  /** Étapes mises en pause par l'étudiant : elles ne repartent pas seules. */
  paused: Record<string, boolean>
}

const STORAGE_KEY = 'td-chatbots-timer'
const EMPTY: TimerState = { elapsed: {}, running: null, paused: {} }

let cache: TimerState | null = null

function read(): TimerState {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<TimerState>) } : EMPTY
  } catch {
    cache = EMPTY
  }
  return cache
}

const listeners = new Set<() => void>()

function write(next: TimerState) {
  cache = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Environnement sans localStorage : le minuteur vit en mémoire.
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Range la période en cours dans `elapsed` et arrête le décompte. */
function settle(s: TimerState, now: number): TimerState {
  if (!s.running) return s
  const { stepId, since } = s.running
  return {
    ...s,
    elapsed: { ...s.elapsed, [stepId]: (s.elapsed[stepId] ?? 0) + (now - since) },
    running: null,
  }
}

/** Budget d'une étape en millisecondes ; 0 = pas de minuteur. */
export function budgetMs(settings: ChatbotsSettings, stepId: string): number {
  const minutes =
    settings.timerMinutes?.[stepId] ?? DEFAULT_TIMER_MINUTES[stepId as StepId] ?? 0
  return Math.max(0, minutes) * 60_000
}

/** Les minutes allouées à une étape, réglages du formateur compris. */
export function stepMinutes(settings: ChatbotsSettings, stepId: string): number {
  return budgetMs(settings, stepId) / 60_000
}

/**
 * On arrive sur une étape : le décompte bascule sur elle, sauf si l'étudiant
 * l'avait mise en pause ou si elle n'a pas de budget.
 */
export function enterStep(stepId: string, timed: boolean) {
  const now = Date.now()
  const s = read()
  if (s.running?.stepId === stepId && timed) return
  const settled = settle(s, now)
  const start = timed && !settled.paused[stepId]
  write({ ...settled, running: start ? { stepId, since: now } : null })
}

export function pauseTimer() {
  const s = read()
  if (!s.running) return
  const stepId = s.running.stepId
  const settled = settle(s, Date.now())
  write({ ...settled, paused: { ...settled.paused, [stepId]: true } })
}

export function resumeTimer(stepId: string) {
  const settled = settle(read(), Date.now())
  write({
    ...settled,
    running: { stepId, since: Date.now() },
    paused: { ...settled.paused, [stepId]: false },
  })
}

/** Remet le budget de l'étape à plein, sans changer son état marche/pause. */
export function resetTimer(stepId: string) {
  const s = read()
  write({
    ...s,
    elapsed: { ...s.elapsed, [stepId]: 0 },
    running: s.running?.stepId === stepId ? { stepId, since: Date.now() } : s.running,
  })
}

/** Remet toute la séance à zéro (réglages formateur). */
export function resetAllTimers() {
  write(EMPTY)
}

/**
 * Le temps écoulé sur une étape, rafraîchi chaque seconde tant qu'elle tourne.
 */
export function useStepTimer(stepId: string) {
  const state = useSyncExternalStore(subscribe, read, read)
  const running = state.running?.stepId === stepId
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const live = state.running ? Math.max(0, now - state.running.since) : 0
  const elapsed = (state.elapsed[stepId] ?? 0) + (running ? live : 0)
  /** Toute la séance : la somme des étapes, période en cours comprise. */
  const totalElapsed = Object.values(state.elapsed).reduce((a, b) => a + b, 0) + live

  const pause = useCallback(() => pauseTimer(), [])
  const resume = useCallback(() => resumeTimer(stepId), [stepId])
  const reset = useCallback(() => resetTimer(stepId), [stepId])

  return { elapsed, totalElapsed, running, pause, resume, reset }
}

/** `mm:ss` (ou `h:mm:ss` au-delà d'une heure), sans signe. */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

// ============================================================
// Le magasin des compétences débloquées.
//
// DEUX PROPRIÉTÉS TIENNENT TOUT LE FICHIER.
//
// 1. Le déblocage est LATCHÉ. Les conditions se calculent depuis l'historique
//    des essais, or l'étudiant peut effacer une conversation ou remettre le
//    compteur à zéro (onglet « Consommation »). Une compétence recalculée à
//    chaque rendu se REPERDRAIT — on aurait vu une compétence disparaître pour
//    avoir fait le ménage. Une fois acquise, elle est écrite ici et n'en
//    ressort plus.
//
// 2. Rien ne se débloque au premier rendu. Au chargement de la page, tout
//    l'historique est relu d'un coup : sans amorçage silencieux, un étudiant
//    qui revient après une pause verrait dix notifications d'affilée pour des
//    compétences gagnées la veille. Le premier passage écrit donc l'état sans
//    rien annoncer ; seules les transitions ULTÉRIEURES sont notifiées.
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'
import { SKILLS, levelFor } from './skills-data'

const STORAGE_KEY = 'td-chatbots-skills'

interface Store {
  /** Identifiants des compétences acquises. */
  unlocked: string[]
  /**
   * L'état a déjà été amorcé depuis l'historique existant. Tant que c'est
   * `false`, les déblocages sont silencieux (voir en-tête).
   */
  primed: boolean
}

const EMPTY: Store = { unlocked: [], primed: false }

let cache: Store | null = null

function read(): Store {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Store>) } : EMPTY
  } catch {
    cache = EMPTY
  }
  return cache
}

const listeners = new Set<() => void>()

function commit(next: Store): void {
  cache = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Environnement sans localStorage : la session garde l'état en mémoire.
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Ce qui vient d'être franchi, à annoncer à l'écran. */
export interface UnlockEvent {
  /** Compétences acquises à l'instant (jamais vide). */
  skillIds: string[]
  /** Numéro du niveau atteint par ce déblocage, s'il y en a un. */
  levelReached: number | null
}

/**
 * Enregistre l'ensemble des compétences actuellement méritées.
 *
 * `earned` est recalculé à chaque rendu depuis l'historique : on n'ajoute que
 * ce qui manque, on ne retire jamais rien. Retourne ce qu'il faut annoncer, ou
 * `null` quand il n'y a rien de neuf — ou que l'état vient d'être amorcé.
 */
export function syncSkills(earned: string[]): UnlockEvent | null {
  const current = read()
  const known = new Set(current.unlocked)
  const fresh = earned.filter((id) => !known.has(id))

  if (fresh.length === 0) {
    // Même sans nouveauté, le premier passage doit marquer l'amorçage : sinon
    // un étudiant sans aucun acquis resterait éternellement « non amorcé », et
    // sa toute première compétence passerait en silence.
    if (!current.primed) commit({ ...current, primed: true })
    return null
  }

  const unlocked = [...current.unlocked, ...fresh]
  const wasPrimed = current.primed
  commit({ unlocked, primed: true })

  if (!wasPrimed) return null

  const before = levelFor(current.unlocked.length)
  const after = levelFor(unlocked.length)
  const levelReached = after && after.n !== before?.n ? after.n : null

  const event = { skillIds: fresh, levelReached }
  queue = [...queue, event]
  notifyQueue()
  return event
}

/**
 * La file d'annonces en attente.
 *
 * Vit dans le magasin plutôt que dans un état React : `syncSkills` est appelé
 * pendant un effet, et y déclencher un `setState` ferait cascader les rendus.
 * En publiant ici, le composant se contente de S'ABONNER — il lit une valeur,
 * il n'en provoque aucune.
 */
let queue: UnlockEvent[] = []
const queueListeners = new Set<() => void>()

function notifyQueue(): void {
  queueListeners.forEach((l) => l())
}

function subscribeQueue(cb: () => void): () => void {
  queueListeners.add(cb)
  return () => queueListeners.delete(cb)
}

function readQueue(): UnlockEvent[] {
  return queue
}

/** Retire une annonce une fois affichée. */
export function dismissUnlock(event: UnlockEvent): void {
  queue = queue.filter((e) => e !== event)
  notifyQueue()
}

/** Les annonces en attente, pour l'affichage. */
export function useUnlockQueue(): UnlockEvent[] {
  return useSyncExternalStore(subscribeQueue, readQueue, readQueue)
}

export function useSkills(): {
  unlocked: Set<string>
  count: number
  /** Remet la progression à zéro (bouton du panneau). */
  reset: () => void
} {
  const store = useSyncExternalStore(subscribe, read, read)
  const reset = useCallback(() => commit(EMPTY), [])
  return {
    unlocked: new Set(store.unlocked),
    count: store.unlocked.length,
    reset,
  }
}

/** Une compétence connue, pour l'affichage du panneau. */
export function skillById(id: string) {
  return SKILLS.find((s) => s.id === id) ?? null
}

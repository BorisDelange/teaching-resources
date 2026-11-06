// ============================================================
// État d'interface d'une étape, conservé entre les changements d'onglet.
//
// Changer d'onglet démonte le composant de l'étape : sans ça, le modèle
// choisi, le brouillon en cours et la conversation affichée seraient
// perdus. Les essais eux-mêmes vivent dans `sandbox.ts` ; ici on ne
// garde que le « où j'en étais ».
//
// Persisté en localStorage, comme les essais : recharger la page pendant
// la séance ne fait pas repartir de zéro.
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'

import type { Judgement, Scope } from './sandbox'

/** Le « où j'en étais » d'une étape. Tous les champs sont optionnels : une étape n'utilise que ce qui la concerne. */
export interface StepState {
  /** Modèle sélectionné dans la barre du haut. */
  modelId?: string
  /** Brouillon non envoyé, tel qu'il est dans le champ de saisie. */
  prompt?: string
  /** Conversation affichée au centre (identifiant d'essai), ou null pour un nouvel échange. */
  activeId?: string | null
  /** Palier de prompt sélectionné (étape « Le prompt »). */
  levelId?: string | null
  /** Mode de mémoire sélectionné (étape « La mémoire »). */
  memoryMode?: string
  /** Pièce jointe sélectionnée (étape « Synthèse »), ou null. */
  attachedId?: string | null
  /**
   * Dernier résumé en vigueur (mode « mémoire résumée »), pour le renvoi au
   * modèle. Les résumés successifs, eux, sont attachés aux échanges qui les
   * ont produits (voir `Attempt.summary`) : c'est ce qui les rend inspectables
   * un par un dans le fil.
   */
  summary?: string
  /**
   * Combien de tours le résumé couvre déjà. Le résumé étant incrémental, il
   * faut savoir où reprendre : sans ce repère, on re-résumerait des tours déjà
   * condensés (coût qui enfle) ou on en oublierait.
   */
  summarisedCount?: number
  /**
   * Réglages d'échantillonnage manipulés à l'étape « Réglages ». Persistés
   * comme le reste : changer d'onglet ne doit pas réinitialiser la
   * température qu'on vient de régler.
   */
  temperature?: number
  topP?: number
  topK?: number
  /**
   * Le rejugement du débrief, essai par essai (identifiant → jugement), une
   * fois la recommandation connue. Séparé de `Attempt.judgement` : c'est la
   * comparaison des deux qui fait la leçon.
   */
  rejudge?: Record<string, Judgement>
  /** L'étudiant a fini — ou s'est arrêté là : on affiche le bilan. */
  rejudgeDone?: boolean
}

function storageKey(scope: Scope): string {
  return `td-chatbots-step-${scope}`
}

const caches = new Map<Scope, StepState>()

function read(scope: Scope): StepState {
  const cached = caches.get(scope)
  if (cached) return cached
  let value: StepState = {}
  try {
    const raw = localStorage.getItem(storageKey(scope))
    if (raw) value = JSON.parse(raw) as StepState
  } catch {
    value = {}
  }
  caches.set(scope, value)
  return value
}

const listeners = new Set<() => void>()

function commit(scope: Scope, next: StepState): void {
  caches.set(scope, next)
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(next))
  } catch {
    // Environnement sans localStorage : état en mémoire seulement.
  }
  listeners.forEach((l) => l())
}

export function patchStepState(scope: Scope, patch: Partial<StepState>): void {
  commit(scope, { ...read(scope), ...patch })
}

export function resetStepState(scope: Scope): void {
  caches.set(scope, {})
  try {
    localStorage.removeItem(storageKey(scope))
  } catch {
    // Ignore.
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * Hook React : état d'interface d'UNE étape + une fonction de mise à jour
 * partielle. `patch` a une identité stable, donc utilisable en dépendance.
 */
export function useStepState(scope: Scope): [StepState, (patch: Partial<StepState>) => void] {
  const state = useSyncExternalStore(
    subscribe,
    () => read(scope),
    () => read(scope),
  )
  const patch = useCallback((p: Partial<StepState>) => patchStepState(scope, p), [scope])
  return [state, patch]
}

/**
 * Un champ isolé de l'état d'étape, avec la signature de `useState` —
 * y compris la forme fonctionnelle `set(prev => next)`.
 *
 * `null` est une valeur à part entière (« aucune conversation ouverte ») :
 * seul `undefined`, c'est-à-dire l'absence de clé, retombe sur le défaut.
 */
type Field<K extends keyof StepState> = Exclude<StepState[K], undefined>

/**
 * Le modèle choisi, COMMUN à toutes les étapes.
 *
 * Chaque étape le rangeait auparavant dans sa propre portée : passer de
 * « Prompt » à « Mémoire » ramenait alors le modèle par défaut, et l'étudiant
 * qui comparait un petit modèle à un gros perdait son choix à chaque
 * changement d'onglet — sans comprendre pourquoi les réponses changeaient.
 *
 * Rangé sous 'warmup', qui existe déjà : pas de magasin de plus à gérer.
 */
export function useSharedModel(
  fallback: string,
): [string, (value: string | ((prev: string) => string)) => void] {
  return useStepField('warmup', 'modelId', fallback)
}

export function useStepField<K extends keyof StepState>(
  scope: Scope,
  key: K,
  fallback: Field<K>,
): [Field<K>, (value: Field<K> | ((prev: Field<K>) => Field<K>)) => void] {
  const state = useSyncExternalStore(
    subscribe,
    () => read(scope),
    () => read(scope),
  )
  const stored = state[key]
  const value = (stored === undefined ? fallback : stored) as Field<K>

  const set = useCallback(
    (next: Field<K> | ((prev: Field<K>) => Field<K>)) => {
      const current = read(scope)[key]
      const prev = (current === undefined ? fallback : current) as Field<K>
      const resolved = typeof next === 'function' ? (next as (p: Field<K>) => Field<K>)(prev) : next
      patchStepState(scope, { [key]: resolved } as Partial<StepState>)
    },
    [scope, key, fallback],
  )

  return [value, set]
}

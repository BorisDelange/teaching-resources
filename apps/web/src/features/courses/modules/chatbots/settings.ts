// ============================================================
// Réglages du TD chatbots, persistés en localStorage.
//   - apiBaseUrl : URL du backend (apps/api) ; vide = mode démo forcé.
//   - demoMode   : force les réponses placeholder même si l'API existe.
//
// OÙ VIT LA CLEF, ET CE QUE ÇA IMPLIQUE.
//
// Avec le backend du TD — le mode déployé — la clef OpenRouter reste sur le
// serveur, dans une variable d'environnement : le navigateur n'en voit
// jamais aucune. C'est le seul montage acceptable pour une clef partagée.
//
// Les autres fournisseurs se règlent depuis l'interface, et la clef saisie
// est alors écrite ICI, en clair. Elle n'est pas lisible par un autre site
// (localStorage est cloisonné par origine), mais elle l'est par quiconque
// utilise ce navigateur — une clef PERSONNELLE convient, une clef distribuée
// à une promo non.
//
// Le vote de l'étudiant est stocké séparément (voir vote.ts).
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'
import { presetOf, type ProviderConfig, type ProviderShape } from './providers'
import { SANDBOX_MODELS, type SandboxModel } from './warmup-data'
import { DEFAULT_SAMPLING } from './sampling'

export interface ChatbotsSettings {
  apiBaseUrl: string
  /** Fournisseur courant : URL, clef, correspondance des modèles. */
  provider: ProviderConfig
  /**
   * D'où vient la recherche sémantique de l'étape « Documents ».
   *   'auto'    → le backend s'il est là, sinon rien (repli lexical)
   *   'wasm'    → un modèle d'embedding dans le navigateur (téléchargé)
   *   'off'     → jamais de sémantique, recherche lexicale seule
   */
  semanticSource: 'auto' | 'wasm' | 'off'
  demoMode: boolean
  /**
   * System prompt de l'échauffement, modifiable par l'étudiant.
   *   null            → consigne par défaut du TD (voir warmup-data.ts)
   *   chaîne vide     → AUCUNE consigne envoyée au modèle (choix explicite)
   *   autre chaîne    → consigne personnalisée
   */
  systemPrompt: string | null
  /**
   * Fenêtre de contexte autorisée à l'étape « La mémoire », en tokens.
   * Volontairement bien SOUS la vraie limite des modèles (131k à 1M) :
   * la saturation doit survenir pendant la séance, pas en théorie.
   */
  contextBudget: number
  /**
   * Fenêtre de contexte aux étapes « Documents » et « Synthèse ». Un document
   * qui en fait moins de la moitié part en entier ; au-delà, il est fouillé.
   */
  documentBudget: number
  /**
   * Modèles proposés aux étudiants, par identifiant (voir SANDBOX_MODELS).
   * `null` = tous. Permet au formateur de réduire le choix en séance, ou
   * d'écarter un modèle indisponible sur son serveur.
   */
  enabledModels: string[] | null
  /**
   * La LISTE des modèles, quand le formateur l'a remaniée.
   *
   * `null` = les trois modèles d'origine (voir SANDBOX_MODELS). Dès qu'on en
   * ajoute, en retire ou en modifie un, la liste complète est enregistrée ici
   * et remplace la valeur par défaut. Les trois d'origine restent le point de
   * départ et le repli : un « Rétablir » redonne exactement le TD tel qu'il a
   * été écrit, avec les tailles qui font sa démonstration.
   */
  customModels: SandboxModel[] | null
  /**
   * Température de DÉPART des étapes, avant que l'étudiant n'y touche.
   *
   * `null` = la valeur d'origine du TD (0,7, proche d'un ChatGPT grand
   * public). La changer déplace le point de départ de toutes les étapes, sans
   * empêcher personne de la régler ensuite là où c'est le sujet.
   */
  defaultTemperature: number | null
  /**
   * Mode développeur : ajoute, dans « Ce qui a réellement été envoyé », une
   * bascule vers le corps JSON brut de la requête HTTP. Destiné à qui
   * construit le TD, pas aux étudiants — d'où le défaut à `false`.
   */
  devMode: boolean
  /**
   * Mode hors ligne : aucun appel réseau. Les réponses sont rejouées depuis
   * `offline-captures.json`, capturé sur de VRAIS appels (voir offline.ts).
   * Le champ de saisie se verrouille et l'étudiant choisit parmi des
   * questions préparées.
   *
   * Prévu pour la salle sans wifi, la clé épuisée, le fournisseur en panne :
   * la séance doit pouvoir se tenir sans rien de tout cela.
   */
  offlineMode: boolean
  /** Affiche le minuteur de séance dans la barre de navigation. */
  timerEnabled: boolean
  /**
   * Durée allouée à chaque étape, en minutes, par identifiant d'étape.
   * `null` = les durées d'origine (voir `DEFAULT_TIMER_MINUTES`, 1 h 50).
   */
  timerMinutes: Record<string, number> | null
}

const STORAGE_KEY = 'td-chatbots-settings'

/**
 * Build « même origine » (`npm run build:server`).
 *
 * Le site est alors servi PAR le backend lui-même (voir le Dockerfile
 * d'`apps/api`) : une seule adresse rend les pages et répond à l'API. Deux
 * ennuis disparaissent d'un coup — plus de CORS, et plus de blocage
 * « contenu mixte » entre une page HTTPS et une API HTTP.
 */
export const SAME_ORIGIN = import.meta.env.VITE_SAME_ORIGIN === '1'

/**
 * L'adresse à laquelle le navigateur a chargé la page.
 *
 * On garde une URL ABSOLUE plutôt qu'une base vide : le code traite « base
 * vide » comme « aucun backend » (voir `providerShape`, `retrieveSemantic`),
 * et une chaîne vide y désactiverait silencieusement les appels.
 */
function sameOriginBase(): string {
  return typeof location === 'undefined' ? '' : location.origin
}

/**
 * URL du backend par défaut. Surchargeable sans toucher au dépôt via
 * `VITE_API_URL` dans `apps/web/.env.local` (fichier gitignored) —
 * utile quand le port 8000 est déjà pris sur la machine.
 */
export const DEFAULT_API_URL =
  import.meta.env.VITE_API_URL ?? (SAME_ORIGIN ? sameOriginBase() : 'http://localhost:8000')

/**
 * Build « client seul » (`npm run dev:client` / `npm run build:client`).
 *
 * Le site tourne alors SANS backend : c'est le mode de déploiement du site
 * public (GitLab Pages), où aucun serveur n'existe.
 *
 * À NE PAS CONFONDRE AVEC LE MODE HORS LIGNE. « Client » dit seulement
 * qu'aucun backend n'accompagne le site ; il peut malgré tout interroger une
 * API (Ollama, OpenRouter) DIRECTEMENT depuis le navigateur. Le rejeu des
 * réponses capturées, lui, s'appelle « hors ligne » et se coche — dans les
 * deux builds. Un build client démarre simplement hors ligne par défaut.
 */
export const CLIENT_ONLY = import.meta.env.VITE_CLIENT_ONLY === '1'

const DEFAULTS: ChatbotsSettings = {
  // En séance, le backend tourne sur le poste du formateur. Si l'URL
  // est injoignable, le TD retombe automatiquement en mode démo.
  apiBaseUrl: DEFAULT_API_URL,
  provider: { id: 'td-backend', baseUrl: DEFAULT_API_URL, apiKey: '', modelMap: {} },
  semanticSource: 'auto',
  // Suit `offlineMode` (voir getSettings) : les deux ne sont plus qu'un seul
  // état, présenté par une seule case.
  demoMode: false,
  systemPrompt: null,
  contextBudget: 1000,
  documentBudget: 5000,
  enabledModels: null,
  customModels: null,
  defaultTemperature: null,
  devMode: false,
  offlineMode: false,
  timerEnabled: true,
  timerMinutes: null,
}

let cache: ChatbotsSettings | null = null

export function getSettings(): ChatbotsSettings {
  if (cache) return cache
  /** Un réglage a déjà été enregistré sur ce poste (donc un choix explicite). */
  let stored = false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    stored = !!raw
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ChatbotsSettings>) } : DEFAULTS
  } catch {
    cache = DEFAULTS
  }
  // Réglages enregistrés AVANT l'arrivée des fournisseurs : l'URL du backend
  // devient sa configuration, pour que rien ne change à l'écran.
  if (!cache.provider) {
    cache = {
      ...cache,
      provider: {
        id: 'td-backend',
        baseUrl: cache.apiBaseUrl || DEFAULT_API_URL,
        apiKey: '',
        modelMap: {},
      },
    }
  }
  // Site servi par le backend : l'adresse du serveur est celle de la page.
  // On redirige les réglages qui pointent encore vers un `localhost` enregistré
  // lors d'une séance précédente — sur le poste d'un étudiant, ce localhost
  // désigne SA machine, où rien n'écoute.
  if (SAME_ORIGIN && cache.provider.id === 'td-backend') {
    const origin = sameOriginBase()
    const stale = !cache.provider.baseUrl.trim() || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(cache.provider.baseUrl)
    if (origin && stale) {
      cache = {
        ...cache,
        apiBaseUrl: origin,
        provider: { ...cache.provider, baseUrl: origin },
      }
    }
  }

  // Un build client n'a pas de backend : sa configuration par défaut est donc
  // le rejeu hors ligne. Mais ce n'est plus une CONTRAINTE — il peut appeler
  // Ollama ou OpenRouter directement depuis le navigateur. On ne force donc
  // le mode qu'à la première visite (aucun réglage enregistré), et l'étudiant
  // reste libre de le décocher pour brancher un fournisseur.
  if (CLIENT_ONLY && !stored) cache = { ...cache, offlineMode: true, demoMode: true }

  // `demoMode` n'a plus de case propre : il SUIT le mode hors ligne, dont il
  // était devenu le doublon. Aligné en dernier, pour rattraper aussi la
  // coercition ci-dessus et les réglages enregistrés du temps des deux cases.
  if (cache.demoMode !== cache.offlineMode) {
    cache = { ...cache, demoMode: cache.offlineMode }
  }
  return cache
}

/**
 * Le dialecte à parler, ou `'none'` quand aucun appel ne doit partir.
 *
 * Un seul endroit décide, pour que `client.ts` et l'affichage des réglages ne
 * puissent pas diverger sur la question « suis-je connecté ? ».
 */
export function providerShape(s: ChatbotsSettings = getSettings()): ProviderShape | 'none' {
  if (s.offlineMode || s.demoMode) return 'none'
  const preset = presetOf(s.provider.id)
  if (!s.provider.baseUrl.trim()) return 'none'
  // Une clef obligatoire mais absente : mieux vaut le dire que d'envoyer une
  // requête qui reviendra en 401, message que personne ne sait interpréter.
  if (preset.needsKey && !s.provider.apiKey.trim()) return 'none'
  return preset.shape
}

/**
 * La température de départ des étapes.
 *
 * Les étapes l'utilisent comme valeur initiale de leur propre réglage ; une
 * fois qu'un étudiant a bougé le curseur, c'est SA valeur qui vaut — changer
 * le défaut ne doit pas écraser un réglage en cours de séance.
 */
export function defaultTemperature(s: ChatbotsSettings = getSettings()): number {
  return s.defaultTemperature ?? DEFAULT_SAMPLING.temperature
}

/** Le nom du modèle chez le fournisseur courant. */
export function modelNameFor(modelId: string, slug: string): string {
  return getSettings().provider.modelMap[modelId]?.trim() || slug
}

/**
 * LA liste des modèles du TD — remaniée par le formateur, ou celle d'origine.
 *
 * Tout le module passe par ici plutôt que par `SANDBOX_MODELS` directement,
 * afin qu'un modèle ajouté apparaisse partout : sélecteur, tableau de bord de
 * la synthèse, onglet consommation.
 */
export function tdModels(s: ChatbotsSettings = getSettings()): SandboxModel[] {
  const list = s.customModels
  return list && list.length > 0 ? list : SANDBOX_MODELS
}

/** Hook React équivalent, pour les composants. */
export function useModels(): SandboxModel[] {
  const [settings] = useSettings()
  return tdModels(settings)
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function setSettings(patch: Partial<ChatbotsSettings>): void {
  const merged = { ...getSettings(), ...patch }
  // `apiBaseUrl` reste le miroir du backend du TD : c'est lui que lisent les
  // appels au serveur (embeddings, RAG), et il ne doit pas pointer vers
  // OpenRouter quand l'étudiant choisit un autre fournisseur.
  const next: ChatbotsSettings = {
    ...merged,
    apiBaseUrl: merged.provider.id === 'td-backend' ? merged.provider.baseUrl : '',
  }
  cache = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore : environnement sans localStorage (rare) → réglages en mémoire seulement.
  }
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Hook React : lit les réglages et se ré-abonne aux changements. */
export function useSettings(): [ChatbotsSettings, (patch: Partial<ChatbotsSettings>) => void] {
  const settings = useSyncExternalStore(subscribe, getSettings, getSettings)
  const update = useCallback((patch: Partial<ChatbotsSettings>) => setSettings(patch), [])
  return [settings, update]
}

// ============================================================
// D'où viennent les réponses : le fournisseur, son URL, sa clef.
//
// Trois façons d'atteindre un modèle, décrites par UNE SEULE forme
// (identifiant, URL, clef) pour que l'interface n'ait qu'un formulaire :
//
//   serveur local  → apps/api relaie les appels ; sa clef vit dans son
//                    fichier .env, le navigateur n'en voit aucune. Le seul
//                    montage qui reste sûr avec une clef partagée.
//   Ollama         → un serveur local, sans clef. Le plus propre en salle,
//                    mais soumis à deux contraintes de navigateur : CORS
//                    (OLLAMA_ORIGINS) et contenu mixte (voir `mixedContent`).
//   OpenRouter     → appel DIRECT depuis le navigateur. Possible : leur CORS
//                    autorise l'origine `*` et l'en-tête Authorization.
//   Eden AI        → agrégateur français, même principe qu'OpenRouter. Ses
//                    noms de modèles diffèrent : d'où `modelMap` ci-dessous.
//   OpenAI-compat  → même dialecte, URL libre (vLLM, LM Studio, proxy…).
//
// Tous sauf le serveur local parlent le même protocole : `POST {baseUrl}/chat/completions`.
// Le serveur local, lui, garde son format maison (voir client.ts).
// ============================================================

import type { Localized } from './data'

export type ProviderId = 'td-backend' | 'ollama' | 'openrouter' | 'edenai' | 'openai-compatible'

/** Le dialecte parlé : maison, ou compatible OpenAI. */
export type ProviderShape = 'td' | 'openai'

export interface ProviderPreset {
  id: ProviderId
  label: Localized
  /** Pré-remplissage du champ URL. Vide = à saisir. */
  baseUrl: string
  /** Une clef est indispensable pour que l'appel aboutisse. */
  needsKey: boolean
  shape: ProviderShape
  help: Localized
  /** Noms des modèles du TD chez ce fournisseur, quand ils diffèrent du slug OpenRouter. */
  modelMap?: Record<string, string>
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'td-backend',
    label: { fr: 'Serveur local (fichier .env)', en: 'Local server (.env file)' },
    baseUrl: '',
    needsKey: false,
    shape: 'td',
    help: {
      fr: 'Le serveur livré avec l’application (apps/api) relaie les appels vers OpenRouter. Sa clef vit dans son fichier .env, côté serveur : aucune clef ne passe par le navigateur. C’est le mode à retenir dès qu’une clef doit servir à plusieurs personnes.',
      en: 'The server shipped with the application (apps/api) relays calls to OpenRouter. Its key lives in its .env file, server-side: no key passes through the browser. This is the mode to choose as soon as one key must serve several people.',
    },
  },
  {
    id: 'ollama',
    label: { fr: 'Ollama (local)', en: 'Ollama (local)' },
    baseUrl: 'http://localhost:11434/v1',
    needsKey: false,
    shape: 'openai',
    help: {
      fr: 'Un serveur Ollama, sans clef. Il doit autoriser ce site : démarrez-le avec OLLAMA_ORIGINS réglé sur l’adresse du TD, sans quoi le navigateur bloque l’appel avant même de l’envoyer.',
      en: 'An Ollama server, no key. It must allow this site: start it with OLLAMA_ORIGINS set to the tutorial’s address, otherwise the browser blocks the call before sending it.',
    },
  },
  {
    id: 'openrouter',
    label: { fr: 'OpenRouter (direct)', en: 'OpenRouter (direct)' },
    baseUrl: 'https://openrouter.ai/api/v1',
    needsKey: true,
    shape: 'openai',
    help: {
      fr: 'Appel direct depuis ce navigateur, avec VOTRE clef. Elle reste sur ce poste et part vers OpenRouter, sans passer par aucun serveur intermédiaire.',
      en: 'Direct call from this browser, with YOUR key. It stays on this machine and goes to OpenRouter, without passing through any intermediate server.',
    },
  },
  {
    id: 'edenai',
    label: { fr: 'Eden AI (direct)', en: 'Eden AI (direct)' },
    baseUrl: 'https://api.edenai.run/v3',
    needsKey: true,
    shape: 'openai',
    help: {
      fr: 'Agrégateur français (Villeurbanne), appelé directement depuis ce navigateur avec VOTRE clef. Eden ne fait que relayer : le préfixe du nom de modèle dit qui le fait tourner — scaleway/ en France, azure/…@eu dans l’Union européenne, amazon/ chez AWS.',
      en: 'French aggregator (Villeurbanne), called directly from this browser with YOUR key. Eden only relays: the model name prefix tells who runs it — scaleway/ in France, azure/…@eu in the European Union, amazon/ at AWS.',
    },
    // Hébergement en Europe partout : Llama chez Scaleway (Paris), Luna sur
    // Azure UE, Gemma sur AWS région UE (`@us` désignerait les États-Unis).
    // Aucun hébergeur français ne propose Gemma 3 4B ni Luna chez Eden.
    modelMap: {
      'gemma-4b': 'amazon/google.gemma-3-4b-it',
      'llama-70b': 'scaleway/llama-3.3-70b-instruct',
      'gpt-6-luna': 'azure/gpt-6-luna@eu',
    },
  },
  {
    id: 'openai-compatible',
    label: { fr: 'Autre API compatible OpenAI', en: 'Other OpenAI-compatible API' },
    baseUrl: '',
    needsKey: false,
    shape: 'openai',
    help: {
      fr: 'Tout service parlant le dialecte OpenAI : vLLM, LM Studio, un proxy d’établissement… L’URL doit se terminer par la racine de l’API (souvent « /v1 »).',
      en: 'Any service speaking the OpenAI dialect: vLLM, LM Studio, an institutional proxy… The URL must end at the API root (often “/v1”).',
    },
  },
]

export function presetOf(id: ProviderId): ProviderPreset {
  return PROVIDER_PRESETS.find((p) => p.id === id) ?? PROVIDER_PRESETS[0]
}

/** Réglages de connexion, tels qu'ils sont persistés. */
export interface ProviderConfig {
  id: ProviderId
  baseUrl: string
  apiKey: string
  /**
   * Correspondance modèle du TD → nom chez CE fournisseur, par identifiant
   * (`gemma-4b` → `gemma3:4b`). Vide = on garde le slug d'origine.
   *
   * Indispensable parce que les noms ne sont PAS portables : OpenRouter dit
   * `google/gemma-3-4b-it`, Ollama dit `gemma3:4b`. Sans cette table, changer
   * de fournisseur produirait un 404 sur chaque appel.
   */
  modelMap: Record<string, string>
}

/**
 * Le contenu mixte : une page en https ne peut pas appeler une adresse en
 * http. Le navigateur refuse AVANT d'émettre la requête, et l'erreur qui
 * remonte au code est indiscernable d'un serveur éteint — d'où ce test, qui
 * permet de le dire clairement dans les réglages.
 *
 * `localhost` et `127.0.0.1` font exception : les navigateurs les considèrent
 * comme des origines sûres. Une IP de réseau local (192.168.x.y), non — c'est
 * précisément le cas « Ollama sur le poste du formateur », et il échouera.
 */
export function mixedContent(baseUrl: string): boolean {
  if (typeof location === 'undefined' || location.protocol !== 'https:') return false
  if (!baseUrl.startsWith('http://')) return false
  return !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseUrl)
}

// ---------- Découverte des modèles disponibles ----------

export interface DiscoveredModel {
  /** Nom tel que le fournisseur l'attend dans le champ `model`. */
  name: string
}

/**
 * Liste ce que le fournisseur propose réellement.
 *
 * Deux routes selon le dialecte : `/api/tags` chez Ollama (qui expose aussi
 * `/v1/models`), `/models` chez OpenRouter et les compatibles. On tente la
 * route OpenAI d'abord, puis Ollama en repli — un serveur peut n'exposer que
 * l'une des deux.
 *
 * Retourne `null` si la découverte échoue : ce n'est pas une erreur bloquante,
 * l'utilisateur peut toujours saisir un nom à la main.
 */
export async function discoverModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<DiscoveredModel[] | null> {
  const root = baseUrl.replace(/\/$/, '')
  if (!root) return null

  const headers: Record<string, string> = {}
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`

  // Route OpenAI : { data: [{ id }] }
  try {
    const res = await fetch(`${root}/models`, { headers, signal })
    if (res.ok) {
      const data = (await res.json()) as { data?: { id?: string }[] }
      const names = (data.data ?? []).map((m) => m.id).filter((n): n is string => !!n)
      if (names.length > 0) return names.map((name) => ({ name }))
    }
  } catch {
    // On tente la route suivante.
  }

  // Route Ollama : { models: [{ name }] }. La racine porte souvent « /v1 »,
  // que `/api/tags` ne connaît pas : on remonte d'un cran.
  const ollamaRoot = root.replace(/\/v1$/, '')
  try {
    const res = await fetch(`${ollamaRoot}/api/tags`, { headers, signal })
    if (res.ok) {
      const data = (await res.json()) as { models?: { name?: string }[] }
      const names = (data.models ?? []).map((m) => m.name).filter((n): n is string => !!n)
      if (names.length > 0) return names.map((name) => ({ name }))
    }
  } catch {
    // Découverte impossible : saisie manuelle.
  }

  return null
}

/**
 * Vérifie que la CLEF est acceptée, et pas seulement que le serveur répond.
 *
 * Nécessaire parce que lister les modèles ne prouve rien : `/models` répond
 * 200 chez OpenRouter même avec une clef invalide — l'essai de connexion
 * annoncerait donc « établie » à quelqu'un qui vient de faire une faute de
 * frappe, et l'erreur ne surgirait qu'au premier envoi. `/key`, lui, refuse
 * en 401. Les serveurs qui n'ont pas cette route (Ollama) renvoient `null` :
 * on ne conclut rien plutôt que d'inventer une panne.
 */
export async function checkKey(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<boolean | null> {
  const root = baseUrl.replace(/\/$/, '')
  if (!root || !apiKey.trim()) return null
  try {
    const res = await fetch(`${root}/key`, {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal,
    })
    if (res.status === 401 || res.status === 403) return false
    if (res.ok) return true
    return null
  } catch {
    return null
  }
}

/**
 * Apparie les modèles du TD à ce que le fournisseur propose.
 *
 * On cherche d'abord le slug exact (cas d'OpenRouter, où nos slugs sont déjà
 * les bons), puis on retombe sur une correspondance approchée à partir de
 * jetons distinctifs — « gemma » + « 4b » retrouve aussi bien
 * `google/gemma-3-4b-it` que `gemma3:4b`.
 *
 * Ce qui reste introuvable est laissé vide : l'interface le signale et
 * l'enseignant saisit le nom lui-même, plutôt que de partir sur un modèle
 * choisi au hasard qui fausserait la comparaison du TD.
 */
export function matchModels(
  wanted: { id: string; slug: string; hints: string[] }[],
  available: DiscoveredModel[],
): Record<string, string> {
  const names = available.map((m) => m.name)
  const out: Record<string, string> = {}

  for (const w of wanted) {
    const exact = names.find((n) => n === w.slug)
    if (exact) {
      out[w.id] = exact
      continue
    }
    // Tous les jetons doivent être présents : « llama » seul ramènerait
    // n'importe quel Llama, et la taille du modèle EST le sujet du TD.
    const fuzzy = names.find((n) => {
      const low = n.toLowerCase()
      return w.hints.every((h) => low.includes(h))
    })
    if (fuzzy) out[w.id] = fuzzy
  }

  return out
}

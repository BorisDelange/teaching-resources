// ============================================================
// Estimation de l'empreinte d'une requête LLM, à partir du seul
// décompte de tokens et de la taille du modèle.
//
// Méthodologie EcoLogits (association GenAI Impact), facteurs ADEME :
//   https://ecologits.ai/latest/methodology/llm_inference/
//
// Pourquoi une ESTIMATION et pas une mesure : l'inférence tourne chez
// le fournisseur. On ne connaît ni le GPU, ni le taux de traitement par
// lots, ni le pays d'hébergement. L'incertitude est d'au moins un
// facteur 10 — c'est dit à l'écran, et c'est en soi un objet
// pédagogique (analogue à un intervalle de confiance très large).
//
// Ce que ce calcul N'INCLUT PAS : l'entraînement du modèle (amorti,
// négligeable par requête) et la fabrication des serveurs — laquelle
// pèse pourtant autant que l'électricité dans un mix bas carbone.
// ============================================================

/** Coefficients EcoLogits : énergie GPU par token de sortie (Wh). */
const ALPHA = 1.17e-6
const BETA = -1.12e-2
const GAMMA = 4.05e-5

/** Taille de lot de référence retenue par EcoLogits. */
const BATCH = 64

/**
 * Majoration couvrant le serveur hors GPU et le refroidissement (PUE).
 * EcoLogits situe le PUE entre 1,09 et 1,20 ; on retient 1,5 pour
 * englober aussi la part serveur, dans l'esprit du périmètre « complet »
 * publié par Google (qui montre un facteur ~2,4 entre GPU seul et
 * système entier).
 */
const OVERHEAD = 1.5

export interface CarbonZone {
  id: string
  label: { fr: string; en: string }
  /** Intensité carbone du réseau, en gCO2eq/kWh. */
  gPerKwh: number
  note: { fr: string; en: string }
}

export const CARBON_ZONES: CarbonZone[] = [
  {
    id: 'fr',
    label: { fr: 'France', en: 'France' },
    gPerKwh: 21,
    note: {
      fr: '95 % du mix électrique français est décarboné (nucléaire, hydraulique, renouvelables). RTE, bilan 2024.',
      en: '95% of the French electricity mix is low-carbon (nuclear, hydro, renewables). RTE, 2024 review.',
    },
  },
  {
    id: 'world',
    label: { fr: 'Monde', en: 'World' },
    gPerKwh: 590,
    note: {
      fr: 'Moyenne mondiale en analyse de cycle de vie (ADEME). Vingt-huit fois plus que la France.',
      en: 'World average, life-cycle basis (ADEME). Twenty-eight times more than France.',
    },
  },
]

export const DEFAULT_ZONE = 'fr'

/** Émissions d'une voiture essence, gCO2e/km (ADEME Base Empreinte). */
export const CAR_G_PER_KM = 218

export interface Footprint {
  /** Énergie estimée, en wattheures. */
  wh: number
  /** Émissions estimées, en grammes de CO2 équivalent. */
  gco2: number
  /** Bornes basse et haute (÷3 et ×3), pour afficher une fourchette. */
  gco2Low: number
  gco2High: number
  /** Équivalent en mètres parcourus en voiture. */
  carMeters: number
}

/**
 * Estime l'empreinte d'une génération.
 *
 * @param outputTokens tokens produits par le modèle
 * @param paramsBillions paramètres actifs du modèle, en milliards
 * @param gPerKwh intensité carbone du réseau (gCO2eq/kWh)
 */
export function estimateFootprint(
  outputTokens: number,
  paramsBillions: number,
  gPerKwh: number,
): Footprint {
  const perToken = ALPHA * Math.exp(BETA * BATCH) * paramsBillions + GAMMA
  const wh = outputTokens * perToken * OVERHEAD
  const gco2 = (wh / 1000) * gPerKwh
  return {
    wh,
    gco2,
    // L'incertitude réelle dépasse le facteur 10 ; on affiche une
    // fourchette resserrée (facteur 3) pour rester lisible, en le disant.
    gco2Low: gco2 / 3,
    gco2High: gco2 * 3,
    carMeters: (gco2 / CAR_G_PER_KM) * 1000,
  }
}

// ---------- Points de comparaison ----------
//
// Les tailles de GPT-5, Claude et Gemini ne sont PAS publiées : toute
// estimation par paramètres serait une rumeur. On s'en tient donc à des
// consommations par requête publiées par des tiers ou par l'opérateur
// lui-même, en citant la source à l'écran.

export interface Reference {
  id: string
  label: { fr: string; en: string }
  /** Énergie publiée, en wattheures par requête. */
  wh: number
  source: { fr: string; en: string }
  detail: { fr: string; en: string }
}

export const REFERENCES: Reference[] = [
  {
    id: 'gemini',
    label: { fr: 'Gemini (Google)', en: 'Gemini (Google)' },
    wh: 0.24,
    source: { fr: 'Google, août 2025', en: 'Google, August 2025' },
    detail: {
      fr: 'Prompt texte médian. Seul chiffre publié par un opérateur avec un périmètre complet (puces, serveur, machines au repos, refroidissement). Non vérifié par un tiers.',
      en: 'Median text prompt. The only operator-published figure with a full scope (chips, server, idle machines, cooling). Not third-party verified.',
    },
  },
  {
    id: 'gpt4o',
    label: { fr: 'GPT-4o (OpenAI)', en: 'GPT-4o (OpenAI)' },
    wh: 0.3,
    source: { fr: 'Epoch AI, février 2025', en: 'Epoch AI, February 2025' },
    detail: {
      fr: 'Estimation externe pour une requête typique (~100 milliards de paramètres actifs supposés, 500 tokens produits). OpenAI ne publie pas la taille de ses modèles.',
      en: 'External estimate for a typical request (~100 billion active parameters assumed, 500 tokens generated). OpenAI does not publish its model sizes.',
    },
  },
  {
    id: 'search',
    label: { fr: 'Recherche Google', en: 'Google search' },
    wh: 0.3,
    source: { fr: 'Google, 2009', en: 'Google, 2009' },
    detail: {
      fr: 'Chiffre historique jamais réactualisé publiquement : à prendre avec précaution. Il est à l’origine de la comparaison « une requête IA = dix recherches Google », qui repose sur des hypothèses aujourd’hui contestées.',
      en: 'Historical figure never publicly updated: treat with caution. It underpins the “one AI query = ten Google searches” comparison, which rests on assumptions now disputed.',
    },
  },
]

/**
 * Rapport entre l'énergie d'une requête et celle d'une référence
 * publiée. Sert à situer un petit modèle ouvert face aux gros modèles
 * commerciaux.
 */
export function compareToReference(wh: number, ref: Reference): number {
  return ref.wh / Math.max(wh, 1e-9)
}

/** Formate une masse de CO2 avec une unité lisible. */
export function formatCo2(g: number): string {
  if (g < 0.001) return `${(g * 1000).toFixed(2)} mg`
  if (g < 1) return `${g.toFixed(3)} g`
  return `${g.toFixed(2)} g`
}

/** Formate une distance équivalente en voiture. */
export function formatDistance(meters: number): string {
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`
  if (meters < 1000) return `${meters.toFixed(1)} m`
  return `${(meters / 1000).toFixed(2)} km`
}

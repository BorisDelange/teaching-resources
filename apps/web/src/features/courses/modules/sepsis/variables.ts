import type { Patient } from '@/features/courses/modules/sepsis/cohort'
import type { Lang } from '@/lib/useLang'

export type FeatureKey =
  | 'age'
  | 'hr'
  | 'sbp'
  | 'temp'
  | 'resp'
  | 'o2sat'
  | 'wbc'
  | 'lactate'
  | 'creatinine'
  | 'platelets'

/**
 * Les quatre dimensions qui définissent une variable sans ambiguïté.
 *
 * Sans elles, « la créatinine du patient » ne veut rien dire : la première ?
 * la plus élevée ? celle des 24 premières heures ? Deux personnes recueillant
 * la même donnée dans le même dossier obtiendraient des valeurs différentes.
 *
 * Voir « Bien définir ses variables » sur le site Linkr.
 */
export interface VariableDefinition {
  /** Ce qu'on mesure, unité comprise. */
  concept: string
  /** Le point de repère dans le parcours du patient. */
  anchor: string
  /** La période de recherche, relative à l'ancrage. */
  window: string
  /** La valeur retenue quand la fenêtre en contient plusieurs. */
  aggregate: string
}

export interface VariableMeta {
  key: FeatureKey
  label: string
  short: string
  unit: string
  kind: 'vital' | 'lab' | 'demo'
  help: string
  normal: [number, number]
  /** La définition complète, telle qu'elle figurerait dans un protocole. */
  definition: VariableDefinition
  labelEn: string
  shortEn: string
  unitEn: string
  helpEn: string
  definitionEn: VariableDefinition
}

/**
 * L'ancrage et la fenêtre sont les mêmes pour toute la cohorte : nos données
 * sont l'instantané des six premières heures de réanimation. Les répéter dix
 * fois n'apprendrait rien — seul l'agrégat varie d'une variable à l'autre.
 */
const ANCHOR = 'Admission en réanimation'
const WINDOW = 'H0 à H6'
const ANCHOR_EN = 'ICU admission'
const WINDOW_EN = 'H0 to H6'

/**
 * La médiane pour les paramètres répétés, la première valeur pour ce qui n'est
 * mesuré qu'une fois. La médiane resiste aux artefacts de capteur — un brassard
 * qui glisse produit une pression aberrante qu'une moyenne intégrerait.
 */
function med(concept: string): VariableDefinition {
  return { concept, anchor: ANCHOR, window: WINDOW, aggregate: 'Médiane' }
}

function medEn(concept: string): VariableDefinition {
  return { concept, anchor: ANCHOR_EN, window: WINDOW_EN, aggregate: 'Median' }
}

export const VARIABLES: VariableMeta[] = [
  {
    key: 'age', label: 'Âge', short: 'Âge', unit: 'ans', kind: 'demo', normal: [0, 120],
    help: "Âge du patient à l'admission.",
    // L'âge ne varie pas pendant le séjour : ni fenêtre ni agrégat à choisir,
    // et c'est justement ce qui le distingue des autres.
    definition: {
      concept: 'Âge (années)',
      anchor: ANCHOR,
      window: 'Instantané',
      aggregate: 'Valeur unique',
    },
    labelEn: 'Age', shortEn: 'Age', unitEn: 'years',
    helpEn: 'Patient age at admission.',
    definitionEn: {
      concept: 'Age (years)',
      anchor: ANCHOR_EN,
      window: 'Snapshot',
      aggregate: 'Single value',
    },
  },
  {
    key: 'hr', label: 'Fréquence cardiaque', short: 'FC', unit: '/min', kind: 'vital', normal: [60, 100],
    help: 'Une tachycardie accompagne souvent le sepsis.',
    definition: med('Fréquence cardiaque (/min)'),
    labelEn: 'Heart rate', shortEn: 'HR', unitEn: '/min',
    helpEn: 'Tachycardia often accompanies sepsis.',
    definitionEn: medEn('Heart rate (/min)'),
  },
  {
    key: 'sbp', label: 'Pression artérielle systolique', short: 'PAS', unit: 'mmHg', kind: 'vital', normal: [100, 140],
    help: "Une hypotension signe une défaillance circulatoire.",
    definition: med('Pression artérielle systolique (mmHg)'),
    labelEn: 'Systolic blood pressure', shortEn: 'SBP', unitEn: 'mmHg',
    helpEn: 'Hypotension signals circulatory failure.',
    definitionEn: medEn('Systolic blood pressure (mmHg)'),
  },
  {
    key: 'temp', label: 'Température', short: 'T°', unit: '°C', kind: 'vital', normal: [36, 38],
    help: 'Fièvre ou hypothermie possibles.',
    definition: med('Température corporelle (°C)'),
    labelEn: 'Temperature', shortEn: 'Temp', unitEn: '°C',
    helpEn: 'Fever or hypothermia may occur.',
    definitionEn: medEn('Body temperature (°C)'),
  },
  {
    key: 'resp', label: 'Fréquence respiratoire', short: 'FR', unit: '/min', kind: 'vital', normal: [12, 20],
    help: 'La polypnée est un signe précoce.',
    definition: med('Fréquence respiratoire (/min)'),
    labelEn: 'Respiratory rate', shortEn: 'RR', unitEn: '/min',
    helpEn: 'Tachypnoea is an early sign.',
    definitionEn: medEn('Respiratory rate (/min)'),
  },
  {
    key: 'o2sat', label: "Saturation en O₂", short: 'SpO₂', unit: '%', kind: 'vital', normal: [95, 100],
    help: "Reflet de l'oxygénation.",
    definition: med('Saturation pulsée en oxygène (%)'),
    labelEn: 'O₂ saturation', shortEn: 'SpO₂', unitEn: '%',
    helpEn: 'Reflects oxygenation.',
    definitionEn: medEn('Pulse oxygen saturation (%)'),
  },
  {
    key: 'wbc', label: 'Globules blancs', short: 'GB', unit: 'G/L', kind: 'lab', normal: [4, 10],
    help: "Hyperleucocytose ou leucopénie en cas d'infection.",
    definition: med('Leucocytes sanguins (G/L)'),
    labelEn: 'White blood cells', shortEn: 'WBC', unitEn: 'G/L',
    helpEn: 'Leukocytosis or leukopenia in infection.',
    definitionEn: medEn('Blood white blood cell count (G/L)'),
  },
  {
    key: 'lactate', label: 'Lactate', short: 'Lactate', unit: 'mmol/L', kind: 'lab', normal: [0.5, 2],
    help: "Marqueur d'hypoperfusion tissulaire, central dans le sepsis.",
    definition: med('Lactatémie artérielle (mmol/L)'),
    labelEn: 'Lactate', shortEn: 'Lactate', unitEn: 'mmol/L',
    helpEn: 'Marker of tissue hypoperfusion, central to sepsis.',
    definitionEn: medEn('Arterial lactate (mmol/L)'),
  },
  {
    key: 'creatinine', label: 'Créatinine', short: 'Créat.', unit: 'mg/dL', kind: 'lab', normal: [0.6, 1.2],
    help: 'Reflet de la fonction rénale.',
    definition: med('Créatininémie (mg/dL)'),
    labelEn: 'Creatinine', shortEn: 'Creat.', unitEn: 'mg/dL',
    helpEn: 'Reflects kidney function.',
    definitionEn: medEn('Serum creatinine (mg/dL)'),
  },
  {
    key: 'platelets', label: 'Plaquettes', short: 'Plq', unit: 'G/L', kind: 'lab', normal: [150, 400],
    help: 'Une thrombopénie peut accompagner le sepsis.',
    definition: med('Plaquettes sanguines (G/L)'),
    labelEn: 'Platelets', shortEn: 'Plt', unitEn: 'G/L',
    helpEn: 'Thrombocytopenia may accompany sepsis.',
    definitionEn: medEn('Blood platelet count (G/L)'),
  },
]

export const VARIABLE_BY_KEY: Record<FeatureKey, VariableMeta> = Object.fromEntries(
  VARIABLES.map((v) => [v.key, v]),
) as Record<FeatureKey, VariableMeta>

/** Les textes d'une variable dans la langue voulue. */
export function varText(v: VariableMeta, lang: Lang): {
  label: string
  short: string
  unit: string
  help: string
  definition: VariableDefinition
} {
  return lang === 'en'
    ? { label: v.labelEn, short: v.shortEn, unit: v.unitEn, help: v.helpEn, definition: v.definitionEn }
    : { label: v.label, short: v.short, unit: v.unit, help: v.help, definition: v.definition }
}

export function patientValue(p: Patient, key: FeatureKey): number | null {
  return p[key]
}

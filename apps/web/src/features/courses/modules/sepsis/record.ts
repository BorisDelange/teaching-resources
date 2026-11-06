/**
 * Le dossier d'un patient, reconstitué heure par heure.
 *
 * La cohorte ne contient qu'un instantané par patient (la médiane des six
 * premières heures). Un dossier de réanimation, lui, se lit dans le temps :
 * c'est la montée du lactate qui alerte, pas sa valeur isolée. On reconstitue
 * donc une trajectoire plausible AUTOUR de l'instantané réel.
 *
 * Ce que cela veut dire, et qu'il faut dire aux étudiants : les COURBES sont
 * simulées, les VALEURS de l'instantané et l'issue (sepsis ou non) viennent des
 * vraies données PhysioNet. La trajectoire illustre la forme d'un dossier, elle
 * ne prétend pas être le dossier de ce patient-là.
 */

import { COHORT, MEDIANS, type Patient } from './cohort'
import { VARIABLE_BY_KEY, varText, type FeatureKey } from './variables'
import type { Lang } from '@/lib/useLang'
import type { TimelineEvent } from './event-marks'

/** Début du séjour, en millisecondes. Origine arbitraire : tout s'affiche en « H+n ». */
export const ADMISSION_MS = 0
/** Durée du dossier reconstitué. */
export const STAY_HOURS = 24
export const STAY_MS = STAY_HOURS * 3600_000

/** Générateur pseudo-aléatoire déterministe : même patient, même dossier, toujours. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Bruit gaussien centré, par Box-Muller. */
function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng())
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** À quelle cadence chaque paramètre est-il relevé, en réanimation ? */
const SAMPLING: Record<FeatureKey, { everyHours: number; jitterMin: number }> = {
  age: { everyHours: 0, jitterMin: 0 },
  // Paramètres vitaux : scopés en continu, relevées toutes les heures.
  hr: { everyHours: 1, jitterMin: 4 },
  sbp: { everyHours: 1, jitterMin: 4 },
  temp: { everyHours: 2, jitterMin: 10 },
  resp: { everyHours: 1, jitterMin: 4 },
  o2sat: { everyHours: 1, jitterMin: 4 },
  // Biologie : bien plus espacée, et c'est tout le problème du sepsis.
  wbc: { everyHours: 12, jitterMin: 45 },
  lactate: { everyHours: 6, jitterMin: 30 },
  creatinine: { everyHours: 12, jitterMin: 45 },
  platelets: { everyHours: 12, jitterMin: 45 },
}

/** Amplitude du bruit de mesure, par paramètre (écart-type). */
const NOISE: Record<FeatureKey, number> = {
  age: 0,
  hr: 4,
  sbp: 5,
  temp: 0.15,
  resp: 1.5,
  o2sat: 1,
  wbc: 0.8,
  lactate: 0.25,
  creatinine: 0.08,
  platelets: 12,
}

/**
 * Dérive du paramètre au fil du séjour, chez un patient qui se dégrade.
 *
 * Le signe dit dans quel sens part le paramètre quand le sepsis s'installe :
 * la fréquence cardiaque monte, la pression descend. La valeur est une
 * fraction de la valeur initiale, atteinte en fin de séjour.
 */
const SEPSIS_DRIFT: Record<FeatureKey, number> = {
  age: 0,
  hr: 0.18,
  sbp: -0.16,
  temp: 0.02,
  resp: 0.22,
  o2sat: -0.03,
  wbc: 0.3,
  lactate: 0.9,
  creatinine: 0.25,
  platelets: -0.25,
}

export interface RecordSeries {
  key: FeatureKey
  label: string
  short: string
  unit: string
  colour: string
  kind: 'vital' | 'lab' | 'demo'
  normal: [number, number]
  events: TimelineEvent[]
  /** Échelle verticale fixe, pour que le zoom ne fasse pas bondir la courbe. */
  range: [number, number] | null
  /** Le paramètre a-t-il été mesuré au moins une fois ? */
  measured: boolean
  /** Dernière valeur relevée, celle qu'affiche le bandeau de paramètres. */
  last: number | null
}

export interface PatientRecord {
  patient: Patient
  series: RecordSeries[]
  /** Perfusions et actes, dessinés en blocs. */
  events: { label: string; colour: string; events: TimelineEvent[] }[]
}

/** Couleur d'une ligne, selon sa nature. Palette du projet, sans exception. */
const COLOURS: Record<'vital' | 'lab' | 'demo', string> = {
  vital: '#3b82f6',
  lab: '#f59e0b',
  demo: '#64748b',
}

/**
 * Reconstitue le dossier d'un patient.
 *
 * Les paramètres NON mesurés dans la cohorte restent non mesurés ici : c'est
 * l'information la plus importante du TD. Une ligne vide dans le dossier, c'est
 * un examen que personne n'a demandé — et le fait qu'on ne l'ait pas demandé
 * dit déjà quelque chose du patient.
 */
export function buildRecord(patient: Patient, lang: Lang = 'fr'): PatientRecord {
  const en = lang === 'en'
  const rng = seeded(patient.id * 7919 + 13)
  const septic = patient.sepsis === 1

  const series: RecordSeries[] = []
  for (const meta of Object.values(VARIABLE_BY_KEY)) {
    if (meta.key === 'age') continue
    const txt = varText(meta, lang)
    const snapshot = patient[meta.key]
    if (snapshot == null) {
      series.push({
        key: meta.key,
        label: txt.label,
        short: txt.short,
        unit: txt.unit,
        colour: COLOURS[meta.kind],
        kind: meta.kind,
        normal: meta.normal,
        events: [],
        range: null,
        measured: false,
        last: null,
      })
      continue
    }

    const cadence = SAMPLING[meta.key]
    const drift = septic ? SEPSIS_DRIFT[meta.key] : 0
    const noise = NOISE[meta.key]
    const events: TimelineEvent[] = []

    // L'instantané de la cohorte est la MÉDIANE des six premières heures : on
    // ancre donc la trajectoire pour que sa médiane sur H0–H6 retombe dessus,
    // plutôt que de partir de cette valeur et de dériver au-dessus.
    const base = snapshot / (1 + drift * 0.125)

    for (let h = 0; h <= STAY_HOURS; h += cadence.everyHours) {
      const jitter = (rng() - 0.5) * 2 * cadence.jitterMin * 60_000
      const t = ADMISSION_MS + h * 3600_000 + jitter
      if (t < ADMISSION_MS || t > ADMISSION_MS + STAY_MS) continue
      // La dégradation n'est pas linéaire : elle s'accélère. Un carré rend la
      // courbe qui inquiète le clinicien — plate, puis qui décroche.
      const progress = (h / STAY_HOURS) ** 2
      const value = base * (1 + drift * progress) + gauss(rng) * noise
      const rounded =
        meta.key === 'temp'
          ? Math.round(value * 10) / 10
          : meta.key === 'lactate' || meta.key === 'creatinine'
            ? Math.round(value * 10) / 10
            : Math.round(value * 10) / 10
      events.push({ start: t, end: null, value: Math.max(0, rounded), text: null })
    }

    const values = events.map((e) => e.value as number)
    // L'échelle englobe la plage normale : une courbe qui reste dans les clous
    // doit se VOIR au milieu de sa bande, pas remplir toute la ligne à cause
    // d'un bruit de deux battements.
    const lo = Math.min(...values, meta.normal[0])
    const hi = Math.max(...values, meta.normal[1])
    const pad = (hi - lo) * 0.08 || 1

    series.push({
      key: meta.key,
      label: txt.label,
      short: txt.short,
      unit: txt.unit,
      colour: COLOURS[meta.kind],
      kind: meta.kind,
      normal: meta.normal,
      events,
      range: [lo - pad, hi + pad],
      measured: true,
      last: values.length ? values[values.length - 1] : null,
    })
  }

  // Quelques actes qui durent, pour que la chronologie montre aussi des blocs
  // — et pour amener, à l'étape « explicabilité », la question du biais
  // d'indication : ce patient va « mieux » parce qu'on l'a déjà traité.
  const events: PatientRecord['events'] = []
  events.push({
    label: en ? 'Fluid resuscitation' : 'Remplissage vasculaire',
    colour: '#3b82f6',
    events: [
      {
        start: ADMISSION_MS + 0.5 * 3600_000,
        end: ADMISSION_MS + (septic ? 4 : 2) * 3600_000,
        value: septic ? 1500 : 500,
        text: en ? 'NaCl 0.9%' : 'NaCl 0,9 %',
      },
    ],
  })
  if (septic) {
    events.push({
      label: en ? 'Antibiotic therapy' : 'Antibiothérapie',
      colour: '#10b981',
      events: [
        {
          start: ADMISSION_MS + 8 * 3600_000,
          end: ADMISSION_MS + STAY_MS,
          value: null,
          text: en ? 'Cefotaxime IV' : 'Céfotaxime IV',
        },
      ],
    })
  }

  return { patient, series, events }
}

// ---------- Explicabilité : contributions exactes ----------

export interface Contribution {
  key: FeatureKey
  label: string
  /** Valeur du paramètre chez ce patient, imputée si elle manquait. */
  value: number
  /** La valeur était-elle absente, donc remplacée ? */
  imputed: boolean
  /** Poussée sur le log-odds. Positive = pousse vers « sepsis ». */
  effect: number
}

/**
 * Les contributions de chaque variable à la prédiction d'un patient.
 *
 * Pour un modèle linéaire, les valeurs de Shapley ont une forme fermée :
 * la contribution de la variable i vaut wᵢ·(xᵢ − x̄ᵢ), où x̄ᵢ est la moyenne
 * d'entraînement. Ce n'est pas une approximation à la SHAP-sampling — c'est le
 * résultat exact, et il tient en trois lignes. La somme des contributions plus
 * la valeur de base redonne exactement le log-odds du patient : c'est ce qui
 * rend le diagramme en cascade honnête, chaque barre est réellement une part
 * du total.
 *
 * `x̄ᵢ` étant la moyenne, une variable à sa valeur moyenne ne contribue à rien :
 * le patient « moyen » obtient la probabilité de base, ce qui est exactement ce
 * qu'on veut lire.
 */
export function contributions(
  model: { features: FeatureKey[]; weights: number[]; means: number[]; sds: number[] },
  values: Partial<Record<FeatureKey, number | null>>,
  lang: Lang = 'fr',
): Contribution[] {
  return model.features.map((key, j) => {
    const raw = values[key]
    const missing = raw == null
    const value = missing ? imputedValue(key) : (raw as number)
    const z = (value - model.means[j]) / model.sds[j]
    // Centré sur la moyenne d'entraînement : en variable standardisée, la
    // moyenne vaut 0, donc l'écart à la moyenne EST z.
    return {
      key,
      label: varText(VARIABLE_BY_KEY[key], lang).label,
      value,
      imputed: missing,
      effect: model.weights[j] * z,
    }
  })
}

/** La valeur qui remplace une mesure absente : la médiane de la cohorte. */
export function imputedValue(key: FeatureKey): number {
  if (key === 'age') return 65
  return MEDIANS[key as keyof typeof MEDIANS]
}

/** Le log-odds de base du modèle : ce que « prédit » un patient moyen. */
export function baseLogOdds(model: { bias: number }): number {
  return model.bias
}

export function sigmoid(z: number): number {
  if (z < -30) return 0
  if (z > 30) return 1
  return 1 / (1 + Math.exp(-z))
}

/**
 * Quelques patients choisis pour l'étape « dossier », avec ce qu'ils
 * illustrent. On les cherche par PROFIL plutôt que de figer des identifiants :
 * la cohorte peut être régénérée, et un `id` en dur pointerait alors sur un
 * autre patient sans que rien ne le signale.
 */
export function pickTeachingPatients(lang: Lang = 'fr'): { patient: Patient; note: string }[] {
  const en = lang === 'en'
  const complete = (p: Patient) =>
    p.lactate != null && p.wbc != null && p.creatinine != null && p.platelets != null

  const septicComplete = COHORT.find((p) => p.sepsis === 1 && complete(p) && (p.lactate ?? 0) > 3)
  const septicSparse = COHORT.find(
    (p) => p.sepsis === 1 && p.lactate == null && p.wbc == null && p.creatinine == null,
  )
  const healthyHighHr = COHORT.find(
    (p) => p.sepsis === 0 && complete(p) && (p.hr ?? 0) > 110 && (p.lactate ?? 0) < 2,
  )

  const out: { patient: Patient; note: string }[] = []
  if (septicComplete) {
    out.push({
      patient: septicComplete,
      note: en
        ? 'Complete record, high lactate: the model has everything it needs.'
        : 'Dossier complet, lactate élevé : le modèle a tout ce qu’il lui faut.',
    })
  }
  if (healthyHighHr) {
    out.push({
      patient: healthyHighHr,
      note: en
        ? 'Tachycardic but no sepsis: a false alarm, worth understanding.'
        : 'Tachycarde mais sans sepsis : une fausse alerte, à comprendre.',
    })
  }
  if (septicSparse) {
    out.push({
      patient: septicSparse,
      note: en
        ? 'Almost no lab work: the model predicts mostly from the gaps.'
        : 'Presque aucun bilan : le modèle prédit surtout à partir du vide.',
    })
  }
  return out
}

import { COHORT, MEDIANS, type Patient } from '@/features/courses/modules/sepsis/cohort'
import { type FeatureKey } from './variables'

// Deterministic RNG so every student sees the same "training run" for the same settings.
function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function impute(p: Patient, key: FeatureKey): number {
  const v = p[key]
  if (v !== null) return v
  if (key === 'age') return 65
  return MEDIANS[key as keyof typeof MEDIANS]
}

export interface Prediction {
  patient: Patient
  proba: number
}

export interface TrainedModel {
  features: FeatureKey[]
  weights: number[]
  bias: number
  means: number[]
  sds: number[]
  train: Prediction[]
  test: Prediction[]
}

export interface TrainOptions {
  features: FeatureKey[]
  trainFraction: number // 0..1
  // 'patient' = correct split; 'row' = deliberately leaky demo (duplicates patients across sets)
  splitMode?: 'patient' | 'row'
  seed?: number
}

function standardize(rows: number[][]) {
  const n = rows.length
  const d = rows[0].length
  const means = new Array(d).fill(0)
  const sds = new Array(d).fill(0)
  for (const r of rows) for (let j = 0; j < d; j++) means[j] += r[j]
  for (let j = 0; j < d; j++) means[j] /= n
  for (const r of rows) for (let j = 0; j < d; j++) sds[j] += (r[j] - means[j]) ** 2
  for (let j = 0; j < d; j++) sds[j] = Math.sqrt(sds[j] / n) || 1
  return { means, sds }
}

function sigmoid(z: number) {
  if (z < -30) return 0
  if (z > 30) return 1
  return 1 / (1 + Math.exp(-z))
}

export function trainModel(opts: TrainOptions): TrainedModel {
  const { features, trainFraction, splitMode = 'patient', seed = 42 } = opts
  const rng = seededRandom(seed)

  const shuffled = [...COHORT]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const cut = Math.max(1, Math.round(shuffled.length * trainFraction))
  let trainSet: Patient[]
  let testSet: Patient[]
  if (splitMode === 'row') {
    // Leaky demo: same patients appear (near-)duplicated in both sets.
    trainSet = shuffled.slice(0, cut)
    testSet = [...shuffled.slice(cut), ...trainSet.slice(0, shuffled.length - cut)]
  } else {
    trainSet = shuffled.slice(0, cut)
    testSet = shuffled.slice(cut)
  }

  const toRow = (p: Patient) => features.map((f) => impute(p, f))
  const trainRows = trainSet.map(toRow)
  const { means, sds } = standardize(trainRows)
  const norm = (row: number[]) => row.map((v, j) => (v - means[j]) / sds[j])

  const X = trainRows.map(norm)
  const y = trainSet.map((p) => p.sepsis)
  const d = features.length
  const w = new Array(d).fill(0)
  let b = 0

  // Class weighting to counter the ~9% prevalence, else the model predicts "no sepsis" for everyone.
  const posCount = y.reduce((a, v) => a + v, 0) || 1
  const negCount = y.length - posCount || 1
  const wPos = y.length / (2 * posCount)
  const wNeg = y.length / (2 * negCount)

  const lr = 0.1
  const epochs = 400
  const l2 = 0.01
  for (let e = 0; e < epochs; e++) {
    const gw = new Array(d).fill(0)
    let gb = 0
    for (let i = 0; i < X.length; i++) {
      const z = X[i].reduce((a, xv, j) => a + xv * w[j], b)
      const p = sigmoid(z)
      const cw = y[i] === 1 ? wPos : wNeg
      const err = (p - y[i]) * cw
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j]
      gb += err
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (gw[j] / X.length + l2 * w[j])
    b -= lr * (gb / X.length)
  }

  const predict = (p: Patient): number => {
    const row = norm(toRow(p))
    const z = row.reduce((a, xv, j) => a + xv * w[j], b)
    return sigmoid(z)
  }

  return {
    features,
    weights: w,
    bias: b,
    means,
    sds,
    train: trainSet.map((p) => ({ patient: p, proba: predict(p) })),
    test: testSet.map((p) => ({ patient: p, proba: predict(p) })),
  }
}

export interface ConfusionMatrix {
  tp: number
  fp: number
  fn: number
  tn: number
  se: number
  sp: number
  ppv: number
  npv: number
  accuracy: number
}

export function confusionAt(preds: Prediction[], threshold: number): ConfusionMatrix {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  for (const { patient, proba } of preds) {
    const positive = proba >= threshold
    if (patient.sepsis === 1) {
      if (positive) tp++
      else fn++
    } else if (positive) fp++
    else tn++
  }
  const se = tp + fn > 0 ? tp / (tp + fn) : 0
  const sp = tn + fp > 0 ? tn / (tn + fp) : 0
  const ppv = tp + fp > 0 ? tp / (tp + fp) : 0
  const npv = tn + fn > 0 ? tn / (tn + fn) : 0
  const accuracy = (tp + tn) / (tp + fp + fn + tn || 1)
  return { tp, fp, fn, tn, se, sp, ppv, npv, accuracy }
}

export interface RocResult {
  fpr: number[]
  tpr: number[]
  auc: number
}

export function rocCurve(preds: Prediction[]): RocResult {
  const sorted = [...preds].sort((a, b) => b.proba - a.proba)
  const P = sorted.filter((p) => p.patient.sepsis === 1).length || 1
  const N = sorted.length - P || 1
  const fpr = [0]
  const tpr = [0]
  let tp = 0
  let fp = 0
  for (const { patient } of sorted) {
    if (patient.sepsis === 1) tp++
    else fp++
    fpr.push(fp / N)
    tpr.push(tp / P)
  }
  let auc = 0
  for (let i = 1; i < fpr.length; i++) {
    auc += (fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1]) / 2
  }
  return { fpr, tpr, auc }
}

// ---------- Data-leakage demonstration ----------
//
// A high-capacity model (k-nearest-neighbours) can *memorise* individual patients.
// We expand each patient into several noisy "hourly" rows (as in the real time-series
// data) and compare two ways of splitting train/test:
//   - by patient  → honest, no leakage
//   - by row       → the same patient lands in both sets → the model "recognises" it
// The row split produces a spectacular, but fake, AUC — exactly the trap behind many
// published "AUC 0.98" sepsis models.

const LEAK_FEATURES: FeatureKey[] = [
  'hr', 'sbp', 'temp', 'resp', 'o2sat', 'lactate', 'wbc', 'creatinine', 'platelets',
]
const ROWS_PER_PATIENT = 8

interface LeakRow {
  x: number[]
  y: number
  pid: number
}

function buildHourlyRows(seed: number): LeakRow[] {
  const rng = seededRandom(seed)
  const rows: LeakRow[] = []
  for (const p of COHORT) {
    for (let k = 0; k < ROWS_PER_PATIENT; k++) {
      const x = LEAK_FEATURES.map((f) => {
        const base = p[f] ?? MEDIANS[f as keyof typeof MEDIANS]
        return base * (1 + (rng() - 0.5) * 0.05)
      })
      rows.push({ x, y: p.sepsis, pid: p.id })
    }
  }
  return rows
}

function knnPredictor(train: LeakRow[], K = 5): (x: number[]) => number {
  const d = train[0].x.length
  const means = new Array(d).fill(0)
  const sds = new Array(d).fill(0)
  for (const t of train) for (let j = 0; j < d; j++) means[j] += t.x[j]
  for (let j = 0; j < d; j++) means[j] /= train.length
  for (const t of train) for (let j = 0; j < d; j++) sds[j] += (t.x[j] - means[j]) ** 2
  for (let j = 0; j < d; j++) sds[j] = Math.sqrt(sds[j] / train.length) || 1
  const norm = (x: number[]) => x.map((v, j) => (v - means[j]) / sds[j])
  const TR = train.map((t) => ({ z: norm(t.x), y: t.y }))
  return (x: number[]) => {
    const z = norm(x)
    const dist = TR.map((t) => ({
      d: t.z.reduce((a, zv, j) => a + (zv - z[j]) ** 2, 0),
      y: t.y,
    }))
    dist.sort((a, b) => a.d - b.d)
    let s = 0
    for (let i = 0; i < K; i++) s += dist[i].y
    return s / K
  }
}

function aucFromScores(scores: { p: number; y: number }[]): number {
  const s = [...scores].sort((a, b) => b.p - a.p)
  const P = s.filter((e) => e.y === 1).length || 1
  const N = s.length - P || 1
  let tp = 0
  let fp = 0
  let auc = 0
  let pf = 0
  let pt = 0
  for (const e of s) {
    if (e.y === 1) tp++
    else fp++
    const f = fp / N
    const t = tp / P
    auc += (f - pf) * (t + pt) / 2
    pf = f
    pt = t
  }
  return auc
}

export function leakageDemo(seed = 7): { rowSplitAuc: number; patientSplitAuc: number } {
  const rows = buildHourlyRows(seed)

  const shuffle = seededRandom(1)
  const sh = [...rows]
  for (let i = sh.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1))
    ;[sh[i], sh[j]] = [sh[j], sh[i]]
  }
  const cut = Math.round(sh.length * 0.7)
  const rowModel = knnPredictor(sh.slice(0, cut))
  const rowSplitAuc = aucFromScores(sh.slice(cut).map((t) => ({ p: rowModel(t.x), y: t.y })))

  const pids = [...new Set(rows.map((r) => r.pid))]
  const shuffleP = seededRandom(1)
  for (let i = pids.length - 1; i > 0; i--) {
    const j = Math.floor(shuffleP() * (i + 1))
    ;[pids[i], pids[j]] = [pids[j], pids[i]]
  }
  const trainPids = new Set(pids.slice(0, Math.round(pids.length * 0.7)))
  const patModel = knnPredictor(rows.filter((r) => trainPids.has(r.pid)))
  const patientSplitAuc = aucFromScores(
    rows.filter((r) => !trainPids.has(r.pid)).map((t) => ({ p: patModel(t.x), y: t.y })),
  )

  return { rowSplitAuc, patientSplitAuc }
}

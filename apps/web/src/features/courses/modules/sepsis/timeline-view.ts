/**
 * La fenêtre temporelle d'une chronologie, et les gestes qui la déplacent.
 *
 * Rien ici ne touche au DOM : ces fonctions sont du calcul pur, testable.
 * Adapté de Linkr (widget « Chronologie »), simplifié pour un dossier
 * pédagogique — pas de synchronisation entre widgets, pas de multi-unités.
 */

export interface TimeWindow {
  lo: number
  hi: number
}

/** Largeur de la colonne des libellés, à gauche du tracé. */
export const GUTTER = 116
export const PAD_R = 12

/** Plus petite fenêtre atteignable : une minute. En deçà, les libellés d'axe
 *  se confondent tous sur le même instant. */
export const MIN_SPAN_MS = 60_000

/** Ramène une fenêtre dans les bornes du séjour, en conservant sa largeur. */
export function clampWindow(view: TimeWindow, bounds: TimeWindow): TimeWindow {
  const fullSpan = bounds.hi - bounds.lo
  const span = Math.min(Math.max(view.hi - view.lo, MIN_SPAN_MS), fullSpan || MIN_SPAN_MS)
  // On fait glisser plutôt qu'écraser : une fenêtre poussée au-delà d'un bord
  // garde sa largeur et vient buter contre lui — le geste d'une carte qu'on
  // déplace.
  let lo = view.lo
  if (lo < bounds.lo) lo = bounds.lo
  if (lo + span > bounds.hi) lo = bounds.hi - span
  return { lo, hi: lo + span }
}

/**
 * Zoom autour d'un point fixe — le curseur, pour que l'instant sous lui ne
 * bouge pas. `factor` < 1 zoome ; `at` est la position du curseur en fraction
 * 0..1 de la largeur du tracé.
 */
export function zoomWindow(
  view: TimeWindow,
  bounds: TimeWindow,
  factor: number,
  at: number,
): TimeWindow {
  const span = view.hi - view.lo
  const focus = view.lo + span * Math.min(1, Math.max(0, at))
  const nextSpan = Math.min(
    Math.max(span * factor, MIN_SPAN_MS),
    bounds.hi - bounds.lo || MIN_SPAN_MS,
  )
  const lo = focus - (focus - view.lo) * (nextSpan / span)
  return clampWindow({ lo, hi: lo + nextSpan }, bounds)
}

/** Déplacement minimal, en pixels, qui compte comme une sélection délibérée. */
export const MIN_DRAG_PX = 3

/**
 * La fenêtre qu'une sélection au lasso sur le TRACÉ vient cadrer.
 *
 * Retourne null pour un geste trop court : un simple clic laisse alors la vue
 * tranquille, au lieu de zoomer sur une largeur nulle.
 */
export function windowFromPlotDrag(
  x0: number,
  x1: number,
  plotL: number,
  plotW: number,
  view: TimeWindow,
  bounds: TimeWindow,
): TimeWindow | null {
  if (plotW <= 0) return null
  const a = Math.min(x0, x1)
  const b = Math.max(x0, x1)
  if (b - a < MIN_DRAG_PX) return null
  // Le tracé montre la fenêtre COURANTE : la sélection se lit donc contre
  // `view`, ce qui permet de zoomer plusieurs fois de suite.
  const span = view.hi - view.lo
  const lo = view.lo + ((a - plotL) / plotW) * span
  const hi = view.lo + ((b - plotL) / plotW) * span
  return clampWindow({ lo, hi }, bounds)
}

/** Géométrie de la bande de navigation, telle que le peintre l'a posée. */
export interface RangeGeom {
  x0: number
  x1: number
  y0: number
  y1: number
  /** Bords de la fenêtre visible, à l'intérieur de la bande. */
  win: { x0: number; x1: number }
}

/**
 * Ce que le curseur survole dans la bande de navigation.
 *
 * `lo`/`hi` sont les poignées, qui redimensionnent ; `move` est le corps de la
 * fenêtre, qui la déplace entière ; `jump` est la bande en dehors, qui la
 * recentre. Null : le curseur n'est pas sur la bande.
 */
export type RangeHit = 'lo' | 'hi' | 'move' | 'jump' | null

/** Demi-largeur de la zone de saisie d'une poignée : dessinée 3 px, attrapable ici. */
const EDGE_GRAB_PX = 5

export function hitRange(r: RangeGeom | null, px: number, py: number): RangeHit {
  if (!r) return null
  // Quelques pixels de marge de part et d'autre, pour que la fenêtre reste
  // saisissable quand elle est collée au bord de la bande.
  if (py < r.y0 || py > r.y1 || px < r.x0 - 6 || px > r.x1 + 6) return null
  if (Math.abs(px - r.win.x0) <= EDGE_GRAB_PX) return 'lo'
  if (Math.abs(px - r.win.x1) <= EDGE_GRAB_PX) return 'hi'
  if (px > r.win.x0 && px < r.win.x1) return 'move'
  return 'jump'
}

/** L'instant que désigne une position sur la bande. */
function timeOnStrip(r: RangeGeom, px: number, bounds: TimeWindow): number {
  const frac = Math.min(1, Math.max(0, (px - r.x0) / (r.x1 - r.x0 || 1)))
  return bounds.lo + frac * (bounds.hi - bounds.lo)
}

/**
 * La fenêtre produite en tirant sur la bande de navigation.
 *
 * `grab` mémorise où, dans la fenêtre, la souris l'a saisie : sans lui, une
 * fenêtre déplacée collerait son bord gauche au curseur d'un coup.
 */
export function windowFromRangeGrab(
  mode: Exclude<RangeHit, null | 'jump'>,
  r: RangeGeom,
  px: number,
  grab: number,
  view: TimeWindow,
  bounds: TimeWindow,
): TimeWindow {
  if (mode === 'move') {
    const span = view.hi - view.lo
    const lo = timeOnStrip(r, px - grab, bounds)
    return clampWindow({ lo, hi: lo + span }, bounds)
  }
  if (mode === 'lo') {
    const lo = Math.min(timeOnStrip(r, px, bounds), view.hi - MIN_SPAN_MS)
    return clampWindow({ lo: Math.max(lo, bounds.lo), hi: view.hi }, bounds)
  }
  const hi = Math.max(timeOnStrip(r, px, bounds), view.lo + MIN_SPAN_MS)
  return clampWindow({ lo: view.lo, hi: Math.min(hi, bounds.hi) }, bounds)
}

/** Après un clic sur la bande hors de la fenêtre : même largeur, recentrée. */
export function windowFromRangeJump(
  r: RangeGeom,
  px: number,
  view: TimeWindow,
  bounds: TimeWindow,
): TimeWindow {
  const span = view.hi - view.lo
  const centre = timeOnStrip(r, px, bounds)
  return clampWindow({ lo: centre - span / 2, hi: centre + span / 2 }, bounds)
}

/** La fenêtre couvre-t-elle tout le séjour ? (masque le bouton « tout voir ») */
export function isFullWindow(view: TimeWindow, bounds: TimeWindow): boolean {
  return view.lo <= bounds.lo && view.hi >= bounds.hi
}

/**
 * Instants des graduations : on prend le plus grand pas de l'échelle qui
 * laisse encore assez de repères, pour que l'axe tombe sur des heures rondes
 * plutôt que sur des fractions arbitraires de la fenêtre.
 */
const TICK_STEPS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  3600_000,
  2 * 3600_000,
  3 * 3600_000,
  6 * 3600_000,
  12 * 3600_000,
  86_400_000,
]

export function axisTicks(view: TimeWindow, target: number): number[] {
  const span = view.hi - view.lo
  if (!(span > 0) || target < 1) return []
  const ideal = span / target
  const step = TICK_STEPS.find((s) => s >= ideal) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const ticks: number[] = []
  for (let t = Math.ceil(view.lo / step) * step; t <= view.hi; t += step) ticks.push(t)
  return ticks
}

/**
 * Libellé d'une graduation, exprimé en heures depuis l'admission.
 *
 * Le dossier est simulé : afficher une date réelle donnerait à ces données une
 * apparence d'authenticité qu'elles n'ont pas. « H+6 » dit ce qui compte
 * vraiment ici — le temps écoulé depuis l'entrée en réanimation.
 */
export function formatAxisTick(ms: number, admissionMs: number): string {
  const h = (ms - admissionMs) / 3600_000
  if (Math.abs(h - Math.round(h)) < 0.01) return `H+${Math.round(h)}`
  return `H+${h.toFixed(1)}`
}

/** Un instant, en heures depuis l'admission, pour une infobulle. */
export function formatStamp(ms: number, admissionMs: number): string {
  const h = (ms - admissionMs) / 3600_000
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `H+${hh}h${String(mm).padStart(2, '0')}`
}

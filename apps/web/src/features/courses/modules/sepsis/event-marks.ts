/**
 * Le dessin sur canvas, partagé par la chronologie du dossier patient.
 *
 * Trois formes suffisent à un dossier clinique : un trait pour une mesure
 * répétée, un bloc pour ce qui dure (une perfusion, une ventilation), un point
 * pour le reste. La forme suit la DONNÉE, jamais la ligne où elle est rangée.
 *
 * Adapté de Linkr (widgets « Chronologie » et « Vue d'ensemble »).
 */

/** Un événement sur une ligne. */
export interface TimelineEvent {
  start: number
  /** Fin, pour ce qui dure ; null pour un instant. */
  end: number | null
  value: number | null
  text: string | null
}

/** Une boîte cliquable sur le canvas, pour que le curseur sache nommer ce qu'il survole. */
export interface Mark {
  x0: number
  x1: number
  y0: number
  y1: number
  event: TimelineEvent
  /** Événements dessinés au même endroit, quand la marque en représente plusieurs. */
  merged?: TimelineEvent[]
}

export type EventShape = 'blocks' | 'line' | 'dots'

/**
 * La forme que prend une série.
 *
 * Une durée donne un bloc, une série numérique assez fournie pour être reliée
 * donne un trait, tout le reste donne des points.
 */
export function eventShape(events: TimelineEvent[]): EventShape {
  if (events.some((e) => e.end != null)) return 'blocks'
  const numeric = events.filter((e) => e.value != null).length
  return numeric >= 2 ? 'line' : 'dots'
}

/** Éclaircit une couleur hex vers le blanc : `t` à 1 la garde, à 0 la blanchit. */
export function shade(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const k = Math.min(1, Math.max(0, t))
  return `rgb(${Math.round(255 - (255 - r) * k)},${Math.round(255 - (255 - g) * k)},${Math.round(255 - (255 - b) * k)})`
}

export interface DrawRowOptions {
  ctx: CanvasRenderingContext2D
  events: TimelineEvent[]
  y: number
  rowH: number
  plotL: number
  plotW: number
  /** Convertit un instant en abscisse canvas. */
  x: (ms: number) => number
  colour: string
  /**
   * Bornes verticales imposées, pour qu'un trait garde la même échelle quelle
   * que soit la fenêtre. Sans cela, zoomer sur une portion plate ferait bondir
   * la courbe : l'échelle se recalculerait sur les seuls points visibles, et le
   * bruit prendrait toute la hauteur de la ligne.
   */
  range?: [number, number] | null
  /** Instants à souligner (les valeurs manquantes, par exemple). */
  markMissing?: boolean
}

/**
 * Dessine une ligne d'événements et retourne leurs boîtes cliquables.
 */
export function drawEventRow({
  ctx,
  events,
  y,
  rowH,
  plotL,
  plotW,
  x,
  colour,
  range,
}: DrawRowOptions): Mark[] {
  const marks: Mark[] = []
  const mid = y + rowH / 2
  const plotR = plotL + plotW
  const shape = eventShape(events)
  const nums = events.filter((e) => e.value != null)

  if (shape === 'blocks') {
    const barH = Math.max(5, Math.min(rowH - 7, 14))
    const barY = y + (rowH - barH) / 2
    ctx.fillStyle = shade(colour, 0.75)
    for (const e of events) {
      const a = x(e.start)
      const b = e.end != null ? x(e.end) : a
      const w = Math.max(3, b - a)
      ctx.fillRect(a, barY, w, barH)
      marks.push({
        x0: Math.max(plotL, a),
        x1: Math.min(plotR, a + w),
        y0: barY,
        y1: barY + barH,
        event: e,
      })
    }
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    for (const m of marks) {
      if (m.x1 - m.x0 > 4) ctx.strokeRect(m.x0 + 0.5, m.y0 + 0.5, m.x1 - m.x0 - 1, m.y1 - m.y0 - 1)
    }
    return marks
  }

  if (shape === 'line') {
    let vLo: number
    let vHi: number
    if (range) {
      ;[vLo, vHi] = range
    } else {
      vLo = Infinity
      vHi = -Infinity
      for (const e of nums) {
        const v = e.value as number
        if (v < vLo) vLo = v
        if (v > vHi) vHi = v
      }
    }
    const flat = !(vHi > vLo)
    const pad = 4
    const yFor = (v: number) =>
      flat ? mid : y + rowH - pad - ((v - vLo) / (vHi - vLo)) * (rowH - 2 * pad)

    ctx.strokeStyle = shade(colour, 0.55)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    nums.forEach((e, i) => {
      const px = x(e.start)
      const py = yFor(e.value as number)
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    })
    ctx.stroke()

    // Des points seulement là où on peut les distinguer. Le critère est la
    // distance au point précédent DESSINÉ, pas l'espacement moyen de la ligne :
    // les mesures se groupent, et une moyenne prise sur une longue plage calme
    // masquerait tous les points de la plage dense.
    const r = rowH >= 26 ? 2.5 : 2
    ctx.fillStyle = shade(colour, 1)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    let lastPx = -Infinity
    for (const e of nums) {
      const px = x(e.start)
      if (px - lastPx < 2 * r + 1) continue
      lastPx = px
      ctx.beginPath()
      ctx.arc(px, yFor(e.value as number), r, 0, Math.PI * 2)
      ctx.fill()
      // Un liseré blanc, sans quoi un point posé sur son propre trait disparaît.
      ctx.stroke()
    }
    // Les boîtes existent que le point ait été dessiné ou non : la valeur reste
    // lisible, et c'est le trait que le curseur vise.
    for (const e of nums) {
      const px = x(e.start)
      const py = yFor(e.value as number)
      marks.push({ x0: px - 4, x1: px + 4, y0: py - 5, y1: py + 5, event: e })
    }
    return marks
  }

  const r = Math.max(2.5, Math.min(4, (rowH - 8) / 3))
  ctx.fillStyle = shade(colour, 0.85)
  // Des points plus proches que leur diamètre se recouvrent : ils deviennent
  // une seule marque qui porte tous les événements dessous, sinon l'infobulle
  // annoncerait celui qui se trouvait en dernier dans le tableau.
  const MAX_MARK_W = 6 * r
  let last: Mark | null = null
  for (const e of events) {
    const px = x(e.start)
    if (last && px - last.x1 <= 0 && px + r + 2 - last.x0 <= MAX_MARK_W) {
      last.x1 = px + r + 2
      last.merged?.push(e)
      continue
    }
    ctx.beginPath()
    ctx.arc(px, mid, r, 0, Math.PI * 2)
    ctx.fill()
    last = {
      x0: px - r - 2,
      x1: px + r + 2,
      y0: mid - r - 2,
      y1: mid + r + 2,
      event: e,
      merged: [e],
    }
    marks.push(last)
  }
  return marks
}

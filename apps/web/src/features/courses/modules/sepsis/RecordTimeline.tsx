import { useCallback, useEffect, useRef, useState } from 'react'
import { drawEventRow, type Mark, type TimelineEvent } from './event-marks'
import {
  axisTicks,
  formatAxisTick,
  formatStamp,
  hitRange,
  isFullWindow,
  windowFromPlotDrag,
  windowFromRangeGrab,
  windowFromRangeJump,
  zoomWindow,
  GUTTER,
  MIN_DRAG_PX,
  PAD_R,
  type RangeGeom,
  type RangeHit,
  type TimeWindow,
} from './timeline-view'
import { useLang, pick } from '@/lib/useLang'

/** Une ligne de la chronologie. */
export interface TimelineRow {
  label: string
  unit?: string
  colour: string
  events: TimelineEvent[]
  range?: [number, number] | null
}

/**
 * Un instant remarquable du séjour, tracé en travers de toutes les lignes.
 *
 * Sert à situer un événement par rapport aux mesures — le moment où
 * l'étiquette « sepsis » bascule, par exemple. Une barre verticale est la
 * seule façon de montrer qu'un événement est simultané de TOUS les paramètres
 * à la fois, ce qu'une marque posée sur une seule ligne ne dirait pas.
 */
export interface TimelineMarker {
  at: number
  label: string
  colour: string
}

interface RecordTimelineProps {
  rows: TimelineRow[]
  /** Étendue totale du séjour ; la vue ne peut jamais en sortir. */
  bounds: TimeWindow
  /** Instant de l'admission, origine des libellés « H+n ». */
  admissionMs: number
  /** Instants remarquables, tracés en travers du graphique. */
  markers?: TimelineMarker[]
  className?: string
}

const AXIS_H = 18
const RANGE_H = 32
const ROW_MIN = 26

/** L'aspect du curseur au-dessus de chaque partie du graphique. */
const CURSORS: Record<string, string> = {
  lo: 'ew-resize',
  hi: 'ew-resize',
  move: 'grab',
  jump: 'pointer',
  plot: 'crosshair',
}

/**
 * La chronologie d'un dossier patient : une ligne par paramètre, dessinée avec
 * la forme que réclame la donnée — un trait pour un paramètre relevé toutes
 * les heures, un bloc pour une perfusion qui dure.
 *
 * Reprise du widget « Chronologie » de Linkr, allégée : ici le zoom, le
 * déplacement et la bande de navigation sont maison, comme là-bas, mais sans la
 * synchronisation inter-widgets ni la gestion multi-unités dont le TD n'a pas
 * besoin.
 */
export function RecordTimeline({
  rows,
  bounds,
  admissionMs,
  markers,
  className,
}: RecordTimelineProps) {
  const lang = useLang()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<TimeWindow>(bounds)
  // Changer de patient recadre la vue : la fenêtre du dossier précédent n'a
  // aucun sens sur le suivant. Ajusté pendant le rendu plutôt que dans un
  // effet — React réexécute alors le composant immédiatement, sans laisser
  // s'afficher une image cadrée sur l'ancien séjour.
  const [seenBounds, setSeenBounds] = useState(bounds)
  if (seenBounds !== bounds) {
    setSeenBounds(bounds)
    setView(bounds)
  }
  const marksRef = useRef<{ row: number; marks: Mark[] }[]>([])
  const rangeRef = useRef<RangeGeom | null>(null)
  const [hover, setHover] = useState<{
    x: number
    y: number
    title: string
    value: string | null
    lines: string[]
  } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const w = Math.round(r.width)
      const h = Math.round(r.height)
      // Un onglet masqué mesure 0 : garder la dernière taille réelle évite un
      // repeint à zéro puis un autre au retour.
      if (w === 0 || h === 0) return
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const plotL = GUTTER
  const plotW = Math.max(40, size.w - GUTTER - PAD_R)
  const chartH = Math.max(ROW_MIN, size.h - AXIS_H - RANGE_H)
  const rowH = rows.length > 0 ? Math.max(ROW_MIN, chartH / rows.length) : ROW_MIN

  const xFor = useCallback(
    (ms: number) => plotL + ((ms - view.lo) / (view.hi - view.lo || 1)) * plotW,
    [plotL, plotW, view],
  )

  // Le rendu. Tout est redessiné à chaque fois : les lignes sont peu nombreuses
  // et les marques doivent de toute façon être reconstruites pour le survol.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)

    const dark = document.documentElement.classList.contains('dark')
    const gridColour = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
    const textColour = dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
    const mutedColour = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'

    // Graduations, dessinées derrière les lignes.
    const ticks = axisTicks(view, Math.max(2, Math.floor(plotW / 80)))
    ctx.font = '10px Inter, system-ui'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    for (const tick of ticks) {
      const x = xFor(tick)
      ctx.strokeStyle = gridColour
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(x) + 0.5, 0)
      ctx.lineTo(Math.round(x) + 0.5, chartH)
      ctx.stroke()
      ctx.fillStyle = textColour
      ctx.fillText(formatAxisTick(tick, admissionMs), x, chartH + AXIS_H / 2)
    }

    // Les instants remarquables, tracés AVANT les courbes : une barre pleine
    // par-dessus masquerait les points qu'elle sert justement à situer.
    for (const m of markers ?? []) {
      if (m.at < view.lo || m.at > view.hi) continue
      const x = Math.round(xFor(m.at)) + 0.5
      ctx.save()
      ctx.strokeStyle = m.colour
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 3])
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, chartH)
      ctx.stroke()
      ctx.restore()

      // Le libellé se range du côté où il y a la place, pour ne pas sortir du
      // cadre quand la barre tombe près du bord droit.
      const right = x < plotL + plotW - 70
      ctx.fillStyle = m.colour
      ctx.font = '600 10px Inter, system-ui'
      ctx.textAlign = right ? 'left' : 'right'
      ctx.textBaseline = 'top'
      ctx.fillText(m.label, x + (right ? 4 : -4), 2)
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
    }

    // Les lignes : libellé dans la gouttière, marques dans le tracé.
    const nextMarks: { row: number; marks: Mark[] }[] = []
    rows.forEach((row, i) => {
      const y = i * rowH
      ctx.textAlign = 'left'
      ctx.font = '11px Inter, system-ui'
      const empty = row.events.length === 0
      ctx.fillStyle = empty ? mutedColour : textColour
      let label = row.label
      while (label.length > 1 && ctx.measureText(`${label}…`).width > GUTTER - 16) {
        label = label.slice(0, -1)
      }
      if (label !== row.label) label += '…'
      ctx.fillText(label, 6, y + rowH / 2)

      // Une pastille rattache la ligne à sa couleur.
      ctx.fillStyle = empty ? mutedColour : row.colour
      ctx.fillRect(GUTTER - 7, y + rowH / 2 - 4, 3, 8)

      // Une ligne sans aucune mesure ne doit pas passer pour une ligne plate à
      // zéro : on écrit ce qui s'est passé, à savoir rien.
      if (empty) {
        ctx.textAlign = 'left'
        ctx.font = 'italic 10px Inter, system-ui'
        ctx.fillStyle = mutedColour
        ctx.fillText(pick(lang, 'jamais mesuré', 'never measured'), plotL + 8, y + rowH / 2)
        nextMarks.push({ row: i, marks: [] })
        return
      }

      ctx.save()
      ctx.beginPath()
      ctx.rect(plotL, y, plotW, rowH)
      ctx.clip()
      const inView = row.events.filter(
        (e) => (e.end ?? e.start) >= view.lo && e.start <= view.hi,
      )
      const marks = drawEventRow({
        ctx,
        events: inView,
        y,
        rowH,
        plotL,
        plotW,
        x: xFor,
        colour: row.colour,
        range: row.range,
      })
      ctx.restore()
      nextMarks.push({ row: i, marks })
    })
    marksRef.current = nextMarks

    // La bande de navigation : un histogramme de densité de tout le séjour, pour
    // qu'on voie OÙ sont les données — un cadre vide ne donnerait rien à viser —
    // puis la fenêtre visible, teintée, avec une poignée à chaque bord.
    const ry = size.h - RANGE_H + 6
    const rh = RANGE_H - 12
    const full = bounds.hi - bounds.lo || 1
    ctx.fillStyle = 'rgba(148,163,184,0.10)'
    ctx.fillRect(plotL, ry, plotW, rh)
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'
    ctx.lineWidth = 1
    ctx.strokeRect(plotL + 0.5, ry + 0.5, plotW - 1, rh - 1)

    const buckets = Math.max(1, Math.floor(plotW / 3))
    const counts = new Array<number>(buckets).fill(0)
    for (const row of rows) {
      for (const e of row.events) {
        const b = Math.min(
          buckets - 1,
          Math.max(0, Math.floor(((e.start - bounds.lo) / full) * buckets)),
        )
        counts[b]++
      }
    }
    const maxCount = counts.reduce((m, n) => (n > m ? n : m), 0)
    if (maxCount > 0) {
      const bw = plotW / buckets
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.25)' : '#cbd5e1'
      for (let b = 0; b < buckets; b++) {
        const n = counts[b]
        if (!n) continue
        // Racine carrée, pas linéaire : une heure très chargée écraserait sinon
        // tout le reste du séjour à plat.
        const bh = Math.max(1, (rh - 4) * Math.sqrt(n / maxCount))
        ctx.fillRect(plotL + b * bw, ry + rh - 2 - bh, Math.max(1, bw), bh)
      }
    }

    const wx0 = plotL + ((view.lo - bounds.lo) / full) * plotW
    const wx1 = plotL + ((view.hi - bounds.lo) / full) * plotW
    ctx.fillStyle = 'rgba(15,23,42,.10)'
    ctx.fillRect(plotL, ry, Math.max(0, wx0 - plotL), rh)
    ctx.fillRect(Math.min(wx1, plotL + plotW), ry, Math.max(0, plotL + plotW - wx1), rh)
    ctx.fillStyle = 'rgba(37,99,235,.08)'
    ctx.fillRect(wx0, ry, Math.max(1, wx1 - wx0), rh)
    ctx.strokeStyle = '#2563eb'
    ctx.strokeRect(wx0 + 0.5, ry + 0.5, Math.max(1, wx1 - wx0) - 1, rh - 1)
    ctx.fillStyle = '#2563eb'
    for (const hx of [wx0, wx1]) ctx.fillRect(hx - 1.5, ry + rh / 2 - 6, 3, 12)

    // Le survol interroge ce qui a RÉELLEMENT été peint : les zones de saisie ne
    // peuvent donc jamais s'écarter des poignées que l'utilisateur vise.
    rangeRef.current = {
      x0: plotL,
      x1: plotL + plotW,
      y0: ry,
      y1: ry + rh,
      win: { x0: wx0, x1: wx1 },
    }
  }, [rows, size, view, bounds, rowH, chartH, plotL, plotW, xFor, admissionMs, markers, lang])

  // --- Gestes ---------------------------------------------------------------

  const dragRef = useRef<
    | { kind: 'select'; x0: number; x1: number }
    | { kind: 'range'; mode: 'move' | 'lo' | 'hi'; grab: number }
    | null
  >(null)
  /** Ce que survole le curseur, recopié dans l'état uniquement pour le dessiner. */
  const [cursor, setCursor] = useState<RangeHit>(null)
  const [band, setBand] = useState<{ x0: number; x1: number } | null>(null)

  const localPoint = (e: React.PointerEvent | React.WheelEvent | React.MouseEvent) => {
    const r = canvasRef.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (bounds.hi <= bounds.lo) return
      const { x } = localPoint(e)
      const at = (x - plotL) / plotW
      // Un pavé tactile émet beaucoup de petits deltas : un pas fixe par
      // événement ferait fuir le zoom. On suit le delta, mais plafonné.
      const factor = Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY * 0.002)))
      setView((v) => zoomWindow(v, bounds, factor, at))
    },
    [bounds, plotL, plotW],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = localPoint(e)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      const r = rangeRef.current
      const hit = hitRange(r, x, y)
      if (hit && r) {
        // Cliquer la bande à côté de la fenêtre la recentre là, puis continue de
        // la déplacer : un clic qui tombe légèrement à côté finit quand même où
        // l'on voulait, sans avoir à relâcher.
        if (hit === 'jump') {
          setView((v) => windowFromRangeJump(r, x, v, bounds))
          dragRef.current = { kind: 'range', mode: 'move', grab: (r.win.x1 - r.win.x0) / 2 }
        } else {
          dragRef.current = { kind: 'range', mode: hit, grab: x - r.win.x0 }
        }
        setCursor(hit === 'jump' ? 'move' : hit)
        return
      }
      // Sur le tracé, et seulement là, un cliquer-glisser encadre une plage.
      if (y <= chartH && x >= plotL) {
        dragRef.current = { kind: 'select', x0: x, x1: x }
        setBand({ x0: x, x1: x })
        setHover(null)
      }
    },
    [bounds, chartH, plotL],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = localPoint(e)
      const drag = dragRef.current

      if (drag?.kind === 'select') {
        // Maintenu dans le tracé : glisser au-delà du bord étend la sélection
        // jusqu'à lui, plutôt que de peindre la bande sur la gouttière.
        drag.x1 = Math.max(plotL, Math.min(plotL + plotW, x))
        setBand({ x0: drag.x0, x1: drag.x1 })
        return
      }
      if (drag?.kind === 'range' && rangeRef.current) {
        const r = rangeRef.current
        const mode = drag.mode
        const grab = drag.grab
        setView((v) => windowFromRangeGrab(mode, r, x, grab, v, bounds))
        return
      }

      // Sur la bande, le curseur annonce ce qu'il peut faire.
      const overRange = hitRange(rangeRef.current, x, y)
      if (overRange) {
        setCursor(overRange)
        setHover(null)
        return
      }
      setCursor(null)

      // Survol : nommer la marque sous le curseur.
      const rowIndex = Math.floor(y / rowH)
      const entry = marksRef.current.find((m) => m.row === rowIndex)
      const row = rows[rowIndex]
      if (!entry || !row || y > chartH) {
        setHover(null)
        return
      }
      let best: Mark | null = null
      let bestD = Infinity
      for (const m of entry.marks) {
        const d = x < m.x0 ? m.x0 - x : x > m.x1 ? x - m.x1 : 0
        if (d < bestD) {
          bestD = d
          best = m
        }
      }
      if (!best || bestD > 6) {
        setHover(null)
        return
      }
      const ev = best.event
      const value =
        ev.value != null
          ? `${ev.value}${row.unit ? ` ${row.unit}` : ''}`
          : (ev.text ?? null)
      const lines: string[] = []
      lines.push(
        ev.end != null
          ? `${formatStamp(ev.start, admissionMs)} → ${formatStamp(ev.end, admissionMs)}`
          : formatStamp(ev.start, admissionMs),
      )
      if (ev.value != null && ev.text) lines.push(ev.text)
      setHover({ x, y, title: row.label, value, lines })
    },
    [bounds, rowH, chartH, plotL, plotW, rows, admissionMs],
  )

  /** Double-clic sur le tracé : retour à tout le séjour. */
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = localPoint(e)
      // Pas depuis la bande : un double-clic y est deux saisies, et réinitialiser
      // sous la seconde contrarierait le geste en cours.
      if (y > chartH || x < plotL) return
      setView(bounds)
    },
    [chartH, plotL, bounds],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      dragRef.current = null
      setCursor(null)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      if (drag?.kind === 'select') {
        setBand(null)
        // Null pour un clic plutôt qu'un glissé : la vue est alors laissée
        // tranquille, cadrer une largeur nulle viderait le graphique.
        setView((v) => windowFromPlotDrag(drag.x0, drag.x1, plotL, plotW, v, bounds) ?? v)
      }
    },
    [plotL, plotW, bounds],
  )

  const zoomed = !isFullWindow(view, bounds)

  return (
    <div ref={wrapRef} className={`relative h-full w-full ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: CURSORS[cursor ?? 'plot'] }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        onPointerLeave={() => setHover(null)}
      />
      {band && Math.abs(band.x1 - band.x0) >= MIN_DRAG_PX && (
        <div
          className="pointer-events-none absolute top-0 border-x border-blue-500/60 bg-blue-500/15"
          style={{
            left: Math.min(band.x0, band.x1),
            width: Math.abs(band.x1 - band.x0),
            height: chartH,
          }}
        />
      )}
      {zoomed && (
        <button
          onClick={() => setView(bounds)}
          className="absolute top-1 right-2 cursor-pointer rounded bg-[var(--color-card)]/85 px-1.5 py-0.5 text-[10px] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
        >
          {pick(lang, 'Tout le séjour', 'Whole stay')}
        </button>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded border bg-[var(--color-popover)] px-2 py-1 text-[10px] shadow-md"
          style={{
            left: Math.min(hover.x + 12, Math.max(0, size.w - 170)),
            top: Math.max(0, hover.y - 8),
          }}
        >
          <p className="font-medium text-[var(--color-foreground)]">{hover.title}</p>
          {hover.value && (
            <p className="tabular-nums text-[var(--color-foreground)]">{hover.value}</p>
          )}
          {hover.lines.map((line, i) => (
            <p key={i} className="text-[var(--color-muted-foreground)]">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

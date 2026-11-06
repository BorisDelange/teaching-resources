// ============================================================
// Viewer PDF avec surlignage, basé sur react-pdf (pdf.js).
//
// Réutilisé deux fois dans le TD :
//   1. Révélation de la reco : surligner les passages clés (Fig. 6, adaptation rénale).
//   2. RAG : surligner les "chunks" réellement récupérés et injectés dans le prompt.
//
// Le surlignage est piloté par des motifs de texte (Highlight[]). On teinte
// les portions du text-layer de pdf.js dont le contenu contient un motif —
// c'est robuste au reflow et indépendant des coordonnées.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { Button } from '@/components/ui/button'
import { cn, withBase } from '@/lib/utils'
import { pick, useLang } from '@/lib/useLang'

// Worker pdf.js servi localement (compatible Vite, pas de CDN externe → conforme CSP).
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** Zone rectangulaire en coordonnées PDF (origine en bas à gauche, unités points). */
export interface HighlightZone {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface Highlight {
  /** Page (1-indexée) du PDF sur laquelle se trouve le passage. */
  page: number
  /**
   * Phrase (ou passage continu) à surligner par le TEXTE. On surligne les spans du
   * text-layer qui font partie de cette phrase. Comparaison insensible casse/espaces.
   * Utiliser `zone` à la place quand le même texte apparaît plusieurs fois (tableaux).
   */
  text?: string
  /** Zone à surligner par POSITION : tout span dont le centre tombe dedans. */
  zone?: HighlightZone
}

// Surlignage jaune uniquement (comme un surligneur papier).
const HIGHLIGHT_BG = 'rgba(250, 204, 21, 0.5)'

// Un span n'est surligné que s'il est une sous-chaîne d'au moins autant de
// caractères d'un passage-cible : évite de teindre un mot court isolé.
const MIN_SPAN_LEN = 6

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Forme compacte pour chercher un passage dans le text-layer : sans espaces
 * (pdf.js les répartit au hasard entre les spans), sans balises markdown, et
 * avec des apostrophes et guillemets unifiés.
 */
function compact(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[*_#|]/g, '')
    .replace(/\s+/g, '')
}

/**
 * Indices des spans qui composent un passage, cherché comme une SUITE de
 * caractères dans le texte de la page. Chercher chaque span isolément teinte
 * aussi les mêmes mots ailleurs sur la page ; chercher la suite ne surligne
 * que l'endroit où le passage se trouve vraiment. Un passage long peut
 * différer légèrement du PDF : on se rabat alors sur son début, puis sa fin.
 */
function spansOfPassages(items: Array<{ str?: string }>, passages: string[]): Set<number> {
  const ranges: { start: number; end: number }[] = []
  let page = ''
  items.forEach((it) => {
    const c = compact(it.str ?? '')
    ranges.push({ start: page.length, end: page.length + c.length })
    page += c
  })
  const hits = new Set<number>()
  const mark = (from: number, to: number) =>
    ranges.forEach((r, i) => {
      if (r.end > from && r.start < to) hits.add(i)
    })
  for (const p of passages) {
    const q = compact(p)
    if (q.length < MIN_SPAN_LEN) continue
    const tries = [q, q.slice(0, 60), q.slice(0, 30), q.slice(-30)].filter(
      (t) => t.length >= MIN_SPAN_LEN,
    )
    for (const t of tries) {
      let at = page.indexOf(t)
      if (at < 0) continue
      while (at >= 0) {
        mark(at, at + t.length)
        at = page.indexOf(t, at + t.length)
      }
      break
    }
  }
  return hits
}

export function PdfViewer({
  file,
  highlights = [],
  initialPage = 1,
  className,
  /** Hauteur max de la zone de défilement (ex. '70vh'). Ignoré si fill=true. */
  maxHeight = '70vh',
  /** true = la zone PDF remplit toute la hauteur du conteneur parent (flex-1). */
  fill = false,
  /**
   * Incrémenté par le parent pour redemander un saut vers `initialPage`
   * (clic sur « À lire — pages 19-20 »). Un simple changement de page ne
   * suffirait pas : on peut vouloir y revenir alors qu'on y est déjà.
   */
  jumpToken = 0,
  /**
   * Zoom de départ. L'onglet « Recommandations » affiche le PDF à côté de la
   * réponse de référence : à 100 % la page déborde du cadre, alors qu'on veut
   * pouvoir lire les deux en même temps.
   */
  initialZoom = 1,
}: {
  file: string
  highlights?: Highlight[]
  initialPage?: number
  className?: string
  maxHeight?: string
  fill?: boolean
  jumpToken?: number
  initialZoom?: number
}) {
  const lang = useLang()
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(initialPage)
  const [pageInput, setPageInput] = useState(String(initialPage))
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [width, setWidth] = useState(720)
  // Les pages sont dimensionnées par la LARGEUR : en défilement continu,
  // les contraindre à la hauteur du cadre empêcherait de faire défiler.
  const [zoom, setZoom] = useState(initialZoom)
  // Ratio hauteur/largeur du document, relevé sur la première page rendue.
  // Sert à réserver la place des pages non encore rendues, pour que la barre
  // de défilement ait tout de suite la bonne taille.
  const [ratio, setRatio] = useState(1.414) // A4 par défaut
  const ratioSet = useRef(false)

  // react-pdf ne virtualise pas : rendre 43 pages d'un coup ferait autant de
  // canvas + text-layers. On ne rend que les pages proches de la fenêtre.
  const WINDOW = 2
  const pageWidth = width * zoom
  const placeholderHeight = Math.round(pageWidth * ratio)

  /** Fait défiler jusqu'à une page ; le numéro affiché suit via l'observateur. */
  function scrollToPage(n: number) {
    const clamped = numPages > 0 ? Math.min(numPages, Math.max(1, n)) : Math.max(1, n)
    setPage(clamped)
    setPageInput(String(clamped))
    pageRefs.current.get(clamped)?.scrollIntoView({ block: 'start' })
  }

  function goToPage(value: string) {
    const n = parseInt(value, 10)
    if (!Number.isNaN(n)) scrollToPage(n)
    else setPageInput(String(page)) // saisie invalide → on restaure
  }

  // Dimensions de rendu = celles du conteneur. En mode fill on contraint par la
  // hauteur (PDF pleine hauteur sans scroll) ; sinon par la largeur (responsive).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(Math.max(320, el.clientWidth - 24))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Le numéro affiché suit le défilement : on retient la page la plus visible.
  useEffect(() => {
    const root = scrollRef.current
    if (!root || numPages === 0) return
    const ratios = new Map<number, number>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const n = Number((e.target as HTMLElement).dataset.page)
          if (n) ratios.set(n, e.intersectionRatio)
        })
        let best = 0
        let bestRatio = 0
        ratios.forEach((r, n) => {
          if (r > bestRatio) {
            bestRatio = r
            best = n
          }
        })
        if (best > 0) {
          setPage(best)
          setPageInput(String(best))
        }
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    pageRefs.current.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [numPages])

  // Saut initial (et sauts demandés ensuite via jumpToken) une fois les pages
  // montées. Deuxième passe après rendu : les pages proches de la cible
  // remplacent leur réservation par le vrai canvas, ce qui décale la position.
  // Puis, une fois le surlignage posé, on descend jusqu'au passage lui-même :
  // la page seule ne suffit pas quand le passage est en bas de page.
  const markJump = useRef(true)
  useEffect(() => {
    if (numPages === 0) return
    markJump.current = true
    const target = Math.min(numPages, Math.max(1, initialPage))
    // Si le passage a déjà été atteint, ne pas remonter en haut de page.
    const go = () => {
      if (markJump.current) pageRefs.current.get(target)?.scrollIntoView({ block: 'start' })
    }
    go()
    const t = setTimeout(go, 300)
    return () => clearTimeout(t)
  }, [numPages, initialPage, jumpToken])

  function jumpToMark(pageNumber: number) {
    if (!markJump.current || pageNumber !== Math.max(1, initialPage)) return
    const el = pageRefs.current.get(pageNumber)?.querySelector('mark')
    if (!el) return
    markJump.current = false
    el.scrollIntoView({ block: 'center' })
  }

  // Indices des spans qui tombent dans une zone, par page : toutes les pages
  // sont rendues simultanément, chacune a donc ses propres résultats.
  const [zoneHits, setZoneHits] = useState<Map<number, Set<number>>>(new Map())
  const [textHits, setTextHits] = useState<Map<number, Set<number>>>(new Map())

  /** Motifs texte d'une page donnée, normalisés. */
  const textByPage = useMemo(() => {
    const m = new Map<number, string[]>()
    highlights.forEach((h) => {
      if (!h.text) return
      const list = m.get(h.page) ?? []
      list.push(norm(h.text))
      m.set(h.page, list)
    })
    return m
  }, [highlights])

  /** Pages portant au moins un surlignage — alimente la minicarte. */
  const markedPages = useMemo(
    () => new Set(highlights.map((h) => h.page)),
    [highlights],
  )

  const zonesByPage = useMemo(() => {
    const m = new Map<number, HighlightZone[]>()
    highlights.forEach((h) => {
      if (!h.zone) return
      const list = m.get(h.page) ?? []
      list.push(h.zone)
      m.set(h.page, list)
    })
    return m
  }, [highlights])

  function handleTextContent(
    pageNumber: number,
    tc: { items: Array<{ str?: string; transform?: number[]; width?: number; height?: number }> },
  ) {
    const passages = textByPage.get(pageNumber)
    if (passages?.length) {
      const found = spansOfPassages(tc.items, passages)
      setTextHits((prev) => {
        const next = new Map(prev)
        next.set(pageNumber, found)
        return next
      })
    }
    const pageZones = zonesByPage.get(pageNumber)
    if (!pageZones?.length) return
    const hits = new Set<number>()
    tc.items.forEach((it, idx) => {
      const tr = it.transform
      if (!tr) return
      const cx = tr[4] + (it.width ?? 0) / 2
      const cy = tr[5] + (it.height ?? 0) / 2
      if (pageZones.some((z) => cx >= z.x0 && cx <= z.x1 && cy >= z.y0 && cy <= z.y1)) {
        hits.add(idx)
      }
    })
    setZoneHits((prev) => {
      const next = new Map(prev)
      next.set(pageNumber, hits)
      return next
    })
  }

  // pdf.js découpe le texte en petits spans. On surligne un span s'il fait
  // partie d'un passage-cible retrouvé dans le texte de la page, ou si son
  // centre tombe dans une zone rectangulaire (cellules de tableau).
  function rendererFor(pageNumber: number) {
    const hits = zoneHits.get(pageNumber) ?? new Set<number>()
    const texts = textHits.get(pageNumber) ?? new Set<number>()
    if (texts.size === 0 && hits.size === 0) return undefined
    return (textItem: { str: string; itemIndex: number }) => {
      const raw = textItem.str
      if (!hits.has(textItem.itemIndex) && !texts.has(textItem.itemIndex)) return raw
      return `<mark style="background:${HIGHLIGHT_BG};color:inherit;border-radius:2px">${raw}</mark>`
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Barre de contrôles : hauteur fixe h-9 → la colonne voisine peut l'aligner. */}
      <div className="mb-2 flex h-9 items-center justify-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="size-7"
          disabled={page <= 1}
          onClick={() => scrollToPage(page - 1)}
          aria-label={pick(lang, 'Page précédente', 'Previous page')}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
          <input
            type="text"
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={(e) => goToPage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            aria-label={pick(lang, 'Numéro de page', 'Page number')}
            className="w-10 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1 py-0.5 text-center text-xs text-[var(--color-foreground)] outline-none focus:border-blue-500"
          />
          <span>/ {numPages || '—'}</span>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="size-7"
          disabled={numPages > 0 && page >= numPages}
          onClick={() => scrollToPage(page + 1)}
          aria-label={pick(lang, 'Page suivante', 'Next page')}
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="ml-2 flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            disabled={zoom <= 0.6}
            onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))}
            aria-label={pick(lang, 'Dézoomer', 'Zoom out')}
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-9 text-center text-xs tabular-nums text-[var(--color-muted-foreground)]">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.2) * 10) / 10))}
            aria-label={pick(lang, 'Zoomer', 'Zoom in')}
          >
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </div>

      {/* Rangée : la zone de défilement, puis la minicarte des surlignages. */}
      <div className={cn('flex min-w-0 gap-1.5', fill && 'min-h-0 flex-1')}>
      <div
        ref={(el) => {
          containerRef.current = el
          scrollRef.current = el
        }}
        className={cn(
          'min-w-0 flex-1 overflow-auto rounded-md border bg-[var(--color-muted)] p-2',
          fill && 'min-h-0',
        )}
        style={fill ? undefined : { maxHeight: maxHeight === 'none' ? undefined : maxHeight }}
      >
        <Document
          file={withBase(file)}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex items-center gap-2 p-8 text-sm text-[var(--color-muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />{' '}
              {pick(lang, 'Chargement du document…', 'Loading document…')}
            </div>
          }
          error={
            <div className="p-8 text-sm text-red-600 dark:text-red-400">
              {pick(lang, 'Impossible de charger le PDF.', 'Unable to load the PDF.')}
            </div>
          }
        >
          <div className="flex flex-col items-center gap-3">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => {
              const near = Math.abs(n - page) <= WINDOW
              return (
                <div
                  key={n}
                  data-page={n}
                  ref={(el) => {
                    if (el) pageRefs.current.set(n, el)
                    else pageRefs.current.delete(n)
                  }}
                  className="scroll-mt-2 bg-white shadow-sm"
                  style={near ? undefined : { width: pageWidth, height: placeholderHeight }}
                >
                  {near && (
                    <Page
                      pageNumber={n}
                      width={pageWidth}
                      customTextRenderer={rendererFor(n)}
                      onGetTextSuccess={(tc) =>
                        handleTextContent(
                          n,
                          tc as unknown as Parameters<typeof handleTextContent>[1],
                        )
                      }
                      onLoadSuccess={(p) => {
                        // Relevé une seule fois : si les pages n'ont pas toutes
                        // le même format, se recaler à chaque page ferait sauter
                        // la hauteur réservée — donc la position de défilement.
                        if (ratioSet.current) return
                        const r = p.height / p.width
                        if (!Number.isFinite(r) || r <= 0) return
                        ratioSet.current = true
                        setRatio(r)
                      }}
                      onRenderTextLayerSuccess={() => jumpToMark(n)}
                      renderAnnotationLayer={false}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </Document>
      </div>

      {/* Minicarte : une graduation par page, jaune là où il y a un
          surlignage. Sans elle, on ne sait pas si le passage cité est seul
          dans le document ou s'il y en a d'autres plus loin. */}
      {numPages > 1 && (
        <div
          className="flex w-3 shrink-0 flex-col gap-px overflow-hidden rounded border bg-[var(--color-muted)] py-1"
          aria-hidden
        >
          {Array.from({ length: numPages }, (_, i) => {
            const n = i + 1
            const marked = markedPages.has(n)
            return (
              <button
                key={n}
                onClick={() => scrollToPage(n)}
                title={`Page ${n}${marked ? pick(lang, ' — passage surligné', ' — highlighted passage') : ''}`}
                className={cn(
                  'w-full flex-1 cursor-pointer transition-colors',
                  marked
                    ? 'bg-amber-400 hover:bg-amber-500'
                    : 'bg-transparent hover:bg-[var(--color-accent)]',
                  // La page courante se repère par un liseré, sans masquer
                  // la couleur du surlignage.
                  n === page && 'outline outline-1 -outline-offset-1 outline-blue-500',
                )}
              />
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

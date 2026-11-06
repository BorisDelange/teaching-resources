// ============================================================
// Visite guidée : un assistant qui présente l'interface, élément par élément.
//
// Chaque élément à présenter est enveloppé dans un `TourTarget`. Quand la
// visite arrive sur lui, il s'entoure d'un liseré bleu et une bulle
// s'ancre à côté (Popover Radix, ouvert par l'état : aucune mesure du DOM
// à la main). Hors d'un `TourProvider`, `TourTarget` ne rend que ses
// enfants : les étapes ordinaires ne voient aucune différence.
//
// Un élément absent de l'écran (colonne repliée, fenêtre étroite) ne
// bloque pas la visite : sa bulle s'affiche alors au centre.
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { pick, type Lang } from '@/lib/useLang'
import { tr, type Localized } from './data'
import { bold } from './chat-format'

export interface TourStepDef {
  /** Identifiant du `TourTarget` à mettre en avant. */
  target: string
  title: Localized
  body: Localized
  side?: 'top' | 'bottom' | 'left' | 'right'
}

interface TourState {
  lang: Lang
  steps: TourStepDef[]
  index: number
  /** La cible mise en avant, ou `null` quand la visite est fermée. */
  activeTarget: string | null
  next: () => void
  prev: () => void
  close: () => void
  register: (id: string) => () => void
}

const TourContext = createContext<TourState | null>(null)

export function TourProvider({
  lang,
  steps,
  open,
  onClose,
  children,
}: {
  lang: Lang
  steps: TourStepDef[]
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const [index, setIndex] = useState(0)
  const [mounted, setMounted] = useState<Record<string, number>>({})

  // Rouvrir la visite la reprend au début.
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setIndex(0)
  }

  const register = useCallback((id: string) => {
    setMounted((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }))
    return () => setMounted((m) => ({ ...m, [id]: (m[id] ?? 1) - 1 }))
  }, [])

  const value = useMemo<TourState>(
    () => ({
      lang,
      steps,
      index,
      activeTarget: open ? (steps[index]?.target ?? null) : null,
      next: () => (index >= steps.length - 1 ? onClose() : setIndex(index + 1)),
      prev: () => setIndex(Math.max(0, index - 1)),
      close: onClose,
      register,
    }),
    [lang, steps, index, open, onClose, register],
  )

  const current = open ? steps[index] : null
  const orphan = current && !mounted[current.target]

  return (
    <TourContext.Provider value={value}>
      {children}
      {orphan && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="pointer-events-auto w-80 rounded-lg bg-black p-4 text-white">
            <TourCard state={value} />
          </div>
        </div>
      )}
    </TourContext.Provider>
  )
}

function TourCard({ state }: { state: TourState }) {
  const { lang, steps, index, next, prev, close } = state
  const step = steps[index]
  const last = index === steps.length - 1
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-blue-300 uppercase">
          {pick(lang, 'Prise en main', 'Getting started')} · {index + 1}/{steps.length}
        </span>
        <button
          type="button"
          onClick={close}
          aria-label={pick(lang, 'Fermer la visite', 'Close the tour')}
          className="cursor-pointer rounded p-0.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-sm font-semibold">{tr(lang, step.title)}</p>
      <p className="text-xs leading-relaxed text-white/80 [&_strong]:text-white">
        {bold(tr(lang, step.body))}
      </p>
      {/* Avancement en pastilles : on voit d'un coup d'œil ce qui reste. */}
      <div className="mt-1 flex flex-col gap-2.5">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                'size-1.5 rounded-full',
                i === index ? 'bg-blue-400' : i < index ? 'bg-white/50' : 'bg-white/20',
              )}
            />
          ))}
        </div>
        <div className="flex justify-between gap-1.5">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="flex cursor-pointer items-center gap-0.5 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-30"
          >
            <ChevronLeft className="size-3" />
            {pick(lang, 'Précédent', 'Back')}
          </button>
          <button
            type="button"
            onClick={next}
            className="flex cursor-pointer items-center gap-0.5 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600"
          >
            {last ? pick(lang, 'Terminer', 'Finish') : pick(lang, 'Suivant', 'Next')}
            {!last && <ChevronRight className="size-3" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TourTarget({
  id,
  children,
  className,
}: {
  id: string
  children: ReactNode
  className?: string
}) {
  const tour = useContext(TourContext)
  const register = tour?.register

  useEffect(() => (register ? register(id) : undefined), [register, id])

  if (!tour) return <>{children}</>

  const on = tour.activeTarget === id
  const step = tour.steps[tour.index]

  return (
    <Popover open={on}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            'rounded-lg transition-shadow',
            on && 'relative z-10 ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--color-background)]',
            className,
          )}
        >
          {children}
        </div>
      </PopoverAnchor>
      {on && (
        <PopoverContent
          side={step.side ?? 'bottom'}
          sideOffset={10}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={tour.close}
          className="w-80 rounded-lg border-0 bg-black p-4 text-white shadow-none"
        >
          <TourCard state={tour} />
        </PopoverContent>
      )}
    </Popover>
  )
}

import type { ReactNode } from 'react'
import { ChevronDown, Info, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useLang, pick } from '@/lib/useLang'
import type { Accent } from './ui'
import {
  DEFAULT_WIDTHS,
  clampWidth,
  readWidths,
  writeWidths,
  usePaneVisibility,
} from './workbench'

/**
 * Les briques communes des étapes du TD.
 *
 * Chaque étape reconstruisait sa propre carte : un `Card`, un `CardContent`
 * avec son padding, un titre en `flex items-center gap-2` et sa couleur, puis
 * le corps. Les mêmes réglages d'espacement étaient donc à refaire à chaque
 * endroit — et à corriger partout dès qu'un seul changeait. Tout est ici.
 */

const iconTone: Record<Accent, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  slate: 'text-slate-600 dark:text-slate-400',
}

/** Filet de gauche, pour les panneaux qui veulent porter une couleur. */
const edgeTone: Record<Accent, string> = {
  blue: 'border-l-4 border-l-blue-500',
  emerald: 'border-l-4 border-l-emerald-500',
  amber: 'border-l-4 border-l-amber-500',
  red: 'border-l-4 border-l-red-500',
  slate: 'border-l-4 border-l-slate-400',
}

/**
 * L'en-tête d'un bloc : une icône, un titre, et rien d'autre.
 *
 * `mb-3` fait partie du composant : c'est l'espacement sous un titre, il n'a
 * pas à être redécidé à chaque appel.
 */
export function BlockTitle({
  icon: Icon,
  accent = 'blue',
  children,
}: {
  icon?: LucideIcon
  accent?: Accent
  children: ReactNode
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
      {Icon && <Icon className={cn('size-4 shrink-0', iconTone[accent])} />}
      {children}
    </h3>
  )
}

/**
 * Le panneau standard d'une étape : une carte, son padding, son titre.
 *
 * `edge` ajoute le filet coloré à gauche — réservé aux blocs qui signalent
 * quelque chose (une erreur à éviter, un cas d'école), pas au contenu courant.
 */
export function Panel({
  title,
  icon,
  accent = 'blue',
  edge = false,
  children,
  className,
}: {
  title?: ReactNode
  icon?: LucideIcon
  accent?: Accent
  edge?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('py-0', edge && edgeTone[accent], className)}>
      <CardContent className="p-4 sm:p-5">
        {title && (
          <BlockTitle icon={icon} accent={accent}>
            {title}
          </BlockTitle>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

/**
 * Un bloc qu'on déplie. Replié par défaut : sert à ranger ce qui approfondit
 * sans être nécessaire à la première lecture — un dictionnaire de données, le
 * détail d'un calcul.
 */
export function Disclosure({
  label,
  icon: Icon,
  children,
}: {
  label: ReactNode
  icon?: LucideIcon
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-[var(--color-border)]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-accent)]"
      >
        {Icon && <Icon className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />}
        <span className="flex-1">{label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="border-t border-[var(--color-border)] p-3">{children}</div>}
    </div>
  )
}

/**
 * Le corps d'une étape.
 *
 * Porte l'espacement vertical commun — et l'annule au-dessus du premier
 * élément, qui est toujours le titre de l'étape : un blanc l'y décollerait de
 * la barre de navigation sans raison.
 */
export function StepBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5 [&>*:first-child]:mt-0">{children}</div>
}

/**
 * L'en-tête d'une colonne latérale : un titre, une icône, une aide facultative.
 *
 * Repris du `BriefTitle` du TD chatbots — même graisse, même taille, même
 * séparateur — pour que les deux TD se ressemblent.
 */
export function PaneTitle({
  icon: Icon,
  help,
  action,
  children,
}: {
  icon?: LucideIcon
  help?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)]">
        {Icon && <Icon className="size-4 shrink-0 text-slate-500" />}
        <span className="truncate">{children}</span>
        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={help}
                tabIndex={-1}
                className="cursor-help text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs leading-relaxed">
              {help}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      {action}
    </div>
  )
}

/** La poignée de redimensionnement, entre deux colonnes. */
function ResizeHandle({
  onMouseDown,
  onDoubleClick,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}) {
  const lang = useLang()
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      role="separator"
      aria-orientation="vertical"
      title={pick(lang, 'Double-cliquez pour rétablir la largeur par défaut', 'Double-click to restore the default width')}
      className="group relative hidden w-px shrink-0 cursor-col-resize bg-[var(--color-border)] xl:block"
    >
      {/* Zone de préhension plus large que le trait, pour viser sans effort —
          mais invisible : seul le trait lui-même se teinte au survol. */}
      <span className="absolute inset-y-0 -left-1.5 -right-1.5 block" />
      <span className="pointer-events-none absolute inset-y-0 left-0 block w-px bg-transparent transition-colors group-hover:bg-blue-500/60" />
    </div>
  )
}

/**
 * La paillasse à trois colonnes : réglages, résultat, historique.
 *
 * Même disposition que le TD chatbots — colonnes redimensionnables à la
 * poignée, repliables depuis la barre de navigation, et surtout défilant
 * INDÉPENDAMMENT. C'est ce dernier point qui fait tout l'intérêt : on garde
 * les réglages et l'historique sous les yeux pendant qu'on parcourt le
 * résultat, alors qu'une grille dans une page défilante les emporte hors de
 * l'écran dès qu'on descend.
 *
 * En dessous de `xl`, les colonnes s'empilent et la hauteur redevient libre :
 * sur un écran étroit, trois colonnes de 250 px ne tiennent pas.
 */
export function Workbench({
  controls,
  children,
  history,
}: {
  controls: ReactNode
  children: ReactNode
  history?: ReactNode
}) {
  const [widths, setWidths] = useState(() => readWidths())
  const drag = useRef<{ side: 'left' | 'right'; startX: number; startW: number } | null>(null)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = drag.current
      if (!d) return
      // La colonne droite s'élargit vers la gauche : le delta s'inverse.
      const delta = d.side === 'left' ? e.clientX - d.startX : d.startX - e.clientX
      setWidths((w) => ({ ...w, [d.side]: clampWidth(d.startW + delta) }))
    }
    function onUp() {
      if (!drag.current) return
      drag.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setWidths((w) => {
        writeWidths(w)
        return w
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const startDrag = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent) => {
      e.preventDefault()
      // La largeur de départ est lue sur le nœud lui-même : pas besoin de
      // capturer l'état, et le glissement reste juste après un re-rendu.
      const pane = e.currentTarget.parentElement?.querySelector<HTMLElement>(
        side === 'left' ? '[data-pane="left"]' : '[data-pane="right"]',
      )
      drag.current = {
        side,
        startX: e.clientX,
        startW: pane?.getBoundingClientRect().width ?? DEFAULT_WIDTHS[side],
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [],
  )

  /** Double-clic sur une poignée : la colonne retrouve sa largeur d'origine. */
  const resetWidth = useCallback(
    (side: 'left' | 'right') => () => {
      setWidths((w) => {
        const next = { ...w, [side]: DEFAULT_WIDTHS[side] }
        writeWidths(next)
        return next
      })
    },
    [],
  )

  const panes = usePaneVisibility()

  // Les colonnes repliées sortent de la grille : le centre récupère la place.
  const columns = [
    panes.left ? 'var(--w-left)' : null,
    panes.left ? 'auto' : null,
    'minmax(0,1fr)',
    history && panes.right ? 'auto' : null,
    history && panes.right ? 'var(--w-right)' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className="flex flex-col gap-4 xl:grid xl:h-full xl:min-h-0 xl:gap-0"
      style={
        {
          '--w-left': `${widths.left}px`,
          '--w-right': `${widths.right}px`,
          gridTemplateColumns: columns,
        } as React.CSSProperties
      }
    >
      {panes.left && (
        <>
          {/* pr-3 : le contenu garde sa largeur, l'ascenseur se pose dans
              cette marge au lieu de recouvrir le texte. */}
          <div
            data-pane="left"
            className="flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pr-3"
          >
            {controls}
          </div>
          <ResizeHandle onMouseDown={startDrag('left')} onDoubleClick={resetWidth('left')} />
        </>
      )}

      <div className={cn('flex min-w-0 flex-col gap-4 xl:min-h-0 xl:overflow-y-auto xl:pr-3', panes.left && 'xl:pl-4')}>
        {children}
      </div>

      {history && panes.right && (
        <>
          <ResizeHandle onMouseDown={startDrag('right')} onDoubleClick={resetWidth('right')} />
          <div
            data-pane="right"
            className="flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pl-4"
          >
            {history}
          </div>
        </>
      )}
    </div>
  )
}

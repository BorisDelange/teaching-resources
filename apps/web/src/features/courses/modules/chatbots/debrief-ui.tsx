// ============================================================
// Cartes des débriefs et du conducteur.
//
// À plat, sans ombre : une teinte légère (/5) et une bordure discrète (/30),
// le registre des encadrés du TD sepsis. La couleur porte le sens — ambre
// pour ce qu'on a observé, vert pour ce qu'on retient, rouge pour ce qui
// peut nuire — et reste rare : la plupart des blocs sont neutres.
// ============================================================

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tone = 'neutral' | 'blue' | 'emerald' | 'amber' | 'red'

const BOX: Record<Tone, string> = {
  neutral: 'border-[var(--color-border)] bg-[var(--color-card)]',
  blue: 'border-blue-500/30 bg-blue-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  red: 'border-red-500/30 bg-red-500/5',
}

const ICON: Record<Tone, string> = {
  neutral: 'text-blue-600 dark:text-blue-400',
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-500',
  red: 'text-red-600 dark:text-red-400',
}

const PASTILLE: Record<Tone, string> = {
  neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function Block({
  tone = 'neutral',
  title,
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone
  title?: ReactNode
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    // Texte justifié, césure française comprise : les paragraphes et les puces
    // seulement, pour ne pas toucher aux libellés centrés des figures.
    <section
      className={cn(
        'rounded-lg border p-4 sm:p-5 hyphens-auto [&_li]:text-justify [&_p:not(.text-center)]:text-justify',
        BOX[tone],
        className,
      )}
    >
      {title && (
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
          {Icon && <Icon className={cn('size-4 shrink-0', ICON[tone])} />}
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}

/** Une tuile de chiffre clé : icône en pastille, valeur, libellé. */
export function Kpi({
  value,
  label,
  icon: Icon,
  tone,
}: {
  value: string
  label: ReactNode
  icon: LucideIcon
  tone: Exclude<Tone, 'neutral'>
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-4', BOX[tone])}>
      <span
        className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', PASTILLE[tone])}
      >
        <Icon className="size-6" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className={cn('text-2xl leading-tight font-bold tabular-nums', ICON[tone])}>
          {value}
        </span>
        <span className="text-xs leading-snug text-[var(--color-muted-foreground)]">{label}</span>
      </div>
    </div>
  )
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}

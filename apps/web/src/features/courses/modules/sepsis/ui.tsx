import type { ReactNode } from 'react'
import { Info, TriangleAlert, Lightbulb, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export type Accent = 'blue' | 'emerald' | 'amber' | 'red' | 'slate'

const iconAccent: Record<Accent, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  slate: 'text-slate-600 dark:text-slate-400',
}

// Même registre que les blocs du TD chatbots : une teinte légère (/5), une
// bordure discrète (/30), pas de barre latérale. L'encadré doit se lire comme
// une remarque posée à côté du texte, pas comme une alerte système.
/** Pastille de l'icône d'une tuile de chiffre : fond teinté, icône saturée. */
const tileAccent: Record<Accent, string> = {
  blue: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  red: 'bg-red-500/12 text-red-600 dark:text-red-400',
  slate: 'bg-slate-500/12 text-slate-600 dark:text-slate-400',
}

const boxAccent: Record<Accent, string> = {
  blue: 'border-blue-500/30 bg-blue-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  red: 'border-red-500/30 bg-red-500/5',
  slate: 'border-slate-400/30 bg-slate-500/5',
}

export function Callout({
  variant = 'blue',
  title,
  children,
}: {
  variant?: Accent
  title?: ReactNode
  children: ReactNode
}) {
  const Icon = variant === 'amber' || variant === 'red' ? TriangleAlert : variant === 'emerald' ? Lightbulb : Info
  return (
    <div className={`rounded-lg border p-4 ${boxAccent[variant]}`}>
      {title && (
        <h4 className="mb-1.5 flex items-start gap-2 text-sm font-semibold text-[var(--color-foreground)]">
          <Icon className={`mt-0.5 size-4 shrink-0 ${iconAccent[variant]}`} />
          {title}
        </h4>
      )}
      <div className="text-justify text-sm leading-relaxed hyphens-auto text-[var(--color-muted-foreground)]">
        {!title && <Icon className={`mr-1.5 inline size-4 align-text-bottom ${iconAccent[variant]}`} />}
        {children}
      </div>
    </div>
  )
}

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  detail?: string
  icon: LucideIcon
  accent: Accent
}) {
  return (
    /* L'icône passe à gauche, dans une pastille teintée, et le chiffre monte
       à côté de son libellé plutôt qu'en dessous : la tuile perd une ligne,
       gagne en lisibilité, et l'icône devient assez grande pour se voir. */
    <Card className="py-0">
      <CardContent className="flex items-start gap-3 p-3">
        <span
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${tileAccent[accent]}`}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-[var(--color-muted-foreground)]">{title}</span>
          <span className="text-xl leading-tight font-bold tabular-nums text-[var(--color-foreground)]">
            {value}
          </span>
          {/* Les précisions sont des bouts de phrase (« des « rassurés » vont
              bien ») : sur la ligne du chiffre elles seraient tronquées, donc
              elles gardent la leur, en petit. */}
          {detail && (
            <span className="text-[11px] leading-snug text-[var(--color-muted-foreground)]">
              {detail}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SectionTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-semibold text-[var(--color-foreground)]">{children}</h2>
      {subtitle && <p className="text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>}
    </div>
  )
}

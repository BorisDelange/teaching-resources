import type { ReactNode } from 'react'
import {
  ArrowRight,
  BookOpen,
  CircleAlert,
  CircleCheckBig,
  Info,
  PencilLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { withBase } from '@/lib/utils'

/**
 * Blocs d'article repris de linkr-website, portés en React.
 *
 * Sur linkr ces encadrés sont écrits en dur dans chaque fichier MDX — le bloc
 * « En résumé » y est recopié à l'identique dans une vingtaine de pages. Ici
 * ils deviennent de vrais composants : même rendu, une seule définition.
 */

export type CalloutType = 'info' | 'warning' | 'success' | 'note' | 'example'

const CALLOUT: Record<CalloutType, { box: string; icon: string; Icon: LucideIcon }> =
  {
    info: {
      box: 'border-blue-200 bg-blue-50/80 dark:border-blue-800/50 dark:bg-blue-950/30',
      icon: 'text-blue-600 dark:text-blue-400',
      Icon: Info,
    },
    warning: {
      box: 'border-amber-200 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/30',
      icon: 'text-amber-600 dark:text-amber-400',
      Icon: TriangleAlert,
    },
    success: {
      box: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/30',
      icon: 'text-emerald-600 dark:text-emerald-400',
      Icon: CircleCheckBig,
    },
    note: {
      box: 'border-violet-200 bg-violet-50/80 dark:border-violet-800/50 dark:bg-violet-950/30',
      icon: 'text-violet-600 dark:text-violet-400',
      Icon: PencilLine,
    },
    example: {
      box: 'border-teal-200 bg-teal-50/80 dark:border-teal-800/50 dark:bg-teal-950/30',
      icon: 'text-teal-600 dark:text-teal-400',
      Icon: BookOpen,
    },
  }

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: CalloutType
  title?: ReactNode
  children: ReactNode
}) {
  const c = CALLOUT[type]
  return (
    <div className={`not-prose my-6 rounded-lg border p-4 sm:p-5 ${c.box}`}>
      <div className="flex gap-3">
        <c.Icon size={20} className={`mt-0.5 shrink-0 ${c.icon}`} />
        {/* `text-justify` sur les paragraphes du corps, pas sur le titre :
            justifier une ligne unique n'a pas d'effet, mais la règle sur `p`
            l'attraperait aussi et rien ne garantit qu'il tienne sur une ligne.
            `hyphens-auto` évite les lézardes que la justification creuse dans
            une colonne étroite, le français ayant des mots longs. */}
        <div className="text-sm leading-relaxed text-[var(--color-foreground)]/90 hyphens-auto [&_a]:text-blue-600 [&_a]:underline [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p+p]:mt-2 [&_p]:text-justify [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {/* Le titre reprend la couleur du texte courant, et non la teinte du
              bloc : un intitulé bleu sur fond bleu pâle passe mal, et la
              couleur du cadre suffit déjà à dire de quel registre il relève. */}
          {title && (
            <p className="mb-1.5 text-left font-semibold text-[var(--color-foreground)]">{title}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

/** Encadré d'ouverture d'un cours. Toujours en tête, avant la première section. */
export function Summary({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="not-prose my-6 rounded-lg border border-blue-200 bg-blue-50/80 p-5 sm:p-6 dark:border-blue-800/50 dark:bg-blue-950/30">
      <p className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">
        {title ?? 'En résumé'}
      </p>
      <div className="text-[15px] leading-relaxed text-[var(--color-foreground)]/90">{children}</div>
    </div>
  )
}

/** « Ce qu'il faut retenir » — liste à puces cochées, en fin de cours. */
export function Takeaways({ items }: { items: ReactNode[] }) {
  return (
    <div className="not-prose my-6 rounded-lg border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-800/50 dark:bg-blue-950/30">
      <ul className="space-y-3 text-sm text-[var(--color-foreground)]">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <CircleCheckBig
              size={18}
              className="mt-0.5 shrink-0 text-[var(--color-primary)]"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export type StepColor =
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'teal'

const STEP: Record<StepColor, { box: string; badge: string }> = {
  sky: {
    box: 'border-sky-200 bg-sky-50/50 dark:border-sky-800/50 dark:bg-sky-950/20',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  },
  blue: {
    box: 'border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  indigo: {
    box: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-800/50 dark:bg-indigo-950/20',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  },
  violet: {
    box: 'border-violet-200 bg-violet-50/50 dark:border-violet-800/50 dark:bg-violet-950/20',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  },
  emerald: {
    box: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  amber: {
    box: 'border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  rose: {
    box: 'border-rose-200 bg-rose-50/50 dark:border-rose-800/50 dark:bg-rose-950/20',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  },
  teal: {
    box: 'border-teal-200 bg-teal-50/50 dark:border-teal-800/50 dark:bg-teal-950/20',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  },
}

export function StepCard({
  number,
  title,
  color,
  children,
}: {
  number: number
  title: ReactNode
  color?: StepColor
  children: ReactNode
}) {
  const c = color ? STEP[color] : null
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${c ? c.box : 'bg-[var(--color-card)]'}`}
    >
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          c ? c.badge : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
        }`}
      >
        {number}
      </span>
      <div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">{title}</p>
        {/* `div` et non `p` : le corps d'une étape contient parfois plusieurs
            paragraphes, qu'un `p` ne peut pas imbriquer. */}
        <div className="mt-1 space-y-1.5 text-xs text-[var(--color-muted-foreground)]">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Conteneur des StepCard : garde l'espacement de linkr. */
export function Steps({ children }: { children: ReactNode }) {
  return <div className="not-prose my-8 space-y-3">{children}</div>
}

export function DataCard({
  icon: Icon,
  color = 'blue',
  title,
  children,
}: {
  icon: LucideIcon
  color?: StepColor | 'cyan'
  title: ReactNode
  children: ReactNode
}) {
  const tone: Record<string, string> = {
    sky: 'text-sky-500',
    blue: 'text-blue-500',
    indigo: 'text-indigo-500',
    violet: 'text-violet-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    teal: 'text-teal-500',
    cyan: 'text-cyan-500',
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-[var(--color-card)] p-4">
      <Icon size={20} className={`mt-0.5 shrink-0 ${tone[color] ?? tone.blue}`} />
      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--color-foreground)]">{title}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{children}</p>
      </div>
    </div>
  )
}

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  )
}

/**
 * Ressource externe. `kind` distingue ce qui attend l'étudiant : une vidéo se
 * regarde, un outil se manipule, un article se lit — l'icône le dit avant le clic.
 */
export function ExternalResource({
  href,
  title,
  kind,
  icon: Icon,
  children,
}: {
  href: string
  title: ReactNode
  kind: ReactNode
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-3 rounded-lg border bg-[var(--color-card)] p-4 no-underline transition-colors hover:border-blue-300 dark:hover:border-blue-700"
    >
      <Icon size={20} className="mt-0.5 shrink-0 text-blue-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {title}
          </p>
          <ArrowRight
            size={14}
            className="shrink-0 text-[var(--color-muted-foreground)] transition-transform group-hover:translate-x-0.5"
          />
        </div>
        <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
          {kind}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          {children}
        </p>
      </div>
    </a>
  )
}

/**
 * Renvoi vers l'exercice du TD que la section vient d'outiller. C'est le lien
 * explicite entre le cours et la séance : sans lui, l'étudiant ne sait pas
 * quelle partie du TD il vient de préparer.
 */
export function LabLink({ href, exercise, children }: { href: string; exercise: ReactNode; children: ReactNode }) {
  return (
    <div className="not-prose my-6 rounded-lg border border-amber-200 bg-amber-50/80 p-4 sm:p-5 dark:border-amber-800/50 dark:bg-amber-950/30">
      <div className="flex gap-3">
        <CircleAlert size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--color-foreground)]/90">
          <p className="mb-1.5 font-semibold text-[var(--color-foreground)]">
            Pour le TD — {exercise}
          </p>
          <p>{children}</p>
          <a
            href={withBase(href)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            Aller à l'exercice
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}

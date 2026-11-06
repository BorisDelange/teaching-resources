import { useState, type ReactNode } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'

/**
 * Appareil de références. Le cours affirme beaucoup de choses à des étudiants
 * qui ne peuvent pas les vérifier : chaque affirmation chiffrée doit pouvoir
 * être remontée à sa source. Le TD leur demande d'exiger des sources d'un
 * modèle — il serait incohérent que le cours n'en donne pas.
 */

export interface Reference {
  /** Clef courte citée dans le texte, ex. « llama3 ». */
  id: string
  /** Numéro d'appel, attribué à la construction de la liste. */
  label: string
  citation: ReactNode
  href?: string
}

/** Appel de note dans le corps du texte. */
export function Ref({ n, title }: { n: number; title?: string }) {
  return (
    <sup>
      <a
        href="#references"
        title={title}
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' })
        }}
        className="ml-0.5 cursor-pointer rounded px-0.5 text-xs font-semibold text-blue-600 no-underline hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
      >
        [{n}]
      </a>
    </sup>
  )
}

/** Bloc de références, replié par défaut. */
export function References({ items }: { items: { citation: ReactNode; href?: string }[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="not-prose my-6" id="references">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border bg-[var(--color-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-muted)]"
      >
        <ChevronRight
          size={16}
          className={`shrink-0 text-[var(--color-muted-foreground)] transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          Références ({items.length})
        </span>
        <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
          {open ? 'masquer' : 'afficher'}
        </span>
      </button>

      {open && (
        <ol className="mt-3 space-y-3 rounded-lg border bg-[var(--color-card)] p-5">
          {items.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="shrink-0 font-semibold text-blue-600 dark:text-blue-400">
                [{i + 1}]
              </span>
              <span className="text-[var(--color-muted-foreground)]">
                {r.citation}
                {r.href && (
                  <>
                    {' '}
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      lien
                      <ExternalLink size={11} />
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

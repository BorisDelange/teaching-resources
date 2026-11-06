import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, Presentation } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Takeaways } from '@/components/article/blocks'
import { AuthorCard } from '@/components/article/AuthorCard'
import { useTocStore } from '@/stores/toc-store'
import type { CourseArticle } from '@/components/article/types'

export function ArticleLayout({
  article,
  backHref,
  backLabel,
  onPresent,
}: {
  article: CourseArticle
  backHref: string
  backLabel: string
  /** Absent : le cours n'a pas (encore) de diapos, le bouton ne s'affiche pas. */
  onPresent?: () => void
}) {
  const setEntries = useTocStore((s) => s.setEntries)

  // La barre latérale droite de la coquille affiche ce sommaire ; on le vide
  // en quittant la page pour que son bouton disparaisse ailleurs.
  useEffect(() => {
    setEntries([
      ...article.sections.map((s) => ({ id: s.id, title: s.title, level: s.level })),
      { id: 'retenir', title: "Ce qu'il faut retenir" },
    ])
    return () => setEntries([])
  }, [article, setEntries])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
        {onPresent && (
          <Button variant="outline" size="sm" onClick={onPresent} className="gap-1.5">
            <Presentation size={14} />
            Mode diapos
          </Button>
        )}
      </div>

      <header className="mt-8 mb-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {article.index && (
            <Badge variant="secondary" className="text-xs">
              {article.index}
            </Badge>
          )}
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {article.minutes} min
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">Boris Delange</span>
        </div>
        <h1 className="text-2xl leading-tight font-bold text-[var(--color-foreground)] sm:text-3xl lg:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted-foreground)]">
          {article.description}
        </p>
      </header>

      <article className="prose prose-neutral dark:prose-invert max-w-none text-justify">
        {article.summary}
        {article.sections.map((s) => {
          const Heading = s.level === 3 ? 'h3' : 'h2'
          return (
            <section key={s.id}>
              {/* scroll-mt : compense l'en-tête collant à l'arrivée sur l'ancre. */}
              <Heading id={s.id} className="scroll-mt-24">
                {s.title}
              </Heading>
              {s.reading}
            </section>
          )
        })}

        <h2 className="scroll-mt-24" id="retenir">
          Ce qu'il faut retenir
        </h2>
        <Takeaways items={article.takeaways} />
      </article>

      <AuthorCard />

      {article.next && (
        <div className="mt-12 border-t pt-8">
          <Link
            to={article.next.href}
            className="group inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
          >
            Cours suivant : {article.next.title}
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      )}
    </div>
  )
}

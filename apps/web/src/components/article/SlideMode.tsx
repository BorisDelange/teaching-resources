import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CourseArticle } from '@/components/article/types'

/**
 * Projection du cours pendant le TD. Ne rend que les sections pourvues d'un
 * `slide` : le mode diapos est volontairement plus synthétique que le texte lu.
 */
export function SlideMode({ article, onExit }: { article: CourseArticle; onExit: () => void }) {
  const slides = useMemo(() => article.sections.filter((s) => s.slide), [article.sections])
  const [i, setI] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)

  const go = useCallback(
    (delta: number) => setI((prev) => Math.min(slides.length - 1, Math.max(0, prev + delta))),
    [slides.length],
  )

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void root.current?.requestFullscreen().catch(() => {})
  }, [])

  // La sortie du plein écran passe aussi par Échap ou le chrome du navigateur :
  // on suit l'état réel plutôt que de le présumer depuis le bouton.
  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'f') {
        toggleFullscreen()
      } else if (e.key === 'Escape') {
        // En plein écran, Échap y met fin : quitter le diaporama en même temps
        // ferait perdre sa place au lecteur.
        if (!document.fullscreenElement) onExit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onExit, toggleFullscreen])

  if (slides.length === 0) return null

  const current = slides[i]
  const slide = current.slide!
  // Une diapositive projetée ne doit jamais défiler. Les contenus étant de
  // densité très inégale, on réduit l'agrandissement des plus chargées plutôt
  // que de brider uniformément les autres.
  const dense = Boolean(slide.figure) && Boolean(slide.points) && Boolean(slide.punch)

  return (
    <div ref={root} className="flex h-full flex-col bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
          {article.title}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums text-[var(--color-muted-foreground)]">
            {i + 1} / {slides.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1.5"
            title={full ? 'Quitter le plein écran (f)' : 'Plein écran (f)'}
          >
            {full ? <Minimize size={16} /> : <Maximize size={16} />}
            {full ? 'Réduire' : 'Plein écran'}
          </Button>
          {!full && (
            <Button variant="ghost" size="sm" onClick={onExit} className="gap-1.5">
              <X size={16} />
              Quitter
            </Button>
          )}
        </div>
      </div>

      {/* Cliquer dans la zone avance, comme sur un vrai diaporama. */}
      <div
        onClick={() => go(1)}
        className={`flex flex-1 cursor-pointer flex-col overflow-y-auto ${
          full ? 'px-16 py-6' : 'px-10 py-8'
        }`}
      >
        {/* La clé force le remontage : chaque diapositive rejoue son apparition.
            Projeté, le contenu occupe une largeur et une taille plus grandes :
            une diapositive se lit depuis le fond de la salle. */}
        <div
          key={current.id}
          // `my-auto` plutôt que `justify-center` sur le parent : centre quand
          // il reste de la place, mais ne rogne jamais le haut d'un contenu
          // plus grand que la zone — sinon le titre passe sous l'en-tête.
          className={`mx-auto my-auto w-full animate-in duration-300 fade-in ${
            full ? 'max-w-[100rem]' : 'max-w-5xl'
          }`}
        >
          <h2
            className={`font-bold text-balance text-[var(--color-foreground)] ${
              full ? 'text-4xl xl:text-5xl' : 'text-3xl sm:text-4xl'
            }`}
          >
            {slide.title ?? current.title}
          </h2>

          {slide.lead && (
            <p
              className={`leading-relaxed text-[var(--color-muted-foreground)] ${
                full ? 'mt-4 text-2xl' : 'mt-4 text-xl'
              }`}
            >
              {slide.lead}
            </p>
          )}

          {slide.figure && (
            <div
              className={
                full
                  ? `slide-figure-fit ${dense ? '' : 'slide-figure-scale '}mt-6`
                  : 'mt-8'
              }
            >
              {slide.figure}
            </div>
          )}

          {slide.points && slide.points.length > 0 && (
            <ul className={`grid gap-4 sm:grid-cols-2 ${full ? 'mt-6' : 'mt-8'}`}>
              {slide.points.map((p, k) => (
                <li key={k} className="flex items-start gap-3">
                  <span
                    className={`shrink-0 rounded-full bg-blue-500 ${
                      full ? 'mt-3 size-3' : 'mt-2 size-2'
                    }`}
                  />
                  <span
                    className={`leading-relaxed text-[var(--color-foreground)] ${
                      full ? 'text-2xl' : 'text-lg'
                    }`}
                  >
                    {p}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {slide.punch && (
            <div
              className={`flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30 ${
                full ? 'mt-6 p-5' : 'mt-8 p-5'
              }`}
            >
              <TriangleAlert
                size={full ? 34 : 24}
                className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
              />
              {/* `div` et `space-y` : une punch line en deux temps (le constat,
                  puis sa conséquence) se lit mieux sur deux lignes que d'un
                  bloc — les sections en fournissent deux paragraphes. */}
              <div
                className={`space-y-2 leading-relaxed font-medium text-amber-900 dark:text-amber-100 ${
                  full ? 'text-2xl' : 'text-xl'
                }`}
              >
                {slide.punch}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-6 py-3">
        <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={i === 0} className="gap-1.5">
          <ChevronLeft size={16} />
          Précédent
        </Button>

        <div className="flex items-center gap-1.5">
          {slides.map((s, k) => (
            <button
              key={s.id}
              onClick={() => setI(k)}
              aria-label={s.title}
              className={`h-1.5 rounded-full transition-all ${
                k === i ? 'w-6 bg-blue-500' : 'w-1.5 bg-[var(--color-border)] hover:bg-blue-300'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => go(1)}
          disabled={i === slides.length - 1}
          className="gap-1.5"
        >
          Suivant
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

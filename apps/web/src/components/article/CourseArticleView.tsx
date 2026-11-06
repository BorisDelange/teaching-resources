import { useSearchParams } from 'react-router'
import { ArticleLayout } from '@/components/article/ArticleLayout'
import { SlideMode } from '@/components/article/SlideMode'
import type { CourseArticle } from '@/components/article/types'

/**
 * Le mode vit dans l'URL (`?mode=diapos`) : l'enseignant projette en ouvrant
 * un lien, et le bouton Retour du navigateur ramène à la lecture.
 *
 * `presentable={false}` retire entièrement les diapos — bouton et route —
 * pour un cours dont la version projetée n'est pas encore travaillée.
 */
export function CourseArticleView({
  article,
  backHref,
  backLabel,
  presentable = true,
}: {
  article: CourseArticle
  backHref: string
  backLabel: string
  presentable?: boolean
}) {
  const [params, setParams] = useSearchParams()
  // `?mode=diapos` est ignoré si le cours n'est pas projetable : un lien
  // partagé vers les diapos d'un cours qui n'en a plus ouvre la lecture.
  const slides = presentable && params.get('mode') === 'diapos'

  const setMode = (on: boolean) => {
    const next = new URLSearchParams(params)
    if (on) next.set('mode', 'diapos')
    else next.delete('mode')
    setParams(next)
  }

  // Les diapos occupent tout l'écran et ne défilent pas ; l'article, lui,
  // défile dans le conteneur de l'AppShell.
  if (slides)
    return (
      <div className="h-full overflow-hidden">
        <SlideMode article={article} onExit={() => setMode(false)} />
      </div>
    )

  return (
    <ArticleLayout
      article={article}
      backHref={backHref}
      backLabel={backLabel}
      onPresent={presentable ? () => setMode(true) : undefined}
    />
  )
}

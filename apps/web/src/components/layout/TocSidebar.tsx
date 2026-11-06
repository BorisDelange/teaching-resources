import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/app-store'
import { useTocStore } from '@/stores/toc-store'

/**
 * Sommaire « Sur cette page », à droite de la coquille.
 *
 * Il vit ici, et non dans la mise en page de l'article, pour se comporter
 * exactement comme la barre latérale gauche : de pleine hauteur, toujours
 * visible, et replié par un bouton de l'en-tête. La page affichée publie ses
 * entrées dans `useTocStore`.
 */

/**
 * Suit la section visible. Le défilement a lieu dans le conteneur de contenu
 * de la coquille, pas sur la fenêtre : on le retrouve depuis un titre de
 * section plutôt que d'écouter `window`, qui ne recevrait jamais l'événement.
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  // On dépend du contenu du tableau, pas de son identité : celle-ci change à
  // chaque rendu et relancerait l'abonnement en boucle.
  const key = ids.join(',')

  useEffect(() => {
    const list = key ? key.split(',') : []
    if (list.length === 0) return

    let node = document.getElementById(list[0])?.parentElement ?? null
    while (node && node !== document.body) {
      const overflow = getComputedStyle(node).overflowY
      if (overflow === 'auto' || overflow === 'scroll') break
      node = node.parentElement
    }
    const scroller: HTMLElement | Window = node && node !== document.body ? node : window

    const onScroll = () => {
      let found = list[0]
      for (const id of list) {
        const el = document.getElementById(id)
        // 96px : marge sous le haut de la zone visible, pour que la section
        // suivante ne s'active pas dès que son titre effleure le bord.
        if (el && el.getBoundingClientRect().top <= 96) found = id
      }
      setActive(found)
    }

    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [key])

  return active
}

export function TocSidebar() {
  const { t } = useTranslation()
  const collapsed = useAppStore((s) => s.tocCollapsed)
  const entries = useTocStore((s) => s.entries)
  const active = useActiveSection(entries.map((e) => e.id))

  if (entries.length === 0 || collapsed) return null

  return (
    <aside className="hidden w-60 shrink-0 overflow-y-auto border-l bg-[var(--color-card)] px-4 py-6 lg:block">
      <p className="mb-3 text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
        {t('toc.title')}
      </p>
      <ul className="space-y-0.5 border-l text-sm">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              title={e.title}
              onClick={(ev) => {
                // Le défilement a lieu dans un conteneur, pas sur la fenêtre :
                // l'ancre native viserait mal. On s'en charge nous-mêmes.
                ev.preventDefault()
                document.getElementById(e.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`-ml-px block truncate border-l-2 py-1 transition-colors ${
                e.level === 3 ? 'pl-6 text-xs' : 'pl-3'
              } ${
                active === e.id
                  ? 'border-blue-500 font-semibold text-[var(--color-foreground)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {e.title}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

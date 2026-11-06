import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Home } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { COURSES, localize, visibleModules } from '@/content/courses'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, withBase } from '@/lib/utils'
import { useLang } from '@/lib/useLang'
import { moduleHref } from '@/lib/last-step'

const TOP_ITEMS = [{ to: '/', icon: Home, labelKey: 'nav.home', end: true }] as const

/**
 * Titre tronqué : le libellé complet reste lisible au survol.
 *
 * La barre latérale fait 16 rem, et plusieurs titres de cours ou de modules
 * dépassent — `truncate` les coupe sans prévenir. Le tooltip rend le texte
 * entier, et son fond noir est fixé (pas `bg-foreground`) pour rester
 * identique en clair comme en sombre.
 *
 * La flèche par défaut de shadcn est un CARRÉ pivoté à 45° : posée sur le
 * flanc gauche d'une bulle, elle déborde en rectangle noir au lieu de pointer.
 * On la masque (`[&>span]:hidden`) et on dessine un vrai triangle.
 */
function TruncatedLabel({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate">{text}</span>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={6}
        className="relative max-w-xs rounded-lg bg-slate-900 text-white [&>span]:hidden"
      >
        {text}
        <span
          aria-hidden
          className="absolute top-1/2 -left-[5px] size-0 -translate-y-1/2 border-y-[5px] border-r-[6px] border-y-transparent border-r-slate-900"
        />
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const lang = useLang()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  // On mobile, following a link should close the off-canvas sidebar
  // so the page shows full-screen.
  const closeOnMobile = () => {
    if (!collapsed && window.matchMedia('(max-width: 1023px)').matches) toggleSidebar()
  }

  return (
    <>
      {/* Mobile backdrop — visible only when the sidebar is open below lg */}
      {!collapsed && (
        <button
          type="button"
          aria-label={t('nav.closeMenu')}
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={cn(
          'z-40 flex shrink-0 flex-col border-r bg-[var(--color-card)] transition-all duration-200',
          // Mobile: off-canvas overlay, slides in when not collapsed
          'fixed inset-y-0 left-0 w-64',
          collapsed ? '-translate-x-full' : 'translate-x-0',
          // Desktop: in-flow column, width toggles instead of translating
          'lg:static lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
      <div className="flex h-16 shrink-0 items-center justify-center border-b px-2">
        {/*
          Deux fichiers par logo, et non un seul recolorie : le logo EDSAN est
          multicolore (bleu nuit, vert d'eau, bleu clair), donc illisible sur
          fond sombre et impossible a adapter par un filtre CSS. La charte
          fournit une variante blanche, qu'on echange selon le theme.

          Replie, on affiche le PICTOGRAMME SEUL (croix + ordinateur), extrait
          du logo carre : la charte ne livre que des logos avec texte, et
          « EDucation en SAnte Numerique » reduit a 36 px serait illisible.
        */}
        <NavLink to="/" aria-label="EDSAN — accueil">
          {collapsed ? (
            <>
              <img src={withBase('/edsan-symbol.png')} alt="EDSAN" className="size-9 dark:hidden" />
              <img src={withBase('/edsan-symbol-dark.png')} alt="EDSAN" className="hidden size-9 dark:block" />
            </>
          ) : (
            <>
              <img src={withBase('/edsan-logo.png')} alt="EDSAN — Éducation en santé numérique" className="h-13 dark:hidden" />
              <img
                src={withBase('/edsan-logo-dark.png')}
                alt="EDSAN — Éducation en santé numérique"
                className="hidden h-13 dark:block"
              />
            </>
          )}
        </NavLink>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {TOP_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeOnMobile}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{t(labelKey)}</span>}
          </NavLink>
        ))}

        {!collapsed &&
          COURSES.map((course) => (
            <div key={course.slug} className="mt-4">
              <NavLink
                to={`/courses/${course.slug}`}
                onClick={closeOnMobile}
                className={({ isActive }) =>
                  cn(
                    'flex rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors',
                    isActive
                      ? 'text-blue-600 dark:text-blue-300'
                      : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  )
                }
              >
                <TruncatedLabel text={localize(course.title, lang)} />
              </NavLink>
              <div className="mt-0.5 flex flex-col">
                {visibleModules(course).map((module) => (
                  <NavLink
                    key={module.slug}
                    to={moduleHref(course.slug, module.slug)}
                    onClick={closeOnMobile}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md py-1.5 pr-3 pl-5 text-sm transition-colors',
                        isActive
                          ? 'bg-[var(--color-accent)] font-medium text-[var(--color-accent-foreground)]'
                          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
                      )
                    }
                  >
                    <module.icon className="size-3.5 shrink-0" />
                    <TruncatedLabel text={localize(module.title, lang)} />
                    {module.underConstruction && (
                      <span
                        title={t('module.underConstruction')}
                        className="ml-auto shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                      >
                        {t('module.underConstructionBadge')}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
      </nav>
      </aside>
    </>
  )
}

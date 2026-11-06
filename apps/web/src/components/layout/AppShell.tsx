import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/app-store'
import { getModule } from '@/content/courses'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { TocSidebar } from '@/components/layout/TocSidebar'
import { Toaster } from '@/components/ui/sonner'

function Content() {
  const pathname = useLocation().pathname
  // Les TD gèrent leur propre zone de défilement et épinglent une barre en bas :
  // ils remplissent la hauteur disponible. Les cours en mode article, eux,
  // défilent comme une page normale — d'où la consultation du module.
  const match = /^\/courses\/([^/]+)\/([^/]+)/.exec(pathname)
  const found = match ? getModule(match[1], match[2]) : undefined
  const fullHeight = !!match && found?.module.layout !== 'article'

  if (fullHeight) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-[var(--color-card)]">
        <Outlet />
      </div>
    )
  }

  // Les cours en mode article portent déjà leur propre gouttière et leur
  // sommaire latéral : les envelopper dans le conteneur commun les rétrécirait.
  if (match) {
    return (
      <div className="flex flex-1 flex-col overflow-auto bg-[var(--color-card)]">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[var(--color-card)]">
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function AppShell() {
  const { i18n } = useTranslation()
  const { darkMode, language } = useAppStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language)
  }, [language, i18n])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Content />
          <TocSidebar />
        </div>
      </div>
      <Toaster />
    </div>
  )
}

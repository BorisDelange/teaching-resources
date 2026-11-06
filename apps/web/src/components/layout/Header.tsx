import { PanelLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { HeaderControls } from '@/components/layout/HeaderControls'
import { ModeBadge } from '@/components/layout/ModeBadge'

export function Header() {
  const { t } = useTranslation()
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  return (
    <header className="relative flex h-16 items-center justify-between border-b bg-[var(--color-card)] px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <PanelLeft className="size-5" />
        </Button>
        <ModeBadge />
      </div>

      <div className="pointer-events-none absolute left-1/2 hidden max-w-[60%] -translate-x-1/2 truncate px-2 text-center md:block">
        <p className="truncate text-sm font-semibold sm:text-base">{t('app.title')}</p>
      </div>

      <HeaderControls />
    </header>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Sun, Languages, Info, PanelRight } from 'lucide-react'
import { useAppStore, type Language } from '@/stores/app-store'
import { useTocStore } from '@/stores/toc-store'
import { Button } from '@/components/ui/button'
import { AboutDialog } from '@/components/AboutDialog'
import { SettingsMenu } from '@/components/layout/SettingsMenu'

export function HeaderControls() {
  const { t, i18n } = useTranslation()
  const { darkMode, toggleDarkMode, setLanguage, language, toggleToc } = useAppStore()
  const hasToc = useTocStore((s) => s.entries.length > 0)
  const [aboutOpen, setAboutOpen] = useState(false)

  function switchLanguage() {
    const next: Language = language === 'en' ? 'fr' : 'en'
    setLanguage(next)
    void i18n.changeLanguage(next)
  }

  const targetLabel = language === 'en' ? 'FR' : 'EN'

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        className="h-auto p-2"
        onClick={() => setAboutOpen(true)}
        aria-label={t('about.open')}
        title={t('about.open')}
      >
        <Info className="size-5" />
      </Button>
      <Button
        variant="ghost"
        className="h-auto gap-1.5 px-2.5 py-2 text-sm font-medium"
        onClick={switchLanguage}
        aria-label="Switch language"
      >
        <Languages className="size-4" />
        <span>{targetLabel}</span>
      </Button>
      <Button variant="ghost" className="h-auto p-2" onClick={toggleDarkMode} aria-label="Toggle dark mode">
        {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
      <SettingsMenu />
      {/* Le sommaire n'existe que sur les pages qui en publient un : ailleurs,
          le bouton n'aurait rien à replier. */}
      {hasToc && (
        <Button
          variant="ghost"
          className="hidden h-auto p-2 lg:inline-flex"
          onClick={toggleToc}
          aria-label={t('toc.toggle')}
          title={t('toc.toggle')}
        >
          <PanelRight className="size-5" />
        </Button>
      )}
      {aboutOpen && <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />}
    </div>
  )
}

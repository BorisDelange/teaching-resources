import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { getModule } from '@/content/courses'
import { Button } from '@/components/ui/button'

/**
 * Le bandeau « en construction » ne barre plus le haut de chaque module : il
 * mangeait une bande de hauteur sur toutes les étapes, pour une information
 * qu'on lit une fois. Il vit désormais dans l'introduction du module concerné,
 * et le badge de la barre latérale continue de le signaler partout.
 */
export function ModulePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { courseSlug, moduleSlug } = useParams()
  const found = courseSlug && moduleSlug ? getModule(courseSlug, moduleSlug) : undefined

  if (!found) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-[var(--color-muted-foreground)]">{t('module.notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> {t('course.back')}
        </Button>
      </div>
    )
  }

  const { module } = found
  const ModuleComponent = module.component

  // Un cours en mode article défile avec la page : l'enfermer dans une boîte
  // de la hauteur de l'écran avec `overflow-hidden` en couperait le contenu.
  if (module.layout === 'article') return <ModuleComponent />

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ModuleComponent />
    </div>
  )
}

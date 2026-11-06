import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router'
import { ArrowLeft, Construction } from 'lucide-react'
import { getCourse, localize, visibleModules } from '@/content/courses'
import { Button } from '@/components/ui/button'
import { CARD_COLORS as HEADER_COLORS } from '@/lib/course-colors'
import { useLang } from '@/lib/useLang'

export function CoursePage() {
  const { t } = useTranslation()
  const lang = useLang()
  const navigate = useNavigate()
  const { courseSlug } = useParams()
  const course = courseSlug ? getCourse(courseSlug) : undefined

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[var(--color-muted-foreground)]">{t('course.notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> {t('course.back')}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{localize(course.title, lang)}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('app.subtitle')}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft size={14} /> {t('course.back')}
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleModules(course).map((module) => (
          <button
            key={module.slug}
            onClick={() => navigate(`/courses/${course.slug}/${module.slug}`)}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-[var(--color-card)] text-left shadow-xs transition-all hover:shadow-md"
          >
            {module.underConstruction && (
              <span className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <Construction size={12} />
                {t('module.underConstructionBadge')}
              </span>
            )}
            <div
              className={`flex h-24 items-center justify-center ${HEADER_COLORS[module.color]}`}
            >
              <module.icon size={36} strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-1 p-4">
              <p className="font-semibold group-hover:text-blue-600">
                {localize(module.title, lang)}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {localize(module.description, lang)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

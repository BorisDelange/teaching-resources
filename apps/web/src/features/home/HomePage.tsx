import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import { COURSES, localize, visibleModules } from '@/content/courses'
import { Input } from '@/components/ui/input'
import { CARD_COLORS, CARD_HOVER_BORDER, CARD_HOVER_TITLE } from '@/lib/course-colors'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/useLang'

export function HomePage() {
  const { t } = useTranslation()
  const lang = useLang()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COURSES
    return COURSES.filter((course) => {
      const haystack = [
        localize(course.title, lang),
        localize(course.description, lang),
        ...visibleModules(course).flatMap((m) => [
          localize(m.title, lang),
          localize(m.description, lang),
        ]),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, lang])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('home.heading')}</h1>
      </div>

      <div className="mt-8">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            className="pl-9"
          />
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-muted-foreground)]">
        {t('home.coursesTitle')}
      </h2>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-300">
          {t('home.noResults', { query: query.trim() })}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {filtered.map((course) => {
            const Icon = course.icon
            return (
              <button
                key={course.slug}
                onClick={() => navigate(`/courses/${course.slug}`)}
                className={cn(
                  'group flex cursor-pointer items-center gap-4 rounded-xl border bg-[var(--color-card)] p-5 text-left shadow-xs transition-all hover:shadow-md',
                  CARD_HOVER_BORDER[course.color],
                )}
              >
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-lg',
                    CARD_COLORS[course.color],
                  )}
                >
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <p className={cn('font-semibold', CARD_HOVER_TITLE[course.color])}>
                    {localize(course.title, lang)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {localize(course.description, lang)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

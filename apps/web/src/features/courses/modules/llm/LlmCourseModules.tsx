import { CourseArticleView } from '@/components/article/CourseArticleView'
import { COURSE_FONCTIONNEMENT } from './course-fonctionnement'
import { COURSE_USAGE } from './course-usage'

const BACK_HREF = '/courses/llm'
const BACK_LABEL = 'Grands modèles de langage'

export function LlmFonctionnementModule() {
  return (
    <CourseArticleView
      article={COURSE_FONCTIONNEMENT}
      backHref={BACK_HREF}
      backLabel={BACK_LABEL}
    />
  )
}

export function LlmUsageModule() {
  return (
    <CourseArticleView article={COURSE_USAGE} backHref={BACK_HREF} backLabel={BACK_LABEL} />
  )
}

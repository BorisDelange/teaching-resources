import { CourseArticleView } from '@/components/article/CourseArticleView'
import { COURSE_DEFINITION } from './course-definition'

const BACK_HREF = '/courses/ai-introduction'
const BACK_LABEL = "Introduction à l'intelligence artificielle"

export function IaDefinitionModule() {
  // Les diapos de ce cours restent à travailler : on n'expose pas une version
  // projetée à moitié faite. Les `slide` des sections sont conservés tels quels
  // et le mode se réactivera en retirant `presentable`.
  return (
    <CourseArticleView
      article={COURSE_DEFINITION}
      backHref={BACK_HREF}
      backLabel={BACK_LABEL}
      presentable={false}
    />
  )
}

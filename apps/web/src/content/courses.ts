import type { ComponentType } from 'react'
import {
  Activity,
  Blocks,
  Bot,
  Brain,
  HelpCircle,
  Languages,
  LineChart,
  Sparkles,
  Stethoscope,
  Target,
  type LucideIcon,
} from 'lucide-react'
import {
  LlmFonctionnementModule,
  LlmUsageModule,
} from '@/features/courses/modules/llm/LlmCourseModules'
import { IaDefinitionModule } from '@/features/courses/modules/ia/IaCourseModules'
import { ChatbotsModule } from '@/features/courses/modules/chatbots/ChatbotsModule'
import { ReproducibilityModule } from '@/features/courses/modules/ReproducibilityModule'
import { PerformanceModule } from '@/features/courses/modules/PerformanceModule'
import { QuizModule } from '@/features/courses/modules/QuizModule'
import { SepsisModule } from '@/features/courses/modules/SepsisModule'

export type ModuleColor = 'blue' | 'green' | 'yellow' | 'red'

/** A user-facing string that is either French-only or bilingual. */
export type LocalizedText = string | { fr: string; en: string }

/** Resolve a LocalizedText for the given language, falling back to French. */
export function localize(text: LocalizedText, lang: 'fr' | 'en'): string {
  return typeof text === 'string' ? text : (text[lang] ?? text.fr)
}

export interface CourseModule {
  slug: string
  title: LocalizedText
  description: LocalizedText
  icon: LucideIcon
  color: ModuleColor
  component: ComponentType
  /**
   * `app` (défaut) : le module occupe toute la hauteur et gère son propre
   * défilement — c'est le cas des TD, qui épinglent une barre en bas.
   * `article` : page de cours qui défile normalement, avec sommaire latéral.
   */
  layout?: 'app' | 'article'
  /** Marque le module comme en cours de construction (badge + bannière). */
  underConstruction?: boolean
  /** Masque le module en production ; il n'apparaît qu'en développement. */
  devOnly?: boolean
}

export interface Course {
  slug: string
  title: LocalizedText
  description: LocalizedText
  icon: LucideIcon
  color: ModuleColor
  modules: CourseModule[]
}

export const COURSES: Course[] = [
  {
    slug: 'ai-introduction',
    title: {
      fr: "Introduction à l'intelligence artificielle",
      en: 'Introduction to artificial intelligence',
    },
    description: {
      fr: "Ce qu'est l'IA, comment un modèle apprend, et où elle est réellement utilisée en médecine",
      en: 'What AI is, how a model learns, and where it is actually used in medicine',
    },
    icon: Brain,
    color: 'blue',
    modules: [
      {
        slug: 'definition',
        title: {
          fr: "Qu'est-ce que l'intelligence artificielle ?",
          en: 'What is artificial intelligence?',
        },
        description: {
          fr: "Définition, test de Turing, histoire du domaine et la distinction entre règle écrite et règle apprise",
          en: 'Definition, Turing test, history of the field and the difference between written and learned rules',
        },
        icon: Sparkles,
        color: 'blue',
        component: IaDefinitionModule,
        layout: 'article',
      },
    ],
  },
  {
    slug: 'llm',
    title: {
      fr: 'Grands modèles de langage',
      en: 'Large language models',
    },
    description: {
      fr: "Comment fonctionne un LLM, comment s'en servir, et comment poser sur lui un regard critique",
      en: 'How an LLM works, how to use it, and how to look at it critically',
    },
    icon: Languages,
    color: 'blue',
    modules: [
      {
        slug: 'fonctionnement',
        title: {
          fr: 'Comment fonctionne un grand modèle de langage ?',
          en: 'How does a large language model work?',
        },
        description: {
          fr: "Tokens, embeddings, apprentissage, température et hallucinations : ce qui se passe sous le capot",
          en: 'Tokens, embeddings, training, temperature and hallucinations: what happens under the hood',
        },
        icon: Languages,
        color: 'blue',
        component: LlmFonctionnementModule,
        layout: 'article',
      },
      {
        slug: 'usage',
        title: {
          fr: 'Utiliser un LLM : prompt, mémoire et documents',
          en: 'Using an LLM: prompt, memory and documents',
        },
        description: {
          fr: 'Consigne système, prompt engineering, mémoire de conversation, RAG, coûts et cadre de la HAS',
          en: 'System prompt, prompt engineering, conversation memory, RAG, costs and HAS guidance',
        },
        icon: Blocks,
        color: 'green',
        component: LlmUsageModule,
        layout: 'article',
      },
      {
        slug: 'chatbots',
        title: { fr: 'TD Chatbots médicaux', en: 'Tutorial: medical chatbots' },
        description: {
          fr: 'Tester plusieurs LLM sur un cas clinique, juger leurs réponses et poser un regard critique',
          en: 'Test several LLMs on a clinical case, judge their answers and think critically',
        },
        icon: Bot,
        color: 'yellow',
        component: ChatbotsModule,
      },
    ],
  },
  {
    slug: 'model-evaluation',
    title: {
      fr: 'Évaluation des modèles prédictifs',
      en: 'Evaluation of predictive models',
    },
    description: {
      fr: 'Reproductibilité, performances diagnostiques, courbe ROC et quiz interactif',
      en: 'Reproducibility, diagnostic performance, ROC curve and interactive quiz',
    },
    icon: Activity,
    color: 'green',
    modules: [
      {
        slug: 'reproducibility',
        title: { fr: 'Reproductibilité', en: 'Reproducibility' },
        description: {
          fr: 'Kappa de Cohen pour tests qualitatifs et méthode de Bland-Altman pour tests quantitatifs',
          en: "Cohen's kappa for qualitative tests and the Bland-Altman method for quantitative tests",
        },
        icon: LineChart,
        color: 'blue',
        component: ReproducibilityModule,
      },
      {
        slug: 'performance',
        title: { fr: 'Performances', en: 'Performance' },
        description: {
          fr: 'Sensibilité, spécificité, VPP, VPN, rapports de vraisemblance, courbe ROC, AUC et indice de Youden',
          en: 'Sensitivity, specificity, PPV, NPV, likelihood ratios, ROC curve, AUC and the Youden index',
        },
        icon: Target,
        color: 'green',
        component: PerformanceModule,
      },
      {
        slug: 'quiz',
        title: { fr: 'Quiz interactif', en: 'Interactive quiz' },
        description: {
          fr: 'Testez vos connaissances avec des questions interactives et calculez les indicateurs de performance',
          en: 'Test your knowledge with interactive questions and compute the performance indicators',
        },
        icon: HelpCircle,
        color: 'red',
        component: QuizModule,
      },
      {
        slug: 'sepsis',
        title: { fr: 'TD Prédire le sepsis', en: 'Tutorial: predicting sepsis' },
        description: {
          fr: "De la donnée à la décision : entraîner un modèle, lire ses performances, choisir un seuil et poser un regard critique",
          en: 'From data to decision: train a model, read its performance, choose a threshold and think critically',
        },
        icon: Stethoscope,
        // Jaune comme le TD Chatbots : les deux TD partagent la meme couleur.
        color: 'yellow',
        component: SepsisModule,
        underConstruction: true,
      },
    ],
  },
]

/** Un module `devOnly` n'est visible qu'en développement. */
export function isModuleVisible(module: CourseModule): boolean {
  return import.meta.env.DEV || !module.devOnly
}

/** Modules d'un cours visibles dans le mode d'exécution courant. */
export function visibleModules(course: Course): CourseModule[] {
  return course.modules.filter(isModuleVisible)
}

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug)
}

export function getModule(
  courseSlug: string,
  moduleSlug: string,
): { course: Course; module: CourseModule } | undefined {
  const course = getCourse(courseSlug)
  const module = course?.modules.find((m) => m.slug === moduleSlug)
  if (!course || !module || !isModuleVisible(module)) return undefined
  return { course, module }
}

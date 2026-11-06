import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MathJax } from 'better-react-mathjax'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLang, pick, type Lang } from '@/lib/useLang'

type Question = {
  id: number
  question: (lang: Lang) => string
  label: (lang: Lang) => string
  answer: number
  displayAnswer: string
  inputStep?: string
  validate: (n: number, lang: Lang) => string | null
  feedbackCorrect: (lang: Lang) => ReactNode
  feedbackIncorrect: (lang: Lang) => ReactNode
}

function Formula({ label, tex }: { label?: string; tex: string }) {
  return (
    <div className="my-2">
      {label && <p className="font-semibold text-[var(--color-foreground)]">{label}</p>}
      <MathJax dynamic>{`$$${tex}$$`}</MathJax>
    </div>
  )
}

function AmberCallout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: (lang) =>
      pick(
        lang,
        'Un nouveau test rapide pour diagnostiquer la grippe A a été évalué sur 500 patients. Voici les résultats :',
        'A new rapid test to diagnose influenza A was evaluated on 500 patients. Here are the results:',
      ),
    label: (lang) =>
      pick(
        lang,
        'Calculez la sensibilité de ce test (arrondi à 2 décimales) :',
        'Calculate the sensitivity of this test (rounded to 2 decimals):',
      ),
    answer: 0.9,
    displayAnswer: '0.9',
    validate: (n, lang) =>
      n >= 0 && n <= 1 ? null : pick(lang, 'La valeur doit être entre 0 et 1', 'The value must be between 0 and 1'),
    feedbackCorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Calcul détaillé de la sensibilité :', 'Detailed calculation of sensitivity:')}
        </p>
        <p>
          {pick(
            lang,
            'La sensibilité mesure la proportion de malades correctement identifiés par le test.',
            'Sensitivity measures the proportion of diseased patients correctly identified by the test.',
          )}
        </p>
        <Formula label={pick(lang, 'Formule :', 'Formula:')} tex={`Se = \\frac{VP}{VP + FN}`} />
        <Formula
          label={pick(lang, 'Application :', 'Application:')}
          tex={`Se = \\frac{180}{180 + 20} = \\frac{180}{200} = \\mathbf{0.90}`}
        />
        <p>
          {pick(
            lang,
            'Une sensibilité de 0.90 (soit 90%) signifie que le test détecte correctement 90% des patients atteints de grippe A.',
            'A sensitivity of 0.90 (i.e. 90%) means the test correctly detects 90% of patients with influenza A.',
          )}
        </p>
      </div>
    ),
    feedbackIncorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'La bonne réponse est : 0.9', 'The correct answer is: 0.9')}
        </p>
        <Formula
          label={pick(lang, 'Calcul détaillé :', 'Detailed calculation:')}
          tex={`Se = \\frac{180}{180 + 20} = \\frac{180}{200} = \\mathbf{0.90}`}
        />
        <p>
          {pick(
            lang,
            'La sensibilité est le rapport entre les vrais positifs et tous les malades.',
            'Sensitivity is the ratio of true positives to all diseased patients.',
          )}
        </p>
      </div>
    ),
  },
  {
    id: 2,
    question: (lang) =>
      pick(
        lang,
        'Avec les mêmes données du test rapide pour la grippe A :',
        'Using the same data from the rapid test for influenza A:',
      ),
    label: (lang) =>
      pick(
        lang,
        'Calculez la spécificité de ce test (arrondi à 2 décimales) :',
        'Calculate the specificity of this test (rounded to 2 decimals):',
      ),
    answer: 0.87,
    displayAnswer: '0.87',
    validate: (n, lang) =>
      n >= 0 && n <= 1 ? null : pick(lang, 'La valeur doit être entre 0 et 1', 'The value must be between 0 and 1'),
    feedbackCorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Calcul détaillé de la spécificité :', 'Detailed calculation of specificity:')}
        </p>
        <p>
          {pick(
            lang,
            'La spécificité mesure la proportion de personnes saines correctement identifiées par le test.',
            'Specificity measures the proportion of healthy individuals correctly identified by the test.',
          )}
        </p>
        <Formula label={pick(lang, 'Formule :', 'Formula:')} tex={`Sp = \\frac{VN}{VN + FP}`} />
        <Formula
          label={pick(lang, 'Application :', 'Application:')}
          tex={`Sp = \\frac{260}{260 + 40} = \\frac{260}{300} = 0.8667 \\approx \\mathbf{0.87}`}
        />
        <p>
          {pick(
            lang,
            'Une spécificité de 0.87 (soit 87%) signifie que le test identifie correctement 87% des personnes non atteintes de grippe A.',
            'A specificity of 0.87 (i.e. 87%) means the test correctly identifies 87% of individuals without influenza A.',
          )}
        </p>
      </div>
    ),
    feedbackIncorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'La bonne réponse est : 0.87', 'The correct answer is: 0.87')}
        </p>
        <Formula
          label={pick(lang, 'Calcul détaillé :', 'Detailed calculation:')}
          tex={`Sp = \\frac{260}{260 + 40} = \\frac{260}{300} = 0.8667 \\approx \\mathbf{0.87}`}
        />
        <p>
          {pick(
            lang,
            'La spécificité est le rapport entre les vrais négatifs et tous les sains.',
            'Specificity is the ratio of true negatives to all healthy individuals.',
          )}
        </p>
      </div>
    ),
  },
  {
    id: 3,
    question: (lang) =>
      pick(
        lang,
        'Avec les mêmes données, calculez la Valeur Prédictive Positive (VPP) :',
        'Using the same data, calculate the positive predictive value (PPV):',
      ),
    label: (lang) => pick(lang, 'VPP (arrondi à 2 décimales) :', 'PPV (rounded to 2 decimals):'),
    answer: 0.82,
    displayAnswer: '0.82',
    validate: (n, lang) =>
      n >= 0 && n <= 1 ? null : pick(lang, 'La valeur doit être entre 0 et 1', 'The value must be between 0 and 1'),
    feedbackCorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Calcul détaillé de la VPP :', 'Detailed calculation of the PPV:')}
        </p>
        <p>
          {pick(
            lang,
            "La Valeur Prédictive Positive est la probabilité d'être malade quand le test est positif.",
            'The positive predictive value is the probability of being diseased when the test is positive.',
          )}
        </p>
        <Formula label={pick(lang, 'Formule :', 'Formula:')} tex={`VPP = \\frac{VP}{VP + FP}`} />
        <Formula
          label={pick(lang, 'Application :', 'Application:')}
          tex={`VPP = \\frac{180}{180 + 40} = \\frac{180}{220} = 0.8182 \\approx \\mathbf{0.82}`}
        />
        <AmberCallout>
          {pick(
            lang,
            'La VPP dépend de la prévalence. Dans cette étude, la prévalence était de 40% (200 malades sur 500 patients).',
            'The PPV depends on the prevalence. In this study, the prevalence was 40% (200 diseased out of 500 patients).',
          )}
        </AmberCallout>
      </div>
    ),
    feedbackIncorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'La bonne réponse est : 0.82', 'The correct answer is: 0.82')}
        </p>
        <Formula
          label={pick(lang, 'Calcul détaillé :', 'Detailed calculation:')}
          tex={`VPP = \\frac{180}{180 + 40} = \\frac{180}{220} = 0.8182 \\approx \\mathbf{0.82}`}
        />
        <p>
          {pick(
            lang,
            "La VPP est la probabilité d'être malade quand le test est positif.",
            'The PPV is the probability of being diseased when the test is positive.',
          )}
        </p>
      </div>
    ),
  },
  {
    id: 4,
    question: (lang) =>
      pick(
        lang,
        'Calculez maintenant la Valeur Prédictive Négative (VPN) :',
        'Now calculate the negative predictive value (NPV):',
      ),
    label: (lang) => pick(lang, 'VPN (arrondi à 2 décimales) :', 'NPV (rounded to 2 decimals):'),
    answer: 0.93,
    displayAnswer: '0.93',
    validate: (n, lang) =>
      n >= 0 && n <= 1 ? null : pick(lang, 'La valeur doit être entre 0 et 1', 'The value must be between 0 and 1'),
    feedbackCorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Calcul détaillé de la VPN :', 'Detailed calculation of the NPV:')}
        </p>
        <p>
          {pick(
            lang,
            "La Valeur Prédictive Négative est la probabilité d'être sain quand le test est négatif.",
            'The negative predictive value is the probability of being healthy when the test is negative.',
          )}
        </p>
        <Formula label={pick(lang, 'Formule :', 'Formula:')} tex={`VPN = \\frac{VN}{VN + FN}`} />
        <Formula
          label={pick(lang, 'Application :', 'Application:')}
          tex={`VPN = \\frac{260}{260 + 20} = \\frac{260}{280} = 0.9286 \\approx \\mathbf{0.93}`}
        />
        <AmberCallout>
          {pick(
            lang,
            'Comme la VPP, la VPN dépend aussi de la prévalence de la maladie dans la population testée.',
            'Like the PPV, the NPV also depends on the prevalence of the disease in the tested population.',
          )}
        </AmberCallout>
      </div>
    ),
    feedbackIncorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'La bonne réponse est : 0.93', 'The correct answer is: 0.93')}
        </p>
        <Formula
          label={pick(lang, 'Calcul détaillé :', 'Detailed calculation:')}
          tex={`VPN = \\frac{260}{260 + 20} = \\frac{260}{280} = 0.9286 \\approx \\mathbf{0.93}`}
        />
        <p>
          {pick(
            lang,
            "La VPN est la probabilité d'être sain quand le test est négatif.",
            'The NPV is the probability of being healthy when the test is negative.',
          )}
        </p>
      </div>
    ),
  },
  {
    id: 5,
    question: (lang) =>
      pick(
        lang,
        'Calculez le Rapport de Vraisemblance Positif (RV+) :',
        'Calculate the positive likelihood ratio (LR+):',
      ),
    label: (lang) => pick(lang, 'RV+ (arrondi à 2 décimales) :', 'LR+ (rounded to 2 decimals):'),
    answer: 6.75,
    displayAnswer: '6.75',
    inputStep: '0.01',
    validate: (n, lang) =>
      n > 0 ? null : pick(lang, 'Le RV+ doit être strictement positif', 'The LR+ must be strictly positive'),
    feedbackCorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Calcul détaillé du RV+ :', 'Detailed calculation of the LR+:')}
        </p>
        <p>
          {pick(
            lang,
            "Le Rapport de Vraisemblance Positif indique combien de fois il est plus probable d'avoir un test positif chez un malade que chez un sain.",
            'The positive likelihood ratio indicates how many times more likely a positive test is in a diseased patient than in a healthy individual.',
          )}
        </p>
        <Formula label={pick(lang, 'Formule :', 'Formula:')} tex={`RV+ = \\frac{Se}{1 - Sp}`} />
        <Formula
          label={pick(lang, 'Application :', 'Application:')}
          tex={`RV+ = \\frac{0.90}{1 - 0.8667} = \\frac{0.90}{0.1333} = \\mathbf{6.75}`}
        />
        <p>
          {pick(
            lang,
            "Un RV+ de 6.75 signifie qu'un test positif est 6.75 fois plus probable chez une personne atteinte de grippe A que chez une personne saine.",
            'An LR+ of 6.75 means a positive test is 6.75 times more likely in a person with influenza A than in a healthy person.',
          )}
        </p>
      </div>
    ),
    feedbackIncorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'La bonne réponse est : 6.75', 'The correct answer is: 6.75')}
        </p>
        <Formula
          label={pick(lang, 'Calcul détaillé :', 'Detailed calculation:')}
          tex={`RV+ = \\frac{0.90}{1 - 0.8667} = \\frac{0.90}{0.1333} = \\mathbf{6.75}`}
        />
      </div>
    ),
  },
  {
    id: 6,
    question: (lang) =>
      pick(
        lang,
        'Calculez le Rapport de Vraisemblance Négatif (RV-) :',
        'Calculate the negative likelihood ratio (LR-):',
      ),
    label: (lang) => pick(lang, 'RV- (arrondi à 2 décimales) :', 'LR- (rounded to 2 decimals):'),
    answer: 0.12,
    displayAnswer: '0.12',
    validate: (n, lang) =>
      n >= 0 && n <= 1 ? null : pick(lang, 'Le RV- doit être entre 0 et 1', 'The LR- must be between 0 and 1'),
    feedbackCorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Calcul détaillé du RV- :', 'Detailed calculation of the LR-:')}
        </p>
        <p>
          {pick(
            lang,
            "Le Rapport de Vraisemblance Négatif indique combien de fois il est plus probable d'avoir un test négatif chez un malade que chez un sain.",
            'The negative likelihood ratio indicates how many times more likely a negative test is in a diseased patient than in a healthy individual.',
          )}
        </p>
        <Formula label={pick(lang, 'Formule :', 'Formula:')} tex={`RV- = \\frac{1 - Se}{Sp}`} />
        <Formula
          label={pick(lang, 'Application :', 'Application:')}
          tex={`RV- = \\frac{1 - 0.90}{0.8667} = \\frac{0.10}{0.8667} = \\mathbf{0.12}`}
        />
        <p>
          {pick(
            lang,
            "Un RV- de 0.12 (proche de 0) indique qu'un test négatif rend la maladie peu probable.",
            'An LR- of 0.12 (close to 0) indicates that a negative test makes the disease unlikely.',
          )}
        </p>
      </div>
    ),
    feedbackIncorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'La bonne réponse est : 0.12', 'The correct answer is: 0.12')}
        </p>
        <Formula
          label={pick(lang, 'Calcul détaillé :', 'Detailed calculation:')}
          tex={`RV- = \\frac{1 - 0.90}{0.8667} = \\frac{0.10}{0.8667} = \\mathbf{0.12}`}
        />
      </div>
    ),
  },
  {
    id: 7,
    question: (lang) => pick(lang, "Calculez l'indice de Youden :", "Calculate Youden's index:"),
    label: (lang) =>
      pick(lang, 'Indice de Youden (arrondi à 2 décimales) :', "Youden's index (rounded to 2 decimals):"),
    answer: 0.77,
    displayAnswer: '0.77',
    validate: (n, lang) =>
      n >= 0 && n <= 1 ? null : pick(lang, 'La valeur doit être entre 0 et 1', 'The value must be between 0 and 1'),
    feedbackCorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, "Calcul détaillé de l'indice de Youden :", "Detailed calculation of Youden's index:")}
        </p>
        <p>
          {pick(
            lang,
            "L'indice de Youden mesure la performance globale du test en combinant sensibilité et spécificité.",
            "Youden's index measures the overall performance of the test by combining sensitivity and specificity.",
          )}
        </p>
        <Formula label={pick(lang, 'Formule :', 'Formula:')} tex={`J = Se + Sp - 1`} />
        <Formula
          label={pick(lang, 'Application :', 'Application:')}
          tex={`J = 0.90 + 0.8667 - 1 = 0.7667 \\approx \\mathbf{0.77}`}
        />
        <p>
          {pick(
            lang,
            "L'indice de Youden varie de 0 (test inutile) à 1 (test parfait). Un indice de 0.77 indique un bon test diagnostique.",
            "Youden's index ranges from 0 (useless test) to 1 (perfect test). An index of 0.77 indicates a good diagnostic test.",
          )}
        </p>
      </div>
    ),
    feedbackIncorrect: (lang) => (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'La bonne réponse est : 0.77', 'The correct answer is: 0.77')}
        </p>
        <Formula
          label={pick(lang, 'Calcul détaillé :', 'Detailed calculation:')}
          tex={`J = 0.90 + 0.8667 - 1 \\approx \\mathbf{0.77}`}
        />
      </div>
    ),
  },
]

function ConfusionMatrix({ lang }: { lang: Lang }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 text-left font-medium text-[var(--color-muted-foreground)]"></th>
            <th className="border p-2 text-center font-medium">{pick(lang, 'Grippe A+', 'Influenza A+')}</th>
            <th className="border p-2 text-center font-medium">{pick(lang, 'Grippe A-', 'Influenza A-')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="border p-2 text-left font-medium">{pick(lang, 'Test +', 'Test +')}</th>
            <td className="border bg-emerald-500/10 p-2 text-center font-semibold text-emerald-700 dark:text-emerald-300">
              180
            </td>
            <td className="border bg-red-500/10 p-2 text-center font-semibold text-red-700 dark:text-red-300">
              40
            </td>
          </tr>
          <tr>
            <th className="border p-2 text-left font-medium">{pick(lang, 'Test -', 'Test -')}</th>
            <td className="border bg-red-500/10 p-2 text-center font-semibold text-red-700 dark:text-red-300">
              20
            </td>
            <td className="border bg-emerald-500/10 p-2 text-center font-semibold text-emerald-700 dark:text-emerald-300">
              260
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          'N = 500 patients · 200 malades · prévalence 40%',
          'N = 500 patients · 200 diseased · prevalence 40%',
        )}
      </p>
    </div>
  )
}

export function QuizModule() {
  const lang = useLang()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(1)
  const [score, setScore] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [answered, setAnswered] = useState<Record<number, boolean>>({})
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [values, setValues] = useState<Record<number, string>>({})

  const scrollTop = () => scrollRef.current?.scrollTo({ top: 0 })

  const q = QUESTIONS[current - 1]
  const rawValue = values[current] ?? ''
  const isAnswered = answered[current] ?? false

  const trimmed = rawValue.trim()
  const numValue = trimmed === '' ? NaN : Number(trimmed)
  const hasNumber = trimmed !== '' && !Number.isNaN(numValue)
  const validationError = hasNumber ? q.validate(numValue, lang) : null
  const canCheck = trimmed === '' || (hasNumber && validationError === null)

  const percent = showResults ? 100 : Math.round(((current - 1) / 7) * 100)

  function handleCheck() {
    if (isAnswered || !canCheck) return
    const isCorrect = hasNumber && Math.abs(numValue - q.answer) <= 0.01
    setAnswered((a) => ({ ...a, [current]: true }))
    setResults((r) => ({ ...r, [current]: isCorrect }))
    if (isCorrect) setScore((s) => s + 1)
  }

  function handleNext() {
    if (current >= 7) {
      setShowResults(true)
    } else {
      setCurrent((c) => c + 1)
    }
    scrollTop()
  }

  function handleRestart() {
    setCurrent(1)
    setScore(0)
    setShowResults(false)
    setAnswered({})
    setResults({})
    setValues({})
    scrollTop()
  }

  const resultMessage =
    score === 7
      ? pick(
          lang,
          'Parfait ! Vous maîtrisez parfaitement les calculs de performance diagnostique !',
          'Perfect! You have fully mastered diagnostic-performance calculations!',
        )
      : score >= 5
        ? pick(
            lang,
            'Très bien ! Vous avez une bonne compréhension des métriques.',
            'Very good! You have a solid understanding of the metrics.',
          )
        : score >= 3
          ? pick(
              lang,
              'Bien ! Quelques révisions et ce sera parfait.',
              'Good! A little more review and it will be perfect.',
            )
          : pick(
              lang,
              'Continuez à réviser les formules, vous allez y arriver !',
              "Keep reviewing the formulas, you'll get there!",
            )

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{pick(lang, 'Quiz interactif', 'Interactive quiz')}</h1>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            "Testez vos connaissances sur l'évaluation des modèles prédictifs",
            'Test your knowledge of predictive-model evaluation',
          )}
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          <span>
            {showResults ? pick(lang, 'Terminé', 'Completed') : pick(lang, `Question ${current} / 7`, `Question ${current} / 7`)}
          </span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {showResults ? (
        <Card>
          <CardContent className="space-y-4 text-center">
            <h2 className="text-xl font-bold tracking-tight">{pick(lang, 'Résultats du quiz', 'Quiz results')}</h2>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{score}/7</div>
            <p className="font-medium text-[var(--color-foreground)]">{resultMessage}</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                `Vous avez obtenu ${score} bonne(s) réponse(s) sur 7 questions.`,
                `You got ${score} correct answer(s) out of 7 questions.`,
              )}
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Button onClick={handleRestart}>{pick(lang, 'Recommencer le quiz', 'Restart the quiz')}</Button>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                'Utilisez le bouton de retour en haut de page pour revenir au cours.',
                'Use the back button at the top of the page to return to the course.',
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="blue">{pick(lang, `Question ${current}`, `Question ${current}`)}</Badge>
            </div>

            <p className="text-[var(--color-foreground)]">{q.question(lang)}</p>

            <ConfusionMatrix lang={lang} />

            <div className="space-y-2">
              <Label htmlFor={`q-${current}`}>{q.label(lang)}</Label>
              <Input
                id={`q-${current}`}
                type="number"
                step={q.inputStep ?? 'any'}
                value={rawValue}
                disabled={isAnswered}
                aria-invalid={validationError !== null}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [current]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCheck()
                }}
                placeholder={pick(lang, 'Votre réponse', 'Your answer')}
                className="max-w-[220px]"
              />
              {validationError && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
              )}
            </div>

            {!isAnswered && (
              <Button onClick={handleCheck} disabled={!canCheck || trimmed === ''}>
                {pick(lang, 'Vérifier', 'Check')}
              </Button>
            )}

            {isAnswered &&
              (results[current] ? (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={18} /> {pick(lang, 'Correct !', 'Correct!')}
                  </div>
                  <div className="text-[var(--color-foreground)]">{q.feedbackCorrect(lang)}</div>
                </div>
              ) : (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-300">
                    <XCircle size={18} /> {pick(lang, 'Incorrect', 'Incorrect')}
                  </div>
                  <div className="text-[var(--color-foreground)]">{q.feedbackIncorrect(lang)}</div>
                </div>
              ))}

            {isAnswered && (
              <Button variant="outline" onClick={handleNext}>
                {current >= 7
                  ? pick(lang, 'Voir les résultats', 'View results')
                  : pick(lang, 'Question suivante', 'Next question')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}

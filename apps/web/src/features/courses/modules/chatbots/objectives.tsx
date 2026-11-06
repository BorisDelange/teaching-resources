// ============================================================
// Objectifs pédagogiques et auto-évaluation.
//
// Les objectifs, larges, s'énoncent à l'introduction sans rien à cocher : ce
// sont ceux de la déclaration du TD. L'auto-évaluation, elle, décline ces
// objectifs en capacités concrètes, une par exercice, notées de 1 à 5 au début
// puis à la fin de la séance (voir objectives-store.ts).
//
// Une seule action par item : un item double (« expliquer X et Y ») ne dit
// pas quoi répondre à qui ne sait que l'une des deux.
// ============================================================

import { Check, Lock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pick, type Lang } from '@/lib/useLang'
import {
  SELF_ITEM_IDS,
  isComplete,
  refusePhase,
  setRating,
  useSelfAssessment,
  validatePhase,
  type Phase,
} from './objectives-store'

type Text = { fr: React.ReactNode; en: React.ReactNode }

const OBJECTIVES: Text[] = [
  {
    fr: (
      <>
        Identifier les mécanismes qui conduisent un chatbot à produire des{' '}
        <strong>réponses erronées</strong> (hallucinations, sources inventées, absence de sources)
      </>
    ),
    en: (
      <>
        Identify the mechanisms that lead a chatbot to produce <strong>wrong answers</strong>{' '}
        (hallucinations, invented or missing sources)
      </>
    ),
  },
  {
    fr: (
      <>
        Reconnaître les situations cliniques où l’usage d’un chatbot est{' '}
        <strong>pertinent ou risqué</strong>
      </>
    ),
    en: (
      <>
        Recognise the clinical situations where using a chatbot is <strong>appropriate or risky</strong>
      </>
    ),
  },
  {
    fr: (
      <>
        Formuler une <strong>question</strong> adaptée à un chatbot et en évaluer la réponse de
        manière critique
      </>
    ),
    en: (
      <>
        Write a suitable <strong>question</strong> for a chatbot and critically assess its answer
      </>
    ),
  },
  {
    fr: (
      <>
        Comprendre l’intérêt et les limites d’un <strong>document fourni</strong> au modèle pour
        fiabiliser ses réponses
      </>
    ),
    en: (
      <>
        Understand the value and limits of a <strong>document provided</strong> to the model to make
        its answers more reliable
      </>
    ),
  },
  {
    fr: (
      <>
        Appréhender les enjeux de <strong>confidentialité</strong> et de{' '}
        <strong>responsabilité</strong> liés à ces outils en pratique médicale
      </>
    ),
    en: (
      <>
        Grasp the <strong>confidentiality</strong> and <strong>accountability</strong> issues of these
        tools in medical practice
      </>
    ),
  },
]

// Dans l'ordre de SELF_ITEM_IDS.
const SELF_ITEMS: Text[] = [
  {
    fr: 'Repérer une erreur dans la réponse d’un chatbot en la comparant à la recommandation officielle',
    en: 'Spot an error in a chatbot’s answer by comparing it with the official guideline',
  },
  {
    fr: 'Reconnaître une référence bibliographique inventée par un chatbot',
    en: 'Recognise a bibliographic reference invented by a chatbot',
  },
  {
    fr: 'Rédiger une question qui donne au modèle le contexte clinique nécessaire',
    en: 'Write a question that gives the model the clinical context it needs',
  },
  {
    fr: 'Expliquer pourquoi la même question peut donner des réponses différentes',
    en: 'Explain why the same question can give different answers',
  },
  {
    fr: 'Expliquer ce qu’un chatbot « oublie » au fil d’une longue conversation',
    en: 'Explain what a chatbot “forgets” over a long conversation',
  },
  {
    fr: 'Vérifier qu’une réponse s’appuie réellement sur le document fourni',
    en: 'Check that an answer really relies on the document provided',
  },
  {
    fr: 'Citer les données à ne jamais saisir dans un chatbot grand public',
    en: 'Name the data never to enter into a consumer chatbot',
  },
]

// Un libellé par point : sans eux, chacun donne son propre sens à 2, 3 et 4.
const SCALE: { value: number; fr: string; en: string }[] = [
  { value: 1, fr: 'Pas du tout', en: 'Not at all' },
  { value: 2, fr: 'Un peu', en: 'A little' },
  { value: 3, fr: 'Moyennement', en: 'Moderately' },
  { value: 4, fr: 'Plutôt', en: 'Fairly' },
  { value: 5, fr: 'Tout à fait', en: 'Completely' },
]

/** L'écart début → fin d'un item, affiché une fois la fin validée. */
function Delta({ from, to }: { from: number | null; to: number | null }) {
  if (from == null || to == null) return null
  const d = to - from
  return (
    <span
      className={cn(
        'flex w-8 items-center justify-center text-xs font-medium tabular-nums',
        d > 0 && 'text-emerald-700 dark:text-emerald-400',
        d === 0 && 'text-[var(--color-muted-foreground)]',
        d < 0 && 'text-amber-700 dark:text-amber-500',
      )}
    >
      {d > 0 ? `+${d}` : d === 0 ? '=' : d}
    </span>
  )
}

export function ObjectivesList({ lang }: { lang: Lang }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {OBJECTIVES.map((o, i) => (
        <li key={i}>{pick(lang, o.fr, o.en)}</li>
      ))}
    </ul>
  )
}

export function SelfAssessment({
  lang,
  phase,
  onDone,
}: {
  lang: Lang
  phase: Phase
  /** Appelé après validation ou refus (passage à l'étape suivante). */
  onDone?: () => void
}) {
  const store = useSelfAssessment()
  const record = store[phase]
  const closed = !!record.validatedAt || !!record.refusedAt
  // La réponse du début n'apparaît qu'APRÈS validation de la fin : visible
  // pendant la notation, elle ferait noter un écart (« j'ai progressé »)
  // plutôt que le niveau du moment.
  const before =
    phase === 'end' && record.validatedAt && store.start.validatedAt ? store.start.ratings : null

  if (record.refusedAt) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          'Vous avez choisi de ne pas répondre à cette auto-évaluation.',
          'You chose not to answer this self-assessment.',
        )}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
        <span className="font-medium text-[var(--color-foreground)]">
          {pick(lang, 'Aujourd’hui, je suis capable de…', 'Today, I am able to…')}
        </span>
        {before && (
          <span>
            {pick(
              lang,
              'Entouré : votre réponse du début ; à droite, l’écart.',
              'Circled: your answer at the start; on the right, the change.',
            )}
          </span>
        )}
      </div>

      <ol className="flex flex-col divide-y rounded-md border">
        {SELF_ITEMS.map((item, i) => (
          <li
            key={SELF_ITEM_IDS[i]}
            className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="leading-snug">{pick(lang, item.fr, item.en)}</span>
            <div
              role="radiogroup"
              aria-label={pick(lang, 'Note de 1 à 5', 'Rating from 1 to 5')}
              className="flex shrink-0 gap-1"
            >
              {SCALE.map(({ value: v, fr, en }) => {
                const on = record.ratings[i] === v
                const wasBefore = before?.[i] === v
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={closed}
                    onClick={() => setRating(phase, i, v)}
                    className={cn(
                      'flex h-11 w-[5rem] flex-col items-center justify-center rounded-md border px-1.5 leading-tight transition-colors',
                      on
                        ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                        : 'text-[var(--color-muted-foreground)]',
                      !closed && !on && 'cursor-pointer hover:bg-blue-500/10',
                      closed && 'cursor-default',
                      wasBefore && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-[var(--color-card)]',
                    )}
                  >
                    <span className="text-xs font-medium tabular-nums">{v}</span>
                    <span className="text-[0.65rem]">{pick(lang, fr, en)}</span>
                  </button>
                )
              })}
              {before && <Delta from={before[i]} to={record.ratings[i]} />}
            </div>
          </li>
        ))}
      </ol>

      {closed ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          <Lock className="size-3.5" />
          {pick(lang, 'Réponses enregistrées.', 'Answers saved.')}
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              refusePhase(phase)
              onDone?.()
            }}
            className="cursor-pointer gap-1.5"
          >
            <X className="size-4" />
            {pick(lang, 'Je ne souhaite pas participer', 'I prefer not to take part')}
          </Button>
          <Button
            size="sm"
            disabled={!isComplete(record)}
            onClick={() => {
              validatePhase(phase)
              onDone?.()
            }}
            className="cursor-pointer gap-1.5"
          >
            <Check className="size-4" />
            {pick(lang, 'Valider', 'Confirm')}
          </Button>
        </div>
      )}
    </div>
  )
}

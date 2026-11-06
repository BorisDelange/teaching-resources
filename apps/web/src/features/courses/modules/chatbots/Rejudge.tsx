// ============================================================
// Rejuger l'échauffement, la recommandation sous les yeux.
//
// Deux temps, dans cet ordre et pas l'inverse :
//   1. l'étudiant rejuge chaque réponse SANS revoir ce qu'il en avait
//      pensé — sinon il s'alignerait sur son premier avis ;
//   2. le bilan confronte les deux jugements, réponse par réponse.
//
// Le second jugement, éclairé par la reco, sert de vérité de référence :
// le bilan ne repose que sur les deux avis de l'étudiant, jamais sur une
// analyse automatique de la réponse.
// On peut s'arrêter avant la fin : le bilan porte alors sur ce qui a
// été rejugé.
// ============================================================

import { useState } from 'react'
import {
  CheckCircle2,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  ShieldAlert,
  ThumbsDown,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pick, type Lang } from '@/lib/useLang'
import { tr } from './data'
import { JUDGEMENTS } from './chat-format'
import { DarkTip, JudgeBar, ModelTag } from './chat-ui'
import { Markdown } from './Markdown'
import { useAttempts, type Attempt, type Judgement } from './sandbox'
import { useStepField } from './step-state'
import { Block, Kpi } from './debrief-ui'

type Outcome = 'right' | 'trusted' | 'rejected' | 'unsure'

/**
 * Le verdict d'un essai, en comparant l'avis à l'aveugle (`before`) et
 * l'avis éclairé (`after`).
 */
function outcomeOf(before: Judgement | undefined, after: Judgement): Outcome {
  if (!before || before === 'unsure' || after === 'unsure') return 'unsure'
  if (before === after) return 'right'
  return before === 'plausible' ? 'trusted' : 'rejected'
}

const OUTCOMES: Record<
  Outcome,
  { label: { fr: string; en: string }; icon: LucideIcon; bar: string; text: string }
> = {
  right: {
    label: { fr: 'Bien jugée', en: 'Judged right' },
    icon: CheckCircle2,
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  trusted: {
    label: { fr: 'Crue à tort', en: 'Wrongly trusted' },
    icon: ShieldAlert,
    bar: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
  },
  rejected: {
    label: { fr: 'Rejetée à tort', en: 'Wrongly rejected' },
    icon: ThumbsDown,
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-500',
  },
  unsure: {
    label: { fr: 'Sans avis tranché', en: 'No clear call' },
    icon: CircleHelp,
    bar: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
  },
}

const ORDER: Outcome[] = ['right', 'trusted', 'rejected', 'unsure']

export function Rejudge({ lang }: { lang: Lang }) {
  const { attempts } = useAttempts('warmup')
  const [verdicts, setVerdicts] = useStepField('warmup', 'rejudge', {})
  const [done, setDone] = useStepField('warmup', 'rejudgeDone', false)

  if (attempts.length === 0) {
    return (
      <Block title={pick(lang, 'Rejugez vos réponses', 'Re-judge your answers')} icon={Flag} tone="blue">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'Vous n’avez fait aucun essai pendant l’échauffement. Revenez-y pour interroger un modèle et juger sa réponse : vous pourrez ensuite la rejuger ici, la recommandation en main.',
            'You made no attempts during the warm-up. Go back to it to ask a model and judge its answer: you can then re-judge it here, with the guideline in hand.',
          )}
        </p>
      </Block>
    )
  }

  const judged = Object.keys(verdicts).length
  const finished = done || attempts.every((a) => verdicts[a.id])

  return finished ? (
    <Results
      lang={lang}
      attempts={attempts.filter((a) => verdicts[a.id])}
      numberOf={(a) => attempts.indexOf(a) + 1}
      verdicts={verdicts}
      onRestart={() => {
        setVerdicts({})
        setDone(false)
      }}
    />
  ) : (
    <Judging
      lang={lang}
      attempts={attempts}
      verdicts={verdicts}
      onJudge={(id, j) => setVerdicts((v) => ({ ...v, [id]: j }))}
      onStop={judged > 0 ? () => setDone(true) : undefined}
    />
  )
}

// ---------- 1. Rejuger ----------

function Judging({
  lang,
  attempts,
  verdicts,
  onJudge,
  onStop,
}: {
  lang: Lang
  attempts: Attempt[]
  verdicts: Record<string, Judgement>
  onJudge: (id: string, j: Judgement) => void
  onStop?: () => void
}) {
  // On reprend au premier essai non rejugé : les verdicts sont
  // enregistrés, quitter la page en cours de route ne fait rien perdre.
  const firstOpen = Math.max(0, attempts.findIndex((a) => !verdicts[a.id]))
  const [cursor, setCursor] = useState<number | null>(null)
  const i = Math.min(attempts.length - 1, cursor ?? firstOpen)
  const a = attempts[i]
  const go = (n: number) => setCursor(Math.min(attempts.length - 1, Math.max(0, n)))

  return (
    <Block
      title={pick(lang, 'Rejugez vos réponses, la recommandation en main', 'Re-judge your answers, with the guideline in hand')}
      icon={Flag}
      tone="blue"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            <>
              Voici vos essais de l’échauffement. Relisez chacun et jugez-le{' '}
              <strong className="text-[var(--color-foreground)]">maintenant que vous connaissez la
              réponse</strong>. Votre premier avis reste caché : on comparera à la fin. Si vous avez
              fait beaucoup d’essais, inutile de tout reprendre : arrêtez-vous quand vous voulez.
            </>,
            <>
              Here are your warm-up attempts. Reread each one and judge it{' '}
              <strong className="text-[var(--color-foreground)]">now that you know the
              answer</strong>. Your first opinion stays hidden: we will compare at the end. If you
              made many attempts, no need to redo them all: stop whenever you like.
            </>,
          )}
        </p>

        <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <span className="font-medium tabular-nums">
            {pick(lang, 'Réponse', 'Answer')} {i + 1} / {attempts.length}
          </span>
          <div className="flex flex-1 gap-0.5">
            {attempts.map((x, k) => (
              <span
                key={x.id}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  k === i ? 'bg-blue-500' : verdicts[x.id] ? 'bg-blue-500/40' : 'bg-slate-500/15',
                )}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="mb-2 flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500 px-3.5 py-2 text-sm text-white">
              {a.prompt}
            </p>
          </div>
          <div className="mb-1.5 text-xs text-[var(--color-muted-foreground)]">
            <ModelTag lang={lang} modelId={a.modelId} />
          </div>
          <div className="max-h-80 overflow-y-auto pr-2">
            <Markdown>{a.answer}</Markdown>
          </div>
          <JudgeBar
            lang={lang}
            current={verdicts[a.id]}
            onJudge={(j) => {
              onJudge(a.id, j)
              if (i < attempts.length - 1) go(i + 1)
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={i === 0}
            onClick={() => go(i - 1)}
            className="cursor-pointer gap-1"
          >
            <ChevronLeft className="size-3.5" />
            {pick(lang, 'Précédente', 'Previous')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={i === attempts.length - 1}
            onClick={() => go(i + 1)}
            className="cursor-pointer gap-1"
          >
            {pick(lang, 'Passer', 'Skip')}
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            size="sm"
            disabled={!onStop}
            onClick={onStop}
            className="ml-auto cursor-pointer gap-1.5"
          >
            <Flag className="size-3.5" />
            {pick(lang, 'M’arrêter là et voir le bilan', 'Stop here and see the results')}
          </Button>
        </div>
      </div>
    </Block>
  )
}

// ---------- 2. Le bilan ----------

function JudgementBadge({ lang, value }: { lang: Lang; value?: Judgement }) {
  const j = JUDGEMENTS.find((x) => x.value === value)
  if (!j) {
    return (
      <span className="rounded-md border border-dashed border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
        {pick(lang, 'non jugée', 'not judged')}
      </span>
    )
  }
  const Icon = j.icon
  return (
    <span className={cn('flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', j.tone)}>
      <Icon className="size-3" />
      {tr(lang, j.label)}
    </span>
  )
}

function Results({
  lang,
  attempts,
  verdicts,
  numberOf,
  onRestart,
}: {
  lang: Lang
  attempts: Attempt[]
  verdicts: Record<string, Judgement>
  /** Le numéro de l'essai dans l'échauffement (#3), pour s'y retrouver. */
  numberOf: (a: Attempt) => number
  onRestart: () => void
}) {
  const rows = attempts.map((a) => ({
    attempt: a,
    outcome: outcomeOf(a.judgement, verdicts[a.id]),
  }))
  const count = (o: Outcome) => rows.filter((r) => r.outcome === o).length
  const total = rows.length
  const trusted = count('trusted')

  return (
    <>
    <Block
      title={pick(lang, 'Votre bilan : à l’aveugle, aviez-vous vu juste ?', 'Your results: were you right, blind?')}
      icon={Flag}
      tone="blue"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'Chaque ligne compare vos deux avis sur la même réponse : celui donné à l’aveugle, et celui donné la recommandation en main.',
            'Each row compares your two opinions on the same answer: the one given blind, and the one given with the guideline in hand.',
          )}
        </p>
        {/* La répartition en une barre : la part de chaque verdict se lit
            d'un coup d'œil, le détail vient dessous. */}
        <div className="flex flex-col gap-2">
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
            {ORDER.filter((o) => count(o) > 0).map((o) => (
              <DarkTip
                key={o}
                label={`${tr(lang, OUTCOMES[o].label)}${pick(lang, ' : ', ': ')}${count(o)} / ${total}`}
              >
                <span
                  className={cn('h-full first:rounded-l-full last:rounded-r-full', OUTCOMES[o].bar)}
                  style={{ width: `${(count(o) / total) * 100}%` }}
                />
              </DarkTip>
            ))}
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {total} {pick(lang, 'réponse(s) rejugée(s)', 'answer(s) re-judged')}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ORDER.map((o) => (
            <Kpi
              key={o}
              value={`${count(o)} / ${total}`}
              label={tr(lang, OUTCOMES[o].label)}
              icon={OUTCOMES[o].icon}
              tone={o === 'right' ? 'emerald' : o === 'trusted' ? 'red' : o === 'rejected' ? 'amber' : 'blue'}
            />
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted-foreground)]">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">{pick(lang, 'Question', 'Question')}</th>
                <th className="px-3 py-2 font-medium">{pick(lang, 'À l’aveugle', 'Blind')}</th>
                <th className="px-3 py-2 font-medium">{pick(lang, 'Avec la reco', 'With the guideline')}</th>
                <th className="px-3 py-2 font-medium">{pick(lang, 'Verdict', 'Verdict')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ attempt: a, outcome }) => {
                const O = OUTCOMES[outcome]
                const Icon = O.icon
                return (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)] tabular-nums">
                      {numberOf(a)}
                    </td>
                    <td className="max-w-64 truncate px-3 py-2 text-xs" title={a.prompt}>
                      {a.prompt}
                    </td>
                    <td className="px-3 py-2">
                      <JudgementBadge lang={lang} value={a.judgement} />
                    </td>
                    <td className="px-3 py-2">
                      <JudgementBadge lang={lang} value={verdicts[a.id]} />
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('flex items-center gap-1 text-xs font-medium', O.text)}>
                        <Icon className="size-3.5" />
                        {tr(lang, O.label)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onRestart}
          className="w-fit cursor-pointer gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          {pick(lang, 'Rejuger depuis le début', 'Re-judge from the start')}
        </Button>
      </div>
    </Block>

    <Block
      tone="emerald"
      title={
        trusted > 0
          ? pick(lang, 'Vous vous êtes fait avoir ? C’est normal.', 'Were you fooled? That’s normal.')
          : pick(lang, 'Et si vous aviez vu juste ?', 'What if you were right?')
      }
      icon={CheckCircle2}
    >
      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {lang === 'en' ? (
          <>
            {trusted > 0 ? (
              <>
                You believed {trusted === 1 ? 'a wrong answer' : `${trusted} wrong answers`}. It is
                not a lack of knowledge:{' '}
              </>
            ) : (
              <>Good, but on your clinical placement you won’t have the guideline next to you. </>
            )}
            <strong className="text-[var(--color-foreground)]">
              without knowing the answer beforehand, you are very likely to misinterpret a
              chatbot’s answer
            </strong>
            . That is the whole point of this session: learning not to trust the self-assurance of
            an answer, and to go and find the source.
          </>
        ) : (
        <>
        {trusted > 0 ? (
          <>
            Vous avez cru {trusted === 1 ? 'une réponse fausse' : `${trusted} réponses fausses`}.
            Ce n’est pas un manque de connaissances :{' '}
          </>
        ) : (
          <>Tant mieux, mais en stage vous n’aurez pas la recommandation à côté. </>
        )}
        <strong className="text-[var(--color-foreground)]">
          sans connaître la réponse en amont, on a beaucoup de risques de mal interpréter la
          réponse d’un chatbot
        </strong>
        . C’est tout le but de ce TD : apprendre à ne pas se fier à l’aplomb d’une réponse, et
        à aller chercher la source.
        </>
        )}
      </p>
    </Block>
    </>
  )
}


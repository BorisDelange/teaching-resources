import { useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, HelpCircle, Lightbulb, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLang, pick } from '@/lib/useLang'
import { questionNumber } from './question-numbers'

/**
 * L'ossature commune à tous les blocs de question.
 *
 * QCM, question ouverte et pari partagent le même patron : même icône, même
 * en-tête, même gouttière. Trois icônes différentes laissaient croire à trois
 * natures d'exercice alors qu'il s'agit toujours de la même chose — une
 * question posée à l'étudiant. Seule la couleur du liseré distingue encore le
 * registre : bleu pour ce qui se corrige, ambre pour ce qui se réfléchit,
 * vert pour ce qui se parie.
 *
 * L'icône est posée sur la LIGNE DE L'INTITULÉ, pas en haut du bloc : elle
 * s'aligne sur le texte qu'elle accompagne, et non sur un bord invisible.
 */
function QuestionShell({
  id,
  label,
  tone,
  edge,
  question,
  hint,
  children,
}: {
  id?: string
  label: ReactNode
  tone: string
  edge: string
  question: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  const n = questionNumber(id)
  return (
    <Card className={cn('border-l-4 py-0', edge)}>
      <CardContent className="p-4">
        {/* `leading-none` sur la ligne d'intitulé, et la même hauteur pour
            l'icône : les deux se calent alors sur la même ligne de base, sans
            décalage optique à corriger à la main. */}
        <div className="mb-1.5 flex items-center gap-2">
          <HelpCircle className={cn('size-4 shrink-0', tone)} />
          <span className={cn('text-xs font-medium uppercase leading-none tracking-wide', tone)}>
            {n !== undefined && <>Question {n} · </>}
            {label}
          </span>
        </div>
        {/* Tout le corps s'aligne sur le texte de l'intitulé, donc décalé de
            la largeur de l'icône plus son écart : 1rem + 0,5rem. */}
        <div className="flex flex-col gap-3 pl-6">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-[var(--color-foreground)]">{question}</p>
            {hint && <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Multiple choice question ----------

export interface QcmChoice {
  text: string
  correct?: boolean
}

export function Qcm({
  id,
  question,
  choices,
  explanation,
  multiple = false,
}: {
  /** Identifiant stable, pour la numérotation. Voir `question-numbers.ts`. */
  id?: string
  question: ReactNode
  choices: QcmChoice[]
  explanation: ReactNode
  multiple?: boolean
}) {
  const lang = useLang()
  const [picked, setPicked] = useState<number[]>([])
  const [checked, setChecked] = useState(false)

  const toggle = (i: number) => {
    if (checked) return
    if (multiple) {
      setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
    } else {
      setPicked([i])
    }
  }

  const allCorrect =
    checked &&
    choices.every((c, i) => (c.correct ? picked.includes(i) : !picked.includes(i)))

  return (
    <QuestionShell
      id={id}
      label={
        multiple
          ? pick(lang, 'Plusieurs réponses possibles', 'Several answers possible')
          : pick(lang, 'Une seule réponse', 'One answer only')
      }
      tone="text-blue-600 dark:text-blue-400"
      edge="border-l-blue-500"
      question={question}
    >
      <div className="flex flex-col gap-2">
        {choices.map((c, i) => {
          const isPicked = picked.includes(i)
          const showState = checked && (isPicked || c.correct)
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={checked}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                !checked && 'cursor-pointer',
                !checked && isPicked && 'border-blue-500 bg-blue-500/15 font-medium',
                !checked &&
                  !isPicked &&
                  'border-[var(--color-border)] hover:border-blue-500/60 hover:bg-[var(--color-accent)]',
                showState && c.correct && 'border-emerald-500 bg-emerald-500/10',
                showState && !c.correct && isPicked && 'border-red-500 bg-red-500/10',
                checked && !showState && 'border-[var(--color-border)] opacity-60',
              )}
            >
              {checked && c.correct && (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              {checked && !c.correct && isPicked && (
                <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <span className="text-[var(--color-foreground)]">{c.text}</span>
            </button>
          )
        })}
      </div>

      {!checked ? (
        <Button
          size="sm"
          className="w-fit cursor-pointer"
          disabled={picked.length === 0}
          onClick={() => setChecked(true)}
        >
          {pick(lang, 'Valider ma réponse', 'Check my answer')}
        </Button>
      ) : (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border border-l-4 p-3 text-sm',
            allCorrect
              ? 'border-emerald-500/30 border-l-emerald-500 bg-emerald-500/10'
              : 'border-amber-500/30 border-l-amber-500 bg-amber-500/10',
          )}
        >
          <Lightbulb
            className={cn(
              'mt-0.5 size-4 shrink-0',
              allCorrect
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          />
          <div className="flex flex-col gap-2">
            <span className="font-medium text-[var(--color-foreground)]">
              {allCorrect
                ? pick(lang, 'Bonne réponse !', 'Correct!')
                : pick(lang, 'Regardons ensemble.', 'Let’s look at it together.')}
            </span>
            <div className="text-[var(--color-muted-foreground)]">{explanation}</div>
            <button
              onClick={() => {
                setChecked(false)
                setPicked([])
              }}
              className="w-fit cursor-pointer text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              {pick(lang, 'Réessayer', 'Try again')}
            </button>
          </div>
        </div>
      )}
    </QuestionShell>
  )
}

// ---------- Open-ended reflection (no grading, reveals a discussion note) ----------

/**
 * Ajuste la hauteur d'une zone de texte à son contenu.
 *
 * `height = auto` avant de lire `scrollHeight` : sans cette remise à zéro, le
 * champ ne saurait que grandir — `scrollHeight` ne descend jamais en dessous de
 * la hauteur déjà fixée, et effacer des lignes laisserait le champ béant.
 *
 * Fixer `height` neutralise l'attribut `rows`, qui ne vaut plus comme hauteur
 * minimale : le plancher de trois lignes est donc posé en CSS (`min-h-20`) sur
 * l'élément lui-même.
 */
function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export function OpenQuestion({
  id,
  question,
  hint,
  reveal,
}: {
  id?: string
  question: ReactNode
  hint?: ReactNode
  reveal: ReactNode
}) {
  const lang = useLang()
  const [text, setText] = useState('')
  const [shown, setShown] = useState(false)

  return (
    <QuestionShell
      id={id}
      label={pick(lang, 'À vous de réfléchir', 'Your turn to think')}
      tone="text-amber-600 dark:text-amber-400"
      edge="border-l-amber-500"
      question={question}
      hint={hint}
    >
      {/* Le champ grandit avec ce qu'on y écrit : une réponse de dix lignes ne
          doit pas défiler dans une fenêtre de trois. `resize-none` parce que la
          hauteur est désormais calculée — laisser la poignée manuelle donnerait
          une taille que la frappe suivante écraserait. Le `ref` traite le
          premier rendu, où une valeur déjà saisie serait sinon tronquée. */}
      <textarea
        ref={autoGrow}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          autoGrow(e.currentTarget)
        }}
        placeholder={pick(
          lang,
          "Notez votre réponse ici (pour vous, avant d'en discuter en groupe)…",
          'Write your answer here (for yourself, before discussing it as a group)…',
        )}
        className="min-h-20 w-full resize-none overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-sm text-[var(--color-foreground)] outline-none focus:border-blue-500"
      />
      {/* Le bouton reste en place une fois la réponse affichée, et devient son
          inverse : sans lui, rien ne permettait de refermer l'encart pour
          reprendre sa propre réflexion. */}
      <Button
        size="sm"
        variant="outline"
        className="w-fit cursor-pointer"
        onClick={() => setShown((s) => !s)}
      >
        {shown ? (
          <>
            <EyeOff size={14} /> {pick(lang, 'Masquer les éléments de réponse', 'Hide answer elements')}
          </>
        ) : (
          <>
            <Eye size={14} /> {pick(lang, 'Voir des éléments de réponse', 'Show answer elements')}
          </>
        )}
      </Button>
      {shown && (
        <div className="flex items-start gap-2 rounded-md border border-l-4 border-blue-500/30 border-l-blue-500 bg-blue-500/10 p-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-[var(--color-muted-foreground)]">{reveal}</div>
        </div>
      )}
    </QuestionShell>
  )
}

// ---------- Predict-then-reveal (student commits to a guess before seeing the truth) ----------

export function GuessReveal({
  id,
  question,
  options,
  answerIndex,
  explanation,
}: {
  id?: string
  question: ReactNode
  options: string[]
  answerIndex: number
  explanation: ReactNode
}) {
  const lang = useLang()
  const [guess, setGuess] = useState<number | null>(null)

  return (
    <QuestionShell
      id={id}
      label={pick(lang, 'Faites un pari', 'Place your bet')}
      tone="text-emerald-600 dark:text-emerald-400"
      edge="border-l-emerald-500"
      question={question}
    >
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <button
            key={i}
            onClick={() => setGuess(i)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors',
              guess === i
                ? 'border-emerald-600 bg-emerald-600 font-medium text-white'
                : // Fond gris au survol : la seule bordure teintée se voyait
                  // à peine, et rien ne disait que la pastille se cliquait.
                  'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-emerald-500/60 hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {guess !== null && (
        <div className="flex items-start gap-2 rounded-md border border-l-4 border-blue-500/30 border-l-blue-500 bg-blue-500/10 p-3 text-sm">
          {guess === answerIndex ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="flex flex-col gap-1">
            {/* Les propositions commencent par une majuscule, mais elles sont
                reprises ici EN MILIEU de phrase : on la retire, sinon « La
                réponse était : Pas forcément changer. » ferait faute. */}
            <span className="font-medium text-[var(--color-foreground)]">
              {guess === answerIndex
                ? pick(lang, 'Vu juste.', 'Spot on.')
                : `${pick(lang, 'La réponse était : ', 'The answer was: ')}${options[answerIndex].charAt(0).toLowerCase()}${options[answerIndex].slice(1)}.`}
            </span>
            <div className="text-[var(--color-muted-foreground)]">{explanation}</div>
          </div>
        </div>
      )}
    </QuestionShell>
  )
}

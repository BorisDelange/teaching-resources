// ============================================================
// Mode hors ligne — les deux pièces d'interface qu'il ajoute au chat.
//
//   OfflineBanner  : en haut du fil, dit franchement que les réponses sont
//                    pré-enregistrées. Toujours visible : l'étudiant ne doit
//                    jamais croire qu'il interroge un modèle en direct.
//   OfflinePresets : au-dessus du champ de saisie, les questions préparées.
//                    Cliquer dépose le texte dans le champ ; c'est l'étudiant
//                    qui envoie. Le geste reste le sien, seul le choix est
//                    restreint.
//
// Le champ de saisie lui-même est verrouillé par les étapes (`readOnly`),
// pas ici : chacune sait ce qu'elle autorise.
// ============================================================

import { Check, Lock, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { tr } from './data'
import { bold } from './chat-format'
import { OFFLINE_BANNER, type OfflinePreset } from './offline-data'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Bandeau permanent : ces réponses ne sortent pas d'un appel en direct. */
export function OfflineBanner({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-500',
        className,
      )}
    >
      <WifiOff className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <span className="font-semibold">{tr(lang, OFFLINE_BANNER.title)} — </span>
        {bold(tr(lang, OFFLINE_BANNER.body))}
      </span>
    </div>
  )
}

/**
 * Les questions préparées, en pastilles.
 *
 * `done` marque celles déjà envoyées : à l'étape « La mémoire », la séquence
 * se déroule dans l'ordre, et il faut voir où l'on en est. Ailleurs, c'est
 * simplement une trace de ce qu'on a déjà essayé.
 *
 * `nextId` met en avant la question attendue quand l'ordre compte.
 *
 * `strict` durcit cela en VERROU, et pas seulement en indication. C'est le cas
 * d'une SÉQUENCE : la réponse du tour 5 a été enregistrée après les quatre
 * premiers tours, et la rejouer sur une conversation vide restituerait une
 * réponse qui n'a jamais suivi cet historique. Là où l'ordre ne change rien
 * (étape « Documents »), on laisse tout cliquable.
 */
export function OfflinePresets({
  lang,
  presets,
  onPick,
  done,
  nextId,
  disabled,
  strict = false,
}: {
  lang: Lang
  presets: OfflinePreset[]
  onPick: (text: string) => void
  done?: Set<string>
  nextId?: string | null
  disabled?: boolean
  /** Seul le tour `nextId` est cliquable ; le reste est verrouillé. */
  strict?: boolean
}) {
  if (presets.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-[var(--color-muted-foreground)]">
        {tr(lang, strict ? OFFLINE_BANNER.sequence : OFFLINE_BANNER.picker)}
      </span>
      {presets.map((p) => {
        const isDone = done?.has(p.id) ?? false
        const isNext = nextId === p.id
        const locked = strict && !isNext && !isDone
        const label = tr(lang, p.label)
        const hint = p.hint ? tr(lang, p.hint) : null

        const button = (
          <button
            key={p.id}
            type="button"
            // Un tour déjà joué reste inerte, lui aussi : le renvoyer
            // dupliquerait un tour au lieu d'avancer dans la séquence.
            disabled={disabled || locked || (strict && isDone)}
            onClick={() => onPick(tr(lang, p.text))}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              'disabled:cursor-not-allowed',
              !(disabled || locked || (strict && isDone)) && 'cursor-pointer',
              isNext
                ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                : isDone
                  ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-500'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]',
              locked ? 'opacity-45' : !isNext && !isDone && 'hover:border-blue-500/40',
              disabled && 'opacity-50',
            )}
          >
            {isDone && <Check className="mr-1 inline size-3" />}
            {locked && <Lock className="mr-1 inline size-3" />}
            {label}
          </button>
        )

        const tip = locked
          ? tr(lang, OFFLINE_BANNER.sequenceLocked)
          : strict && isDone
            ? tr(lang, OFFLINE_BANNER.sequencePlayed)
            : hint

        if (!tip) return button
        return (
          <Tooltip key={p.id}>
            {/* Un bouton désactivé n'émet aucun événement de survol : le
                déclencheur doit donc être un conteneur, pas le bouton. */}
            <TooltipTrigger asChild>
              <span className="inline-flex">{button}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs leading-relaxed">
              {tip}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

/** Message affiché quand la question envoyée n'a pas de capture. */
export function OfflineMissing({ lang }: { lang: Lang }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-500">
      <WifiOff className="mt-0.5 size-4 shrink-0" />
      {tr(lang, OFFLINE_BANNER.missing)}
    </p>
  )
}

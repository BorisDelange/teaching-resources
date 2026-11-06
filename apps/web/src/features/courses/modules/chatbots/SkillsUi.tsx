// ============================================================
// L'affichage de la progression : le badge, le panneau, le modal de niveau.
//
// Le badge vit dans la barre de navigation, entre les boutons d'étape : il
// est visible en permanence sans coûter de hauteur, et un clic ouvre la
// liste complète.
//
// Le panneau montre AUSSI ce qui reste à débloquer, avec sa condition. Cacher
// les compétences verrouillées en ferait des surprises ; les montrer en fait
// un programme — l'étudiant sait ce qu'il n'a pas encore regardé, ce qui est
// exactement le rôle d'une progression dans un TD.
// ============================================================

import { useEffect, useState } from 'react'
import { Award, Check, Lock, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr } from './data'
import { bold } from './chat-format'
import { Confetti } from './Confetti'
import { useSkills } from './skills'
import { LEVELS, SKILLS, levelFor, nextLevel } from './skills-data'

// ---------- La barre de progression, réutilisée ----------

function Bar({ count }: { count: number }) {
  const pct = (count / SKILLS.length) * 100
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
      <div
        className="h-full rounded-full bg-blue-500 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ---------- Le badge de la barre de navigation ----------

export function SkillsBadge({ lang }: { lang: Lang }) {
  const { unlocked, count, reset } = useSkills()
  const level = levelFor(count)
  const next = nextLevel(count)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 cursor-pointer gap-1.5"
          title={pick(lang, 'Votre progression', 'Your progress')}
        >
          <Award
            className={cn(
              'size-3.5 shrink-0',
              count > 0 ? 'text-amber-500' : 'text-[var(--color-muted-foreground)]',
            )}
          />
          <span className="hidden truncate font-medium sm:inline">
            {level
              ? pick(lang, `Niveau ${level.n}`, `Level ${level.n}`)
              : pick(lang, 'Progression', 'Progress')}
          </span>
          <span className="shrink-0 text-xs font-normal text-[var(--color-muted-foreground)] tabular-nums">
            {count}/{SKILLS.length}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="bottom" className="w-80 p-0">
        <div className="flex flex-col gap-2 border-b border-[var(--color-border)] p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">
              {level
                ? `${pick(lang, 'Niveau', 'Level')} ${level.n} · ${tr(lang, level.title)}`
                : pick(lang, 'Aucune compétence encore', 'No skill yet')}
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)] tabular-nums">
              {count}/{SKILLS.length}
            </span>
          </div>
          <Bar count={count} />
          {next && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {pick(lang, 'Prochain palier : ', 'Next tier: ')}
              <span className="font-medium text-[var(--color-foreground)]">
                {tr(lang, next.title)}
              </span>
              {pick(lang, ` — ${next.at - count} de plus`, ` — ${next.at - count} more`)}
            </p>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {SKILLS.map((s) => {
            const on = unlocked.has(s.id)
            const Icon = s.icon
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-md px-2 py-1.5',
                  !on && 'opacity-60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                    on ? 'bg-emerald-500/15 text-emerald-600' : 'bg-[var(--color-muted)]',
                  )}
                >
                  {on ? (
                    <Check className="size-3" />
                  ) : (
                    <Lock className="size-2.5 text-[var(--color-muted-foreground)]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <Icon className="size-3 shrink-0 text-[var(--color-muted-foreground)]" />
                    {tr(lang, s.label)}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
                    {/* Débloquée : ce qu'on a constaté. Verrouillée : ce qu'il
                        faut faire. La condition est annoncée, jamais devinée. */}
                    {on ? bold(tr(lang, s.insight)) : tr(lang, s.requirement)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>

        {count > 0 && (
          <div className="border-t border-[var(--color-border)] p-1.5">
            <button
              onClick={reset}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
            >
              <RotateCcw className="size-3" />
              {pick(lang, 'Remettre la progression à zéro', 'Reset progress')}
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------- Le modal de passage de niveau ----------

export function LevelDialog({
  lang,
  level,
  count,
  onClose,
}: {
  lang: Lang
  /** Numéro du palier atteint, ou null quand il n'y a rien à fêter. */
  level: number | null
  count: number
  onClose: () => void
}) {
  /**
   * Les confettis s'arrêtent d'eux-mêmes après la chute : les laisser tourner
   * derrière un modal resté ouvert mangerait la batterie pour rien. On les
   * retire donc au bout du compte, sans les allumer par un état — leur
   * présence est déjà décidée par `level`.
   */
  const [done, setDone] = useState(false)
  const meta = LEVELS.find((l) => l.n === level) ?? null

  useEffect(() => {
    if (level === null) return
    const t = setTimeout(() => setDone(true), 4200)
    return () => {
      clearTimeout(t)
      setDone(false)
    }
  }, [level])

  if (!meta) return null

  const confetti = !done

  return (
    <>
      {confetti && <Confetti />}
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-amber-500/15">
                <Award className="size-5 text-amber-500" />
              </span>
              <div>
                <DialogTitle className="text-base">
                  {pick(lang, `Niveau ${meta.n} atteint`, `Level ${meta.n} reached`)}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {tr(lang, meta.title)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {tr(lang, meta.blurb)}
          </p>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-xs text-[var(--color-muted-foreground)]">
              <span>{pick(lang, 'Compétences', 'Skills')}</span>
              <span className="tabular-nums">
                {count}/{SKILLS.length}
              </span>
            </div>
            <Bar count={count} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button size="sm" className="cursor-pointer gap-1.5">
                <Sparkles className="size-3.5" />
                {pick(lang, 'Continuer', 'Continue')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

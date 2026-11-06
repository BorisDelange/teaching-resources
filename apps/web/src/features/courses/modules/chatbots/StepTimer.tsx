// ============================================================
// Le minuteur de la barre de navigation : temps restant sur l'étape.
//
// Une fois le budget dépassé, il ne s'arrête pas : il affiche le
// dépassement en rouge (« +01:20 »). Couper net un exercice n'est pas son
// rôle ; dire qu'il est temps de passer à la suite, si.
// ============================================================

import { useEffect } from 'react'
import { Pause, Play, RotateCcw, Timer, TimerReset } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { pick, type Lang } from '@/lib/useLang'
import { DARK_TIP } from './chat-ui'
import { useSettings } from './settings'
import { TIMED_STEPS } from './steps'
import { budgetMs, enterStep, formatClock, resetAllTimers, useStepTimer } from './timer'

/** Un horaire de séance : « 0h35 ». */
function hourMark(ms: number) {
  const min = Math.round(ms / 60_000)
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

export function StepTimer({ lang, stepId }: { lang: Lang; stepId: string }) {
  const [settings] = useSettings()
  const budget = settings.timerEnabled ? budgetMs(settings, stepId) : 0
  const { elapsed, totalElapsed, running, pause, resume, reset } = useStepTimer(stepId)

  // Où l'étape se situe dans la séance : son créneau prévu, et la durée totale.
  const budgets = TIMED_STEPS.map((s) => (settings.timerEnabled ? budgetMs(settings, s.id) : 0))
  const index = TIMED_STEPS.findIndex((s) => s.id === stepId)
  const slotStart = budgets.slice(0, Math.max(0, index)).reduce((a, b) => a + b, 0)
  const sessionBudget = budgets.reduce((a, b) => a + b, 0)

  useEffect(() => {
    enterStep(stepId, budget > 0)
  }, [stepId, budget])

  if (budget <= 0) return null

  const remaining = budget - elapsed
  const over = remaining < 0
  const tone = over
    ? 'text-red-600 dark:text-red-400'
    : remaining < 60_000
      ? 'text-amber-600 dark:text-amber-500'
      : 'text-[var(--color-foreground)]'

  const iconButton =
    'flex size-6 cursor-pointer items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]'
  const pauseLabel = running ? pick(lang, 'Pause', 'Pause') : pick(lang, 'Reprendre', 'Resume')
  const resetLabel = pick(lang, 'Remettre à zéro', 'Reset')

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5',
        over ? 'border-red-500/40 bg-red-500/5' : 'border-[var(--color-border)]',
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex cursor-default items-center gap-0.5">
            <Timer className={cn('size-3.5 shrink-0', tone, running && !over && 'animate-pulse')} />
            <span className={cn('min-w-[3.25rem] text-center font-mono text-xs tabular-nums', tone)}>
              {over ? '+' : ''}
              {formatClock(remaining)}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className={DARK_TIP}>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
            <dt className="text-white/60">{pick(lang, 'Cette étape', 'This step')}</dt>
            <dd className="text-right font-mono tabular-nums">
              {formatClock(elapsed)} / {formatClock(budget)}
            </dd>
            <dt className="text-white/60">{pick(lang, 'Séance', 'Session')}</dt>
            <dd className="text-right font-mono tabular-nums">
              {formatClock(totalElapsed)} / {formatClock(sessionBudget)}
            </dd>
            {index >= 0 && (
              <>
                <dt className="text-white/60">{pick(lang, 'Créneau prévu', 'Planned slot')}</dt>
                <dd className="text-right font-mono tabular-nums">
                  {hourMark(slotStart)} → {hourMark(slotStart + budget)}
                </dd>
              </>
            )}
          </dl>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={running ? pause : resume}
            className={iconButton}
            aria-label={pauseLabel}
          >
            {running ? <Pause className="size-3" /> : <Play className="size-3" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className={DARK_TIP}>
          {pauseLabel}
        </TooltipContent>
      </Tooltip>
      {/* Deux remises à zéro possibles : un menu plutôt que deux icônes
          presque identiques côte à côte. */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" className={iconButton} aria-label={resetLabel}>
                <RotateCcw className="size-3" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className={DARK_TIP}>
            {resetLabel}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onSelect={reset} className="cursor-pointer gap-2">
            <RotateCcw className="size-3.5" />
            {pick(lang, 'Remettre l’étape à zéro', 'Reset this step')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={resetAllTimers} className="cursor-pointer gap-2">
            <TimerReset className="size-3.5" />
            {pick(lang, 'Remettre toute la séance à zéro', 'Reset the whole session')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

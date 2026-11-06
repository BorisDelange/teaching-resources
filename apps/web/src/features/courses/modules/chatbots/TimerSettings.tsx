// ============================================================
// Réglage du minuteur : le temps alloué à chaque étape de la séance.
//
// Les valeurs d'origine tiennent en 1 h 50. Le total est recalculé sous
// les yeux du formateur, pour qu'un ajout de cinq minutes à un exercice
// se voie immédiatement sur la durée de la séance.
// ============================================================

import { RotateCcw, TimerReset } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pick, type Lang } from '@/lib/useLang'
import { useSettings } from './settings'
import { DEFAULT_TIMER_MINUTES, TIMED_STEPS, stepLabel, type StepId } from './steps'
import { resetAllTimers, stepMinutes } from './timer'

const DEFAULT_TOTAL = Object.values(DEFAULT_TIMER_MINUTES).reduce((a, b) => a + (b ?? 0), 0)

export function TimerSettings({ lang }: { lang: Lang }) {
  const [settings, update] = useSettings()
  const total = TIMED_STEPS.reduce((sum, s) => sum + stepMinutes(settings, s.id), 0)
  const isDefault = settings.timerMinutes === null

  function setMinutes(id: StepId, value: number) {
    update({
      timerMinutes: {
        ...(settings.timerMinutes ?? DEFAULT_TIMER_MINUTES),
        [id]: Math.max(0, Math.min(180, Math.round(value))),
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={settings.timerEnabled}
          onChange={(e) => update({ timerEnabled: e.target.checked })}
          className="mt-0.5 cursor-pointer"
        />
        <span>
          <span className="font-medium">
            {pick(lang, 'Afficher le minuteur', 'Show the timer')}
          </span>
          <span className="block text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              'Un compte à rebours par étape, à gauche du menu des exercices. Il démarre à l’arrivée sur l’étape ; l’étudiant peut le mettre en pause ou le remettre à zéro. Une étape à 0 minute n’a pas de minuteur.',
              'A countdown per step, left of the exercise menu. It starts on arriving at the step; students can pause or reset it. A step set to 0 minutes has no timer.',
            )}
          </span>
        </span>
      </label>

      <div
        className={cn(
          'flex flex-col gap-1 border-t border-[var(--color-border)] pt-3',
          !settings.timerEnabled && 'opacity-50',
        )}
      >
        {TIMED_STEPS.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.id} className="flex items-center gap-2 py-0.5">
              <Icon className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className={cn('flex-1 text-xs', 'debrief' in s && 'text-blue-600 dark:text-blue-300')}>
                {stepLabel(lang, s)}
              </span>
              <input
                type="number"
                min={0}
                max={180}
                value={stepMinutes(settings, s.id)}
                disabled={!settings.timerEnabled}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v)) setMinutes(s.id, v)
                }}
                className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] py-1 pr-1.5 pl-2 text-xs tabular-nums outline-none focus:border-blue-500 [&::-webkit-inner-spin-button]:ml-2"
              />
              <span className="w-7 text-xs text-[var(--color-muted-foreground)]">min</span>
            </div>
          )
        })}
        <div className="mt-1 flex items-center gap-2 border-t border-[var(--color-border)] pt-2 text-xs font-medium">
          <span className="flex-1">{pick(lang, 'Durée totale', 'Total duration')}</span>
          <span
            className={cn(
              'tabular-nums',
              total > DEFAULT_TOTAL && 'text-amber-600 dark:text-amber-500',
            )}
          >
            {Math.floor(total / 60)} h {String(total % 60).padStart(2, '0')}
          </span>
          <span className="w-7" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
        <Button
          size="sm"
          variant="outline"
          disabled={isDefault}
          onClick={() => update({ timerMinutes: null })}
          className="cursor-pointer gap-1.5 text-xs"
        >
          <RotateCcw className="size-3" />
          {pick(lang, 'Durées d’origine (1 h 50)', 'Original durations (1 h 50)')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetAllTimers}
          className="cursor-pointer gap-1.5 text-xs"
          title={pick(
            lang,
            'Remet tous les comptes à rebours de ce poste à leur durée pleine',
            'Resets every countdown on this device to its full duration',
          )}
        >
          <TimerReset className="size-3" />
          {pick(lang, 'Remettre la séance à zéro', 'Reset the session')}
        </Button>
      </div>
    </div>
  )
}

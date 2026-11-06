/**
 * Supprimer les patients incomplets — et voir la cohorte se déformer.
 *
 * L'argument du TD ne tient pas si l'étudiant croit qu'il perd « seulement »
 * des effectifs. Ce qu'il perd est bien pire : il garde les patients les plus
 * explorés, donc les plus malades. Le calcul se fait sur NOTRE cohorte, en
 * direct, parce qu'un chiffre trouvé soi-même se retient.
 */

import { useMemo, useState } from 'react'
import { Users, TrendingDown } from 'lucide-react'
import { COHORT, type Patient } from './cohort'
import { VARIABLES, varText, type FeatureKey } from './variables'
import { useLang, pick } from '@/lib/useLang'
import { pillClass } from './styles'
import { cn } from '@/lib/utils'

/** Les variables qu'on peut exiger complètes, de la plus à la moins courante. */
const REQUIRABLE: FeatureKey[] = ['hr', 'resp', 'creatinine', 'wbc', 'platelets', 'lactate']

function rate(patients: Patient[]) {
  if (patients.length === 0) return 0
  return (patients.filter((p) => p.sepsis === 1).length / patients.length) * 100
}

export function CompleteCaseDemo() {
  const lang = useLang()
  const pct = (x: number, d: number) => `${x.toFixed(d)}${pick(lang, ' %', '%')}`
  const [required, setRequired] = useState<FeatureKey[]>([])

  const kept = useMemo(
    () => COHORT.filter((p) => required.every((k) => p[k] != null)),
    [required],
  )

  const baseRate = useMemo(() => rate(COHORT), [])
  const keptRate = rate(kept)
  const lost = COHORT.length - kept.length
  const lostPct = (lost / COHORT.length) * 100

  const toggle = (k: FeatureKey) =>
    setRequired((r) => (r.includes(k) ? r.filter((x) => x !== k) : [...r, k]))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            L'autre solution consiste à <strong>ne garder que les patients complets</strong>. Cochez les
            variables que vous exigez, et regardez ce qu'il reste de la cohorte.
          </>,
          <>
            The other option is to <strong>keep only complete patients</strong>. Tick the variables
            you require, and see what is left of the cohort.
          </>,
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {REQUIRABLE.map((k) => {
          const meta = VARIABLES.find((v) => v.key === k)!
          return (
            <button key={k} onClick={() => toggle(k)} className={pillClass(required.includes(k))}>
              {varText(meta, lang).label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Users className="size-3.5" /> {pick(lang, 'Patients restants', 'Patients remaining')}
          </span>
          <span className="text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
            {kept.length}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {pick(lang, `sur ${COHORT.length} au départ`, `out of ${COHORT.length} initially`)}
          </span>
        </div>

        <div
          className={cn(
            'flex flex-col gap-0.5 rounded-lg border p-3',
            lostPct > 40
              ? 'border-red-500/40 bg-red-500/5'
              : lostPct > 0
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-[var(--color-border)] bg-[var(--color-card)]',
          )}
        >
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <TrendingDown className="size-3.5" /> {pick(lang, 'Patients exclus', 'Patients excluded')}
          </span>
          <span
            className={cn(
              'text-2xl font-bold tabular-nums',
              lostPct > 40
                ? 'text-red-600 dark:text-red-400'
                : lostPct > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-[var(--color-foreground)]',
            )}
          >
            {pct(lostPct, 0)}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">{pick(lang, `${lost} patients perdus`, `${lost} patients lost`)}</span>
        </div>

        {/* Le chiffre qui porte tout : le taux de sepsis de la cohorte
            survivante. S'il s'éloigne du taux de départ, la population étudiée
            n'est plus celle qu'on voulait étudier. */}
        <div
          className={cn(
            'flex flex-col gap-0.5 rounded-lg border p-3',
            Math.abs(keptRate - baseRate) > 3
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-[var(--color-border)] bg-[var(--color-card)]',
          )}
        >
          <span className="text-xs text-[var(--color-muted-foreground)]">{pick(lang, 'Taux de sepsis', 'Sepsis rate')}</span>
          <span
            className={cn(
              'text-2xl font-bold tabular-nums',
              Math.abs(keptRate - baseRate) > 3
                ? 'text-red-600 dark:text-red-400'
                : 'text-[var(--color-foreground)]',
            )}
          >
            {kept.length === 0 ? '—' : pct(keptRate, 1)}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {pick(lang, `contre ${pct(baseRate, 1)} au départ`, `versus ${pct(baseRate, 1)} initially`)}
          </span>
        </div>
      </div>

      {required.length > 0 && kept.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-[var(--color-muted-foreground)]">
          {Math.abs(keptRate - baseRate) > 3 ? (
            lang === 'en' ? (
              <>
                The sepsis rate went from <strong>{pct(baseRate, 1)}</strong> to{' '}
                <strong>{pct(keptRate, 1)}</strong>. This is no accident: we required a test that is
                only ordered for patients <strong>who cause concern</strong>. By requiring this
                measurement, we selected the sickest patients — the cohort no longer represents
                patients admitted to the ICU.
              </>
            ) : (
            <>
              Le taux de sepsis est passé de <strong>{baseRate.toFixed(1)} %</strong> à{' '}
              <strong>{keptRate.toFixed(1)} %</strong>. Ce n'est pas un hasard : on a demandé un
              bilan qu'on ne prescrit qu'aux patients <strong>qui inquiètent</strong>. En exigeant
              cette mesure, on a donc sélectionné les patients les plus graves — la cohorte n'est
              plus représentative des patients admis en réanimation.
            </>
            )
          ) : lang === 'en' ? (
            <>
              Few patients lost and an almost unchanged sepsis rate: this requirement costs little.
              Now try adding <strong>lactate</strong>.
            </>
          ) : (
            <>
              Peu de patients perdus et un taux de sepsis quasi inchangé : cette exigence-là coûte
              peu. Essayez maintenant d'ajouter le <strong>lactate</strong>.
            </>
          )}
        </div>
      )}
    </div>
  )
}

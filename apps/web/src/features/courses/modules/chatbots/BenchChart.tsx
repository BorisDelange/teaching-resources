// ============================================================
// Vue comparative du benchmark — les huit modèles sur un écran.
//
// La liste dépliante répond à « que vaut CE modèle ». Elle répond mal à
// « lequel choisir », qui demande de comparer des hauteurs entre lignes
// éloignées. D'où ces deux graphiques, en SVG plutôt qu'en Plotly : on
// affiche 24 barres sans interaction, et charger une librairie de tracé
// pour cela alourdirait la page du TD sans rien apporter.
// ============================================================

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { paramsLabel, tr } from './data'
import {
  BENCH,
  CONDITIONS,
  KLASS_META,
  type BenchModel,
  type ConditionId,
  type Klass,
} from './bench-data'

/** Les mêmes couleurs que les barres de la liste : une seule grammaire. */
const FILL: Record<ConditionId, string> = {
  raw: 'fill-slate-400',
  prompt: 'fill-blue-500',
  rag: 'fill-emerald-500',
}

const DOT: Record<ConditionId, string> = {
  raw: 'bg-slate-400',
  prompt: 'bg-blue-500',
  rag: 'bg-emerald-500',
}

const KLASS_TEXT: Record<Klass, string> = {
  climber: 'text-emerald-700 dark:text-emerald-400',
  ceiling: 'text-blue-700 dark:text-blue-400',
  floor: 'text-red-700 dark:text-red-400',
  unstable: 'text-amber-700 dark:text-amber-400',
  flat: 'text-[var(--color-muted-foreground)]',
}

// Géométrie du tracé. Tout est en unités SVG, le conteneur se charge de
// la mise à l'échelle : la page reste lisible sur un téléphone comme au
// vidéoprojecteur.
const ROW_H = 34
const BAR_H = 8
const BAR_GAP = 2
const LABEL_W = 116
const PAD_R = 30
const PLOT_W = 300

/**
 * Trois barres par modèle, une par condition.
 *
 * L'ordre brut → prompt → RAG est celui du TD : une marche d'escalier qui
 * monte se lit d'un coup d'œil, une barre déjà haute en brut aussi.
 */
function GroupedBars({ lang, models }: { lang: Lang; models: BenchModel[] }) {
  const height = models.length * ROW_H + 24
  const width = LABEL_W + PLOT_W + PAD_R

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: height * 1.05 }}
      role="img"
      aria-label={
        lang === 'en'
          ? 'Score of each model in the three conditions'
          : 'Score de chaque modèle dans les trois conditions'
      }
    >
      {/* Repères vides à 50 et 100 : sans eux, une barre longue ne se
          rapporte à aucune échelle et seule la comparaison relative reste. */}
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line
            x1={LABEL_W + (t / 100) * PLOT_W}
            x2={LABEL_W + (t / 100) * PLOT_W}
            y1={8}
            y2={height - 18}
            className="stroke-[var(--color-border)]"
            strokeWidth={t === 0 || t === 100 ? 1 : 0.5}
            strokeDasharray={t === 0 || t === 100 ? undefined : '2 3'}
          />
          <text
            x={LABEL_W + (t / 100) * PLOT_W}
            y={height - 6}
            textAnchor="middle"
            className="fill-[var(--color-muted-foreground)] text-[8px] tabular-nums"
          >
            {t}
          </text>
        </g>
      ))}

      {models.map((m, i) => {
        const top = 10 + i * ROW_H
        return (
          <g key={m.id}>
            <text
              x={LABEL_W - 8}
              y={top + 14}
              textAnchor="end"
              className="fill-[var(--color-foreground)] text-[9px] font-medium"
            >
              {m.name}
            </text>
            <text
              x={LABEL_W - 8}
              y={top + 24}
              textAnchor="end"
              className="fill-[var(--color-muted-foreground)] text-[8px]"
            >
              {paramsLabel(lang, m.params)}
            </text>

            {CONDITIONS.map((c, j) => {
              const stat = m[c.id]
              const y = top + j * (BAR_H + BAR_GAP)
              const w = (stat.mean / 100) * PLOT_W
              const spread = stat.max - stat.min
              return (
                <g key={c.id}>
                  {/* L'étendue des tirages, en aplat pâle DERRIÈRE la barre
                      plutôt qu'en trait par-dessus : le trait dépassait du
                      bout de la barre et se lisait comme une bavure. Ici la
                      zone incertaine se voit sans ajouter de trait. */}
                  {stat.n > 1 && spread > 0 && (
                    <rect
                      x={LABEL_W + (stat.min / 100) * PLOT_W}
                      y={y}
                      width={Math.max(((stat.max - stat.min) / 100) * PLOT_W, 1)}
                      height={BAR_H}
                      rx={1.5}
                      className={cn(FILL[c.id], 'opacity-25')}
                    />
                  )}
                  <rect
                    x={LABEL_W}
                    y={y}
                    width={Math.max(w, 1)}
                    height={BAR_H}
                    rx={1.5}
                    className={FILL[c.id]}
                  />
                  <text
                    x={
                      LABEL_W +
                      Math.max(w, (stat.n > 1 ? (stat.max / 100) * PLOT_W : 0), 1) +
                      4
                    }
                    y={y + BAR_H - 1}
                    className="fill-[var(--color-muted-foreground)] text-[8px] tabular-nums"
                  >
                    {stat.mean}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Le gain, isolé sur un axe.
 *
 * C'est la mesure qui décide du choix : l'écart entre la question brute et
 * la réponse documentée. Un modèle peut être excellent partout et ne rien
 * démontrer ; ce graphique-là le rend impossible à confondre.
 */
function GainBars({ lang, models }: { lang: Lang; models: BenchModel[] }) {
  const ranked = useMemo(() => [...models].sort((a, b) => b.gain - a.gain), [models])
  const max = Math.max(60, ...ranked.map((m) => Math.abs(m.gain)))

  return (
    <ul className="space-y-1.5">
      {ranked.map((m) => {
        const meta = KLASS_META[m.klass]
        return (
          <li key={m.id} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate text-[11px] text-[var(--color-foreground)]">
              {m.name}
            </span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-[var(--color-muted)]">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-sm',
                  m.gain >= 0 ? 'bg-emerald-500' : 'bg-red-500',
                )}
                style={{ width: `${(Math.abs(m.gain) / max) * 100}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--color-foreground)]">
              {m.gain > 0 ? '+' : ''}
              {m.gain}
            </span>
            <span className={cn('w-36 shrink-0 text-[10px]', KLASS_TEXT[m.klass])}>
              {tr(lang, meta.label)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function BenchChart({ lang, models }: { lang: Lang; models: BenchModel[] }) {
  // L'ordre du graphique suit la taille, pas la classe : c'est la seule vue
  // où l'on cherche à savoir si « plus gros » veut dire « meilleur ». La
  // réponse est non, et elle doit se voir.
  const bySize = useMemo(
    // Une taille non publiée va en fin de liste : la placer en tête la ferait
    // passer pour le plus petit modèle.
    () => [...models].sort((a, b) => (a.billions ?? Infinity) - (b.billions ?? Infinity)),
    [models],
  )

  if (models.length === 0) return null

  return (
    <div className="space-y-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <h4 className="text-xs font-semibold text-[var(--color-foreground)]">
            {lang === 'en' ? 'Score by condition' : 'Score par condition'}
          </h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {CONDITIONS.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', DOT[c.id])} />
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {tr(lang, c.label)}
                </span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-slate-400/25" />
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {lang === 'en' ? 'spread across runs' : 'étendue des tirages'}
              </span>
            </span>
          </div>
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
          {lang === 'en'
            ? 'Models ordered by size, smallest first. Three ascending bars: the model errs, then corrects itself with the prompt and the sources. Size predicts the result far less than one expects.'
            : 'Modèles rangés par taille, du plus petit au plus gros. Trois barres qui montent : le modèle se trompe, puis se corrige avec le prompt et les sources. La taille prédit le résultat bien moins qu’on ne le croit.'}
        </p>
        <GroupedBars lang={lang} models={bySize} />
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <h4 className="mb-1 text-xs font-semibold text-[var(--color-foreground)]">
          {lang === 'en'
            ? 'Gain from raw prompt to documents'
            : 'Gain du prompt brut aux documents'}
        </h4>
        <p className="mb-2.5 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
          {lang === 'en'
            ? 'What the prompt and the documents add to the model alone: the taller the bar, the more the answer depends on how the question is asked.'
            : 'Ce que le prompt et les documents ajoutent au modèle seul : plus la barre est haute, plus la réponse dépend de la façon de poser la question.'}
        </p>
        <GainBars lang={lang} models={models} />
      </div>

      <p className="text-[10px] text-[var(--color-muted-foreground)]">
        {lang === 'en'
          ? `${models.length} model(s) shown, out of ${BENCH.models.length} measured.`
          : `${models.length} modèle(s) affiché(s), sur ${BENCH.models.length} mesurés.`}
      </p>
    </div>
  )
}

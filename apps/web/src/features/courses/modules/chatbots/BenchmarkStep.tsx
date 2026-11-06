// ============================================================
// Étape « Benchmark » — quel modèle choisir pour animer ce TD.
//
// Page destinée aux ENSEIGNANTS (comme « Réglages », juste avant elle) :
// une autre faculté doit pouvoir y lire, sans relancer quoi que ce soit,
// comment chaque modèle se comporte d'un palier à l'autre.
//
// Les profils (`Klass`) servent à choisir les modèles à montrer côte à côte :
// l'étudiant doit voir que la qualité se joue au niveau du modèle, du prompt
// ET des sources.
// ============================================================

import { useMemo, useState } from 'react'
import {
  BarChart3,
  ChevronDown,
  FlaskConical,
  ListFilter,
  Rows3,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { Callout, SectionTitle } from '@/features/courses/modules/sepsis/ui'
import { paramsLabel, tr } from './data'
import { BenchDetailDialog } from './BenchDetailDialog'
import { BenchChart } from './BenchChart'
import {
  BENCH,
  CONDITIONS,
  CRITERIA,
  applies,
  MAX_SCORE,
  KLASS_META,
  klassOrder,
  matchesQuery,
  ARCH_META,
  SIZE_META,
  countActive,
  emptyFilters,
  passesFilters,
  type Arch,
  type BenchFilters,
  type BenchModel,
  type SizeBand,
  type ConditionId,
  type ConditionStat,
  type Klass,
} from './bench-data'

const KLASS_TONE: Record<Klass, string> = {
  climber: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ceiling: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  floor: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  unstable: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  flat: 'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
}

const BAR_TONE: Record<ConditionId, string> = {
  raw: 'bg-slate-400',
  prompt: 'bg-blue-500',
  rag: 'bg-emerald-500',
}

/** Une barre de score, avec l'étendue des tirages quand il y en a plusieurs. */
function ScoreBar({ stat, condition }: { stat: ConditionStat; condition: ConditionId }) {
  const spread = stat.max - stat.min
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full', BAR_TONE[condition])}
          style={{ width: `${stat.mean}%` }}
        />
        {/* L'étendue des tirages : sans elle, une moyenne de 60 issue de
            deux réponses à 30 et 90 se lirait comme un résultat stable. */}
        {stat.n > 1 && spread > 0 && (
          <div
            className="absolute inset-y-0 border-x border-[var(--color-foreground)]/35"
            style={{ left: `${stat.min}%`, width: `${spread}%` }}
          />
        )}
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-[var(--color-muted-foreground)]">
        {stat.mean}
        {stat.n > 1 && spread > 0 && <span className="opacity-60">±{Math.round(spread / 2)}</span>}
      </span>
    </div>
  )
}

/**
 * La bascule graphique / liste.
 *
 * Le graphique est la vue par défaut : la première question d'une faculté
 * qui découvre la page est « lequel prendre », et elle se tranche en
 * comparant des hauteurs. La liste, elle, sert quand le choix est fait et
 * qu'on veut lire les tirages d'un modèle précis.
 */
function ViewToggle({
  lang,
  view,
  setView,
}: {
  lang: Lang
  view: 'chart' | 'list'
  setView: (v: 'chart' | 'list') => void
}) {
  const options = [
    {
      id: 'chart' as const,
      icon: BarChart3,
      label: lang === 'en' ? 'Chart' : 'Graphique',
    },
    {
      id: 'list' as const,
      icon: Rows3,
      label: lang === 'en' ? 'Detail' : 'Détail',
    },
  ]

  return (
    <div
      role="group"
      aria-label={lang === 'en' ? 'Display' : 'Affichage'}
      className="inline-flex h-8 shrink-0 items-center rounded-md border border-[var(--color-border)] p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setView(o.id)}
          aria-pressed={view === o.id}
          className={cn(
            'inline-flex h-full cursor-pointer items-center gap-1.5 rounded-[5px] px-2 text-xs font-medium',
            view === o.id
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
              : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
          )}
        >
          <o.icon className="size-3.5" />
          <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Le menu de filtres.
 *
 * Cases à cocher plutôt que sélection unique : on compose souvent une
 * sélection de plusieurs profils à montrer côte à côte, pas une seule classe. Un groupe vide ne filtre rien.
 */
function FilterMenu({
  lang,
  filters,
  setFilters,
}: {
  lang: Lang
  filters: BenchFilters
  setFilters: (f: BenchFilters) => void
}) {
  const active = countActive(filters)

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium',
            active > 0
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400'
              : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
          )}
        >
          <ListFilter className="size-3.5" />
          {lang === 'en' ? 'Filters' : 'Filtres'}
          {active > 0 && (
            <span className="rounded-full bg-blue-500/20 px-1.5 text-[10px] tabular-nums">
              {active}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">
          {lang === 'en' ? 'Usefulness for the tutorial' : 'Utilité pour le TD'}
        </DropdownMenuLabel>
        {(Object.keys(KLASS_META) as Klass[]).map((k) => (
          <DropdownMenuCheckboxItem
            key={k}
            checked={filters.klass.has(k)}
            onCheckedChange={() => setFilters({ ...filters, klass: toggle(filters.klass, k) })}
            onSelect={(e) => e.preventDefault()}
            className="text-xs"
          >
            {/* Le même badge que dans la liste : on reconnaît la classe à
                sa couleur avant de la lire. */}
            <span
              className={cn('rounded-full border px-1.5 py-px text-[11px] font-medium', KLASS_TONE[k])}
            >
              {tr(lang, KLASS_META[k].label)}
            </span>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">
          {lang === 'en' ? 'Model size' : 'Taille du modèle'}
        </DropdownMenuLabel>
        {SIZE_META.map((sz) => (
          <DropdownMenuCheckboxItem
            key={sz.id}
            checked={filters.size.has(sz.id)}
            onCheckedChange={() =>
              setFilters({ ...filters, size: toggle(filters.size, sz.id) as Set<SizeBand> })
            }
            onSelect={(e) => e.preventDefault()}
            className="text-xs"
          >
            {tr(lang, sz.label)}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">
          {lang === 'en' ? 'Architecture' : 'Architecture'}
        </DropdownMenuLabel>
        {ARCH_META.map((a) => (
          <DropdownMenuCheckboxItem
            key={a.id}
            checked={filters.arch.has(a.id)}
            onCheckedChange={() =>
              setFilters({ ...filters, arch: toggle(filters.arch, a.id) as Set<Arch> })
            }
            onSelect={(e) => e.preventDefault()}
            className="text-xs"
          >
            {tr(lang, a.label)}
          </DropdownMenuCheckboxItem>
        ))}

        {active > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => setFilters(emptyFilters())}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            >
              <X className="size-3.5" />
              {lang === 'en' ? 'Clear filters' : 'Effacer les filtres'}
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ModelRow({ lang, model }: { lang: Lang; model: BenchModel }) {
  const [open, setOpen] = useState(false)
  const meta = KLASS_META[model.klass]
  const runs = BENCH.runs.filter((r) => r.modelId === model.id && !r.error)

  return (
    <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          {/* Identité à gauche, verdict à droite : on lit le nom du modèle en
              parcourant la colonne, et la classification se retrouve alignée
              d'une ligne à l'autre au lieu de flotter après un nom variable. */}
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">{model.name}</span>
            <span className="text-xs text-[var(--color-muted-foreground)]">{paramsLabel(lang, model.params)}</span>

            <span className="ml-auto flex shrink-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
              {/* Un score nul par refus ne se lit pas comme un score nul par
                  erreur : sans ce repère, l'enseignant croit à un modèle nul. */}
              {model.refusals > 0 && (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  {model.refusals} {lang === 'en' ? 'refusal(s)' : 'refus'}
                </span>
              )}
              {/* Le nombre de tirages conditionne la confiance : une classe
                  établie sur 3 réponses ne vaut pas celle établie sur 10. */}
              <span className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                {model.rag.n} {lang === 'en' ? 'runs/cell' : 'tirages/case'}
              </span>
              {model.gain > 0 && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  +{model.gain} {lang === 'en' ? 'points gained' : 'points gagnés'}
                </span>
              )}
              <span
                className={cn(
                  'rounded-full border px-1.5 py-px text-[11px] font-medium',
                  KLASS_TONE[model.klass],
                )}
              >
                {tr(lang, meta.label)}
              </span>
            </span>
          </div>

          <div className="space-y-1.5">
            {CONDITIONS.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-[11px] text-[var(--color-muted-foreground)]">
                  {tr(lang, c.label)}
                </span>
                <ScoreBar stat={model[c.id]} condition={c.id} />
              </div>
            ))}
          </div>
        </div>

        <ChevronDown
          className={cn(
            'mt-1 size-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--color-border)] p-4 pt-3">
          <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {tr(lang, meta.advice)}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-xs">
              <thead>
                <tr className="text-[var(--color-muted-foreground)]">
                  <th className="pb-1.5 pr-2 font-medium">
                    {lang === 'en' ? 'Criterion' : 'Critère'}
                  </th>
                  <th className="pb-1.5 px-2 text-right font-medium">
                    Max
                  </th>
                  {CONDITIONS.map((c) => (
                    <th key={c.id} className="pb-1.5 px-2 text-center font-medium">
                      <div className="flex flex-col items-center gap-0.5">
                        {tr(lang, c.label)}
                        <BenchDetailDialog lang={lang} model={model} condition={c.id} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="align-top">
                {CRITERIA.map((crit) => (
                  <tr key={crit.id} className="border-t border-[var(--color-border)]">
                    <td className="py-1.5 pr-2 text-[var(--color-foreground)]">
                      {tr(lang, crit.label)}
                    </td>
                    {/* Ce que la ligne rapporte au maximum. Tout est positif :
                        un critère gagne ses points en étant acquis, un piège en
                        étant évité — la colonne totalise 100. */}
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                      {crit.weight === 0 ? '—' : crit.weight}
                    </td>
                    {CONDITIONS.map((c) => {
                      if (!applies(crit, c.id)) {
                        return (
                          <td
                            key={c.id}
                            className="px-2 py-1.5 text-center text-[var(--color-muted-foreground)]"
                          >
                            {lang === 'en' ? 'n/a' : 'sans objet'}
                          </td>
                        )
                      }
                      const mine = runs.filter((r) => r.condition === c.id)
                      const hits = mine.filter((r) => r.verdict?.[crit.id] === true).length
                      // Un critère rapporte quand il est acquis, un piège quand
                      // il est évité : même règle que dans le barème.
                      const earnedRuns = crit.trap ? mine.length - hits : hits
                      const good = crit.weight > 0 && earnedRuns === mine.length && mine.length > 0
                      const bad = crit.weight > 0 ? earnedRuns === 0 : false
                      return (
                        <td key={c.id} className="px-2 py-1.5 text-center font-mono tabular-nums">
                          {mine.length === 0 ? (
                            <span className="text-[var(--color-muted-foreground)]">—</span>
                          ) : (
                            <span
                              className={cn(
                                good && 'text-emerald-600 dark:text-emerald-400',
                                bad && 'text-red-600 dark:text-red-400',
                                !good && !bad && 'text-amber-600 dark:text-amber-400',
                              )}
                            >
                              {crit.weight === 0
                                ? hits === 0
                                  ? '—'
                                  : `${hits}✗`
                                : `${Math.round((earnedRuns / mine.length) * crit.weight)}/${crit.weight}`}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                  <td className="py-1.5 pr-2 text-[var(--color-foreground)]">
                    Total
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-[var(--color-muted-foreground)] tabular-nums">
                    {MAX_SCORE}
                  </td>
                  {CONDITIONS.map((c) => (
                    <td
                      key={c.id}
                      className="px-2 py-1.5 text-center font-mono tabular-nums text-[var(--color-foreground)]"
                    >
                      {model[c.id].mean}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-justify text-[11px] leading-relaxed hyphens-auto text-[var(--color-muted-foreground)]">
            {lang === 'en' ? (
              <>
                Every line is worth positive points, and the column adds up to {MAX_SCORE}: a
                criterion earns them when it is met, the last one when <em>no</em> reference is
                invented. Each cell shows the points earned out of those available, averaged over
                the runs — <code>20/20</code> means every run adjusted the dose to the GFR,{' '}
                <code>0/15</code> that every run invented a reference. The raw prompt mentions no
                kidney, so the GFR is not marked there and its total is scaled to 100 over the
                remaining 80 points. A refusal earns no points and is not a clinical error; it is
                flagged separately. The same prompt is sent once per column: use “See” in the header to read it
                and every answer.
              </>
            ) : (
              <>
                Chaque ligne vaut des points positifs, et la colonne totalise {MAX_SCORE} : un
                critère les gagne quand il est acquis, la dernière ligne quand <em>aucune</em>{' '}
                référence n’est inventée. Chaque case montre les points obtenus sur ceux en jeu, en
                moyenne sur les tirages — <code>20/20</code> signifie que tous les tirages ont
                adapté la posologie au DFG, <code>0/15</code> que tous ont inventé une référence.
                Le prompt brut ne parle d’aucun rein : le DFG n’y est pas noté et son total est
                ramené sur 100 à partir des 80 points restants. Un refus ne rapporte aucun point et
                n’est pas une faute clinique : il est signalé à part. Le même prompt est envoyé une
                fois par colonne : « Voir », dans l’en-tête, montre ce prompt et chaque réponse.
              </>
            )}
          </p>
        </div>
      )}
    </li>
  )
}

export function BenchmarkStep({ lang }: { lang: Lang }) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<BenchFilters>(emptyFilters)
  // Le graphique répond à « lequel choisir », la liste à « que vaut celui-ci ».
  // Les deux partagent recherche et filtres : basculer ne perd pas le tri en cours.
  const [view, setView] = useState<'chart' | 'list'>('chart')
  const sorted = useMemo(
    () =>
      [...BENCH.models].sort(
        (a, b) => klassOrder(a.klass) - klassOrder(b.klass) || b.gain - a.gain,
      ),
    [],
  )
  const models = useMemo(
    () => sorted.filter((m) => matchesQuery(m, query) && passesFilters(m, filters)),
    [sorted, query, filters],
  )
  const ranAt = new Date(BENCH.ranAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // La largeur et les marges viennent du conteneur de l'étape (comme pour
  // « Sources » et « Consommation ») : les répéter ici décalerait la page.
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle
          subtitle={
            lang === 'en'
              ? 'How each model behaves from one level to the next — page for teachers.'
              : 'Comment chaque modèle se comporte d’un palier à l’autre — page destinée aux enseignants.'
          }
        >
          <span className="inline-flex items-center gap-2">
            <FlaskConical className="size-5 text-blue-600" />
            {lang === 'en' ? 'Benchmark' : 'Benchmark'}
          </span>
        </SectionTitle>
      </div>

      <Callout variant="amber" title={lang === 'en' ? 'Model, prompt, sources' : 'Modèle, prompt, sources'}>
        {lang === 'en'
          ? 'The aim of the tutorial is critical thinking: the student must see that the quality of an answer depends on three levels. Some models invent molecules and doses from the raw question, others answer correctly from the start; many improve with an engineered prompt but then invent their references, and only become reliable once the guideline is attached; some stay poor whatever happens. Showing several profiles side by side makes all three levels visible.'
          : 'Le but du TD est l’esprit critique : l’étudiant doit voir que la qualité d’une réponse se joue à trois niveaux. Certains modèles inventent molécules et posologies dès la question brute, d’autres répondent juste d’emblée ; beaucoup s’améliorent avec un prompt travaillé mais inventent alors leurs références, et ne deviennent fiables qu’avec la recommandation jointe ; certains restent mauvais quoi qu’il arrive. Montrer plusieurs profils côte à côte rend les trois niveaux visibles.'}
      </Callout>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          {lang === 'en' ? 'The three conditions' : 'Les trois conditions'}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-3">
          {CONDITIONS.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className={cn('size-2 rounded-full', BAR_TONE[c.id])} />
                <span className="text-xs font-semibold text-[var(--color-foreground)]">
                  {tr(lang, c.label)}
                </span>
              </div>
              <p className="text-justify text-[11px] leading-relaxed hyphens-auto text-[var(--color-muted-foreground)]">
                {tr(lang, c.detail)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        {/* Trois lignes : le titre, la bascule centrée, puis la recherche et
            les filtres. Serrés à droite du titre, ces trois éléments
            réduisaient le champ de recherche à une fente ; centrée, la
            bascule se lit comme ce qu'elle est — le choix d'affichage de
            toute la section, et non un bouton de plus. */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            {lang === 'en' ? 'Results by model' : 'Résultats par modèle'}
          </h3>
          <div className="flex justify-center">
            <ViewToggle lang={lang} view={view} setView={setView} />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === 'en' ? 'Search a model…' : 'Rechercher un modèle…'
                }
                className="h-8 pl-8 text-xs"
                aria-label={lang === 'en' ? 'Search a model' : 'Rechercher un modèle'}
              />
            </div>
            <FilterMenu lang={lang} filters={filters} setFilters={setFilters} />
          </div>
        </div>
        {view === 'chart' ? (
          <BenchChart lang={lang} models={models} />
        ) : (
          <ul className="space-y-2">
            {models.map((m) => (
              <ModelRow key={m.id} lang={lang} model={m} />
            ))}
          </ul>
        )}
        {models.length === 0 && (
          <p className="rounded-md border border-dashed border-[var(--color-border)] p-4 text-center text-xs text-[var(--color-muted-foreground)]">
            {lang === 'en'
              ? 'No model matches the search or the active filters.'
              : 'Aucun modèle ne correspond à la recherche ou aux filtres actifs.'}
          </p>
        )}
      </section>

      <Callout variant="blue" title={lang === 'en' ? 'How to read the scores' : 'Comment lire les scores'}>
        {lang === 'en' ? (
          <>
            Each answer is marked against the guidelines, not merely for the presence of an item: a
            dose earns its points only if it is one the guidelines actually give. The{' '}
            <strong>GFR criterion</strong> is only marked when the question gives the GFR (engineered
            prompt and documents). Every quoted reference is checked against the documents. In the
            chart, the pale band behind each bar shows the spread across runs — when it is wide,
            the model’s quality depends on chance as much as on the prompt.
          </>
        ) : (
          <>
            Chaque réponse est jugée sur sa conformité aux recommandations, pas sur la seule présence
            d’un élément : une posologie ne rapporte ses points que si elle figure dans les recos.
            Le <strong>critère du DFG</strong> n’est noté que là où la question donne le DFG (prompt
            travaillé et documents). Chaque référence citée est vérifiée dans les documents. Dans
            le graphique, la zone pâle derrière chaque barre montre l’étendue des tirages — large,
            elle signale que la qualité du modèle tient autant au hasard qu’au prompt.
          </>
        )}
      </Callout>


      <p className="flex items-start gap-2 text-xs text-[var(--color-muted-foreground)]">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        {lang === 'en'
          ? `Measured on ${ranAt}, ${BENCH.repeats} run(s) per cell, temperature ${BENCH.params?.temperature ?? '—'}.`
          : `Mesuré le ${ranAt}, ${BENCH.repeats} tirage(s) par case, température ${BENCH.params?.temperature ?? '—'}.`}
      </p>
    </div>
  )
}

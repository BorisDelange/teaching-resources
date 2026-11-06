import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COHORT, type Patient } from '@/features/courses/modules/sepsis/cohort'
import {
  VARIABLES,
  VARIABLE_BY_KEY,
  varText,
  type VariableDefinition,
} from '@/features/courses/modules/sepsis/variables'
import { useLang, pick, type Lang } from '@/lib/useLang'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BlockTitle } from '@/features/courses/modules/sepsis/blocks'
import { pillClass } from '@/features/courses/modules/sepsis/styles'

const PAGE = 12

/**
 * Les deux boutons de pagination, à l'identique.
 *
 * Le texte est en couleur de premier plan, et non héritée de la ligne
 * d'information qui les entoure : en gris atténué, un bouton actif avait l'air
 * désactivé. Le gris est réservé à l'état `disabled`, où il veut dire quelque
 * chose.
 */
const PAGER_BUTTON =
  'cursor-pointer rounded border border-[var(--color-border)] px-2.5 py-1 font-medium text-[var(--color-foreground)] transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 disabled:cursor-default disabled:border-[var(--color-border)] disabled:bg-transparent disabled:text-[var(--color-muted-foreground)] disabled:opacity-50'

interface Col {
  key: keyof Patient
  label: string
  /** Le nom en toutes lettres, que l'abréviation de l'en-tête ne donne pas. */
  full: string
  desc: string
  unit: string
  type: string
  /** Décimales à l'affichage ; absent = la valeur telle quelle. */
  digits?: number
  /** Les quatre dimensions, pour les colonnes qui viennent d'une mesure. */
  definition?: VariableDefinition
}

function buildCols(lang: Lang): Col[] {
const en = lang === 'en'
const COLS: Col[] = [
  en
    ? { key: 'id', label: 'id', full: 'Identifier', desc: 'Patient identifier (one row = one patient).', unit: '—', type: 'integer' }
    : { key: 'id', label: 'id', full: 'Identifiant', desc: 'Identifiant du patient (une ligne = un patient).', unit: '—', type: 'entier' },
  en
    ? { key: 'sex', label: 'sex', full: 'Sex', desc: 'Patient sex (M = male, F = female).', unit: 'M / F', type: 'categorical' }
    : { key: 'sex', label: 'sexe', full: 'Sexe', desc: 'Sexe du patient (H = homme, F = femme).', unit: 'H / F', type: 'catégoriel' },
  ...VARIABLES.filter((v) => v.key !== 'age').map(
    (v): Col => ({
      key: v.key,
      label: varText(v, lang).short,
      full: varText(v, lang).label,
      desc: varText(v, lang).help,
      unit: varText(v, lang).unit,
      type: en ? 'numeric' : 'numérique',
      // La température est mesurée au dixième de degré ; l'afficher avec la
      // précision brute du fichier (36.72222…) suggérerait une exactitude que
      // le thermomètre n'a pas.
      digits: v.key === 'temp' ? 1 : undefined,
      definition: varText(v, lang).definition,
    }),
  ),
  {
    key: 'sepsis',
    label: 'sepsis',
    full: 'Sepsis',
    desc: en
      ? 'Outcome to predict: 1 if the patient developed sepsis, 0 otherwise.'
      : 'Résultat à prédire : 1 si le patient a développé un sepsis, 0 sinon.',
    unit: '0 / 1',
    type: en ? 'binary' : 'binaire',
    definition: en
      ? {
          concept: 'Sepsis according to the Sepsis-3 definition',
          anchor: 'ICU admission',
          window: 'Entire stay',
          aggregate: 'Presence (yes / no)',
        }
      : {
          concept: 'Sepsis selon la définition Sepsis-3',
          anchor: 'Admission en réanimation',
          window: 'Séjour entier',
          aggregate: 'Présence (oui / non)',
        },
  },
]

// Age placed first among the clinical columns.
COLS.splice(2, 0, {
  key: 'age',
  label: en ? 'age' : 'âge',
  full: varText(VARIABLE_BY_KEY.age, lang).label,
  desc: varText(VARIABLE_BY_KEY.age, lang).help,
  unit: varText(VARIABLE_BY_KEY.age, lang).unit,
  type: en ? 'integer' : 'entier',
  digits: 1,
  definition: varText(VARIABLE_BY_KEY.age, lang).definition,
})
return COLS
}

type Outcome = 'all' | 'sepsis' | 'no'

/**
 * Le tableau agrégé : une ligne par patient.
 *
 * Triable et filtrable, parce que c'est ce qu'on demande aux étudiants d'en
 * faire — chercher à l'œil nu si une valeur « saute aux yeux » chez les
 * patients septiques. Sans tri ni filtre, l'exercice se réduirait à faire
 * défiler douze lignes au hasard.
 */
export function DataTable() {
  const lang = useLang()
  const COLS = useMemo(() => buildCols(lang), [lang])
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: keyof Patient; dir: 'asc' | 'desc' } | null>(null)
  const [outcome, setOutcome] = useState<Outcome>('all')

  const rowsAll = useMemo(() => {
    const filtered =
      outcome === 'all'
        ? COHORT
        : COHORT.filter((p) => (outcome === 'sepsis' ? p.sepsis === 1 : p.sepsis === 0))
    if (!sort) return filtered
    // Les valeurs manquantes restent en bas dans les deux sens : les faire
    // remonter en tête d'un tri croissant donnerait une colonne de cases vides
    // là où l'étudiant cherche justement les valeurs extrêmes.
    return [...filtered].sort((a, b) => {
      const va = a[sort.key]
      const vb = b[sort.key]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return sort.dir === 'asc' ? va - vb : vb - va
    })
  }, [sort, outcome])

  const pages = Math.max(1, Math.ceil(rowsAll.length / PAGE))
  // Filtrer peut raccourcir la liste sous la page courante : on se recale.
  const safePage = Math.min(page, pages - 1)
  const start = safePage * PAGE
  const rows = rowsAll.slice(start, start + PAGE)

  const toggleSort = (key: keyof Patient) => {
    setPage(0)
    setSort((s) =>
      s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <BlockTitle icon={Table2}>
        {pick(lang, 'Le tableau final : une ligne par patient', 'The final table: one row per patient')}
      </BlockTitle>
      <p className="-mt-1 text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Voici le fichier tel qu'on le manipule, un peu comme dans un tableur. Chaque{' '}
            <strong>ligne</strong> est un patient ; chaque <strong>colonne</strong> est une variable
            agrégée. Les cases{' '}
            <span className="rounded bg-amber-500/15 px-1 text-amber-700 dark:text-amber-300">vides</span>{' '}
            sont des mesures jamais faites. <strong>Survolez un nom de colonne</strong> pour savoir ce
            qu'elle contient, <strong>cliquez dessus</strong> pour trier.
          </>,
          <>
            Here is the file as you would handle it, much like a spreadsheet. Each{' '}
            <strong>row</strong> is a patient; each <strong>column</strong> is an aggregated
            variable.{' '}
            <span className="rounded bg-amber-500/15 px-1 text-amber-700 dark:text-amber-300">Empty</span>{' '}
            cells are measurements that were never taken. <strong>Hover over a column name</strong>{' '}
            to see what it contains, <strong>click it</strong> to sort.
          </>,
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-3.5 text-[var(--color-muted-foreground)]" />
        <span className="text-xs text-[var(--color-muted-foreground)]">{pick(lang, 'Afficher :', 'Show:')}</span>
        {(
          [
            { id: 'all', label: pick(lang, 'Tous les patients', 'All patients') },
            { id: 'sepsis', label: pick(lang, 'Sepsis uniquement', 'Sepsis only') },
            { id: 'no', label: pick(lang, 'Sans sepsis', 'No sepsis') },
          ] as const
        ).map((o) => (
          <button
            key={o.id}
            onClick={() => {
              setOutcome(o.id)
              setPage(0)
            }}
            className={pillClass(outcome === o.id)}
          >
            {o.label}
          </button>
        ))}
        {sort && (
          <button
            onClick={() => setSort(null)}
            className="ml-auto cursor-pointer text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            {pick(lang, 'Annuler le tri', 'Clear sorting')}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--color-muted)]/60">
              {COLS.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    className="whitespace-nowrap border-b border-[var(--color-border)] p-0 text-left font-semibold text-[var(--color-foreground)]"
                  >
                    {/* Le dictionnaire des données vit ici, au survol de chaque
                        en-tête : c'est là qu'on se demande ce qu'est « resp » ou
                        dans quelle unité est le lactate — pas dans un tableau
                        replié sous la page, qu'il fallait ouvrir puis relire en
                        faisant l'aller-retour avec les colonnes. */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggleSort(c.key)}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-1 px-2.5 py-2 text-left transition-colors hover:bg-blue-500/10',
                            active && 'text-blue-700 dark:text-blue-300',
                          )}
                        >
                          <span className="decoration-dotted decoration-from-font underline-offset-4">
                            {c.label}
                          </span>
                          {active ? (
                            sort.dir === 'asc' ? (
                              <ArrowUp className="size-3 shrink-0" />
                            ) : (
                              <ArrowDown className="size-3 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 shrink-0 opacity-25" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {/* Le nom complet, pas l'abréviation : l'en-tête affiche
                            déjà « Créat. », et la répéter n'apprendrait rien à
                            qui vient justement chercher ce qu'elle abrège. */}
                        <p className="font-semibold">{c.full}</p>
                        <p className="mt-0.5 leading-relaxed">{c.desc}</p>
                        {/* La définition en quatre dimensions : c'est elle qui
                            dit ce que contient RÉELLEMENT la case, et sans
                            laquelle « la créatinine du patient » reste
                            ambigu — la première ? la plus élevée ? */}
                        {c.definition && (
                          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 border-t border-white/20 pt-1.5 opacity-80">
                            <dt>{pick(lang, 'Ancrage', 'Anchor')}</dt>
                            <dd className="font-medium">{c.definition.anchor}</dd>
                            <dt>{pick(lang, 'Fenêtre', 'Window')}</dt>
                            <dd className="font-medium">{c.definition.window}</dd>
                            <dt>{pick(lang, 'Agrégat', 'Aggregate')}</dt>
                            <dd className="font-medium">{c.definition.aggregate}</dd>
                          </dl>
                        )}
                        <p className="mt-1.5 opacity-70">
                          {c.type} · {pick(lang, 'unité :', 'unit:')} {c.unit} ·{' '}
                          {pick(lang, 'cliquer pour trier', 'click to sort')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, ri) => (
              <tr key={p.id} className={cn(ri % 2 === 1 && 'bg-[var(--color-muted)]/25')}>
                {COLS.map((c) => {
                  const v = p[c.key]
                  const missing = v === null || v === undefined
                  const display = missing
                    ? ''
                    : c.key === 'sex'
                      ? v === 1
                        ? pick(lang, 'H', 'M')
                        : 'F'
                      : c.digits !== undefined
                        ? v.toFixed(c.digits)
                        : v
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        'whitespace-nowrap border-b border-[var(--color-border)] px-2.5 py-1.5 tabular-nums',
                        c.key === 'sepsis' && v === 1 && 'font-semibold text-red-600 dark:text-red-400',
                        missing && 'bg-amber-500/10',
                      )}
                    >
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs">
        <button
          disabled={safePage === 0}
          onClick={() => setPage(Math.max(0, safePage - 1))}
          className={PAGER_BUTTON}
        >
          ← {pick(lang, 'Précédent', 'Previous')}
        </button>
        <span className="text-[var(--color-muted-foreground)]">
          {rowsAll.length === 0
            ? pick(lang, 'Aucun patient', 'No patients')
            : `Patients ${start + 1}–${Math.min(start + PAGE, rowsAll.length)} ${pick(lang, 'sur', 'of')} ${rowsAll.length}`}
        </span>
        <button
          disabled={safePage >= pages - 1}
          onClick={() => setPage(Math.min(pages - 1, safePage + 1))}
          className={PAGER_BUTTON}
        >
          {pick(lang, 'Suivant', 'Next')} →
        </button>
      </div>
    </div>
  )
}

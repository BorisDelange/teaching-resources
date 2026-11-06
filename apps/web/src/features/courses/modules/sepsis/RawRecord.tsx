/**
 * Des données brutes au tableau d'étude : le dossier, puis l'agrégation.
 *
 * L'étudiant voit d'abord un dossier de réanimation tel qu'il existe — une
 * mesure toutes les heures, sur plusieurs jours — puis regarde ces centaines de
 * valeurs se réduire à UN chiffre par variable. C'est le geste le moins visible
 * de toute la construction d'un modèle, et celui qui décide le plus de ce que
 * le modèle pourra voir.
 */

import { useMemo, useState } from 'react'
import { Activity, ArrowRight, Clock, FlaskConical, Ruler, Sigma } from 'lucide-react'
import { COHORT } from './cohort'
import { VARIABLES, varText, type FeatureKey } from './variables'
import { useLang, pick } from '@/lib/useLang'
import { ADMISSION_MS } from './record'
import { HOURLY_RECORDS } from './hourly-records'
import { RecordTimeline, type TimelineRow } from './RecordTimeline'
import { BlockTitle, Panel } from './blocks'
import { pillClass } from './styles'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const HOUR_MS = 3_600_000

/** Couleur d'une ligne selon sa nature, comme dans le dossier patient. */
const KIND_COLOUR: Record<'vital' | 'lab' | 'demo', string> = {
  vital: '#3b82f6',
  lab: '#f59e0b',
  demo: '#64748b',
}

// ---------- Le dossier brut ----------

export function RawRecordBlock() {
  const lang = useLang()
  const [selected, setSelected] = useState(0)
  const record = HOURLY_RECORDS[selected]

  const bounds = useMemo(
    () => ({ lo: ADMISSION_MS, hi: ADMISSION_MS + record.hours * HOUR_MS }),
    [record.hours],
  )

  const rows: TimelineRow[] = useMemo(
    () =>
      VARIABLES.filter((v) => v.key !== 'age').map((meta) => {
        const pts = record.series[meta.key] ?? []
        return {
          label: varText(meta, lang).label,
          unit: varText(meta, lang).unit,
          colour: KIND_COLOUR[meta.kind],
          events: pts.map(([h, v]) => ({
            start: ADMISSION_MS + h * HOUR_MS,
            end: null,
            value: v,
            text: null,
          })),
          // Échelle fixée sur les valeurs du séjour, élargie de 10 % : sans
          // marge, les extrêmes se collent au bord de leur bande.
          range: pts.length
            ? ([
                Math.min(...pts.map((p) => p[1])) * 0.9,
                Math.max(...pts.map((p) => p[1])) * 1.1,
              ] as [number, number])
            : null,
        }
      }),
    [record, lang],
  )

  // Combien de valeurs ce seul dossier contient-il ? Le chiffre porte tout
  // l'argument de la section suivante : on ne fait pas entrer ça dans un
  // modèle tel quel.
  const nPoints = useMemo(
    () => Object.values(record.series).reduce((a, s) => a + s.length, 0),
    [record],
  )

  /** Le lactate, pour montrer noir sur blanc à quel point il est espacé. */
  const nLactate = record.series.lactate?.length ?? 0

  /**
   * Le basculement de l'étiquette « sepsis », en travers du graphique.
   *
   * C'est la seule façon de faire voir que les paramètres se dégradaient bien
   * avant que le diagnostic ne soit posé : sans repère, la chronologie montre
   * une évolution sans dire à quel moment elle a été reconnue.
   */
  const markers = useMemo(
    () =>
      record.onsetHour == null
        ? undefined
        : [
            {
              at: ADMISSION_MS + record.onsetHour * HOUR_MS,
              label: `Sepsis · H+${record.onsetHour}`,
              colour: '#ef4444',
            },
          ],
    [record],
  )

  return (
    <Panel>
      <BlockTitle icon={Clock}>
        {pick(lang, 'Ce que contient vraiment un dossier', 'What a record really contains')}
      </BlockTitle>
      <p className="mb-3 text-justify text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Dans le jeu de données d'origine, chaque patient est suivi{' '}
            <strong>heure par heure</strong> : les paramètres vitaux sont relevés en continu, les
            examens de laboratoire seulement quand on les demande. Voici{' '}
            <strong>deux vrais dossiers</strong>, tels qu'ils sortent du fichier — molette pour zoomer,
            double-clic pour revenir à la vue complète.
          </>,
          <>
            In the original dataset, each patient is followed <strong>hour by hour</strong>: vital
            signs are recorded continuously, laboratory tests only when they are ordered. Here are{' '}
            <strong>two real records</strong>, straight from the file — scroll to zoom, double-click
            to return to the full view.
          </>,
        )}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {HOURLY_RECORDS.map((r, i) => (
          <button key={r.source} onClick={() => setSelected(i)} className={pillClass(i === selected)}>
            {lang === 'en'
              ? `${Math.round(r.age)} y · ${r.sex === 1 ? 'male' : 'female'}${r.sepsis === 1 ? ' (sepsis)' : ' (no sepsis)'}`
              : `${Math.round(r.age)} ans · ${r.sex === 1 ? 'homme' : 'femme'}${r.sepsis === 1 ? ' (sepsis)' : ' (pas de sepsis)'}`}
          </button>
        ))}
      </div>

      {/* Hauteur explicite obligatoire : la chronologie se dimensionne sur son
          conteneur (`h-full`), donc sans hauteur imposée elle mesure zéro et ne
          dessine rien. On la calcule sur le nombre de lignes plutôt que de la
          figer, pour que chaque paramètre garde une bande lisible. */}
      <div
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-2"
        style={{ height: rows.length * 30 + 60 }}
      >
        <RecordTimeline
          rows={rows}
          bounds={bounds}
          admissionMs={ADMISSION_MS}
          markers={markers}
        />
      </div>

      <p className="mt-3 text-justify text-sm text-[var(--color-muted-foreground)]">
        {pick(lang, record.note, record.noteEn)}
      </p>

      <p className="mt-2 text-justify text-sm text-[var(--color-muted-foreground)]">
        {lang === 'en' ? (
          <>
            Notice the irregularity: heart rate is charted almost every hour, lactate{' '}
            <strong>{nLactate} times</strong> in {record.hours} hours, and some tests never. This
            single record already holds{' '}
            <strong className="text-[var(--color-foreground)]">{nPoints} values</strong> — multiplied
            by {COHORT.length} patients, then by stays that sometimes last weeks, the original file
            runs to <strong>millions of rows</strong>. And above all: no two patients ever have the
            same measurements at the same times.
          </>
        ) : (
          <>
            Regardez l'irrégularité : la fréquence cardiaque est notée presque toutes les heures, le
            lactate <strong>{nLactate} fois</strong> en {record.hours} heures, et certains examens
            jamais. Ce seul dossier contient déjà{' '}
            <strong className="text-[var(--color-foreground)]">{nPoints} valeurs</strong> — multipliées
            par {COHORT.length} patients, puis par des séjours qui durent parfois des semaines, le
            fichier d'origine compte des <strong>millions de lignes</strong>. Et surtout : deux patients
            n'ont jamais les mêmes mesures aux mêmes moments.
          </>
        )}
      </p>

    </Panel>
  )
}

// ---------- L'agrégation ----------

/** Les fonctions d'agrégation qu'on propose de comparer. */
type AggId = 'first' | 'mean' | 'worst'

const AGGS: { id: AggId; label: string; help: string; labelEn: string; helpEn: string }[] = [
  {
    id: 'first',
    label: 'Première valeur',
    help: "La mesure à l'admission. Simple, mais ignore tout ce qui suit.",
    labelEn: 'First value',
    helpEn: 'The measurement at admission. Simple, but ignores everything that follows.',
  },
  {
    id: 'mean',
    label: 'Moyenne',
    help: "Lisse le séjour entier. Un pic bref de lactate y disparaît presque.",
    labelEn: 'Mean',
    helpEn: 'Smooths the whole stay. A brief lactate spike almost vanishes.',
  },
  {
    id: 'worst',
    label: 'Valeur la plus anormale',
    help: "Le pire lactate, la pression la plus basse. Retient l'alerte, mais gomme la chronologie.",
    labelEn: 'Most abnormal value',
    helpEn: 'The worst lactate, the lowest blood pressure. Keeps the alert, but erases the timeline.',
  },
]

/**
 * Applique une agrégation à une série de valeurs.
 *
 * « Le pire » n'a pas de sens dans l'absolu : il dépend du sens clinique de la
 * variable. Une pression basse est grave, un lactate haut l'est aussi — d'où le
 * paramètre `worseWhen`.
 */
function aggregate(values: number[], agg: AggId, worseWhen: 'high' | 'low'): number {
  if (values.length === 0) return NaN
  if (agg === 'first') return values[0]
  if (agg === 'mean') return values.reduce((a, b) => a + b, 0) / values.length
  return worseWhen === 'high' ? Math.max(...values) : Math.min(...values)
}

/** Dans quel sens chaque paramètre est-il « anormal » quand ça va mal ? */
const WORSE_WHEN: Record<FeatureKey, 'high' | 'low'> = {
  age: 'high',
  hr: 'high',
  sbp: 'low',
  temp: 'high',
  resp: 'high',
  o2sat: 'low',
  wbc: 'high',
  lactate: 'high',
  creatinine: 'high',
  platelets: 'low',
}

export function AggregationBlock() {
  // Le MÊME dossier que le bloc précédent : l'étudiant doit reconnaître les
  // valeurs qu'il vient de parcourir dans la chronologie, sinon l'agrégation
  // ressemble à un calcul abstrait sur des chiffres venus d'ailleurs.
  const lang = useLang()
  const record = HOURLY_RECORDS[0]
  const [agg, setAgg] = useState<AggId>('worst')

  const lines = useMemo(() => {
    return VARIABLES.filter((v) => v.key !== 'age')
      .map((meta) => {
        const values = (record.series[meta.key] ?? []).map(([, v]) => v)
        return {
          key: meta.key,
          label: varText(meta, lang).label,
          unit: varText(meta, lang).unit,
          kind: meta.kind,
          n: values.length,
          value: aggregate(values, agg, WORSE_WHEN[meta.key]),
          decimals:
            meta.key === 'temp' || meta.key === 'lactate' || meta.key === 'creatinine' ? 1 : 0,
        }
      })
      .filter((l) => l.n > 0)
  }, [record, agg, lang])

  const chosen = AGGS.find((a) => a.id === agg)!

  return (
    <Panel>
      <BlockTitle icon={Sigma}>
        {pick(lang, 'Réduire un séjour à une ligne', 'Reducing a stay to one row')}
      </BlockTitle>
      <p className="mb-3 text-justify text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Un modèle attend un <strong>tableau régulier</strong> : une ligne par patient, un nombre par
            colonne. Il faut donc <strong>résumer</strong> chaque série de mesures par une seule valeur —
            c'est ce qu'on appelle l'<strong>agrégation</strong>. Choisissez une règle et regardez ce
            qu'elle retient du dossier précédent.
          </>,
          <>
            A model expects a <strong>regular table</strong>: one row per patient, one number per
            column. Each series of measurements must therefore be <strong>summarised</strong> by a
            single value — this is called <strong>aggregation</strong>. Pick a rule and see what it
            keeps from the record above.
          </>,
        )}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {AGGS.map((a) => (
          <button key={a.id} onClick={() => setAgg(a.id)} className={pillClass(agg === a.id)}>
            {pick(lang, a.label, a.labelEn)}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">{pick(lang, chosen.help, chosen.helpEn)}</p>

      {/* Les mesures d'un côté, la valeur retenue de l'autre : la flèche est
          le geste d'agrégation lui-même, et il faut le voir se produire. */}
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--color-muted)]/60">
              <th className="border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold">
                {pick(lang, 'Paramètre', 'Parameter')}
              </th>
              <th className="border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold">
                {pick(lang, 'Mesures sur le séjour', 'Measurements during the stay')}
              </th>
              <th className="border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold">
                {pick(lang, 'Valeur retenue', 'Value kept')}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5">
                  <span className="flex items-center gap-1.5">
                    {l.kind === 'lab' ? (
                      <FlaskConical className="size-3 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Activity className="size-3 text-blue-600 dark:text-blue-400" />
                    )}
                    {l.label}
                  </span>
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {l.n} {pick(lang, 'mesures', 'measurements')}
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5">
                  <span className="flex items-center gap-2">
                    <ArrowRight className="size-3 text-[var(--color-muted-foreground)]" />
                    <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                      {l.value.toFixed(l.decimals)}
                    </span>
                    <span className="text-[var(--color-muted-foreground)]">{l.unit}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Changez de règle : les chiffres de la colonne de droite bougent, parfois beaucoup. Le
            tableau que vous donnerez au modèle <strong>dépend de ce choix</strong>, et ce choix est le
            vôtre — pas celui de l'algorithme.
          </>,
          <>
            Change the rule: the numbers in the right-hand column move, sometimes a lot. The table you
            give the model <strong>depends on this choice</strong>, and the choice is yours — not the
            algorithm's.
          </>,
        )}
      </p>
    </Panel>
  )
}

// ---------- Les quatre dimensions d'une variable ----------

/** Un exemple travaillé, pour montrer que l'ancrage n'est pas toujours l'admission. */
type Example = { name: string; concept: string; anchor: string; window: string; agg: string }

const EXAMPLES: (Example & { en: Example })[] = [
  {
    name: 'Lactate max à J1',
    concept: 'Lactatémie',
    anchor: 'Admission en réanimation',
    window: 'H0 à H24',
    agg: 'Maximum',
    en: {
      name: 'Max lactate on day 1',
      concept: 'Blood lactate',
      anchor: 'ICU admission',
      window: 'H0 to H24',
      agg: 'Maximum',
    },
  },
  {
    name: 'FC à l’admission',
    concept: 'Fréquence cardiaque',
    anchor: 'Admission en réanimation',
    window: 'H0 à H1',
    agg: 'Première',
    en: {
      name: 'HR at admission',
      concept: 'Heart rate',
      anchor: 'ICU admission',
      window: 'H0 to H1',
      agg: 'First',
    },
  },
  {
    name: 'Antécédent de diabète',
    concept: 'Diagnostic de diabète',
    anchor: 'Admission en réanimation',
    window: 'Sans limite → H0',
    agg: 'Présence (oui / non)',
    en: {
      name: 'History of diabetes',
      concept: 'Diabetes diagnosis',
      anchor: 'ICU admission',
      window: 'No limit → H0',
      agg: 'Presence (yes / no)',
    },
  },
  {
    name: 'Noradrénaline pendant le sepsis',
    concept: 'Noradrénaline (administration)',
    anchor: 'Diagnostic de sepsis',
    window: 'H0 à H72',
    agg: 'Présence (oui / non)',
    en: {
      name: 'Norepinephrine during sepsis',
      concept: 'Norepinephrine (administration)',
      anchor: 'Sepsis diagnosis',
      window: 'H0 to H72',
      agg: 'Presence (yes / no)',
    },
  },
]

const DIMENSIONS: { n: number; title: string; body: string; titleEn: string; bodyEn: string }[] = [
  {
    n: 1,
    title: 'Le concept',
    body: "Ce que l'on mesure, unité comprise : lactatémie en mmol/L, créatininémie en mg/dL. C'est la dimension la plus évidente, et souvent la seule qu'on écrit.",
    titleEn: 'The concept',
    bodyEn: 'What is measured, unit included: blood lactate in mmol/L, serum creatinine in mg/dL. It is the most obvious dimension, and often the only one written down.',
  },
  {
    n: 2,
    title: "L'ancrage temporel",
    body: "Le point de repère dans le parcours du patient. Ici l'admission en réanimation — mais ce pourrait être le début de la ventilation ou le diagnostic de sepsis, selon la question posée.",
    titleEn: 'The time anchor',
    bodyEn: 'The reference point in the patient’s journey. Here, ICU admission — but it could be the start of mechanical ventilation or the sepsis diagnosis, depending on the question asked.',
  },
  {
    n: 3,
    title: 'La fenêtre temporelle',
    body: "La période de recherche, relative à l'ancrage : H0 à H6 pour nos données. Une fenêtre différente donnerait un autre tableau, et donc un autre modèle.",
    titleEn: 'The time window',
    bodyEn: 'The search period, relative to the anchor: H0 to H6 for our data. A different window would give another table, and therefore another model.',
  },
  {
    n: 4,
    title: "La fonction d'agrégation",
    body: "La valeur retenue quand la fenêtre en contient plusieurs : première, médiane, maximum, présence… C'est ce que vous venez de manipuler.",
    titleEn: 'The aggregation function',
    bodyEn: 'The value kept when the window contains several: first, median, maximum, presence… This is what you have just been manipulating.',
  },
]

/**
 * Le cadrage en quatre dimensions, appliqué à nos propres données.
 *
 * Placé APRÈS la manipulation de l'agrégation, et non avant : l'étudiant a
 * alors déjà éprouvé qu'une même série donne plusieurs chiffres selon la règle
 * choisie. Le cadrage nomme ce qu'il vient de constater, au lieu d'annoncer un
 * formalisme dont il ne verrait pas l'utilité.
 */
export function VariableDefinitionBlock() {
  const lang = useLang()
  return (
    <Panel>
      <BlockTitle icon={Ruler}>
        {pick(lang, 'Définir une variable sans ambiguïté', 'Defining a variable unambiguously')}
      </BlockTitle>
      <p className="mb-4 text-justify text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            « La créatinine du patient » ne veut rien dire. La première ? La plus élevée ? Celle des 24
            premières heures ? Si deux personnes extraient la même variable du même dossier et
            obtiennent des valeurs différentes, c'est que la variable était{' '}
            <strong>mal définie</strong>. Il faut préciser <strong>quatre dimensions</strong> — vous
            venez d'en manipuler une.
          </>,
          <>
            “The patient’s creatinine” means nothing. The first one? The highest? The one from the
            first 24 hours? If two people extract the same variable from the same record and get
            different values, the variable was <strong>poorly defined</strong>. You need to specify{' '}
            <strong>four dimensions</strong> — you have just manipulated one of them.
          </>,
        )}
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <div
            key={d.n}
            className="flex gap-2.5 rounded-md border border-[var(--color-border)] p-3"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-600 dark:text-blue-400">
              {d.n}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[var(--color-foreground)]">{pick(lang, d.title, d.titleEn)}</span>
              <span className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                {pick(lang, d.body, d.bodyEn)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mb-2 text-sm font-medium text-[var(--color-foreground)]">
        {pick(lang, 'Les variables de ce TD, écrites correctement', 'The variables of this tutorial, properly written')}
      </p>
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--color-muted)]/60">
              {(lang === 'en'
                ? ['Variable', 'Concept', 'Anchor', 'Window', 'Aggregate']
                : ['Variable', 'Concept', 'Ancrage', 'Fenêtre', 'Agrégat']
              ).map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VARIABLES.filter((v) => v.kind === 'lab' || v.key === 'hr').map((meta) => {
              const v = varText(meta, lang)
              return (
              <tr key={meta.key}>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 font-medium text-[var(--color-foreground)]">
                  {v.label}
                </td>
                <td className="border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {v.definition.concept}
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {v.definition.anchor}
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {v.definition.window}
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 font-medium text-blue-600 dark:text-blue-400">
                  {v.definition.aggregate}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-justify text-xs text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Ancrage et fenêtre sont identiques pour toute la cohorte : nos données résument les six
            premières heures de réanimation. Survolez les en-têtes du tableau plus bas pour retrouver
            cette définition colonne par colonne.
          </>,
          <>
            Anchor and window are the same for the whole cohort: our data summarise the first six
            hours in the ICU. Hover over the headers of the table below to find this definition
            column by column.
          </>,
        )}
      </p>

      <p className="mb-2 mt-5 text-sm font-medium text-[var(--color-foreground)]">
        {pick(lang, "D'autres variables, pour voir varier les quatre dimensions", 'Other variables, to see the four dimensions vary')}
      </p>
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--color-muted)]/60">
              {(lang === 'en'
                ? ['Variable', 'Concept', 'Anchor', 'Window', 'Aggregate']
                : ['Variable', 'Concept', 'Ancrage', 'Fenêtre', 'Agrégat']
              ).map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXAMPLES.map((ex) => {
              const e = lang === 'en' ? ex.en : ex
              return (
              <tr key={ex.name}>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 font-medium text-[var(--color-foreground)]">
                  {e.name}
                </td>
                <td className="border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {e.concept}
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {e.anchor}
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {e.window}
                </td>
                <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted-foreground)]">
                  {e.agg}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-justify text-xs text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Remarquez la dernière ligne : l'ancrage n'est pas toujours l'admission. Si la question porte
            sur ce qui suit le sepsis, c'est le diagnostic de sepsis qui sert de repère.
          </>,
          <>
            Note the last row: the anchor is not always admission. If the question is about what
            follows sepsis, the sepsis diagnosis is the reference point.
          </>,
        )}
      </p>
    </Panel>
  )
}

// ---------- Pourquoi on ne peut pas tout donner ----------

/**
 * Le calcul d'EPV (events per variable) sur notre cohorte.
 *
 * Affiché comme un calcul et non comme une phrase : le chiffre obtenu à partir
 * de NOS données frappe plus qu'un principe général.
 */
export function VariableBudget() {
  const lang = useLang()
  const nEvents = COHORT.filter((p) => p.sepsis === 1).length
  const budget = Math.floor(nEvents / 10)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      {/* Le calcul écrit en toutes lettres plutôt qu'en trois tuiles : les
          effectifs de la cohorte sont déjà affichés plus haut, les répéter ne
          faisait que diluer le seul chiffre nouveau — le budget. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help font-semibold text-[var(--color-foreground)] decoration-dotted decoration-from-font underline-offset-4 hover:underline">
              {nEvents} {pick(lang, 'événements', 'events')}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {pick(
              lang,
              <>
                Ce sont les patients qui ont fait un sepsis. C'est leur nombre qui limite un modèle, et
                non l'effectif total : ce sont eux qui portent l'information à apprendre.
              </>,
              <>
                These are the patients who developed sepsis. It is their number that limits a model, not
                the total sample size: they carry the information to be learned.
              </>,
            )}
          </TooltipContent>
        </Tooltip>
        <span>{pick(lang, '÷ 10 par variable =', '÷ 10 per variable =')}</span>
        <span className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
          ≈ {budget}
        </span>
        <span>{pick(lang, 'variables au maximum pour cette cohorte.', 'variables at most for this cohort.')}</span>
      </div>
      <p className="mt-2 text-justify text-xs text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Nous en utiliserons une dizaine : c'est déjà un peu au-delà du confortable, et c'est une
            limite à garder en tête quand nous jugerons les performances.
          </>,
          <>
            We will use about ten: that is already a little beyond comfortable, and a limit to keep in
            mind when we judge performance.
          </>,
        )}
      </p>
    </div>
  )
}

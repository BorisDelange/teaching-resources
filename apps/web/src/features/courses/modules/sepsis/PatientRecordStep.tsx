import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Eye,
  EyeOff,
  FlaskConical,
  Info,
  RotateCcw,
  ShieldCheck,
  User2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Patient } from './cohort'
import { VARIABLE_BY_KEY, varText, type FeatureKey } from './variables'
import { useLang, pick } from '@/lib/useLang'
import type { TrainedModel } from './model'
import {
  ADMISSION_MS,
  STAY_MS,
  buildRecord,
  contributions,
  imputedValue,
  pickTeachingPatients,
  sigmoid,
  type Contribution,
} from './record'
import { RecordTimeline, type TimelineRow } from './RecordTimeline'
import { Callout } from './ui'
import { pillClass } from './styles'

/**
 * L'étendue du dossier. Tous les séjours reconstitués font 24 h, donc une
 * constante partagée : une nouvelle valeur à chaque rendu ferait recadrer la
 * chronologie en boucle, effaçant le zoom de l'étudiant à la moindre frappe.
 */
const STAY_BOUNDS = { lo: ADMISSION_MS, hi: ADMISSION_MS + STAY_MS }

// ---------- Bandeau d'identité ----------

function IdentityBar({ patient }: { patient: Patient }) {
  const lang = useLang()
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-t-md border border-b-0 bg-[var(--color-muted)] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <User2 className="size-4 text-[var(--color-muted-foreground)]" />
        <span className="font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Patient n°', 'Patient no.')} {patient.id}
        </span>
      </div>
      <span className="text-sm text-[var(--color-muted-foreground)]">
        {lang === 'en'
          ? `${Math.round(patient.age)} y · ${patient.sex === 1 ? 'Male' : 'Female'}`
          : `${Math.round(patient.age)} ans · ${patient.sex === 1 ? 'Homme' : 'Femme'}`}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
        <BedDouble className="size-3.5" />
        {pick(lang, 'Réanimation · lit', 'ICU · bed')} {6 + (patient.id % 12)}
      </span>
      <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
        {pick(lang, 'Admis il y a 24 h', 'Admitted 24 h ago')}
      </span>
    </div>
  )
}

// ---------- Un paramètre, modifiable ----------

/** Statut d'une valeur vis-à-vis de sa plage normale. */
function statusOf(value: number | null, normal: [number, number]): 'low' | 'high' | 'ok' | 'none' {
  if (value == null) return 'none'
  if (value < normal[0]) return 'low'
  if (value > normal[1]) return 'high'
  return 'ok'
}

function VitalTile({
  featureKey,
  value,
  imputed,
  onChange,
}: {
  featureKey: FeatureKey
  value: number | null
  imputed: boolean
  onChange: (v: number | null) => void
}) {
  const lang = useLang()
  const meta = { ...VARIABLE_BY_KEY[featureKey], ...varText(VARIABLE_BY_KEY[featureKey], lang) }
  const status = statusOf(value, meta.normal)
  // Le pas suit la précision clinique du paramètre : on ne règle pas une
  // température au battement près.
  const step = featureKey === 'temp' ? 0.1 : featureKey === 'lactate' || featureKey === 'creatinine' ? 0.1 : 1

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-md border p-3 transition-colors',
        status === 'high' && 'border-red-500/40 bg-red-500/5',
        status === 'low' && 'border-amber-500/40 bg-amber-500/5',
        status === 'ok' && 'border-[var(--color-border)]',
        status === 'none' && 'border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
          {meta.short}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              aria-label={pick(lang, 'Aide', 'Help')}
              className="cursor-help text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            >
              <Info className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs leading-relaxed">
            {meta.help} {pick(lang, 'Plage usuelle :', 'Normal range:')} {meta.normal[0]}–{meta.normal[1]} {meta.unit}.
          </TooltipContent>
        </Tooltip>
      </div>

      {value == null ? (
        <span className="text-sm text-[var(--color-muted-foreground)] italic">{pick(lang, 'non mesuré', 'not measured')}</span>
      ) : (
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'text-xl font-bold tabular-nums',
              status === 'high' && 'text-red-600 dark:text-red-400',
              status === 'low' && 'text-amber-600 dark:text-amber-400',
              status === 'ok' && 'text-[var(--color-foreground)]',
            )}
          >
            {value}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">{meta.unit}</span>
        </div>
      )}

      <input
        type="range"
        min={meta.normal[0] - (meta.normal[1] - meta.normal[0]) * 1.5}
        max={meta.normal[1] + (meta.normal[1] - meta.normal[0]) * 2}
        step={step}
        value={value ?? imputedValue(featureKey)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-blue-500"
      />

      {imputed && (
        <span className="text-[10px] text-amber-600 dark:text-amber-500">
          {pick(lang, 'valeur remplacée par la médiane', 'value replaced by the median')}
        </span>
      )}
    </div>
  )
}

// ---------- Le diagramme en cascade ----------

/**
 * Les contributions, triées par poids et dessinées en barres divergentes.
 *
 * Ce n'est pas un « top 5 des variables importantes » du modèle en général :
 * chaque barre vaut pour CE patient. Deux patients avec le même modèle auront
 * des barres différentes — c'est précisément ce que l'étape doit faire sentir.
 */
function ContributionChart({ items }: { items: Contribution[] }) {
  const sorted = [...items].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
  const maxAbs = Math.max(...sorted.map((c) => Math.abs(c.effect)), 0.01)
  const lang = useLang()

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map((c) => {
        const meta = VARIABLE_BY_KEY[c.key]
        const pushes = c.effect > 0
        const width = (Math.abs(c.effect) / maxAbs) * 50
        return (
          <div key={c.key} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-right text-[var(--color-muted-foreground)]">
              {varText(meta, lang).short}
            </span>
            <span
              className={cn(
                'w-16 shrink-0 text-right tabular-nums',
                c.imputed ? 'text-amber-600 italic dark:text-amber-500' : 'text-[var(--color-foreground)]',
              )}
            >
              {Math.round(c.value * 10) / 10}
            </span>
            {/* Une barre partant du centre : à droite elle pousse vers le sepsis,
                à gauche elle en éloigne. Le zéro est le patient moyen. */}
            <div className="relative h-4 flex-1">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--color-border)]" />
              <div
                className={cn(
                  'absolute inset-y-0.5 rounded-sm',
                  pushes ? 'bg-red-500/70' : 'bg-blue-500/70',
                )}
                style={
                  pushes
                    ? { left: '50%', width: `${width}%` }
                    : { right: '50%', width: `${width}%` }
                }
              />
            </div>
            <span
              className={cn(
                'w-12 shrink-0 tabular-nums',
                pushes ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
              )}
            >
              {c.effect > 0 ? '+' : ''}
              {c.effect.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- L'étape ----------

export function PatientRecordStep({ model }: { model: TrainedModel | null }) {
  const lang = useLang()
  const pct = (p: number) => `${(p * 100).toFixed(0)}${pick(lang, ' %', '%')}`
  const teaching = useMemo(() => pickTeachingPatients(lang), [lang])
  const [selected, setSelected] = useState(0)
  /** Valeurs modifiées par l'étudiant ; null = on garde celle du dossier. */
  const [edits, setEdits] = useState<Partial<Record<FeatureKey, number>>>({})
  /** L'issue réelle reste cachée tant que l'étudiant n'a pas jugé lui-même. */
  const [revealed, setRevealed] = useState(false)

  const entry = teaching[selected]
  const patient = entry?.patient

  const record = useMemo(() => (patient ? buildRecord(patient, lang) : null), [patient, lang])

  // Les valeurs effectivement soumises au modèle : celles du dossier, écrasées
  // par les réglages de l'étudiant.
  const values = useMemo(() => {
    if (!patient) return {}
    const base: Partial<Record<FeatureKey, number | null>> = {}
    for (const key of Object.keys(VARIABLE_BY_KEY) as FeatureKey[]) {
      base[key] = patient[key]
    }
    return { ...base, ...edits }
  }, [patient, edits])

  const items = useMemo(
    () => (model ? contributions(model, values, lang) : []),
    [model, values, lang],
  )

  const logOdds = useMemo(
    () => (model ? model.bias + items.reduce((a, c) => a + c.effect, 0) : 0),
    [model, items],
  )
  const proba = sigmoid(logOdds)

  const rows: TimelineRow[] = useMemo(() => {
    if (!record) return []
    const out: TimelineRow[] = record.series.map((s) => ({
      label: s.label,
      unit: s.unit,
      colour: s.colour,
      events: s.events,
      range: s.range,
    }))
    for (const e of record.events) {
      out.push({ label: e.label, colour: e.colour, events: e.events })
    }
    return out
  }, [record])

  if (!model || !patient || !record) {
    return (
      <Callout
        variant="amber"
        title={pick(lang, "Le modèle n'est pas encore entraîné", 'The model has not been trained yet')}
      >
        {pick(
          lang,
          <>
            Revenez à l'étape « Entraîner » et lancez l'entraînement : sans modèle, ce dossier ne peut
            afficher aucune prédiction.
          </>,
          <>
            Go back to the “Train and evaluate” step and run the training: without a model, this record cannot
            show any prediction.
          </>,
        )}
      </Callout>
    )
  }

  const alert = proba >= 0.5
  const edited = Object.keys(edits).length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Choix du patient */}
      <div className="flex flex-wrap gap-2">
        {teaching.map((t, i) => (
          <button
            key={t.patient.id}
            onClick={() => {
              setSelected(i)
              setEdits({})
              setRevealed(false)
            }}
            className={pillClass(i === selected, 'sm')}
          >
            {pick(lang, 'Patient n°', 'Patient no.')} {t.patient.id}
          </button>
        ))}
      </div>

      {/* Le dossier, façon logiciel de réanimation */}
      <div>
        <IdentityBar patient={patient} />

        {/* Le bandeau d'alerte, exactement là où un logiciel le mettrait :
            en tête du dossier, avant même les paramètres. */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-3 border border-b-0 px-4 py-3',
            alert
              ? 'border-red-500/40 bg-red-500/10'
              : 'border-emerald-500/40 bg-emerald-500/10',
          )}
        >
          {alert ? (
            <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <ShieldCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="flex flex-col">
            <span
              className={cn(
                'text-sm font-semibold',
                alert ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400',
              )}
            >
              {alert ? pick(lang, 'Alerte sepsis', 'Sepsis alert') : pick(lang, 'Pas d’alerte', 'No alert')}
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {pick(lang, 'Risque estimé par le modèle, seuil d’alerte à 50 %', 'Risk estimated by the model, alert threshold at 50%')}
            </span>
          </div>
          <span
            className={cn(
              'ml-auto text-3xl font-bold tabular-nums',
              alert ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            {pct(proba)}
          </span>
        </div>

        {/* La chronologie : c'est elle qui montre qu'un dossier est une histoire,
            pas une photographie. */}
        <div className="h-[300px] border border-b-0 bg-[var(--color-card)] p-2">
          <RecordTimeline rows={rows} bounds={STAY_BOUNDS} admissionMs={ADMISSION_MS} />
        </div>

        {/* Les paramètres vitaux, modifiables */}
        <div className="rounded-b-md border bg-[var(--color-card)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
              <Activity className="size-4 text-blue-600 dark:text-blue-400" />
              {pick(lang, 'Dernières valeurs', 'Latest values')}
            </span>
            {edited && (
              <Button size="sm" variant="outline" onClick={() => setEdits({})} className="cursor-pointer gap-1.5">
                <RotateCcw className="size-3.5" />
                {pick(lang, 'Rétablir le dossier', 'Restore the record')}
              </Button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {model.features
              .filter((k) => k !== 'age')
              .map((key) => (
                <VitalTile
                  key={key}
                  featureKey={key}
                  value={values[key] ?? null}
                  imputed={patient[key] == null && edits[key] == null}
                  onChange={(v) => setEdits((e) => ({ ...e, [key]: v as number }))}
                />
              ))}
          </div>
        </div>
      </div>

      {/* L'explicabilité */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2 font-semibold text-[var(--color-foreground)]">
            <FlaskConical className="size-4 text-blue-600 dark:text-blue-400" />
            {pick(lang, 'Pourquoi le modèle dit-il cela ?', 'Why does the model say this?')}
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              <>
                Chaque barre montre ce que la variable a poussé, <em>chez ce patient</em>. À droite en
                rouge, elle pousse vers l’alerte ; à gauche en bleu, elle en éloigne. Le point de départ
                est le patient moyen de la cohorte.
              </>,
              <>
                Each bar shows how much the variable pushed, <em>for this patient</em>. To the right in
                red, it pushes towards the alert; to the left in blue, it pushes away from it. The
                starting point is the average patient in the cohort.
              </>,
            )}
          </p>

          <ContributionChart items={items} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-[var(--color-muted-foreground)]">
            <span>
              {pick(lang, 'Patient moyen :', 'Average patient:')}{' '}
              <span className="tabular-nums">{pct(sigmoid(model.bias))}</span>
            </span>
            <span>+ contributions</span>
            <span className="font-medium text-[var(--color-foreground)]">
              = <span className="tabular-nums">{pct(proba)}</span>{' '}
              {pick(lang, 'pour ce patient', 'for this patient')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Callout variant="amber" title={pick(lang, 'Ce que ce diagramme ne dit pas', 'What this chart does not say')}>
        {pick(
          lang,
          <>
            Le modèle annonce que le lactate pèse lourd dans sa décision. Cela ne veut pas dire que
            <strong> faire baisser le lactate</strong> ferait baisser le risque de sepsis : le lactate
            monte <em>parce que</em> le patient s’aggrave, il n’en est pas la cause. Un modèle explique
            ses corrélations, jamais ses causes — et c’est vrai de tous les outils d’« IA explicable »
            que vous croiserez.
          </>,
          <>
            The model reports that lactate weighs heavily in its decision. That does not mean that
            <strong> lowering lactate</strong> would lower the risk of sepsis: lactate rises{' '}
            <em>because</em> the patient is deteriorating, it is not the cause. A model explains its
            correlations, never their causes — and that holds for every “explainable AI” tool you will
            come across.
          </>,
        )}
      </Callout>

      {/* L'issue réelle, après coup seulement : jugez d'abord le dossier, comme
          au lit du patient — vous n'avez jamais la réponse d'avance. */}
      <Button
        variant="outline"
        className="w-fit cursor-pointer gap-2"
        onClick={() => setRevealed((r) => !r)}
      >
        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        {revealed
          ? pick(lang, 'Masquer l’issue de ce patient', 'Hide this patient’s outcome')
          : pick(lang, 'Ce patient a-t-il fait un sepsis ?', 'Did this patient develop sepsis?')}
      </Button>
      {revealed && (
        <Callout
          variant={patient.sepsis === 1 ? 'red' : 'emerald'}
          title={
            patient.sepsis === 1
              ? pick(lang, 'Ce patient a fait un sepsis pendant son séjour', 'This patient developed sepsis during the stay')
              : pick(lang, 'Ce patient n’a pas fait de sepsis', 'This patient did not develop sepsis')
          }
        >
          {lang === 'en' ? (
            <p>
              The model predicted <strong>{pct(proba)}</strong>, so{' '}
              {alert ? 'an alert' : 'no alert'} at the 50% threshold.{' '}
              {alert === (patient.sepsis === 1)
                ? 'It got this patient right.'
                : patient.sepsis === 1
                  ? 'This is a missed sepsis — the most serious type of error here.'
                  : 'This is a false alarm: a patient flagged for nothing.'}
            </p>
          ) : (
            <p>
              Le modèle annonçait <strong>{pct(proba)}</strong>, donc{' '}
              {alert ? 'une alerte' : 'pas d’alerte'} au seuil de 50 %.{' '}
              {alert === (patient.sepsis === 1)
                ? 'Il a vu juste sur ce patient.'
                : patient.sepsis === 1
                  ? 'C’est un sepsis manqué — le type d’erreur le plus grave ici.'
                  : 'C’est une fausse alerte : un patient signalé pour rien.'}
            </p>
          )}
          {entry.note && <p className="mt-2">{entry.note}</p>}
        </Callout>
      )}
    </div>
  )
}

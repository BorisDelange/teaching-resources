import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import {
  Stethoscope,
  Database,
  Scale,
  Target,
  Users,
  Cpu,
  Gauge,
  SlidersHorizontal,
  User2,
  ShieldAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  FlaskConical,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  TriangleAlert,
  BarChart3,
  BookOpen,
  CircleSlash,
  Construction,
  Library,
  LineChart,
  Grid3x3,
  Wrench,
  Wand2,
  UserMinus,
  Trophy,
  RotateCcw,
  Repeat,
  PanelLeft,
  PanelRight,
} from 'lucide-react'
import { type Data, type Layout } from 'plotly.js-dist-min'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlotlyChart } from '@/components/PlotlyChart'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'
import { useLang, pick, type Lang } from '@/lib/useLang'
import { COHORT } from '@/features/courses/modules/sepsis/cohort'
import {
  VARIABLES,
  VARIABLE_BY_KEY,
  type FeatureKey,
  varText,
} from '@/features/courses/modules/sepsis/variables'
import {
  trainModel,
  confusionAt,
  rocCurve,
  leakageDemo,
  type TrainedModel,
} from '@/features/courses/modules/sepsis/model'
import { Callout, MetricCard, SectionTitle } from '@/features/courses/modules/sepsis/ui'
import { Panel, PaneTitle, Workbench, Disclosure } from '@/features/courses/modules/sepsis/blocks'
import { pillClass } from '@/features/courses/modules/sepsis/styles'
import { togglePane, usePaneVisibility } from '@/features/courses/modules/sepsis/workbench'
import { useRememberStep } from '@/lib/last-step'
// Les blocs d'article du cours « Utiliser un LLM » : mêmes encadrés, mêmes
// cartes, pour que le TD et le cours qui le prépare se ressemblent. Renommés à
// l'import, `Callout` étant déjà pris par les encadrés compacts du TD.
import {
  CardGrid,
  DataCard,
  Callout as ArticleCallout,
  Summary as ArticleSummary,
} from '@/components/article/blocks'
import { Qcm, OpenQuestion, GuessReveal } from '@/features/courses/modules/sepsis/interactive'
import { DataTable } from '@/features/courses/modules/sepsis/DataTable'
import { PatientRecordStep } from '@/features/courses/modules/sepsis/PatientRecordStep'
import { SourcesStep } from '@/features/courses/modules/sepsis/SourcesStep'
import {
  RawRecordBlock,
  AggregationBlock,
  VariableBudget,
  VariableDefinitionBlock,
} from '@/features/courses/modules/sepsis/RawRecord'
import { CorrelationHeatmap } from '@/features/courses/modules/sepsis/Correlation'
import { ImputationDemo } from '@/features/courses/modules/sepsis/Imputation'
import { CompleteCaseDemo } from '@/features/courses/modules/sepsis/CompleteCase'

const STEPS = [
  { id: 'intro', label: 'Introduction', en: 'Introduction', icon: BookOpen },
  { id: 'case', label: 'Le cas', en: 'The case', icon: Stethoscope },
  { id: 'data', label: 'Comprendre les données', en: 'Understanding the data', icon: Database },
  { id: 'prepare', label: 'Préparer les données', en: 'Preparing the data', icon: Wrench },
  { id: 'train', label: 'Entraîner et évaluer', en: 'Train and evaluate', icon: Cpu },
  { id: 'threshold', label: 'Le seuil', en: 'The threshold', icon: SlidersHorizontal },
  { id: 'patients', label: 'Cas individuels', en: 'Individual cases', icon: User2 },
  { id: 'critique', label: 'Regard critique', en: 'Critical appraisal', icon: ShieldAlert },
  { id: 'sources', label: 'Sources', en: 'Sources', icon: Library },
] as const

function stepLabel(s: (typeof STEPS)[number], lang: Lang): string {
  return pick(lang, s.label, s.en)
}

/** Un pourcentage à la typographie de la langue : « 12 % » en français, « 12% » en anglais. */
function pct(value: number, lang: Lang, digits = 0): string {
  return `${value.toFixed(digits)}${pick(lang, ' %', '%')}`
}

const PLOT_CONFIG = { displayModeBar: false, responsive: true }
const COLOR_SEPSIS = '#ef4444'
const COLOR_NO = '#3b82f6'
const BASE_FONT = { family: 'Inter, sans-serif', size: 12 }

function baseLayout(extra: Partial<Layout>): Partial<Layout> {
  return {
    font: BASE_FONT,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 55, r: 20, t: 12, b: 45 },
    ...extra,
  }
}

const GRID = 'rgba(128,128,128,0.15)'
// Thin bars with a crisp white outline (requested UI polish).
const BAR_LINE = { color: '#ffffff', width: 1 }

// ---------- shared model state ----------

interface ModelConfig {
  features: FeatureKey[]
  trainFraction: number
  seed: number
}

const DEFAULT_FEATURES: FeatureKey[] = ['hr', 'sbp', 'temp', 'resp', 'o2sat', 'lactate', 'wbc', 'creatinine']

// ==================================================================
// Barre de navigation
// ==================================================================

/**
 * La barre du haut, et la seule.
 *
 * Huit onglets déployés occupaient une bande entière pour une étape consultée à
 * la fois, et la navigation était dédoublée en bas de page. Tout tient
 * désormais ici, comme dans le TD chatbots : la liste complète à un clic dans
 * le menu central, et des boutons qui portent le NOM de l'étape voisine — on
 * sait où l'on va avant de cliquer.
 */
/** Le bouton qui replie ou déplie une colonne latérale de la paillasse. */
function PaneToggle({
  side,
  open,
  label,
  className,
}: {
  side: 'left' | 'right'
  open: boolean
  label: string
  className?: string
}) {
  const Icon = side === 'left' ? PanelLeft : PanelRight
  return (
    <button
      onClick={() => togglePane(side)}
      title={label}
      aria-label={label}
      aria-pressed={open}
      className={cn(
        'absolute top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-md p-1.5 transition-colors hover:bg-[var(--color-accent)]',
        open ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]',
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

function NavBar({
  stepIndex,
  onPrev,
  onNext,
  onSelect,
  showPaneToggles,
}: {
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  onSelect: (i: number) => void
  showPaneToggles: boolean
}) {
  const lang = useLang()
  const total = STEPS.length
  const previous = stepIndex > 0 ? STEPS[stepIndex - 1] : null
  const next = stepIndex < total - 1 ? STEPS[stepIndex + 1] : null
  const current = STEPS[stepIndex]
  const CurrentIcon = current.icon
  const panes = usePaneVisibility()

  return (
    <div className="relative shrink-0 border-b bg-[var(--color-card)]">
      {/* Les bascules de colonnes rejoignent cette barre : elles commandent la
          disposition, elles ont leur place avec la navigation. */}
      {showPaneToggles && (
        <>
          <PaneToggle
            side="left"
            open={panes.left}
            label={pick(lang, 'Afficher/masquer les réglages', 'Show/hide settings')}
            className="left-2 hidden xl:flex"
          />
          <PaneToggle
            side="right"
            open={panes.right}
            label={pick(lang, "Afficher/masquer l'historique", 'Show/hide history')}
            className="right-2 hidden xl:flex"
          />
        </>
      )}

      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        {/* `min-w-0` + `truncate` : un libellé long rétrécit au lieu de pousser
            le menu central hors de l'écran. */}
        <Button
          variant="outline"
          size="sm"
          disabled={!previous}
          onClick={onPrev}
          className="min-w-0 cursor-pointer gap-1.5"
          title={previous ? stepLabel(previous, lang) : undefined}
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="truncate">
            {previous ? stepLabel(previous, lang) : pick(lang, 'Précédent', 'Previous')}
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="min-w-0 cursor-pointer gap-1.5">
              <CurrentIcon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" />
              <span className="truncate font-medium">{stepLabel(current, lang)}</span>
              <span className="shrink-0 text-xs font-normal tabular-nums text-[var(--color-muted-foreground)]">
                {stepIndex + 1}/{total}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            </Button>
          </DropdownMenuTrigger>
          {/* Ancrée en haut, la barre laisse le menu s'ouvrir vers le bas. */}
          <DropdownMenuContent align="center" side="bottom" className="max-h-[70vh] overflow-y-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => onSelect(i)}
                  className={cn(
                    'cursor-pointer gap-2',
                    i === stepIndex && 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="flex-1">{stepLabel(s, lang)}</span>
                  <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                    {i + 1}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          disabled={!next}
          onClick={onNext}
          className="min-w-0 cursor-pointer gap-1.5"
          title={next ? stepLabel(next, lang) : undefined}
        >
          <span className="truncate">{next ? stepLabel(next, lang) : pick(lang, 'Suivant', 'Next')}</span>
          <ChevronRight className="size-4 shrink-0" />
        </Button>
      </div>
    </div>
  )
}

// ==================================================================
// Step 0 — Introduction / objectives
// ==================================================================

const OBJECTIVES: { fr: ReactNode; en: ReactNode }[] = [
  {
    fr: (
      <>
        Décrire les <strong>grandes étapes</strong> de construction d’un modèle prédictif, des données à
        l’évaluation
      </>
    ),
    en: (
      <>
        Describe the <strong>main stages</strong> of building a predictive model, from data to
        evaluation
      </>
    ),
  },
  {
    fr: (
      <>
        Identifier l’impact de la <strong>qualité des données</strong> et de leur représentativité sur
        les performances
      </>
    ),
    en: (
      <>
        Identify how <strong>data quality</strong> and representativeness affect performance
      </>
    ),
  },
  {
    fr: (
      <>
        Interpréter les <strong>indicateurs de performance</strong> (AUC, sensibilité, spécificité, VPP,
        VPN) en contexte clinique
      </>
    ),
    en: (
      <>
        Interpret <strong>performance metrics</strong> (AUC, sensitivity, specificity, PPV, NPV) in a
        clinical context
      </>
    ),
  },
  {
    fr: (
      <>
        Comprendre qu’un <strong>seuil de décision</strong> est un choix clinique et éthique, pas une
        propriété du modèle
      </>
    ),
    en: (
      <>
        Understand that a <strong>decision threshold</strong> is a clinical and ethical choice, not a
        property of the model
      </>
    ),
  },
  {
    fr: (
      <>
        Repérer les situations où un modèle peut être <strong>biaisé</strong> ou moins fiable
      </>
    ),
    en: (
      <>
        Recognise situations where a model may be <strong>biased</strong> or less reliable
      </>
    ),
  },
  {
    fr: (
      <>
        Adopter une <strong>posture critique</strong> face à un outil d’aide à la décision
      </>
    ),
    en: (
      <>
        Take a <strong>critical stance</strong> towards a decision-support tool
      </>
    ),
  },
]

function IntroStep({ onStart }: { onStart: () => void }) {
  const lang = useLang()
  return (
    <div className="flex flex-col gap-6">
      {/* L'avertissement se lit une fois, en entrant : le laisser barrer toutes
          les étapes coûterait de la hauteur à chaque écran. */}
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-500">
        <Construction className="mt-0.5 size-4 shrink-0" />
        <span>
          {pick(
            lang,
            'Ce TD est en cours de construction : son contenu et ses fonctionnalités peuvent encore évoluer.',
            'This tutorial is still under construction: its content and features may change.',
          )}
        </span>
      </div>

      <SectionTitle
        subtitle={pick(
          lang,
          "TD — Comprendre la construction d'un système d'aide à la décision médicale",
          'Tutorial — Understanding how a clinical decision-support system is built',
        )}
      >
        {pick(lang, 'Prédire le sepsis : de la donnée à la décision', 'Predicting sepsis: from data to decision')}
      </SectionTitle>

      <Callout variant="blue" title={pick(lang, 'À quoi sert ce TD ?', 'What is this tutorial for?')}>
        {pick(
          lang,
          <>
            <p>
              Vous serez, dans votre pratique, confrontés à des outils d'« intelligence artificielle »
              qui prétendent vous aider à décider : prédire un risque, déclencher une alerte, proposer un
              diagnostic. Ce TD vous met dans la peau de ceux qui <strong>construisent</strong> un tel
              outil, pour mieux savoir, ensuite, le <strong>challenger</strong> en tant que clinicien.
            </p>
            <p className="mt-3">
              Nous suivrons tout le parcours d'un modèle prédictif de <strong>sepsis</strong> en
              réanimation : explorer de vraies données, entraîner un modèle, lire ses performances,
              choisir un seuil de décision, analyser des cas individuels, et enfin poser un regard
              critique. <strong>Pas besoin de savoir programmer</strong> : vous manipulez, vous observez,
              vous réfléchissez.
            </p>
          </>,
          <>
            <p>
              In your practice, you will encounter “artificial intelligence” tools that claim to help
              you decide: predicting a risk, triggering an alert, suggesting a diagnosis. This tutorial
              puts you in the shoes of those who <strong>build</strong> such a tool, so that you are
              better equipped to <strong>challenge</strong> it later as a clinician.
            </p>
            <p className="mt-3">
              We will follow the whole journey of a predictive model for <strong>sepsis</strong> in the
              intensive care unit (ICU): exploring real data, training a model, reading its
              performance, choosing a decision threshold, analysing individual cases, and finally
              taking a critical look. <strong>No programming required</strong>: you experiment, you
              observe, you think.
            </p>
          </>,
        )}
      </Callout>

      <Callout variant="emerald" title={pick(lang, 'Objectifs pédagogiques', 'Learning objectives')}>
        <p>{pick(lang, "À l'issue du TD, vous serez capable de :", 'By the end of this tutorial, you will be able to:')}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {OBJECTIVES.map((o, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{pick(lang, o.fr, o.en)}</span>
            </li>
          ))}
        </ul>
      </Callout>

      <div className="flex justify-end">
        <Button className="cursor-pointer" onClick={onStart}>
          {pick(lang, 'Commencer', 'Start')} <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

// ==================================================================
// Step 1 — Clinical case
// ==================================================================

function CaseStep() {
  const lang = useLang()
  return (
    /* Pas de `gap` : les blocs d'article portent leur propre marge verticale, et
       l'addition des deux doublait l'espacement. Le `my-6` de ces blocs est
       resserré à `my-4` ici — un TD s'enchaîne plus vite qu'un cours qui se lit,
       et l'étape tient alors sans défilement inutile. La règle ne vise que les
       enfants directs (`>`), pour ne pas écraser les marges internes des blocs ;
       `first:mt-0` évite un blanc au-dessus du titre, qui ouvre l'étape. */
    <div className="flex flex-col [&>*]:my-4 [&>*:first-child]:mt-0">
      <SectionTitle
        subtitle={pick(
          lang,
          'Un problème clinique fréquent, grave, et où chaque heure compte.',
          'A common, serious clinical problem where every hour counts.',
        )}
      >
        {pick(lang, "Faut-il déclencher l'alerte « sepsis » ?", 'Should the “sepsis” alert be triggered?')}
      </SectionTitle>

      <ArticleSummary title={pick(lang, 'La situation', 'The situation')}>
        {pick(
          lang,
          <>
            Vous êtes en réanimation. Un patient vient d'être admis. Ses paramètres vitaux et quelques
            résultats de laboratoire sont disponibles. La question qui vous préoccupe :{' '}
            <strong>ce patient va-t-il évoluer vers un sepsis</strong> dans les prochaines heures ? Le
            sepsis est une réponse inflammatoire dérégulée à une infection, qui peut conduire à une
            défaillance d'organe et au décès. Le détecter <strong>tôt</strong> permet d'agir avant
            l'aggravation.
          </>,
          <>
            You are working in the ICU. A patient has just been admitted. Their vital signs and a few
            lab results are available. The question on your mind:{' '}
            <strong>will this patient progress to sepsis</strong> in the next few hours? Sepsis is a
            dysregulated host response to infection that can lead to organ failure and death.
            Detecting it <strong>early</strong> makes it possible to act before the patient
            deteriorates.
          </>,
        )}
      </ArticleSummary>

      {/* Les deux erreurs côte à côte, dans les couleurs qu'elles portent
          partout ailleurs dans le TD : rouge pour le sepsis manqué, ambre pour
          la fausse alerte. Elles reviendront telles quelles à l'étape du seuil. */}
      <CardGrid>
        <DataCard
          icon={AlertTriangle}
          color="rose"
          title={pick(lang, 'Rater un sepsis — faux négatif', 'Missing a sepsis — false negative')}
        >
          {pick(
            lang,
            <>
              Le modèle rassure à tort : on retarde le traitement. Conséquence possible : choc septique,
              décès. C'est l'erreur la plus grave.
            </>,
            <>
              The model falsely reassures: treatment is delayed. Possible consequences: septic shock,
              death. This is the most serious error.
            </>,
          )}
        </DataCard>
        <DataCard
          icon={AlertTriangle}
          color="amber"
          title={pick(lang, 'Sur-alerter — faux positif', 'Over-alerting — false positive')}
        >
          {pick(
            lang,
            <>
              Le modèle alerte trop souvent : examens et antibiotiques inutiles, et surtout les soignants
              finissent par ignorer les alertes (« fatigue d'alarme »).
            </>,
            <>
              The model alerts too often: unnecessary tests and antibiotics, and above all, staff end
              up ignoring the alerts (“alarm fatigue”).
            </>,
          )}
        </DataCard>
      </CardGrid>

      <div>
        <OpenQuestion
          id="case-which-error"
          question={pick(
            lang,
            'Selon vous, laquelle de ces deux erreurs est la plus « acceptable » pour un outil de dépistage du sepsis ? Y a-t-il une bonne réponse universelle ?',
            'In your opinion, which of these two errors is more “acceptable” for a sepsis screening tool? Is there a universally right answer?',
          )}
          hint={pick(
            lang,
            'Pensez au patient, mais aussi au service et aux soignants.',
            'Think about the patient, but also about the ward and the staff.',
          )}
          reveal={pick(
            lang,
            <>
              Il n'y a pas de réponse unique. En dépistage d'une maladie grave et traitable, on
              préfère souvent <strong>rater le moins de sepsis possible</strong> (limiter les faux
              négatifs), quitte à accepter plus de fausses alertes. Mais trop de fausses alertes
              détruit la confiance dans l'outil (fatigue d'alarme) et peut, paradoxalement, aggraver
              la prise en charge. C'est un <strong>arbitrage</strong> — nous verrons qu'il se règle
              avec le <em>seuil de décision</em>.
            </>,
            <>
              There is no single answer. When screening for a serious, treatable disease, we often
              prefer to <strong>miss as few sepsis cases as possible</strong> (limit false
              negatives), even if it means accepting more false alerts. But too many false alerts
              destroy trust in the tool (alarm fatigue) and can, paradoxically, worsen care. It is a{' '}
              <strong>trade-off</strong> — and we will see that it is set with the{' '}
              <em>decision threshold</em>.
            </>,
          )}
        />
      </div>

    </div>
  )
}

// ==================================================================
// Step 2 — Explore data
// ==================================================================

/**
 * Prépare le tracé de densité de deux groupes sur des tranches communes.
 *
 * Les bornes sont calculées une fois, sur la réunion des deux groupes, puis
 * réutilisées pour chacun : c'est ce qui rend les deux courbes superposables.
 * Laisser Plotly découper lui-même donnerait à chaque série ses propres
 * tranches, et deux courbes qu'on ne peut pas comparer.
 *
 * La courbe est une ESTIMATION PAR NOYAU, et non un histogramme relié. Avec
 * seulement ~70 patients septiques, un découpage en tranches met deux ou trois
 * patients par tranche : la courbe monte et descend au gré du hasard, et cette
 * dentelure se lit à tort comme une structure de la distribution. Le noyau
 * gaussien fait contribuer chaque patient à tout son voisinage, ce qui donne
 * une courbe lisse dont les bosses correspondent à de vrais rassemblements de
 * patients.
 *
 * La largeur de fenêtre suit la règle de Silverman, qui l'élargit quand les
 * effectifs sont faibles — le petit groupe est donc lissé plus fort que le
 * grand, ce qui est exactement ce qu'on veut : c'est lui le plus bruité.
 *
 * L'ordonnée est un POURCENTAGE du groupe, jamais un effectif : à 730 contre
 * 70, le groupe majoritaire écraserait l'autre.
 */
const CURVE_POINTS = 120

/** Écart-type d'un échantillon. */
function stdDev(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const mean = values.reduce((a, v) => a + v, 0) / n
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1))
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))]
}

function curveFor(all: number[]) {
  const sortedAll = [...all].sort((a, b) => a - b)
  // L'axe part de 0 quand la variable le permet — une fréquence cardiaque ou un
  // lactate n'ont pas de sens négatif, et un axe qui démarre à 12 exagère
  // visuellement des écarts minuscules. Le haut s'arrête au 98e centile : une
  // seule valeur aberrante tasserait sinon toute la distribution à gauche.
  const lo = 0
  const hi = quantile(sortedAll, 0.98) || 1
  const step = (hi - lo) / (CURVE_POINTS - 1)
  const grid = Array.from({ length: CURVE_POINTS }, (_, i) => lo + step * i)

  return (values: number[]) => {
    const n = values.length
    if (n === 0) return { x: grid, y: grid.map(() => 0) }

    // Règle de Silverman, bornée : sur une variable très resserrée, une fenêtre
    // trop étroite ferait réapparaître la dentelure qu'on cherche à supprimer.
    const sd = stdDev(values) || 1
    const sortedVals = [...values].sort((a, b) => a - b)
    const iqr = quantile(sortedVals, 0.75) - quantile(sortedVals, 0.25)
    const spread = iqr > 0 ? Math.min(sd, iqr / 1.349) : sd
    const bandwidth = Math.max(0.9 * spread * Math.pow(n, -0.2), (hi - lo) / 40)

    const y = grid.map((x) => {
      let sum = 0
      for (const v of values) {
        const z = (x - v) / bandwidth
        sum += Math.exp(-0.5 * z * z)
      }
      return sum / (n * bandwidth * Math.sqrt(2 * Math.PI))
    })
    // Densité → pourcentage par unité, pour que l'ordonnée se lise « % des
    // patients du groupe par unité de la variable ».
    return { x: grid, y: y.map((d) => d * 100) }
  }
}

function completeness(key: FeatureKey) {
  const present = COHORT.filter((p) => p[key] !== null).length
  return (present / COHORT.length) * 100
}

/** Le taux de données manquantes — c'est lui qu'on rapporte dans un article. */
function missingness(key: FeatureKey) {
  return 100 - completeness(key)
}

function DataStep() {
  const lang = useLang()
  const [selected, setSelected] = useState<FeatureKey>('lactate')
  const meta = VARIABLE_BY_KEY[selected]
  const nSepsis = COHORT.filter((p) => p.sepsis === 1).length
  const nNoSepsis = COHORT.length - nSepsis

  const histogram = useMemo<Data[]>(() => {
    const sepsisVals = COHORT.filter((p) => p.sepsis === 1 && p[selected] !== null).map((p) => p[selected] as number)
    const noVals = COHORT.filter((p) => p.sepsis === 0 && p[selected] !== null).map((p) => p[selected] as number)
    const noLabel = pick(lang, 'Pas de sepsis', 'No sepsis')
    const ofPatients = pick(lang, '%{y:.1f} % des patients', '%{y:.1f}% of patients')

    // Les deux groupes n'ont pas du tout la même taille (≈ 730 contre ≈ 70) :
    // en effectifs bruts, la courbe « sepsis » serait écrasée au ras de l'axe et
    // la comparaison impossible. On trace donc une DENSITÉ — la part du groupe
    // qui tombe dans chaque tranche — sur des tranches IDENTIQUES pour les deux
    // groupes, seule façon de superposer honnêtement deux effectifs inégaux.
    const curve = curveFor([...noVals, ...sepsisVals])
    return [
      {
        ...curve(noVals),
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        name: `${noLabel} (n = ${noVals.length})`,
        // Pas de `spline` : la courbe est déjà lisse par construction, et
        // l'interpolation ajouterait des ondulations entre des points justes.
        line: { color: COLOR_NO, width: 2.5 },
        fillcolor: 'rgba(59,130,246,0.18)',
        hovertemplate: `${ofPatients}<extra>${noLabel}</extra>`,
      },
      {
        ...curve(sepsisVals),
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        name: `Sepsis (n = ${sepsisVals.length})`,
        line: { color: COLOR_SEPSIS, width: 2.5 },
        fillcolor: 'rgba(239,68,68,0.18)',
        hovertemplate: `${ofPatients}<extra>Sepsis</extra>`,
      },
    ]
  }, [selected, lang])

  const histoLayout = useMemo<Partial<Layout>>(
    () =>
      baseLayout({
        height: 320,
        hovermode: 'x unified',
        legend: { orientation: 'h', y: 1.15 },
        // La plage usuelle en fond : sans ce repère, l'étudiant lit deux
        // courbes sans savoir laquelle penche du côté pathologique.
        shapes: [
          {
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: meta.normal[0],
            x1: meta.normal[1],
            y0: 0,
            y1: 1,
            fillcolor: 'rgba(16,185,129,0.07)',
            line: { width: 0 },
            layer: 'below',
          },
        ],
        annotations: [
          {
            x: (meta.normal[0] + meta.normal[1]) / 2,
            y: 1,
            xref: 'x',
            yref: 'paper',
            text: pick(lang, 'Plage usuelle', 'Normal range'),
            showarrow: false,
            font: { size: 10, color: 'rgba(16,185,129,0.9)' },
            yanchor: 'bottom',
          },
        ],
        xaxis: {
          title: { text: `${varText(meta, lang).label} (${varText(meta, lang).unit})` },
          gridcolor: GRID,
          zeroline: false,
          rangemode: 'tozero',
        },
        yaxis: {
          title: { text: pick(lang, 'Densité de patients', 'Patient density') },
          gridcolor: GRID,
          zeroline: false,
          rangemode: 'tozero',
          showticklabels: false,
        },
      }),
    [meta, lang],
  )

  return (
    /* Comme l'étape « Le cas » : les blocs d'article portent leur propre marge,
       resserrée ici, et le titre n'en prend pas au-dessus. */
    <div className="flex flex-col [&>*]:my-4 [&>*:first-child]:mt-0">
      <SectionTitle
        subtitle={pick(
          lang,
          "D'où viennent les données, à quoi ressemble un dossier, et comment passe-t-on de milliers de mesures à un tableau qu'un modèle peut lire ?",
          'Where do the data come from, what does a patient record look like, and how do we go from thousands of measurements to a table a model can read?',
        )}
      >
        {pick(lang, 'Comprendre les données', 'Understanding the data')}
      </SectionTitle>

      {/* D'où viennent les données. Même structure que le cours « Utiliser un
          LLM » : un encadré teinté pour le propos, puis des cartes sobres pour
          les faits — plutôt qu'un titre bleu posé sur du blanc. */}
      <ArticleCallout type="info" title={pick(lang, "D'où viennent ces données ?", 'Where do these data come from?')}>
        {pick(
          lang,
          <>
            On ne fabrique pas un modèle à partir de rien : il faut d'abord des données de patients
            réels, recueillies dans un cadre précis. Les nôtres proviennent d'un{' '}
            <strong>grand jeu de données public de recherche</strong>, le{' '}
            <em>PhysioNet / Computing in Cardiology Challenge 2019</em>, constitué pour stimuler la
            recherche sur la détection précoce du sepsis.
          </>,
          <>
            A model is not built out of nothing: you first need data from real patients, collected
            within a well-defined framework. Ours come from a{' '}
            <strong>large public research dataset</strong>, the{' '}
            <em>PhysioNet / Computing in Cardiology Challenge 2019</em>, created to stimulate research
            on the early detection of sepsis.
          </>,
        )}
      </ArticleCallout>

      <CardGrid>
        <DataCard icon={Users} title={pick(lang, 'Qui ?', 'Who?')}>
          {pick(
            lang,
            <>
              ~40 000 patients de réanimation, issus de deux systèmes hospitaliers universitaires
              américains.
            </>,
            <>~40,000 ICU patients from two US academic hospital systems.</>,
          )}
        </DataCard>
        <DataCard icon={Activity} color="teal" title={pick(lang, 'Quoi ?', 'What?')}>
          {pick(
            lang,
            <>
              Paramètres vitaux et examens biologiques, relevés <strong>heure par heure</strong>{' '}
              pendant le séjour, à partir du dossier patient informatisé.
            </>,
            <>
              Vital signs and lab tests, recorded <strong>hour by hour</strong> during the stay, from
              the electronic health record.
            </>,
          )}
        </DataCard>
        <DataCard
          icon={Target}
          color="rose"
          title={pick(lang, 'Comment définit-on le « sepsis » ?', 'How is “sepsis” defined?')}
        >
          {pick(
            lang,
            <>
              Selon la définition internationale <strong>Sepsis-3</strong> (aggravation du score
              d'organe SOFA + suspicion d'infection). C'est l'<strong>étiquette</strong> à prédire.
            </>,
            <>
              Using the international <strong>Sepsis-3</strong> definition (an increase in the SOFA
              organ dysfunction score + suspected infection). This is the <strong>label</strong> to
              predict.
            </>,
          )}
        </DataCard>
        <DataCard
          icon={Scale}
          color="emerald"
          title={pick(lang, 'Peut-on les réutiliser ?', 'Can they be reused?')}
        >
          {pick(
            lang,
            <>
              Oui : données anonymisées, publiées sous licence libre{' '}
              <strong>ODbL</strong> — réutilisation autorisée, à condition de citer la source et de
              repartager sous la même licence.
            </>,
            <>
              Yes: anonymised data, published under the open <strong>ODbL</strong> licence — reuse is
              allowed, provided you cite the source and share alike under the same licence.
            </>,
          )}
        </DataCard>
      </CardGrid>

      <ArticleCallout
        type="warning"
        title={pick(lang, 'Ce que nous en avons fait pour ce TD', 'What we did with them for this tutorial')}
      >
        <p>
          {pick(
            lang,
            <>
              Les données d'origine sont lourdes et complexes (des millions de lignes horaires). Pour ce
              TD, nous en avons tiré une version simplifiée : <strong>un résumé par patient</strong>{' '}
              (ses premières heures en réanimation), soit {COHORT.length} patients et une dizaine de
              variables. Nous allons justement voir comment on passe de l'un à l'autre.
            </>,
            <>
              The original data are large and complex (millions of hourly rows). For this tutorial, we
              derived a simplified version: <strong>one summary per patient</strong> (their first
              hours in the ICU), i.e. {COHORT.length} patients and about ten variables. We will see
              exactly how to get from one to the other.
            </>,
          )}
        </p>
        <p className="mt-2 text-xs">
          {pick(lang, 'Source', 'Source')} : Reyna MA et al., <em>Early Prediction of Sepsis from Clinical Data: The
          PhysioNet/Computing in Cardiology Challenge 2019</em>, Critical Care Medicine 2020.
        </p>
      </ArticleCallout>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title={pick(lang, 'Patients', 'Patients')} value={String(COHORT.length)} icon={User2} accent="blue" />
        <MetricCard
          title={pick(lang, 'Ont développé un sepsis', 'Developed sepsis')}
          value={`${nSepsis}`}
          detail={`${pct((nSepsis / COHORT.length) * 100, lang, 1)} ${pick(lang, 'de la cohorte', 'of the cohort')}`}
          icon={Activity}
          accent="red"
        />
        <MetricCard
          title={pick(lang, 'Sans sepsis', 'No sepsis')}
          value={`${nNoSepsis}`}
          detail={`${pct((nNoSepsis / COHORT.length) * 100, lang, 1)} ${pick(lang, 'de la cohorte', 'of the cohort')}`}
          icon={User2}
          accent="emerald"
        />
      </div>

      {/* 1. Les données telles qu'elles existent : le dossier horaire. */}
      <RawRecordBlock />

      {/* 2. Pourquoi on ne peut pas tout donner au modèle. */}
      <ArticleCallout
        type="warning"
        title={pick(lang, 'Pourquoi ne pas tout donner au modèle ?', 'Why not give the model everything?')}
      >
        {pick(
          lang,
          <>
            <p>
              On pourrait croire qu'il suffit de tout verser dans l'algorithme et de le laisser
              trouver. C'est faux, pour une raison de <strong>quantité d'information</strong> : un
              modèle n'apprend pas une variable « gratuitement ». Chacune lui coûte des exemples pour
              en estimer l'effet correctement.
            </p>
            <p className="mt-2">
              En recherche clinique, on parle du nombre d'<strong>événements par variable</strong>{' '}
              (<em>events per variable</em>, ou EPV) : il en faut au moins{' '}
              <strong>une dizaine par variable</strong> pour que les coefficients soient estimés de
              façon fiable. Ce qui compte n'est pas l'effectif total mais le nombre d'
              <strong>événements</strong> — ici, les patients qui font un sepsis. En dessous, le modèle
              se met à apprendre les particularités de notre échantillon plutôt que la maladie : c'est
              le <strong>sur-apprentissage</strong>.
            </p>
          </>,
          <>
            <p>
              You might think it is enough to pour everything into the algorithm and let it figure
              things out. It is not, for a reason of <strong>amount of information</strong>: a model
              does not learn a variable “for free”. Each one costs it examples to estimate its effect
              correctly.
            </p>
            <p className="mt-2">
              In clinical research, this is called <strong>events per variable</strong> (EPV): you
              need at least <strong>about ten per variable</strong> for the coefficients to be
              estimated reliably. What matters is not the total sample size but the number of{' '}
              <strong>events</strong> — here, the patients who develop sepsis. Below that, the model
              starts learning the quirks of our sample rather than the disease: this is{' '}
              <strong>overfitting</strong>.
            </p>
          </>,
        )}
      </ArticleCallout>

      <VariableBudget />

      {/* 3. L'agrégation, montrée en direct. */}
      <AggregationBlock />

      <OpenQuestion
        id="data-aggregation-loss"
        question={pick(
          lang,
          'On retient « le pire lactate des 24 premières heures ». Quelle information cliniquement importante vient-on de perdre ?',
          'We keep “the worst lactate in the first 24 hours”. What clinically important information have we just lost?',
        )}
        hint={pick(
          lang,
          "Pensez à deux patients ayant le même pic de lactate, mais l'un à H+2 et l'autre à H+22.",
          'Think of two patients with the same lactate peak, one at H+2 and the other at H+22.',
        )}
        reveal={pick(
          lang,
          <>
            On perd la <strong>chronologie</strong>, et avec elle la <em>dynamique</em>. Un lactate
            à 4 qui descend depuis l'admission raconte une réanimation qui marche ; le même 4
            atteint en fin de journée raconte un patient qui se dégrade. Après agrégation, ces deux
            patients sont <strong>identiques</strong> pour le modèle. On perd aussi la vitesse de
            montée, souvent plus informative que la valeur elle-même. C'est le prix à payer pour
            obtenir un tableau régulier — et c'est pourquoi certains modèles plus complexes
            travaillent directement sur les séries temporelles.
          </>,
          <>
            We lose the <strong>timeline</strong>, and with it the <em>dynamics</em>. A lactate of 4
            that has been falling since admission tells the story of a resuscitation that is working;
            the same 4 reached at the end of the day tells the story of a deteriorating patient. After
            aggregation, these two patients are <strong>identical</strong> for the model. We also lose
            the rate of rise, which is often more informative than the value itself. That is the price
            of getting a regular table — and it is why some more complex models work directly on
            time series.
          </>,
        )}
      />

      {/* 4. Nommer ce qu'on vient de faire : le cadrage en quatre dimensions. */}
      <VariableDefinitionBlock />

      <Qcm
        id="data-define-variable"
        question={pick(
          lang,
          'Un collègue vous demande de recueillir « la pression artérielle des patients ». Que manque-t-il à cette consigne ?',
          'A colleague asks you to collect “the patients’ blood pressure”. What is missing from this instruction?',
        )}
        multiple
        choices={[
          {
            text: pick(
              lang,
              "L'ancrage : à partir de quel moment du séjour cherche-t-on ?",
              'The anchor: from which point in the stay are we looking?',
            ),
            correct: true,
          },
          {
            text: pick(
              lang,
              'La fenêtre : sur quelle période retient-on les mesures ?',
              'The window: over what period do we keep measurements?',
            ),
            correct: true,
          },
          {
            text: pick(
              lang,
              "La fonction d'agrégation : que faire s'il y a vingt mesures ?",
              'The aggregation function: what do we do if there are twenty measurements?',
            ),
            correct: true,
          },
          { text: pick(lang, 'Rien, la consigne est suffisamment claire', 'Nothing, the instruction is clear enough') },
        ]}
        explanation={pick(
          lang,
          <>
            Seul le <strong>concept</strong> est donné — et encore, incomplètement : systolique ou
            moyenne ? Les trois autres dimensions manquent, et chaque personne qui fera le recueil
            comblera les trous à sa façon. Pire : la même personne changera de règle en cours de
            route sans s'en apercevoir, surtout si le recueil dure des semaines. C'est ainsi que
            naissent des données hétérogènes dont <strong>personne ne peut plus rien tirer</strong>,
            et que l'étude devient irreproductible.
          </>,
          <>
            Only the <strong>concept</strong> is given — and even that incompletely: systolic or
            mean? The other three dimensions are missing, and everyone collecting the data will fill
            the gaps their own way. Worse: the same person will change rules along the way without
            noticing, especially if data collection lasts weeks. This is how heterogeneous data arise
            that <strong>no one can make use of any more</strong>, and how a study becomes
            irreproducible.
          </>,
        )}
      />

      {/* 5. Le tableau agrégé, à explorer soi-même. */}
      <Panel>
        <DataTable />
      </Panel>

      <OpenQuestion
        id="data-explore-table"
        question={pick(
          lang,
          'Explorez le tableau ci-dessus : filtrez sur les patients « sepsis », triez les colonnes. Voyez-vous une valeur qui vous semble associée au sepsis ?',
          'Explore the table above: filter on “sepsis” patients, sort the columns. Do you see a value that seems associated with sepsis?',
        )}
        hint={pick(
          lang,
          'Triez par lactate décroissant, puis comparez les deux filtres. Regardez aussi combien de cases sont vides dans chaque groupe.',
          'Sort by lactate in descending order, then compare the two filters. Also look at how many cells are empty in each group.',
        )}
        reveal={pick(
          lang,
          <>
            C'est un exercice <strong>volontairement frustrant</strong> : à l'œil nu, sur quelques
            dizaines de lignes, presque rien ne saute aux yeux. On devine une tendance sur la
            fréquence cardiaque ou le lactate, mais on trouve immédiatement des contre-exemples —
            des patients tachycardes sans sepsis, des septiques au lactate normal. Vous avez
            peut-être aussi remarqué que les patients septiques ont{' '}
            <strong>moins de cases vides</strong> : on les explore davantage. Retenez cette
            observation, nous y reviendrons à l'étape suivante.
          </>,
          <>
            This exercise is <strong>deliberately frustrating</strong>: by eye, over a few dozen
            rows, almost nothing stands out. You may sense a trend in heart rate or lactate, but you
            immediately find counter-examples — tachycardic patients without sepsis, septic patients
            with a normal lactate. You may also have noticed that septic patients have{' '}
            <strong>fewer empty cells</strong>: they are investigated more. Keep this observation in
            mind; we will come back to it in the next step.
          </>,
        )}
      />

      {/* 6. La vue d'ensemble : ce que le tableau ne montre pas. */}
      <ArticleCallout
        type="info"
        title={pick(lang, 'Passer du tableau au graphique', 'From the table to the chart')}
      >
        {pick(
          lang,
          <>
            Lire un tableau ligne par ligne ne permet pas de voir une <strong>tendance</strong> : notre
            œil compare mal des centaines de nombres. Pour juger si une variable est liée au sepsis, il
            faut regarder les <strong>deux groupes entiers en même temps</strong> — c'est ce que fait
            le graphique ci-dessous, en montrant comment les valeurs se répartissent dans chaque
            groupe.
          </>,
          <>
            Reading a table row by row does not reveal a <strong>trend</strong>: our eyes are poor at
            comparing hundreds of numbers. To judge whether a variable is linked to sepsis, you need
            to look at <strong>both whole groups at once</strong> — which is what the chart below
            does, by showing how the values are distributed in each group.
          </>,
        )}
      </ArticleCallout>

      <Panel
        title={pick(lang, "Distribution d'une variable selon l'évolution", 'Distribution of a variable by outcome')}
        icon={BarChart3}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {VARIABLES.filter((v) => v.key !== 'age').map((v) => (
              <button
                key={v.key}
                onClick={() => setSelected(v.key)}
                className={pillClass(selected === v.key)}
              >
                {varText(v, lang).short}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            {meta.kind === 'lab' ? <FlaskConical className="size-3.5" /> : <Activity className="size-3.5" />}
            {varText(meta, lang).help} {pick(lang, 'Valeurs usuelles :', 'Normal values:')} {meta.normal[0]}–
            {meta.normal[1]} {varText(meta, lang).unit}.
          </div>
          <PlotlyChart data={histogram} layout={histoLayout} config={PLOT_CONFIG} />
        </div>
      </Panel>

      <Qcm
        id="data-distributions"
        question={pick(
          lang,
          'En parcourant les distributions ci-dessus, quelles variables semblent le plus décalées entre les patients « sepsis » et « pas de sepsis » ?',
          'Looking through the distributions above, which variables seem most shifted between “sepsis” and “no sepsis” patients?',
        )}
        multiple
        choices={[
          {
            text: pick(
              lang,
              'La fréquence cardiaque (FC) — plus élevée en cas de sepsis',
              'Heart rate (HR) — higher in sepsis',
            ),
            correct: true,
          },
          {
            text: pick(
              lang,
              'La fréquence respiratoire (FR) — plus élevée en cas de sepsis',
              'Respiratory rate (RR) — higher in sepsis',
            ),
            correct: true,
          },
          {
            text: pick(
              lang,
              'Le lactate — tend à être plus haut en cas de sepsis',
              'Lactate — tends to be higher in sepsis',
            ),
            correct: true,
          },
          {
            text: pick(
              lang,
              'La saturation en O₂ — sépare parfaitement les deux groupes',
              'O₂ saturation — perfectly separates the two groups',
            ),
          },
        ]}
        explanation={pick(
          lang,
          <>
            FC, FR et lactate sont légèrement décalés vers le haut chez les patients qui feront un
            sepsis — cohérent avec la physiopathologie. Mais aucune variable ne{' '}
            <strong>sépare nettement</strong> les deux groupes : les distributions se chevauchent
            largement. C'est justement pour ça qu'un seul chiffre ne suffit pas.
          </>,
          <>
            HR, RR and lactate are slightly shifted upwards in patients who will develop sepsis —
            consistent with the pathophysiology. But no variable <strong>clearly separates</strong>{' '}
            the two groups: the distributions overlap widely. That is precisely why a single number
            is not enough.
          </>,
        )}
      />

      {/* 7. Le point d'arrivée de l'étape : à quoi sert le machine learning. */}
      <ArticleCallout
        type="success"
        title={pick(lang, "C'est précisément là que le modèle intervient", 'This is exactly where the model comes in')}
      >
        {pick(
          lang,
          <>
            <p>
              Vous venez de faire le constat le plus important de ce TD :{' '}
              <strong>aucune variable, seule, ne sépare les deux groupes</strong>. Si une le faisait, on
              n'aurait besoin d'aucun modèle — un seuil suffirait, et c'est d'ailleurs ce que font les
              scores cliniques classiques.
            </p>
            <p className="mt-2">
              L'intérêt de l'apprentissage automatique est ailleurs : il cherche des{' '}
              <strong>combinaisons</strong> de variables. Une fréquence cardiaque à 110 ne dit pas
              grand-chose ; à 110 <em>avec</em> une pression à 95, une polypnée et un lactate à 2,5,
              c'est un autre tableau. Le modèle pèse ces indices ensemble et repère des{' '}
              <strong>signaux faibles</strong> qu'aucun œil humain ne peut extraire d'un tableau de
              plusieurs centaines de lignes.
            </p>
            <p className="mt-2">
              Attention cependant : « invisible à l'œil nu » ne veut pas dire « réel ». Un modèle trouve
              toujours <em>quelque chose</em>. Toute la suite du TD consiste à vérifier si ce qu'il a
              trouvé tient debout.
            </p>
          </>,
          <>
            <p>
              You have just made the most important observation of this tutorial:{' '}
              <strong>no single variable separates the two groups</strong>. If one did, we would not
              need a model at all — a threshold would do, which is what classic clinical scores do.
            </p>
            <p className="mt-2">
              The value of machine learning lies elsewhere: it looks for{' '}
              <strong>combinations</strong> of variables. A heart rate of 110 does not say much; 110{' '}
              <em>with</em> a blood pressure of 95, tachypnoea and a lactate of 2.5 is a different
              picture. The model weighs these clues together and picks up{' '}
              <strong>weak signals</strong> that no human eye can extract from a table of several
              hundred rows.
            </p>
            <p className="mt-2">
              A word of caution, though: “invisible to the naked eye” does not mean “real”. A model
              always finds <em>something</em>. The rest of this tutorial is about checking whether
              what it found holds up.
            </p>
          </>,
        )}
      </ArticleCallout>

      {/* 8. Les variables entre elles. */}
      <Panel
        title={pick(lang, 'Les variables évoluent-elles ensemble ?', 'Do the variables move together?')}
        icon={Grid3x3}
      >
        <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            <>
              Jusqu'ici on a comparé chaque variable au sepsis. On peut aussi les comparer{' '}
              <strong>entre elles</strong> : deux variables qui varient de concert apportent en partie
              la même information. Rouge = varient dans le même sens, bleu = en sens opposés, gris =
              sans lien apparent.
            </>,
            <>
              So far we have compared each variable with sepsis. We can also compare them{' '}
              <strong>with each other</strong>: two variables that move together partly carry the
              same information. Red = move in the same direction, blue = in opposite directions,
              grey = no apparent link.
            </>,
          )}
        </p>
        <CorrelationHeatmap />
        <Callout variant="blue" title={pick(lang, 'Pourquoi cela compte', 'Why this matters')}>
          {pick(
            lang,
            <>
              Si deux variables sont très corrélées, en ajouter une deuxième n'apporte presque rien au
              modèle — tout en consommant une part du « budget » de variables vu plus haut. Cela rend
              aussi les poids du modèle instables et difficiles à interpréter : le modèle ne sait plus
              à laquelle des deux attribuer l'effet.
            </>,
            <>
              If two variables are highly correlated, adding the second one brings almost nothing to
              the model — while using up part of the variable “budget” seen above. It also makes the
              model’s weights unstable and hard to interpret: the model can no longer tell which of
              the two to attribute the effect to.
            </>,
          )}
        </Callout>
      </Panel>
    </div>
  )
}

// ==================================================================
// Step 4 — Prepare (missing data, imputation, selection bias)
// ==================================================================

function PrepareStep() {
  const lang = useLang()
  const dark = useAppStore((s) => s.darkMode)

  /*
   * On rapporte le taux de données MANQUANTES, pas celui des données présentes :
   * c'est la convention dans les articles, et c'est ce qui pose problème — une
   * barre longue doit vouloir dire « attention ». Les variables sont triées de
   * la plus lacunaire à la plus complète, pour que la lecture se fasse de haut
   * en bas sans chercher.
   */
  const missingVars = useMemo(
    () =>
      VARIABLES.filter((v) => v.key !== 'age').sort(
        (a, b) => missingness(a.key) - missingness(b.key),
      ),
    [],
  )

  const missingData = useMemo<Data[]>(() => {
    const values = missingVars.map((v) => missingness(v.key))
    // La barre est presque noire en thème clair, presque blanche en thème
    // sombre : une barre foncée sur fond foncé disparaîtrait. Le texte posé
    // dessus suit le mouvement inverse.
    const rgb = dark ? '226, 232, 240' : '30, 41, 59'
    return [
      {
        type: 'bar',
        orientation: 'h',
        y: missingVars.map((v) => varText(v, lang).label),
        x: values,
        width: 0.62,
        marker: {
          // Un dégradé d'opacité plutôt qu'un seuil vert/orange : le seuil
          // laissait croire à une frontière clinique là où il n'y a qu'un
          // continuum. Le plus lacunaire est le plus dense.
          color: values.map((m) => `rgba(${rgb}, ${(0.4 + (m / 100) * 0.55).toFixed(2)})`),
        },
        text: values.map((m) => pct(m, lang)),
        // À l'intérieur de la barre, donc sur l'aplat : couleur inverse.
        textposition: 'inside',
        insidetextanchor: 'end',
        textfont: {
          color: dark ? '#0f172a' : '#ffffff',
          size: 11,
          family: 'Inter, sans-serif',
        },
        cliponaxis: false,
        hovertemplate: pick(
          lang,
          '%{y}<br>%{x:.0f} % de valeurs manquantes<extra></extra>',
          '%{y}<br>%{x:.0f}% missing values<extra></extra>',
        ),
      },
    ]
  }, [missingVars, dark, lang])

  const missingLayout = useMemo<Partial<Layout>>(
    () =>
      baseLayout({
        height: 360,
        // Marge gauche large : les libellés sont maintenant écrits en toutes
        // lettres, et `ticklen` les écarte du trait de l'axe, contre lequel ils
        // venaient buter.
        margin: { l: 175, r: 24, t: 8, b: 46 },
        bargap: 0.28,
        xaxis: {
          title: {
            text: pick(
              lang,
              '% de patients dont la mesure est manquante',
              '% of patients with the measurement missing',
            ),
          },
          range: [0, 100],
          gridcolor: GRID,
          zeroline: false,
          ticksuffix: pick(lang, ' %', '%'),
        },
        yaxis: {
          gridcolor: 'rgba(0,0,0,0)',
          ticklen: 8,
          tickcolor: 'rgba(0,0,0,0)',
          automargin: true,
        },
      }),
    [lang],
  )

  return (
    <div className="flex flex-col [&>*]:my-4 [&>*:first-child]:mt-0">
      <SectionTitle
        subtitle={pick(
          lang,
          "Les données réelles sont incomplètes. Avant d'entraîner quoi que ce soit, il faut décider quoi faire des trous — et ce choix a des conséquences.",
          'Real-world data are incomplete. Before training anything, you have to decide what to do about the gaps — and that choice has consequences.',
        )}
      >
        {pick(lang, 'Préparer les données', 'Preparing the data')}
      </SectionTitle>

      <Panel title={pick(lang, 'Combien manque-t-il ?', 'How much is missing?')} icon={CircleSlash} accent="amber">
        <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            <>
              Toutes les mesures ne sont pas disponibles pour tous les patients : les paramètres vitaux
              sont presque toujours mesurés, alors que les examens de laboratoire ne sont demandés
              qu'au besoin. Chaque barre indique la part de patients pour qui la mesure{' '}
              <strong>manque</strong> — plus elle est longue, plus le trou est grand.
            </>,
            <>
              Not every measurement is available for every patient: vital signs are almost always
              recorded, whereas lab tests are only ordered when needed. Each bar shows the share of
              patients for whom the measurement is <strong>missing</strong> — the longer the bar, the
              bigger the gap.
            </>,
          )}
        </p>
        <PlotlyChart data={missingData} layout={missingLayout} config={PLOT_CONFIG} />
      </Panel>

      <ArticleCallout
        type="warning"
        title={pick(
          lang,
          "Une donnée manquante n'est jamais le fruit du hasard",
          'Missing data are never a matter of chance',
        )}
      >
        {pick(
          lang,
          <>
            <p>
              Le lactate manque chez la majorité des patients. Mais il ne manque pas{' '}
              <strong>au hasard</strong> : on le prescrit quand on suspecte quelque chose. Autrement
              dit, <strong>le fait même qu'un examen ait été demandé porte de l'information</strong> —
              souvent davantage que son résultat.
            </p>
            <p className="mt-2">
              C'est le piège central de ce type de données : elles ne décrivent pas seulement le
              patient, elles décrivent aussi <strong>ce que les soignants ont pensé de lui</strong>.
            </p>
          </>,
          <>
            <p>
              Lactate is missing for most patients. But it is not missing{' '}
              <strong>at random</strong>: it is ordered when something is suspected. In other words,{' '}
              <strong>the very fact that a test was ordered carries information</strong> — often more
              than its result.
            </p>
            <p className="mt-2">
              This is the central trap of this kind of data: it does not only describe the patient,
              it also describes <strong>what the clinicians thought of them</strong>.
            </p>
          </>,
        )}
      </ArticleCallout>

      <Qcm
        id="prepare-why-lactate-missing"
        question={pick(
          lang,
          'Le lactate manque chez 70 % des patients. Que peut-on en déduire sur les 30 % chez qui il a été dosé ?',
          'Lactate is missing for 70% of patients. What can we infer about the 30% in whom it was measured?',
        )}
        choices={[
          {
            text: pick(
              lang,
              'Ce sont des patients qui inquiétaient davantage les soignants',
              'They are patients the clinicians were more worried about',
            ),
            correct: true,
          },
          {
            text: pick(
              lang,
              'Ce sont des patients pris au hasard dans la cohorte',
              'They are patients picked at random from the cohort',
            ),
          },
          {
            text: pick(
              lang,
              'Ce sont les patients admis le plus récemment',
              'They are the most recently admitted patients',
            ),
          },
          {
            text: pick(
              lang,
              "On ne peut rien en déduire, c'est une question d'organisation du laboratoire",
              'Nothing can be inferred, it is a matter of how the lab is organised',
            ),
          },
        ]}
        explanation={pick(
          lang,
          <>
            Un lactate se prescrit sur <strong>suspicion clinique</strong>. Les patients dosés sont
            donc, en moyenne, plus graves que les autres. Conséquence directe : si un modèle apprend
            que « lactate mesuré » va de pair avec « sepsis », il n'a rien appris de la{' '}
            <strong>maladie</strong> — il a appris le <strong>comportement de prescription</strong>{' '}
            de cet hôpital. Déployé ailleurs, où l'on dose le lactate systématiquement, il
            s'effondrerait.
          </>,
          <>
            Lactate is ordered on <strong>clinical suspicion</strong>. Patients who were tested are
            therefore, on average, sicker than the others. Direct consequence: if a model learns that
            “lactate measured” goes hand in hand with “sepsis”, it has learnt nothing about the{' '}
            <strong>disease</strong> — it has learnt this hospital’s{' '}
            <strong>ordering behaviour</strong>. Deployed elsewhere, where lactate is measured
            routinely, it would collapse.
          </>,
        )}
      />

      <Panel title={pick(lang, 'Première solution : imputer', 'First option: impute')} icon={Wand2}>
        <ImputationDemo />
      </Panel>

      <Panel
        title={pick(
          lang,
          'Seconde solution : exclure les patients incomplets',
          'Second option: exclude incomplete patients',
        )}
        icon={UserMinus}
        accent="red"
      >
        <CompleteCaseDemo />
      </Panel>

      <ArticleCallout
        type="warning"
        title={pick(lang, 'Le biais de sélection, concrètement', 'Selection bias, in practice')}
      >
        {pick(
          lang,
          <>
            <p>
              Vous venez de le produire vous-même. Le <strong>biais de sélection</strong> apparaît quand
              les patients qu'on étudie ne représentent plus la population à laquelle on veut
              appliquer le modèle — parce que la façon de les sélectionner était liée à ce qu'on
              cherche à prédire.
            </p>
            <p className="mt-2">
              Ici, exiger un lactate revient à ne garder que les patients qu'on suspectait déjà. Le
              modèle apprendra sur une population <strong>plus grave que la vraie</strong>, affichera
              d'excellentes performances sur ses propres patients, et se trompera systématiquement une
              fois branché sur l'ensemble du service — où la majorité des patients n'ont jamais eu de
              lactate.
            </p>
          </>,
          <>
            <p>
              You have just produced it yourself. <strong>Selection bias</strong> arises when the
              patients being studied no longer represent the population to which you want to apply
              the model — because the way they were selected was linked to what you are trying to
              predict.
            </p>
            <p className="mt-2">
              Here, requiring a lactate means keeping only the patients who were already suspected.
              The model will learn from a population that is <strong>sicker than the real one</strong>,
              will show excellent performance on its own patients, and will be systematically wrong
              once connected to the whole ward — where most patients never had a lactate measured.
            </p>
          </>,
        )}
      </ArticleCallout>

      <Callout variant="blue" title={pick(lang, 'Alors, imputer ou exclure ?', 'So, impute or exclude?')}>
        {pick(
          lang,
          <>
            Il n'y a pas de bonne réponse universelle, et c'est un arbitrage à assumer et à{' '}
            <strong>écrire dans l'article</strong>. En pratique : quand il manque{' '}
            <strong>peu</strong> de données, imputer est en général préférable — on garde tout le monde
            et l'erreur introduite reste petite. Quand il en manque <strong>beaucoup</strong>, imputer
            revient à inventer l'essentiel du tableau, et la variable elle-même devient suspecte ; on
            peut alors préférer l'écarter complètement plutôt que de faire semblant. Exclure les
            patients est presque toujours le choix le plus risqué, parce que le biais qu'il crée est{' '}
            <strong>invisible dans les performances</strong>.
          </>,
          <>
            There is no universally right answer; it is a trade-off you must own and{' '}
            <strong>report in the paper</strong>. In practice: when <strong>little</strong> data is
            missing, imputation is generally preferable — you keep everyone and the error introduced
            stays small. When <strong>a lot</strong> is missing, imputing amounts to inventing most of
            the table, and the variable itself becomes suspect; you may then prefer to drop it
            entirely rather than pretend. Excluding patients is almost always the riskiest choice,
            because the bias it creates is <strong>invisible in the performance metrics</strong>.
          </>,
        )}
      </Callout>

      <OpenQuestion
        id="prepare-imputed-lactate"
        question={pick(
          lang,
          "Notre modèle utilisera le lactate, imputé par la médiane chez les 70 % de patients qui n'en ont pas. Quel problème cela pose-t-il pour son usage réel à l'hôpital ?",
          'Our model will use lactate, imputed with the median for the 70% of patients who have none. What problem does this raise for its real-world use in hospital?',
        )}
        hint={pick(
          lang,
          'Que « voit » le modèle quand il reçoit un patient dont le lactate a été imputé ?',
          'What does the model “see” when it receives a patient whose lactate has been imputed?',
        )}
        reveal={pick(
          lang,
          <>
            Pour 70 % des patients, la valeur de lactate que reçoit le modèle{' '}
            <strong>n'est pas une mesure</strong> : c'est la même constante pour tout le monde. Le
            modèle ne peut donc rien en tirer chez eux, et son risque repose entièrement sur les
            autres variables — sans que rien à l'écran ne le signale au clinicien. Deux
            conséquences : la prédiction est bien moins fiable pour ces patients qu'elle n'en a
            l'air, et le modèle peut apprendre à traiter « lactate = médiane » comme un signal en
            soi, c'est-à-dire à reconnaître les patients <em>non explorés</em>. Une bonne pratique
            consiste d'ailleurs à ajouter une variable explicite «{' '}
            <strong>le lactate a-t-il été dosé ?</strong> » — mais alors le modèle apprend
            ouvertement la prescription, ce qui pose la question de son transfert dans un autre
            hôpital.
          </>,
          <>
            For 70% of patients, the lactate value the model receives{' '}
            <strong>is not a measurement</strong>: it is the same constant for everyone. The model
            therefore cannot learn anything from it for them, and its risk estimate rests entirely on
            the other variables — with nothing on screen to tell the clinician. Two consequences: the
            prediction is much less reliable for these patients than it looks, and the model may
            learn to treat “lactate = median” as a signal in itself, i.e. to recognise patients who
            were <em>not investigated</em>. Good practice is in fact to add an explicit variable “
            <strong>was lactate measured?</strong>” — but then the model openly learns ordering
            behaviour, which raises the question of whether it transfers to another hospital.
          </>,
        )}
      />
    </div>
  )
}

// ==================================================================
// Step 5 — Train & evaluate (one workbench)
// ==================================================================

/**
 * Les trois marches du podium.
 *
 * Or, argent, bronze — mais rendus avec la palette du projet plutôt qu'avec
 * les vraies couleurs métalliques, qui jureraient avec le reste du site.
 */
const MEDAL = [
  {
    box: 'border-amber-500/50 bg-amber-500/10',
    icon: 'text-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  {
    box: 'border-slate-400/50 bg-slate-400/10',
    icon: 'text-slate-400',
    text: 'text-slate-600 dark:text-slate-300',
  },
  {
    box: 'border-orange-800/40 bg-orange-800/5',
    icon: 'text-orange-800/70 dark:text-orange-700',
    text: 'text-orange-800/80 dark:text-orange-600',
  },
] as const

/** Une ligne de l'historique : ce qu'on a réglé, ce que ça a donné. */
interface Run {
  id: number
  features: FeatureKey[]
  trainFraction: number
  auc: number
  se: number
  sp: number
  ppv: number
  nTrain: number
  nTest: number
  /**
   * Le modèle entraîné, conservé pour pouvoir réafficher l'essai.
   *
   * On garde l'objet plutôt que de ré-entraîner à la demande : l'entraînement
   * est certes déterministe, mais le rejouer ferait clignoter l'écran pour
   * reconstruire un résultat qu'on avait déjà.
   */
  model: TrainedModel
}

/**
 * Un essai dans le classement : cliquable pour le rappeler, détaillé au survol.
 *
 * Le même composant sert le podium et la liste des suivants — seule la
 * présence d'un `rank` change l'habillage. Deux rendus séparés auraient
 * dérivé l'un de l'autre à la première retouche.
 */
function RunCard({
  run,
  rank,
  active,
  onSelect,
}: {
  run: Run
  rank?: number
  active: boolean
  onSelect: () => void
}) {
  const lang = useLang()
  const medal = rank !== undefined ? MEDAL[rank] : null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          className={cn(
            'flex w-full cursor-pointer flex-col gap-1 rounded-md border p-2.5 text-left transition-colors',
            medal ? medal.box : 'border-[var(--color-border)]',
            // L'essai affiché se signale par un anneau, et non par un fond :
            // la couleur du fond dit déjà le rang sur le podium.
            active && 'ring-2 ring-blue-500/60',
            !active && 'hover:border-blue-500/60 hover:bg-[var(--color-accent)]',
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 truncate text-xs text-[var(--color-muted-foreground)]">
              {medal && <Trophy className={cn('size-3.5 shrink-0', medal.icon)} />}
              {pick(lang, 'Essai', 'Run')} {run.id} · {run.features.length} var.
            </span>
            <span
              className={cn(
                'shrink-0 text-sm font-bold tabular-nums',
                medal ? medal.text : 'text-[var(--color-foreground)]',
              )}
            >
              {run.auc.toFixed(2)}
            </span>
          </div>
          {medal && (
            <span className="truncate text-[11px] leading-tight text-[var(--color-muted-foreground)]">
              {run.features.map((f) => varText(VARIABLE_BY_KEY[f], lang).short).join(', ')}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <p className="font-semibold">
          {pick(lang, 'Essai', 'Run')} {run.id}
        </p>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt className="opacity-70">AUC</dt>
          <dd className="font-medium tabular-nums">{run.auc.toFixed(2)}</dd>
          <dt className="opacity-70">{pick(lang, 'Sensibilité', 'Sensitivity')}</dt>
          <dd className="tabular-nums">{pct(run.se * 100, lang)}</dd>
          <dt className="opacity-70">{pick(lang, 'Spécificité', 'Specificity')}</dt>
          <dd className="tabular-nums">{pct(run.sp * 100, lang)}</dd>
          <dt className="opacity-70">{pick(lang, 'VPP', 'PPV')}</dt>
          <dd className="tabular-nums">{pct(run.ppv * 100, lang)}</dd>
          <dt className="opacity-70">{pick(lang, 'Partage', 'Split')}</dt>
          <dd className="tabular-nums">
            {pct(run.trainFraction * 100, lang)} — {run.nTrain} / {run.nTest}
          </dd>
        </dl>
        <p className="mt-1.5 border-t border-white/20 pt-1.5 opacity-70">
          {pick(lang, 'Variables :', 'Variables:')}{' '}
          {run.features.map((f) => varText(VARIABLE_BY_KEY[f], lang).label).join(', ')}
        </p>
        <p className="mt-1 opacity-70">
          {active
            ? pick(lang, 'Essai actuellement affiché', 'Run currently shown')
            : pick(lang, 'Cliquer pour réafficher cet essai', 'Click to show this run again')}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

function TrainStep({
  config,
  setConfig,
  model,
  onTrain,
  runs,
  onClearRuns,
  shownRun,
  onRecall,
}: {
  config: ModelConfig
  setConfig: (c: ModelConfig) => void
  model: TrainedModel | null
  onTrain: () => void
  runs: Run[]
  onClearRuns: () => void
  /** Numéro de l'essai rappelé, ou `null` si l'on voit le dernier entraînement. */
  shownRun: number | null
  onRecall: (run: Run) => void
}) {
  const lang = useLang()
  const [training, setTraining] = useState(false)

  const toggleFeature = (key: FeatureKey) => {
    const has = config.features.includes(key)
    const next = has ? config.features.filter((f) => f !== key) : [...config.features, key]
    // Un modèle sans variable n'existe pas : on refuse de décocher la dernière.
    if (next.length === 0) return
    setConfig({ ...config, features: next })
  }

  const runTrain = () => {
    setTraining(true)
    window.setTimeout(() => {
      onTrain()
      setTraining(false)
    }, 400)
  }

  const roc = useMemo(() => (model ? rocCurve(model.test) : null), [model])
  const cm = useMemo(() => (model ? confusionAt(model.test, 0.5) : null), [model])

  const nTrain = model?.train.length ?? Math.round(COHORT.length * config.trainFraction)
  const nTest = model?.test.length ?? COHORT.length - nTrain

  const rocData = useMemo<Data[]>(() => {
    if (!roc) return []
    return [
      {
        x: roc.fpr,
        y: roc.tpr,
        type: 'scatter',
        mode: 'lines',
        name: `${pick(lang, 'Modèle', 'Model')} (AUC = ${roc.auc.toFixed(2)})`,
        line: { color: COLOR_NO, width: 3 },
        fill: 'tozeroy',
        fillcolor: 'rgba(59,130,246,0.08)',
        // Les coordonnées brutes s'affichaient avec toute leur précision
        // machine (0.3061224489795918) : deux décimales suffisent à lire un
        // taux, et laissent la courbe déchiffrable au survol.
        hovertemplate: pick(
          lang,
          'Faux positifs : %{x:.2f}<br>Vrais positifs : %{y:.2f}<extra></extra>',
          'False positive rate: %{x:.2f}<br>True positive rate: %{y:.2f}<extra></extra>',
        ),
      },
      {
        x: [0, 1],
        y: [0, 1],
        type: 'scatter',
        mode: 'lines',
        name: pick(lang, 'Hasard (AUC = 0,50)', 'Chance (AUC = 0.50)'),
        line: { color: '#94a3b8', width: 2, dash: 'dash' },
        hoverinfo: 'skip',
      },
    ]
  }, [roc, lang])

  const rocLayout = useMemo<Partial<Layout>>(
    () =>
      baseLayout({
        height: 330,
        legend: { x: 0.35, y: 0.12 },
        xaxis: {
          title: {
            text: pick(lang, '1 − Spécificité (faux positifs)', '1 − Specificity (false positives)'),
          },
          range: [0, 1],
          gridcolor: GRID,
        },
        yaxis: {
          title: { text: pick(lang, 'Sensibilité (vrais positifs)', 'Sensitivity (true positives)') },
          range: [0, 1],
          gridcolor: GRID,
        },
      }),
    [lang],
  )

  /** Le meilleur AUC obtenu jusqu'ici, pour situer l'essai courant. */
  const best = runs.length > 0 ? Math.max(...runs.map((r) => r.auc)) : null

  // Le classement du défi : les trois meilleurs sur le podium, le reste en
  // dessous. Trier par AUC et non par ordre de lancement — c'est le score qui
  // compte, pas la chronologie.
  const ranked = useMemo(() => [...runs].sort((a, b) => b.auc - a.auc), [runs])
  const podium = ranked.slice(0, 3)
  const others = ranked.slice(3)

  const runsWord = pick(
    lang,
    `essai${runs.length > 1 ? 's' : ''}`,
    `run${runs.length !== 1 ? 's' : ''}`,
  )

  return (
    /* Pleine hauteur : c'est ce qui permet aux trois colonnes de défiler
       séparément, comme dans le TD chatbots. Le texte d'introduction et les
       questions vivent DANS la colonne centrale, sinon ils repousseraient la
       paillasse hors de l'écran. */
    <div className="flex h-full min-h-0 flex-col">
      <Workbench
        controls={
          <>
            <PaneTitle
              icon={SlidersHorizontal}
              help={pick(
                lang,
                "Ces réglages définissent le modèle. Changez-les, relancez l'entraînement, et comparez les résultats dans l'historique.",
                'These settings define the model. Change them, retrain, and compare the results in the history.',
              )}
            >
              {pick(lang, 'Réglages', 'Settings')}
            </PaneTitle>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {pick(lang, 'Variables données au modèle', 'Variables given to the model')} (
                {config.features.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => toggleFeature(v.key)}
                    className={pillClass(config.features.includes(v.key))}
                    title={varText(v, lang).label}
                  >
                    {varText(v, lang).short}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => setConfig({ ...config, features: VARIABLES.map((v) => v.key) })}
                  className="cursor-pointer text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  {pick(lang, 'Tout cocher', 'Select all')}
                </button>
                <button
                  onClick={() => setConfig({ ...config, features: ['hr'] })}
                  className="cursor-pointer text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  {pick(lang, 'Une seule', 'Just one')}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {pick(lang, "Part des données pour l'entraînement", 'Share of data used for training')}
              </span>
              <span className="text-sm text-[var(--color-foreground)]">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {pct(config.trainFraction * 100, lang)}
                </span>{' '}
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {pick(
                    lang,
                    `— ${nTrain} apprennent, ${nTest} testent`,
                    `— ${nTrain} for training, ${nTest} for testing`,
                  )}
                </span>
              </span>
              {/* Le curseur travaille en pourcentages entiers, pas en
                  fractions : un pas de 0,05 avançait par sauts de 5 points,
                  ce qui rendait le glissement saccadé. */}
              <input
                type="range"
                min={50}
                max={90}
                step={1}
                value={Math.round(config.trainFraction * 100)}
                onChange={(e) =>
                  setConfig({ ...config, trainFraction: Number(e.target.value) / 100 })
                }
                aria-label={pick(lang, "Part des données pour l'entraînement", 'Share of data used for training')}
                className="w-full accent-blue-600"
              />
            </div>

            <Button
              onClick={runTrain}
              disabled={training}
              className="mt-1 w-full cursor-pointer"
            >
              <Play size={16} />
              {training
                ? pick(lang, 'Entraînement…', 'Training…')
                : model
                  ? pick(lang, 'Ré-entraîner', 'Retrain')
                  : pick(lang, 'Entraîner le modèle', 'Train the model')}
            </Button>
          </>
        }
        history={
          <>
            <PaneTitle
              icon={Trophy}
              help={pick(
                lang,
                "Chaque entraînement laisse une trace ici. Les trois meilleurs scores montent sur le podium — c'est celui du haut qui compte pour le défi.",
                'Every training run is logged here. The three best scores make it onto the podium — the top one is what counts for the challenge.',
              )}
              action={
                runs.length > 0 ? (
                  <button
                    onClick={onClearRuns}
                    className="shrink-0 cursor-pointer text-xs text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
                  >
                    {pick(lang, 'Vider', 'Clear')}
                  </button>
                ) : undefined
              }
            >
              {pick(lang, 'Podium', 'Podium')}{' '}
              <span className="font-normal text-[var(--color-muted-foreground)]">
                ({runs.length} {runsWord})
              </span>
            </PaneTitle>

            {runs.length === 0 ? (
              <p className="pt-3 text-sm text-[var(--color-muted-foreground)]">
                {pick(
                  lang,
                  'Vos essais apparaîtront ici, classés par AUC.',
                  'Your runs will appear here, ranked by AUC.',
                )}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Les trois meilleurs, par AUC décroissante : c'est le
                    classement qui intéresse pendant le défi, pas la
                    chronologie. */}
                <div className="flex flex-col gap-1.5">
                  {podium.map((r, rank) => (
                    <RunCard
                      key={r.id}
                      run={r}
                      rank={rank}
                      active={shownRun === r.id}
                      onSelect={() => onRecall(r)}
                    />
                  ))}
                </div>

                {others.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      {pick(lang, 'Autres essais', 'Other runs')}
                    </span>
                    {others.map((r) => (
                      <RunCard
                        key={r.id}
                        run={r}
                        active={shownRun === r.id}
                        onSelect={() => onRecall(r)}
                      />
                    ))}
                  </div>
                )}

                {runs.length > 1 && (
                  <p className="text-[11px] leading-snug text-[var(--color-muted-foreground)]">
                    {pick(
                      lang,
                      "Regardez l'ampleur des écarts entre le premier et le dernier : quelques centièmes d'AUC. Aucun réglage ne transforme ce modèle.",
                      'Look at how small the gap is between the first and the last: a few hundredths of AUC. No setting transforms this model.',
                    )}
                  </p>
                )}
              </div>
            )}
          </>
        }
      >
        <SectionTitle
          subtitle={pick(
            lang,
            'Réglez à gauche, observez ici, comparez vos essais à droite.',
            'Adjust on the left, observe here, compare your runs on the right.',
          )}
        >
          {pick(lang, 'Entraîner et évaluer', 'Train and evaluate')}
        </SectionTitle>

        {/* Le défi : il donne une raison de relancer l'entraînement dix fois,
            et c'est en le relançant qu'on découvre le vrai enseignement — les
            écarts sont minuscules. La compétition sert la leçon, elle ne s'y
            substitue pas. */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <Trophy className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              {pick(lang, 'Défi : qui obtiendra la meilleure AUC ?', 'Challenge: who will get the best AUC?')}
            </span>
            <p className="text-justify text-sm text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                <>
                  Choisissez vos variables, réglez le partage entraînement / test, et lancez autant
                  d'essais que vous voulez. Vos <strong>trois meilleurs scores</strong> montent sur le
                  podium, à droite. À la fin de la séance, nous comparerons les résultats de la
                  promo — et nous regarderons surtout <strong>l'écart entre le premier et le
                  dernier</strong>, qui a beaucoup à nous apprendre.
                </>,
                <>
                  Choose your variables, set the training / test split, and run as many attempts as
                  you like. Your <strong>three best scores</strong> go up on the podium, on the right.
                  At the end of the session, we will compare the results across the class — and above
                  all look at <strong>the gap between the first and the last</strong>, which has a lot
                  to teach us.
                </>,
              )}
            </p>
            {best !== null && (
              <p className="mt-1 text-sm text-[var(--color-foreground)]">
                {pick(lang, 'Votre meilleur score :', 'Your best score:')}{' '}
                <strong className="tabular-nums text-amber-600 dark:text-amber-400">
                  {best.toFixed(2)}
                </strong>{' '}
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {pick(lang, 'en', 'in')} {runs.length} {runsWord}
                </span>
              </p>
            )}
          </div>
        </div>

        {!model || !roc || !cm ? (
          /* Un vrai emplacement réservé : il occupe la place que prendront les
             quatre indicateurs et la courbe ROC. Sans hauteur, le message
             flottait en haut d'un grand vide, et l'apparition des résultats
             faisait sauter toute la colonne. */
          <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
            <Gauge className="size-8 text-[var(--color-muted-foreground)] opacity-40" />
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              {pick(lang, 'Aucun modèle entraîné', 'No model trained yet')}
            </p>
            <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                <>
                  Choisissez vos variables à gauche, puis cliquez sur{' '}
                  <strong>« Entraîner le modèle »</strong>. Les performances s'afficheront ici.
                </>,
                <>
                  Choose your variables on the left, then click{' '}
                  <strong>“Train the model”</strong>. The performance will be shown here.
                </>,
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Rappeler un essai remplace les résultats affichés : sans ce
                bandeau, rien ne distinguerait un ancien essai du dernier
                entraînement, et on croirait avoir relancé. */}
            {shownRun !== null && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-sm">
                <RotateCcw className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-[var(--color-foreground)]">
                  {pick(
                    lang,
                    <>
                      Vous consultez l'<strong>essai {shownRun}</strong>, avec ses réglages d'origine.
                    </>,
                    <>
                      You are viewing <strong>run {shownRun}</strong>, with its original settings.
                    </>,
                  )}
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                title="AUC (test)"
                value={roc.auc.toFixed(2)}
                detail={pick(lang, '0,5 = hasard · 1 = parfait', '0.5 = chance · 1 = perfect')}
                icon={Gauge}
                accent="blue"
              />
              <MetricCard
                title={pick(lang, 'Sensibilité (seuil 0,5)', 'Sensitivity (threshold 0.5)')}
                value={pct(cm.se * 100, lang)}
                detail={pick(lang, 'sepsis correctement détectés', 'sepsis cases correctly detected')}
                icon={Activity}
                accent="emerald"
              />
              <MetricCard
                title={pick(lang, 'Spécificité (seuil 0,5)', 'Specificity (threshold 0.5)')}
                value={pct(cm.sp * 100, lang)}
                detail={pick(lang, 'non-sepsis correctement classés', 'non-sepsis cases correctly classified')}
                icon={CheckCircle2}
                accent="emerald"
              />
              <MetricCard
                title={pick(lang, 'VPP (seuil 0,5)', 'PPV (threshold 0.5)')}
                value={pct(cm.ppv * 100, lang)}
                detail={pick(lang, 'des alertes sont de vrais sepsis', 'of alerts are true sepsis')}
                icon={TriangleAlert}
                accent="amber"
              />
            </div>

            <Panel title={pick(lang, 'Courbe ROC', 'ROC curve')} icon={LineChart}>
              <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">
                {pick(
                  lang,
                  <>
                    Chaque point de la courbe correspond à un <strong>seuil de décision</strong>{' '}
                    différent. Plus la courbe monte vers le coin haut-gauche, meilleur est le modèle.
                    L'aire sous la courbe (AUC) résume cette qualité en un seul nombre.
                  </>,
                  <>
                    Each point on the curve corresponds to a different{' '}
                    <strong>decision threshold</strong>. The closer the curve rises towards the
                    top-left corner, the better the model. The area under the curve (AUC) sums up
                    this quality in a single number.
                  </>,
                )}
              </p>
              <PlotlyChart data={rocData} layout={rocLayout} config={PLOT_CONFIG} />
            </Panel>
          </>
        )}

        {/* Placé APRÈS les résultats : on regarde d'abord ce que le modèle
            vaut, on s'interroge ensuite sur la façon dont il a été construit.
            L'ordre inverse faisait lire une page de méthode avant d'avoir la
            moindre raison de s'y intéresser. */}
        <Callout
          variant="blue"
          title={pick(
            lang,
            'Le modèle utilisé : une régression logistique',
            'The model used: logistic regression',
          )}
        >
          {pick(
            lang,
            <>
              Nous utilisons ici une <strong>régression logistique</strong> — un algorithme que vous
              avez vu en cours. Son intérêt : il est <strong>explicable</strong> (un poids par
              variable, pas de « boîte noire ») et adapté à un résultat <strong>binaire</strong>{' '}
              (sepsis : oui / non). Le modèle apprend sur le jeu d'<strong>entraînement</strong>, et on
              le juge uniquement sur le jeu de <strong>test</strong> — des patients qu'il n'a jamais
              vus. L'évaluer sur ses propres exemples reviendrait à donner les réponses avant l'examen.
            </>,
            <>
              Here we use <strong>logistic regression</strong> — an algorithm you have seen in class.
              Its advantages: it is <strong>explainable</strong> (one weight per variable, no “black
              box”) and suited to a <strong>binary</strong> outcome (sepsis: yes / no). The model
              learns on the <strong>training</strong> set, and is judged only on the{' '}
              <strong>test</strong> set — patients it has never seen. Evaluating it on its own
              examples would be like handing out the answers before the exam.
            </>,
          )}
        </Callout>

        {/* Les choix de méthode, écrits noir sur blanc : le TD passe deux
            étapes à dire qu'ils comptent, il serait incohérent de les taire
            pour notre propre modèle. */}
        <Disclosure
          label={pick(lang, 'Quels choix avons-nous faits pour ce modèle ?', 'What choices did we make for this model?')}
          icon={Wrench}
        >
          {pick(
            lang,
            <div className="flex flex-col gap-3 text-sm text-[var(--color-muted-foreground)]">
              <p className="text-justify">
                <strong className="text-[var(--color-foreground)]">Tous les patients sont
                gardés</strong> — les {COHORT.length} de la cohorte. Nous n'excluons personne pour
                données manquantes : vous avez vu à l'étape précédente le biais de sélection que cela
                produirait.
              </p>
              <p className="text-justify">
                <strong className="text-[var(--color-foreground)]">Les trous sont imputés par la
                médiane</strong> de la cohorte, variable par variable. C'est le choix le plus simple,
                et le plus critiquable : pour les 70 % de patients sans lactate, le modèle reçoit la
                même constante. Nous n'ajoutons pas de variable « la mesure a-t-elle été faite ? »,
                qui améliorerait sans doute le score mais ferait apprendre la prescription.
              </p>
              <p className="text-justify">
                <strong className="text-[var(--color-foreground)]">Le découpage se fait par
                patient</strong>, jamais par ligne, et les classes sont <strong>rééquilibrées</strong>{' '}
                à l'entraînement : sans cela, un modèle qui répond « pas de sepsis » à tout le monde
                aurait déjà 91 % de bonnes réponses.
              </p>
              <p className="text-justify">
                <strong className="text-amber-600 dark:text-amber-400">Une limite assumée</strong> :
                les médianes d'imputation sont calculées sur la cohorte <em>entière</em>, jeu de test
                compris. C'est une petite fuite de données — dans une vraie étude, il faudrait les
                calculer sur le seul jeu d'entraînement. L'effet est ici négligeable, mais l'erreur
                est réelle, et elle est exactement du type de celles que nous verrons à l'étape
                « Regard critique ».
              </p>
            </div>,
            <div className="flex flex-col gap-3 text-sm text-[var(--color-muted-foreground)]">
              <p className="text-justify">
                <strong className="text-[var(--color-foreground)]">All patients are kept</strong> —
                all {COHORT.length} in the cohort. We exclude no one for missing data: you saw in the
                previous step the selection bias that would create.
              </p>
              <p className="text-justify">
                <strong className="text-[var(--color-foreground)]">Gaps are imputed with the
                median</strong> of the cohort, variable by variable. It is the simplest choice, and the
                most open to criticism: for the 70% of patients without lactate, the model receives
                the same constant. We do not add a “was the measurement taken?” variable, which would
                probably improve the score but would make the model learn ordering behaviour.
              </p>
              <p className="text-justify">
                <strong className="text-[var(--color-foreground)]">The split is done by
                patient</strong>, never by row, and the classes are <strong>rebalanced</strong> during
                training: otherwise, a model answering “no sepsis” for everyone would already be right
                91% of the time.
              </p>
              <p className="text-justify">
                <strong className="text-amber-600 dark:text-amber-400">An acknowledged
                limitation</strong>: the imputation medians are computed on the <em>whole</em> cohort,
                test set included. This is a small data leak — in a real study, they should be computed
                on the training set only. The effect is negligible here, but the error is real, and it
                is exactly the kind we will look at in the “Critical appraisal” step.
              </p>
            </div>,
          )}
        </Disclosure>

        <GuessReveal
          id="train-more-variables"
          question={pick(
            lang,
            'À votre avis, si on donne PLUS de variables au modèle, ses performances vont…',
            'In your opinion, if we give the model MORE variables, its performance will…',
          )}
          options={pick(
            lang,
            ['Toujours augmenter', 'Pas forcément changer', 'Toujours diminuer'],
            ['Always improve', 'Not necessarily change', 'Always get worse'],
          )}
          answerIndex={1}
          explanation={pick(
            lang,
            <>
              Ajouter des variables n'améliore pas automatiquement un modèle. Certaines apportent
              de l'information, d'autres du bruit — et chacune consomme une part du « budget » vu à
              l'étape précédente. Faites l'essai : entraînez avec toutes les variables, puis avec
              une seule, et comparez les AUC dans la colonne de droite. L'écart est bien plus
              faible qu'on ne l'imagine.
            </>,
            <>
              Adding variables does not automatically improve a model. Some bring information,
              others noise — and each one uses up part of the “budget” seen in the previous step. Try
              it: train with all the variables, then with just one, and compare the AUCs in the
              right-hand column. The gap is much smaller than you would expect.
            </>,
          )}
        />

        <OpenQuestion
          id="train-auc-spread"
          question={pick(
            lang,
            "Vous avez maintenant plusieurs essais dans l'historique. Que remarquez-vous sur l'ampleur des écarts d'AUC entre vos réglages ?",
            'You now have several runs in the history. What do you notice about the size of the AUC differences between your settings?',
          )}
          hint={pick(
            lang,
            "Comparez votre meilleur essai à votre pire. L'écart est-il du même ordre que la différence entre « hasard » (0,50) et « bon modèle » (0,80) ?",
            'Compare your best run with your worst. Is the gap of the same order as the difference between “chance” (0.50) and “good model” (0.80)?',
          )}
          reveal={pick(
            lang,
            <>
              Les écarts se comptent en <strong>centièmes</strong>, alors que la distance entre le
              hasard et un bon modèle se compte en <strong>dixièmes</strong>. Autrement dit : le
              choix des variables et du découpage ne change presque rien ici. Ce n'est pas un
              défaut de vos réglages, c'est la <strong>difficulté intrinsèque du problème</strong> —
              prédire le sepsis à partir de quelques mesures d'admission est réellement dur. Une
              leçon utile contre l'idée qu'un modèle décevant se répare en « bidouillant les
              paramètres ».
            </>,
            <>
              The differences are counted in <strong>hundredths</strong>, whereas the distance
              between chance and a good model is counted in <strong>tenths</strong>. In other words:
              the choice of variables and split changes almost nothing here. This is not a flaw in
              your settings, it is the <strong>intrinsic difficulty of the problem</strong> —
              predicting sepsis from a few admission measurements is genuinely hard. A useful lesson
              against the idea that a disappointing model can be fixed by “tweaking the parameters”.
            </>,
          )}
        />

        <Qcm
          id="train-ppv"
          question={pick(
            lang,
            'La VPP du modèle est faible (autour de 20-30 %). En cours, vous avez vu que la VPP dépend de la prévalence. Comment l\'expliquer ici ?',
            'The model’s PPV is low (around 20–30%). In class, you saw that PPV depends on prevalence. How can this be explained here?',
          )}
          choices={[
            { text: pick(lang, 'Le modèle est mal programmé', 'The model is badly programmed') },
            {
              text: pick(
                lang,
                'Le sepsis est rare (~9 %) : même un bon test génère beaucoup de fausses alertes',
                'Sepsis is rare (~9%): even a good test generates many false alerts',
              ),
              correct: true,
            },
            {
              text: pick(
                lang,
                'La VPP est toujours basse, quel que soit le contexte',
                'PPV is always low, whatever the context',
              ),
            },
            { text: pick(lang, 'Il faudrait retirer des variables', 'Some variables should be removed') },
          ]}
          explanation={pick(
            lang,
            <>
              Rappel du cours : contrairement à la sensibilité et à la spécificité (intrinsèques),
              la <strong>VPP est extrinsèque</strong> — elle dépend de la{' '}
              <strong>prévalence</strong>. Quand la maladie est <strong>rare</strong>, les vrais
              positifs sont noyés dans les faux positifs et la VPP chute mécaniquement, même avec
              une bonne sensibilité et une bonne spécificité. C'est exactement l'exemple du cours,
              transposé au sepsis.
            </>,
            <>
              Reminder from class: unlike sensitivity and specificity (intrinsic), the{' '}
              <strong>PPV is extrinsic</strong> — it depends on <strong>prevalence</strong>. When
              the disease is <strong>rare</strong>, true positives are swamped by false positives and
              the PPV drops mechanically, even with good sensitivity and specificity. This is exactly
              the example from class, applied to sepsis.
            </>,
          )}
        />

        {/* Placé en fin d'étape : l'étudiant vient de faire à la main, et
            lentement, ce que la machine fait par milliers. Le nommer après
            l'avoir vécu vaut mieux que de l'annoncer avant. */}
        <Panel
          title={pick(lang, 'Ce que vous venez de faire porte un nom', 'What you just did has a name')}
          icon={Repeat}
        >
          <p className="mb-3 text-justify text-sm text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              <>
                Vous avez essayé des combinaisons de variables, déplacé le curseur, relancé, comparé.
                En pratique, c'est une machine qui fait cela — et pas dix fois, mais des{' '}
                <strong>milliers</strong> de fois. On appelle cela la{' '}
                <strong>recherche d'hyperparamètres</strong>, et elle prend deux formes principales :
              </>,
              <>
                You tried combinations of variables, moved the slider, retrained, compared. In
                practice, a machine does this — not ten times, but{' '}
                <strong>thousands</strong> of times. This is called{' '}
                <strong>hyperparameter search</strong> (or tuning), and it comes in two main forms:
              </>,
            )}
          </p>

          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-[var(--color-border)] p-3">
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                {pick(
                  lang,
                  <>
                    Recherche exhaustive <span className="font-normal">(grid search)</span>
                  </>,
                  <>Grid search</>,
                )}
              </span>
              <p className="mt-1 text-justify text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                {pick(
                  lang,
                  <>
                    On dresse la liste de toutes les valeurs à tester pour chaque réglage, et on
                    essaie <strong>toutes les combinaisons</strong>. Exhaustif, donc sûr — mais le
                    nombre d'essais explose : 5 réglages à 4 valeurs font déjà 1 024 entraînements.
                  </>,
                  <>
                    You list all the values to test for each setting, and try{' '}
                    <strong>every combination</strong>. Exhaustive, hence safe — but the number of
                    runs explodes: 5 settings with 4 values each already make 1,024 training runs.
                  </>,
                )}
              </p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] p-3">
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                {pick(
                  lang,
                  <>
                    Recherche aléatoire <span className="font-normal">(random search)</span>
                  </>,
                  <>Random search</>,
                )}
              </span>
              <p className="mt-1 text-justify text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                {pick(
                  lang,
                  <>
                    On tire des combinaisons <strong>au hasard</strong> dans l'espace des réglages, et
                    on s'arrête au bout d'un budget fixé. Contre-intuitif, mais souvent{' '}
                    <strong>plus efficace</strong> : la plupart des réglages ne changent rien, et le
                    tirage aléatoire explore mieux les quelques-uns qui comptent.
                  </>,
                  <>
                    You draw combinations <strong>at random</strong> from the space of settings, and
                    stop after a fixed budget. Counter-intuitive, but often{' '}
                    <strong>more efficient</strong>: most settings make no difference, and random
                    sampling explores the few that matter better.
                  </>,
                )}
              </p>
            </div>
          </div>

          <Callout
            variant="amber"
            title={pick(
              lang,
              'Le piège : à force de chercher, on finit par trouver',
              'The trap: search long enough and you will find something',
            )}
          >
            {pick(
              lang,
              <>
                Si l'on teste mille combinaisons et qu'on garde la meilleure, cette meilleure-là est en
                partie bonne <strong>par chance</strong> — elle est ajustée aux hasards du jeu de test.
                C'est pourquoi une recherche sérieuse se fait sur un{' '}
                <strong>troisième jeu de données</strong>, dit de validation, en réservant le jeu de
                test pour une mesure finale unique. Regardez votre podium : l'écart entre votre premier
                et votre dernier essai est de quelques centièmes, soit exactement l'ordre de grandeur
                du bruit. Annoncer votre meilleur score comme « la performance du modèle » serait déjà
                une forme d'optimisme.
              </>,
              <>
                If you test a thousand combinations and keep the best one, that best one is partly
                good <strong>by luck</strong> — it is tuned to the random quirks of the test set. That
                is why a serious search is done on a <strong>third dataset</strong>, called the
                validation set, keeping the test set for a single final measurement. Look at your
                podium: the gap between your first and last run is a few hundredths — exactly the
                order of magnitude of the noise. Reporting your best score as “the model’s
                performance” would already be a form of optimism.
              </>,
            )}
          </Callout>
        </Panel>
      </Workbench>
    </div>
  )
}

// ==================================================================
// Step 5 — Threshold ⭐
// ==================================================================

function ThresholdStep({ model }: { model: TrainedModel | null }) {
  const lang = useLang()
  const [threshold, setThreshold] = useState(0.5)
  const cm = useMemo(() => (model ? confusionAt(model.test, threshold) : null), [model, threshold])

  if (!model || !cm) {
    return (
      <div className="flex flex-col gap-4">
        <SectionTitle>{pick(lang, 'Choisir le seuil de décision', 'Choosing the decision threshold')}</SectionTitle>
        <Callout variant="amber" title={pick(lang, 'Aucun modèle entraîné', 'No model trained yet')}>
          {pick(
            lang,
            "Revenez à l'étape « Entraîner » et lancez un entraînement.",
            'Go back to the “Train and evaluate” step and run a training.',
          )}
        </Callout>
      </div>
    )
  }

  const confData: Data[] = [
    {
      type: 'bar',
      x: pick(
        lang,
        ['Sepsis détectés', 'Sepsis ratés', 'Fausses alertes', 'Sains rassurés'],
        ['Sepsis detected', 'Sepsis missed', 'False alerts', 'Correctly reassured'],
      ),
      y: [cm.tp, cm.fn, cm.fp, cm.tn],
      marker: {
        color: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
        line: BAR_LINE,
      },
      text: [cm.tp, cm.fn, cm.fp, cm.tn].map(String),
      textposition: 'auto',
    },
  ]
  const confLayout = baseLayout({
    height: 300,
    yaxis: { title: { text: pick(lang, 'Nombre de patients (test)', 'Number of patients (test)') }, gridcolor: GRID },
    xaxis: { gridcolor: GRID },
  })

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        subtitle={pick(
          lang,
          "Le modèle donne une probabilité. C'est VOUS qui décidez à partir de quel niveau on déclenche l'alerte.",
          'The model gives a probability. YOU decide at what level the alert is triggered.',
        )}
      >
        {pick(lang, 'Le seuil de décision : un choix clinique', 'The decision threshold: a clinical choice')}
      </SectionTitle>

      <Panel>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {pick(lang, "Seuil d'alerte : probabilité ≥", 'Alert threshold: probability ≥')}{' '}
              <span className="text-blue-600 dark:text-blue-400">{pct(threshold * 100, lang)}</span>
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            aria-label={pick(lang, "Seuil d'alerte", 'Alert threshold')}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]">
            <span>
              {pick(lang, '← Seuil bas : on alerte beaucoup (sensible)', '← Low threshold: many alerts (sensitive)')}
            </span>
            <span>
              {pick(lang, 'Seuil haut : on alerte peu (spécifique) →', 'High threshold: few alerts (specific) →')}
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={pick(lang, 'Sensibilité', 'Sensitivity')}
          value={pct(cm.se * 100, lang)}
          detail={pick(lang, 'sepsis détectés', 'sepsis cases detected')}
          icon={Activity}
          accent="emerald"
        />
        <MetricCard
          title={pick(lang, 'Spécificité', 'Specificity')}
          value={pct(cm.sp * 100, lang)}
          detail={pick(lang, 'non-sepsis bien classés', 'non-sepsis correctly classified')}
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          title={pick(lang, 'VPP', 'PPV')}
          value={pct(cm.ppv * 100, lang)}
          detail={pick(lang, 'des alertes sont justes', 'of alerts are correct')}
          icon={TriangleAlert}
          accent="amber"
        />
        <MetricCard
          title={pick(lang, 'VPN', 'NPV')}
          value={pct(cm.npv * 100, lang)}
          detail={pick(lang, 'des « rassurés » vont bien', 'of “reassured” patients are fine')}
          icon={CheckCircle2}
          accent="blue"
        />
      </div>

      <Panel
        title={pick(
          lang,
          `Ce que ce seuil donne concrètement, sur ${model.test.length} patients`,
          `What this threshold means in practice, on ${model.test.length} patients`,
        )}
        icon={ClipboardCheck}
      >
        <div className="flex flex-col gap-4">
          <PlotlyChart data={confData} layout={confLayout} config={PLOT_CONFIG} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
              <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="text-[var(--color-foreground)]">
                {pick(
                  lang,
                  <>
                    <strong>{cm.fn}</strong> sepsis <strong>ratés</strong> (faux négatifs)
                  </>,
                  <>
                    <strong>{cm.fn}</strong> sepsis cases <strong>missed</strong> (false negatives)
                  </>,
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-[var(--color-foreground)]">
                {pick(
                  lang,
                  <>
                    <strong>{cm.fp}</strong> <strong>fausses alertes</strong> (faux positifs)
                  </>,
                  <>
                    <strong>{cm.fp}</strong> <strong>false alerts</strong> (false positives)
                  </>,
                )}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <Callout
        variant="amber"
        title={pick(lang, "Il n'existe pas de « bon » seuil universel", 'There is no universally “right” threshold')}
      >
        {pick(
          lang,
          <>
            Baissez le seuil : vous ratez moins de sepsis, mais vous multipliez les fausses alertes.
            Montez-le : l'inverse. Aucun réglage ne supprime les deux erreurs à la fois. Le seuil n'est
            pas une propriété du modèle : c'est une <strong>décision clinique et éthique</strong> qui
            dépend du coût de chaque erreur.
          </>,
          <>
            Lower the threshold: you miss fewer sepsis cases, but false alerts multiply. Raise it: the
            opposite. No setting eliminates both errors at once. The threshold is not a property of the
            model: it is a <strong>clinical and ethical decision</strong> that depends on the cost of
            each error.
          </>,
        )}
      </Callout>

      <Qcm
        id="threshold-direction"
        question={pick(
          lang,
          "Vous avez vu en cours que déplacer le seuil (cutoff) modifie la répartition du tableau de contingence. En augmentant le seuil d'alerte, que se passe-t-il ?",
          'You saw in class that moving the threshold (cutoff) changes how the contingency table is split. What happens when you raise the alert threshold?',
        )}
        choices={[
          {
            text: pick(
              lang,
              'La sensibilité diminue et la spécificité augmente',
              'Sensitivity decreases and specificity increases',
            ),
            correct: true,
          },
          {
            text: pick(
              lang,
              'La sensibilité et la spécificité augmentent toutes les deux',
              'Sensitivity and specificity both increase',
            ),
          },
          { text: pick(lang, "L'AUC du modèle augmente", 'The model’s AUC increases') },
          {
            text: pick(
              lang,
              'Rien ne change, le seuil est une propriété fixe du modèle',
              'Nothing changes, the threshold is a fixed property of the model',
            ),
          },
        ]}
        explanation={pick(
          lang,
          <>
            Comme vu dans le cours « Évaluation des modèles » : monter le seuil rend le test plus{' '}
            <strong>exigeant</strong> pour déclencher une alerte → on détecte moins de vrais sepsis
            (<strong>sensibilité ↓</strong>) mais on fait moins de fausses alertes (
            <strong>spécificité ↑</strong>). L'<strong>AUC ne change pas</strong> : elle résume le
            modèle pour <em>tous</em> les seuils à la fois. Vérifiez en bougeant le curseur !
          </>,
          <>
            As seen in the “Model evaluation” course: raising the threshold makes the test more{' '}
            <strong>demanding</strong> before it triggers an alert → fewer true sepsis cases are
            detected (<strong>sensitivity ↓</strong>) but there are fewer false alerts (
            <strong>specificity ↑</strong>). The <strong>AUC does not change</strong>: it summarises
            the model across <em>all</em> thresholds at once. Check by moving the slider!
          </>,
        )}
      />

      <OpenQuestion
        id="threshold-choice"
        question={pick(
          lang,
          'Vous déployez cet outil aux urgences. Choisiriez-vous un seuil plutôt bas ou plutôt haut ? Justifiez, et dites ce que vous accepteriez comme contrepartie.',
          'You are deploying this tool in the emergency department. Would you choose a rather low or a rather high threshold? Justify, and say what trade-off you would accept.',
        )}
        hint={pick(
          lang,
          'Rappelez-vous : rater un sepsis peut tuer ; trop d\'alertes épuise les équipes.',
          'Remember: missing a sepsis can kill; too many alerts wear teams out.',
        )}
        reveal={pick(
          lang,
          <>
            Pour une pathologie grave et traitable, on choisit souvent un seuil{' '}
            <strong>plutôt bas</strong> pour maximiser la sensibilité (rater peu de sepsis), en
            acceptant davantage de fausses alertes — <em>à condition</em> que le service puisse
            absorber ces alertes sans se désensibiliser. Le bon réglage dépend du contexte : des
            ressources, du type de service, et de ce qu'on est prêt à assumer. L'essentiel est que
            ce choix soit <strong>explicite et assumé</strong>, pas subi.
          </>,
          <>
            For a serious, treatable condition, we often choose a <strong>rather low</strong>{' '}
            threshold to maximise sensitivity (miss few sepsis cases), accepting more false alerts —{' '}
            <em>provided</em> the department can absorb these alerts without becoming desensitised.
            The right setting depends on the context: resources, type of department, and what one is
            prepared to take responsibility for. What matters is that the choice is{' '}
            <strong>explicit and owned</strong>, not something that just happens.
          </>,
        )}
      />
    </div>
  )
}

// ==================================================================
// Step 6 — Individual patients
// ==================================================================

function PatientStep({ model }: { model: TrainedModel | null }) {
  const lang = useLang()
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        subtitle={pick(
          lang,
          'Derrière les moyennes, il y a des patients. Ouvrez le dossier, modifiez un paramètre, et regardez ce que le modèle en fait.',
          'Behind the averages, there are patients. Open the record, change a parameter, and see what the model makes of it.',
        )}
      >
        {pick(lang, 'Le dossier du patient', 'The patient record')}
      </SectionTitle>

      <PatientRecordStep model={model} />

      <Callout variant="blue" title={pick(lang, 'Pourquoi le modèle se trompe-t-il ?', 'Why does the model get it wrong?')}>
        {pick(
          lang,
          <>
            Regardez un « sepsis raté » : souvent, ses paramètres vitaux à l'admission sont presque normaux — le
            sepsis s'est déclaré plus tard, avec des signes que le modèle ne pouvait pas voir à ce
            moment. Un modèle ne prédit qu'à partir de ce qu'on lui montre. Face à un cas atypique ou à
            des données pauvres, sa prédiction est fragile : le jugement clinique reste indispensable.
          </>,
          <>
            Look at a “missed sepsis”: often, the vital signs at admission are almost normal — the
            sepsis developed later, with signs the model could not see at that point. A model can only
            predict from what it is shown. Faced with an atypical case or sparse data, its prediction
            is fragile: clinical judgement remains essential.
          </>,
        )}
      </Callout>
    </div>
  )
}

// ==================================================================
// Step 7 — Critical appraisal (+ leakage bonus + Epic + checklist)
// ==================================================================

const CHECKLIST: { fr: string; en: string }[] = [
  {
    fr: 'Sur quelles données a-t-il été entraîné ? Ma population de patients y ressemble-t-elle ?',
    en: 'What data was it trained on? Does my patient population resemble it?',
  },
  {
    fr: 'A-t-il été validé de façon externe et indépendante, sur d’autres hôpitaux ?',
    en: 'Has it been externally and independently validated, in other hospitals?',
  },
  {
    fr: 'Quelle est sa performance réelle (AUC, sensibilité, VPP) — pas seulement annoncée ?',
    en: 'What is its real-world performance (AUC, sensitivity, PPV) — not just the advertised one?',
  },
  {
    fr: 'Quel seuil de décision est utilisé, et qui l’a choisi ? Avec quelles conséquences ?',
    en: 'What decision threshold is used, and who chose it? With what consequences?',
  },
  {
    fr: 'Combien de fausses alertes génère-t-il en pratique (risque de fatigue d’alarme) ?',
    en: 'How many false alerts does it generate in practice (risk of alarm fatigue)?',
  },
  {
    fr: 'Sur quels patients se trompe-t-il ? Y a-t-il des sous-groupes désavantagés ?',
    en: 'Which patients does it get wrong? Are some subgroups disadvantaged?',
  },
  {
    fr: 'Reste-t-il un contrôle humain sur la décision finale ?',
    en: 'Is there still human oversight of the final decision?',
  },
]

function CritiqueStep({ model }: { model: TrainedModel | null }) {
  const lang = useLang()
  const [showLeak, setShowLeak] = useState(false)
  const leak = useMemo(() => (showLeak ? leakageDemo() : null), [showLeak])
  const ourAuc = model ? rocCurve(model.test).auc : null

  const leakData = useMemo<Data[]>(() => {
    if (!leak) return []
    return [
      {
        type: 'bar',
        x: pick(
          lang,
          ['Découpage par patient\n(honnête)', 'Découpage par ligne\n(fuite de données)'],
          ['Split by patient\n(honest)', 'Split by row\n(data leakage)'],
        ),
        y: [leak.patientSplitAuc, leak.rowSplitAuc],
        marker: { color: ['#10b981', '#ef4444'], line: BAR_LINE },
        text: [leak.patientSplitAuc.toFixed(2), leak.rowSplitAuc.toFixed(2)],
        textposition: 'auto',
      },
    ]
  }, [leak, lang])

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        subtitle={pick(
          lang,
          "Vous serez confrontés à des outils d'IA « validés ». Voici comment garder l'esprit critique.",
          'You will come across “validated” AI tools. Here is how to keep a critical mind.',
        )}
      >
        {pick(lang, "Regard critique sur un outil d'IA médical", 'Critical appraisal of a medical AI tool')}
      </SectionTitle>

      {/* Real-world case: Epic Sepsis Model */}
      <Panel
        title={pick(lang, "Cas réel : l'Epic Sepsis Model", 'Real-world case: the Epic Sepsis Model')}
        icon={ShieldAlert}
        accent="red"
        edge
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              <>
                Un modèle de prédiction du sepsis intégré au dossier patient informatisé Epic a été
                déployé dans des centaines d'hôpitaux américains, avec une performance annoncée élevée.
                Une évaluation indépendante en 2021 (Université du Michigan, ~38 000 hospitalisations) a
                trouvé une réalité bien différente :
              </>,
              <>
                A sepsis prediction model built into the Epic electronic health record was deployed in
                hundreds of US hospitals, with high advertised performance. An independent evaluation
                in 2021 (University of Michigan, ~38,000 hospitalisations) found a very different
                reality:
              </>,
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              title={pick(lang, 'AUC réelle', 'Actual AUC')}
              value={pick(lang, '0,63', '0.63')}
              detail={pick(lang, 'vs performance annoncée', 'vs advertised performance')}
              icon={Gauge}
              accent="red"
            />
            <MetricCard
              title={pick(lang, 'Sepsis manqués', 'Sepsis missed')}
              value={pct(67, lang)}
              detail={pick(lang, 'des vrais sepsis non détectés', 'of true sepsis cases not detected')}
              icon={XCircle}
              accent="red"
            />
            <MetricCard
              title={pick(lang, 'Alertes générées', 'Alerts generated')}
              value={pct(18, lang)}
              detail={pick(lang, "des patients → fatigue d'alarme", 'of patients → alarm fatigue')}
              icon={AlertTriangle}
              accent="amber"
            />
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Wong A et al., <em>External Validation of a Widely Implemented Proprietary Sepsis
            Prediction Model in Hospitalized Patients</em>, JAMA Internal Medicine 2021.
          </p>
          <Callout
            variant="amber"
            title={pick(lang, 'Le lien avec le cours : la validité externe', 'The link with the course: external validity')}
          >
            {pick(
              lang,
              <>
                Rappelez-vous l'exemple du cours : un modèle de mortalité en réanimation à{' '}
                <strong>Boston (AUROC 95 %)</strong> ne donnait plus que <strong>73 % à Rennes</strong>{' '}
                — pas les mêmes patients, pas les mêmes pratiques. Le modèle Epic illustre la même
                leçon à grande échelle : une performance annoncée n'a de valeur qu'après{' '}
                <strong>validation externe indépendante</strong> sur la population où on veut l'utiliser.
              </>,
              <>
                Remember the example from class: an ICU mortality model from{' '}
                <strong>Boston (AUROC 95%)</strong> dropped to only <strong>73% in Rennes</strong> —
                different patients, different practices. The Epic model illustrates the same lesson on
                a large scale: advertised performance is only meaningful after{' '}
                <strong>independent external validation</strong> in the population where you intend
                to use it.
              </>,
            )}
          </Callout>
        </div>
      </Panel>

      <Qcm
        id="critique-same-auc"
        question={pick(
          lang,
          "Notre modèle de TD a une AUC d'environ 0,63, très proche de celle du modèle Epic déployé en vrai. Qu'en conclure ?",
          'Our tutorial model has an AUC of about 0.63, very close to that of the Epic model deployed in real life. What should we conclude?',
        )}
        choices={[
          { text: pick(lang, 'Notre TD est raté, il faut un meilleur modèle', 'Our tutorial has failed, we need a better model') },
          {
            text: pick(
              lang,
              'Prédire le sepsis tôt est intrinsèquement difficile, y compris pour des outils commerciaux',
              'Predicting sepsis early is intrinsically difficult, including for commercial tools',
            ),
            correct: true,
          },
          { text: pick(lang, "L'AUC ne veut rien dire", 'AUC means nothing') },
          {
            text: pick(
              lang,
              'Les hôpitaux américains utilisent de mauvaises données',
              'US hospitals use bad data',
            ),
          },
        ]}
        explanation={pick(
          lang,
          <>
            Le problème est <strong>difficile en soi</strong>. Qu'un TD et un produit commercial
            déployé à grande échelle atteignent des performances comparables montre surtout qu'il
            faut se méfier des <strong>promesses</strong> et exiger une{' '}
            <strong>validation externe indépendante</strong> avant tout déploiement clinique.
          </>,
          <>
            The problem is <strong>inherently difficult</strong>. The fact that a tutorial and a
            commercial product deployed at scale reach comparable performance mainly shows that we
            should be wary of <strong>promises</strong> and demand{' '}
            <strong>independent external validation</strong> before any clinical deployment.
          </>,
        )}
      />

      {/* Leakage bonus */}
      <Panel
        title={pick(
          lang,
          "Bonus : d'où viennent les « AUC 0,98 » trop belles ?",
          'Bonus: where do those too-good-to-be-true “AUC 0.98” results come from?',
        )}
        icon={TriangleAlert}
        accent="amber"
        edge
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              <>
                On trouve en ligne des modèles annonçant une AUC de 0,98 sur ces mêmes données. Le
                secret est presque toujours une <strong>fuite de données</strong> (data leakage). Dans
                les données réelles, chaque patient a plusieurs lignes (une par heure). Si on mélange
                toutes les lignes puis qu'on sépare entraînement/test <em>au hasard</em>, des lignes
                d'un même patient se retrouvent des deux côtés : le modèle « reconnaît » le patient au
                lieu d'apprendre le sepsis.
              </>,
              <>
                You can find models online claiming an AUC of 0.98 on these same data. The secret is
                almost always <strong>data leakage</strong>. In the real data, each patient has several
                rows (one per hour). If you shuffle all the rows and then split training/test{' '}
                <em>at random</em>, rows from the same patient end up on both sides: the model
                “recognises” the patient instead of learning sepsis.
              </>,
            )}
          </p>
          <GuessReveal
            id="critique-leakage"
            question={pick(
              lang,
              'Même modèle, mêmes données, deux façons de découper. Que va-t-il se passer ?',
              'Same model, same data, two ways of splitting. What will happen?',
            )}
            options={pick(
              lang,
              ['Résultats identiques', 'Le découpage par ligne triche', 'Le découpage par patient triche'],
              ['Identical results', 'The split by row cheats', 'The split by patient cheats'],
            )}
            answerIndex={1}
            explanation={pick(
              lang,
              "Le découpage par ligne laisse fuiter l'information : la performance explose artificiellement. Cliquez ci-dessous pour le vérifier.",
              'Splitting by row lets information leak: performance soars artificially. Click below to check.',
            )}
          />
          {!showLeak ? (
            <Button variant="outline" className="w-fit" onClick={() => setShowLeak(true)}>
              <Play size={14} /> {pick(lang, 'Lancer la démonstration', 'Run the demonstration')}
            </Button>
          ) : (
            leak && (
              <>
                <PlotlyChart
                  data={leakData}
                  layout={baseLayout({
                    height: 300,
                    yaxis: { title: { text: 'AUC' }, range: [0, 1], gridcolor: GRID },
                    xaxis: { gridcolor: GRID },
                  })}
                  config={PLOT_CONFIG}
                />
                <Callout
                  variant="red"
                  title={pick(
                    lang,
                    'Le même modèle « passe » de 0,57 à 0,98',
                    'The same model “goes” from 0.57 to 0.98',
                  )}
                >
                  {pick(
                    lang,
                    <>
                      Seule la façon de découper a changé. Le <strong>0,98</strong> est un mirage dû à la
                      fuite de données ; le <strong>{leak.patientSplitAuc.toFixed(2)}</strong> (découpage
                      par patient) est la vraie performance
                      {ourAuc !== null && <> — cohérente avec notre modèle honnête ({ourAuc.toFixed(2)})</>}.
                      Une performance qui semble trop belle doit toujours éveiller les soupçons.
                    </>,
                    <>
                      Only the way of splitting has changed. The <strong>0.98</strong> is a mirage caused
                      by data leakage; the <strong>{leak.patientSplitAuc.toFixed(2)}</strong> (split by
                      patient) is the real performance
                      {ourAuc !== null && <> — consistent with our honest model ({ourAuc.toFixed(2)})</>}.
                      Performance that looks too good to be true should always raise suspicion.
                    </>,
                  )}
                </Callout>
              </>
            )
          )}
        </div>
      </Panel>

      {/* Take-home checklist */}
      <Panel
        title={pick(lang, "Grille de lecture d'un outil d'IA médical", 'Checklist for appraising a medical AI tool')}
        icon={ClipboardCheck}
        edge
      >
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2 text-sm text-[var(--color-foreground)]">
            {CHECKLIST.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>{pick(lang, item.fr, item.en)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <OpenQuestion
        id="critique-takeaway"
        question={pick(
          lang,
          "En une phrase : que retiendrez-vous de ce TD pour votre future pratique face à un outil d'IA ?",
          'In one sentence: what will you take away from this tutorial for your future practice when facing an AI tool?',
        )}
        reveal={pick(
          lang,
          <>
            Il n'y a pas de mauvaise réponse. L'idée centrale : un outil d'IA n'est ni magique ni
            neutre. Il faut connaître ses données, sa vraie performance, son seuil et ses angles
            morts — et garder son jugement clinique. Un bon outil d'aide à la décision{' '}
            <strong>assiste</strong> le médecin, il ne le remplace pas.
          </>,
          <>
            There is no wrong answer. The core idea: an AI tool is neither magical nor neutral. You
            need to know its data, its real performance, its threshold and its blind spots — and keep
            your clinical judgement. A good decision-support tool <strong>assists</strong> the
            doctor; it does not replace them.
          </>,
        )}
      />
    </div>
  )
}

// ==================================================================
// Shell
// ==================================================================

export function SepsisModule() {
  // L'étape vit dans l'URL (?step=…), comme dans le TD chatbots : un
  // rechargement, un signet ou un lien envoyé à la promo retombent sur la bonne
  // section. Un identifiant inconnu ramène simplement à l'introduction.
  const [params, setParams] = useSearchParams()
  const fromUrl = STEPS.findIndex((s) => s.id === params.get('step'))
  const idx = fromUrl >= 0 ? fromUrl : 0
  const step = STEPS[idx].id

  // Retenir l'étape pour y revenir depuis la barre latérale. Le TD fait huit
  // étapes : partir consulter un cours puis retomber sur l'introduction
  // obligerait à refaire tout le chemin.
  useRememberStep(step)

  const [config, setConfig] = useState<ModelConfig>({
    features: DEFAULT_FEATURES,
    trainFraction: 0.7,
    seed: 42,
  })
  const [model, setModel] = useState<TrainedModel | null>(null)
  // L'historique des essais vit ici et non dans l'étape : revenir sur ses pas
  // ne doit pas effacer ce qu'on a déjà comparé.
  const [runs, setRuns] = useState<Run[]>([])

  // `replace` : les huit étapes ne doivent pas empiler huit entrées dans
  // l'historique, sinon « retour » ne quitte plus jamais le TD.
  const goTo = (i: number) => {
    const next = new URLSearchParams(params)
    next.set('step', STEPS[i].id)
    setParams(next, { replace: true })
  }

  // L'essai affiché au centre. `null` = le dernier entraînement en date ;
  // un numéro = un essai que l'étudiant a rappelé depuis le podium.
  const [shownRun, setShownRun] = useState<number | null>(null)

  const handleTrain = () => {
    const trained = trainModel({ ...config, splitMode: 'patient' })
    setModel(trained)
    const roc = rocCurve(trained.test)
    const cm = confusionAt(trained.test, 0.5)
    setRuns((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        features: config.features,
        trainFraction: config.trainFraction,
        auc: roc.auc,
        se: cm.se,
        sp: cm.sp,
        ppv: cm.ppv,
        nTrain: trained.train.length,
        nTest: trained.test.length,
        model: trained,
      },
    ])
    // Un nouvel entraînement reprend la main sur l'essai rappelé.
    setShownRun(null)
  }

  /**
   * Rappeler un essai : on remet ses réglages dans le panneau de gauche ET son
   * modèle au centre. Restaurer les seuls réglages afficherait des résultats
   * qui ne leur correspondent pas tant qu'on n'a pas relancé.
   */
  const recallRun = (run: Run) => {
    setConfig({ ...config, features: run.features, trainFraction: run.trainFraction })
    setModel(run.model)
    setShownRun(run.id)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <NavBar
        stepIndex={idx}
        onPrev={() => goTo(Math.max(0, idx - 1))}
        onNext={() => goTo(Math.min(STEPS.length - 1, idx + 1))}
        onSelect={goTo}
        showPaneToggles={step === 'train'}
      />

      {/* L'étape « Entraîner » ne défile PAS en bloc : ce sont ses trois
          colonnes qui défilent chacune de leur côté, ce qui suppose que le
          conteneur leur impose une hauteur au lieu de s'étirer sous elles. Les
          autres étapes sont du texte suivi et défilent normalement. */}
      <div className={cn('flex-1', step === 'train' ? 'min-h-0 xl:overflow-hidden' : 'overflow-y-auto')}>
        {/* Moins d'air en haut qu'en bas : le titre suit immédiatement la barre
            de navigation, alors que le bas de page doit garder une marge de
            défilement. La paillasse, elle, prend toute la largeur utile. */}
        <div
          className={cn(
            'mx-auto px-4 pt-5 sm:px-6 lg:px-8',
            step === 'train' ? 'max-w-[1600px] pb-5 xl:h-full xl:min-h-0' : 'max-w-5xl pb-10',
          )}
        >
          {step === 'intro' && <IntroStep onStart={() => goTo(STEPS.findIndex((s) => s.id === 'case'))} />}
          {step === 'case' && <CaseStep />}
          {step === 'data' && <DataStep />}
          {step === 'prepare' && <PrepareStep />}
          {step === 'train' && (
            <TrainStep
              config={config}
              setConfig={setConfig}
              model={model}
              onTrain={handleTrain}
              runs={runs}
              onClearRuns={() => {
                setRuns([])
                setShownRun(null)
              }}
              shownRun={shownRun}
              onRecall={recallRun}
            />
          )}
          {step === 'threshold' && <ThresholdStep model={model} />}
          {step === 'patients' && <PatientStep model={model} />}
          {step === 'critique' && <CritiqueStep model={model} />}
          {step === 'sources' && <SourcesStep />}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
  MousePointerClick,
  RotateCcw,
  PanelLeft,
  PanelRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useLang, pick, type Lang } from '@/lib/useLang'
import { useRememberStep } from '@/lib/last-step'
import { Callout, SectionTitle } from '@/features/courses/modules/sepsis/ui'
import { REFERENCE_ANSWER, tr } from './data'
import { SettingsPanel } from './components'
import { PdfViewer, type Highlight } from './PdfViewer'
import { WarmupStep } from './WarmupStep'
import { SourcesStep } from './SourcesStep'
import { BenchmarkStep } from './BenchmarkStep'
import { PromptStep } from './PromptStep'
import { MemoryStep } from './MemoryStep'
import { SettingsStep } from './SettingsStep'
import { UsageStep } from './UsageStep'
import { DocumentsStep } from './DocumentsStep'
import { SynthesisStep } from './SynthesisStep'
import { SkillsBadge } from './SkillsUi'
import { SkillsWatcher } from './SkillsWatcher'
import { DebriefStep } from './DebriefStep'
import { TeacherGuideStep } from './TeacherGuideStep'
import { ObjectivesList, SelfAssessment } from './objectives'
import { useSelfAssessmentDone } from './objectives-store'
import { ExportPanel } from './ExportPanel'
import { StepTimer } from './StepTimer'
import { EXTRA_STEPS, MAIN_STEPS, STEPS, stepLabel, type Step } from './steps'
import { TourProvider, TourTarget } from './tour'
import { INTERFACE_TOUR } from './tour-data'
import { useSettings } from './settings'
import { stepMinutes } from './timer'
import { togglePane, usePaneVisibility } from './panes'
import { useProgress } from './progress'

type Reading = { quote: { fr: string; en: string } }

interface RecoDoc {
  id: string
  label: { fr: string; en: string }
  file: string
  initialPage: number
  /** Titre de l'encart « à lire ». */
  readingsTitle: { fr: string; en: string }
  readings: Reading[]
  highlights: Highlight[]
}

// Deux sources à croiser (comme souvent en médecine) : la fiche HAS (quelle
// molécule, quelle durée, posologie chez le rein normal) ET l'adaptation à la
// fonction rénale (OMEDIT, quelle dose à DFG 38).
//
// La fiche HAS est courte, hiérarchisée (1re / 2e intention) et donne la
// posologie : c'est aussi elle qu'on joint à l'exercice 6.
const RECO_DOCS: RecoDoc[] = [
  {
    id: 'has',
    label: { fr: 'Fiche HAS (2025)', en: 'HAS memo (2025)' },
    file: '/td/recos/has-2025-pyelonephrite-femme.pdf',
    initialPage: 2,
    readingsTitle: { fr: 'À lire — pages 1 et 2', en: 'To read — pages 1 and 2' },
    // Par ZONE : les mêmes posologies reviennent dans le traitement de relais,
    // plus bas sur la page 2 ; un surlignage par texte les attraperait aussi.
    // Page de 841,8 pt de haut, origine en bas à gauche.
    highlights: [
      // Page 1 : les facteurs de risque de complication — c'est leur absence
      // qui fait de Mme D. (68 ans, DFG 38) une PNA « simple ».
      { page: 1, zone: { x0: 55, x1: 540, y0: 343, y1: 402 } },
      // Page 2 : 1re intention (fluoroquinolones per os) et 2e intention (C3G)
      { page: 2, zone: { x0: 147, x1: 537, y0: 618, y1: 731 } },
      // Page 2 : les durées — 7 jours avec une fluoroquinolone…
      { page: 2, zone: { x0: 83, x1: 547, y0: 458, y1: 490 } },
      // … ou avec la ceftriaxone
      { page: 2, zone: { x0: 83, x1: 335, y0: 423, y1: 439 } },
    ],
    readings: [
      {
        quote: {
          fr: '**1ʳᵉ intention**, en l’absence de traitement par quinolone dans les 6 mois : « fluoroquinolones par voie orale : ciprofloxacine : 500 mg 2 fois par jour ou lévofloxacine : 500 mg par jour ». (p. 2)',
          en: '**First line**, if no quinolone in the past 6 months: “oral fluoroquinolones: ciprofloxacin 500 mg twice daily or levofloxacin 500 mg daily”. (p. 2)',
        },
      },
      {
        quote: {
          fr: '**2ᵉ intention**, en cas de fluoroquinolone dans les 6 mois : « céphalosporines de 3ᵉ génération par voie parentérale : ceftriaxone (IM, IV) : 1 g par jour ». (p. 2)',
          en: '**Second line**, if a fluoroquinolone was taken in the past 6 months: “parenteral 3rd-generation cephalosporins: ceftriaxone (IM, IV): 1 g daily”. (p. 2)',
        },
      },
      {
        quote: {
          fr: '**Durée** : 7 jours avec une fluoroquinolone ou la ceftriaxone. (p. 2)',
          en: '**Duration**: 7 days with a fluoroquinolone or ceftriaxone. (p. 2)',
        },
      },
      {
        quote: {
          fr: 'Facteurs de risque de complication : « insuffisance rénale sévère (DFG < 30 ml/min) », « âge supérieur à 75 ans, ou supérieur à 65 ans avec au moins 3 critères de Fried ». Mme D. (68 ans, DFG 38) n’en a aucun : PNA **simple**. (p. 1)',
          en: 'Risk factors for complication: “severe renal impairment (GFR < 30 ml/min)”, “age over 75, or over 65 with at least 3 Fried criteria”. Mrs D. (68, GFR 38) has none: **uncomplicated** APN. (p. 1)',
        },
      },
    ],
  },
  {
    id: 'omedit',
    label: { fr: 'Adaptation rénale (OMEDIT 2021)', en: 'Renal adjustment (OMEDIT 2021)' },
    file: '/td/recos/omedit-antibiotiques-insuffisance-renale.pdf',
    initialPage: 1,
    readingsTitle: {
      fr: 'À lire — Mme D. a un DFG de 38 → colonne « IRC modérée 44→30 »',
      en: 'To read — Mrs D. has a GFR of 38 → column “moderate CKD 44→30”',
    },
    readings: [
      {
        quote: {
          fr: '**Ciprofloxacine** PO : normorénal « 500 ou 750 mg / 8 à 12 h » → à DFG 38, « 500 ou 750 mg / 12 à 24 h ». Les 500 mg × 2/j de la fiche HAS (toutes les 12 h) restent donc valables ; pas de prise plus rapprochée.',
          en: '**Ciprofloxacin** PO: normal renal function “500 or 750 mg every 8–12 h” → at GFR 38, “500 or 750 mg every 12–24 h”. The HAS dose of 500 mg twice daily (every 12 h) therefore still holds; no closer dosing.',
        },
      },
      {
        quote: {
          fr: '**Lévofloxacine** : normorénal « 500 mg / 12 à 24 h » → à DFG 38, « DC de 500 mg puis 250 mg / 12 à 24 h » (dose de charge, puis dose réduite).',
          en: '**Levofloxacin**: normal renal function “500 mg every 12–24 h” → at GFR 38, “loading dose of 500 mg then 250 mg every 12–24 h”.',
        },
      },
      {
        quote: {
          fr: '**Ceftriaxone** : une seule case pour toutes les fonctions rénales, « Infection modérée : 1 à 2 g/24h » → PAS d’adaptation nécessaire.',
          en: '**Ceftriaxone**: a single cell for every level of renal function, “Moderate infection: 1–2 g/24h” → NO adjustment needed.',
        },
      },
      {
        quote: {
          fr: 'Nitrofurantoïne : « déconseillé » entre 59 et 30 mL/min, « contre-indiqué » < 30 → à écarter (en plus d’être hors indication dans la PNA).',
          en: 'Nitrofurantoin: “not advised” between 59 and 30 mL/min, “contraindicated” < 30 → to be ruled out (and not indicated in pyelonephritis anyway).',
        },
      },
    ],
    // Surlignage par ZONE (coordonnées PDF), car le même texte apparaît dans
    // plusieurs colonnes du tableau. On cible la colonne « IRC modérée 44→30 »
    // (DFG 38 de Mme D.) et les cases utiles de chaque ligne. Page 842 pt de haut.
    highlights: [
      // Noms de molécules (colonne de gauche) — repères visuels
      { page: 1, text: 'Ciprofloxacine PO' },
      { page: 1, text: 'Ofloxacine' },
      { page: 1, text: 'Levofloxacine' },
      { page: 1, text: 'Ceftriaxone' },
      { page: 2, text: 'Nitrofurantoïne' },
      // En-tête de la colonne cible « IRC modérée 44 → 30 »
      { page: 1, zone: { x0: 345, x1: 432, y0: 730, y1: 756 } },
      // Ciprofloxacine, case 44→30 : « 500 ou 750 mg/ 12 à 24h » (cellule fusionnée)
      { page: 1, zone: { x0: 288, x1: 432, y0: 344, y1: 356 } },
      // Lévofloxacine, cellule fusionnée 59→30 : « DC de 500 mg puis 250 mg/12 à 24h »
      { page: 1, zone: { x0: 275, x1: 410, y0: 320, y1: 344 } },
      // Ofloxacine, case 44→30 : « 400 mg/ 24h »
      { page: 1, zone: { x0: 390, x1: 452, y0: 261, y1: 274 } },
      // Ceftriaxone, cellule fusionnée : « Infection moderée : 1 à 2 g/24h. »
      // seulement — la posologie retenue pour Mme D. (pas l'infection sévère).
      { page: 1, zone: { x0: 215, x1: 351, y0: 393, y1: 410 } },
      // Nitrofurantoïne (page 2), case IRC modérée : « Déconseillé »
      { page: 2, zone: { x0: 300, x1: 380, y0: 618, y1: 632 } },
    ],
  },
]

// ---------- Étapes ----------

/** Étapes bâties sur la disposition à trois colonnes (bascules de sidebar). */
const THREE_COLUMN_STEPS = new Set<string>([
  'tuto',
  'warmup',
  'prompt',
  'memory',
  'settings',
  'documents',
  'synthesis',
])

// ============================================================
// Shell
// ============================================================

export function ChatbotsModule() {
  const lang = useLang()
  // L'étape vit dans l'URL (?step=…) : un rechargement ou un lien
  // partagé retombe sur la bonne section. `etape` reste accepté en lecture,
  // les liens déjà distribués aux étudiants ne devant pas se briser.
  const [params, setParams] = useSearchParams()
  const wanted = params.get('step') ?? params.get('etape')
  const fromUrl = STEPS.findIndex((s) => s.id === wanted)
  const startDone = useSelfAssessmentDone('start')
  const endDone = useSelfAssessmentDone('end')
  // Tant que l'auto-évaluation de début n'est ni validée ni refusée, le fil de
  // la séance reste fermé, lien direct compris. Les pages annexes (dont les
  // réglages de l'enseignant) restent accessibles.
  const isLocked = (s: Step) =>
    !startDone && !('extra' in s) && s.id !== 'intro' && s.id !== 'self-start'
  const requested = fromUrl >= 0 ? fromUrl : 0
  const stepIndex = isLocked(STEPS[requested]) ? STEPS.findIndex((s) => s.id === 'self-start') : requested
  const step = STEPS[stepIndex]
  // On ne quitte pas une auto-évaluation sans l'avoir validée ou refusée.
  const nextLocked =
    (step.id === 'self-start' && !startDone) || (step.id === 'self-end' && !endDone)
  const [, markProgress] = useProgress()
  // La visite s'ouvre d'elle-même en arrivant sur « Prise en main ».
  const [tourOpen, setTourOpen] = useState(true)

  // Revenir au TD depuis la barre latérale reprend à l'étape quittée.
  useRememberStep(step.id)

  // Voir l'étape « Recommandations » déverrouille l'accès à la reco
  // depuis les étapes suivantes. Avant, l'étudiant juge à l'aveugle.
  useEffect(() => {
    if (step.id === 'reco') markProgress({ seenGuidelines: true })
  }, [step.id, markProgress])

  const goTo = (i: number) => {
    const next = new URLSearchParams(params)
    next.delete('etape')
    next.set('step', STEPS[i].id)
    setParams(next, { replace: true })
  }

  const page = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Monté une seule fois : les étapes n'annoncent rien elles-mêmes, tout
          se déduit de l'historique qu'elles enregistrent déjà. */}
      <SkillsWatcher lang={lang} />

      <NavBar
        lang={lang}
        stepIndex={stepIndex}
        total={STEPS.length}
        onPrev={() => goTo(Math.max(0, stepIndex - 1))}
        onNext={() => goTo(Math.min(STEPS.length - 1, stepIndex + 1))}
        onSelect={goTo}
        showPaneToggles={THREE_COLUMN_STEPS.has(step.id)}
        nextLocked={nextLocked}
        isLocked={isLocked}
      />

      {/* L'étape "reco" occupe toute la hauteur (PDF plein écran) : pas de wrapper scrollé. */}
      {step.id === 'reco' ? (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <RecoStep lang={lang} />
        </div>
      ) : step.id === 'tuto' ? (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <TutoStep
            lang={lang}
            tourOpen={tourOpen}
            onReplay={() => setTourOpen(true)}
            onStart={() => goTo(stepIndex + 1)}
          />
        </div>
      ) : step.id === 'warmup' ? (
        /* L'échauffement gère son propre défilement, colonne par colonne. */
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <WarmupStep lang={lang} />
        </div>
      ) : step.id === 'prompt' ? (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <PromptStep lang={lang} />
        </div>
      ) : step.id === 'memory' ? (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <MemoryStep lang={lang} />
        </div>
      ) : step.id === 'settings' ? (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <SettingsStep lang={lang} />
        </div>
      ) : step.id === 'documents' ? (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <DocumentsStep lang={lang} />
        </div>
      ) : step.id === 'synthesis' ? (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
          <SynthesisStep lang={lang} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
            {step.id === 'usage' && <UsageStep lang={lang} />}
            {step.id === 'intro' && <IntroStep lang={lang} onStart={() => goTo(stepIndex + 1)} />}
            {step.id === 'self-start' && (
              <SelfStartStep lang={lang} onDone={() => goTo(stepIndex + 1)} />
            )}
            {step.id === 'self-end' && <SelfEndStep lang={lang} />}
            {step.id === 'sources' && <SourcesStep lang={lang} />}
            {('debrief' in step || step.id === 'wrapup') && (
              <DebriefStep
                id={step.id}
                lang={lang}
                onNext={() => goTo(Math.min(STEPS.length - 1, stepIndex + 1))}
              />
            )}
            {step.id === 'guide' && <TeacherGuideStep lang={lang} />}
            {step.id === 'benchmark' && <BenchmarkStep lang={lang} />}
            {step.id === 'admin' && <SettingsPanel lang={lang} />}
          </div>
        </div>
      )}
    </div>
  )

  // Les cibles de la visite n'existent que sur « Prise en main » : ailleurs,
  // aucun fournisseur, donc aucun enrobage autour des boutons.
  return step.id === 'tuto' ? (
    <TourProvider
      lang={lang}
      steps={INTERFACE_TOUR}
      open={tourOpen}
      onClose={() => setTourOpen(false)}
    >
      {page}
    </TourProvider>
  ) : (
    page
  )
}

/**
 * « Prise en main » : l'écran de l'échauffement, sous la visite guidée.
 * Une fois la visite fermée, un bandeau propose de la revoir ou de passer
 * à l'exercice.
 */
function TutoStep({
  lang,
  tourOpen,
  onReplay,
  onStart,
}: {
  lang: Lang
  tourOpen: boolean
  onReplay: () => void
  onStart: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {!tourOpen && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2.5">
          <MousePointerClick className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="min-w-0 flex-1 text-sm text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              'Vous pouvez déjà essayer une question : vos essais seront repris à l’exercice 1.',
              'You can already try a question: your attempts carry over to exercise 1.',
            )}
          </p>
          <Button size="sm" variant="outline" onClick={onReplay} className="cursor-pointer gap-1.5">
            <RotateCcw className="size-3.5" />
            {pick(lang, 'Revoir la visite', 'Replay the tour')}
          </Button>
          <Button size="sm" onClick={onStart} className="cursor-pointer gap-1.5">
            {pick(lang, 'Commencer l’échauffement', 'Start the warm-up')}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <WarmupStep lang={lang} />
      </div>
    </div>
  )
}

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

/**
 * La barre de navigation, en haut — et la seule.
 *
 * Les onglets occupaient une bande entière, pour onze étapes dont on ne
 * consulte qu'une à la fois. Ils vivent désormais dans un menu déroulant, au
 * centre de cette barre : la liste complète reste à un clic, et le TD
 * récupère la hauteur.
 *
 * Les boutons portent le NOM de l'étape voisine, pas seulement une flèche :
 * on sait où l'on va avant de cliquer, ce qui compte quand la progression
 * n'est pas linéaire.
 */
function NavBar({
  lang,
  stepIndex,
  total,
  onPrev,
  onNext,
  onSelect,
  showPaneToggles,
  nextLocked,
  isLocked,
}: {
  lang: Lang
  stepIndex: number
  total: number
  onPrev: () => void
  onNext: () => void
  onSelect: (i: number) => void
  showPaneToggles: boolean
  nextLocked: boolean
  isLocked: (s: Step) => boolean
}) {
  const panes = usePaneVisibility()
  const [settings] = useSettings()
  const previous = stepIndex > 0 ? STEPS[stepIndex - 1] : null
  const next = stepIndex < total - 1 ? STEPS[stepIndex + 1] : null
  const current = STEPS[stepIndex]
  const CurrentIcon = current.icon
  const mainIndex = MAIN_STEPS.indexOf(current)
  // Le menu a deux vues : le fil de la séance, ou les pages annexes.
  const [view, setView] = useState<'main' | 'more'>('main')
  const itemProps = {
    lang,
    current: current.id,
    minutes: (id: string) => (settings.timerEnabled ? stepMinutes(settings, id) : 0),
    onSelect,
    isLocked,
  }

  return (
    <div className="relative shrink-0 border-b bg-[var(--color-card)]">
      {/* Les bascules de colonnes rejoignent cette barre : elles commandent la
          disposition, elles ont leur place avec la navigation. */}
      {showPaneToggles && (
        <>
          <PaneToggle
            side="left"
            open={panes.left}
            label={pick(lang, 'Afficher/masquer la consigne', 'Show/hide the brief')}
            className="left-2 hidden xl:flex"
          />
          <PaneToggle
            side="right"
            open={panes.right}
            label={pick(lang, 'Afficher/masquer le panneau latéral', 'Show/hide the side panel')}
            className="right-2 hidden xl:flex"
          />
        </>
      )}

      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        {/* `min-w-0` + `truncate` : un libellé long rétrécit au lieu de
            pousser le menu central hors de l'écran. */}
        <Button
          variant="outline"
          size="sm"
          disabled={!previous}
          onClick={onPrev}
          className="min-w-0 cursor-pointer gap-1.5"
          title={previous ? stepLabel(lang, previous) : undefined}
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="truncate">
            {previous ? stepLabel(lang, previous) : pick(lang, 'Précédent', 'Previous')}
          </span>
        </Button>

        {/* Étape courante et progression au centre, côte à côte : les deux
            répondent à « où j'en suis », l'une dans le TD, l'autre dans les
            compétences. */}
        <div className="flex min-w-0 items-center gap-1.5">
          <TourTarget id="nav-timer">
            <StepTimer lang={lang} stepId={current.id} />
          </TourTarget>
          <TourTarget id="nav-menu" className="min-w-0">
            <DropdownMenu
              // À chaque ouverture, on repart de la vue où se trouve l'étape
              // courante : sur une page annexe, on rouvre sur « Plus ».
              onOpenChange={(open) => open && setView(mainIndex < 0 ? 'more' : 'main')}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="min-w-0 cursor-pointer gap-1.5">
                  <CurrentIcon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" />
                  <span className="truncate font-medium">{stepLabel(lang, current)}</span>
                  {mainIndex >= 0 && (
                    <span className="shrink-0 text-xs font-normal text-[var(--color-muted-foreground)] tabular-nums">
                      {mainIndex + 1}/{MAIN_STEPS.length}
                    </span>
                  )}
                  <ChevronDown className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                </Button>
              </DropdownMenuTrigger>
              {/* Ancrée en haut, la barre laisse le menu s'ouvrir vers le bas. */}
              <DropdownMenuContent
                align="center"
                side="bottom"
                className="max-h-[70vh] overflow-y-auto"
              >
                {view === 'main' ? (
                  <>
                    {MAIN_STEPS.map((s, i) => (
                      <StepItem key={s.id} step={s} rank={i + 1} {...itemProps} />
                    ))}
                    <DropdownMenuSeparator />
                    {/* `preventDefault` garde le menu ouvert : « Plus » remplace
                        la liste au lieu de la fermer. */}
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setView('more')
                      }}
                      className="cursor-pointer gap-2 text-[var(--color-muted-foreground)]"
                    >
                      <MoreHorizontal className="size-3.5 shrink-0" />
                      <span className="flex-1">{pick(lang, 'Plus', 'More')}</span>
                      <ChevronRight className="size-3.5 shrink-0" />
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setView('main')
                      }}
                      className="cursor-pointer gap-2 text-[var(--color-muted-foreground)]"
                    >
                      <ChevronLeft className="size-3.5 shrink-0" />
                      <span className="flex-1">{pick(lang, 'Retour à la séance', 'Back to the session')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {EXTRA_STEPS.map((s) => (
                      <StepItem key={s.id} step={s} {...itemProps} />
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TourTarget>
          <TourTarget id="nav-progress">
            <SkillsBadge lang={lang} />
          </TourTarget>
        </div>

        <TourTarget id="nav-next" className="flex min-w-0">
        <Button
          size="sm"
          disabled={!next || nextLocked}
          onClick={onNext}
          className="min-w-0 cursor-pointer gap-1.5"
          title={
            nextLocked
              ? pick(lang, 'Validez d’abord vos objectifs', 'Confirm your objectives first')
              : next
                ? stepLabel(lang, next)
                : undefined
          }
        >
          <span className="truncate">
            {next ? stepLabel(lang, next) : pick(lang, 'Suivant', 'Next')}
          </span>
          <ChevronRight className="size-4 shrink-0" />
        </Button>
        </TourTarget>
      </div>
    </div>
  )
}

/** Une ligne du menu des étapes. */
function StepItem({
  step,
  rank,
  indent,
  lang,
  current,
  minutes,
  onSelect,
  isLocked,
}: {
  step: Step
  rank?: number
  indent?: boolean
  lang: Lang
  current: string
  minutes: (id: string) => number
  onSelect: (i: number) => void
  isLocked: (s: Step) => boolean
}) {
  const Icon = step.icon
  const m = minutes(step.id)
  return (
    <DropdownMenuItem
      disabled={isLocked(step)}
      onSelect={() => onSelect(STEPS.indexOf(step))}
      className={cn(
        'cursor-pointer gap-2',
        indent && 'pl-6',
        step.id === current && 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
      )}
    >
      <Icon
        className={cn('size-3.5 shrink-0', 'debrief' in step && 'text-blue-600 dark:text-blue-300')}
      />
      <span className="flex-1">{stepLabel(lang, step)}</span>
      {m > 0 && (
        <span className="text-xs text-[var(--color-muted-foreground)] tabular-nums">{m} min</span>
      )}
      {rank !== undefined && (
        <span className="w-5 text-right text-xs text-[var(--color-muted-foreground)] tabular-nums">
          {rank}
        </span>
      )}
    </DropdownMenuItem>
  )
}

// ============================================================
// STEP intro
// ============================================================

function IntroStep({ lang, onStart }: { lang: Lang; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        subtitle={pick(
          lang,
          'TD — Chatbots médicaux : usages, limites et esprit critique',
          'Tutorial — Medical chatbots: uses, limits and critical thinking',
        )}
      >
        {pick(lang, 'Peut-on faire confiance à un chatbot médical ?', 'Can we trust a medical chatbot?')}
      </SectionTitle>

      <Callout variant="blue" title={pick(lang, 'À quoi sert ce TD ?', 'What is this tutorial for?')}>
        <p>
          {pick(
            lang,
            <>
              Vous utiliserez, dans votre pratique, des chatbots capables de répondre à une question
              médicale en quelques secondes. Ce TD vous met en situation de les{' '}
              <strong>interroger</strong> vous-même sur un vrai cas d’antibiothérapie, puis de{' '}
              <strong>confronter</strong> leurs réponses à la recommandation officielle.
            </>,
            <>
              In your practice, you will use chatbots able to answer a medical question in seconds.
              This tutorial puts you in the position of <strong>querying</strong> them yourself on a
              real antibiotic-therapy case, then <strong>comparing</strong> their answers with the
              official guideline.
            </>,
          )}
        </p>
        <p className="mt-3">
          {pick(
            lang,
            <>
              Vous verrez ensuite ce qui se joue derrière chaque réponse : comment formuler une
              question, d’où vient le hasard des réponses, ce que le modèle retient d’une
              conversation, ce qui change quand on lui fournit un document.
            </>,
            <>
              You will then see what lies behind each answer: how to phrase a question, where the
              randomness in answers comes from, what the model remembers from a conversation, what
              changes when you provide it with a document.
            </>,
          )}
        </p>
        <p className="mt-3">
          {pick(
            lang,
            <>
              Pas besoin de savoir programmer : vous manipulez, vous observez, vous{' '}
              <strong>jugez</strong>.
            </>,
            <>
              No programming needed: you experiment, you observe, you <strong>judge</strong>.
            </>,
          )}
        </p>
      </Callout>

      <Callout
        variant="emerald"
        title={pick(lang, 'Objectifs pédagogiques', 'Learning objectives')}
      >
        <p>{pick(lang, 'À l’issue du TD, vous serez capable de :', 'By the end of the tutorial, you will be able to:')}</p>
        <div className="mt-2">
          <ObjectivesList lang={lang} />
        </div>
      </Callout>

      <Button className="w-fit self-end" onClick={onStart}>
        {pick(lang, 'Commencer', 'Start')} <ChevronRight size={16} />
      </Button>
    </div>
  )
}

// ============================================================
// STEP self-start — auto-évaluation de début de séance
// ============================================================

function SelfStartStep({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        subtitle={pick(
          lang,
          'Une minute, avant de commencer : où en êtes-vous ? Il n’y a pas de bonne réponse, et rien n’est noté. Vous referez le même exercice à la fin de la séance.',
          'One minute before starting: where do you stand? There is no right answer, and nothing is graded. You will do the same exercise at the end of the session.',
        )}
      >
        {pick(lang, 'Auto-évaluation', 'Self-assessment')}
      </SectionTitle>
      <SelfAssessment lang={lang} phase="start" onDone={onDone} />
    </div>
  )
}

// ============================================================
// STEP self-end — auto-évaluation de fin, puis partage facultatif
// ============================================================

function SelfEndStep({ lang }: { lang: Lang }) {
  const done = useSelfAssessmentDone('end')
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        subtitle={pick(
          lang,
          'Le même exercice qu’au début : où en êtes-vous maintenant ? Une fois validé, vous verrez vos réponses du début et l’écart.',
          'The same exercise as at the start: where do you stand now? Once confirmed, you will see your answers from the start and the change.',
        )}
      >
        {pick(lang, 'Auto-évaluation de fin de séance', 'End-of-session self-assessment')}
      </SectionTitle>
      <SelfAssessment lang={lang} phase="end" />
      {done && <ExportPanel lang={lang} />}
    </div>
  )
}

// ============================================================
// STEP reco — révélation, PDF surligné
// ============================================================

// Rendu inline minimal : transforme `**mot**` en gras, le reste en texte brut.
function renderInlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

function RecoStep({ lang }: { lang: Lang }) {
  const [docId, setDocId] = useState(RECO_DOCS[0].id)
  const doc = RECO_DOCS.find((d) => d.id === docId)!
  // Incrémenté à chaque clic sur « Aller à la page … » : le viewer y voit une
  // nouvelle demande de saut, même si on est déjà sur la bonne page.
  const [jump, setJump] = useState(0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Onglets de document, communs aux deux colonnes (barre de tête pleine largeur). */}
      <div className="mb-2 flex shrink-0 justify-center gap-1">
        {RECO_DOCS.map((d) => (
          <button
            key={d.id}
            onClick={() => setDocId(d.id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              d.id === docId
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]',
            )}
          >
            <FileText className="size-3.5" />
            {tr(lang, d.label)}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Colonne gauche : PDF plein hauteur (barre de contrôles h-9 + cadre). */}
        <PdfViewer
          key={doc.id}
          file={doc.file}
          highlights={doc.highlights}
          initialPage={doc.initialPage}
          jumpToken={jump}
          fill
          initialZoom={0.8}
          className="min-h-0 min-w-0 flex-1"
        />

        {/* Colonne droite : mt-11 = hauteur de la barre de contrôles du PDF (h-9) + son
            mb-2, pour que le haut des blocs coïncide avec le haut du cadre PDF. */}
        <div className="mt-11 flex min-h-0 w-[26rem] max-w-[45%] shrink-0 flex-col gap-4 overflow-y-auto">
        <Callout variant="emerald" title={tr(lang, REFERENCE_ANSWER.title)}>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {REFERENCE_ANSWER.points.map((p, i) => (
              <li key={i}>{renderInlineBold(tr(lang, p))}</li>
            ))}
          </ul>
        </Callout>

        <Callout
          variant="amber"
          title={
            <button
              onClick={() => setJump((j) => j + 1)}
              title={pick(
                lang,
                `Aller à la page ${doc.initialPage}`,
                `Go to page ${doc.initialPage}`,
              )}
              className="cursor-pointer text-left underline decoration-amber-500/50 underline-offset-2 transition-colors hover:text-amber-700 dark:hover:text-amber-500"
            >
              {tr(lang, doc.readingsTitle)}
            </button>
          }
        >
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            {doc.readings.map((r, i) => (
              <li key={i}>{renderInlineBold(tr(lang, r.quote))}</li>
            ))}
          </ul>
          {doc.highlights.length > 0 && (
            <p className="mt-2 text-xs">
              {pick(
                lang,
                'Passages surlignés en jaune dans le document.',
                'Passages highlighted in yellow in the document.',
              )}
            </p>
          )}
        </Callout>
        </div>
      </div>
    </div>
  )
}

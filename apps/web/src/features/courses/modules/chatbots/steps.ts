import {
  BookOpen,
  Brain,
  ClipboardList,
  Coins,
  FileText,
  Flag,
  FlaskConical,
  Gauge,
  GraduationCap,
  Library,
  ListChecks,
  MousePointerClick,
  MessageSquare,
  Paperclip,
  Flame,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
import { pick, type Lang } from '@/lib/useLang'

// `exercise` numérote les étapes que l'étudiant doit réellement faire
// (de l'échauffement à la synthèse) : sans ce repère, rien ne distingue
// un exercice d'une page de lecture dans le menu déroulant.
//
// `debrief` marque les temps de cours qui suivent un exercice : on laisse
// faire, puis on reprend en classe entière ce qui vient d'être observé.
// Pas de débrief entre l'échauffement et les recommandations : la
// confrontation à la reco EST la correction de l'échauffement.
export const STEPS = [
  { id: 'intro', labelFr: 'Introduction', labelEn: 'Introduction', icon: BookOpen },
  // Auto-évaluation de début de séance : une page à part, après les objectifs,
  // pour qu'on la valide (ou la refuse) avant d'entrer dans le TD.
  { id: 'self-start', labelFr: 'Auto-évaluation', labelEn: 'Self-assessment', icon: Gauge },
  // La visite guidée de l'interface, sur l'écran même de l'échauffement.
  {
    id: 'tuto',
    labelFr: 'Prise en main',
    labelEn: 'Getting started',
    icon: MousePointerClick,
  },
  { id: 'warmup', labelFr: 'Échauffement', labelEn: 'Warm-up', icon: Flame, exercise: 1 },
  { id: 'reco', labelFr: 'Recommandations', labelEn: 'Guidelines', icon: FileText, exercise: 2 },
  {
    id: 'debrief-verify',
    labelFr: 'Hallucination',
    labelEn: 'Hallucination',
    icon: GraduationCap,
    debrief: true,
  },
  { id: 'prompt', labelFr: 'Prompt', labelEn: 'Prompt', icon: MessageSquare, exercise: 3 },
  {
    id: 'debrief-prompt',
    labelFr: 'Prompt',
    labelEn: 'Prompt',
    icon: GraduationCap,
    debrief: true,
  },
  {
    id: 'settings',
    labelFr: 'Hasard',
    labelEn: 'Randomness',
    icon: SlidersHorizontal,
    exercise: 4,
  },
  {
    id: 'debrief-random',
    labelFr: 'Une réponse est un tirage',
    labelEn: 'An answer is a draw',
    icon: GraduationCap,
    debrief: true,
  },
  { id: 'memory', labelFr: 'Mémoire', labelEn: 'Memory', icon: Brain, exercise: 5 },
  {
    id: 'debrief-memory',
    labelFr: 'Fenêtre de contexte',
    labelEn: 'Context window',
    icon: GraduationCap,
    debrief: true,
  },
  { id: 'documents', labelFr: 'Documents', labelEn: 'Documents', icon: Paperclip, exercise: 6 },
  { id: 'debrief-rag', labelFr: 'RAG', labelEn: 'RAG', icon: GraduationCap, debrief: true },
  { id: 'synthesis', labelFr: 'Synthèse', labelEn: 'Summary', icon: ListChecks, exercise: 7 },
  { id: 'wrapup', labelFr: 'Bilan', labelEn: 'Wrap-up', icon: Flag },
  // Auto-évaluation de fin, puis partage facultatif de la séance.
  { id: 'self-end', labelFr: 'Auto-évaluation', labelEn: 'Self-assessment', icon: Gauge },
  { id: 'sources', labelFr: 'Sources', labelEn: 'Sources', icon: Library, extra: true },
  // Le bilan de la séance, juste avant les onglets formateur : on y revient à
  // la fin pour voir ce que le TD a réellement coûté.
  { id: 'usage', labelFr: 'Consommation', labelEn: 'Usage', icon: Coins, extra: true },
  // Les trois derniers onglets ne s'adressent pas aux étudiants mais au
  // formateur : comment mener la séance, quel modèle choisir, comment le
  // brancher.
  {
    id: 'guide',
    labelFr: 'Conducteur',
    labelEn: 'Teacher guide',
    icon: ClipboardList,
    extra: true,
  },
  { id: 'benchmark', labelFr: 'Benchmark', labelEn: 'Benchmark', icon: FlaskConical, extra: true },
  { id: 'admin', labelFr: 'Réglages', labelEn: 'Settings', icon: Settings2, extra: true },
] as const

export type Step = (typeof STEPS)[number]
export type StepId = Step['id']

/** Libellé d'étape, préfixé « Ex N. » ou « Débrief · » selon sa nature. */
export function stepLabel(lang: Lang, s: Step) {
  const label = pick(lang, s.labelFr, s.labelEn)
  if ('exercise' in s) return `Ex ${s.exercise}. ${label}`
  if ('debrief' in s) return `${pick(lang, 'Débrief', 'Debrief')} · ${label}`
  return label
}

/**
 * Durées par défaut, en minutes, pour tenir la séance en 1 h 50 (deux auto-évaluations de 5 min comprises), avec 10 min de marge sur les 2 h. Pas de
 * débrief sous 5 min ; la synthèse, en groupes, en garde 15 pour la mise
 * en commun.
 *
 * Les étapes absentes (sources, consommation, onglets formateur) n'ont pas de
 * minuteur : on les consulte, on ne les déroule pas en séance.
 */
export const DEFAULT_TIMER_MINUTES: Partial<Record<StepId, number>> = {
  intro: 4,
  'self-start': 5,
  tuto: 3,
  warmup: 6,
  reco: 6,
  'debrief-verify': 5,
  prompt: 10,
  'debrief-prompt': 5,
  settings: 6,
  'debrief-random': 5,
  memory: 9,
  'debrief-memory': 5,
  documents: 11,
  'debrief-rag': 5,
  synthesis: 15,
  wrapup: 5,
  'self-end': 5,
}

/**
 * `extra` : pages de consultation, rangées sous « Plus » dans le menu pour
 * ne pas noyer le fil de la séance.
 */
export const MAIN_STEPS = STEPS.filter((s) => !('extra' in s))
export const EXTRA_STEPS = STEPS.filter((s) => 'extra' in s)

/** Les étapes qui portent un minuteur, dans l'ordre de la séance. */
export const TIMED_STEPS = STEPS.filter((s) => s.id in DEFAULT_TIMER_MINUTES)

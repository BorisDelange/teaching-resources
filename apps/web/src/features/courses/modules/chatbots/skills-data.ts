// ============================================================
// Les compétences du TD, et les niveaux qu'elles composent.
//
// PARTI PRIS CENTRAL — une compétence ne récompense JAMAIS un clic.
//
// Ce TD passe deux heures à enseigner la défiance : « un meilleur prompt ne
// donne pas une meilleure réponse », « une source citée peut être inventée ».
// Décerner un badge parce qu'on a joint un document enseignerait exactement
// l'inverse — que manipuler l'outil vaut approbation.
//
// Chaque compétence exige donc un CONSTAT : avoir utilisé le levier ET avoir
// vu ce qu'il change. La mémoire ne se débloque pas en cochant « complète »,
// mais en ayant posé une question de suivi SANS mémoire puis AVEC — c'est
// l'écart entre les deux qui est la leçon, pas la case cochée.
//
// Le libellé « ce que vous avez constaté » est écrit au passé et à la
// deuxième personne : il rappelle une observation faite, il ne promet rien.
// ============================================================

import {
  Brain,
  BookOpenCheck,
  FileSearch,
  Layers,
  MessageSquareText,
  Paperclip,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from 'lucide-react'
import type { Localized } from './data'

export interface Skill {
  id: string
  /** Étape où elle se gagne — sert à regrouper le panneau. */
  step: string
  label: Localized
  icon: LucideIcon
  /** Ce qu'il faut faire pour la débloquer, dit à l'avance. */
  requirement: Localized
  /** Ce que l'étudiant a constaté en la débloquant. Écrit au passé. */
  insight: Localized
}

/**
 * Dans l'ordre du TD. L'ordre compte : le panneau les affiche ainsi, et les
 * paliers de niveau découpent cette liste.
 */
export const SKILLS: Skill[] = [
  {
    id: 'blind-judgement',
    step: 'warmup',
    label: { fr: 'Le jugement à l’aveugle', en: 'Blind judgement' },
    icon: ShieldCheck,
    requirement: {
      fr: 'Juger trois réponses sans la recommandation.',
      en: 'Judge three answers without the guideline.',
    },
    insight: {
      fr: 'Une réponse plausible n’est pas forcément juste.',
      en: 'A plausible answer is not necessarily right.',
    },
  },
  {
    id: 'guidelines',
    step: 'reco',
    label: { fr: 'La source de vérité', en: 'The source of truth' },
    icon: BookOpenCheck,
    requirement: {
      fr: 'Ouvrir la recommandation officielle.',
      en: 'Open the official guideline.',
    },
    insight: {
      fr: 'C’est la source qui tranche, pas le modèle.',
      en: 'The source decides, not the model.',
    },
  },
  {
    id: 'context',
    step: 'prompt',
    label: { fr: 'Le contexte clinique', en: 'Clinical context' },
    icon: MessageSquareText,
    requirement: {
      fr: 'Poser la question brute, puis avec le contexte.',
      en: 'Ask the raw question, then with context.',
    },
    insight: {
      fr: 'Sans contexte, le modèle répond pour un patient moyen.',
      en: 'Without context, the model answers for an average patient.',
    },
  },
  {
    id: 'prompting',
    step: 'prompt',
    label: { fr: 'L’art du prompt', en: 'The art of prompting' },
    icon: Target,
    requirement: {
      fr: 'Parcourir les quatre paliers.',
      en: 'Work through all four levels.',
    },
    insight: {
      fr: 'Un prompt **oriente** le modèle, il ne lui **apprend rien**.',
      en: 'A prompt **steers** the model, it **teaches it nothing**.',
    },
  },
  {
    id: 'fake-source',
    step: 'prompt',
    label: { fr: 'La source inventée', en: 'The invented source' },
    icon: FileSearch,
    requirement: {
      fr: 'Exiger une source, puis vérifier qu’elle existe.',
      en: 'Demand a source, then check it exists.',
    },
    insight: {
      fr: 'Sans document, une référence citée peut être **inventée**.',
      en: 'Without a document, a cited reference may be **invented**.',
    },
  },
  {
    id: 'temperature',
    step: 'settings',
    label: { fr: 'Le hasard réglable', en: 'Adjustable randomness' },
    icon: SlidersHorizontal,
    requirement: {
      fr: 'Comparer deux températures.',
      en: 'Compare two temperatures.',
    },
    insight: {
      fr: 'Basse température : **reproductible**, pas plus **juste**.',
      en: 'Low temperature: **reproducible**, not more **accurate**.',
    },
  },
  {
    id: 'system-prompt',
    step: 'prompt',
    label: { fr: 'La consigne cachée', en: 'The hidden instruction' },
    icon: ScrollText,
    requirement: {
      fr: 'Modifier la consigne système et envoyer une question.',
      en: 'Edit the system instruction and send a question.',
    },
    insight: {
      fr: 'Une consigne cachée oriente chaque réponse.',
      en: 'A hidden instruction shapes every answer.',
    },
  },
  {
    id: 'memory',
    step: 'memory',
    label: { fr: 'La mémoire', en: 'Memory' },
    icon: Brain,
    requirement: {
      fr: 'Converser sans mémoire, puis avec.',
      en: 'Chat without memory, then with it.',
    },
    insight: {
      fr: 'La mémoire, c’est l’historique **renvoyé** à chaque message.',
      en: 'Memory is the history **re-sent** with every message.',
    },
  },
  {
    id: 'documents',
    step: 'documents',
    label: { fr: 'Le document joint', en: 'The attached document' },
    icon: Paperclip,
    requirement: {
      fr: 'Poser la question sans document, puis avec.',
      en: 'Ask without a document, then with one.',
    },
    insight: {
      fr: 'Le texte du document est **collé devant** votre question.',
      en: 'The document’s text is **pasted before** your question.',
    },
  },
  {
    id: 'robust-prompt',
    step: 'synthesis',
    label: { fr: 'Le prompt robuste', en: 'The robust prompt' },
    icon: Layers,
    requirement: {
      fr: 'Envoyer le même prompt à deux modèles.',
      en: 'Send the same prompt to two models.',
    },
    insight: {
      fr: 'Un bon prompt porte l’information, quel que soit le modèle.',
      en: 'A good prompt carries the information, whatever the model.',
    },
  },
]

// ---------- Les niveaux ----------

export interface Level {
  /** Numéro affiché (1 → 4). */
  n: number
  /** Nombre de compétences à atteindre pour y accéder. */
  at: number
  title: Localized
  /** Ce que ce palier dit de l'étudiant. Sobre : pas de flatterie. */
  blurb: Localized
}

/**
 * Quatre paliers sur onze compétences. Le premier s'atteint vite (l'élan
 * compte), les suivants demandent d'avoir traversé plusieurs étapes.
 *
 * Les titres décrivent un RAPPORT À L'OUTIL, pas une maîtrise technique :
 * on ne devient pas « expert en IA » en deux heures, et le prétendre serait
 * le contraire de ce que le TD enseigne.
 */
export const LEVELS: Level[] = [
  {
    n: 1,
    at: 1,
    title: { fr: 'Premier contact', en: 'First contact' },
    blurb: {
      fr: 'Vous avez interrogé un modèle et jugé sa réponse. C’est déjà plus que ce que font la plupart des utilisateurs.',
      en: 'You have queried a model and judged its answer. That is already more than most users do.',
    },
  },
  {
    n: 2,
    at: 4,
    title: { fr: 'Utilisateur averti', en: 'Informed user' },
    blurb: {
      fr: 'Vous savez qu’une réponse dépend de la question posée, du hasard, et d’une consigne que vous ne voyez pas.',
      en: 'You know an answer depends on the question asked, on chance, and on an instruction you never see.',
    },
  },
  {
    n: 3,
    at: 8,
    title: { fr: 'Lecteur critique', en: 'Critical reader' },
    blurb: {
      fr: 'Vous savez d’où vient une réponse : ce qui a été envoyé, ce qui a été retrouvé, ce qui a été inventé.',
      en: 'You know where an answer comes from: what was sent, what was retrieved, what was invented.',
    },
  },
  {
    n: 4,
    at: SKILLS.length,
    title: { fr: 'Esprit critique', en: 'Critical mind' },
    blurb: {
      fr: 'Vous avez tous les leviers en main — et vous savez ce qu’aucun ne corrige. Reste la règle qui survit à tout : aucune donnée patient dans un chatbot grand public.',
      en: 'You hold every lever — and you know what none of them fixes. One rule outlives the rest: no patient data in a consumer chatbot.',
    },
  },
]

/** Le niveau atteint avec `count` compétences. */
export function levelFor(count: number): Level | null {
  let found: Level | null = null
  for (const l of LEVELS) if (count >= l.at) found = l
  return found
}

/** Le palier suivant, ou null si tout est débloqué. */
export function nextLevel(count: number): Level | null {
  return LEVELS.find((l) => count < l.at) ?? null
}

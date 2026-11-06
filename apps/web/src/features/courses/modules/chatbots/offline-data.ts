// ============================================================
// Mode hors ligne — les questions proposées à l'étudiant.
//
// Hors ligne, on ne peut rejouer que ce qui a été capturé. Le champ de
// saisie est donc verrouillé et l'étudiant choisit parmi des bulles, au-
// dessus du champ. Chaque bulle porte l'identifiant d'une capture réelle
// (voir `offline-captures.json`).
//
// Les libellés sont COURTS : ce sont des pastilles, pas des phrases. Le
// texte complet part dans le champ de saisie, où l'étudiant le lit avant
// d'envoyer — le geste reste le sien.
//
// L'ordre compte à l'étape « La mémoire » : la séquence n'a de sens que
// jouée dans l'ordre, chaque question de suivi supposant les précédentes.
// ============================================================

import type { Lang } from '@/lib/useLang'
import type { Localized } from './data'

export interface OfflinePreset {
  /** Identifiant de la capture (dernier segment de la clé). */
  id: string
  /** Libellé de la pastille — court, sans ponctuation finale. */
  label: Localized
  /** Le texte déposé dans le champ de saisie. */
  text: Localized
  /** Pourquoi cette question, au survol. */
  hint?: Localized
}

// ---------- Échauffement ----------

export const OFFLINE_WARMUP: OfflinePreset[] = [
  {
    id: 'naive',
    label: { fr: 'Au plus court', en: 'Shortest' },
    text: {
      fr: 'Antibio pour une pyélonéphrite ?',
      en: 'Antibiotic for pyelonephritis?',
    },
    hint: {
      fr: 'La question telle qu’on la tape vraiment, sans contexte.',
      en: 'The question as one really types it, with no context.',
    },
  },
  {
    id: 'contextual',
    label: { fr: 'Avec le contexte', en: 'With context' },
    text: {
      fr: 'Femme de 68 ans, 62 kg, pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Précise la molécule, la posologie et la durée.',
      en: 'A 68-year-old woman, 62 kg, community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. Which empirical antibiotic therapy? Give the molecule, the dose and the duration.',
    },
    hint: {
      fr: 'Le cas complet, avec la fonction rénale.',
      en: 'The full case, including renal function.',
    },
  },
  {
    id: 'sourced',
    label: { fr: 'En exigeant la source', en: 'Demanding the source' },
    text: {
      fr: "Femme de 68 ans, 62 kg, pyélonéphrite aiguë communautaire sans signe de gravité, DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Molécule, posologie adaptée à la fonction rénale, durée. Cite pour chaque point la recommandation française sur laquelle tu t'appuies, avec l'année. Si tu n'es pas sûr, dis-le explicitement plutôt que d'inventer.",
      en: 'A 68-year-old woman, 62 kg, community-acquired acute pyelonephritis without signs of severity, estimated GFR 38 mL/min. Which empirical antibiotic therapy? Molecule, renally adjusted dose, duration. For each point cite the French guideline you rely on, with the year. If you are unsure, say so explicitly rather than inventing.',
    },
    hint: {
      fr: 'Exiger une référence — et regarder si elle existe.',
      en: 'Demand a reference — then check whether it exists.',
    },
  },
]

// ---------- L'étape « Le prompt » : les 4 paliers ----------
//
// Les identifiants suivent PROMPT_LEVELS (prompt-data.ts) : hors ligne,
// l'étudiant franchit les mêmes paliers, avec les mêmes textes.

export const OFFLINE_PROMPT_IDS = ['raw', 'context', 'role-source', 'humility']

// ---------- L'étape « La mémoire » : une séquence ordonnée ----------

/**
 * La conversation à dérouler, dans l'ordre.
 *
 * Chaque question après la première n'a de sens QUE si le modèle se
 * souvient : c'est exactement ce que l'étape met à l'épreuve. En mode
 * « aucune mémoire », « Et si elle était allergique ? » devient
 * incompréhensible — et la capture le montre, puisqu'elle a été obtenue
 * dans ces conditions.
 */
export const OFFLINE_MEMORY_SEQUENCE: OfflinePreset[] = [
  {
    id: 'case',
    label: { fr: '1. Le cas', en: '1. The case' },
    text: {
      fr: 'Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Quelle antibiothérapie ?',
      en: 'A 68-year-old woman, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. Which antibiotic therapy?',
    },
    hint: {
      fr: 'Le point de départ : tout le contexte clinique est ici.',
      en: 'The starting point: all the clinical context is here.',
    },
  },
  {
    id: 'allergy',
    label: { fr: '2. Et si allergique ?', en: '2. What if allergic?' },
    text: {
      fr: 'Et si elle était allergique aux bêta-lactamines ?',
      en: 'And if she were allergic to beta-lactams?',
    },
    hint: {
      fr: '« Elle » — sans mémoire, le modèle ne sait pas de qui on parle.',
      en: '“She” — without memory, the model has no idea who this is.',
    },
  },
  {
    id: 'duration',
    label: { fr: '3. Quelle durée ?', en: '3. What duration?' },
    text: {
      fr: 'Quelle durée finalement ?',
      en: 'What duration in the end?',
    },
    hint: {
      fr: '« Finalement » suppose tout ce qui précède.',
      en: '“In the end” presupposes everything before.',
    },
  },
  {
    id: 'renal',
    label: { fr: '4. Adapter au DFG ?', en: '4. Adjust for GFR?' },
    text: {
      fr: 'Faut-il adapter la dose à sa fonction rénale ?',
      en: 'Should the dose be adjusted for her renal function?',
    },
    hint: {
      fr: 'Le DFG à 38 a-t-il survécu jusqu’ici ?',
      en: 'Has the GFR of 38 survived this far?',
    },
  },
  {
    id: 'recap',
    label: { fr: '5. Récapitule', en: '5. Recap' },
    text: {
      fr: 'Résume-moi ce qu’on a décidé.',
      en: 'Summarise what we decided.',
    },
    hint: {
      fr: 'L’épreuve de vérité : que reste-t-il de la conversation ?',
      en: 'The moment of truth: what is left of the conversation?',
    },
  },
]

// ---------- L'étape « Documents » ----------

/**
 * Les questions posées aux documents joints.
 *
 * Elles sont choisies pour couvrir des DIFFICULTÉS différentes de la
 * recherche, pas seulement des sujets différents :
 *
 *   - `treatment` — le cas du TD. La fiche HAS a deux sections « traitement »
 *     (PNA simple : 7 jours ; à risque de complication : 10 jours) ; celle
 *     du bon terrain n'arrive pas toujours en tête. Le piège de l'étape.
 *   - `severity`  — la fiche ne liste PAS les signes de gravité : le modèle
 *     doit le dire, plutôt que de les réciter de mémoire.
 *   - `duration`  — courte, précise, bien indexée : le cas facile.
 *   - `pregnancy` — la grossesse n'y figure que comme facteur de risque,
 *     sans traitement : encore une information absente du document.
 *   - `imaging`   — une question à laquelle la réponse est « non, sauf… ».
 */
export const OFFLINE_DOC_QUESTIONS: OfflinePreset[] = [
  {
    id: 'treatment',
    label: { fr: 'Le traitement du cas', en: 'Treatment for the case' },
    text: {
      fr: 'Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Molécule, posologie, durée. Cite tes sources précisément : le document, la page et le passage mot pour mot.',
      en: 'A 68-year-old woman, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. Which empirical antibiotic therapy? Molecule, dose, duration. Cite your sources precisely: the document, the page and the passage word for word.',
    },
    hint: {
      fr: 'Le cas du TD. Le passage cité existe-t-il, à la page indiquée ?',
      en: 'The session’s case. Does the quoted passage exist, on the page given?',
    },
  },
  {
    id: 'severity',
    label: { fr: 'Critères de gravité', en: 'Severity criteria' },
    text: {
      fr: 'Quels sont les critères de gravité d’une pyélonéphrite aiguë ?',
      en: 'What are the severity criteria for acute pyelonephritis?',
    },
    hint: {
      fr: 'La fiche ne les donne pas. Le modèle le dit-il, ou les récite-t-il de mémoire ?',
      en: 'The memo does not list them. Does the model say so, or recite them from memory?',
    },
  },
  {
    id: 'duration',
    label: { fr: 'Durée du traitement', en: 'Treatment duration' },
    text: {
      fr: 'Quelle est la durée de traitement recommandée pour une pyélonéphrite aiguë simple ?',
      en: 'What is the recommended treatment duration for uncomplicated acute pyelonephritis?',
    },
    hint: {
      fr: 'Question courte et précise : la fiche y répond en une ligne.',
      en: 'Short and precise: the memo answers it in one line.',
    },
  },
  {
    id: 'pregnancy',
    label: { fr: 'Chez la femme enceinte', en: 'In pregnancy' },
    text: {
      fr: 'Quelle antibiothérapie pour une pyélonéphrite aiguë chez la femme enceinte ?',
      en: 'Which antibiotic therapy for acute pyelonephritis in pregnancy?',
    },
    hint: {
      fr: 'La fiche cite la grossesse comme facteur de risque, sans traitement. Que fait le modèle ?',
      en: 'The memo lists pregnancy as a risk factor, with no treatment. What does the model do?',
    },
  },
  {
    id: 'imaging',
    label: { fr: 'Faut-il une imagerie ?', en: 'Is imaging needed?' },
    text: {
      fr: 'Faut-il faire une imagerie devant une pyélonéphrite aiguë simple ?',
      en: 'Is imaging required for uncomplicated acute pyelonephritis?',
    },
    hint: {
      fr: 'La bonne réponse est « non », sauf douleur intense ou évolution défavorable.',
      en: 'The right answer is “no”, unless severe pain or poor progress.',
    },
  },
]

// ---------- L'étape « Le hasard » ----------

/** Le prompt unique rejoué plusieurs fois, pour montrer la variabilité. */
export const OFFLINE_CHANCE_PROMPT: Localized = {
  fr: `Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois.

Quelle antibiothérapie probabiliste ? Molécule, posologie, durée.`,
  en: `A 68-year-old woman, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy, no fluoroquinolone in the past 6 months.

Which empirical antibiotic therapy? Molecule, dose, duration.`,
}

/** Nombre de tirages capturés par modèle (voir le script de capture). */
export const OFFLINE_CHANCE_HOT = 5
export const OFFLINE_CHANCE_COLD = 2

// ---------- Textes du bandeau ----------

export const OFFLINE_BANNER = {
  title: { fr: 'Mode hors ligne', en: 'Offline mode' },
  body: {
    fr: 'Aucun modèle n’est interrogé : les réponses affichées ont été **réellement produites** par ces modèles et enregistrées à l’avance. Les temps, les tokens et les erreurs sont ceux des vrais appels. Vous choisissez parmi les questions préparées ci-dessous.',
    en: 'No model is being queried: the answers shown were **genuinely produced** by these models and recorded in advance. The timings, tokens and mistakes are those of real calls. You pick from the prepared questions below.',
  },
  locked: {
    fr: 'Champ verrouillé hors ligne — choisissez une question préparée.',
    en: 'Field locked offline — pick a prepared question.',
  },
  missing: {
    fr: 'Aucune réponse enregistrée pour cette question. Choisissez une des questions proposées.',
    en: 'No recorded answer for this question. Pick one of the suggested questions.',
  },
  picker: {
    fr: 'Questions préparées',
    en: 'Prepared questions',
  },
  /**
   * Étape « Mémoire » : ce n'est pas un choix parmi des questions, c'est une
   * conversation enregistrée qu'on rejoue tour par tour.
   */
  sequence: {
    fr: 'Séquence de questions',
    en: 'Question sequence',
  },
  sequenceLocked: {
    fr: 'La séquence se rejoue dans l’ordre : cette réponse a été enregistrée après les tours précédents, elle n’aurait aucun sens ici.',
    en: 'The sequence replays in order: this answer was recorded after the previous turns, and would make no sense here.',
  },
  sequencePlayed: {
    fr: 'Tour déjà joué. La conversation avance, elle ne se rejoue pas.',
    en: 'Turn already played. The conversation moves forward, it does not replay.',
  },
} satisfies Record<string, Localized>

/** Texte d'invite du champ de saisie verrouillé. */
export function offlinePlaceholder(lang: Lang): string {
  return lang === 'en' ? OFFLINE_BANNER.locked.en : OFFLINE_BANNER.locked.fr
}

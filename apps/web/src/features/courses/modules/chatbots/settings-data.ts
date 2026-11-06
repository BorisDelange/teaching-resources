// ============================================================
// Étape « Réglages » — données.
//
// Le point à faire passer : à question identique, modèle identique, la
// réponse n'est PAS identique. Un LLM ne « connaît » pas une réponse
// qu'il restituerait — il en tire une au sort, mot après mot, dans une
// distribution de probabilités. Les réglages d'échantillonnage décident
// de la largeur de ce tirage.
//
// La démonstration est empirique et tient en deux temps :
//   1. température 0,7 (le défaut du TD, proche de ChatGPT) → « Reposer
//      3× » la même question donne trois réponses différentes ;
//   2. température 0 → les trois réponses se superposent.
//
// L'enjeu clinique n'est pas la variabilité en soi, mais ce qu'elle
// implique : une réponse obtenue une fois n'est pas reproductible, donc
// pas opposable. Et abaisser la température ne rend pas le modèle juste,
// seulement constant — il peut se tromper de façon parfaitement stable.
// ============================================================

import type { Localized } from './data'

/** Combien de fois la même question est reposée dans la démonstration. */
export const REPEAT_COUNT = 3

/**
 * Réglages proposés en un clic. Les valeurs extrêmes ne sont pas là pour
 * être « utilisées » mais pour rendre le mécanisme visible : à 0 le tirage
 * disparaît, à 1,5 il déraille.
 */
export interface SettingsPreset {
  id: string
  label: Localized
  temperature: number
  /** Ce qu'il faut observer en repassant par « Reposer 3× ». */
  watch: Localized
  tone: 'blue' | 'amber' | 'red' | 'emerald'
}

export const SETTINGS_PRESETS: SettingsPreset[] = [
  {
    id: 'zero',
    label: { fr: 'Température 0', en: 'Temperature 0' },
    temperature: 0,
    tone: 'emerald',
    watch: {
      fr: 'Le modèle prend systématiquement le mot le plus probable. Les réponses se rapprochent beaucoup, parfois au mot près. Mais **ne comptez pas sur une identité parfaite** : sur un serveur, deux mots presque à égalité peuvent encore basculer d’un envoi à l’autre. Et surtout, plus constant **ne veut pas dire plus juste**.',
      en: 'The model always takes the most likely word. The answers get very close, sometimes word for word. But **do not count on perfect identity**: on a server, two nearly-tied words can still flip between calls. And above all, more constant **does not mean more correct**.',
    },
  },
  {
    id: 'default',
    label: { fr: 'Température 0,7 (défaut du TD)', en: 'Temperature 0.7 (session default)' },
    temperature: 0.7,
    tone: 'blue',
    watch: {
      fr: 'Le réglage courant des assistants grand public. Les trois réponses **diffèrent** : formulation, ordre, parfois la molécule ou la posologie. C’est ce que vous obtenez sans le savoir en interrogeant ChatGPT.',
      en: 'The usual setting of consumer assistants. The three answers **differ**: wording, order, sometimes the drug or the dose. This is what you get, unknowingly, when querying ChatGPT.',
    },
  },
  {
    id: 'high',
    label: { fr: 'Température 1,5', en: 'Temperature 1.5' },
    temperature: 1.5,
    tone: 'red',
    watch: {
      fr: 'Le tirage s’élargit trop. Le texte perd sa cohérence, invente des molécules, part hors sujet. Utile pour comprendre que la « créativité » d’un modèle et son **délire** sont le même bouton.',
      en: 'The draw widens too much. The text loses coherence, invents drugs, drifts off topic. Useful to grasp that a model’s “creativity” and its **nonsense** are the same knob.',
    },
  },
]

/**
 * La question reposée. Elle porte TOUT le contexte clinique : cette étape
 * n'a pas de mémoire (chaque envoi est un tirage indépendant sur la même
 * entrée), donc rien n'est repris d'un échange à l'autre. Sans le cas dans
 * le prompt, le modèle répondrait sur une patiente qu'il ne connaît pas, et
 * la variabilité observée viendrait du flou de la question plutôt que de
 * l'échantillonnage — ce qui ruinerait la démonstration.
 */
export const SETTINGS_QUESTION: Localized = {
  fr: 'Mme D., 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie.\n\nQuelle antibiothérapie probabiliste pour Mme D. ? Molécule, posologie, durée.',
  en: 'Mrs D., 68, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy.\n\nWhich empirical antibiotic therapy for Mrs D.? Drug, dose, duration.',
}

export const SETTINGS_BRIEF = {
  title: { fr: 'Le hasard est un réglage', en: 'Randomness is a setting' },
  intro: {
    fr: 'Un modèle ne restitue pas une réponse : il la tire au sort, mot après mot. Trois réglages décident de la largeur de ce tirage.',
    en: 'A model does not retrieve an answer: it draws it at random, word after word. Three settings decide how wide that draw is.',
  },
  patient: {
    fr: 'Mme D., 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie.',
    en: 'Mrs D., 68, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy.',
  },
  question: {
    fr: 'Posez trois fois la même question, puis changez la température et recommencez.',
    en: 'Ask the same question three times, then change the temperature and start again.',
  },
} satisfies Record<string, Localized>

// Une consigne par étape : la première ligne est le titre (en gras),
// la suite l'explique.
export const SETTINGS_RULES: { title: Localized; rules: Localized[] } = {
  title: { fr: 'Consignes', en: 'Instructions' },
  rules: [
    {
      fr: 'Reposer trois fois à 0,7\nLaissez la température à 0,7 et cliquez sur **Reposer 3×**. La question part trois fois, à l’identique.',
      en: 'Ask three times at 0.7\nLeave the temperature at 0.7 and click **Ask 3×**. The same question is sent three times.',
    },
    {
      fr: 'Comparer les trois réponses\nRepérez ce qui change : la formulation, mais aussi parfois **la molécule ou la posologie**.',
      en: 'Compare the three answers\nSpot what changes: the wording, but sometimes also **the drug or the dose**.',
    },
    {
      fr: 'Recommencer à 0\nLes réponses se **resserrent** fortement. Si elles ne sont pas parfaitement identiques, lisez l’encadré : c’est en soi un résultat intéressant.',
      en: 'Start again at 0\nThe answers **converge** sharply. If they are not perfectly identical, read the note: that is an interesting result in itself.',
    },
    {
      fr: 'Penser à l’usage clinique\nUne réponse obtenue une fois est-elle **reproductible** ? Est-elle **opposable** ?',
      en: 'Think of clinical use\nIs an answer obtained once **reproducible**? Can it be **relied upon**?',
    },
  ],
}

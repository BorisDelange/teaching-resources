// ============================================================
// Étape « Le prompt » — données.
//
// Même cas clinique que l'échauffement, mais cette fois l'étudiant
// connaît la recommandation : il peut juger. Il franchit quatre paliers
// qui ajoutent chacun UN ingrédient, et observe ce que ça change.
//
// Inspiré de Liu J, Liu F, Wang C, Liu S, « Prompt Engineering in
// Clinical Practice: Tutorial for Clinicians », J Med Internet Res
// 2025;27:e72644. De l'article viennent la question directe (zero-shot),
// les principes « Explicitness and Specificity » et « Contextual
// Relevance » (palier 2), « Evidence-Based Practices » (exigence de
// source, palier 3) et le chain-of-thought (palier 4). Écartées :
// one-shot, few-shot, self-consistency, generated knowledge,
// meta-prompting.
//
// Deux leviers sont ajoutés par le TD, absents de l'article : le rôle
// d'expert (palier 3) et le droit de dire « je ne sais pas » (palier 4).
// ============================================================

import type { Localized } from './data'

export interface PromptLevel {
  id: string
  /** Numéro affiché (1 → 4). */
  step: number
  label: Localized
  /** Ce que ce palier ajoute par rapport au précédent. */
  adds: Localized
  /** Nom de la technique, tel qu'on le retrouve dans la littérature. */
  technique: Localized
  /** Le prompt proposé — modifiable avant envoi. */
  text: Localized
  /** Ce qu'il faut regarder dans la réponse. Absent au palier 1 : le
      débrief s'en charge. */
  watch?: Localized
}

export const PROMPT_LEVELS: PromptLevel[] = [
  {
    id: 'raw',
    step: 1,
    label: { fr: 'Au plus court', en: 'Shortest' },
    adds: { fr: 'Rien — la question brute.', en: 'Nothing — the raw question.' },
    technique: { fr: 'Question directe (zero-shot)', en: 'Direct question (zero-shot)' },
    text: {
      fr: 'Antibio pour une pyélonéphrite ?',
      en: 'Antibiotic for pyelonephritis?',
    },
  },
  {
    id: 'context',
    step: 2,
    label: { fr: 'Avec le contexte', en: 'With context' },
    adds: {
      fr: 'Âge, poids, forme clinique, et surtout le DFG à 38.',
      en: 'Age, weight, clinical form, and above all the GFR of 38.',
    },
    technique: { fr: 'Contexte clinique explicite', en: 'Explicit clinical context' },
    text: {
      fr: 'Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois. Quelle antibiothérapie probabiliste ? Précise la molécule, la posologie et la durée.',
      en: 'A 68-year-old woman, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy, no fluoroquinolone in the past 6 months. Which empirical antibiotic therapy? Give the molecule, the dose and the duration.',
    },
    watch: {
      fr: 'Le **DFG à 38** est-il vraiment pris en compte dans la posologie, ou seulement recopié ?',
      en: 'Is the **GFR of 38** genuinely reflected in the dose, or merely repeated back?',
    },
  },
  {
    id: 'role-source',
    step: 3,
    label: { fr: 'Un rôle et des sources', en: 'A role and sources' },
    adds: {
      fr: 'Un rôle d’expert, et l’obligation de citer la recommandation.',
      en: 'An expert role, and a duty to cite the guideline.',
    },
    technique: {
      fr: 'Attribution de rôle + exigence de preuve',
      en: 'Role assignment + evidence requirement',
    },
    text: {
      fr: `Tu es un médecin infectiologue, à jour des recommandations françaises (HAS).

Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois.

Quelle antibiothérapie probabiliste ? Donne la molécule, la posologie adaptée à la fonction rénale, et la durée.

Pour chaque point, cite la recommandation sur laquelle tu t’appuies, avec son année.`,
      en: `You are an infectious-disease physician, up to date with the French guidelines (HAS).

A 68-year-old woman, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy, no fluoroquinolone in the past 6 months.

Which empirical antibiotic therapy? Give the molecule, the renally adjusted dose, and the duration.

For each point, cite the guideline you rely on, with its year.`,
    },
    watch: {
      fr: 'Des sources apparaissent. Le modèle ne consulte **aucun document** : la référence citée existe-t-elle vraiment ?',
      en: 'Sources appear. The model consults **no document**: does the cited reference actually exist?',
    },
  },
  {
    id: 'humility',
    step: 4,
    label: { fr: 'Le droit de ne pas savoir', en: 'The right not to know' },
    adds: {
      fr: 'L’autorisation explicite de dire « je ne sais pas », et de raisonner étape par étape.',
      en: 'Explicit permission to say “I don’t know”, and to reason step by step.',
    },
    technique: {
      fr: 'Aveu d’incertitude + raisonnement explicite',
      en: 'Uncertainty disclosure + explicit reasoning',
    },
    text: {
      fr: `Tu es un médecin infectiologue, à jour des recommandations françaises (HAS).

Femme de 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois.

Quelle antibiothérapie probabiliste ? Raisonne étape par étape : d’abord la molécule, puis l’adaptation à la fonction rénale, puis la durée.

Pour chaque point, cite la recommandation sur laquelle tu t’appuies, avec son année.

Si tu n’es pas sûr d’un point, dis-le explicitement au lieu de deviner. Signale aussi toute information manquante qui changerait ta réponse.`,
      en: `You are an infectious-disease physician, up to date with the French guidelines (HAS).

A 68-year-old woman, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy, no fluoroquinolone in the past 6 months.

Which empirical antibiotic therapy? Reason step by step: first the molecule, then the renal adjustment, then the duration.

For each point, cite the guideline you rely on, with its year.

If you are unsure about a point, say so explicitly rather than guessing. Also flag any missing information that would change your answer.`,
    },
    watch: {
      fr: 'Le modèle **nuance-t-il** enfin, ou affirme-t-il avec le même aplomb ? Relisez aussi chaque **nom de molécule** : il peut en fabriquer un.',
      en: 'Does the model finally **qualify** its answer, or assert with the same confidence? Also reread every **drug name**: it may fabricate one.',
    },
  },
]

// ---------- Le brief de l'étape ----------

export const PROMPT_BRIEF = {
  title: { fr: 'Reformuler pour mieux demander', en: 'Rephrasing to ask better' },
  intro: {
    fr: 'Même patiente, même modèle. Cette fois, vous connaissez la recommandation : vous pouvez juger. Ce qui change, c’est uniquement la façon de poser la question.',
    en: 'Same patient, same model. This time you know the guideline: you can judge. The only thing that changes is how you ask.',
  },
  patient: {
    fr: 'Mme D., 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois.',
    en: 'Mrs D., 68, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy, no fluoroquinolone in the past 6 months.',
  },
  question: {
    fr: 'Franchissez les quatre paliers dans l’ordre. Après chaque envoi, comparez avec le palier précédent.',
    en: 'Work through the four levels in order. After each send, compare with the previous level.',
  },
} satisfies Record<string, Localized>

// Une consigne par étape : la première ligne est le titre (en gras),
// la suite l'explique.
export const PROMPT_RULES: { title: Localized; rules: Localized[] } = {
  title: { fr: 'Consignes', en: 'Instructions' },
  rules: [
    {
      fr: 'Franchir les quatre paliers, dans l’ordre\nChacun ajoute un ingrédient au précédent.',
      en: 'Climb the four levels, in order\nEach adds one ingredient to the previous one.',
    },
    {
      fr: 'Retoucher si vous voulez\nLes prompts sont pré-écrits, mais *modifiables* : changez-les avant d’envoyer pour tester une idée.',
      en: 'Tweak if you like\nThe prompts are pre-written but *editable*: change them before sending to test an idea.',
    },
    {
      fr: 'Juger avec la recommandation\nElle est accessible à gauche : vous n’êtes plus à l’aveugle.',
      en: 'Judge with the guideline\nIt is available on the left: you are no longer in the dark.',
    },
    {
      fr: 'Modifier la consigne système\nLa *consigne système* (en anglais, *system prompt*) est un texte caché, envoyé au modèle avant chacune de vos questions. Elle devient **modifiable** ici : essayez d’enlever « Maximum 120 mots », ou de la vider entièrement.',
      en: 'Edit the system prompt\nThe *system prompt* is a hidden instruction sent to the model before each of your questions. It becomes **editable** here: try removing “Maximum 120 words”, or emptying it entirely.',
    },
  ],
}

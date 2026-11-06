// ============================================================
// Données de l'étape « Synthèse ».
//
// C'est l'épreuve finale du TD, et la seule où RIEN n'est imposé. Elle se
// fait en groupes de 6 à 8 : chaque binôme a tout appris de son côté, la
// mise en commun tient lieu de discussion.
//
// l'étudiant dispose de tous les leviers vus séparément — rédaction du
// prompt, consigne système, choix du modèle, température, pièce jointe —
// et doit les combiner lui-même.
//
// Le critère de réussite n'est pas « obtenir une bonne réponse » : à
// température basse et avec la recommandation jointe, un seul modèle
// finit toujours par tomber juste. C'est d'obtenir la MÊME réponse juste
// sur les TROIS modèles. Un prompt qui ne marche que sur le plus gros
// n'est pas un bon prompt : c'est un coup de chance qui a tenu.
// ============================================================

import type { Localized } from './data'

// ---------- Le brief ----------

export const SYNTHESIS_BRIEF = {
  title: { fr: 'L’épreuve finale', en: 'The final challenge' },
  intro: {
    fr: 'Regroupez-vous à trois ou quatre binômes. Chacun a manipulé les leviers de son côté : mettez en commun ce qui a marché, et ce qui vous a piégés. Objectif : écrire ensemble UN prompt qui donne la bonne réponse sur les trois modèles — pas seulement sur le plus gros.',
    en: 'Team up in groups of three or four pairs. Each pair handled the levers on its own: pool what worked, and what tripped you up. Goal: write ONE prompt together that gives the right answer on all three models — not just on the biggest one.',
  },
  patient: {
    fr: 'Mme D., 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois.',
    en: 'Mrs D., 68, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy, no fluoroquinolone in the past 6 months.',
  },
  question: {
    fr: 'Quelle antibiothérapie probabiliste : molécule, posologie adaptée au DFG, durée ?',
    en: 'Which empirical antibiotic therapy: molecule, dose adjusted to GFR, duration?',
  },
} satisfies Record<string, Localized>

// ---------- Les consignes ----------

// Une consigne par étape : la première ligne est le titre (en gras),
// la suite l'explique.
export const SYNTHESIS_RULES: { title: Localized; rules: Localized[] } = {
  title: { fr: 'Consignes', en: 'Instructions' },
  rules: [
    {
      fr: 'Mettre en commun\nEn groupe de 6 à 8, chaque binôme raconte en une minute sa meilleure réponse, sa pire, et ce qui a fait la différence. Prenez le temps : c’est le cœur de l’exercice.',
      en: 'Pool your findings\nIn groups of 6 to 8, each pair spends a minute on its best answer, its worst, and what made the difference. Take your time: this is the heart of the exercise.',
    },
    {
      fr: 'Composer le prompt, ensemble\nAvec tout ce que vous avez appris : *contexte clinique complet*, *rôle* attribué au modèle, *exigence de source*, *droit de dire « je ne sais pas »*.',
      en: 'Write the prompt\nWith everything you have learned: *full clinical context*, a *role* for the model, a *source requirement*, the *right to say “I don’t know”*.',
    },
    {
      fr: 'Régler le modèle\nLa *température* : basse pour une réponse reproductible, plus haute pour voir le modèle hésiter. Vous pouvez aussi modifier la *consigne système*.',
      en: 'Tune the model\nThe *temperature*: low for a reproducible answer, higher to see the model waver. You can also edit the *system prompt*.',
    },
    {
      fr: 'Joindre les documents, si besoin\nLa *fiche HAS* et la *table OMEDIT*, si vous jugez que le modèle ne peut pas répondre sans. Rappelez-vous ce qu’elles **coûtent**, et ce qu’elles rendent **vérifiable**.',
      en: 'Attach the documents, if needed\nThe *HAS memo* and the *OMEDIT table*, if you judge the model cannot answer without them. Remember what they **cost**, and what they make **checkable**.',
    },
    {
      fr: 'Rejouer sur les trois modèles\nChaque binôme lance le **même prompt**, sans rien changer d’autre. La colonne de droite tient le tableau de bord ; comparez-les entre binômes.',
      en: 'Replay on all three models\nEach pair runs the **same prompt**, changing nothing else. The right-hand column keeps the scorecard; compare them across pairs.',
    },
    {
      fr: 'Cocher ce qui est juste\nPour chaque réponse : la *molécule*, la *posologie adaptée au DFG*, la *durée* et la *source*. Comparez à la recommandation, désormais accessible.',
      en: 'Tick what is right\nFor each answer: the *molecule*, the *GFR-adjusted dose*, the *duration* and the *source*. Compare with the guideline, now available.',
    },
  ],
}

// ---------- La grille de vérification ----------

/**
 * Les trois points sur lesquels la réponse se juge. Volontairement peu
 * nombreux, et tous vérifiables dans la recommandation : c'est la même
 * grille pour les trois modèles, sinon la comparaison ne vaut rien.
 */
export interface CheckItem {
  id: string
  label: Localized
  help: Localized
}

export const SYNTHESIS_CHECKS: CheckItem[] = [
  {
    id: 'molecule',
    label: { fr: 'La molécule est correcte', en: 'The molecule is correct' },
    help: {
      fr: 'En 1ʳᵉ intention, une fluoroquinolone per os (ciprofloxacine ou lévofloxacine) ; la ceftriaxone seulement en 2ᵉ intention. Une molécule inventée, ou une nitrofurantoïne (réservée aux cystites), invalide la réponse.',
      en: 'First line, an oral fluoroquinolone (ciprofloxacin or levofloxacin); ceftriaxone only as second line. An invented molecule, or nitrofurantoin (reserved for cystitis), invalidates the answer.',
    },
  },
  {
    id: 'renal',
    label: { fr: 'La posologie tient compte du DFG à 38', en: 'The dose accounts for the GFR of 38' },
    help: {
      fr: 'Le point qui fait trébucher la plupart des modèles : ils recopient le DFG sans en tirer de conséquence. Une posologie standard, non discutée, ne compte pas comme adaptée.',
      en: 'The point where most models stumble: they repeat the GFR back without drawing any conclusion from it. A standard dose, left undiscussed, does not count as adjusted.',
    },
  },
  {
    id: 'duration',
    label: { fr: 'La durée est correcte', en: 'The duration is correct' },
    help: {
      fr: 'Une durée absente, ou donnée sous forme de fourchette très large, ne compte pas : en pratique il faut prescrire un nombre de jours.',
      en: 'A missing duration, or one given as a very wide range, does not count: in practice you must prescribe a number of days.',
    },
  },
  {
    id: 'source',
    label: { fr: 'La source citée existe vraiment', en: 'The cited source actually exists' },
    help: {
      fr: 'Vérifiez dans la recommandation. Une référence d’allure officielle qui ne renvoie à aucun document réel est le piège le plus dangereux du TD : elle rassure.',
      en: 'Check against the guideline. An official-looking reference pointing to no real document is the most dangerous trap of this session: it reassures.',
    },
  },
]

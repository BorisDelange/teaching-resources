// ============================================================
// TD Chatbots médicaux — données du TD (cas, modèles, prompts,
// réponses placeholder, réponse de référence, chunks RAG).
//
// Les réponses des modèles sont pour l'instant des PLACEHOLDERS
// représentatifs, rejoués en "mode démo" quand l'API n'est pas
// joignable. Ils seront remplacés par de vraies captures via le
// backend (apps/api) une fois l'URL Ollama de la fac disponible.
// ============================================================

import type { Lang } from '@/lib/useLang'

export interface Localized {
  fr: string
  en: string
}

export function tr(lang: Lang, l: Localized): string {
  return lang === 'en' ? l.en : l.fr
}

/** Les tailles sont saisies en français (« 8 Md », « 3,8 milliards », « non publiée ») ; traduites à l'affichage seulement. */
export function paramsLabel(lang: Lang, params: string): string {
  if (lang !== 'en') return params
  return params
    .replace(/non publiée?/i, 'undisclosed')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s*milliards?\b/i, ' billion')
    .replace(/\s*Md\b/, 'B')
}

// ---------- Le cas clinique (fil rouge) ----------

export const CASE = {
  patient: {
    fr: 'Mme D., 68 ans, 62 kg. DFG estimé à 38 mL/min (insuffisance rénale modérée). Se présente pour une pyélonéphrite aiguë communautaire sans signe de gravité. Pas d’allergie connue, pas de fluoroquinolone dans les 6 derniers mois.',
    en: 'Mrs D., 68 years old, 62 kg. Estimated GFR 38 mL/min (moderate renal impairment). Presents with community-acquired acute pyelonephritis without signs of severity. No known allergy, no fluoroquinolone in the past 6 months.',
  },
  question: {
    fr: 'Quelle antibiothérapie probabiliste, et à quelle posologie ?',
    en: 'Which empirical antibiotic therapy, and at what dose?',
  },
} satisfies Record<string, Localized>

// ---------- Les 4 modèles jugés à l'aveugle (matrice 2×2) ----------

export type ModelSize = 'small' | 'large'
export type ModelKind = 'generic' | 'medical'

export interface TdModel {
  /** Identifiant stable (clé de vote, de réponse…). */
  id: string
  /** Étiquette masquée montrée pendant le vote à l'aveugle. */
  blindLabel: string
  /** Slug du modèle envoyé au backend (proxy OpenRouter). */
  ollamaTag: string
  /** Nom lisible révélé. */
  displayName: string
  size: ModelSize
  kind: ModelKind
  /** Paramètres indicatifs, pour la révélation. */
  params: string
  /** Score MedQA (%) indicatif, pour l'encart benchmarks. */
  medqa: number | null
  note: Localized
}

export const MODELS: TdModel[] = [
  {
    id: 'small-generic',
    blindLabel: 'A',
    ollamaTag: 'qwen/qwen3-8b',
    displayName: 'Qwen3 8B',
    size: 'small',
    kind: 'generic',
    params: '8 Md',
    medqa: null,
    note: {
      fr: 'Petit modèle généraliste récent, non spécialisé en médecine.',
      en: 'Recent small general-purpose model, not medically specialised.',
    },
  },
  {
    id: 'small-medical',
    blindLabel: 'B',
    ollamaTag: 'google/gemma-3-4b-it',
    displayName: 'Gemma 3 4B',
    size: 'small',
    kind: 'medical',
    params: '4 Md',
    medqa: 64,
    note: {
      fr: 'Petit modèle Google, même famille que MedGemma (le modèle médical dérivé de Gemma), mais ici la version généraliste, non affinée sur du texte médical.',
      en: 'Small Google model, same family as MedGemma (the medical model derived from Gemma), but here the general-purpose version, not fine-tuned on medical text.',
    },
  },
  {
    id: 'large-generic',
    blindLabel: 'C',
    ollamaTag: 'meta-llama/llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B',
    size: 'large',
    kind: 'generic',
    params: '70 Md',
    medqa: null,
    note: {
      fr: 'Gros modèle généraliste, parmi les meilleurs modèles ouverts.',
      en: 'Large general-purpose model, among the best open models.',
    },
  },
  {
    id: 'large-medical',
    blindLabel: 'D',
    ollamaTag: 'google/gemma-3-27b-it',
    displayName: 'Gemma 3 27B',
    size: 'large',
    kind: 'medical',
    params: '27 Md',
    medqa: 88,
    note: {
      fr: 'Gros modèle Google, même famille que MedGemma 27B (le modèle médical dérivé de Gemma), mais ici la version généraliste, non affinée sur du texte médical.',
      en: 'Large Google model, same family as MedGemma 27B (the medical model derived from Gemma), but here the general-purpose version, not fine-tuned on medical text.',
    },
  },
]

// ---------- Les 3 prompts pré-écrits (+ champ libre) ----------

export type PromptKind = 'naive' | 'clinical' | 'structured'

export interface TdPrompt {
  kind: PromptKind
  label: Localized
  text: Localized
}

export const PROMPTS: TdPrompt[] = [
  {
    kind: 'naive',
    label: { fr: 'Prompt naïf', en: 'Naive prompt' },
    text: {
      fr: 'antibio pyélo ?',
      en: 'antibiotic pyelo?',
    },
  },
  {
    kind: 'clinical',
    label: { fr: 'Prompt clinique', en: 'Clinical prompt' },
    text: {
      fr: 'Quelle antibiothérapie proposer pour une pyélonéphrite aiguë chez une femme de 68 ans ? Elle a une fonction rénale un peu diminuée. Donne la molécule, la dose et la durée.',
      en: 'Which antibiotic therapy for acute pyelonephritis in a 68-year-old woman? She has somewhat reduced renal function. Give the molecule, the dose and the duration.',
    },
  },
  {
    kind: 'structured',
    label: { fr: 'Prompt structuré (expert)', en: 'Structured prompt (expert)' },
    text: {
      fr: `Rôle — Tu es un médecin infectiologue expert, à jour des recommandations françaises (HAS) sur les infections urinaires.

Contexte patient
- Femme, 68 ans, 62 kg.
- Pyélonéphrite aiguë communautaire, sans signe de gravité (pas de sepsis, pas d'obstacle, hémodynamique stable).
- DFG estimé 38 mL/min (insuffisance rénale modérée).
- Aucune allergie connue. Pas de fluoroquinolone dans les 6 derniers mois.
- Prise en charge ambulatoire envisagée.

Ta tâche — Propose une antibiothérapie probabiliste de 1re intention, puis une alternative.

Contraintes
1. Distingue le traitement probabiliste initial du relais adapté à l'antibiogramme.
2. Adapte explicitement chaque posologie au DFG de 38 mL/min ; précise quand une adaptation est nécessaire et quand elle ne l'est pas.
3. Indique la durée totale de traitement.
4. Raisonne étape par étape : molécules recommandées, puis ajustement rénal, puis durée.

Format — Un tableau : Molécule | Posologie adaptée au DFG | Voie | Durée | Remarque, suivi d'une courte justification.

Sources — Pour chaque recommandation, cite la source (HAS, avec l'année) et le niveau de preuve si disponible.

Incertitude — Signale toute donnée manquante qui changerait ta réponse, et rappelle que tes propositions doivent être vérifiées par le clinicien avant prescription.`,
      en: `Role — You are an expert infectious-disease physician, up to date with the French guidelines (HAS) on urinary tract infections.

Patient context
- Woman, 68 years old, 62 kg.
- Community-acquired acute pyelonephritis, no signs of severity (no sepsis, no obstruction, stable haemodynamics).
- Estimated GFR 38 mL/min (moderate renal impairment).
- No known allergy. No fluoroquinolone in the past 6 months.
- Outpatient management considered.

Your task — Propose a first-line empirical antibiotic therapy, then an alternative.

Constraints
1. Distinguish the initial empirical treatment from the culture-guided switch.
2. Explicitly adjust each dose to the GFR of 38 mL/min; state when an adjustment is needed and when it is not.
3. Give the total treatment duration.
4. Reason step by step: recommended molecules, then renal adjustment, then duration.

Format — A table: Molecule | GFR-adjusted dose | Route | Duration | Note, followed by a short rationale.

Sources — For each recommendation, cite the source (HAS, with the year) and the level of evidence if available.

Uncertainty — Flag any missing data that would change your answer, and remind that your proposals must be verified by the clinician before prescribing.`,
    },
  },
]

// ---------- Réponse de référence (HAS 2025 / OMEDIT 2021) ----------

export const REFERENCE_ANSWER = {
  title: { fr: 'Réponse de référence (HAS 2025 / OMEDIT 2021)', en: 'Reference answer (HAS 2025 / OMEDIT 2021)' },
  points: [
    {
      fr: '1ʳᵉ intention (pas de fluoroquinolone dans les 6 mois) : **ciprofloxacine 500 mg × 2/j** per os. Cette posologie reste valable à DFG 38 : OMEDIT autorise 500 ou 750 mg toutes les 12 à 24 h, au lieu de toutes les 8 à 12 h.',
      en: 'First line (no fluoroquinolone in the past 6 months): **ciprofloxacin 500 mg twice daily**, oral. This dose still holds at GFR 38: OMEDIT allows 500 or 750 mg every 12–24 h, instead of every 8–12 h.',
    },
    {
      fr: 'Ou **lévofloxacine**, mais à adapter : dose de charge de 500 mg, puis 250 mg toutes les 12 à 24 h (au lieu de 500 mg/j).',
      en: 'Or **levofloxacin**, but adjusted: loading dose of 500 mg, then 250 mg every 12–24 h (instead of 500 mg daily).',
    },
    {
      fr: '2ᵉ intention (fluoroquinolone dans les 6 mois) : **ceftriaxone 1 g/j** (IM ou IV), sans adaptation à la fonction rénale.',
      en: 'Second line (fluoroquinolone in the past 6 months): **ceftriaxone 1 g daily** (IM or IV), with no renal adjustment.',
    },
    {
      fr: '**Durée : 7 jours.** ECBU avant de débuter, réévaluation à 72 h, puis désescalade selon l’antibiogramme.',
      en: '**Duration: 7 days.** Urine culture before starting, reassessment at 72 h, then de-escalation according to susceptibility testing.',
    },
  ] satisfies Localized[],
  source: {
    fr: 'HAS, fiche mémo « Choix et durées d’antibiothérapies : pyélonéphrite aiguë de la femme » (juillet 2021, mise à jour mai 2025) ; OMEDIT Pays de la Loire, « Antibiotiques et insuffisance rénale » (V1, juillet 2021).',
    en: 'HAS memo “Antibiotic choice and duration: acute pyelonephritis in women” (July 2021, updated May 2025); OMEDIT Pays de la Loire, “Antibiotics and renal impairment” (V1, July 2021).',
  },
}

// ---------- Les 3 pièges pédagogiques (grille de correction) ----------

export type TrapSeverity = 'red' | 'amber' | 'emerald'

export interface Trap {
  id: string
  severity: TrapSeverity
  title: Localized
  detail: Localized
}

export const TRAPS: Trap[] = [
  {
    id: 'nitrofurantoin',
    severity: 'red',
    title: { fr: 'Nitrofurantoïne', en: 'Nitrofurantoin' },
    detail: {
      fr: 'Double faute : elle n’a pas d’indication dans la pyélonéphrite (concentrations parenchymateuses insuffisantes) ET elle est contre-indiquée à DFG 38. Le réflexe « infection urinaire → nitrofurantoïne ».',
      en: 'Double error: no indication in pyelonephritis (insufficient tissue concentrations) AND contraindicated at a GFR of 38. The reflex “urinary infection → nitrofurantoin”.',
    },
  },
  {
    id: 'fq-dose',
    severity: 'amber',
    title: {
      fr: 'Fluoroquinolone sans tenir compte du DFG',
      en: 'Fluoroquinolone without accounting for GFR',
    },
    detail: {
      fr: 'La molécule est correcte mais la posologie ne l’est pas : à DFG 38, la lévofloxacine doit être réduite (500 mg puis 250 mg toutes les 12 à 24 h), et la ciprofloxacine ne doit pas être prise plus souvent que toutes les 12 h. L’erreur la plus fine, et la plus fréquente chez les LLM.',
      en: 'The molecule is right but the dose is not: at a GFR of 38, levofloxacin must be reduced (500 mg then 250 mg every 12–24 h), and ciprofloxacin must not be taken more often than every 12 h. The most subtle error, and the most frequent one in LLMs.',
    },
  },
  {
    id: 'ceftriaxone-overadjust',
    severity: 'emerald',
    title: {
      fr: 'Réduire la ceftriaxone « pour le rein »',
      en: 'Reducing ceftriaxone “for the kidney”',
    },
    detail: {
      fr: 'Inutile (élimination en partie biliaire) → risque de sous-dosage. L’erreur du « bon élève » trop prudent.',
      en: 'Unnecessary (partly biliary elimination) → risk of underdosing. The over-cautious “good student” error.',
    },
  },
]

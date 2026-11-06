// ============================================================
// Échauffement « bac à sable » — données propres à l'étape.
//
// L'étudiant choisit un modèle, écrit le prompt qu'il veut, et juge
// la réponse À L'AVEUGLE : la recommandation n'est révélée qu'à la fin.
// C'est la situation réelle du clinicien — on interroge justement
// parce qu'on ne sait pas.
//
// Trois modèles ouverts couvrent une gamme de TAILLES (4 → 70 milliards
// de paramètres), face à un modèle commercial fermé dont la taille n'est
// pas publiée. Pas d'axe « médical » : OpenRouter n'héberge pas de
// modèle affiné médecine, et prétendre le contraire fausserait la
// démonstration.
// ============================================================

import type { Localized } from './data'

export interface SandboxModel {
  id: string
  /** Slug OpenRouter transmis au backend. */
  slug: string
  /**
   * Jetons servant à retrouver ce modèle chez UN AUTRE fournisseur, dont les
   * noms ne suivent pas la convention d'OpenRouter (`gemma3:4b` chez Ollama).
   * Tous doivent apparaître dans le nom : « llama » seul ramènerait n'importe
   * quel Llama, or la TAILLE du modèle est précisément le sujet du TD.
   */
  matchHints: string[]
  displayName: string
  /** Qui l'a produit. Utile pour situer le modèle sans en faire un argument. */
  maker: string
  /** Taille affichée à l'étudiant (elle, on l'assume : c'est le sujet). */
  params: string
  /** Ordre de grandeur pour la barre de taille (0 → 1). */
  sizeRatio: number
  hint: Localized
}

export const SANDBOX_MODELS: SandboxModel[] = [
  {
    id: 'gemma-4b',
    slug: 'google/gemma-3-4b-it',
    matchHints: ['gemma', '4b'],
    displayName: 'Gemma 3 4B',
    maker: 'Google',
    params: '4 milliards',
    sizeRatio: 0.06,
    hint: {
      fr: 'Très petit. Tournerait sur un ordinateur portable.',
      en: 'Very small. Would run on a laptop.',
    },
  },
  {
    id: 'llama-70b',
    slug: 'meta-llama/llama-3.3-70b-instruct',
    matchHints: ['llama', '70b'],
    displayName: 'Llama 3.3 70B',
    maker: 'Meta',
    params: '70 milliards',
    sizeRatio: 1,
    hint: {
      fr: 'Gros modèle, parmi les meilleurs modèles ouverts.',
      en: 'Large model, among the best open models.',
    },
  },
  {
    id: 'gpt-6-luna',
    slug: 'openai/gpt-6-luna',
    matchHints: ['gpt-6', 'luna'],
    displayName: 'GPT-6 Luna',
    maker: 'OpenAI',
    // OpenAI ne publie pas la taille : on le dit plutôt que de la deviner.
    params: 'non publiée',
    sizeRatio: 0,
    hint: {
      fr: 'Modèle commercial fermé, taille non publiée. Réfléchit avant de répondre.',
      en: 'Closed commercial model, size not published. Thinks before answering.',
    },
  },
]

export const DEFAULT_SANDBOX_MODEL = 'llama-70b'

// ---------- Le system prompt du TD ----------
//
// Consultable par l'étudiant (bouton dédié dans le chat) : c'est un
// objet pédagogique. ChatGPT, Claude et les autres en ont tous un,
// invisible, qui façonne leurs réponses. Le rendre lisible ici prépare
// la discussion.
//
// Sans lui, les modèles noient la réponse sous les disclaimers : on a
// mesuré des réponses 10× plus longues et 5× plus lentes, où l'erreur
// clinique devient impossible à repérer. Avec lui, la réponse est
// directe — et ses erreurs, visibles.

export const SYSTEM_PROMPT = {
  text: {
    fr: `Réponds DIRECTEMENT et de façon concise : molécule, posologie, durée.
Pas de disclaimer, pas de « consultez un médecin » : ton interlocuteur EST médecin.
Maximum 120 mots.`,
    en: `Answer DIRECTLY and concisely: molecule, dose, duration.
No disclaimer, no "consult a doctor": your interlocutor IS a doctor.
Maximum 120 words.`,
  },
  why: {
    fr: 'Sans cette consigne, les modèles répondent « je suis une IA, consultez un médecin » puis énumèrent dix molécules sur trois pages. La réponse devient si longue que l’erreur clinique s’y noie. Cette consigne ne rend pas le modèle plus juste — elle rend ses erreurs visibles.',
    en: 'Without this instruction, the models answer “I am an AI, consult a doctor” then list ten molecules over three pages. The answer becomes so long that the clinical error drowns in it. This instruction does not make the model more accurate — it makes its errors visible.',
  },
  lesson: {
    fr: 'ChatGPT, Claude, Gemini : tous fonctionnent avec une consigne système de ce type, que vous ne voyez jamais. Il fixe le ton, les refus, la longueur. Quand vous lisez une réponse d’IA, vous lisez toujours le produit d’une consigne écrite par quelqu’un d’autre.',
    en: 'ChatGPT, Claude, Gemini: all run with a system prompt of this kind, which you never see. It sets the tone, the refusals, the length. When you read an AI answer, you always read the product of an instruction written by someone else.',
  },
} satisfies Record<string, Localized>

// ---------- Le cas soumis à l'étudiant ----------
//
// Volontairement DONNÉ SANS la recommandation : c'est tout l'objet de
// l'étape. Le contexte clinique est en revanche précis, pour que
// l'étudiant puisse construire un prompt informatif s'il le souhaite.

export const WARMUP_BRIEF = {
  title: { fr: 'Votre mission', en: 'Your mission' },
  intro: {
    fr: 'Vous êtes en stage. Une patiente arrive, et vous ne connaissez pas encore le traitement de référence. Vous faites ce que tout le monde fait en 2026 : vous demandez à une IA.',
    en: 'You are on placement. A patient arrives and you do not yet know the reference treatment. You do what everyone does in 2026: you ask an AI.',
  },
  patient: {
    fr: 'Mme D., 68 ans, 62 kg. Fièvre à 38,9 °C, douleur lombaire droite, brûlures urinaires depuis 3 jours. Diagnostic retenu : pyélonéphrite aiguë communautaire, sans signe de gravité. Créatinine élevée : DFG estimé à 38 mL/min (insuffisance rénale modérée). Aucune allergie connue. Pas de fluoroquinolone dans les 6 derniers mois.',
    en: 'Mrs D., 68, 62 kg. Fever 38.9 °C, right flank pain, urinary burning for 3 days. Diagnosis: community-acquired acute pyelonephritis, no signs of severity. Raised creatinine: estimated GFR 38 mL/min (moderate renal impairment). No known allergy. No fluoroquinolone in the past 6 months.',
  },
  question: {
    fr: 'Quelle antibiothérapie ? Quelle molécule, quelle dose, quelle durée ?',
    en: 'Which antibiotic therapy? Which molecule, what dose, what duration?',
  },
} satisfies Record<string, Localized>

/** La règle du jeu, en consignes courtes plutôt qu'en pavé. */
// Une consigne par étape : la première ligne est le titre (en gras),
// la suite l'explique.
export const WARMUP_RULES: { title: Localized; rules: Localized[] } = {
  title: { fr: 'Consignes', en: 'Instructions' },
  rules: [
    {
      fr: 'Juger à l’aveugle\nVous ne connaissez pas la bonne réponse, et nous ne vous la donnerons **pas tout de suite**.',
      en: 'Judge blind\nYou do not know the right answer, and we will **not give it to you yet**.',
    },
    {
      fr: 'Interroger librement\n**Autant de fois** que vous voulez : changez de **modèle**, **reformulez**.',
      en: 'Ask freely\n**As often as you like**: switch **models**, **rephrase**.',
    },
    {
      fr: 'Donner votre avis\nAprès chaque réponse, dites si elle vous paraît **crédible**.',
      en: 'Give your opinion\nAfter each answer, say whether it seems **credible**.',
    },
    {
      fr: 'Confronter ensuite\nÀ l’étape suivante, vos jugements seront confrontés à la **recommandation officielle**.',
      en: 'Compare afterwards\nIn the next step, your judgements will be compared with the **official guideline**.',
    },
  ],
}

// ---------- Pistes de départ (aucune n'est « la bonne ») ----------

export interface StarterPrompt {
  id: string
  label: Localized
  text: Localized
}

export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'naive',
    label: { fr: 'Au plus court', en: 'Shortest' },
    text: {
      fr: 'Antibio pour une pyélonéphrite ?',
      en: 'Antibiotic for pyelonephritis?',
    },
  },
  {
    id: 'contextual',
    label: { fr: 'Avec le contexte', en: 'With context' },
    text: {
      fr: "Femme de 68 ans, 62 kg, pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Précise la molécule, la posologie et la durée.",
      en: 'A 68-year-old woman, 62 kg, community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. Which empirical antibiotic therapy? Give the molecule, the dose and the duration.',
    },
  },
  {
    id: 'sourced',
    label: { fr: 'En exigeant la source', en: 'Demanding the source' },
    text: {
      fr: "Femme de 68 ans, 62 kg, pyélonéphrite aiguë communautaire sans signe de gravité, DFG estimé à 38 mL/min. Quelle antibiothérapie probabiliste ? Molécule, posologie adaptée à la fonction rénale, durée. Cite pour chaque point la recommandation française sur laquelle tu t'appuies, avec l'année. Si tu n'es pas sûr, dis-le explicitement plutôt que d'inventer.",
      en: 'A 68-year-old woman, 62 kg, community-acquired acute pyelonephritis without signs of severity, estimated GFR 38 mL/min. Which empirical antibiotic therapy? Molecule, renally adjusted dose, duration. For each point cite the French guideline you rely on, with the year. If you are unsure, say so explicitly rather than inventing.',
    },
  },
]

// ---------- Grille de correction, révélée en fin d'étape ----------
//
// Reprend la réponse de référence et les pièges de data.ts, mais
// formulés pour une relecture APRÈS coup, essai par essai.

export interface CheckPoint {
  id: string
  label: Localized
  /** Ce qu'il fallait repérer dans la réponse du modèle. */
  detail: Localized
  severity: 'red' | 'amber' | 'emerald'
  /** Repérage automatique dans le texte de la réponse (indicatif). */
  patterns: RegExp[]
}

export const CHECKPOINTS: CheckPoint[] = [
  {
    id: 'nitrofurantoin',
    label: { fr: 'Nitrofurantoïne proposée', en: 'Nitrofurantoin proposed' },
    detail: {
      fr: 'Aucune indication dans la pyélonéphrite (elle ne diffuse pas dans le rein), et contre-indiquée sous 45 mL/min.',
      en: 'No indication in pyelonephritis (it does not reach the kidney), and contraindicated below 45 mL/min.',
    },
    severity: 'red',
    patterns: [/nitrofuranto/i, /furadant/i],
  },
  {
    id: 'fq-full-dose',
    label: {
      fr: 'Fluoroquinolone sans adaptation rénale',
      en: 'Fluoroquinolone without renal adjustment',
    },
    detail: {
      fr: 'À DFG 38, la lévofloxacine se réduit (500 mg puis 250 mg toutes les 12 à 24 h) ; la ciprofloxacine ne se donne pas plus souvent que toutes les 12 h.',
      en: 'At GFR 38, levofloxacin is reduced (500 mg then 250 mg every 12–24 h); ciprofloxacin is not given more often than every 12 h.',
    },
    severity: 'amber',
    // Ce que la table OMEDIT interdit à DFG 38 : la ciprofloxacine toutes les
    // 8 h, la lévofloxacine à pleine dose. 750 mg toutes les 12 h, lui, passe.
    patterns: [
      /toutes les\s*8\s*h/i,
      /[x×]\s*3\s*\/\s*j/i,
      /l[ée]vofloxacine\s*:?\s*500\s*mg\s*(\/\s*j|par jour|1 fois par jour)/i,
    ],
  },
  {
    id: 'duration',
    label: { fr: 'Durée supérieure à 7 jours', en: 'Duration longer than 7 days' },
    detail: {
      fr: 'La fiche HAS recommande 7 jours pour une pyélonéphrite simple. 10 jours, c’est la forme à risque de complication.',
      en: 'The HAS memo recommends 7 days for uncomplicated pyelonephritis. 10 days is for the at-risk form.',
    },
    severity: 'amber',
    patterns: [/\b(10|14|21)\s*jours/i, /\b(10|14|21)\s*days/i],
  },
  {
    id: 'ceftriaxone-cut',
    label: {
      fr: 'Ceftriaxone « à adapter au rein »',
      en: 'Ceftriaxone “to adjust for the kidney”',
    },
    detail: {
      fr: 'Inutile : la ceftriaxone ne s’adapte pas à la fonction rénale ici. La réduire expose à un sous-dosage.',
      en: 'Unnecessary: ceftriaxone needs no renal adjustment here. Reducing it risks underdosing.',
    },
    severity: 'emerald',
    patterns: [
      /ceftriaxone[^.]{0,80}(ajust|adapt|rédui|diminu)/i,
      /(ajust|adapt|rédui|diminu)[^.]{0,80}ceftriaxone/i,
    ],
  },
  {
    id: 'no-source',
    label: { fr: 'Aucune source citée', en: 'No source cited' },
    detail: {
      fr: 'Sans source, la réponse n’est pas vérifiable. Une source citée peut être inventée, mais elle se vérifie.',
      en: 'Without a source, the answer cannot be checked. A cited source may be invented, but it can be checked.',
    },
    severity: 'amber',
    patterns: [/spilf/i, /\bhas\b/i, /recommandation/i],
  },
]

// ---------- La réponse de référence, révélée à la fin ----------

export const WARMUP_REFERENCE = {
  title: { fr: 'La recommandation', en: 'The guideline' },
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
  /** La même chose, rangée par ligne de traitement : c'est la forme de la
      modale, où l'on doit voir la hiérarchie d'un coup d'œil. */
  sections: [
    {
      rank: '1',
      title: { fr: 'intention', en: 'line' },
      when: {
        fr: 'Pas de fluoroquinolone dans les 6 mois — c’est le cas de Mme D.',
        en: 'No fluoroquinolone in the past 6 months — the case of Mrs D.',
      },
      items: [
        {
          fr: '**Ciprofloxacine 500 mg × 2/j** per os. Reste valable à DFG 38 (OMEDIT : toutes les 12 à 24 h).',
          en: '**Ciprofloxacin 500 mg twice daily**, oral. Still valid at GFR 38 (OMEDIT: every 12–24 h).',
        },
        {
          fr: 'ou **lévofloxacine**, à adapter : 500 mg le premier jour, puis **250 mg toutes les 12 à 24 h**.',
          en: 'or **levofloxacin**, adjusted: 500 mg on day one, then **250 mg every 12–24 h**.',
        },
      ],
    },
    {
      rank: '2',
      title: { fr: 'intention', en: 'line' },
      when: {
        fr: 'Fluoroquinolone prise dans les 6 mois.',
        en: 'Fluoroquinolone taken in the past 6 months.',
      },
      items: [
        {
          fr: '**Ceftriaxone 1 g/j**, IM ou IV, sans adaptation à la fonction rénale.',
          en: '**Ceftriaxone 1 g daily**, IM or IV, with no renal adjustment.',
        },
      ],
    },
  ],
  duration: {
    fr: '**7 jours.** ECBU avant de débuter, réévaluation à 72 h, puis désescalade selon l’antibiogramme.',
    en: '**7 days.** Urine culture before starting, reassessment at 72 h, then de-escalation according to susceptibility testing.',
  },
  // Les deux documents, ouvrables depuis la modale pendant tout le TD.
  sources: [
    {
      file: '/td/recos/has-2025-pyelonephrite-femme.pdf',
      page: 2,
      label: {
        fr: 'HAS, fiche mémo « Choix et durées d’antibiothérapies : pyélonéphrite aiguë de la femme »',
        en: 'HAS memo “Antibiotic choice and duration: acute pyelonephritis in women”',
      },
      date: { fr: 'juillet 2021, mise à jour mai 2025', en: 'July 2021, updated May 2025' },
    },
    {
      file: '/td/recos/omedit-antibiotiques-insuffisance-renale.pdf',
      page: 1,
      label: {
        fr: 'OMEDIT Pays de la Loire, « Antibiotiques et insuffisance rénale »',
        en: 'OMEDIT Pays de la Loire, “Antibiotics and renal impairment”',
      },
      date: { fr: 'V1, juillet 2021', en: 'V1, July 2021' },
    },
  ],
} satisfies {
  title: Localized
  points: Localized[]
  sections: { rank: string; title: Localized; when: Localized; items: Localized[] }[]
  duration: Localized
  sources: { file: string; page: number; label: Localized; date: Localized }[]
}

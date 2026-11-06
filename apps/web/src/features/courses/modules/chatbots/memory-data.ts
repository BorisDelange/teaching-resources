// ============================================================
// Étape « La mémoire » — données.
//
// Le point à faire passer : un LLM est SANS ÉTAT. Il ne se souvient de
// rien. Ce qu'on appelle « mémoire » dans ChatGPT ou Claude, c'est le
// client qui renvoie l'historique à chaque appel. La mémoire est une
// illusion fabriquée côté application, et elle se paie en tokens.
//
// Trois modes, manipulables sur la même conversation :
//   1. aucune    → le modèle ne comprend pas les questions de suivi
//   2. complète  → il comprend, et le contexte enfle à chaque tour
//   3. résumée   → un appel LLM condense l'historique ; ça retombe,
//                  mais des détails se perdent au passage
//
// Les fenêtres de contexte sont relevées sur l'API OpenRouter
// (openrouter.ai/api/v1/models), pas estimées.
// ============================================================

import type { Localized } from './data'

export type MemoryMode = 'none' | 'full' | 'summary'

export interface MemoryModeSpec {
  id: MemoryMode
  label: Localized
  short: Localized
  /** Ce que le modèle reçoit réellement, en une phrase. */
  sends: Localized
  /** Ce que l'étudiant doit observer. */
  watch: Localized
}

export const MEMORY_MODES: MemoryModeSpec[] = [
  {
    id: 'none',
    label: { fr: 'Aucune mémoire', en: 'No memory' },
    short: { fr: 'Aucune', en: 'None' },
    sends: {
      fr: 'Uniquement votre dernier message.',
      en: 'Only your latest message.',
    },
    watch: {
      fr: 'Posez une question de suivi (« et si elle était allergique ? »). Le modèle ne sait pas de qui vous parlez : il **repart de zéro**. C’est le comportement réel d’un LLM, sans habillage.',
      en: 'Ask a follow-up (“what if she were allergic?”). The model has no idea who you mean: it **starts from scratch**. This is a real LLM’s behaviour, unwrapped.',
    },
  },
  {
    id: 'full',
    label: { fr: 'Mémoire complète', en: 'Full memory' },
    short: { fr: 'Complète', en: 'Full' },
    sends: {
      fr: 'Tous les échanges précédents, recopiés intégralement, puis votre message.',
      en: 'Every previous exchange, copied in full, then your message.',
    },
    watch: {
      fr: 'Le suivi fonctionne enfin. Mais regardez le compteur : à chaque tour vous **repayez toute la conversation**. Le coût ne croît pas linéairement — il s’accumule, tour après tour.',
      en: 'Follow-ups finally work. But watch the counter: every turn you **pay for the whole conversation again**. The cost does not grow linearly — it compounds, turn after turn.',
    },
  },
  {
    id: 'summary',
    label: { fr: 'Mémoire résumée', en: 'Summarised memory' },
    short: { fr: 'Résumée', en: 'Summarised' },
    sends: {
      fr: 'Un résumé des échanges anciens, PUIS le dernier échange recopié tel quel.',
      en: 'A summary of the older exchanges, THEN the last exchange copied verbatim.',
    },
    watch: {
      fr: 'Deux choses partent, pas une : le **résumé** (qui remplace les tours anciens) et le **dernier échange, non résumé** — le condenser ferait perdre de la nuance sans rien économiser. C’est ainsi que fonctionnent ChatGPT ou Claude. Lisez le résumé : que manque-t-il ? Le DFG à 38 a-t-il survécu ? Ce qui disparaît du résumé **disparaît de la mémoire**.',
      en: 'Two things are sent, not one: the **summary** (replacing the older turns) and the **last exchange, unsummarised** — condensing it would lose nuance for no gain. This is how ChatGPT and Claude work. Read the summary: what is missing? Did the GFR of 38 survive? Whatever leaves the summary **leaves the memory**.',
    },
  },
]

/**
 * Fenêtres de contexte réelles, relevées sur l'API OpenRouter le
 * 17/08/2026. Affichées pour situer le budget du TD (volontairement
 * minuscule) par rapport à la vraie limite des modèles.
 */
export const CONTEXT_WINDOWS: Record<string, number> = {
  'gemma-4b': 131_072,
  'llama-70b': 131_072,
  'gpt-6-luna': 1_050_000,
}

/**
 * Phrases d'annonce placées EN TÊTE des deux parties de la mémoire, dans
 * le message réellement envoyé. Sans elles, le modèle reçoit un résumé
 * d'allure ordinaire et peut le prendre pour une question de l'utilisateur.
 * Les vrais clients conversationnels font exactement cela.
 */
export const SUMMARY_HEADER: Localized = {
  fr: 'Résumé de la conversation jusqu’ici (contexte, pas une question) :',
  en: 'Summary of the conversation so far (context, not a question):',
}


/**
 * Résumé INCRÉMENTAL : à partir du deuxième passage, on ne renvoie plus les
 * transcriptions complètes mais le résumé précédent, plus les seuls tours qui
 * viennent de sortir de la fenêtre. Sans cela, l'appel de synthèse grossirait
 * à chaque message et coûterait bientôt plus cher que la mémoire qu'il allège.
 */
export const SUMMARY_PREVIOUS: Localized = {
  fr: 'Résumé de la conversation jusqu’ici :',
  en: 'Summary of the conversation so far:',
}

export const SUMMARY_NEW: Localized = {
  fr: 'Nouveaux échanges à intégrer :',
  en: 'New exchanges to fold in:',
}

export const SUMMARY_MERGE: Localized = {
  fr: `Réécris un résumé unique en 80 mots maximum, intégrant les nouveaux échanges au résumé précédent.

Conserve impérativement les données cliniques chiffrées (âge, poids, fonction rénale, allergies) et les décisions déjà prises. Écris au style télégraphique.`,
  en: `Rewrite a single summary of 80 words or fewer, folding the new exchanges into the previous summary.

You must keep the numeric clinical data (age, weight, renal function, allergies) and the decisions already made. Write in telegraphic style.`,
}

/** Consigne donnée au modèle pour qu'il résume la conversation. */
export const SUMMARY_PROMPT: Localized = {
  fr: `Résume la conversation ci-dessus en 80 mots maximum, pour qu'un autre modèle puisse continuer à répondre sans avoir lu les échanges.

Conserve impérativement les données cliniques chiffrées (âge, poids, fonction rénale, allergies) et les décisions déjà prises. Écris au style télégraphique.`,
  en: `Summarise the conversation above in 80 words or fewer, so that another model can keep answering without having read the exchanges.

You must keep the numeric clinical data (age, weight, renal function, allergies) and the decisions already made. Write in telegraphic style.`,
}

// ---------- Le brief de l'étape ----------

export const MEMORY_BRIEF = {
  title: { fr: 'La mémoire n’existe pas', en: 'Memory does not exist' },
  intro: {
    fr: 'Un modèle ne retient rien d’un message à l’autre. Ce qui ressemble à de la mémoire est un renvoi de l’historique, fabriqué par l’application.',
    en: 'A model retains nothing between messages. What looks like memory is the application replaying the history.',
  },
  patient: {
    fr: 'Mme D., 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie, pas de fluoroquinolone dans les 6 derniers mois.',
    en: 'Mrs D., 68, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy, no fluoroquinolone in the past 6 months.',
  },
  question: {
    fr: 'Menez une conversation suivie, puis changez de mode et rejouez-la.',
    en: 'Hold a multi-turn conversation, then switch mode and replay it.',
  },
} satisfies Record<string, Localized>

/** Questions de suivi suggérées : elles n'ont de sens qu'avec le contexte. */
export const FOLLOW_UPS: Localized[] = [
  {
    fr: 'Et si elle était allergique aux bêta-lactamines ?',
    en: 'And if she were allergic to beta-lactams?',
  },
  { fr: 'Quelle durée finalement ?', en: 'What duration in the end?' },
  {
    fr: 'Faut-il adapter la dose à sa fonction rénale ?',
    en: 'Should the dose be adjusted for her renal function?',
  },
  { fr: 'Résume-moi ce qu’on a décidé.', en: 'Summarise what we decided.' },
]

// Une consigne par étape : la première ligne est le titre (en gras),
// la suite l'explique.
export const MEMORY_RULES: { title: Localized; rules: Localized[] } = {
  title: { fr: 'Consignes', en: 'Instructions' },
  rules: [
    {
      fr: 'Lancer une conversation\nCommencez par le cas de Mme D., puis enchaînez avec une question de suivi *qui n’a de sens que si le modèle se souvient*.',
      en: 'Start a conversation\nStart with Mrs D.’s case, then follow up with a question *that only makes sense if the model remembers*.',
    },
    {
      fr: 'La rejouer dans les trois modes\nLa **même conversation**, sans mémoire, en mémoire complète puis résumée. Le **bouton œil**, sur vos messages, montre ce qui part réellement.',
      en: 'Replay it in all three modes\nThe **same conversation**, with no memory, full memory, then summarised. The **eye button** on your messages shows what is actually sent.',
    },
    {
      fr: 'Surveiller la jauge de contexte\nElle se remplit à chaque tour. Le budget est *volontairement minuscule* pour que vous atteigniez la limite en séance.',
      en: 'Watch the context gauge\nIt fills at every turn. The budget is *deliberately tiny* so that you hit the limit during the session.',
    },
    {
      fr: 'Lire le résumé\nEn mode résumé, le résumé est une génération comme une autre : il peut **perdre, ou déformer**.',
      en: 'Read the summary\nIn summary mode, the summary is a generation like any other: it can **lose or distort** things.',
    },
  ],
}

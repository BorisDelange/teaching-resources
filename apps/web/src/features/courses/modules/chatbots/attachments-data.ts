// ============================================================
// Étape « Documents » — les pièces jointes proposées.
//
// Le trombone imite ChatGPT ou Claude : on « joint un PDF » et son texte
// part dans le contexte. Ici, la transcription est faite à l'avance
// (aucune extraction dans le navigateur) — ce qui ne change rien à ce
// que voit l'étudiant, puisque c'est bien le texte du PDF qui part.
//
// Les deux documents de l'exercice 2, et eux seuls : la fiche mémo HAS
// (quelle molécule, quelle durée) et la table OMEDIT (quelle dose à DFG 38).
// Aucun des deux ne suffit seul — c'est la leçon du croisement des sources.
//
// La table OMEDIT est remise en forme : une ligne par antibiotique, les
// cases fusionnées du PDF dépliées en tranches de DFG, et seules les
// familles utiles en urologie. Recopiée telle quelle, avec ses colonnes
// alignées par des espaces, elle était illisible pour les petits modèles.
//
// Tailles mesurées sur le tokenizer de Mistral Small 24B (14/10/2026).
// Toutes deux font moins de la moitié du budget de 5 000 tokens du TD :
// elles partent en entier, sans recherche.
// ============================================================

import omeditMd from './attachments/omedit.md?raw'
import hasPnaMd from './attachments/has-pna.md?raw'
import type { Localized } from './data'

export interface Attachment {
  id: string
  label: Localized
  /** Document d'origine, affiché sous le titre. */
  source: Localized
  pages: number
  /** Taille mesurée sur le tokenizer réel, en tokens. */
  tokens: number
  /** Le texte réellement joint (transcription complète du document). */
  content: string
  /** Le PDF d'origine, pour aller vérifier le passage cité. */
  file: string
  /**
   * Phrases de situation, une par extrait (contextual retrieval). Générées
   * hors ligne par `apps/api/scripts/build_contexts.mjs` : sans elles, une
   * section « 1.2. Traitement » est indiscernable de « 2.2. Traitement ».
   * Utile uniquement aux documents assez gros pour déclencher la recherche.
   */
  contexts?: Record<string, string>
  /** Décalage entre la page notée dans la transcription et celle du PDF. */
  pageOffset?: number
}

export const ATTACHMENTS: Attachment[] = [
  {
    id: 'has-pna',
    label: {
      fr: 'Fiche HAS 2025 — pyélonéphrite aiguë de la femme',
      en: 'HAS memo 2025 — acute pyelonephritis in women',
    },
    source: {
      fr: 'Fiche mémo « Choix et durées d’antibiothérapies », 3 pages',
      en: '“Antibiotic choice and duration” memo, 3 pages',
    },
    pages: 3,
    tokens: 1128,
    content: hasPnaMd,
    file: '/td/recos/has-2025-pyelonephrite-femme.pdf',
  },
  {
    id: 'omedit',
    label: {
      fr: 'OMEDIT 2021 — antibiotiques et insuffisance rénale',
      en: 'OMEDIT 2021 — antibiotics and renal impairment',
    },
    source: {
      fr: 'Tableau d’adaptation posologique, remis en forme',
      en: 'Dose-adjustment table, reformatted',
    },
    pages: 2,
    tokens: 2259,
    content: omeditMd,
    file: '/td/recos/omedit-antibiotiques-insuffisance-renale.pdf',
  },
]

/**
 * Un document qui dépasse le budget n'est pas refusé : il bascule en
 * RECHERCHE. C'est ce que font ChatGPT et Claude, sans le dire à
 * l'utilisateur — Anthropic documente la bascule automatique pour les
 * Projects, OpenAI annonce 110 000 tokens pour ChatGPT Enterprise.
 *
 * Le geste de l'étudiant est identique dans les deux cas : joindre un
 * document. Ce qui change se joue dans la machine, et c'est tout le sujet
 * de cette étape.
 */
export function needsRetrieval(a: Attachment, budgetTokens: number): boolean {
  // La moitié du budget, pas tout : la consigne, la question et la réponse
  // doivent tenir à côté du document.
  return a.tokens > budgetTokens / 2
}

/**
 * En-tête placé devant la transcription. Sans lui, le document arriverait
 * comme un mur de texte que le modèle pourrait prendre pour une consigne.
 * Les vrais clients font la même chose.
 */
export const DOC_HEADER: Localized = {
  fr: 'Documents joints par l’utilisateur (contexte, pas une question) :',
  en: 'Documents attached by the user (context, not a question):',
}

/**
 * En mode recherche, l'en-tête doit dire que le document est INCOMPLET :
 * sans cela le modèle croit avoir tout lu et comble les trous de lui-même.
 * On lui demande aussi de citer la page, ce qui rend la vérification possible.
 */
export const RAG_HEADER: Localized = {
  fr: 'Extraits sélectionnés automatiquement dans un document trop volumineux pour être envoyé en entier. Ce ne sont PAS toutes les pages : appuyez-vous uniquement sur ces extraits, citez la page, et signalez si l’information manque.',
  en: 'Passages automatically selected from a document too large to send in full. These are NOT all the pages: rely only on these excerpts, cite the page, and say so if the information is missing.',
}

export const ATTACH_BRIEF = {
  title: { fr: 'Joindre un document', en: 'Attach a document' },
  intro: {
    fr: 'Le trombone fait ce que font ChatGPT ou Claude : le texte du document est recopié devant votre question. Le modèle répond alors avec la recommandation sous les yeux, et peut la citer.',
    en: 'The paperclip does what ChatGPT or Claude do: the document’s text is copied before your question. The model then answers with the guideline in front of it, and can quote it.',
  },
  patient: {
    fr: 'Mme D., 68 ans, 62 kg. Pyélonéphrite aiguë communautaire sans signe de gravité. DFG estimé à 38 mL/min. Pas d’allergie.',
    en: 'Mrs D., 68, 62 kg. Community-acquired acute pyelonephritis without signs of severity. Estimated GFR 38 mL/min. No allergy.',
  },
  question: {
    fr: 'Posez la question sans pièce jointe, puis avec, et comparez.',
    en: 'Ask without an attachment, then with one, and compare.',
  },
} satisfies Record<string, Localized>

// Une consigne par étape : la première ligne est le titre (en gras),
// la suite l'explique.
export const ATTACH_RULES: { title: Localized; rules: Localized[] } = {
  title: { fr: 'Consignes', en: 'Instructions' },
  rules: [
    {
      fr: 'Poser la question sans rien joindre\nNotez si le modèle cite une source, et laquelle.',
      en: 'Ask without attaching anything\nNote whether the model cites a source, and which one.',
    },
    {
      fr: 'Joindre la fiche HAS\nReposez la même question. Dans votre prompt, demandez au modèle de **citer ses sources précisément** : la page, et le passage mot pour mot.',
      en: 'Attach the HAS memo\nAsk again. In your prompt, ask the model to **cite its sources precisely**: the page, and the passage word for word.',
    },
    {
      fr: 'Vérifier dans le PDF\nLe passage cité existe-t-il, à la page indiquée ? Dit-il bien ce que le modèle lui fait dire ?',
      en: 'Check in the PDF\nDoes the quoted passage exist, on the page given? Does it really say what the model claims?',
    },
    {
      fr: 'Ajouter la table OMEDIT\nLa fiche donne la dose pour un rein normal. Joignez les **deux documents à la fois** : le modèle adapte-t-il la posologie au **DFG de 38** ?',
      en: 'Add the OMEDIT table\nThe memo gives the dose for normal kidneys. Attach **both documents at once**: does the model adjust the dose to the **GFR of 38**?',
    },
    {
      fr: 'Regarder ce qui part\nLe **bouton œil**, sur votre message, montre les documents **recopiés en entier** devant votre question. C’est ce qui explique le coût d’entrée.',
      en: 'Look at what is sent\nThe **eye button** on your message shows the documents **copied whole** before your question. That is what explains the input cost.',
    },
  ],
}

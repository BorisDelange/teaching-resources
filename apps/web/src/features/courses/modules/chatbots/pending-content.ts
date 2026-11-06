// ============================================================
// Contenu déjà rédigé pour les étapes qui restent à écrire.
//
// Conservé plutôt que supprimé : ces exemples ont été travaillés pour
// le TD et serviront tels quels.
// ============================================================

// ---------- Étape « Le prompt » : une hallucination exemplaire ----------
//
// Le modèle invente une référence ET un PMID parfaitement plausibles.
// Ni l'essai, ni le PMID n'existent — mais rien dans la forme ne permet
// de s'en douter. C'est l'illustration la plus nette du problème posé
// pendant l'échauffement.

export const HALLUCINATION_PROMPT = {
  fr: 'Cite l’essai randomisé de 2021 comparant céfixime et ciprofloxacine dans la pyélonéphrite, avec son PMID.',
  en: 'Cite the 2021 randomised trial comparing cefixime and ciprofloxacin in pyelonephritis, with its PMID.',
}

export const HALLUCINATION_ANSWER = {
  fr: 'Il s’agit de l’essai de Nguyen et al. (2021), « Cefixime versus ciprofloxacin in acute pyelonephritis: a randomized controlled trial », publié dans Clinical Infectious Diseases — PMID : 34129876. L’étude a inclus 412 patients et concluait à une non-infériorité du céfixime.',
  en: 'This is the trial by Nguyen et al. (2021), “Cefixime versus ciprofloxacin in acute pyelonephritis: a randomized controlled trial”, published in Clinical Infectious Diseases — PMID: 34129876. The study enrolled 412 patients and concluded non-inferiority of cefixime.',
}

// ---------- Étape « RAG » : trois façons de découper un document ----------
//
// Le découpage change la réponse : un extrait détaché de son titre perd
// la catégorie clinique à laquelle il appartient.

export interface RagMode {
  id: string
  label: { fr: string; en: string }
  chunk: { fr: string; en: string }
  answer: { fr: string; en: string }
  verdict: 'wrong' | 'correct' | 'correct+'
  note: { fr: string; en: string }
}

export const RAG_MODES: RagMode[] = [
  {
    id: 'small',
    label: { fr: 'Chunks trop petits', en: 'Chunks too small' },
    chunk: {
      fr: '« Ceftriaxone 1 à 2 g/24h, 10 à 14 jours. »',
      en: '“Ceftriaxone 1–2 g/24h, 10 to 14 days.”',
    },
    answer: {
      fr: 'Ceftriaxone 1 à 2 g/24h pendant 10 à 14 jours.',
      en: 'Ceftriaxone 1–2 g/24h for 10 to 14 days.',
    },
    verdict: 'wrong',
    note: {
      fr: 'Le morceau a été détaché de son titre : on ne sait plus s’il s’agit de la PNA simple, à risque de complication ou grave. La dose peut être plaquée sur la mauvaise catégorie → réponse plausible mais potentiellement fausse.',
      en: 'The chunk was detached from its heading: we no longer know whether it is uncomplicated, at-risk or severe APN. The dose may be applied to the wrong category → plausible but potentially wrong answer.',
    },
  },
  {
    id: 'structure',
    label: { fr: 'Chunking qui garde la structure', en: 'Structure-aware chunking' },
    chunk: {
      fr: '« Pyélonéphrite aiguë > À risque de complication > Traitement probabiliste : C3G parentérale (ceftriaxone) ou fluoroquinolone. »',
      en: '“Acute pyelonephritis > At risk of complication > Empirical treatment: parenteral 3GC (ceftriaxone) or fluoroquinolone.”',
    },
    answer: {
      fr: 'Pour une PNA à risque de complication : C3G parentérale (ceftriaxone) ou fluoroquinolone, selon le contexte.',
      en: 'For APN at risk of complication: parenteral 3GC (ceftriaxone) or fluoroquinolone, depending on context.',
    },
    verdict: 'correct',
    note: {
      fr: 'En conservant la chaîne de titres (section > sous-section), le morceau « sait » à quelle catégorie il appartient. La réponse ne confond plus les formes.',
      en: 'By keeping the heading chain (section > subsection), the chunk “knows” which category it belongs to. The answer no longer confuses the forms.',
    },
  },
  {
    id: 'contextual',
    label: { fr: 'Contextual retrieval (contexte ajouté)', en: 'Contextual retrieval (added context)' },
    chunk: {
      fr: '« Ce passage vient des recommandations sur la pyélonéphrite, forme à risque de complication, traitement probabiliste (à distinguer des formes simple et grave). C3G parentérale (ceftriaxone) ou fluoroquinolone. »',
      en: '“This passage is from the pyelonephritis guidelines, at-risk-of-complication form, empirical treatment (distinct from uncomplicated and severe). Parenteral 3GC (ceftriaxone) or fluoroquinolone.”',
    },
    answer: {
      fr: 'PNA à risque de complication : C3G parentérale (ceftriaxone) ou fluoroquinolone — et le passage est retrouvé même si la question est formulée autrement (« pyélo sévère », « sepsis urinaire »).',
      en: 'APN at risk of complication: parenteral 3GC (ceftriaxone) or fluoroquinolone — and the passage is found even if the question is phrased differently (“severe pyelo”, “urinary sepsis”).',
    },
    verdict: 'correct+',
    note: {
      fr: 'Un LLM ajoute à chaque morceau une phrase de contexte avant l’indexation (méthode décrite par Anthropic). On ne dépend plus de la présence de titres propres : jusqu’à −49 % d’échecs de récupération.',
      en: 'An LLM prepends a context sentence to each chunk before indexing (method described by Anthropic). No longer dependent on clean headings: up to −49 % retrieval failures.',
    },
  },
]

// ---------- Étape « Synthèse » : la grille de lecture critique ----------

export const CHECKLIST: { fr: string; en: string }[] = [
  {
    fr: 'Le modèle a-t-il vu des données médicales, et de quand datent-elles ?',
    en: 'Has the model seen medical data, and how recent is it?',
  },
  {
    fr: 'M’a-t-il donné des sources vérifiables — et sont-elles réelles ?',
    en: 'Did it give me verifiable sources — and are they real?',
  },
  {
    fr: 'Mon prompt contenait-il assez de contexte (ici : le DFG) ?',
    en: 'Did my prompt contain enough context (here: the GFR)?',
  },
  {
    fr: 'Y a-t-il un RAG / des recommandations derrière, ou juste la « mémoire » du modèle ?',
    en: 'Is there a RAG / guidelines behind it, or just the model’s “memory”?',
  },
  {
    fr: 'Ai-je le droit d’y mettre ces données patient ?',
    en: 'Am I allowed to put these patient data into it?',
  },
  {
    fr: 'Qui reste responsable de la décision ? (moi.)',
    en: 'Who remains responsible for the decision? (me.)',
  },
]

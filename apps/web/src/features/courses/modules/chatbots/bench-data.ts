// ============================================================
// Benchmark du TD — ce que vaut chaque modèle POUR CE TD.
//
// Les chiffres viennent de `scripts/bench-chatbots.mjs`, rejoué à la main
// et versionné dans `bench/results.json`. Rien n'est mesuré dans le
// navigateur : une salle entière relançant le benchmark épuiserait la clef,
// et les étudiants doivent voir le MÊME tableau que l'enseignant.
//
// Chaque modèle reçoit un PROFIL (`Klass`) qui raconte comment il se
// comporte d'un palier à l'autre : l'étudiant doit voir que la qualité de la
// réponse se joue à trois niveaux — le modèle, le prompt, les sources.
// ============================================================

import type { Localized } from './data'
import raw from './bench/results.json'

/** Une condition = un palier du TD (prompt brut → prompt travaillé → RAG). */
export type ConditionId = 'raw' | 'prompt' | 'rag'

export interface ConditionStat {
  mean: number
  min: number
  max: number
  n: number
  /** Tirages où le modèle a refusé de répondre (≠ mauvaise réponse). */
  refusals: number
}

/**
 * Le profil d'un modèle sur les trois paliers du TD.
 *
 *   ceiling  → bon dès le prompt brut. Montre que le modèle compte.
 *   climber  → médiocre en brut, bon avec le prompt travaillé et les
 *              documents. Montre que le prompt et les sources comptent.
 *   flat     → intermédiaire : progresse sans jamais devenir fiable.
 *   floor    → mauvais quoi qu'il arrive, même documents en main.
 *   unstable → deux tirages identiques donnent des réponses opposées.
 */
export type Klass = 'climber' | 'ceiling' | 'floor' | 'unstable' | 'flat'

/** Paliers de taille, du modèle qui tient sur un portable au très gros. */
// « tiny » ne sert plus : les très petits modèles sont rangés avec les
// petits. Il reste dans le type pour relire un ancien fichier de résultats.
export type SizeBand = 'tiny' | 'small' | 'medium' | 'large'

/** Dense = tous les poids à chaque token ; MoE = une fraction seulement. */
export type Arch = 'dense' | 'moe'

export interface BenchModel {
  id: string
  name: string
  params: string
  slug: string
  billions?: number
  arch?: Arch
  size?: SizeBand
  raw: ConditionStat
  prompt: ConditionStat
  rag: ConditionStat
  gain: number
  /** Le pire écart des trois conditions — ce que la barre d'étendue montre. */
  spread: number
  /** L'écart de la seule condition finale : c'est lui qui décide de `klass`. */
  ragSpread?: number
  /**
   * Le budget de génération de CE modèle, quand il déroge au budget commun.
   * Les modèles à raisonnement en demandent davantage : sous 700 tokens,
   * certains consomment tout en réflexion sans jamais répondre.
   */
  maxTokens?: number
  refusals: number
  klass: Klass
}

export interface BenchRun {
  modelId: string
  model: string
  condition: ConditionId
  run: number
  score?: number
  answer?: string
  ms?: number
  error?: string
  usage?: {
    total_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
    /** Coût réel facturé par OpenRouter, en dollars. */
    cost?: number
    /** Tokens de raisonnement, non affichés à l'étudiant mais payés. */
    completion_tokens_details?: { reasoning_tokens?: number }
  } | null
  finish?: string | null
  verdict?: Record<string, boolean | string>
}

export interface BenchResults {
  ranAt: string
  judge: string
  /** Tirages par case : minimum sur les modèles, puis maximum après cumul. */
  repeats: number
  repeatsMax?: number
  /** La consigne système, commune aux trois conditions. */
  system?: string
  /** Le texte envoyé, par condition — stocké une fois, pas par tirage. */
  prompts?: Partial<Record<ConditionId, string>>
  /** Les réglages de génération, sans lesquels la mesure ne se reproduit pas. */
  params?: {
    temperature?: number
    max_tokens?: number
    top_p?: number | null
    top_k?: number | null
    seed?: number | null
  }
  judgeParams?: { temperature?: number; max_tokens?: number; response_format?: string }
  provider?: string
  models: BenchModel[]
  runs: BenchRun[]
}

export const BENCH = raw as unknown as BenchResults

// ---------- Libellés ----------

export const CONDITIONS: { id: ConditionId; label: Localized; detail: Localized }[] = [
  {
    id: 'raw',
    label: { fr: 'Prompt brut', en: 'Raw prompt' },
    detail: {
      fr: '« antibio pour une pyélonéphrite ? » — la question telle qu’on la pose spontanément, sans le moindre contexte.',
      en: '“antibiotic for pyelonephritis?” — the question as one spontaneously asks it, with no context at all.',
    },
  },
  {
    id: 'prompt',
    label: { fr: 'Prompt travaillé', en: 'Engineered prompt' },
    detail: {
      fr: 'Le palier 4 de l’exercice 3 : rôle d’infectiologue, contexte clinique complet (dont le DFG à 38), raisonnement étape par étape, exigence de source et droit de dire « je ne sais pas ».',
      en: 'Level 4 of exercise 3: infectious-disease role, full clinical context (including the GFR of 38), step-by-step reasoning, source requirement and the right to say “I don’t know”.',
    },
  },
  {
    id: 'rag',
    label: { fr: 'Prompt + documents', en: 'Prompt + documents' },
    detail: {
      fr: 'Le même prompt, précédé des deux documents de l’exercice 6, en entier : la fiche HAS pyélonéphrite et la table OMEDIT remise en forme — environ 3 400 tokens.',
      en: 'The same prompt, preceded by the two documents of exercise 6, in full: the HAS pyelonephritis memo and the reformatted OMEDIT table — about 3,400 tokens.',
    },
  },
]

export const KLASS_META: Record<
  Klass,
  { label: Localized; advice: Localized; tone: 'emerald' | 'blue' | 'red' | 'amber' | 'slate' }
> = {
  ceiling: {
    label: { fr: 'Bon d’emblée', en: 'Good from the start' },
    advice: {
      fr: 'Répond correctement dès la question brute. Utile pour montrer que le choix du modèle compte, à condition de faire vérifier les sources : même un bon modèle peut en inventer.',
      en: 'Answers correctly from the raw question. Useful to show that the choice of model matters, provided students check the sources: even a good model may invent some.',
    },
    tone: 'blue',
  },
  climber: {
    label: { fr: 'Progresse avec prompt et sources', en: 'Improves with prompt and sources' },
    advice: {
      fr: 'Approximatif sur la question brute, il devient juste quand l’étudiant précise sa question puis joint la recommandation. La démonstration que le prompt et les sources comptent autant que le modèle.',
      en: 'Approximate on the raw question, it becomes right once the student sharpens the question and then attaches the guideline. Shows that prompt and sources matter as much as the model.',
    },
    tone: 'emerald',
  },
  flat: {
    label: { fr: 'Intermédiaire', en: 'Intermediate' },
    advice: {
      fr: 'S’améliore avec le prompt et les documents sans jamais devenir fiable : la réponse reste à vérifier ligne à ligne, même avec la recommandation sous les yeux.',
      en: 'Improves with the prompt and the documents without ever becoming reliable: the answer still has to be checked line by line, even with the guideline in hand.',
    },
    tone: 'slate',
  },
  floor: {
    label: { fr: 'Mauvais quoi qu’il arrive', en: 'Poor whatever happens' },
    advice: {
      fr: 'Se trompe même avec la recommandation jointe. Le contrepoint utile : ni le prompt ni les sources ne compensent un modèle trop faible.',
      en: 'Errs even with the guideline attached. The useful counterpoint: neither prompt nor sources make up for a model that is too weak.',
    },
    tone: 'red',
  },
  unstable: {
    label: { fr: 'Instable', en: 'Unstable' },
    advice: {
      fr: 'Deux envois identiques, avec les documents, donnent des réponses de qualité opposée. Excellent pour l’exercice 4 (le hasard), risqué pour le fil conducteur.',
      en: 'Two identical submissions, with the documents, give answers of opposite quality. Excellent for exercise 4 (randomness), risky for the main thread.',
    },
    tone: 'amber',
  },
}

/**
 * La grille, dans l'ordre où le TD la fait découvrir.
 *
 * Chaque critère juge la JUSTESSE au regard des recommandations, pas la
 * simple présence : une posologie chiffrée mais fantaisiste ne rapporte rien.
 *
 * `appliesTo` restreint un critère aux conditions où la question le rend
 * exigible : le prompt brut ne mentionne aucun rein, le DFG n'y est donc pas
 * noté et le score brut est rapporté aux points restants.
 *
 * `refusal` ne vaut aucun point : ce n'est pas une faute clinique mais un
 * comportement à signaler, et il se traduit déjà par l'absence de tous les
 * autres critères.
 */
export const CRITERIA: {
  id: string
  label: Localized
  weight: number
  trap?: boolean
  appliesTo?: ConditionId[]
}[] = [
  { id: 'molecule', label: { fr: 'Molécule recommandée', en: 'Recommended molecule' }, weight: 20 },
  { id: 'dose', label: { fr: 'Posologie correcte', en: 'Correct dose' }, weight: 20 },
  { id: 'duration', label: { fr: 'Durée correcte', en: 'Correct duration' }, weight: 15 },
  { id: 'cites', label: { fr: 'Source citée', en: 'Source cited' }, weight: 10 },
  {
    id: 'renal',
    label: { fr: 'Adaptation au DFG', en: 'Adjusted to GFR' },
    weight: 20,
    appliesTo: ['prompt', 'rag'],
  },
  { id: 'trap_invented', label: { fr: 'Aucune référence inventée', en: 'No invented reference' }, weight: 15, trap: true },
  { id: 'refusal', label: { fr: 'Refus de répondre', en: 'Refused to answer' }, weight: 0, trap: true },
]

export function applies(crit: (typeof CRITERIA)[number], condition: ConditionId): boolean {
  return !crit.appliesTo || crit.appliesTo.includes(condition)
}

/** Les points en jeu dans une condition — calculés, pour qu'ils ne puissent pas mentir. */
export function maxScore(condition: ConditionId): number {
  return CRITERIA.filter((c) => applies(c, condition)).reduce((sum, c) => sum + c.weight, 0)
}

/**
 * Le score affiché est toujours sur 100 : en `raw`, les points obtenus sont
 * rapportés aux seuls critères applicables (voir `score` dans le script).
 */
export const MAX_SCORE = 100

/** Du meilleur profil au moins bon : l'ordre dans lequel la page les montre. */
export function klassOrder(k: Klass): number {
  return { ceiling: 0, climber: 1, flat: 2, unstable: 3, floor: 4 }[k]
}

/**
 * Recherche approchée sur les modèles.
 *
 * Sous-séquence plutôt qu'égalité : « m24 » doit retrouver « Mistral Small
 * 24B », « qwn » → « Qwen3 8B », et l'identifiant OpenRouter compte aussi
 * (on cherche parfois « meta-llama »). Les accents et la casse sont neutralisés
 * — personne ne tape « Ministral » avec la bonne casse dans un champ de
 * recherche.
 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function subsequence(needle: string, hay: string): boolean {
  let i = 0
  for (const ch of hay) {
    if (ch === needle[i]) i++
    if (i === needle.length) return true
  }
  return i === needle.length
}

export function matchesQuery(model: BenchModel, query: string): boolean {
  const q = norm(query.trim()).replace(/\s+/g, '')
  if (!q) return true
  // Le champ le plus parlant d'abord : un nom qui contient la saisie telle
  // quelle passe avant toute approximation.
  const fields = [model.name, model.slug, model.params, model.id].map((f) =>
    norm(f).replace(/\s+/g, ''),
  )
  if (fields.some((f) => f.includes(q))) return true
  // L'approximation ne s'applique qu'aux saisies d'au moins trois caractères :
  // en dessous, une sous-séquence traverse n'importe quel nom (« 3b » retrouvait
  // les huit modèles) et le champ ne filtrait plus rien.
  if (q.length < 3) return false
  return fields.some((f) => subsequence(q, f))
}

export const SIZE_META: { id: SizeBand; label: Localized; hint: Localized }[] = [
  {
    id: 'small',
    label: { fr: 'Petit (≤ 12 Md)', en: 'Small (≤ 12 B)' },
    hint: {
      fr: 'Tourne sur un ordinateur portable ou une machine de bureau avec GPU.',
      en: 'Runs on a laptop or a desktop with a GPU.',
    },
  },
  {
    id: 'medium',
    label: { fr: 'Intermédiaire (13 à 40 Md)', en: 'Mid-sized (13 to 40 B)' },
    hint: { fr: 'Demande un serveur dédié.', en: 'Requires a dedicated server.' },
  },
  {
    id: 'large',
    label: { fr: 'Gros (> 40 Md)', en: 'Large (> 40 B)' },
    hint: { fr: 'Hébergé, rarement en local.', en: 'Hosted, rarely run locally.' },
  },
]

export const ARCH_META: { id: Arch; label: Localized; hint: Localized }[] = [
  {
    id: 'dense',
    label: { fr: 'Dense', en: 'Dense' },
    hint: {
      fr: 'Tous les paramètres travaillent à chaque token.',
      en: 'Every parameter works on every token.',
    },
  },
  {
    id: 'moe',
    label: { fr: 'Mélange d’experts (MoE)', en: 'Mixture of experts (MoE)' },
    hint: {
      fr: 'Seule une fraction des paramètres est activée : rapide malgré la taille annoncée.',
      en: 'Only a fraction of the parameters is active: fast despite the advertised size.',
    },
  },
]

/** Les filtres actifs. Un ensemble vide ne filtre rien (et non « tout exclure »). */
export interface BenchFilters {
  klass: Set<Klass>
  size: Set<SizeBand>
  arch: Set<Arch>
}

export function emptyFilters(): BenchFilters {
  return { klass: new Set(), size: new Set(), arch: new Set() }
}

export function countActive(f: BenchFilters): number {
  return f.klass.size + f.size.size + f.arch.size
}

export function passesFilters(model: BenchModel, f: BenchFilters): boolean {
  if (f.klass.size && !f.klass.has(model.klass)) return false
  // Un modèle sans taille connue (fichier de résultats ancien) ne doit pas
  // disparaître dès qu'un filtre de taille est posé : on ne l'exclut que si
  // l'information existe et ne correspond pas.
  const size = model.size === 'tiny' ? 'small' : model.size
  if (f.size.size && (!size || !f.size.has(size))) return false
  if (f.arch.size && (!model.arch || !f.arch.has(model.arch))) return false
  return true
}

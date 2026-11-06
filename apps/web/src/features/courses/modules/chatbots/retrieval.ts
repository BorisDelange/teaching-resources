// ============================================================
// Recherche dans un document trop gros pour le contexte (le « R » de RAG).
//
// Le découpage est commun ; le CLASSEMENT existe en deux versions :
//
//   1. sémantique (`retrieveSemantic`) — un modèle d'embedding tourne sur
//      le backend et compare le SENS. C'est la voie normale.
//   2. lexicale (`retrieve`) — un score par mot-clé, dans le navigateur.
//      Repli quand le backend n'a pas de modèle, et objet de comparaison
//      en séance.
//
// L'écart entre les deux est lui-même pédagogique : à la question « PNA
// communautaire sans signe de gravité », le bon chapitre s'intitule « PNA
// simple », un mot absent de la question. La recherche lexicale le manque
// facilement ; les embeddings le retrouvent. C'est ce que « comprendre le
// sens » veut dire.
// ============================================================

/** Un morceau du document, tel qu'il pourra être envoyé au modèle. */
export interface Chunk {
  /** Titre de la section d'où il vient, pour que la source reste citable. */
  title: string
  /**
   * Titres parents, du plus général au plus proche. Ils portent le sujet que
   * la section elle-même ne répète pas, et sont donc comptés dans le score.
   */
  path: string[]
  text: string
  /** Taille approximative, pour afficher le coût de ce qui est retenu. */
  tokens: number
  /**
   * Page du PDF d'origine, relevée sur les marqueurs `<!--page:N-->` insérés
   * à la transcription. C'est elle qui permet d'ouvrir le PDF au bon endroit
   * et d'y surligner le passage : la promesse « remonter à la source » ne
   * tient que si le lien est vérifiable.
   */
  page: number
  /**
   * Frontières de page rencontrées dans ce passage (position dans le texte →
   * page qui commence). Permet de savoir sur QUELLE page se trouve une phrase
   * donnée, et donc d'ouvrir le PDF au bon endroit.
   */
  breaks: { at: number; page: number }[]
}

export interface Retrieved extends Chunk {
  score: number
  /** Les mots de la question qui ont déclenché la sélection. */
  matched: string[]
}

/**
 * Mots vides français : sans ce filtre, « de », « la » ou « pour » domineraient
 * le score et feraient remonter n'importe quelle section.
 */
const STOP = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'à', 'au', 'aux',
  'en', 'dans', 'pour', 'par', 'sur', 'avec', 'sans', 'que', 'qui', 'quoi', 'quel',
  'quelle', 'quels', 'quelles', 'est', 'sont', 'a', 'ai', 'il', 'elle', 'on', 'ce',
  'cette', 'ces', 'son', 'sa', 'ses', 'leur', 'leurs', 'plus', 'moins', 'chez',
  'faut', 'faire', 'donne', 'donner', 'me', 'moi', 'je', 'tu', 'vous', 'nous',
])

/** Retire accents et ponctuation : « pyélonéphrite » doit matcher « pyelonephrite ». */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
}

/**
 * Racine grossière d'un mot : on retire la marque du pluriel, et rien d'autre.
 *
 * Mesuré sur le document : les mots de la question y figurent TOUS à
 * l'identique, à la seule variation près du singulier/pluriel
 * (« pyélonéphrite » / « pyélonéphrites », « signe » / « signes »). Une vraie
 * recherche floue (distance d'édition) corrigerait des fautes de frappe que
 * personne ne fait ici, et ferait surtout matcher « antibiothérapie » avec
 * « antibiogramme » — deux notions distinctes. On s'arrête donc au pluriel.
 */
function stem(w: string): string {
  return w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w
}

function terms(q: string): string[] {
  return [
    ...new Set(
      normalise(q)
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
        .map(stem),
    ),
  ]
}

/**
 * Découpe le document sur ses titres markdown. Une section = une unité de
 * sens, et son titre voyage avec elle : c'est ce qui permet à l'étudiant de
 * remonter au passage d'origine.
 */
const PAGE_MARK = /<!--page:(\d+)-->/g

export function chunkDocument(md: string): Chunk[] {
  const parts = md.split(/\n(?=#{2,4} )/)
  const chunks: Chunk[] = []
  // La page courante se propage d'une section à l'autre : une section qui ne
  // contient aucun marqueur appartient à la page ouverte par la précédente.
  let page = 1
  // Titres parents en cours, par niveau. Indispensable : une section nommée
  // « 1.2. Traitement » ne contient AUCUN des mots de la question — son sujet
  // (« pyélonéphrite », « sans signe de gravité ») vit dans les titres qui la
  // surplombent. Sans cet héritage, la bonne section est invisible à la
  // recherche, et c'est une voisine hors sujet qui remonte.
  const ancestry: string[] = []

  for (const part of parts) {
    const marks = [...part.matchAll(PAGE_MARK)]
    // La section COMMENCE sur la page ouverte par la section précédente : le
    // texte situé avant son premier marqueur appartient encore à celle-là.
    // Prendre le premier marqueur décalait tout d'une page, et le surlignage
    // tombait sur une page où la phrase n'existe pas.
    const pageForChunk = page
    if (marks.length > 0) page = Number(marks[marks.length - 1][1])

    // Position de chaque marqueur DANS la section : un long passage traverse
    // souvent une frontière de page, et la phrase citée peut donc se trouver
    // sur la page suivante. Sans cette carte, on ouvrirait le PDF sur une page
    // où le texte surligné n'existe pas — le surlignage échouerait en silence.
    const breaks: { at: number; page: number }[] = [{ at: 0, page: pageForChunk }]
    {
      let stripped = 0
      for (const m of marks) {
        breaks.push({ at: (m.index ?? 0) - stripped, page: Number(m[1]) })
        stripped += m[0].length
      }
    }

    const text = part.replace(PAGE_MARK, '').trim()
    if (!text) continue
    const firstLine = text.split('\n')[0]
    const title = firstLine.replace(/^#+\s*/, '').trim()

    const level = (firstLine.match(/^#+/) ?? [''])[0].length
    if (level > 0) {
      ancestry.length = Math.max(0, level - 2)
      ancestry[level - 2] = title
    }
    const path = ancestry.filter(Boolean)

    // Une section réduite à son titre n'apprend rien au modèle.
    if (text.length < 80) continue

    // Une section très longue est recoupée : entière, elle épuiserait à elle
    // seule le budget et serait donc systématiquement écartée — c'est ce qui
    // faisait manquer « 1.2. Traitement » (1 609 tokens), la section qui
    // portait justement la bonne réponse.
    for (const piece of split(text, MAX_CHUNK_CHARS)) {
      chunks.push({
        title,
        path,
        text: piece,
        tokens: Math.ceil(piece.length / 4),
        page: pageForChunk,
        breaks,
      })
    }
  }
  return chunks
}

/** Environ 500 tokens : assez pour un raisonnement complet, assez petit pour en loger plusieurs. */
const MAX_CHUNK_CHARS = 2000

/** Coupe sur des paragraphes entiers, jamais au milieu d'une phrase. */
function split(text: string, max: number): string[] {
  if (text.length <= max) return [text]
  const out: string[] = []
  let buf = ''
  for (const para of text.split(/\n\n+/)) {
    if (buf && buf.length + para.length > max) {
      out.push(buf.trim())
      buf = ''
    }
    buf += (buf ? '\n\n' : '') + para
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

/**
 * La phrase la plus représentative d'un passage retenu — celle qu'on
 * surlignera dans le PDF. On prend la phrase qui concentre le plus de mots
 * de la question, à défaut la première assez longue pour être repérable.
 *
 * Le texte renvoyé doit exister TEL QUEL dans le PDF : `PdfViewer` surligne
 * en comparant au text-layer, donc pas de reformulation ici.
 */
export function bestSentence(chunk: Retrieved): { quote: string; page: number } {
  const [first] = highlightLines(chunk)
  return first ?? { quote: '', page: chunk.page }
}

/**
 * TOUTES les lignes surlignables d'un passage, avec la page de chacune.
 *
 * On surligne l'intégralité du passage, pas une phrase : c'est bien tout ce
 * texte qui a été envoyé au modèle, et n'en éclairer qu'une ligne laisserait
 * croire que le reste n'a pas compté.
 *
 * Chaque ligne est renvoyée séparément parce que `PdfViewer` compare au
 * text-layer du PDF, découpé en fragments : un bloc de plusieurs centaines de
 * caractères n'y correspond jamais, alors qu'une ligne s'y retrouve.
 */
export function highlightLines(chunk: Chunk): { quote: string; page: number }[] {
  const out: { quote: string; page: number }[] = []
  let offset = 0

  for (const raw of chunk.text.split('\n')) {
    // Une ligne de la transcription peut recouvrir DEUX colonnes d'un tableau
    // (« 1 amoxicilline        - nitrofurantoïne ») : recollées, elles ne
    // correspondent à aucun texte réel du PDF. On les sépare sur les grands
    // écarts d'alignement, puis on normalise les espaces restants, absents
    // eux aussi du text-layer.
    const cells = raw
      .replace(/^#+\s*|^-\s*/, '')
      .split(/\s{3,}/)
      .map((c) => c.replace(/\s+/g, ' ').trim())

    for (const line of cells) {
    // Les lignes trop courtes (puces, fragments de tableau) produisent des
    // correspondances fortuites un peu partout dans la page.
    if (line.length > 25 && !line.startsWith('|')) {
      // La page RÉELLE de cette ligne : la dernière frontière franchie avant elle.
      let page = chunk.page
      for (const b of chunk.breaks) {
        if (b.at <= offset) page = b.page
      }
      // Au-delà d'environ 120 caractères, le text-layer découpe la ligne en
      // plusieurs fragments et la correspondance échoue.
      out.push({ quote: line.slice(0, 120), page })
    }
    }
    offset += raw.length + 1
  }
  return out
}

/**
 * Classe les sections par pertinence lexicale et renvoie les meilleures,
 * dans la limite d'un budget de tokens.
 *
 * Le score favorise les sections où PLUSIEURS mots distincts de la question
 * apparaissent : une section qui répète vingt fois « traitement » est moins
 * pertinente qu'une section contenant à la fois « pyélonéphrite », « probabiliste »
 * et « posologie ».
 */
export function retrieve(chunks: Chunk[], question: string, budgetTokens: number): Retrieved[] {
  // Même recentrage que pour la recherche sémantique : « 68 ans » et « 62 kg »
  // n'aident pas davantage un score lexical.
  const want = terms(focusQuery(question))
  if (want.length === 0) return []

  const scored: Retrieved[] = chunks.map((c) => {
    const heading = `${c.path.join(' ')} ${c.title}`
    const hay = normalise(`${heading} ${c.text}`)
    // Comparaison MOT À MOT, pas par sous-chaîne : sans cela « mme » matche
    // « femme », et la question sur Mme D. remontait le chapitre des
    // pyélonéphrites gravidiques — un contresens clinique.
    const words = new Map<string, number>()
    for (const w of hay.split(/\s+/)) {
      const s = stem(w)
      words.set(s, (words.get(s) ?? 0) + 1)
    }

    const matched: string[] = []
    let score = 0
    for (const w of want) {
      const n = words.get(w) ?? 0
      if (n === 0) continue
      matched.push(w)
      // Rendement décroissant : la diversité des mots prime sur la répétition.
      score += 1 + Math.log(n)
      // Un mot présent dans un TITRE (le sien ou celui d'un parent) est un
      // signal bien plus fort qu'une occurrence perdue dans le corps.
      if (normalise(heading).split(/\s+/).map(stem).includes(w)) score += 2
    }
    // Bonus de couverture : trouver 4 mots sur 5 vaut mieux que 1 mot répété.
    score *= matched.length / want.length
    return { ...c, score, matched }
  })

  const ranked = scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score)

  const kept: Retrieved[] = []
  let used = 0
  for (const c of ranked) {
    if (used + c.tokens > budgetTokens) continue
    kept.push(c)
    used += c.tokens
    if (kept.length >= 5) break
  }
  return kept
}

// ---------- Contextes générés (contextual retrieval) ----------

/**
 * Clé de rattachement d'un contexte à son extrait — doit rester identique à
 * `chunkKey()` de `apps/api/scripts/build_contexts.mjs`.
 *
 * Empreinte du texte complet : deux extraits d'une même section partagent
 * souvent leurs premiers caractères et se voleraient leur contexte. Un
 * découpage modifié produit d'autres clés, donc des contextes orphelins que
 * l'on ignore — plutôt que de coller la mauvaise phrase au mauvais extrait.
 *
 * FNV-1a 32 bits, doublé sur deux graines pour se rapprocher des 64 bits :
 * le navigateur n'a pas de SHA-1 synchrone, et une empreinte plus courte
 * ferait courir un risque de collision sur une centaine d'extraits.
 */
export function chunkKey(text: string): string {
  const hash = (seed: number): string => {
    let h = seed
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h.toString(16).padStart(8, '0')
  }
  return hash(0x811c9dc5) + hash(0x9e3779b9)
}

export type ContextMap = Record<string, string>

/**
 * Le texte tel qu'il part à l'indexation : chemin de titres, phrase de
 * situation (si elle existe), puis le passage.
 *
 * Sans la phrase de situation, « 1.2. Traitement » est indiscernable de
 * « 2.2. Traitement » : mesuré sur les vignettes du TD, recall@5 5/6 -> 6/6.
 */
export function indexedText(chunk: Chunk, contexts?: ContextMap): string {
  const heading = [...chunk.path, chunk.title].join(' > ')
  const situation = contexts?.[chunkKey(chunk.text)]
  return `${heading}\n${situation ? situation + '\n' : ''}${chunk.text}`
}

// ---------- Recentrage de la question ----------

/**
 * Retire d'une vignette clinique ce qui n'aide PAS à retrouver le bon
 * chapitre : identité, âge, poids, chiffres de biologie.
 *
 * Pourquoi : le vecteur d'une phrase est une MOYENNE de ses mots. Dans
 * « Mme D., 68 ans, 62 kg. Pyélonéphrite aiguë sans signe de gravité… », les
 * mots qui discriminent (« sans signe de gravité ») pèsent une petite part du
 * total, et se diluent dans le reste. Les chercheurs appellent cela le
 * length-induced embedding collapse.
 *
 * Mesuré sur 6 vignettes du TD : MRR 0,625 -> 0,750 (+20 %) à recall égal.
 *
 * Ce qui est retiré n'est PAS perdu : la question complète part au modèle,
 * telle que l'étudiant l'a écrite. Seule la RECHERCHE travaille sur la
 * version recentrée — exactement ce que fait un moteur qui extrait les
 * mots-clés d'une requête avant d'aller chercher.
 */
const QUERY_NOISE: RegExp[] = [
  /\bmme?\s+\w\.?,?/gi, // « Mme D., »
  /\b\d+\s*ans\b/gi, // âge
  /\b\d+[\s,.]*kg\b/gi, // poids
  /\bdfg\s*(estimé\s*à\s*)?\d+\s*(ml\/min)?\b/gi,
  /\b\d+\s*ml\/min\b/gi,
]

export function focusQuery(question: string): string {
  let out = question
  for (const rule of QUERY_NOISE) out = out.replace(rule, ' ')
  return (
    out
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,?!])/g, '$1')
      // Les signes de ponctuation orphelins laissés par les suppressions.
      .replace(/(^|\s)[.,]+(?=\s|$)/g, ' ')
      // Ponctuation doublée par les suppressions : « gravité.. » -> « gravité. »
      .replace(/([.,?!])\1+/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim() || question
  )
}

// ---------- Recherche sémantique (backend) ----------

/**
 * Demande au backend de classer les passages par proximité de SENS.
 *
 * Renvoie `null` — et non une erreur — si la recherche sémantique n'est pas
 * disponible (modèle absent, backend injoignable). L'appelant retombe alors
 * sur `retrieve()`, la recherche lexicale locale. Une séance ne doit jamais
 * s'arrêter parce qu'une dépendance optionnelle manque.
 */
export async function retrieveSemantic(
  apiBaseUrl: string,
  chunks: Chunk[],
  question: string,
  budgetTokens: number,
  signal?: AbortSignal,
  contexts?: ContextMap,
): Promise<Retrieved[] | null> {
  if (!apiBaseUrl || chunks.length === 0) return null

  // Les titres parents voyagent avec le passage : ils portent le sujet que
  // la section ne répète pas, et le modèle d'embedding en tient compte.
  const passages = chunks.map((c) => indexedText(c, contexts))
  // La recherche travaille sur la question recentrée ; le modèle, lui, reçoit
  // la question entière.
  const focused = focusQuery(question)

  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: focused,
        passages,
        budget_tokens: budgetTokens,
        max_results: 5,
      }),
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { hits?: { index: number; score: number }[] }
    if (!data.hits?.length) return null

    return data.hits
      .filter((h) => chunks[h.index])
      .map((h) => ({
        ...chunks[h.index],
        score: h.score,
        // La recherche sémantique ne raisonne pas sur des mots : il n'y a
        // pas de terme déclencheur à afficher, et en inventer un donnerait
        // une fausse explication.
        matched: [],
      }))
  } catch {
    return null
  }
}

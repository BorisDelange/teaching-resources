// ============================================================
// Génère les « contextes » des extraits d'un document (contextual retrieval).
//
// Le problème : une section intitulée « 1.2. Traitement » ne dit pas DE QUOI
// elle traite. Cherchée seule, elle est indiscernable de « 2.2. Traitement »
// (à risque de complication) ou « 3.2. Traitement » (PNA grave). Le moteur
// de recherche remonte alors le mauvais chapitre, et le modèle répond faux
// en citant une page — le pire des cas.
//
// La parade (Anthropic, « Contextual Retrieval ») : faire écrire par un LLM
// une phrase qui SITUE chaque extrait, et la préfixer au texte avant de
// l'indexer. Mesuré sur les 6 vignettes du TD :
//   sans contexte : recall@5 5/6, MRR 0,667
//   avec contexte : recall@5 6/6, MRR 0,764
//
// Ce script est LENT et coûteux (un appel LLM par extrait). Il ne tourne pas
// en séance : son résultat est versionné, et le front le charge tel quel.
//
//   node scripts/build_contexts.mjs <doc.md> <sortie.json> [url-backend]
//
// Relancer le script sur un document déjà traité ne refait que les extraits
// manquants : on peut donc l'interrompre sans tout perdre.
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const [, , docPath, outPath, apiArg] = process.argv
if (!docPath || !outPath) {
  console.error('usage: node scripts/build_contexts.mjs <doc.md> <sortie.json> [url-backend]')
  process.exit(1)
}
const API = apiArg ?? 'http://localhost:8000'
const MODEL = process.env.CONTEXT_MODEL ?? 'meta-llama/llama-3.3-70b-instruct'

const SYSTEM = `Tu situes un extrait dans une recommandation médicale française.
Écris UNE phrase de 25 mots maximum qui dit de QUEL cas clinique parle cet extrait.
Précise systématiquement, quand l'extrait le concerne : le type d'infection (cystite, pyélonéphrite, infection urinaire masculine),
le terrain (simple, à risque de complication, grave, grossesse), et la nature du propos (diagnostic, traitement probabiliste, relais, durée, suivi).
Réponds UNIQUEMENT par la phrase, sans préambule ni guillemets.`

// ---------- Découpage : COPIE FIDÈLE de retrieval.ts ----------
// Les deux doivent produire les mêmes extraits, sinon les contextes ne se
// rattachent plus à rien. La clé de rattachement (voir chunkKey) est calculée
// sur le texte, donc toute divergence se voit immédiatement à l'exécution.

const PAGE_MARK = /<!--page:(\d+)-->/g
const MAX_CHUNK_CHARS = 2000

function split(text, max) {
  if (text.length <= max) return [text]
  const out = []
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

function chunkDocument(md) {
  const parts = md.split(/\n(?=#{2,4} )/)
  const chunks = []
  let page = 1
  const ancestry = []
  for (const part of parts) {
    const marks = [...part.matchAll(PAGE_MARK)]
    const pageForChunk = page
    if (marks.length > 0) page = Number(marks[marks.length - 1][1])

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
    if (text.length < 80) continue
    for (const piece of split(text, MAX_CHUNK_CHARS)) {
      chunks.push({ title, path, text: piece, page: pageForChunk })
    }
  }
  return chunks
}

/**
 * Clé de rattachement d'un contexte à son extrait.
 *
 * DOIT rester identique à `chunkKey()` de
 * `apps/web/src/features/courses/modules/chatbots/retrieval.ts` — sinon aucun
 * contexte ne se rattache et le gain disparaît en silence. D'où FNV-1a plutôt
 * qu'un hachage de la bibliothèque standard : le navigateur n'a pas de SHA-1
 * synchrone, et c'est le front qui doit pouvoir recalculer la clé.
 *
 * Empreinte du TEXTE COMPLET, et non d'un préfixe : deux extraits d'une même
 * section partagent souvent leurs premiers caractères et se voleraient alors
 * leur contexte.
 */
export function chunkKey(text) {
  const hash = (seed) => {
    let h = seed
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h.toString(16).padStart(8, '0')
  }
  return hash(0x811c9dc5) + hash(0x9e3779b9)
}

/**
 * Nettoie une génération.
 *
 * Llama 3.3 part parfois en boucle de ponctuation (« !!!!!!… ») avant de
 * produire sa phrase : 3 cas sur 50 observés, et précisément sur les extraits
 * cliniques les plus importants. On récupère la phrase quand elle suit, et on
 * rejette ce qui ne ressemble pas à une phrase.
 */
function clean(raw) {
  let t = (raw ?? '').replace(/[!?.]{4,}/g, ' ')
  t = t.split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? ''
  t = t.replace(/^["«\s]+|["»\s]+$/g, '').trim()
  const words = t.split(/\s+/).filter(Boolean).length
  if (words < 4 || words > 40) return ''
  if (/^(voici|la phrase|bien s|d.accord|cet extrait ne)/i.test(t)) return ''
  return t
}

async function ask(chunk, temperature) {
  const prompt = `Titres de section : ${[...chunk.path, chunk.title].join(' > ')}
Page ${chunk.page}.

Extrait :
"""
${chunk.text.slice(0, 2500)}
"""

La phrase de situation :`
  const res = await fetch(`${API.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, system: SYSTEM, temperature }),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return clean((await res.json()).text)
}

const chunks = chunkDocument(readFileSync(docPath, 'utf8'))
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {}
console.log(`${chunks.length} extraits · ${Object.keys(out).length} contextes déjà présents`)

let done = 0
let retried = 0
for (const chunk of chunks) {
  const key = chunkKey(chunk.text)
  if (out[key]) continue
  let text = await ask(chunk, 0.2)
  if (!text) {
    // Une génération illisible se rejoue une fois, plus chaud : à température
    // basse le modèle retombe dans la même boucle.
    retried += 1
    text = await ask(chunk, 0.5)
  }
  // Dernier recours : le chemin de titres. Moins riche, mais jamais faux.
  out[key] = text || `${[...chunk.path, chunk.title].join(' > ')}.`
  done += 1
  if (done % 10 === 0) {
    writeFileSync(outPath, JSON.stringify(out, null, 1))
    console.log(`  ${done} générés…`)
  }
}

writeFileSync(outPath, JSON.stringify(out, null, 1))
console.log(`terminé : ${Object.keys(out).length} contextes (${retried} seconds essais) -> ${outPath}`)

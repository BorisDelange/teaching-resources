// ============================================================
// Export de la séance, pour l'évaluation du TD et la recherche.
//
// Facultatif, soumis à l'accord de l'étudiant (ou du binôme). Le fichier ne contient AUCUNE
// donnée d'identité : ni nom, ni adresse e-mail, ni identifiant de compte.
// Il porte seulement un code tiré au hasard, propre au poste et à la séance.
//
// Les réglages (`td-chatbots-settings`) sont exclus d'office : ils
// contiennent la clé API saisie par l'enseignant.
//
// Tout est relu depuis le localStorage, là où chaque magasin du TD persiste
// déjà son état : l'export n'a besoin d'aucun branchement dans les étapes.
// ============================================================

import { useSyncExternalStore } from 'react'
import type { Lang } from '@/lib/useLang'
import { SELF_ITEM_IDS, readSelfAssessment } from './objectives-store'
import { SCOPES, type Attempt, type Scope } from './sandbox'
import { getSettings } from './settings'

const SESSION_KEY = 'td-chatbots-session-id'
const DECISION_KEY = 'td-chatbots-export'

/**
 * Ce qui SURVIT à « Effacer ce poste » : la configuration de l'enseignant et
 * l'agencement de l'écran. Tout le reste appartient aux étudiants.
 */
const KEPT_KEYS = new Set([
  'td-chatbots-settings',
  'td-chatbots-timer',
  'td-chatbots-panes',
  'td-chatbots-columns',
])

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function sandboxKey(scope: Scope): string {
  return scope === 'warmup' ? 'td-chatbots-sandbox' : `td-chatbots-sandbox-${scope}`
}

/** Code aléatoire du poste pour cette séance ; regénéré après effacement. */
function sessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

type Usage = { prompt: number; completion: number; total: number }

function addUsage(acc: Usage, u?: Usage): Usage {
  if (!u) return acc
  return {
    prompt: acc.prompt + (u.prompt ?? 0),
    completion: acc.completion + (u.completion ?? 0),
    total: acc.total + (u.total ?? 0),
  }
}

export function buildExport(lang: Lang) {
  const attempts = SCOPES.flatMap((scope) =>
    readJson<Attempt[]>(sandboxKey(scope), []).map((a) => ({
      scope,
      order: a.order,
      at: a.at,
      modelId: a.modelId,
      source: a.source,
      levelId: a.levelId,
      sampling: a.sampling,
      prompt: a.prompt,
      answer: a.answer,
      judgement: a.judgement ?? null,
      usage: a.usage ?? null,
      // Le résumé produit en mode « mémoire résumée » : le texte et son coût,
      // sans le prompt de synthèse, identique pour tous les postes.
      summary: a.summary ? { text: a.summary.text, usage: a.summary.usage ?? null } : undefined,
    })),
  )

  const zero: Usage = { prompt: 0, completion: 0, total: 0 }
  const usageByModel: Record<string, Usage> = {}
  let usageTotal = zero
  for (const a of attempts) {
    const u = addUsage(addUsage(zero, a.usage ?? undefined), a.summary?.usage ?? undefined)
    usageByModel[a.modelId] = addUsage(usageByModel[a.modelId] ?? zero, u)
    usageTotal = addUsage(usageTotal, u)
  }

  // Seul le rejugement du débrief nous intéresse dans l'état d'interface : le
  // reste (brouillons, panneaux ouverts) n'est que de la mise en page.
  const rejudge = Object.fromEntries(
    SCOPES.map((scope) => {
      const st = readJson<{ rejudge?: unknown; rejudgeDone?: boolean }>(`td-chatbots-step-${scope}`, {})
      return [scope, st.rejudge ? { judgements: st.rejudge, done: !!st.rejudgeDone } : null]
    }).filter(([, v]) => v),
  )

  const self = readSelfAssessment()

  return {
    schema: 'td-chatbots-export/1',
    sessionId: sessionId(),
    exportedAt: new Date().toISOString(),
    lang,
    provider: getSettings().provider.id,
    // Notes de 1 à 5, item par item, dans l'ordre de `items`.
    selfAssessment: {
      items: SELF_ITEM_IDS,
      start: self.start,
      end: self.end,
    },
    attempts,
    rejudge,
    votes: readJson<Record<string, string>>('td-chatbots-votes', {}),
    skills: readJson<{ unlocked?: string[] }>('td-chatbots-skills', {}).unlocked ?? [],
    usage: { total: usageTotal, byModel: usageByModel },
  }
}

export type ExportPayload = ReturnType<typeof buildExport>

export function exportFileName(payload: ExportPayload): string {
  return `td-chatbots-${payload.sessionId.slice(0, 8)}.json`
}

export function downloadExport(payload: ExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName(payload)
  a.click()
  URL.revokeObjectURL(url)
}

// ---------- Décision de l'étudiant ----------

export interface ExportDecision {
  choice: 'accepted' | 'refused'
  at: string
}

const listeners = new Set<() => void>()
let decisionCache: ExportDecision | null | undefined

function readDecision(): ExportDecision | null {
  if (decisionCache === undefined) decisionCache = readJson<ExportDecision | null>(DECISION_KEY, null)
  return decisionCache
}

export function recordDecision(choice: ExportDecision['choice']): void {
  decisionCache = { choice, at: new Date().toISOString() }
  try {
    localStorage.setItem(DECISION_KEY, JSON.stringify(decisionCache))
  } catch {
    // La décision vit alors le temps de la page.
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useExportDecision(): ExportDecision | null {
  return useSyncExternalStore(subscribe, readDecision, readDecision)
}

/**
 * Efface tout ce que les étudiants ont laissé sur le poste, avant le groupe
 * suivant. Rechargement complet ensuite : chaque magasin garde un cache en
 * mémoire, et seul un rechargement les vide tous à coup sûr.
 */
export function clearStationAndRestart(): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    keys
      .filter((k): k is string => !!k && k.startsWith('td-chatbots-') && !KEPT_KEYS.has(k))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // Rien à effacer sans localStorage.
  }
  const url = new URL(location.href)
  url.searchParams.set('step', 'intro')
  location.assign(url.toString())
}

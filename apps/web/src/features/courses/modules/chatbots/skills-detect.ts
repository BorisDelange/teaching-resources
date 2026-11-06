// ============================================================
// Ce qui compte comme « compétence acquise », lu dans l'historique réel.
//
// Aucune de ces conditions ne se satisfait en cliquant : chacune demande
// d'avoir envoyé quelque chose ET, le plus souvent, de l'avoir envoyé DEUX
// FOIS dans des conditions différentes. C'est l'écart entre les deux qui
// constitue la leçon — et la seule preuve qu'elle a été vue.
//
// Tout se déduit de ce qui est déjà persisté (essais, réglages, progression) :
// rien n'est instrumenté dans les composants, donc rien ne peut se désynchro-
// niser d'eux. Le prix à payer est que ces conditions sont RÉVOCABLES si
// l'étudiant efface son historique — d'où le verrouillage dans `skills.ts`.
// ============================================================

import type { ScopedAttempt } from './sandbox'
import type { Progress } from './progress'
import { PROMPT_LEVELS } from './prompt-data'

export function detectSkills(
  all: ScopedAttempt[],
  progress: Progress,
  systemPrompt: string | null,
): string[] {
  const earned: string[] = []
  const of = (scope: string) => all.filter((a) => a.scope === scope)

  // ---------- Échauffement ----------

  // Juger, c'est trancher : trois réponses passées au crible, à l'aveugle.
  if (of('warmup').filter((a) => a.judgement).length >= 3) earned.push('blind-judgement')

  // ---------- Recommandations ----------

  if (progress.seenGuidelines) earned.push('guidelines')

  // ---------- Le prompt ----------

  const prompt = of('prompt')
  const levels = new Set(prompt.map((a) => a.levelId).filter(Boolean))

  // Le contexte se constate par CONTRASTE : la question brute, puis la même
  // enrichie. Débloquer sur le seul palier 2 laisserait croire que le contexte
  // est un réglage, alors que c'est un écart qu'on observe.
  if (levels.has('raw') && levels.has('context')) earned.push('context')

  if (levels.size === PROMPT_LEVELS.length) earned.push('prompting')

  // Le palier 3 est celui qui exige une source — et fabrique donc la
  // référence inventée. Le palier 4 la conserve.
  if (levels.has('role-source') || levels.has('humility')) earned.push('fake-source')

  // ---------- Le hasard ----------

  // Deux températures : une seule ne prouve rien, c'est la comparaison qui
  // enseigne. `sampling` est enregistré avec l'essai, donc la valeur relue est
  // bien celle qui a produit CETTE réponse.
  const temps = new Set(
    of('settings')
      .map((a) => a.sampling?.temperature)
      .filter((t): t is number => t !== undefined),
  )
  if (temps.size >= 2) earned.push('temperature')

  // ---------- La consigne système ----------

  // `systemPrompt !== null` est le signal officiel « modifiée par rapport au
  // défaut » (voir settings.ts). Mais l'avoir tapée ne suffit pas : on exige
  // aussi un envoi, sinon la compétence se gagnerait en fermant le modal. La
  // consigne modifiée doit donc être partie dans au moins une requête.
  const sentWithCustomSystem =
    systemPrompt !== null &&
    all.some((a) => {
      const used = a.sent?.find((m) => m.role === 'system')?.content
      // Chaîne vide = choix explicite de n'envoyer aucune consigne : l'essai
      // ne porte alors aucun message « system », et c'est bien la preuve.
      return systemPrompt === '' ? !used : used === systemPrompt
    })
  if (sentWithCustomSystem) earned.push('system-prompt')

  // ---------- La mémoire ----------

  // Le contraste, encore : une question de suivi SANS mémoire (le modèle perd
  // le fil), puis une conversation AVEC. Le renvoi de l'historique se vérifie
  // dans la charge utile, pas sur le mode affiché.
  const noMemory = of('memory-none').length >= 2
  const withMemory = [...of('memory-full'), ...of('memory-summary')].some((a) =>
    a.sent?.some((m) => m.role === 'memory-question' || m.role === 'memory-answer'),
  )
  if (noMemory && withMemory) earned.push('memory')

  // ---------- Les documents ----------

  const docs = of('documents')
  const withoutDoc = docs.some((a) => !a.levelId)
  const withDoc = docs.some((a) => !!a.levelId)
  if (withoutDoc && withDoc) earned.push('documents')


  // ---------- La synthèse ----------

  // Le même texte, deux modèles. L'étape ne vide pas le champ après envoi,
  // précisément pour rendre ce geste possible — la chaîne se répète donc à
  // l'identique, et la comparaison est fiable.
  const byPrompt = new Map<string, Set<string>>()
  for (const a of of('synthesis')) {
    const key = a.prompt.trim()
    const set = byPrompt.get(key) ?? new Set<string>()
    set.add(a.modelId)
    byPrompt.set(key, set)
  }
  if ([...byPrompt.values()].some((s) => s.size >= 2)) earned.push('robust-prompt')

  return earned
}

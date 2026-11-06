// ============================================================
// Le guetteur : relie l'historique réel aux annonces à l'écran.
//
// Monté UNE SEULE FOIS, dans la coquille du TD. Les étapes n'ont donc rien à
// déclarer : elles enregistrent leurs essais comme avant, et les compétences
// s'en déduisent. Aucun risque qu'une étape oublie d'annoncer un déblocage,
// ni qu'elle en annonce un qu'elle n'a pas mérité.
//
// Deux registres d'annonce, comme convenu :
//   - compétence  → une carte discrète en bas à droite, qui s'efface seule ;
//   - palier      → un modal, avec confettis.
// Le spectacle est réservé aux paliers : onze modaux sur deux heures
// couperaient le fil du raisonnement clinique à chaque fois.
// ============================================================

import { useEffect, useState } from 'react'
import { Award, X } from 'lucide-react'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr } from './data'
import { bold } from './chat-format'
import { useAllAttempts } from './sandbox'
import { useProgress } from './progress'
import { useSettings } from './settings'
import { detectSkills } from './skills-detect'
import { dismissUnlock, syncSkills, skillById, useSkills, useUnlockQueue } from './skills'
import { LevelDialog } from './SkillsUi'
import { levelFor } from './skills-data'

/** Durée d'affichage d'une carte de compétence, en ms. */
const TOAST_MS = 7000

export function SkillsWatcher({ lang }: { lang: Lang }) {
  const attempts = useAllAttempts()
  const [progress] = useProgress()
  const [settings] = useSettings()
  const { count } = useSkills()

  // Le calcul écrit dans le magasin ; l'affichage s'y abonne. Aucun `setState`
  // ici, donc aucun rendu en cascade — c'est le magasin qui notifie.
  const queue = useUnlockQueue()

  useEffect(() => {
    syncSkills(detectSkills(attempts, progress, settings.systemPrompt))
  }, [attempts, progress, settings.systemPrompt])

  /** Les cartes s'effacent seules ; le modal, lui, attend un clic. */
  useEffect(() => {
    if (queue.length === 0) return
    const timers = queue.map((e) => setTimeout(() => dismissUnlock(e), TOAST_MS))
    return () => timers.forEach(clearTimeout)
  }, [queue])

  const toasts = queue.flatMap((e) => e.skillIds)

  // Le palier franchi ne s'efface PAS avec les cartes : il attend son clic.
  //
  // L'état de départ est le niveau DÉJÀ atteint au montage : sans cela, un
  // étudiant qui revient après une pause se verrait refêter son niveau 3 à
  // chaque rechargement de page. Seules les montées ultérieures ouvrent le
  // modal — même règle que l'amorçage des compétences.
  const [seenLevel, setSeenLevel] = useState<number | null>(() => levelFor(count)?.n ?? null)
  const current = levelFor(count)
  const level = current && current.n !== seenLevel ? current.n : null

  return (
    <>
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
          {toasts.map((id) => {
            const skill = skillById(id)
            if (!skill) return null
            const Icon = skill.icon
            return (
              <div
                key={id}
                className="pointer-events-auto flex gap-2.5 rounded-lg border border-emerald-500/40 bg-[var(--color-card)] p-3 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <Icon className="size-3.5 text-emerald-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Award className="size-3 shrink-0" />
                    {pick(lang, 'Compétence débloquée', 'Skill unlocked')}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{tr(lang, skill.label)}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
                    {bold(tr(lang, skill.insight))}
                  </p>
                </div>
                <button
                  onClick={() => queue.forEach(dismissUnlock)}
                  className="shrink-0 cursor-pointer self-start text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                  aria-label={pick(lang, 'Fermer', 'Dismiss')}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <LevelDialog lang={lang} level={level} count={count} onClose={() => setSeenLevel(level)} />
    </>
  )
}

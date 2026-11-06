// ============================================================
// Rendu léger du balisage présent dans les textes de consigne du TD,
// et vocabulaire des jugements. Séparé de `chat-ui.tsx` : ces
// fonctions et constantes ne sont pas des composants.
// ============================================================

import { CircleHelp, ThumbsDown, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TokenUsage } from './client'

/**
 * Vitesse de génération, en tokens par seconde. `null` si la mesure n'est
 * pas disponible. On rapporte les tokens de SORTIE à la seule durée de
 * génération : y inclure l'attente initiale mélangerait deux phénomènes —
 * la lecture de la requête et l'écriture de la réponse.
 */
export function tokensPerSecond(usage: TokenUsage): number | null {
  if (!usage.genMs || usage.genMs <= 0 || !usage.completion) return null
  return Math.round((usage.completion / usage.genMs) * 1000)
}
import type { Localized } from './data'
import type { Judgement } from './sandbox'

/** Rend les **passages en gras**. */
export function bold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-[var(--color-foreground)]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

/**
 * Aère un bloc d'observation en petits paragraphes, gras conservé. Ces
 * textes enchaînent plusieurs constats : en pavé compact on n'en lit aucun,
 * mais une phrase par ligne hache la lecture. On groupe donc par deux.
 *
 * La coupure se fait après . ! ? — mais pas après une abréviation courante
 * ni un nombre décimal, qui casseraient la phrase au mauvais endroit.
 */
const PER_PARAGRAPH = 2

export function sentences(text: string) {
  const parts = text
    .split(/(?<![A-Z][a-z]{1,3}|\d)([.!?])\s+(?=[A-ZÀ-Þ«])/g)
    .reduce<string[]>((acc, chunk, i) => {
      if (i % 2 === 1) acc[acc.length - 1] += chunk
      else acc.push(chunk)
      return acc
    }, [])
    .map((s) => s.trim())
    .filter(Boolean)

  const groups: string[] = []
  for (let i = 0; i < parts.length; i += PER_PARAGRAPH) {
    groups.push(parts.slice(i, i + PER_PARAGRAPH).join(' '))
  }

  return groups.map((g, i) => (
    <span key={i} className={cn('block', i > 0 && 'mt-2')}>
      {bold(g)}
    </span>
  ))
}

/** Rend les *passages en italique*. */
export function emphasise(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
      <em key={i} className="italic text-[var(--color-foreground)]">
        {part.slice(1, -1)}
      </em>
    ) : (
      part
    ),
  )
}

export const JUDGEMENTS: {
  value: Judgement
  icon: typeof ThumbsUp
  label: Localized
  tone: string
  /** La même teinte au survol : on voit le bouton s'allumer avant de cliquer. */
  hover: string
  dot: string
}[] = [
  {
    value: 'plausible',
    icon: ThumbsUp,
    label: { fr: 'Juste', en: 'Right' },
    tone: 'border-emerald-500 bg-emerald-500/10 text-emerald-600',
    hover: 'hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600',
    dot: 'bg-emerald-500',
  },
  {
    value: 'unsure',
    icon: CircleHelp,
    label: { fr: 'Je ne sais pas', en: 'Not sure' },
    tone: 'border-amber-500 bg-amber-500/10 text-amber-600',
    hover: 'hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-600',
    dot: 'bg-amber-500',
  },
  {
    value: 'wrong',
    icon: ThumbsDown,
    label: { fr: 'Faux', en: 'Wrong' },
    tone: 'border-red-500 bg-red-500/10 text-red-600',
    hover: 'hover:border-red-500 hover:bg-red-500/10 hover:text-red-600',
    dot: 'bg-red-500',
  },
]

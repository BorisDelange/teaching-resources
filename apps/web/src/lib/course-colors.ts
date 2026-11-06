import type { ModuleColor } from '@/content/courses'

/**
 * Pastilles colorees des cartes (cours et modules).
 *
 * Partage entre la page d'accueil et la page d'un cours : les deux ecrans
 * affichent les memes couleurs, et une seule table evite qu'ils divergent.
 */
export const CARD_COLORS: Record<ModuleColor, string> = {
  blue: 'bg-blue-500/12 text-blue-600 dark:text-blue-300',
  green: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
  yellow: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  red: 'bg-red-500/12 text-red-600 dark:text-red-300',
}

/** Bordure de la carte au survol (sur la carte elle-meme). */
export const CARD_HOVER_BORDER: Record<ModuleColor, string> = {
  blue: 'hover:border-blue-500/40',
  green: 'hover:border-emerald-500/40',
  yellow: 'hover:border-amber-500/40',
  red: 'hover:border-red-500/40',
}

/** Titre teinte au survol de la carte (sur le titre, via `group`). */
export const CARD_HOVER_TITLE: Record<ModuleColor, string> = {
  blue: 'group-hover:text-blue-600',
  green: 'group-hover:text-emerald-600',
  yellow: 'group-hover:text-amber-600',
  red: 'group-hover:text-red-600',
}

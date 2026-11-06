import { cn } from '@/lib/utils'

/**
 * Les classes partagées du TD qui ne sont pas des composants.
 *
 * Séparées de `blocks.tsx` : un fichier qui exporte à la fois des composants et
 * des fonctions casse le rafraîchissement à chaud de Vite.
 */

/**
 * Une pastille de sélection — choisir une variable, un patient, un préréglage.
 *
 * `on` est l'état sélectionné, et doit se lire *sans lever le curseur* : le
 * survol de l'état inactif teintait le fond et le texte du même bleu pâle que
 * la sélection, si bien qu'une pastille survolée était indiscernable d'une
 * pastille cochée. L'état retenu est donc marqué par un aplat plein et un texte
 * blanc, que le survol d'une pastille libre ne peut pas imiter ; celui-ci se
 * contente d'un fond gris neutre, qui dit « cliquable » sans dire « choisi ».
 */
export function pillClass(on: boolean, size: 'xs' | 'sm' = 'xs'): string {
  return cn(
    'cursor-pointer rounded-full border px-3 py-1 font-medium transition-colors',
    size === 'sm' ? 'text-sm' : 'text-xs',
    on
      ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-blue-500/60 hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
  )
}

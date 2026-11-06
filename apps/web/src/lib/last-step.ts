/**
 * La dernière étape visitée dans chaque module à étapes.
 *
 * Les TD sont longs — huit à onze étapes. Quitter le TD pour consulter un cours
 * puis y revenir renvoyait à l'introduction, et il fallait refaire tout le
 * chemin. On garde donc, par module, la dernière étape vue, et les liens de la
 * barre latérale y ramènent.
 *
 * Persisté : une séance de TD s'étale sur deux heures, et un rafraîchissement
 * accidentel ne doit pas coûter la progression. Les étapes vivant déjà dans
 * l'URL (`?step=`), un lien copié-collé reste prioritaire sur ce souvenir.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router'

const KEY = 'module-last-step'

type Steps = Record<string, string>

let cache: Steps | null = null

function read(): Steps {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as Steps) : {}
  } catch {
    cache = {}
  }
  return cache
}

/** Retient l'étape courante d'un module. */
export function rememberStep(moduleKey: string, step: string): void {
  const next = { ...read(), [moduleKey]: step }
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Ignore : environnement sans localStorage.
  }
}

/**
 * Retient l'étape en déduisant la clef de l'URL courante.
 *
 * Préférable à une clef écrite en dur dans le module : celle-ci doit
 * correspondre exactement au couple cours/module de `courses.ts`, et une
 * faute de frappe ne se verrait pas — le souvenir serait simplement rangé
 * sous un nom que la barre latérale ne consulte jamais.
 */
export function useRememberStep(step: string): void {
  // Le chemin du routeur, sans le sous-chemin du site (`basename`).
  const { pathname } = useLocation()
  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean)
    // `/courses/:courseSlug/:moduleSlug`
    if (parts[0] !== 'courses' || parts.length < 3) return
    rememberStep(`${parts[1]}/${parts[2]}`, step)
  }, [pathname, step])
}

/** L'étape retenue pour un module, s'il y en a une. */
export function lastStep(moduleKey: string): string | undefined {
  return read()[moduleKey]
}

/**
 * Le lien vers un module, ramenant à l'étape où on l'avait laissé.
 *
 * Lu au moment du rendu du lien plutôt que conservé dans un état React : la
 * barre latérale n'a pas à se réafficher à chaque changement d'étape, il suffit
 * que le lien soit juste quand on clique dessus.
 */
export function moduleHref(courseSlug: string, moduleSlug: string): string {
  const step = lastStep(`${courseSlug}/${moduleSlug}`)
  const base = `/courses/${courseSlug}/${moduleSlug}`
  return step ? `${base}?step=${step}` : base
}

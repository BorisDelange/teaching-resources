import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Préfixe un chemin absolu par le sous-chemin du site (`VITE_BASE`).
 *
 * Vite ne réécrit que les URLs d'`index.html` et des imports : un chemin écrit
 * en dur dans le code ("/logo.png") vise la racine du domaine, ce qui donne un
 * 404 dès que le site est servi sous un sous-chemin (GitHub Pages).
 */
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

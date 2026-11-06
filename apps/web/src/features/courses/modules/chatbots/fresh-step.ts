import { createContext } from 'react'

/**
 * Vrai tant que l'étudiant n'a rien envoyé dans l'exercice : le bouton
 * « Consignes » se signale alors, pour qu'on les lise avant de se lancer.
 */
export const FreshStep = createContext(false)

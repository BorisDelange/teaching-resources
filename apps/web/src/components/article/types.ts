import type { ReactNode } from 'react'

/**
 * Un cours s'écrit une seule fois, en sections typées, et se rend de deux
 * façons : lecture linéaire (révision à la maison) et diapositives
 * (projection pendant le TD). Dupliquer le contenu pour obtenir les deux
 * reviendrait à le faire diverger dès la première correction.
 *
 * `reading` porte le développement complet ; `slide` ne porte que ce qui doit
 * être projeté. Une section sans `slide` est sautée en mode diapos — c'est
 * ainsi qu'on obtient une projection plus synthétique que le texte.
 */
export interface CourseSection {
  /** Ancre d'URL et cible du sommaire. */
  id: string
  title: string
  /** Sous-section : indentée dans le sommaire, `h3` au lieu de `h2`. */
  level?: 2 | 3
  /** Version lue : prose complète, encadrés, interactifs. */
  reading: ReactNode
  slide?: Slide
}

/**
 * Une diapositive porte une idée et, autant que possible, un schéma qui la
 * montre. Le texte projeté reste court : c'est l'enseignant qui développe.
 */
export interface Slide {
  /** Titre projeté s'il doit différer de celui de la section. */
  title?: string
  /** Accroche courte sous le titre, en gros caractères. */
  lead?: ReactNode
  /** Schéma de la diapositive : c'est lui qui porte l'essentiel du propos. */
  figure?: ReactNode
  /** Points courts, affichés sous le schéma. */
  points?: ReactNode[]
  /** Bandeau de mise en garde, en bas de diapositive. */
  punch?: ReactNode
}

export interface CourseArticle {
  slug: string
  title: string
  description: string
  /** Durée de lecture affichée, en minutes. */
  minutes: number
  /** Rang affiché en tête, façon « 1/2 ». */
  index?: string
  summary: ReactNode
  sections: CourseSection[]
  takeaways: ReactNode[]
  /** Lien « article suivant » en pied de page. */
  next?: { href: string; title: string }
}

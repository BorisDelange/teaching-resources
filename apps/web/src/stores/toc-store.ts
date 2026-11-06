import { create } from 'zustand'

/**
 * Sommaire publié par la page en cours, consommé par la barre latérale droite
 * de la coquille. Il vit dans un store plutôt que dans la mise en page de
 * l'article, car la barre est un frère de la zone de contenu : elle doit être
 * de pleine hauteur et rester en place quand l'article défile.
 */
export interface TocEntry {
  id: string
  title: string
  level?: 2 | 3
}

interface TocState {
  entries: TocEntry[]
  setEntries: (entries: TocEntry[]) => void
}

export const useTocStore = create<TocState>()((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
}))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'fr'

interface AppState {
  darkMode: boolean
  language: Language
  sidebarCollapsed: boolean
  /** Sommaire « Sur cette page », à droite des cours en mode article. */
  tocCollapsed: boolean
  toggleDarkMode: () => void
  setLanguage: (language: Language) => void
  toggleSidebar: () => void
  toggleToc: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      darkMode: false,
      language: 'fr',
      sidebarCollapsed: false,
      tocCollapsed: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleToc: () => set((state) => ({ tocCollapsed: !state.tocCollapsed })),
    }),
    { name: 'app-preferences' },
  ),
)

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * URL du backend (apps/api) utilisée par défaut dans les TD.
   * Se règle dans `apps/web/.env.local` (gitignored), par exemple
   * quand le port 8000 est déjà occupé sur la machine.
   */
  readonly VITE_API_URL?: string
  /**
   * '1' quand le site est servi par le backend lui-même (build `build:server`,
   * image Docker d'`apps/api`). L'API est alors sur la même origine que la page.
   */
  readonly VITE_SAME_ORIGIN?: string
  /** '1' pour un build sans backend (GitLab Pages). Voir `CLIENT_ONLY`. */
  readonly VITE_CLIENT_ONLY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  // Chemins ABSOLUS ("/"), et non relatifs ("./") : le fallback SPA sert le
  // meme HTML sur des routes profondes (/courses/llm/intro), ou "./assets/…"
  // se resoudrait en "/courses/llm/assets/…" — donc 404, et un module bloque
  // pour cause de type MIME "text/html" (la page d'erreur du serveur).
  // Frama.io sert le projet a la racine de son sous-domaine ; pour des Pages
  // sur un sous-chemin, definir VITE_BASE (ex. "/my-repo/").
  base: process.env.VITE_BASE || '/',
  // Vite ne remplace `import.meta.env.VITE_*` qu'à partir des fichiers `.env` :
  // une variable passée par le shell (`VITE_CLIENT_ONLY=1 vite build`, comme le
  // fait la CI) serait ignorée en silence. On l'injecte donc explicitement,
  // sans quoi le site déployé se croirait connecté à un backend inexistant.
  define: {
    'import.meta.env.VITE_CLIENT_ONLY': JSON.stringify(process.env.VITE_CLIENT_ONLY ?? ''),
    'import.meta.env.VITE_SAME_ORIGIN': JSON.stringify(process.env.VITE_SAME_ORIGIN ?? ''),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
})

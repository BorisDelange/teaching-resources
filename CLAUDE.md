# CLAUDE.md — Ressources pédagogiques

Educational website for medical students (University of Rennes). Interactive course modules on AI and predictive-model evaluation, complementing the Moodle courses.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui, with Zustand (UI state), TanStack Query (unused for now — client-only site), react-i18next (fr default, en available), Plotly (`plotly.js-dist-min` via `@/components/PlotlyChart`), and MathJax (`better-react-mathjax`, provider in `main.tsx`). Single frontend app at `apps/web`, deployed as a static site.

```bash
npm run dev      # dev server, port 3000
npm run build    # type-check + production build (must pass)
npm run lint     # eslint (must pass)
```

## Architecture

- **Content model** — `apps/web/src/content/courses.ts` defines `COURSES`: each course has `slug`, `title`, `description`, `promos` (badges like `DFGSM3`), and `modules`. Each module points to a React component. This drives the home page, course pages, and routing.
- **Routing** (`src/app/App.tsx`) — `/` (home, flat course list), `/courses/:courseSlug` (module grid), `/courses/:courseSlug/:moduleSlug` (renders the module component), `/settings`.
- **Home page lists ALL courses flat**, each showing promo badges — no promo-level navigation. To indicate which cohort a course targets, add promo strings to that course's `promos`.
- **Modules** live in `src/features/courses/modules/*.tsx` — one self-contained component per module, all state via React hooks (no direct DOM manipulation).
- **Shell** — `components/layout/` (AppShell, HeaderNav/Sidebar, HeaderControls with language/theme/contact). Contact info is in the `ContactDialog` component + `contact.*` i18n keys.

## Rules (apply to every task)

### Color palette — use ONLY these accents
- **Blue** (`blue-500/600`) — primary, links, highlights
- **Green** (`emerald-500/600`) — success, positive feedback
- **Amber** (`amber-500/600`) — warnings, emphasis
- **Red** (`red-500/600`) — errors, alerts
- **Slate** — neutral/muted only

**Never** purple/violet or any color outside this palette. For surfaces/text use the theme CSS vars (`var(--color-foreground)`, `var(--color-muted-foreground)`, `bg-[var(--color-card)]`, `border`) so light and dark mode both work.

### Icons — Lucide only
Use `lucide-react`. No emoji, no FontAwesome, no other icon libraries. Use icons in buttons, cards, and widgets — not in body prose or plain titles. Keep them purposeful.

### Typography (French conventions)
Sentence case for titles — capitalize only the first word and proper nouns. ✅ "Grands modèles de langage" ❌ "Grands Modèles De Langage".

### Content
- Audience: **DFGSM3** (3rd-year medical students). Clear, accessible French; explain jargon; use realistic medical examples (HAS, PubMed, clinical scenarios).
- All user-facing chrome text goes through `t('key')` with keys in **both** `src/locales/fr.json` and `en.json`. Course *content* is French domain material and lives in the module components.

### Components & state
- **shadcn/ui first** — build UI from `@/components/ui/*` (Button, Card, Input, Label, Tabs, Badge, Dialog, Select…). Add new ones with the shadcn CLI before hand-rolling. `ui/` is vendored (excluded from lint).
- Path alias `@/` for `apps/web/src`. `cn()` at `@/lib/utils`.
- File naming: kebab-case files; page/feature components are `PascalCasePage.tsx` / `PascalCaseModule.tsx`.
- All Tailwind — **no `<style>` tags, no separate CSS files** (theme tokens live in `src/index.css`).
- Interactive elements use React state; no `document.getElementById`. Render declaratively.
- Charts via `PlotlyChart`; formulas via `<MathJax dynamic>{`$$...$$`}</MathJax>`.
- Comments only when the *why* is non-obvious. Never narrate what the code does.

### Verifying
Before considering a change done, from `apps/web`: `npm run lint` and `npm run build` must both pass.

## Adding content

- **New module** — create `src/features/courses/modules/<Name>Module.tsx`, then register it in the course's `modules` array in `content/courses.ts` (slug, title, description, Lucide `icon`, `color`).
- **New course** — add an entry to `COURSES` with its `promos` and `modules`.

// ============================================================
// Composants d'interaction du TD chatbots.
//   - ModelAnswerCard : une réponse de modèle + vote vrai/faux (aveugle),
//     puis révélation (identité + verdict + critique).
//   - SettingsPanel   : réglages API / clé Mistral / mode démo.
// ============================================================

import { useState } from 'react'
import {
  Bot,
  Check,
  Code2,
  X,
  Loader2,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  MessageSquare,
  WifiOff,
  Timer,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { paramsLabel, tr, type TdModel } from './data'
import type { ChatResult } from './client'
import { CLIENT_ONLY, providerShape, useSettings, tdModels } from './settings'
import { presetOf } from './providers'
import { ProviderSettings } from './ProviderSettings'
import { ModelsSettings } from './ModelsSettings'
import { DefaultsSettings } from './DefaultsSettings'
import { TimerSettings } from './TimerSettings'
import { useVotes, voteKey, type VoteValue } from './vote'

// ---------- Rendu léger du texte d'une réponse (tables markdown + lignes) ----------

/**
 * Affiche le texte d'une réponse en préservant la mise en forme utile :
 * les tableaux markdown (lignes `| … | … |`) sont rendus comme de vrais tableaux,
 * le reste en paragraphes avec sauts de ligne conservés.
 */
export function AnswerText({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  const isTableRow = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|')
  const isSeparator = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes('-')

  while (i < lines.length) {
    if (isTableRow(lines[i])) {
      const rows: string[] = []
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i])
        i++
      }
      const cells = rows
        .filter((r) => !isSeparator(r))
        .map((r) =>
          r
            .trim()
            .replace(/^\||\|$/g, '')
            .split('|')
            .map((c) => c.trim()),
        )
      const [head, ...body] = cells
      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            {head && (
              <thead>
                <tr>
                  {head.map((c, ci) => (
                    <th
                      key={ci}
                      className="border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1 text-left font-semibold"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td key={ci} className="border border-[var(--color-border)] px-2 py-1">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else {
      // Regroupe les lignes non-table consécutives en un paragraphe.
      const para: string[] = []
      while (i < lines.length && !isTableRow(lines[i])) {
        para.push(lines[i])
        i++
      }
      const content = para.join('\n').trim()
      if (content) {
        blocks.push(
          <p key={key++} className="whitespace-pre-wrap">
            {content}
          </p>,
        )
      }
    }
  }

  return <div className="flex flex-col gap-1">{blocks}</div>
}

// ---------- Bulle « prompt utilisé » (tooltip au survol) ----------

/**
 * Icône de bulle de discussion : au survol, révèle le prompt exact qui a
 * produit la réponse. Tooltip CSS pur (fond noir, texte blanc, coins arrondis),
 * sans dépendance ni portail — conforme CSP.
 */
function PromptBubble({ lang, prompt }: { lang: Lang; prompt: string }) {
  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        aria-label={pick(lang, 'Voir le prompt utilisé', 'Show the prompt used')}
        className="flex cursor-help items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-300"
      >
        <MessageSquare className="size-3" />
        {pick(lang, 'prompt', 'prompt')}
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 w-80 max-w-[80vw] whitespace-pre-wrap rounded-lg bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {pick(lang, 'Prompt envoyé au modèle', 'Prompt sent to the model')}
        </span>
        {prompt}
      </div>
    </div>
  )
}

// ---------- Carte réponse + vote ----------

export function ModelAnswerCard({
  lang,
  model,
  promptKind,
  result,
  loading,
  revealed,
  promptText,
}: {
  lang: Lang
  model: TdModel
  promptKind: string
  result?: ChatResult
  loading?: boolean
  /** false = phase de vote aveugle ; true = évaluation (identité + verdict visibles). */
  revealed: boolean
  /** Prompt exact ayant produit la réponse — affiché en tooltip (mode révélé). */
  promptText?: string
}) {
  const { votes, vote } = useVotes()
  const key = voteKey(model.id, promptKind)
  const current = votes[key]

  const verdict = result?.demo?.verdict
  const critique = result?.demo?.critique

  return (
    <Card
      className={cn(
        'h-full border-l-4 py-0',
        revealed && verdict === 'correct' && 'border-l-emerald-500',
        revealed && verdict === 'partial' && 'border-l-amber-500',
        revealed && verdict === 'wrong' && 'border-l-red-500',
        !revealed && 'border-l-slate-400',
      )}
    >
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-slate-500/15 text-sm font-bold text-slate-600 dark:text-slate-300">
              {revealed ? <Bot className="size-4" /> : model.blindLabel}
            </span>
            <div className="flex flex-col">
              {revealed ? (
                <>
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    {model.displayName}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                    {model.size === 'large' ? pick(lang, 'Gros', 'Large') : pick(lang, 'Petit', 'Small')}
                    {' · '}
                    {model.kind === 'medical'
                      ? pick(lang, 'spécialisé médecine', 'medical')
                      : pick(lang, 'généraliste', 'generic')}
                    {' · '}
                    {paramsLabel(lang, model.params)}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  {pick(lang, 'Réponse', 'Answer')} {model.blindLabel}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {revealed && promptText && <PromptBubble lang={lang} prompt={promptText} />}
            {result?.source === 'demo' && (
              <span
                title={pick(lang, 'Réponse pré-enregistrée (mode démo)', 'Pre-recorded answer (demo mode)')}
                className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
              >
                {pick(lang, 'démo', 'demo')}
              </span>
            )}
          </div>
        </div>

        <div className="min-h-[3rem] text-sm leading-relaxed text-[var(--color-foreground)]">
          {loading ? (
            <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
              <Loader2 className="size-4 animate-spin" /> {pick(lang, 'Génération…', 'Generating…')}
            </span>
          ) : result ? (
            <AnswerText text={result.text} />
          ) : (
            <span className="text-[var(--color-muted-foreground)]">
              {pick(lang, 'En attente…', 'Waiting…')}
            </span>
          )}
        </div>

        {/* Vote (phase aveugle) */}
        {!revealed && result && !loading && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {pick(lang, 'Votre jugement :', 'Your judgement:')}
            </span>
            <VoteButton
              active={current === 'true'}
              tone="emerald"
              icon={<Check className="size-4" />}
              label={pick(lang, 'Plutôt vraie', 'Likely true')}
              onClick={() => vote(key, 'true')}
            />
            <VoteButton
              active={current === 'false'}
              tone="red"
              icon={<X className="size-4" />}
              label={pick(lang, 'Plutôt fausse', 'Likely false')}
              onClick={() => vote(key, 'false')}
            />
          </div>
        )}

        {/* Révélation (évaluation) — collée en bas pour aligner les cartes entre elles */}
        {revealed && (
          <div className="mt-auto pt-1">
            <RevealBlock
              lang={lang}
              vote={current}
              verdict={verdict}
              critique={critique ? tr(lang, critique) : undefined}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function VoteButton({
  active,
  tone,
  icon,
  label,
  onClick,
}: {
  active: boolean
  tone: 'emerald' | 'red'
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  const tones = {
    emerald: 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    red: 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-300',
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? tones[tone]
          : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)]/30',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function RevealBlock({
  lang,
  vote,
  verdict,
  critique,
}: {
  lang: Lang
  vote?: VoteValue
  verdict?: 'correct' | 'partial' | 'wrong'
  critique?: string
}) {
  if (!verdict) return null
  const verdictLabel = {
    correct: pick(lang, 'Réponse correcte', 'Correct answer'),
    partial: pick(lang, 'Réponse partielle', 'Partial answer'),
    wrong: pick(lang, 'Réponse fausse', 'Wrong answer'),
  }[verdict]
  const verdictTone = {
    correct: 'text-emerald-600 dark:text-emerald-400',
    partial: 'text-amber-600 dark:text-amber-400',
    wrong: 'text-red-600 dark:text-red-400',
  }[verdict]

  // Le vote de l'étudiant était-il aligné avec la vérité ?
  // "true" attendu si correct ; "false" attendu si wrong ; partiel = nuancé.
  const votedTrue = vote === 'true'
  const votedFalse = vote === 'false'
  const mismatch =
    (verdict === 'wrong' && votedTrue) || (verdict === 'correct' && votedFalse)

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-sm">
      <div className={cn('flex items-center gap-1.5 font-semibold', verdictTone)}>
        <ShieldCheck className="size-4" />
        {verdictLabel}
      </div>
      {vote && (
        <div
          className={cn(
            'text-xs',
            mismatch ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-muted-foreground)]',
          )}
        >
          {pick(lang, 'Vous aviez jugé cette réponse', 'You judged this answer')}{' '}
          <strong>
            {votedTrue ? pick(lang, 'plutôt vraie', 'likely true') : pick(lang, 'plutôt fausse', 'likely false')}
          </strong>
          {mismatch && ' — ' + pick(lang, 'à revoir de près.', 'worth a closer look.')}
        </div>
      )}
      {critique && <p className="text-[var(--color-muted-foreground)]">{critique}</p>}
    </div>
  )
}

// ---------- Onglets de réponses (une réponse visible à la fois) ----------

export function ModelAnswerTabs({
  lang,
  models,
  promptKind,
  results,
  loading,
  revealed,
  promptText,
}: {
  lang: Lang
  models: TdModel[]
  promptKind: string
  results?: ChatResult[]
  loading?: boolean
  revealed: boolean
  promptText?: string
}) {
  const [active, setActive] = useState(models[0]?.id ?? '')
  const { votes } = useVotes()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {models.map((m) => {
          const res = results?.find((r) => r.modelId === m.id)
          const verdict = revealed ? res?.demo?.verdict : undefined
          const voted = votes[voteKey(m.id, promptKind)]
          return (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                active === m.id
                  ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-blue-500/50',
              )}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-slate-500/15 text-xs font-bold">
                {m.blindLabel}
              </span>
              {revealed ? m.displayName : `${pick(lang, 'Réponse', 'Answer')} ${m.blindLabel}`}
              {/* Pastille d'état : vote posé (phase aveugle) ou verdict (révélation) */}
              {!revealed && voted && (
                <span
                  className={cn(
                    'size-2 rounded-full',
                    voted === 'true' ? 'bg-emerald-500' : 'bg-red-500',
                  )}
                />
              )}
              {revealed && verdict && (
                <span
                  className={cn(
                    'size-2 rounded-full',
                    verdict === 'correct' && 'bg-emerald-500',
                    verdict === 'partial' && 'bg-amber-500',
                    verdict === 'wrong' && 'bg-red-500',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {models
        .filter((m) => m.id === active)
        .map((m) => (
          <ModelAnswerCard
            key={m.id}
            lang={lang}
            model={m}
            promptKind={promptKind}
            result={results?.find((r) => r.modelId === m.id)}
            loading={loading}
            revealed={revealed}
            promptText={promptText}
          />
        ))}
    </div>
  )
}

// ---------- Panneau réglages ----------

export function SettingsPanel({ lang }: { lang: Lang }) {
  const [settings, update] = useSettings()
  // Une clef exigée mais absente : état à part entière, ni « connecté » ni
  // « démo », sinon un oubli passe pour un choix.
  const keyMissing =
    !settings.offlineMode &&
    presetOf(settings.provider.id).needsKey &&
    !settings.provider.apiKey.trim()

  const chosen = settings.enabledModels

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Settings2 className="size-5 text-slate-500" />
          {pick(lang, 'Réglages formateur', 'Instructor settings')}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'Cet onglet ne s’adresse pas aux étudiants : il configure le serveur et ce qui leur est proposé.',
            'This tab is not for students: it configures the server and what they are offered.',
          )}
        </p>
      </div>

      <Tabs defaultValue="connection">
        <TabsList className="mx-auto flex">
          <TabsTrigger value="connection" className="gap-1.5">
            <Cpu className="size-3.5" />
            {pick(lang, 'Connexion', 'Connection')}
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-1.5">
            <Bot className="size-3.5" />
            {pick(lang, 'Modèles proposés', 'Available models')}
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-1.5">
            <SlidersHorizontal className="size-3.5" />
            {pick(lang, 'Valeurs par défaut', 'Defaults')}
          </TabsTrigger>
          <TabsTrigger value="timer" className="gap-1.5">
            <Timer className="size-3.5" />
            {pick(lang, 'Minuteur', 'Timer')}
          </TabsTrigger>
          <TabsTrigger value="dev" className="gap-1.5">
            <Code2 className="size-3.5" />
            {pick(lang, 'Développeur', 'Developer')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-4 flex flex-col gap-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5 text-sm font-medium">
              <span>{pick(lang, 'Connexion', 'Connection')}</span>
              <span className="flex items-center gap-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">
                {settings.offlineMode ? (
                  <>
                    <WifiOff className="size-3.5 text-amber-500" />
                    {pick(lang, 'hors ligne', 'offline')}
                  </>
                ) : keyMissing ? (
                  // Distinguer « clef manquante » de « mode démo » : sans cela,
                  // une clef oubliée ressemblait à un choix délibéré.
                  <>
                    <ShieldAlert className="size-3.5 text-red-500" />
                    {pick(lang, 'clef manquante', 'key missing')}
                  </>
                ) : providerShape(settings) === 'none' ? (
                  <>
                    <Sparkles className="size-3.5 text-amber-500" />
                    {pick(lang, 'mode démo', 'demo mode')}
                  </>
                ) : (
                  <>
                    <Cpu className="size-3.5 text-emerald-500" />
                    {pick(lang, 'API connectée', 'API connected')}
                  </>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-4 text-sm">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
                <input
                  type="checkbox"
                  // Décochable dans les DEUX builds : un site sans backend
                  // n'est pas privé d'API, il peut appeler Ollama ou
                  // OpenRouter directement. Le mode hors ligne est donc un
                  // choix, plus une fatalité du build.
                  checked={settings.offlineMode}
                  // Une seule case pour un seul état : « hors ligne » EST le
                  // mode pré-enregistré. Deux cases distinctes laissaient
                  // croire à deux comportements, alors que décocher l'une sans
                  // l'autre ne menait nulle part.
                  onChange={(e) =>
                    update({ offlineMode: e.target.checked, demoMode: e.target.checked })
                  }
                  className={cn('mt-0.5', CLIENT_ONLY ? 'cursor-not-allowed' : 'cursor-pointer')}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium">
                    <WifiOff className="size-3.5 shrink-0 text-amber-500" />
                    {pick(lang, 'Mode hors ligne', 'Offline mode')}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                    {pick(
                      lang,
                      'Aucun appel réseau : le TD rejoue des réponses RÉELLES, capturées à l’avance sur ces mêmes modèles, avec leurs temps et leurs décomptes de tokens. Le champ de saisie se verrouille et les étudiants choisissent parmi des questions préparées. À utiliser quand le réseau de la salle est incertain, ou la clé API épuisée.',
                      'No network calls: the session replays REAL answers, captured in advance from these same models, with their timings and token counts. The input field locks and students pick from prepared questions. Use it when the room’s network is unreliable, or the API key is exhausted.',
                    )}
                  </span>
                </span>
              </label>
              {/* Hors ligne, aucun appel ne part : afficher une URL et une
                  clef laisserait croire qu'elles servent encore à quelque
                  chose, et l'on chercherait la panne dans ces champs. */}
              {!settings.offlineMode && <ProviderSettings lang={lang} />}
              {/* Le sort de la clef est déjà dit à l'endroit où on la saisit
                  (encart ambre du formulaire) : le répéter ici diluait le
                  message au lieu de le renforcer. */}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="models" className="mt-4 flex flex-col gap-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5 text-sm font-medium">
              <span>{pick(lang, 'Modèles proposés', 'Available models')}</span>
              <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                {(chosen ?? tdModels().map((m) => m.id)).length} / {tdModels().length}
              </span>
            </div>
            <ModelsSettings lang={lang} />
          </div>

        </TabsContent>

        <TabsContent value="defaults" className="mt-4 flex flex-col gap-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="border-b border-[var(--color-border)] px-4 py-2.5 text-sm font-medium">
              {pick(lang, 'Valeurs de départ de la séance', 'Session starting values')}
            </div>
            <DefaultsSettings lang={lang} />
          </div>
        </TabsContent>

        <TabsContent value="timer" className="mt-4 flex flex-col gap-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="border-b border-[var(--color-border)] px-4 py-2.5 text-sm font-medium">
              {pick(lang, 'Temps alloué à chaque étape', 'Time allotted to each step')}
            </div>
            <TimerSettings lang={lang} />
          </div>
        </TabsContent>

        <TabsContent value="dev" className="mt-4 flex flex-col gap-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="border-b border-[var(--color-border)] px-4 py-2.5 text-sm font-medium">
              {pick(lang, 'Mode développeur', 'Developer mode')}
            </div>
            <div className="flex flex-col gap-3 p-4 text-sm">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={settings.devMode}
                  onChange={(e) => update({ devMode: e.target.checked })}
                  className="mt-0.5 cursor-pointer"
                />
                <span>
                  {pick(
                    lang,
                    'Afficher le corps JSON des requêtes',
                    'Show the raw JSON request body',
                  )}
                </span>
              </label>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {pick(
                  lang,
                  'Ajoute une bascule « JSON » dans la fenêtre « Ce qui a réellement été envoyé » : on y lit le corps HTTP exact transmis au backend (modèle, consigne système, historique, réglages d’échantillonnage). Utile pour vérifier ce qui part vraiment ; sans intérêt pour les étudiants, à qui la vue lisible suffit.',
                  'Adds a “JSON” toggle to the “What was actually sent” dialog, showing the exact HTTP body sent to the backend (model, system instruction, history, sampling settings). Useful to check what really goes out; of no interest to students, for whom the readable view is enough.',
                )}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

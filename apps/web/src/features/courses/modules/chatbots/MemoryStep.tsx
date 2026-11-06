// ============================================================
// Étape « La mémoire » — un LLM est sans état.
//
// Différence majeure avec les étapes précédentes : ici le fil est une
// VRAIE conversation. Les essais s'enchaînent au lieu d'être isolés,
// et ce qui part au modèle dépend du mode de mémoire choisi.
//
//   - aucune   : seul le dernier message
//   - complète : tout l'historique, recopié
//   - résumée  : un résumé (produit par un appel LLM) + les tours récents
//
// Le budget de contexte est plafonné par le formateur (réglages), très
// en dessous des vraies fenêtres : la saturation doit arriver en séance.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Brain, Loader2, MessageSquarePlus, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr } from './data'
import {
  AttachLocked,
  BriefTitle,
  ReadRulesHint,
  DarkTip,
  NewConversationDivider,
  RulesDialog,
  Composer,
  Exchange,
  ModelPicker,
  PendingExchange,
  ReferenceDialog,
  SamplingDialog,
  SentPayloadDialog,
  SystemPromptEditor,
  ThreeColumns,
  type PendingExchangeData,
} from './chat-ui'
import { FreshStep } from './fresh-step'
import { sentences } from './chat-format'
import { DEFAULT_SAMPLING } from './sampling'
import { chatFreeStream, type HistoryMessage, type TokenUsage } from './client'
import { OfflineBanner, OfflinePresets } from './OfflineBar'
import { captureKey, getCapture, hasCapture, hasCapturesFor, replay } from './offline'
import { OFFLINE_MEMORY_SEQUENCE, offlinePlaceholder } from './offline-data'
import { useSettings, tdModels , defaultTemperature } from './settings'
import { useAttempts, type Attempt, type SentMessage } from './sandbox'
import { useSharedModel, useStepField } from './step-state'
import { DEFAULT_SANDBOX_MODEL, SYSTEM_PROMPT } from './warmup-data'
import {
  CONTEXT_WINDOWS,
  FOLLOW_UPS,
  MEMORY_BRIEF,
  MEMORY_MODES,
  MEMORY_RULES,
  SUMMARY_HEADER,
  SUMMARY_MERGE,
  SUMMARY_NEW,
  SUMMARY_PREVIOUS,
  SUMMARY_PROMPT,
  type MemoryMode,
} from './memory-data'

/**
 * Estimation du nombre de tokens d'un texte. Approximation volontaire
 * (~4 caractères par token en français) : elle sert à remplir la jauge
 * AVANT l'envoi, quand aucun décompte réel n'est encore disponible.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Mode « résumé » : seuls les KEEP_RECENT derniers tours partent tels quels ;
// tout le reste est condensé. Trois tours, comme un client conversationnel
// courant. En portée module : l'affichage du résumé s'y réfère aussi.
const KEEP_RECENT = 3
const KEEP_RECENT_LABEL = String(KEEP_RECENT)

// ---------- Les règles du jeu ----------


// ---------- Sélecteur de mode ----------

function ModePicker({
  lang,
  mode,
  onPick,
}: {
  lang: Lang
  mode: MemoryMode
  onPick: (m: MemoryMode) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {tr(lang, MEMORY_BRIEF.question)}
      </p>
      <div className="grid gap-2">
        {MEMORY_MODES.map((m) => {
          const active = m.id === mode
          return (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-md border p-2.5 text-left transition-colors',
                active
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-[var(--color-border)] hover:border-blue-500 hover:bg-blue-500/5',
              )}
            >
              <span className="flex items-center gap-2">
                <Brain
                  className={cn(
                    'size-3.5 shrink-0',
                    active ? 'text-blue-600' : 'text-[var(--color-muted-foreground)]',
                  )}
                />
                <span className="text-sm font-medium">{tr(lang, m.label)}</span>
              </span>
              <span className="text-xs leading-snug text-[var(--color-muted-foreground)]">
                {tr(lang, m.sends)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Consigne ----------

function BriefPane({
  lang,
  mode,
  onPick,
}: {
  lang: Lang
  mode: MemoryMode
  onPick: (m: MemoryMode) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-3">
      <BriefTitle title={tr(lang, MEMORY_BRIEF.title)} />

      <div className="rounded-md border-l-2 border-l-blue-500 bg-[var(--color-muted)] p-3 text-xs leading-relaxed">
        {tr(lang, MEMORY_BRIEF.patient)}
      </div>

      <ModePicker lang={lang} mode={mode} onPick={onPick} />

      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <RulesDialog lang={lang} intro={MEMORY_BRIEF.intro} rules={MEMORY_RULES} />
        <ReferenceDialog lang={lang} unlocked block />
      </div>
    </div>
  )
}

// ---------- Jauge de contexte ----------

function ContextGauge({
  lang,
  used,
  budget,
  window,
}: {
  lang: Lang
  used: number
  budget: number
  window: number
}) {
  const pctRaw = budget > 0 ? (used / budget) * 100 : 0
  const pct = Math.min(100, pctRaw)
  const full = pctRaw >= 100
  const tight = pctRaw >= 75

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
        <span className="text-[var(--color-muted-foreground)]">
          {pick(lang, 'Contexte', 'Context')}{' '}
          <span
            className={cn(
              'font-semibold tabular-nums',
              full ? 'text-red-600' : tight ? 'text-amber-600' : 'text-[var(--color-foreground)]',
            )}
          >
            {used.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} / {budget.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
          </span>{' '}
          tokens
        </span>
        <span className="text-[var(--color-muted-foreground)]">
          {pick(lang, 'Limite réelle du modèle', 'Model’s real limit')} :{' '}
          {window.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            full ? 'bg-red-500' : tight ? 'bg-amber-500' : 'bg-blue-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {full && (
        <p className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          {pick(
            lang,
            'Budget dépassé : passez en mémoire résumée, ou repartez d’une conversation neuve.',
            'Budget exceeded: switch to summarised memory, or start a fresh conversation.',
          )}
        </p>
      )}
    </div>
  )
}

// ---------- Le résumé produit par le modèle ----------

function SummaryNote({
  lang,
  text,
  prompt,
  usage,
  covers,
  added,
  modelId,
}: {
  lang: Lang
  text: string
  /** Ce qui a été envoyé pour obtenir ce résumé. */
  prompt: string
  usage?: TokenUsage
  /** Nombre d'échanges condensés dans ce résumé. */
  covers?: number
  /** Combien viennent d'y être ajoutés. */
  added?: number
  /** Modèle ayant produit le résumé, pour la vue JSON du mode développeur. */
  modelId?: string
}) {
  // Le résumé est une génération : on doit pouvoir voir la demande ET la
  // sortie, exactement comme pour un message de l'étudiant.
  const sent: SentMessage[] = prompt
    ? [
        { role: 'user', content: prompt },
        { role: 'assistant', content: text },
      ]
    : []

  // L'appel de synthèse part sans consigne système ni historique : le prompt
  // se suffit à lui-même. La vue JSON le montrera tel quel.
  const slug = tdModels().find((m) => m.id === modelId)?.slug
  const request = slug
    ? { slug, sampling: { temperature: DEFAULT_SAMPLING.temperature } }
    : undefined

  return (
    <div className="rounded-md border-l-2 border-l-emerald-500 bg-emerald-500/5 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <Brain className="size-3.5 shrink-0" />
        {covers !== undefined
          ? covers === 1
            ? pick(
                lang,
                'Mémoire résumée — 1er échange condensé',
                'Summarised memory — 1st exchange condensed',
              )
            : pick(
                lang,
                `Mémoire résumée — échanges 1 à ${covers} condensés`,
                `Summarised memory — exchanges 1 to ${covers} condensed`,
              )
          : pick(
              lang,
              'Mémoire résumée — ce que le modèle a retenu',
              'Summarised memory — what the model kept',
            )}
        {sent.length > 0 && (
          <span className="ml-auto">
            <SentPayloadDialog
              lang={lang}
              sent={sent}
              usage={usage}
              showCompletion
              request={request}
              triggerClassName="text-emerald-700/70 hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-400/70 dark:hover:text-emerald-300"
              title={pick(lang, 'Comment ce résumé a été produit', 'How this summary was produced')}
              description={pick(
                lang,
                `Ceci n’est PAS la requête de votre question : c’est un appel séparé, payé en plus, dont le seul but est de fabriquer la mémoire longue. Vous n’y verrez donc que les échanges trop anciens pour tenir dans la fenêtre — les ${KEEP_RECENT_LABEL} plus récents en sont absents parce qu’ils partent entiers, mot pour mot. Les résumer ici reviendrait à les envoyer deux fois.`,
                `This is NOT the request carrying your question: it is a separate, extra-paid call whose only job is to build the long-term memory. So it contains only the exchanges too old to fit in the window — the ${KEEP_RECENT_LABEL} most recent ones are missing because they are sent whole, verbatim. Summarising them here would mean sending them twice.`,
              )}
            />
          </span>
        )}
      </p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-muted-foreground)]">
        {text}
      </p>
      {covers !== undefined && (
        <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            `Seuls les échanges sortis de la fenêtre sont condensés ici${added ? ` (${added} vient${added > 1 ? 'nent' : ''} d’y entrer)` : ''}. Les ${KEEP_RECENT_LABEL} suivants partent encore mot pour mot.`,
            `Only the exchanges that left the window are condensed here${added ? ` (${added} just joined)` : ''}. The next ${KEEP_RECENT_LABEL} are still sent verbatim.`,
          )}
        </p>
      )}
    </div>
  )
}

// ---------- Ce qu'il faut observer ----------

function WatchNote({ lang, mode }: { lang: Lang; mode: MemoryMode }) {
  const spec = MEMORY_MODES.find((m) => m.id === mode)
  if (!spec) return null
  return (
    <div className="rounded-md border-l-2 border-l-blue-500 bg-blue-500/5 p-3">
      <p className="mb-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
        {pick(lang, 'À regarder', 'What to look for')} — {tr(lang, spec.label)}
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {sentences(tr(lang, spec.watch))}
      </p>
    </div>
  )
}

// ---------- L'étape ----------

export function MemoryStep({ lang }: { lang: Lang }) {
  const [settings, updateSettings] = useSettings()

  // Défaut : mémoire complète. Ouvrir l'étape en mode « aucune » donnait
  // l'impression d'un bug — le modèle ne suit pas, alors que c'est le
  // comportement attendu. On part donc de ce qui marche, et c'est le
  // passage à « aucune » qui devient l'expérience.
  const [modeRaw, setMode] = useStepField('memory-full', 'memoryMode', 'full')
  const mode = modeRaw as MemoryMode

  // Une conversation PAR MODE : changer de mode reprend le fil mené dans
  // ce mode, ou en ouvre un neuf s'il n'y en a pas encore.
  const scope = `memory-${mode}` as const
  const { attempts, add, reset } = useAttempts(scope)

  const [modelId, setModelId] = useSharedModel(DEFAULT_SANDBOX_MODEL)
  // Comme le modèle : rangée sous 'memory-full' pour être commune aux trois
  // modes. Changer de mode ne doit pas changer la température, sinon les
  // conversations ne se comparent plus.
  const [temperature, setTemperature] = useStepField(
    'memory-full',
    'temperature',
    defaultTemperature(settings),
  )
  const [prompt, setPrompt] = useStepField(scope, 'prompt', '')
  // Persisté, comme la conversation : le résumé EST la mémoire dans ce mode.
  // On garde aussi de quoi l'inspecter : le prompt qui l'a produit, son coût.
  const [summary, setSummary] = useStepField('memory-summary', 'summary', '')
  const [summarisedCount, setSummarisedCount] = useStepField(
    'memory-summary',
    'summarisedCount',
    0,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingExchangeData | null>(null)
  const [summarising, setSummarising] = useState(false)
  const centerRef = useRef<HTMLDivElement>(null)
  // Un seul contrôleur pour les DEUX appels du tour : le résumé qui précède
  // l'envoi, puis la réponse elle-même. « Arrêter » pendant la synthèse doit
  // interrompre le tour entier, sinon le bouton ment pendant plusieurs secondes.
  const abortRef = useRef<AbortController | null>(null)

  const defaultSystem = tr(lang, SYSTEM_PROMPT.text)
  const systemPrompt = settings.systemPrompt ?? defaultSystem
  const systemIsDefault = settings.systemPrompt === null

  const model = tdModels().find((m) => m.id === modelId) ?? tdModels()[0]

  // Hors ligne, les réponses sont REJOUÉES : elles ont été enregistrées à la
  // température par défaut, et afficher une autre valeur ferait croire qu'elle
  // a produit ce texte. Le réglage n'a donc d'effet qu'en ligne.
  const sampling = {
    temperature: settings.offlineMode ? defaultTemperature(settings) : temperature,
  }

  // Un modèle choisi en ligne (ou hérité d'une session précédente) peut ne pas
  // avoir de capture pour cette étape : on bascule alors sur celui qui en a,
  // plutôt que de laisser l'étudiant devant un envoi qui échouera.
  useEffect(() => {
    if (settings.offlineMode && !hasCapturesFor('memory', modelId)) {
      const fallback = tdModels().find((m) => hasCapturesFor('memory', m.id))
      if (fallback) setModelId(fallback.id)
    }
  }, [settings.offlineMode, modelId, setModelId])
  const budget = settings.contextBudget
  const contextWindow = CONTEXT_WINDOWS[model.id] ?? 32_768

  // Un résumé n'a de sens que s'il couvre des tours réellement sortis de la
  // fenêtre. Un résumé conservé d'une session antérieure (ou d'une version
  // précédente du code) peut prétendre couvrir plus que ce que la conversation
  // contient : on l'ignore alors, plutôt que d'afficher une mémoire fantôme.
  const coverable = Math.max(0, attempts.length - KEEP_RECENT)
  const summaryValid = summarisedCount > 0 && summarisedCount <= coverable
  const activeSummary = summaryValid ? summary : ''


  // ---------- Hors ligne : où en est la séquence ----------
  //
  // Ce n'est PAS une liste de questions préparées où l'on pioche : c'est une
  // SÉQUENCE, enregistrée telle quelle lors d'une vraie conversation. La
  // capture du tour 5 (« Résume-moi ce qu'on a décidé ») a été produite après
  // les quatre premiers tours, et ses 265 tokens d'entrée en portent la trace.
  //
  // Laisser cliquer le tour 5 sur une conversation vide rejouerait donc une
  // réponse née d'un historique qui n'existe pas à l'écran — exactement le
  // mensonge que l'étape dénonce. L'avancement suit l'ordre, et le tour
  // suivant est le SEUL disponible.
  const doneCount = settings.offlineMode
    ? OFFLINE_MEMORY_SEQUENCE.findIndex(
        (p, i) => attempts[i]?.prompt.trim() !== tr(lang, p.text).trim(),
      )
    : 0
  /** Nombre de tours de la séquence réellement joués, dans l'ordre. */
  const played =
    doneCount === -1 ? Math.min(attempts.length, OFFLINE_MEMORY_SEQUENCE.length) : doneCount

  const offlineDone = new Set(OFFLINE_MEMORY_SEQUENCE.slice(0, played).map((p) => p.id))
  const offlineNext = OFFLINE_MEMORY_SEQUENCE[played] ?? null
  const offlineNextId = offlineNext?.id ?? null

  /**
   * Hors ligne, seul le tour suivant peut partir : sa capture n'est fidèle
   * qu'à cette position dans la conversation.
   */
  const offlineReady =
    !settings.offlineMode ||
    (!!offlineNext &&
      tr(lang, offlineNext.text).trim() === prompt.trim() &&
      hasCapture(captureKey('memory', modelId, mode, offlineNext.id)))

  /** Ce qui partirait au prochain envoi, selon le mode — sert à la jauge. */
  function buildHistory(): { history: HistoryMessage[]; memoryText: string } {
    if (mode === 'none') return { history: [], memoryText: '' }

    if (mode === 'full') {
      const history = attempts.flatMap<HistoryMessage>((a) => [
        { role: 'user', content: a.prompt },
        { role: 'assistant', content: a.answer },
      ])
      return { history, memoryText: history.map((m) => m.content).join('\n') }
    }

    // Mode résumé : le résumé part avec la consigne système (voir `send`), les
    // tours récents restent bruts. Le tout compte dans le budget affiché.
    const history: HistoryMessage[] = []
    if (activeSummary) {
      history.push({
        role: 'user',
        content: `${tr(lang, SUMMARY_HEADER)}\n${activeSummary}`,
      })
    }
    attempts.slice(-KEEP_RECENT).forEach((a) => {
      history.push({ role: 'user', content: a.prompt })
      history.push({ role: 'assistant', content: a.answer })
    })
    return { history, memoryText: history.map((m) => m.content).join('\n') }
  }

  const { memoryText } = buildHistory()
  // La jauge annonce ce que COÛTERAIT le prochain envoi. Pendant qu'une requête
  // est en vol, la question qui part n'est plus dans le champ de saisie (vidé
  // pour l'affichage optimiste) mais dans `pending` : sans cela, la jauge
  // retomberait le temps de la génération, comme si la question ne coûtait
  // rien — alors qu'elle vient précisément d'être payée.
  const draft = pending ? pending.prompt : prompt
  const usedTokens =
    estimateTokens(systemPrompt) + estimateTokens(memoryText) + estimateTokens(draft)

  useEffect(() => {
    if (pending) centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [pending])

  useEffect(() => {
    centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [attempts.length])

  /**
   * Demande au modèle de résumer la conversation, et garde le résumé.
   *
   * Renvoie aussi le coût de CET appel : résumer n'est pas gratuit, et le
   * compteur doit le porter — sans quoi le mode « résumé » paraîtrait moins
   * cher qu'il ne l'est, ce qui est exactement l'inverse de la leçon.
   */
  async function refreshSummary(
    /** Résumé déjà en vigueur, à enrichir. Vide au premier passage. */
    previous: string,
    /** Uniquement les tours qui viennent de sortir de la fenêtre. */
    leaving: Attempt[],
    /**
     * Hors ligne : identifiant de la question en cours, qui désigne la
     * synthèse capturée pour CE tour.
     */
    offlineTurnId?: string | null,
    /** Signal du tour : « Arrêter » doit aussi couper la synthèse. */
    signal?: AbortSignal,
  ): Promise<{ text: string; prompt: string; usage?: TokenUsage } | null> {
    if (leaving.length === 0) return null

    // Hors ligne, la synthèse est rejouée comme le reste : la séquence étant
    // fixe, son entrée est déterministe et a donc pu être capturée. C'est un
    // VRAI résumé, produit par le modèle — indispensable, puisque l'étape
    // demande justement de lire ce qu'il a laissé tomber.
    if (settings.offlineMode) {
      const capture = offlineTurnId
        ? getCapture(captureKey('memory', modelId, 'summary', offlineTurnId, 'digest'))
        : null
      if (!capture) return null
      setSummarising(true)
      const res = await replay(capture, { onDelta: () => {} })
      setSummarising(false)
      if (!res.text) return null
      setSummary(res.text)
      return { text: res.text, prompt: capture.prompt, usage: res.usage }
    }

    setSummarising(true)
    const transcript = leaving
      .map((a) =>
        pick(lang, `Question : ${a.prompt}\nRéponse : ${a.answer}`, `Question: ${a.prompt}\nAnswer: ${a.answer}`),
      )
      .join('\n\n')
    // Résumé INCRÉMENTAL : on repart du résumé précédent et on n'y ajoute que
    // les tours qui sortent. Repartir des transcriptions complètes ferait
    // grossir cet appel à chaque message — la synthèse coûterait bientôt plus
    // cher que la mémoire qu'elle est censée alléger.
    const summaryPrompt = previous
      ? `${tr(lang, SUMMARY_PREVIOUS)}\n${previous}\n\n${tr(lang, SUMMARY_NEW)}\n${transcript}\n\n---\n\n${tr(lang, SUMMARY_MERGE)}`
      : `${transcript}\n\n---\n\n${tr(lang, SUMMARY_PROMPT)}`
    const res = await chatFreeStream(
      model.slug,
      summaryPrompt,
      undefined,
      () => {},
      { temperature: 0.3 },
      signal,
    )
    setSummarising(false)
    if (res.error || !res.text) return null
    setSummary(res.text)
    return { text: res.text, prompt: summaryPrompt, usage: res.usage }
  }

  /** `again` : le dernier prompt, renvoyé tel quel sans toucher au brouillon. */
  async function send(again?: string) {
    const text = (again ?? prompt).trim()
    if (!text || pending) return

    // La capture à rejouer est celle du tour ATTENDU à cette position, pas
    // celle d'une question retrouvée n'importe où dans la séquence : c'est ce
    // qui garantit que la réponse restituée est bien celle qui avait été
    // produite après cet historique-là.
    const offlinePreset =
      settings.offlineMode && offlineNext && tr(lang, offlineNext.text).trim() === text
        ? offlineNext
        : null
    if (settings.offlineMode && !offlinePreset) return

    if (again === undefined) setPrompt('')
    setError(null)
    setPending({ prompt: text, modelId, text: '' })

    const controller = new AbortController()
    abortRef.current = controller

    // En mode résumé, on condense AVANT d'envoyer, dès qu'un tour sort de la
    // fenêtre. `summarised` retient combien de tours le résumé couvre déjà :
    // on ne lui ajoute que les nouveaux sortants.
    let effectiveSummary = activeSummary
    // La synthèse produite pour CE tour : son coût s'ajoute à celui de la
    // réponse, et elle est attachée à l'échange pour rester inspectable.
    let madeSummary:
      | { text: string; prompt: string; usage?: TokenUsage; covers: number; added: number }
      | null = null
    const shouldCover = Math.max(0, attempts.length - KEEP_RECENT)
    if (mode === 'summary' && shouldCover > summarisedCount) {
      const leaving = attempts.slice(summarisedCount, shouldCover)
      const made = await refreshSummary(
        activeSummary,
        leaving,
        offlinePreset?.id,
        controller.signal,
      )
      if (made) {
        madeSummary = { ...made, covers: shouldCover, added: leaving.length }
        effectiveSummary = made.text
        setSummarisedCount(shouldCover)
      }
    }
    const summaryUsage = madeSummary?.usage

    // Les tours renvoyés tels quels, en rôles alternés : c'est le format que
    // le modèle est entraîné à lire comme un historique. Aucune phrase
    // d'introduction ici — elle deviendrait un message de plus, que le modèle
    // pourrait prendre pour une consigne, et casserait l'alternance.
    const history: HistoryMessage[] =
      mode === 'none'
        ? []
        : (mode === 'full' ? attempts : attempts.slice(-KEEP_RECENT)).flatMap<HistoryMessage>(
            (a) => [
              { role: 'user', content: a.prompt },
              { role: 'assistant', content: a.answer },
            ],
          )

    // Le résumé, lui, n'est pas un tour de conversation : il rejoint la
    // consigne système, là où vit le contexte. L'y placer évite deux messages
    // « user » consécutifs, que certains modèles interprètent mal.
    const summarised = mode === 'summary' && !!effectiveSummary
    const systemSent = summarised
      ? `${systemPrompt}\n\n${tr(lang, SUMMARY_HEADER)}\n${effectiveSummary}`.trim()
      : systemPrompt

    // La charge utile affichée. Deux informations à porter en même temps :
    //   - QUI parle (vous / le modèle) — sans quoi on ne distingue pas une
    //     question renvoyée de la réponse qui l'a suivie ;
    //   - D'OÙ ça vient (mémoire brute, résumé) — c'est le sujet de l'étape.
    const sent: SentMessage[] = []
    if (systemPrompt.trim()) sent.push({ role: 'system', content: systemPrompt })
    if (summarised) sent.push({ role: 'summary', content: effectiveSummary })
    // Les messages de mémoire vont par paires (question, réponse) : on les
    // numérote pour que l'affichage les regroupe tour par tour.
    let turn = 0
    history.forEach((m) => {
      if (m.role === 'user') turn += 1
      sent.push({
        role: m.role === 'assistant' ? 'memory-answer' : 'memory-question',
        content: m.content,
        turn,
      })
    })
    sent.push({ role: 'user', content: text })

    // Hors ligne, la capture dépend du MODE : la même question donne une autre
    // réponse selon que l'historique est renvoyé ou non — c'est précisément ce
    // que l'étape démontre, et rejouer la même réponse partout l'annulerait.
    const offlineKey = offlinePreset
      ? captureKey('memory', modelId, mode, offlinePreset.id)
      : undefined

    // Le tour a pu être interrompu pendant la synthèse : on n'enchaîne pas
    // sur l'appel principal, sinon « Arrêter » n'aurait fait que sauter une
    // étape avant de repartir de plus belle.
    if (controller.signal.aborted) {
      abortRef.current = null
      setPending(null)
      return
    }

    const res = await chatFreeStream(
      model.slug,
      text,
      systemSent,
      (chunk) => setPending((p) => (p ? { ...p, text: p.text + chunk } : p)),
      sampling,
      controller.signal,
      history,
      offlineKey,
    )

    abortRef.current = null
    setPending(null)

    // Arrêt avant le premier mot : rien à conserver, la question est rendue.
    // La synthèse éventuellement produite AVANT l'arrêt, elle, reste acquise :
    // elle a réellement été payée, et la refaire au prochain envoi coûterait
    // une seconde fois — le compteur de tours couverts est déjà à jour.
    if (res.stopped && !res.text.trim()) {
      if (again === undefined) setPrompt(text)
      return
    }

    if (res.error) {
      if (again === undefined) setPrompt(text)
      setError(
        res.error === 'no-api'
          ? pick(
              lang,
              'Aucune API configurée. Renseignez l’URL du backend dans les réglages, à l’étape « Introduction ».',
              'No API configured. Set the backend URL in the settings, in the “Introduction” step.',
            )
          : res.error === 'timeout'
            ? pick(
                lang,
                'Le modèle a mis trop de temps à répondre. Réessayez, ou choisissez un modèle plus petit.',
                'The model took too long. Try again, or pick a smaller model.',
              )
            : pick(lang, 'Le serveur est injoignable.', 'The server is unreachable.'),
      )
      return
    }

    // Le coût affiché est celui du TOUR ENTIER : la réponse, plus l'appel de
    // synthèse quand il a fallu en faire un.
    const usage =
      res.usage && summaryUsage
        ? {
            prompt: res.usage.prompt + summaryUsage.prompt,
            completion: res.usage.completion + summaryUsage.completion,
            total: res.usage.total + summaryUsage.total,
          }
        : (res.usage ?? summaryUsage)

    add({
      modelId,
      prompt: text,
      answer: res.text,
      source: res.source,
      sent,
      usage,
      sampling,
      levelId: mode,
      summary: madeSummary
        ? {
            text: madeSummary.text,
            prompt: madeSummary.prompt,
            usage: madeSummary.usage,
            covers: madeSummary.covers,
            added: madeSummary.added,
          }
        : undefined,
    })
  }

  function stop() {
    abortRef.current?.abort()
    abortRef.current = null
  }

  function clearConversation() {
    reset()
    setSummary('')
    setSummarisedCount(0)
    setError(null)
  }

  return (
    <ThreeColumns
      left={
        <FreshStep.Provider value={attempts.length === 0}>
          <BriefPane lang={lang} mode={mode} onPick={(m) => setMode(m)} />
        </FreshStep.Provider>
      }
      right={
        <div className="flex h-full min-h-0 flex-col gap-2 pr-2">
          <p className="text-sm font-medium">
            {pick(lang, 'Questions de suivi', 'Follow-up questions')}
          </p>
          <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              'Elles n’ont de sens que si le modèle se souvient du cas. Cliquez pour les insérer.',
              'They only make sense if the model remembers the case. Click to insert.',
            )}
          </p>
          <div className="flex flex-col gap-1.5">
            {FOLLOW_UPS.map((f, i) => (
              <button
                key={i}
                onClick={() => setPrompt(tr(lang, f))}
                className="cursor-pointer rounded-md border border-[var(--color-border)] p-2 text-left text-xs leading-snug transition-colors hover:border-blue-500/40 hover:bg-[var(--color-accent)]"
              >
                {tr(lang, f)}
              </button>
            ))}
          </div>

          {attempts.length > 0 && (
            <Button size="sm" onClick={clearConversation} className="mt-auto cursor-pointer gap-2">
              <MessageSquarePlus className="size-3.5" />
              {pick(lang, 'Nouvelle conversation', 'New conversation')}
            </Button>
          )}
        </div>
      }
      center={
        <div className="flex h-full min-h-0 flex-col">
          {settings.offlineMode && <OfflineBanner lang={lang} className="mt-2 mr-3" />}

          <div ref={centerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3 pr-5">
            {attempts.length === 0 && !pending && <ReadRulesHint lang={lang} />}

            {/* Le fil est ici une VRAIE conversation : tous les tours restent
                affichés. Ni analyse ni avis : le sujet est la mémoire, pas la
                justesse clinique — celle-ci se juge aux étapes précédentes.
                Le résumé s'intercale AVANT l'échange qui l'a déclenché : on
                voit la mémoire se refabriquer, tour après tour. */}
            {attempts.map((a, i) => (
              <div key={a.id} className="space-y-4">
                {a.summary && (
                  <SummaryNote
                    lang={lang}
                    text={a.summary.text}
                    prompt={a.summary.prompt}
                    usage={a.summary.usage}
                    covers={a.summary.covers}
                    added={a.summary.added}
                    modelId={a.modelId}
                  />
                )}
                {/* Sans mémoire, chaque message ouvre une conversation neuve. */}
                {mode === 'none' && i > 0 && <NewConversationDivider lang={lang} />}
                <Exchange lang={lang} attempt={a} index={i} />
              </div>
            ))}

            {pending && (
              <>
                {mode === 'none' && attempts.length > 0 && <NewConversationDivider lang={lang} />}
                <PendingExchange lang={lang} pending={pending} />
              </>
            )}

            {attempts.length > 0 && !pending && <WatchNote lang={lang} mode={mode} />}
          </div>

          <div className="border-t border-[var(--color-border)] pt-2 pr-5">
            <Composer
              lang={lang}
              value={prompt}
              onChange={setPrompt}
              onSend={() => void send()}
              onResend={() => {
                const last = attempts.at(-1)?.prompt
                if (last) setPrompt(last)
              }}
              resendDisabled={!!pending || attempts.length === 0 || settings.offlineMode}
              rows={3}
              readOnly={settings.offlineMode}
              placeholder={
                settings.offlineMode
                  ? offlinePlaceholder(lang)
                  : pick(
                      lang,
                      'Posez votre question, puis enchaînez…',
                      'Ask your question, then follow up…',
                    )
              }
              disabled={!!pending || !prompt.trim() || !offlineReady}
              tools={
                <>
                  <ModelPicker
                    lang={lang}
                    modelId={modelId}
                    onSelect={setModelId}
                    offlineStep="memory"
                  />
                  <AttachLocked lang={lang} />
                  <SystemPromptEditor
                    lang={lang}
                    value={systemPrompt}
                    isDefault={systemIsDefault}
                    onChange={(v) => updateSettings({ systemPrompt: v === defaultSystem ? null : v })}
                    onRestore={() => updateSettings({ systemPrompt: null })}
                  />
                  <SamplingDialog
                    lang={lang}
                    value={sampling}
                    editable={!settings.offlineMode}
                    onChange={(next) => setTemperature(next.temperature)}
                  />
                </>
              }
              action={
                pending ? (
                  <DarkTip label={pick(lang, 'Interrompre la génération', 'Stop the generation')}>
                    <Button
                      onClick={stop}
                      size="icon"
                      variant="destructive"
                      className="size-8 shrink-0 cursor-pointer rounded-lg"
                      aria-label={pick(lang, 'Interrompre la génération', 'Stop the generation')}
                    >
                      <Square className="size-3 fill-current" />
                    </Button>
                  </DarkTip>
                ) : undefined
              }
              above={
                <>
                  <ContextGauge
                    lang={lang}
                    used={usedTokens}
                    budget={budget}
                    window={contextWindow}
                  />
                  {summarising && (
                    <p className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                      <Loader2 className="size-3.5 animate-spin" />
                      {pick(lang, 'Le modèle résume la conversation…', 'The model is summarising…')}
                    </p>
                  )}
                  {settings.offlineMode && (
                    <OfflinePresets
                      lang={lang}
                      presets={OFFLINE_MEMORY_SEQUENCE}
                      strict
                      onPick={setPrompt}
                      disabled={!!pending}
                      done={offlineDone}
                      nextId={offlineNextId}
                    />
                  )}
                  {error && (
                    <p className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      {error}
                    </p>
                  )}
                </>
              }
            />
          </div>
        </div>
      }
    />
  )
}

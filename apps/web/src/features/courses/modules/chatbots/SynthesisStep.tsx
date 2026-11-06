// ============================================================
// Étape « Synthèse » — l'épreuve finale, tous leviers ouverts.
//
// Les étapes précédentes isolaient une variable à la fois : le prompt,
// puis la température, puis la mémoire, puis le document. Ici, rien n'est
// imposé — l'étudiant compose lui-même.
//
// Le critère de réussite n'est PAS d'obtenir une bonne réponse : avec la
// recommandation jointe et une température basse, un modèle finit par
// tomber juste. C'est d'obtenir la même réponse juste sur les TROIS
// modèles. D'où la colonne de droite, qui n'est plus un historique mais
// un TABLEAU DE BORD : un modèle par ligne, la grille de vérification en
// colonnes, et ce qui reste à essayer.
//
// Hors ligne, l'étape ne peut pas fonctionner : les réponses sont
// rejouées depuis des captures, et un prompt libre n'en a aucune. On le
// dit franchement plutôt que de laisser l'envoi échouer.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  FileText,
  ListChecks,
  Paperclip,
  Square,
  Trophy,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr } from './data'
import {
  BriefTitle,
  ReadRulesHint,
  DarkTip,
  NewConversationDivider,
  RulesDialog,
  Composer,
  Exchange,
  HistoryPane,
  ModelPicker,
  PendingExchange,
  ReferenceDialog,
  SamplingDialog,
  SystemPromptEditor,
  ThreeColumns,
  type PendingExchangeData,
} from './chat-ui'
import { FreshStep } from './fresh-step'
import { chatFreeStream } from './client'
import { OfflineBanner } from './OfflineBar'
import { useSettings, tdModels , defaultTemperature } from './settings'
import { useAttempts, type SentMessage } from './sandbox'
import { useSharedModel, useStepField } from './step-state'
import { useProgress } from './progress'
import {
  ATTACHMENTS,
  DOC_HEADER,
  RAG_HEADER,
  needsRetrieval,
  type Attachment,
} from './attachments-data'
import { chunkDocument, retrieve, retrieveSemantic, type Retrieved } from './retrieval'
import { SYSTEM_PROMPT, DEFAULT_SANDBOX_MODEL } from './warmup-data'
import {
  SYNTHESIS_BRIEF,
  SYNTHESIS_CHECKS,
  SYNTHESIS_RULES,
} from './synthesis-data'

const SCOPE = 'synthesis' as const

/**
 * Grille de vérification, stockée par essai.
 *
 * Sérialisée dans un champ texte de l'état d'étape (`levelId`), faute de
 * champ dédié : `"<attemptId>:<checkId>,<checkId>|<attemptId>:…"`. Le
 * format est volontairement plat — il ne survit pas à un rechargement de
 * schéma, mais il n'a pas à le faire : la séance dure deux heures.
 */
type Marks = Record<string, string[]>

function parseMarks(raw: string | null): Marks {
  if (!raw) return {}
  const out: Marks = {}
  for (const entry of raw.split('|')) {
    const [id, list] = entry.split(':')
    if (id) out[id] = list ? list.split(',').filter(Boolean) : []
  }
  return out
}

function serialiseMarks(marks: Marks): string {
  return Object.entries(marks)
    .map(([id, list]) => `${id}:${list.join(',')}`)
    .join('|')
}

// ---------- Les consignes ----------


// ---------- Le trombone ----------

function AttachDialog({
  lang,
  budget,
  selected,
  onToggle,
}: {
  lang: Lang
  budget: number
  /** Identifiants déjà joints. */
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="relative flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          title={pick(lang, 'Joindre des documents', 'Attach documents')}
        >
          <Paperclip className="size-3.5" />
          {pick(lang, 'Document', 'Document')}
          {selected.length > 0 && (
            <span className="rounded-full bg-blue-500/15 px-1.5 text-[10px] font-semibold text-blue-600 tabular-nums">
              {selected.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-base">
            {pick(lang, 'Joindre des documents', 'Attach documents')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              'Cochez ce que vous voulez joindre — un document, ou tous. Le texte part devant votre question ; au-delà du budget de contexte, il est fouillé et seuls les passages utiles sont envoyés.',
              'Tick what you want to attach — one document, or all of them. The text is sent before your question; beyond the context budget, it is searched and only the useful passages are sent.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {ATTACHMENTS.map((a) => {
            const on = selected.includes(a.id)
            return (
              <button
                key={a.id}
                onClick={() => onToggle(a.id)}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 rounded-md border p-3 text-left transition-colors',
                  on
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-accent)]',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    on ? 'border-blue-500 bg-blue-500 text-white' : 'border-[var(--color-border)]',
                  )}
                >
                  {on && <Check className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{tr(lang, a.label)}</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">
                    {tr(lang, a.source)}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--color-muted-foreground)]">
                    {a.tokens.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} tokens
                    {needsRetrieval(a, budget) &&
                      pick(lang, ' — envoyé par extraits', ' — sent as excerpts')}
                  </span>
                </span>
              </button>
            )
          })}

          {/* Joindre TOUT est le geste que l'étape doit rendre possible : c'est
              en saturant le contexte qu'on voit ce que la recherche coûte. */}
          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2 text-xs">
            <button
              onClick={() =>
                ATTACHMENTS.filter((a) => !selected.includes(a.id)).forEach((a) =>
                  onToggle(a.id),
                )
              }
              className="cursor-pointer text-blue-600 hover:underline"
            >
              {pick(lang, 'Tout joindre', 'Attach all')}
            </button>
            {selected.length > 0 && (
              <button
                onClick={() => selected.forEach((id) => onToggle(id))}
                className="cursor-pointer text-[var(--color-muted-foreground)] hover:underline"
              >
                {pick(lang, 'Tout retirer', 'Remove all')}
              </button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => setOpen(false)} className="cursor-pointer">
            {pick(lang, 'Valider', 'Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Colonne gauche : l'énoncé ----------

function BriefPane({ lang, unlocked }: { lang: Lang; unlocked: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-3">
      <BriefTitle title={tr(lang, SYNTHESIS_BRIEF.title)} />

      <div className="rounded-md border-l-2 border-l-blue-500 bg-[var(--color-muted)] p-3 text-xs leading-relaxed">
        {tr(lang, SYNTHESIS_BRIEF.patient)}
      </div>

      <p className="text-sm font-medium">{tr(lang, SYNTHESIS_BRIEF.question)}</p>

      {/* Ancrés en bas de la colonne, comme aux autres étapes : ce sont des
          références qu'on ouvre au besoin, pas la consigne elle-même. */}
      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <RulesDialog lang={lang} intro={SYNTHESIS_BRIEF.intro} rules={SYNTHESIS_RULES} />
        {/* Déverrouillée ici : l'épreuve consiste justement à comparer les
            réponses à la recommandation, pas à juger à l'aveugle. */}
        <ReferenceDialog lang={lang} unlocked={unlocked} block />
      </div>
    </div>
  )
}

// ---------- Colonne droite : le tableau de bord ----------

/**
 * Une ligne par modèle : ce qui a été essayé, et ce que la grille a
 * validé. C'est ce tableau qui porte le message de l'étape — une case
 * verte isolée ne vaut rien, c'est la LIGNE complète qu'on cherche, sur
 * les trois modèles.
 */
function Scoreboard({
  lang,
  marks,
  attemptsByModel,
  activeId,
  onSelect,
}: {
  lang: Lang
  marks: Marks
  attemptsByModel: Map<string, { id: string; order: number }[]>
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const solved = tdModels().filter((m) =>
    (attemptsByModel.get(m.id) ?? []).some((a) =>
      SYNTHESIS_CHECKS.every((c) => (marks[a.id] ?? []).includes(c.id)),
    ),
  ).length

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Trophy
            className={cn(
              'size-4',
              solved === tdModels().length ? 'text-emerald-500' : 'text-slate-500',
            )}
          />
          {pick(lang, 'Tableau de bord', 'Scorecard')}
        </span>
        <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
          {solved}/{tdModels().length}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {tdModels().map((m) => {
          const tried = attemptsByModel.get(m.id) ?? []
          const best = tried.reduce<{ id: string; hits: number } | null>((acc, a) => {
            const hits = SYNTHESIS_CHECKS.filter((c) => (marks[a.id] ?? []).includes(c.id)).length
            return !acc || hits > acc.hits ? { id: a.id, hits } : acc
          }, null)
          const complete = best?.hits === SYNTHESIS_CHECKS.length

          return (
            <button
              key={m.id}
              disabled={!best}
              onClick={() => best && onSelect(best.id)}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                best ? 'cursor-pointer hover:bg-[var(--color-accent)]' : 'opacity-50',
                best && best.id === activeId && 'bg-[var(--color-accent)]',
              )}
            >
              <span className="min-w-0 flex-1 truncate font-medium">{m.displayName}</span>
              {tried.length === 0 ? (
                <span className="shrink-0 text-[var(--color-muted-foreground)]">
                  {pick(lang, 'à essayer', 'to try')}
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-0.5">
                  {SYNTHESIS_CHECKS.map((c) => {
                    const ok = best ? (marks[best.id] ?? []).includes(c.id) : false
                    return (
                      <span
                        key={c.id}
                        title={tr(lang, c.label)}
                        className={cn(
                          'size-2 rounded-full',
                          ok ? 'bg-emerald-500' : 'bg-[var(--color-border)]',
                        )}
                      />
                    )
                  })}
                  {complete && <Check className="ml-1 size-3 text-emerald-500" />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
        {solved === tdModels().length
          ? pick(
              lang,
              'Tous les modèles répondent juste avec votre prompt. C’est ce qu’on cherchait : le prompt porte l’information, il ne compte pas sur le modèle.',
              'Every model answers correctly with your prompt. That is the goal: the prompt carries the information, it does not rely on the model.',
            )
          : pick(
              lang,
              'Un prompt qui ne marche que sur un modèle n’est pas robuste. Rejouez le même texte sur les autres.',
              'A prompt that works on only one model is not robust. Replay the same text on the others.',
            )}
      </p>
    </div>
  )
}

/** La grille cochable, sous la réponse affichée. */
function CheckGrid({
  lang,
  checked,
  onToggle,
}: {
  lang: Lang
  checked: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <ListChecks className="size-3.5 text-blue-500" />
        {pick(lang, 'Cette réponse est-elle juste ?', 'Is this answer right?')}
      </p>
      <div className="flex flex-col gap-1.5">
        {SYNTHESIS_CHECKS.map((c) => {
          const on = checked.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              title={tr(lang, c.help)}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-accent)]',
                on && 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              <span
                className={cn(
                  'mt-px flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                  on
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-[var(--color-border)]',
                )}
              >
                {on && <Check className="size-3" />}
              </span>
              <span className="leading-relaxed">{tr(lang, c.label)}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          'Survolez chaque ligne pour savoir ce qui compte. Comparez à la recommandation, pas à votre impression.',
          'Hover each line to see what counts. Compare with the guideline, not with your impression.',
        )}
      </p>
    </div>
  )
}

// ---------- L'étape ----------

export function SynthesisStep({ lang }: { lang: Lang }) {
  const { attempts, add, remove, reset } = useAttempts(SCOPE)
  const [settings, updateSettings] = useSettings()
  const [progress] = useProgress()

  const [modelId, setModelId] = useSharedModel(DEFAULT_SANDBOX_MODEL)
  const [prompt, setPrompt] = useStepField(SCOPE, 'prompt', '')
  const [activeId, setActiveId] = useStepField(SCOPE, 'activeId', null as string | null)
  const [attachedId, setAttachedId] = useStepField(SCOPE, 'attachedId', null as string | null)
  // 0,7 comme partout ailleurs dans le TD : baisser la température fait
  // partie de l'épreuve, ce n'est pas un réglage offert d'avance.
  const [temperature, setTemperature] = useStepField(SCOPE, 'temperature', defaultTemperature(settings))
  const [rawMarks, setRawMarks] = useStepField(SCOPE, 'levelId', null as string | null)

  const [pending, setPending] = useState<PendingExchangeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const defaultSystem = tr(lang, SYSTEM_PROMPT.text)
  const systemPrompt = settings.systemPrompt ?? defaultSystem
  const systemIsDefault = settings.systemPrompt === null
  const model = tdModels().find((m) => m.id === modelId) ?? tdModels()[0]
  const budget = settings.documentBudget
  // Plusieurs pièces jointes possibles, dans l'ordre où elles ont été
  // choisies. Sérialisées en liste séparée par des virgules pour tenir dans
  // le champ texte existant — les identifiants n'en contiennent aucune.
  const attachedIds = attachedId ? attachedId.split(',').filter(Boolean) : []
  const attachedDocs = attachedIds
    .map((id) => ATTACHMENTS.find((a) => a.id === id))
    .filter((a): a is Attachment => !!a)

  function toggleAttachment(id: string) {
    const next = attachedIds.includes(id)
      ? attachedIds.filter((x) => x !== id)
      : [...attachedIds, id]
    setAttachedId(next.length > 0 ? next.join(',') : null)
  }
  // `activeId` null : tout le fil ; un identifiant : cet essai seul.
  const active = attempts.find((a) => a.id === activeId) ?? null
  const shown = active ? [active] : attempts
  const lastPrompt = attempts.at(-1)?.prompt

  const sampling = { temperature }

  const marks = parseMarks(rawMarks)

  const attemptsByModel = new Map<string, { id: string; order: number }[]>()
  for (const a of attempts) {
    const list = attemptsByModel.get(a.modelId) ?? []
    list.push({ id: a.id, order: a.order })
    attemptsByModel.set(a.modelId, list)
  }

  function toggleMark(attemptId: string, checkId: string) {
    const current = marks[attemptId] ?? []
    const next = current.includes(checkId)
      ? current.filter((c) => c !== checkId)
      : [...current, checkId]
    setRawMarks(serialiseMarks({ ...marks, [attemptId]: next }))
  }

  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    el.scrollTo({ top: activeId ? 0 : el.scrollHeight })
  }, [activeId, attempts.length])

  useEffect(() => {
    if (pending) centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [pending])

  function stop() {
    abortRef.current?.abort()
    abortRef.current = null
  }

  /** `again` : le dernier prompt, renvoyé tel quel sans toucher au brouillon. */
  async function send(again?: string) {
    const text = (again ?? prompt).trim()
    if (!text || pending) return

    setError(null)
    setActiveId(null)
    setPending({ prompt: text, modelId, text: '' })
    if (again === undefined) setPrompt('')

    // Même bascule qu'à l'étape « Documents », appliquée à CHAQUE pièce
    // jointe : sous le budget elle part en entier, au-dessus elle est
    // fouillée. Le budget se partage entre les documents retenus, sinon deux
    // gros documents enverraient chacun de quoi saturer le contexte.
    let anyRag = false
    const blocks: string[] = []

    for (const doc of attachedDocs) {
      const rag = needsRetrieval(doc, budget)
      if (!rag) {
        blocks.push(doc.content)
        continue
      }
      anyRag = true
      const chunks = chunkDocument(doc.content)
      const room = Math.floor((budget * 0.9) / attachedDocs.length)
      const viaModel = await retrieveSemantic(
        settings.apiBaseUrl,
        chunks,
        text,
        room,
        undefined,
        doc.contexts,
      )
      const found: Retrieved[] =
        viaModel && viaModel.length > 0 ? viaModel : retrieve(chunks, text, room)
      blocks.push(found.map((c) => `[Page ${c.page} — ${c.title}]\n${c.text}`).join('\n\n'))
    }

    // Chaque bloc est précédé du titre de son document : sans cela, deux
    // recommandations collées bout à bout deviendraient une seule source
    // indistincte, et le modèle citerait l'une pour l'autre.
    const docText = attachedDocs
      .map((doc, i) => `## ${tr(lang, doc.label)}\n\n${blocks[i] ?? ''}`)
      .filter((b) => b.trim())
      .join('\n\n')

    const header = anyRag
      ? pick(lang, RAG_HEADER.fr, RAG_HEADER.en)
      : pick(lang, DOC_HEADER.fr, DOC_HEADER.en)
    const body = docText ? `${header}\n\n${docText}\n\n---\n\n${text}` : text

    const sent: SentMessage[] = []
    if (systemPrompt.trim()) sent.push({ role: 'system', content: systemPrompt })
    if (docText) sent.push({ role: 'document', content: `${header}\n\n${docText}` })
    sent.push({ role: 'user', content: text })

    const controller = new AbortController()
    abortRef.current = controller

    const res = await chatFreeStream(
      model.slug,
      body,
      systemPrompt,
      (chunk) => setPending((p) => (p ? { ...p, text: p.text + chunk } : p)),
      sampling,
      controller.signal,
    )

    abortRef.current = null
    setPending(null)

    // Arrêt avant le premier mot : rien à conserver, la question est rendue.
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
              'Aucune API configurée. Renseignez l’URL du backend dans les réglages.',
              'No API configured. Set the backend URL in the settings.',
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

    add({
      modelId,
      prompt: text,
      answer: res.text,
      source: res.source,
      sent,
      usage: res.usage,
      sampling,
    })
  }

  return (
    <ThreeColumns
      left={
        <FreshStep.Provider value={attempts.length === 0}>
          <BriefPane lang={lang} unlocked={progress.seenGuidelines} />
        </FreshStep.Provider>
      }
      right={
        <div className="flex h-full min-h-0 flex-col gap-3">
          <Scoreboard
            lang={lang}
            marks={marks}
            attemptsByModel={attemptsByModel}
            activeId={activeId}
            onSelect={setActiveId}
          />
          <div className="min-h-0 flex-1">
            <HistoryPane
              lang={lang}
              attempts={attempts}
              activeId={activeId}
              onSelect={setActiveId}
              onShowAll={() => setActiveId(null)}
              badge={(a) => {
                const hits = SYNTHESIS_CHECKS.filter((c) =>
                  (marks[a.id] ?? []).includes(c.id),
                ).length
                return (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-px text-[11px] font-medium tabular-nums',
                      hits === SYNTHESIS_CHECKS.length
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-500/10 text-[var(--color-muted-foreground)]',
                    )}
                  >
                    {hits}/{SYNTHESIS_CHECKS.length}
                  </span>
                )
              }}
              onRemove={(id) => {
                remove(id)
                if (id === activeId) setActiveId(null)
              }}
              onClear={() => {
                reset()
                setActiveId(null)
                setRawMarks(null)
              }}
            />
          </div>
        </div>
      }
      center={
        <div className="flex h-full min-h-0 flex-col">
          {settings.offlineMode && <OfflineBanner lang={lang} className="mt-2 mr-3" />}

          <div ref={centerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3 pr-5">
            {attempts.length === 0 && !pending && <ReadRulesHint lang={lang} />}

            {shown.map((a, i) => (
              <div key={a.id} className="flex flex-col gap-4">
                {i > 0 && <NewConversationDivider lang={lang} />}
                <Exchange lang={lang} attempt={a} index={attempts.indexOf(a)} audited={false} />
                <CheckGrid
                  lang={lang}
                  checked={marks[a.id] ?? []}
                  onToggle={(c) => toggleMark(a.id, c)}
                />
              </div>
            ))}

            {pending && (
              <>
                {shown.length > 0 && <NewConversationDivider lang={lang} />}
                <PendingExchange lang={lang} pending={pending} />
              </>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-2 pr-5">
            <Composer
              lang={lang}
              value={prompt}
              onChange={setPrompt}
              onSend={() => void send()}
              onResend={() => lastPrompt && setPrompt(lastPrompt)}
              resendDisabled={!!pending || !lastPrompt || settings.offlineMode}
              rows={4}
              placeholder={pick(
                lang,
                'Écrivez votre prompt : contexte, rôle, exigence de source, droit de ne pas savoir…',
                'Write your prompt: context, role, source requirement, right not to know…',
              )}
              disabled={!!pending || !prompt.trim() || settings.offlineMode}
              tools={
                <>
                  <ModelPicker lang={lang} modelId={modelId} onSelect={setModelId} />
                  <AttachDialog
                    lang={lang}
                    budget={budget}
                    selected={attachedIds}
                    onToggle={toggleAttachment}
                  />
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
                    editable
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
                  {/* L'étape est la seule à n'avoir AUCUNE capture : le prompt
                      est libre, donc imprévisible. Autant le dire. */}
                  {settings.offlineMode && (
                    <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-500">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {pick(
                          lang,
                          'Cette étape demande d’écrire votre propre prompt : aucune réponse ne peut être rejouée hors ligne. Désactivez le mode hors ligne dans les réglages pour la faire.',
                          'This step asks you to write your own prompt: no answer can be replayed offline. Turn off offline mode in the settings to do it.',
                        )}
                      </span>
                    </p>
                  )}
                  {/* Un bloc par document, sur la même ligne : on voit d'un
                      coup d'œil tout ce qui part, et chacun se retire seul. */}
                  {attachedDocs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {attachedDocs.map((doc) => (
                        <span
                          key={doc.id}
                          className="flex max-w-[16rem] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] py-1 pr-1 pl-2 text-xs"
                        >
                          <FileText className="size-3.5 shrink-0 text-blue-500" />
                          <span className="min-w-0 flex-1 truncate">{tr(lang, doc.label)}</span>
                          <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)] tabular-nums">
                            {doc.tokens.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
                          </span>
                          <button
                            onClick={() => toggleAttachment(doc.id)}
                            className="shrink-0 cursor-pointer rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
                            title={pick(lang, 'Retirer ce document', 'Remove this document')}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
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

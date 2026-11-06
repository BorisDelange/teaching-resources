// ============================================================
// Étape « Documents » — joindre un PDF, comme dans un vrai chatbot.
//
// Le trombone ouvre un menu de pièces jointes. Ce qui se passe ensuite
// dépend de la TAILLE du document, et c'est tout le propos :
//
//   - ça tient dans le budget → le texte part EN ENTIER dans le contexte
//   - c'est trop gros         → l'application le fouille et n'envoie que
//                               les passages utiles : c'est le RAG
//
// Le geste de l'étudiant est identique dans les deux cas. Seule la machine
// change de stratégie, en silence — exactement comme ChatGPT et Claude,
// qui documentent cette bascule sans jamais la montrer à l'écran.
//
// Tailles : fiche HAS ≈ 1 200 tokens · table OMEDIT 2 122.
// Avec le budget de 1 000 tokens du TD, les deux basculent en recherche :
// la bascule se voit dès une fiche de trois pages.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  FileText,
  Search,
  Paperclip,
  Square,
  Square as SquareIcon,
  SquareCheckBig,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  SystemPromptView,
  ThreeColumns,
  type PendingExchangeData,
} from './chat-ui'
import { FreshStep } from './fresh-step'
import { bold } from './chat-format'
import { chatFreeStream } from './client'
import { OfflineBanner, OfflinePresets } from './OfflineBar'
import { captureKey, getCapture, hasCapture, hasCapturesFor } from './offline'
import { OFFLINE_DOC_QUESTIONS, offlinePlaceholder } from './offline-data'
import { useSettings, tdModels , defaultTemperature } from './settings'
import { useAttempts, type SentMessage } from './sandbox'
import { useSharedModel, useStepField } from './step-state'
import { DEFAULT_SANDBOX_MODEL, SYSTEM_PROMPT } from './warmup-data'
import {
  ATTACHMENTS,
  ATTACH_BRIEF,
  ATTACH_RULES,
  DOC_HEADER,
  RAG_HEADER,
  needsRetrieval,
  type Attachment,
} from './attachments-data'
import { PdfViewer } from './PdfViewer'
import {
  chunkDocument,
  highlightLines,
  retrieve,
  retrieveSemantic,
  type Retrieved,
} from './retrieval'

/**
 * Retrouve l'identifiant de capture d'une question préparée, d'après son
 * texte. Hors ligne, c'est lui qui, combiné à la pièce jointe, désigne la
 * réponse à rejouer : la même question donne une réponse DIFFÉRENTE selon
 * qu'on a joint le chapitre, la recommandation entière, ou rien.
 */
function offlineQuestionId(lang: Lang, text: string): string | null {
  const wanted = text.trim()
  return OFFLINE_DOC_QUESTIONS.find((q) => tr(lang, q.text).trim() === wanted)?.id ?? null
}

// ---------- Les consignes ----------


/** Un passage retenu, avec le document dont il vient. */
type DocChunk = Retrieved & { docId: string }

// ---------- Le menu du trombone ----------

function AttachDialog({
  lang,
  budget,
  selected,
  onToggle,
}: {
  lang: Lang
  budget: number
  /** Identifiants déjà joints : on peut joindre les deux documents. */
  selected: string[]
  onToggle: (a: Attachment) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          title={pick(lang, 'Joindre un document', 'Attach a document')}
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
            {pick(lang, 'Joindre un document', 'Attach a document')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              'Le texte des documents cochés sera recopié devant votre question. Vous pouvez en joindre plusieurs.',
              'The text of the ticked documents will be copied before your question. You can attach several.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {ATTACHMENTS.map((a) => {
            // Rien n'est refusé : au-delà du budget, on bascule en recherche.
            const rag = needsRetrieval(a, budget)
            const on = selected.includes(a.id)
            return (
              <button
                key={a.id}
                onClick={() => onToggle(a)}
                aria-pressed={on}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 rounded-md border p-3 text-left transition-colors',
                  on
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-[var(--color-border)] hover:border-blue-500 hover:bg-blue-500/5',
                )}
              >
                {on ? (
                  <SquareCheckBig className="mt-0.5 size-4 shrink-0 text-blue-600" />
                ) : (
                  <SquareIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-foreground)]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{tr(lang, a.label)}</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">
                    {tr(lang, a.source)}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        rag ? 'text-amber-600' : 'text-blue-600',
                      )}
                    >
                      {a.tokens.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} tokens
                    </span>
                    <span className="text-[var(--color-muted-foreground)]">
                      {a.pages} {pick(lang, 'pages', 'pages')}
                    </span>
                    <DarkTip
                      label={
                        rag
                          ? pick(
                              lang,
                              `Le document dépasse la moitié du budget de contexte (${budget.toLocaleString('fr-FR')} tokens) : seuls les passages utiles seront envoyés. Pour le joindre en entier, augmentez le budget de contexte dans les réglages.`,
                              `The document exceeds half the context budget (${budget.toLocaleString('en-US')} tokens): only the useful passages will be sent. To attach it whole, raise the context budget in the settings.`,
                            )
                          : pick(
                              lang,
                              'Le document fait moins de la moitié du budget de contexte : il est envoyé en entier.',
                              'The document is under half the context budget: it is sent whole.',
                            )
                      }
                    >
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[11px] font-medium',
                          rag
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-500'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
                        )}
                      >
                        {rag
                          ? pick(lang, 'Trop gros → recherche', 'Too large → search')
                          : pick(lang, 'Tient dans le contexte', 'Fits in context')}
                      </span>
                    </DarkTip>
                  </span>
                </span>
              </button>
            )
          })}
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              `Budget de contexte de ce TD : ${budget.toLocaleString('fr-FR')} tokens. Un document qui en dépasse la moitié n’est pas refusé : il est fouillé, et seuls les passages utiles sont envoyés.`,
              `This session’s context budget: ${budget.toLocaleString('en-US')} tokens. A document over half of it is not refused: it is searched, and only the useful passages are sent.`,
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- La pièce jointe, au-dessus du champ ----------

function AttachedChip({
  lang,
  attachment,
  onRemove,
}: {
  lang: Lang
  attachment: Attachment
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-blue-500/40 bg-blue-500/5 px-2.5 py-1.5">
      <FileText className="size-3.5 shrink-0 text-blue-500" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {tr(lang, attachment.label)}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-blue-600">
        +{attachment.tokens.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} tokens
      </span>
      <button
        onClick={onRemove}
        className="cursor-pointer rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-red-500"
        title={pick(lang, 'Retirer la pièce jointe', 'Remove the attachment')}
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

// ---------- Les passages retenus par la recherche ----------

/**
 * Ce panneau est le cœur pédagogique du mode recherche : il montre CE QUI a
 * été retenu, POURQUOI (les mots qui ont déclenché la sélection), et à quel
 * COÛT. Sans lui, le RAG resterait une boîte noire et l'étudiant n'aurait
 * aucun moyen de repérer que la recherche s'est trompée de chapitre.
 */
function SourcesPane({
  lang,
  sources,
  semantic,
  onOpen,
}: {
  lang: Lang
  sources: DocChunk[]
  /** true = classement par un modèle d'embedding ; false = par mots-clés. */
  semantic: boolean
  onOpen: (chunk: DocChunk) => void
}) {
  // Replié par défaut : il sert à vérifier, pas à lire à chaque réponse.
  const [open, setOpen] = useState(false)
  if (sources.length === 0) return null
  const total = sources.reduce((n, c) => n + c.tokens, 0)
  const docIds = [...new Set(sources.map((c) => c.docId))]
  const full = docIds.reduce(
    (n, id) => n + (ATTACHMENTS.find((a) => a.id === id)?.tokens ?? 0),
    0,
  )

  return (
    <div className="rounded-md border-l-2 border-l-amber-500 bg-amber-500/5 p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-center gap-x-2 text-left text-xs font-semibold text-amber-700 dark:text-amber-500',
          open && 'mb-1.5',
        )}
      >
        <Search className="size-3.5 shrink-0" />
        {pick(lang, 'Passages retenus par la recherche', 'Passages retrieved by the search')}
        <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[11px] font-normal text-[var(--color-muted-foreground)]">
          {semantic
            ? pick(lang, 'par le sens', 'by meaning')
            : pick(lang, 'par mots-clés', 'by keywords')}
        </span>
        <span className="font-normal tabular-nums text-[var(--color-muted-foreground)]">
          {total.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} {pick(lang, 'tokens envoyés sur', 'tokens sent out of')}{' '}
          {full.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
        </span>
        <ChevronDown
          className={cn('ml-auto size-3.5 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
      <>
      <div className="flex flex-col gap-2">
        {sources.map((c, i) => (
          <div
            key={i}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-2.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <button
                onClick={() => onOpen(c)}
                className="cursor-pointer text-xs font-medium text-blue-600 underline decoration-dotted underline-offset-2 hover:text-blue-500"
                title={pick(lang, 'Ouvrir le PDF à cette page', 'Open the PDF at this page')}
              >
                {docIds.length > 1 &&
                  `${tr(lang, ATTACHMENTS.find((a) => a.id === c.docId)?.label ?? { fr: '', en: '' }).split(' — ')[0]} · `}
                {pick(lang, 'Page', 'Page')} {c.page} — {c.title}
              </button>
              <span className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                {c.tokens} tokens
              </span>
            </div>
            {c.matched.length > 0 && (
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
              {pick(lang, 'Retenu pour :', 'Retrieved for:')}{' '}
              {c.matched.map((w) => (
                <span
                  key={w}
                  className="mr-1 inline-block rounded bg-amber-500/15 px-1 py-0.5 text-amber-700 dark:text-amber-500"
                >
                  {w}
                </span>
              ))}
            </p>
            )}
            {c.matched.length === 0 && (
              <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                {pick(lang, 'Proximité de sens :', 'Semantic similarity:')}{' '}
                <span className="tabular-nums">{c.score.toFixed(3)}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
        {bold(
          semantic
            ? pick(
                lang,
                'Un modèle a comparé le **sens** de votre question à celui de chaque section — il peut donc trouver le bon chapitre sans partager un seul mot avec la question. Vérifiez tout de même : si la recherche se trompe de chapitre, le modèle se trompera avec elle, **en citant une page**.',
                'A model compared the **meaning** of your question with each section — so it can find the right chapter without sharing a single word with your question. Check anyway: if the search picks the wrong chapter, the model will be wrong with it, **while citing a page**.',
              )
            : pick(
                lang,
                'Ici la recherche choisit sur les **mots**, pas sur le sens : elle ne peut pas deviner qu’une « PNA sans signe de gravité » est une PNA *simple*. Si elle se trompe de chapitre, le modèle se trompera avec elle — **en citant une page**.',
                'Here the search selects on **words**, not meaning: it cannot guess that an “APN without severity” is an *uncomplicated* APN. If it picks the wrong chapter, the model will be wrong with it — **while citing a page**.',
              ),
        )}
      </p>
      </>
      )}
    </div>
  )
}

// ---------- Le PDF, ouvert sur le passage cité ----------

function SourceDialog({
  lang,
  target,
  onClose,
}: {
  lang: Lang
  /** Le passage retenu, surligné en entier dans le PDF. */
  target: DocChunk | null
  onClose: () => void
}) {
  const attachment = ATTACHMENTS.find((a) => a.id === target?.docId) ?? null
  // Hooks avant tout retour anticipé : l'ordre des hooks doit être stable.
  const lines = useMemo(() => (target ? highlightLines(target) : []), [target])
  if (!attachment || !target) return null

  const first = lines[0]?.page ?? target.page
  const pages = [...new Set(lines.map((l) => l.page))].sort((a, b) => a - b)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[85vh] w-[min(64rem,calc(100%-2rem))] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-blue-500" />
            {tr(lang, attachment.label)}
            <span className="text-sm font-normal text-[var(--color-muted-foreground)]">
              {pages.length > 1
                ? `${pick(lang, 'pages', 'pages')} ${pages[0]}–${pages[pages.length - 1]}`
                : `${pick(lang, 'page', 'page')} ${first}`}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              'Tout le passage envoyé au modèle est surligné. C’est ce qui rend la réponse vérifiable.',
              'The whole passage sent to the model is highlighted. This is what makes the answer checkable.',
            )}
          </DialogDescription>
        </DialogHeader>
        {/* min-h-0 ET min-w-0 : sans eux, la visionneuse impose sa taille
            naturelle et déborde du modal au lieu de s'y adapter.
            `key` sur la page d'ouverture : rouvrir sur un AUTRE passage doit
            repartir d'un composant neuf, sinon `initialPage` n'est plus lu. */}
        <PdfViewer
          key={`${attachment.id}-${first}`}
          file={attachment.file}
          initialPage={first}
          highlights={lines.map((l) => ({ page: l.page, text: l.quote }))}
          fill
          className="min-h-0 min-w-0 flex-1"
        />
      </DialogContent>
    </Dialog>
  )
}

// ---------- Colonne gauche ----------

function BriefPane({ lang }: { lang: Lang }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-3">
      <BriefTitle title={tr(lang, ATTACH_BRIEF.title)} />

      <div className="rounded-md border-l-2 border-l-blue-500 bg-[var(--color-muted)] p-3 text-xs leading-relaxed">
        {tr(lang, ATTACH_BRIEF.patient)}
      </div>

      <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {tr(lang, ATTACH_BRIEF.question)}
      </p>

      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <RulesDialog lang={lang} intro={ATTACH_BRIEF.intro} rules={ATTACH_RULES} />
        <ReferenceDialog lang={lang} unlocked block />
      </div>
    </div>
  )
}

// ---------- L'étape ----------

export function DocumentsStep({ lang }: { lang: Lang }) {
  const scope = 'documents' as const
  const [settings] = useSettings()
  const { attempts, add, remove, reset } = useAttempts(scope)

  const [modelId, setModelId] = useSharedModel(DEFAULT_SANDBOX_MODEL)
  const [prompt, setPrompt] = useStepField(scope, 'prompt', '')
  const [activeId, setActiveId] = useStepField(scope, 'activeId', null as string | null)
  const [attachedId, setAttachedId] = useStepField(scope, 'levelId', null as string | null)
  const [temperature, setTemperature] = useStepField(
    scope,
    'temperature',
    defaultTemperature(settings),
  )

  const [pending, setPending] = useState<PendingExchangeData | null>(null)
  // Passages retenus par la recherche au dernier envoi. Vides quand le
  // document tenait en entier dans le contexte : il n'y a alors rien à choisir.
  const [sources, setSources] = useState<DocChunk[]>([])
  // Quelle méthode a effectivement servi : le panneau des sources doit le
  // dire, sinon on ne sait pas à quoi attribuer un bon (ou mauvais) choix.
  const [semanticUsed, setSemanticUsed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [target, setTarget] = useState<DocChunk | null>(null)

  const systemPrompt = settings.systemPrompt ?? tr(lang, SYSTEM_PROMPT.text)
  const model = tdModels().find((m) => m.id === modelId) ?? tdModels()[0]

  // Hors ligne, les réponses sont rejouées telles qu'enregistrées : le réglage
  // n'aurait aucun effet, et l'afficher autrement serait mentir.
  const sampling = {
    temperature: settings.offlineMode ? defaultTemperature(settings) : temperature,
  }

  // Un modèle choisi en ligne (ou hérité d'une session précédente) peut ne pas
  // avoir de capture pour cette étape : on bascule alors sur celui qui en a,
  // plutôt que de laisser l'étudiant devant un envoi qui échouera.
  useEffect(() => {
    if (settings.offlineMode && !hasCapturesFor('documents', modelId)) {
      const fallback = tdModels().find((m) => hasCapturesFor('documents', m.id))
      if (fallback) setModelId(fallback.id)
    }
  }, [settings.offlineMode, modelId, setModelId])
  const budget = settings.documentBudget
  // Plusieurs pièces jointes possibles, dans l'ordre où elles ont été
  // cochées, rangées dans le même champ texte séparées par des virgules.
  const attachedIds = attachedId ? attachedId.split(',').filter(Boolean) : []
  const attachedDocs = attachedIds
    .map((id) => ATTACHMENTS.find((a) => a.id === id))
    .filter((a): a is Attachment => !!a)
  // Clé de rejeu hors ligne : les documents joints, dans un ordre stable.
  const docsKey = attachedDocs.length
    ? attachedDocs.map((a) => a.id).sort().join('+')
    : 'none'

  function toggleAttachment(a: Attachment) {
    const next = attachedIds.includes(a.id)
      ? attachedIds.filter((x) => x !== a.id)
      : [...attachedIds, a.id]
    setAttachedId(next.length > 0 ? next.join(',') : null)
  }
  // `activeId` null : tout le fil ; un identifiant : cet essai seul.
  const active = attempts.find((a) => a.id === activeId) ?? null
  const shown = active ? [active] : attempts
  const last = attempts.at(-1)

  useEffect(() => {
    if (pending) centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [pending])

  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    el.scrollTo({ top: activeId ? 0 : el.scrollHeight })
  }, [activeId, attempts.length])

  /** `again` : le dernier prompt, renvoyé tel quel sans toucher au brouillon. */
  async function send(again?: string) {
    const text = (again ?? prompt).trim()
    if (!text || pending) return

    if (again === undefined) setPrompt('')
    setError(null)
    setActiveId(null)
    setPending({ prompt: text, modelId, text: '' })

    // LA bascule, document par document. Sous la moitié du budget, il part
    // en entier ; au-delà, on le fouille et on n'envoie que les passages
    // retenus. Le budget de recherche se partage entre les documents fouillés.
    const ragDocs = attachedDocs.filter((d) => needsRetrieval(d, budget))
    let found: DocChunk[] = []
    let semantic = false

    // Hors ligne, la recherche elle-même est rejouée : le modèle d'embedding
    // vit sur le backend, donc les passages retenus ont été enregistrés en
    // même temps que la réponse.
    const offlineKey = settings.offlineMode
      ? captureKey('documents', modelId, docsKey, offlineQuestionId(lang, text) ?? '')
      : undefined
    const offlineCapture = offlineKey ? getCapture(offlineKey) : null

    if (offlineCapture) {
      found = (offlineCapture.sources ?? []).map((s) => ({
        title: s.title,
        path: s.path,
        page: s.page,
        text: s.text,
        score: s.score,
        tokens: Math.ceil(s.text.length / 4),
        breaks: [{ at: 0, page: s.page }],
        matched: [],
        docId: s.docId ?? ragDocs[0]?.id ?? attachedDocs[0]?.id ?? '',
      }))
      semantic = offlineCapture.semantic ?? false
    } else {
      const room = Math.floor((budget * 0.9) / Math.max(1, ragDocs.length))
      for (const doc of ragDocs) {
        const chunks = chunkDocument(doc.content)
        // On tente d'abord la recherche SÉMANTIQUE (modèle sur le backend) :
        // elle seule sait qu'une « PNA communautaire sans signe de gravité »
        // est une PNA simple, mot que la question ne contient pas.
        const viaModel = await retrieveSemantic(
          settings.apiBaseUrl,
          chunks,
          text,
          room,
          undefined,
          doc.contexts,
        )
        const picked =
          viaModel && viaModel.length > 0 ? viaModel : retrieve(chunks, text, room)
        if (viaModel && viaModel.length > 0) semantic = true
        found = [...found, ...picked.map((c) => ({ ...c, docId: doc.id }))]
      }
    }

    // Chaque document est précédé de son titre : sans cela, deux documents
    // collés bout à bout deviendraient une seule source indistincte, et le
    // modèle citerait l'un pour l'autre.
    const docText = attachedDocs
      .map((doc) => {
        const body = ragDocs.includes(doc)
          ? found
              .filter((c) => c.docId === doc.id)
              .map((c) => `[Page ${c.page} — ${c.title}]\n${c.text}`)
              .join('\n\n')
          : doc.content
        return `## ${tr(lang, doc.label)}\n\n${body}`
      })
      .join('\n\n')

    const header = ragDocs.length > 0
      ? pick(lang, RAG_HEADER.fr, RAG_HEADER.en)
      : pick(lang, DOC_HEADER.fr, DOC_HEADER.en)

    const body = docText ? `${header}\n\n${docText}\n\n---\n\n${text}` : text

    const sent: SentMessage[] = []
    if (systemPrompt.trim()) sent.push({ role: 'system', content: systemPrompt })
    if (docText) {
      sent.push({ role: 'document', content: `${header}\n\n${docText}` })
    }
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
      undefined,
      offlineKey,
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
        res.error === 'no-capture'
          ? pick(
              lang,
              'Aucune réponse enregistrée pour cette question avec ce document. Choisissez une question préparée, ou changez de pièce jointe.',
              'No recorded answer for this question with this document. Pick a prepared question, or change the attachment.',
            )
          : res.error === 'no-api'
          ? pick(
              lang,
              'Aucune API configurée. Renseignez l’URL du backend dans l’onglet « Réglages ».',
              'No API configured. Set the backend URL in the “Settings” tab.',
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

    // Les passages retenus sont gardés AVEC l'échange : c'est ce qui permet
    // de rouvrir le PDF sur le bon passage, même après plusieurs questions.
    setSources(found)
    setSemanticUsed(semantic)
    add({
      modelId,
      prompt: text,
      answer: res.text,
      source: res.source,
      sent,
      usage: res.usage,
      levelId: attachedIds.join(',') || undefined,
      sampling,
    })
  }

  function stop() {
    abortRef.current?.abort()
    abortRef.current = null
  }

  const layout = (
    <ThreeColumns
      left={
        <FreshStep.Provider value={attempts.length === 0}>
          <BriefPane lang={lang} />
        </FreshStep.Provider>
      }
      right={
        <HistoryPane
          lang={lang}
          attempts={attempts}
          activeId={activeId}
          onSelect={setActiveId}
          onShowAll={() => setActiveId(null)}
          onRemove={(id) => {
            remove(id)
            if (id === activeId) setActiveId(null)
          }}
          onClear={() => {
            reset()
            setActiveId(null)
          }}
        />
      }
      center={
        <div className="flex h-full min-h-0 flex-col">
          {settings.offlineMode && <OfflineBanner lang={lang} className="mt-2 mr-3" />}

          <div ref={centerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3 pr-5">
            {attempts.length === 0 && !pending && <ReadRulesHint lang={lang} />}

            {shown.map((a, i) => (
              <div key={a.id} className="flex flex-col gap-4">
                {i > 0 && <NewConversationDivider lang={lang} />}
                <Exchange
                  lang={lang}
                  attempt={a}
                  index={attempts.indexOf(a)}
                />
                {/* Les passages retenus ne sont gardés que pour le dernier
                    envoi : c'est lui qu'on vérifie. */}
                {a === last && !pending && sources.length > 0 && (
                  <SourcesPane
                    lang={lang}
                    semantic={semanticUsed}
                    sources={sources}
                    onOpen={(c) => setTarget(c)}
                  />
                )}
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
              onResend={() => last && setPrompt(last.prompt)}
              resendDisabled={!!pending || !last}
              rows={3}
              readOnly={settings.offlineMode}
              placeholder={
                settings.offlineMode
                  ? offlinePlaceholder(lang)
                  : pick(
                      lang,
                      'Posez votre question, avec ou sans document joint…',
                      'Ask your question, with or without an attached document…',
                    )
              }
              disabled={
                !prompt.trim() ||
                // Hors ligne, l'envoi n'a de sens que si la paire
                // (question, pièce jointe) a été capturée.
                (settings.offlineMode &&
                  !hasCapture(
                    captureKey(
                      'documents',
                      modelId,
                      docsKey,
                      offlineQuestionId(lang, prompt) ?? '',
                    ),
                  ))
              }
              tools={
                <>
                  {/* Le modèle d'abord, le trombone juste après : même ordre
                      qu'aux autres étapes, pour que la barre se lise pareil
                      partout. */}
                  <ModelPicker
                    lang={lang}
                    modelId={modelId}
                    onSelect={setModelId}
                    offlineStep="documents"
                  />
                  <AttachDialog
                    lang={lang}
                    budget={budget}
                    selected={attachedIds}
                    onToggle={toggleAttachment}
                  />
                  <SystemPromptView lang={lang} value={systemPrompt} />
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
                  {settings.offlineMode && (
                    <OfflinePresets
                      lang={lang}
                      presets={OFFLINE_DOC_QUESTIONS}
                      onPick={setPrompt}
                      disabled={!!pending}
                      done={
                        new Set(
                          OFFLINE_DOC_QUESTIONS.filter((q) =>
                            attempts.some((a) => a.prompt.trim() === tr(lang, q.text).trim()),
                          ).map((q) => q.id),
                        )
                      }
                    />
                  )}
                  {error && (
                    <p className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      {error}
                    </p>
                  )}
                  {attachedDocs.map((doc) => (
                    <AttachedChip
                      key={doc.id}
                      lang={lang}
                      attachment={doc}
                      onRemove={() => toggleAttachment(doc)}
                    />
                  ))}
                </>
              }
            />
          </div>
        </div>
      }
    />
  )

  // Le modal PDF vit hors de la grille : il se superpose à toute l'étape.
  return (
    <>
      {layout}
      <SourceDialog
        lang={lang}
        target={target}
        onClose={() => setTarget(null)}
      />
    </>
  )
}

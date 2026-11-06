// ============================================================
// Étape « Le prompt » — quatre paliers, même cas, même modèle.
//
// Différences avec l'échauffement :
//   - la recommandation est ACCESSIBLE : l'étudiant peut juger ;
//   - le system prompt devient MODIFIABLE : c'est ici le sujet ;
//   - un sélecteur de paliers remplit le champ, et la réponse du
//     palier précédent reste affichée pour comparer.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Eye, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr, type Localized } from './data'
import {
  AttachLocked,
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
import { sentences } from './chat-format'
import { DEFAULT_SAMPLING } from './sampling'
import { chatFreeStream } from './client'
import { OfflineBanner } from './OfflineBar'
import { findCaptureByPrompt } from './offline'
import { offlinePlaceholder } from './offline-data'
import { useSettings, tdModels , defaultTemperature } from './settings'
import { useAttempts, type Attempt, type SentMessage } from './sandbox'
import { useSharedModel, useStepField } from './step-state'
import { DEFAULT_SANDBOX_MODEL, SYSTEM_PROMPT } from './warmup-data'
import {
  PROMPT_BRIEF,
  PROMPT_LEVELS,
  PROMPT_RULES,
  type PromptLevel,
} from './prompt-data'

// ---------- Les règles du jeu ----------


// ---------- Colonne gauche : l'énoncé + les paliers ----------

function BriefPane({
  lang,
  levelId,
  onPick,
  done,
}: {
  lang: Lang
  levelId: string | null
  onPick: (level: PromptLevel) => void
  done: Set<string>
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-3">
      <BriefTitle title={tr(lang, PROMPT_BRIEF.title)} />

      <div className="rounded-md border-l-2 border-l-blue-500 bg-[var(--color-muted)] p-3 text-xs leading-relaxed">
        {tr(lang, PROMPT_BRIEF.patient)}
      </div>

      <LevelPicker lang={lang} levelId={levelId} onPick={onPick} done={done} />

      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <RulesDialog lang={lang} intro={PROMPT_BRIEF.intro} rules={PROMPT_RULES} />
        <ReferenceDialog lang={lang} unlocked block />
      </div>
    </div>
  )
}

// ---------- Le sélecteur de paliers, dans la consigne ----------

function LevelPicker({
  lang,
  levelId,
  onPick,
  done,
}: {
  lang: Lang
  levelId: string | null
  onPick: (level: PromptLevel) => void
  done: Set<string>
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Une CONSIGNE, pas la question clinique : elle se lit en gris, sous le
          cas, sans lui disputer la vedette. */}
      <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {tr(lang, PROMPT_BRIEF.question)}
      </p>
      <div className="grid gap-2">
        {PROMPT_LEVELS.map((l) => {
          const active = l.id === levelId
          const isDone = done.has(l.id)
          return (
            <button
              key={l.id}
              onClick={() => onPick(l)}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-left transition-colors',
                active
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-[var(--color-border)] hover:border-blue-500/60 hover:bg-blue-500/10',
              )}
            >
              <span
                className={cn(
                  'mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-blue-500 text-white'
                      : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                )}
              >
                {l.step}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{tr(lang, l.label)}</span>
                <span className="mt-0.5 block text-xs leading-snug text-[var(--color-muted-foreground)]">
                  {tr(lang, l.adds)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Ce qu'il faut observer, sous la réponse ----------

function WatchNote({
  lang,
  watch,
  technique,
}: {
  lang: Lang
  watch: Localized
  technique: Localized
}) {
  return (
    <div className="rounded-md border-l-2 border-l-blue-500 bg-blue-500/5 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
        <Eye className="size-3.5" />
        {pick(lang, 'À regarder', 'What to look for')} — {tr(lang, technique)}
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {sentences(tr(lang, watch))}
      </p>
    </div>
  )
}

// ---------- Comparaison avec le palier précédent ----------

function PreviousAnswer({
  lang,
  attempt,
  level,
}: {
  lang: Lang
  attempt: Attempt
  level: PromptLevel
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-dashed border-[var(--color-border)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-xs font-semibold text-[var(--color-muted-foreground)]">
          {level.step}
        </span>
        <span className="font-medium">
          {pick(lang, 'Palier précédent', 'Previous level')} · {tr(lang, level.label)}
        </span>
        <span className="ml-auto text-[var(--color-muted-foreground)]">
          {open ? pick(lang, 'masquer', 'hide') : pick(lang, 'comparer', 'compare')}
        </span>
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] px-3 py-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {attempt.answer}
        </div>
      )}
    </div>
  )
}

// ---------- L'étape ----------

export function PromptStep({ lang }: { lang: Lang }) {
  const { attempts, add, judge, remove, reset } = useAttempts('prompt')
  const [settings, updateSettings] = useSettings()
  // Conservés entre les changements d'onglet : modèle, brouillon, palier
  // en cours et conversation affichée.
  const [modelId, setModelId] = useSharedModel(DEFAULT_SANDBOX_MODEL)
  const [prompt, setPrompt] = useStepField('prompt', 'prompt', '')
  const [levelId, setLevelId] = useStepField('prompt', 'levelId', null)
  const [activeId, setActiveId] = useStepField('prompt', 'activeId', null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingExchangeData | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const defaultSystem = tr(lang, SYSTEM_PROMPT.text)
  // null = consigne par défaut ; chaîne vide = aucune consigne (choix explicite).
  const systemPrompt = settings.systemPrompt ?? defaultSystem
  const systemIsDefault = settings.systemPrompt === null

  const model = tdModels().find((m) => m.id === modelId) ?? tdModels()[0]
  // `activeId` null : tout le fil ; un identifiant : cet essai seul.
  const active = attempts.find((a) => a.id === activeId) ?? null
  const shown = active ? [active] : attempts
  const lastPrompt = attempts.at(-1)?.prompt

  // Paliers déjà envoyés au moins une fois.
  const done = new Set(attempts.map((a) => a.levelId).filter((v): v is string => !!v))

  const currentLevel = PROMPT_LEVELS.find((l) => l.id === levelId) ?? null
  const activeLevel = PROMPT_LEVELS.find((l) => l.id === active?.levelId) ?? null

  // Dernière réponse du palier juste en dessous, pour la comparaison.
  const previousLevel = activeLevel
    ? (PROMPT_LEVELS.find((l) => l.step === activeLevel.step - 1) ?? null)
    : null
  const previousAttempt = previousLevel
    ? [...attempts].reverse().find((a) => a.levelId === previousLevel.id)
    : undefined

  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    el.scrollTo({ top: activeId ? 0 : el.scrollHeight })
  }, [activeId, attempts.length])

  useEffect(() => {
    if (pending) centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [pending])

  /** `again` : le dernier prompt, renvoyé tel quel sans toucher au brouillon. */
  async function send(again?: string) {
    const text = (again ?? prompt).trim()
    if (!text || pending) return
    // Renvoyé, le prompt garde le palier de l'essai d'origine.
    const sentLevel = again ? attempts.at(-1)?.levelId : (levelId ?? undefined)

    if (again === undefined) setPrompt('')
    setError(null)
    setActiveId(null)
    setPending({ prompt: text, modelId, text: '' })

    const sent: SentMessage[] = systemPrompt.trim()
      ? [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ]
      : [{ role: 'user', content: text }]

    const controller = new AbortController()
    abortRef.current = controller

    const res = await chatFreeStream(
      model.slug,
      text,
      systemPrompt,
      (chunk) => setPending((p) => (p ? { ...p, text: p.text + chunk } : p)),
      { temperature: defaultTemperature(settings) },
      controller.signal,
      undefined,
      findCaptureByPrompt('prompt', modelId, text)?.key,
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
              'Aucune réponse enregistrée pour ce prompt. Hors ligne, seuls les quatre paliers non modifiés peuvent être rejoués.',
              'No recorded answer for this prompt. Offline, only the four unmodified levels can be replayed.',
            )
          : res.error === 'no-api'
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

    add({
      modelId,
      prompt: text,
      answer: res.text,
      source: res.source,
      sent,
      usage: res.usage,
      levelId: sentLevel,
    })
  }

  function stop() {
    abortRef.current?.abort()
    abortRef.current = null
  }

  return (
    <ThreeColumns
      left={
        <FreshStep.Provider value={attempts.length === 0}>
          <BriefPane
          lang={lang}
          levelId={levelId}
          done={done}
          onPick={(l) => {
            setLevelId(l.id)
            setPrompt(tr(lang, l.text))
          }}
        />
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

            {shown.map((a, i) => {
              const level = PROMPT_LEVELS.find((l) => l.id === a.levelId)
              return (
                <div key={a.id} className="flex flex-col gap-4">
                  {i > 0 && <NewConversationDivider lang={lang} />}
                  {/* Essai seul : la réponse du palier d'avant, repliée, pour
                      comparer sans revenir au fil. */}
                  {active && previousAttempt && previousLevel && (
                    <PreviousAnswer lang={lang} attempt={previousAttempt} level={previousLevel} />
                  )}
                  <Exchange
                    lang={lang}
                    attempt={a}
                    index={attempts.indexOf(a)}
                    audited
                    note={level?.watch && <WatchNote lang={lang} watch={level.watch} technique={level.technique} />}
                    onJudge={(j) => judge(a.id, j)}
                  />
                </div>
              )
            })}

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
              resendDisabled={
                !!pending ||
                !lastPrompt ||
                (settings.offlineMode && !findCaptureByPrompt('prompt', modelId, lastPrompt))
              }
              rows={3}
              // Hors ligne, seuls les quatre paliers ont une réponse capturée :
              // on les choisit à gauche, on ne les retouche pas.
              readOnly={settings.offlineMode}
              placeholder={
                settings.offlineMode
                  ? offlinePlaceholder(lang)
                  : pick(
                      lang,
                      'Choisissez un palier à gauche, ou écrivez votre propre prompt…',
                      'Pick a level on the left, or write your own prompt…',
                    )
              }
              disabled={
                !!pending ||
                !prompt.trim() ||
                (settings.offlineMode && !findCaptureByPrompt('prompt', modelId, prompt))
              }
              tools={
                <>
                  <ModelPicker
                    lang={lang}
                    modelId={modelId}
                    onSelect={setModelId}
                    offlineStep="prompt"
                  />
                  <AttachLocked lang={lang} />
                  <SystemPromptEditor
                    lang={lang}
                    value={systemPrompt}
                    isDefault={systemIsDefault}
                    onChange={(v) => updateSettings({ systemPrompt: v === defaultSystem ? null : v })}
                    onRestore={() => updateSettings({ systemPrompt: null })}
                  />
                  <SamplingDialog lang={lang} value={DEFAULT_SAMPLING} />
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
                  {error && (
                    <p className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      {error}
                    </p>
                  )}
                  {currentLevel && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {pick(lang, 'Palier', 'Level')} {currentLevel.step} ·{' '}
                      <span className="font-medium text-[var(--color-foreground)]">
                        {tr(lang, currentLevel.technique)}
                      </span>
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

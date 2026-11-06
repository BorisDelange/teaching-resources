// ============================================================
// Étape « Réglages » — le hasard est un paramètre.
//
// Différence avec les étapes précédentes : ici la même question part
// PLUSIEURS FOIS, à l'identique. Ce n'est pas une conversation (aucune
// mémoire n'est renvoyée), c'est une série de tirages indépendants sur
// la même entrée — la seule façon de rendre visible que la réponse d'un
// LLM est échantillonnée, pas restituée.
//
// Les trois envois partent en parallèle : ils sont indépendants, et les
// enchaîner tripleraient l'attente sans rien apporter.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Dices, Info, Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr } from './data'
import {
  AttachLocked,
  BriefTitle,
  ReadRulesHint,
  DarkTip,
  RulesDialog,
  Exchange,
  HistoryPane,
  Composer,
  ModelPicker,
  PendingExchange,
  ReferenceDialog,
  SamplingDialog,
  SystemPromptView,
  ThreeColumns,
  type PendingExchangeData,
} from './chat-ui'
import { FreshStep } from './fresh-step'
import { sentences } from './chat-format'
import { chatFreeStream } from './client'
import { OfflineBanner } from './OfflineBar'
import { captureKey, hasCapture } from './offline'
import {
  OFFLINE_CHANCE_COLD,
  OFFLINE_CHANCE_HOT,
  OFFLINE_CHANCE_PROMPT,
  offlinePlaceholder,
} from './offline-data'
import { useSettings, tdModels } from './settings'
import { useAttempts, type SentMessage } from './sandbox'
import { useSharedModel, useStepField } from './step-state'
import { DEFAULT_SANDBOX_MODEL, SYSTEM_PROMPT } from './warmup-data'
import {
  REPEAT_COUNT,
  SETTINGS_BRIEF,
  SETTINGS_PRESETS,
  SETTINGS_QUESTION,
  SETTINGS_RULES,
  type SettingsPreset,
} from './settings-data'

const TONES: Record<SettingsPreset['tone'], { card: string; dot: string; text: string }> = {
  blue: {
    card: 'border-blue-500/40 bg-blue-500/5',
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
  },
  emerald: {
    card: 'border-emerald-500/40 bg-emerald-500/5',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  amber: {
    card: 'border-amber-500/40 bg-amber-500/5',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-500',
  },
  red: {
    card: 'border-red-500/40 bg-red-500/5',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-500',
  },
}

// ---------- Les consignes ----------

/**
 * Capture à rejouer pour le n-ième essai d'une série, hors ligne.
 *
 * Deux jeux ont été enregistrés : à température haute (plusieurs tirages,
 * tous différents) et à température 0 (deux tirages, quasi identiques). Le
 * choix entre les deux suit le réglage de l'étudiant, sans quoi baisser la
 * température ne changerait rien à l'écran — alors que c'est la seule chose
 * que l'étape demande d'observer.
 *
 * `index % n` : si l'étudiant demande plus d'essais qu'il n'y a de tirages,
 * on reboucle. Deux réponses identiques apparaissent alors, ce qui est
 * honnête — c'est ce que ferait un vrai modèle qui se répète.
 */
function offlineDrawKey(modelId: string, temperature: number, index: number): string {
  const cold = temperature <= 0.05
  const pool = cold ? OFFLINE_CHANCE_COLD : OFFLINE_CHANCE_HOT
  return captureKey('chance', modelId, `${cold ? 'cold' : 'hot'}-${index % pool}`)
}


// ---------- Colonne gauche : l'énoncé + les températures ----------

/**
 * Icône d'aide au survol. `tabIndex={-1}` : sans cela, le focus se pose
 * dessus à l'ouverture d'un modal et l'infobulle s'affiche toute seule.
 */
function HelpTip({ lang, text }: { lang: Lang; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={pick(lang, 'Aide', 'Help')}
          tabIndex={-1}
          className="cursor-help text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
        >
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function BriefPane({
  lang,
  temperature,
  onPick,
}: {
  lang: Lang
  temperature: number
  onPick: (p: SettingsPreset) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-3">
      <BriefTitle title={tr(lang, SETTINGS_BRIEF.title)} />

      <div className="rounded-md border-l-2 border-l-blue-500 bg-[var(--color-muted)] p-3 text-xs leading-relaxed">
        {tr(lang, SETTINGS_BRIEF.patient)}
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {pick(lang, 'Température', 'Temperature')}
          <HelpTip
            lang={lang}
            text={pick(
              lang,
              'Déforme les probabilités avant le tirage. À 0, le modèle prend toujours le mot le plus probable. Plus elle monte, plus il ose des mots improbables — jusqu’à perdre le fil.',
              'Reshapes the probabilities before the draw. At 0, the model always takes the most likely word. The higher it goes, the more it risks unlikely words — until it loses the thread.',
            )}
          />
        </p>
        {SETTINGS_PRESETS.map((p) => {
          const on = temperature === p.temperature
          const tone = TONES[p.tone]
          return (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-left text-xs transition-colors',
                on
                  ? tone.card
                  : 'border-[var(--color-border)] hover:bg-[var(--color-accent)]',
              )}
            >
              <span className={cn('size-2 shrink-0 rounded-full', on ? tone.dot : 'bg-slate-400/40')} />
              <span className={cn('font-medium', on && tone.text)}>{tr(lang, p.label)}</span>
            </button>
          )
        })}
      </div>

      {/* Top-p et top-k ne sont PAS ici, délibérément : la démonstration de
          l'étape porte sur la température, et trois curseurs commentés en
          parallèle noieraient le propos. Ils restent manipulables — avec
          leurs explications — dans le modal « Réglages » de la barre du
          haut, pour qui veut fouiller. */}

      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <RulesDialog lang={lang} intro={SETTINGS_BRIEF.intro} rules={SETTINGS_RULES} />
        <ReferenceDialog lang={lang} unlocked block />
      </div>
    </div>
  )
}

// ---------- Ce qu'il faut observer, sous la série ----------

function WatchNote({ lang, preset }: { lang: Lang; preset: SettingsPreset }) {
  return (
    <div className="rounded-md border-l-2 border-l-blue-500 bg-blue-500/5 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
        <Dices className="size-3.5 shrink-0" />
        {pick(lang, 'À regarder', 'What to watch')} — {tr(lang, preset.label)}
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {sentences(tr(lang, preset.watch))}
      </p>
    </div>
  )
}

/**
 * Verdict MESURÉ sur la série, jamais annoncé d'avance.
 *
 * Un piège classique serait de promettre « à 0, les réponses seront
 * identiques ». C'est faux en pratique : sur un serveur d'inférence, le
 * décodage glouton n'est que QUASI déterministe (les requêtes sont
 * traitées par lots, et l'addition en virgule flottante n'est pas
 * associative — l'ordre du lot change les derniers chiffres). Quand deux
 * mots sont presque à égalité, ce bruit suffit à faire basculer la
 * phrase. Vérifié en séance sur Llama 3.3 70B : « compte de 1 à 10 »
 * donne trois fois le même texte à 0, la question clinique non.
 *
 * On affiche donc ce qui s'est réellement produit, et on l'explique.
 */
function RunVerdict({
  lang,
  answers,
  temperature,
}: {
  lang: Lang
  answers: string[]
  temperature: number
}) {
  if (answers.length < 2) return null

  // Trois cas, pas deux : « toutes pareilles », « toutes différentes » et le
  // cas intermédiaire, fréquent — deux réponses se superposent et la
  // troisième s'écarte. Annoncer « les 3 diffèrent » serait alors faux, et
  // l'étudiant a le texte sous les yeux pour le constater.
  const distinct = new Set(answers.map((a) => a.trim())).size
  const total = answers.length
  const allSame = distinct === 1
  const allDifferent = distinct === total
  // Le cas instructif : à 0 on attendait l'identique, et ça ne l'est pas.
  const surprising = !allSame && temperature === 0

  const message = allSame
    ? pick(
        lang,
        `Les ${total} réponses sont identiques, mot pour mot. Le tirage au sort a disparu : sur cette question, le modèle est reproductible.`,
        `The ${total} answers are identical, word for word. The random draw is gone: on this question, the model is reproducible.`,
      )
    : surprising
      ? pick(
          lang,
          `${distinct} réponses distinctes sur ${total} — alors que la température est à 0. Ce n’est pas un bug : sur un serveur, les requêtes sont traitées par lots et les calculs en virgule flottante ne tombent pas toujours au même dernier chiffre. Quand deux mots sont presque à égalité, ce minuscule écart suffit à faire basculer la phrase. Retenez-le : même « déterministe », un LLM n’est pas garanti reproductible.`,
          `${distinct} distinct answers out of ${total} — even at temperature 0. This is not a bug: on a server, requests are processed in batches and floating-point arithmetic does not always land on the same last digit. When two words are nearly tied, that tiny gap is enough to flip the sentence. Remember this: even “deterministic”, an LLM is not guaranteed reproducible.`,
        )
      : allDifferent
        ? pick(
            lang,
            `Les ${total} réponses diffèrent. Même question, même modèle, même instant : c’est le tirage au sort qui change, rien d’autre.`,
            `The ${total} answers differ. Same question, same model, same moment: only the random draw changed.`,
          )
        : pick(
            lang,
            `${distinct} réponses distinctes sur ${total} : certaines se superposent, d’autres non. Le tirage au sort ne change pas forcément tout à chaque fois — mais rien ne garantit laquelle vous obtiendrez.`,
            `${distinct} distinct answers out of ${total}: some coincide, others do not. The random draw does not necessarily change everything every time — but nothing guarantees which one you will get.`,
          )

  return (
    <p
      className={cn(
        'rounded-md border-l-2 px-3 py-2 text-xs leading-relaxed',
        allSame
          ? 'border-l-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
          : 'border-l-amber-500 bg-amber-500/5 text-amber-700 dark:text-amber-500',
      )}
    >
      {message}
    </p>
  )
}

// ---------- L'étape ----------

export function SettingsStep({ lang }: { lang: Lang }) {
  const scope = 'settings' as const
  const [settings] = useSettings()
  const { attempts, add, remove, reset } = useAttempts(scope)

  const [modelId, setModelId] = useSharedModel(DEFAULT_SANDBOX_MODEL)
  const [prompt, setPrompt] = useStepField(scope, 'prompt', tr(lang, SETTINGS_QUESTION))
  // Hors ligne, la question affichée doit être CELLE qui a été capturée : le
  // rejeu se fait par numéro de tirage, pas par texte, et laisser une autre
  // question à l'écran ferait croire que c'est elle qui a produit la réponse.
  useEffect(() => {
    if (settings.offlineMode) setPrompt(tr(lang, OFFLINE_CHANCE_PROMPT))
  }, [settings.offlineMode, lang, setPrompt])
  const [activeId, setActiveId] = useStepField(scope, 'activeId', null as string | null)
  const [temperature, setTemperature] = useStepField(scope, 'temperature', 0.7)

  const [pending, setPending] = useState<PendingExchangeData[]>([])
  const [error, setError] = useState<string | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  // Un seul contrôleur pour toute la série : « Arrêter » interrompt les trois
  // générations d'un coup, puisqu'elles forment une seule expérience.
  const abortRef = useRef<AbortController | null>(null)

  const systemPrompt = settings.systemPrompt ?? tr(lang, SYSTEM_PROMPT.text)
  const model = tdModels().find((m) => m.id === modelId) ?? tdModels()[0]

  // La température est la SEULE variable de cette étape : top-p et top-k
  // couperaient les mots possibles en amont, et on attribuerait à la
  // température un effet qui viendrait d'ailleurs.
  const sampling = { temperature }

  const preset = SETTINGS_PRESETS.find((p) => p.temperature === temperature) ?? null

  /** Ce modèle a-t-il des tirages enregistrés pour cette température ? */
  const offlineReady =
    !settings.offlineMode || hasCapture(offlineDrawKey(modelId, temperature, 0))

  // La dernière série lancée : les essais partagent le même `levelId`, qui
  // porte ici l'identifiant de la série (température + rang de lancement).
  //
  // `runId` est remis à null dès qu'on change de modèle ou qu'on relance :
  // comparer entre elles des réponses tirées dans des conditions différentes
  // n'aurait aucun sens, et laisser l'ancienne série à l'écran ferait croire
  // le contraire. La conversation reste dans l'historique, à droite.
  const [runId, setRunId] = useStepField(scope, 'levelId', null as string | null)
  const runAttempts = runId ? attempts.filter((a) => a.levelId === runId) : []
  const active = attempts.find((a) => a.id === activeId) ?? null
  const lastAttempt = attempts.at(-1)

  /**
   * Vide la fenêtre de chat sans toucher à l'historique. Appelé dès qu'une
   * condition du tirage change (modèle, température, top-p/top-k) : les
   * réponses affichées ne seraient plus comparables à ce qui va suivre.
   */
  function clearRun() {
    setRunId(null)
    setActiveId(null)
  }

  useEffect(() => {
    if (pending.length > 0) centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [pending.length])

  useEffect(() => {
    centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [attempts.length])

  /**
   * Envoie la même question `times` fois. Les appels partent EN PARALLÈLE :
   * ils sont indépendants (aucun historique n'est renvoyé), donc les
   * enchaîner ne ferait qu'additionner les attentes.
   */
  /** `again` : la question de la dernière série, renvoyée telle quelle. */
  async function send(times: number, again?: string) {
    const text = (again ?? prompt).trim()
    if (!text || pending.length > 0) return

    setError(null)
    setActiveId(null)
    // La série précédente disparaît de l'écran avant même le premier
    // fragment : on ne compare jamais deux lancements différents.
    setRunId(null)
    setPending(
      Array.from({ length: times }, () => ({ prompt: text, modelId, text: '' })),
    )
    // Hors ligne, la question capturée reste affichée : c'est la seule rejouable.
    if (again === undefined && !settings.offlineMode) setPrompt('')

    const sent: SentMessage[] = systemPrompt.trim()
      ? [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ]
      : [{ role: 'user', content: text }]

    // Identifiant de série : regroupe les réponses d'un même lancement pour
    // les comparer entre elles, et seulement entre elles.
    const thisRun = `t${temperature}-${modelId}-${attempts.length}`

    const controller = new AbortController()
    abortRef.current = controller

    const results = await Promise.all(
      Array.from({ length: times }, (_, i) =>
        chatFreeStream(
          model.slug,
          text,
          systemPrompt,
          (chunk) =>
            setPending((list) =>
              list.map((p, j) => (j === i ? { ...p, text: p.text + chunk } : p)),
            ),
          sampling,
          controller.signal,
          undefined,
          // Hors ligne, chaque relance tire une capture DIFFÉRENTE. C'est
          // indispensable ici : l'étape démontre qu'à température haute le
          // modèle ne redit pas deux fois la même chose. Rejouer une capture
          // unique afficherait trois réponses identiques — la démonstration
          // exactement à l'envers.
          offlineDrawKey(modelId, temperature, i),
        ),
      ),
    )

    abortRef.current = null
    setPending([])

    // Une série interrompue est conservée telle quelle : les réponses
    // tronquées restent comparables entre elles, et c'est bien ce qu'on a
    // demandé en appuyant sur « Arrêter ».
    const stopped = results.some((r) => r.stopped)
    const failed = stopped ? undefined : results.find((r) => r.error)
    if (failed) {
      setError(
        failed.error === 'no-api'
          ? pick(
              lang,
              'Aucune API configurée. Renseignez l’URL du backend dans l’onglet « Réglages formateur ».',
              'No API configured. Set the backend URL in the “Instructor settings” tab.',
            )
          : failed.error === 'timeout'
            ? pick(
                lang,
                'Le modèle a mis trop de temps à répondre. Réessayez, ou choisissez un modèle plus petit.',
                'The model took too long. Try again, or pick a smaller model.',
              )
            : pick(lang, 'Le serveur est injoignable.', 'The server is unreachable.'),
      )
      return
    }

    // Une interruption très précoce peut laisser des réponses vides : on ne
    // les enregistre pas, elles ne diraient rien à comparer.
    const kept = results.filter((r) => r.text.trim())
    if (kept.length === 0) return

    kept.forEach((res) => {
      add({
        modelId,
        prompt: text,
        answer: res.text,
        source: res.source,
        sent,
        usage: res.usage,
        levelId: thisRun,
        sampling,
      })
    })
    setRunId(thisRun)
  }

  /** Interrompt la série en cours ; le texte déjà généré est conservé. */
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
          temperature={temperature}
          onPick={(p) => {
            setTemperature(p.temperature)
            clearRun()
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
          onNew={() => {
            clearRun()
            setPrompt(tr(lang, SETTINGS_QUESTION))
          }}
          onRemove={(id) => {
            remove(id)
            if (id === activeId) setActiveId(null)
          }}
          onClear={() => {
            reset()
            clearRun()
          }}
        />
      }
      center={
        <div className="flex h-full min-h-0 flex-col">
          {settings.offlineMode && <OfflineBanner lang={lang} className="mt-2 mr-3" />}

          <div ref={centerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3 pr-5">
            {attempts.length === 0 && pending.length === 0 && <ReadRulesHint lang={lang} />}

            {/* Un essai sélectionné dans l'historique prime sur la série. */}
            {active ? (
              <Exchange
                lang={lang}
                attempt={active}
                index={attempts.findIndex((a) => a.id === active.id)}
              />
            ) : (
              runAttempts.map((a, i) => (
                <Exchange key={a.id} lang={lang} attempt={a} index={i} />
              ))
            )}

            {pending.map((p, i) => (
              <PendingExchange key={i} lang={lang} pending={p} />
            ))}

            {!active && pending.length === 0 && runAttempts.length > 1 && (
              <RunVerdict
                lang={lang}
                answers={runAttempts.map((a) => a.answer)}
                temperature={temperature}
              />
            )}

            {!active && pending.length === 0 && runAttempts.length > 0 && preset && (
              <WatchNote lang={lang} preset={preset} />
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-2 pr-5">
            <Composer
              lang={lang}
              value={prompt}
              onChange={setPrompt}
              // Entrée relance la SÉRIE : c'est le geste de l'étape, poser
              // trois fois la même question. L'envoi unique reste un bouton.
              onSend={() => void send(REPEAT_COUNT)}
              onResend={() => lastAttempt && setPrompt(lastAttempt.prompt)}
              resendDisabled={pending.length > 0 || !lastAttempt || !offlineReady}
              rows={4}
              readOnly={settings.offlineMode}
              placeholder={
                settings.offlineMode
                  ? offlinePlaceholder(lang)
                  : pick(
                      lang,
                      'La question posée trois fois, à l\u2019identique\u2026',
                      'The question asked three times, identically\u2026',
                    )
              }
              disabled={!prompt.trim() || !offlineReady}
              tools={
                <>
                  <ModelPicker
                    lang={lang}
                    modelId={modelId}
                    onSelect={(id) => {
                      setModelId(id)
                      clearRun()
                    }}
                    offlineStep="chance"
                  />
                  <AttachLocked lang={lang} />
                  {/* En consultation seule : la consigne fait partie de ce qui
                      part au mod\u00e8le, mais ce n'est pas la variable de cette
                      \u00e9tape \u2014 la modifier fausserait la comparaison. */}
                  <SystemPromptView lang={lang} value={systemPrompt} />
                  <SamplingDialog
                    lang={lang}
                    value={sampling}
                    editable
                    onChange={(next) => {
                      setTemperature(next.temperature)
                      clearRun()
                    }}
                  />
                </>
              }
              action={
                pending.length > 0 ? (
                  <DarkTip
                    label={pick(
                      lang,
                      'Interrompre la g\u00e9n\u00e9ration en cours',
                      'Stop the ongoing generation',
                    )}
                  >
                    <Button
                      onClick={stop}
                      size="sm"
                      variant="destructive"
                      className="h-8 cursor-pointer gap-1.5 rounded-lg"
                    >
                      <Square className="size-3 fill-current" />
                      {pick(lang, 'Arr\u00eater', 'Stop')}
                    </Button>
                  </DarkTip>
                ) : (
                  <>
                    <Button
                      onClick={() => void send(1)}
                      disabled={!prompt.trim() || !offlineReady}
                      size="sm"
                      variant="outline"
                      className="h-8 cursor-pointer gap-1.5 rounded-lg"
                    >
                      <Send className="size-3.5" />
                      {pick(lang, 'Une fois', 'Once')}
                    </Button>
                    <Button
                      onClick={() => void send(REPEAT_COUNT)}
                      disabled={!prompt.trim() || !offlineReady}
                      size="sm"
                      className="h-8 cursor-pointer gap-1.5 rounded-lg"
                      title={pick(
                        lang,
                        'Envoie la m\u00eame question trois fois, en parall\u00e8le',
                        'Sends the same question three times, in parallel',
                      )}
                    >
                      <Dices className="size-3.5" />
                      {pick(lang, `Reposer ${REPEAT_COUNT}\u00d7`, `Ask ${REPEAT_COUNT}\u00d7`)}
                    </Button>
                  </>
                )
              }
              above={
                error ? (
                  <p className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </p>
                ) : undefined
              }
            />
          </div>
        </div>
      }
    />
  )
}

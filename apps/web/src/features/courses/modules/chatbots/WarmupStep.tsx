// ============================================================
// Étape « échauffement » — bac à sable, en trois colonnes.
//
//   gauche  : l'énoncé + les règles du jeu
//   centre  : l'échange courant — UN SEUL à la fois
//   droite  : l'historique des essais, cliquable
//
// Deux partis pris, tous deux assumés et affichés :
//   - CHAQUE message repart de zéro (pas de mémoire) ;
//   - la recommandation n'est PAS accessible ici. L'étudiant juge à
//     l'aveugle ; la confrontation a lieu à l'étape « Recommandations ».
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { DEFAULT_SAMPLING } from './sampling'
import { TourTarget } from './tour'
import { chatFreeStream } from './client'
import { OfflineBanner, OfflinePresets } from './OfflineBar'
import { findCaptureByPrompt } from './offline'
import { OFFLINE_WARMUP, offlinePlaceholder } from './offline-data'
import { useSettings, tdModels , defaultTemperature } from './settings'
import { useAttempts, type SentMessage } from './sandbox'
import { useSharedModel, useStepField } from './step-state'
import {
  DEFAULT_SANDBOX_MODEL,
  SYSTEM_PROMPT,
  WARMUP_BRIEF,
  WARMUP_RULES,
} from './warmup-data'

// ---------- Les règles du jeu ----------


// ---------- Colonne gauche : l'énoncé ----------

function BriefPane({ lang }: { lang: Lang }) {
  return (
    // 4 px de marge interne, rendus par une marge négative : le liseré de la
    // visite guidée (anneau + décalage) tient alors dans la zone défilante,
    // qui sinon le rogne en haut et à gauche.
    <div className="-m-1 flex h-[calc(100%+0.5rem)] min-h-0 flex-col gap-3 overflow-y-auto p-1 pr-4">
      <TourTarget id="brief" className="flex flex-col gap-3">
        <BriefTitle title={tr(lang, WARMUP_BRIEF.title)} />

        <div className="rounded-md border-l-2 border-l-blue-500 bg-[var(--color-muted)] p-3 text-xs leading-relaxed">
          {tr(lang, WARMUP_BRIEF.patient)}
        </div>

        <p className="text-sm font-medium">{tr(lang, WARMUP_BRIEF.question)}</p>
      </TourTarget>

      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <TourTarget id="rules">
          <RulesDialog lang={lang} intro={WARMUP_BRIEF.intro} rules={WARMUP_RULES} />
        </TourTarget>
        {/* Toujours verrouillée ICI : l'échauffement se juge à l'aveugle,
            même en y revenant après l'étape « Recommandations ». */}
        <TourTarget id="reference">
          <ReferenceDialog lang={lang} unlocked={false} block />
        </TourTarget>
      </div>
    </div>
  )
}

// ---------- L'étape ----------

export function WarmupStep({ lang }: { lang: Lang }) {
  const { attempts, add, judge, remove, reset } = useAttempts()
  const [settings] = useSettings()
  // Ces trois-là survivent au changement d'onglet : l'étudiant retrouve
  // son modèle, son brouillon et la conversation qu'il regardait.
  const [modelId, setModelId] = useSharedModel(DEFAULT_SANDBOX_MODEL)
  const [prompt, setPrompt] = useStepField('warmup', 'prompt', '')
  const [activeId, setActiveId] = useStepField('warmup', 'activeId', null)
  const [error, setError] = useState<string | null>(null)
  /** Échange en cours de génération : affiché avant d'être enregistré. */
  const [pending, setPending] = useState<PendingExchangeData | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Dans l'échauffement, la consigne est SUBIE : consultable, pas
  // modifiable. On la manipulera à l'étape « Le prompt ».
  const systemPrompt = settings.systemPrompt ?? tr(lang, SYSTEM_PROMPT.text)

  const model = tdModels().find((m) => m.id === modelId) ?? tdModels()[0]
  // `activeId` null : tout le fil, échange après échange. Un identifiant :
  // seulement l'échange choisi dans l'historique.
  const active = attempts.find((a) => a.id === activeId) ?? null
  const shown = active ? [active] : attempts
  const lastPrompt = attempts.at(-1)?.prompt

  // Un essai choisi s'affiche depuis le haut ; le fil complet, depuis le
  // bas, là où arrive la réponse suivante.
  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    el.scrollTo({ top: activeId ? 0 : el.scrollHeight })
  }, [activeId, attempts.length])

  useEffect(() => {
    if (pending) centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight })
  }, [pending])

  /**
   * Hors ligne, la réponse est retrouvée par le TEXTE de la question : les
   * bulles déposent un texte capturé, et c'est lui qui sert de clé. Passer
   * par le texte plutôt que par l'identifiant de la bulle permet aussi de
   * rejouer une question retapée à l'identique.
   */
  const offlineHit = settings.offlineMode ? findCaptureByPrompt('warmup', modelId, prompt) : null

  /** `again` : le dernier prompt, renvoyé tel quel sans toucher au brouillon. */
  async function send(again?: string) {
    const text = (again ?? prompt).trim()
    if (!text || pending) return

    // Affichage optimiste : la question part immédiatement dans le fil,
    // le champ se vide, et la réponse se remplit au fil du streaming.
    if (again === undefined) setPrompt('')
    setError(null)
    setActiveId(null)
    setPending({ prompt: text, modelId, text: '' })

    // Ce qui part réellement : la consigne système précède la question.
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
      findCaptureByPrompt('warmup', modelId, text)?.key,
    )

    abortRef.current = null
    setPending(null)

    // Arrêt avant le premier mot : il n'y a rien à conserver. On restitue la
    // question pour pouvoir la relancer, sans afficher d'erreur — l'étudiant
    // sait ce qu'il vient de faire.
    if (res.stopped && !res.text.trim()) {
      if (again === undefined) setPrompt(text)
      return
    }

    if (res.error) {
      // La question est restituée pour pouvoir la relancer sans la retaper.
      if (again === undefined) setPrompt(text)
      setError(
        res.error === 'no-capture'
          ? pick(
              lang,
              'Aucune réponse enregistrée pour cette question. Choisissez une des questions préparées.',
              'No recorded answer for this question. Pick one of the prepared questions.',
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
          <BriefPane lang={lang} />
        </FreshStep.Provider>
      }
      right={
        <TourTarget id="history" className="h-full min-h-0">
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
        </TourTarget>
      }
      center={
      <div className="flex h-full min-h-0 flex-col">
        {settings.offlineMode && <OfflineBanner lang={lang} className="mr-3" />}

        {/* `mr-3` : le bandeau vit hors du conteneur défilant, qui porte seul
            le `pr-3` réservé à l'ascenseur. Sans cela il touchait le bord droit
            alors que la colonne est décalée à gauche. */}
        <p className="mt-2 mr-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {pick(
              lang,
              'Ce chat n’a aucune mémoire : chaque message repart de zéro. La mémoire des conversations sera vue plus tard.',
              'This chat has no memory: each message starts from scratch. Conversation memory comes later.',
            )}
          </span>
        </p>

        {/* `overflow-y-auto` seul : la barre n'apparaît que si le contenu
            dépasse réellement, et ne réserve pas de gouttière sinon. */}
        <TourTarget id="answer" className="flex min-h-0 flex-1 flex-col">
        <div
          ref={centerRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto [scrollbar-gutter:auto] py-3 pr-5"
        >
          {shown.length === 0 && !pending && <ReadRulesHint lang={lang} />}

          {shown.map((a, i) => (
            <div key={a.id} className="flex flex-col gap-4">
              {i > 0 && <NewConversationDivider lang={lang} />}
              <Exchange
                lang={lang}
                attempt={a}
                index={attempts.indexOf(a)}
                audited={false}
                onJudge={(j) => judge(a.id, j)}
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
        </TourTarget>

        <TourTarget id="composer" className="border-t border-[var(--color-border)] pt-2 pr-5">
          <Composer
            lang={lang}
            value={prompt}
            onChange={setPrompt}
            onSend={() => void send()}
            onResend={() => lastPrompt && setPrompt(lastPrompt)}
            resendDisabled={!!pending || !lastPrompt}
            rows={2}
            // Hors ligne, le champ montre la question choisie mais ne se
            // modifie pas : seules les réponses capturées existent, et une
            // question retouchée n'en aurait aucune.
            readOnly={settings.offlineMode}
            placeholder={
              settings.offlineMode
                ? offlinePlaceholder(lang)
                : pick(
                    lang,
                    'Votre question au modèle…  (Maj+Entrée pour un saut de ligne)',
                    'Your question to the model…  (Shift+Enter for a line break)',
                  )
            }
            disabled={!!pending || !prompt.trim() || (settings.offlineMode && !offlineHit)}
            tools={
              <>
                <TourTarget id="model">
                  <ModelPicker
                    lang={lang}
                    modelId={modelId}
                    onSelect={setModelId}
                    offlineStep="warmup"
                  />
                </TourTarget>
                <TourTarget id="attach">
                  <AttachLocked lang={lang} />
                </TourTarget>
                <TourTarget id="system">
                  <SystemPromptView lang={lang} value={systemPrompt} />
                </TourTarget>
                <TourTarget id="sampling">
                  <SamplingDialog lang={lang} value={DEFAULT_SAMPLING} />
                </TourTarget>
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
                    presets={OFFLINE_WARMUP}
                    onPick={setPrompt}
                    disabled={!!pending}
                    done={
                      new Set(
                        OFFLINE_WARMUP.filter((p) =>
                          attempts.some((a) => a.prompt.trim() === tr(lang, p.text).trim()),
                        ).map((p) => p.id),
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
              </>
            }
          />
        </TourTarget>
      </div>
      }
    />
  )
}

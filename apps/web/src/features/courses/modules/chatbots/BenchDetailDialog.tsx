// ============================================================
// Ce qui a RÉELLEMENT été envoyé, et ce que le modèle a répondu.
//
// Sans cette fenêtre, la grille de correction demande de croire sur parole
// qu'un modèle « n'a pas tenu compte du DFG ». Le TD passe deux heures à
// exiger des sources vérifiables : son propre benchmark doit l'être aussi.
//
// Les codes visuels sont ceux de `SentPayloadDialog` (bordure gauche + badge
// de rôle, ambre pour la consigne système, bleu pour l'utilisateur) : c'est
// la même chose montrée ailleurs, elle doit se lire pareil.
// ============================================================

import { useState } from 'react'
import { Eye, TriangleAlert } from 'lucide-react'
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
import { pick, useLang } from '@/lib/useLang'
import { tr } from './data'
import { Markdown } from './Markdown'
import {
  BENCH,
  CONDITIONS,
  CRITERIA,
  applies,
  MAX_SCORE,
  type BenchModel,
  type ConditionId,
} from './bench-data'

/** Un bloc de message, aux couleurs de la charge utile du chat. */
function Message({
  label,
  tone,
  badge,
  text,
  truncate,
}: {
  label: string
  tone: string
  badge: string
  text: string
  /** Le prompt RAG fait ~31 000 caractères : on n'en déroule pas 400 écrans. */
  truncate?: number
}) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const long = truncate !== undefined && text.length > truncate
  const shown = long && !open ? text.slice(0, truncate) : text

  return (
    <div className={cn('border-l-2 pl-2.5', tone)}>
      <p className="mb-1">
        <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-semibold', badge)}>
          {label}
        </span>
      </p>
      <pre className="font-sans text-xs leading-relaxed break-words whitespace-pre-wrap text-[var(--color-foreground)]">
        {shown}
        {long && !open && '…'}
      </pre>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-1 cursor-pointer text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {open
            ? pick(lang, '− Replier', '− Collapse')
            : pick(
                lang,
                `+ Afficher les ${(text.length - truncate!).toLocaleString('fr-FR')} caractères restants`,
                `+ Show the remaining ${(text.length - truncate!).toLocaleString('en-US')} characters`,
              )}
        </button>
      )}
    </div>
  )
}

/** Une ligne de la fiche de paramètres. */
function Param({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className={cn('text-[var(--color-foreground)]', mono && 'font-mono text-[11px]')}>
        {value}
      </dd>
    </>
  )
}

export function BenchDetailDialog({
  lang,
  model,
  condition,
  trigger,
}: {
  lang: Lang
  model: BenchModel
  condition: ConditionId
  trigger?: React.ReactNode
}) {
  const cond = CONDITIONS.find((c) => c.id === condition)!
  const runs = BENCH.runs.filter(
    (r) => r.modelId === model.id && r.condition === condition && !r.error,
  )
  const prompt = BENCH.prompts?.[condition]
  const stat = model[condition]

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-500/10 hover:underline dark:text-blue-400"
          >
            <Eye className="size-3" />
            {pick(lang, 'Voir', 'View')}
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[85vh] flex-col gap-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base">
            {model.name} — {tr(lang, cond.label)}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              `${stat.n} tirage${stat.n > 1 ? 's' : ''}, score moyen ${stat.mean}/100`,
              `${stat.n} run${stat.n > 1 ? 's' : ''}, mean score ${stat.mean}/100`,
            )}
            {stat.max > stat.min &&
              pick(lang, ` (de ${stat.min} à ${stat.max})`, ` (from ${stat.min} to ${stat.max})`)}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-foreground)]">
              {pick(lang, 'Ce qui a été envoyé', 'What was sent')}
            </h4>
            {BENCH.system && (
              <Message
                label={pick(lang, 'Consigne système', 'System instruction')}
                tone="border-l-amber-500"
                badge="bg-amber-500/15 text-amber-700 dark:text-amber-500"
                text={BENCH.system}
              />
            )}
            {prompt ? (
              <Message
                label={pick(lang, 'Message envoyé', 'Message sent')}
                tone="border-l-blue-500"
                badge="bg-blue-500/15 text-blue-700 dark:text-blue-400"
                text={prompt}
                truncate={1200}
              />
            ) : (
              <p className="flex items-start gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {pick(
                  lang,
                  'Ce fichier de résultats est antérieur à l’enregistrement des prompts : relancez le benchmark pour les voir ici.',
                  'This results file predates prompt recording: rerun the benchmark to see them here.',
                )}
              </p>
            )}
          </section>

          {/* Les réglages de génération : sans eux, personne ne peut refaire
              la mesure ni juger si l'écart entre deux modèles tient à autre
              chose qu'au hasard de l'échantillonnage. */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-foreground)]">
              {pick(lang, 'Paramètres de la mesure', 'Measurement parameters')}
            </h4>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-xs">
              <Param label={pick(lang, 'Modèle appelé', 'Model called')} value={model.slug} mono />
              <Param
                label={pick(lang, 'Fournisseur', 'Provider')}
                value={BENCH.provider ?? 'OpenRouter'}
              />
              <Param
                label={pick(lang, 'Température', 'Temperature')}
                value={
                  BENCH.params?.temperature !== undefined ? String(BENCH.params.temperature) : '—'
                }
                mono
              />
              <Param
                label="max_tokens"
                /* Le budget du modèle prime sur le budget commun : les modèles
                   à raisonnement mesurent plus haut, l'annoncer à 700 serait
                   faux pour eux. */
                value={String(model.maxTokens ?? BENCH.params?.max_tokens ?? '—')}
                mono
              />
              <Param
                label="top_p / top_k"
                value={pick(
                  lang,
                  'défaut du fournisseur (non transmis)',
                  'provider default (not sent)',
                )}
              />
              <Param
                label={pick(lang, 'Tirages', 'Runs')}
                value={String(stat.n)}
                mono
              />
              <Param
                label={pick(lang, 'Juge', 'Judge')}
                value={`${BENCH.judge} (T=${BENCH.judgeParams?.temperature ?? 0})`}
                mono
              />
            </dl>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-foreground)]">
              {pick(lang, 'Ce que le modèle a répondu', 'What the model answered')}
            </h4>
            {runs.map((r, i) => {
              return (
                <div
                  key={i}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-foreground)]">
                      {pick(lang, `Tirage ${i + 1}`, `Run ${i + 1}`)}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                        (r.score ?? 0) >= 70
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : (r.score ?? 0) >= 40
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-500'
                            : 'bg-red-500/15 text-red-700 dark:text-red-400',
                      )}
                    >
                      {r.score}/100
                    </span>
                    {r.ms !== undefined && (
                      <span className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                        {(r.ms / 1000).toFixed(1)} s
                        {r.usage?.total_tokens ? ` · ${r.usage.total_tokens} tok` : ''}
                        {/* Les tokens de raisonnement sont facturés sans jamais
                            être montrés : les taire fausserait le coût. */}
                        {r.usage?.completion_tokens_details?.reasoning_tokens
                          ? ` (${r.usage.completion_tokens_details.reasoning_tokens} ${pick(lang, 'de raisonnement', 'reasoning')})`
                          : ''}
                        {typeof r.usage?.cost === 'number'
                          ? ` · ${(r.usage.cost * 100).toFixed(3)} ¢`
                          : ''}
                        {r.finish && r.finish !== 'stop'
                          ? ` · ${pick(lang, 'arrêt', 'finish')}: ${r.finish}`
                          : ''}
                      </span>
                    )}
                  </div>

                  {/* La réponse est du markdown (les modèles mettent en gras la
                      molécule et la posologie) : la rendre telle quelle
                      afficherait « **Ciprofloxacine** ». Le prompt, lui, reste
                      en <pre> — c'est une entrée verbatim, pas du texte à
                      interpréter. */}
                  {r.answer ? (
                    // On cible chaque élément plutôt que `*` : un sélecteur
                    // universel écrasait aussi les marges du composant Markdown.
                    // Les modèles séparent souvent leurs molécules par des
                    // retours à la ligne forcés (deux espaces en fin de ligne) :
                    // tout arrive alors dans un seul paragraphe, d'où
                    // l'espacement rendu aux <br>.
                    <div className="text-[10px] leading-relaxed [&_br]:mb-1 [&_br]:block [&_br]:content-[''] [&_h4]:mt-2 [&_h4]:mb-0.5 [&_h4]:text-[10px] [&_h5]:mt-2 [&_h5]:mb-0.5 [&_h5]:text-[10px] [&_h6]:text-[10px] [&_li]:my-0 [&_ol]:my-1 [&_p]:my-1 [&_td]:text-[10px] [&_th]:text-[10px] [&_ul]:my-1">
                      <Markdown>{r.answer}</Markdown>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--color-muted-foreground)] italic">
                      {pick(lang, '(réponse vide)', '(empty answer)')}
                    </p>
                  )}

                  {typeof r.verdict?.comment === 'string' && (
                    <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
                      <span className="font-semibold">{pick(lang, 'Juge', 'Judge')} :</span>{' '}
                      {r.verdict.comment}
                    </p>
                  )}

                  {/* La grille en dernier : on lit d'abord la réponse, puis le
                      verdict qui la commente, et enfin le détail chiffré qui
                      justifie ce verdict. */}
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <tbody>
                        {CRITERIA.filter((c) => applies(c, condition)).map((c) => {
                          const met = r.verdict?.[c.id] === true
                          // Un critère rapporte quand il est acquis, un piège
                          // quand il est évité : même règle que le barème.
                          const earned = c.trap ? !met : met
                          if (c.weight === 0 && !met) return null
                          return (
                            <tr
                              key={c.id}
                              className="border-t border-[var(--color-border)]"
                            >
                              <td className="py-1 pr-2 align-top">
                                <span
                                  className={cn(
                                    earned
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400',
                                  )}
                                >
                                  {earned ? '✓' : '✗'}
                                </span>
                              </td>
                              <td
                                className="py-1 pr-2 align-top text-[var(--color-muted-foreground)]"
                              >
                                {tr(lang, c.label)}
                              </td>
                              <td className="py-1 text-right align-top font-mono tabular-nums text-[var(--color-muted-foreground)]">
                                {c.weight === 0 ? '—' : `${earned ? c.weight : 0}/${c.weight}`}
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                          <td />
                          <td className="py-1 pr-2 text-[var(--color-foreground)]">
                            {pick(lang, 'Total', 'Total')}
                          </td>
                          <td className="py-1 text-right font-mono tabular-nums text-[var(--color-foreground)]">
                            {r.score}/{MAX_SCORE}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
            {runs.length === 0 && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {pick(lang, 'Aucun tirage exploitable.', 'No usable run.')}
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

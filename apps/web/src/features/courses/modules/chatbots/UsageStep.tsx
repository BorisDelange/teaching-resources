// ============================================================
// Onglet « Consommation » — le bilan de la séance.
//
// Les autres étapes affichent le coût de LEUR conversation. Celui-ci
// totalise TOUT, d'un bout à l'autre du TD : c'est le seul endroit où
// l'étudiant voit ce qu'une séance de deux heures a réellement coûté.
//
// Placé en premier volontairement : on le consulte au fil de l'eau, et
// on y revient à la fin. Le bouton de remise à zéro efface tous les
// historiques — d'où la confirmation.
//
// Les tokens affichés sont ceux FACTURÉS par le fournisseur (pas une
// estimation) ; l'empreinte, elle, est un ordre de grandeur assumé.
// ============================================================

import { useState } from 'react'
import { AlertTriangle, Coins, Leaf, RotateCcw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
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
import { SCOPES, resetAllAttempts, useAllAttempts, type Attempt } from './sandbox'
import { resetStepState } from './step-state'
import { tdModels } from './settings'
import {
  CARBON_ZONES,
  DEFAULT_ZONE,
  REFERENCES,
  compareToReference,
  estimateFootprint,
  formatCo2,
  formatDistance,
} from './carbon'

/**
 * L'estimation d'empreinte (Wh, CO₂e, équivalents) est MASQUÉE tant que le
 * calcul n'a pas été revu : le facteur d'incertitude annoncé dépassait 10, et
 * un chiffre affiché finit toujours par être recopié tel quel. Les décomptes
 * de tokens, eux, viennent du fournisseur et restent visibles.
 *
 * Repasser à `true` réactive d'un coup la tuile, la mise en perspective et le
 * groupe de sources correspondant.
 */
const SHOW_CARBON = false

/** Libellés des portées, pour la répartition par étape. */
const SCOPE_LABELS: Record<string, { fr: string; en: string }> = {
  warmup: { fr: 'Échauffement', en: 'Warm-up' },
  prompt: { fr: 'Prompt', en: 'Prompt' },
  settings: { fr: 'Réglages', en: 'Settings' },
  'memory-none': { fr: 'Mémoire — aucune', en: 'Memory — none' },
  'memory-full': { fr: 'Mémoire — complète', en: 'Memory — full' },
  'memory-summary': { fr: 'Mémoire — résumée', en: 'Memory — summarised' },
  rag: { fr: 'RAG', en: 'RAG' },
  documents: { fr: 'Documents', en: 'Documents' },
  synthesis: { fr: 'Synthèse', en: 'Summary' },
}

/**
 * `null` quand la taille n'est pas publiée (GPT-6 Luna) : l'estimer par les
 * paramètres serait une rumeur (voir carbon.ts), et la compter pour 0
 * sous-estimerait l'empreinte sans le dire.
 */
function billionsOf(modelId: string): number | null {
  const model = tdModels().find((m) => m.id === modelId)
  const b = parseFloat(model?.params ?? '')
  return Number.isFinite(b) && b > 0 ? b : null
}

function totalsOf(attempts: Attempt[]) {
  return attempts.reduce(
    (acc, a) => ({
      prompt: acc.prompt + (a.usage?.prompt ?? 0),
      completion: acc.completion + (a.usage?.completion ?? 0),
    }),
    { prompt: 0, completion: 0 },
  )
}

// ---------- La remise à zéro ----------

function ResetDialog({ lang, count, onConfirm }: { lang: Lang; count: number; onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
          <RotateCcw className="size-3.5" />
          {pick(lang, 'Remettre à zéro', 'Reset')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {pick(lang, 'Remettre le compteur à zéro ?', 'Reset the counter?')}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {pick(
              lang,
              `Cela efface les ${count} échanges de toutes les étapes du TD, ainsi que leurs conversations. Le compteur repart de zéro. Action irréversible.`,
              `This deletes the ${count} exchanges from every step of the session, along with their conversations. The counter starts over. This cannot be undone.`,
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="cursor-pointer">
              {pick(lang, 'Annuler', 'Cancel')}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={onConfirm}
            >
              <RotateCcw className="size-3.5" />
              {pick(lang, 'Tout effacer', 'Delete everything')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- L'onglet ----------

export function UsageStep({ lang }: { lang: Lang }) {
  const attempts = useAllAttempts()
  const [zoneId, setZoneId] = useState(DEFAULT_ZONE)
  const zone = CARBON_ZONES.find((z) => z.id === zoneId) ?? CARBON_ZONES[0]

  // Seuls les échanges dont le fournisseur a renvoyé un décompte : afficher
  // les autres laisserait croire à des requêtes gratuites.
  const counted = attempts.filter((a) => a.usage)
  const totals = totalsOf(counted)
  const total = totals.prompt + totals.completion

  const sized = counted.filter((a) => billionsOf(a.modelId) !== null)
  const unsized = counted.length - sized.length
  const footprint = sized.reduce(
    (acc, a) => {
      const f = estimateFootprint(a.usage?.completion ?? 0, billionsOf(a.modelId) ?? 0, zone.gPerKwh)
      return { wh: acc.wh + f.wh, gco2: acc.gco2 + f.gco2, m: acc.m + f.carMeters }
    },
    { wh: 0, gco2: 0, m: 0 },
  )

  // Répartition par étape : c'est là qu'on voit que la mémoire complète pèse
  // bien plus lourd que les autres étapes, pour le même nombre de questions.
  const perScope = SCOPES.map((s) => {
    const list = counted.filter((a) => a.scope === s)
    const t = totalsOf(list)
    return { scope: s, count: list.length, total: t.prompt + t.completion }
  }).filter((r) => r.count > 0)

  const heaviest = perScope.reduce((m, r) => Math.max(m, r.total), 0)

  function resetAll() {
    resetAllAttempts()
    SCOPES.forEach((s) => resetStepState(s))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Coins className="size-5 text-blue-500" />
            {pick(lang, 'Consommation de la séance', 'Session usage')}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              'Le total de tout ce que vous avez envoyé et reçu depuis le début du TD, toutes étapes confondues.',
              'The total of everything you sent and received since the start of the session, across all steps.',
            )}
          </p>
        </div>
        {counted.length > 0 && (
          <ResetDialog lang={lang} count={counted.length} onConfirm={resetAll} />
        )}
      </div>

      {/* Réserve affichée d'emblée, pas en note de bas de page : les chiffres
          d'empreinte ci-dessous ont l'air précis alors qu'ils ne le sont pas,
          et un étudiant qui les recopierait le ferait de bonne foi. */}
      {SHOW_CARBON && (
      <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-500">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {pick(
            lang,
            'Ces calculs n’ont pas encore été vérifiés. Les décomptes de tokens viennent du fournisseur et sont fiables ; l’empreinte énergétique et le CO₂ sont des estimations à considérer comme des ordres de grandeur, non comme des mesures. Ne les citez pas comme des chiffres établis.',
            'These figures have not been verified yet. The token counts come from the provider and are reliable; the energy and CO₂ figures are estimates to be read as orders of magnitude, not measurements. Do not quote them as established numbers.',
          )}
        </span>
      </p>
      )}

      {counted.length === 0 ? (
        <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'Aucun échange pour l’instant. Le compteur se remplira dès votre première question.',
            'No exchange yet. The counter will fill from your first question.',
          )}
        </p>
      ) : (
        <>
          {/* Les trois chiffres qui comptent. */}
          <div className={cn('grid gap-3', SHOW_CARBON ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {pick(lang, 'Tokens au total', 'Total tokens')}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {total.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                <span className="text-blue-600">↑ {totals.prompt.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}</span>
                {pick(lang, ' envoyés · ', ' sent · ')}
                <span className="text-emerald-600">
                  ↓ {totals.completion.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
                </span>
                {pick(lang, ' reçus', ' received')}
              </p>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {pick(lang, 'Échanges', 'Exchanges')}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{counted.length}</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {pick(lang, 'soit ', 'i.e. ')}
                {Math.round(total / Math.max(counted.length, 1)).toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
                {pick(lang, ' tokens en moyenne', ' tokens on average')}
              </p>
            </div>

            {SHOW_CARBON && (
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <Leaf className="size-3.5 text-emerald-500" />
                  {pick(lang, 'Empreinte estimée', 'Estimated footprint')}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {footprint.wh.toFixed(2)} Wh
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {formatCo2(footprint.gco2)} CO₂e · {formatDistance(footprint.m)}
                  {pick(lang, ' en voiture', ' by car')}
                </p>
                {unsized > 0 && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    {pick(
                      lang,
                      `${unsized} échange(s) non compté(s) : modèle dont la taille n’est pas publiée.`,
                      `${unsized} exchange(s) not counted: model whose size is not published.`,
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Où sont partis les tokens. */}
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5 text-sm font-medium">
              <TrendingUp className="size-4 text-slate-500" />
              {pick(lang, 'Répartition par étape', 'Breakdown by step')}
            </div>
            <div className="flex flex-col gap-2.5 p-4">
              {perScope.map((r) => (
                <div key={r.scope} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium">
                      {pick(lang, SCOPE_LABELS[r.scope]?.fr ?? r.scope, SCOPE_LABELS[r.scope]?.en ?? r.scope)}
                    </span>
                    <span className="text-[var(--color-muted-foreground)] tabular-nums">
                      {r.total.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}
                      {pick(lang, ' tokens · ', ' tokens · ')}
                      {r.count}
                      {pick(lang, ' échanges', ' exchanges')}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${heaviest > 0 ? (r.total / heaviest) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mise en perspective : un TD entier reste minuscule. */}
          {SHOW_CARBON && (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5 text-sm font-medium">
              <span>{pick(lang, 'Mise en perspective', 'Putting it in perspective')}</span>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs outline-none focus:border-blue-500"
              >
                {CARBON_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {pick(lang, z.label.fr, z.label.en)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 p-4 text-xs">
              {REFERENCES.map((ref) => {
                const ratio = compareToReference(
                  footprint.wh / Math.max(sized.length, 1),
                  ref,
                )
                return (
                  <p key={ref.id} className="text-[var(--color-muted-foreground)]">
                    {pick(lang, 'Une de vos requêtes ≈ ', 'One of your requests ≈ ')}
                    <strong className="text-[var(--color-foreground)]">
                      {ratio >= 1 ? `1/${Math.round(ratio)}` : `${(1 / ratio).toFixed(1)}×`}
                    </strong>
                    {pick(lang, ' d’une requête ', ' of one ')}
                    <span className="font-medium text-[var(--color-foreground)]">{pick(lang, ref.label.fr, ref.label.en)}</span>
                    {' — '}
                    {pick(lang, ref.source.fr, ref.source.en)}
                  </p>
                )
              })}
              <p className="mt-1 border-t border-[var(--color-border)] pt-2 leading-relaxed text-[var(--color-muted-foreground)]">
                {pick(
                  lang,
                  'Les tokens sont ceux facturés par le fournisseur. L’empreinte, elle, est un ORDRE DE GRANDEUR : elle dépend du matériel, du taux de charge et du réseau électrique, et l’incertitude réelle dépasse le facteur 10.',
                  'The token counts are those billed by the provider. The footprint, however, is an ORDER OF MAGNITUDE: it depends on hardware, utilisation and the electricity grid, and the real uncertainty exceeds a factor of 10.',
                )}
              </p>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  )
}


// ============================================================
// Étape « Sources » — d'où viennent les données, les définitions
// et les affirmations du TD.
//
// Point pédagogique : le TD passe deux heures à apprendre aux
// étudiants à demander « sur quelles données ? » et « validé où ? »
// à tout vendeur d'IA médicale. Il serait incohérent de ne pas
// répondre lui-même à ces questions.
// ============================================================

import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang, pick } from '@/lib/useLang'
import { SOURCE_GROUPS, SOURCE_KINDS, type Source } from './sources-data'

function SourceCard({ source }: { source: Source }) {
  const lang = useLang()
  const kind = SOURCE_KINDS[source.kind]
  const caveat = pick(lang, source.caveat, source.caveatEn)

  return (
    <li className="rounded-md border border-[var(--color-border)] p-3">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-baseline gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          {source.title}
          <ExternalLink className="size-3 shrink-0 self-center opacity-60 group-hover:opacity-100" />
        </a>
        <span
          className={cn(
            'shrink-0 rounded-full border px-1.5 py-px text-[11px] font-medium',
            kind.tone,
          )}
        >
          {pick(lang, kind.label, kind.labelEn)}
        </span>
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {source.authors} · {source.year}
      </p>

      <p className="mt-1.5 text-xs leading-relaxed">{pick(lang, source.usedFor, source.usedForEn)}</p>

      {caveat && (
        <p className="mt-1.5 border-l-2 border-l-amber-500 pl-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          {caveat}
        </p>
      )}
    </li>
  )
}

export function SourcesStep() {
  const lang = useLang()
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Sources</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            <>
              Ce TD vous apprend à demander « sur quelles données ce modèle a-t-il été construit ? » et
              « où a-t-il été validé ? ». Voici nos propres réponses — y compris ce que nos données ne
              permettent pas de conclure.
            </>,
            <>
              This tutorial teaches you to ask “what data was this model built on?” and “where was it
              validated?”. Here are our own answers — including what our data cannot tell us.
            </>,
          )}
        </p>
      </div>

      {SOURCE_GROUPS.map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{pick(lang, g.title, g.titleEn)}</h3>
          <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">{pick(lang, g.intro, g.introEn)}</p>
          <ul className="mt-1 flex flex-col gap-2">
            {g.sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </ul>
        </section>
      ))}

      {/* Les mentions de provenance et de licence sont regroupées ICI, et
          nulle part ailleurs : l'ODbL demande qu'elles figurent sur la
          publication, pas qu'elles soient répétées sous chaque graphique. */}
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--color-border)] p-3 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <p>
            Quelles données sont réelles ? Les <strong>dossiers horaires</strong> de l’étape
            « Comprendre les données », les <strong>valeurs</strong> résumées de chaque patient et
            l’<strong>issue</strong> — sepsis ou non — viennent directement du jeu PhysioNet. En
            revanche, les courbes du dossier de l’étape « Cas individuels » sont{' '}
            <strong>simulées</strong> : la cohorte ne contient qu’un résumé par patient, et une
            trajectoire plausible a été reconstituée autour de lui.
          </p>,
          <p>
            Which data are real? The <strong>hourly records</strong> in the “Understanding the
            data” step, each patient’s summary <strong>values</strong> and the{' '}
            <strong>outcome</strong> — sepsis or not — come straight from the PhysioNet dataset.
            The record curves in the “Individual cases” step, however, are{' '}
            <strong>simulated</strong>: the cohort holds only one summary per patient, and a
            plausible trajectory was reconstructed around it.
          </p>,
        )}
        <p>
          {pick(lang, 'Ces données sont diffusées sous licence', 'These data are released under the')}{' '}
          <a
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            ODbL 1.0
          </a>{' '}
          {pick(
            lang,
            <>
              (Open Database License) : leur réutilisation est libre, à condition de citer la source et
              de repartager toute base dérivée sous la même licence.
            </>,
            <>
              licence (Open Database License): they may be reused freely, provided the source is cited
              and any derived database is shared under the same licence.
            </>,
          )}
        </p>
      </div>
    </div>
  )
}

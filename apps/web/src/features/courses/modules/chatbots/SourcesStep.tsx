// ============================================================
// Étape « Sources » — d'où viennent les chiffres et les affirmations
// du TD.
//
// Point pédagogique : le TD passe deux heures à demander aux étudiants
// d'exiger des sources vérifiables d'un modèle de langage. Il serait
// incohérent de ne pas donner les siennes.
// ============================================================

import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr } from './data'
import { SOURCE_GROUPS, SOURCE_KINDS, type Source } from './sources-data'

/**
 * Groupes retirés de l'affichage tant que leur contenu n'a pas été revu.
 * Le groupe « carbone » documente une estimation d'empreinte actuellement
 * masquée dans l'onglet « Consommation » : citer ses références ici
 * laisserait croire que le chiffre est encore affiché quelque part.
 */
const HIDDEN_GROUPS = new Set<string>(['carbon'])

function SourceCard({ lang, source }: { lang: Lang; source: Source }) {
  const kind = SOURCE_KINDS[source.kind]

  return (
    <li className="rounded-md border border-[var(--color-border)] p-3">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-baseline gap-1 text-sm font-medium text-[var(--color-foreground)] underline decoration-[var(--color-muted-foreground)]/50 underline-offset-[3px] transition-colors hover:decoration-[var(--color-foreground)]"
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
          {tr(lang, kind.label)}
        </span>
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {source.authors} · {typeof source.year === 'string' ? source.year : tr(lang, source.year)}
      </p>

      <p className="mt-1.5 text-xs leading-relaxed">{tr(lang, source.usedFor)}</p>

      {source.caveat && (
        <p className="mt-1.5 border-l-2 border-l-amber-500 pl-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          {tr(lang, source.caveat)}
        </p>
      )}
    </li>
  )
}

export function SourcesStep({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">{pick(lang, 'Sources', 'Sources')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'Nous venons de passer deux heures à exiger d’un modèle qu’il cite ses sources. Voici les nôtres — y compris celles des chiffres les plus incertains.',
            'We have just spent two hours demanding that a model cite its sources. Here are ours — including those behind the most uncertain figures.',
          )}
        </p>
      </div>

      {SOURCE_GROUPS.filter((g) => !HIDDEN_GROUPS.has(g.id)).map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{tr(lang, g.title)}</h3>
          <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {tr(lang, g.intro)}
          </p>
          <ul className="mt-1 flex flex-col gap-2">
            {g.sources.map((s) => (
              <SourceCard key={s.id} lang={lang} source={s} />
            ))}
          </ul>
        </section>
      ))}

      <p className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          'Les réponses des modèles affichées en mode hors-ligne sont de véritables captures, réalisées sur ce cas clinique. Elles n’ont pas été retouchées : les erreurs qu’on y lit sont celles que les modèles ont réellement produites.',
          'The model answers shown in offline mode are genuine captures made on this clinical case. They have not been edited: the errors you read are the ones the models actually produced.',
        )}
      </p>
    </div>
  )
}

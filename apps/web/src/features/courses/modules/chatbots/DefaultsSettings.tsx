// ============================================================
// Les valeurs de DÉPART de la séance.
//
// Ni la connexion, ni la liste des modèles : ce que le TD vaut au moment où
// un étudiant l'ouvre, avant d'avoir touché à quoi que ce soit.
//
// Ces réglages ne verrouillent rien. La température se manipule à l'étape
// « Hasard » — c'en est le sujet — et la fenêtre de contexte se remplit sous
// les yeux de l'étudiant à l'étape « Mémoire ». On règle ici d'où l'on part,
// pas où l'on peut aller.
// ============================================================

import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { defaultTemperature, useSettings } from './settings'
import { DEFAULT_SAMPLING } from './sampling'

/**
 * Bornes de la fenêtre de contexte. Le minimum est à 1 : c'est absurde en
 * pratique, mais un formateur qui veut MONTRER la saturation immédiate doit
 * pouvoir le faire.
 */
const BUDGET_MIN = 1
const BUDGET_MAX = 5_000_000

export function DefaultsSettings({ lang }: { lang: Lang }) {
  const [settings, update] = useSettings()

  const temp = defaultTemperature(settings)
  const tempIsDefault = settings.defaultTemperature === null

  return (
    <div className="flex flex-col gap-5 p-4 text-sm">
      {/* ---------- Température ---------- */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-medium">
            {pick(lang, 'Température de départ', 'Starting temperature')}
          </span>
          <span className="font-mono text-xs tabular-nums text-[var(--color-muted-foreground)]">
            {temp.toFixed(1)}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'À 0, le modèle prend toujours le mot le plus probable : la même question donne toujours la même réponse. Le TD part de 0,7, proche d’un ChatGPT grand public — c’est ce qui rend la variabilité observable à l’étape « Hasard ».',
            'At 0, the model always takes the most likely word: the same question always gives the same answer. The tutorial starts at 0.7, close to a consumer ChatGPT — that is what makes the variability observable in the “Randomness” step.',
          )}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temp}
            onChange={(e) => update({ defaultTemperature: Number(e.target.value) })}
            className="h-1.5 flex-1 cursor-pointer accent-blue-500"
          />
          {!tempIsDefault && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update({ defaultTemperature: null })}
              className="h-7 shrink-0 cursor-pointer gap-1.5 text-xs"
              title={pick(
                lang,
                `Revenir à ${DEFAULT_SAMPLING.temperature}`,
                `Back to ${DEFAULT_SAMPLING.temperature}`,
              )}
            >
              <RotateCcw className="size-3" />
              {DEFAULT_SAMPLING.temperature}
            </Button>
          )}
        </div>
      </div>

      <BudgetField
        lang={lang}
        value={settings.contextBudget}
        onChange={(v) => update({ contextBudget: v })}
        title={pick(lang, 'Fenêtre de contexte (étape « Mémoire »)', 'Context window (“Memory” step)')}
        help={pick(
          lang,
          'Volontairement très en dessous des vraies limites (131 000 à plus d’un million de tokens selon le modèle) : la saturation doit arriver pendant la séance, pas en théorie.',
          'Deliberately far below the real limits (131,000 to over a million tokens depending on the model): saturation must happen during the session, not in theory.',
        )}
      />

      <BudgetField
        lang={lang}
        value={settings.documentBudget}
        onChange={(v) => update({ documentBudget: v })}
        title={pick(lang, 'Fenêtre de contexte (étapes « Documents » et « Synthèse »)', 'Context window (“Documents” and “Synthesis” steps)')}
        help={pick(
          lang,
          'Un document qui fait moins de la moitié de cette fenêtre part en entier ; au-delà, il est fouillé et seuls quelques passages partent. À 5 000, les deux documents du TD partent en entier ; en dessous de 4 500, la table OMEDIT bascule en recherche.',
          'A document under half of this window is sent whole; beyond that, it is searched and only a few passages are sent. At 5,000, both documents are sent whole; below 4,500, the OMEDIT table switches to search.',
        )}
      />
    </div>
  )
}

function BudgetField({
  lang,
  value,
  onChange,
  title,
  help,
}: {
  lang: Lang
  value: number
  onChange: (v: number) => void
  title: string
  help: string
}) {
  // Le champ garde un BROUILLON texte : borner à chaque frappe empêchait
  // d'effacer le contenu pour retaper une valeur (« 1000 » → « 10000 »).
  const [budgetDraft, setBudgetDraft] = useState(String(value))
  const budgetNumber = Number(budgetDraft)
  const budgetValid =
    budgetDraft.trim() !== '' &&
    Number.isFinite(budgetNumber) &&
    budgetNumber >= BUDGET_MIN &&
    budgetNumber <= BUDGET_MAX

  useEffect(() => {
    if (budgetValid && budgetNumber !== value) onChange(budgetNumber)
  }, [budgetValid, budgetNumber, value, onChange])

  return (
    <div className="flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-4">
      <span className="text-xs font-medium">{title}</span>
      <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">{help}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={100}
          value={budgetDraft}
          onChange={(e) => setBudgetDraft(e.target.value)}
          onBlur={() => {
            // À la sortie du champ seulement : on restaure la dernière valeur
            // valide plutôt que de laisser un champ vide ou hors bornes.
            if (!budgetValid) setBudgetDraft(String(value))
          }}
          className={cn(
            'w-44 rounded-md border bg-[var(--color-background)] px-2 py-1.5 text-sm tabular-nums outline-none focus:border-blue-500',
            budgetValid || budgetDraft.trim() === ''
              ? 'border-[var(--color-border)]'
              : 'border-red-500',
          )}
        />
        <span className="text-xs text-[var(--color-muted-foreground)]">tokens</span>
      </div>
      {!budgetValid && budgetDraft.trim() !== '' && (
        <p className="text-xs text-red-600">
          {pick(
            lang,
            `Valeur invalide : indiquez un nombre entre ${BUDGET_MIN} et ${BUDGET_MAX.toLocaleString('fr-FR')}.`,
            `Invalid value: enter a number between ${BUDGET_MIN} and ${BUDGET_MAX.toLocaleString('en-US')}.`,
          )}
        </p>
      )}
    </div>
  )
}

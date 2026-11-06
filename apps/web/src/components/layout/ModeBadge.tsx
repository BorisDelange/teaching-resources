// ============================================================
// Badges d'en-tête : COMMENT le site tourne, et OÙ il prend ses réponses.
//
// Deux informations distinctes, longtemps confondues en une seule — d'où la
// confusion qu'elles créaient :
//
//   CLIENT / SERVEUR — décidé au BUILD (`VITE_CLIENT_ONLY`), immuable en
//     séance. Dit seulement si un backend accompagne le site. Un build
//     client n'est PAS privé d'API : il peut appeler Ollama ou OpenRouter
//     directement depuis le navigateur.
//
//   HORS LIGNE — une case à cocher, valable dans les DEUX builds. Aucun
//     appel réseau : le TD rejoue des réponses capturées à l'avance.
//
// Autrement dit : le premier badge dit d'où vient le SITE, le second d'où
// viennent les RÉPONSES. Une réponse rejouée n'est pas une réponse fraîche,
// même si elle en a exactement l'apparence.
// ============================================================

import { Monitor, Server, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { CLIENT_ONLY, useSettings } from '@/features/courses/modules/chatbots/settings'

/** Pastille discrète : information de contexte, jamais une alerte. */
const PILL =
  'hidden cursor-help select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors sm:inline-flex'

export function ModeBadge() {
  const { t } = useTranslation()
  const [settings] = useSettings()

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              PILL,
              CLIENT_ONLY
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            )}
          >
            {CLIENT_ONLY ? (
              <Monitor className="size-3.5 shrink-0 opacity-80" />
            ) : (
              <Server className="size-3.5 shrink-0 opacity-80" />
            )}
            {CLIENT_ONLY ? t('mode.client') : t('mode.server')}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs leading-relaxed">
          {CLIENT_ONLY ? t('mode.clientHelp') : t('mode.serverHelp')}
        </TooltipContent>
      </Tooltip>

      {/* Second badge, seulement quand il a quelque chose à dire : en ligne
          est l'état normal, et une pastille permanente pour « rien de
          particulier » ne ferait qu'encombrer. */}
      {settings.offlineMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                PILL,
                'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
              )}
            >
              <WifiOff className="size-3.5 shrink-0 opacity-80" />
              {t('mode.offline')}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs leading-relaxed">
            {t('mode.offlineHelp')}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )
}

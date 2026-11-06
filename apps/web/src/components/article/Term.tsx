import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Terme technique expliqué au survol. Le public est en troisième année de
 * médecine, sans formation en informatique : « API », « serveur », « requête »
 * ne veulent rien dire pour lui, et une définition en note de bas de page
 * coupe la lecture. Le pointillé signale qu'il y a quelque chose à survoler.
 */
export function Term({ children, define }: { children: ReactNode; define: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help decoration-dotted underline-offset-4 [text-decoration-line:underline]">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-xs rounded-lg bg-slate-900 text-sm leading-relaxed text-white [&>span]:hidden"
      >
        {define}
      </TooltipContent>
    </Tooltip>
  )
}

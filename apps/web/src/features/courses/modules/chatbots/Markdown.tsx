// ============================================================
// Rendu markdown des réponses de modèles, calibré pour une bulle
// de chat : les titres restent proches du corps de texte (un h1 de
// LLM ne doit pas écraser l'interface), les listes et tableaux
// restent lisibles dans une colonne étroite.
// ============================================================

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Les LLM ouvrent souvent en h1/h2 : on les ramène à l'échelle du chat.
          h1: ({ children }) => (
            <h4 className="mt-4 mb-1.5 text-sm font-semibold text-[var(--color-foreground)]">
              {children}
            </h4>
          ),
          h2: ({ children }) => (
            <h4 className="mt-4 mb-1.5 text-sm font-semibold text-[var(--color-foreground)]">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-3 mb-1 text-[13px] font-semibold text-[var(--color-foreground)]">
              {children}
            </h5>
          ),
          h4: ({ children }) => (
            <h5 className="mt-3 mb-1 text-[13px] font-semibold text-[var(--color-foreground)]">
              {children}
            </h5>
          ),
          h5: ({ children }) => (
            <h6 className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {children}
            </h6>
          ),
          h6: ({ children }) => (
            <h6 className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {children}
            </h6>
          ),
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5 marker:text-slate-400">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--color-foreground)]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--color-foreground)] underline decoration-[var(--color-muted-foreground)]/50 underline-offset-[3px] transition-colors hover:decoration-[var(--color-foreground)]"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-slate-300 pl-3 text-[var(--color-muted-foreground)] italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? '')
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md bg-[var(--color-muted)] p-2.5 font-mono text-xs">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-[var(--color-muted)] px-1 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          hr: () => <hr className="my-3 border-[var(--color-border)]" />,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[var(--color-border)] px-2 py-1 align-top">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MathJaxContext } from 'better-react-mathjax'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/lib/i18n'
import '@/index.css'
import { App } from '@/app/App'

const queryClient = new QueryClient()

const mathJaxConfig = {
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['$$', '$$']],
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MathJaxContext version={3} config={mathJaxConfig}>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </TooltipProvider>
      </MathJaxContext>
    </QueryClientProvider>
  </StrictMode>,
)

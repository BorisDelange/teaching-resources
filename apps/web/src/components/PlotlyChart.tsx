import { useEffect, useRef } from 'react'
import Plotly, { type Data, type Layout, type Config } from 'plotly.js-dist-min'

interface PlotlyChartProps {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
  className?: string
  style?: React.CSSProperties
}

export function PlotlyChart({ data, layout, config, className, style }: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    void Plotly.react(el, data, layout ?? {}, { responsive: true, ...config })
  }, [data, layout, config])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return () => {
      Plotly.purge(el)
    }
  }, [])

  return <div ref={ref} className={className} style={style} />
}

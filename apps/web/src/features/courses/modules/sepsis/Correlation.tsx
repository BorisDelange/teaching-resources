/**
 * La matrice de corrélation.
 *
 * Sert un point précis du TD : certaines variables disent la même chose. Le
 * modèle n'y gagne rien à recevoir deux fois la même information, et l'étudiant
 * doit voir que « ajouter une variable » n'est pas toujours « ajouter du
 * signal ».
 */

import { useMemo } from 'react'
import { type Data, type Layout } from 'plotly.js-dist-min'
import { PlotlyChart } from '@/components/PlotlyChart'
import { COHORT } from './cohort'
import { VARIABLES, varText, type FeatureKey } from './variables'
import { useLang, pick } from '@/lib/useLang'

/**
 * Corrélation de Pearson sur les paires COMPLÈTES.
 *
 * On ne peut pas imputer ici : remplacer les trous par la médiane rapprocherait
 * mécaniquement les variables de leur moyenne commune et gonflerait les
 * corrélations. On se limite donc aux patients où les deux mesures existent,
 * et on affiche l'effectif au survol — parfois faible, et c'est à savoir.
 */
function pearson(a: FeatureKey, b: FeatureKey): { r: number; n: number } {
  const pairs: [number, number][] = []
  for (const p of COHORT) {
    const va = p[a]
    const vb = p[b]
    if (va != null && vb != null) pairs.push([va, vb])
  }
  const n = pairs.length
  if (n < 3) return { r: NaN, n }
  const ma = pairs.reduce((s, x) => s + x[0], 0) / n
  const mb = pairs.reduce((s, x) => s + x[1], 0) / n
  let num = 0
  let da = 0
  let db = 0
  for (const [x, y] of pairs) {
    const dx = x - ma
    const dy = y - mb
    num += dx * dy
    da += dx * dx
    db += dy * dy
  }
  const den = Math.sqrt(da * db)
  return { r: den === 0 ? NaN : num / den, n }
}

export function CorrelationHeatmap() {
  const lang = useLang()
  const keys = useMemo(() => VARIABLES.map((v) => v.key), [])
  const labels = useMemo(() => VARIABLES.map((v) => varText(v, lang).short), [lang])

  const { z, counts } = useMemo(() => {
    const z: (number | null)[][] = []
    const counts: number[][] = []
    for (const rowKey of keys) {
      const zr: (number | null)[] = []
      const cr: number[] = []
      for (const colKey of keys) {
        const { r, n } = pearson(rowKey, colKey)
        zr.push(Number.isNaN(r) ? null : r)
        cr.push(n)
      }
      z.push(zr)
      counts.push(cr)
    }
    return { z, counts }
  }, [keys])

  const data = useMemo<Data[]>(
    () => [
      {
        type: 'heatmap',
        z,
        x: labels,
        y: labels,
        customdata: counts,
        // Échelle divergente centrée sur zéro : le signe compte autant que
        // l'intensité, et une échelle continue du bleu au rouge le dit sans
        // qu'on ait à lire la valeur.
        colorscale: [
          [0, '#3b82f6'],
          [0.5, 'rgba(148,163,184,0.15)'],
          [1, '#ef4444'],
        ],
        zmin: -1,
        zmax: 1,
        xgap: 2,
        ygap: 2,
        hovertemplate:
          pick(
            lang,
            '%{y} / %{x}<br>r = %{z:.2f}<br>%{customdata} patients mesurés<extra></extra>',
            '%{y} / %{x}<br>r = %{z:.2f}<br>%{customdata} patients measured<extra></extra>',
          ),
        colorbar: {
          thickness: 12,
          len: 0.9,
          tickvals: [-1, -0.5, 0, 0.5, 1],
          outlinewidth: 0,
        },
      } as Data,
    ],
    [z, labels, counts, lang],
  )

  const layout = useMemo<Partial<Layout>>(
    () => ({
      font: { family: 'Inter, sans-serif', size: 12 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      height: 420,
      margin: { l: 70, r: 10, t: 10, b: 60 },
      xaxis: { side: 'bottom', tickangle: -45 },
      // Le repère naturel d'une matrice se lit de haut en bas.
      yaxis: { autorange: 'reversed' },
    }),
    [],
  )

  return <PlotlyChart data={data} layout={layout} config={{ displayModeBar: false, responsive: true }} />
}

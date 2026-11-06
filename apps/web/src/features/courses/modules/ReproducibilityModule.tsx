import { useMemo, useState } from 'react'
import {
  Info,
  CheckCheck,
  Scale,
  X,
  Undo2,
  ArrowUp,
  LineChart,
} from 'lucide-react'
import { MathJax } from 'better-react-mathjax'
import { type Data, type Layout } from 'plotly.js-dist-min'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PlotlyChart } from '@/components/PlotlyChart'
import { useLang, pick, type Lang } from '@/lib/useLang'

// ---------- Shared UI helpers ----------

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-blue-500/30 border-l-4 border-l-blue-500 bg-blue-500/10 p-4 text-sm text-[var(--color-foreground)]">
      <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <p>{children}</p>
    </div>
  )
}

// ---------- Kappa section ----------

type KappaCells = { a: number; b: number; c: number; d: number }

const KAPPA_DEFAULTS: KappaCells = { a: 45, b: 5, c: 10, d: 35 }

function interpretKappa(
  kappa: number,
  lang: Lang,
): { label: string; color: 'red' | 'amber' | 'emerald' } {
  if (kappa < 0)
    return { label: pick(lang, 'Accord moins bon que le hasard', 'Worse than chance agreement'), color: 'red' }
  if (kappa < 0.4) return { label: pick(lang, 'Accord faible', 'Poor agreement'), color: 'red' }
  if (kappa < 0.6) return { label: pick(lang, 'Accord modéré', 'Moderate agreement'), color: 'amber' }
  if (kappa < 0.8) return { label: pick(lang, 'Accord bon', 'Good agreement'), color: 'emerald' }
  return { label: pick(lang, 'Accord excellent', 'Excellent agreement'), color: 'emerald' }
}

const badgeColorClasses: Record<'red' | 'amber' | 'emerald', string> = {
  red: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
}

function KappaSection({ lang }: { lang: Lang }) {
  const [cells, setCells] = useState<KappaCells>(KAPPA_DEFAULTS)

  const setCell = (key: keyof KappaCells, value: string) => {
    const n = Math.max(0, Number(value) || 0)
    setCells((prev) => ({ ...prev, [key]: n }))
  }

  const { a, b, c, d } = cells
  const row1 = a + b
  const row2 = c + d
  const col1 = a + c
  const col2 = b + d
  const n = a + b + c + d

  const metrics = useMemo(() => {
    if (n === 0) return null
    const p0 = (a + d) / n
    const pe = (row1 * col1 + row2 * col2) / (n * n)
    const kappa = (p0 - pe) / (1 - pe)
    return { p0, pe, kappa }
  }, [a, d, n, row1, col1, row2, col2])

  const interpretation = metrics ? interpretKappa(metrics.kappa, lang) : null

  const cellInput = (key: keyof KappaCells, letter: string) => (
    <div className="flex flex-col items-center gap-1">
      <Input
        type="number"
        min={0}
        value={cells[key]}
        onChange={(e) => setCell(key, e.target.value)}
        className="w-20 text-center"
      />
      <span className="text-xs italic text-[var(--color-muted-foreground)]">{letter}</span>
    </div>
  )

  const totalCell = (value: number, label: string) => (
    <div className="flex w-20 flex-col items-center gap-1">
      <span className="font-semibold">{value}</span>
      <span className="text-xs italic text-[var(--color-muted-foreground)]">{label}</span>
    </div>
  )

  const controls = (
    <div className="lg:sticky lg:top-4">
      <Card className="lg:h-full">
        <CardHeader>
          <CardTitle className="text-base">{pick(lang, 'Paramètres', 'Parameters')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InfoBox>
            {pick(
              lang,
              "Sélectionnez un scénario ou modifiez les valeurs du tableau pour évaluer l'accord entre deux observateurs.",
              'Select a scenario or edit the table values to assess the agreement between two raters.',
            )}
          </InfoBox>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setCells({ a: 50, b: 0, c: 0, d: 50 })}
            >
              <CheckCheck className="size-4" />
              {pick(lang, 'Accord parfait', 'Perfect agreement')}
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => setCells({ a: 40, b: 10, c: 15, d: 35 })}
            >
              <Scale className="size-4" />
              {pick(lang, 'Accord modéré', 'Moderate agreement')}
            </Button>
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => setCells({ a: 30, b: 20, c: 20, d: 30 })}
            >
              <X className="size-4" />
              {pick(lang, 'Accord faible', 'Poor agreement')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCells(KAPPA_DEFAULTS)}>
              <Undo2 className="size-4" />
              {pick(lang, 'Réinitialiser', 'Reset')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const tableTab = (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full overflow-x-auto">
        <table className="mx-auto border-collapse text-center">
          <thead>
            <tr>
              <th className="p-3" />
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold" colSpan={3}>
                {pick(lang, 'Observateur B', 'Rater B')}
              </th>
            </tr>
            <tr>
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold">
                {pick(lang, 'Observateur A', 'Rater A')}
              </th>
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold">
                {pick(lang, 'Positif', 'Positive')}
              </th>
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold">
                {pick(lang, 'Négatif', 'Negative')}
              </th>
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold">
                {pick(lang, 'Total', 'Total')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold">
                {pick(lang, 'Positif', 'Positive')}
              </th>
              <td className="border p-3">{cellInput('a', 'a')}</td>
              <td className="border p-3">{cellInput('b', 'b')}</td>
              <td className="border p-3">{totalCell(row1, 'a + b')}</td>
            </tr>
            <tr>
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold">
                {pick(lang, 'Négatif', 'Negative')}
              </th>
              <td className="border p-3">{cellInput('c', 'c')}</td>
              <td className="border p-3">{cellInput('d', 'd')}</td>
              <td className="border p-3">{totalCell(row2, 'c + d')}</td>
            </tr>
            <tr>
              <th className="border bg-[var(--color-muted)] p-3 text-sm font-semibold">
                {pick(lang, 'Total', 'Total')}
              </th>
              <td className="border p-3">{totalCell(col1, 'a + c')}</td>
              <td className="border p-3">{totalCell(col2, 'b + d')}</td>
              <td className="border p-3">{totalCell(n, 'n')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          'Modifiez les effectifs a, b, c, d pour recalculer le coefficient κ.',
          'Edit the counts a, b, c, d to recompute the κ coefficient.',
        )}
      </p>
    </div>
  )

  const resultTab = (
    <div className="grid grid-cols-1 items-center gap-6 rounded-md border bg-[var(--color-card)] p-5 sm:grid-cols-2">
      {metrics && interpretation && (
        <div className="text-center">
          <div className="text-lg font-semibold">
            {pick(lang, 'Coefficient Kappa (κ) = ', 'Kappa coefficient (κ) = ')}
            {metrics.kappa.toFixed(3)}
          </div>
          <div
            className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${badgeColorClasses[interpretation.color]}`}
          >
            {interpretation.label}
          </div>
        </div>
      )}

      <div className="space-y-2 sm:border-l sm:pl-6">
        <h3 className="font-semibold">
          {pick(
            lang,
            "Grille d'interprétation (Landis & Koch, 1977) :",
            'Interpretation scale (Landis & Koch, 1977):',
          )}
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-muted-foreground)]">
          <li>{pick(lang, 'κ < 0 : Accord moins bon que le hasard', 'κ < 0: worse than chance agreement')}</li>
          <li>{pick(lang, '0 ≤ κ < 0.4 : Accord faible', '0 ≤ κ < 0.4: poor agreement')}</li>
          <li>{pick(lang, '0.4 ≤ κ < 0.6 : Accord modéré', '0.4 ≤ κ < 0.6: moderate agreement')}</li>
          <li>{pick(lang, '0.6 ≤ κ < 0.8 : Accord bon', '0.6 ≤ κ < 0.8: good agreement')}</li>
          <li>{pick(lang, 'κ ≥ 0.8 : Accord excellent', 'κ ≥ 0.8: excellent agreement')}</li>
        </ul>
      </div>
    </div>
  )

  const calcTab = metrics && (
    <div className="space-y-5">
      <div className="space-y-2 overflow-x-auto">
        <h3 className="font-semibold">
          {pick(lang, 'Étape 1 : Accord observé (P₀)', 'Step 1: Observed agreement (P₀)')}
        </h3>
        <MathJax dynamic>{`$$P_0 = \\frac{a + d}{n} = \\frac{${a} + ${d}}{${n}} = ${metrics.p0.toFixed(4)}$$`}</MathJax>
      </div>

      <div className="space-y-2 overflow-x-auto">
        <h3 className="font-semibold">
          {pick(
            lang,
            'Étape 2 : Accord attendu par hasard (Pₑ)',
            'Step 2: Agreement expected by chance (Pₑ)',
          )}
        </h3>
        <MathJax dynamic>{`$$P_e = \\frac{(a+b) \\times (a+c) + (c+d) \\times (b+d)}{n^2}$$`}</MathJax>
        <MathJax dynamic>{`$$\\begin{align} P_e &= \\frac{${row1} \\times ${col1} + ${row2} \\times ${col2}}{${n}^2} \\\\ &= \\frac{${row1 * col1} + ${row2 * col2}}{${n * n}} \\\\ &= ${metrics.pe.toFixed(4)} \\end{align}$$`}</MathJax>
      </div>

      <div className="space-y-2 overflow-x-auto">
        <h3 className="font-semibold">
          {pick(lang, 'Étape 3 : Coefficient Kappa (κ)', 'Step 3: Kappa coefficient (κ)')}
        </h3>
        <MathJax dynamic>{`$$\\begin{align} \\kappa &= \\frac{P_0 - P_e}{1 - P_e} \\\\ &= \\frac{${metrics.p0.toFixed(4)} - ${metrics.pe.toFixed(4)}}{1 - ${metrics.pe.toFixed(4)}} \\\\ &= ${metrics.kappa.toFixed(4)} \\end{align}$$`}</MathJax>
      </div>
    </div>
  )

  const refsTab = (
    <div className="space-y-2 overflow-x-auto">
      <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-muted-foreground)]">
        <li>
          {pick(lang, 'Formule de calcul :', 'Calculation formula:')}{' '}
          <a
            href="https://online.stat.psu.edu/stat509/lesson/18/18.7"
            target="_blank"
            rel="noopener"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Penn State University - STAT 509
          </a>
        </li>
        <li>
          {pick(lang, "Grille d'interprétation :", 'Interpretation scale:')} Landis, J. R., &amp;
          Koch, G. G. (1977). The measurement of observer agreement for categorical data.
          Biometrics, 33(1), 159-174.
        </li>
      </ul>
    </div>
  )

  return (
    <div className="grid items-stretch gap-6 lg:min-h-[600px] lg:grid-cols-[280px_1fr]">
      {controls}

      <Card className="flex min-w-0 flex-col pt-3">
        <CardContent className="flex min-w-0 flex-1 flex-col gap-4">
          <Tabs defaultValue="table" className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="max-w-full overflow-x-auto text-center">
              <TabsList>
                <TabsTrigger value="table">{pick(lang, 'Tableau et résultat', 'Table and result')}</TabsTrigger>
                <TabsTrigger value="calc">{pick(lang, 'Calculs détaillés', 'Detailed calculations')}</TabsTrigger>
                <TabsTrigger value="refs">{pick(lang, 'Références', 'References')}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="table" className="mt-4 min-w-0 flex-1 space-y-6">
              {tableTab}
              {resultTab}
            </TabsContent>
            <TabsContent value="calc" className="mt-4 min-w-0 flex-1">
              {calcTab}
            </TabsContent>
            <TabsContent value="refs" className="mt-4 min-w-0 flex-1">
              {refsTab}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- Bland-Altman section ----------

type BAData = { methodA: number[]; methodB: number[] }
type BAPreset = 'systematic' | 'proportional'

const PROPORTIONAL_A = [
  5.2, 8.7, 12.3, 15.8, 18.4, 22.1, 25.6, 28.9, 32.4, 35.7, 38.2, 42.5, 45.8, 48.3, 52.1,
]
const PROPORTIONAL_B = [
  5.8, 10.2, 14.8, 19.5, 23.4, 28.9, 33.8, 38.7, 44.2, 49.8, 54.1, 61.3, 67.5, 72.4, 79.6,
]

function generateSystematic(): BAData {
  const methodA: number[] = []
  const methodB: number[] = []
  for (let i = 0; i < 50; i++) {
    const trueValue = 100 + Math.random() * 80
    const randomError = (Math.random() - 0.5) * 3.5 * 2
    methodB.push(trueValue)
    methodA.push(trueValue + 5 + randomError)
  }
  return { methodA, methodB }
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string
  value: string
  color: 'red' | 'grey'
}) {
  const cls =
    color === 'red'
      ? 'border-red-500/30 bg-red-500/10'
      : 'border bg-[var(--color-muted)]'
  return (
    <div className={`rounded-md border p-4 ${cls}`}>
      <div className="text-xs text-[var(--color-muted-foreground)]">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

function BlandAltmanSection({ lang }: { lang: Lang }) {
  const [preset, setPreset] = useState<BAPreset>('systematic')
  const [data, setData] = useState<BAData>(() => generateSystematic())

  const selectSystematic = () => {
    setPreset('systematic')
    setData(generateSystematic())
  }
  const selectProportional = () => {
    setPreset('proportional')
    setData({ methodA: PROPORTIONAL_A, methodB: PROPORTIONAL_B })
  }

  const m = useMemo(() => {
    const { methodA, methodB } = data
    const n = methodA.length
    const means = methodA.map((a, i) => (a + methodB[i]) / 2)
    const diffs = methodA.map((a, i) => a - methodB[i])
    const sumDiffs = diffs.reduce((s, x) => s + x, 0)
    const meanDiff = sumDiffs / n
    const sdDiff = Math.sqrt(
      diffs.reduce((s, x) => s + (x - meanDiff) ** 2, 0) / (n - 1),
    )
    const upper = meanDiff + 1.96 * sdDiff
    const lower = meanDiff - 1.96 * sdDiff
    const seMean = sdDiff / Math.sqrt(n)
    const ciMeanLower = meanDiff - 1.96 * seMean
    const ciMeanUpper = meanDiff + 1.96 * seMean
    const seSD = sdDiff / Math.sqrt(2 * (n - 1))
    const ciUpperLower = upper - 1.96 * seSD
    const ciUpperUpper = upper + 1.96 * seSD
    const ciLowerLower = lower - 1.96 * seSD
    const ciLowerUpper = lower + 1.96 * seSD
    const minMean = Math.min(...means)
    const maxMean = Math.max(...means)
    return {
      n,
      means,
      diffs,
      sumDiffs,
      meanDiff,
      sdDiff,
      upper,
      lower,
      seMean,
      ciMeanLower,
      ciMeanUpper,
      ciUpperLower,
      ciUpperUpper,
      ciLowerLower,
      ciLowerUpper,
      minMean,
      maxMean,
    }
  }, [data])

  const plotData: Data[] = useMemo(
    () => [
      {
        name: pick(lang, 'Mesures', 'Measurements'),
        type: 'scatter',
        mode: 'markers',
        x: m.means,
        y: m.diffs,
        marker: { color: '#3498db', size: 10 },
        hovertemplate: pick(
          lang,
          'Moyenne: %{x:.1f}<br>Différence: %{y:.1f}<extra></extra>',
          'Mean: %{x:.1f}<br>Difference: %{y:.1f}<extra></extra>',
        ),
      },
      {
        name: pick(lang, 'Biais moyen', 'Mean bias'),
        type: 'scatter',
        mode: 'lines',
        x: [m.minMean, m.maxMean],
        y: [m.meanDiff, m.meanDiff],
        line: { color: '#e74c3c', width: 2 },
      },
      {
        name: pick(lang, 'Limite supérieure (+1.96 SD)', 'Upper limit (+1.96 SD)'),
        type: 'scatter',
        mode: 'lines',
        x: [m.minMean, m.maxMean],
        y: [m.upper, m.upper],
        line: { color: '#95a5a6', width: 2, dash: 'dash' },
      },
      {
        name: pick(lang, 'Limite inférieure (-1.96 SD)', 'Lower limit (-1.96 SD)'),
        type: 'scatter',
        mode: 'lines',
        x: [m.minMean, m.maxMean],
        y: [m.lower, m.lower],
        line: { color: '#95a5a6', width: 2, dash: 'dash' },
      },
    ],
    [m, lang],
  )

  const plotLayout: Partial<Layout> = useMemo(
    () => ({
      title: { text: pick(lang, 'Graphique de Bland-Altman', 'Bland-Altman plot') },
      xaxis: {
        title: { text: pick(lang, 'Moyenne des deux méthodes', 'Mean of the two methods') },
      },
      yaxis: {
        title: {
          text: pick(
            lang,
            'Différence (Méthode A - Méthode B)',
            'Difference (Method A - Method B)',
          ),
        },
      },
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.2 },
      height: 500,
      hovermode: 'closest',
      margin: { t: 80, b: 140, l: 60, r: 40 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    }),
    [lang],
  )

  const controls = (
    <div className="lg:sticky lg:top-4">
      <Card className="lg:h-full">
        <CardHeader>
          <CardTitle className="text-base">{pick(lang, 'Paramètres', 'Parameters')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InfoBox>
            {pick(
              lang,
              "Sélectionnez un scénario pour visualiser et analyser l'accord entre deux mesures quantitatives avec le graphique de Bland-Altman.",
              'Select a scenario to visualise and analyse the agreement between two quantitative measurements with the Bland-Altman plot.',
            )}
          </InfoBox>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant={preset === 'systematic' ? 'default' : 'secondary'}
              onClick={selectSystematic}
            >
              <ArrowUp className="size-4" />
              {pick(lang, 'Biais systématique', 'Systematic bias')}
            </Button>
            <Button
              size="sm"
              variant={preset === 'proportional' ? 'default' : 'secondary'}
              onClick={selectProportional}
            >
              <LineChart className="size-4" />
              {pick(lang, 'Biais proportionnel', 'Proportional bias')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const graphTab = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title={pick(lang, 'Biais moyen', 'Mean bias')} value={m.meanDiff.toFixed(2)} color="red" />
        <StatCard title={pick(lang, 'Limite supérieure', 'Upper limit')} value={m.upper.toFixed(2)} color="grey" />
        <StatCard title={pick(lang, 'Limite inférieure', 'Lower limit')} value={m.lower.toFixed(2)} color="grey" />
      </div>
      <PlotlyChart
        data={plotData}
        layout={plotLayout}
        config={{ displayModeBar: false }}
        className="w-full"
      />
    </div>
  )

  const dataTab = (
    <div className="overflow-auto rounded-md border" style={{ maxHeight: 460 }}>
      <table className="w-full border-collapse text-center text-sm">
        <thead className="sticky top-0 bg-[var(--color-muted)]">
          <tr>
            <th className="border p-2 font-semibold">{pick(lang, 'Obs.', 'Obs.')}</th>
            <th className="border p-2 font-semibold">{pick(lang, 'Méthode A', 'Method A')}</th>
            <th className="border p-2 font-semibold">{pick(lang, 'Méthode B', 'Method B')}</th>
            <th className="border p-2 font-semibold">{pick(lang, 'Moyenne', 'Mean')}</th>
            <th className="border p-2 font-semibold">{pick(lang, 'Différence', 'Difference')}</th>
          </tr>
        </thead>
        <tbody>
          {data.methodA.map((a, i) => (
            <tr key={i}>
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">{a.toFixed(1)}</td>
              <td className="border p-2">{data.methodB[i].toFixed(1)}</td>
              <td className="border p-2">{m.means[i].toFixed(1)}</td>
              <td className="border p-2">{m.diffs[i].toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const calcTab = (
    <div className="space-y-5">
        <div className="space-y-2 overflow-x-auto">
          <h3 className="font-semibold">
            {pick(
              lang,
              'Étape 1 : Calcul de la différence moyenne (biais)',
              'Step 1: Computing the mean difference (bias)',
            )}
          </h3>
          <MathJax dynamic>{`$$\\bar{d} = \\frac{1}{n} \\sum_{i=1}^{n} (A_i - B_i) = \\frac{${m.sumDiffs.toFixed(2)}}{${m.n}} = ${m.meanDiff.toFixed(2)}$$`}</MathJax>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pick(lang, "Calcul de l'intervalle de confiance à 95% :", 'Computing the 95% confidence interval:')}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pick(lang, 'Erreur standard de la moyenne :', 'Standard error of the mean:')}
          </p>
          <MathJax dynamic>{`$$SE_{\\bar{d}} = \\frac{s_d}{\\sqrt{n}} = \\frac{${m.sdDiff.toFixed(2)}}{\\sqrt{${m.n}}} = ${m.seMean.toFixed(4)}$$`}</MathJax>
          <p className="text-sm text-[var(--color-muted-foreground)]">{pick(lang, 'IC 95% =', '95% CI =')}</p>
          <MathJax dynamic>{`$$\\bar{d} \\pm 1.96 \\times SE_{\\bar{d}} = ${m.meanDiff.toFixed(2)} \\pm 1.96 \\times ${m.seMean.toFixed(4)}$$`}</MathJax>
          <MathJax dynamic>{`$$= ${m.meanDiff.toFixed(2)} \\pm ${(1.96 * m.seMean).toFixed(2)} = [${m.ciMeanLower.toFixed(2)} ; ${m.ciMeanUpper.toFixed(2)}]$$`}</MathJax>
        </div>

        <div className="space-y-2 overflow-x-auto">
          <h3 className="font-semibold">
            {pick(
              lang,
              "Étape 2 : Calcul de l'écart-type des différences",
              'Step 2: Computing the standard deviation of the differences',
            )}
          </h3>
          <MathJax dynamic>{`$$s_d = \\sqrt{\\frac{1}{n-1} \\sum_{i=1}^{n} (d_i - \\bar{d})^2} = ${m.sdDiff.toFixed(2)}$$`}</MathJax>
        </div>

        <div className="space-y-2 overflow-x-auto">
          <h3 className="font-semibold">
            {pick(
              lang,
              "Étape 3 : Limite supérieure d'accord (LSA)",
              'Step 3: Upper limit of agreement (ULA)',
            )}
          </h3>
          <MathJax dynamic>{pick(
            lang,
            `$$\\begin{align} LSA &= \\bar{d} + 1.96 \\times s_d \\\\ &= ${m.meanDiff.toFixed(2)} + 1.96 \\times ${m.sdDiff.toFixed(2)} \\\\ &= ${m.upper.toFixed(2)} \\end{align}$$`,
            `$$\\begin{align} ULA &= \\bar{d} + 1.96 \\times s_d \\\\ &= ${m.meanDiff.toFixed(2)} + 1.96 \\times ${m.sdDiff.toFixed(2)} \\\\ &= ${m.upper.toFixed(2)} \\end{align}$$`,
          )}</MathJax>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pick(lang, 'Intervalle de confiance à 95% :', '95% confidence interval:')} [{m.ciUpperLower.toFixed(2)} ; {m.ciUpperUpper.toFixed(2)}]
          </p>
        </div>

        <div className="space-y-2 overflow-x-auto">
          <h3 className="font-semibold">
            {pick(
              lang,
              "Étape 4 : Limite inférieure d'accord (LIA)",
              'Step 4: Lower limit of agreement (LLA)',
            )}
          </h3>
          <MathJax dynamic>{pick(
            lang,
            `$$\\begin{align} LIA &= \\bar{d} - 1.96 \\times s_d \\\\ &= ${m.meanDiff.toFixed(2)} - 1.96 \\times ${m.sdDiff.toFixed(2)} \\\\ &= ${m.lower.toFixed(2)} \\end{align}$$`,
            `$$\\begin{align} LLA &= \\bar{d} - 1.96 \\times s_d \\\\ &= ${m.meanDiff.toFixed(2)} - 1.96 \\times ${m.sdDiff.toFixed(2)} \\\\ &= ${m.lower.toFixed(2)} \\end{align}$$`,
          )}</MathJax>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pick(lang, 'Intervalle de confiance à 95% :', '95% confidence interval:')} [{m.ciLowerLower.toFixed(2)} ; {m.ciLowerUpper.toFixed(2)}]
          </p>
        </div>

        <div className="space-y-2 overflow-x-auto">
          <h3 className="font-semibold">{pick(lang, 'Interprétation :', 'Interpretation:')}</h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {lang === 'en' ? (
              <>
                95% of the differences between the two methods lie between {m.lower.toFixed(2)} and{' '}
                {m.upper.toFixed(2)}.
              </>
            ) : (
              <>
                95% des différences entre les deux méthodes se situent entre {m.lower.toFixed(2)} et{' '}
                {m.upper.toFixed(2)}.
              </>
            )}
          </p>
        </div>
      </div>
  )

  return (
    <div className="grid items-stretch gap-6 lg:min-h-[600px] lg:grid-cols-[280px_1fr]">
      {controls}

      <Card className="flex min-w-0 flex-col pt-3">
        <CardContent className="flex min-w-0 flex-1 flex-col gap-4">
          <Tabs defaultValue="graph" className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="max-w-full overflow-x-auto text-center">
              <TabsList>
                <TabsTrigger value="graph">{pick(lang, 'Graphique', 'Plot')}</TabsTrigger>
                <TabsTrigger value="data">{pick(lang, 'Données', 'Data')}</TabsTrigger>
                <TabsTrigger value="calc">{pick(lang, 'Calculs détaillés', 'Detailed calculations')}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="graph" className="mt-4 min-w-0 flex-1">
              {graphTab}
            </TabsContent>
            <TabsContent value="data" className="mt-4 min-w-0 flex-1">
              {dataTab}
            </TabsContent>
            <TabsContent value="calc" className="mt-4 min-w-0 flex-1">
              {calcTab}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- Module ----------

export function ReproducibilityModule() {
  const lang = useLang()
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Tabs defaultValue="kappa">
        <TabsList className="mx-auto">
          <TabsTrigger value="kappa">{pick(lang, 'Kappa de Cohen', "Cohen's kappa")}</TabsTrigger>
          <TabsTrigger value="bland-altman">Bland-Altman</TabsTrigger>
        </TabsList>
        <TabsContent value="kappa" className="mt-4">
          <KappaSection lang={lang} />
        </TabsContent>
        <TabsContent value="bland-altman" className="mt-4">
          <BlandAltmanSection lang={lang} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

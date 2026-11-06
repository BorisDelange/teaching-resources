import { useMemo, useState } from 'react'
import {
  Info,
  Star,
  ThumbsUp,
  LineChart,
  Undo2,
  SearchCheck,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  AreaChart,
  Scale,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { MathJax } from 'better-react-mathjax'
import { type Data, type Layout, type Config } from 'plotly.js-dist-min'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PlotlyChart } from '@/components/PlotlyChart'
import { useLang, pick } from '@/lib/useLang'

// ---------- Types ----------

interface Params {
  nTests: number
  prevalence: number
  sickMean: number
  sickSD: number
  healthyMean: number
  healthySD: number
}

interface Distribution {
  sickValues: number[]
  healthyValues: number[]
}

// ---------- Presets ----------

const PRESETS: Record<'excellent' | 'good' | 'poor', { params: Params; threshold: number }> = {
  excellent: {
    params: { nTests: 1000, prevalence: 20, sickMean: 70, sickSD: 10, healthyMean: 25, healthySD: 8 },
    threshold: 45,
  },
  good: {
    params: { nTests: 1000, prevalence: 20, sickMean: 55, sickSD: 15, healthyMean: 20, healthySD: 12 },
    threshold: 30,
  },
  poor: {
    params: { nTests: 1000, prevalence: 20, sickMean: 45, sickSD: 20, healthyMean: 35, healthySD: 18 },
    threshold: 40,
  },
}

// ---------- Seeded RNG + distribution ----------

function createSeededRandom(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashParameters(sickMean: number, sickSD: number, healthyMean: number, healthySD: number): number {
  const str = `${sickMean}_${sickSD}_${healthyMean}_${healthySD}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    hash = (hash << 5) - hash + c
    hash = hash & hash
  }
  return Math.abs(hash)
}

function generatePool(mean: number, sd: number, seed: number, poolSize: number): number[] {
  const rng = createSeededRandom(seed)
  const pool: number[] = []
  for (let i = 0; i < poolSize; i++) {
    const u1 = rng()
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    let value = mean + z * sd
    value = Math.max(0, Math.min(100, value))
    pool.push(value)
  }
  return pool
}

function generateDistribution(params: Params): Distribution {
  const { nTests, prevalence, sickMean, sickSD, healthyMean, healthySD } = params
  const sickCount = Math.round((nTests * prevalence) / 100)
  const healthyCount = nTests - sickCount
  const seedSick = hashParameters(sickMean, sickSD, 0, 0)
  const seedHealthy = hashParameters(healthyMean, healthySD, 0, 0)
  const poolSize = Math.max(10000, nTests)
  const sickPool = generatePool(sickMean, sickSD, seedSick, poolSize)
  const healthyPool = generatePool(healthyMean, healthySD, seedHealthy, poolSize)
  return {
    sickValues: sickPool.slice(0, sickCount),
    healthyValues: healthyPool.slice(0, healthyCount),
  }
}

function calculateMetrics(dist: Distribution, threshold: number) {
  let vp = 0
  let fn = 0
  for (const v of dist.sickValues) {
    if (v >= threshold) vp++
    else fn++
  }
  let fp = 0
  let vn = 0
  for (const v of dist.healthyValues) {
    if (v >= threshold) fp++
    else vn++
  }
  const se = vp + fn > 0 ? vp / (vp + fn) : 0
  const sp = vn + fp > 0 ? vn / (vn + fp) : 0
  return { vp, fn, fp, vn, se, sp }
}

// ---------- UI helpers ----------

type Accent = 'blue' | 'emerald' | 'amber' | 'red'

const iconAccent: Record<Accent, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-blue-500/30 border-l-4 border-l-blue-500 bg-blue-500/10 p-4 text-sm text-[var(--color-foreground)]">
      <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <p>{children}</p>
    </div>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="flex min-h-8 items-end text-xs leading-tight text-[var(--color-muted-foreground)]">
        {label}
      </Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  detail?: string
  icon: typeof SearchCheck
  accent: Accent
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <Icon className={`size-4 ${iconAccent[accent]}`} />
          <span>{title}</span>
        </div>
        <div className="text-2xl font-bold text-[var(--color-foreground)]">{value}</div>
        {detail && <div className="text-xs text-[var(--color-muted-foreground)]">{detail}</div>}
      </CardContent>
    </Card>
  )
}

function CalcStep({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-4 last:border-b-0 last:pb-0">
      <h3 className="font-semibold text-[var(--color-foreground)]">{title}</h3>
      {intro && <p className="text-sm text-[var(--color-muted-foreground)]">{intro}</p>}
      <div className="overflow-x-auto text-sm text-[var(--color-foreground)]">{children}</div>
    </div>
  )
}

// ---------- Main component ----------

export function PerformanceModule() {
  const lang = useLang()
  const [params, setParams] = useState<Params>(PRESETS.good.params)
  const [threshold, setThreshold] = useState<number>(PRESETS.good.threshold)

  const setParam = (key: keyof Params, value: number) => setParams((p) => ({ ...p, [key]: value }))

  const applyPreset = (preset: 'excellent' | 'good' | 'poor' | 'reset') => {
    if (preset === 'reset') {
      setParams(PRESETS.good.params)
      setThreshold(PRESETS.good.threshold)
      return
    }
    setParams(PRESETS[preset].params)
    setThreshold(PRESETS[preset].threshold)
  }

  const dist = useMemo(() => generateDistribution(params), [params])

  const metrics = useMemo(() => calculateMetrics(dist, threshold), [dist, threshold])
  const { vp, fn, fp, vn, se, sp } = metrics

  // ROC + AUC + Youden point
  const roc = useMemo(() => {
    const fpr: number[] = []
    const tpr: number[] = []
    const youdenValues: number[] = []
    for (let t = 0; t <= 100; t++) {
      const m = calculateMetrics(dist, t)
      fpr.push(1 - m.sp)
      tpr.push(m.se)
      youdenValues.push(m.se + m.sp - 1)
    }
    let auc = 0
    for (let i = 1; i < fpr.length; i++) {
      auc += (fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1]) / 2
    }
    auc = Math.abs(auc)

    let bestIdx = 0
    for (let i = 1; i < youdenValues.length; i++) {
      if (youdenValues[i] > youdenValues[bestIdx]) bestIdx = i
    }
    const youdenThreshold = bestIdx
    const youdenPoint = calculateMetrics(dist, youdenThreshold)
    const bestYouden = youdenValues[bestIdx]
    return { fpr, tpr, auc, youdenThreshold, youdenPoint, bestYouden }
  }, [dist])

  // Derived metrics at current threshold
  const vpp = vp + fp > 0 ? vp / (vp + fp) : 0
  const vpn = vn + fn > 0 ? vn / (vn + fn) : 0
  const youden = se + sp - 1
  const rvplus = sp < 1 ? se / (1 - sp) : Infinity
  const rvminus = se < 1 ? (1 - se) / sp : 0

  const total = vp + fn + fp + vn
  const prevFrac = total > 0 ? (vp + fn) / total : 0

  const currentFPR = 1 - sp

  // ---------- Plotly: histogram ----------
  const histoData = useMemo<Data[]>(
    () => [
      {
        x: dist.healthyValues,
        type: 'histogram',
        name: pick(lang, 'Sains (M-)', 'Healthy (D-)'),
        opacity: 0.7,
        marker: { color: '#3498db', line: { color: '#ffffff', width: 1 } },
        xbins: { start: 0, end: 100, size: 2 },
      },
      {
        x: dist.sickValues,
        type: 'histogram',
        name: pick(lang, 'Malades (M+)', 'Diseased (D+)'),
        opacity: 0.7,
        marker: { color: '#e74c3c', line: { color: '#ffffff', width: 1 } },
        xbins: { start: 0, end: 100, size: 2 },
      },
    ],
    [dist, lang],
  )

  const histoLayout = useMemo<Partial<Layout>>(
    () => ({
      title: { text: pick(lang, 'Distribution des résultats du test', 'Distribution of test results') },
      barmode: 'overlay',
      xaxis: {
        title: {
          text: pick(lang, 'Résultat du test (valeur quantitative)', 'Test result (quantitative value)'),
        },
        range: [0, 100],
      },
      yaxis: { title: { text: pick(lang, 'Nombre de patients (effectifs)', 'Number of patients (counts)') } },
      shapes: [
        {
          type: 'line',
          x0: threshold,
          x1: threshold,
          yref: 'paper',
          y0: 0,
          y1: 1,
          line: { color: '#2c3e50', dash: 'dash', width: 4 },
        },
      ],
      annotations: [
        {
          x: threshold,
          yref: 'paper',
          y: 1.02,
          text: `${pick(lang, 'Seuil', 'Threshold')} = ${threshold}`,
          showarrow: false,
          font: { color: '#2c3e50' },
        },
        {
          x: threshold / 2,
          yref: 'paper',
          y: 0.95,
          text: `${pick(lang, 'Test NÉGATIF', 'NEGATIVE test')} < ${threshold}`,
          showarrow: false,
          font: { color: '#3498db' },
        },
        {
          x: (threshold + 100) / 2,
          yref: 'paper',
          y: 0.95,
          text: `${pick(lang, 'Test POSITIF', 'POSITIVE test')} ≥ ${threshold}`,
          showarrow: false,
          font: { color: '#e74c3c' },
        },
      ],
      legend: { orientation: 'h', y: -0.2 },
      margin: { t: 60, r: 20, b: 60, l: 60 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    }),
    [threshold, lang],
  )

  // ---------- Plotly: ROC ----------
  const rocData = useMemo<Data[]>(
    () => [
      {
        x: [0, 1],
        y: [0, 1],
        type: 'scatter',
        mode: 'lines',
        name: pick(lang, 'Hasard (AUC = 0.5)', 'Chance (AUC = 0.5)'),
        line: { color: '#95a5a6', dash: 'dash' },
      },
      {
        x: roc.fpr,
        y: roc.tpr,
        type: 'scatter',
        mode: 'lines',
        name: `${pick(lang, 'Courbe ROC', 'ROC curve')} (AUC = ${roc.auc.toFixed(2)})`,
        line: { color: '#3498db', width: 3 },
        fill: 'tonexty',
        fillcolor: 'rgba(52, 152, 219, 0.15)',
      },
      {
        x: [currentFPR],
        y: [se],
        type: 'scatter',
        mode: 'markers',
        name: `${pick(lang, 'Point actuel', 'Current point')} (${pick(lang, 'seuil', 'threshold')} = ${threshold})`,
        marker: { color: '#e74c3c', size: 14, symbol: 'star' },
      },
      {
        x: [1 - roc.youdenPoint.sp],
        y: [roc.youdenPoint.se],
        type: 'scatter',
        mode: 'markers',
        name: `${pick(lang, 'Point de Youden', 'Youden point')} (J = ${roc.bestYouden.toFixed(2)})`,
        marker: { color: '#10b981', size: 14, symbol: 'diamond' },
      },
    ],
    [roc, currentFPR, se, threshold, lang],
  )

  const rocLayout = useMemo<Partial<Layout>>(
    () => ({
      title: { text: pick(lang, 'Courbe ROC', 'ROC curve') },
      xaxis: {
        title: {
          text: pick(lang, '1 - Spécificité (Taux de faux positifs)', '1 - Specificity (false positive rate)'),
        },
        range: [-0.02, 1.02],
        tickformat: '.0%',
      },
      yaxis: {
        title: {
          text: pick(lang, 'Sensibilité (Taux de vrais positifs)', 'Sensitivity (true positive rate)'),
        },
        range: [-0.02, 1.05],
        tickformat: '.0%',
      },
      legend: { orientation: 'h', y: -0.2 },
      margin: { t: 60, r: 20, b: 60, l: 60 },
      plot_bgcolor: '#fafafa',
      paper_bgcolor: 'rgba(0,0,0,0)',
    }),
    [lang],
  )

  const plotConfig = useMemo<Partial<Config>>(() => ({ displayModeBar: false }), [])

  const rvplusStr = rvplus === Infinity ? '∞' : rvplus.toFixed(2)
  const rvplusLatex = rvplus === Infinity ? '\\infty' : rvplus.toFixed(4)

  // Parameters panel — shown only in Simulation mode (hidden in Calculations).
  const parametersPanel = (
    <div className="lg:sticky lg:top-4">
          <Card className="lg:h-full">
            <CardHeader>
              <CardTitle className="text-base">{pick(lang, 'Paramètres', 'Parameters')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <InfoBox>
                {pick(
                  lang,
                  'Ajustez les paramètres pour voir comment le seuil affecte les performances du test diagnostique.',
                  'Adjust the parameters to see how the threshold affects the diagnostic performance of the test.',
                )}
              </InfoBox>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label={pick(lang, 'Nombre de tests', 'Number of tests')}
                  value={params.nTests}
                  min={100}
                  max={10000}
                  step={100}
                  onChange={(v) => setParam('nTests', v)}
                />
                <NumberField
                  label={pick(lang, 'Prévalence (%)', 'Prevalence (%)')}
                  value={params.prevalence}
                  min={1}
                  max={99}
                  step={1}
                  onChange={(v) => setParam('prevalence', v)}
                />
                <NumberField
                  label={pick(lang, 'Moyenne malades', 'Diseased mean')}
                  value={params.sickMean}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(v) => setParam('sickMean', v)}
                />
                <NumberField
                  label={pick(lang, 'Écart-type malades', 'Diseased SD')}
                  value={params.sickSD}
                  min={1}
                  max={30}
                  step={1}
                  onChange={(v) => setParam('sickSD', v)}
                />
                <NumberField
                  label={pick(lang, 'Moyenne sains', 'Healthy mean')}
                  value={params.healthyMean}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(v) => setParam('healthyMean', v)}
                />
                <NumberField
                  label={pick(lang, 'Écart-type sains', 'Healthy SD')}
                  value={params.healthySD}
                  min={1}
                  max={30}
                  step={1}
                  onChange={(v) => setParam('healthySD', v)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-[var(--color-muted-foreground)]">
                    {pick(lang, 'Seuil de positivité du test', 'Test positivity threshold')}
                  </Label>
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">{threshold}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPreset('excellent')}>
                  <Star className="size-4 text-amber-500" />
                  {pick(lang, 'Test excellent', 'Excellent test')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('good')}>
                  <ThumbsUp className="size-4 text-emerald-500" />
                  {pick(lang, 'Test correct', 'Fair test')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('poor')}>
                  <LineChart className="size-4 text-red-500" />
                  {pick(lang, 'Test médiocre', 'Poor test')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('reset')}>
                  <Undo2 className="size-4 text-blue-500" />
                  {pick(lang, 'Réinitialiser', 'Reset')}
                </Button>
              </div>
            </CardContent>
          </Card>
    </div>
  )

  const contingencyTable = (
    <div className="overflow-x-auto">
      <div className="grid min-w-[360px] grid-cols-[auto_1fr_1fr] gap-2 text-center text-sm">
        <div />
        <div className="font-semibold text-[var(--color-foreground)]">{pick(lang, 'Malade (M+)', 'Diseased (D+)')}</div>
        <div className="font-semibold text-[var(--color-foreground)]">{pick(lang, 'Sain (M-)', 'Healthy (D-)')}</div>

        <div className="flex items-center justify-center font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Test Positif', 'Positive test')}
        </div>
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/15 p-4">
          <div className="text-xs text-[var(--color-muted-foreground)]">{pick(lang, 'VP', 'TP')}</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{vp}</div>
        </div>
        <div className="rounded-md border border-red-500/30 bg-red-500/15 p-4">
          <div className="text-xs text-[var(--color-muted-foreground)]">{pick(lang, 'FP', 'FP')}</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{fp}</div>
        </div>

        <div className="flex items-center justify-center font-semibold text-[var(--color-foreground)]">
          {pick(lang, 'Test Négatif', 'Negative test')}
        </div>
        <div className="rounded-md border border-red-500/30 bg-red-500/15 p-4">
          <div className="text-xs text-[var(--color-muted-foreground)]">{pick(lang, 'FN', 'FN')}</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{fn}</div>
        </div>
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/15 p-4">
          <div className="text-xs text-[var(--color-muted-foreground)]">{pick(lang, 'VN', 'TN')}</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{vn}</div>
        </div>
      </div>
    </div>
  )

  const metricsGrid = (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              title={pick(lang, 'Sensibilité (Se)', 'Sensitivity (Se)')}
              value={`${(se * 100).toFixed(1)}%`}
              detail={`${vp} / ${vp + fn}`}
              icon={SearchCheck}
              accent="blue"
            />
            <MetricCard
              title={pick(lang, 'Spécificité (Sp)', 'Specificity (Sp)')}
              value={`${(sp * 100).toFixed(1)}%`}
              detail={`${vn} / ${vn + fp}`}
              icon={ShieldCheck}
              accent="emerald"
            />
            <MetricCard
              title={pick(lang, 'RV+', 'LR+')}
              value={rvplusStr}
              detail="Se / (1 - Sp)"
              icon={PlusCircle}
              accent="amber"
            />
            <MetricCard
              title={pick(lang, 'RV-', 'LR-')}
              value={rvminus.toFixed(2)}
              detail="(1 - Se) / Sp"
              icon={MinusCircle}
              accent="red"
            />
            <MetricCard title={pick(lang, 'AUC (ROC)', 'AUC (ROC)')} value={roc.auc.toFixed(2)} icon={AreaChart} accent="blue" />
            <MetricCard
              title={pick(lang, 'Indice de Youden', 'Youden index')}
              value={youden.toFixed(2)}
              detail="Se + Sp - 1"
              icon={Scale}
              accent="amber"
            />
            <MetricCard
              title={pick(lang, 'VPP', 'PPV')}
              value={`${(vpp * 100).toFixed(1)}%`}
              detail={`${vp} / ${vp + fp}`}
              icon={CheckCircle}
              accent="emerald"
            />
            <MetricCard
              title={pick(lang, 'VPN', 'NPV')}
              value={`${(vpn * 100).toFixed(1)}%`}
              detail={`${vn} / ${vn + fn}`}
              icon={XCircle}
              accent="blue"
            />
          </div>
  )

  const calcIntrinsic = (
    <div className="flex flex-col gap-4">
              <CalcStep
                title={pick(lang, 'Sensibilité (Se)', 'Sensitivity (Se)')}
                intro={pick(
                  lang,
                  'La sensibilité mesure la capacité du test à détecter les malades.',
                  'Sensitivity measures the ability of the test to detect diseased patients.',
                )}
              >
                <MathJax dynamic>{`$$Se = P(T+ \\mid M+) = \\frac{P(T+ \\cap M+)}{P(M+)} = \\frac{VP}{VP + FN}$$`}</MathJax>
                <MathJax dynamic>{`$$\\begin{align} Se &= \\frac{${vp}}{${vp} + ${fn}} \\\\ &= \\frac{${vp}}{${vp + fn}} \\\\ &= ${se.toFixed(4)} = ${(se * 100).toFixed(1)}\\% \\end{align}$$`}</MathJax>
              </CalcStep>

              <CalcStep
                title={pick(lang, 'Spécificité (Sp)', 'Specificity (Sp)')}
                intro={pick(
                  lang,
                  'La spécificité mesure la capacité du test à identifier les sains.',
                  'Specificity measures the ability of the test to identify healthy patients.',
                )}
              >
                <MathJax dynamic>{`$$Sp = P(T- \\mid M-) = \\frac{P(T- \\cap M-)}{P(M-)} = \\frac{VN}{FP + VN}$$`}</MathJax>
                <MathJax dynamic>{`$$\\begin{align} Sp &= \\frac{${vn}}{${fp} + ${vn}} \\\\ &= \\frac{${vn}}{${fp + vn}} \\\\ &= ${sp.toFixed(4)} = ${(sp * 100).toFixed(1)}\\% \\end{align}$$`}</MathJax>
              </CalcStep>

              <CalcStep
                title={pick(lang, 'Rapport de vraisemblance positif (RV+)', 'Positive likelihood ratio (LR+)')}
                intro={pick(
                  lang,
                  'Le RV+ indique combien un test positif augmente la probabilité de maladie.',
                  'The LR+ indicates how much a positive test increases the probability of disease.',
                )}
              >
                <MathJax dynamic>{`$$RV+ = \\frac{P(T+ \\mid M+)}{P(T+ \\mid M-)} = \\frac{Se}{1 - Sp}$$`}</MathJax>
                <MathJax dynamic>{`$$\\begin{align} RV+ &= \\frac{${se.toFixed(4)}}{1 - ${sp.toFixed(4)}} \\\\ &= ${rvplusLatex} \\end{align}$$`}</MathJax>
              </CalcStep>

              <CalcStep
                title={pick(lang, 'Rapport de vraisemblance négatif (RV-)', 'Negative likelihood ratio (LR-)')}
                intro={pick(
                  lang,
                  'Le RV- indique combien un test négatif diminue la probabilité de maladie.',
                  'The LR- indicates how much a negative test decreases the probability of disease.',
                )}
              >
                <MathJax dynamic>{`$$RV- = \\frac{P(T- \\mid M+)}{P(T- \\mid M-)} = \\frac{1 - Se}{Sp}$$`}</MathJax>
                <MathJax dynamic>{`$$\\begin{align} RV- &= \\frac{1 - ${se.toFixed(4)}}{${sp.toFixed(4)}} \\\\ &= ${rvminus.toFixed(4)} \\end{align}$$`}</MathJax>
              </CalcStep>
    </div>
  )

  const calcGlobal = (
    <div className="flex flex-col gap-4">
              <CalcStep title={pick(lang, 'Aire sous la courbe (AUC)', 'Area under the curve (AUC)')}>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {pick(
                    lang,
                    "L'AUC est calculée en intégrant la courbe ROC (méthode du trapèze). Elle représente la probabilité qu'un individu malade ait un score supérieur à un individu sain.",
                    'The AUC is computed by integrating the ROC curve (trapezoidal method). It represents the probability that a diseased individual has a higher score than a healthy individual.',
                  )}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  {pick(
                    lang,
                    'La courbe ROC est générée en variant le seuil de décision (0-100) et en calculant Se et (1-Sp) pour chaque seuil.',
                    'The ROC curve is generated by varying the decision threshold (0-100) and computing Se and (1-Sp) for each threshold.',
                  )}
                </p>
                <MathJax dynamic>{`$$AUC = ${roc.auc.toFixed(4)}$$`}</MathJax>
              </CalcStep>

              <CalcStep
                title={pick(lang, 'Indice de Youden (J)', 'Youden index (J)')}
                intro={pick(
                  lang,
                  "L'indice de Youden combine sensibilité et spécificité. Valeur optimale : 1.",
                  'The Youden index combines sensitivity and specificity. Optimal value: 1.',
                )}
              >
                <MathJax dynamic>{`$$J = Se + Sp - 1 = ${se.toFixed(4)} + ${sp.toFixed(4)} - 1 = ${youden.toFixed(4)}$$`}</MathJax>
              </CalcStep>
    </div>
  )

  const calcPredictive = (
    <div className="flex flex-col gap-4">
              <CalcStep
                title={pick(lang, 'Valeur prédictive positive (VPP)', 'Positive predictive value (PPV)')}
                intro={pick(
                  lang,
                  "La VPP est la probabilité d'être malade sachant que le test est positif.",
                  'The PPV is the probability of being diseased given that the test is positive.',
                )}
              >
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {pick(lang, 'Méthode 1 — Directe :', 'Method 1 — Direct:')}
                </p>
                <MathJax dynamic>{`$$VPP = \\frac{VP}{VP + FP} = \\frac{${vp}}{${vp + fp}} = ${vpp.toFixed(4)} = ${(vpp * 100).toFixed(1)}\\%$$`}</MathJax>
                <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                  {pick(lang, 'Méthode 2 — Théorème de Bayes :', "Method 2 — Bayes' theorem:")}
                </p>
                <MathJax dynamic>{`$$Prev = \\frac{VP + FN}{Total} = \\frac{${vp + fn}}{${total}} = ${prevFrac.toFixed(4)}$$`}</MathJax>
                <MathJax dynamic>{`$$P(T+) = Se \\times Prev + (1 - Sp) \\times (1 - Prev)$$`}</MathJax>
                <MathJax dynamic>{`$$VPP = \\frac{Se \\times Prev}{P(T+)}$$`}</MathJax>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  {pick(
                    lang,
                    'La VPP dépend de la prévalence de la maladie. Si la prévalence diminue, la VPP diminue également, même si Se et Sp restent constants.',
                    'The PPV depends on the prevalence of the disease. If the prevalence decreases, the PPV also decreases, even if Se and Sp stay constant.',
                  )}
                </p>
              </CalcStep>

              <CalcStep
                title={pick(lang, 'Valeur prédictive négative (VPN)', 'Negative predictive value (NPV)')}
                intro={pick(
                  lang,
                  "La VPN est la probabilité d'être sain sachant que le test est négatif.",
                  'The NPV is the probability of being healthy given that the test is negative.',
                )}
              >
                <MathJax dynamic>{`$$VPN = \\frac{VN}{VN + FN} = \\frac{${vn}}{${vn + fn}} = ${vpn.toFixed(4)} = ${(vpn * 100).toFixed(1)}\\%$$`}</MathJax>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  {pick(
                    lang,
                    'La VPN dépend également de la prévalence. Si la prévalence augmente, la VPN diminue, même si Se et Sp restent constants.',
                    'The NPV also depends on prevalence. If the prevalence increases, the NPV decreases, even if Se and Sp stay constant.',
                  )}
                </p>
              </CalcStep>
    </div>
  )

  const figureTabLabels = {
    histogram: pick(lang, 'Distribution', 'Distribution'),
    table: pick(lang, 'Tableau de contingence', 'Contingency table'),
    metrics: pick(lang, 'Indicateurs', 'Indicators'),
    roc: pick(lang, 'Courbe ROC', 'ROC curve'),
  }

  const calcTabLabels = {
    intrinsic: pick(lang, 'Caractéristiques intrinsèques', 'Intrinsic characteristics'),
    global: pick(lang, 'Performance globale', 'Overall performance'),
    predictive: pick(lang, 'Valeurs prédictives', 'Predictive values'),
  }

  // ---------- Render ----------
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="simulation" className="min-w-0">
          <TabsList className="mx-auto">
            <TabsTrigger value="simulation">{pick(lang, 'Simulation', 'Simulation')}</TabsTrigger>
            <TabsTrigger value="calculs">{pick(lang, 'Calculs détaillés', 'Detailed calculations')}</TabsTrigger>
          </TabsList>

          {/* Simulation: parameters sidebar + one card holding the figure tabs */}
          <TabsContent value="simulation" className="mt-4">
            <div className="grid items-stretch gap-6 lg:min-h-[600px] lg:grid-cols-[280px_1fr]">
              {parametersPanel}

              <Card className="flex min-w-0 flex-col pt-3">
                <CardContent className="flex min-w-0 flex-1 flex-col gap-4">
                  <Tabs defaultValue="histogram" className="flex min-h-0 min-w-0 flex-1 flex-col">
                    {/*
                      `text-center` sur le conteneur, et non `mx-auto` sur la
                      liste : TabsList est `inline-flex w-fit`, donc les marges
                      auto ne peuvent pas la centrer. Centrer le contenu en
                      ligne fonctionne aussi quand la liste deborde et defile.
                    */}
                    <div className="max-w-full overflow-x-auto text-center">
                      <TabsList>
                        <TabsTrigger value="histogram">{figureTabLabels.histogram}</TabsTrigger>
                        <TabsTrigger value="table">{figureTabLabels.table}</TabsTrigger>
                        <TabsTrigger value="metrics">{figureTabLabels.metrics}</TabsTrigger>
                        <TabsTrigger value="roc">{figureTabLabels.roc}</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent
                      value="histogram"
                      className="mt-4 flex min-h-0 flex-1 items-center justify-center"
                    >
                      <PlotlyChart
                        data={histoData}
                        layout={histoLayout}
                        config={plotConfig}
                        className="w-full"
                        style={{ height: '100%', minHeight: 400 }}
                      />
                    </TabsContent>

                    <TabsContent
                      value="table"
                      className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-3"
                    >
                      <h3 className="text-center text-base font-semibold text-[var(--color-foreground)]">
                        {pick(lang, 'Tableau de contingence', 'Contingency table')}
                      </h3>
                      {contingencyTable}
                    </TabsContent>

                    <TabsContent
                      value="metrics"
                      className="mt-4 flex min-h-0 flex-1 flex-col justify-center"
                    >
                      {metricsGrid}
                    </TabsContent>

                    <TabsContent
                      value="roc"
                      className="mt-4 flex min-h-0 flex-1 items-center justify-center"
                    >
                      <PlotlyChart
                        data={rocData}
                        layout={rocLayout}
                        config={plotConfig}
                        className="w-full"
                        style={{ height: '100%', minHeight: 400 }}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Calculations: no sidebar, one card holding the grouped sub-tabs */}
          <TabsContent value="calculs" className="mt-4">
            <Card className="min-w-0 pt-3">
              <CardContent className="flex min-w-0 flex-col gap-4">
                <Tabs defaultValue="global" className="min-w-0">
                  <div className="max-w-full overflow-x-auto text-center">
                    <TabsList>
                      <TabsTrigger value="global">{calcTabLabels.global}</TabsTrigger>
                      <TabsTrigger value="intrinsic">{calcTabLabels.intrinsic}</TabsTrigger>
                      <TabsTrigger value="predictive">{calcTabLabels.predictive}</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="global" className="mt-4">
                    {calcGlobal}
                  </TabsContent>

                  <TabsContent value="intrinsic" className="mt-4 flex flex-col gap-4">
                    <InfoBox>
                      {pick(
                        lang,
                        'Sensibilité, spécificité et rapports de vraisemblance sont des caractéristiques intrinsèques du test : elles ne dépendent pas de la prévalence.',
                        'Sensitivity, specificity and likelihood ratios are intrinsic characteristics of the test: they do not depend on prevalence.',
                      )}
                    </InfoBox>
                    {calcIntrinsic}
                  </TabsContent>

                  <TabsContent value="predictive" className="mt-4 flex flex-col gap-4">
                    <InfoBox>
                      {pick(
                        lang,
                        'Les valeurs prédictives (VPP, VPN) dépendent de la prévalence de la maladie dans la population testée.',
                        'Predictive values (PPV, NPV) depend on the prevalence of the disease in the tested population.',
                      )}
                    </InfoBox>
                    {calcPredictive}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

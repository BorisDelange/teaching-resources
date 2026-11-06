import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useRememberStep } from '@/lib/last-step'
import type { Data, Layout, Config } from 'plotly.js-dist-min'
import {
  Info,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowDown,
  ClipboardList,
  MessagesSquare,
  FlaskConical,
  Globe,
  FileText,
  Scissors,
  Brain,
  AlertTriangle,
  Wrench,
  User,
  Database,
  Layers,
  MessageSquare,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PlotlyChart } from '@/components/PlotlyChart'
import { useLang, pick, type Lang } from '@/lib/useLang'

// ============================================================
// Shared helpers
// ============================================================

function StepHeader({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
}

function InfoBox({
  children,
  tone = 'blue',
  icon,
}: {
  children: React.ReactNode
  tone?: 'blue' | 'emerald' | 'amber' | 'red'
  icon?: React.ReactNode
}) {
  const tones: Record<string, string> = {
    blue: 'border-blue-500/30 border-l-blue-500 bg-blue-500/10',
    emerald: 'border-emerald-500/30 border-l-emerald-500 bg-emerald-500/10',
    amber: 'border-amber-500/30 border-l-amber-500 bg-amber-500/10',
    red: 'border-red-500/30 border-l-red-500 bg-red-500/10',
  }
  const iconColors: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  }
  return (
    <div
      className={`flex items-start gap-3 rounded-md border border-l-4 p-4 text-sm text-[var(--color-foreground)] ${tones[tone]}`}
    >
      <span className={`mt-0.5 shrink-0 ${iconColors[tone]}`}>
        {icon ?? <Info className="size-4" />}
      </span>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

type Accent = 'blue' | 'emerald' | 'amber' | 'red'

const badgeAccent: Record<Accent, string> = {
  blue: 'bg-blue-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-500 text-white',
}

const iconAccent: Record<Accent, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
}

// ============================================================
// STEP 0 — Introduction
// ============================================================

function StepIntro({ goToStep, lang }: { goToStep: (s: number) => void; lang: Lang }) {
  const cards: {
    accent: Accent
    num: string
    step: number
    title: string
    desc: string
  }[] = [
    {
      accent: 'blue',
      num: '1',
      step: 1,
      title: pick(lang, "Constitution du corpus d'entraînement", 'Building the training corpus'),
      desc: pick(
        lang,
        'Les documents textuels qui serviront à entraîner le modèle sont sélectionnés.',
        'The text documents used to train the model are selected.',
      ),
    },
    {
      accent: 'emerald',
      num: '2',
      step: 2,
      title: pick(lang, 'Tokenization et embedding', 'Tokenization and embedding'),
      desc: pick(
        lang,
        'Le texte est découpé en tokens puis transformé en vecteurs numériques.',
        'Text is split into tokens and then turned into numerical vectors.',
      ),
    },
    {
      accent: 'amber',
      num: '3',
      step: 4,
      title: pick(lang, 'Apprentissage automatique', 'Machine learning'),
      desc: pick(
        lang,
        'Le modèle apprend à prédire le mot suivant dans une phrase.',
        'The model learns to predict the next word in a sentence.',
      ),
    },
    {
      accent: 'red',
      num: '4',
      step: 5,
      title: pick(lang, 'Inférence et utilisation', 'Inference and use'),
      desc: pick(
        lang,
        'Utilisation par les utilisateurs : hallucinations, outils et RAG.',
        'Use by end users: hallucinations, tools and RAG.',
      ),
    },
  ]
  return (
    <div className="space-y-6">
      <StepHeader>
        {pick(
          lang,
          'Comment fonctionne un grand modèle de langage ?',
          'How does a large language model work?',
        )}
      </StepHeader>
      <p className="text-[var(--color-muted-foreground)]">
        {lang === 'en' ? (
          <>
            Large language models (LLMs) are artificial intelligences able to understand and
            generate text. To understand how they work, we will explore the{' '}
            <strong className="text-[var(--color-foreground)]">4 fundamental steps</strong> of their
            creation and use.
          </>
        ) : (
          <>
            Les grands modèles de langage (Large Language Models ou LLM) sont des intelligences
            artificielles capables de comprendre et générer du texte. Pour comprendre leur
            fonctionnement, nous allons explorer les{' '}
            <strong className="text-[var(--color-foreground)]">4 étapes fondamentales</strong> de
            leur création et utilisation.
          </>
        )}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card
            key={c.num}
            onClick={() => goToStep(c.step)}
            className="cursor-pointer transition-shadow hover:shadow-md"
          >
            <CardContent className="flex items-start gap-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${badgeAccent[c.accent]}`}
              >
                {c.num}
              </span>
              <div className="space-y-1">
                <div className="font-semibold">{c.title}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">{c.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// STEP 1 — Corpus d'entraînement
// ============================================================

function StepCorpus({ lang }: { lang: Lang }) {
  const cards: { icon: React.ReactNode; title: string; desc: string }[] = [
    {
      icon: <ClipboardList className="size-6" />,
      title: pick(lang, 'Recommandations médicales', 'Medical guidelines'),
      desc: pick(
        lang,
        'Documents officiels, vocabulaire médical précis, recommandations de bonnes pratiques',
        'Official documents, precise medical vocabulary, good-practice guidelines',
      ),
    },
    {
      icon: <MessagesSquare className="size-6" />,
      title: pick(lang, 'Forum de patients', 'Patient forum'),
      desc: pick(
        lang,
        'Échanges entre patients, langage courant, description des symptômes',
        'Conversations between patients, everyday language, descriptions of symptoms',
      ),
    },
    {
      icon: <FlaskConical className="size-6" />,
      title: pick(lang, 'Publications scientifiques', 'Scientific publications'),
      desc: pick(
        lang,
        'Articles de recherche, essais cliniques, méthodologie rigoureuse',
        'Research articles, clinical trials, rigorous methodology',
      ),
    },
    {
      icon: <Globe className="size-6" />,
      title: pick(lang, 'Contenu web général', 'General web content'),
      desc: pick(
        lang,
        'Articles grand public, encyclopédies en ligne, contenu généraliste varié',
        'Mainstream articles, online encyclopedias, varied general-purpose content',
      ),
    },
  ]
  return (
    <div className="space-y-6">
      <StepHeader>
        {pick(lang, "Constitution du corpus d'entraînement", 'Building the training corpus')}
      </StepHeader>
      <p className="text-[var(--color-muted-foreground)]">
        {lang === 'en' ? (
          <>
            A <strong className="text-[var(--color-foreground)]">training corpus</strong> is the set
            of text documents used to “teach” the model to predict the next word in a sentence. The{' '}
            <strong className="text-[var(--color-foreground)]">choice of corpus directly
            influences</strong>{' '}
            the model's <strong className="text-[var(--color-foreground)]">capabilities</strong> and
            its <strong className="text-[var(--color-foreground)]">domain of expertise</strong>.
          </>
        ) : (
          <>
            Un <strong className="text-[var(--color-foreground)]">corpus d'entraînement</strong> est
            l'ensemble des documents textuels utilisés pour « apprendre » au modèle à prédire le
            prochain mot d'une phrase. Le{' '}
            <strong className="text-[var(--color-foreground)]">choix du corpus influence</strong>{' '}
            directement les <strong className="text-[var(--color-foreground)]">capacités</strong> et
            le <strong className="text-[var(--color-foreground)]">domaine d'expertise</strong> du
            modèle.
          </>
        )}
      </p>
      <InfoBox>
        <p>
          {pick(
            lang,
            'Un modèle entraîné sur beaucoup de textes médicaux sera plus à même de bien répondre à des questions portant sur le domaine médical.',
            'A model trained on a lot of medical text will be better at answering questions in the medical domain.',
          )}
        </p>
      </InfoBox>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="flex items-start gap-4">
              <span className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400">{c.icon}</span>
              <div className="space-y-1">
                <div className="font-semibold">{c.title}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">{c.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// STEP 2 — Tokenization
// ============================================================

const TOKENS = [
  'Le',
  'patient',
  'présente',
  'une',
  'tachy',
  'card',
  'ie',
  'ventri',
  'culaire',
  '.',
]
const MEDICAL_SUBTOKENS = new Set(['tachy', 'card', 'ie', 'ventri', 'culaire'])

function StepTokenization({ lang }: { lang: Lang }) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    let n = 0
    const id = window.setInterval(() => {
      n += 1
      setVisibleCount(n)
      if (n >= TOKENS.length) window.clearInterval(id)
    }, 150)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="space-y-6">
      <StepHeader>{pick(lang, 'Tokenization : découpage du texte', 'Tokenization: splitting the text')}</StepHeader>
      <p className="text-[var(--color-muted-foreground)]">
        {lang === 'en' ? (
          <>
            Computers cannot work directly with text.
            <br />
            <strong className="text-[var(--color-foreground)]">Tokenization</strong> consists in{' '}
            <strong className="text-[var(--color-foreground)]">splitting</strong> the text into{' '}
            <strong className="text-[var(--color-foreground)]">small units</strong> (called
            “tokens”) that can then be turned into{' '}
            <strong className="text-[var(--color-foreground)]">numbers</strong>.
          </>
        ) : (
          <>
            Les ordinateurs ne peuvent pas travailler directement avec du texte.
            <br />
            La <strong className="text-[var(--color-foreground)]">tokenization</strong> consiste à{' '}
            <strong className="text-[var(--color-foreground)]">découper</strong> le texte en{' '}
            <strong className="text-[var(--color-foreground)]">petites unités</strong> (appelées
            « tokens ») qui pourront être transformées en{' '}
            <strong className="text-[var(--color-foreground)]">nombres</strong>.
          </>
        )}
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-muted-foreground)]">
          <FileText className="size-4" />
          {pick(lang, 'Texte original', 'Original text')}
        </div>
        <div className="rounded-md border bg-[var(--color-card)] p-4 font-mono text-sm">
          Le patient présente une tachycardie ventriculaire.
        </div>
        <div className="flex justify-center text-[var(--color-muted-foreground)]">
          <ArrowDown className="size-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
          <Scissors className="size-4" />
          {pick(lang, 'Tokens générés', 'Generated tokens')}
        </div>
        <div className="flex flex-wrap gap-2">
          {TOKENS.map((tok, i) => {
            const visible = i < visibleCount
            const medical = MEDICAL_SUBTOKENS.has(tok)
            const color = medical
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
              : 'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300'
            return (
              <span
                key={i}
                className={`rounded-md border px-3 py-1.5 font-mono text-sm transition-all duration-200 ${color} ${
                  visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                }`}
              >
                {tok}
              </span>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--color-muted-foreground)]">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm border border-blue-500/40 bg-blue-500/15" />
            {pick(lang, 'Mot courant (un seul token)', 'Common word (single token)')}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm border border-amber-500/40 bg-amber-500/15" />
            {pick(lang, 'Sous-unité d’un mot médical', 'Sub-unit of a medical word')}
          </span>
        </div>
      </div>

      <div className="rounded-md border bg-[var(--color-card)] p-5">
        <h3 className="mb-3 font-semibold text-emerald-600 dark:text-emerald-400">
          {pick(lang, 'Comment le modèle découpe le texte', 'How the model splits the text')}
        </h3>
        {lang === 'en' ? (
          <ul className="list-inside list-disc space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <li>Common words are single tokens: “Le”, “patient”, “une”</li>
            <li>
              Complex medical words are split into sub-units: “tachy” + “card” + “ie”, “ventri” +
              “culaire”
            </li>
            <li>Punctuation is separated: “.”</li>
            <li>
              This decomposition lets the model{' '}
              <strong className="text-[var(--color-foreground)]">understand medical roots</strong>{' '}
              and{' '}
              <strong className="text-[var(--color-foreground)]">make links between concepts</strong>
            </li>
          </ul>
        ) : (
          <ul className="list-inside list-disc space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <li>Les mots courants sont des tokens uniques : « Le », « patient », « une »</li>
            <li>
              Les mots médicaux complexes sont découpés en sous-unités : « tachy » + « card » +
              « ie », « ventri » + « culaire »
            </li>
            <li>La ponctuation est séparée : « . »</li>
            <li>
              Cette décomposition permet au modèle de{' '}
              <strong className="text-[var(--color-foreground)]">comprendre les racines médicales</strong>{' '}
              et de{' '}
              <strong className="text-[var(--color-foreground)]">faire des liens entre concepts</strong>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}

// ============================================================
// STEP 3 — Embedding
// ============================================================

type WordPoint = { word: { fr: string; en: string }; x: number; y: number; z: number; color: string }

const EMBEDDING_POINTS: WordPoint[] = [
  { word: { fr: 'hypertension', en: 'hypertension' }, x: 2, y: 3, z: 2, color: '#ef4444' },
  { word: { fr: 'tachycardie', en: 'tachycardia' }, x: 2.5, y: 3.5, z: 2.3, color: '#ef4444' },
  { word: { fr: 'diabète', en: 'diabetes' }, x: 1.6, y: 2.6, z: 2.4, color: '#ef4444' },
  { word: { fr: 'patient', en: 'patient' }, x: 1.2, y: 1.8, z: 1.2, color: '#10b981' },
  { word: { fr: 'médecin', en: 'doctor' }, x: 0.8, y: 1.4, z: 0.7, color: '#10b981' },
  { word: { fr: 'pomme', en: 'apple' }, x: -3, y: -2, z: 3, color: '#64748b' },
  { word: { fr: 'poire', en: 'pear' }, x: -2.5, y: -1.7, z: 3.4, color: '#64748b' },
  { word: { fr: 'voiture', en: 'car' }, x: -1, y: 3.5, z: -2.5, color: '#64748b' },
]

function StepEmbedding({ lang }: { lang: Lang }) {
  const data: Data[] = useMemo(
    () => [
      {
        type: 'scatter3d',
        mode: 'text+markers',
        x: EMBEDDING_POINTS.map((p) => p.x),
        y: EMBEDDING_POINTS.map((p) => p.y),
        z: EMBEDDING_POINTS.map((p) => p.z),
        text: EMBEDDING_POINTS.map((p) => p.word[lang]),
        textposition: 'top center',
        marker: {
          size: 12,
          color: EMBEDDING_POINTS.map((p) => p.color),
          line: { color: 'white', width: 2 },
        },
        hoverinfo: 'text',
      } as Data,
    ],
    [lang],
  )

  const layout: Partial<Layout> = useMemo(
    () => ({
      title: { text: pick(lang, 'Espace vectoriel des mots', 'Word vector space') },
      scene: {
        xaxis: { title: { text: pick(lang, 'Dimension 1', 'Dimension 1') } },
        yaxis: { title: { text: pick(lang, 'Dimension 2', 'Dimension 2') } },
        zaxis: { title: { text: pick(lang, 'Dimension 3', 'Dimension 3') } },
        aspectmode: 'cube',
      },
      height: 500,
      margin: { l: 0, r: 0, b: 0, t: 40 },
      paper_bgcolor: 'rgba(0,0,0,0)',
    }),
    [lang],
  )

  const config: Partial<Config> = useMemo(
    () => ({
      displaylogo: false,
      // A 3D scene only supports a handful of buttons; listing them explicitly
      // keeps the modebar as one clean, aligned row instead of leftover 2D icons.
      modeBarButtons: [['zoom3d', 'pan3d', 'orbitRotation', 'resetCameraDefault3d']],
      responsive: true,
    }),
    [],
  )

  return (
    <div className="space-y-6">
      <StepHeader>
        {pick(
          lang,
          "Embedding : représentation des mots dans l'espace",
          'Embedding: representing words in space',
        )}
      </StepHeader>
      <p className="text-[var(--color-muted-foreground)]">
        {lang === 'en' ? (
          <>
            Each token is then{' '}
            <strong className="text-[var(--color-foreground)]">turned into a vector</strong> of
            numbers (<strong className="text-[var(--color-foreground)]">embedding</strong>).
            <br />
            <strong className="text-[var(--color-foreground)]">Similar words</strong> end up{' '}
            <strong className="text-[var(--color-foreground)]">close together</strong> in this
            vector space.
          </>
        ) : (
          <>
            Chaque token est ensuite{' '}
            <strong className="text-[var(--color-foreground)]">transformé en un vecteur</strong> de
            nombres (<strong className="text-[var(--color-foreground)]">embedding</strong>).
            <br />
            Les <strong className="text-[var(--color-foreground)]">mots similaires</strong> se
            retrouvent <strong className="text-[var(--color-foreground)]">proches</strong> dans cet
            espace vectoriel.
          </>
        )}
      </p>

      <InfoBox>
        <p>
          {lang === 'en' ? (
            <>
              <strong>Simplified 3D visualization:</strong> in reality, models use hundreds or
              thousands of dimensions, but here is a 3D representation to grasp the concept.
            </>
          ) : (
            <>
              <strong>Visualisation simplifiée en 3D :</strong> En réalité, les modèles utilisent
              des centaines ou milliers de dimensions, mais voici une représentation en 3D pour
              comprendre le concept.
            </>
          )}
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <PlotlyChart data={data} layout={layout} config={config} className="w-full" />

        <div className="flex flex-col gap-6">
          <div className="flex-1 rounded-md border bg-[var(--color-card)] p-5">
            <h3 className="mb-2 font-semibold text-emerald-600 dark:text-emerald-400">
              {pick(lang, "Les mots proches dans l'espace", 'Words that are close in space')}
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {lang === 'en' ? (
                <>
                  Words in the{' '}
                  <strong className="text-[var(--color-foreground)]">same semantic category</strong>{' '}
                  are grouped together in space: the conditions (hypertension, tachycardia,
                  diabetes) are close to one another, the medical actors (patient, doctor) form
                  another group, the fruits (apple, pear) are together, while the car sits apart in
                  a different area. This is how the model “
                  <strong className="text-[var(--color-foreground)]">understands</strong>”{' '}
                  <strong className="text-[var(--color-foreground)]">semantic relationships</strong>.
                </>
              ) : (
                <>
                  Les mots de{' '}
                  <strong className="text-[var(--color-foreground)]">même catégorie sémantique</strong>{' '}
                  sont regroupés dans l'espace : les pathologies (hypertension, tachycardie,
                  diabète) sont proches entre elles, les acteurs médicaux (patient, médecin) forment
                  un autre groupe, les fruits (pomme, poire) sont ensemble, tandis que la voiture est
                  isolée dans une zone différente. C'est ainsi que le modèle «{' '}
                  <strong className="text-[var(--color-foreground)]">comprend</strong> » les{' '}
                  <strong className="text-[var(--color-foreground)]">relations sémantiques</strong>.
                </>
              )}
            </p>
          </div>

          <div className="flex-1 rounded-md border bg-[var(--color-card)] p-5">
            <h3 className="mb-2 font-semibold text-emerald-600 dark:text-emerald-400">
              {pick(lang, 'Les vecteurs permettent des opérations', 'Vectors allow operations')}
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                'Les embeddings permettent des calculs. Par exemple, en additionnant les coordonnées vectorielles :',
                'Embeddings allow computations. For example, by adding vector coordinates:',
              )}
            </p>
            <div className="mt-3 flex justify-center">
              <div className="rounded-md border bg-[var(--color-muted)] px-6 py-3 text-center font-mono text-sm">
                {pick(lang, 'Roi', 'King')} - {pick(lang, 'Homme', 'Man')} +{' '}
                {pick(lang, 'Femme', 'Woman')} ≈{' '}
                <strong className="text-[var(--color-foreground)]">
                  {pick(lang, 'Reine', 'Queen')}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 4 — Apprentissage : prediction simulator
// ============================================================

const WORDS_BY_LANG: Record<Lang, string[]> = {
  fr: ['Le', 'patient', 'présente', 'une', 'hypertension', 'artérielle', 'sévère'],
  en: ['The', 'patient', 'has', 'severe', 'arterial', 'high', 'blood-pressure'],
}

const WORD_CANDIDATES_BY_LANG: Record<Lang, Record<number, string[]>> = {
  fr: {
    0: ['patient', 'médecin', 'diagnostic', 'traitement'],
    1: ['présente', 'souffre', 'développe', 'montre'],
    2: ['une', 'des', 'un', 'plusieurs'],
    3: ['hypertension', 'tachycardie', 'bradycardie', 'arythmie'],
    4: ['artérielle', 'ventriculaire', 'auriculaire', 'chronique'],
    5: ['sévère', 'modérée', 'légère', 'aiguë'],
  },
  en: {
    0: ['patient', 'doctor', 'diagnosis', 'treatment'],
    1: ['has', 'suffers', 'develops', 'shows'],
    2: ['severe', 'moderate', 'mild', 'chronic'],
    3: ['arterial', 'ventricular', 'atrial', 'acute'],
    4: ['high', 'low', 'normal', 'variable'],
    5: ['blood-pressure', 'heart-rate', 'temperature', 'saturation'],
  },
}

type Prob = { word: string; prob: number; isCorrect: boolean }
type LastPrediction = { predicted: string; actual: string; isCorrect: boolean }
type StatusKind = 'initial' | 'correct' | 'incorrect' | 'next' | 'final'

interface SimState {
  currentPosition: number
  iteration: number
  showingPrediction: boolean
  lastPrediction: LastPrediction | null
  predictedWord: string | null
  probabilities: Prob[]
  previousProbabilities: Prob[] | null
  status: StatusKind
  hadCorrect: boolean
  hadIncorrect: boolean
  showFirstCorrect: boolean
  showFirstIncorrect: boolean
  finished: boolean
}

function normalize(probs: Prob[]): Prob[] {
  const sum = probs.reduce((s, p) => s + p.prob, 0)
  if (sum === 0) return probs
  return probs.map((p) => ({ ...p, prob: (p.prob / 100 / (sum / 100)) * 100 }))
}

function computeProbabilities(currentPosition: number, iteration: number, lang: Lang): Prob[] {
  if (currentPosition >= 6) return []
  const correctWord = WORDS_BY_LANG[lang][currentPosition + 1]
  const candidates = WORD_CANDIDATES_BY_LANG[lang][currentPosition]
  const baseAccuracy = Math.min(95, (iteration / 7) * 100)
  const correctProb = baseAccuracy
  const remaining = 100 - correctProb
  const others = candidates.filter((c) => c !== correctWord)
  const weights = others.map(() => Math.random())
  const wSum = weights.reduce((s, w) => s + w, 0) || 1
  let probs: Prob[] = candidates.map((word) => {
    if (word === correctWord) return { word, prob: correctProb, isCorrect: true }
    const idx = others.indexOf(word)
    return { word, prob: (weights[idx] / wSum) * remaining, isCorrect: false }
  })
  probs = normalize(probs).sort((a, b) => b.prob - a.prob)
  return probs
}

const initialSimState: SimState = {
  currentPosition: 0,
  iteration: 0,
  showingPrediction: false,
  lastPrediction: null,
  predictedWord: null,
  probabilities: [],
  previousProbabilities: null,
  status: 'initial',
  hadCorrect: false,
  hadIncorrect: false,
  showFirstCorrect: false,
  showFirstIncorrect: false,
  finished: false,
}

function makeInitialState(lang: Lang): SimState {
  const probabilities = computeProbabilities(0, 0, lang)
  return {
    ...initialSimState,
    probabilities,
    predictedWord: probabilities[0]?.word ?? null,
  }
}

type SimAction = { type: 'reset'; lang: Lang } | { type: 'next'; lang: Lang }

function simReducer(state: SimState, action: SimAction): SimState {
  const lang = action.lang
  if (action.type === 'reset') return makeInitialState(lang)

  // action.type === 'next'
  if (!state.showingPrediction) {
    // Phase 1
    if (state.currentPosition >= 6) return makeInitialState(lang)
    const iteration = state.iteration + 1
    const currentWord = WORDS_BY_LANG[lang][state.currentPosition + 1]
    const predicted = state.predictedWord ?? ''
    const isCorrect = predicted === currentWord
    const lastPrediction: LastPrediction = { predicted, actual: currentWord, isCorrect }

    // Simulate backprop on previous probabilities
    const prev = state.probabilities
    let updated: Prob[] = prev.map((item) => {
      let newProb = item.prob
      if (item.word === currentWord) {
        newProb = Math.min(95, item.prob + (15 + Math.random() * 10))
      } else if (item.word === predicted && !isCorrect) {
        newProb = Math.max(1, item.prob - (10 + Math.random() * 5))
      } else {
        const decrease = item.prob * (0.1 + (item.prob / 100) * 0.15)
        newProb = Math.max(1, item.prob - decrease)
      }
      return { ...item, prob: newProb, isCorrect: item.word === currentWord }
    })
    updated = normalize(updated).sort((a, b) => b.prob - a.prob)

    const firstCorrect = isCorrect && !state.hadCorrect
    const firstIncorrect = !isCorrect && !state.hadIncorrect

    return {
      ...state,
      iteration,
      showingPrediction: true,
      lastPrediction,
      previousProbabilities: prev,
      probabilities: updated,
      status: isCorrect ? 'correct' : 'incorrect',
      hadCorrect: state.hadCorrect || isCorrect,
      hadIncorrect: state.hadIncorrect || !isCorrect,
      showFirstCorrect: firstCorrect,
      showFirstIncorrect: firstIncorrect,
    }
  }

  // Phase 2
  const currentPosition = state.currentPosition + 1
  if (currentPosition < 6) {
    const probabilities = computeProbabilities(currentPosition, state.iteration, lang)
    return {
      ...state,
      currentPosition,
      showingPrediction: false,
      status: 'next',
      probabilities,
      previousProbabilities: null,
      predictedWord: probabilities[0]?.word ?? null,
      lastPrediction: null,
    }
  }
  return {
    ...state,
    currentPosition,
    showingPrediction: false,
    status: 'final',
    finished: true,
    probabilities: [],
    previousProbabilities: null,
    predictedWord: null,
    lastPrediction: null,
  }
}

// --- Neural network SVG ---

function pseudoRandom(i: number, h: number, iteration: number): number {
  // deterministic per-render pseudo-random in [0,1)
  const x = Math.sin((i + 1) * 12.9898 + (h + 1) * 78.233 + (iteration + 1) * 43.758) * 43758.5453
  return x - Math.floor(x)
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars && current) {
      lines.push(current)
      current = w
    } else {
      current = (current + ' ' + w).trim()
    }
  }
  if (current) lines.push(current)
  return lines
}

function NeuralNetwork({
  probabilities,
  previousProbabilities,
  lastPrediction,
  showingPrediction,
  iteration,
  inputText,
  lang,
}: {
  probabilities: Prob[]
  previousProbabilities: Prob[] | null
  lastPrediction: LastPrediction | null
  showingPrediction: boolean
  iteration: number
  inputText: string
  lang: Lang
}) {
  const H = 320
  const inputX = 60
  const hiddenX = 320
  const outputX = 680
  const inputY = H / 2
  const hiddenCount = 6
  const hiddenSpacing = 42
  const hiddenStart = (H - (hiddenCount - 1) * hiddenSpacing) / 2
  const hiddenYs = Array.from({ length: hiddenCount }, (_, h) => hiddenStart + h * hiddenSpacing)
  const n = probabilities.length
  const outputSpacing = 44
  const outputYStart = (H - (n - 1) * outputSpacing) / 2
  const outputYs = probabilities.map((_, i) => outputYStart + i * outputSpacing)

  const inputLines = wrapText(inputText, 20)

  return (
    <svg width="100%" height={H} viewBox={`0 0 800 ${H}`} className="max-w-full">
      {/* Layer labels */}
      <text x={inputX} y={30} textAnchor="middle" className="fill-slate-500" fontSize="13" fontWeight="bold">
        {pick(lang, 'Entrée', 'Input')}
      </text>
      <text x={hiddenX} y={30} textAnchor="middle" className="fill-slate-500" fontSize="13" fontWeight="bold">
        {pick(lang, 'Couche cachée', 'Hidden layer')}
      </text>
      <text x={outputX} y={30} textAnchor="middle" className="fill-slate-500" fontSize="13" fontWeight="bold">
        {pick(lang, 'Prédiction', 'Prediction')}
      </text>

      {/* Input -> Hidden connections */}
      {hiddenYs.map((hy, h) => {
        const r = pseudoRandom(0, h, iteration)
        const width = 1 + r * 4
        const opacity = 0.15 + r * 0.4
        return (
          <line
            key={`ih-${h}`}
            x1={inputX + 25}
            y1={inputY}
            x2={hiddenX - 20}
            y2={hy}
            stroke="#64748b"
            strokeWidth={width}
            strokeOpacity={opacity}
          />
        )
      })}

      {/* Hidden -> Output connections */}
      {outputYs.map((oy, i) =>
        hiddenYs.map((hy, h) => {
          const prob = probabilities[i].prob
          const r = pseudoRandom(i + 1, h, iteration)
          const width = 1 + (prob / 100) * 5 * (0.5 + r * 0.5)
          const opacity = 0.1 + (prob / 100) * 0.6
          return (
            <line
              key={`ho-${i}-${h}`}
              x1={hiddenX + 20}
              y1={hy}
              x2={outputX - 20}
              y2={oy}
              stroke="#2563eb"
              strokeWidth={width}
              strokeOpacity={opacity}
            />
          )
        }),
      )}

      {/* Input node */}
      <circle cx={inputX} cy={inputY} r={25} fill="#10b981" stroke="white" strokeWidth={2} />
      {inputLines.map((line, li) => (
        <text
          key={`in-${li}`}
          x={inputX}
          y={inputY + 45 + li * 14}
          textAnchor="middle"
          className="fill-[var(--color-foreground)]"
          fontSize="11"
          fontWeight="bold"
        >
          {line}
        </text>
      ))}

      {/* Hidden nodes */}
      {hiddenYs.map((hy, h) => (
        <circle key={`hn-${h}`} cx={hiddenX} cy={hy} r={15} fill="#64748b" stroke="white" strokeWidth={2} />
      ))}

      {/* Output nodes */}
      {probabilities.map((p, i) => {
        const oy = outputYs[i]
        let fill = `rgba(37, 99, 235, ${0.2 + (p.prob / 100) * 0.8})`
        if (showingPrediction && lastPrediction) {
          if (p.word === lastPrediction.actual) fill = '#10b981'
          else if (p.word === lastPrediction.predicted && !lastPrediction.isCorrect) fill = '#ef4444'
        }
        const prev = previousProbabilities?.find((pp) => pp.word === p.word)
        const change = prev ? p.prob - prev.prob : 0
        const showDelta = Math.abs(change) > 0.1 && iteration > 0
        return (
          <g key={`on-${i}`}>
            <circle cx={outputX} cy={oy} r={20} fill={fill} stroke="white" strokeWidth={2} />
            <text
              x={outputX - 28}
              y={oy + 4}
              textAnchor="end"
              className="fill-[var(--color-foreground)]"
              fontSize="12"
              fontWeight={i === 0 ? 'bold' : 'normal'}
            >
              {p.word}
            </text>
            <text
              x={outputX + 28}
              y={oy + 4}
              textAnchor="start"
              className="fill-[var(--color-foreground)]"
              fontSize="12"
            >
              {Math.round(p.prob)}%
              {showDelta && (
                <tspan fill={change > 0 ? '#10b981' : '#ef4444'}>
                  {' '}
                  ({change > 0 ? '+' : ''}
                  {Math.round(change)}%)
                </tspan>
              )}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function PredictionSimulator({ lang }: { lang: Lang }) {
  const [state, dispatch] = useReducer(simReducer, lang, makeInitialState)
  const WORDS = WORDS_BY_LANG[lang]

  const visibleText = WORDS.slice(0, state.currentPosition + 1).join(' ')

  const statusBox = () => {
    switch (state.status) {
      case 'initial':
        return (
          <InfoBox tone="emerald" icon={<Info className="size-4" />}>
            {lang === 'en' ? (
              <>
                <p>
                  <strong>Start of training</strong>
                </p>
                <p>
                  The full sentence was cut off. The model only sees: “
                  <strong>{visibleText}</strong>”
                </p>
                <p>
                  It has to guess the next word. At the start, the probabilities are{' '}
                  <strong>random</strong>.
                </p>
                <p>
                  The neural network uses <strong>weights</strong> (shown by the thickness of the
                  axons). The thicker an axon, the more <strong>influence</strong> it has on the
                  neuron it activates. On every mistake, the weights are adjusted: increased for good
                  connections, decreased for bad ones.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Début de l'apprentissage</strong>
                </p>
                <p>
                  La phrase complète a été coupée. Le modèle ne voit que : «{' '}
                  <strong>{visibleText}</strong> »
                </p>
                <p>
                  Il doit deviner le mot suivant. Au début, les probabilités sont{' '}
                  <strong>aléatoires</strong>.
                </p>
                <p>
                  Le réseau de neurones utilise des <strong>poids</strong> (représentés par
                  l'épaisseur des axones). Plus un axone est épais, plus il a d'
                  <strong>influence</strong> sur le neurone qu'il active. À chaque erreur, les poids
                  sont ajustés : augmentés pour les bonnes connexions, diminués pour les mauvaises.
                </p>
              </>
            )}
          </InfoBox>
        )
      case 'correct':
        return (
          <InfoBox tone="emerald" icon={<CheckCircle className="size-4" />}>
            {lang === 'en' ? (
              <>
                <p>
                  <strong>Correct prediction:</strong> the model predicted “
                  <strong>{state.lastPrediction?.predicted}</strong>”
                </p>
                <p>
                  The model was right! This <strong>reinforces the probability</strong> of that word
                  in this context.
                </p>
                {state.showFirstCorrect && (
                  <p>
                    With billions of iterations, the model gradually learns the right associations.
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  <strong>Prédiction correcte :</strong> Le modèle a prédit «{' '}
                  <strong>{state.lastPrediction?.predicted}</strong> »
                </p>
                <p>
                  Le modèle a eu raison ! Cela <strong>renforce la probabilité</strong> de ce mot
                  dans ce contexte.
                </p>
                {state.showFirstCorrect && (
                  <p>
                    Avec des milliards d'itérations, le modèle apprend progressivement les bonnes
                    associations.
                  </p>
                )}
              </>
            )}
          </InfoBox>
        )
      case 'incorrect':
        return (
          <InfoBox tone="red" icon={<XCircle className="size-4" />}>
            {lang === 'en' ? (
              <>
                <p>
                  <strong>Incorrect prediction:</strong> the model predicted “
                  <strong>{state.lastPrediction?.predicted}</strong>” but the correct word was “
                  <strong>{state.lastPrediction?.actual}</strong>”
                </p>
                <p>
                  The model got it wrong. This <strong>decreases the probability</strong> of the
                  incorrect word and <strong>increases</strong> that of the{' '}
                  <strong>correct word</strong>.
                </p>
                {state.showFirstIncorrect && (
                  <p>
                    This is how machine learning works: by <strong>trial and error</strong>, over
                    billions of iterations.
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  <strong>Prédiction incorrecte :</strong> Le modèle a prédit «{' '}
                  <strong>{state.lastPrediction?.predicted}</strong> » mais le mot correct était «{' '}
                  <strong>{state.lastPrediction?.actual}</strong> »
                </p>
                <p>
                  Le modèle s'est trompé. Cela <strong>diminue la probabilité</strong> du mot
                  incorrect et <strong>augmente</strong> celle du <strong>mot correct</strong>.
                </p>
                {state.showFirstIncorrect && (
                  <p>
                    C'est ainsi que fonctionne l'apprentissage automatique : par{' '}
                    <strong>essais-erreurs</strong>, sur des milliards d'itérations.
                  </p>
                )}
              </>
            )}
          </InfoBox>
        )
      case 'next': {
        const topWord = state.probabilities[0]?.word
        const topProb = state.probabilities[0]?.prob ?? 0
        return (
          <InfoBox tone="blue" icon={<Info className="size-4" />}>
            {lang === 'en' ? (
              <>
                <p>
                  <strong>Next word</strong>
                </p>
                <p>
                  The model now sees: “<strong>{visibleText}</strong>”
                </p>
                <p>
                  It predicts the next word: “<strong>{topWord}</strong>” ({Math.round(topProb)}%).
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Mot suivant</strong>
                </p>
                <p>
                  Le modèle voit maintenant : « <strong>{visibleText}</strong> »
                </p>
                <p>
                  Il prédit le mot suivant : « <strong>{topWord}</strong> » ({Math.round(topProb)}
                  %).
                </p>
              </>
            )}
          </InfoBox>
        )
      }
      case 'final':
        return (
          <InfoBox tone="emerald" icon={<CheckCircle className="size-4" />}>
            {lang === 'en' ? (
              <>
                <p>
                  <strong>Training complete!</strong>
                </p>
                <p>The model went through the whole sentence. Here is what happened:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    The model predicted the next word <strong>6 times</strong>
                  </li>
                  <li>
                    On each mistake, it <strong>adjusted its weights</strong> to improve its
                    predictions
                  </li>
                  <li>
                    The probabilities <strong>evolved gradually</strong> as learning progressed
                  </li>
                  <li>
                    This process repeats over <strong>billions of sentences</strong> to train an LLM
                  </li>
                </ul>
                <p>
                  Click <strong>“Restart”</strong> to run the simulation again!
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Apprentissage terminé !</strong>
                </p>
                <p>Le modèle a parcouru toute la phrase. Voici ce qui s'est passé :</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Le modèle a prédit le mot suivant <strong>6 fois</strong>
                  </li>
                  <li>
                    À chaque erreur, il a <strong>ajusté ses poids</strong> pour améliorer ses
                    prédictions
                  </li>
                  <li>
                    Les probabilités ont <strong>évolué progressivement</strong> au fil de
                    l'apprentissage
                  </li>
                  <li>
                    Ce processus se répète sur <strong>des milliards de phrases</strong> pour
                    entraîner un LLM
                  </li>
                </ul>
                <p>
                  Cliquez sur <strong>« Recommencer »</strong> pour relancer la simulation !
                </p>
              </>
            )}
          </InfoBox>
        )
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader>
        {pick(lang, 'Apprentissage : prédiction du mot suivant', 'Learning: predicting the next word')}
      </StepHeader>
      <p className="text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          "Le modèle apprend en essayant de prédire le mot suivant dans une phrase. Au début, ses prédictions sont aléatoires, puis elles s'améliorent progressivement en comparant ses réponses avec le texte réel.",
          'The model learns by trying to predict the next word in a sentence. At first its predictions are random, then they gradually improve as it compares its answers with the real text.',
        )}
      </p>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-[var(--color-muted-foreground)]">
          {pick(lang, "Phrase d'entraînement :", 'Training sentence:')}{' '}
          <span className="text-[var(--color-foreground)]">« {WORDS.join(' ')} »</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={() => dispatch({ type: 'next', lang })} disabled={state.finished}>
              <ArrowRight className="size-4" />
              {pick(lang, 'Étape suivante', 'Next step')}
            </Button>
            <Button variant="secondary" onClick={() => dispatch({ type: 'reset', lang })}>
              <RotateCcw className="size-4" />
              {pick(lang, 'Recommencer', 'Restart')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {WORDS.map((w, i) => {
              const visible = i <= state.currentPosition
              return (
                <span
                  key={i}
                  className={`rounded-md border px-3 py-1.5 font-mono text-sm ${
                    visible
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      : 'border-dashed border-slate-400/40 bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                  }`}
                >
                  {visible ? w : '???'}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {statusBox()}

      {state.probabilities.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-center">
          <div className="rounded-md border bg-[var(--color-card)] p-2 lg:col-span-3">
            <NeuralNetwork
              probabilities={state.probabilities}
              previousProbabilities={state.previousProbabilities}
              lastPrediction={state.lastPrediction}
              showingPrediction={state.showingPrediction}
              iteration={state.iteration}
              inputText={visibleText}
              lang={lang}
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            {state.probabilities.map((p) => {
              let barColor = 'bg-blue-500'
              let highlight = ''
              const isArgmax = p.word === state.probabilities[0].word
              if (state.showingPrediction && state.lastPrediction) {
                if (p.word === state.lastPrediction.actual) {
                  barColor = 'bg-emerald-500'
                  highlight = 'font-semibold text-emerald-600 dark:text-emerald-400'
                } else if (
                  p.word === state.lastPrediction.predicted &&
                  !state.lastPrediction.isCorrect
                ) {
                  barColor = 'bg-red-500'
                  highlight = 'font-semibold text-red-600 dark:text-red-400'
                }
              } else if (isArgmax) {
                highlight = 'font-semibold text-blue-600 dark:text-blue-400'
              }
              return (
                <div key={p.word} className="flex items-center gap-2">
                  <div className={`w-20 shrink-0 truncate text-xs ${highlight}`}>{p.word}</div>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-muted)]">
                    <div
                      className={`h-full rounded transition-all duration-500 ${barColor}`}
                      style={{ width: `${p.prob}%` }}
                    />
                  </div>
                  <div className="w-9 shrink-0 text-right text-xs tabular-nums">
                    {Math.round(p.prob)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// STEP 5 — Inférence
// ============================================================

function FlowBox({
  children,
  highlight,
  icon,
  title,
}: {
  children?: React.ReactNode
  highlight?: boolean
  icon?: React.ReactNode
  title?: string
}) {
  return (
    <div
      className={`flex-1 rounded-md border p-3 text-sm ${
        highlight
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'bg-[var(--color-card)]'
      }`}
    >
      {title && (
        <div className="mb-1 flex items-center gap-2 font-semibold">
          {icon && <span className="text-blue-600 dark:text-blue-400">{icon}</span>}
          {title}
        </div>
      )}
      <div className="text-[var(--color-muted-foreground)]">{children}</div>
    </div>
  )
}

function StepInference({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-6">
      <StepHeader>
        {pick(lang, 'Inférence : utilisation du modèle', 'Inference: using the model')}
      </StepHeader>
      <p className="text-[var(--color-muted-foreground)]">
        {lang === 'en' ? (
          <>
            Once the model is trained, it can be used by end users to generate answers. This is
            called <strong className="text-[var(--color-foreground)]">inference</strong> (as
            distinct from the training step).
          </>
        ) : (
          <>
            Une fois le modèle entraîné, il peut être utilisé par les utilisateurs finaux pour
            générer des réponses. C'est ce qu'on appelle l'
            <strong className="text-[var(--color-foreground)]">inférence</strong> (à distinguer de
            l'étape d'entraînement).
          </>
        )}
      </p>

      <Tabs defaultValue="knowledge" className="min-w-0">
        <TabsList className="mx-auto">
          <TabsTrigger value="knowledge">
            <Brain className="size-4" />
            {pick(lang, 'Connaissances', 'Knowledge')}
          </TabsTrigger>
          <TabsTrigger value="hallucinations">
            <AlertTriangle className="size-4" />
            {pick(lang, 'Hallucinations', 'Hallucinations')}
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="size-4" />
            {pick(lang, 'Outils et RAG', 'Tools and RAG')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="mt-4">
      {/* Card 1 */}
      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Brain className={`size-5 ${iconAccent.blue}`} />
            {pick(
              lang,
              "Le modèle répond selon ce qu'il a appris",
              'The model answers based on what it has learned',
            )}
          </div>
          {lang === 'en' ? (
            <>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                The LLM generates its answers{' '}
                <strong className="text-[var(--color-foreground)]">
                  only from the training data
                </strong>
                . It cannot know information it never saw during training.
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                For example, if a model was trained on data up to 2023, it will not know about
                events from 2024.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Le LLM génère ses réponses{' '}
                <strong className="text-[var(--color-foreground)]">
                  uniquement à partir des données d'entraînement
                </strong>
                . Il ne peut pas connaître des informations qu'il n'a jamais vues pendant
                l'entraînement.
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Par exemple, si un modèle a été entraîné sur des données jusqu'en 2023, il ne
                connaîtra pas les événements de 2024.
              </p>
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="hallucinations" className="mt-4">
      {/* Card 2 */}
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className={`size-5 ${iconAccent.amber}`} />
            {pick(lang, 'Les hallucinations : le modèle invente', 'Hallucinations: the model makes things up')}
          </div>
          {lang === 'en' ? (
            <>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                The LLM <strong className="text-[var(--color-foreground)]">will always answer</strong>,
                even if it does not know the answer. In that case it may{' '}
                <strong className="text-[var(--color-foreground)]">invent</strong> information that
                looks plausible but is false.
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                This is called a{' '}
                <strong className="text-[var(--color-foreground)]">hallucination</strong>. It is
                crucial to check important information, especially in a medical context.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Le LLM <strong className="text-[var(--color-foreground)]">va toujours répondre</strong>,
                même s'il ne connaît pas la réponse. Dans ce cas, il peut{' '}
                <strong className="text-[var(--color-foreground)]">inventer</strong> des informations
                qui semblent plausibles mais qui sont fausses.
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                C'est ce qu'on appelle une{' '}
                <strong className="text-[var(--color-foreground)]">hallucination</strong>. Il est
                crucial de vérifier les informations importantes, surtout dans un contexte médical.
              </p>
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
      {/* Card 3 */}
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <Wrench className={`size-5 ${iconAccent.emerald}`} />
            {pick(lang, 'Les outils externes : serveurs et RAG', 'External tools: servers and RAG')}
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {lang === 'en' ? (
              <>
                To work around these limits, LLMs can be connected to{' '}
                <strong className="text-[var(--color-foreground)]">external tools</strong>.
              </>
            ) : (
              <>
                Pour pallier ces limites, les LLM peuvent être connectés à des{' '}
                <strong className="text-[var(--color-foreground)]">outils externes</strong>.
              </>
            )}
          </p>

          <p className="text-sm font-semibold">{pick(lang, '1. Appel à des serveurs', '1. Calling servers')}</p>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {[
              { icon: <User className="size-4" />, text: pick(lang, 'Utilisateur demande la météo', 'User asks for the weather') },
              { icon: <Wrench className="size-4" />, text: pick(lang, 'LLM appelle le serveur météo', 'LLM calls the weather server') },
              { icon: <MessageSquare className="size-4" />, text: pick(lang, 'LLM formule la réponse', 'LLM formulates the answer') },
            ].map((s, i) => (
              <div key={i} className="contents">
                {i > 0 && (
                  <span className="flex justify-center text-[var(--color-muted-foreground)]">
                    <ChevronRight className="size-5 rotate-90 sm:rotate-0" />
                  </span>
                )}
                <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {s.icon}
                  </span>
                  <span className="text-[var(--color-foreground)]">{s.text}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {lang === 'en' ? (
              <>
                The model can thus access{' '}
                <strong className="text-[var(--color-foreground)]">real-time data</strong> it did
                not see during training.
              </>
            ) : (
              <>
                Le modèle peut ainsi accéder à des{' '}
                <strong className="text-[var(--color-foreground)]">données en temps réel</strong>{' '}
                qu'il n'a pas vues pendant l'entraînement.
              </>
            )}
          </p>

          <p className="text-sm font-semibold">2. RAG (Retrieval-Augmented Generation)</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {lang === 'en' ? (
              <>
                RAG makes it possible to feed relevant documents to the model. The documents are{' '}
                <strong className="text-[var(--color-foreground)]">
                  inserted directly into the message
                </strong>
                , allowing the model to answer with up-to-date information.
              </>
            ) : (
              <>
                Le RAG permet de fournir des documents pertinents au modèle. Les documents sont{' '}
                <strong className="text-[var(--color-foreground)]">
                  insérés directement dans le message
                </strong>
                , permettant au modèle de répondre avec des informations à jour.
              </>
            )}
          </p>

          <p className="text-sm font-semibold">
            {pick(
              lang,
              'Exemple : RAG avec des recommandations médicales',
              'Example: RAG with medical guidelines',
            )}
          </p>
          <div className="flex flex-col gap-2">
            <FlowBox
              icon={<User className="size-4" />}
              title={pick(lang, "Question de l'utilisateur", 'User question')}
            >
              {pick(
                lang,
                'Quelles sont les recommandations pour traiter une hypertension artérielle ?',
                'What are the guidelines for treating arterial hypertension?',
              )}
            </FlowBox>
            <span className="flex justify-center text-[var(--color-muted-foreground)]">
              <ArrowDown className="size-5" />
            </span>
            <FlowBox
              icon={<Database className="size-4" />}
              title={pick(lang, 'Documents récupérés (RAG)', 'Retrieved documents (RAG)')}
            >
              {pick(
                lang,
                "Recommandations HAS : « Le traitement de première intention de l'hypertension artérielle repose sur... »",
                'HAS guidelines: “First-line treatment of arterial hypertension relies on...”',
              )}
            </FlowBox>
            <span className="flex justify-center text-[var(--color-muted-foreground)]">
              <ArrowDown className="size-5" />
            </span>
            <FlowBox
              highlight
              icon={<Layers className="size-4" />}
              title={pick(lang, 'Message envoyé au LLM', 'Message sent to the LLM')}
            >
              <p>
                <strong className="text-[var(--color-foreground)]">
                  {pick(lang, '[CONTEXTE]', '[CONTEXT]')}
                </strong>{' '}
                {pick(
                  lang,
                  "Recommandations HAS : « Le traitement de première intention de l'hypertension artérielle repose sur... »",
                  'HAS guidelines: “First-line treatment of arterial hypertension relies on...”',
                )}
              </p>
              <p>
                <strong className="text-[var(--color-foreground)]">
                  {pick(lang, '[QUESTION]', '[QUESTION]')}
                </strong>{' '}
                {pick(
                  lang,
                  '« Quelles sont les recommandations pour traiter une hypertension artérielle ? »',
                  '“What are the guidelines for treating arterial hypertension?”',
                )}
              </p>
            </FlowBox>
            <span className="flex justify-center text-[var(--color-muted-foreground)]">
              <ArrowDown className="size-5" />
            </span>
            <FlowBox
              icon={<MessageSquare className="size-4" />}
              title={pick(lang, 'Réponse du LLM', 'LLM answer')}
            >
              {pick(
                lang,
                "Selon les recommandations HAS, le traitement de première intention de l'hypertension artérielle repose sur ... Le modèle génère cette réponse en s'appuyant sur le contexte fourni.",
                'According to the HAS guidelines, first-line treatment of arterial hypertension relies on ... The model generates this answer based on the provided context.',
              )}
            </FlowBox>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// STEP 6 — Résumé
// ============================================================

function StepSummary({ lang }: { lang: Lang }) {
  const points: React.ReactNode[] =
    lang === 'en'
      ? [
          <>
            You select a <strong className="text-[var(--color-foreground)]">training corpus</strong>{' '}
            suited to the domain (HAS, forums, publications...)
          </>,
          <>
            The text is <strong className="text-[var(--color-foreground)]">tokenized</strong> (split
            into units) then turned into{' '}
            <strong className="text-[var(--color-foreground)]">numerical vectors</strong> (embeddings)
          </>,
          <>
            The model <strong className="text-[var(--color-foreground)]">learns</strong> by
            predicting the next word, refining its predictions at each iteration
          </>,
          <>
            The model is used for{' '}
            <strong className="text-[var(--color-foreground)]">inference</strong>. Its answers can be
            improved with <strong className="text-[var(--color-foreground)]">tools</strong> and{' '}
            <strong className="text-[var(--color-foreground)]">RAG</strong>.
          </>,
        ]
      : [
          <>
            On sélectionne un{' '}
            <strong className="text-[var(--color-foreground)]">corpus d'entraînement</strong> adapté
            au domaine (HAS, forums, publications...)
          </>,
          <>
            Le texte est <strong className="text-[var(--color-foreground)]">tokenisé</strong>{' '}
            (découpé en unités) puis transformé en{' '}
            <strong className="text-[var(--color-foreground)]">vecteurs numériques</strong>{' '}
            (embeddings)
          </>,
          <>
            Le modèle <strong className="text-[var(--color-foreground)]">apprend</strong> en
            prédisant le mot suivant, affinant ses prédictions à chaque itération
          </>,
          <>
            Le modèle est utilisé pour l'
            <strong className="text-[var(--color-foreground)]">inférence</strong>. On peut améliorer
            ses réponses avec des <strong className="text-[var(--color-foreground)]">outils</strong>{' '}
            et le <strong className="text-[var(--color-foreground)]">RAG</strong>.
          </>,
        ]
  const steps: {
    accent: Accent
    icon: React.ReactNode
    label: string
    body: React.ReactNode
  }[] = [
    {
      accent: 'blue',
      icon: <ClipboardList className="size-5" />,
      label: pick(lang, "Corpus d'entraînement", 'Training corpus'),
      body: points[0],
    },
    {
      accent: 'emerald',
      icon: <Scissors className="size-5" />,
      label: pick(lang, 'Tokenization et embedding', 'Tokenization and embedding'),
      body: points[1],
    },
    {
      accent: 'amber',
      icon: <Brain className="size-5" />,
      label: pick(lang, 'Apprentissage', 'Learning'),
      body: points[2],
    },
    {
      accent: 'red',
      icon: <Wrench className="size-5" />,
      label: pick(lang, 'Inférence', 'Inference'),
      body: points[3],
    },
  ]
  const panelAccent: Record<Accent, string> = {
    blue: 'border-l-blue-500 bg-blue-500/5',
    emerald: 'border-l-emerald-500 bg-emerald-500/5',
    amber: 'border-l-amber-500 bg-amber-500/5',
    red: 'border-l-red-500 bg-red-500/5',
  }
  return (
    <div className="space-y-6">
      <StepHeader>{pick(lang, 'En résumé', 'In summary')}</StepHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 rounded-lg border border-l-4 p-4 ${panelAccent[s.accent]}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`shrink-0 ${iconAccent[s.accent]}`}>{s.icon}</span>
              <span className="text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
                {pick(lang, 'Étape', 'Step')} {i + 1}
              </span>
              <span className="font-semibold text-[var(--color-foreground)]">{s.label}</span>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Main stepper
// ============================================================

const STEP_TITLES_BY_LANG: Record<Lang, string[]> = {
  fr: [
    'Introduction',
    "Corpus d'entraînement",
    'Tokenization',
    'Embedding',
    'Apprentissage',
    'Inférence',
    'Résumé',
  ],
  en: [
    'Introduction',
    'Training corpus',
    'Tokenization',
    'Embedding',
    'Learning',
    'Inference',
    'Summary',
  ],
}

const TOTAL_STEPS = STEP_TITLES_BY_LANG.fr.length

export function LlmModule() {
  const lang = useLang()
  const stepTitles = STEP_TITLES_BY_LANG[lang]
  const [searchParams, setSearchParams] = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)

  // `etape` reste lu pour ne pas briser les liens déjà distribués.
  const rawStep = Number(searchParams.get('step') ?? searchParams.get('etape'))
  const step = Number.isFinite(rawStep) ? Math.max(0, Math.min(TOTAL_STEPS - 1, rawStep)) : 0

  // Revenir au cours depuis la barre latérale reprend à l'étape quittée.
  useRememberStep(String(step))

  // Each step change pushes a history entry so the browser Back button
  // returns to the previous step instead of leaving the module.
  const goToStep = useCallback(
    (s: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, s))
      setSearchParams(clamped === 0 ? {} : { step: String(clamped) })
    },
    [setSearchParams],
  )

  const next = useCallback(() => goToStep(step + 1), [goToStep, step])
  const prev = useCallback(() => goToStep(step - 1), [goToStep, step])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepIntro goToStep={goToStep} lang={lang} />
      case 1:
        return <StepCorpus lang={lang} />
      case 2:
        return <StepTokenization lang={lang} />
      case 3:
        return <StepEmbedding lang={lang} />
      case 4:
        return <PredictionSimulator lang={lang} />
      case 5:
        return <StepInference lang={lang} />
      case 6:
        return <StepSummary lang={lang} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderStep()}</div>
      </div>

      {/* Fixed navigation bar — always visible at the bottom */}
      <div className="shrink-0 border-t bg-[var(--color-card)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <Button variant="outline" onClick={prev} disabled={step === 0}>
            <ChevronLeft className="size-4" />
            {pick(lang, 'Précédent', 'Previous')}
          </Button>

          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-semibold text-[var(--color-foreground)]">
              {stepTitles[step]}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={pick(lang, "Retour à l'introduction", 'Back to introduction')}
                onClick={() => goToStep(0)}
              >
                <Home className="size-4" />
              </Button>
              {stepTitles.map((title, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={title}
                  onClick={() => goToStep(i)}
                  className={`size-2.5 rounded-full transition-colors ${
                    i === step
                      ? 'bg-blue-500'
                      : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>

          <Button onClick={next} disabled={step === TOTAL_STEPS - 1}>
            {pick(lang, 'Suivant', 'Next')}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

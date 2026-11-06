import { cn } from '@/lib/utils'
import { useMemo, useState } from 'react'
import type { Data } from 'plotly.js-dist-min'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PlotlyChart } from '@/components/PlotlyChart'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { pick, type Lang } from '@/lib/useLang'

/**
 * Pièces interactives des cours LLM, reprises de l'ancien module en stepper.
 * Elles restent volontairement autonomes : chacune illustre une notion et
 * s'insère aussi bien dans le texte lu que dans une diapositive.
 */

const TOKENS = [
  { text: 'Le', medical: false },
  { text: ' patient', medical: false },
  { text: ' présente', medical: false },
  { text: ' une', medical: false },
  { text: ' tachy', medical: true },
  { text: 'card', medical: true },
  { text: 'ie', medical: true },
  { text: ' ventri', medical: true },
  { text: 'culaire', medical: true },
  { text: '.', medical: false },
]

/**
 * Le point pédagogique : « tachycardie ventriculaire », un seul concept pour un
 * médecin, coûte cinq tokens au modèle, là où « le patient » n'en coûte que deux.
 */
export function TokenDemo() {
  const [shown, setShown] = useState(TOKENS.length)

  return (
    <div className="not-prose my-6 rounded-lg border bg-[var(--color-card)] p-5">
      <div className="flex flex-wrap gap-1.5">
        {TOKENS.slice(0, shown).map((t, i) => (
          <span
            key={i}
            className={`rounded px-2 py-1 font-mono text-sm ${
              t.medical
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
            }`}
          >
            {t.text.trim()}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShown((n) => Math.max(0, n - 1))}
          disabled={shown === 0}
          aria-label="Retirer un token"
          className="size-8 shrink-0"
        >
          <ChevronLeft size={16} />
        </Button>
        <input
          type="range"
          min={0}
          max={TOKENS.length}
          value={shown}
          onChange={(e) => setShown(Number(e.target.value))}
          className="flex-1 accent-blue-500"
          aria-label="Nombre de tokens affichés"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShown((n) => Math.min(TOKENS.length, n + 1))}
          disabled={shown === TOKENS.length}
          aria-label="Ajouter un token"
          className="size-8 shrink-0"
        >
          <ChevronRight size={16} />
        </Button>
        <span className="w-24 shrink-0 text-right text-sm tabular-nums text-[var(--color-muted-foreground)]">
          {shown} / {TOKENS.length} tokens
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        En <span className="font-medium text-amber-700 dark:text-amber-300">jaune</span>, les
        morceaux du terme médical. Le découpage ne suit ni les mots ni les syllabes, mais la{' '}
        <strong>fréquence</strong> : « le » et « patient » sont si courants qu'ils forment un token
        chacun, tandis que « tachycardie ventriculaire », plus rare, est reconstitué à partir de cinq
        fragments.
      </p>
    </div>
  )
}

/**
 * Coordonnées choisies pour que, sous la caméra fixée plus bas, les trois
 * groupes se lisent d'emblée sans avoir à tourner la figure : médical en haut,
 * personnes au centre, fruits et voiture nettement à l'écart.
 */
const WORDS = [
  { word: 'hypertension', x: 2.4, y: 2.2, z: 3.0, group: 'medical' },
  { word: 'tachycardie', x: 3.0, y: 2.6, z: 3.4, group: 'medical' },
  { word: 'diabète', x: 2.0, y: 1.8, z: 2.7, group: 'medical' },
  { word: 'patient', x: 1.4, y: 0.4, z: 0.6, group: 'person' },
  { word: 'médecin', x: 1.0, y: 0.0, z: 0.2, group: 'person' },
  { word: 'pomme', x: -2.6, y: 2.4, z: 2.6, group: 'other' },
  { word: 'poire', x: -3.0, y: 2.0, z: 3.0, group: 'other' },
  { word: 'voiture', x: -2.2, y: -2.6, z: -2.4, group: 'other' },
]

const GROUP_COLOR: Record<string, string> = {
  medical: '#ef4444',
  person: '#10b981',
  other: '#64748b',
}

/** L'espace vectoriel : les mots proches par le sens sont proches dans l'espace. */
export function EmbeddingPlot() {
  const dark = useAppStore((s) => s.darkMode)

  const data: Data[] = useMemo(
    () => [
      {
        type: 'scatter3d',
        mode: 'text+markers',
        x: WORDS.map((p) => p.x),
        y: WORDS.map((p) => p.y),
        z: WORDS.map((p) => p.z),
        text: WORDS.map((p) => p.word),
        textposition: 'top center',
        textfont: { size: 11, color: dark ? '#e2e8f0' : '#0f172a' },
        marker: { size: 10, color: WORDS.map((p) => GROUP_COLOR[p.group]) },
        hoverinfo: 'text',
      } as Data,
    ],
    [dark],
  )

  const axis = {
    showticklabels: false,
    gridcolor: dark ? '#334155' : '#e2e8f0',
    zerolinecolor: dark ? '#475569' : '#cbd5e1',
    title: { text: '' },
  }

  return (
    <div className="not-prose my-6 grid items-center gap-4 rounded-lg border bg-[var(--color-card)] p-3 sm:grid-cols-[3fr_2fr]">
      <p className="rounded-md border-l-2 border-l-blue-500 bg-blue-500/5 px-3 py-2 text-sm sm:col-span-2">
        <span className="text-[var(--color-muted-foreground)]">Question posée : </span>
        <span className="font-medium text-[var(--color-foreground)]">
          « Pyélonéphrite sans signe de gravité : quel antibiotique ? »
        </span>
      </p>
      <PlotlyChart
        data={data}
        layout={{
          margin: { l: 0, r: 0, t: 0, b: 0 },
          height: 300,
          paper_bgcolor: 'rgba(0,0,0,0)',
          showlegend: false,
          scene: {
            xaxis: axis,
            yaxis: axis,
            zaxis: axis,
            // Vue choisie pour que les trois groupes se lisent d'emblée :
            // médical en haut à droite, personnes au centre, fruits en haut à
            // gauche et « voiture » isolée en bas à gauche.
            camera: { eye: { x: 0.6, y: -2.1, z: 0.9 } },
          },
        }}
        config={{ displayModeBar: false, responsive: true }}
      />
      <div className="space-y-2.5 text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:pr-2">
        <p className="text-[var(--color-foreground)]">
          Faites tourner la figure avec la souris.
        </p>
        <p>
          <span className="font-medium text-red-500">Termes médicaux</span>,{' '}
          <span className="font-medium text-emerald-500">personnes</span> et{' '}
          <span className="font-medium text-slate-500">mots sans rapport</span> forment trois groupes
          distincts, sans qu'on l'ait jamais indiqué au modèle.
        </p>
      </div>
    </div>
  )
}

/**
 * Reprise de la figure du cours 1, mais avec des PASSAGES au lieu de mots :
 * la question et deux chunks issus de deux documents différents.
 *
 * Les coordonnées sont choisies pour que la SIMILARITÉ COSINUS — la mesure
 * annoncée au cours 1, et celle qu'affiche le TD — tombe sur des valeurs
 * parlantes : ~0,99 pour le passage pertinent, ~0,1 pour l'autre. Le point
 * « sans rapport » est donc placé à presque 90° de la question, et non à
 * l'opposé : deux textes étrangers sont orthogonaux, pas contraires, et un
 * cosinus négatif contredirait le « entre 0 et 1 » du cours précédent.
 */
const RETRIEVAL_POINTS = [
  {
    label: 'Question',
    detail: ['Votre question', 'Pyélonéphrite sans signe de gravité :', 'quel antibiotique ?'],
    detailEn: ['Your question', 'Pyelonephritis without signs of severity:', 'which antibiotic?'],
    x: 2.6,
    y: 2.3,
    z: 2.9,
    kind: 'query' as const,
  },
  {
    label: 'HAS',
    detail: [
      'Fiche HAS > Pyélonéphrite aiguë simple',
      '> Traitement probabiliste',
      '1re intention : fluoroquinolone per os,',
      '2e intention : ceftriaxone',
    ],
    detailEn: [
      'HAS guideline > Uncomplicated acute pyelonephritis',
      '> Empirical treatment',
      'First line: oral fluoroquinolone,',
      'second line: ceftriaxone',
    ],
    x: 3.8,
    y: 0.4,
    z: 2.6,
    kind: 'near' as const,
  },
  {
    label: 'OMEDIT',
    detail: ['OMEDIT > Abréviations', 'DC : dose de charge,', 'LI : libération immédiate'],
    detailEn: ['OMEDIT > Abbreviations', 'DC: loading dose (dose de charge),', 'LI: immediate release (libération immédiate)'],
    x: -2.8,
    y: 2.2,
    z: 1.4,
    kind: 'far' as const,
  },
]

const RETRIEVAL_COLOR = {
  query: '#3b82f6',
  near: '#10b981',
  far: '#64748b',
}

/**
 * Similarité cosinus : l'angle entre les deux vecteurs, indépendamment de
 * leur longueur. C'est la mesure présentée au cours 1 et affichée par le TD
 * sous le nom « proximité de sens ».
 */
function cosine(a: (typeof RETRIEVAL_POINTS)[number], b: (typeof RETRIEVAL_POINTS)[number]) {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z
  const na = Math.hypot(a.x, a.y, a.z)
  const nb = Math.hypot(b.x, b.y, b.z)
  return dot / (na * nb)
}

/**
 * Ce que « chercher par le sens » veut dire : la question devient un point,
 * et l'on retient les passages les plus proches. Le passage pertinent ne
 * partage presque aucun mot avec la question — c'est bien le sens qui les
 * rapproche, pas le vocabulaire.
 */
export function RetrievalPlot({ className, lang = 'fr' }: { className?: string; lang?: Lang } = {}) {
  const dark = useAppStore((s) => s.darkMode)
  const [query, near, far] = RETRIEVAL_POINTS

  const data: Data[] = useMemo(
    () => [
      {
        type: 'scatter3d',
        mode: 'text+markers',
        x: RETRIEVAL_POINTS.map((p) => p.x),
        y: RETRIEVAL_POINTS.map((p) => p.y),
        z: RETRIEVAL_POINTS.map((p) => p.z),
        text: RETRIEVAL_POINTS.map((p) => p.label),
        textposition: 'top center',
        textfont: { size: 11, color: dark ? '#e2e8f0' : '#0f172a' },
        marker: {
          size: RETRIEVAL_POINTS.map((p) => (p.kind === 'query' ? 14 : 10)),
          color: RETRIEVAL_POINTS.map((p) => RETRIEVAL_COLOR[p.kind]),
          symbol: RETRIEVAL_POINTS.map((p) => (p.kind === 'query' ? 'diamond' : 'circle')),
        },
        // L'infobulle passe à la ligne d'elle-même : sur une seule ligne, un
        // intitulé de section complet déborde largement du cadre de la figure.
        hovertext: RETRIEVAL_POINTS.map((p) => pick(lang, p.detail, p.detailEn).join('<br>')),
        hoverinfo: 'text',
        hoverlabel: { align: 'left' },
      } as Data,
      // La similarité cosinus est un ANGLE : les deux traits partent donc de
      // l'origine et passent par les points, pour que ce soit l'écartement
      // entre eux — et non la distance entre les points — qui se lise.
      {
        type: 'scatter3d',
        mode: 'lines',
        x: [0, query.x, 0, near.x],
        y: [0, query.y, 0, near.y],
        z: [0, query.z, 0, near.z],
        line: { color: '#10b981', width: 5 },
        hoverinfo: 'skip',
      } as Data,
      {
        type: 'scatter3d',
        mode: 'lines',
        x: [0, far.x],
        y: [0, far.y],
        z: [0, far.z],
        line: { color: '#94a3b8', width: 2, dash: 'dot' },
        hoverinfo: 'skip',
      } as Data,
    ],
    [dark, lang, query, near, far],
  )

  const axis = {
    showticklabels: false,
    gridcolor: dark ? '#334155' : '#e2e8f0',
    zerolinecolor: dark ? '#475569' : '#cbd5e1',
    title: { text: '' },
  }

  return (
    <div className={cn("not-prose my-6 grid items-center gap-4 rounded-lg border bg-[var(--color-card)] p-3 sm:grid-cols-[3fr_2fr]", className)}>
      <PlotlyChart
        data={data}
        layout={{
          margin: { l: 0, r: 0, t: 0, b: 0 },
          height: 320,
          paper_bgcolor: 'rgba(0,0,0,0)',
          showlegend: false,
          scene: {
            xaxis: axis,
            yaxis: axis,
            zaxis: axis,
            camera: { eye: { x: 0.6, y: -2.1, z: 0.9 } },
          },
        }}
        config={{ displayModeBar: false, responsive: true }}
      />
      <div className="space-y-2.5 text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:pr-2">
        {pick(
          lang,
          <>
            <p className="text-[var(--color-foreground)]">
              Faites tourner la figure avec la souris.
            </p>
            <p>
              La <span className="font-medium text-blue-500">question</span> est convertie en vecteur,
              exactement comme les passages. On mesure ensuite la{' '}
              <strong>similarité cosinus</strong> entre elle et chaque passage indexé — l'angle entre
              les deux flèches, entre 0 et 1.
            </p>
            <p>
              Le passage de la{' '}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">fiche HAS</span>{' '}
              obtient{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                {cosine(query, near).toFixed(3)}
              </strong>{' '}
              : presque la même direction. Celui de l'
              <span className="font-medium text-slate-600 dark:text-slate-400">OMEDIT</span> obtient{' '}
              <strong className="tabular-nums">{cosine(query, far).toFixed(3)}</strong> : à angle droit,
              donc sans rapport. Seul le premier partira au modèle.
            </p>
            <p>
              Remarquez : la question ne dit pas « simple », et le passage ne contient pas le mot «
              antibiotique ». Ils sont pourtant voisins — c'est cela, chercher par le{' '}
              <strong>sens</strong> plutôt que par les mots.
            </p>
          </>,
          <>
            <p className="text-[var(--color-foreground)]">
              Rotate the figure with your mouse.
            </p>
            <p>
              The <span className="font-medium text-blue-500">question</span> is converted into a
              vector, exactly like the chunks. We then measure the <strong>cosine similarity</strong>{' '}
              between it and each indexed chunk — the angle between the two arrows, between 0 and 1.
            </p>
            <p>
              The chunk from the{' '}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">HAS guideline</span>{' '}
              scores{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                {cosine(query, near).toFixed(3)}
              </strong>
              : almost the same direction. The one from{' '}
              <span className="font-medium text-slate-600 dark:text-slate-400">OMEDIT</span> scores{' '}
              <strong className="tabular-nums">{cosine(query, far).toFixed(3)}</strong>: at a right
              angle, so unrelated. Only the first one will be sent to the model.
            </p>
            <p>
              Notice: the question does not say “uncomplicated”, and the chunk does not contain the
              word “antibiotic”. Yet they are neighbours — that is what searching by{' '}
              <strong>meaning</strong> rather than by words is about.
            </p>
          </>,
        )}
      </div>
    </div>
  )
}

const CANDIDATES = [
  { word: 'antibiotique', en: 'antibiotics', logit: 3.2 },
  { word: 'traitement', en: 'treatment', logit: 2.6 },
  { word: 'examen', en: 'tests', logit: 1.9 },
  { word: 'repos', en: 'rest', logit: 1.1 },
  { word: 'bilan', en: 'work-up', logit: 0.7 },
  { word: 'ananas', en: 'pineapple', logit: -1.4 },
]

/**
 * Le cœur du cours 1 : à température basse le modèle prend presque toujours le
 * mot le plus probable ; en la montant, les candidats improbables remontent —
 * « créativité » et « délire » sont bien le même bouton.
 */
export function TemperatureDemo({ lang = 'fr' }: { lang?: Lang } = {}) {
  const [temp, setTemp] = useState(0.7)

  const probs = useMemo(() => {
    // Softmax sur les logits divisés par la température. À T→0 la distribution
    // se concentre sur le maximum, à T élevée elle s'aplatit.
    const t = Math.max(temp, 0.01)
    const exps = CANDIDATES.map((c) => Math.exp(c.logit / t))
    const sum = exps.reduce((a, b) => a + b, 0)
    return CANDIDATES.map((c, i) => ({ ...c, p: exps[i] / sum }))
  }, [temp])

  return (
    <div className="not-prose my-6 rounded-lg border bg-[var(--color-card)] p-5">
      <p className="mb-4 font-mono text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            « Devant une pyélonéphrite, je prescris un{' '}
            <span className="text-[var(--color-foreground)]">…</span> »
          </>,
          <>
            “Faced with pyelonephritis, I prescribe{' '}
            <span className="text-[var(--color-foreground)]">…</span>”
          </>,
        )}
      </p>

      <div className="space-y-2">
        {probs.map((c) => (
          <div key={c.word} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-right font-mono text-xs text-[var(--color-foreground)]">
              {pick(lang, c.word, c.en)}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-[var(--color-muted)]">
              <div
                className="h-full rounded bg-blue-500 transition-all duration-300"
                style={{ width: `${c.p * 100}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-[var(--color-muted-foreground)]">
              {(c.p * 100).toFixed(0)}
              {pick(lang, ' %', '%')}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {pick(lang, 'Température', 'Temperature')}
        </span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="flex-1 accent-blue-500"
          aria-label={pick(lang, 'Température', 'Temperature')}
        />
        <span className="w-10 text-right text-sm tabular-nums font-medium text-[var(--color-foreground)]">
          {temp.toFixed(1)}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            À <strong>0</strong>, le modèle prend presque toujours le mot le plus probable. À{' '}
            <strong>0,7</strong> (le réglage courant des assistants grand public), il varie. À{' '}
            <strong>1,5</strong>, « ananas » devient jouable : la créativité et le délire sont le
            même bouton.
          </>,
          <>
            At <strong>0</strong>, the model almost always picks the most likely word. At{' '}
            <strong>0.7</strong> (the usual setting of consumer assistants), it varies. At{' '}
            <strong>1.5</strong>, “pineapple” becomes playable: creativity and delirium are the same
            knob.
          </>,
        )}
      </p>
    </div>
  )
}

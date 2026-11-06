/**
 * L'imputation, montrée plutôt qu'expliquée.
 *
 * Deux gestes très différents portent le même nom :
 *  — LOCF complète un trou avec la valeur précédente DU MÊME patient ;
 *  — la moyenne complète avec une valeur venue de TOUS LES AUTRES patients.
 *
 * Le second invente une donnée que le patient n'a jamais eue. C'est le point
 * que l'étudiant doit sentir, et qu'un paragraphe ne fait pas sentir.
 */

import { useMemo, useState } from 'react'
import { type Data, type Layout } from 'plotly.js-dist-min'
import { PlotlyChart } from '@/components/PlotlyChart'
import { Users, User2, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COHORT } from './cohort'
import { VARIABLE_BY_KEY, varText } from './variables'
import { useLang, pick } from '@/lib/useLang'
import { pillClass } from './styles'

type Method = 'none' | 'locf' | 'linear' | 'mean'

/**
 * Une série horaire trouée, fabriquée pour la démonstration.
 *
 * Volontairement fixe et non aléatoire : on veut que tout le groupe regarde la
 * même courbe, et que le trou tombe à un endroit où LOCF a visiblement tort —
 * pendant une montée.
 */
const HOURS = Array.from({ length: 13 }, (_, i) => i * 2)
const TRUE_SERIES = [1.1, 1.2, 1.4, 1.6, 2.1, 2.8, 3.6, 4.3, 4.8, 5.1, 5.0, 4.6, 4.1]
/** Les heures où la mesure n'a PAS été faite (indices dans HOURS). */
const GAPS = new Set([4, 5, 6, 7, 8])

const observed = TRUE_SERIES.map((v, i) => (GAPS.has(i) ? null : v))

/** Report de la dernière valeur connue. */
function locf(series: (number | null)[]): number[] {
  let last = series.find((v) => v != null) ?? 0
  return series.map((v) => {
    if (v != null) last = v
    return last
  })
}

/**
 * Interpolation linéaire : on relie les deux mesures qui encadrent le trou.
 *
 * Plus fine que LOCF, parce qu'elle suppose que le paramètre a bougé pendant
 * le trou au lieu de rester figé. Mais elle suppose aussi qu'il a bougé en
 * ligne droite — et une trajectoire clinique n'est pas une droite. C'est le
 * point à faire passer : l'interpolation ne restitue pas la réalité, elle
 * substitue une hypothèse plus plausible à une hypothèse grossière.
 */
function linear(series: (number | null)[]): number[] {
  const out = series.slice()
  for (let i = 0; i < out.length; i++) {
    if (out[i] != null) continue
    // On cherche la mesure connue de part et d'autre du trou.
    let before = i - 1
    while (before >= 0 && series[before] == null) before--
    let after = i + 1
    while (after < series.length && series[after] == null) after++

    if (before < 0 && after >= series.length) continue
    // En bordure de série, il n'y a rien à relier : on prolonge à plat, seule
    // option honnête quand on ignore de quel côté la courbe repartait.
    if (before < 0) out[i] = series[after]!
    else if (after >= series.length) out[i] = series[before]!
    else {
      const t = (i - before) / (after - before)
      out[i] = series[before]! + t * (series[after]! - series[before]!)
    }
  }
  return out.map((v) => v ?? 0)
}

export function ImputationDemo() {
  const lang = useLang()
  const [method, setMethod] = useState<Method>('none')

  // La moyenne de population : celle du lactate sur toute la cohorte. C'est
  // bien une valeur qui ne vient PAS de ce patient.
  const populationMean = useMemo(() => {
    const vals = COHORT.map((p) => p.lactate).filter((v): v is number => v != null)
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }, [])

  const filled = useMemo(() => {
    if (method === 'none') return observed
    if (method === 'locf') return locf(observed)
    if (method === 'linear') return linear(observed)
    return observed.map((v) => (v == null ? populationMean : v))
  }, [method, populationMean])

  /**
   * L'écart moyen à la vérité, sur les seules heures imputées.
   *
   * Chiffrer l'erreur évite de juger les méthodes à l'œil : l'interpolation
   * paraît proche de la courbe grise, encore faut-il le vérifier.
   */
  const error = useMemo(() => {
    // `filled` peut contenir des trous quand aucune méthode n'est choisie ;
    // ce cas est écarté au-dessus, mais on reste défensif plutôt que d'affirmer
    // au compilateur ce qu'il ne peut pas vérifier.
    if (method === 'none') return null
    const gaps = [...GAPS]
    const sum = gaps.reduce((a, i) => {
      const v = filled[i]
      return v == null ? a : a + Math.abs(v - TRUE_SERIES[i])
    }, 0)
    return sum / gaps.length
  }, [filled, method])

  const meta = varText(VARIABLE_BY_KEY.lactate, lang)

  const data = useMemo<Data[]>(() => {
    const traces: Data[] = [
      {
        type: 'scatter',
        mode: 'lines',
        x: HOURS,
        y: TRUE_SERIES,
        name: pick(lang, 'Vraie évolution (inconnue)', 'True course (unknown)'),
        line: { color: 'rgba(148,163,184,0.55)', width: 2, dash: 'dot' },
        hovertemplate: `H+%{x} · %{y:.1f} mmol/L<extra>${pick(lang, 'Vraie valeur', 'True value')}</extra>`,
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: HOURS,
        y: filled,
        name:
          method === 'none'
            ? pick(lang, 'Mesures disponibles', 'Available measurements')
            : pick(lang, 'Série complétée', 'Completed series'),
        line: { color: '#3b82f6', width: 2.5 },
        marker: {
          size: 8,
          // Les points imputés sont creux : ils ne valent pas une mesure, et
          // rien ne doit laisser croire le contraire.
          color: observed.map((v) => (v == null ? 'rgba(0,0,0,0)' : '#3b82f6')),
          line: { color: '#3b82f6', width: 2 },
        },
        connectgaps: false,
        hovertemplate: 'H+%{x} · %{y:.1f} mmol/L<extra></extra>',
      },
    ]
    return traces
  }, [filled, method, lang])

  const layout = useMemo<Partial<Layout>>(
    () => ({
      font: { family: 'Inter, sans-serif', size: 12 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      height: 300,
      margin: { l: 55, r: 20, t: 10, b: 45 },
      xaxis: { title: { text: pick(lang, 'Heures depuis l’admission', 'Hours since admission') }, gridcolor: 'rgba(128,128,128,0.15)' },
      yaxis: {
        title: { text: `${meta.label} (${meta.unit})` },
        gridcolor: 'rgba(128,128,128,0.15)',
        rangemode: 'tozero',
      },
      showlegend: true,
      legend: { orientation: 'h', y: -0.25 },
    }),
    [meta, lang],
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            Un patient, son lactate, et cinq mesures qui n'ont jamais été faites (entre H+8 et H+16).
            La courbe grise en pointillés est la <strong>vraie</strong> évolution — celle qu'on ne
            connaît jamais dans la vraie vie. Comparez ce que chaque méthode y substitue.
          </>,
          <>
            One patient, their lactate, and five measurements that were never taken (between H+8
            and H+16). The dotted grey curve is the <strong>true</strong> course — the one you never
            know in real life. Compare what each method puts in its place.
          </>,
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'none', label: pick(lang, 'Données telles quelles', 'Data as is') },
            { id: 'locf', label: pick(lang, 'LOCF (dernière valeur connue)', 'LOCF (last known value)') },
            { id: 'linear', label: pick(lang, 'Interpolation linéaire', 'Linear interpolation') },
            { id: 'mean', label: pick(lang, 'Moyenne de la population', 'Population mean') },
          ] as const
        ).map((m) => (
          <button key={m.id} onClick={() => setMethod(m.id)} className={pillClass(m.id === method)}>
            {m.label}
          </button>
        ))}
      </div>

      {error !== null && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'Écart moyen à la vraie valeur, sur les cinq heures imputées :',
            'Mean deviation from the true value, over the five imputed hours:',
          )}{' '}
          <strong
            className={cn(
              'tabular-nums',
              error < 0.5
                ? 'text-emerald-600 dark:text-emerald-400'
                : error < 1.5
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400',
            )}
          >
            {error.toFixed(2)} mmol/L
          </strong>
          .
        </p>
      )}

      <PlotlyChart data={data} layout={layout} config={{ displayModeBar: false, responsive: true }} />

      {/* Le commentaire change avec la méthode : c'est lui qui porte la leçon,
          le graphique seul ne dit pas POURQUOI c'est faux. */}
      <div
        className={cn(
          'flex items-start gap-2 rounded-lg border p-4 text-sm',
          method === 'none' && 'border-slate-500/30 bg-slate-500/5',
          method === 'locf' && 'border-amber-500/30 bg-amber-500/5',
          method === 'linear' && 'border-emerald-500/30 bg-emerald-500/5',
          method === 'mean' && 'border-red-500/30 bg-red-500/5',
        )}
      >
        {method === 'mean' ? (
          <Users className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
        ) : method === 'linear' ? (
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <User2
            className={cn(
              'mt-0.5 size-4 shrink-0',
              method === 'locf'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400',
            )}
          />
        )}
        <div className="text-[var(--color-muted-foreground)]">
          {method === 'none' && lang === 'en' && (
            <>
              The curve is <strong>broken</strong>. As it stands, this series cannot go into a
              model: most algorithms simply refuse a missing value. So you have to decide what to
              put in its place — or give up on the patient.
            </>
          )}
          {method === 'none' && lang === 'fr' && (
            <>
              La courbe est <strong>interrompue</strong>. Telle quelle, cette série ne peut pas
              entrer dans un modèle : la plupart des algorithmes refusent purement et simplement une
              valeur absente. Il faut donc décider quoi mettre à la place — ou renoncer au patient.
            </>
          )}
          {method === 'locf' && lang === 'en' && (
            <>
              <strong>LOCF</strong> (<em>last observation carried forward</em>) extends the last
              value of the <strong>same patient</strong>. That is reasonable for a stable variable
              and a short gap. Here, lactate was rising: LOCF shows a plateau at 1.6 while the patient
              actually deteriorates up to 4.8. The imputation{' '}
              <strong>creates a false stability</strong> — precisely the opposite of what we were
              trying to detect.
            </>
          )}
          {method === 'locf' && lang === 'fr' && (
            <>
              <strong>LOCF</strong> (<em>last observation carried forward</em>) prolonge la dernière
              valeur du <strong>même patient</strong>. C'est raisonnable pour une variable stable et
              sur un trou court. Ici, le lactate montait : LOCF affiche un plateau à 1,6 pendant que
              le patient se dégrade réellement jusqu'à 4,8. L'imputation{' '}
              <strong>fabrique une fausse stabilité</strong> — précisément le contraire de ce qu'on
              cherchait à détecter.
            </>
          )}
          {method === 'linear' && lang === 'en' && (
            <>
              <strong>Linear interpolation</strong> connects the two measurements on either side of
              the gap: it assumes lactate moved during the interval, instead of freezing it. It is
              visibly closer to the truth — and the most accurate of the three methods here. But
              mind what it assumes: that the parameter changed <strong>in a straight line</strong>.
              A clinical trajectory is not a straight line and, above all, interpolation uses a
              measurement taken <strong>after</strong> the gap. At the bedside, that value does not
              exist yet: you cannot interpolate in real time. A method that is excellent for a
              retrospective study can therefore be <strong>unusable</strong> in the tool you want to
              deploy.
            </>
          )}
          {method === 'linear' && lang === 'fr' && (
            <>
              L'<strong>interpolation linéaire</strong> relie les deux mesures qui encadrent le
              trou : elle suppose que le lactate a bougé pendant l'intervalle, au lieu de le figer.
              C'est visiblement plus proche de la vérité — et c'est la méthode la plus juste des
              trois ici. Mais attention à ce qu'elle suppose : que le paramètre a évolué{' '}
              <strong>en ligne droite</strong>. Une trajectoire clinique n'est pas une droite, et
              surtout, l'interpolation utilise une mesure <strong>postérieure</strong> au trou. Au
              lit du patient, cette valeur n'existe pas encore : on ne peut pas interpoler en temps
              réel. Une méthode excellente pour une étude rétrospective peut donc être{' '}
              <strong>inutilisable</strong> dans l'outil qu'on veut déployer.
            </>
          )}
          {method === 'mean' && lang === 'en' && (
            <>
              The <strong>population mean</strong> ({populationMean.toFixed(1)} mmol/L) comes from{' '}
              <strong>other patients</strong>, not this one. The gap is filled with a flat line, at a
              level this patient may never have had. It is the simplest and most widely used method
              — but it <strong>flattens variability</strong>: the more you impute, the more alike all
              patients look, and the less the model can tell them apart.
            </>
          )}
          {method === 'mean' && lang === 'fr' && (
            <>
              La <strong>moyenne de la population</strong> ({populationMean.toFixed(1)} mmol/L)
              vient des <strong>autres patients</strong>, pas de celui-ci. Le trou est comblé par
              une ligne plate, à un niveau que ce patient n'a peut-être jamais eu. C'est la méthode
              la plus simple et la plus utilisée — mais elle <strong>écrase la variabilité</strong> :
              plus on impute, plus tous les patients se ressemblent, et moins le modèle peut les
              distinguer.
            </>
          )}
        </div>
      </div>
    </div>
  )
}

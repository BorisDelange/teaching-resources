import { useState } from 'react'
import { ChevronRight, Snowflake, Sun } from 'lucide-react'

/**
 * Frise verticale de l'histoire de l'IA.
 *
 * Verticale parce que le texte l'est : la frise se parcourt comme le reste de
 * la page, sans compression horizontale, et chaque jalon peut porter son
 * explication à côté de lui plutôt que dans un panneau séparé. Les périodes
 * d'expansion et de repli colorent le rail, pour que l'alternance — le vrai
 * propos de la section — se voie sans avoir à lire.
 */

interface Milestone {
  year: number
  title: string
  detail: string
  /** Climat de la période à laquelle le jalon appartient. */
  climate: 'warm' | 'cold'
  /** Repère de période affiché au-dessus du jalon, quand il en ouvre une. */
  era?: string
}

const MILESTONES: Milestone[] = [
  {
    year: 1943,
    title: 'Le neurone formel',
    climate: 'warm',
    era: 'Avant le nom',
    detail:
      "McCulloch et Pitts proposent un modèle mathématique très simplifié du neurone : il reçoit des signaux, les additionne, et s'active au-delà d'un seuil. Une idée sur le papier, sans machine pour la faire tourner — mais le point de départ de tout ce qui suivra.",
  },
  {
    year: 1950,
    title: "Turing et le jeu de l'imitation",
    climate: 'warm',
    detail:
      "Alan Turing remplace la question « les machines peuvent-elles penser ? », qu'il juge mal posée, par une épreuve concrète : si un évaluateur ne distingue pas la machine d'un humain dans un dialogue écrit, on conviendra qu'elle a réussi.",
  },
  {
    year: 1956,
    title: 'Dartmouth : le domaine reçoit son nom',
    climate: 'warm',
    era: "Âge d'or",
    detail:
      "Le séminaire d'été de Dartmouth donne son nom au domaine. L'optimisme est considérable : les organisateurs estiment qu'un été de travail à dix pourrait suffire à des progrès décisifs sur le langage et le raisonnement.",
  },
  {
    year: 1957,
    title: 'Le perceptron',
    climate: 'warm',
    detail:
      "Rosenblatt construit la première mise en œuvre matérielle d'un réseau de neurones, capable d'apprendre à classer des formes simples. La presse de l'époque y voit l'annonce de machines conscientes — première illustration de l'écart entre la promesse et le résultat.",
  },
  {
    year: 1974,
    title: 'Premier hiver',
    climate: 'cold',
    era: 'Premier hiver',
    detail:
      "Les résultats ne suivent pas. Des rapports d'évaluation sévères conduisent à l'arrêt de nombreux financements publics, au Royaume-Uni puis aux États-Unis. Le domaine entre en sommeil pour une demi-décennie.",
  },
  {
    year: 1980,
    title: 'Les systèmes experts, et la médecine',
    climate: 'warm',
    era: 'Retour en grâce',
    detail:
      "Retour en grâce avec des programmes qui encodent explicitement le savoir d'experts sous forme de règles. La médecine est un terrain privilégié : MYCIN, conçu pour conseiller une antibiothérapie, atteint des performances comparables à celles de spécialistes — et ne sera pourtant jamais déployé en routine.",
  },
  {
    year: 1987,
    title: 'Second hiver',
    climate: 'cold',
    era: 'Second hiver',
    detail:
      "Les systèmes experts se révèlent coûteux à maintenir : chaque connaissance nouvelle demande d'écrire et de vérifier des règles, qui interagissent mal entre elles. Le marché du matériel spécialisé s'effondre et les financements se retirent une seconde fois.",
  },
  {
    year: 1997,
    title: 'Deep Blue bat Kasparov',
    climate: 'warm',
    era: 'Reprise',
    detail:
      "La machine d'IBM bat le champion du monde d'échecs en titre. Le succès repose surtout sur la puissance de calcul et l'exploration méthodique des coups : la machine ne « comprend » pas les échecs, elle calcule bien plus loin qu'un humain.",
  },
  {
    year: 2012,
    title: "La bascule vers l'apprentissage profond",
    climate: 'warm',
    era: 'Apprentissage profond',
    detail:
      "Lors d'un concours annuel de reconnaissance d'images, un réseau de neurones profond devance nettement toutes les autres méthodes. Trois facteurs se conjuguent : beaucoup de données, des cartes graphiques puissantes, de meilleurs algorithmes. C'est de cette bascule que descendent les outils d'imagerie médicale d'aujourd'hui.",
  },
  {
    year: 2016,
    title: 'AlphaGo bat Lee Sedol',
    climate: 'warm',
    detail:
      "Le jeu de go passait pour hors de portée : trop de configurations pour être explorées par le calcul seul. AlphaGo combine apprentissage à partir de parties et exploration ciblée, et bat l'un des meilleurs joueurs du monde.",
  },
  {
    year: 2022,
    title: 'ChatGPT et la diffusion grand public',
    climate: 'warm',
    detail:
      "Les modèles de langage existaient depuis plusieurs années dans les laboratoires. La nouveauté est l'accès : une interface de conversation gratuite, sans compétence technique requise. C'est ce qui amène ces outils dans les salles de garde et les cabinets.",
  },
]

export function TimelineIA() {
  // Dartmouth ouvert par défaut : c'est le jalon que la section commente.
  const [open, setOpen] = useState<number | null>(1956)

  return (
    <div className="not-prose my-6">
      <ol className="relative space-y-0">
        {MILESTONES.map((m, i) => {
          const isOpen = open === m.year
          const last = i === MILESTONES.length - 1
          return (
            <li key={m.year} className="relative flex gap-4">
              {/* Rail : le segment porte la couleur du climat de la période. */}
              <div className="relative flex w-11 shrink-0 flex-col items-center">
                <span
                  className={`z-10 flex size-7 items-center justify-center rounded-full border-2 bg-[var(--color-background)] transition-colors ${
                    m.climate === 'cold'
                      ? 'border-slate-400 text-slate-500 dark:border-slate-500 dark:text-slate-300'
                      : 'border-amber-400 text-amber-600 dark:border-amber-600 dark:text-amber-400'
                  }`}
                >
                  {m.climate === 'cold' ? <Snowflake size={13} /> : <Sun size={13} />}
                </span>
                {!last && (
                  <span
                    className={`w-0.5 flex-1 ${
                      m.climate === 'cold'
                        ? 'bg-slate-300 dark:bg-slate-600'
                        : 'bg-amber-200 dark:bg-amber-800/70'
                    }`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? 'pb-0' : 'pb-4'}`}>
                {m.era && (
                  <p
                    className={`mb-1 text-[11px] font-semibold tracking-wide uppercase ${
                      m.climate === 'cold'
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {m.era}
                  </p>
                )}

                <button
                  onClick={() => setOpen(isOpen ? null : m.year)}
                  aria-expanded={isOpen}
                  className="group flex w-full cursor-pointer items-baseline gap-2.5 rounded text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  <ChevronRight
                    size={14}
                    className={`shrink-0 self-center text-[var(--color-muted-foreground)] transition-transform ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-muted-foreground)]">
                    {m.year}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-muted-foreground)]">
                    {m.title}
                  </span>
                </button>

                {isOpen && (
                  <p
                    className={`mt-1.5 ml-[1.55rem] border-l-2 pl-3 text-sm leading-relaxed text-[var(--color-foreground)]/80 ${
                      m.climate === 'cold'
                        ? 'border-slate-300 dark:border-slate-600'
                        : 'border-amber-200 dark:border-amber-800/70'
                    }`}
                  >
                    {m.detail}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        Cliquez sur un jalon pour le détail. Les segments{' '}
        <span className="font-medium text-amber-700 dark:text-amber-300">ambrés</span> marquent les
        phases d&rsquo;expansion, les{' '}
        <span className="font-medium text-slate-600 dark:text-slate-300">gris</span> les deux
        « hivers » — ces périodes où les financements se sont retirés après que les promesses eurent
        dépassé les résultats.
      </p>
    </div>
  )
}

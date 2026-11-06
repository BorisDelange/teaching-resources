/**
 * Schémas du cours « Qu'est-ce que l'intelligence artificielle ? ».
 * Mêmes conventions que les figures du cours LLM : SVG inline, tracé en
 * `currentColor` pour suivre le thème, une seule couleur signifiante par figure.
 */

const ARROW = (
  <defs>
    <marker
      id="ia-arrow"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
    </marker>
  </defs>
)

const BOX = 'fill-none stroke-current'
const LABEL = 'fill-current text-[13px] font-medium'
const SUB = 'fill-current text-[11px] opacity-60'

/**
 * Le test de Turing : l'évaluateur ne voit pas ses interlocuteurs et doit
 * dire lequel est la machine. Le schéma insiste sur le mur, car c'est lui
 * qui fait tout le propos — on ne juge que ce qui sort, jamais le mécanisme.
 */
export function FigureTuring() {
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 260"
        role="img"
        aria-label="Un évaluateur dialogue par écrit avec un humain et une machine qu'il ne voit pas, et doit déterminer lequel est la machine."
        className="h-auto w-full"
      >
        {ARROW}

        <g>
          <rect x="14" y="94" width="150" height="66" rx="8" className={BOX} strokeWidth="1.5" />
          <text x="89" y="122" textAnchor="middle" className={LABEL}>
            Évaluateur
          </text>
          <text x="89" y="141" textAnchor="middle" className={SUB}>
            humain
          </text>
        </g>

        <line
          x1="171"
          y1="127"
          x2="236"
          y2="127"
          stroke="currentColor"
          strokeWidth="1.5"
          markerEnd="url(#ia-arrow)"
        />
        <text x="203" y="116" textAnchor="middle" className={SUB}>
          questions
        </text>

        {/* Le mur : la seule chose que la figure doit vraiment faire retenir. */}
        <line
          x1="250"
          y1="20"
          x2="250"
          y2="240"
          className="stroke-blue-500"
          strokeWidth="2.5"
          strokeDasharray="7 5"
        />
        <text
          x="250"
          y="255"
          textAnchor="middle"
          className="fill-blue-500 text-[11px] font-semibold"
        >
          l'évaluateur ne voit rien
        </text>

        <g>
          <rect x="300" y="36" width="190" height="64" rx="8" className={BOX} strokeWidth="1.5" />
          <text x="395" y="63" textAnchor="middle" className={LABEL}>
            Interlocuteur A
          </text>
          <text x="395" y="82" textAnchor="middle" className={SUB}>
            un humain
          </text>
        </g>

        <g>
          <rect
            x="300"
            y="154"
            width="190"
            height="64"
            rx="8"
            className="fill-blue-500/15 stroke-blue-500"
            strokeWidth="2"
          />
          <text x="395" y="181" textAnchor="middle" className={LABEL}>
            Interlocuteur B
          </text>
          <text x="395" y="200" textAnchor="middle" className={SUB}>
            une machine
          </text>
        </g>

        <g>
          <line
            x1="500"
            y1="68"
            x2="556"
            y2="105"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#ia-arrow)"
          />
          <line
            x1="500"
            y1="186"
            x2="556"
            y2="149"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#ia-arrow)"
          />
          <rect x="564" y="94" width="202" height="66" rx="8" className={BOX} strokeWidth="1.5" />
          <text x="665" y="120" textAnchor="middle" className={LABEL}>
            « Lequel est la machine ? »
          </text>
          <text x="665" y="140" textAnchor="middle" className={SUB}>
            seules les réponses comptent
          </text>
        </g>
      </svg>
    </figure>
  )
}

/**
 * Poupées russes IA ⊃ ML ⊃ deep learning, avec les autres champs de l'IA
 * placés dans l'anneau extérieur : ils sont de l'IA sans être du ML.
 */
export function FigurePoupees() {
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 320"
        role="img"
        aria-label="L'intelligence artificielle contient l'apprentissage automatique, qui contient l'apprentissage profond. Systèmes experts, traitement du langage et robotique sont d'autres champs de l'IA."
        className="h-auto w-full"
      >
        <rect x="14" y="14" width="480" height="292" rx="12" className={BOX} strokeWidth="1.5" />
        <text x="32" y="40" className="fill-current text-[13px] font-semibold">
          Intelligence artificielle
        </text>
        <text x="32" y="58" className={SUB}>
          faire faire à une machine ce qui demande de l&rsquo;intelligence
        </text>

        <rect
          x="40"
          y="78"
          width="428"
          height="206"
          rx="10"
          className="fill-none stroke-blue-500"
          strokeWidth="1.5"
        />
        <text x="58" y="104" className="fill-blue-500 text-[13px] font-semibold">
          Apprentissage automatique
        </text>
        <text x="58" y="122" className={SUB}>
          la machine trouve les règles dans les données
        </text>

        <rect
          x="66"
          y="142"
          width="376"
          height="122"
          rx="8"
          className="fill-blue-500/15 stroke-blue-500"
          strokeWidth="2"
        />
        <text x="84" y="168" className="fill-blue-500 text-[13px] font-semibold">
          Apprentissage profond
        </text>
        <text x="84" y="186" className={SUB}>
          réseaux de neurones à nombreuses couches
        </text>
        <text x="84" y="212" className={SUB}>
          c&rsquo;est de là que viennent les LLM,
        </text>
        <text x="84" y="228" className={SUB}>
          la lecture d&rsquo;images médicales,
        </text>
        <text x="84" y="244" className={SUB}>
          la reconnaissance vocale
        </text>

        {/* Les autres champs : de l'IA, mais pas de l'apprentissage. */}
        <text x="522" y="40" className={SUB}>
          aussi de l&rsquo;IA, sans apprentissage :
        </text>
        {['Systèmes experts', 'Traitement du langage', 'Robotique', 'Recherche, planification'].map(
          (label, k) => (
            <g key={label}>
              <rect
                x="522"
                y={60 + k * 46}
                width="244"
                height="34"
                rx="6"
                className={BOX}
                strokeWidth="1.2"
              />
              <text x="644" y={82 + k * 46} textAnchor="middle" className="fill-current text-[12px]">
                {label}
              </text>
            </g>
          ),
        )}
      </svg>
    </figure>
  )
}

/**
 * Système expert contre apprentissage automatique : le sens de la flèche
 * s'inverse. C'est la figure qui porte la distinction centrale du cours.
 */
export function FigureRegleVsApprentissage() {
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 300"
        role="img"
        aria-label="Dans un système expert, le médecin écrit les règles et la machine les applique. En apprentissage automatique, on fournit des exemples et la machine en déduit les règles."
        className="h-auto w-full"
      >
        {ARROW}

        {/* Haut : système expert — la règle descend de l'humain vers la machine. */}
        <text x="14" y="30" className="fill-current text-[13px] font-semibold">
          Système expert
        </text>
        <text x="152" y="30" className={SUB}>
          le médecin écrit la règle
        </text>

        <g>
          <rect x="14" y="44" width="150" height="58" rx="8" className={BOX} strokeWidth="1.5" />
          <text x="89" y="70" textAnchor="middle" className={LABEL}>
            Le médecin
          </text>
          <text x="89" y="88" textAnchor="middle" className={SUB}>
            son savoir
          </text>
        </g>

        <line
          x1="171"
          y1="73"
          x2="222"
          y2="73"
          stroke="currentColor"
          strokeWidth="1.5"
          markerEnd="url(#ia-arrow)"
        />

        <g>
          <rect x="230" y="44" width="330" height="58" rx="8" className={BOX} strokeWidth="1.5" />
          <text x="395" y="70" textAnchor="middle" className="fill-current text-[12px]">
            si troponine &gt; seuil ET douleur thoracique
          </text>
          <text x="395" y="88" textAnchor="middle" className={SUB}>
            la règle, écrite à la main
          </text>
        </g>

        <line
          x1="567"
          y1="73"
          x2="618"
          y2="73"
          stroke="currentColor"
          strokeWidth="1.5"
          markerEnd="url(#ia-arrow)"
        />

        <g>
          <rect x="626" y="44" width="140" height="58" rx="8" className={BOX} strokeWidth="1.5" />
          <text x="696" y="78" textAnchor="middle" className={LABEL}>
            La machine
          </text>
        </g>

        <line
          x1="14"
          y1="140"
          x2="766"
          y2="140"
          stroke="currentColor"
          strokeWidth="1"
          className="opacity-25"
        />

        {/* Bas : apprentissage — les exemples remontent vers la règle. */}
        <text x="14" y="176" className="fill-blue-500 text-[13px] font-semibold">
          Apprentissage automatique
        </text>
        <text x="228" y="176" className={SUB}>
          la machine déduit la règle
        </text>

        <g>
          <rect
            x="14"
            y="190"
            width="150"
            height="82"
            rx="8"
            className="fill-none stroke-blue-500"
            strokeWidth="1.5"
          />
          <text x="89" y="216" textAnchor="middle" className={LABEL}>
            Des exemples
          </text>
          <text x="89" y="234" textAnchor="middle" className={SUB}>
            des milliers de cas
          </text>
          <text x="89" y="250" textAnchor="middle" className={SUB}>
            avec leur issue connue
          </text>
        </g>

        <line
          x1="171"
          y1="231"
          x2="222"
          y2="231"
          className="stroke-blue-500"
          strokeWidth="1.5"
          markerEnd="url(#ia-arrow)"
        />

        <g>
          <rect
            x="230"
            y="190"
            width="330"
            height="82"
            rx="8"
            className="fill-blue-500/15 stroke-blue-500"
            strokeWidth="2"
          />
          <text x="395" y="222" textAnchor="middle" className={LABEL}>
            La machine ajuste ses paramètres
          </text>
          <text x="395" y="244" textAnchor="middle" className={SUB}>
            personne n&rsquo;a écrit la règle
          </text>
        </g>

        <line
          x1="567"
          y1="231"
          x2="618"
          y2="231"
          className="stroke-blue-500"
          strokeWidth="1.5"
          markerEnd="url(#ia-arrow)"
        />

        <g>
          <rect
            x="626"
            y="190"
            width="140"
            height="82"
            rx="8"
            className="fill-none stroke-blue-500"
            strokeWidth="1.5"
          />
          <text x="696" y="224" textAnchor="middle" className={LABEL}>
            Une prédiction
          </text>
          <text x="696" y="244" textAnchor="middle" className={SUB}>
            sur un cas nouveau
          </text>
        </g>
      </svg>
    </figure>
  )
}

/**
 * Ce que recouvre le mot « IA » : des objets sans parenté technique, réunis
 * par le seul fait qu'on a jugé qu'ils demandaient de l'intelligence. La
 * figure sert l'argument « le terme seul ne renseigne sur rien ».
 */
export function FigureMemeMot() {
  const items = [
    { label: 'Correcteur\northographique', sub: 'règles écrites' },
    { label: 'Deep Blue', sub: 'exploration de coups' },
    { label: 'Lecture de\nradiographies', sub: 'réseau de neurones' },
    { label: 'ChatGPT', sub: 'modèle de langage' },
  ]
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 250"
        role="img"
        aria-label="Quatre systèmes sans parenté technique — correcteur orthographique, Deep Blue, lecture de radiographies, ChatGPT — sont tous désignés par le mot « intelligence artificielle »."
        className="h-auto w-full"
      >
        {ARROW}

        {items.map((it, k) => {
          const x = 14 + k * 194
          const lines = it.label.split('\n')
          return (
            <g key={it.label}>
              <rect x={x} y="18" width="172" height="76" rx="8" className={BOX} strokeWidth="1.5" />
              {lines.map((line, li) => (
                <text
                  key={line}
                  x={x + 86}
                  y={lines.length === 1 ? 52 : 44 + li * 17}
                  textAnchor="middle"
                  className={LABEL}
                >
                  {line}
                </text>
              ))}
              <text x={x + 86} y="80" textAnchor="middle" className={SUB}>
                {it.sub}
              </text>
              <line
                x1={x + 86}
                y1="100"
                x2={x + 86}
                y2="140"
                stroke="currentColor"
                strokeWidth="1.5"
                className="opacity-40"
                markerEnd="url(#ia-arrow)"
              />
            </g>
          )
        })}

        <rect
          x="180"
          y="150"
          width="420"
          height="58"
          rx="8"
          className="fill-blue-500/15 stroke-blue-500"
          strokeWidth="2"
        />
        <text
          x="390"
          y="177"
          textAnchor="middle"
          className="fill-blue-500 text-[14px] font-semibold"
        >
          « intelligence artificielle »
        </text>
        <text x="390" y="196" textAnchor="middle" className={SUB}>
          un seul mot, aucune technique commune
        </text>

        <text x="390" y="234" textAnchor="middle" className={SUB}>
          la question utile : quelle méthode, quelles données, quelle évaluation ?
        </text>
      </svg>
    </figure>
  )
}

/**
 * Le même problème clinique traité des deux façons. Le parallèle visuel rend
 * la différence plus nette que le schéma abstrait des flèches inversées.
 */
export function FigureDeuxVoies() {
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 288"
        role="img"
        aria-label="Pour repérer un sepsis : à gauche un système expert applique des seuils écrits par un médecin ; à droite un modèle appris ajuste ses paramètres sur des milliers de séjours passés."
        className="h-auto w-full"
      >
        {ARROW}

        <text x="390" y="20" textAnchor="middle" className={LABEL}>
          Repérer un sepsis à l&rsquo;arrivée aux urgences
        </text>

        {/* Voie 1 : la règle écrite. */}
        <rect x="14" y="38" width="360" height="234" rx="10" className={BOX} strokeWidth="1.5" />
        <text x="194" y="62" textAnchor="middle" className="fill-current text-[13px] font-semibold">
          Système expert
        </text>

        <rect x="38" y="78" width="312" height="52" rx="6" className={BOX} strokeWidth="1.2" />
        <text x="194" y="99" textAnchor="middle" className="fill-current text-[12px]">
          Un médecin écrit les seuils
        </text>
        <text x="194" y="117" textAnchor="middle" className={SUB}>
          température, fréquence cardiaque, lactates
        </text>

        <line
          x1="194"
          y1="134"
          x2="194"
          y2="158"
          stroke="currentColor"
          strokeWidth="1.5"
          markerEnd="url(#ia-arrow)"
        />

        <rect x="38" y="164" width="312" height="52" rx="6" className={BOX} strokeWidth="1.2" />
        <text x="194" y="185" textAnchor="middle" className="fill-current text-[12px]">
          si T° &gt; 38,3 ET FC &gt; 90 ET lactates &gt; 2
        </text>
        <text x="194" y="203" textAnchor="middle" className={SUB}>
          la règle est lisible, ligne à ligne
        </text>

        <text x="194" y="240" textAnchor="middle" className={SUB}>
          ✓ on sait exactement pourquoi l&rsquo;alerte se déclenche
        </text>
        <text x="194" y="258" textAnchor="middle" className={SUB}>
          ✗ ne capte que ce que le médecin a su formuler
        </text>

        {/* Voie 2 : la règle apprise. */}
        <rect
          x="406"
          y="38"
          width="360"
          height="234"
          rx="10"
          className="fill-none stroke-blue-500"
          strokeWidth="1.5"
        />
        <text
          x="586"
          y="62"
          textAnchor="middle"
          className="fill-blue-500 text-[13px] font-semibold"
        >
          Apprentissage automatique
        </text>

        <rect
          x="430"
          y="78"
          width="312"
          height="52"
          rx="6"
          className="fill-none stroke-blue-500"
          strokeWidth="1.2"
        />
        <text x="586" y="99" textAnchor="middle" className="fill-current text-[12px]">
          40 000 séjours passés, issue connue
        </text>
        <text x="586" y="117" textAnchor="middle" className={SUB}>
          aucune règle fournie
        </text>

        <line
          x1="586"
          y1="134"
          x2="586"
          y2="158"
          className="stroke-blue-500"
          strokeWidth="1.5"
          markerEnd="url(#ia-arrow)"
        />

        <rect
          x="430"
          y="164"
          width="312"
          height="52"
          rx="6"
          className="fill-blue-500/15 stroke-blue-500"
          strokeWidth="2"
        />
        <text x="586" y="185" textAnchor="middle" className="fill-current text-[12px]">
          des milliers de paramètres ajustés
        </text>
        <text x="586" y="203" textAnchor="middle" className={SUB}>
          la règle n&rsquo;est écrite nulle part
        </text>

        <text x="586" y="240" textAnchor="middle" className={SUB}>
          ✓ capte des combinaisons qu&rsquo;on n&rsquo;aurait pas formulées
        </text>
        <text x="586" y="258" textAnchor="middle" className={SUB}>
          ✗ on ne peut plus lire la règle, seulement l&rsquo;évaluer
        </text>
      </svg>
    </figure>
  )
}

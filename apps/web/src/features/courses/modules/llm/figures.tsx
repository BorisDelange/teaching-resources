/**
 * Schémas des diapositives. Tous en SVG inline, tracés en `currentColor` pour
 * suivre le thème clair/sombre, avec une seule couleur signifiante par figure.
 */

import { pick, type Lang } from "@/lib/useLang";

const ARROW = (
  <defs>
    <marker
      id="fig-arrow"
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
);

const BOX = "fill-none stroke-current";
const LABEL = "fill-current text-[13px] font-medium";
const SUB = "fill-current text-[11px] opacity-60";

/** Prédiction du mot suivant : le contexte entre, une distribution sort. */
export function FigurePrediction() {
  const candidates = [
    { word: "antibiotique", p: 0.52 },
    { word: "traitement", p: 0.24 },
    { word: "examen", p: 0.14 },
    { word: "ananas", p: 0.02 },
  ];
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 260"
        role="img"
        aria-label="Le contexte entre dans le modèle, qui produit une distribution de probabilités sur le mot suivant, puis en tire un."
        className="h-auto w-full"
      >
        {ARROW}

        <g>
          <rect
            x="10"
            y="90"
            width="215"
            height="60"
            rx="8"
            className={BOX}
            strokeWidth="1.5"
          />
          <text x="117" y="115" textAnchor="middle" className={LABEL}>
            « Je prescris un… »
          </text>
          <text x="117" y="134" textAnchor="middle" className={SUB}>
            le contexte
          </text>
        </g>

        <g>
          <line
            x1="232"
            y1="120"
            x2="285"
            y2="120"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <rect
            x="292"
            y="80"
            width="120"
            height="80"
            rx="8"
            className={BOX}
            strokeWidth="1.5"
          />
          {/* Trois lignes centrées dans une boîte y=80..160 : la première
              baseline est posée pour que le bloc soit optiquement centré. */}
          <text x="352" y="107" textAnchor="middle" className={LABEL}>
            Modèle
          </text>
          <text x="352" y="126" textAnchor="middle" className={SUB}>
            des milliards de
          </text>
          <text x="352" y="141" textAnchor="middle" className={SUB}>
            paramètres
          </text>
        </g>

        <g>
          <line
            x1="419"
            y1="120"
            x2="472"
            y2="120"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <text x="600" y="30" textAnchor="middle" className={SUB}>
            distribution de probabilités
          </text>
          {candidates.map((c, k) => {
            const y = 48 + k * 42;
            const w = c.p * 210;
            return (
              <g key={c.word}>
                {/* Le mot retenu est encadré : le cadre suit la rangée plutôt
                    que des coordonnées fixes, sinon il recouvre l'étiquette. */}
                {k === 0 && (
                  <rect
                    x="472"
                    y={y - 2}
                    width="266"
                    height="40"
                    rx="8"
                    className="fill-none stroke-blue-500"
                    strokeWidth="2"
                  />
                )}
                <text x="480" y={y + 14} className={SUB}>
                  {c.word}
                </text>
                <rect
                  x="480"
                  y={y + 20}
                  width="210"
                  height="12"
                  rx="6"
                  className="fill-current opacity-10"
                />
                <rect
                  x="480"
                  y={y + 20}
                  width={w}
                  height="12"
                  rx="6"
                  className={
                    k === 0 ? "fill-blue-500" : "fill-current opacity-30"
                  }
                />
                <text x="700" y={y + 30} className={SUB}>
                  {Math.round(c.p * 100)} %
                </text>
              </g>
            );
          })}
        </g>

        <g>
          <text
            x="600"
            y="235"
            textAnchor="middle"
            className="fill-blue-500 text-[13px] font-semibold"
          >
            … puis on en tire un, et on recommence
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** Le pipeline du RAG en quatre étapes, avec le point de rupture signalé. */
export function FigureRag({ lang = "fr" }: { lang?: Lang } = {}) {
  const steps = [
    { label: pick(lang, "Découper", "Split"), sub: pick(lang, "en passages", "into chunks") },
    { label: pick(lang, "Indexer", "Index"), sub: pick(lang, "en vecteurs", "as vectors") },
    { label: pick(lang, "Récupérer", "Retrieve"), sub: pick(lang, "les plus proches", "the closest ones") },
    { label: pick(lang, "Générer", "Generate"), sub: pick(lang, "avec la source", "with the source") },
  ];
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 210"
        role="img"
        aria-label={pick(
          lang,
          "Un document est découpé, indexé en vecteurs, les passages proches de la question sont récupérés, puis envoyés au modèle qui génère la réponse.",
          "A document is split, indexed as vectors, the chunks closest to the question are retrieved, then sent to the model, which generates the answer.",
        )}
        className="h-auto w-full"
      >
        {ARROW}

        <g>
          <rect
            x="8"
            y="58"
            width="86"
            height="70"
            rx="8"
            className={BOX}
            strokeWidth="1.5"
          />
          <text x="51" y="88" textAnchor="middle" className={LABEL}>
            Document
          </text>
          <text x="51" y="106" textAnchor="middle" className={SUB}>
            43 pages
          </text>
        </g>

        {steps.map((s, k) => {
          const x = 130 + k * 158;
          return (
            <g key={s.label}>
              <line
                x1={x - 36}
                y1="93"
                x2={x - 8}
                y2="93"
                stroke="currentColor"
                strokeWidth="1.5"
                markerEnd="url(#fig-arrow)"
              />
              <rect
                x={x}
                y="58"
                width="122"
                height="70"
                rx="8"
                className={BOX}
                strokeWidth="1.5"
              />
              <circle cx={x + 61} cy="30" r="13" className="fill-amber-500" />
              <text
                x={x + 61}
                y="35"
                textAnchor="middle"
                className="fill-white text-[12px] font-bold"
              >
                {k + 1}
              </text>
              <text x={x + 61} y="92" textAnchor="middle" className={LABEL}>
                {s.label}
              </text>
              <text x={x + 61} y="110" textAnchor="middle" className={SUB}>
                {s.sub}
              </text>
            </g>
          );
        })}

        <g>
          <line
            x1="507"
            y1="140"
            x2="507"
            y2="168"
            stroke="currentColor"
            className="text-amber-500"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x="507"
            y="188"
            textAnchor="middle"
            className="fill-current text-[13px] font-semibold text-amber-600 dark:text-amber-400"
          >
            {pick(
              lang,
              "Si cette étape se trompe, tout le reste suit — et cite une page",
              "If this step goes wrong, everything else follows — and cites a page",
            )}
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** Les trois modes de mémoire, comparés sur ce qui part réellement. */
export function FigureMemory({ lang = "fr" }: { lang?: Lang } = {}) {
  const modes = [
    {
      title: pick(lang, "Aucune", "None"),
      bars: [{ w: 60, tone: "blue" }],
      note: pick(lang, "Le dernier message", "The last message"),
      cost: pick(lang, "Coût minimal, mais oublie tout", "Minimal cost, but forgets everything"),
    },
    {
      title: pick(lang, "Complète", "Full"),
      bars: [
        { w: 60, tone: "muted" },
        { w: 60, tone: "muted" },
        { w: 60, tone: "muted" },
        { w: 60, tone: "blue" },
      ],
      note: pick(lang, "Tout, recopié", "Everything, copied again"),
      cost: pick(lang, "Coût qui enfle, puis sature", "Cost that swells, then saturates"),
    },
    {
      title: pick(lang, "Résumée", "Summarised"),
      bars: [
        { w: 34, tone: "amber" },
        { w: 60, tone: "muted" },
        { w: 60, tone: "blue" },
      ],
      note: pick(lang, "Résumé + échanges récents", "Summary + recent exchanges"),
      cost: pick(lang, "Moins cher, mais approximatif", "Cheaper, but approximate"),
    },
  ];
  const tone: Record<string, string> = {
    blue: "fill-blue-500",
    amber: "fill-amber-500",
    muted: "fill-current opacity-25",
  };
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 210"
        role="img"
        aria-label={pick(
          lang,
          "Trois modes de mémoire : aucune n'envoie que le dernier message, complète renvoie tout l'historique, résumée condense l'ancien et garde les échanges récents.",
          "Three memory modes: none sends only the last message, full resends the whole history, summarised condenses older turns and keeps the recent exchanges.",
        )}
        className="h-auto w-full"
      >
        {modes.map((m, k) => {
          const x = 20 + k * 255;
          return (
            <g key={m.title}>
              <rect
                x={x}
                y="20"
                width="230"
                height="160"
                rx="10"
                className={BOX}
                strokeWidth="1.5"
              />
              <text
                x={x + 115}
                y="48"
                textAnchor="middle"
                className="fill-current text-[15px] font-semibold"
              >
                {m.title}
              </text>
              {m.bars.map((b, j) => (
                <rect
                  key={j}
                  x={x + 24}
                  y={68 + j * 20}
                  width={b.w * 2.6}
                  height="12"
                  rx="6"
                  className={tone[b.tone]}
                />
              ))}
              <text x={x + 115} y="152" textAnchor="middle" className={SUB}>
                {m.note}
              </text>
              <text x={x + 115} y="170" textAnchor="middle" className={SUB}>
                {m.cost}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 text-center text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            En{" "}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              bleu
            </span>{" "}
            votre question, en gris l'historique renvoyé, en{" "}
            <span className="font-medium text-amber-600 dark:text-amber-400">
              jaune
            </span>{" "}
            le résumé qui remplace les tours anciens.
          </>,
          <>
            In{" "}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              blue
            </span>{" "}
            your question, in grey the history sent back, in{" "}
            <span className="font-medium text-amber-600 dark:text-amber-400">
              yellow
            </span>{" "}
            the summary that replaces older turns.
          </>,
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Coût cumulé selon la stratégie de mémoire. Les valeurs ne sont pas
 * relevées mais calculées depuis un modèle simple et explicite : un tour
 * pèse TURN tokens (question + réponse), et le mode résumé remplace tout
 * ce qui dépasse KEEP tours récents par un résumé plafonné à SUMMARY.
 * L'objet de la figure est la FORME des deux courbes — quadratique contre
 * linéaire — pas des chiffres à retenir.
 */
export function FigureMemoryGrowth({ lang = "fr" }: { lang?: Lang } = {}) {
  const TURN = 600;
  const SUMMARY = 250;
  const KEEP = 2;
  const N = 12;

  const turns = Array.from({ length: N }, (_, i) => i + 1);

  // À chaque tour on renvoie l'historique puis on paie la réponse : le coût
  // du tour n est donc proportionnel à ce qui précède, d'où le cumul en n².
  let fullAcc = 0;
  const full = turns.map((n) => {
    fullAcc += (n - 1) * TURN + TURN;
    return fullAcc;
  });

  let sumAcc = 0;
  const summarised = turns.map((n) => {
    const kept = Math.min(n - 1, KEEP);
    const older = n - 1 - kept;
    sumAcc += (older > 0 ? SUMMARY : 0) + kept * TURN + TURN;
    return sumAcc;
  });

  const max = full[full.length - 1];
  const W = 780;
  const H = 320;
  const left = 78;
  const right = 700;
  const top = 46;
  const bottom = 250;

  const px = (n: number) => left + ((n - 1) / (N - 1)) * (right - left);
  const py = (v: number) => bottom - (v / max) * (bottom - top);
  const path = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i + 1)} ${py(v)}`).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  const fmt = (v: number) =>
    v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`;

  return (
    <figure className="not-prose my-6 text-[var(--color-foreground)]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={pick(
          lang,
          "Coût cumulé en tokens au fil des tours de conversation. Avec la mémoire complète la courbe s'incurve vers le haut et accélère ; avec la mémoire résumée elle reste presque une droite, très en dessous.",
          "Cumulative cost in tokens over the turns of a conversation. With full memory the curve bends upwards and accelerates; with summarised memory it stays almost a straight line, far below.",
        )}
        className="h-auto w-full"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={left}
              y1={py(v)}
              x2={right}
              y2={py(v)}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.12"
            />
            <text
              x={left - 10}
              y={py(v) + 4}
              textAnchor="end"
              className={SUB}
            >
              {fmt(v)}
            </text>
          </g>
        ))}

        <text x="20" y="26" className="fill-current text-[13px] font-semibold">
          {pick(
            lang,
            "Tokens payés depuis le début de la conversation",
            "Tokens paid since the start of the conversation",
          )}
        </text>

        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
        {turns
          .filter((n) => n % 2 === 0)
          .map((n) => (
            <text key={n} x={px(n)} y={bottom + 20} textAnchor="middle" className={SUB}>
              {n}
            </text>
          ))}
        <text
          x={(left + right) / 2}
          y={bottom + 42}
          textAnchor="middle"
          className={SUB}
        >
          {pick(
            lang,
            "numéro de l'échange dans la conversation",
            "exchange number in the conversation",
          )}
        </text>

        <path
          d={path(full)}
          fill="none"
          className="stroke-amber-500"
          strokeWidth="2.5"
        />
        <path
          d={path(summarised)}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth="2.5"
        />

        {full.map((v, i) => (
          <circle
            key={`f${i}`}
            cx={px(i + 1)}
            cy={py(v)}
            r="3"
            className="fill-amber-500"
          />
        ))}
        {summarised.map((v, i) => (
          <circle
            key={`s${i}`}
            cx={px(i + 1)}
            cy={py(v)}
            r="3"
            className="fill-emerald-500"
          />
        ))}

        <g>
          <text
            x={right + 10}
            y={py(full[full.length - 1]) + 4}
            className="fill-current text-[12px] font-semibold text-amber-600 dark:text-amber-400"
          >
            {pick(lang, "complète", "full")}
          </text>
          <text
            x={right + 10}
            y={py(summarised[summarised.length - 1]) + 4}
            className="fill-current text-[12px] font-semibold text-emerald-600 dark:text-emerald-400"
          >
            {pick(lang, "résumée", "summarised")}
          </text>
        </g>

        <g>
          <line
            x1={px(N)}
            y1={py(summarised[N - 1])}
            x2={px(N)}
            y2={py(full[N - 1])}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.5"
          />
          {/* Étiquette posée dans le creux entre les deux courbes, bien à
              gauche du trait de mesure : collée à celui-ci, elle recouvrait
              la courbe ambre qui passe juste derrière. */}
          <text
            x={px(N) - 16}
            y={(py(full[N - 1]) + py(summarised[N - 1])) / 2 + 34}
            textAnchor="end"
            className="fill-current text-[12px] font-semibold"
          >
            {pick(
              lang,
              `×${(full[N - 1] / summarised[N - 1]).toFixed(1)} au 12ᵉ échange`,
              `×${(full[N - 1] / summarised[N - 1]).toFixed(1)} at the 12th exchange`,
            )}
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          <>
            La courbe de la mémoire complète <strong>s'incurve vers le haut</strong>{" "}
            : chaque nouveau message renvoie tout ce qui précède, donc le coût d'un
            tour grandit avec le numéro du tour. Doubler la longueur d'une
            conversation en quadruple à peu près le coût. Ordres de grandeur
            calculés pour un tour moyen de 600 tokens et un résumé plafonné à 250.
          </>,
          <>
            The full-memory curve <strong>bends upwards</strong>: each new
            message resends everything before it, so the cost of a turn grows
            with the turn number. Doubling the length of a conversation roughly
            quadruples its cost. Orders of magnitude computed for an average
            turn of 600 tokens and a summary capped at 250.
          </>,
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Un message de l'utilisateur = deux appels au modèle quand le résumé se
 * déclenche. C'est le point que l'interface cache entièrement.
 */
export function FigureSummaryCall() {
  return (
    <figure className="not-prose my-6 text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 400"
        role="img"
        aria-label="Quand la conversation devient longue, l'application fait d'abord un appel au modèle pour résumer les échanges anciens, puis un second appel avec ce résumé et votre question. Vous n'avez envoyé qu'un message, mais deux requêtes sont parties."
        className="h-auto w-full"
      >
        {ARROW}

        <g>
          <rect
            x="20"
            y="176"
            width="118"
            height="52"
            rx="8"
            className={BOX}
            strokeWidth="1.5"
          />
          <text x="79" y="199" textAnchor="middle" className={LABEL}>
            Vous
          </text>
          <text x="79" y="216" textAnchor="middle" className={SUB}>
            « Et si allergie ? »
          </text>
          <text x="79" y="248" textAnchor="middle" className={SUB}>
            10 mots tapés
          </text>
        </g>

        <line
          x1="145"
          y1="202"
          x2="182"
          y2="202"
          stroke="currentColor"
          strokeWidth="1.5"
          markerEnd="url(#fig-arrow)"
        />

        <rect
          x="190"
          y="30"
          width="570"
          height="356"
          rx="12"
          className="fill-none stroke-current opacity-40"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        {/* Le cadre est un contenant, pas une donnée : il reste neutre, ce qui
            laisse le bleu signifier le seul appel dont vous voyez la réponse. */}
        <text
          x="206"
          y="52"
          className="fill-current text-[13px] font-semibold"
        >
          L'application — invisible pour vous
        </text>

        <g>
          <circle cx="228" cy="96" r="14" className="fill-amber-500" />
          <text
            x="228"
            y="101"
            textAnchor="middle"
            className="fill-white text-[12px] font-bold"
          >
            1
          </text>
          <rect
            x="254"
            y="70"
            width="486"
            height="98"
            rx="8"
            className="fill-amber-500/10 stroke-amber-500"
            strokeWidth="1.5"
          />
          <text
            x="270"
            y="92"
            className="fill-current text-[13px] font-semibold"
          >
            Appel de résumé
          </text>
          <text x="270" y="112" className={SUB}>
            « Voici la conversation jusqu'ici : […] Résume-la en 80 mots
            maximum,
          </text>
          <text x="270" y="128" className={SUB}>
            en conservant l'âge, le poids, la fonction rénale, les allergies. »
          </text>
          <text
            x="270"
            y="157"
            className="fill-current text-[12px] font-semibold text-amber-600 dark:text-amber-400"
          >
            → envoie tout l'historique, et paie une génération que vous ne
            verrez jamais
          </text>
        </g>

        <g>
          <path
            d="M 497 172 L 497 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <text x="509" y="190" className={SUB}>
            le résumé produit
          </text>
        </g>

        <g>
          <circle cx="228" cy="256" r="14" className="fill-blue-500" />
          <text
            x="228"
            y="261"
            textAnchor="middle"
            className="fill-white text-[12px] font-bold"
          >
            2
          </text>
          <rect
            x="254"
            y="208"
            width="486"
            height="134"
            rx="8"
            className="fill-blue-500/10 stroke-blue-500"
            strokeWidth="1.5"
          />
          <text
            x="270"
            y="230"
            className="fill-current text-[13px] font-semibold"
          >
            Appel de réponse
          </text>
          {[
            "Consigne système",
            "Résumé des tours anciens (à la place des transcriptions)",
            "Les derniers échanges, mot pour mot",
            "Votre question",
          ].map((label, k) => (
            <text key={label} x="278" y={252 + k * 19} className={SUB}>
              • {label}
            </text>
          ))}
          <text
            x="270"
            y="332"
            className="fill-current text-[12px] font-semibold text-blue-600 dark:text-blue-400"
          >
            → c'est cet appel-là, et lui seul, dont vous voyez la réponse
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        Un seul message de votre part,{" "}
        <strong>deux requêtes facturées</strong>. Le résumé est lui-même une
        génération : il coûte, il prend du temps, et il peut se tromper. Les
        applications ne le déclenchent donc pas à chaque tour, mais seulement
        quand l'historique devient trop lourd.
      </figcaption>
    </figure>
  );
}

/**
 * Le paradoxe central : trois sujets empilés dans une même conversation, et
 * une question de dix mots qui renvoie l'intégralité des trois.
 */
export function FigureTopicDrift() {
  const topics = [
    {
      name: "Sujet 1 · Pyélonéphrite",
      detail: "cas clinique, posologies, adaptation rénale",
      tokens: 50_000,
      tone: "fill-blue-500/25 stroke-blue-500",
    },
    {
      name: "Sujet 2 · Relecture d'un article",
      detail: "PDF joint, méthodologie, tableaux de résultats",
      tokens: 100_000,
      tone: "fill-amber-500/25 stroke-amber-500",
    },
    {
      name: "Sujet 3 · Courrier de sortie",
      detail: "brouillons successifs, reformulations",
      tokens: 30_000,
      tone: "fill-emerald-500/25 stroke-emerald-500",
    },
  ];
  const total = topics.reduce((s, t) => s + t.tokens, 0);

  const left = 30;
  const width = 470;
  const top = 62;
  const scale = 150 / total;
  let y = top;

  return (
    <figure className="not-prose my-6 text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 330"
        role="img"
        aria-label="Une conversation qui a couvert trois sujets accumule 180 000 tokens d'historique. Poser une quatrième question de dix mots renvoie l'intégralité de ces trois sujets au modèle."
        className="h-auto w-full"
      >
        {ARROW}

        <text x={left} y="30" className="fill-current text-[13px] font-semibold">
          Une seule conversation, trois sujets enchaînés
        </text>
        <text x={left} y="48" className={SUB}>
          L'historique accumulé, à l'échelle
        </text>

        {topics.map((t) => {
          const h = t.tokens * scale;
          const ty = y;
          y += h + 6;
          // Les blocs sont proportionnels au poids du sujet : le plus léger
          // n'a pas la place d'une seconde ligne. Le texte est donc posé par
          // rapport au CENTRE du bloc, et non à son bord haut, sinon il
          // déborde dès que la hauteur se réduit.
          const mid = ty + h / 2;
          const roomy = h > 44;
          return (
            <g key={t.name}>
              <rect
                x={left}
                y={ty}
                width={width}
                height={h}
                rx="6"
                className={t.tone}
                strokeWidth="1.5"
              />
              <text
                x={left + 16}
                y={roomy ? mid - 2 : mid + 4}
                className="fill-current text-[12px] font-semibold"
              >
                {t.name}
              </text>
              {roomy && (
                <text x={left + 16} y={mid + 15} className={SUB}>
                  {t.detail}
                </text>
              )}
              <text
                x={left + width - 16}
                y={roomy ? mid - 2 : mid + 4}
                textAnchor="end"
                className="fill-current text-[12px] font-semibold tabular-nums"
              >
                {t.tokens.toLocaleString("fr-FR")}
              </text>
            </g>
          );
        })}

        <g>
          <rect
            x={left}
            y={y + 6}
            width={width}
            height="30"
            rx="6"
            className="fill-current opacity-10"
          />
          <text
            x={left + 16}
            y={y + 26}
            className="fill-current text-[12px] font-semibold"
          >
            Sujet 4 · « Et pour un enfant ? »
          </text>
          <text
            x={left + width - 16}
            y={y + 26}
            textAnchor="end"
            className="fill-current text-[12px] font-semibold tabular-nums"
          >
            12
          </text>
        </g>

        <g>
          <path
            d={`M ${left + width + 12} ${y + 21} L ${left + width + 66} ${y + 21} L ${left + width + 66} 150`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.4"
          />
          <line
            x1={left + width + 66}
            y1="150"
            x2={left + width + 108}
            y2="150"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
        </g>

        <g>
          <rect
            x="646"
            y="96"
            width="112"
            height="108"
            rx="8"
            className="fill-none stroke-red-500"
            strokeWidth="2"
          />
          <text
            x="702"
            y="126"
            textAnchor="middle"
            className="fill-current text-[12px] font-semibold"
          >
            Ce qui part
          </text>
          <text
            x="702"
            y="156"
            textAnchor="middle"
            className="fill-current text-[19px] font-bold"
          >
            {(total + 12).toLocaleString("fr-FR")}
          </text>
          <text x="702" y="176" textAnchor="middle" className={SUB}>
            tokens
          </text>
          <text x="702" y="192" textAnchor="middle" className={SUB}>
            à chaque message
          </text>
        </g>

        <text
          x={left}
          y="312"
          className="fill-current text-[13px] font-semibold"
        >
          Vous tapez 12 tokens. Vous en envoyez {(total + 12).toLocaleString("fr-FR")}.
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        Les deux premiers sujets n'ont plus rien à voir avec la question posée,
        mais ils repartent quand même — intégralement, et à chaque nouveau
        message. Ouvrir une conversation neuve les aurait fait disparaître.
      </figcaption>
    </figure>
  );
}

/**
 * De la phrase au vecteur unique : chaque token porte des coordonnées, et le
 * passage entier se ramène à une moyenne. C'est ce qui explique la dilution
 * des mots discriminants dans un passage long.
 */
export function FigureEmbedding() {
  const tokens = [
    { t: "PNA", v: [0.82, 0.41, -0.12], key: true },
    { t: "simple", v: [0.44, 0.63, 0.21], key: true },
    { t: "sans", v: [0.05, -0.18, 0.44], key: false },
    { t: "signe", v: [0.21, 0.12, 0.38], key: false },
    { t: "de", v: [-0.02, 0.03, 0.09], key: false },
    { t: "gravité", v: [0.58, 0.29, -0.31], key: true },
  ];
  const mean = [0, 1, 2].map(
    (d) => tokens.reduce((s, t) => s + t.v[d], 0) / tokens.length,
  );

  const left = 40;
  const colW = 92;
  const top = 92;

  return (
    <figure className="not-prose my-6 text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 330"
        role="img"
        aria-label="Chaque token du passage reçoit un vecteur de coordonnées ; le vecteur du passage entier est la moyenne de ces vecteurs. Les mots peu porteurs de sens tirent la moyenne vers eux."
        className="h-auto w-full"
      >
        {ARROW}

        <text x="20" y="30" className="fill-current text-[13px] font-semibold">
          « PNA simple sans signe de gravité »
        </text>
        <text x="20" y="48" className={SUB}>
          un passage du document, découpé en tokens
        </text>

        {tokens.map((tok, k) => {
          const x = left + k * colW;
          return (
            <g key={tok.t}>
              <rect
                x={x}
                y={top}
                width={colW - 12}
                height="34"
                rx="6"
                className={
                  tok.key
                    ? "fill-blue-500/20 stroke-blue-500"
                    : "fill-current stroke-current opacity-20"
                }
                strokeWidth="1.5"
              />
              <text
                x={x + (colW - 12) / 2}
                y={top + 22}
                textAnchor="middle"
                className="fill-current font-mono text-[12px]"
              >
                {tok.t}
              </text>
              {tok.v.map((c, d) => (
                <text
                  key={d}
                  x={x + (colW - 12) / 2}
                  y={top + 56 + d * 17}
                  textAnchor="middle"
                  className="fill-current font-mono text-[11px] opacity-70 tabular-nums"
                >
                  {c.toFixed(2)}
                </text>
              ))}
              <line
                x1={x + (colW - 12) / 2}
                y1={top + 118}
                x2={x + (colW - 12) / 2}
                y2={top + 140}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.35"
              />
            </g>
          );
        })}

        <text x="14" y={top + 78} textAnchor="start" className={SUB}>
          coord.
        </text>

        <g>
          <rect
            x={left}
            y={top + 146}
            width={colW * tokens.length - 12}
            height="34"
            rx="6"
            className="fill-emerald-500/15 stroke-emerald-500"
            strokeWidth="1.5"
          />
          <text
            x={left + (colW * tokens.length - 12) / 2}
            y={top + 168}
            textAnchor="middle"
            className="fill-current text-[12px] font-semibold"
          >
            moyenne des vecteurs ={" "}
            <tspan className="font-mono">
              [{mean.map((m) => m.toFixed(2)).join(", ")}]
            </tspan>
          </text>
        </g>

        <text
          x={left}
          y={top + 208}
          className="fill-current text-[12px] font-semibold text-emerald-600 dark:text-emerald-400"
        >
          → un seul vecteur représente désormais tout le passage
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        Trois coordonnées sont montrées ici ; un vrai modèle d'embedding en
        produit plusieurs centaines. Le point à retenir est la{" "}
        <strong>moyenne</strong> : les mots qui portent le sens (en bleu) sont
        noyés parmi les mots outils. Plus un passage est long, plus les mots
        qui le distinguent pèsent peu — d'où l'importance de bien découper.
      </figcaption>
    </figure>
  );
}

/**
 * Le chunk orphelin : coupé de ses titres, un passage devient ambigu. Le
 * remède tient en une ligne — recoller le chemin de titres avant d'indexer.
 */
export function FigureChunkContext({ lang = "fr" }: { lang?: Lang } = {}) {
  const body = pick(
    lang,
    [
      "« 1e intention : fluoroquinolones par voie orale :",
      "ciprofloxacine 500 mg 2 fois par jour… ;",
      "2e intention : ceftriaxone (IM, IV) 1 g par jour. »",
    ],
    [
      "“First line: oral fluoroquinolones:",
      "ciprofloxacin 500 mg twice daily…;",
      "second line: ceftriaxone (IM, IV) 1 g once daily.”",
    ],
  );

  return (
    <figure className="not-prose my-6 text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 400"
        role="img"
        aria-label={pick(
          lang,
          "Un passage découpé sans ses titres est ambigu : il pourrait provenir du chapitre sur les cystites comme de celui sur les pyélonéphrites. En recollant le chemin de titres avant l'indexation, l'ambiguïté disparaît.",
          "A chunk cut away from its headings is ambiguous: it could come from the chapter on cystitis as well as the one on pyelonephritis. Pasting the heading path back in front before indexing removes the ambiguity.",
        )}
        className="h-auto w-full"
      >
        {ARROW}

        <text x="20" y="28" className="fill-current text-[13px] font-semibold">
          {pick(lang, "Le même passage, découpé de deux façons", "The same passage, chunked in two ways")}
        </text>

        <g>
          <text
            x="20"
            y="62"
            className="fill-current text-[12px] font-semibold text-red-600 dark:text-red-400"
          >
            {pick(lang, "Découpage naïf — le passage seul", "Naive chunking — the passage alone")}
          </text>
          <rect
            x="20"
            y="74"
            width="440"
            height="82"
            rx="8"
            className="fill-red-500/8 stroke-red-500"
            strokeWidth="1.5"
          />
          {body.map((line, k) => (
            <text
              key={line}
              x="36"
              y={98 + k * 20}
              className="fill-current font-mono text-[11px]"
            >
              {line}
            </text>
          ))}

          <line
            x1="466"
            y1="115"
            x2="508"
            y2="115"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <rect
            x="516"
            y="74"
            width="244"
            height="82"
            rx="8"
            className="fill-none stroke-current"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            opacity="0.5"
          />
          <text
            x="638"
            y="98"
            textAnchor="middle"
            className="fill-current text-[12px] font-semibold"
          >
            {pick(lang, "Traitement de quoi ?", "Treatment of what?")}
          </text>
          <text x="638" y="120" textAnchor="middle" className={SUB}>
            {pick(lang, "PNA simple ? À risque de complication ?", "Uncomplicated APN? At risk of complications?")}
          </text>
          <text x="638" y="138" textAnchor="middle" className={SUB}>
            {pick(lang, "Cystite ? Grossesse ?", "Cystitis? Pregnancy?")}
          </text>
        </g>

        <g>
          <text
            x="20"
            y="212"
            className="fill-current text-[12px] font-semibold text-emerald-600 dark:text-emerald-400"
          >
            {pick(lang, "Découpage soigné — le chemin de titres est recollé devant", "Careful chunking — the heading path is pasted back in front")}
          </text>
          <rect
            x="20"
            y="224"
            width="440"
            height="128"
            rx="8"
            className="fill-emerald-500/8 stroke-emerald-500"
            strokeWidth="1.5"
          />
          <text
            x="36"
            y="248"
            className="fill-current font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
          >
            {pick(lang, "Fiche HAS 2025 > Pyélonéphrite aiguë simple >", "HAS 2025 guideline > Uncomplicated acute pyelonephritis >")}
          </text>
          <text
            x="36"
            y="266"
            className="fill-current font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
          >
            {pick(lang, "Traitement probabiliste", "Empirical treatment")}
          </text>
          {body.map((line, k) => (
            <text
              key={line}
              x="36"
              y={294 + k * 20}
              className="fill-current font-mono text-[11px]"
            >
              {line}
            </text>
          ))}

          <line
            x1="466"
            y1="288"
            x2="508"
            y2="288"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <rect
            x="516"
            y="252"
            width="244"
            height="72"
            rx="8"
            className="fill-emerald-500/10 stroke-emerald-500"
            strokeWidth="1.5"
          />
          <text
            x="638"
            y="278"
            textAnchor="middle"
            className="fill-current text-[12px] font-semibold"
          >
            {pick(lang, "Sans ambiguïté", "Unambiguous")}
          </text>
          <text x="638" y="300" textAnchor="middle" className={SUB}>
            {pick(lang, "Retrouvable, et citable", "Retrievable, and citable")}
          </text>
        </g>

        <text
          x="20"
          y="384"
          className="fill-current text-[12px] font-semibold"
        >
          {pick(lang, "La façon d'indexer un document décide de ce qu'on pourra y retrouver.", "How a document is indexed decides what can be found in it.")}
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          "Le passage de gauche est pourtant exact, mot pour mot. Détaché de ses titres, il devient une posologie sans indication — et rien, dans le texte lui-même, ne signale qu'il manque quelque chose.",
          "Yet the passage on the left is accurate, word for word. Cut away from its headings, it becomes a dosage without an indication — and nothing in the text itself signals that something is missing.",
        )}
      </figcaption>
    </figure>
  );
}

/** La fenêtre de contexte : tout entre dedans, et ça déborde. */
export function FigureContext() {
  const parts = [
    { label: "Consigne système", w: 90, tone: "fill-current opacity-30" },
    { label: "Historique", w: 210, tone: "fill-current opacity-45" },
    { label: "Documents joints", w: 260, tone: "fill-amber-500" },
    { label: "Votre question", w: 110, tone: "fill-blue-500" },
  ];
  let x = 40;
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 200"
        role="img"
        aria-label="La fenêtre de contexte contient la consigne système, l'historique, les documents joints et la question ; au-delà de la limite, le contenu déborde et est oublié."
        className="h-auto w-full"
      >
        <g>
          <rect
            x="40"
            y="60"
            width="600"
            height="56"
            rx="8"
            className={BOX}
            strokeWidth="2"
          />
          <text x="40" y="46" className={SUB}>
            fenêtre de contexte
          </text>
          <line
            x1="640"
            y1="46"
            x2="640"
            y2="130"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <text
            x="648"
            y="96"
            className="fill-current text-[12px] font-semibold"
          >
            limite
          </text>
        </g>

        {parts.map((p) => {
          const px = x;
          x += p.w;
          return (
            <g key={p.label}>
              <rect
                x={px}
                y="62"
                width={p.w - 3}
                height="52"
                className={p.tone}
              />
              <text
                x={px + (p.w - 3) / 2}
                y="140"
                textAnchor="middle"
                className={SUB}
              >
                {p.label}
              </text>
            </g>
          );
        })}

        <g>
          <rect
            x="640"
            y="62"
            width="70"
            height="52"
            className="fill-red-500 opacity-70"
          />
          <text
            x="675"
            y="164"
            textAnchor="middle"
            className="fill-current text-[13px] font-semibold text-red-600 dark:text-red-400"
          >
            oublié
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** Tokenisation : un terme médical coûte plusieurs tokens. */
export function FigureTokens() {
  const tokens = [
    { t: "Le", med: false },
    { t: "patient", med: false },
    { t: "présente", med: false },
    { t: "une", med: false },
    { t: "tachy", med: true },
    { t: "card", med: true },
    { t: "ie", med: true },
    { t: "ventri", med: true },
    { t: "culaire", med: true },
  ];
  let x = 20;
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 150"
        role="img"
        aria-label="La phrase est découpée en tokens ; le terme tachycardie ventriculaire compte à lui seul cinq tokens."
        className="h-auto w-full"
      >
        {tokens.map((tok, k) => {
          const w = tok.t.length * 13 + 26;
          const px = x;
          x += w + 8;
          return (
            <g key={k}>
              <rect
                x={px}
                y="40"
                width={w}
                height="44"
                rx="7"
                className={
                  tok.med
                    ? "fill-amber-500/20 stroke-amber-500"
                    : "fill-blue-500/15 stroke-blue-500"
                }
                strokeWidth="1.5"
              />
              <text
                x={px + w / 2}
                y="68"
                textAnchor="middle"
                className="fill-current font-mono text-[14px]"
              >
                {tok.t}
              </text>
            </g>
          );
        })}
        <g>
          <line
            x1="322"
            y1="96"
            x2="700"
            y2="96"
            className="stroke-amber-500"
            strokeWidth="1.5"
          />
          <text
            x="511"
            y="122"
            textAnchor="middle"
            className="fill-current text-[14px] font-semibold text-amber-600 dark:text-amber-400"
          >
            un seul concept médical = 5 tokens
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** L'application autour du modèle : ce qui est vraiment envoyé. */
export function FigureApplication() {
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 230"
        role="img"
        aria-label="Ce que vous tapez passe par l'application, qui ajoute la consigne système, l'historique et les documents avant d'envoyer le tout au modèle."
        className="h-auto w-full"
      >
        {ARROW}

        <g>
          <rect
            x="10"
            y="88"
            width="120"
            height="54"
            rx="8"
            className={BOX}
            strokeWidth="1.5"
          />
          <text x="70" y="120" textAnchor="middle" className={LABEL}>
            Vous
          </text>
        </g>

        <g>
          <line
            x1="137"
            y1="115"
            x2="182"
            y2="115"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <rect
            x="190"
            y="26"
            width="290"
            height="180"
            rx="10"
            className="fill-none stroke-blue-500"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text
            x="335"
            y="48"
            textAnchor="middle"
            className="fill-blue-500 text-[13px] font-semibold"
          >
            l'application
          </text>
          {[
            "Consigne système",
            "Historique complet",
            "Documents joints",
            "Votre question",
          ].map((label, k) => (
            <g key={label}>
              <rect
                x="212"
                y={62 + k * 34}
                width="246"
                height="26"
                rx="5"
                className={
                  k === 3
                    ? "fill-blue-500/25 stroke-blue-500"
                    : "fill-current opacity-10"
                }
                strokeWidth="1"
              />
              <text
                x="335"
                y={80 + k * 34}
                textAnchor="middle"
                className="fill-current text-[12px]"
              >
                {label}
              </text>
            </g>
          ))}
        </g>

        <g>
          <line
            x1="487"
            y1="115"
            x2="532"
            y2="115"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <rect
            x="540"
            y="76"
            width="150"
            height="78"
            rx="8"
            className={BOX}
            strokeWidth="1.5"
          />
          <text x="615" y="110" textAnchor="middle" className={LABEL}>
            Modèle
          </text>
          <text x="615" y="130" textAnchor="middle" className={SUB}>
            sans mémoire
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** La pile des quatre blocs reconstruite à chaque message. */
export function FigurePayload({
  docsNote,
  lang = "fr",
}: {
  /** Remplace la légende du bloc « Documents joints », pour le mettre en avant. */
  docsNote?: string;
  lang?: Lang;
} = {}) {
  const blocks = [
    {
      label: pick(lang, "Consigne système", "System prompt"),
      example: pick(
        lang,
        "« Réponds de façon concise, ton interlocuteur est médecin. »",
        "“Answer concisely, you are talking to a doctor.”",
      ),
      sub: pick(lang, "Écrite par l'éditeur, jamais affichée", "Written by the vendor, never shown"),
      tone: "fill-current opacity-[0.05]",
      stroke: "stroke-current opacity-40",
    },
    {
      label: pick(lang, "Historique de la conversation", "Conversation history"),
      example: pick(
        lang,
        "Vos questions et les réponses précédentes, recopiées",
        "Your questions and the previous answers, copied again",
      ),
      sub: pick(lang, "Repayé intégralement à chaque tour", "Paid for again in full at every turn"),
      tone: "fill-current opacity-[0.05]",
      stroke: "stroke-current opacity-40",
    },
    {
      label: pick(lang, "Documents joints", "Attached documents"),
      example: pick(
        lang,
        "Le texte extrait du PDF, ou les passages retrouvés par le RAG",
        "The text extracted from the PDF, or the chunks retrieved by RAG",
      ),
      sub: docsNote ?? pick(lang, "Recopiés devant votre question", "Copied before your question"),
      tone: "fill-amber-500/15",
      stroke: "stroke-amber-500",
    },
    {
      label: pick(lang, "Votre question", "Your question"),
      example: pick(
        lang,
        "« Quel antibiotique pour cette pyélonéphrite ? »",
        "“Which antibiotic for this pyelonephritis?”",
      ),
      sub: pick(lang, "La seule partie que vous voyez", "The only part you see"),
      tone: "fill-blue-500/20",
      stroke: "stroke-blue-500",
    },
  ];
  const h = 62;
  const gap = 8;
  const top = 46;
  const stackLeft = 20;
  const stackW = 560;
  const stackBottom = top + blocks.length * (h + gap) - gap;
  // La boucle de retour longe la pile par la droite ; le modèle est dessous,
  // dans son axe.
  const loopX = stackLeft + stackW + 62;
  const modelY = stackBottom + 46;
  const modelH = 52;
  const centerX = stackLeft + stackW / 2;
  // La boucle revient sur le titre, à mi-hauteur de sa ligne, juste après
  // son dernier mot (titre centré d'environ 300 px de large).
  const titleY = 19;
  const titleEnd = centerX + 170;

  return (
    <figure className="not-prose my-6 text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 428"
        role="img"
        aria-label={pick(
          lang,
          "À chaque message, l'application empile la consigne système, l'historique de la conversation, les documents joints et votre question, puis envoie le tout au modèle placé en dessous, qui ne garde rien entre deux appels ; au message suivant, la pile entière est reconstruite.",
          "With every message, the application stacks the system prompt, the conversation history, the attached documents and your question, then sends it all to the model below, which keeps nothing between two calls; with the next message, the whole stack is rebuilt.",
        )}
        className="h-auto w-full"
      >
        {ARROW}

        <text
          x={centerX}
          y="24"
          textAnchor="middle"
          className="fill-current text-[13px] font-semibold"
        >
          {pick(
            lang,
            "Ce que l'application envoie, à chaque message",
            "What the application sends, with every message",
          )}
        </text>

        {blocks.map((b, k) => (
          <g key={b.label}>
            <rect
              x={stackLeft}
              y={top + k * (h + gap)}
              width={stackW}
              height={h}
              rx="8"
              className={`${b.tone} ${b.stroke}`}
              strokeWidth="1.5"
            />
            <text
              x={stackLeft + 20}
              y={top + k * (h + gap) + 25}
              className="fill-current text-[13px] font-semibold"
            >
              {k + 1}. {b.label}
            </text>
            <text
              x={stackLeft + 20}
              y={top + k * (h + gap) + 43}
              className={SUB}
            >
              {b.example}
            </text>
            <text
              x={stackLeft + stackW - 20}
              y={top + k * (h + gap) + 25}
              textAnchor="end"
              className={SUB}
            >
              {b.sub}
            </text>
          </g>
        ))}

        <g>
          <line
            x1={centerX}
            y1={stackBottom + 4}
            x2={centerX}
            y2={modelY - 8}
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <rect
            x={centerX - 108}
            y={modelY}
            width="216"
            height={modelH}
            rx="8"
            className={BOX}
            strokeWidth="1.5"
          />
          <text
            x={centerX}
            y={modelY + 22}
            textAnchor="middle"
            className={LABEL}
          >
            {pick(lang, "Modèle", "Model")}
          </text>
          <text
            x={centerX}
            y={modelY + 40}
            textAnchor="middle"
            className={SUB}
          >
            {pick(lang, "Sans état : ne garde rien", "Stateless: keeps nothing")}
          </text>
        </g>

        {/* Boucle en neutre : le bleu désigne déjà votre question et l'ambre
            les documents ; en reprendre un ici brouillerait la lecture. */}
        <g>
          <path
            d={`M ${centerX + 108} ${modelY + modelH / 2} L ${loopX} ${modelY + modelH / 2} L ${loopX} ${titleY} L ${titleEnd} ${titleY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            markerEnd="url(#fig-arrow)"
          />
          <text
            x={loopX + 12}
            y={top + 96}
            className="fill-current text-[12px] font-medium"
          >
            {pick(
              lang,
              ["Au message", "suivant, la pile", "entière est", "reconstruite", "et renvoyée"],
              ["With the next", "message, the", "whole stack is", "rebuilt and", "sent again"],
            ).map((line, k) => (
              <tspan key={k} x={loopX + 12} dy={k === 0 ? "0" : "16"}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          "Seul le bloc 4 vient de vous ; les trois autres sont ajoutés par l'application. Tous sont facturés.",
          "Only block 4 comes from you; the other three are added by the application. All of them are billed.",
        )}
      </figcaption>
    </figure>
  );
}

/** Corpus hétérogène : tout est appris sans hiérarchie de qualité. */
export function FigureCorpus() {
  const sources = [
    {
      label: "Recommandations",
      tone: "stroke-emerald-500 fill-emerald-500/10",
    },
    { label: "Publications", tone: "stroke-emerald-500 fill-emerald-500/10" },
    { label: "Forums de patients", tone: "stroke-amber-500 fill-amber-500/10" },
    { label: "Web généraliste", tone: "stroke-amber-500 fill-amber-500/10" },
  ];
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 230"
        role="img"
        aria-label="Des sources de qualité très inégale alimentent le même entraînement, sans hiérarchie explicite entre elles."
        className="h-auto w-full"
      >
        {ARROW}
        {sources.map((s, k) => (
          <g key={s.label}>
            <rect
              x="10"
              y={16 + k * 52}
              width="230"
              height="40"
              rx="7"
              className={s.tone}
              strokeWidth="1.5"
            />
            <text
              x="125"
              y={41 + k * 52}
              textAnchor="middle"
              className="fill-current text-[13px]"
            >
              {s.label}
            </text>
            <line
              x1="248"
              y1={36 + k * 52}
              x2="330"
              y2="115"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.4"
              markerEnd="url(#fig-arrow)"
            />
          </g>
        ))}

        <g>
          <rect
            x="340"
            y="82"
            width="150"
            height="66"
            rx="8"
            className="fill-none stroke-emerald-500"
            strokeWidth="2"
          />
          <text x="415" y="106" textAnchor="middle" className={LABEL}>
            Filtres qualité
          </text>
          <text x="415" y="124" textAnchor="middle" className={SUB}>
            doublons, contenus
          </text>
          <text x="415" y="139" textAnchor="middle" className={SUB}>
            offensants, forme
          </text>
          <line
            x1="497"
            y1="115"
            x2="545"
            y2="115"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />
          <rect
            x="553"
            y="82"
            width="150"
            height="66"
            rx="8"
            className="fill-none stroke-blue-500"
            strokeWidth="2"
          />
          <text x="628" y="112" textAnchor="middle" className={LABEL}>
            Le modèle
          </text>
          <text x="628" y="131" textAnchor="middle" className={SUB}>
            connaissance figée
          </text>
          <text
            x="415"
            y="186"
            textAnchor="middle"
            className="fill-current text-[13px] font-semibold text-amber-600 dark:text-amber-400"
          >
            mais aucun filtre ne juge la validité médicale
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** Les trois étapes de l'entraînement, et ce que la dernière fabrique. */
export function FigureTraining() {
  const stages = [
    {
      n: "1",
      label: "Pré-entraînement",
      sub: "prédire le mot suivant",
      tone: "stroke-sky-500",
    },
    {
      n: "2",
      label: "Instructions",
      sub: "devient un chatbot",
      tone: "stroke-blue-500",
    },
    {
      n: "3",
      label: "Retours humains",
      sub: "réponses préférées",
      tone: "stroke-indigo-500",
    },
  ];
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 190"
        role="img"
        aria-label="Trois étapes d'entraînement : pré-entraînement, ajustement sur instructions, puis alignement par retours humains."
        className="h-auto w-full"
      >
        {ARROW}
        {stages.map((s, k) => {
          const x = 30 + k * 250;
          return (
            <g key={s.n}>
              {k > 0 && (
                <line
                  x1={x - 34}
                  y1="80"
                  x2={x - 8}
                  y2="80"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  markerEnd="url(#fig-arrow)"
                />
              )}
              <rect
                x={x}
                y="42"
                width="216"
                height="76"
                rx="9"
                className={`fill-none ${s.tone}`}
                strokeWidth="2"
              />
              <circle
                cx={x + 30}
                cy="70"
                r="15"
                className="fill-current opacity-10"
              />
              <text
                x={x + 30}
                y="76"
                textAnchor="middle"
                className="fill-current text-[14px] font-bold"
              >
                {s.n}
              </text>
              <text x={x + 60} y="70" className={LABEL}>
                {s.label}
              </text>
              <text x={x + 60} y="90" className={SUB}>
                {s.sub}
              </text>
            </g>
          );
        })}
        <g>
          <line
            x1="638"
            y1="128"
            x2="638"
            y2="150"
            className="stroke-amber-500"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x="638"
            y="172"
            textAnchor="middle"
            className="fill-current text-[13px] font-semibold text-amber-600 dark:text-amber-400"
          >
            noté sur la justesse apparente
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** La taille des modèles, et la façon dont chacun se trompe. */
export function FigureSize() {
  const models = [
    { name: "4 B", r: 16 },
    { name: "8 B", r: 22 },
    { name: "24 B", r: 34 },
    { name: "70 B", r: 52 },
  ];
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 200"
        role="img"
        aria-label="Quatre modèles de tailles croissantes, de 4 à 70 milliards de paramètres : le petit se trompe visiblement, le gros se trompe de façon crédible."
        className="h-auto w-full"
      >
        {models.map((m, k) => {
          const cx = 110 + k * 190;
          return (
            <g key={m.name}>
              <circle
                cx={cx}
                cy="80"
                r={m.r}
                className="fill-blue-500/20 stroke-blue-500"
                strokeWidth="2"
              />
              <text
                x={cx}
                y="150"
                textAnchor="middle"
                className="fill-current text-[15px] font-semibold"
              >
                {m.name}
              </text>
            </g>
          );
        })}
        <line
          x1="40"
          y1="172"
          x2="740"
          y2="172"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
          markerEnd="url(#fig-arrow)"
        />
        {ARROW}
        <text x="60" y="192" className={SUB}>
          se trompe visiblement
        </text>
        <text
          x="720"
          y="192"
          textAnchor="end"
          className="fill-current text-[11px] font-semibold text-amber-600 dark:text-amber-400"
        >
          se trompe de façon crédible
        </text>
      </svg>
    </figure>
  );
}

/** Les chiffres de l'étude sur les hallucinations médicales. */
export function FigureHallucination() {
  const stats = [
    {
      value: "91,8 %",
      label: "des cliniciens en ont déjà rencontré une",
      tone: "text-red-500",
    },
    {
      value: "84,7 %",
      label: "la jugent susceptible de causer un tort",
      tone: "text-amber-500",
    },
  ];
  return (
    <div className="not-prose">
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <div
            key={s.value}
            className="rounded-xl border bg-[var(--color-card)] p-6 text-center"
          >
            <p className={`text-5xl font-bold tabular-nums ${s.tone}`}>
              {s.value}
            </p>
            <p className="mt-3 text-base leading-snug text-[var(--color-muted-foreground)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Le paradoxe de la vérification, en boucle fermée. */
export function FigureParadox({ lang = "fr" }: { lang?: Lang } = {}) {
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 200"
        role="img"
        aria-label={pick(
          lang,
          "Pour vérifier une réponse il faut connaître la réponse, mais on interroge parce qu'on ne la connaît pas : la boucle est fermée.",
          "To check an answer you need to know the answer, but you ask because you don't know it: the loop is closed.",
        )}
        className="h-auto w-full"
      >
        {/* Un marqueur n'hérite pas du `stroke` du tracé qui l'appelle : sans
            cette version rouge, les têtes resteraient de la couleur du texte. */}
        <defs>
          <marker
            id="fig-arrow-red"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-red-500" />
          </marker>
        </defs>
        <g>
          <rect
            x="40"
            y="60"
            width="240"
            height="70"
            rx="9"
            className={BOX}
            strokeWidth="1.5"
          />
          <text x="160" y="90" textAnchor="middle" className={LABEL}>
            {pick(lang, "J'interroge le modèle", "I ask the model")}
          </text>
          <text x="160" y="110" textAnchor="middle" className={SUB}>
            {pick(lang, "parce que je ne sais pas", "because I don't know")}
          </text>

          <rect
            x="500"
            y="60"
            width="240"
            height="70"
            rx="9"
            className={BOX}
            strokeWidth="1.5"
          />
          <text x="620" y="90" textAnchor="middle" className={LABEL}>
            {pick(lang, "Pour vérifier sa réponse", "To check its answer")}
          </text>
          <text x="620" y="110" textAnchor="middle" className={SUB}>
            {pick(lang, "il faudrait déjà savoir", "I would already need to know")}
          </text>

          <path
            d="M 288 82 Q 390 40 492 82"
            className="fill-none stroke-red-500"
            strokeWidth="2"
            markerEnd="url(#fig-arrow-red)"
          />
          <path
            d="M 492 112 Q 390 155 288 112"
            className="fill-none stroke-red-500"
            strokeWidth="2"
            markerEnd="url(#fig-arrow-red)"
          />
          <text
            x="390"
            y="190"
            textAnchor="middle"
            className="fill-current text-[13px] font-semibold text-red-600 dark:text-red-400"
          >
            {pick(lang, "seule une source vérifiable casse la boucle", "only a verifiable source breaks the loop")}
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** Les quatre paliers de prompt, du plus brut au plus outillé. */
export function FigurePromptLevels({ lang = "fr" }: { lang?: Lang } = {}) {
  const levels = [
    {
      n: 1,
      label: pick(lang, "Question directe", "Direct question"),
      sub: pick(lang, "Une réponse moyenne", "An average answer"),
      tone: "sky",
    },
    {
      n: 2,
      label: pick(lang, "+ contexte clinique", "+ clinical context"),
      sub: pick(lang, "DFG, poids, allergies", "GFR, weight, allergies"),
      tone: "blue",
    },
    {
      n: 3,
      label: pick(lang, "+ rôle et sources", "+ role and sources"),
      sub: pick(lang, "Attention aux références", "Beware of the references"),
      tone: "indigo",
    },
    {
      n: 4,
      label: pick(lang, "+ droit de ne pas savoir", "+ right not to know"),
      sub: pick(lang, "Raisonnement vérifiable", "Verifiable reasoning"),
      tone: "violet",
    },
  ];
  const tones: Record<string, string> = {
    sky: "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30",
    blue: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30",
    indigo:
      "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30",
    violet:
      "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30",
  };
  return (
    <div className="not-prose space-y-2">
      {levels.map((l) => (
        <div
          key={l.n}
          className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${tones[l.tone]}`}
          // La largeur croissante rend visible l'accumulation des leviers.
          style={{
            marginLeft: `${(l.n - 1) * 3}%`,
            width: `${100 - (l.n - 1) * 3}%`,
          }}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-background)]/70 text-sm font-bold">
            {l.n}
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              {l.label}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {l.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Les quatre principes A.V.E.C. de la HAS. */
export function FigureAvec() {
  const items = [
    {
      letter: "A",
      word: "Apprendre",
      sub: "comprendre le fonctionnement",
      tone: "text-blue-500",
    },
    {
      letter: "V",
      word: "Vérifier",
      sub: "contrôler le contenu généré",
      tone: "text-emerald-500",
    },
    {
      letter: "E",
      word: "Estimer",
      sub: "réévaluer l'outil dans le temps",
      tone: "text-amber-500",
    },
    {
      letter: "C",
      word: "Communiquer",
      sub: "amélioration continue",
      tone: "text-violet-500",
    },
  ];
  return (
    <div className="not-prose grid gap-4 sm:grid-cols-4">
      {items.map((i) => (
        <div
          key={i.letter}
          className="rounded-xl border bg-[var(--color-card)] p-5 text-center"
        >
          <p className={`text-5xl font-bold ${i.tone}`}>{i.letter}</p>
          <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">
            {i.word}
          </p>
          <p className="mt-1 text-sm leading-snug text-[var(--color-muted-foreground)]">
            {i.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Le coût qui enfle : une conversation coûte plus que ses questions. */
export function FigureCost() {
  const turns = [1, 2, 3, 4, 5, 6];
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 220"
        role="img"
        aria-label="À chaque tour de conversation, tout l'historique est renvoyé : le coût cumulé croît beaucoup plus vite que le nombre de questions."
        className="h-auto w-full"
      >
        {turns.map((t, k) => {
          const x = 60 + k * 118;
          const h = (k + 1) * 22;
          return (
            <g key={t}>
              <rect
                x={x}
                y={170 - h}
                width="72"
                height={h}
                rx="5"
                className="fill-blue-500/70"
              />
              <text x={x + 36} y="190" textAnchor="middle" className={SUB}>
                tour {t}
              </text>
            </g>
          );
        })}
        <line
          x1="40"
          y1="172"
          x2="750"
          y2="172"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
        <text x="40" y="30" className="fill-current text-[13px] font-semibold">
          tokens envoyés, cumulés
        </text>
        <text
          x="750"
          y="212"
          textAnchor="end"
          className="fill-current text-[12px] font-semibold text-amber-600 dark:text-amber-400"
        >
          l'historique est repayé à chaque tour
        </text>
      </svg>
    </figure>
  );
}

/** Entraînement (une fois, très coûteux) vs inférence (à chaque question). */
export function FigureTrainInfer() {
  return (
    <figure className="text-[var(--color-foreground)]">
      <svg
        viewBox="0 0 780 210"
        role="img"
        aria-label="L'entraînement a lieu une fois et fixe les paramètres ; l'inférence se répète à chaque question sans jamais les modifier."
        className="h-auto w-full"
      >
        {ARROW}
        <g>
          <rect
            x="20"
            y="40"
            width="270"
            height="110"
            rx="10"
            className="fill-none stroke-violet-500"
            strokeWidth="2"
          />
          <text
            x="155"
            y="72"
            textAnchor="middle"
            className="fill-current text-[15px] font-semibold"
          >
            Entraînement
          </text>
          <text x="155" y="98" textAnchor="middle" className={SUB}>
            des semaines, une seule fois
          </text>
          <text
            x="155"
            y="120"
            textAnchor="middle"
            className="fill-current text-[12px] font-medium text-violet-600 dark:text-violet-400"
          >
            les paramètres se fixent
          </text>

          <line
            x1="298"
            y1="95"
            x2="345"
            y2="95"
            stroke="currentColor"
            strokeWidth="1.5"
            markerEnd="url(#fig-arrow)"
          />

          <rect
            x="355"
            y="40"
            width="270"
            height="110"
            rx="10"
            className="fill-none stroke-emerald-500"
            strokeWidth="2"
          />
          <text
            x="490"
            y="72"
            textAnchor="middle"
            className="fill-current text-[15px] font-semibold"
          >
            Inférence
          </text>
          <text x="490" y="98" textAnchor="middle" className={SUB}>
            à chacune de vos questions
          </text>
          <text
            x="490"
            y="120"
            textAnchor="middle"
            className="fill-current text-[12px] font-medium text-emerald-600 dark:text-emerald-400"
          >
            les paramètres ne bougent plus
          </text>

          {/* La boucle de répétition : c'est elle qui fait le volume d'énergie. */}
          <path
            d="M 625 130 Q 700 150 700 95 Q 700 40 625 60"
            className="fill-none stroke-emerald-500"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            markerEnd="url(#fig-arrow)"
          />
          <text x="712" y="99" className={SUB}>
            ×
          </text>
          <text
            x="722"
            y="99"
            className="fill-current text-[11px] font-semibold"
          >
            milliards
          </text>

          <text
            x="390"
            y="186"
            textAnchor="middle"
            className="fill-current text-[13px] font-semibold text-amber-600 dark:text-amber-400"
          >
            répétée si souvent qu'elle finit par consommer plus que
            l'entraînement
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** Généraliste surdimensionné vs petit modèle spécialisé. */
export function FigureSmallModels() {
  return (
    <div className="not-prose grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border p-5">
        <div className="flex items-center gap-3">
          <span className="size-12 shrink-0 rounded-full bg-slate-400/30" />
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            Généraliste, très gros
          </p>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-[var(--color-muted-foreground)]">
          <li>30 langues, code, mathématiques…</li>
          <li>Coût et énergie élevés</li>
          <li>Hébergé chez un tiers</li>
        </ul>
      </div>
      <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/40 p-5 dark:bg-emerald-950/20">
        <div className="flex items-center gap-3">
          <span className="size-6 shrink-0 rounded-full bg-emerald-500" />
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            Petit, spécialisé santé
          </p>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-[var(--color-muted-foreground)]">
          <li>Le domaine dont vous avez besoin</li>
          <li>Coût et énergie réduits</li>
          <li>
            <strong className="text-emerald-700 dark:text-emerald-300">
              peut tourner dans l'hôpital
            </strong>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Ordres de grandeur de la fenêtre de contexte. L'échelle est logarithmique :
 * en linéaire, le budget du TD serait invisible face au million de tokens.
 */
export function FigureContextScale({ lang = "fr" }: { lang?: Lang } = {}) {
  const marks = [
    {
      tokens: 1_000,
      label: pick(lang, "Budget du TD", "Session budget"),
      sub: "~2 pages",
      tone: "bg-slate-400",
    },
    {
      tokens: 32_768,
      label: "Mistral 24B",
      sub: "~50 pages",
      tone: "bg-blue-500",
    },
    {
      tokens: 131_072,
      label: "Llama 3.3 70B",
      sub: "~200 pages",
      tone: "bg-blue-500",
    },
    {
      tokens: 1_000_000,
      label: "Gemini, ChatGPT, Claude",
      sub: pick(lang, "~1 500 pages", "~1,500 pages"),
      tone: "bg-emerald-500",
    },
    {
      tokens: 1_500_000,
      label: pick(lang, "Saga Harry Potter", "Harry Potter series"),
      sub: pick(lang, "1,08 M de mots", "1.08M words"),
      tone: "bg-amber-500",
    },
  ];
  const max = Math.log10(1_500_000);
  const min = Math.log10(1_000);

  return (
    <div className="not-prose my-6 space-y-2.5 rounded-lg border bg-[var(--color-card)] p-5">
      {marks.map((m) => {
        const pct = ((Math.log10(m.tokens) - min) / (max - min)) * 100;
        return (
          <div key={m.label} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-right text-xs text-[var(--color-foreground)]">
              {m.label}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded bg-[var(--color-muted)]">
              <div
                className={`h-full rounded ${m.tone}`}
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
            <span className="w-40 shrink-0 text-xs tabular-nums text-[var(--color-muted-foreground)]">
              {m.tokens.toLocaleString(pick(lang, "fr-FR", "en-US"))} · {m.sub}
            </span>
          </div>
        );
      })}
      <p className="pt-2 text-xs text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          "Échelle logarithmique : chaque graduation vaut dix fois la précédente. En échelle linéaire, le budget du TD serait invisible.",
          "Logarithmic scale: each step is worth ten times the previous one. On a linear scale, the session budget would be invisible.",
        )}
      </p>
    </div>
  );
}

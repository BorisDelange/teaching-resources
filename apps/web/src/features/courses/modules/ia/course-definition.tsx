import { Callout, Summary } from '@/components/article/blocks'
import { Ref, References } from '@/components/article/references'
import { Term } from '@/components/article/Term'
import type { CourseArticle } from '@/components/article/types'
import {
  FigureDeuxVoies,
  FigureMemeMot,
  FigurePoupees,
  FigureRegleVsApprentissage,
  FigureTuring,
} from './figures-definition'
import { TimelineIA } from './interactive-histoire'
import { ResourcesDefinition } from './resources'

export const COURSE_DEFINITION: CourseArticle = {
  slug: 'definition',
  title: "Qu'est-ce que l'intelligence artificielle ?",
  description:
    "D'où vient le terme, ce qu'il recouvre, et ce qui distingue une règle écrite d'une règle apprise.",
  minutes: 15,
  index: '1/3',
  // Les articles 2 (apprentissage) et 3 (applications en médecine) restent à
  // écrire : pas de lien « cours suivant » tant que la cible n'existe pas.

  summary: (
    <Summary>
      « Intelligence artificielle » ne désigne pas une technique, mais un{' '}
      <strong>projet</strong> : faire exécuter par une machine des tâches qui, chez l&rsquo;humain,
      demandent de l&rsquo;intelligence. Ce projet a soixante-dix ans, et il a déjà connu deux
      effondrements après deux emballements. Ce qui domine aujourd&rsquo;hui en médecine n&rsquo;est
      qu&rsquo;une partie de ce champ : l&rsquo;<strong>apprentissage automatique</strong>, où la
      machine ne reçoit plus de règles écrites par un médecin, mais les déduit elle-même
      d&rsquo;exemples. Comprendre ce basculement, c&rsquo;est comprendre pourquoi ces outils sont à
      la fois si performants et si difficiles à contrôler.
    </Summary>
  ),

  sections: [
    {
      id: 'definition',
      title: 'Un mot, des objets très différents',
      reading: (
        <>
          <p>
            Commençons par une définition, celle du <i>Larousse</i> : l&rsquo;intelligence
            artificielle est l&rsquo;« ensemble de théories et de techniques mises en œuvre en vue de
            réaliser des machines capables de simuler l&rsquo;intelligence humaine »
            <Ref n={1} title="Larousse, Intelligence artificielle" />.
          </p>
          <p>
            Remarquez ce que cette définition ne dit pas. Elle ne nomme aucun algorithme, aucune
            architecture, aucune méthode. Elle énonce une <strong>finalité</strong> — « en vue de » —
            et c&rsquo;est pourquoi le même terme recouvre des objets aussi éloignés qu&rsquo;un
            correcteur orthographique, un programme d&rsquo;échecs des années 1990 et ChatGPT. Ce qui
            les rassemble n&rsquo;est pas leur fonctionnement : c&rsquo;est le fait qu&rsquo;ils
            accomplissent des tâches dont on estimait qu&rsquo;elles demandaient un esprit humain.
          </p>
          <p>
            La <abbr title="Commission nationale de l'informatique et des libertés">CNIL</abbr> le
            formule sans détour : l&rsquo;intelligence artificielle «{' '}
            <strong>
              n&rsquo;est pas une technologie à proprement parler mais plutôt un domaine scientifique
            </strong>{' '}
            dans lequel des outils peuvent être classés lorsqu&rsquo;ils respectent certains critères »
            <Ref n={2} title="CNIL, Intelligence artificielle : de quoi parle-t-on ?, 2022" />.
          </p>
          <p>
            La conséquence pratique est immédiate. Annoncer qu&rsquo;un dispositif « utilise de
            l&rsquo;intelligence artificielle » informe à peu près autant que dire qu&rsquo;il
            « utilise des mathématiques ». La question utile n&rsquo;est jamais « est-ce de
            l&rsquo;IA ? » mais{' '}
            <strong>« quelle méthode, entraînée sur quelles données, évaluée comment ? »</strong>.
            C&rsquo;est l&rsquo;objet des cours qui suivent, et ce sera votre réflexe devant la notice
            d&rsquo;un dispositif médical comme devant un article.
          </p>
          <Callout type="example" title="Une conjecture, en 1955">
            Le terme apparaît pour la première fois dans une demande de financement adressée en août
            1955 par McCarthy, Minsky, Rochester et Shannon, pour un séminaire d&rsquo;été à
            Dartmouth. Ils y proposent de travailler « sur la base de la{' '}
            <strong>conjecture</strong> selon laquelle chaque aspect de l&rsquo;apprentissage, ou
            toute autre caractéristique de l&rsquo;intelligence, peut en principe être décrit si
            précisément qu&rsquo;une machine peut être construite pour le simuler »
            <Ref n={3} title="McCarthy, Minsky, Rochester, Shannon, A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence, 1955" />
            . Le domaine s&rsquo;est donc défini, dès son acte de naissance, par une{' '}
            <em>hypothèse à éprouver</em> — pas par une technique. Soixante-dix ans plus tard, elle
            n&rsquo;est toujours ni démontrée ni réfutée.
          </Callout>
          <p>
            Il existe toutefois une définition qui, elle, est <strong>opposable</strong> : celle du
            règlement européen sur l&rsquo;intelligence artificielle, entré en vigueur en 2024. Elle
            ne cherche pas à dire ce qu&rsquo;est l&rsquo;intelligence, mais à délimiter ce qui tombe
            sous le règlement. Un « système d&rsquo;IA » y est un système automatisé qui, « pour des
            objectifs explicites ou implicites, <strong>déduit</strong>, à partir des entrées
            qu&rsquo;il reçoit, la manière de générer des sorties telles que des prédictions, du
            contenu, des recommandations ou des décisions »
            <Ref n={4} title="Règlement (UE) 2024/1689, article 3, point 1" />.
          </p>
          <Callout type="info" title="Le critère juridique : déduire, et non appliquer">
            Le règlement précise que la définition « ne devrait pas couvrir les systèmes fondés sur
            les règles définies uniquement par des personnes physiques pour exécuter automatiquement
            des opérations », et que « une caractéristique essentielle des systèmes d&rsquo;IA est
            leur <strong>capacité d&rsquo;inférence</strong> »
            <Ref n={4} title="Règlement (UE) 2024/1689, considérant 12" />. Autrement dit : un
            logiciel qui applique un score que vous avez écrit n&rsquo;est pas un système d&rsquo;IA ;
            un modèle qui a <em>déduit</em> ses propres règles de données en est un. Retenez ce
            critère — c&rsquo;est exactement la frontière que décrit la dernière section de ce cours,
            et c&rsquo;est elle qui déterminera les obligations pesant sur les logiciels de votre
            futur service.
          </Callout>
        </>
      ),
      slide: {
        title: 'Un mot, des objets très différents',
        lead: "Le terme ne dit rien du fonctionnement — seulement qu'on a jugé la tâche « intelligente ».",
        figure: <FigureMemeMot />,
        points: [
          <>
            CNIL : «&nbsp;pas une technologie mais plutôt un <strong>domaine scientifique</strong>&nbsp;».
          </>,
          <>
            « C&rsquo;est de l&rsquo;IA » <strong>ne dit rien</strong> de vérifiable.
          </>,
          <>
            La bonne question : <strong>quelle méthode, quelles données, quelle évaluation ?</strong>
          </>,
        ],
      },
    },

    {
      id: 'turing',
      title: 'Turing et le jeu de l’imitation',
      reading: (
        <>
          <p>
            En 1950, le mathématicien britannique Alan Turing publie dans la revue <i>Mind</i> un
            article qui ouvre par une question : « Les machines peuvent-elles penser ? »
            <Ref n={5} title="Turing AM, Computing machinery and intelligence, Mind 1950" /> Il la
            juge aussitôt mal posée — « penser » est indéfinissable — et la remplace par une épreuve
            concrète, le <strong>jeu de l&rsquo;imitation</strong>.
          </p>
          <p>
            Un évaluateur humain dialogue par écrit avec deux interlocuteurs qu&rsquo;il ne voit pas :
            l&rsquo;un est humain, l&rsquo;autre est une machine. S&rsquo;il ne parvient pas à les
            distinguer de façon fiable, on conviendra que la machine a réussi l&rsquo;épreuve.
          </p>
          <p>
            Le déplacement opéré par Turing est plus important que le test lui-même. Il substitue à
            une question métaphysique une question <strong>comportementale</strong> : on ne juge plus
            ce que la machine <em>est</em>, on juge ce qu&rsquo;elle <em>produit</em>. C&rsquo;est
            exactement la posture qu&rsquo;il vous faudra adopter devant un outil clinique — non pas
            « comprend-il la médecine ? », mais « ses sorties sont-elles justes, et comment le
            vérifie-t-on ? ».
          </p>
          <Callout type="warning" title="Le piège du test de Turing en médecine">
            Un système peut parfaitement imiter le discours médical sans rien vérifier. Les modèles
            de langage actuels produisent des textes fluides, assurés, structurés comme un
            raisonnement clinique — y compris quand leur contenu est faux. <strong>Réussir le test
            de Turing n&rsquo;est pas un critère de fiabilité clinique</strong>, et ce cours
            n&rsquo;emploiera jamais la ressemblance avec un humain comme preuve de compétence.
          </Callout>
        </>
      ),
      slide: {
        title: "Turing, 1950 : le jeu de l'imitation",
        lead: 'On ne juge pas ce que la machine est, mais ce qu’elle produit.',
        figure: <FigureTuring />,
        punch: (
          <>
            Imiter un discours médical n&rsquo;est <strong>pas</strong> le tenir pour vrai.
          </>
        ),
      },
    },

    {
      id: 'histoire',
      title: 'Soixante-dix ans, deux hivers',
      reading: (
        <>
          <p>
            Le terme « intelligence artificielle » naît en 1956, lors d&rsquo;un séminaire d&rsquo;été
            au Dartmouth College. Les fondations théoriques sont antérieures : dès 1943, McCulloch et
            Pitts proposent un modèle mathématique du neurone ; en 1957, Rosenblatt construit le
            <strong> perceptron</strong>, première mise en œuvre matérielle d&rsquo;un réseau de
            neurones artificiels.
          </p>
          <p>
            Suit un âge d&rsquo;or d&rsquo;une quinzaine d&rsquo;années, porté par des promesses
            considérables et des financements à la hauteur. Puis les résultats tardent, et les
            crédits s&rsquo;effondrent : c&rsquo;est le premier <strong>hiver de l&rsquo;IA</strong>,
            au milieu des années 1970. Les systèmes experts relancent la discipline dans les années
            1980 — on y reviendra, car la médecine en fut un terrain privilégié — avant un second
            hiver à la fin de la décennie.
          </p>
          <p>
            La reprise vient ensuite par étapes spectaculaires : Deep Blue bat Kasparov aux échecs en
            1997, AlphaGo bat Lee Sedol au go en 2016, et ChatGPT rend ces outils accessibles au grand
            public fin 2022.
          </p>
          <TimelineIA />
          <Callout type="note" title="Pourquoi vous raconter cela">
            Ce n&rsquo;est pas de l&rsquo;érudition. Deux fois déjà, des promesses ont largement
            devancé les résultats, et deux fois le reflux a été brutal. Vous exercerez dans un champ
            où l&rsquo;écart entre <em>ce qui est annoncé</em> et <em>ce qui est démontré</em> reste
            considérable — c&rsquo;est précisément ce que mesurera le cours sur les applications
            médicales. Connaître ce précédent vous aide à lire les annonces avec la distance qu&rsquo;on
            applique à un essai thérapeutique.
          </Callout>
        </>
      ),
      slide: {
        title: 'Soixante-dix ans, deux hivers',
        lead: 'Deux fois, les promesses ont devancé les résultats.',
        figure: <TimelineIA />,
        punch: (
          <>
            Lire les annonces comme on lit un <strong>essai thérapeutique</strong>.
          </>
        ),
      },
    },

    {
      id: 'champs',
      title: "Ce que le terme recouvre aujourd'hui",
      reading: (
        <>
          <p>
            L&rsquo;intelligence artificielle n&rsquo;a pas de découpage officiel, mais une
            représentation s&rsquo;impose en pratique : trois ensembles emboîtés.
          </p>
          <p>
            L&rsquo;ensemble le plus large est l&rsquo;<strong>intelligence artificielle</strong>
            elle-même. Il contient l&rsquo;<strong>apprentissage automatique</strong> (en anglais{' '}
            <i>machine learning</i>), où la machine établit ses règles à partir de données. Et à
            l&rsquo;intérieur de celui-ci se trouve l&rsquo;<strong>apprentissage profond</strong> (
            <i>deep learning</i>), qui désigne les réseaux de neurones à nombreuses couches.
          </p>
          <p>
            Cette dernière famille est celle d&rsquo;où proviennent la quasi-totalité des outils dont
            on parle aujourd&rsquo;hui : les modèles de langage, la lecture automatique
            d&rsquo;images médicales, la reconnaissance vocale des logiciels de dictée.
          </p>
          <p>
            Mais l&rsquo;anneau extérieur n&rsquo;est pas vide, et c&rsquo;est important : les{' '}
            <strong>systèmes experts</strong>, le{' '}
            <Term define="Ensemble des méthodes permettant à une machine d'analyser ou de produire du langage humain — recherche dans un texte, traduction, extraction d'informations d'un compte rendu.">
              traitement automatique du langage
            </Term>
            , la robotique ou les algorithmes de recherche et de planification relèvent de l&rsquo;IA
            sans relever de l&rsquo;apprentissage. Un score clinique comme celui de Wells est, à cet
            égard, plus proche du système expert que du <i>deep learning</i>.
          </p>
        </>
      ),
      slide: {
        title: 'Trois ensembles emboîtés',
        lead: "Le deep learning n'est qu'une partie de l'IA — la plus visible aujourd'hui.",
        figure: <FigurePoupees />,
      },
    },

    {
      id: 'regle-vs-apprentissage',
      title: 'Règle écrite ou règle apprise',
      reading: (
        <>
          <p>
            Voici la distinction la plus importante de ce cours, et celle qui commande tout ce qui
            suivra.
          </p>
          <p>
            Dans un <strong>système expert</strong>, un médecin formule explicitement les règles, et
            la machine les applique. Par exemple : <i>si la troponine dépasse tel seuil et qu&rsquo;il
            existe une douleur thoracique, alors signaler</i>. La machine n&rsquo;a rien déduit ;
            elle exécute. Toute la connaissance vient de l&rsquo;humain qui a écrit la règle, et elle
            est lisible ligne à ligne.
          </p>
          <p>
            Dans l&rsquo;<strong>apprentissage automatique</strong>, le sens de la flèche
            s&rsquo;inverse. On ne fournit plus de règle : on fournit des <strong>exemples</strong> —
            des milliers de patients dont on connaît l&rsquo;issue — et un algorithme ajuste ses
            paramètres jusqu&rsquo;à reproduire au mieux ces issues. La règle n&rsquo;est écrite nulle
            part. Elle est <em>encodée</em> dans des valeurs numériques que personne n&rsquo;a
            choisies une à une.
          </p>
          <FigureDeuxVoies />
          <Callout type="success" title="Ce que l'apprentissage fait gagner">
            Il capte des régularités qu&rsquo;aucun expert n&rsquo;aurait su formuler : des
            combinaisons de dizaines de variables, des seuils qui dépendent du contexte, des motifs
            dans une image qu&rsquo;un œil humain ne décompose pas. C&rsquo;est ce qui rend possible
            la lecture automatique d&rsquo;une radiographie, tâche pour laquelle personne ne saurait
            écrire de règles.
          </Callout>
          <Callout type="warning" title="Ce que l'apprentissage fait perdre">
            Trois choses, et elles reviendront dans chaque cours suivant.{' '}
            <strong>La lisibilité</strong> d&rsquo;abord : on ne peut plus lire la règle, seulement
            constater ce qu&rsquo;elle produit. <strong>La garantie</strong> ensuite : le modèle
            reproduit ce qu&rsquo;il a vu, y compris les biais présents dans les données.{' '}
            <strong>La stabilité</strong> enfin : rien ne garantit qu&rsquo;un modèle appris sur une
            population fonctionne sur une autre.
          </Callout>
          <p>
            Ces trois pertes ne sont pas des défauts de jeunesse que le progrès technique effacerait.
            Elles découlent directement du principe même de l&rsquo;apprentissage. C&rsquo;est
            pourquoi l&rsquo;évaluation de ces modèles constitue une discipline à part entière — celle
            du second cours de ce site.
          </p>
        </>
      ),
      slide: {
        title: 'Règle écrite ou règle apprise',
        lead: "Le sens de la flèche s'inverse — et tout le reste en découle.",
        figure: <FigureRegleVsApprentissage />,
        punch: (
          <>
            On gagne en <strong>performance</strong>, on perd en{' '}
            <strong>lisibilité, garantie et stabilité</strong>.
          </>
        ),
      },
    },

    {
      id: 'ressources',
      title: 'Pour aller plus loin',
      reading: (
        <>
          <ResourcesDefinition />
          <References
            items={[
              {
                citation: (
                  <>
                    Larousse, <i>Intelligence artificielle</i>, encyclopédie en ligne.
                  </>
                ),
                href: 'https://www.larousse.fr/encyclopedie/divers/intelligence_artificielle/187257',
              },
              {
                citation: (
                  <>
                    CNIL. <i>Intelligence artificielle : de quoi parle-t-on ?</i> 25 mars 2022.
                  </>
                ),
                href: 'https://www.cnil.fr/fr/intelligence-artificielle/intelligence-artificielle-de-quoi-parle-t-on',
              },
              {
                citation: (
                  <>
                    McCarthy J, Minsky ML, Rochester N, Shannon CE.{' '}
                    <i>
                      A Proposal for the Dartmouth Summer Research Project on Artificial
                      Intelligence.
                    </i>{' '}
                    31 août 1955.
                  </>
                ),
                href: 'https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html',
              },
              {
                citation: (
                  <>
                    Règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024
                    établissant des règles harmonisées concernant l&rsquo;intelligence artificielle.
                    Article 3, point 1, et considérant 12.
                  </>
                ),
                href: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=OJ:L_202401689',
              },
              {
                citation: (
                  <>
                    Turing AM. <i>Computing machinery and intelligence.</i> Mind
                    1950;LIX(236):433-460.
                  </>
                ),
                href: 'https://doi.org/10.1093/mind/LIX.236.433',
              },
              {
                citation: (
                  <>
                    OCDE.{' '}
                    <i>
                      What is AI? Can you make a clear distinction between AI and non-AI systems?
                    </i>
                  </>
                ),
                href: 'https://oecd.ai/en/wonk/definition',
              },
            ]}
          />
        </>
      ),
    },
  ],

  takeaways: [
    <>
      L&rsquo;IA n&rsquo;est pas une technologie mais un <strong>domaine scientifique</strong>
      (CNIL) : le terme seul ne renseigne sur rien de vérifiable. Demandez la{' '}
      <strong>méthode</strong>, les <strong>données</strong>, l&rsquo;<strong>évaluation</strong>.
    </>,
    <>
      Turing déplace la question de « la machine pense-t-elle ? » vers{' '}
      <strong>« que produit-elle ? »</strong> — mais imiter un discours médical n&rsquo;est pas dire
      vrai.
    </>,
    <>
      La discipline a connu <strong>deux hivers</strong> après deux emballements : l&rsquo;écart
      entre l&rsquo;annoncé et le démontré est une constante du domaine.
    </>,
    <>
      IA ⊃ apprentissage automatique ⊃ apprentissage profond. Ce dont on parle aujourd&rsquo;hui
      vient presque toujours du <strong>noyau le plus interne</strong>.
    </>,
    <>
      Dans un système expert, <strong>le médecin écrit la règle</strong> ; en apprentissage
      automatique, <strong>la machine la déduit d&rsquo;exemples</strong>. On y gagne en performance,
      on y perd en lisibilité, en garantie et en stabilité.
    </>,
  ],
}

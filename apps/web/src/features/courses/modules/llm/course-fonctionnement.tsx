import {
  Callout,
  LabLink,
  StepCard,
  Steps,
  Summary,
} from "@/components/article/blocks";
import { Ref, References } from "@/components/article/references";
import { Term } from "@/components/article/Term";
import type { CourseArticle } from "@/components/article/types";
import { EmbeddingPlot, TemperatureDemo, TokenDemo } from "./interactive";
import {
  FigureContextScale,
  FigureCorpus,
  FigureHallucination,
  FigureParadox,
  FigurePrediction,
  FigureSize,
  FigureSmallModels,
  FigureTrainInfer,
  FigureTokens,
  FigureTraining,
} from "./figures";
import { ResourcesCourse1 } from "./resources";

const TD = "/courses/llm/chatbots";

export const COURSE_FONCTIONNEMENT: CourseArticle = {
  slug: "fonctionnement",
  title: "Comment fonctionne un grand modèle de langage ?",
  description:
    "Des données d'entraînement à la réponse affichée : ce qui se passe réellement quand vous posez une question à ChatGPT.",
  minutes: 25,
  index: "1/2",
  next: { href: "/courses/llm/usage", title: "Utiliser un LLM" },

  summary: (
    <Summary>
      Un grand modèle de langage (<abbr title="Large Language Model">LLM</abbr>)
      ne comprend pas le texte et, <strong>par défaut</strong>, ne consulte
      aucune source extérieure : il <strong>prédit le mot suivant</strong>,
      encore et encore, à partir de régularités apprises sur d'immenses
      quantités de texte. Tout le reste — la fluidité, l'assurance, et jusqu'aux
      erreurs — découle de ce mécanisme unique. Comprendre ce mécanisme, c'est
      comprendre pourquoi un modèle peut écrire une posologie fausse avec
      exactement le même aplomb qu'une posologie juste.
      <em>
        {" "}
        Dans le second cours, nous apprendrons à développer un esprit critique
        face à ces outils et à bien les utiliser pour obtenir des réponses
        fiables.
      </em>
    </Summary>
  ),

  sections: [
    {
      id: "intuition",
      title: "Une machine à prédire le mot suivant",
      reading: (
        <>
          <p>
            Votre téléphone propose déjà le mot suivant quand vous tapez un
            message. Un LLM fait la même chose, à une échelle sans commune
            mesure : au lieu de quelques mots de contexte, il en considère des
            milliers ; au lieu de quelques règles, il utilise des milliards de
            paramètres ajustés pendant l'entraînement.
          </p>
          <p>
            C'est tout. Il n'y a pas, quelque part dans le modèle, une base de
            données des recommandations de la{" "}
            <abbr title="Haute Autorité de Santé">HAS</abbr> qu'il irait
            consulter. Il n'y a pas de moteur de raisonnement médical. Il y a un
            système qui, à chaque étape, produit une{" "}
            <strong>distribution de probabilités</strong> sur le mot suivant, et
            en tire un.
          </p>
          <p>
            Techniquement, ce système est un{" "}
            <strong>réseau de neurones artificiels</strong> : un très grand
            ensemble de calculs numériques organisés en couches, dont les{" "}
            <strong>paramètres</strong> — des milliards de nombres — ont été
            ajustés automatiquement pendant l'entraînement. Ce cours n'entre pas
            dans le détail de cette architecture : retenez seulement que{" "}
            <strong>
              tout ce qui suit se ramène à des calculs sur des nombres
            </strong>
            .
          </p>
          <Callout
            type="warning"
            title="La conséquence à retenir dès maintenant"
          >
            Un modèle optimisé pour produire du texte <em>plausible</em> n'est
            pas optimisé pour produire du texte <em>vrai</em>.
          </Callout>
        </>
      ),
      slide: {
        title: "Une machine à prédire le mot suivant",
        lead: "Un LLM ne comprend pas et ne consulte rien.",
        figure: <FigurePrediction />,
        punch: (
          <>
            Optimisé pour le <strong>plausible</strong>, pas pour le{" "}
            <strong>vrai</strong>.
          </>
        ),
      },
    },

    {
      id: "corpus",
      title: "Le corpus d'entraînement",
      reading: (
        <>
          <p>
            Avant tout entraînement, il faut beaucoup de texte. Pour donner un
            ordre de grandeur documenté : Meta indique avoir entraîné Llama 3
            sur <strong>plus de 15 000 milliards de tokens</strong> issus de
            sources publiquement accessibles
            <Ref n={1} title="Meta, Introducing Meta Llama 3, 2024" /> — pages
            web, livres, articles, forums, code informatique.
          </p>
          <p>
            Ce corpus n'est pas brut pour autant. Les équipes appliquent en
            amont un <strong>important travail de mise en qualité</strong> : des
            règles automatiques écartent les pages mal écrites ou sans intérêt,
            les contenus offensants sont retirés, les documents qui se répètent
            d'un site à l'autre sont supprimés, et des programmes sont même
            entraînés à noter la qualité d'un document
            <Ref n={1} title="Meta, Introducing Meta Llama 3, 2024" />. Dire que
            « tout se vaut » serait donc inexact.
          </p>
          <p>
            Toutefois, ce tri porte surtout sur la qualité <em>formelle</em> et
            la sécurité des contenus, pas sur leur{" "}
            <strong>validité médicale</strong>. Aucun de ces filtres ne sait
            distinguer une recommandation de société savante d'un message de
            forum bien rédigé. Un modèle généraliste a donc lu beaucoup de
            contenus médicaux fiables, mais aussi des forums de patients, sans
            hiérarchie explicite entre eux.
          </p>
          <Callout type="note" title="Trois conséquences directes pour vous">
            <ul>
              <li>
                <strong>La connaissance est figée.</strong> Le corpus a été
                collecté à une date donnée. Une recommandation parue après cette
                date est inconnue du modèle.
              </li>
              <li>
                <strong>
                  Le tri en amont ne porte pas sur la validité médicale.
                </strong>{" "}
                Une recommandation de société savante et un message de forum
                bien écrit franchissent les mêmes filtres.
              </li>
              <li>
                <strong>Le modèle ne peut pas citer sa source.</strong> Il n'a
                pas retenu d'où venait chaque information, seulement des
                régularités statistiques.
              </li>
            </ul>
          </Callout>
        </>
      ),
      slide: {
        title: "Le corpus d'entraînement",
        lead: "Des milliers de milliards de mots, sans hiérarchie de qualité.",
        figure: <FigureCorpus />,
        points: [
          <>
            <strong>Connaissance figée</strong> à la date de collecte.
          </>,
          <>
            Le modèle <strong>ne sait pas</strong> d'où vient ce qu'il dit.
          </>,
        ],
      },
    },

    {
      id: "tokens",
      title: "Les tokens, unité de base",
      reading: (
        <>
          <p>
            Un modèle ne manipule pas des mots mais des <strong>tokens</strong>{" "}
            : des fragments de texte, obtenus en découpant les mots selon leur
            fréquence. Les mots les plus courants forment un token à eux seuls,
            tandis que les mots rares sont découpés en morceaux plus petits que
            le modèle a déjà rencontrés
            <Ref n={2} title="OpenAI, Understanding and counting tokens" />.
          </p>
          <p>
            OpenAI donne comme règle approximative{" "}
            <strong>1 token ≈ 4 caractères</strong>, soit environ 0,75 mot —
            mais cette règle vaut <strong>pour l'anglais</strong>
            <Ref n={2} title="OpenAI, Understanding and counting tokens" />. Le
            français est moins bien loti : on mesure entre 1,53 et 2,11 tokens
            par mot selon les modèles, contre 1,20 à 1,39 en anglais
            <Ref n={3} title="Token Tax / tokenisation multilingue" />. À
            contenu égal, un texte français coûte donc sensiblement plus cher
            qu'un texte anglais.
          </p>
          <TokenDemo />
          <p>
            Cette unité n'a rien d'anecdotique : c'est{" "}
            <strong>l'unité de facturation</strong> des{" "}
            <Term
              define={
                <>
                  <strong>API</strong> (<em>interface de programmation</em>) :
                  la « prise » par laquelle un programme parle à un autre. Quand
                  une application utilise ChatGPT, elle ne passe pas par le site
                  web : elle envoie la question au serveur d'OpenAI par son API,
                  et reçoit la réponse en retour. C'est facturé au token.
                </>
              }
            >
              API
            </Term>
            , <strong>l'unité de mesure</strong> de la mémoire du modèle, et
            donc l'unité dans laquelle se compte tout ce que vous ferez pendant
            le TD.
          </p>
          <LabLink href={`${TD}?step=usage`} exercise="onglet Consommation">
            Le TD affiche en permanence un compteur de tokens, séparé en tokens
            envoyés et tokens reçus. Vous saurez maintenant ce qu'il compte.
          </LabLink>
        </>
      ),
      slide: {
        title: "Les tokens",
        lead: "Le modèle manipule des fragments de mots, pas des mots.",
        figure: <FigureTokens />,
        points: [
          <>
            Ordre de grandeur : <strong>~4 caractères = 1 token</strong>.
          </>,
          <>
            C'est l'unité de <strong>facturation</strong> et de{" "}
            <strong>mémoire</strong>.
          </>,
        ],
      },
    },

    {
      id: "embeddings",
      title: "Les embeddings : transformer les mots en nombres",
      reading: (
        <>
          <p>
            Puisque le réseau de neurones ne calcule que sur des nombres, chaque
            token doit être converti en nombres. On lui associe un{" "}
            <strong>vecteur</strong>, c'est-à-dire{" "}
            <strong>une liste de coordonnées</strong>, exactement comme un point
            sur une carte est repéré par sa latitude et sa longitude. Ce vecteur
            s'appelle un <em>embedding</em>, ou <em>plongement</em> en français.
          </p>
          <p>
            Sur une carte, deux coordonnées suffisent à situer un point. Ici on
            en utilise <strong>bien davantage</strong> : plusieurs centaines à
            plusieurs milliers de coordonnées par mot. Chaque mot occupe donc
            une <strong>position</strong> dans un espace à autant de dimensions
            — un espace que personne ne peut se représenter mentalement, mais
            dans lequel les calculs de distance fonctionnent exactement comme
            sur une carte.
          </p>
          <p>
            Ces coordonnées ne sont pas attribuées au hasard : elles sont
            apprises de telle sorte que{" "}
            <strong>
              les mots employés dans des contextes similaires se retrouvent à
              des positions voisines
            </strong>
            . C'est ce qui permet au modèle de « savoir » que tachycardie et
            hypertension relèvent d'un même registre, sans qu'on le lui ait
            jamais dit explicitement.
          </p>
          <EmbeddingPlot />
          <Callout type="info" title="Ce que la figure ne peut pas montrer">
            Cette représentation est en <strong>trois dimensions</strong>, parce
            que c'est la limite de ce qu'un écran peut afficher. Le véritable
            espace en compte des centaines, voire des milliers. La figure est
            donc une projection très simplifiée : elle donne l'intuition
            correcte du regroupement, mais elle écrase énormément d'information.
          </Callout>
          <p>
            La <strong>proximité entre deux vecteurs</strong> se mesure le plus
            souvent par la <strong>similarité cosinus</strong> : on regarde
            l'angle entre les deux vecteurs plutôt que leur longueur. Deux mots
            de sens voisin pointent dans la même direction, et le score approche
            1 ; deux mots sans rapport donnent un score proche de 0.
          </p>
          <Callout
            type="example"
            title="Pourquoi ce chiffre va vous être utile"
          >
            Pendant le TD, quand l'application cherche les bons passages d'une
            recommandation, elle affiche «{" "}
            <strong>Proximité de sens : 0,842</strong> ». C'est exactement cette
            mesure. Un score élevé signifie que le passage{" "}
            <em>parle du même sujet</em> que votre question — pas qu'il contient
            la bonne réponse.
          </Callout>
        </>
      ),
      slide: {
        title: "Les embeddings",
        lead: "Les mots de sens proche reçoivent des vecteurs proches.",
        figure: <EmbeddingPlot />,
        points: [
          <>
            Chaque token devient un <strong>vecteur</strong> de centaines de
            nombres.
          </>,
          <>
            Proximité mesurée par la <strong>similarité cosinus</strong>, entre
            0 et 1.
          </>,
        ],
      },
    },

    {
      id: "apprentissage",
      title: "L'apprentissage",
      reading: (
        <>
          <p>
            L'entraînement consiste à masquer le mot suivant dans des milliards
            de phrases et à demander au modèle de le deviner. À chaque erreur,
            ses paramètres sont légèrement ajustés. Répété à très grande
            échelle, ce procédé fait émerger une représentation étonnamment
            riche de la langue — et, indirectement, du monde décrit par cette
            langue.
          </p>
          <Steps>
            <StepCard number={1} color="sky" title="Pré-entraînement">
              Le modèle apprend à prédire le mot suivant sur l'ensemble du
              corpus. C'est de loin l'étape la plus longue et la plus coûteuse.
            </StepCard>
            <StepCard
              number={2}
              color="blue"
              title="Ajustement sur des instructions"
            >
              <p>
                À ce stade, le modèle sait seulement <em>continuer</em> un texte
                — pas répondre à quelqu'un.
              </p>
              <p>
                Écrivez-lui une question, il pourrait tout aussi bien enchaîner
                sur une liste d'autres questions. On lui montre donc des
                milliers d'exemples de questions suivies de bonnes réponses :
                c'est cette phase qui transforme un modèle de langage en{" "}
                <strong>agent conversationnel</strong>.
              </p>
            </StepCard>
            <StepCard
              number={3}
              color="indigo"
              title="Alignement par retours humains"
            >
              Des humains classent des réponses, et le modèle est ajusté pour
              produire celles qui sont préférées : utiles, honnêtes, non
              nuisibles.
            </StepCard>
          </Steps>
          <Callout type="warning" title="Ce que l'alignement fabrique aussi">
            Cette troisième étape, comme les tests utilisés pour comparer les
            modèles entre eux, note une réponse à sa justesse apparente. Une
            abstention ne rapporte rien, tandis qu'une réponse hasardeuse peut
            tomber juste : le modèle serait donc optimisé pour tenter sa chance
            plutôt que pour signaler son incertitude, un peu comme un étudiant
            devant un questionnaire sans point négatif
            <Ref
              n={10}
              title="Kalai et al., Why Language Models Hallucinate, 2025"
            />
            . Ce serait une des raisons pour lesquelles ces modèles admettent si
            rarement leur ignorance.
          </Callout>
        </>
      ),
      slide: {
        title: "L'apprentissage",
        figure: <FigureTraining />,
        punch: (
          <>
            <p>
              Une abstention ne rapporte rien ; une réponse hasardeuse peut
              tomber juste.
            </p>
            <p>
              D'où, sans doute, la difficulté du modèle à{" "}
              <strong>admettre son ignorance</strong>.
            </p>
          </>
        ),
      },
    },

    {
      id: "entrainement-inference",
      title: "Entraînement et inférence",
      reading: (
        <>
          <p>
            Deux moments très différents de la vie d'un modèle portent des noms
            qu'il faut distinguer, car on les confond souvent.
          </p>
          <Steps>
            <StepCard number={1} color="sky" title="L'entraînement">
              <p>
                La phase de fabrication décrite ci-dessus. Elle dure des
                semaines, mobilise des milliers de processeurs spécialisés, et
                n'a lieu <strong>qu'une fois</strong> (puis à chaque nouvelle
                version). C'est là que les paramètres sont fixés.
              </p>
            </StepCard>
            <StepCard number={2} color="blue" title="L'inférence">
              <p>
                L'utilisation du modèle une fois entraîné : vous posez une
                question, il produit une réponse. Les paramètres{" "}
                <strong>ne changent plus</strong>.
              </p>
              <p>
                C'est ce que vous ferez pendant tout le TD — et c'est la seule
                phase à laquelle un utilisateur a accès.
              </p>
            </StepCard>
          </Steps>
          <Callout
            type="warning"
            title="Le modèle n'apprend pas de vos conversations"
          >
            C'est la conséquence la plus utile de cette distinction. Corriger un
            modèle en pleine conversation ne le modifie pas : il tiendra compte
            de votre correction jusqu'à la fin de l'échange, parce qu'elle reste
            dans sa fenêtre de contexte, puis l'oubliera — sauf si l'application
            dispose d'un <strong>mécanisme de mémoire</strong> qui la conserve
            d'une conversation à l'autre, comme nous le verrons pendant le TD.
            Même dans ce cas, c'est l'application qui retient, pas le modèle, et
            ses paramètres restent inchangés. Vos échanges peuvent en revanche
            être conservés par l'éditeur et servir à entraîner de{" "}
            <em>futures</em> versions — ce qui est un tout autre sujet, celui de
            la confidentialité.
          </Callout>
        </>
      ),
      slide: {
        title: "Entraînement et inférence",
        figure: <FigureTrainInfer />,
        punch: (
          <>
            <p>
              Le modèle <strong>n'apprend pas</strong> de vos conversations.
            </p>
            <p>Ce que vous lui dites ne modifie jamais ses paramètres.</p>
          </>
        ),
      },
    },

    {
      id: "taille",
      title: "La taille du modèle",
      reading: (
        <>
          <p>
            On décrit un modèle par son nombre de <strong>paramètres</strong> —
            les valeurs ajustées pendant l'entraînement — exprimé en milliards
            (noté <em>B</em>, pour <em>billion</em>). Le TD vous fera comparer
            trois modèles : 4 et 70 milliards de paramètres, et un modèle commercial
            dont la taille n'est pas publiée.
          </p>
          <p>
            Pour situer ces ordres de grandeur, on se heurte à un problème : les
            éditeurs des grands modèles commerciaux{" "}
            <strong>ne publient plus leurs chiffres</strong>. GPT-3 comptait 175
            milliards de paramètres, documenté par OpenAI en 2020
            <Ref
              n={5}
              title="Brown et al., Language Models are Few-Shot Learners, 2020"
            />
            . Depuis GPT-4, OpenAI ne communique plus ni taille ni architecture.
            Le chiffre de 1 800 milliards souvent cité pour GPT-4 provient d'une{" "}
            <em>fuite</em> relayée par la presse spécialisée, jamais confirmée
            <Ref
              n={6}
              title="Estimations de presse, non confirmées par OpenAI"
            />{" "}
            : à manier avec prudence, comme tout chiffre non officiel.
          </p>
          <p>
            Retenez donc l'ordre de grandeur plutôt que le chiffre : les modèles
            ouverts que vous utiliserez se comptent en <strong>dizaines</strong>{" "}
            de milliards de paramètres, les plus gros modèles commerciaux
            probablement en <strong>centaines, voire milliers</strong>.
          </p>
          <p>
            Cette taille a un coût direct. Un modèle plus gros consomme
            davantage d'énergie — <strong>à l'entraînement</strong>, où celui de
            GPT-3 a été estimé à environ 1 287 MWh
            <Ref
              n={7}
              title="Patterson et al., 2021 ; estimations d'énergie d'entraînement"
            />
            , et <strong>à chaque inférence</strong>, donc à chacune de vos
            questions. Comme les inférences se comptent en milliards, elles
            finissent par peser bien plus lourd que l'entraînement, pourtant
            spectaculaire.
          </p>
          <p>
            Et la taille ne fait pas tout : un petit modèle récent bien entraîné
            dépasse souvent un gros modèle plus ancien, et surtout,{" "}
            <strong>
              aucun modèle n'est fiable du seul fait qu'il est gros
            </strong>
            .
          </p>
          <Callout type="info" title="Ce que le TD vous fera constater">
            Un modèle de 4 milliards et un modèle de 70 milliards ne se trompent
            pas de la même façon. Le petit se trompe souvent de manière visible
            ; le gros se trompe plus rarement, mais de manière beaucoup plus
            crédible — donc plus dangereuse pour qui ne vérifie pas.
          </Callout>
        </>
      ),
      slide: {
        title: "La taille du modèle",
        lead: "Mesurée en milliards de paramètres.",
        figure: <FigureSize />,
        punch: (
          <>
            <p>
              Plus gros = plus coûteux en énergie, à l'entraînement comme à
              chaque question.
            </p>
            <p>Et la taille ne garantit jamais la justesse.</p>
          </>
        ),
      },
    },

    {
      id: "petits-modeles",
      title: "Les petits modèles spécialisés",
      reading: (
        <>
          <p>
            La course à la taille n'est pas la seule voie, et une question de
            bon sens se pose : pourquoi mobiliser un modèle capable de parler
            trente langues, d'écrire du code et de résoudre des problèmes de
            mathématiques, quand on attend seulement une réponse sur une
            question médicale ?
          </p>
          <p>
            D'où l'intérêt croissant pour des{" "}
            <strong>petits modèles spécialisés</strong> : des modèles de
            quelques milliards de paramètres, entraînés ou ajustés sur un
            domaine précis. En biomédecine, des modèles comme BioMistral ou
            BioMedLM ont été construits sur cette idée, en s'appuyant notamment
            sur les corpus de PubMed.
          </p>
          <Callout type="success" title="Trois avantages concrets en santé">
            <ul>
              <li>
                <strong>Le coût et l'énergie.</strong> Un modèle de 7 milliards
                de paramètres consomme une fraction de ce que consomme un modèle
                de plusieurs centaines.
              </li>
              <li>
                <strong>La confidentialité.</strong> Un petit modèle peut
                tourner <em>sur les serveurs de l'hôpital</em>, sans que les
                données patient ne sortent de l'établissement — ce qui change
                radicalement le problème que nous verrons dans le second cours.
              </li>
              <li>
                <strong>La maîtrise.</strong> Un modèle hébergé localement ne
                change pas du jour au lendemain parce qu'un éditeur a déployé
                une nouvelle version.
              </li>
            </ul>
          </Callout>
        </>
      ),
      slide: {
        title: "Les petits modèles spécialisés",
        lead: "Pourquoi un modèle qui sait tout faire, quand on a besoin d'une réponse médicale ?",
        figure: <FigureSmallModels />,
        punch: (
          <>
            Moins d'énergie, des données qui{" "}
            <strong>restent à l'hôpital</strong>, et un modèle qui ne change pas
            du jour au lendemain.
          </>
        ),
      },
    },

    {
      id: "inference",
      title: "Comment une réponse est produite",
      reading: (
        <>
          <p>
            Quand vous posez une question, le modèle calcule, pour chaque token
            possible, une probabilité d'être le suivant. Puis il en{" "}
            <strong>tire un au sort</strong>, l'ajoute au texte, et recommence —
            jusqu'à la fin de la réponse.
          </p>
          <p>
            La <strong>température</strong> règle la largeur de ce tirage.
            Déplacez le curseur et observez les probabilités se déformer :
          </p>
          <TemperatureDemo />
          <p>
            Deux autres réglages découpent la même distribution autrement : le{" "}
            <strong>top-k</strong> ne conserve que les <em>k</em> candidats les
            plus probables, et le <strong>top-p</strong> ne conserve que les
            plus probables jusqu'à atteindre une probabilité cumulée <em>p</em>.
            Ils agissent tous les trois sur le même tirage.
          </p>
          <Callout type="warning" title="Constant ne veut pas dire juste">
            Abaisser la température ne corrige rien : elle rend le modèle{" "}
            <strong>reproductible</strong>, pas véridique. Une posologie fausse
            à 0,7 reste fausse à 0, et le sera à chaque fois.
          </Callout>
          <LabLink href={`${TD}?step=settings`} exercise="Ex 4 · Hasard">
            Vous poserez trois fois la même question au même modèle, à
            différentes températures, et comparerez les réponses obtenues.
          </LabLink>
        </>
      ),
      slide: {
        title: "Une réponse est un tirage",
        lead: "Bougez la température : la distribution se déforme sous vos yeux.",
        figure: <TemperatureDemo />,
        points: [
          <>
            <strong>Top-k</strong> et <strong>top-p</strong> découpent la même
            distribution autrement.
          </>,
          <>
            Pas « la » réponse du modèle, mais une réponse{" "}
            <strong>parmi celles qu'il pouvait produire</strong>.
          </>,
        ],
        punch: (
          <>
            <p>Constant ne veut pas dire juste.</p>
            <p>Une posologie fausse à 0,7 reste fausse à 0.</p>
          </>
        ),
      },
    },

    {
      id: "contexte",
      title: "La fenêtre de contexte",
      reading: (
        <>
          <p>
            On appelle <strong>fenêtre de contexte</strong> la{" "}
            <strong>
              quantité maximale de texte qu'un modèle peut prendre en compte en
              une seule fois
            </strong>
            , mesurée en tokens. C'est son champ de vision : au-delà, il ne voit
            simplement rien.
          </p>
          <p>
            L'image de la fenêtre est assez juste. Le modèle ne « lit » pas un
            document comme vous liriez un livre, page après page en gardant le
            fil : il reçoit d'un bloc tout ce qui doit entrer dans son champ de
            vision, et ne peut raisonner que là-dessus. Ce qui n'y tient pas
            n'est pas mis de côté pour plus tard — il n'existe pas.
          </p>
          <p>
            Or tout doit y entrer : la consigne système, l'historique de la
            conversation, les documents que vous joignez, et votre question.
            Quand la fenêtre est pleine, il faut couper quelque part, et ce qui
            est coupé est <strong>oublié</strong>.
          </p>
          <p>Quelques repères pour se représenter ces tailles :</p>
          <FigureContextScale />
          <p>
            Les grands modèles récents — Gemini, ChatGPT, Claude — annoncent
            désormais des fenêtres de l'ordre du{" "}
            <strong>million de tokens</strong>. Concrètement, on peut y coller
            un roman entier et demander un résumé : les sept tomes de Harry
            Potter représentent environ 1,08 million de mots
            <Ref
              n={8}
              title="Décomptes de mots de la saga, sources non officielles"
            />
            , soit à peu près 1,5 million de tokens — on y est presque.
            Toutefois, chaque token envoyé est calculé, donc{" "}
            <strong>payé et consommé en énergie</strong> : remplir une telle
            fenêtre a un coût sans commune mesure avec une question ordinaire.
          </p>
          <Callout
            type="warning"
            title="Une grande fenêtre ne veut pas dire qu'elle est bien utilisée"
          >
            <p>
              Les modèles n'exploitent pas uniformément ce qu'on leur donne. Le
              phénomène est connu sous le nom de «{" "}
              <strong>lost in the middle</strong> » : l'information placée{" "}
              <strong>au milieu</strong> d'un long contexte est nettement moins
              bien utilisée que celle située au début ou à la fin, ce qui
              dessine une courbe de performance en U
              <Ref n={9} title="Liu et al., Lost in the Middle, TACL 2024" />.
            </p>
          </Callout>
          <p>
            La conséquence pratique est directe :{" "}
            <strong>
              mieux vaut une fenêtre bien remplie qu'une fenêtre pleine
            </strong>
            . Savoir quand repartir d'une conversation neuve, quoi joindre et
            quoi laisser de côté fait une vraie différence — sur la qualité
            comme sur le coût. C'est tout l'objet du second cours.
          </p>
          <Callout
            type="info"
            title="Un budget volontairement réduit pendant le TD"
          >
            Le TD fixe un budget de contexte minuscule (de l'ordre de 1 000
            tokens) au lieu des 131 072 réels. Ce n'est pas une limite technique
            : c'est pour que vous atteigniez la saturation pendant la séance, et
            voyiez ce qui se passe alors.
          </Callout>
        </>
      ),
      slide: {
        title: "La fenêtre de contexte",
        lead: "Le champ de vision du modèle : tout doit y entrer, et ce qui n'y tient pas n'existe pas.",
        figure: <FigureContextScale />,
        punch: (
          <>
            Une grande fenêtre ne veut pas dire qu'elle est bien utilisée : au
            milieu d'un long contexte, l'information est moins bien exploitée («
            lost in the middle »).
          </>
        ),
      },
    },

    {
      id: "hallucination",
      title: "L'hallucination",
      reading: (
        <>
          <p>
            On appelle <strong>hallucination</strong> le fait, pour un modèle,
            de produire une information fausse en la présentant avec la même
            assurance qu'une information juste : une posologie inexacte, une
            molécule qui n'existe pas, une référence bibliographique entièrement
            fabriquée.
          </p>
          <p>
            Ce n'est pas un bug que l'on corrigera dans la prochaine version.
            C'est la <strong>conséquence directe du mécanisme</strong> décrit
            dans ce cours : un système qui assemble les suites de mots les plus
            plausibles produira, quand il ne « sait » pas, une suite de mots
            plausible plutôt que rien. Une fausse référence est même{" "}
            <em>particulièrement</em> plausible, puisqu'elle a exactement la
            forme d'une vraie.
          </p>
          <Callout type="warning" title="Ce que dit la littérature">
            Dans une étude de 2025 portant sur les hallucinations médicales,{" "}
            <strong>91,8 % des cliniciens interrogés</strong> déclaraient en
            avoir déjà rencontré, et <strong>84,7 %</strong> les jugeaient
            susceptibles de causer un tort au patient
            <Ref
              n={4}
              title="Kim et al., Medical Hallucinations in Foundation Models, 2025"
            />
            .
          </Callout>
          <p>
            D'où le paradoxe que le TD vous fera éprouver directement : pour
            vérifier une réponse, il faut déjà connaître la réponse. Or on
            interroge précisément parce qu'on ne sait pas.{" "}
            <strong>
              Aucune amélioration du modèle ne supprime ce paradoxe
            </strong>{" "}
            — seule une source vérifiable le fait, et c'est l'objet du second
            cours.
          </p>
          <LabLink href={`${TD}?step=warmup`} exercise="Ex 1 · Échauffement">
            Vous jugerez des réponses à l'aveugle, sans avoir accès à la
            recommandation officielle. L'exercice est volontairement conçu pour
            que vous n'y arriviez pas.
          </LabLink>
        </>
      ),
      slide: {
        title: "L'hallucination",
        lead: "Produire du faux avec l'aplomb du vrai.",
        figure: <FigureHallucination />,
        punch: (
          <>
            Pas un bug à corriger : la <strong>conséquence directe</strong> du
            mécanisme de prédiction.
          </>
        ),
      },
    },

    {
      id: "paradoxe",
      title: "Le paradoxe de la vérification",
      level: 3,
      reading: (
        <>
          <p>
            Ce paradoxe mérite d'être énoncé seul, parce qu'il commande toute la
            suite : il ne se règle ni par un meilleur modèle, ni par un meilleur
            prompt. Seule une <strong>source vérifiable</strong> le casse —
            c'est l'objet du second cours.
          </p>
        </>
      ),
      slide: {
        title: "Le paradoxe de la vérification",
        figure: <FigureParadox />,
        punch: (
          <>
            <p>Aucune amélioration du modèle ne supprime ce paradoxe.</p>
            <p>
              Il faut une <strong>source</strong>.
            </p>
          </>
        ),
      },
    },

    {
      id: "aller-plus-loin",
      title: "Pour aller plus loin",
      reading: (
        <>
          <p>
            Ces ressources sont facultatives. Les outils interactifs sont les
            plus utiles si vous voulez manipuler par vous-même les notions du
            cours.
          </p>
          <ResourcesCourse1 />
          <References
            items={[
              {
                citation: (
                  <>
                    Meta AI, « Introducing Meta Llama 3: The most capable openly
                    available LLM to date », 18 avril 2024. Taille du corpus
                    (plus de 15 000 milliards de tokens) et description des
                    filtres de qualité appliqués aux données d'entraînement.
                  </>
                ),
                href: "https://ai.meta.com/blog/meta-llama-3/",
              },
              {
                citation: (
                  <>
                    OpenAI Help Center, « Understanding and counting tokens ».
                    Règle approximative de 1 token ≈ 4 caractères ≈ 0,75 mot en
                    anglais, et découpage des mots rares en fragments.
                  </>
                ),
                href: "https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them",
              },
              {
                citation: (
                  <>
                    Petrov A. et al., « Language Model Tokenizers Introduce
                    Unfairness Between Languages », NeurIPS 2023
                    (arXiv:2305.15425), et travaux ultérieurs sur la « taxe de
                    tokenisation ». Le français consomme environ 1,5 à 2,1
                    tokens par mot contre 1,2 à 1,4 pour l'anglais.
                  </>
                ),
                href: "https://arxiv.org/abs/2305.15425",
              },
              {
                citation: (
                  <>
                    Kim Y., Jeong H., Chen S. et al., « Medical Hallucinations
                    in Foundation Models and Their Impact on Healthcare »,
                    arXiv:2503.05777, 2025. Enquête auprès de cliniciens (91,8 %
                    ayant rencontré une hallucination médicale, 84,7 % la
                    jugeant potentiellement délétère).
                  </>
                ),
                href: "https://arxiv.org/abs/2503.05777",
              },
              {
                citation: (
                  <>
                    Brown T. et al., « Language Models are Few-Shot Learners »,
                    NeurIPS 2020 (arXiv:2005.14165). Article de référence de
                    GPT-3, dont les 175 milliards de paramètres sont documentés
                    — contrairement aux modèles commerciaux ultérieurs.
                  </>
                ),
                href: "https://arxiv.org/abs/2005.14165",
              },
              {
                citation: (
                  <>
                    Taille de GPT-4 : OpenAI n'a publié ni le nombre de
                    paramètres ni l'architecture. Le chiffre de ~1 800
                    milliards, largement repris, provient de documents ayant
                    fuité et relayés par la presse spécialisée. Il n'a jamais
                    été confirmé et doit être cité comme une estimation.
                  </>
                ),
              },
              {
                citation: (
                  <>
                    Décomptes de mots de la saga Harry Potter : environ 1 084
                    170 mots pour les sept tomes. Chiffres largement repris mais
                    non officiels, qui varient légèrement selon les éditions. La
                    conversion en tokens (~1,5 million) applique le ratio moyen
                    anglais de la référence [2].
                  </>
                ),
              },
              {
                citation: (
                  <>
                    Liu N. F., Lin K., Hewitt J. et al., « Lost in the Middle:
                    How Language Models Use Long Contexts », <em>TACL</em> 2024
                    (arXiv:2307.03172). Courbe de performance en U selon la
                    position de l'information dans le contexte.
                  </>
                ),
                href: "https://arxiv.org/abs/2307.03172",
              },
              {
                citation: (
                  <>
                    Patterson D. et al., « Carbon Emissions and Large Neural
                    Network Training », arXiv:2104.10350, 2021. L'entraînement
                    de GPT-3 y est estimé à environ 1 287 MWh. Les estimations
                    d'énergie varient sensiblement selon les hypothèses et le
                    matériel considéré.
                  </>
                ),
                href: "https://arxiv.org/abs/2104.10350",
              },
              {
                citation: (
                  <>
                    Kalai A. T., Nachum O., Vempala S. S., Zhang E., « Why
                    Language Models Hallucinate », arXiv:2509.04664, 2025. Les
                    auteurs attribuent la persistance des hallucinations au mode
                    de notation des évaluations, qui récompense une réponse
                    hasardeuse plutôt qu'une abstention.
                  </>
                ),
                href: "https://arxiv.org/abs/2509.04664",
              },
            ]}
          />
        </>
      ),
    },
  ],

  takeaways: [
    <>
      Un LLM <strong>prédit le mot suivant</strong> à partir de régularités
      statistiques. Il ne comprend pas et ne consulte aucune base de données.
    </>,
    <>
      Le texte est découpé en <strong>tokens</strong> (~4 caractères), convertis
      en <strong>vecteurs</strong> dont la proximité mesure la proximité de
      sens.
    </>,
    <>
      Sa connaissance est <strong>figée</strong> à la date de son corpus, et il
      ne sait pas d'où vient ce qu'il affirme.
    </>,
    <>
      Chaque réponse est un <strong>tirage</strong> ; la température en règle la
      largeur. <strong>Reproductible ne veut pas dire juste.</strong>
    </>,
    <>
      L'<strong>hallucination</strong> est structurelle, pas accidentelle : le
      modèle produit du plausible, et le faux plausible ressemble au vrai.
    </>,
  ],
};

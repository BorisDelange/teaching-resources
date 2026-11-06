import {
  Callout,
  LabLink,
  StepCard,
  Steps,
  Summary,
} from "@/components/article/blocks";
import { Ref, References } from "@/components/article/references";
import type { CourseArticle } from "@/components/article/types";
import {
  FigureApplication,
  FigureAvec,
  FigureChunkContext,
  FigureCost,
  FigureEmbedding,
  FigureMemory,
  FigureMemoryGrowth,
  FigurePayload,
  FigurePromptLevels,
  FigureRag,
  FigureSummaryCall,
  FigureTopicDrift,
} from "./figures";
import { RetrievalPlot } from "./interactive";
import { ResourcesCourse2 } from "./resources";

const TD = "/courses/llm/chatbots";

export const COURSE_USAGE: CourseArticle = {
  slug: "usage",
  title: "Utiliser un LLM : prompt, mémoire et documents",
  description:
    "Ce qui se passe entre votre question et la réponse : la consigne cachée, l'historique renvoyé à chaque tour, et la recherche dans vos documents.",
  minutes: 30,
  index: "2/2",

  summary: (
    <Summary>
      Un assistant comme ChatGPT n'est pas un modèle : c'est une{" "}
      <strong>application autour d'un modèle</strong>. Entre votre question et
      la réponse, elle ajoute une consigne que vous ne voyez pas, recolle tout
      l'historique de la conversation, et va parfois chercher des passages dans
      vos documents. Comprendre ces trois couches, c'est comprendre pourquoi la
      même question donne des réponses différentes selon l'outil — et où
      exactement se glissent les erreurs.
    </Summary>
  ),

  sections: [
    {
      id: "application",
      title: "Le modèle et l'application autour",
      reading: (
        <>
          <p>
            Le cours précédent décrivait le modèle. Or vous n'interagissez
            jamais directement avec un modèle : vous passez par une application
            — ChatGPT, Claude, ou celle du TD — qui prépare ce qui lui est
            envoyé et met en forme ce qui en revient.
          </p>
          <p>
            À chaque message que vous envoyez, l'application construit un paquet
            de texte contenant, dans cet ordre : la{" "}
            <strong>consigne système</strong>, l'
            <strong>historique de la conversation</strong>, les{" "}
            <strong>documents</strong> éventuellement joints, puis votre{" "}
            <strong>question</strong>. Ce paquet entier est envoyé au modèle,
            qui n'a aucune mémoire de l'appel précédent.
          </p>
          <FigurePayload />
          <p>
            Le TD vous permettra d'ouvrir ce paquet : un bouton en forme d'œil
            affiche, à chaque envoi, les blocs réellement transmis.
          </p>
          <Callout type="info" title="La conséquence la plus contre-intuitive">
            Le modèle est <strong>sans état</strong>. Il ne « garde » rien entre
            deux messages. La continuité que vous percevez dans une conversation
            est entièrement fabriquée par l'application, qui renvoie
            l'historique à chaque fois. Ce que vous vivez comme une conversation
            est une succession d'appels indépendants.
          </Callout>
        </>
      ),
      slide: {
        title: "Le modèle et l'application",
        lead: "Vous parlez à une application, pas à un modèle.",
        figure: <FigureApplication />,
        punch: (
          <>
            Le modèle est <strong>sans état</strong> : la continuité est
            entièrement fabriquée par l'application.
          </>
        ),
      },
    },

    {
      id: "system-prompt",
      title: "La consigne système",
      reading: (
        <>
          <p>
            Avant votre première question, l'application envoie au modèle une{" "}
            <strong>consigne système</strong> que vous ne voyez pas. Elle fixe
            le ton, la longueur des réponses, les sujets à refuser, la façon de
            s'adresser à vous.
          </p>
          <p>
            ChatGPT, Claude, Gemini : tous fonctionnent ainsi. Quand vous lisez
            une réponse d'IA, vous lisez toujours le produit d'une consigne
            écrite par quelqu'un d'autre — l'éditeur de l'outil, dont les
            objectifs ne sont pas nécessairement les vôtres.
          </p>
          <Callout type="example" title="La consigne utilisée dans le TD">
            <p className="font-mono text-xs">
              « Réponds DIRECTEMENT et de façon concise : molécule, posologie,
              durée. Pas de disclaimer, pas de "consultez un médecin" : ton
              interlocuteur EST médecin. Maximum 120 mots. »
            </p>
            <p>
              Un <em>disclaimer</em>, ici, désigne l'avertissement de
              non-responsabilité que les modèles ajoutent spontanément. Sans
              cette consigne, ils répondent « je suis une IA, consultez un
              médecin ».
            </p>
          </Callout>
        </>
      ),
      slide: {
        title: "La consigne système",
        lead: "Une consigne invisible précède toujours votre question.",
        figure: (
          <div className="not-prose rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/50 p-6 dark:bg-blue-950/20">
            <p className="mb-3 text-sm font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">
              ce que le TD envoie avant chacune de vos questions
            </p>
            <p className="font-mono text-lg leading-relaxed text-[var(--color-foreground)]">
              « Réponds DIRECTEMENT et de façon concise : molécule, posologie,
              durée. Pas de disclaimer, pas de "consultez un médecin" : ton
              interlocuteur EST médecin. Maximum 120 mots. »
            </p>
          </div>
        ),
        punch: (
          <>
            Vous lisez toujours le produit d'une consigne écrite par{" "}
            <strong>quelqu'un d'autre</strong>.
          </>
        ),
      },
    },

    {
      id: "prompt",
      title: "Écrire un bon prompt",
      reading: (
        <>
          <p>
            Le mot <strong>prompt</strong> désigne le texte que vous écrivez
            pour obtenir une réponse — votre question, mais aussi tout ce que
            vous y ajoutez : le contexte du patient, le rôle que vous assignez
            au modèle, la forme de réponse attendue. Dans la pile des quatre
            blocs envoyés au modèle, c'est le bloc 4 : le seul que vous
            écrivez.{" "}
            <em>Prompt engineering</em> désigne l'art de le composer.
          </p>
          <p>
            Attention à un usage flottant du mot : dans la littérature
            technique, « prompt » désigne parfois l'intégralité du paquet envoyé
            au modèle, consigne système et historique compris. Ici, il ne
            désigne que ce que vous tapez.
          </p>
          <p>
            La façon dont vous le formulez change considérablement la réponse.
            Le TD vous fera gravir quatre paliers cumulatifs, inspirés d'un
            tutoriel publié dans le{" "}
            <em>Journal of Medical Internet Research</em> en 2025
            <Ref
              n={1}
              title="Liu et al., Prompt Engineering in Clinical Practice, JMIR 2025"
            />
            .
          </p>
          <Steps>
            <StepCard number={1} color="sky" title="La question directe">
              « Quel antibiotique pour une pyélonéphrite ? » Le modèle répond
              une moyenne de ce qu'il a lu, sans savoir de quel patient il
              s'agit.
            </StepCard>
            <StepCard number={2} color="blue" title="Le contexte clinique">
              On ajoute l'âge, le poids, la fonction rénale, les allergies.
              Vérifiez alors si le DFG est réellement pris en compte dans la
              posologie, ou seulement recopié.
            </StepCard>
            <StepCard number={3} color="indigo" title="Un rôle et des sources">
              « Tu es infectiologue, cite tes sources. » Attention : le modèle
              ne consulte aucun document. Il produit ce qui <em>ressemble</em> à
              une référence.
            </StepCard>
            <StepCard
              number={4}
              color="violet"
              title="Le droit de ne pas savoir"
            >
              « Si tu n'es pas sûr, dis-le plutôt que d'inventer. Raisonne étape
              par étape. » Détailler le raisonnement le rend vérifiable.
            </StepCard>
          </Steps>
          <Callout type="warning" title="Le piège du palier 3">
            Une source citée n'est pas une source vraie. Société savante, année,
            parfois un numéro de page : tout peut être inventé. Et une{" "}
            <strong>référence inventée rassure bien plus</strong> qu'une réponse
            sans source. C'est le piège le plus dangereux du TD.
          </Callout>
          <p>
            Retenez surtout ceci :{" "}
            <strong>un prompt oriente le modèle, il ne lui apprend rien</strong>
            . Même au palier 4, le modèle reste seul avec ce qu'il a mémorisé
            pendant son entraînement. Pour qu'il s'appuie sur la vraie
            recommandation, il faut la lui <strong>donner</strong>.
          </p>
          <LabLink href={`${TD}?step=prompt`} exercise="Ex 3 · Prompt">
            Vous gravirez ces quatre paliers avec le même cas clinique, en
            observant
            le compteur de tokens monter à chaque fois : un meilleur prompt
            coûte plus cher.
          </LabLink>
        </>
      ),
      slide: {
        title: "Écrire un bon prompt",
        lead: "Le prompt, c'est ce que vous écrivez : le seul des quatre blocs que vous contrôlez. Quatre paliers cumulatifs, sur le même cas clinique.",
        figure: <FigurePromptLevels />,
        punch: (
          <>
            Un prompt <strong>oriente</strong> le modèle, il ne lui{" "}
            <strong>apprend</strong> rien.
          </>
        ),
      },
    },

    {
      id: "memoire",
      title: "La mémoire de conversation",
      reading: (
        <>
          <p>
            Puisque le modèle est sans état, l'application doit lui renvoyer
            l'historique à chaque message. Trois stratégies existent, que le TD
            vous fera comparer sur la même conversation.
          </p>
          <Steps>
            <StepCard number={1} color="rose" title="Aucune mémoire">
              Seul votre dernier message part. Chaque question repart de zéro :
              le modèle a oublié le DFG que vous aviez donné deux messages plus
              tôt.
            </StepCard>
            <StepCard number={2} color="amber" title="Mémoire complète">
              Tous les échanges précédents sont recopiés intégralement. Fidèle,
              mais le coût croît à chaque tour et la fenêtre de contexte finit
              par saturer.
            </StepCard>
            <StepCard number={3} color="emerald" title="Mémoire résumée">
              Les échanges anciens sont condensés en un résumé, les plus récents
              restent mot pour mot. C'est ainsi que fonctionnent ChatGPT et
              Claude.
            </StepCard>
          </Steps>
          <p>
            La différence entre les deux dernières stratégies n'est pas une
            affaire de quelques pourcents. Puisque chaque message renvoie tout
            ce qui précède, le coût d'un tour grandit avec le numéro du tour :
            le cumul ne monte pas en ligne droite, il s'incurve.
          </p>
          <FigureMemoryGrowth />
          <p>
            Retenez la forme plutôt que les chiffres :{" "}
            <strong>
              doubler la longueur d'une conversation en quadruple à peu près le
              coût
            </strong>
            . C'est ce qui rend les conversations-fleuves si chères, et c'est ce
            que le résumé vient corriger.
          </p>
          <LabLink href={`${TD}?step=memory`} exercise="Ex 5 · Mémoire">
            Vous rejouerez la même conversation dans les trois modes, et pourrez
            inspecter, via un bouton en forme d'œil, exactement ce qui a été
            envoyé au modèle.
          </LabLink>
        </>
      ),
      slide: {
        title: "La mémoire de conversation",
        lead: "Ce qui part réellement au modèle, selon le mode choisi.",
        figure: <FigureMemory />,
        punch: (
          <>
            Résumer, c'est <strong>choisir ce qu'on oublie</strong> — et rien ne
            vous prévient de ce qui a disparu.
          </>
        ),
      },
    },

    {
      id: "cout-memoire",
      title: "Ce que coûte un résumé",
      level: 3,
      reading: (
        <>
          <p>
            Reste à savoir d'où sort ce résumé. Il n'est pas calculé par une
            formule : il est <strong>demandé au modèle</strong>, par un appel
            supplémentaire dont vous ne voyez jamais ni la requête ni la
            réponse.
          </p>
          <FigureSummaryCall />
          <p>
            C'est la deuxième surprise de cette section :{" "}
            <strong>
              un message que vous envoyez ne déclenche pas toujours un seul
              appel
            </strong>
            . Quand le résumé se met à jour, deux générations sont facturées
            pour un seul de vos messages. L'économie reste très largement
            gagnante sur une longue conversation — mais elle n'est pas gratuite.
          </p>
          <Callout
            type="warning"
            title="Résumer, c'est choisir ce qu'on oublie"
          >
            Le résumé fait retomber le coût, mais il est produit par le modèle
            lui-même. Il peut omettre le DFG, une allergie, une décision.{" "}
            <strong>Ce qui disparaît du résumé disparaît de la mémoire</strong>{" "}
            — et rien ne vous prévient.
          </Callout>
        </>
      ),
      slide: {
        title: "Ce que coûte un résumé",
        lead: "Un message de votre part, deux appels au modèle.",
        figure: <FigureSummaryCall />,
        punch: (
          <>
            Le résumé est <strong>une génération comme une autre</strong> : il
            coûte, et il peut se tromper.
          </>
        ),
      },
    },

    {
      id: "paradoxe-tokens",
      title: "Le paradoxe des dix mots",
      level: 3,
      reading: (
        <>
          <p>
            Voici maintenant la conséquence la plus concrète pour votre usage
            quotidien. Une conversation vit longtemps, et l'on y enchaîne
            naturellement des sujets sans rapport : un cas clinique, puis la
            relecture d'un article dont on a joint le PDF, puis un courrier de
            sortie. Tout cela s'empile dans le même historique.
          </p>
          <FigureTopicDrift />
          <p>
            Vous avez l'impression d'avoir envoyé dix mots. Vous venez d'en
            envoyer cent quatre-vingt mille — dont l'écrasante majorité
            n'a aucun rapport avec votre question. Et vous recommencerez au
            message suivant, et à celui d'après.
          </p>
          <Callout
            type="info"
            title="Le réflexe à prendre : une conversation par sujet"
          >
            <p>
              <strong>
                Dès que vous changez de sujet, ouvrez une conversation neuve.
              </strong>{" "}
              C'est le geste le plus rentable de tout ce cours : il fait
              retomber le contexte à zéro, donc le coût, la latence, et le
              risque que le modèle aille pêcher une information dans un sujet
              qui n'a plus lieu d'être.
            </p>
            <p>
              La qualité y gagne aussi. Souvenez-vous du « lost in the middle »
              du cours précédent : plus l'historique est long, moins
              l'information utile est bien exploitée. Un historique encombré de
              trois sujets étrangers, c'est de la place perdue et de
              l'attention diluée.
            </p>
          </Callout>
        </>
      ),
      slide: {
        title: "Le paradoxe des dix mots",
        lead: "Trois sujets empilés, et une question de dix mots qui renvoie les trois.",
        figure: <FigureTopicDrift />,
        punch: (
          <>
            Dès que vous changez de sujet,{" "}
            <strong>ouvrez une conversation neuve</strong>.
          </>
        ),
      },
    },

    {
      id: "rag",
      title: "Le RAG : faire lire un document au modèle",
      reading: (
        <>
          <p>
            Pour qu'un modèle s'appuie sur la vraie recommandation, il faut la
            lui fournir. Joindre un document, c'est simplement en{" "}
            <strong>
              extraire le texte et le coller devant votre question
            </strong>{" "}
            : le modèle n'« ouvre » pas votre PDF.
          </p>
          <p>
            Une recommandation complète de société savante fait couramment{" "}
            <strong>une quarantaine de pages</strong> — de l'ordre de 13 000
            mots, soit environ 20 000 tokens.
            Cela tiendrait dans une grande fenêtre de contexte, mais il faudrait
            le renvoyer <em>en entier</em> à chaque message, pour n'en utiliser
            qu'un paragraphe. Multipliez par une bibliothèque de
            recommandations, et la chose devient intenable.
          </p>
          <p>
            L'application bascule alors, généralement sans vous le dire, vers
            une recherche : c'est le <strong>RAG</strong>, pour{" "}
            <em>Retrieval-Augmented Generation</em> — génération augmentée par
            récupération. Le principe tient en quatre étapes.
          </p>
          <Steps>
            <StepCard number={1} color="sky" title="Découpage (chunking)">
              Le document est coupé en passages, en suivant ses titres. Dans
              la fiche HAS du TD : « Pyélonéphrite aiguë simple », puis
              « Traitement probabiliste ».
            </StepCard>
            <StepCard number={2} color="blue" title="Indexation">
              Chaque passage est converti en vecteur, exactement comme les mots
              du cours précédent — et stocké une fois pour toutes.
            </StepCard>
            <StepCard number={3} color="indigo" title="Récupération">
              Votre question devient elle aussi un vecteur. On retient les
              passages dont le vecteur en est le plus proche — la fameuse «
              proximité de sens ».
            </StepCard>
            <StepCard number={4} color="emerald" title="Génération">
              Seuls ces quelques passages partent au modèle, avec votre
              question : quelques centaines de tokens au lieu de 20 000. Il
              répond à partir d'eux, et peut citer la page.
            </StepCard>
          </Steps>
        </>
      ),
      slide: {
        title: "Le RAG",
        lead: "Trop gros pour tenir dans le contexte ? On cherche au lieu de tout envoyer.",
        figure: <FigureRag />,
        punch: (
          <>
            <p>
              Si la recherche se trompe, la réponse est{" "}
              <strong>fausse ET sourcée</strong>.
            </p>
            <p>La citation rassure ; elle ne prouve rien.</p>
          </>
        ),
      },
    },

    {
      id: "embedding",
      title: "Comment un passage devient un point",
      level: 3,
      reading: (
        <>
          <p>
            L'étape 2 mérite qu'on s'y arrête, car c'est elle qui rend la
            recherche possible. Chaque token du passage possède déjà des
            coordonnées, apprises pendant l'entraînement. Pour obtenir un
            vecteur unique représentant le passage entier, on en fait — pour
            l'essentiel — la <strong>moyenne</strong>.
          </p>
          <FigureEmbedding />
          <p>
            Cette moyenne a une conséquence pratique importante :{" "}
            <strong>
              plus un passage est long, plus les mots qui le caractérisent
              pèsent peu
            </strong>{" "}
            dans le résultat. Un chapitre entier ramené à un seul point devient
            un point très « moyen », proche de tout et caractéristique de rien.
            C'est la première raison pour laquelle on découpe.
          </p>
          <p>
            Votre question subit exactement le même traitement. On peut alors
            la placer dans le même espace que les passages et mesurer leur{" "}
            <strong>similarité cosinus</strong> — celle du cours précédent, qui
            vaut 1 pour deux vecteurs de même direction et 0 pour deux vecteurs
            sans rapport. Reprenons la figure du cours précédent, avec cette
            fois des passages issus de deux documents différents du TD.
          </p>
          <RetrievalPlot />
          <p>
            C'est tout le principe : le passage retenu ne partage presque aucun
            mot avec la question. Une recherche par mots-clés l'aurait manqué.
            Le TD vous fera d'ailleurs comparer les deux méthodes sur cette
            question précise — le bon chapitre s'intitule « PNA{" "}
            <strong>simple</strong> », un mot qui ne figure pas dans une
            question posée en termes de « sans signe de gravité ».
          </p>
        </>
      ),
      slide: {
        title: "Chercher par le sens",
        lead: "La question devient un vecteur ; on garde les passages dont la similarité cosinus est la plus élevée.",
        figure: <RetrievalPlot />,
        punch: (
          <>
            Le bon passage ne partage <strong>presque aucun mot</strong> avec la
            question.
          </>
        ),
      },
    },

    {
      id: "chunking",
      title: "Le découpage décide de ce qu'on retrouvera",
      level: 3,
      reading: (
        <>
          <p>
            Reste un piège, invisible à l'usage mais déterminant. Un document
            médical ne répète pas son sujet à chaque paragraphe : la section
            « Traitement probabiliste » ne dit pas qu'elle concerne la
            pyélonéphrite <em>simple</em>. Le titre le disait, un niveau plus
            haut — et la fiche contient une autre section « Traitement », pour
            la pyélonéphrite à risque de complication, avec une autre durée.
          </p>
          <FigureChunkContext />
          <p>
            Retenez-en simplement ceci :{" "}
            <strong>
              la façon dont un document est découpé et indexé décide de ce qu'on
              pourra y retrouver
            </strong>
            . Construire un bon index est un métier ; ce n'est pas le vôtre.
            Mais savoir que cette étape existe vous évitera de croire qu'un
            outil « a lu » un document parce qu'il en cite une page.
          </p>
          <Callout type="note" title="Une étape souvent ajoutée : le reranking">
            Les systèmes les plus soignés ajoutent un second tri : un modèle
            spécialisé relit les passages retenus et les reclasse plus finement.
            Le TD n'en comporte pas — c'est un étage manquant qu'il est utile de
            savoir identifier.
          </Callout>
          <Callout
            type="warning"
            title="Si la recherche se trompe, le modèle suit"
          >
            Le point critique est là. Si la recherche remonte le mauvais
            chapitre, le modèle répondra à partir de ce mauvais chapitre —{" "}
            <strong>et citera la page, en toute confiance</strong>. La réponse
            sera fausse et sourcée. La citation rassure ; elle ne prouve pas que
            le bon passage a été trouvé.
          </Callout>
          <LabLink href={`${TD}?step=documents`} exercise="Ex 6 · Documents">
            Le TD affiche les passages retenus, leur score de proximité, leur
            coût en tokens, et vous laisse cliquer pour les voir surlignés dans
            le PDF d'origine.
          </LabLink>
        </>
      ),
      slide: {
        title: "Le découpage décide de tout",
        lead: "« Traitement » — mais de quoi ? Un passage coupé de ses titres devient ambigu.",
        figure: <FigureChunkContext />,
        punch: (
          <>
            <p>
              Si la recherche se trompe, la réponse est{" "}
              <strong>fausse ET sourcée</strong>.
            </p>
            <p>La citation rassure ; elle ne prouve rien.</p>
          </>
        ),
      },
    },

    {
      id: "cout",
      title: "Ce que ça coûte",
      reading: (
        <>
          <p>
            Tout se facture au token, en entrée comme en sortie. Trois réflexes
            en découlent : un prompt élaboré coûte plus qu'une question brève ;
            une conversation longue coûte bien plus que la somme de ses
            questions ; et un document joint est repayé à chaque tour tant qu'il
            reste dans la conversation.
          </p>
        </>
      ),
      slide: {
        title: "Ce que ça coûte",
        lead: "Tout se facture au token, en entrée comme en sortie.",
        figure: <FigureCost />,
        points: [
          <>
            Un prompt élaboré coûte plus cher qu'une question brève.
          </>,
          <>
            Une conversation longue coûte{" "}
            <strong>bien plus</strong> que la somme de ses questions.
          </>,
          <>Un document joint est repayé à chaque tour.</>,
        ],
      },
    },

    {
      id: "cadre",
      title: "Le cadre : ce que dit la HAS",
      reading: (
        <>
          <p>
            En octobre 2025, la Haute Autorité de Santé a publié ses premières
            recommandations sur l'usage de l'IA générative par les
            professionnels de santé. Sa position tient en une phrase :{" "}
            <strong>
              « Chaque usage doit être conscient, supervisé et raisonné. »
            </strong>
            <Ref n={2} title="HAS, L'IA générative en santé, octobre 2025" />
          </p>
          <p>
            Le guide s'articule autour de quatre principes, résumés par
            l'acronyme A.V.E.C. :
          </p>
          <Steps>
            <StepCard number={1} color="blue" title="Apprendre">
              S'approprier le fonctionnement du système et de son usage. C'est
              précisément l'objet de ces deux cours.
            </StepCard>
            <StepCard number={2} color="emerald" title="Vérifier">
              Contrôler la pertinence de l'usage, la qualité de la requête et le
              contenu généré.
            </StepCard>
            <StepCard number={3} color="amber" title="Estimer">
              Prendre du recul, régulièrement : cet outil me rend-il vraiment
              service, sa qualité s'est-elle dégradée depuis une mise à jour,
              reste-t-il adapté à ce que j'en attends ? C'est le seul des quatre
              principes qui ne se joue pas au moment où vous posez la question.
            </StepCard>
            <StepCard number={4} color="violet" title="Communiquer">
              Dire autour de soi qu'on a utilisé un tel outil, et signaler ce
              qui a mal tourné — à ses collègues, à son service. Une erreur tue
              gardée se répétera ailleurs.
            </StepCard>
          </Steps>
          <Callout
            type="warning"
            title="Aucune donnée patient dans un chatbot grand public"
          >
            Ce que vous écrivez dans un outil grand public{" "}
            <strong>sort de l'hôpital</strong> : nom, âge, antécédents sont
            transmis à un tiers et peuvent être conservés. Anonymisez toujours —
            et si le cas reste identifiable malgré l'anonymisation, ne le posez
            pas. Le secret médical ne connaît pas d'exception pour les outils
            pratiques.
          </Callout>
        </>
      ),
      slide: {
        title: "Le cadre : la HAS",
        lead: "« Chaque usage doit être conscient, supervisé et raisonné. » (octobre 2025)",
        figure: <FigureAvec />,
        punch: (
          <>
            <p>
              <strong>Aucune donnée patient</strong> dans un chatbot grand
              public.
            </p>
            <p>Ce que vous écrivez sort de l'hôpital.</p>
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
            Le guide de la HAS est le seul document de cette liste qui
            s'appliquera directement à votre pratique : lisez-le en entier, il
            est court. Le reste est facultatif.
          </p>
          <ResourcesCourse2 />
          <References
            items={[
              {
                citation: (
                  <>
                    Liu J., Liu F., Wang C., Liu S., « Prompt Engineering in
                    Clinical Practice: Tutorial for Clinicians »,{" "}
                    <em>J Med Internet Res</em> 2025;27:e72644. Source des
                    quatre paliers de prompt. Tutoriel narratif : il décrit les
                    techniques sans mesurer comparativement leur efficacité.
                  </>
                ),
                href: "https://doi.org/10.2196/72644",
              },
              {
                citation: (
                  <>
                    Haute Autorité de Santé, « L'IA générative en santé : oui,
                    avec un usage responsable » et guide « Premières clefs
                    d'usage de l'IA générative en santé », 30 octobre 2025.
                    Cadre A.V.E.C.
                  </>
                ),
                href: "https://www.has-sante.fr/jcms/p_3703069/fr/l-ia-generative-en-sante-oui-avec-un-usage-responsable",
              },
            ]}
          />
        </>
      ),
    },
  ],

  takeaways: [
    <>
      Vous parlez à une <strong>application</strong>, pas à un modèle : elle
      ajoute une consigne cachée et recolle l'historique à chaque appel.
    </>,
    <>
      Un prompt <strong>oriente</strong> le modèle sans rien lui apprendre. Pour
      qu'il s'appuie sur une recommandation, il faut la lui donner.
    </>,
    <>
      La mémoire se paie à chaque tour, et la résumer revient à{" "}
      <strong>choisir ce qu'on oublie</strong>.
    </>,
    <>
      Un message de dix mots peut en renvoyer des centaines de milliers :{" "}
      <strong>ouvrez une conversation neuve à chaque nouveau sujet</strong>.
    </>,
    <>
      Le <strong>RAG</strong> découpe, indexe, récupère et génère : il rend la
      réponse vérifiable — mais si la recherche se trompe, la réponse est fausse{" "}
      <em>et</em> sourcée.
    </>,
    <>
      Un passage devient un point par <strong>moyenne</strong> de ses tokens, et{" "}
      <strong>la façon de découper décide de ce qu'on retrouvera</strong> : un
      extrait coupé de ses titres n'est plus interprétable.
    </>,
    <>
      La HAS résume l'usage responsable par <strong>A.V.E.C.</strong> Et jamais
      de donnée patient dans un outil grand public.
    </>,
  ],
};

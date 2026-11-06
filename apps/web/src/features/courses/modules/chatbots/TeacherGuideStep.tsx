// ============================================================
// Le conducteur pédagogique : la séance, temps par temps.
//
// Destiné au formateur. Les horaires se calculent à partir des durées
// du minuteur (onglet « Réglages ») : modifier une durée là-bas décale
// tout le déroulé ici, sans qu'il y ait deux sources à tenir à jour.
// ============================================================

import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  Clock,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  Scissors,
  Users,
  Presentation,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pick, type Lang } from '@/lib/useLang'
import { Block } from './debrief-ui'
import { useSettings } from './settings'
import { TIMED_STEPS, stepLabel, type StepId } from './steps'
import { stepMinutes } from './timer'

interface Segment {
  /** Ce que l'étudiant doit en retirer. */
  goal: ReactNode
  /** Ce que font les étudiants pendant ce temps. */
  students: ReactNode
  /** Ce que fait le formateur. */
  teacher: ReactNode
  /** Ce qu'il faut faire émerger, ou les pièges à anticiper. */
  points: ReactNode[]
  /** Une question à poser à la salle. */
  ask?: ReactNode
}

// Contenu en français (langue de la séance et des débriefs), doublé en anglais plus bas.
const SEGMENTS_FR: Partial<Record<StepId, Segment>> = {
  intro: {
    goal: 'Poser le cadre : un vrai cas, de vrais modèles, et un objectif de jugement critique.',
    students: 'Lisent l’introduction et les objectifs, forment les binômes.',
    teacher:
      'Présente le déroulé et le minuteur. Annonce la règle du jeu de l’échauffement : on juge sans la réponse.',
    points: [
      'Demander de ne pas chercher la recommandation pendant l’exercice 1 : tout l’intérêt est de juger à l’aveugle.',
    ],
  },
  'self-start': {
    goal: 'Recueillir l’auto-évaluation de début de séance, à comparer avec celle de la fin.',
    students:
      'Notent de 1 à 5 sept capacités, puis valident ; ou refusent d’y répondre (bouton rouge), sans conséquence.',
    teacher:
      'Précise que rien n’est noté et qu’il n’y a pas de bonne réponse. Le TD ne s’ouvre qu’après validation ou refus.',
    points: ['Ne pas commenter les items : ce sont les capacités travaillées pendant la séance.'],
  },
  tuto: {
    goal: 'Savoir où se trouve chaque commande avant de commencer, pour ne pas perdre l’exercice 1 à chercher les boutons.',
    students:
      'Suivent la visite guidée (15 bulles), puis peuvent poser une première question : elle sera conservée pour l’exercice 1.',
    teacher:
      'Laisse chaque binôme suivre la visite sur son poste, et passe aider ceux qui bloquent. Signale les deux boutons verrouillés (recommandation, document).',
    points: [
      'Insister sur le bouton « Consignes » : chaque exercice commence par là.',
      'Montrer l’œil sous une réponse : c’est l’outil d’inspection de tout le TD.',
    ],
  },
  warmup: {
    goal: 'Constater qu’on ne peut pas distinguer une réponse juste d’une réponse fausse à la seule lecture.',
    students:
      'Interrogent un ou plusieurs modèles sur le cas de Mme D., jugent chaque réponse (crédible ou non).',
    teacher:
      'Circule. Ne valide ni n’invalide aucune réponse.',
    points: [
      'La consigne système est imposée ici (bouton « Consigne système », sous la zone de saisie) : on la modifiera à l’exercice 3.',
      'Chaque message repart de zéro : la mémoire viendra à l’exercice 5.',
    ],
    ask: 'Qui a obtenu deux réponses différentes ? Laquelle avez-vous jugée crédible, et sur quel critère ?',
  },
  reco: {
    goal: 'Confronter les réponses à la source de référence, croiser deux documents.',
    students:
      'Lisent les passages surlignés de la fiche HAS (p. 1 et 2) et les lignes OMEDIT au DFG 38, puis relisent leurs réponses de l’échauffement.',
    teacher:
      'Fait chercher les erreurs les plus fréquentes : la lévofloxacine à pleine dose malgré le DFG à 38, la ceftriaxone proposée en premier alors que c’est la 2ᵉ intention.',
    points: [
      'Deux sources à croiser, comme en vrai : la molécule, la durée et la dose « rein normal » (fiche HAS), l’adaptation au DFG (OMEDIT).',
      'La ceftriaxone ne s’adapte pas : certains modèles la réduisent à tort.',
    ],
  },
  'debrief-verify': {
    goal: 'Nommer l’hallucination et énoncer le paradoxe de la vérification.',
    students: 'Lisent le débrief sur leur poste, rejugent leurs réponses de l’échauffement.',
    teacher:
      'Laisse lire, puis reprend à l’oral : part des réponses obtenues par les binômes avant de donner la définition. Insiste : ce n’est pas un bug.',
    points: [
      'Le mot « hallucination » n’apparaît nulle part dans les exercices : c’est ici qu’on le pose.',
      'Le paradoxe annonce toute la suite : seule une source le casse (exercice 6).',
    ],
    ask: 'Si vous aviez dû prescrire sur la foi de l’échauffement, combien d’entre vous auraient fait une erreur ?',
  },
  prompt: {
    goal: 'Mesurer ce qu’apporte un prompt structuré, et ce qu’il n’apporte pas.',
    students:
      'Envoient les quatre prompts l’un après l’autre, chacun plus complet que le précédent, sur le même cas et le même modèle. Comparent chaque réponse à la précédente et la jugent avec la reco.',
    teacher:
      'Pousse à vérifier les références citées au palier 3 dans le PDF. Fait observer le compteur de tokens.',
    points: [
      'Piège attendu : la référence inventée (année, paragraphe, grade) au palier 3.',
      'Certains modèles régressent avec le prompt travaillé : c’est réel, pas un bug du TD.',
    ],
    ask: 'Votre meilleure réponse est-elle la mieux rédigée ? Et la plus juste ?',
  },
  'debrief-prompt': {
    goal: 'Comprendre la structure du paquet envoyé et le risque de la source exigée sans document.',
    students: 'Lisent le débrief sur leur poste.',
    teacher:
      'Montre les chiffres du benchmark : 0/36 citent une source au prompt brut, 33/36 inventent une référence quand on l’exige.',
    points: [
      'Un prompt oriente, il n’apprend rien : le savoir reste celui de l’entraînement.',
      'Introduire la consigne système : toute réponse d’IA est écrite sous une consigne invisible.',
    ],
  },
  settings: {
    goal: 'Voir qu’une réponse est un tirage, et ce que règle la température.',
    students:
      'Reposent trois fois la même question à 0, 0,7 puis 1,5, et comparent les trois réponses.',
    teacher:
      'Demande à un binôme de lire à voix haute deux réponses à 0,7 qui divergent sur la posologie.',
    points: [
      'À 0, les réponses se ressemblent sans être forcément identiques ni justes.',
      'À 1,5, le texte déraille parfois, surtout chez les petits modèles : utile pour voir le mécanisme, pas pour s’en servir.',
    ],
  },
  'debrief-random': {
    goal: 'Distinguer reproductibilité et exactitude.',
    students: 'Lisent le débrief et manipulent le curseur de température.',
    teacher: 'Débrief court. Donne le réflexe clinique : reposer la question dans une conversation neuve.',
    points: ['« Constant ne veut pas dire juste » est le seul message à faire passer.'],
  },
  memory: {
    goal: 'Comprendre que le modèle est sans état et que la mémoire a un coût.',
    students:
      'Rejouent la même conversation sans mémoire, en mémoire complète puis résumée ; inspectent ce qui part (bouton œil).',
    teacher:
      'Fait observer la jauge de contexte qui sature, et vérifier si le DFG survit au résumé.',
    points: [
      'Le budget de contexte est volontairement minuscule (réglable dans les Réglages).',
      'Le résumé est lui-même un appel au modèle : deux générations pour un message.',
    ],
    ask: 'Qu’est-ce que le résumé a oublié ? Comment l’auriez-vous su sans l’ouvrir ?',
  },
  'debrief-memory': {
    goal: 'Fenêtre de contexte, coût quadratique, une conversation par sujet.',
    students: 'Lisent le débrief sur leur poste.',
    teacher: 'Insiste sur les réflexes : redonner les données critiques, ouvrir une conversation neuve.',
    points: ['Mentionner le « lost in the middle » : grande fenêtre ne veut pas dire bien utilisée.'],
  },
  documents: {
    goal: 'Fournir la recommandation au modèle et vérifier ce qu’il en fait.',
    students:
      'Joignent la fiche HAS puis la table OMEDIT, observent les passages retenus et leur score, cliquent pour les voir surlignés dans le PDF.',
    teacher:
      'Fait comparer recherche par mots-clés et recherche par le sens. Demande de vérifier chaque page citée.',
    points: [
      'Le score de proximité n’est jamais expliqué dans l’exercice : le débrief s’en charge.',
      'Si le mauvais passage est retrouvé, la réponse est fausse ET sourcée.',
    ],
  },
  'debrief-rag': {
    goal: 'Comprendre le RAG, la similarité cosinus et le rôle du découpage.',
    students: 'Manipulent la figure de recherche.',
    teacher:
      'Montre le passage de 33 à 10 références inventées avec les documents joints : moins d’inventions, et surtout des citations vérifiables.',
    points: [
      'Le RAG ne donne pas la certitude : il donne une citation qu’on peut ouvrir.',
    ],
  },
  synthesis: {
    goal: 'Mettre en commun ce que chaque binôme a appris, et le transformer en un prompt qui tient sur les trois modèles.',
    students:
      'Se regroupent par 6 à 8 (trois ou quatre binômes). Chaque binôme raconte sa meilleure et sa pire réponse ; le groupe écrit un seul prompt, chaque binôme le rejoue sur les trois modèles et coche la grille.',
    teacher:
      'Forme les groupes, annonce le critère : la même réponse juste sur les trois modèles, pas sur un seul. Passe de groupe en groupe sans donner la réponse ; laisse la discussion durer au moins 15 min.',
    points: [
      'C’est la discussion de la séance : elle se fait entre étudiants, pas avec le formateur.',
      'Un prompt qui ne marche que sur le plus gros modèle est un coup de chance qui a tenu.',
      'Repérer, pour la clôture, un groupe qui a obtenu une source inventée malgré les documents joints.',
    ],
    ask: 'Qu’est-ce qu’un autre binôme avait compris et que vous aviez manqué ?',
  },
  wrapup: {
    goal: 'Clore la séance : les objectifs, et le cadre d’usage des données patient.',
    students: 'Lisent la grille « avant de faire confiance » et la règle sur les données patient.',
    teacher:
      'Clôture en 5 min. Demande à un ou deux groupes ce qu’ils retiennent de la mise en commun, puis conclut sur l’interdit des données patient : chatbots grand public pour étudier, jamais dans le soin ; outils HDS de l’établissement pour le reste.',
    points: ['Montrer la page « Consommation » : ce que la séance a coûté, en tokens.'],
  },
  'self-end': {
    goal: 'Recueillir l’auto-évaluation de fin, et proposer le partage facultatif de la séance.',
    students:
      'Refont l’auto-évaluation (leurs réponses du début ne s’affichent qu’après validation, avec l’écart), acceptent ou refusent de partager leur séance, puis effacent le poste.',
    teacher:
      'Rappelle que le partage est facultatif et sans conséquence, et comment remettre le fichier téléchargé.',
    points: ['Vérifier avant de partir que chaque poste a été effacé pour le groupe suivant.'],
  },
}

const SEGMENTS_EN: Partial<Record<StepId, Segment>> = {
  intro: {
    goal: 'Set the frame: a real case, real models, and a goal of critical judgement.',
    students: 'Read the introduction and the objectives, and form pairs.',
    teacher:
      'Presents the outline and the timer. Announces the rule of the warm-up: answers are judged without the reference.',
    points: [
      'Ask students not to look up the guideline during exercise 1: the whole point is to judge blind.',
    ],
  },
  'self-start': {
    goal: 'Collect the start-of-session self-assessment, to compare with the one at the end.',
    students:
      'Rate seven abilities from 1 to 5, then confirm; or decline to answer (red button), with no consequence.',
    teacher:
      'Stresses that nothing is graded and there is no right answer. The tutorial only opens once students confirm or decline.',
    points: ['Do not comment on the items: they are the abilities practised during the session.'],
  },
  tuto: {
    goal: 'Know where every control is before starting, so as not to waste exercise 1 hunting for buttons.',
    students:
      'Follow the guided tour (15 tooltips), then may ask a first question: it will be kept for exercise 1.',
    teacher:
      'Lets each pair follow the tour on their own computer, and helps those who get stuck. Points out the two locked buttons (guideline, document).',
    points: [
      'Stress the “Instructions” button: every exercise starts there.',
      'Show the eye icon under an answer: it is the inspection tool for the whole session.',
    ],
  },
  warmup: {
    goal: 'Realise that a correct answer cannot be told apart from a wrong one just by reading it.',
    students:
      'Ask one or more models about Mrs D.’s case, and judge each answer (credible or not).',
    teacher:
      'Walks around. Neither confirms nor rejects any answer.',
    points: [
      'The system instruction is fixed here (“System instruction” button, below the input box): it will be changed in exercise 3.',
      'Each message starts from scratch: memory comes in exercise 5.',
    ],
    ask: 'Who got two different answers? Which one did you judge credible, and on what criterion?',
  },
  reco: {
    goal: 'Check the answers against the reference source, and cross-check two documents.',
    students:
      'Read the highlighted passages of the HAS (French National Authority for Health) sheet (p. 1 and 2) and the OMEDIT rows for a GFR of 38, then reread their warm-up answers.',
    teacher:
      'Has them look for the most frequent errors: full-dose levofloxacin despite a GFR of 38, ceftriaxone offered first although it is second-line.',
    points: [
      'Two sources to cross-check, as in real life: the drug, the duration and the “normal kidney” dose (HAS sheet), the GFR adjustment (OMEDIT).',
      'Ceftriaxone needs no adjustment: some models wrongly reduce it.',
    ],
  },
  'debrief-verify': {
    goal: 'Name hallucination and state the verification paradox.',
    students: 'Read the debrief on their computer, and re-judge their warm-up answers.',
    teacher:
      'Lets them read, then picks it up orally: starts from the answers the pairs obtained before giving the definition. Stresses: it is not a bug.',
    points: [
      'The word “hallucination” appears nowhere in the exercises: this is where it is introduced.',
      'The paradox sets up everything that follows: only a source breaks it (exercise 6).',
    ],
    ask: 'Had you prescribed on the strength of the warm-up, how many of you would have made an error?',
  },
  prompt: {
    goal: 'Measure what a structured prompt brings, and what it does not.',
    students:
      'Send the four prompts one after another, each more complete than the last, on the same case and the same model. Compare each answer with the previous one and judge it against the guideline.',
    teacher:
      'Pushes them to check the references cited at level 3 in the PDF. Has them watch the token counter.',
    points: [
      'Expected trap: the invented reference (year, paragraph, grade) at level 3.',
      'Some models get worse with the worked prompt: this is real, not a bug in the session.',
    ],
    ask: 'Is your best answer the best written one? And the most accurate one?',
  },
  'debrief-prompt': {
    goal: 'Understand the structure of the payload sent, and the risk of demanding a source without a document.',
    students: 'Read the debrief on their computer.',
    teacher:
      'Shows the benchmark figures: 0/36 cite a source with the raw prompt, 33/36 invent a reference when one is demanded.',
    points: [
      'A prompt steers, it teaches nothing: the knowledge remains that of training.',
      'Introduce the system instruction: every AI answer is written under an invisible instruction.',
    ],
  },
  settings: {
    goal: 'See that an answer is a draw, and what temperature controls.',
    students:
      'Ask the same question three times at 0, 0.7 then 1.5, and compare the three answers.',
    teacher:
      'Asks a pair to read aloud two answers at 0.7 that disagree on the dosage.',
    points: [
      'At 0, the answers look alike without necessarily being identical or correct.',
      'At 1.5, the text sometimes goes off the rails, especially with small models: useful to see the mechanism, not to use.',
    ],
  },
  'debrief-random': {
    goal: 'Distinguish reproducibility from accuracy.',
    students: 'Read the debrief and play with the temperature slider.',
    teacher: 'Short debrief. Gives the clinical reflex: ask the question again in a fresh conversation.',
    points: ['“Consistent does not mean correct” is the only message to get across.'],
  },
  memory: {
    goal: 'Understand that the model is stateless and that memory has a cost.',
    students:
      'Replay the same conversation without memory, with full memory, then with summarised memory; inspect what is sent (eye button).',
    teacher:
      'Has them watch the context gauge fill up, and check whether the GFR survives the summary.',
    points: [
      'The context budget is deliberately tiny (adjustable in Settings).',
      'The summary is itself a call to the model: two generations for one message.',
    ],
    ask: 'What did the summary forget? How would you have known without opening it?',
  },
  'debrief-memory': {
    goal: 'Context window, quadratic cost, one conversation per topic.',
    students: 'Read the debrief on their computer.',
    teacher: 'Stresses the reflexes: restate the critical data, open a fresh conversation.',
    points: ['Mention “lost in the middle”: a large window does not mean a well-used one.'],
  },
  documents: {
    goal: 'Give the guideline to the model and check what it does with it.',
    students:
      'Attach the HAS sheet then the OMEDIT table, look at the passages retrieved and their score, and click to see them highlighted in the PDF.',
    teacher:
      'Has them compare keyword search and semantic search. Asks them to check every page cited.',
    points: [
      'The similarity score is never explained in the exercise: the debrief takes care of it.',
      'If the wrong passage is retrieved, the answer is wrong AND sourced.',
    ],
  },
  'debrief-rag': {
    goal: 'Understand RAG, cosine similarity and the role of chunking.',
    students: 'Play with the retrieval figure.',
    teacher:
      'Shows the drop from 33 to 10 invented references with the documents attached: fewer inventions, and above all verifiable citations.',
    points: [
      'RAG does not give certainty: it gives a citation you can open.',
    ],
  },
  synthesis: {
    goal: 'Pool what each pair has learned, and turn it into a prompt that holds up on all three models.',
    students:
      'Gather in groups of 6 to 8 (three or four pairs). Each pair tells its best and worst answer; the group writes a single prompt, each pair replays it on the three models and fills in the grid.',
    teacher:
      'Forms the groups and announces the criterion: the same correct answer on all three models, not just one. Goes from group to group without giving the answer; lets the discussion run for at least 15 min.',
    points: [
      'This is the discussion of the session: it happens between students, not with the instructor.',
      'A prompt that only works on the largest model is a lucky shot that held.',
      'Spot, for the closing, a group that got an invented source despite the attached documents.',
    ],
    ask: 'What had another pair understood that you had missed?',
  },
  wrapup: {
    goal: 'Close the session: the objectives, and the rules for using patient data.',
    students: 'Read the “before trusting an answer” checklist and the rule on patient data.',
    teacher:
      'Closes in 5 min. Asks one or two groups what they take away from the pooling, then concludes on the ban on patient data: consumer chatbots for studying, never in patient care; the hospital’s HDS-certified (French health data hosting) tools for the rest.',
    points: ['Show the “Usage” page: what the session cost, in tokens.'],
  },
  'self-end': {
    goal: 'Collect the end-of-session self-assessment, and offer the optional sharing of the session.',
    students:
      'Redo the self-assessment (their start answers only appear after confirming, with the change), agree or decline to share their session, then erase the computer.',
    teacher:
      'Reminds students that sharing is optional and without consequence, and how to hand in the downloaded file.',
    points: ['Before leaving, check that every computer has been erased for the next group.'],
  },
}

function Row({
  icon: Icon,
  label,
  lang,
  children,
}: {
  icon: LucideIcon
  label: string
  lang: Lang
  children: ReactNode
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
      <div className="min-w-0">
        <span className="font-medium text-[var(--color-foreground)]">
          {label}
          {pick(lang, ' : ', ': ')}
        </span>
        {children}
      </div>
    </div>
  )
}

function clock(min: number) {
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

export function TeacherGuideStep({ lang }: { lang: Lang }) {
  const [settings] = useSettings()
  const [open, setOpen] = useState<string | null>(null)

  const minutes = TIMED_STEPS.map((s) => stepMinutes(settings, s.id))
  const timeline = TIMED_STEPS.map((step, i) => ({
    step,
    minutes: minutes[i],
    start: minutes.slice(0, i).reduce((a, b) => a + b, 0),
  }))
  const total = minutes.reduce((a, b) => a + b, 0)
  const SEGMENTS = pick(lang, SEGMENTS_FR, SEGMENTS_EN)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="size-5 text-slate-500" />
            {pick(lang, 'Conducteur pédagogique', 'Teacher guide')}
          </h2>
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-sm">
            <Clock className="size-3.5 text-[var(--color-muted-foreground)]" />
            {pick(lang, 'Durée totale', 'Total duration')}
            <strong className="tabular-nums">
              {Math.floor(total / 60)} h {String(total % 60).padStart(2, '0')}
            </strong>
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            'Pour le formateur. Les horaires suivent les durées réglées dans l’onglet « Réglages ».',
            'For the instructor. Times follow the durations set in the “Settings” tab.',
          )}
        </p>
      </div>

      <Block tone="blue" title={pick(lang, 'Avant la séance', 'Before the session')} icon={ListChecks}>
        {pick(
          lang,
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              <strong className="text-[var(--color-foreground)]">Public</strong> : étudiants en
              médecine, de préférence en binômes, un ordinateur par binôme. Chacun lit les débriefs sur
              son poste. Pour la synthèse, les binômes se regroupent par 6 à 8 : prévoir une salle où
              l’on peut rapprocher les tables.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Prérequis</strong> : les deux cours
              « Grands modèles de langage », lus avant la séance. Les débriefs en reprennent les
              figures.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Connexion</strong> : tester un
              échange dans l’onglet « Réglages », puis envoyer un prompt dans l’échauffement pour
              vérifier la chaîne complète, du navigateur au modèle. Garder le <strong>mode hors ligne</strong> en
              secours (wifi absent, clef épuisée) : la séance se tient avec les réponses enregistrées.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Modèles</strong> : choisir dans le «
              Benchmark » plusieurs profils à montrer côte à côte : un modèle bon d’emblée, un qui
              progresse avec le prompt et la reco, un qui reste mauvais quoi qu’il arrive.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Minuteur</strong> : les durées se
              règlent dans l’onglet « Réglages ». Chaque poste a son propre minuteur ; « Remettre la
              séance à zéro » repart d’un minuteur vierge.
            </li>
          </ul>,
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              <strong className="text-[var(--color-foreground)]">Audience</strong>: medical students,
              preferably in pairs, one computer per pair. Everyone reads the debriefs on their own
              computer. For the summary, pairs gather in groups of 6 to 8: plan a room where tables can
              be moved together.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Prerequisites</strong>: the two
              “Large language models” courses, read before the session. The debriefs reuse their
              figures.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Connection</strong>: test an exchange
              in the “Settings” tab, then send a prompt in the warm-up to check the whole chain, from
              the browser to the model. Keep <strong>offline mode</strong> as a fallback (no wifi,
              exhausted key): the session runs on the recorded answers.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Models</strong>: pick from the
              “Benchmark” several profiles to show side by side: a model that is good from the start,
              one that improves with the prompt and the guideline, one that stays poor whatever happens.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Timer</strong>: durations are set in
              the “Settings” tab. Each computer has its own timer; “Reset the session” starts again
              from a blank timer.
            </li>
          </ul>,
        )}
      </Block>

      <div className="flex flex-col gap-2">
        {timeline.map(({ step, minutes, start }) => {
          const seg = SEGMENTS[step.id]
          const Icon = step.icon
          const isDebrief = 'debrief' in step || step.id === 'wrapup'
          const expanded = open === step.id
          return (
            <div
              key={step.id}
              className={cn(
                'rounded-lg border bg-[var(--color-card)]',
                isDebrief ? 'border-blue-500/30' : 'border-[var(--color-border)]',
              )}
            >
              <button
                onClick={() => setOpen(expanded ? null : step.id)}
                aria-expanded={expanded}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-accent)]"
              >
                <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-[var(--color-muted-foreground)]">
                  {clock(start)}
                </span>
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md',
                    isDebrief
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                      : 'exercise' in step
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{stepLabel(lang, step)}</span>
                  {seg && (
                    <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                      {seg.goal}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-[var(--color-muted-foreground)]">
                  <Clock className="size-3" />
                  {minutes} min
                </span>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
              {expanded && seg && (
                <div className="flex flex-col gap-2 border-t border-[var(--color-border)] px-4 py-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  <Row icon={Users} label={pick(lang, 'Les étudiants', 'Students')} lang={lang}>
                    {seg.students}
                  </Row>
                  <Row icon={Presentation} label={pick(lang, 'Le formateur', 'Instructor')} lang={lang}>
                    {seg.teacher}
                  </Row>
                  <Row icon={Lightbulb} label={pick(lang, 'À faire émerger', 'Points to bring out')} lang={lang}>
                    <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                      {seg.points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </Row>
                  {seg.ask && (
                    <Row
                      icon={MessageCircleQuestion}
                      label={pick(lang, 'À demander à la salle', 'Question for the room')}
                      lang={lang}
                    >
                      <em>{seg.ask}</em>
                    </Row>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div className="flex items-center gap-3 px-3 pt-1 text-xs text-[var(--color-muted-foreground)]">
          <span className="w-12 font-mono tabular-nums">{clock(total)}</span>
          <span>{pick(lang, 'Fin de séance', 'End of session')}</span>
        </div>
      </div>

      <Block
        tone="amber"
        title={pick(lang, 'Si la séance prend du retard', 'If the session runs late')}
        icon={Scissors}
      >
        {pick(
          lang,
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              <strong className="text-[var(--color-foreground)]">Ex 4. Hasard</strong> peut se réduire
              à une seule série à 0,7 : voir trois réponses différentes suffit.
            </li>
            <li>
              Le <strong className="text-[var(--color-foreground)]">débrief sur le tirage</strong> se
              fond dans celui sur la mémoire : un message suffit, « constant ne veut pas dire juste ».
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Ex 7. Synthèse</strong> : garder la
              mise en commun en groupe, quitte à rejouer le prompt sur moins de modèles ; le reste se
              termine à la maison.
            </li>
            <li>
              Ne jamais sacrifier le{' '}
              <strong className="text-[var(--color-foreground)]">débrief après l’exercice 2</strong> :
              c’est lui qui donne son sens à tout le reste.
            </li>
          </ul>,
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              <strong className="text-[var(--color-foreground)]">Ex 4. Randomness</strong> can be cut
              down to a single series at 0.7: seeing three different answers is enough.
            </li>
            <li>
              The <strong className="text-[var(--color-foreground)]">debrief on the draw</strong> can
              merge into the one on memory: one message is enough, “consistent does not mean correct”.
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Ex 7. Summary</strong>: keep the group
              pooling, even if the prompt is replayed on fewer models; the rest is finished at home.
            </li>
            <li>
              Never sacrifice the{' '}
              <strong className="text-[var(--color-foreground)]">debrief after exercise 2</strong>: it
              is what gives meaning to everything else.
            </li>
          </ul>,
        )}
      </Block>

      <Block tone="red" title={pick(lang, 'Points de vigilance', 'Points of caution')} icon={AlertTriangle}>
        {pick(
          lang,
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              Les niveaux de « progression » affichés à côté du menu récompensent l’étudiant ; ils ne
              correspondent à aucun outil du modèle : ce TD ne comporte ni agent ni appel d’outil.
            </li>
            <li>
              Rappeler que la clef API partagée ne doit jamais être saisie sur un poste étudiant : en
              séance, elle reste sur le serveur du TD.
            </li>
            <li>
              Les étudiants ne doivent saisir aucune donnée réelle de patient, même pour « tester ».
            </li>
          </ul>,
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              The “progress” levels shown next to the menu reward the student; they do not correspond
              to any model tool: this session involves neither agents nor tool calls.
            </li>
            <li>
              Remind everyone that the shared API key must never be entered on a student computer: in
              the session, it stays on the session server.
            </li>
            <li>
              Students must not enter any real patient data, even “just to test”.
            </li>
          </ul>,
        )}
      </Block>
    </div>
  )
}

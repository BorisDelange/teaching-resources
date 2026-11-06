// ============================================================
// Le texte de la visite guidée, dans l'ordre où l'œil parcourt l'écran :
// la barre du haut, puis la consigne à gauche, le chat au centre, et
// l'historique à droite.
// ============================================================

import type { TourStepDef } from './tour'

export const INTERFACE_TOUR: TourStepDef[] = [
  {
    target: 'nav-menu',
    title: { fr: 'Le menu des étapes', en: 'The step menu' },
    body: {
      fr: 'Tout le TD est ici : les **exercices** numérotés, les **débriefs** qui les suivent, et sous « Plus » les pages annexes. Les boutons de part et d’autre portent le nom de l’étape précédente et suivante.',
      en: 'The whole tutorial is here: the numbered **exercises**, the **debriefs** that follow them, and under “More” the extra pages. The buttons on either side show the name of the previous and next step.',
    },
  },
  {
    target: 'nav-timer',
    title: { fr: 'Le minuteur', en: 'The timer' },
    body: {
      fr: 'Le temps restant pour l’étape en cours. Il démarre seul ; vous pouvez le **mettre en pause** ou le **remettre à zéro**. Survolez-le pour voir où en est la séance.',
      en: 'Time left for the current step. It starts on its own; you can **pause** or **reset** it. Hover over it to see where the session stands.',
    },
  },
  {
    target: 'nav-progress',
    title: { fr: 'Votre progression', en: 'Your progress' },
    body: {
      fr: 'Des compétences se débloquent quand vous utilisez les outils du TD et constatez ce qu’ils changent. Cliquez pour voir celles qui restent.',
      en: 'Skills unlock as you use the tools and notice what they change. Click to see the ones left.',
    },
  },
  {
    target: 'brief',
    title: { fr: 'Le cas clinique', en: 'The clinical case' },
    body: {
      fr: 'À gauche, la patiente et la question à résoudre. C’est le **même cas** dans tous les exercices : seule la façon d’interroger le modèle change.',
      en: 'On the left, the patient and the question to solve. It is the **same case** in every exercise: only the way you query the model changes.',
    },
    side: 'right',
  },
  {
    target: 'rules',
    title: { fr: 'Les consignes', en: 'The instructions' },
    body: {
      fr: 'L’objectif de l’exercice et ce que vous devez y faire, pas à pas. **Commencez toujours par là.**',
      en: 'The goal of the exercise and what to do, step by step. **Always start here.**',
    },
    side: 'right',
  },
  {
    target: 'reference',
    title: { fr: 'La recommandation', en: 'The guideline' },
    body: {
      fr: 'La réponse officielle. **Verrouillée** pendant l’échauffement : vous jugerez d’abord à l’aveugle. Elle s’ouvre à partir de l’exercice 2.',
      en: 'The official answer. **Locked** during the warm-up: you will judge blind first. It opens from exercise 2 on.',
    },
    side: 'right',
  },
  {
    target: 'answer',
    title: { fr: 'La réponse du modèle', en: 'The model’s answer' },
    body: {
      fr: 'Les échanges s’affichent ici, à la suite. Le badge **Nouvelle conversation** qui les sépare rappelle que chaque question repart de zéro : le modèle ne voit pas les précédentes. Sous chaque réponse, vous la **jugez** (Juste, Faux, Je ne sais pas), et l’**œil** montre ce qui a réellement été envoyé au modèle, avec le nombre de tokens.',
      en: 'Exchanges appear here, one after the other. The **New conversation** badge between them is a reminder that each question starts from scratch: the model does not see the previous ones. Below each answer, you **judge** it (Right, Wrong, Not sure), and the **eye** shows what was actually sent to the model, with the token count.',
    },
    side: 'left',
  },
  {
    target: 'composer',
    title: { fr: 'La fenêtre de prompt', en: 'The prompt box' },
    body: {
      fr: 'Votre question au modèle. **Entrée** pour envoyer, **Maj + Entrée** pour aller à la ligne. Le carré rouge interrompt une réponse trop longue.',
      en: 'Your question to the model. **Enter** to send, **Shift + Enter** for a new line. The red square stops an answer that runs too long.',
    },
    side: 'top',
  },
  {
    target: 'resend',
    title: { fr: 'Reprendre le dernier prompt', en: 'Bringing back the last prompt' },
    body: {
      fr: 'Remet **votre dernière question** dans la zone de saisie, sans la retaper. Vous pouvez la retoucher, changer de modèle, puis l’envoyer.',
      en: 'Puts **your last question** back in the input box, without retyping it. You can tweak it, switch models, then send it.',
    },
    side: 'top',
  },
  {
    target: 'model',
    title: { fr: 'Le choix du modèle', en: 'Choosing the model' },
    body: {
      fr: 'Plusieurs modèles, de tailles très différentes (en milliards de **paramètres**). Posez la même question à deux modèles : les réponses divergent-elles ?',
      en: 'Several models, of very different sizes (in billions of **parameters**). Ask two models the same question: do the answers differ?',
    },
    side: 'top',
  },
  {
    target: 'attach',
    title: { fr: 'Joindre un document', en: 'Attaching a document' },
    body: {
      fr: 'Pour donner un document au modèle. **Verrouillé** jusqu’à l’exercice 6, qui lui est consacré.',
      en: 'To give the model a document. **Locked** until exercise 6, which is devoted to it.',
    },
    side: 'top',
  },
  {
    target: 'system',
    title: { fr: 'La consigne système', en: 'The system prompt' },
    body: {
      fr: 'Une consigne **invisible**, envoyée avant chacune de vos questions. Ici, vous pouvez la lire ; à l’exercice 3, vous pourrez la modifier.',
      en: 'A **hidden** instruction sent before each of your questions. Here you can read it; in exercise 3 you can edit it.',
    },
    side: 'top',
  },
  {
    target: 'sampling',
    title: { fr: 'Les réglages du tirage', en: 'Sampling settings' },
    body: {
      fr: 'La **température**, qui règle la part de hasard dans la réponse. Consultable ici, manipulée à l’exercice 4.',
      en: 'The **temperature**, which sets how much chance goes into the answer. Viewable here, handled in exercise 4.',
    },
    side: 'top',
  },
  {
    target: 'history',
    title: { fr: 'L’historique', en: 'The history' },
    body: {
      fr: 'Tous vos essais, avec votre jugement (la pastille de couleur). Cliquez sur un essai pour n’afficher **que lui** ; **Tout afficher** remet le fil complet.',
      en: 'All your attempts, with your judgement (the coloured dot). Click one to show **only that one**; **Show all** brings back the full thread.',
    },
    side: 'left',
  },
  {
    target: 'nav-next',
    title: { fr: 'C’est parti', en: 'Off you go' },
    body: {
      fr: 'Vous pouvez déjà essayer une question ici : vos essais seront conservés pour l’exercice 1. Quand vous êtes prêt, passez à l’**échauffement**.',
      en: 'You can already try a question here: your attempts will be kept for exercise 1. When you are ready, move on to the **warm-up**.',
    },
  },
]

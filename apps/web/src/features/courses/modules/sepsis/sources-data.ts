// ============================================================
// Sources du TD : d'où viennent les données, les définitions
// cliniques et les affirmations du TD.
//
// Principe : rien d'affiché dans le TD ne doit être invérifiable.
// Chaque entrée porte un statut explicite — donnée publique,
// recommandation, article de recherche — et dit à quoi elle sert
// ici, avec ses limites.
// ============================================================

export type SourceKind = 'dataset' | 'guideline' | 'research'

export interface Source {
  id: string
  title: string
  authors: string
  year: string
  url: string
  kind: SourceKind
  /** À quoi elle sert dans le TD. */
  usedFor: string
  usedForEn: string
  /** Ce qu'elle vaut, et ses limites. */
  caveat?: string
  caveatEn?: string
}

export interface SourceGroup {
  id: string
  title: string
  titleEn: string
  intro: string
  introEn: string
  sources: Source[]
}

export const SOURCE_KINDS: Record<SourceKind, { label: string; labelEn: string; tone: string }> = {
  dataset: {
    label: 'Jeu de données',
    labelEn: 'Dataset',
    tone: 'border-blue-500 text-blue-600',
  },
  guideline: {
    label: 'Définition de référence',
    labelEn: 'Reference definition',
    tone: 'border-emerald-500 text-emerald-600',
  },
  research: {
    label: 'Article de recherche',
    labelEn: 'Research article',
    tone: 'border-amber-500 text-amber-600',
  },
}

export const SOURCE_GROUPS: SourceGroup[] = [
  {
    id: 'data',
    title: 'Les données',
    titleEn: 'The data',
    intro:
      'Les patients de ce TD sont réels. Voici d’où ils viennent, et ce que nous en avons fait.',
    introEn: 'The patients in this tutorial are real. Here is where they come from, and what we did with them.',
    sources: [
      {
        id: 'physionet',
        title:
          'Early Prediction of Sepsis from Clinical Data: The PhysioNet/Computing in Cardiology Challenge 2019',
        authors: 'Reyna MA, Josef CS, Jeter R, Shashikumar SP, Westover MB, Nemati S, Clifford GD, Sharma A',
        year: '2019',
        url: 'https://physionet.org/content/challenge-2019/1.0.0/',
        kind: 'dataset',
        usedFor:
          'La cohorte du TD en est extraite. Le jeu d’origine réunit 40 336 dossiers de réanimation issus de deux systèmes hospitaliers universitaires américains, avec paramètres vitaux et examens biologiques relevés heure par heure. Publié sous licence ODbL, réutilisable avec citation et partage à l’identique (DOI 10.13026/v64v-d857).',
        usedForEn:
          'The tutorial cohort is drawn from it. The original dataset gathers 40,336 ICU records from two US academic hospital systems, with vital signs and laboratory results recorded hour by hour. Published under the ODbL licence, reusable with citation and share-alike (DOI 10.13026/v64v-d857).',
        caveat:
          'Nous n’en utilisons qu’un instantané par patient — la médiane de ses six premières heures — sur 800 patients. Les données d’origine sont des séries temporelles bien plus riches, et américaines : rien ne garantit qu’un modèle entraîné dessus fonctionnerait dans un service français.',
        caveatEn:
          'We use only one snapshot per patient — the median of their first six hours — for 800 patients. The original data are much richer time series, and American: nothing guarantees that a model trained on them would work in a French unit.',
      },
      {
        id: 'reyna-ccm',
        title: 'Early Prediction of Sepsis From Clinical Data: The PhysioNet/Computing in Cardiology Challenge 2019',
        authors: 'Reyna MA et al., Critical Care Medicine 48(2):210-217',
        year: '2020',
        url: 'https://doi.org/10.1097/CCM.0000000000004145',
        kind: 'research',
        usedFor:
          'L’article qui décrit le jeu de données, la façon dont les patients ont été recrutés et la manière dont le sepsis y a été étiqueté.',
        usedForEn:
          'The article describing the dataset, how patients were recruited and how sepsis was labelled.',
      },
    ],
  },
  {
    id: 'clinical',
    title: 'Les définitions cliniques',
    titleEn: 'Clinical definitions',
    intro: 'Ce que « sepsis » veut dire exactement — c’est-à-dire ce que le modèle apprend à prédire.',
    introEn: 'What “sepsis” means exactly — in other words, what the model learns to predict.',
    sources: [
      {
        id: 'sepsis3',
        title:
          'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)',
        authors: 'Singer M, Deutschman CS, Seymour CW et al., JAMA 315(8):801-810',
        year: '2016',
        url: 'https://doi.org/10.1001/jama.2016.0287',
        kind: 'guideline',
        usedFor:
          'La définition qui sert d’étiquette dans le jeu de données : aggravation d’au moins 2 points du score SOFA associée à une suspicion d’infection.',
        usedForEn:
          'The definition used as the label in the dataset: an increase of at least 2 points in the SOFA score combined with suspected infection.',
        caveat:
          'Une définition reste une convention. Changer de définition change les patients étiquetés « sepsis », donc ce que le modèle apprend — et ses performances apparentes.',
        caveatEn:
          'A definition remains a convention. Changing the definition changes which patients are labelled “sepsis”, hence what the model learns — and its apparent performance.',
      },
      {
        id: 'surviving-sepsis',
        title: 'Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021',
        authors: 'Evans L, Rhodes A, Alhazzani W et al., Intensive Care Medicine 47:1181-1247',
        year: '2021',
        url: 'https://doi.org/10.1007/s00134-021-06506-5',
        kind: 'guideline',
        usedFor:
          'Les recommandations de prise en charge, et l’argument qui fonde tout le TD : dans le sepsis, chaque heure de retard compte.',
        usedForEn:
          'The management guidelines, and the argument underpinning the whole tutorial: in sepsis, every hour of delay matters.',
      },
    ],
  },
  {
    id: 'critique',
    title: 'Le regard critique',
    titleEn: 'A critical eye',
    intro:
      'Les travaux sur lesquels s’appuient les mises en garde du TD : un modèle publié n’est pas un modèle qui marche à l’hôpital.',
    introEn:
      'The work behind the tutorial’s warnings: a published model is not a model that works in hospital.',
    sources: [
      {
        id: 'epic',
        title: 'External Validation of a Widely Implemented Proprietary Sepsis Prediction Model in Hospitalized Patients',
        authors: 'Wong A, Otles E, Donnelly JP et al., JAMA Internal Medicine 181(8):1065-1070',
        year: '2021',
        url: 'https://doi.org/10.1001/jamainternmed.2021.2626',
        kind: 'research',
        usedFor:
          'L’évaluation indépendante du modèle de sepsis d’Epic, déployé dans des centaines d’hôpitaux américains : AUC réelle de 0,63 contre 0,76 à 0,83 annoncés, deux tiers des sepsis manqués, et une alerte sur trois patients.',
        usedForEn:
          'The independent evaluation of Epic’s sepsis model, deployed in hundreds of US hospitals: real-world AUC of 0.63 versus the 0.76 to 0.83 claimed, two thirds of sepsis cases missed, and an alert for one patient in three.',
        caveat:
          'C’est le cas d’école du TD : le modèle n’était pas « faux », il avait été validé ailleurs, sur d’autres patients, et personne ne l’avait revérifié sur place.',
        caveatEn:
          'This is the tutorial’s textbook case: the model was not “wrong”, it had been validated elsewhere, on other patients, and nobody had re-checked it locally.',
      },
      {
        id: 'tripod',
        title: 'TRIPOD+AI: updated guidance for reporting clinical prediction models that use regression or machine learning methods',
        authors: 'Collins GS, Moons KGM, Dhiman P et al., BMJ 385:e078378',
        year: '2024',
        url: 'https://doi.org/10.1136/bmj-2023-078378',
        kind: 'guideline',
        usedFor:
          'La grille de lecture d’un modèle prédictif publié : ce qu’un article doit dire pour qu’on puisse juger si le modèle tient debout. C’est la version formelle des questions posées à l’étape « Regard critique ».',
        usedForEn:
          'The checklist for reading a published prediction model: what an article must report so we can judge whether the model holds up. It is the formal version of the questions asked in the “Critical appraisal” step.',
      },
    ],
  },
]

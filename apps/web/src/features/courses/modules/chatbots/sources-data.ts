// ============================================================
// Sources du TD : tout ce sur quoi s'appuient les chiffres, les
// recommandations cliniques et les choix pédagogiques.
//
// Principe : rien d'affiché dans le TD ne doit être invérifiable.
// Chaque entrée dit de quel type de document il s'agit ; ce qu'elle vaut
// et ses limites vont dans `caveat`.
// ============================================================

import { withBase } from '@/lib/utils'
import type { Localized } from './data'

export type SourceKind = 'guideline' | 'article' | 'institution' | 'report'

export interface Source {
  id: string
  title: string
  authors: string
  year: string | Localized
  url: string
  kind: SourceKind
  /** À quoi elle sert dans le TD. */
  usedFor: Localized
  /** Ce qu'elle vaut, et ses limites. */
  caveat?: Localized
}

export interface SourceGroup {
  id: string
  title: Localized
  intro: Localized
  sources: Source[]
}

export const SOURCE_KINDS: Record<SourceKind, { label: Localized; tone: string }> = {
  guideline: {
    label: { fr: 'Recommandation', en: 'Guideline' },
    tone: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
  },
  article: {
    label: { fr: 'Article scientifique', en: 'Research article' },
    tone: 'border-slate-400 text-slate-600 dark:text-slate-300',
  },
  institution: {
    label: { fr: 'Source institutionnelle', en: 'Institutional source' },
    tone: 'border-slate-400 text-slate-600 dark:text-slate-300',
  },
  report: {
    label: { fr: 'Rapport technique', en: 'Technical report' },
    tone: 'border-slate-400 text-slate-600 dark:text-slate-300',
  },
}

export const SOURCE_GROUPS: SourceGroup[] = [
  {
    id: 'clinical',
    title: { fr: 'Le cas clinique', en: 'The clinical case' },
    intro: {
      fr: 'La réponse de référence sur laquelle sont jugées les propositions des modèles.',
      en: 'The reference answer against which the models’ proposals are judged.',
    },
    sources: [
      {
        id: 'has-pna',
        title: 'Choix et durées d’antibiothérapies : pyélonéphrite aiguë de la femme — fiche mémo',
        authors: 'Haute Autorité de santé (HAS)',
        year: { fr: '2021, mise à jour mai 2025', en: '2021, updated May 2025' },
        url: 'https://www.has-sante.fr/jcms/c_2722914/fr/pyelonephrite-aigue-de-la-femme',
        kind: 'guideline',
        usedFor: {
          fr: 'Molécules (1ʳᵉ et 2ᵉ intention), posologies chez le rein normal et durée de traitement de la pyélonéphrite aiguë simple. Document de l’exercice 2, joint au modèle à l’exercice 6.',
          en: 'Drugs (first and second line), doses for normal renal function and treatment duration for uncomplicated acute pyelonephritis. Exercise 2 document, attached to the model in exercise 6.',
        },
      },
      {
        id: 'omedit',
        title: 'Antibiotiques et insuffisance rénale',
        authors: 'OMEDIT Pays de la Loire',
        year: '2021 (V1, 22/07/2021)',
        url: withBase('/td/recos/omedit-antibiotiques-insuffisance-renale.pdf'),
        kind: 'guideline',
        usedFor: {
          fr: 'Adaptation des posologies au débit de filtration glomérulaire : colonne 44 → 30 mL/min pour le DFG de 38 de Mme D. Document de l’exercice 2, joint au modèle à l’exercice 6.',
          en: 'Dose adjustment to glomerular filtration rate: the 44 → 30 mL/min column for Mrs D.’s GFR of 38. Exercise 2 document, attached to the model in exercise 6.',
        },
      },
    ],
  },
  {
    id: 'prompting',
    title: { fr: 'Le prompt engineering', en: 'Prompt engineering' },
    intro: {
      fr: 'Le cadre théorique des techniques de formulation travaillées dans le TD.',
      en: 'The theoretical framework behind the prompting techniques practised here.',
    },
    sources: [
      {
        id: 'liu-2025',
        title: 'Prompt Engineering in Clinical Practice: Tutorial for Clinicians',
        authors: 'Liu J, Liu F, Wang C, Liu S',
        year: '2025',
        url: 'https://www.jmir.org/2025/1/e72644',
        kind: 'article',
        usedFor: {
          fr: 'L’inspiration des quatre paliers de l’exercice 3 : la question directe (zero-shot), le contexte clinique explicite, l’exigence de preuve, le raisonnement étape par étape (chain-of-thought). Le rôle d’expert et le droit de dire « je ne sais pas » n’y figurent pas : ils sont ajoutés par le TD.',
          en: 'The inspiration for the four levels of exercise 3: the direct question (zero-shot), explicit clinical context, the evidence requirement, step-by-step reasoning (chain-of-thought). The expert role and the right to say “I don’t know” are not in it: this session adds them.',
        },
        caveat: {
          fr: 'Tutoriel narratif publié dans le Journal of Medical Internet Research, pas une étude comparative : il ne mesure pas l’efficacité des techniques qu’il décrit.',
          en: 'A narrative tutorial in the Journal of Medical Internet Research, not a comparative study: it does not measure the effectiveness of the techniques it describes.',
        },
      },
    ],
  },
  {
    id: 'limits',
    title: { fr: 'Les limites des modèles', en: 'The models’ limits' },
    intro: {
      fr: 'Les travaux derrière les débriefs sur l’hallucination et la fenêtre de contexte.',
      en: 'The work behind the debriefs on hallucination and the context window.',
    },
    sources: [
      {
        id: 'kim-2025',
        title: 'Medical Hallucinations in Foundation Models and Their Impact on Healthcare',
        authors: 'Kim Y, Jeong H, Chen S, et al.',
        year: '2025',
        url: 'https://arxiv.org/abs/2503.05777',
        kind: 'article',
        usedFor: {
          fr: 'Les chiffres du premier débrief : 91,8 % des cliniciens interrogés ont déjà rencontré une hallucination, 84,7 % la jugent susceptible de nuire au patient.',
          en: 'The figures in the first debrief: 91.8% of surveyed clinicians have met a hallucination, 84.7% consider it capable of harming the patient.',
        },
        caveat: {
          fr: 'Prépublication (arXiv). L’enquête ne porte que sur 70 cliniciens.',
          en: 'Preprint (arXiv). The survey covers only 70 clinicians.',
        },
      },
      {
        id: 'kalai-2025',
        title: 'Why Language Models Hallucinate',
        authors: 'Kalai AT, Nachum O, Vempala SS, Zhang E',
        year: '2025',
        url: 'https://arxiv.org/abs/2509.04664',
        kind: 'article',
        usedFor: {
          fr: 'L’idée que l’hallucination découle du fonctionnement même du modèle, et ne disparaîtra pas avec la version suivante.',
          en: 'The idea that hallucination follows from how the model works, and will not disappear with the next version.',
        },
        caveat: {
          fr: 'Prépublication (arXiv), article théorique.',
          en: 'Preprint (arXiv), a theoretical paper.',
        },
      },
      {
        id: 'liu-2024',
        title: 'Lost in the Middle: How Language Models Use Long Contexts',
        authors: 'Liu NF, Lin K, Hewitt J, et al.',
        year: '2024',
        url: 'https://arxiv.org/abs/2307.03172',
        kind: 'article',
        usedFor: {
          fr: 'Le « lost in the middle » du débrief sur la mémoire : l’information placée au milieu d’un long contexte est moins bien exploitée.',
          en: 'The “lost in the middle” of the memory debrief: information placed in the middle of a long context is used less well.',
        },
        caveat: {
          fr: 'Mesuré sur des modèles de 2023 ; l’effet s’atténue sur les plus récents, sans disparaître.',
          en: 'Measured on 2023 models; the effect is weaker on recent ones, without disappearing.',
        },
      },
    ],
  },
  {
    id: 'privacy',
    title: { fr: 'Les données de santé', en: 'Health data' },
    intro: {
      fr: 'Le cadre derrière l’interdit du bilan : pas de donnée patient dans un chatbot grand public.',
      en: 'The framework behind the wrap-up rule: no patient data in a consumer chatbot.',
    },
    sources: [
      {
        id: 'cnil-cegedim',
        title: 'Données de santé : sanction de 800 000 euros à l’encontre de la société Cegedim Santé',
        authors: 'CNIL',
        year: '2024',
        url: 'https://www.cnil.fr/fr/donnees-de-sante-sanction-de-800-000-euros-societe-cegedim-sante',
        kind: 'institution',
        usedFor: {
          fr: 'Une donnée sans nom reste personnelle si l’on peut retrouver la personne par des moyens raisonnables : année de naissance, sexe, diagnostics, prescriptions suffisent à la réidentification.',
          en: 'Data without a name remains personal if the person can be found by reasonable means: birth year, sex, diagnoses and prescriptions are enough to re-identify.',
        },
      },
      {
        id: 'ans-hds',
        title: 'Hébergement des données de santé (HDS)',
        authors: 'Agence du numérique en santé',
        year: '2026',
        url: 'https://esante.gouv.fr/labels-certifications/hebergement-des-donnees-de-sante',
        kind: 'institution',
        usedFor: {
          fr: 'L’obligation de certification HDS pour tout hébergeur de données de santé recueillies lors d’activités de soins (article L.1111-8 du code de la santé publique).',
          en: 'The HDS certification required of any host of health data collected during care (article L.1111-8 of the French public health code).',
        },
      },
    ],
  },
  {
    id: 'carbon',
    title: { fr: 'L’empreinte carbone', en: 'Carbon footprint' },
    intro: {
      fr: 'Le chiffre affiché en bas de conversation est une ESTIMATION, pas une mesure : l’inférence tourne chez le fournisseur, sur du matériel et dans un pays que nous ne connaissons pas. L’incertitude dépasse un facteur 10.',
      en: 'The figure shown below the conversation is an ESTIMATE, not a measurement: inference runs at the provider, on hardware and in a country we do not know. Uncertainty exceeds a factor of 10.',
    },
    sources: [
      {
        id: 'ecologits',
        title: 'EcoLogits — méthodologie d’estimation de l’inférence LLM',
        authors: 'GenAI Impact',
        year: '2024–2025',
        url: 'https://ecologits.ai/latest/methodology/llm_inference/',
        kind: 'report',
        usedFor: {
          fr: 'La formule employée : énergie par token de sortie en fonction du nombre de paramètres actifs, majorée du rendement du centre de données.',
          en: 'The formula used: energy per output token as a function of active parameters, adjusted for data-centre overhead.',
        },
        caveat: {
          fr: 'Modèle paramétrique calibré sur des mesures externes, et non une mesure du matériel réellement utilisé.',
          en: 'A parametric model calibrated on external measurements, not a measurement of the hardware actually used.',
        },
      },
      {
        id: 'ai-energy-score',
        title: 'AI Energy Score',
        authors: 'Hugging Face, Salesforce, Cohere, Carnegie Mellon University',
        year: '2025',
        url: 'https://huggingface.co/spaces/AIEnergyScore/Leaderboard',
        kind: 'report',
        usedFor: {
          fr: 'Contrôle de cohérence : 0,050 Wh par requête mesurés pour un modèle de 70 milliards de paramètres, contre 0,060 Wh estimés par notre formule.',
          en: 'Sanity check: 0.050 Wh per request measured for a 70-billion-parameter model, against 0.060 Wh estimated by our formula.',
        },
      },
      {
        id: 'mlenergy',
        title: 'The ML.ENERGY Benchmark',
        authors: 'Chung J. et al., University of Michigan',
        year: '2025',
        url: 'https://ml.energy/leaderboard/',
        kind: 'report',
        usedFor: {
          fr: 'Mesures directes sur GPU des modèles ouverts : 0,12 J/token pour un 8 milliards, 0,39 J/token pour un 70 milliards.',
          en: 'Direct GPU measurements of open models: 0.12 J/token for an 8-billion model, 0.39 J/token for a 70-billion one.',
        },
      },
      {
        id: 'google-2025',
        title: 'Measuring the environmental impact of AI inference',
        authors: 'Google',
        year: '2025',
        url: 'https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference',
        kind: 'report',
        usedFor: {
          fr: 'Point de comparaison Gemini : 0,24 Wh pour un prompt médian. Seul chiffre publié par un opérateur avec un périmètre complet (puces, serveur, machines au repos, refroidissement).',
          en: 'Gemini comparison point: 0.24 Wh for a median prompt. The only operator figure published with a full scope (chips, server, idle machines, cooling).',
        },
        caveat: {
          fr: 'Non vérifié par un tiers indépendant. Le même prompt tombe à 0,10 Wh si l’on ne compte que le processeur graphique : le périmètre retenu change le résultat d’un facteur 2,4.',
          en: 'Not independently verified. The same prompt drops to 0.10 Wh counting the GPU alone: the chosen scope changes the result by a factor of 2.4.',
        },
      },
      {
        id: 'epoch-2025',
        title: 'How much energy does ChatGPT use?',
        authors: 'You J., Epoch AI',
        year: '2025',
        url: 'https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use',
        kind: 'report',
        usedFor: {
          fr: 'Point de comparaison GPT-4o : 0,3 Wh pour une requête typique.',
          en: 'GPT-4o comparison point: 0.3 Wh for a typical request.',
        },
        caveat: {
          fr: 'Estimation externe : OpenAI ne publie ni la taille de ses modèles, ni leur consommation. Ce chiffre corrige à la baisse (d’un facteur 10) une estimation de 2023 encore très répandue.',
          en: 'External estimate: OpenAI publishes neither its model sizes nor their consumption. This figure revises a widely circulated 2023 estimate down by a factor of 10.',
        },
      },
      {
        id: 'rte-2024',
        title: 'Bilan électrique français 2024',
        authors: 'RTE (Réseau de transport d’électricité)',
        year: '2024',
        url: 'https://analysesetdonnees.rte-france.com/bilan-electrique-2024',
        kind: 'institution',
        usedFor: {
          fr: 'Intensité carbone du réseau français : 21 gCO₂e/kWh, grâce à un mix décarboné à 95 % (nucléaire, hydraulique, renouvelables).',
          en: 'Carbon intensity of the French grid: 21 gCO₂e/kWh, thanks to a 95% low-carbon mix (nuclear, hydro, renewables).',
        },
      },
      {
        id: 'ademe',
        title: 'Base Empreinte®',
        authors: 'ADEME (Agence de la transition écologique)',
        year: '2024',
        url: 'https://base-empreinte.ademe.fr/',
        kind: 'institution',
        usedFor: {
          fr: 'Intensité carbone mondiale en analyse de cycle de vie (590 gCO₂e/kWh) et émissions d’une voiture essence (218 gCO₂e/km), qui servent de point de comparaison.',
          en: 'World life-cycle carbon intensity (590 gCO₂e/kWh) and petrol-car emissions (218 gCO₂e/km), used as a comparison point.',
        },
      },
      {
        id: 'luccioni-2024',
        title: 'Power Hungry Processing: Watts Driving the Cost of AI Deployment?',
        authors: 'Luccioni S., Jernite Y., Strubell E.',
        year: '2024',
        url: 'https://arxiv.org/abs/2311.16863',
        kind: 'article',
        usedFor: {
          fr: 'Travail fondateur sur le coût énergétique de l’inférence, et sur l’écart considérable entre modèles génératifs polyvalents et modèles spécialisés.',
          en: 'Foundational work on the energy cost of inference, and on the wide gap between general-purpose generative models and specialised ones.',
        },
      },
    ],
  },
]

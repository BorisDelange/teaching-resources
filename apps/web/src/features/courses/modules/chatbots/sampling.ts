// ============================================================
// Réglages d'échantillonnage du modèle.
//
// Ils décident COMMENT le modèle choisit chaque mot, indépendamment du
// prompt. À température 0 il prend toujours le mot le plus probable —
// deux questions identiques donnent la même réponse. Plus haut, il ose
// des mots moins probables, et les réponses divergent.
//
// Le TD tourne à 0,7 par défaut, proche d'un ChatGPT grand public :
// c'est ce qui rend la variabilité observable, et c'est le sujet de
// l'étape « Les réglages ».
// ============================================================

export interface SamplingSettings {
  temperature: number
  topP?: number
  topK?: number
}

export const DEFAULT_SAMPLING: SamplingSettings = { temperature: 0.7 }

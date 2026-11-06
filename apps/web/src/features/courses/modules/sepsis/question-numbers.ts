/**
 * La numérotation des questions du TD.
 *
 * Elle sert un usage très concret : en salle, un étudiant qui bloque annonce
 * « je suis sur la 7 » et tout le monde sait de quoi on parle. Il faut donc
 * qu'un numéro soit STABLE — le même pour tous, d'une session à l'autre, et
 * inchangé quand on ajoute une question ailleurs dans le TD.
 *
 * D'où ce registre explicite plutôt qu'un compteur automatique : un compteur
 * qui s'incrémente au fil du rendu renumérote tout dès qu'on insère une
 * question au milieu, et deux étudiants sur deux versions du site ne parlent
 * plus de la même. Ici, un identifiant est attaché à un numéro une fois pour
 * toutes ; ajouter une question, c'est ajouter une ligne à la fin.
 */

/**
 * Les questions, dans l'ordre où on les rencontre. L'index dans ce tableau
 * donne le numéro affiché — d'où l'importance de n'AJOUTER qu'à la fin d'une
 * étape, et de ne jamais retirer une entrée sans y réfléchir.
 */
const ORDER: string[] = [
  // Étape « Le cas »
  'case-which-error',
  // Étape « Comprendre les données »
  'data-aggregation-loss',
  'data-define-variable',
  'data-explore-table',
  'data-distributions',
  // Étape « Préparer les données »
  'prepare-why-lactate-missing',
  'prepare-imputed-lactate',
  // Étape « Entraîner et évaluer »
  'train-more-variables',
  'train-auc-spread',
  'train-ppv',
  // Étape « Le seuil »
  'threshold-direction',
  'threshold-choice',
  // Étape « Regard critique »
  'critique-same-auc',
  'critique-leakage',
  'critique-takeaway',
]

const NUMBERS = new Map(ORDER.map((id, i) => [id, i + 1]))

/**
 * Le numéro d'une question, ou `undefined` si elle n'est pas enregistrée.
 *
 * Renvoyer `undefined` plutôt que de lever : une question sans numéro doit
 * s'afficher sans numéro, pas casser l'étape entière.
 */
export function questionNumber(id?: string): number | undefined {
  return id ? NUMBERS.get(id) : undefined
}

/** Le nombre total de questions du TD, pour afficher « 7 / 16 ». */
export const TOTAL_QUESTIONS = ORDER.length

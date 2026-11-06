// ============================================================
// Reconstruction du corps de requête HTTP réellement envoyé.
//
// Le mode développeur montre le JSON brut à côté de la vue lisible. Plutôt
// que de stocker une seconde copie de la charge utile en localStorage (qui
// doublerait le volume et pourrait diverger), on la RECONSTRUIT depuis le
// tableau `sent` déjà persisté : il porte chaque message et son rôle, donc
// la correspondance est complète.
//
// Le seul écart assumé avec le vrai corps HTTP : `system` est reconstitué
// depuis les messages `system` + `summary`, exactement comme le fait l'étape
// « La mémoire » avant l'appel (le résumé rejoint la consigne système).
// ============================================================

import type { SentMessage } from "./sandbox";
import type { Sampling } from "./client";
import { getSettings } from "./settings";

/** Ce qu'il faut en plus de `sent` pour rejouer la requête à l'identique. */
export interface RawRequestInfo {
  /** Slug du modèle transmis au backend (ex. meta-llama/llama-3.3-70b-instruct). */
  slug: string;
  sampling?: Sampling;
  /**
   * En-tête d'annonce du résumé, joint à la consigne système. Fourni par
   * l'étape « La mémoire », seule à envoyer un résumé.
   */
  summaryHeader?: string;
  /** Point d'entrée appelé ; par défaut le flux SSE. */
  endpoint?: string;
}

/** Le corps JSON tel que `chatFreeStream` le sérialise. */
interface RequestBody {
  model: string;
  prompt: string;
  system: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
}

/**
 * Rejoue la construction faite par `chatFreeStream`. Les rôles d'affichage
 * (`memory-question`, `memory-answer`, `summary`, `document`) n'existent pas dans l'API :
 * ils redeviennent ici `user`, `assistant`, ou du texte système.
 */
export function buildRawBody(
  sent: SentMessage[],
  info: RawRequestInfo,
): RequestBody {
  const system = sent.filter((m) => m.role === "system").map((m) => m.content);
  const summary = sent.find((m) => m.role === "summary");
  if (summary) {
    system.push(`${info.summaryHeader ?? ""}\n${summary.content}`.trim());
  }

  const history = sent
    .filter(
      (m) =>
        m.role === "memory-question" ||
        m.role === "memory-answer" ||
        m.role === "memory",
    )
    .map((m) => ({
      role: (m.role === "memory-answer" ? "assistant" : "user") as
        "user" | "assistant",
      content: m.content,
    }));

  // Le dernier message `user` est le prompt du tour ; les précédents sont
  // déjà partis dans l'historique.
  const users = sent.filter((m) => m.role === "user");
  const question = users[users.length - 1]?.content ?? "";
  // Les documents partent DANS le message de l'utilisateur, devant la
  // question, séparés par un trait.
  const doc = sent.find((m) => m.role === "document");
  const prompt = doc ? `${doc.content}\n\n---\n\n${question}` : question;

  const joined = system.join("\n\n").trim();
  return {
    model: info.slug,
    prompt,
    // `chatFreeStream` envoie null plutôt qu'une chaîne vide : une consigne
    // absente et une consigne vide ne sont pas la même chose pour le modèle.
    system: joined ? joined : null,
    history,
    temperature: info.sampling?.temperature,
    top_p: info.sampling?.topP,
    top_k: info.sampling?.topK,
  };
}

/** L'URL appelée, telle que le client la compose depuis les réglages. */
export function rawEndpoint(info: RawRequestInfo): string {
  const base = getSettings().apiBaseUrl.replace(/\/$/, "");
  return `POST ${base}${info.endpoint ?? "/api/chat/stream"}`;
}

/**
 * Le JSON brut, indenté. `undefined` disparaît naturellement à la
 * sérialisation — ce qui reflète bien la requête réelle, où les réglages
 * non renseignés ne sont tout simplement pas transmis.
 */
export function rawBodyText(sent: SentMessage[], info: RawRequestInfo): string {
  return JSON.stringify(buildRawBody(sent, info), null, 2);
}

// ============================================================
// Briques d'interface partagées par les étapes « bac à sable »
// (échauffement, prompt, mémoire, RAG).
//
// Toutes ces étapes reprennent la même disposition en trois colonnes :
//   gauche  : le cas clinique + les actions de l'étape
//   centre  : le chat (un échange affiché à la fois)
//   droite  : l'historique des essais
//
// Ce module fournit les pièces communes ; chaque étape compose ce dont
// elle a besoin et ajoute ses propres commandes.
// ============================================================

import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  BookOpenCheck,
  Bot,
  ChevronDown,
  Clock,
  FileText,
  Code2,
  Coins,
  Eye,
  History,
  Info,
  ListChecks,
  Lock,
  MessageSquarePlus,
  Paperclip,
  Pill,
  RotateCcw,
  Rows3,
  ScrollText,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/useLang";
import { pick, useLang } from "@/lib/useLang";
import { paramsLabel, tr, type Localized } from "./data";
import { FreshStep } from "./fresh-step";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePaneVisibility } from "./panes";
import { TourTarget } from "./tour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasCapturesFor } from "./offline";
import { useSettings, tdModels } from "./settings";
import { rawBodyText, rawEndpoint, type RawRequestInfo } from "./raw-payload";
import { Markdown } from "./Markdown";
import { PdfViewer } from "./PdfViewer";
import { JUDGEMENTS, bold, emphasise, tokensPerSecond } from "./chat-format";
import { DEFAULT_SAMPLING, type SamplingSettings } from "./sampling";
import { SUMMARY_HEADER } from "./memory-data";
import type { TokenUsage } from "./client";
import type { Attempt, Judgement, SentMessage } from "./sandbox";
import {
  CHECKPOINTS,
  SYSTEM_PROMPT,
  WARMUP_REFERENCE,
} from "./warmup-data";

export function JudgeBar({
  lang,
  current,
  onJudge,
}: {
  lang: Lang;
  current?: Judgement;
  onJudge: (j: Judgement) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-2.5">
      <span className="mr-1 text-sm text-[var(--color-muted-foreground)]">
        {pick(lang, "Votre avis :", "Your call:")}
      </span>
      {JUDGEMENTS.map((j) => {
        const Icon = j.icon;
        const active = current === j.value;
        return (
          <button
            key={j.value}
            onClick={() => onJudge(j.value)}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
              active
                ? j.tone
                : cn("border-[var(--color-border)] text-[var(--color-muted-foreground)]", j.hover),
            )}
          >
            <Icon className="size-3" />
            {tr(lang, j.label)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Infobulle noire, texte blanc, coins arrondis : le style des infobulles
 * du TD. Noire aussi en mode sombre, où le `bg-foreground` par défaut
 * deviendrait blanc ; la flèche (le svg) suit.
 */
export const DARK_TIP =
  "rounded-lg bg-black px-3 py-2 text-white [&>svg]:bg-black [&>svg]:fill-black";

export function DarkTip({
  label,
  children,
  side = "top",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6} className={DARK_TIP}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Le séparateur entre deux échanges du fil, à l'échauffement : chaque
 * question y part sans mémoire, c'est donc une conversation neuve. Un trait
 * ondulé et un badge, plutôt qu'un écran effacé : on garde le fil sous les
 * yeux, et la rupture reste visible.
 */
export function NewConversationDivider({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <WavyLine />
      <span className="shrink-0 rounded-full bg-black px-3 py-1 text-xs font-medium text-white dark:ring-1 dark:ring-white/20">
        {pick(lang, "Nouvelle conversation", "New conversation")}
      </span>
      <WavyLine />
    </div>
  );
}

/** Un trait horizontal ondulé, qui s'étire sur toute la place disponible. */
function WavyLine() {
  const id = useId();
  return (
    <svg className="h-2 min-w-0 flex-1 text-slate-300 dark:text-slate-600" aria-hidden>
      <defs>
        <pattern id={id} width="12" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M0 4 Q 3 0 6 4 T 12 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// ---------- Titre d'étape, avec son explication au survol ----------

/**
 * L'intention de l'étape tient en deux phrases : elle n'a pas besoin
 * d'occuper la colonne en permanence. Elle passe donc au survol d'une
 * icône, à côté du titre.
 */
/**
 * Le titre de la colonne de consigne.
 *
 * L'intention de l'exercice vivait ici dans une infobulle, ET les règles
 * dans le bouton « Consignes » : deux endroits pour une seule chose à lire.
 * Tout est désormais dans `RulesDialog`.
 */
export function BriefTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-medium">{title}</h3>;
}

/** `**gras**` puis `*italique*` : les consignes emploient l'un ou l'autre. */
function richRule(text: string) {
  return bold(text).map((part, i) =>
    typeof part === "string" ? <span key={i}>{emphasise(part)}</span> : part,
  );
}

/** Le message du centre, sur un exercice encore vierge. */
export function ReadRulesHint({ lang }: { lang: Lang }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <ListChecks className="size-8 text-blue-500/60" />
      <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {pick(
          lang,
          "Avant de vous lancer, lisez les consignes : le bouton « Consignes », à gauche, dit quoi faire et dans quel ordre.",
          "Before you start, read the instructions: the “Instructions” button, on the left, says what to do and in which order.",
        )}
      </p>
    </div>
  );
}

/**
 * Les consignes d'un exercice, au même endroit : l'intention (pourquoi on
 * fait cet exercice), puis les règles numérotées (ce qu'on y fait).
 */
export function RulesDialog({
  lang,
  intro,
  rules,
}: {
  lang: Lang;
  intro: Localized;
  rules: { title: Localized; rules: Localized[] };
}) {
  const fresh = useContext(FreshStep);
  // Une fois ouvertes, les consignes ont été vues : le signal s'éteint.
  const [seen, setSeen] = useState(false);
  return (
    <Dialog onOpenChange={(o) => o && setSeen(true)}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "w-full cursor-pointer gap-2",
            fresh && !seen && "animate-pulse ring-[3px] ring-inset ring-blue-500",
          )}
        >
          <ListChecks className="size-3.5 shrink-0" />
          {tr(lang, rules.title)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{tr(lang, rules.title)}</DialogTitle>
        </DialogHeader>
        <p className="rounded-md border-l-2 border-l-blue-500 bg-blue-500/5 px-3 py-2 text-sm leading-relaxed">
          {tr(lang, intro)}
        </p>
        <ul className="flex flex-col gap-3.5">
          {rules.rules.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-600">
                {i + 1}
              </span>
              <RuleText text={tr(lang, r)} />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Une consigne. Si elle tient sur deux lignes, la première est son titre,
 * en gras, et la suite l'explique en dessous.
 */
function RuleText({ text }: { text: string }) {
  const [head, ...rest] = text.split("\n");
  if (rest.length === 0) {
    return <span className="text-[var(--color-muted-foreground)]">{richRule(text)}</span>;
  }
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold text-[var(--color-foreground)]">{head}</span>
      <span className="text-[var(--color-muted-foreground)]">{richRule(rest.join(" "))}</span>
    </span>
  );
}

/** L'explication du renvoi de mémoire, commune aux tours regroupés. */
function MemoryHelp({ lang }: { lang: Lang }) {
  const help = pick(
    lang,
    "Un échange précédent, renvoyé mot pour mot — votre question ET la réponse du modèle. « −1 » est l’échange qui précède immédiatement votre question, « −2 » celui d’avant, et ainsi de suite. Ce sont deux messages distincts dans la requête. Le modèle n’a rien retenu : c’est l’application qui recolle tout avant chaque appel, et les réponses, souvent longues, sont ce qui coûte le plus cher.",
    "A previous exchange, replayed verbatim — your question AND the model’s answer. “−1” is the exchange immediately before your question, “−2” the one before that, and so on. These are two separate messages in the request. The model remembered nothing: the application re-attaches everything before each call, and the answers, often long, are what costs the most.",
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={help}
          tabIndex={-1}
          className="cursor-help text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs leading-relaxed">
        {help}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------- Carte d'identité du modèle, au survol ----------

/**
 * Le nom du modèle suffit dans le fil ; le reste (fabricant, taille,
 * réglages d'échantillonnage) tient au survol, en tableau aligné.
 */
export function ModelTag({
  lang,
  modelId,
  sampling = DEFAULT_SAMPLING,
}: {
  lang: Lang;
  modelId: string;
  sampling?: SamplingSettings;
}) {
  const model = tdModels().find((m) => m.id === modelId);
  const rows: { label: string; value: string }[] = [
    {
      label: pick(lang, "Modèle", "Model"),
      value: model?.displayName ?? modelId,
    },
    ...(model
      ? [{ label: pick(lang, "Fabricant", "Maker"), value: model.maker }]
      : []),
    ...(model
      ? [{ label: pick(lang, "Paramètres", "Parameters"), value: paramsLabel(lang, model.params) }]
      : []),
    {
      label: pick(lang, "Température", "Temperature"),
      value: String(sampling.temperature),
    },
    {
      label: "Top p",
      value:
        sampling.topP === undefined
          ? pick(lang, "par défaut", "default")
          : String(sampling.topP),
    },
    {
      label: "Top k",
      value:
        sampling.topK === undefined
          ? pick(lang, "par défaut", "default")
          : String(sampling.topK),
    },
  ];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help font-medium text-[var(--color-foreground)] underline decoration-dotted decoration-[var(--color-muted-foreground)] underline-offset-2">
          {model?.displayName ?? modelId}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-none">
        <table className="border-separate border-spacing-x-3 border-spacing-y-0.5 text-xs">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="pr-1 text-left align-top opacity-70">
                  {r.label}
                </td>
                <td className="text-left font-medium whitespace-nowrap tabular-nums">
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TooltipContent>
    </Tooltip>
  );
}

// ---------- Analyse d'une réponse (pièges repérés) ----------

export function AnswerAudit({ lang, answer }: { lang: Lang; answer: string }) {
  const hits = useMemo(
    () =>
      CHECKPOINTS.filter((c) => {
        const found = c.patterns.some((p) => p.test(answer));
        // « Aucune source citée » se signale par l'ABSENCE de correspondance.
        return c.id === "no-source" ? !found : found;
      }),
    [answer],
  );

  // L'encadré prend la couleur du signalement le plus grave : rouge s'il y
  // a une erreur franche, ambre pour une réserve, vert si rien n'accroche.
  const worst = hits.some((c) => c.severity === "red")
    ? "red"
    : hits.some((c) => c.severity === "amber")
      ? "amber"
      : "emerald";

  return (
    <div
      className={cn(
        "rounded-md border-l-2 p-3",
        worst === "red"
          ? "border-l-red-500 bg-red-500/5"
          : worst === "amber"
            ? "border-l-amber-500 bg-amber-500/5"
            : "border-l-emerald-500 bg-emerald-500/5",
      )}
    >
      <p
        className={cn(
          "mb-1 flex items-center gap-1.5 text-xs font-semibold",
          worst === "red"
            ? "text-red-700 dark:text-red-500"
            : worst === "amber"
              ? "text-amber-700 dark:text-amber-500"
              : "text-emerald-700 dark:text-emerald-400",
        )}
      >
        <ListChecks className="size-3.5" />
        {pick(lang, "Analyse", "Analysis")}
      </p>
      {hits.length === 0 ? (
        <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          {pick(
            lang,
            "Aucun piège classique repéré. Vérifiez tout de même posologie et durée.",
            "No classic pitfall detected. Still check dose and duration.",
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {hits.map((c) => (
            <div key={c.id} className="text-xs leading-relaxed">
              <span
                className={cn(
                  "font-medium",
                  c.severity === "red"
                    ? "text-red-700 dark:text-red-500"
                    : c.severity === "amber"
                      ? "text-amber-700 dark:text-amber-500"
                      : "text-emerald-700 dark:text-emerald-400",
                )}
              >
                {tr(lang, c.label)}
              </span>
              <span className="mt-0.5 block text-[var(--color-muted-foreground)]">
                {tr(lang, c.detail)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Ce qui part réellement au modèle ----------

/** Un étage de la pile, dans l'ordre où il part au modèle. */
const STACK_KINDS: {
  match: (m: SentMessage) => boolean;
  label: Localized;
  tone: string;
}[] = [
  {
    match: (m) => m.role === "system",
    label: { fr: "Consigne système", en: "System instruction" },
    tone: "border-slate-400/60 bg-slate-500/10 hover:bg-slate-500/20",
  },
  {
    match: (m) =>
      m.role === "memory" || m.role === "memory-question" || m.role === "memory-answer",
    label: { fr: "Mémoire", en: "Memory" },
    tone: "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    match: (m) => m.role === "summary",
    label: { fr: "Mémoire résumée", en: "Summarised memory" },
    tone: "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    match: (m) => m.role === "document",
    label: { fr: "Documents joints", en: "Attached documents" },
    tone: "border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20",
  },
  {
    match: (m) => m.role === "user",
    label: { fr: "Vous", en: "You" },
    tone: "border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/20",
  },
  {
    match: (m) => m.role === "assistant",
    label: { fr: "Le modèle", en: "The model" },
    tone: "border-slate-400/60 bg-[var(--color-muted)] hover:bg-slate-500/20",
  },
];

/**
 * La pile envoyée, en miniature : le même schéma que dans le débrief sur le
 * prompt, rempli avec CE message. Un clic amène au bloc correspondant.
 */
function PayloadStack({
  lang,
  groups,
  onGo,
}: {
  lang: Lang;
  groups: SentMessage[][];
  onGo: (groupIndex: number) => void;
}) {
  // Les échanges de mémoire successifs forment un seul étage.
  const floors: { kind: (typeof STACK_KINDS)[number]; first: number; count: number }[] = [];
  groups.forEach((g, gi) => {
    const kind = STACK_KINDS.find((k) => k.match(g[0]));
    if (!kind) return;
    const last = floors[floors.length - 1];
    if (last && last.kind === kind) last.count += 1;
    else floors.push({ kind, first: gi, count: 1 });
  });

  return (
    <nav
      aria-label={pick(lang, "Les blocs envoyés", "The blocks sent")}
      className="hidden w-40 shrink-0 flex-col items-stretch sm:flex"
    >
      {floors.map((f, i) => (
        <div key={f.first} className="flex flex-col items-center">
          {i > 0 && <ArrowDown className="my-1 size-3.5 text-[var(--color-muted-foreground)]" />}
          <button
            type="button"
            onClick={() => onGo(f.first)}
            className={cn(
              "w-full cursor-pointer rounded-md border px-2.5 py-2 text-center text-xs font-medium transition-colors",
              f.kind.tone,
            )}
          >
            {tr(lang, f.kind.label)}
            {f.count > 1 && (
              <span className="ml-1 font-normal text-[var(--color-muted-foreground)]">
                × {f.count}
              </span>
            )}
          </button>
        </div>
      ))}
      <ArrowDown className="mx-auto my-1 size-3.5 text-[var(--color-muted-foreground)]" />
      <div className="rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-2 text-center text-xs text-[var(--color-muted-foreground)]">
        {pick(lang, "Modèle", "Model")}
      </div>
    </nav>
  );
}

/**
 * La bulle bleue ne montre que ce que l'étudiant a tapé. Cette fenêtre
 * révèle la charge utile complète : consigne système, historique de
 * conversation, extraits injectés… C'est ce qui explique le décompte
 * de tokens d'entrée, souvent bien supérieur à la question posée.
 */
export function SentPayloadDialog({
  lang,
  sent,
  usage,
  triggerClassName,
  title,
  description,
  trigger,
  showCompletion = false,
  request,
}: {
  lang: Lang;
  sent: SentMessage[];
  usage?: TokenUsage;
  /** Le déclencheur vit par défaut dans la bulle bleue ; ailleurs, on l'adapte. */
  triggerClassName?: string;
  title?: string;
  description?: string;
  /** Déclencheur personnalisé, à la place de l'icône œil. */
  trigger?: React.ReactNode;
  /**
   * Affiche aussi le coût de SORTIE. Faux depuis la bulle bleue : à ce
   * moment-là, seule la requête a été payée — la réponse n'existe pas encore.
   */
  showCompletion?: boolean;
  /**
   * De quoi reconstituer le corps HTTP brut (mode développeur). Absent, la
   * bascule « JSON » n'apparaît pas — on ne prétend pas montrer une requête
   * qu'on ne saurait pas reconstruire fidèlement.
   */
  request?: RawRequestInfo;
}) {
  const [settings] = useSettings();
  const [raw, setRaw] = useState(false);
  const showRaw = settings.devMode && !!request;
  const blockRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Les messages d'historique portent le badge « Mémoire » : c'est là que
  // l'étape « La mémoire » se donne à voir, dans la charge utile elle-même.
  const ROLES: Record<
    SentMessage["role"],
    { label: Localized; tone: string; badge: string; help?: Localized }
  > = {
    system: {
      label: { fr: "Consigne système", en: "System instruction" },
      tone: "border-l-slate-400",
      badge: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    },
    document: {
      label: { fr: "Documents joints", en: "Attached documents" },
      tone: "border-l-amber-500",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-500",
      help: {
        fr: "Le texte des documents joints, recopié devant votre question. Le modèle n’ouvre pas le PDF : il lit ce texte, et rien d’autre.",
        en: "The text of the attached documents, copied before your question. The model does not open the PDF: it reads this text, and nothing else.",
      },
    },
    user: {
      label: { fr: "Vous", en: "You" },
      tone: "border-l-blue-500",
      badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    },
    assistant: {
      label: { fr: "Le modèle", en: "The model" },
      tone: "border-l-slate-400",
      badge: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    },
    memory: {
      label: { fr: "Mémoire", en: "Memory" },
      tone: "border-l-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      help: {
        fr: "Un échange précédent, renvoyé mot pour mot. Le modèle ne l’a pas retenu : c’est l’application qui le recolle avant chaque appel.",
        en: "A previous exchange, replayed verbatim. The model did not remember it: the application re-attaches it before each call.",
      },
    },
    summary: {
      label: { fr: "Mémoire résumée", en: "Summarised memory" },
      tone: "border-l-emerald-500",
      badge: "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300",
      help: {
        fr: "Les échanges les plus anciens, condensés en un seul texte par le modèle lui-même. Ils ne sont plus envoyés mot pour mot : ce qui manque ici est définitivement oublié.",
        en: "The oldest exchanges, condensed into a single text by the model itself. They are no longer sent verbatim: whatever is missing here is permanently forgotten.",
      },
    },
    // La mémoire renvoie les DEUX côtés de chaque tour. Les distinguer est
    // essentiel : sans cela, on ne voit pas que les réponses du modèle sont
    // renvoyées elles aussi — et c'est ce qui coûte le plus cher.
    "memory-question": {
      label: { fr: "Mémoire — votre question", en: "Memory — your question" },
      tone: "border-l-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      help: {
        fr: "Une de vos questions précédentes, renvoyée mot pour mot. Le modèle ne l’a pas retenue : c’est l’application qui la recolle avant chaque appel.",
        en: "One of your earlier questions, replayed verbatim. The model did not remember it: the application re-attaches it before each call.",
      },
    },
    "memory-answer": {
      label: { fr: "Mémoire — sa réponse", en: "Memory — its answer" },
      tone: "border-l-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      help: {
        fr: "Ce que le modèle avait répondu. On le lui renvoie aussi : sans ses propres réponses, il ne saurait pas ce qu’il a déjà dit et se contredirait. Ces réponses sont souvent plus longues que les questions — c’est là que la mémoire coûte cher.",
        en: "What the model had answered. It is replayed too: without its own answers it would not know what it already said and would contradict itself. Those answers are often longer than the questions — that is where memory gets expensive.",
      },
    },
  };

  /**
   * Numérotation RELATIVE : −1 est l'échange qui précède immédiatement votre
   * question. Une numérotation absolue (« échange 1 ») induirait en erreur —
   * l'échange le plus ancien encore envoyé verbatim n'est pas le premier de
   * la conversation, puisque les précédents sont partis dans le résumé.
   */
  function relativeTurn(list: SentMessage[], turn?: number): string {
    if (turn === undefined) return "";
    const turns = [
      ...new Set(
        list.map((m) => m.turn).filter((t): t is number => t !== undefined),
      ),
    ].sort((a, b) => a - b);
    const fromEnd = turns.length - turns.indexOf(turn);
    return `−${fromEnd}`;
  }

  /** Regroupe les messages de mémoire d'un même tour ; le reste reste isolé. */
  function groupByTurn(list: SentMessage[]): SentMessage[][] {
    const out: SentMessage[][] = [];
    for (const m of list) {
      const prev = out[out.length - 1];
      if (m.turn !== undefined && prev?.[0]?.turn === m.turn) prev.push(m);
      else out.push([m]);
    }
    return out;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            className={cn(
              "cursor-pointer rounded-full p-1 transition-colors",
              triggerClassName ??
                "text-white/70 hover:bg-white/15 hover:text-white",
            )}
            title={
              title ??
              pick(
                lang,
                "Voir ce qui a été envoyé",
                "See what was actually sent",
              )
            }
          >
            <Eye className="size-3.5" />
          </button>
        )}
      </DialogTrigger>
      {/* Sans onOpenAutoFocus, le focus se pose sur la première icône d'aide
          et son infobulle s'ouvre toute seule à chaque ouverture du modal. */}
      <DialogContent
        className="sm:max-w-4xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="min-w-0">
              {title ??
                pick(
                  lang,
                  "Ce qui a réellement été envoyé",
                  "What was actually sent",
                )}
            </span>
            {showRaw && (
              <button
                type="button"
                onClick={() => setRaw((v) => !v)}
                title={pick(
                  lang,
                  "Mode développeur : basculer entre la vue lisible et le corps JSON de la requête",
                  "Developer mode: switch between the readable view and the raw JSON request body",
                )}
                className={cn(
                  // mr-6 : laisse passer la croix de fermeture, ancrée à right-4.
                  "mr-6 ml-auto flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-normal transition-colors",
                  raw
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
              >
                <Code2 className="size-3" />
                JSON
              </button>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {raw
              ? pick(
                  lang,
                  "Corps de la requête HTTP, tel qu’il part vers le backend.",
                  "HTTP request body, exactly as it is sent to the backend.",
                )
              : (description ??
                pick(
                  lang,
                  "Votre message n’est qu’une partie de la requête. Voici la charge utile complète.",
                  "Your message is only part of the request. Here is the full payload.",
                ))}
          </DialogDescription>
        </DialogHeader>

        {/* overflow-x-hidden + min-w-0 : un mot plus large que le modal (URL,
            chaîne collée) se coupe au lieu de provoquer un défilement latéral. */}
        <div className="flex min-w-0 gap-4">
        {!raw && (
          <PayloadStack
            lang={lang}
            groups={groupByTurn(sent)}
            onGo={(gi) =>
              blockRefs.current.get(gi)?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          />
        )}
        <div className="flex max-h-[60vh] min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto pr-1">
          {raw && request ? (
            <>
              <p className="font-mono text-[11px] break-all text-[var(--color-muted-foreground)]">
                {rawEndpoint(request)}
              </p>
              <pre className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-2.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                {rawBodyText(sent, request)}
              </pre>
            </>
          ) : (
            groupByTurn(sent).map((group, gi) => {
              // Un tour de mémoire = question + réponse. On les encadre ensemble
              // pour que la structure de l'échange saute aux yeux, tout en
              // rappelant que ce sont bien deux messages dans la requête.
              if (group.length > 1) {
                return (
                  <div
                    key={gi}
                    ref={(el) => {
                      if (el) blockRefs.current.set(gi, el);
                    }}
                    className="scroll-mt-1 rounded-md border-l-2 border-l-emerald-500 bg-emerald-500/5 py-2 pr-2 pl-2.5"
                  >
                    <p className="mb-1.5 flex items-center gap-1.5">
                      <span className="inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {pick(lang, "Mémoire — échange", "Memory — exchange")}{" "}
                        {relativeTurn(sent, group[0].turn)}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        {group.length} {pick(lang, "messages", "messages")}
                      </span>
                      <MemoryHelp lang={lang} />
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {group.map((m, i) => (
                        <div key={i}>
                          <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                            {m.role === "memory-answer"
                              ? pick(lang, "Le modèle", "The model")
                              : pick(lang, "Vous", "You")}
                          </p>
                          <pre className="font-sans text-xs leading-relaxed break-words whitespace-pre-wrap">
                            {m.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              const m = group[0];
              const role = ROLES[m.role];
              const help = role.help ? tr(lang, role.help) : null;
              return (
                <div
                  key={gi}
                  ref={(el) => {
                    if (el) blockRefs.current.set(gi, el);
                  }}
                  className={cn(
                    "scroll-mt-1 border-l-2 pl-2.5",
                    role.tone,
                    m.role === "document" &&
                      "rounded-md bg-amber-500/5 py-2 pr-2",
                    // Le résumé EST de la mémoire : même fond vert que les
                    // échanges renvoyés, dont il prend la place.
                    m.role === "summary" &&
                      "rounded-md bg-emerald-500/5 py-2 pr-2",
                  )}
                >
                  <p className="mb-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-block rounded px-1.5 py-0.5 text-xs font-semibold",
                        role.badge,
                      )}
                    >
                      {tr(lang, role.label)}
                    </span>
                    {help && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={help}
                            tabIndex={-1}
                            className="cursor-help text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                          >
                            <Info className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="max-w-xs leading-relaxed"
                        >
                          {help}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </p>
                  <pre className="font-sans text-xs leading-relaxed break-words whitespace-pre-wrap">
                    {m.content}
                  </pre>
                </div>
              );
            })
          )}
        </div>
        </div>

        {usage && (
          <p className="border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-muted-foreground)]">
            {pick(lang, "Coût de cet envoi : ", "Cost of this request: ")}
            <strong className="text-[var(--color-foreground)]">
              {usage.prompt} {pick(lang, "tokens en entrée", "input tokens")}
            </strong>
            {showCompletion && (
              <>
                {pick(lang, " et ", " and ")}
                <strong className="text-[var(--color-foreground)]">
                  {usage.completion} {pick(lang, "en sortie", "output")}
                </strong>
              </>
            )}
            {pick(
              lang,
              ". Un token ≈ ¾ d’un mot en français.",
              ". One token ≈ ¾ of a word in English.",
            )}
            {showCompletion && tokensPerSecond(usage) !== null && (
              <>
                {/* Deux mesures distinctes : une ligne vide les sépare. */}
                <span className="mt-1.5 block" />
                {pick(lang, "Vitesse : ", "Speed: ")}
                <strong className="text-[var(--color-foreground)]">
                  {tokensPerSecond(usage)} tokens/s
                </strong>
                {usage.waitMs !== undefined &&
                  pick(
                    lang,
                    `, après ${(usage.waitMs / 1000).toFixed(1)} s d’attente avant le premier mot — c’est le temps de lecture de la requête, qui s’allonge avec la taille du contexte.`,
                    `, after ${(usage.waitMs / 1000).toFixed(1)} s before the first word — the time spent reading the request, which grows with the context size.`,
                  )}
              </>
            )}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Décompte de tokens ----------

/**
 * Badge compact affiché sous une réponse. Sans `title` propre : quand il
 * sert de déclencheur, c'est le bouton parent qui porte l'infobulle.
 */
export function UsageBadge({ lang, usage }: { lang: Lang; usage: TokenUsage }) {
  const rate = tokensPerSecond(usage);
  return (
    <span
      className="flex items-center gap-1 px-1 py-0.5 text-[11px] text-[var(--color-muted-foreground)]"
      aria-label={pick(
        lang,
        `${usage.prompt} tokens envoyés, ${usage.completion} générés`,
        `${usage.prompt} tokens sent, ${usage.completion} generated`,
      )}
    >
      <Coins className="size-3" />
      <span className="text-blue-600">↑{usage.prompt}</span>
      <span className="text-emerald-600">↓{usage.completion}</span>
      {rate !== null && <span className="tabular-nums">{rate} tok/s</span>}
    </span>
  );
}

// ---------- Un échange enregistré ----------

export function Exchange({
  lang,
  attempt,
  index,
  audited,
  note,
  onJudge,
}: {
  lang: Lang;
  attempt: Attempt;
  index: number;
  /** Affiche le bloc « Analyse ». Absent à l'étape « Mémoire », qui ne
      porte pas sur la justesse clinique. */
  audited?: boolean;
  /** Ce qu'il faut regarder dans la réponse, posé avant l'analyse. */
  note?: React.ReactNode;
  onJudge?: (j: Judgement) => void;
}) {
  // De quoi reconstituer le corps HTTP brut en mode développeur. Le slug se
  // retrouve depuis l'identifiant du modèle déjà enregistré avec l'essai.
  const request: RawRequestInfo | undefined = (() => {
    const slug = tdModels().find((m) => m.id === attempt.modelId)?.slug;
    if (!slug) return undefined;
    return {
      slug,
      // Les réglages de l'essai, pas ceux du moment : le JSON doit montrer
      // la requête telle qu'elle est partie.
      sampling: attempt.sampling ?? {
        temperature: DEFAULT_SAMPLING.temperature,
      },
      summaryHeader: tr(lang, SUMMARY_HEADER),
    };
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="flex max-w-[80%] items-start gap-2">
          <div className="flex items-start gap-1.5 rounded-2xl rounded-tr-sm bg-blue-500 py-2 pr-2 pl-3.5 text-sm leading-relaxed text-white">
            <span>{attempt.prompt}</span>
            {attempt.sent && attempt.sent.length > 0 && (
              <SentPayloadDialog
                lang={lang}
                sent={attempt.sent}
                usage={attempt.usage}
                request={request}
              />
            )}
          </div>
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
            <User className="size-3.5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
          <Sparkles className="size-3.5 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--color-muted-foreground)]">
            <ModelTag
              lang={lang}
              modelId={attempt.modelId}
              sampling={attempt.sampling}
            />
            <span className="ml-auto flex items-center gap-2">
              {attempt.usage &&
                (attempt.sent && attempt.sent.length > 0 ? (
                  // Le badge ouvre l'échange COMPLET : la requête et la
                  // réponse, avec le coût des deux sens.
                  <SentPayloadDialog
                    lang={lang}
                    sent={[
                      ...attempt.sent,
                      { role: "assistant", content: attempt.answer },
                    ]}
                    usage={attempt.usage}
                    showCompletion
                    request={request}
                    title={pick(lang, "L’échange complet", "The full exchange")}
                    description={pick(
                      lang,
                      "La requête envoyée et la réponse reçue, avec le coût dans les deux sens.",
                      "The request sent and the answer received, with the cost both ways.",
                    )}
                    trigger={
                      <button
                        className="cursor-pointer rounded transition-colors hover:bg-[var(--color-accent)]"
                        title={pick(
                          lang,
                          "Voir l’échange complet",
                          "See the full exchange",
                        )}
                      >
                        <UsageBadge lang={lang} usage={attempt.usage} />
                      </button>
                    }
                  />
                ) : (
                  <UsageBadge lang={lang} usage={attempt.usage} />
                ))}
              <span>#{index + 1}</span>
            </span>
          </div>
          <Markdown>{attempt.answer}</Markdown>
          {onJudge && (
            <JudgeBar
              lang={lang}
              current={attempt.judgement}
              onJudge={onJudge}
            />
          )}
        </div>
      </div>

      {/* L'analyse sort de la bulle : c'est un commentaire SUR la réponse,
          pas une partie de la réponse. */}
      {note}
      {audited && <AnswerAudit lang={lang} answer={attempt.answer} />}
    </div>
  );
}

// ---------- Un échange en cours de génération ----------

export interface PendingExchangeData {
  prompt: string;
  modelId: string;
  text: string;
}

export function PendingExchange({
  lang,
  pending,
}: {
  lang: Lang;
  pending: PendingExchangeData;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="flex max-w-[80%] items-start gap-2">
          <div className="rounded-2xl rounded-tr-sm bg-blue-500 px-3.5 py-2 text-sm leading-relaxed text-white">
            {pending.prompt}
          </div>
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
            <User className="size-3.5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
          <Sparkles className="size-3.5 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <ModelTag lang={lang} modelId={pending.modelId} />
          </div>
          {pending.text ? (
            <Markdown>{pending.text}</Markdown>
          ) : (
            <span className="flex items-center gap-1" aria-live="polite">
              <span className="sr-only">
                {pick(lang, "Le modèle réfléchit…", "The model is thinking…")}
              </span>
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="size-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Le composeur ----------

/**
 * Le champ de saisie et ses commandes, dans un seul cadre.
 *
 * Le modèle et le trombone étaient auparavant dans une barre en haut du fil,
 * loin du geste qu'ils modifient. Ils rejoignent ici le bas du cadre de
 * saisie, comme dans ChatGPT ou Claude : on choisit son modèle et on joint son
 * document à l'endroit où l'on écrit, pas à l'autre bout de l'écran.
 *
 * Le cadre entier réagit au focus (`focus-within`), si bien qu'il se lit comme
 * un seul champ malgré les boutons qu'il contient.
 */
export function Composer({
  lang,
  value,
  onChange,
  onSend,
  disabled,
  readOnly,
  placeholder,
  rows = 3,
  /** Commandes de gauche : modèle, trombone… */
  tools,
  /** Remplace le bouton d'envoi (bouton « Arrêter » pendant la génération). */
  action,
  /** Affiché au-dessus du champ : pastilles hors ligne, avertissements. */
  above,
  /** Renvoie le dernier prompt tel quel ; absent = pas de bouton. */
  onResend,
  resendDisabled,
}: {
  lang: Lang;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
  tools?: React.ReactNode;
  action?: React.ReactNode;
  above?: React.ReactNode;
  onResend?: () => void;
  resendDisabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {above}
      <div
        className={cn(
          "flex flex-col gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 transition-colors",
          "focus-within:border-blue-500/60",
          readOnly && "bg-[var(--color-muted)]",
        )}
      >
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Entrée envoie ; Maj+Entrée insère un saut de ligne.
            // `isComposing` : ne pas envoyer quand Entrée valide un caractère
            // composé (accents, clavier IME).
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={rows}
          readOnly={readOnly}
          placeholder={placeholder}
          // Le cadre porte la bordure et le focus : le champ lui-même
          // disparaît, sinon on verrait deux rectangles imbriqués.
          className={cn(
            "max-h-48 resize-none border-0 bg-transparent px-1.5 py-1 text-sm shadow-none",
            "focus-visible:ring-0 focus-visible:border-0 dark:bg-transparent",
            readOnly && "cursor-default",
          )}
        />
        <div className="flex items-center gap-1.5">
          {tools}
          <div className="ml-auto flex items-center gap-1.5">
            {onResend && (
              <TourTarget id="resend">
                <DarkTip
                  label={pick(lang, "Reprendre le dernier prompt", "Bring back the last prompt")}
                >
                  <Button
                    onClick={onResend}
                    disabled={resendDisabled}
                    size="icon"
                    variant="outline"
                    className="size-8 shrink-0 cursor-pointer rounded-lg"
                    aria-label={pick(lang, "Reprendre le dernier prompt", "Bring back the last prompt")}
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                </DarkTip>
              </TourTarget>
            )}
            {action ?? (
              <DarkTip label={pick(lang, "Envoyer (Entrée)", "Send (Enter)")}>
                <Button
                  onClick={onSend}
                  disabled={disabled}
                  size="icon"
                  className="size-8 shrink-0 cursor-pointer rounded-lg"
                  aria-label={pick(lang, "Envoyer", "Send")}
                >
                  <Send className="size-3.5" />
                </Button>
              </DarkTip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sélecteur de modèle compact, pour le composeur.
 *
 * Même rôle que `ModelBar`, mais replié dans un menu : trois modèles alignés
 * mangeraient toute la largeur de la barre d'outils, et on n'en change pas à
 * chaque message.
 */
export function ModelPicker({
  lang,
  modelId,
  onSelect,
  offlineStep,
}: {
  lang: Lang;
  modelId: string;
  onSelect: (id: string) => void;
  offlineStep?: string;
}) {
  const [settings] = useSettings();
  const offered = settings.enabledModels
    ? tdModels().filter((m) => settings.enabledModels?.includes(m.id))
    : tdModels();
  const models = offered.length > 0 ? offered : tdModels();
  const offline = settings.offlineMode && !!offlineStep;
  const current = tdModels().find((m) => m.id === modelId) ?? tdModels()[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Le choix du modèle est LA commande de la barre : encadré, il se
            distingue des réglages secondaires, restés en ghost. */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs font-medium"
        >
          <Bot className="size-3.5 shrink-0 text-blue-500" />
          <span className="max-w-[10rem] truncate">{current.displayName}</span>
          <ChevronDown className="size-3 shrink-0 text-[var(--color-muted-foreground)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-72">
        {models.map((m) => {
          // Hors ligne, un modèle sans réponse enregistrée pour cette étape
          // est désactivé : mieux vaut un choix grisé qu'une erreur réseau.
          const missing = offline && !hasCapturesFor(offlineStep, m.id);
          return (
            <DropdownMenuItem
              key={m.id}
              disabled={missing}
              onSelect={() => onSelect(m.id)}
              className={cn(
                "flex-col items-start gap-0.5",
                !missing && "cursor-pointer",
                m.id === modelId && "bg-blue-500/15 text-blue-600 dark:text-blue-300",
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className="font-medium">{m.displayName}</span>
                <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                  {lang === "en" ? paramsLabel(lang, m.params) : m.params.replace(" milliards", " Md")}
                </span>
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {missing
                  ? pick(
                      lang,
                      "Aucune réponse enregistrée (hors ligne)",
                      "No recorded answer (offline)",
                    )
                  : tr(lang, m.hint)}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- Sélecteur de modèle ----------

export function ModelBar({
  lang,
  modelId,
  onSelect,
  children,
  offlineStep,
}: {
  lang: Lang;
  modelId: string;
  onSelect: (id: string) => void;
  /** Commandes propres à l'étape, alignées à droite. */
  children?: React.ReactNode;
  /**
   * Étape concernée, pour le mode hors ligne. Toutes les étapes n'ont pas
   * capturé tous les modèles : « La mémoire » et « Documents » n'ont que
   * Llama 3.3 70B, parce qu'y capturer les trois coûterait trois séquences
   * complètes pour une comparaison que ces étapes ne font pas.
   *
   * Sans cette information, choisir un autre modèle donnerait « le serveur
   * est injoignable » — un message faux, et incompréhensible hors ligne.
   */
  offlineStep?: string;
}) {
  // Le formateur peut restreindre le choix (onglet « Réglages formateur ») ;
  // les identifiants déjà enregistrés restent résolus via tdModels().
  // useSettings, et pas le getter : la barre doit se redessiner au changement.
  const [settings] = useSettings();
  const offered = settings.enabledModels
    ? (tdModels().filter((m) => settings.enabledModels?.includes(m.id)) ??
      [])
    : tdModels();
  const models = offered.length > 0 ? offered : tdModels();
  const offline = settings.offlineMode && !!offlineStep;

  // pr-3 : aligné sur le fil, qui réserve cette marge à son ascenseur.
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] pb-2 pr-5">
      {models.map((m) => {
        const isActive = m.id === modelId;
        // Hors ligne, un modèle sans réponse enregistrée pour CETTE étape est
        // désactivé plutôt que laissé à cliquer : mieux vaut un bouton grisé
        // qu'une erreur réseau trompeuse.
        const missing = offline && !hasCapturesFor(offlineStep, m.id);
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            disabled={missing}
            title={
              missing
                ? pick(
                    lang,
                    "Aucune réponse enregistrée pour ce modèle à cette étape (mode hors ligne).",
                    "No recorded answer for this model at this step (offline mode).",
                  )
                : tr(lang, m.hint)
            }
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              missing
                ? "cursor-not-allowed border-[var(--color-border)] text-[var(--color-muted-foreground)] opacity-40"
                : "cursor-pointer",
              !missing && isActive
                ? "border-blue-500 bg-blue-500/10 text-blue-600"
                : !missing &&
                    "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-blue-500/40",
            )}
          >
            {m.displayName}
            <span className="ml-1 opacity-60">
              {lang === "en" ? paramsLabel(lang, m.params) : m.params.replace(" milliards", " Md")}
            </span>
          </button>
        );
      })}
      {children && (
        <div className="ml-auto flex items-center gap-1.5">{children}</div>
      )}
    </div>
  );
}

// ---------- Colonnes redimensionnables ----------

/**
 * Disposition à trois colonnes dont les deux latérales se
 * redimensionnent à la souris. Les largeurs sont persistées : un
 * étudiant qui élargit l'énoncé le retrouve élargi à l'étape suivante.
 */
export function ThreeColumns({
  left,
  center,
  right,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  const [widths, setWidths] = useState(() => readWidths());
  /** Colonne en cours de glissement, et position de départ. */
  const drag = useRef<{
    side: "left" | "right";
    startX: number;
    startW: number;
  } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = drag.current;
      if (!d) return;
      // La colonne droite s'élargit vers la gauche : le delta s'inverse.
      const delta =
        d.side === "left" ? e.clientX - d.startX : d.startX - e.clientX;
      const next = clampWidth(d.startW + delta);
      setWidths((w) => ({ ...w, [d.side]: next }));
    }
    function onUp() {
      if (!drag.current) return;
      drag.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidths((w) => {
        writeWidths(w);
        return w;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = useCallback(
    (side: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      // La largeur de départ est lue sur le nœud lui-même : pas besoin de
      // capturer l'état, et le glissement reste juste après un re-rendu.
      const pane = e.currentTarget.parentElement?.querySelector<HTMLElement>(
        side === "left" ? '[data-pane="left"]' : '[data-pane="right"]',
      );
      drag.current = {
        side,
        startX: e.clientX,
        startW: pane?.getBoundingClientRect().width ?? DEFAULT_WIDTHS[side],
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  /** Double-clic sur une poignée : la colonne retrouve sa largeur d'origine. */
  const resetWidth = useCallback(
    (side: "left" | "right") => () => {
      setWidths((w) => {
        const next = { ...w, [side]: DEFAULT_WIDTHS[side] };
        writeWidths(next);
        return next;
      });
    },
    [],
  );

  const panes = usePaneVisibility();

  // Les colonnes repliées sortent de la grille : le centre récupère la place.
  const columns = [
    panes.left ? "var(--w-left)" : null,
    panes.left ? "auto" : null,
    "minmax(0,1fr)",
    panes.right ? "auto" : null,
    panes.right ? "var(--w-right)" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="grid h-full min-h-0 gap-0"
      style={
        {
          "--w-left": `${widths.left}px`,
          "--w-right": `${widths.right}px`,
          gridTemplateColumns: columns,
        } as React.CSSProperties
      }
    >
      {/* pr-2 : le contenu défilant garde sa largeur, l'ascenseur se pose dans
          cette marge au lieu de recouvrir le texte. */}
      {panes.left && (
        <>
          <div data-pane="left" className="min-h-0 pr-2">
            {left}
          </div>
          <ResizeHandle
            onMouseDown={startDrag("left")}
            onDoubleClick={resetWidth("left")}
          />
        </>
      )}
      {/* Pas de pr-4 ici : l'ascenseur du fil vit DANS le bloc central, donc
          la marge doit être posée sur le conteneur défilant lui-même (pr-3),
          sans quoi la barre recouvrirait le texte. */}
      <div className={cn("min-h-0", panes.left && "pl-4")}>{center}</div>
      {panes.right && (
        <>
          <ResizeHandle
            onMouseDown={startDrag("right")}
            onDoubleClick={resetWidth("right")}
          />
          <div data-pane="right" className="min-h-0 pl-4">
            {right}
          </div>
        </>
      )}
    </div>
  );
}

function ResizeHandle({
  onMouseDown,
  onDoubleClick,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  const lang = useLang();
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      role="separator"
      aria-orientation="vertical"
      title={pick(lang, "Double-cliquez pour rétablir la largeur par défaut", "Double-click to restore the default width")}
      className="group relative hidden w-px shrink-0 cursor-col-resize bg-[var(--color-border)] xl:block"
    >
      {/* Zone de préhension plus large que le trait, pour viser sans effort —
          mais invisible : seul le trait lui-même se teinte au survol. */}
      <span className="absolute inset-y-0 -left-1.5 -right-1.5 block" />
      <span className="pointer-events-none absolute inset-y-0 left-0 block w-px bg-transparent transition-colors group-hover:bg-blue-500/60" />
    </div>
  );
}

const WIDTH_KEY = "td-chatbots-columns";
const MIN_W = 180;
const MAX_W = 460;
const DEFAULT_WIDTHS = { left: 280, right: 240 };

function clampWidth(px: number): number {
  return Math.min(MAX_W, Math.max(MIN_W, Math.round(px)));
}

function readWidths(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (!raw) return DEFAULT_WIDTHS;
    const parsed = JSON.parse(raw) as Partial<{ left: number; right: number }>;
    return {
      left: clampWidth(parsed.left ?? DEFAULT_WIDTHS.left),
      right: clampWidth(parsed.right ?? DEFAULT_WIDTHS.right),
    };
  } catch {
    return DEFAULT_WIDTHS;
  }
}

function writeWidths(w: { left: number; right: number }): void {
  try {
    localStorage.setItem(WIDTH_KEY, JSON.stringify(w));
  } catch {
    // Ignore : environnement sans localStorage.
  }
}

// ---------- Les réglages d'échantillonnage ----------

/**
 * La température. Consultable partout, manipulable là où l'étape le permet.
 *
 * Top-p et top-k ont été RETIRÉS de ce panneau : trois curseurs qui agissent
 * tous sur le même tirage rendaient l'expérience illisible — un étudiant qui
 * bougeait top-p ne savait plus si ce qu'il observait venait de là ou de la
 * température. Les valeurs restent dans le type (le backend les accepte), mais
 * l'interface n'en expose plus qu'une, et c'est la seule qui porte la leçon.
 */
export function SamplingDialog({
  lang,
  value,
  editable = false,
  onChange,
}: {
  lang: Lang;
  value: SamplingSettings;
  editable?: boolean;
  onChange?: (next: SamplingSettings) => void;
}) {
  const isDefault = value.temperature === DEFAULT_SAMPLING.temperature;
  /** Réglage en cours d'édition : rien ne part avant « Appliquer ». */
  const [draft, setDraft] = useState(value.temperature);

  return (
    <Dialog
      onOpenChange={(open) => {
        // Chaque ouverture repart de la valeur réellement appliquée.
        if (open) setDraft(value.temperature);
      }}
    >
      <DialogTrigger asChild>
        <button
          className="relative flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          title={pick(lang, "Réglages du modèle", "Model settings")}
        >
          <SlidersHorizontal className="size-3.5" />
          {pick(lang, "Réglages", "Settings")}
          {/* Pastille : le bouton reste discret, mais une valeur modifiée ne
              doit pas pouvoir passer inaperçue — c'est elle qui explique une
              réponse inattendue. */}
          {!isDefault && (
            <span
              aria-hidden
              className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500"
            />
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {pick(lang, "Réglages du modèle", "Model settings")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editable
              ? pick(
                  lang,
                  "La température décide à quel point le modèle ose s’écarter du mot le plus probable.",
                  "Temperature decides how far the model dares stray from the most likely word.",
                )
              : pick(
                  lang,
                  "La valeur utilisée pour vos questions. Elle se manipule à l’étape « Hasard ».",
                  "The value used for your questions. You will adjust it in the “Randomness” step.",
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <SamplingField
            label={pick(lang, "Température", "Temperature")}
            help={pick(
              lang,
              "À 0, le modèle prend toujours le mot le plus probable : deux questions identiques donnent la même réponse. Plus on monte, plus il ose des mots moins probables — et plus les réponses divergent.",
              "At 0, the model always takes the most likely word: two identical questions give the same answer. The higher it goes, the more it risks less likely words — and the more answers diverge.",
            )}
            value={editable ? draft : value.temperature}
            min={0}
            max={2}
            step={0.1}
            editable={editable}
            onChange={setDraft}
          />

          <p className="rounded-md border-l-2 border-l-amber-500 bg-amber-500/5 p-3 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              "Par défaut, ce TD utilise une température de 0,7 — proche de ChatGPT. C’est pourquoi la même question peut donner deux réponses différentes.",
              "By default this session uses a temperature of 0.7 — close to ChatGPT. That is why the same question can give two different answers.",
            )}
          </p>

          {editable && (
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(DEFAULT_SAMPLING.temperature);
                  onChange?.(DEFAULT_SAMPLING);
                }}
                disabled={isDefault && draft === DEFAULT_SAMPLING.temperature}
                className="cursor-pointer gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                {pick(lang, "Restaurer le défaut", "Restore default")}
              </Button>
              <DialogClose asChild>
                <Button
                  size="sm"
                  onClick={() => onChange?.({ ...value, temperature: draft })}
                  className="cursor-pointer"
                >
                  {pick(lang, "Appliquer", "Apply")}
                </Button>
              </DialogClose>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SamplingField({
  label,
  help,
  value,
  min,
  max,
  step,
  editable,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  editable: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm text-blue-600">
          {step < 1 ? value.toFixed(2) : value || "—"}
        </span>
      </div>
      {editable && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full cursor-pointer accent-blue-500"
        />
      )}
      <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {help}
      </p>
    </div>
  );
}

// ---------- Le trombone, avant d'être disponible ----------

/**
 * Le bouton « Document », grisé, aux étapes qui ne le proposent pas encore.
 *
 * Le montrer verrouillé plutôt que l'omettre : la barre du composeur garde la
 * même forme d'un bout à l'autre du TD, et l'étudiant voit qu'un levier
 * existe avant d'y arriver — c'est la même logique que la recommandation,
 * visible et cadenassée pendant l'échauffement.
 */
export function AttachLocked({ lang }: { lang: Lang }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button
            type="button"
            disabled
            className="flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-muted-foreground)] opacity-45"
          >
            <Paperclip className="size-3.5" />
            {pick(lang, "Document", "Document")}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs leading-relaxed">
        {pick(
          lang,
          "Joindre un document arrive à l’étape « Documents ».",
          "Attaching a document comes at the “Documents” step.",
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------- Le system prompt, en consultation ----------

/**
 * Version lecture seule, pour l'échauffement : on découvre qu'une
 * consigne cachée existe, sans encore pouvoir la manipuler. L'édition
 * arrive à l'étape « Le prompt », où elle est le sujet.
 */
export function SystemPromptView({
  lang,
  value,
}: {
  lang: Lang;
  value: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex h-8 cursor-pointer items-center whitespace-nowrap gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          title={pick(
            lang,
            "Voir la consigne cachée",
            "View the hidden instruction",
          )}
        >
          <ScrollText className="size-3.5" />
          {pick(lang, "Consigne système", "System prompt")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {pick(
              lang,
              "La consigne que vous ne voyez pas",
              "The instruction you do not see",
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              "Envoyée au modèle avant chacune de vos questions.",
              "Sent to the model before each of your questions.",
            )}
          </DialogDescription>
        </DialogHeader>

        <pre className="rounded-md bg-[var(--color-muted)] p-3 text-xs leading-relaxed break-words whitespace-pre-wrap">
          {value}
        </pre>

        <div className="flex flex-col gap-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          <p>{tr(lang, SYSTEM_PROMPT.why)}</p>
          <p className="rounded-md border-l-2 border-l-amber-500 bg-amber-500/5 p-3">
            {tr(lang, SYSTEM_PROMPT.lesson)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Le system prompt, modifiable ----------

/**
 * Version éditable, pour l'étape « Le prompt » : la consigne cachée
 * devient un levier qu'on manipule, et qu'on peut même supprimer.
 */
export function SystemPromptEditor({
  lang,
  value,
  isDefault,
  onChange,
  onRestore,
}: {
  lang: Lang;
  value: string;
  isDefault: boolean;
  onChange: (v: string) => void;
  onRestore: () => void;
}) {
  const [info, setInfo] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <Dialog
      onOpenChange={(open) => {
        // Chaque ouverture repart de la consigne réellement appliquée.
        if (open) {
          setDraft(value);
          setInfo(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          className="relative flex h-8 cursor-pointer items-center whitespace-nowrap gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          title={pick(
            lang,
            "Voir et modifier la consigne",
            "View and edit the instruction",
          )}
        >
          <ScrollText className="size-3.5" />
          {pick(lang, "Consigne système", "System prompt")}
          {/* Même pastille que les réglages : le bouton reste discret, mais une
              consigne modifiée ne doit pas passer inaperçue. */}
          {!isDefault && (
            <span
              aria-hidden
              className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500"
            />
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {info
                  ? pick(
                      lang,
                      "Pourquoi une consigne cachée ?",
                      "Why a hidden instruction?",
                    )
                  : pick(lang, "Consigne système", "System prompt")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {info
                  ? pick(
                      lang,
                      "Ce que cette consigne change, et pourquoi ça vous concerne.",
                      "What this instruction changes, and why it matters to you.",
                    )
                  : pick(
                      lang,
                      "Envoyé au modèle avant chacune de vos questions. Vous pouvez le modifier.",
                      "Sent to the model before each of your questions. You can edit it.",
                    )}
              </DialogDescription>
            </div>
            <button
              onClick={() => setInfo((i) => !i)}
              className={cn(
                "mr-6 flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                info
                  ? "border-blue-500 bg-blue-500/10 text-blue-600"
                  : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-blue-500/40",
              )}
            >
              <Info className="size-3" />
              {info
                ? pick(lang, "Modifier", "Edit")
                : pick(lang, "Info", "Info")}
            </button>
          </div>
        </DialogHeader>

        {info ? (
          <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <p>{tr(lang, SYSTEM_PROMPT.why)}</p>
            <p className="rounded-md border-l-2 border-l-amber-500 bg-amber-500/5 p-3">
              {tr(lang, SYSTEM_PROMPT.lesson)}
            </p>
          </div>
        ) : (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              placeholder={pick(
                lang,
                "Vide = aucune consigne envoyée au modèle.",
                "Empty = no instruction sent to the model.",
              )}
              className="resize-y text-xs leading-relaxed"
            />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                "Essayez d’enlever « Maximum 120 mots », d’exiger une source, ou de tout vider pour voir le modèle sans aucune consigne.",
                "Try removing “Maximum 120 words”, demanding a source, or emptying it entirely to see the model with no instruction at all.",
              )}
            </p>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRestore}
                disabled={isDefault}
                className="cursor-pointer gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                {pick(lang, "Restaurer le défaut", "Restore default")}
              </Button>
              <DialogClose asChild>
                <Button
                  size="sm"
                  onClick={() => onChange(draft)}
                  className="cursor-pointer"
                >
                  {pick(lang, "Appliquer", "Apply")}
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Historique ----------

export function HistoryPane({
  lang,
  attempts,
  activeId,
  onSelect,
  onNew,
  onClear,
  onRemove,
  onShowAll,
  badge,
}: {
  lang: Lang;
  attempts: Attempt[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Pastille propre à l'étape, à droite de chaque essai (la note de la synthèse). */
  badge?: (attempt: Attempt) => React.ReactNode;
  /** Absent : pas de bouton « Nouvelle conversation » (l'échauffement,
      où chaque message en est déjà une). */
  onNew?: () => void;
  onClear: () => void;
  /** Suppression d'un essai isolé (clic droit). */
  onRemove?: (id: string) => void;
  /** Présent : un bouton « Tout afficher » réaffiche le fil complet. */
  onShowAll?: () => void;
}) {
  /** Essai visé par le menu contextuel, en attente de confirmation. */
  const [pendingRemoval, setPendingRemoval] = useState<Attempt | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <History className="size-4 text-slate-500" />
          {pick(lang, "Historique", "History")}
          <span className="font-normal text-[var(--color-muted-foreground)]">
            ({attempts.length})
          </span>
        </span>
        {attempts.length > 0 && (
          <ClearDialog
            lang={lang}
            count={attempts.length}
            onConfirm={onClear}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-2">
        {onShowAll && attempts.length > 0 && (
          <button
            onClick={onShowAll}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-md border p-2 text-left text-xs font-medium transition-colors",
              activeId === null
                ? "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-300"
                : "border-[var(--color-border)] hover:border-blue-500/40",
            )}
          >
            <Rows3 className="size-3.5 shrink-0" />
            {pick(lang, "Tout afficher", "Show all")}
            <span className="ml-auto font-normal text-[var(--color-muted-foreground)]">
              {attempts.length}
            </span>
          </button>
        )}
        {attempts.length === 0 && (
          <p className="pt-4 text-center text-sm text-[var(--color-muted-foreground)]">
            {pick(
              lang,
              "Vos essais apparaîtront ici.",
              "Your attempts will appear here.",
            )}
          </p>
        )}

        {attempts
          .slice()
          .reverse()
          .map((a) => {
            const model = tdModels().find((m) => m.id === a.modelId);
            const j = JUDGEMENTS.find((x) => x.value === a.judgement);
            const idx = attempts.findIndex((x) => x.id === a.id);
            const active = a.id === activeId;
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                onContextMenu={
                  onRemove
                    ? (e) => {
                        e.preventDefault();
                        setPendingRemoval(a);
                      }
                    : undefined
                }
                title={
                  onRemove
                    ? pick(
                        lang,
                        "Clic droit pour supprimer",
                        "Right-click to delete",
                      )
                    : undefined
                }
                className={cn(
                  "w-full cursor-pointer rounded-md border p-2 text-left transition-colors",
                  active
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-[var(--color-border)] hover:border-blue-500/40",
                )}
              >
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <span className="font-medium">#{idx + 1}</span>
                  <span className="truncate">
                    {model?.displayName ?? a.modelId}
                  </span>
                  {j && (
                    <span
                      className={cn(
                        "ml-auto size-2 shrink-0 rounded-full",
                        j.dot,
                      )}
                    />
                  )}
                  {badge && <span className="ml-auto shrink-0">{badge(a)}</span>}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug">
                  {a.prompt}
                </p>
              </button>
            );
          })}
      </div>

      {/* En bas de colonne, comme à l'étape « Mémoire » : le geste est le
          même partout où l'interface de chat est réutilisée. */}
      {onNew && (
        <Button
          size="sm"
          onClick={onNew}
          className="shrink-0 cursor-pointer gap-2"
        >
          <MessageSquarePlus className="size-3.5" />
          {pick(lang, "Nouvelle conversation", "New conversation")}
        </Button>
      )}

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {pick(lang, "Supprimer cet essai ?", "Delete this attempt?")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {pick(
                lang,
                "Cet essai et le jugement que vous lui avez donné seront perdus.",
                "This attempt and the judgement you gave it will be lost.",
              )}
            </DialogDescription>
          </DialogHeader>

          {pendingRemoval && (
            <p className="line-clamp-3 rounded-md bg-[var(--color-muted)] px-2.5 py-2 text-xs italic">
              {pendingRemoval.prompt}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setPendingRemoval(null)}
            >
              {pick(lang, "Annuler", "Cancel")}
            </Button>
            <Button
              size="sm"
              className="cursor-pointer bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                if (pendingRemoval) onRemove?.(pendingRemoval.id);
                setPendingRemoval(null);
              }}
            >
              <Trash2 className="size-3.5" />
              {pick(lang, "Supprimer", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Confirmation d'effacement ----------

export function ClearDialog({
  lang,
  count,
  onConfirm,
}: {
  lang: Lang;
  count: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex cursor-pointer items-center gap-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-red-500"
          title={pick(lang, "Effacer l’historique", "Clear history")}
        >
          <Trash2 className="size-3" />
          {pick(lang, "Effacer", "Clear")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {pick(
              lang,
              "Effacer tous vos essais ?",
              "Clear all your attempts?",
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              `Vos ${count} essai(s) et vos jugements seront définitivement supprimés.`,
              `Your ${count} attempt(s) and your judgements will be permanently deleted.`,
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="cursor-pointer">
              {pick(lang, "Annuler", "Cancel")}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              size="sm"
              onClick={onConfirm}
              className="cursor-pointer bg-red-500 text-white hover:bg-red-600"
            >
              <Trash2 className="size-3.5" />
              {pick(lang, "Effacer", "Clear")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- La recommandation, consultable une fois débloquée ----------

/**
 * Bouton d'accès à la recommandation. Verrouillé tant que l'étudiant
 * n'a pas visité l'étape « Recommandations » : dans l'échauffement, tout
 * l'intérêt est justement de juger SANS connaître la réponse.
 */
export function ReferenceDialog({
  lang,
  unlocked,
  block = false,
}: {
  lang: Lang;
  unlocked: boolean;
  /** Bouton pleine largeur, pour la colonne de gauche. */
  block?: boolean;
}) {
  if (!unlocked) {
    return (
      <span
        className={cn(
          "flex items-center gap-1.5 border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] opacity-60",
          block
            ? "w-full justify-center rounded-md border px-3 py-2 text-xs font-medium"
            : "rounded-full border px-2 py-1 text-xs",
        )}
        title={pick(
          lang,
          "Disponible après l’étape « Recommandations »",
          "Available after the “Guidelines” step",
        )}
      >
        <Lock className="size-3.5" />
        {pick(lang, "Recommandations", "Guidelines")}
      </span>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex cursor-pointer items-center gap-1.5 border-[var(--color-border)] text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-accent)]",
            block
              ? "w-full justify-center rounded-md border px-3 py-2 text-xs font-medium"
              : "rounded-full border px-2 py-1 text-xs",
          )}
        >
          <BookOpenCheck className="size-3.5" />
          {pick(lang, "Recommandations", "Guidelines")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {tr(lang, WARMUP_REFERENCE.title)}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              "À garder sous les yeux pour juger les réponses.",
              "Keep it in view to judge the answers.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {WARMUP_REFERENCE.sections.map((sec) => (
            <section key={sec.rank} className="flex flex-col gap-1.5">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Pill className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {sec.rank}
                  <sup>{sec.rank === "1" ? pick(lang, "re", "st") : pick(lang, "e", "nd")}</sup>{" "}
                  {tr(lang, sec.title)}
                </span>
              </h4>
              <p className="pl-6 text-xs text-[var(--color-muted-foreground)]">
                {tr(lang, sec.when)}
              </p>
              <ul className="ml-6 flex flex-col gap-1.5 border-l-2 border-emerald-500/40 pl-3">
                {sec.items.map((it, i) => (
                  <li key={i} className="text-sm leading-relaxed text-[var(--color-muted-foreground)] [&_strong]:text-[var(--color-foreground)]">
                    {bold(tr(lang, it))}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="flex flex-col gap-1.5">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
              {pick(lang, "Durée et suivi", "Duration and follow-up")}
            </h4>
            <p className="pl-6 text-sm leading-relaxed text-[var(--color-muted-foreground)] [&_strong]:text-[var(--color-foreground)]">
              {bold(tr(lang, WARMUP_REFERENCE.duration))}
            </p>
          </section>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-2.5">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
            {pick(lang, "Sources — cliquez pour ouvrir le PDF", "Sources — click to open the PDF")}
          </p>
          {WARMUP_REFERENCE.sources.map((src) => (
            <SourcePdfDialog key={src.file} lang={lang} source={src} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Un document de référence, ouvert par-dessus la modale de la recommandation. */
function SourcePdfDialog({
  lang,
  source,
}: {
  lang: Lang;
  source: (typeof WARMUP_REFERENCE.sources)[number];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="group flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-[var(--color-accent)]">
          <FileText className="mt-px size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <span>
            <span className="font-medium underline decoration-[var(--color-muted-foreground)]/50 underline-offset-[3px] transition-colors hover:decoration-[var(--color-foreground)]">{tr(lang, source.label)}</span>{" "}
            <span className="text-[var(--color-muted-foreground)]">({tr(lang, source.date)})</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-base">{tr(lang, source.label)}</DialogTitle>
          <DialogDescription className="text-xs">{tr(lang, source.date)}</DialogDescription>
        </DialogHeader>
        <PdfViewer
          file={source.file}
          initialPage={source.page}
          fill
          className="min-h-0 min-w-0 flex-1"
        />
      </DialogContent>
    </Dialog>
  );
}

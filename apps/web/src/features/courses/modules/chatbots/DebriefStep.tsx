// ============================================================
// Les temps de cours entre les exercices.
//
// Le rythme du TD : les étudiants font l'exercice avec ses consignes, puis
// on reprend en classe entière. Chaque débrief suit le même patron :
//   1. ce que vous venez d'observer (on part de LEUR expérience) ;
//   2. la notion qui l'explique, avec la figure du cours LLM ;
//   3. ce qu'il faut retenir, puis ce qui vient ensuite.
//
// Les figures sont reprises telles quelles des deux cours « Grands modèles
// de langage » : l'étudiant retrouve en TD les images vues en cours.
// Texte bilingue (fr/en) ; les figures du cours, elles, restent en français.
// ============================================================

import type { ReactNode } from 'react'
import {
  ArrowRight,
  BookX,
  HeartPulse,
  Eye,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Pill,
  ShieldAlert,
  Stethoscope,
  Syringe,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pick, type Lang } from '@/lib/useLang'
import { Callout, SectionTitle } from '@/features/courses/modules/sepsis/ui'
import {
  FigureChunkContext,
  FigureContextScale,
  FigureMemory,
  FigureMemoryGrowth,
  FigureParadox,
  FigurePayload,
  FigurePromptLevels,
  FigureRag,
} from '@/features/courses/modules/llm/figures'
import { RetrievalPlot, TemperatureDemo } from '@/features/courses/modules/llm/interactive'
import { REFERENCE_ANSWER, tr } from './data'
import { Block, Kpi, KpiGrid } from './debrief-ui'
import { Rejudge } from './Rejudge'
import { bold } from './chat-format'

// ---------- Briques communes ----------

function Header({ title, lead }: { title: ReactNode; lead: ReactNode }) {
  return <SectionTitle subtitle={lead}>{title}</SectionTitle>
}

function Observed({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <Block
      tone="amber"
      title={pick(lang, 'Ce que vous venez d’observer', 'What you just observed')}
      icon={Eye}
    >
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {children}
      </ul>
    </Block>
  )
}

function Notion({
  title,
  icon = Lightbulb,
  children,
}: {
  title: ReactNode
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <Block title={title} icon={icon}>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-[var(--color-muted-foreground)] [&_strong]:text-[var(--color-foreground)]">
        {children}
      </div>
    </Block>
  )
}

function Remember({ lang, items }: { lang: Lang; items: ReactNode[] }) {
  return (
    <Block tone="emerald" title={pick(lang, 'À retenir', 'Key points')} icon={ListChecks}>
      <ol className="flex flex-col gap-2 text-sm leading-relaxed">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {i + 1}
            </span>
            <span className="text-[var(--color-muted-foreground)] [&_strong]:text-[var(--color-foreground)]">
              {it}
            </span>
          </li>
        ))}
      </ol>
    </Block>
  )
}

function NextUp({
  label,
  children,
  onNext,
  disabled = false,
}: {
  label: string
  children: ReactNode
  onNext: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm leading-relaxed text-[var(--color-muted-foreground)]">{children}</p>
      <Button onClick={onNext} disabled={disabled} className="shrink-0 cursor-pointer gap-1.5">
        {label}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}

/** Un figure de cours, posée dans un cadre qui la sépare du texte. */
function Figure({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 sm:p-4">
      {children}
      {caption && (
        <figcaption className="text-center text-xs text-[var(--color-muted-foreground)]">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

// ============================================================
// Débrief 1 — après l'échauffement et les recommandations
// ============================================================

function DebriefVerify({ lang, onNext }: { lang: Lang; onNext: () => void }) {
  return (
    <>
      <Header
        title={pick(lang, 'Juger à l’aveugle : l’hallucination', 'Judging blind: hallucination')}
        lead={pick(
          lang,
          'Vous avez interrogé des modèles sans connaître la réponse, puis découvert la recommandation. Mettons un nom sur ce qui s’est passé.',
          'You questioned models without knowing the answer, then discovered the guideline. Let’s put a name on what happened.',
        )}
      />

      <Observed lang={lang}>
        {pick(
          lang,
          <>
            <li>
              Toutes les réponses avaient l’air <strong>également sûres d’elles</strong> : aucune
              n’hésitait, aucune ne signalait d’incertitude.
            </li>
            <li>
              À la lecture de la recommandation, beaucoup se révèlent fausses sur au moins un point —
              le plus souvent l’<strong>adaptation au DFG de 38</strong> (la lévofloxacine doit être
              réduite), parfois la <strong>durée</strong>, ou l’<strong>ordre des molécules</strong>{' '}
              (la ceftriaxone n’est qu’en 2<sup>e</sup> intention).
            </li>
            <li>
              Pendant l’échauffement, vous ne pouviez pas faire la différence. C’était voulu.
            </li>
          </>,
          <>
            <li>
              All the answers sounded <strong>equally confident</strong>: none hesitated, none
              flagged any uncertainty.
            </li>
            <li>
              Once you read the guideline, many turn out to be wrong on at least one point — most
              often the <strong>adjustment for a GFR of 38</strong> (levofloxacin must be reduced),
              sometimes the <strong>duration</strong>, or the <strong>order of the drugs</strong>{' '}
              (ceftriaxone is only second line).
            </li>
            <li>During the warm-up, you could not tell the difference. That was intentional.</li>
          </>,
        )}
      </Observed>

      <Block tone="emerald" title={tr(lang, REFERENCE_ANSWER.title)} icon={Target}>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {REFERENCE_ANSWER.points.map((p, i) => (
            <li key={i}>{bold(tr(lang, p))}</li>
          ))}
        </ul>
      </Block>

      <Notion
        title={pick(lang, 'Ce que propose la recommandation, en clair', 'What the guideline says, in plain terms')}
        icon={Pill}
      >
        <p>
          {pick(
            lang,
            'Pour une pyélonéphrite simple sans signe de gravité, la fiche HAS hiérarchise deux familles d’antibiotiques :',
            'For uncomplicated pyelonephritis without signs of severity, the HAS (French National Authority for Health) guidance sheet ranks two antibiotic families:',
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Block
            tone="emerald"
            title={pick(
              lang,
              <>1<sup>re</sup> intention : une fluoroquinolone per os</>,
              <>First line: an oral fluoroquinolone</>,
            )}
            icon={Pill}
          >
            <p className="mb-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                'Si la patiente n’a pas pris de quinolone dans les 6 derniers mois — c’est le cas de Mme D. :',
                'If the patient has not taken a quinolone in the past 6 months — which is the case for Mrs D.:',
              )}
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-[var(--color-muted-foreground)]">
              <li>
                <strong className="text-[var(--color-foreground)]">
                  {pick(lang, 'ciprofloxacine', 'ciprofloxacin')}
                </strong>{' '}
                {pick(lang, '500 mg 2 fois par jour', '500 mg twice daily')}
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">
                  {pick(lang, 'lévofloxacine', 'levofloxacin')}
                </strong>{' '}
                {pick(lang, '500 mg par jour', '500 mg once daily')}
              </li>
            </ul>
          </Block>
          <Block
            tone="blue"
            title={pick(
              lang,
              <>2<sup>e</sup> intention : une C3G par voie parentérale</>,
              <>Second line: a parenteral 3rd-generation cephalosporin</>,
            )}
            icon={Syringe}
          >
            <p className="mb-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {pick(
                lang,
                <>
                  Si une fluoroquinolone a été prise dans les 6 mois.{' '}
                  <strong className="text-[var(--color-foreground)]">C3G</strong> = céphalosporine de
                  3<sup>e</sup> génération :
                </>,
                <>
                  If a fluoroquinolone has been taken in the past 6 months. A{' '}
                  <strong className="text-[var(--color-foreground)]">3rd-generation cephalosporin</strong>{' '}
                  (C3G in French guidelines):
                </>,
              )}
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-[var(--color-muted-foreground)]">
              <li>
                <strong className="text-[var(--color-foreground)]">ceftriaxone</strong>{' '}
                {pick(lang, '1 g par jour, IM ou IV', '1 g once daily, IM or IV')}
              </li>
            </ul>
          </Block>
        </div>
        <p>
          {pick(
            lang,
            <>
              La fiche donne les doses pour un <strong>rein normal</strong>. Pour un DFG de 38, il faut
              un second document, la table OMEDIT : la ciprofloxacine à 500 mg × 2/j reste possible, la
              lévofloxacine doit être <strong>réduite</strong>, la ceftriaxone ne change pas. C’est le
              réflexe de croiser deux sources.
            </>,
            <>
              The sheet gives doses for <strong>normal kidney function</strong>. For a GFR of 38, you
              need a second document, the OMEDIT table: ciprofloxacin 500 mg twice daily remains
              possible, levofloxacin must be <strong>reduced</strong>, ceftriaxone is unchanged. This
              is the reflex of cross-checking two sources.
            </>,
          )}
        </p>
      </Notion>

      <Rejudge lang={lang} />

      <Notion title={pick(lang, 'Un mot pour ça : l’hallucination', 'A word for it: hallucination')}>
        {pick(
          lang,
          <>
            <p>
              On appelle <strong>hallucination</strong> le fait, pour un modèle, de produire une
              information fausse en la présentant avec la <strong>même assurance</strong> qu’une
              information juste : une posologie inexacte, une molécule hors indication, une référence
              entièrement fabriquée.
            </p>
            <p>
              Ce n’est pas un bug que la prochaine version corrigera. Un modèle de langage{' '}
              <strong>prédit la suite de mots la plus plausible</strong> ; quand il « ne sait pas », il
              produit quand même une suite plausible, plutôt que rien. Une fausse posologie a exactement
              la forme d’une vraie.
            </p>
          </>,
          <>
            <p>
              A <strong>hallucination</strong> is when a model produces false information and presents
              it with the <strong>same confidence</strong> as correct information: an inaccurate dose,
              an off-indication drug, an entirely fabricated reference.
            </p>
            <p>
              It is not a bug that the next version will fix. A language model{' '}
              <strong>predicts the most plausible sequence of words</strong>; when it “doesn’t know”,
              it still produces a plausible sequence rather than nothing. A wrong dose looks exactly
              like a right one.
            </p>
          </>,
        )}
        <KpiGrid>
          <Kpi
            value={pick(lang, '91,8 %', '91.8%')}
            label={pick(
              lang,
              'des cliniciens interrogés en ont déjà rencontré une',
              'of surveyed clinicians have already encountered one',
            )}
            icon={Stethoscope}
            tone="red"
          />
          <Kpi
            value={pick(lang, '84,7 %', '84.7%')}
            label={pick(
              lang,
              'la jugent susceptible de causer un tort au patient',
              'consider it likely to cause patient harm',
            )}
            icon={HeartPulse}
            tone="amber"
          />
        </KpiGrid>
        <p className="text-xs">
          {pick(lang, 'Enquête auprès de 70 cliniciens :', 'Survey of 70 clinicians:')}{' '}
          <a
            href="https://arxiv.org/abs/2503.05777"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--color-foreground)] underline decoration-[var(--color-muted-foreground)]/50 underline-offset-[3px] transition-colors hover:decoration-[var(--color-foreground)]"
          >
            Kim et al., Medical Hallucinations in Foundation Models and Their Impact on Healthcare,
            2025
          </a>
          .
        </p>
      </Notion>

      <Notion
        title={pick(lang, 'Le paradoxe de la vérification', 'The verification paradox')}
        icon={ShieldAlert}
      >
        <p>
          {pick(
            lang,
            <>
              Pour vérifier une réponse, il faut déjà connaître la réponse. Or on interroge précisément
              parce qu’on ne sait pas. <strong>Aucun modèle plus gros ne supprime ce paradoxe</strong> :
              seule une source que l’on peut aller lire le casse. C’est ce que vous avez fait à
              l’exercice 2.
            </>,
            <>
              To check an answer, you already need to know the answer. Yet you ask precisely because
              you don’t know. <strong>No bigger model removes this paradox</strong>: only a source you
              can go and read breaks it. That is what you did in exercise 2.
            </>,
          )}
        </p>
        <Figure>
          <FigureParadox lang={lang} />
        </Figure>
      </Notion>

      <Remember
        lang={lang}
        items={pick(
          lang,
          [
            <>
              Une réponse fausse est rédigée avec <strong>la même assurance</strong> qu’une réponse
              juste : rien, à la lecture, ne permet de les distinguer.
            </>,
            <>
              Le modèle produit toujours la suite la plus plausible, même quand il ne sait pas :
              l’hallucination vient de <strong>son fonctionnement même</strong>, et les versions
              suivantes ne la feront pas disparaître.
            </>,
            <>
              Seule une <strong>source vérifiable</strong> permet de juger une réponse.
            </>,
          ],
          [
            <>
              A wrong answer is written with <strong>the same confidence</strong> as a right one:
              nothing in the text lets you tell them apart.
            </>,
            <>
              The model always produces the most plausible continuation, even when it doesn’t know:
              hallucination stems from <strong>the very way it works</strong>, and future versions
              will not make it disappear.
            </>,
            <>
              Only a <strong>verifiable source</strong> lets you judge an answer.
            </>,
          ],
        )}
      />

      <NextUp label={pick(lang, 'Ex 3. Prompt', 'Ex 3. Prompt')} onNext={onNext}>
        {pick(
          lang,
          'Et si le problème venait de la question ? À l’exercice suivant, vous gardez le même cas et le même modèle, et vous ne changez que la façon de demander.',
          'What if the problem came from the question? In the next exercise, you keep the same case and the same model, and change only the way you ask.',
        )}
      </NextUp>
    </>
  )
}

// ============================================================
// Débrief 2 — après le prompt
// ============================================================

function DebriefPrompt({ lang, onNext }: { lang: Lang; onNext: () => void }) {
  return (
    <>
      <Header
        title={pick(
          lang,
          'Ce qu’un prompt peut, et ce qu’il ne peut pas',
          'What a prompt can do, and what it cannot',
        )}
        lead={pick(
          lang,
          'Quatre paliers, de la question brute au prompt travaillé. Les réponses ont changé — mais dans quel sens ?',
          'Four levels, from the bare question to the crafted prompt. The answers changed — but in which direction?',
        )}
      />

      <Observed lang={lang}>
        {pick(
          lang,
          <>
            <li>
              Plus le prompt est riche, plus la réponse est <strong>structurée</strong> : molécule,
              posologie, durée, justification, sources.
            </li>
            <li>
              Le contexte clinique (âge, DFG) change souvent la posologie proposée — vérifiez qu’il est{' '}
              <strong>réellement pris en compte</strong>, pas seulement recopié.
            </li>
            <li>
              Au palier 3, le modèle <strong>cite des références</strong>. Sont-elles vraies ?
            </li>
          </>,
          <>
            <li>
              The richer the prompt, the more <strong>structured</strong> the answer: drug, dose,
              duration, rationale, sources.
            </li>
            <li>
              The clinical context (age, GFR) often changes the proposed dose — check that it is{' '}
              <strong>actually taken into account</strong>, not just copied back.
            </li>
            <li>
              At level 3, the model <strong>cites references</strong>. Are they real?
            </li>
          </>,
        )}
      </Observed>

      <Notion
        title={pick(lang, 'Le prompt n’est qu’un des blocs envoyés', 'The prompt is only one of the blocks sent')}
        icon={MessageSquareText}
      >
        <p>
          {pick(
            lang,
            <>
              À chaque message, l’application assemble un paquet : la{' '}
              <strong>consigne système</strong> (invisible, écrite par l’éditeur de l’outil),
              l’historique, les documents éventuels, puis <strong>votre question</strong>. Le prompt
              est le seul bloc que vous écrivez — c’est ce que vous avez vu avec le bouton en forme
              d’œil.
            </>,
            <>
              With each message, the application assembles a package: the{' '}
              <strong>system prompt</strong> (invisible, written by the tool’s vendor), the history,
              any documents, then <strong>your question</strong>. The prompt is the only block you
              write — that is what you saw with the eye-shaped button.
            </>,
          )}
        </p>
        <Figure>
          <FigurePayload lang={lang} />
        </Figure>
        <p>
          {pick(
            lang,
            'La consigne système du TD demande de répondre court, sans avertissement. Celle de ChatGPT ou de Claude existe aussi, vous ne la lisez jamais : toute réponse d’IA est le produit d’une consigne écrite par quelqu’un d’autre.',
            'The session’s system prompt asks for short answers, without disclaimers. ChatGPT and Claude have one too, which you never get to read: every AI answer is the product of an instruction written by someone else.',
          )}
        </p>
      </Notion>

      <Notion title={pick(lang, 'Les quatre paliers', 'The four levels')}>
        <Figure
          caption={pick(
            lang,
            'Inspiré de Liu et al., Prompt Engineering in Clinical Practice, JMIR 2025',
            'Adapted from Liu et al., Prompt Engineering in Clinical Practice, JMIR 2025',
          )}
        >
          <FigurePromptLevels lang={lang} />
        </Figure>
        <p>
          {pick(
            lang,
            <>
              Chaque palier ajoute un levier : le <strong>contexte</strong> du patient, un{' '}
              <strong>rôle</strong> et une <strong>exigence de source</strong>, puis le{' '}
              <strong>droit de dire « je ne sais pas »</strong> et un raisonnement détaillé, qui rend la
              réponse vérifiable étape par étape.
            </>,
            <>
              Each level adds a lever: the patient’s <strong>context</strong>, a{' '}
              <strong>role</strong> and a <strong>request for sources</strong>, then the{' '}
              <strong>permission to say “I don’t know”</strong> and step-by-step reasoning, which
              makes the answer verifiable one step at a time.
            </>,
          )}
        </p>
      </Notion>

      <Notion
        title={pick(
          lang,
          'Exiger une source ne garantit pas une vraie source',
          'Demanding a source does not guarantee a real source',
        )}
        icon={BookX}
      >
        <p>
          {pick(
            lang,
            'Nous avons posé cette même question à douze modèles, trois fois chacun, avec le prompt brut puis avec le prompt travaillé, et relu chaque référence citée.',
            'We asked this same question to twelve models, three times each, with the bare prompt and then with the crafted prompt, and checked every reference cited.',
          )}
        </p>
        <KpiGrid>
          <Kpi
            value="0 / 36"
            label={pick(
              lang,
              'Réponses citant une source avec le prompt brut',
              'Answers citing a source with the bare prompt',
            )}
            icon={MessageSquareText}
            tone="blue"
          />
          <Kpi
            value="33 / 36"
            label={pick(
              lang,
              'Réponses avec une référence inventée quand on exige « cite tes sources »',
              'Answers with a fabricated reference when asked to “cite your sources”',
            )}
            icon={BookX}
            tone="red"
          />
        </KpiGrid>
        <p>
          {pick(
            lang,
            <>
              Sans document sous les yeux, le modèle n’a rien consulté. Lui demander une source ne
              produit pas une source : cela produit <strong>quelque chose qui a la forme d’une
              source</strong> — « HAS 2019, § 4.2, grade A ». Pour cinq des douze modèles, le
              prompt travaillé a même fait <strong>baisser</strong> la note : la réponse était mieux
              présentée, et moins juste.
            </>,
            <>
              With no document in front of it, the model consulted nothing. Asking it for a source
              does not produce a source: it produces <strong>something shaped like a source</strong>{' '}
              — “HAS 2019, § 4.2, grade A”. For five of the twelve models, the crafted prompt even{' '}
              <strong>lowered</strong> the score: the answer was better presented, and less accurate.
            </>,
          )}
        </p>
        <Callout
          variant="red"
          title={pick(lang, 'Le piège le plus dangereux du TD', 'The most dangerous trap of the session')}
        >
          {pick(
            lang,
            <>
              Une référence inventée <strong>rassure bien plus</strong> qu’une réponse sans source.
              C’est précisément ce qui la rend dangereuse.
            </>,
            <>
              A fabricated reference is <strong>far more reassuring</strong> than an answer with no
              source. That is precisely what makes it dangerous.
            </>,
          )}
        </Callout>
      </Notion>


      <Remember
        lang={lang}
        items={pick(
          lang,
          [
            <>
              Un bon prompt clinique précise le <strong>contexte</strong>, la{' '}
              <strong>tâche</strong>, le <strong>format</strong>, et autorise le modèle à dire qu’il
              ne sait pas.
            </>,
            <>
              Un prompt <strong>oriente</strong> le modèle, il ne lui <strong>apprend</strong> rien :
              le savoir reste celui, figé, de l’entraînement.
            </>,
            <>
              Une source citée n’est pas une source vraie. Pour qu’il s’appuie sur la
              recommandation, il faut la lui <strong>donner</strong> — ce sera l’exercice 6.
            </>,
          ],
          [
            <>
              A good clinical prompt specifies the <strong>context</strong>, the{' '}
              <strong>task</strong>, the <strong>format</strong>, and allows the model to say it
              doesn’t know.
            </>,
            <>
              A prompt <strong>steers</strong> the model; it does not <strong>teach</strong> it
              anything: its knowledge remains the frozen knowledge from training.
            </>,
            <>
              A cited source is not a real source. For the model to rely on the guideline, you have
              to <strong>give it</strong> the guideline — that will be exercise 6.
            </>,
          ],
        )}
      />

      <NextUp label={pick(lang, 'Ex 4. Hasard', 'Ex 4. Randomness')} onNext={onNext}>
        {pick(
          lang,
          'Vous avez peut-être remarqué qu’en reposant exactement la même question, la réponse changeait. L’exercice suivant isole ce phénomène.',
          'You may have noticed that asking exactly the same question again gave a different answer. The next exercise isolates this phenomenon.',
        )}
      </NextUp>
    </>
  )
}

// ============================================================
// Débrief 3 — après le hasard
// ============================================================

function DebriefRandom({ lang, onNext }: { lang: Lang; onNext: () => void }) {
  return (
    <>
      <Header
        title={pick(lang, 'Une réponse est un tirage', 'An answer is a draw')}
        lead={pick(
          lang,
          'Même question, même modèle, trois réponses. D’où vient cette variabilité, et que faut-il en faire ?',
          'Same question, same model, three answers. Where does this variability come from, and what should you do about it?',
        )}
      />

      <Observed lang={lang}>
        {pick(
          lang,
          <>
            <li>
              À la température par défaut (0,7, celle d’un ChatGPT grand public), les trois réponses{' '}
              <strong>diffèrent</strong> : formulation, ordre, parfois la posologie elle-même.
            </li>
            <li>À 0, elles se ressemblent beaucoup, parfois au mot près.</li>
            <li>Au-delà de 1,5, le texte déraille parfois, surtout chez les petits modèles : molécules inventées, phrases incohérentes.</li>
          </>,
          <>
            <li>
              At the default temperature (0.7, as in consumer ChatGPT), the three answers{' '}
              <strong>differ</strong>: wording, order, sometimes the dose itself.
            </li>
            <li>At 0, they are very similar, sometimes word for word.</li>
            <li>Above 1.5, the text sometimes goes off the rails, especially with small models: invented drugs, incoherent sentences.</li>
          </>,
        )}
      </Observed>

      <Notion title={pick(lang, 'Comment un mot est choisi', 'How a word is chosen')}>
        <p>
          {pick(
            lang,
            <>
              Pour chaque mot (plus exactement chaque <strong>token</strong>, un morceau de mot), le
              modèle calcule une probabilité pour tous les candidats possibles, puis en{' '}
              <strong>tire un au sort</strong>. Il l’ajoute au texte et recommence. La{' '}
              <strong>température</strong> règle la largeur du tirage : basse, le plus probable gagne
              presque toujours ; haute, les candidats improbables ont leur chance.
            </>,
            <>
              For each word (more precisely each <strong>token</strong>, a piece of a word), the model
              computes a probability for every possible candidate, then{' '}
              <strong>draws one at random</strong>. It appends it to the text and starts again. The{' '}
              <strong>temperature</strong> sets how wide the draw is: low, the most likely candidate
              almost always wins; high, unlikely candidates get their chance.
            </>,
          )}
        </p>
        <Figure
          caption={pick(
            lang,
            'Déplacez le curseur : la distribution se déforme',
            'Move the slider: the distribution changes shape',
          )}
        >
          <TemperatureDemo lang={lang} />
        </Figure>
      </Notion>

      <Callout
        variant="amber"
        title={pick(lang, 'Constant ne veut pas dire juste', 'Consistent does not mean correct')}
      >
        {pick(
          lang,
          <>
            Baisser la température rend le modèle <strong>reproductible</strong>, pas{' '}
            <strong>véridique</strong>. Une posologie fausse à 0,7 reste fausse à 0 — et elle le sera
            à chaque fois, ce qui la rend encore plus convaincante.
          </>,
          <>
            Lowering the temperature makes the model <strong>reproducible</strong>, not{' '}
            <strong>truthful</strong>. A wrong dose at 0.7 is still wrong at 0 — and it will be wrong
            every time, which makes it even more convincing.
          </>,
        )}
      </Callout>

      <Notion
        title={pick(lang, 'Le réflexe clinique : reposer la question', 'The clinical reflex: ask again')}
        icon={Lightbulb}
      >
        <p>
          {pick(
            lang,
            <>
              Dans un outil grand public, vous ne réglez pas la température. Mais vous pouvez
              retourner le phénomène à votre avantage : <strong>posez deux fois la même question</strong>
              , dans deux conversations neuves. Si la posologie ou la durée change d’une réponse à
              l’autre, c’est que le modèle n’a pas de réponse stable : c’est un signal d’alerte.
            </>,
            <>
              In a consumer tool, you cannot set the temperature. But you can turn the phenomenon to
              your advantage: <strong>ask the same question twice</strong>, in two fresh
              conversations. If the dose or duration changes from one answer to the other, the model
              has no stable answer: that is a warning sign.
            </>,
          )}
        </p>
      </Notion>


      <Remember
        lang={lang}
        items={pick(
          lang,
          [
            <>
              Une réponse est <strong>une</strong> réponse parmi celles que le modèle pouvait
              produire, pas « la » réponse.
            </>,
            <>
              La température règle la <strong>variabilité</strong>, jamais la{' '}
              <strong>justesse</strong>.
            </>,
            <>
              Deux réponses qui divergent sur une dose : <strong>signal d’alerte</strong>.
            </>,
          ],
          [
            <>
              An answer is <strong>one</strong> of the answers the model could have produced, not
              “the” answer.
            </>,
            <>
              Temperature controls <strong>variability</strong>, never{' '}
              <strong>accuracy</strong>.
            </>,
            <>
              Two answers that disagree on a dose: <strong>warning sign</strong>.
            </>,
          ],
        )}
      />

      <NextUp label={pick(lang, 'Ex 5. Mémoire', 'Ex 5. Memory')} onNext={onNext}>
        {pick(
          lang,
          'Jusqu’ici, chaque question repartait de zéro. Que retient un modèle quand on enchaîne plusieurs messages ?',
          'So far, each question started from scratch. What does a model remember when you send several messages in a row?',
        )}
      </NextUp>
    </>
  )
}

// ============================================================
// Débrief 4 — après la mémoire
// ============================================================

function DebriefMemory({ lang, onNext }: { lang: Lang; onNext: () => void }) {
  return (
    <>
      <Header
        title={pick(lang, 'Le modèle ne se souvient de rien', 'The model remembers nothing')}
        lead={pick(
          lang,
          'Sans mémoire, avec mémoire complète, avec résumé : trois façons de faire semblant de se souvenir.',
          'No memory, full memory, summarised memory: three ways of pretending to remember.',
        )}
      />

      <Observed lang={lang}>
        {pick(
          lang,
          <>
            <li>
              <strong>Sans mémoire</strong>, le modèle a oublié le DFG donné deux messages plus tôt.
            </li>
            <li>
              En <strong>mémoire complète</strong>, tout l’historique repart à chaque tour : la jauge
              de contexte se remplit, le coût grimpe, puis la fenêtre sature.
            </li>
            <li>
              En <strong>mémoire résumée</strong>, le coût retombe… mais le résumé a pu perdre une
              information clé.
            </li>
          </>,
          <>
            <li>
              With <strong>no memory</strong>, the model forgot the GFR given two messages earlier.
            </li>
            <li>
              With <strong>full memory</strong>, the whole history is sent again at every turn: the
              context gauge fills up, the cost climbs, then the window saturates.
            </li>
            <li>
              With <strong>summarised memory</strong>, the cost drops… but the summary may have lost
              a key piece of information.
            </li>
          </>,
        )}
      </Observed>

      <Notion
        title={pick(
          lang,
          'Sans état : la mémoire est fabriquée par l’application',
          'Stateless: memory is built by the application',
        )}
      >
        <p>
          {pick(
            lang,
            <>
              Le modèle ne garde <strong>rien</strong> entre deux messages. Ce que vous vivez comme une
              conversation est une suite d’appels indépendants : à chaque tour, l’application{' '}
              <strong>renvoie tout l’historique</strong>, ou un résumé de celui-ci.
            </>,
            <>
              The model keeps <strong>nothing</strong> between two messages. What you experience as a
              conversation is a series of independent calls: at every turn, the application{' '}
              <strong>sends the whole history again</strong>, or a summary of it.
            </>,
          )}
        </p>
        <Figure>
          <FigureMemory lang={lang} />
        </Figure>
        <p>
          {pick(
            lang,
            <>
              Puisque chaque message renvoie tout ce qui précède, le coût d’une conversation ne monte
              pas en ligne droite : <strong>doubler sa longueur en quadruple à peu près le coût</strong>.
            </>,
            <>
              Since each message resends everything before it, the cost of a conversation does not
              grow in a straight line: <strong>doubling its length roughly quadruples the cost</strong>.
            </>,
          )}
        </p>
        <Figure>
          <FigureMemoryGrowth lang={lang} />
        </Figure>
      </Notion>

      <Notion title={pick(lang, 'La fenêtre de contexte', 'The context window')}>
        <p>
          {pick(
            lang,
            <>
              La <strong>fenêtre de contexte</strong> est la quantité maximale de texte que le modèle
              peut prendre en compte en une fois, comptée en tokens. Consigne, historique, documents et
              question doivent tous y tenir ; ce qui déborde est coupé, donc{' '}
              <strong>oublié</strong>. Le TD vous imposait environ 1 000 tokens pour que la saturation
              arrive pendant la séance ; les modèles du TD en acceptent de 131 000 à plus d’un million.
            </>,
            <>
              The <strong>context window</strong> is the maximum amount of text the model can take
              into account at once, counted in tokens. System prompt, history, documents and question
              must all fit in it; whatever overflows is cut off, and therefore{' '}
              <strong>forgotten</strong>. The session imposed about 1,000 tokens so that saturation
              would happen during class; the session’s models accept from 131,000 to over a million.
            </>,
          )}
        </p>
        <p>
          {pick(
            lang,
            <>
              C’est pour cela que certains outils vous proposent, quand la conversation s’allonge, de la{' '}
              <strong>« compacter »</strong> : le modèle rédige lui-même un résumé de tout l’échange,
              qui remplace l’historique et fait de nouveau tenir la conversation dans la fenêtre. C’est
              exactement la mémoire résumée de l’exercice, avec le même risque : un détail important
              peut disparaître du résumé.
            </>,
            <>
              That is why some tools offer, when the conversation gets long, to{' '}
              <strong>“compact”</strong> it: the model itself writes a summary of the whole exchange,
              which replaces the history and makes the conversation fit in the window again. This is
              exactly the summarised memory from the exercise, with the same risk: an important
              detail can vanish from the summary.
            </>,
          )}
        </p>
        <Callout
          variant="blue"
          title={pick(lang, 'Un nouveau sujet, une nouvelle conversation', 'A new topic, a new conversation')}
        >
          {pick(
            lang,
            <>
              Pour changer de sujet, ouvrez une conversation neuve plutôt que de continuer l’ancienne :
              le modèle ne sera pas distrait par ce qui précède, ses réponses seront plus pertinentes,
              et vous consommerez <strong>moins de tokens</strong>.
            </>,
            <>
              To change topic, open a fresh conversation rather than continuing the old one: the
              model will not be distracted by what came before, its answers will be more relevant,
              and you will use <strong>fewer tokens</strong>.
            </>,
          )}
        </Callout>
        <Figure>
          <FigureContextScale lang={lang} />
        </Figure>
        <Callout
          variant="amber"
          title={pick(
            lang,
            'Grande fenêtre ne veut pas dire bien utilisée',
            'A large window does not mean a well-used one',
          )}
        >
          {pick(
            lang,
            <>
              L’information placée <strong>au milieu</strong> d’un long contexte est moins bien exploitée
              que celle du début ou de la fin (« lost in the middle »). Mieux vaut une fenêtre bien
              remplie qu’une fenêtre pleine.
            </>,
            <>
              Information placed <strong>in the middle</strong> of a long context is used less well
              than information at the beginning or the end (“lost in the middle”). A well-filled
              window beats a full one.
            </>,
          )}
        </Callout>
      </Notion>


      <Remember
        lang={lang}
        items={pick(
          lang,
          [
            <>
              Le modèle est <strong>sans état</strong> : la continuité est fabriquée par
              l’application.
            </>,
            <>
              Une donnée critique (DFG, allergie) se <strong>redonne</strong> dans la question, plutôt
              que de compter sur la mémoire.
            </>,
            <>
              <strong>Une conversation par sujet</strong> : moins de coût, moins de bruit, moins
              d’oubli.
            </>,
          ],
          [
            <>
              The model is <strong>stateless</strong>: continuity is built by the application.
            </>,
            <>
              Critical data (GFR, allergy) should be <strong>restated</strong> in the question rather
              than relying on memory.
            </>,
            <>
              <strong>One conversation per topic</strong>: lower cost, less noise, less forgetting.
            </>,
          ],
        )}
      />

      <NextUp label={pick(lang, 'Ex 6. Documents', 'Ex 6. Documents')} onNext={onNext}>
        {pick(
          lang,
          'Le prompt n’apprend rien au modèle, la mémoire ne fait que recoller du texte. Reste à lui donner la vraie recommandation.',
          'The prompt teaches the model nothing, and memory only pastes text back in. What remains is to give it the actual guideline.',
        )}
      </NextUp>
    </>
  )
}

// ============================================================
// Débrief 5 — après les documents
// ============================================================

function DebriefRag({ lang, onNext }: { lang: Lang; onNext: () => void }) {
  return (
    <>
      <Header
        title={pick(lang, 'Faire lire un document au modèle : le RAG', 'Having the model read a document: RAG')}
        lead={pick(
          lang,
          'Avec la recommandation jointe, les réponses changent de nature. Et quand le document est trop gros pour être envoyé en entier, un nouveau mécanisme entre en jeu.',
          'With the guideline attached, the answers change in nature. And when the document is too large to be sent in full, a new mechanism comes into play.',
        )}
      />

      <Observed lang={lang}>
        {pick(
          lang,
          <>
            <li>
              Avec les documents joints, les réponses citent des <strong>pages et des passages</strong>{' '}
              que vous pouvez aller vérifier dans le PDF.
            </li>
            <li>
              Les documents étaient <strong>recopiés en entier</strong> devant votre question : c’est
              ce qui fait grimper le coût d’entrée.
            </li>
            <li>
              Avec la table OMEDIT en plus, le modèle a de quoi adapter la dose au DFG — encore
              faut-il qu’il lise la bonne ligne.
            </li>
          </>,
          <>
            <li>
              With the documents attached, the answers cite <strong>pages and passages</strong> that
              you can go and check in the PDF.
            </li>
            <li>
              The documents were <strong>copied in full</strong> in front of your question: that is
              what drives up the input cost.
            </li>
            <li>
              With the OMEDIT table as well, the model has what it needs to adjust the dose for GFR —
              provided it reads the right row.
            </li>
          </>,
        )}
      </Observed>

      <Notion title={pick(lang, 'Le principe en quatre temps', 'The principle in four steps')}>
        <p>
          {pick(
            lang,
            <>
              Vos deux documents tenaient dans la fenêtre de contexte. Une recommandation de 40 pages,
              ou tout un classeur de protocoles, ne tient pas : l’application doit alors choisir quoi
              envoyer. C’est le <strong>RAG</strong>, pour <em>Retrieval-Augmented Generation</em>,
              génération augmentée par récupération. Le document est <strong>découpé</strong> en
              passages, chaque passage est <strong>converti en vecteur</strong>, la question aussi ; on{' '}
              <strong>récupère</strong> les passages les plus proches de la question.
            </>,
            <>
              Your two documents fit in the context window. A 40-page guideline, or a whole binder of
              protocols, does not: the application must then choose what to send. This is{' '}
              <strong>RAG</strong>, for <em>Retrieval-Augmented Generation</em>. The document is{' '}
              <strong>split</strong> into passages, each passage is <strong>converted into a
              vector</strong>, and so is the question; the passages closest to the question are{' '}
              <strong>retrieved</strong>.
            </>,
          )}
        </p>
        <Figure>
          <FigureRag lang={lang} />
        </Figure>
        <p>
          {pick(
            lang,
            <>
              Ces passages prennent ensuite la place du document entier dans le paquet envoyé au
              modèle : ils remplissent le bloc <strong>Documents joints</strong>, entre la consigne
              système et votre question. Le modèle ne voit rien d’autre du document.
            </>,
            <>
              These passages then take the place of the whole document in the package sent to the
              model: they fill the <strong>Attached documents</strong> block,
              between the system prompt and your question. The model sees nothing else of the
              document.
            </>,
          )}
        </p>
        <Figure>
          <FigurePayload
            lang={lang}
            docsNote={pick(lang, 'Ici, les seuls passages récupérés', 'Here, only the retrieved passages')}
          />
        </Figure>
      </Notion>

      <Notion
        title={pick(
          lang,
          'Que veut dire « proximité de sens : 0,84 » ?',
          'What does “Semantic similarity: 0.84” mean?',
        )}
      >
        <p>
          {pick(
            lang,
            <>
              Chaque passage devient un point dans un espace où les textes de sens voisin sont proches.
              La <strong>similarité cosinus</strong> mesure l’écart d’orientation entre deux points :{' '}
              <strong>1</strong> pour deux textes qui disent la même chose, <strong>0</strong> pour deux
              textes sans rapport. Un 0,84 signifie « très proche par le sens » — pas « juste ».
            </>,
            <>
              Each passage becomes a point in a space where texts with similar meaning lie close
              together. <strong>Cosine similarity</strong> measures the difference in direction
              between two points: <strong>1</strong> for two texts that say the same thing,{' '}
              <strong>0</strong> for two unrelated texts. A 0.84 means “very close in meaning” — not
              “correct”.
            </>,
          )}
        </p>
        <RetrievalPlot className="my-0" lang={lang} />
        <p>
          {pick(
            lang,
            'Le passage retenu ne partage presque aucun mot avec la question : c’est tout l’intérêt d’une recherche par le sens plutôt que par mots-clés.',
            'The selected passage shares almost no words with the question: that is the whole point of searching by meaning rather than by keywords.',
          )}
        </p>
      </Notion>

      <Notion
        title={pick(
          lang,
          'Le découpage décide de ce qu’on retrouvera',
          'Chunking decides what will be found',
        )}
      >
        <p>
          {pick(
            lang,
            <>
              Dans la fiche HAS, la section « Traitement probabiliste » ne dit pas qu’elle concerne la
              pyélonéphrite <strong>simple</strong> : c’est le titre, un niveau plus haut, qui le dit.
              Et une autre section « Traitement », celle de la pyélonéphrite à risque de complication,
              annonce <strong>10 jours</strong> au lieu de 7. Un passage découpé sans son titre peut
              être pris pour l’autre.
            </>,
            <>
              In the HAS sheet, the “Empirical treatment” section does not say that it concerns{' '}
              <strong>uncomplicated</strong> pyelonephritis: the heading one level up does. And
              another “Treatment” section, the one for pyelonephritis at risk of complications, states{' '}
              <strong>10 days</strong> instead of 7. A passage cut without its heading can be mistaken
              for the other.
            </>,
          )}
        </p>
        <Figure>
          <FigureChunkContext lang={lang} />
        </Figure>
      </Notion>

      <Notion
        title={pick(lang, 'Ce que les documents changent vraiment', 'What documents really change')}
        icon={BookX}
      >
        <KpiGrid>
          <Kpi
            value="33 → 10"
            label={pick(
              lang,
              'Références inventées, sans document → avec les documents joints (sur 36)',
              'Fabricated references, without documents → with documents attached (out of 36)',
            )}
            icon={BookX}
            tone="red"
          />
          <Kpi
            value="12 → 28"
            label={pick(
              lang,
              <>
                Adaptations au DFG correctes (sur 36) :
                <br />
                Prompt travaillé → documents joints
              </>,
              <>
                Correct GFR adjustments (out of 36):
                <br />
                Crafted prompt → documents attached
              </>,
            )}
            icon={Target}
            tone="emerald"
          />
        </KpiGrid>
        <p>
          {pick(
            lang,
            <>
              Les documents ne rendent pas le modèle infaillible : même avec la fiche et la table sous
              les yeux, 10 réponses sur 36 leur attribuent encore une information qu’ils ne contiennent
              pas — une condition inversée, une adaptation rénale prêtée à la HAS alors qu’elle vient
              de la table OMEDIT. Mais ils rendent
              ses citations <strong>vérifiables</strong> : vous pouvez ouvrir la page citée et
              constater. C’est ce qui casse le paradoxe de la vérification vu au premier débrief.
            </>,
            <>
              Documents do not make the model infallible: even with the sheet and the table in front
              of it, 10 answers out of 36 still attribute to them information they do not contain — a
              reversed condition, a renal adjustment credited to the HAS when it comes from the OMEDIT
              table. But they make its citations <strong>verifiable</strong>: you can open the cited
              page and see for yourself. That is what breaks the verification paradox seen in the
              first debrief.
            </>,
          )}
        </p>
      </Notion>


      <Remember
        lang={lang}
        items={pick(
          lang,
          [
            <>
              Joindre un document, c’est en <strong>coller le texte</strong> devant la question — en
              entier s’il est petit, par <strong>passages</strong> s’il est gros.
            </>,
            <>
              Si la recherche se trompe de passage, la réponse est <strong>fausse et sourcée</strong>.
            </>,
            <>
              Le gain du RAG n’est pas la certitude : c’est une citation qu’on peut{' '}
              <strong>vérifier</strong>.
            </>,
          ],
          [
            <>
              Attaching a document means <strong>pasting its text</strong> in front of the question —
              in full if it is small, as <strong>passages</strong> if it is large.
            </>,
            <>
              If the search picks the wrong passage, the answer is <strong>wrong and sourced</strong>.
            </>,
            <>
              The benefit of RAG is not certainty: it is a citation you can{' '}
              <strong>verify</strong>.
            </>,
          ],
        )}
      />

      <NextUp label={pick(lang, 'Ex 7. Synthèse', 'Ex 7. Summary')} onNext={onNext}>
        {pick(
          lang,
          'Tous les leviers sont désormais entre vos mains. L’épreuve finale : un seul prompt qui donne la bonne réponse sur les trois modèles.',
          'All the levers are now in your hands. The final challenge: a single prompt that gives the right answer on all three models.',
        )}
      </NextUp>
    </>
  )
}

// ============================================================
// Bilan — après la synthèse
// ============================================================

function WrapUp({ lang, onNext }: { lang: Lang; onNext: () => void }) {
  return (
    <>
      <Header
        title={pick(lang, 'Ce que vous emportez', 'What you take away')}
        lead={pick(
          lang,
          'Une grille de lecture pour la prochaine fois qu’un chatbot vous répondra, et la règle à ne jamais oublier.',
          'A checklist for the next time a chatbot answers you, and the rule never to forget.',
        )}
      />

      <Notion
        title={pick(lang, 'Avant de faire confiance à une réponse', 'Before trusting an answer')}
        icon={ListChecks}
      >
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          {pick(
            lang,
            <>
              <li>
                Ai-je donné le <strong>contexte complet</strong> — et redonné les données critiques
                dans la question ?
              </li>
              <li>
                La réponse cite-t-elle une <strong>source que je peux ouvrir</strong> ? L’ai-je
                ouverte ?
              </li>
              <li>
                Reste-t-elle la même si je repose la question dans une <strong>conversation
                neuve</strong> ?
              </li>
              <li>
                Ai-je écrit quoi que ce soit qui permette de <strong>retrouver un patient</strong> ?
                Pas seulement son nom : un âge, un antécédent, une date, un service suffisent souvent.
              </li>
              <li>
                Suis-je prêt à <strong>signer</strong> cette prescription comme si je l’avais trouvée
                seul ?
              </li>
            </>,
            <>
              <li>
                Did I give the <strong>full context</strong> — and restate the critical data in the
                question?
              </li>
              <li>
                Does the answer cite a <strong>source I can open</strong>? Did I open it?
              </li>
              <li>
                Does it stay the same if I ask again in a <strong>fresh conversation</strong>?
              </li>
              <li>
                Did I write anything that could <strong>identify a patient</strong>? Not just their
                name: an age, a medical history, a date, a ward are often enough.
              </li>
              <li>
                Am I ready to <strong>sign</strong> this prescription as if I had worked it out
                myself?
              </li>
            </>,
          )}
        </ol>
      </Notion>

      <Callout
        variant="red"
        title={pick(
          lang,
          'Aucune donnée patient dans un chatbot grand public',
          'No patient data in a consumer chatbot',
        )}
      >
        {pick(
          lang,
          <div className="flex flex-col gap-2">
            <p>
              Ce que vous écrivez dans ChatGPT, Claude ou Gemini <strong>sort de l’hôpital</strong> :
              le texte part chez un tiers, qui peut le conserver.
            </p>
            <p>
              Retirer le nom ne suffit pas. Une donnée devient vite <strong>identifiante</strong> une
              fois recoupée : « femme de 68 ans, insuffisance rénale, pyélonéphrite », envoyé un
              mardi matin depuis le compte d’un interne de néphrologie de tel CHU, désigne souvent
              une seule personne. C’est la position de la CNIL : une donnée dont on peut retrouver
              la personne par des moyens raisonnables reste une donnée de santé personnelle, même
              sans nom.
            </p>
            <p>
              Les chatbots grand public servent donc à <strong>étudier</strong> : réviser, travailler
              un cas clinique fictif, comme dans ce TD. <strong>Jamais dans le soin</strong>, jamais
              devant un patient. Pour cela, il faut les outils fournis par votre établissement, dont
              les données sont confiées à un <strong>hébergeur certifié de données de santé (HDS)</strong>,
              comme l’exige la loi.
            </p>
          </div>,
          <div className="flex flex-col gap-2">
            <p>
              What you type into ChatGPT, Claude or Gemini <strong>leaves the hospital</strong>: the
              text goes to a third party, which may keep it.
            </p>
            <p>
              Removing the name is not enough. Data quickly becomes <strong>identifying</strong> once
              cross-referenced: “68-year-old woman, renal impairment, pyelonephritis”, sent on a
              Tuesday morning from the account of a nephrology resident at a given university
              hospital, often points to a single person. This is the position of the CNIL (the French
              data protection authority): data from which a person can be identified by reasonable
              means remains personal health data, even without a name.
            </p>
            <p>
              Consumer chatbots are therefore for <strong>studying</strong>: revising, working on a
              fictional clinical case, as in this session. <strong>Never in patient care</strong>,
              never in front of a patient. For that, you need the tools provided by your institution,
              whose data is entrusted to a <strong>certified health data host (HDS)</strong>, as
              required by French law.
            </p>
          </div>,
        )}
      </Callout>

      <NextUp label={pick(lang, 'Auto-évaluation', 'Self-assessment')} onNext={onNext}>
        {pick(
          lang,
          'Dernière étape : refaites l’auto-évaluation du début, puis choisissez de partager ou non votre séance.',
          'Last step: redo the self-assessment from the start, then choose whether to share your session.',
        )}
      </NextUp>
    </>
  )
}

// ============================================================
// Aiguillage
// ============================================================

export function DebriefStep({
  id,
  lang,
  onNext,
}: {
  id: string
  lang: Lang
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {id === 'debrief-verify' && <DebriefVerify lang={lang} onNext={onNext} />}
      {id === 'debrief-prompt' && <DebriefPrompt lang={lang} onNext={onNext} />}
      {id === 'debrief-random' && <DebriefRandom lang={lang} onNext={onNext} />}
      {id === 'debrief-memory' && <DebriefMemory lang={lang} onNext={onNext} />}
      {id === 'debrief-rag' && <DebriefRag lang={lang} onNext={onNext} />}
      {id === 'wrapup' && <WrapUp lang={lang} onNext={onNext} />}
    </div>
  )
}

import { BookOpen, FileText, MonitorPlay, Wrench } from 'lucide-react'
import { CardGrid, ExternalResource } from '@/components/article/blocks'

/**
 * Ressources externes, vérifiées le 31/08/2026. Elles sont regroupées ici pour
 * qu'un lien mort se corrige à un seul endroit, et non dans chaque cours.
 *
 * Principe de sélection : le francophone et l'officiel d'abord (la HAS fait
 * autorité pour de futurs médecins), l'anglophone en complément facultatif.
 */

export function ResourcesCourse1() {
  return (
    <CardGrid>
      {/* Du plus accessible au plus technique : la vidéo de vulgarisation
          d'abord, l'intérieur du modèle en dernier. */}
      <ExternalResource
        href="https://www.youtube.com/watch?v=YcIbZGTRMjI"
        title="Science étonnante — les 4 étapes pour entraîner un LLM"
        kind="Vidéo · français"
        icon={MonitorPlay}
      >
        David Louapre détaille les quatre étapes de l'entraînement d'un modèle de langage. La
        meilleure vulgarisation francophone sur le sujet : commencez par là.
      </ExternalResource>

      <ExternalResource
        href="https://projector.tensorflow.org/"
        title="Embedding Projector"
        kind="Outil interactif"
        icon={Wrench}
      >
        L'espace vectoriel des mots, en vrai et en 3D. Cherchez un mot, observez ses voisins : c'est
        exactement le mécanisme derrière la « proximité de sens » du TD.
      </ExternalResource>

      <ExternalResource
        href="https://tiktokenizer.vercel.app/"
        title="Tiktokenizer"
        kind="Outil interactif"
        icon={Wrench}
      >
        Collez un texte et voyez son découpage en tokens, avec le compte exact. Essayez un terme
        médical rare : vous verrez qu'il coûte beaucoup plus de tokens qu'un mot courant.
      </ExternalResource>

      <ExternalResource
        href="https://poloclub.github.io/transformer-explainer/"
        title="Transformer Explainer"
        kind="Outil interactif"
        icon={Wrench}
      >
        Un vrai GPT-2 tourne dans votre navigateur. Tapez une phrase, bougez la température, le
        top-k et le top-p, et regardez la distribution des mots candidats se déformer. Le meilleur
        moyen de voir ce que ces réglages font. Écrivez vos exemples{' '}
        <strong>en anglais</strong> : le modèle utilisé ne gère bien que cette langue.
      </ExternalResource>
    </CardGrid>
  )
}

export function ResourcesCourse2() {
  return (
    <CardGrid>
      <ExternalResource
        href="https://www.has-sante.fr/jcms/p_3703069/fr/l-ia-generative-en-sante-oui-avec-un-usage-responsable"
        title="HAS — L'IA générative en santé"
        kind="Recommandation officielle · français"
        icon={FileText}
      >
        Publié le 30 octobre 2025. Le guide « Premières clefs d'usage » et son infographie A.V.E.C.
        d'une page. C'est le cadre officiel qui s'appliquera à votre pratique : à lire en entier.
      </ExternalResource>

      <ExternalResource
        href="https://www.anthropic.com/engineering/contextual-retrieval"
        title="Anthropic — Contextual Retrieval"
        kind="Article technique · anglais"
        icon={BookOpen}
      >
        Comment améliorer la phase de récupération d'un RAG en donnant à chaque passage le contexte
        du document dont il vient. C'est la méthode employée par le TD lui-même.
      </ExternalResource>

      <ExternalResource
        href="https://doi.org/10.2196/72644"
        title="Prompt Engineering in Clinical Practice"
        kind="Article scientifique · anglais · accès libre"
        icon={BookOpen}
      >
        Liu et al., JMIR 2025. Le tutoriel qui a inspiré les paliers de prompt du TD. Attention :
        c'est un tutoriel narratif, il ne mesure pas l'efficacité des techniques qu'il décrit.
      </ExternalResource>
    </CardGrid>
  )
}

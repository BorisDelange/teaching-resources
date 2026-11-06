import { BookOpen, FileText, MonitorPlay } from 'lucide-react'
import { CardGrid, ExternalResource } from '@/components/article/blocks'

/**
 * Ressources externes du cours d'introduction, vérifiées le 19/09/2026.
 * Même principe de sélection que pour les cours LLM : le francophone et
 * l'officiel d'abord, l'anglophone en complément facultatif.
 */

export function ResourcesDefinition() {
  return (
    <CardGrid>
      <ExternalResource
        href="https://interstices.info/lintelligence-artificielle-hier-aujourdhuiet-demain/"
        title="Interstices — L'IA : hier, aujourd'hui… et demain"
        kind="Article de vulgarisation · français"
        icon={FileText}
      >
        Jean-Paul Haton retrace l&rsquo;IA depuis les années 1950 à travers ses trois grands
        courants, jusqu&rsquo;à l&rsquo;IA générative. Publié par la revue de vulgarisation
        d&rsquo;Inria, accessible sans prérequis : commencez par là.
      </ExternalResource>

      <ExternalResource
        href="https://www.college-de-france.fr/fr/agenda/lecon-inaugurale/apprentissage-profond-une-revolution-en-intelligence-artificielle"
        title="Collège de France — L'apprentissage profond"
        kind="Leçon inaugurale · français"
        icon={MonitorPlay}
      >
        La leçon inaugurale de Yann LeCun (2016), l&rsquo;un des artisans de l&rsquo;apprentissage
        profond. Utile pour entendre le domaine décrit par quelqu&rsquo;un qui l&rsquo;a construit,
        avant l&rsquo;emballement autour des modèles de langage.
      </ExternalResource>

      <ExternalResource
        href="https://www.cnil.fr/fr/intelligence-artificielle/intelligence-artificielle-de-quoi-parle-t-on"
        title="CNIL — Intelligence artificielle, de quoi parle-t-on ?"
        kind="Ressource institutionnelle · français"
        icon={FileText}
      >
        Définitions, exemples concrets, et surtout une section sur les raisons pour lesquelles ces
        systèmes se trompent — données non représentatives, conditions d&rsquo;usage. Pertinent pour
        un public médical : biais, contrôle humain et décision automatisée.
      </ExternalResource>

      <ExternalResource
        href="https://doi.org/10.1093/mind/LIX.236.433"
        title="Turing — Computing machinery and intelligence"
        kind="Article fondateur · anglais"
        icon={BookOpen}
      >
        L&rsquo;article de 1950 qui pose le jeu de l&rsquo;imitation. Étonnamment lisible : Turing
        y discute lui-même, une à une, les objections qu&rsquo;on lui opposera.
      </ExternalResource>
    </CardGrid>
  )
}

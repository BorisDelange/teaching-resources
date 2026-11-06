// ============================================================
// La liste des modèles du TD, remaniable par le formateur.
//
// Les trois modèles d'origine ne sont qu'un POINT DE DÉPART : ils sont ceux
// d'OpenRouter, et un Ollama local n'a presque jamais les mêmes. On ajoute
// donc, on retire, on renomme — et « Rétablir » ramène exactement le TD tel
// qu'il a été écrit, si bien qu'aucun remaniement n'est définitif.
//
// Ce qui compte n'est pas leur NOMBRE mais l'ÉCART de tailles : le TD montre
// qu'un modèle de 4 milliards de paramètres et un de 70 ne se trompent pas de
// la même façon. Trois modèles très différents valent mieux que six voisins.
//
// `sizeRatio` (la barre de taille) est déduit des paramètres saisis plutôt que
// demandé : c'est une donnée d'affichage, et la calculer évite un champ de
// plus dont personne ne devinerait le rôle.
// ============================================================

import { useEffect, useState } from 'react'
import { Check, Loader2, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { useSettings, tdModels } from './settings'
import { discoverModels } from './providers'
import { capturedModelIds } from './offline'
import { SANDBOX_MODELS, type SandboxModel } from './warmup-data'
import { paramsLabel } from './data'

/** Le plus gros modèle sert d'échelle à la barre de taille. */
function withRatios(list: SandboxModel[]): SandboxModel[] {
  const max = list.reduce((m, x) => Math.max(m, parseFloat(x.params) || 0), 0)
  return list.map((m) => ({
    ...m,
    sizeRatio: max > 0 ? Math.min(1, (parseFloat(m.params) || 0) / max) : 0.5,
  }))
}

/**
 * Ce qu'on peut DÉDUIRE d'un identifiant de modèle.
 *
 * Les identifiants sont conventionnels : `qwen/qwen3-27b`, `gemma3:4b`,
 * `meta-llama/Llama-3.3-70B-Instruct`. L'éditeur y précède souvent le nom, et
 * la taille s'y écrit en « 27b ». Autant remplir les champs plutôt que de les
 * faire retaper — ils restent modifiables, et une déduction fausse se corrige
 * en un clic là où un champ vide oblige à tout saisir.
 *
 * Rien n'est inventé : sans indice reconnaissable, on laisse vide et
 * l'appelant retombe sur ses valeurs par défaut.
 */
const MAKERS: Record<string, string> = {
  google: 'Google',
  meta: 'Meta',
  'meta-llama': 'Meta',
  llama: 'Meta',
  mistral: 'Mistral AI',
  mistralai: 'Mistral AI',
  qwen: 'Qwen',
  alibaba: 'Qwen',
  deepseek: 'DeepSeek',
  microsoft: 'Microsoft',
  phi: 'Microsoft',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  cohere: 'Cohere',
  nvidia: 'NVIDIA',
  ai21: 'AI21',
  gemma: 'Google',
  gemini: 'Google',
  falcon: 'TII',
  yi: '01.AI',
}

function inferModelFields(slug: string): { maker: string; params: string; displayName: string } {
  const clean = slug.trim()
  // L'éditeur : le préfixe avant « / » quand il existe (OpenRouter), sinon le
  // premier mot du nom (Ollama, qui n'a pas de préfixe : « gemma3:4b »).
  const prefix = clean.includes('/') ? clean.split('/')[0] : clean.split(/[:\-_.]/)[0]
  // Les tags Ollama collent la version au nom (« gemma3:4b », « qwen2.5:14b ») :
  // sans retirer ces chiffres, aucun éditeur ne serait jamais reconnu.
  const family = prefix.toLowerCase().replace(/[\d.]+$/, '')
  const maker = MAKERS[prefix.toLowerCase()] ?? MAKERS[family] ?? ''

  // La taille : « 27b », « 3.8b », « 70B ». On exige la frontière pour ne pas
  // confondre avec un numéro de version (« llama-3.1 » n'est pas 3 milliards).
  const size = clean.match(/(?:^|[^a-z0-9])(\d+(?:\.\d+)?)\s*b(?![a-z0-9])/i)
  const params = size ? `${size[1].replace('.', ',')} milliards` : ''

  // Le nom affiché : la partie après « / », débarrassée des suffixes
  // techniques qui n'apprennent rien à l'étudiant (« -it », « -instruct »).
  const tail = clean.includes('/') ? clean.slice(clean.indexOf('/') + 1) : clean
  const displayName = tail
    .replace(/[:_]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b(instruct|it|chat|latest)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(\d+(?:[.,]\d+)?)\s*b\b/i, (_, n: string) => `${n}B`)
    .replace(/^\w/, (c) => c.toUpperCase())

  return { maker, params, displayName }
}

/** Un identifiant stable, dérivé du nom saisi. */
function idFrom(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'modele'
  let id = base
  let n = 2
  while (taken.includes(id)) id = `${base}-${n++}`
  return id
}

export function ModelsSettings({ lang }: { lang: Lang }) {
  const [settings, update] = useSettings()
  const custom = settings.customModels !== null
  const chosen = settings.enabledModels

  /**
   * Hors ligne, la liste n'est pas une préférence mais un FAIT : seuls les
   * modèles réellement capturés peuvent répondre. On montre donc ceux-là,
   * sans permettre d'en ajouter ni d'en modifier — un modèle saisi à la main
   * n'aurait aucune réponse à rejouer. Cocher reste utile : on peut vouloir
   * n'en comparer que deux en séance.
   */
  const offline = settings.offlineMode
  const captured = offline ? capturedModelIds() : []
  const list = offline
    ? SANDBOX_MODELS.filter((m) => captured.includes(m.id))
    : tdModels(settings)

  const [adding, setAdding] = useState(false)
  /** Modèle visé par la corbeille, en attente de confirmation. */
  const [doomed, setDoomed] = useState<SandboxModel | null>(null)

  /**
   * Ce que le fournisseur propose RÉELLEMENT.
   *
   * La vérification est AUTOMATIQUE : à l'ouverture de l'onglet et à chaque
   * changement de connexion. Un bouton aurait fait porter à l'utilisateur une
   * étape qu'il n'a aucune raison de penser à franchir — et la liste serait
   * restée fausse jusqu'à ce qu'il y pense.
   *
   * Le constat est INDISSOCIABLE du fournisseur qui l'a produit : garder la
   * liste d'Ollama en basculant sur OpenRouter barrerait des modèles
   * parfaitement disponibles. Les deux sont donc stockés ensemble, et un
   * changement d'URL périme le constat de lui-même.
   *
   * `names: null` = on n'a pas pu regarder. À ne jamais confondre avec « aucun
   * modèle disponible » : ne rien savoir n'autorise pas à barrer la liste.
   */
  const providerKey = `${settings.provider.id}|${settings.provider.baseUrl}`
  const [probe, setProbe] = useState<{ key: string; names: string[] | null } | null>(null)

  const available = probe && probe.key === providerKey ? probe.names : null
  const checkFailed = probe?.key === providerKey && probe.names === null

  const { baseUrl, apiKey, modelMap } = settings.provider
  /** Le nom réellement envoyé : celui du fournisseur s'il en a un, sinon le slug. */
  const nameFor = (m: SandboxModel) => modelMap[m.id]?.trim() || m.slug.trim()
  const configured = !offline && !!baseUrl.trim()
  // « En cours » se DÉDUIT : tant qu'aucun constat ne porte sur le fournisseur
  // courant, c'est qu'on est en train de le faire. Un état séparé aurait dû
  // être posé depuis l'effet, ce qui déclenche un rendu en cascade.
  const checking = configured && probe?.key !== providerKey

  useEffect(() => {
    if (!configured) return
    // `cancelled` : en changeant d'URL pendant une vérification, la réponse de
    // l'ANCIENNE peut revenir après celle de la nouvelle et écraser un constat
    // plus récent. On ignore donc ce qui n'est plus d'actualité.
    let cancelled = false
    void discoverModels(baseUrl, apiKey).then((found) => {
      if (cancelled) return
      setProbe({ key: providerKey, names: found ? found.map((m) => m.name) : null })
    })
    return () => {
      cancelled = true
    }
  }, [providerKey, baseUrl, apiKey, configured])

  /**
   * Décocher ce qui est constaté absent, une fois le constat établi.
   *
   * Séparé de la vérification elle-même : celle-ci ne doit qu'observer, alors
   * que ceci ÉCRIT dans les réglages. Les garder ensemble ferait réécrire les
   * réglages à chaque passage sur l'onglet, y compris quand rien n'a changé.
   */
  useEffect(() => {
    if (offline || available === null) return
    const usable = list
      .filter((m) => available.includes(modelMap[m.id]?.trim() || m.slug.trim()))
      .map((m) => m.id)
    // Si plus RIEN n'est disponible, on ne touche à rien : une sélection vide
    // laisserait le TD sans aucun modèle à interroger, et le badge « indisponible »
    // dit déjà ce qu'il faut comprendre.
    if (usable.length === 0 || usable.length === list.length) return
    const current = chosen ?? list.map((m) => m.id)
    // Ne rien écrire si la sélection est déjà correcte, sinon l'effet se
    // rappellerait lui-même indéfiniment.
    if (current.length === usable.length && current.every((id) => usable.includes(id))) return
    update({ enabledModels: usable })
  }, [available, list, chosen, offline, update, modelMap])

  /** Un modèle absent de ce que le serveur annonce ne peut pas répondre. */
  function unavailable(m: SandboxModel): boolean {
    if (offline || available === null) return false
    return !available.includes(nameFor(m))
  }

  /** Écrit la liste complète : dès qu'on touche à un modèle, elle est à nous. */
  function writeList(next: SandboxModel[]) {
    update({ customModels: withRatios(next) })
  }

  function patch(id: string, field: keyof SandboxModel, value: string) {
    writeList(list.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }

  function remove(id: string) {
    const next = list.filter((m) => m.id !== id)
    writeList(next)
    // Un modèle retiré ne doit pas rester dans la liste des modèles cochés,
    // sinon le compteur afficherait un actif qui n'existe plus.
    if (chosen) {
      const kept = chosen.filter((x) => x !== id)
      update({ enabledModels: kept.length > 0 ? kept : null })
    }
  }

  function toggle(id: string) {
    // Cocher un modèle absent du serveur ne mènerait qu'à une erreur d'envoi :
    // on refuse l'action plutôt que de la laisser échouer plus tard.
    const target = list.find((m) => m.id === id)
    if (target && unavailable(target)) return

    const current = chosen ?? list.map((m) => m.id)
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    // Jamais zéro modèle actif : le TD n'aurait plus rien à interroger.
    if (next.length === 0) return
    update({ enabledModels: next.length === list.length ? null : next })
  }

  const field =
    'min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs outline-none focus:border-blue-500'

  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {offline
          ? pick(
              lang,
              'En mode hors ligne, seuls ces modèles peuvent répondre : ce sont ceux pour lesquels des réponses ont été enregistrées à l’avance. La liste ne se modifie donc pas — mais vous pouvez n’en proposer que certains, pour resserrer la comparaison en séance.',
              'In offline mode, only these models can answer: they are the ones with pre-recorded answers. The list cannot be changed — but you may offer only some of them, to narrow the comparison during the session.',
            )
          : pick(
              lang,
              'La case active le modèle en séance ; la corbeille le retire. Les modèles proposés par défaut sont ceux d’OpenRouter — avec un Ollama local, remplacez-les par les vôtres. Gardez des tailles très différentes : c’est l’écart entre un petit et un gros modèle qui fait la démonstration du TD.',
              'The checkbox enables the model during the session; the bin removes it. The default models are OpenRouter’s — with a local Ollama, replace them with your own. Keep the sizes far apart: it is the gap between a small and a large model that makes the tutorial’s point.',
            )}
      </p>

      {/* ---------- Ce que le fournisseur propose, constaté tout seul ---------- */}
      {!offline && (checking || available !== null || checkFailed) && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
          {checking ? (
            <>
              <Loader2 className="size-3 shrink-0 animate-spin" />
              {pick(lang, 'Vérification auprès du fournisseur…', 'Checking with the provider…')}
            </>
          ) : checkFailed ? (
            <span className="text-amber-600">
              {pick(
                lang,
                'Impossible de lister les modèles du fournisseur : la disponibilité n’a pas pu être vérifiée.',
                'Could not list the provider’s models: availability could not be checked.',
              )}
            </span>
          ) : (
            pick(
              lang,
              `${available?.length ?? 0} modèles disponibles chez le fournisseur.`,
              `${available?.length ?? 0} models available at the provider.`,
            )
          )}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {list.map((m) => {
          const missing = unavailable(m)
          // Un modèle absent ne peut pas être actif, quoi qu'en dise le réglage
          // enregistré : l'affichage doit dire ce qui RÉPONDRA, pas ce qui a
          // été coché avant que le fournisseur ne change.
          const on = !missing && (!chosen || chosen.includes(m.id))
          const box = (
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                missing
                  ? 'border-[var(--color-border)] bg-[var(--color-muted)]'
                  : on
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-[var(--color-border)]',
              )}
            >
              {on && <Check className="size-3" />}
            </span>
          )
          const frame = cn(
            'flex flex-col gap-1.5 rounded-md border p-2.5',
            missing
              ? 'border-dashed border-amber-500/40 bg-amber-500/5'
              : on
                ? 'border-[var(--color-border)]'
                : 'border-dashed border-[var(--color-border)] opacity-60',
          )

          // Hors ligne, la carte ne contient aucun champ à éditer : elle
          // devient donc elle-même la cible de clic. Viser une case de 16 px
          // pour cocher un modèle est inutilement précis quand la ligne
          // entière ne fait rien d'autre.
          if (offline) {
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                aria-pressed={on}
                title={pick(lang, 'Proposer ce modèle en séance', 'Offer this model in class')}
                className={cn(
                  frame,
                  'w-full cursor-pointer text-left transition-colors hover:border-blue-500/60 hover:bg-blue-500/5',
                )}
              >
                <span className="flex items-center gap-2">
                  {box}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {m.displayName}
                  </span>
                </span>
                <span className="pl-6 text-xs text-[var(--color-muted-foreground)]">
                  {m.maker} · {paramsLabel(lang, m.params)}
                </span>
              </button>
            )
          }

          return (
            <div key={m.id} className={frame}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  disabled={missing}
                  title={
                    missing
                      ? pick(
                          lang,
                          'Absent du fournisseur : ce modèle ne peut pas répondre.',
                          'Not offered by the provider: this model cannot answer.',
                        )
                      : pick(lang, 'Proposer ce modèle en séance', 'Offer this model in class')
                  }
                  className={cn(missing ? 'cursor-not-allowed' : 'cursor-pointer')}
                >
                  {box}
                </button>
                <input
                  value={m.displayName}
                  onChange={(e) => patch(m.id, 'displayName', e.target.value)}
                  placeholder={pick(lang, 'Nom affiché', 'Display name')}
                  className={cn(field, 'flex-1 font-medium')}
                />
                {missing && (
                  <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-500">
                    {pick(lang, 'indisponible', 'unavailable')}
                  </span>
                )}
                <button
                  onClick={() => setDoomed(m)}
                  disabled={list.length <= 1}
                  title={pick(lang, 'Retirer de la liste', 'Remove from the list')}
                  className="shrink-0 cursor-pointer rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-6">
                <input
                  value={m.id in modelMap ? modelMap[m.id] : m.slug}
                  onChange={(e) =>
                    m.id in modelMap
                      ? update({ provider: { ...settings.provider, modelMap: { ...modelMap, [m.id]: e.target.value } } })
                      : patch(m.id, 'slug', e.target.value)
                  }
                  placeholder={pick(lang, 'identifiant chez le fournisseur', 'provider model name')}
                  className={cn(field, 'flex-1 font-mono')}
                />
                <input
                  value={m.maker}
                  onChange={(e) => patch(m.id, 'maker', e.target.value)}
                  placeholder={pick(lang, 'éditeur', 'maker')}
                  className={cn(field, 'w-28')}
                />
                <input
                  value={m.params}
                  onChange={(e) => patch(m.id, 'params', e.target.value)}
                  placeholder={pick(lang, 'taille', 'size')}
                  className={cn(field, 'w-32')}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ---------- Ajouter / rétablir ---------- */}
      {/* Hors ligne, rien à ajouter : seuls les modèles capturés répondent. */}
      {!offline && (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          className="h-7 cursor-pointer gap-1.5 text-xs"
        >
          <Plus className="size-3" />
          {pick(lang, 'Ajouter un modèle', 'Add a model')}
        </Button>
        {custom && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => update({ customModels: null, enabledModels: null })}
            className="h-7 cursor-pointer gap-1.5 text-xs"
            title={pick(
              lang,
              'Revenir aux modèles d\u2019origine du TD',
              'Return to the tutorial\u2019s original models',
            )}
          >
            <RotateCcw className="size-3" />
            {pick(
              lang,
              `Rétablir les ${SANDBOX_MODELS.length} d\u2019origine`,
              `Restore the original ${SANDBOX_MODELS.length}`,
            )}
          </Button>
        )}
      </div>
      )}

      <AddModelDialog
        lang={lang}
        open={adding}
        onClose={() => setAdding(false)}
        taken={list.map((m) => m.id)}
        existingSlugs={list.map((m) => m.slug)}
        onAdd={(m) => writeList([...list, m])}
      />

      {/* Suppression : une confirmation, parce qu'un modèle retiré emporte
          sa place dans les comparaisons déjà faites. */}
      <Dialog open={!!doomed} onOpenChange={(o) => !o && setDoomed(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {pick(lang, 'Retirer ce modèle ?', 'Remove this model?')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {pick(
                lang,
                `« ${doomed?.displayName ?? ''} » ne sera plus proposé aux étudiants. Les réponses déjà obtenues restent dans l\u2019historique.`,
                `“${doomed?.displayName ?? ''}” will no longer be offered to students. Answers already obtained stay in the history.`,
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="cursor-pointer">
                {pick(lang, 'Annuler', 'Cancel')}
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                variant="destructive"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => doomed && remove(doomed.id)}
              >
                <Trash2 className="size-3.5" />
                {pick(lang, 'Retirer', 'Remove')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Ajouter un modèle ----------

/**
 * Deux façons d'ajouter, parce que les deux se présentent en vrai :
 *
 *   - la LISTE de ce que le serveur propose réellement, cherchable. C'est le
 *     cas d'un Ollama local, dont on ne connaît pas les tags par cœur ;
 *   - la SAISIE directe d'un identifiant, quand la découverte échoue (CORS,
 *     serveur qui n'expose pas sa liste) ou qu'on sait déjà quoi taper.
 *
 * Le nom affiché se déduit de l'identifiant si on ne le remplit pas : personne
 * n'a envie de saisir deux fois « llama3.1:8b ».
 */
function AddModelDialog({
  lang,
  open,
  onClose,
  taken,
  existingSlugs,
  onAdd,
}: {
  lang: Lang
  open: boolean
  onClose: () => void
  taken: string[]
  existingSlugs: string[]
  onAdd: (m: SandboxModel) => void
}) {
  const [settings] = useSettings()
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<string[] | null>(null)
  const [probing, setProbing] = useState(false)
  const [probeError, setProbeError] = useState<string | null>(null)
  const [draft, setDraft] = useState({ displayName: '', slug: '', maker: '', params: '' })

  async function probe() {
    setProbing(true)
    setProbeError(null)
    try {
      const list = await discoverModels(settings.provider.baseUrl, settings.provider.apiKey)
      if (!list) {
        setProbeError(
          pick(
            lang,
            'Impossible de lister les modèles de ce fournisseur. Saisissez l\u2019identifiant à la main.',
            'Could not list this provider\u2019s models. Enter the identifier by hand.',
          ),
        )
        setFound([])
        return
      }
      setFound(list.map((m) => m.name))
    } finally {
      setProbing(false)
    }
  }

  function commit(slug: string, displayName?: string, maker = '', params = '') {
    // Ce que l'identifiant laisse deviner comble les champs laiss\u00e9s vides \u2014
    // jamais ceux que le formateur a remplis lui-m\u00eame.
    const guess = inferModelFields(slug)
    const name = (displayName ?? '').trim() || guess.displayName || slug
    onAdd({
      id: idFrom(name, taken),
      slug,
      displayName: name,
      maker: maker.trim() || guess.maker || '\u2014',
      params: params.trim() || guess.params || '?',
      sizeRatio: 0.5,
      matchHints: [],
      hint: { fr: '', en: '' },
    })
    setDraft({ displayName: '', slug: '', maker: '', params: '' })
    setQuery('')
    onClose()
  }

  const visible = (found ?? [])
    .filter((n) => !existingSlugs.includes(n))
    .filter((n) => n.toLowerCase().includes(query.trim().toLowerCase()))

  /**
   * On n'affiche qu'une tranche : OpenRouter en propose plus de 400, et les
   * dérouler toutes donne un mur illisible autant qu'un DOM inutilement lourd.
   * La recherche est le vrai outil de sélection ; la liste ne sert qu'à voir
   * ce qui existe.
   */
  const shown = visible.slice(0, 40)

  const field =
    'min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-blue-500'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {pick(lang, 'Ajouter un modèle', 'Add a model')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {pick(
              lang,
              'Choisissez dans ce que propose votre fournisseur, ou saisissez l\u2019identifiant directement.',
              'Pick from what your provider offers, or enter the identifier directly.',
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ---------- Depuis la liste du fournisseur ---------- */}
        <div className="flex flex-col gap-2">
          {/* `div` et non `span` : un span reste en ligne, `flex-1` ne
              s'y applique pas, et le champ débordait par-dessus l'icône. */}
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={pick(lang, 'Chercher un modèle…', 'Search a model…')}
                className={cn(field, 'w-full pl-8')}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void probe()}
              disabled={probing}
              className="h-8 shrink-0 cursor-pointer gap-1.5 text-xs"
            >
              {probing ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
              {pick(lang, 'Détecter', 'Detect')}
            </Button>
          </div>

          {probeError && <p className="text-xs text-red-600">{probeError}</p>}

          {found !== null && visible.length > 0 && (
            <>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {shown.length < visible.length
                  ? pick(
                      lang,
                      `${visible.length} modèles — affinez la recherche pour voir les autres.`,
                      `${visible.length} models — refine the search to see the rest.`,
                    )
                  : pick(
                      lang,
                      `${visible.length} modèle${visible.length > 1 ? 's' : ''}.`,
                      `${visible.length} model${visible.length > 1 ? 's' : ''}.`,
                    )}
              </p>
              {/* Séparateurs entre les lignes : chez OpenRouter la liste
                  dépasse 400 entrées aux noms très proches
                  (« …-flash », « …-flash:batch »), et sans trait elles se
                  lisaient comme un seul bloc. */}
              <div className="max-h-64 divide-y divide-[var(--color-border)] overflow-y-auto rounded-md border border-[var(--color-border)]">
                {shown.map((name) => (
                  <button
                    key={name}
                    onClick={() => commit(name)}
                    className="block w-full cursor-pointer truncate px-2.5 py-2 text-left font-mono text-xs transition-colors hover:bg-[var(--color-accent)]"
                    title={name}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
          {found !== null && !probeError && visible.length === 0 && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {query.trim()
                ? pick(lang, 'Aucun modèle ne correspond.', 'No model matches.')
                : pick(lang, 'Aucun modèle à ajouter.', 'No model left to add.')}
            </p>
          )}
        </div>

        {/* ---------- Ou à la main ---------- */}
        <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {pick(lang, 'Ou saisir directement', 'Or enter directly')}
          </span>
          <input
            value={draft.slug}
            onChange={(e) => {
              const slug = e.target.value
              // On pré-remplit à la frappe, mais uniquement ce qui n'a pas
              // encore été touché : écraser une correction manuelle à chaque
              // caractère rendrait les champs impossibles à corriger.
              const guess = inferModelFields(slug)
              setDraft((d) => ({
                slug,
                displayName: d.displayName && d.displayName !== inferModelFields(d.slug).displayName
                  ? d.displayName
                  : guess.displayName,
                maker: d.maker && d.maker !== inferModelFields(d.slug).maker ? d.maker : guess.maker,
                params: d.params && d.params !== inferModelFields(d.slug).params ? d.params : guess.params,
              }))
            }}
            placeholder={pick(
              lang,
              'identifiant du modèle (ex. qwen/qwen3-27b)',
              'model identifier (e.g. qwen/qwen3-27b)',
            )}
            className={cn(field, 'w-full font-mono')}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              placeholder={pick(lang, 'nom affiché (facultatif)', 'display name (optional)')}
              className={cn(field, 'flex-1')}
            />
            <input
              value={draft.maker}
              onChange={(e) => setDraft({ ...draft, maker: e.target.value })}
              placeholder={pick(lang, 'éditeur', 'maker')}
              className={cn(field, 'w-28')}
            />
            <input
              value={draft.params}
              onChange={(e) => setDraft({ ...draft, params: e.target.value })}
              placeholder={pick(lang, '8 milliards', '8 billion')}
              className={cn(field, 'w-32')}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="cursor-pointer">
              {pick(lang, 'Annuler', 'Cancel')}
            </Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={!draft.slug.trim()}
            onClick={() => commit(draft.slug.trim(), draft.displayName, draft.maker, draft.params)}
            className="cursor-pointer"
          >
            {pick(lang, 'Ajouter', 'Add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Le formulaire de connexion : quel fournisseur, quelle URL, quelle clef.
//
// Un seul formulaire pour les quatre préréglages : ils ne diffèrent que par
// leurs valeurs de départ, pas par leur forme. Choisir un préréglage
// PRÉ-REMPLIT les champs, il ne les verrouille pas — un proxy d'établissement
// se règle en partant d'« OpenAI compatible » et en corrigeant l'URL.
//
// Trois obstacles tuent silencieusement un appel depuis un navigateur, et
// tous les trois se disent ICI plutôt que sous forme d'un « injoignable »
// après coup : le contenu mixte, la clef manquante, et les noms de modèles
// qui ne se transposent pas d'un fournisseur à l'autre.
// ============================================================

import { useState } from 'react'
import { AlertTriangle, Check, Eye, EyeOff, Loader2, Plug, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/useLang'
import { pick } from '@/lib/useLang'
import { tr } from './data'
import {
  PROVIDER_PRESETS,
  checkKey,
  discoverModels,
  mixedContent,
  presetOf,
  type ProviderId,
} from './providers'
import { CLIENT_ONLY, DEFAULT_API_URL, useSettings } from './settings'

export function ProviderSettings({ lang }: { lang: Lang }) {
  const [settings, update] = useSettings()
  const provider = settings.provider
  const preset = presetOf(provider.id)

  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  /**
   * Un vrai aller-retour vers le fournisseur, plutôt qu'une validation de
   * l'URL. Trois pannes se ressemblent depuis le navigateur — serveur éteint,
   * CORS refusé, clef invalide — et seule une tentative les sépare.
   *
   * On interroge la LISTE des modèles : c'est la requête la moins chère (rien
   * n'est généré, rien n'est facturé) et elle traverse néanmoins tout ce qu'on
   * veut vérifier — réseau, CORS, autorisation.
   */
  async function test() {
    setTesting(true)
    setResult(null)
    try {
      if (mixedContent(provider.baseUrl)) {
        setResult({
          ok: false,
          message: pick(
            lang,
            'Bloqué par le navigateur : page en https, serveur en http.',
            'Blocked by the browser: https page, http server.',
          ),
        })
        return
      }
      if (preset.needsKey && !provider.apiKey.trim()) {
        setResult({
          ok: false,
          message: pick(lang, 'Clef manquante.', 'Missing key.'),
        })
        return
      }
      // La clef d'abord : lister les modèles réussit chez OpenRouter même avec
      // une clef fausse, et annoncer « connexion établie » serait alors un
      // mensonge que le premier envoi démentirait.
      if (await checkKey(provider.baseUrl, provider.apiKey) === false) {
        setResult({
          ok: false,
          message: pick(lang, 'Clef refusée par le fournisseur.', 'Key rejected by the provider.'),
        })
        return
      }

      const found = await discoverModels(provider.baseUrl, provider.apiKey)
      setResult(
        found
          ? {
              ok: true,
              message: pick(
                lang,
                `Connexion établie — ${found.length} modèles disponibles.`,
                `Connected — ${found.length} models available.`,
              ),
            }
          : {
              ok: false,
              message: pick(
                lang,
                'Aucune réponse. Vérifiez l’URL, la clef, et que le serveur autorise ce site (CORS).',
                'No response. Check the URL, the key, and that the server allows this site (CORS).',
              ),
            },
      )
    } finally {
      setTesting(false)
    }
  }

  const blocked = mixedContent(provider.baseUrl)
  const keyMissing = preset.needsKey && !provider.apiKey.trim()

  function choose(id: ProviderId) {
    const p = presetOf(id)
    update({
      provider: {
        id,
        // Le backend du TD garde l'URL déjà connue ; les autres partent de
        // leur valeur usuelle.
        baseUrl: id === 'td-backend' ? DEFAULT_API_URL : p.baseUrl,
        apiKey: '',
        modelMap: { ...p.modelMap },
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ---------- Le fournisseur ---------- */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {pick(lang, 'Fournisseur', 'Provider')}
        </span>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {/* Le backend du TD n'existe pas dans un build client : le proposer
              mènerait à une URL qui ne répond jamais. */}
          {PROVIDER_PRESETS.filter((p) => !(CLIENT_ONLY && p.id === 'td-backend')).map((p) => (
            <button
              key={p.id}
              onClick={() => choose(p.id)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors',
                p.id === provider.id
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-accent)]',
              )}
            >
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border',
                  p.id === provider.id
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-[var(--color-border)]',
                )}
              >
                {p.id === provider.id && <Check className="size-2.5" />}
              </span>
              <span className="min-w-0 truncate">{tr(lang, p.label)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          {tr(lang, preset.help)}
        </p>
      </div>

      {/* ---------- URL ---------- */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {pick(lang, 'URL de l’API', 'API URL')}
        </span>
        <input
          type="text"
          value={provider.baseUrl}
          placeholder={preset.baseUrl || DEFAULT_API_URL}
          onChange={(e) => update({ provider: { ...provider, baseUrl: e.target.value } })}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        />
        {blocked && (
          <p className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-2.5 py-2 text-xs leading-relaxed text-red-600">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {pick(
                lang,
                'Cette page est servie en https et cette adresse est en http : le navigateur bloquera l’appel avant même de l’envoyer, et aucun réglage du serveur n’y changera rien. Servez le TD en http, ou donnez un certificat à ce serveur. (« localhost » fait exception.)',
                'This page is served over https and this address is http: the browser will block the call before even sending it, and no server setting can change that. Serve the tutorial over http, or give this server a certificate. (“localhost” is an exception.)',
              )}
            </span>
          </p>
        )}
      </div>

      {/* ---------- Clef ---------- */}
      {provider.id !== 'td-backend' && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {pick(lang, 'Clef API', 'API key')}
            {!preset.needsKey && (
              <span className="ml-1 opacity-70">{pick(lang, '(facultative)', '(optional)')}</span>
            )}
          </span>
          {/* L'œil est DANS le champ : c'est une commande du champ, pas une
              action voisine — et le champ garde toute la largeur. */}
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={provider.apiKey}
              autoComplete="off"
              spellCheck={false}
              placeholder={preset.needsKey ? 'sk-…' : pick(lang, 'aucune', 'none')}
              onChange={(e) => update({ provider: { ...provider, apiKey: e.target.value } })}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] py-1.5 pr-9 pl-2 font-mono text-sm outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer rounded p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
              title={pick(lang, 'Afficher / masquer', 'Show / hide')}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {keyMissing && (
            <p className="text-xs text-red-600">
              {pick(
                lang,
                'Ce fournisseur exige une clef : sans elle, aucun appel ne partira.',
                'This provider requires a key: without it, no call will be made.',
              )}
            </p>
          )}

          {/* L'avertissement dit le risque EXACT. « N'importe quel site peut la
              voler » serait faux — le stockage est cloisonné par origine — et
              ce TD enseigne précisément la précision sur le trajet des données. */}
          {provider.apiKey.trim() !== '' && (
            <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-2.5 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-500">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {pick(
                  lang,
                  'Cette clef est enregistrée en clair dans CE navigateur. Aucun autre site ne peut la lire, mais toute personne utilisant ce poste le peut. Utilisez votre propre clef — ne distribuez jamais une clef commune à un groupe, elle resterait entre toutes les mains.',
                  'This key is stored in plain text in THIS browser. No other website can read it, but anyone using this machine can. Use your own key — never hand a single shared key to a group, they would all keep it.',
                )}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ---------- Essai de connexion ---------- */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void test()}
          disabled={testing || !provider.baseUrl.trim()}
          className="h-7 cursor-pointer gap-1.5 text-xs"
        >
          {testing ? <Loader2 className="size-3 animate-spin" /> : <Plug className="size-3" />}
          {pick(lang, 'Tester la connexion', 'Test the connection')}
        </Button>
        {result && (
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs',
              result.ok ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {result.ok ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            {result.message}
          </span>
        )}
      </div>

      {/* La correspondance des modèles vivait ici : elle est passée dans
          l'onglet « Modèles », qui sait aussi en ajouter et en retirer. Deux
          écrans pour la même chose se contredisaient — celui-ci imposait
          quatre lignes figées, l'autre laisse composer la liste. */}
    </div>
  )
}

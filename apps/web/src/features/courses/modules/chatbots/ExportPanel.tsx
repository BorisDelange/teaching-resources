// ============================================================
// Le partage facultatif de la séance, en fin de bilan.
//
// L'étudiant, seul ou en binôme, choisit : accepter (le fichier JSON est
// téléchargé) ou refuser (rien ne part). Le « vous » sert les deux cas. Dans les deux cas, on propose ensuite d'effacer le poste
// pour le groupe suivant.
// ============================================================

import { useState } from 'react'
import { Download, Eraser, Eye, EyeOff, FileJson, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pick, type Lang } from '@/lib/useLang'
import { Block } from './debrief-ui'
import {
  buildExport,
  clearStationAndRestart,
  downloadExport,
  exportFileName,
  recordDecision,
  useExportDecision,
} from './export'

export function ExportPanel({ lang }: { lang: Lang }) {
  const decision = useExportDecision()
  const [preview, setPreview] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const payload = buildExport(lang)

  function accept() {
    downloadExport(payload)
    recordDecision('accepted')
  }

  return (
    <Block
      tone="blue"
      title={pick(
        lang,
        'Partager votre séance pour améliorer le TD (facultatif)',
        'Share your session to improve the tutorial (optional)',
      )}
      icon={FileJson}
    >
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        <p>
          {pick(
            lang,
            <>
              Pour évaluer ce TD et mener une recherche en pédagogie médicale, nous vous proposons de
              transmettre le contenu de votre séance : vos questions aux modèles et leurs réponses,
              vos jugements, votre consommation de tokens et vos auto-évaluations du début et de la
              fin.
            </>,
            <>
              To evaluate this tutorial and conduct medical-education research, we invite you to
              share the content of your session: your questions to the models and their answers,
              your judgements, your token usage and your self-assessments from the start and the
              end.
            </>,
          )}
        </p>
        <p>
          {pick(
            lang,
            <>
              <strong>Aucune information personnelle</strong> n’est incluse : ni nom, ni adresse
              e-mail, ni identifiant. Le fichier porte seulement un code tiré au hasard. Refuser
              n’a <strong>aucune conséquence</strong>. Si vous travaillez en binôme, la décision
              revient aux deux : si l’un de vous n’est pas d’accord, refusez.
            </>,
            <>
              <strong>No personal information</strong> is included: no name, no e-mail address, no
              account identifier. The file only carries a random code. Declining has{' '}
              <strong>no consequence</strong>. If you work in pairs, the decision belongs to both of
              you: if either of you disagrees, decline.
            </>,
          )}
        </p>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreview((v) => !v)}
            className="-ml-2 cursor-pointer gap-1.5"
          >
            {preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {preview
              ? pick(lang, 'Masquer le contenu', 'Hide the content')
              : pick(lang, 'Voir exactement ce qui serait transmis', 'See exactly what would be shared')}
          </Button>
          {preview && (
            <pre className="mt-2 max-h-80 overflow-auto rounded-md border bg-[var(--color-background)] p-3 text-xs">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>

        {!decision && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={accept} className="cursor-pointer gap-1.5">
              <Download className="size-4" />
              {pick(lang, 'Accepter et télécharger le fichier', 'Agree and download the file')}
            </Button>
            <Button
              variant="outline"
              onClick={() => recordDecision('refused')}
              className="cursor-pointer gap-1.5"
            >
              <X className="size-4" />
              {pick(lang, 'Refuser', 'Decline')}
            </Button>
          </div>
        )}

        {decision?.choice === 'accepted' && (
          <div className="flex flex-col gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
            <p className="text-emerald-700 dark:text-emerald-400">
              {pick(
                lang,
                <>
                  Merci ! Fichier téléchargé : <strong>{exportFileName(payload)}</strong>. Remettez-le
                  selon les consignes de votre enseignant.
                </>,
                <>
                  Thank you! File downloaded: <strong>{exportFileName(payload)}</strong>. Hand it in
                  as instructed by your teacher.
                </>,
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadExport(buildExport(lang))}
              className="-ml-2 w-fit cursor-pointer gap-1.5"
            >
              <Download className="size-4" />
              {pick(lang, 'Télécharger à nouveau', 'Download again')}
            </Button>
          </div>
        )}

        {decision?.choice === 'refused' && (
          <p className="rounded-md border px-3 py-2">
            {pick(
              lang,
              'C’est noté : rien ne sera transmis.',
              'Noted: nothing will be shared.',
            )}
          </p>
        )}

        {decision && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <p className="flex-1">
              {pick(
                lang,
                'En partant, effacez vos échanges de ce poste : le groupe suivant repartira d’une page vierge.',
                'Before leaving, erase your exchanges from this computer: the next group will start from a blank page.',
              )}
            </p>
            {confirmClear ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearStationAndRestart}
                  className="cursor-pointer gap-1.5"
                >
                  <Eraser className="size-4" />
                  {pick(lang, 'Confirmer l’effacement', 'Confirm erasing')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                  className="cursor-pointer"
                >
                  {pick(lang, 'Annuler', 'Cancel')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClear(true)}
                className="cursor-pointer gap-1.5"
              >
                <Eraser className="size-4" />
                {pick(lang, 'Effacer ce poste', 'Erase this computer')}
              </Button>
            )}
          </div>
        )}
      </div>
    </Block>
  )
}

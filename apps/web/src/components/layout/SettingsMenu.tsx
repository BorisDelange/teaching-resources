// ============================================================
// Menu de réglages du header (icône engrenage).
//
// Ne contient que la suppression des données locales. Les réglages
// formateur (URL du backend, mode démo) vivent dans l'étape
// « Introduction » du TD chatbots, au plus près de leur usage.
// ============================================================

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cog, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Préfixes des clés localStorage propres aux TD. On préserve volontairement
// « app-preferences » (thème / langue).
const TD_PREFIXES = ['td-']

function clearLocalData() {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && TD_PREFIXES.some((p) => key.startsWith(p))) toRemove.push(key)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // Ignore : environnement sans localStorage.
  }
}

export function SettingsMenu() {
  const { t } = useTranslation()
  const [resetOpen, setResetOpen] = useState(false)

  function handleConfirm() {
    clearLocalData()
    setResetOpen(false)
    toast.success(t('localData.done'))
    // Recharge pour que les composants (votes, réglages) repartent d'un état propre.
    window.location.reload()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto cursor-pointer p-2"
            aria-label={t('settingsMenu.open')}
            title={t('settingsMenu.open')}
          >
            <Cog className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-60">
          <DropdownMenuItem
            className="cursor-pointer gap-2 whitespace-nowrap text-red-600 focus:bg-red-500/10 focus:text-red-600"
            onSelect={() => setResetOpen(true)}
          >
            <Trash2 className="size-4 text-red-600" />
            {t('localData.open')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('localData.title')}</DialogTitle>
            <DialogDescription>{t('localData.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setResetOpen(false)}>
              {t('localData.cancel')}
            </Button>
            <Button
              className="cursor-pointer bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirm}
            >
              {t('localData.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

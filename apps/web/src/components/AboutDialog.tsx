import { useTranslation } from 'react-i18next'
import { Info, AtSign, GitBranch, GraduationCap, Scale, ExternalLink, Link2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const REPO_URL = 'https://framagit.org/BorisDel/teaching-resources'
const EDSAN_URL = 'https://www.univ-rennes.fr/edsan-education-en-sante-numerique'
const CONTENT_LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr'
const CODE_LICENSE_URL = 'https://opensource.org/licenses/MIT'

function LinkRow({ icon: Icon, href, label, hint }: {
  icon: typeof Info
  href: string
  label: string
  hint: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-[var(--color-muted)]"
    >
      <Icon size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {label}
          <ExternalLink size={12} className="shrink-0 text-[var(--color-muted-foreground)]" />
        </span>
        <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">{hint}</span>
      </span>
    </a>
  )
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info size={18} className="text-[var(--color-foreground)]" />
            {t('about.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="contact" className="h-72">
          <TabsList className="w-full shrink-0 justify-center">
            <TabsTrigger value="contact" className="gap-1.5">
              <AtSign size={14} />
              {t('contact.title')}
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5">
              <Link2 size={14} />
              {t('about.links')}
            </TabsTrigger>
            <TabsTrigger value="license" className="gap-1.5">
              <Scale size={14} />
              {t('about.license')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="mt-4 min-h-0 space-y-3 overflow-y-auto">
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {t('contact.intro')}
            </p>
            <div className="rounded-lg border bg-[var(--color-muted)] p-4 text-sm">
              <p className="font-semibold">{t('contact.name')}</p>
              <p className="text-[var(--color-muted-foreground)]">{t('contact.role')}</p>
              <a
                href={`mailto:${t('contact.email')}`}
                className="mt-3 inline-flex items-center gap-2 text-blue-600 hover:underline"
              >
                <AtSign size={14} />
                {t('contact.email')}
              </a>
            </div>
          </TabsContent>

          <TabsContent value="links" className="mt-4 min-h-0 space-y-2 overflow-y-auto">
            <LinkRow
              icon={GitBranch}
              href={REPO_URL}
              label={t('about.repo')}
              hint={t('about.repoHint')}
            />
            <LinkRow
              icon={GraduationCap}
              href={EDSAN_URL}
              label={t('about.edsan')}
              hint={t('about.edsanHint')}
            />
          </TabsContent>

          <TabsContent value="license" className="mt-4 min-h-0 space-y-3 overflow-y-auto">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-muted-foreground)] marker:text-[var(--color-muted-foreground)]">
              <li>
                {t('about.licenseContent')}{' '}
                <a
                  href={CONTENT_LICENSE_URL}
                  target="_blank"
                  rel="noreferrer license"
                  className="font-medium text-blue-600 hover:underline"
                >
                  CC BY-SA 4.0
                </a>
                .
              </li>
              <li>
                {t('about.licenseSource')}{' '}
                <a
                  href={CODE_LICENSE_URL}
                  target="_blank"
                  rel="noreferrer license"
                  className="font-medium text-blue-600 hover:underline"
                >
                  MIT
                </a>
                .
              </li>
            </ul>
            <p className="text-justify text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              {t('about.licenseThirdParty')}
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

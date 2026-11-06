import { GraduationCap, Linkedin } from 'lucide-react'
import { useLang } from '@/lib/useLang'

const LINKEDIN = 'https://www.linkedin.com/in/boris-delange'
const RESEARCHGATE = 'https://www.researchgate.net/profile/Boris-Delange-2'

/** Bio reprise de linkr-website pour que les deux sites disent la même chose. */
const BIO = {
  fr: {
    role: 'Médecin réanimateur · AHU en informatique médicale',
    body: (
      <>
        Médecin en <strong>médecine intensive - réanimation</strong> de formation, j'exerce depuis
        2023 comme <strong>assistant hospitalo-universitaire en informatique médicale</strong> au
        Centre de données cliniques (CDC) du CHU de Rennes. Je suis également chercheur au LTSI
        (Université de Rennes), dans l'équipe DOMASIA.
      </>
    ),
  },
  en: {
    role: 'Intensive-care physician · academic lecturer in medical informatics',
    body: (
      <>
        Trained in <strong>intensive care medicine</strong>, I have worked since 2023 as an{' '}
        <strong>academic lecturer in medical informatics</strong> at the Clinical Data Centre (CDC)
        of Rennes University Hospital. I am also a researcher at LTSI (University of Rennes), in the
        DOMASIA team.
      </>
    ),
  },
}

export function AuthorCard() {
  const lang = useLang()
  const bio = BIO[lang]

  return (
    <section className="mt-10 rounded-xl border bg-[var(--color-muted)]/30 p-6">
      <p className="mb-4 text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
        {lang === 'en' ? 'About the author' : "À propos de l'auteur"}
      </p>
      <p className="text-lg font-bold text-[var(--color-foreground)]">Boris Delange</p>
      <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{bio.role}</p>
      <p className="mt-3 text-justify text-sm leading-relaxed text-[var(--color-foreground)]/90">
        {bio.body}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <a
          href={LINKEDIN}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#0077B5] transition-opacity hover:opacity-80"
        >
          <Linkedin size={16} />
          LinkedIn
        </a>
        <a
          href={RESEARCHGATE}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#00A693] transition-opacity hover:opacity-80"
        >
          <GraduationCap size={16} />
          ResearchGate
        </a>
      </div>
    </section>
  )
}

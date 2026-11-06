import { useTranslation } from 'react-i18next'

export type Lang = 'fr' | 'en'

/**
 * Language of the module *content* (French domain material, translated to English).
 * Follows the global language toggle; anything other than English falls back to French.
 */
export function useLang(): Lang {
  const { i18n } = useTranslation()
  return i18n.language?.startsWith('en') ? 'en' : 'fr'
}

/** Pick the value matching the current language. */
export function pick<T>(lang: Lang, fr: T, en: T): T {
  return lang === 'en' ? en : fr
}

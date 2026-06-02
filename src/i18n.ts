import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

export const supportedLanguages = ['pt-BR', 'en', 'es'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

function normalizeDetectedLanguage(language: string) {
  const normalizedLanguage = language.toLowerCase()

  if (normalizedLanguage.startsWith('pt')) {
    return 'pt-BR'
  }

  if (normalizedLanguage.startsWith('en')) {
    return 'en'
  }

  if (normalizedLanguage.startsWith('es')) {
    return 'es'
  }

  return language
}

void i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: normalizeDetectedLanguage,
    },
    fallbackLng: 'pt-BR',
    supportedLngs: supportedLanguages,
    load: 'currentOnly',
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
    returnEmptyString: false,
  })

export function translateImmediate(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options)
}

export default i18n

import { ChevronDown, Globe2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { supportedLanguages, type SupportedLanguage } from '../../i18n'

const languageLabels: Record<SupportedLanguage, string> = {
  'pt-BR': 'PT',
  en: 'EN',
  es: 'ES',
}

const languageFlags: Record<SupportedLanguage, string> = {
  'pt-BR': '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸',
}

function resolveActiveLanguage(language: string | undefined) {
  if (!language) {
    return 'pt-BR'
  }

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

  return 'pt-BR'
}

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const activeLanguage = resolveActiveLanguage(i18n.resolvedLanguage ?? i18n.language)

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node | null)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleChangeLanguage(language: SupportedLanguage) {
    setIsOpen(false)

    if (language === activeLanguage) {
      return
    }

    void i18n.changeLanguage(language)
  }

  return (
    <div ref={rootRef} className="relative block">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="flex h-10 min-w-[44px] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.06] hover:text-white sm:h-11 sm:px-3"
        aria-label={t('language.selectLabel')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none" aria-hidden="true">
          {languageFlags[activeLanguage]}
        </span>
        <Globe2 className="hidden h-4 w-4 text-cyan-100/80 sm:block" aria-hidden="true" />
        <span className="hidden sm:inline">{languageLabels[activeLanguage]}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-zinc-400 sm:block" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t('language.selectLabel')}
          className="fixed left-3 right-3 top-[88px] z-[70] overflow-hidden rounded-[22px] border border-white/10 bg-zinc-950/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:absolute sm:right-0 sm:left-auto sm:top-[calc(100%+0.5rem)] sm:min-w-[220px] sm:p-2"
        >
          <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            {t('language.selectLabel')}
          </div>

          <div className="space-y-1">
            {supportedLanguages.map((language) => {
              const isActive = language === activeLanguage

              return (
                <button
                  key={language}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => handleChangeLanguage(language)}
                  className={`flex w-full items-center justify-between rounded-[16px] px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-200 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base leading-none" aria-hidden="true">
                      {languageFlags[language]}
                    </span>
                    <span>{t(`language.names.${language}`)}</span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    {languageLabels[language]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

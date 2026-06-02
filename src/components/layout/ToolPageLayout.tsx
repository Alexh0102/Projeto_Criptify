import { Crown, Grid2x2, MoonStar, SunMedium, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { toolDefinitions } from '../../config/tools'
import { useTheme } from '../../context/theme'
import BrandLogo from '../ui/BrandLogo'
import InstallAppButton from '../ui/InstallAppButton'
import LanguageSwitcher from './LanguageSwitcher'

type Props = {
  children: ReactNode
  showToolsDock?: boolean
}

export default function ToolPageLayout({ children, showToolsDock = false }: Props) {
  const { t } = useTranslation()
  const { theme, toggleTheme, shellStyle } = useTheme()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (!isDrawerOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDrawerOpen])

  return (
    <div className="app-shell relative min-h-screen overflow-hidden" style={shellStyle}>
      <div className="pointer-events-none absolute inset-0 bg-grid-fade bg-[size:34px_34px] opacity-15 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9),transparent)]" />
      <div className="cv-shell-orb cv-shell-orb-left pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className="cv-shell-orb cv-shell-orb-right pointer-events-none absolute right-0 top-8 h-80 w-80 rounded-full bg-amber-300/12 blur-3xl" />
      <div className="cv-shell-orb cv-shell-orb-bottom pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7">
        <header className="cv-shell-header panel-surface sticky top-3 z-40 rounded-[26px] px-4 py-3 sm:px-5">
          <div className="cv-shell-header-inner flex items-center justify-between gap-3">
            <Link
              to="/"
              className="cv-shell-header-brand block min-w-0 flex-1 transition hover:opacity-95"
              aria-label={t('layout.header.homeAria')}
            >
              <BrandLogo variant="header" showTagline />
            </Link>

            <div className="cv-shell-header-actions flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="cv-tools-trigger hidden md:flex btn-secondary justify-center px-3 sm:w-auto"
                aria-label={t('layout.header.openToolsAria')}
              >
                <Grid2x2 className="h-4 w-4" />
                {t('layout.header.tools')}
              </button>

              <Link
                to="/apoiar"
                className="hidden btn-secondary justify-center px-3 sm:inline-flex"
                aria-label={t('layout.header.supportAria')}
              >
                <Crown className="h-4 w-4" />
                {t('layout.header.support')}
              </Link>

              <LanguageSwitcher />

              <div className="cv-header-install min-w-0">
                <InstallAppButton />
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="cv-header-theme btn-secondary h-11 w-11 shrink-0 justify-center rounded-full px-0 py-0 sm:h-auto sm:w-auto sm:rounded-[999px] sm:px-4 sm:py-3"
                aria-label={
                  theme === 'dark'
                    ? t('layout.header.enableLightTheme')
                    : t('layout.header.enableDarkTheme')
                }
              >
                {theme === 'dark' ? (
                  <>
                    <SunMedium className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('layout.header.theme')}</span>
                  </>
                ) : (
                  <>
                    <MoonStar className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('layout.header.theme')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className={`cv-shell-main flex-1 py-4 sm:py-7 ${showToolsDock ? 'pb-28 sm:pb-7' : ''}`}>{children}</main>

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('layout.footer.summary')}</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-500">
            {t('layout.footer.meta')}
          </p>
        </footer>
      </div>

      {showToolsDock && !isDrawerOpen ? (
        <div className="cv-tools-dock fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="cv-tools-dock-button btn-primary w-full max-w-[360px] justify-center"
            aria-label={t('layout.header.openToolsAria')}
          >
            <Grid2x2 className="h-4 w-4" />
            {t('layout.header.tools')}
          </button>
        </div>
      ) : null}

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={t('layout.drawer.closeToolsAria')}
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] border border-white/10 bg-zinc-950/95 p-4 backdrop-blur-xl sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[420px] sm:rounded-[32px] sm:p-5">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/80">
                  {t('layout.drawer.title')}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                  {t('layout.drawer.description')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="btn-secondary h-10 w-10 shrink-0 rounded-full px-0 py-0 sm:h-11 sm:w-11"
                aria-label={t('layout.drawer.closeDrawerAria')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:mt-5 sm:gap-3">
              <NavLink
                to="/"
                onClick={() => setIsDrawerOpen(false)}
                className={({ isActive }) =>
                  `${isActive ? 'surface-primary' : 'surface-secondary'} rounded-[24px] px-3 py-3 sm:px-4 sm:py-4 text-left transition`
                }
              >
                <p className="text-sm font-medium text-white">{t('layout.drawer.home')}</p>
                <p className="mt-0.5 text-xs sm:text-sm text-zinc-400">
                  {t('layout.drawer.homeHelper')}
                </p>
              </NavLink>

              {toolDefinitions.map((tool) => (
                <NavLink
                  key={tool.path}
                  to={tool.path}
                  onClick={() => setIsDrawerOpen(false)}
                  className={({ isActive }) =>
                    `${isActive ? 'surface-primary' : 'surface-secondary'} rounded-[24px] px-3 py-3 sm:px-4 sm:py-4 text-left transition`
                  }
                >
                  <p className="text-sm font-medium text-white">
                    {t(`tools.${tool.id}.title`)}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm text-zinc-400">
                    {t(`tools.${tool.id}.helper`)}
                  </p>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

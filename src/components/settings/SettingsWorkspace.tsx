import { AlertTriangle, CheckCircle2, Globe2, MoonStar, RotateCcw, SunMedium } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { supportedLanguages, type SupportedLanguage } from '../../i18n'
import { usePremium } from '../../context/premium'
import { useTheme } from '../../context/theme'
import { isNativeApp } from '../../lib/platform'
import {
  clearPreferences,
  getPreferences,
  getPreferencesSync,
  updatePreferences,
  type UserPreferences,
} from '../../lib/storage/preferences-storage'
import ToolPageLayout from '../layout/ToolPageLayout'
import ToolHeroCompact from '../ui/ToolHeroCompact'
import CryptoPreferencesCard from './CryptoPreferencesCard'
import LocalStatsCard from './LocalStatsCard'
import ProfileCard from './ProfileCard'

type ModalKind = 'reset' | null

export default function SettingsWorkspace() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { isPremium, openLicenseActivation } = usePremium()
  const [preferences, setPreferences] = useState<UserPreferences | null>(() =>
    isNativeApp() ? null : getPreferencesSync(),
  )
  const [profileDraft, setProfileDraft] = useState<UserPreferences['profile']>(() =>
    preferences?.profile ?? { nickname: '', email: '', avatarId: 'shield-cyan' },
  )
  const [saved, setSaved] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)

  useEffect(() => {
    let active = true

    void getPreferences().then((loadedPreferences) => {
      if (!active) {
        return
      }

      setPreferences(loadedPreferences)
      setProfileDraft(loadedPreferences.profile)
    })

    return () => {
      active = false
    }
  }, [])

  function handleProfileChange(profile: UserPreferences['profile']) {
    setProfileDraft(profile)
    setSaved(false)
  }

  function handleSaveProfile() {
    void updatePreferences({ profile: profileDraft }).then(setPreferences)
    setSaved(true)
  }

  function handleClearProfile() {
    const emptyProfile: UserPreferences['profile'] = {
      nickname: '',
      email: '',
      avatarId: 'shield-cyan',
    }
    handleProfileChange(emptyProfile)
    void updatePreferences({ profile: emptyProfile }).then(setPreferences)
  }

  function handleCryptoChange(crypto: Partial<UserPreferences['crypto']>) {
    setPreferences((current) => ({
      ...(current ?? getPreferencesSync()),
      crypto: { ...(current?.crypto ?? getPreferencesSync().crypto), ...crypto },
    }))
    void updatePreferences({ crypto }).then(setPreferences)
  }

  function handleLanguageChange(language: SupportedLanguage) {
    void i18n.changeLanguage(language)
    setPreferences((current) => current
      ? { ...current, ui: { ...current.ui, language } }
      : current)
    void updatePreferences({ ui: { language } }).then(setPreferences)
  }

  function handleThemeToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    toggleTheme()
    setPreferences((current) => current
      ? { ...current, ui: { ...current.ui, theme: nextTheme } }
      : current)
    void updatePreferences({ ui: { theme: nextTheme } }).then(setPreferences)
  }

  function handleReset() {
    void clearPreferences().then(() => {
      const freshPreferences = getPreferencesSync()
      setPreferences(freshPreferences)
      setProfileDraft(freshPreferences.profile)
      setSaved(false)
      setModal(null)
    })
  }

  if (!preferences) {
    return (
      <ToolPageLayout showToolsDock>
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-400">
          {t('settings.loading')}
        </div>
      </ToolPageLayout>
    )
  }

  const activeLanguage = i18n.resolvedLanguage?.startsWith('pt')
    ? 'pt-BR'
    : i18n.resolvedLanguage === 'es'
      ? 'es'
      : 'en'

  return (
    <ToolPageLayout showToolsDock>
      <div className="space-y-6">
        <ToolHeroCompact
          eyebrow={t('settings.eyebrow')}
          badge={t('settings.badge')}
          title={t('settings.title')}
          description={t('settings.description')}
          actions={
            <Link to="/" className="btn-secondary">
              <RotateCcw className="h-4 w-4" />
              {t('settings.back')}
            </Link>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <ProfileCard
            profile={profileDraft}
            isPremium={isPremium}
            saved={saved}
            onChange={handleProfileChange}
            onSave={handleSaveProfile}
            onClear={handleClearProfile}
            onActivate={openLicenseActivation}
          />
          <LocalStatsCard stats={preferences.stats} />
        </div>

        <CryptoPreferencesCard
          preferences={preferences.crypto}
          nativeApp={isNativeApp()}
          onChange={handleCryptoChange}
        />

        <section className="surface-secondary rounded-[28px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Globe2 className="mt-0.5 h-5 w-5 text-cyan-200" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{t('settings.system.eyebrow')}</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{t('settings.system.title')}</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-white" htmlFor="settings-language">
                {t('settings.system.languageLabel')}
              </label>
              <select
                id="settings-language"
                value={activeLanguage}
                onChange={(event) => handleLanguageChange(event.target.value as SupportedLanguage)}
                className="tool-input mt-2"
              >
                {supportedLanguages.map((language) => (
                  <option key={language} value={language}>{t(`language.names.${language}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-sm font-medium text-white">{t('settings.system.themeLabel')}</span>
              <button type="button" onClick={handleThemeToggle} className="btn-secondary mt-2 w-full justify-center">
                {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {theme === 'dark' ? t('settings.preferences.lightTheme') : t('settings.preferences.darkTheme')}
              </button>
            </div>
          </div>
        </section>

        <section className="surface-secondary rounded-[28px] border border-rose-500/20 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-200" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-200/70">{t('settings.reset.eyebrow')}</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{t('settings.reset.title')}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t('settings.reset.description')}</p>
              <button type="button" onClick={() => setModal('reset')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20">
                <AlertTriangle className="h-4 w-4" />
                {t('settings.reset.action')}
              </button>
            </div>
          </div>
        </section>

        {modal === 'reset' ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="settings-reset-title">
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} aria-label={t('common.close')} />
            <div className="panel-surface relative z-10 w-full max-w-lg rounded-[28px] p-5 shadow-2xl shadow-black/40 sm:p-6">
              <h2 id="settings-reset-title" className="text-xl font-semibold text-white">{t('settings.reset.confirmTitle')}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{t('settings.reset.confirmDescription')}</p>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary justify-center">{t('settings.reset.cancel')}</button>
                <button type="button" onClick={handleReset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25">
                  <AlertTriangle className="h-4 w-4" />
                  {t('settings.reset.confirm')}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-xs leading-5 text-zinc-500">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          {t('settings.data.description')}
        </div>
      </div>
    </ToolPageLayout>
  )
}

import { Check, Cpu, Download, HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FILE_SECURITY_PROFILES } from '../../lib/criptoveu'
import type { UserPreferences } from '../../lib/storage/preferences-storage'

type Props = {
  preferences: UserPreferences['crypto']
  nativeApp: boolean
  onChange: (preferences: Partial<UserPreferences['crypto']>) => void
}

export default function CryptoPreferencesCard({ preferences, nativeApp, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <section className="surface-secondary rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Cpu className="mt-0.5 h-5 w-5 text-cyan-200" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{t('settings.crypto.eyebrow')}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{t('settings.crypto.title')}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{t('settings.crypto.description')}</p>
        </div>
      </div>

      <fieldset className="mt-5 space-y-2">
        <legend className="mb-2 text-sm font-medium text-white">{t('settings.crypto.profileLabel')}</legend>
        {FILE_SECURITY_PROFILES.map((profile) => {
          const active = preferences.defaultArgon2MemoryMb === profile.memoryMb

          return (
            <label key={profile.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${active ? 'border-cyan-400/45 bg-cyan-400/10' : 'border-white/10 bg-white/[0.025] hover:border-white/20'}`}>
              <input
                type="radio"
                name="settings-argon2-profile"
                value={profile.memoryMb}
                checked={active}
                onChange={() => onChange({ defaultArgon2MemoryMb: profile.memoryMb })}
                className="mt-1 accent-cyan-400"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{t(`files.workspace.securityProfiles.${profile.id}.label`)}</span>
                <span className="mt-1 block font-mono text-xs uppercase tracking-[0.2em] text-cyan-200/80">{profile.memoryMb} MB RAM</span>
              </span>
            </label>
          )
        })}
      </fieldset>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
        <input
          type="checkbox"
          checked={preferences.autoDownloadJsonReport}
          onChange={(event) => onChange({ autoDownloadJsonReport: event.target.checked })}
          className="mt-1 h-4 w-4 accent-cyan-400"
        />
        <span>
          <span className="flex items-center gap-2 text-sm font-medium text-white">
            <Download className="h-4 w-4 text-cyan-200" />
            {t('settings.crypto.autoReport')}
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-400">{t('settings.crypto.autoReportNote')}</span>
        </span>
      </label>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-xs leading-5 text-zinc-400">
        <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
        <p>{nativeApp ? t('settings.crypto.nativeDestination') : t('settings.crypto.browserDestination')}</p>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        <Check className="h-4 w-4 text-emerald-300" />
        {t('settings.crypto.localOnly')}
      </p>
    </section>
  )
}

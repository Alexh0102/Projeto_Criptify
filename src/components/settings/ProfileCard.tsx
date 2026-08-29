import { KeyRound, Lock, ShieldCheck, Sparkles, Terminal, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { UserPreferences, UserAvatarId } from '../../lib/storage/preferences-storage'

type Props = {
  profile: UserPreferences['profile']
  isPremium: boolean
  saved: boolean
  onChange: (profile: UserPreferences['profile']) => void
  onSave: () => void
  onClear: () => void
  onActivate: () => void
}

const avatarOptions: Array<{ id: UserAvatarId; icon: typeof ShieldCheck }> = [
  { id: 'shield-cyan', icon: ShieldCheck },
  { id: 'lock', icon: Lock },
  { id: 'terminal', icon: Terminal },
  { id: 'sparkles', icon: Sparkles },
]

export default function ProfileCard({ profile, isPremium, saved, onChange, onSave, onClear, onActivate }: Props) {
  const { t } = useTranslation()

  return (
    <section className="surface-primary rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="icon-chip">
          {(() => {
            const Icon = avatarOptions.find((option) => option.id === profile.avatarId)?.icon ?? ShieldCheck
            return <Icon className="h-5 w-5" />
          })()}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-100/75">{t('settings.profile.eyebrow')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{t('settings.profile.title')}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{t('settings.profile.description')}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label={t('settings.profile.avatarLabel')}>
        {avatarOptions.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange({ ...profile, avatarId: id })}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
              profile.avatarId === id
                ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                : 'border-white/10 bg-white/[0.035] text-zinc-400 hover:border-white/25 hover:text-white'
            }`}
            role="radio"
            aria-checked={profile.avatarId === id}
            aria-label={t(`settings.profile.avatars.${id}`)}
            title={t(`settings.profile.avatars.${id}`)}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="text-sm font-medium text-white" htmlFor="profile-nickname">
            {t('settings.profile.nameLabel')}
          </label>
          <input
            id="profile-nickname"
            type="text"
            value={profile.nickname}
            onChange={(event) => onChange({ ...profile, nickname: event.target.value })}
            maxLength={80}
            placeholder={t('settings.profile.namePlaceholder')}
            className="tool-input mt-2"
            autoComplete="nickname"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-white" htmlFor="profile-email">
            {t('settings.profile.emailLabel')}
          </label>
          <input
            id="profile-email"
            type="email"
            value={profile.email}
            onChange={(event) => onChange({ ...profile, email: event.target.value })}
            maxLength={254}
            placeholder={t('settings.profile.emailPlaceholder')}
            className="tool-input mt-2"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${isPremium ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.035] text-zinc-400'}`}>
          <ShieldCheck className="h-4 w-4" />
          {isPremium ? t('settings.profile.lifetime') : t('settings.profile.free')}
        </span>
        <button type="button" onClick={onActivate} className="btn-secondary">
          <KeyRound className="h-4 w-4" />
          {t('settings.profile.activate')}
        </button>
      </div>

      <div className="mt-5 rounded-[20px] border border-cyan-400/15 bg-cyan-400/[0.05] p-3 text-xs leading-6 text-zinc-400">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
          <p>{t('settings.profile.localNote')}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={onSave} className="btn-primary">
          <ShieldCheck className="h-4 w-4" />
          {t('settings.profile.save')}
        </button>
        <button type="button" onClick={onClear} className="btn-secondary">
          <Trash2 className="h-4 w-4" />
          {t('settings.profile.clear')}
        </button>
      </div>

      {saved ? <p className="mt-4 text-sm text-emerald-200">{t('settings.profile.saved')}</p> : null}
    </section>
  )
}

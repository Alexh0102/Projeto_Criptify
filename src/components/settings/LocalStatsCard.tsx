import { FileCheck2, FileKey2, HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LocalStats } from '../../lib/storage/preferences-storage'

type Props = {
  stats: LocalStats
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  const megabytes = bytes / (1024 * 1024)

  if (megabytes < 1024) {
    return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`
  }

  return `${(megabytes / 1024).toFixed(2)} GB`
}

export default function LocalStatsCard({ stats }: Props) {
  const { t } = useTranslation()
  const items = [
    { label: t('settings.stats.encrypted'), value: stats.totalFilesEncrypted, icon: FileKey2 },
    { label: t('settings.stats.decrypted'), value: stats.totalFilesDecrypted, icon: FileCheck2 },
    { label: t('settings.stats.bytes'), value: formatBytes(stats.totalBytesProcessed), icon: HardDrive },
  ]

  return (
    <section className="surface-secondary rounded-[28px] p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{t('settings.stats.eyebrow')}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{t('settings.stats.title')}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{t('settings.stats.description')}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <Icon className="h-4 w-4 text-cyan-200" />
            <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-500">{t('settings.stats.localNote')}</p>
    </section>
  )
}

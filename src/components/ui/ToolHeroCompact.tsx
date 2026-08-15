import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  eyebrow: string
  title: string
  description: string
  badge?: string
  notice?: ReactNode
  actions?: ReactNode
}

export default function ToolHeroCompact({
  eyebrow,
  title,
  description,
  badge,
  notice,
  actions,
}: Props) {
  const { t } = useTranslation()
  const resolvedBadge = badge ?? t('common.localBadge')

  return (
    <section className="cv-hero cv-tool-hero space-y-4">
      <div className="hero-badge">
        <ShieldCheck className="h-4 w-4" />
        {resolvedBadge}
      </div>

      <div className="cv-tool-hero-grid grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="cv-hero-copy space-y-3">
          <p className="text-xs uppercase tracking-[0.38em] text-zinc-500">{eyebrow}</p>
          <h1 className="cv-hero-heading max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-[2.65rem] sm:leading-[1.05]">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-zinc-300 sm:text-[15px]">
            {description}
          </p>
          {notice ? <div className="cv-file-limit-notice">{notice}</div> : null}
        </div>

        {actions ? <div className="cv-hero-actions shrink-0">{actions}</div> : null}
      </div>
    </section>
  )
}

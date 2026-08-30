import { useTranslation } from 'react-i18next'

type Props = {
  variant?: 'header' | 'hero'
  showTagline?: boolean
  className?: string
}

export default function BrandLogo({
  variant = 'header',
  showTagline = false,
  className = '',
}: Props) {
  const { t } = useTranslation()
  const isHero = variant === 'hero'
  const frameClasses = isHero
    ? 'h-[76px] w-[76px] rounded-[26px] sm:h-[108px] sm:w-[108px]'
    : 'h-[44px] w-[44px] rounded-[16px] sm:h-[62px] sm:w-[62px]'
  const coreClasses = isHero
    ? 'rounded-[24px] sm:rounded-[30px]'
    : 'rounded-[16px] sm:rounded-[21px]'
  const wrapperClasses = isHero
    ? 'flex min-w-0 max-w-full flex-col items-start gap-3.5 sm:flex-row sm:items-center sm:gap-4'
    : 'flex min-w-0 items-center gap-2.5 sm:gap-3.5'
  const titleClasses = isHero
    ? 'text-xs sm:text-[13px]'
    : 'whitespace-nowrap text-[11px] font-bold tracking-[0.22em] text-cyan-100/80 sm:text-xs sm:tracking-[0.32em]'
  const taglineClasses = isHero
    ? 'mt-2 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7 break-words'
    : 'mt-0.5 hidden text-xs text-zinc-400 md:block'

  return (
    <div className={`${wrapperClasses} ${className}`.trim()}>
      <div className={`brand-logo-frame ${frameClasses}`}>
        <div className="brand-logo-glow" />
        <div className="brand-logo-ring" />

        <div
          className={`relative h-full w-full overflow-hidden border border-cyan-300/18 bg-[#06111a] shadow-[0_22px_50px_rgba(2,12,27,0.45)] ${coreClasses}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_bottom_right,rgba(148,230,214,0.12),transparent_46%)]" />
          <img
            src="/brand/criptoveu-logo.png"
            alt={t('brand.logoAlt')}
            className={`relative block h-full w-full object-contain ${isHero ? 'scale-[1.12]' : 'scale-[1.1]'}`}
            loading="eager"
            draggable={false}
          />
        </div>
      </div>

      {showTagline ? (
        <div className="min-w-0 max-w-full break-words">
          <p className={`uppercase ${titleClasses}`}>
            {t('brand.name')}
          </p>
          <p className={taglineClasses}>{t('brand.tagline')}</p>
        </div>
      ) : null}
    </div>
  )
}

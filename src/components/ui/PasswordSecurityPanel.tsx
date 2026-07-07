import {
  Check,
  Copy,
  Dice5,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  analyzePasswordStrength,
  generateSecureCredential,
  type CredentialMode,
  type GeneratedCredential,
} from '../../lib/password-security'
import AdvancedOptions from './AdvancedOptions'

type Props = {
  value: string
  onChange: (value: string) => void
  context: 'file' | 'link' | 'qr' | 'note'
  disabled?: boolean
}

const STRENGTH_SLOTS = [1, 2, 3, 4, 5]
const MODE_ICONS = {
  passphrase: Sparkles,
  password: Dice5,
  key: KeyRound,
} satisfies Record<CredentialMode, typeof Sparkles>

function getStrengthColor(score: number) {
  if (score <= 1) {
    return 'bg-rose-400'
  }

  if (score === 2) {
    return 'bg-orange-400'
  }

  if (score === 3) {
    return 'bg-amber-300'
  }

  if (score === 4) {
    return 'bg-cyan-300'
  }

  return 'bg-emerald-300'
}

export default function PasswordSecurityPanel({
  value,
  onChange,
  context,
  disabled = false,
}: Props) {
  const { t } = useTranslation()
  const [generated, setGenerated] = useState<GeneratedCredential | null>(null)
  const [copied, setCopied] = useState(false)
  const [showGeneratedValue, setShowGeneratedValue] = useState(false)
  const analysis = useMemo(
    () =>
      analyzePasswordStrength(
        value,
        generated?.value === value ? generated.entropyBits : null,
      ),
    [generated, value],
  )

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  function handleGenerate(mode: CredentialMode) {
    const nextCredential = generateSecureCredential(mode)
    setGenerated(nextCredential)
    setCopied(false)
    setShowGeneratedValue(false)
    onChange(nextCredential.value)
  }

  async function handleCopy() {
    if (!value || !navigator.clipboard?.writeText) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <section className="surface-technical rounded-[22px] p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-300">
            {t('passwordSecurity.strength.title')}
          </span>
          <span className="font-medium text-white">
            {t(`passwordSecurity.strength.levels.${analysis.level}`)}
          </span>
        </div>

        <p className="sr-only">
          {t('passwordSecurity.strength.title')}
          {`: ${analysis.score}/5`}
        </p>

        <div className="mt-3 grid grid-cols-5 gap-2" aria-hidden="true">
          {STRENGTH_SLOTS.map((slot) => (
            <span
              key={slot}
              className={`h-2 rounded-full transition ${
                slot <= analysis.score
                  ? getStrengthColor(analysis.score)
                  : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {generated?.value === value ? (
          <p className="mt-3 text-xs leading-6 text-emerald-200">
            {t('passwordSecurity.generatedEntropy', {
              bits: generated.entropyBits,
            })}
          </p>
        ) : (
          <p className="mt-3 text-xs leading-6 text-zinc-500">
            {t('passwordSecurity.heuristicNote')}
          </p>
        )}
      </section>

      {analysis.warnings.length > 0 ? (
        <div
          role="alert"
          className={`rounded-[22px] border p-4 ${
            analysis.isWeak
              ? 'border-rose-400/25 bg-rose-400/[0.08] text-rose-50'
              : 'border-amber-300/20 bg-amber-300/[0.07] text-amber-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {analysis.isWeak
                  ? t('passwordSecurity.warningTitle')
                  : t('passwordSecurity.adviceTitle')}
              </p>
              <ul className="mt-2 space-y-1 text-xs leading-6 opacity-90">
                {analysis.warnings.map((warning) => (
                  <li key={warning}>
                    {t(`passwordSecurity.warnings.${warning}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <AdvancedOptions
        title={t('passwordSecurity.generator.title')}
        helper={t('passwordSecurity.generator.helper')}
      >
        <div className="grid gap-3">
          {(
            ['passphrase', 'password', 'key'] as const satisfies readonly CredentialMode[]
          ).map((mode) => {
            const Icon = MODE_ICONS[mode]

            return (
              <button
                key={mode}
                type="button"
                disabled={disabled}
                onClick={() => handleGenerate(mode)}
                className="surface-secondary rounded-[20px] p-4 text-left transition hover:border-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className="h-4 w-4 text-cyan-100" />
                  {t(`passwordSecurity.generator.modes.${mode}.label`)}
                </span>
                <span className="mt-2 block text-xs leading-6 text-zinc-400">
                  {t(`passwordSecurity.generator.modes.${mode}.description`)}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 rounded-[20px] border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
            <div className="text-xs leading-6 text-zinc-300">
              <p>{t('passwordSecurity.generator.localOnly')}</p>
              <p>{t('passwordSecurity.generator.noRecovery')}</p>
              {context === 'link' || context === 'qr' ? (
                <p>{t('passwordSecurity.generator.separateChannel')}</p>
              ) : null}
            </div>
          </div>

          {generated?.value === value ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-zinc-300">
                  {t('passwordSecurity.generator.generatedLabel')}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setShowGeneratedValue((currentValue) => !currentValue)
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-100 transition hover:text-white"
                >
                  {showGeneratedValue ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {showGeneratedValue
                    ? t('passwordSecurity.generator.hide')
                    : t('passwordSecurity.generator.show')}
                </button>
              </div>
              <p className="mt-2 break-all font-mono text-xs leading-6 text-emerald-100">
                {showGeneratedValue
                  ? value
                  : '•'.repeat(Math.min(32, value.length))}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            disabled={
              disabled || !value || typeof navigator.clipboard?.writeText !== 'function'
            }
            className="btn-secondary mt-3 w-full"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied
              ? t('passwordSecurity.generator.copied')
              : t('passwordSecurity.generator.copy')}
          </button>
        </div>
      </AdvancedOptions>
    </div>
  )
}

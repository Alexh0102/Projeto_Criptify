import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

type Props = InputHTMLAttributes<HTMLInputElement>

export default function PasswordInput({ className = '', disabled, ...props }: Props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((currentValue) => !currentValue)}
        disabled={disabled}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        className="password-toggle-btn absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

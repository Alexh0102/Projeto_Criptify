import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  title?: string
  helper?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function AdvancedOptions({
  title,
  helper,
  defaultOpen = false,
  children,
}: Props) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const resolvedTitle = title ?? t('common.advancedOptions')

  return (
    <section className="surface-technical rounded-[28px]">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-white">{resolvedTitle}</p>
          {helper ? <p className="mt-1 text-sm text-zinc-400">{helper}</p> : null}
        </div>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-zinc-400 transition ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen ? <div className="border-t border-white/10 px-5 py-4">{children}</div> : null}
    </section>
  )
}

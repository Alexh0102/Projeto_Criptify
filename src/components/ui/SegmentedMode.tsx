import type { ReactNode } from 'react'

import { useId } from 'react'

type Option = {
  value: string
  label: string
  icon?: ReactNode
}

type Props = {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  sticky?: boolean
  className?: string
}

export default function SegmentedMode({
  label,
  value,
  onChange,
  options,
  sticky = false,
  className = '',
}: Props) {
  const groupName = useId()

  return (
    <div
      className={`${
        sticky
          ? 'sticky top-[64px] z-20 rounded-[28px] border border-white/10 bg-black/55 p-2 backdrop-blur-xl'
          : 'space-y-2'
      } ${className}`.trim()}
    >
      {label ? (
        <p className="px-1 text-xs uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      ) : null}

      <div className="surface-technical grid gap-2 rounded-3xl p-1.5 sm:auto-cols-fr sm:grid-flow-col">
        {options.map((option) => {
          const selected = value === option.value

          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-medium transition focus-within:ring-2 focus-within:ring-cyan-200/60 ${
                selected
                  ? 'bg-white text-zinc-950 shadow-[0_12px_30px_rgba(34,211,238,0.12)]'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon}
              {option.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

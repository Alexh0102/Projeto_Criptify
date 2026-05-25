import { Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { usePremium } from '../../context/premium'
import {
  FREE_USAGE_CHANGE_EVENT,
  getFreeUsageStatus,
  type LimitedFeature,
} from '../../lib/premium'

type Props = {
  feature: LimitedFeature
}

function formatCountdown(resetAt: number, now: number) {
  const secondsRemaining = Math.max(0, Math.ceil((resetAt - now) / 1000))
  const hours = Math.floor(secondsRemaining / 3600)
  const minutes = Math.floor((secondsRemaining % 3600) / 60)
  const seconds = secondsRemaining % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function FreeUsageCounter({ feature }: Props) {
  const { isPremium } = usePremium()
  const [now, setNow] = useState(() => Date.now())
  const [status, setStatus] = useState(() => getFreeUsageStatus(feature))

  useEffect(() => {
    if (isPremium) {
      return
    }

    function syncStatus() {
      const currentTime = Date.now()
      setNow(currentTime)
      setStatus(getFreeUsageStatus(feature, currentTime))
    }

    syncStatus()
    const intervalId = window.setInterval(syncStatus, 1000)
    window.addEventListener(FREE_USAGE_CHANGE_EVENT, syncStatus)
    window.addEventListener('storage', syncStatus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener(FREE_USAGE_CHANGE_EVENT, syncStatus)
      window.removeEventListener('storage', syncStatus)
    }
  }, [feature, isPremium])

  if (isPremium) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-xs font-medium text-emerald-100">
        Uso ilimitado ativo
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-2 text-xs text-zinc-300">
      <span className="font-medium text-cyan-50">
        {status.remaining} de {status.limit} usos restantes
      </span>
      <span className="inline-flex items-center gap-1.5 text-zinc-400">
        <Clock3 className="h-3.5 w-3.5" />
        {status.resetAt === null
          ? 'Renovação inicia após o primeiro uso'
          : `Próxima renovação em ${formatCountdown(status.resetAt, now)}`}
      </span>
    </div>
  )
}

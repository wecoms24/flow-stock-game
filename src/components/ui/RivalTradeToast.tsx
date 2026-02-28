import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'

interface RivalToast {
  id: number
  message: string
  competitorName: string
}

const MAX_TOASTS = 2
const TOAST_DURATION = 5000

export function RivalTradeToast() {
  const taunts = useGameStore((s) => s.taunts)
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const [toasts, setToasts] = useState<RivalToast[]>([])
  const lastSeenRef = useRef(0)
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    if (!isGameStarted) return

    const newTaunts = taunts.slice(lastSeenRef.current)
    if (newTaunts.length === 0) return

    lastSeenRef.current = taunts.length

    // big_trade 타입만 토스트로 표시
    const bigTrades = newTaunts.filter((t) => t.type === 'big_trade')
    if (bigTrades.length === 0) return

    const latest = bigTrades[bigTrades.length - 1]
    const id = ++toastIdRef.current
    const toast: RivalToast = {
      id,
      message: latest.message,
      competitorName: latest.competitorName,
    }

    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), toast])

    const tid = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timeoutsRef.current.delete(tid)
    }, TOAST_DURATION)
    timeoutsRef.current.add(tid)
  }, [taunts, isGameStarted])

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((tid) => clearTimeout(tid))
      timeouts.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-12 right-2 z-50 flex flex-col gap-1 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto win-outset bg-win-face px-2 py-1.5 shadow-lg text-xs max-w-72"
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex items-start gap-1.5">
            <span className="text-base flex-shrink-0">📢</span>
            <span className="text-xs leading-tight">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

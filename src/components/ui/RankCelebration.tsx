import { useState, useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'

interface RankCelebrationToast {
  id: number
  oldRank: number
  newRank: number
  overtaken: Array<{ name: string; style: string }>
}

const TOAST_DURATION = 5000

const STYLE_LABELS: Record<string, string> = {
  aggressive: '공격형',
  conservative: '안정형',
  'trend-follower': '추세형',
  contrarian: '역발상형',
}

const STYLE_EMOJI: Record<string, string> = {
  aggressive: '🔥',
  conservative: '🐢',
  'trend-follower': '🌊',
  contrarian: '🐻',
}

export function RankCelebration() {
  const [toasts, setToasts] = useState<RankCelebrationToast[]>([])
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const fireConfetti = useCallback(() => {
    // Left burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.2, y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#7B68EE'],
    })
    // Right burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.8, y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#7B68EE'],
    })
  }, [])

  useEffect(() => {
    const timeouts = timeoutsRef.current

    const handleRankChange = (e: Event) => {
      const { oldRank, newRank, overtaken } = (e as CustomEvent).detail

      // Only show celebration toast when player overtakes someone (rank up)
      if (newRank >= oldRank || !overtaken || overtaken.length === 0) return

      const id = ++toastIdRef.current

      const toast: RankCelebrationToast = {
        id,
        oldRank,
        newRank,
        overtaken,
      }

      // Fire confetti for reaching rank #1
      if (newRank === 1) {
        fireConfetti()
        // Second wave after a short delay
        setTimeout(() => fireConfetti(), 300)
      }

      setToasts((prev) => {
        const newToasts = [...prev, toast]
        // Keep max 2 toasts
        if (newToasts.length > 2) {
          const removed = newToasts.shift()
          if (removed) {
            const tid = timeouts.get(removed.id)
            if (tid) {
              clearTimeout(tid)
              timeouts.delete(removed.id)
            }
          }
        }
        return newToasts
      })

      const tid = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        timeouts.delete(id)
      }, TOAST_DURATION)
      timeouts.set(id, tid)
    }

    window.addEventListener('rankChange', handleRankChange as EventListener)

    return () => {
      window.removeEventListener('rankChange', handleRankChange as EventListener)
      timeouts.forEach((tid) => clearTimeout(tid))
      timeouts.clear()
    }
  }, [fireConfetti])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isChampion = toast.newRank === 1

        return (
          <div
            key={toast.id}
            className="pointer-events-auto win-outset bg-win-face px-4 py-3 shadow-xl"
            style={{
              animation: 'bounceOnce 0.6s ease-out',
              minWidth: '280px',
              maxWidth: '360px',
            }}
          >
            {/* Title bar */}
            <div
              className="text-xs font-bold text-white px-2 py-0.5 mb-2"
              style={{
                background: isChampion
                  ? 'linear-gradient(90deg, #b8860b, #ffd700, #b8860b)'
                  : 'linear-gradient(90deg, #000080, #1084d0)',
              }}
            >
              {isChampion ? '★ 1위 달성! ★' : '순위 상승!'}
            </div>

            {/* Rank change display */}
            <div className="text-center mb-2">
              <span className="text-lg font-bold text-retro-gray">#{toast.oldRank}</span>
              <span className="text-sm text-retro-gray mx-2">→</span>
              <span
                className={`text-lg font-bold ${isChampion ? 'text-retro-brown' : 'text-retro-darkgreen'}`}
              >
                #{toast.newRank}
              </span>
            </div>

            {/* Overtaken competitors */}
            <div className="win-inset px-2 py-1.5">
              {toast.overtaken.map((comp, i) => {
                const emoji = STYLE_EMOJI[comp.style] ?? ''
                const label = STYLE_LABELS[comp.style] ?? comp.style
                return (
                  <div key={i} className="text-[10px] text-retro-darkgray">
                    {emoji} <span className="font-bold">{comp.name}</span>
                    <span className="text-retro-gray ml-1">({label})</span>
                    <span className="text-retro-gray"> 추월!</span>
                  </div>
                )
              })}
            </div>

            {isChampion && (
              <div className="text-center text-[10px] text-retro-brown font-bold mt-1.5">
                모든 경쟁자를 제치고 1위를 차지했습니다!
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'

interface DailyRecordToastData {
  id: number
  type: 'best' | 'worst'
  changePercent: number
}

const TOAST_DURATION = 5000
const MAX_TOASTS = 2

export function DailyRecordToast() {
  const [toasts, setToasts] = useState<DailyRecordToastData[]>([])
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timeouts = timeoutsRef.current

    const handleDailyRecord = (e: CustomEvent) => {
      const { type, changePercent } = e.detail
      const id = ++toastIdRef.current

      const toast: DailyRecordToastData = {
        id,
        type,
        changePercent,
      }

      setToasts((prev) => {
        const newToasts = [...prev, toast]
        if (newToasts.length > MAX_TOASTS) {
          const removedToast = newToasts.shift()
          if (removedToast) {
            const removedTimerId = timeouts.get(removedToast.id)
            if (removedTimerId) {
              clearTimeout(removedTimerId)
              timeouts.delete(removedToast.id)
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

    window.addEventListener('dailyRecord', handleDailyRecord as EventListener)

    return () => {
      window.removeEventListener('dailyRecord', handleDailyRecord as EventListener)
      timeouts.forEach((tid) => clearTimeout(tid))
      timeouts.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isBest = toast.type === 'best'
        const sign = isBest ? '+' : ''
        const label = isBest ? '최고의 날!' : '최악의 날...'
        const changeText = `${sign}${toast.changePercent.toFixed(1)}%`

        if (isBest) {
          return (
            <div
              key={toast.id}
              className="pointer-events-auto win-outset bg-win-face px-4 py-2 shadow-xl"
              style={{
                animation: 'bounceOnce 0.6s ease-out',
                borderLeft: '4px solid #008000',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📈</span>
                <div>
                  <div className="text-xs font-bold text-retro-darkgreen">{label}</div>
                  <div className="text-sm font-bold text-retro-darkgreen">{changeText}</div>
                </div>
              </div>
            </div>
          )
        }

        // Worst day: Win95 error dialog style
        return (
          <div
            key={toast.id}
            className="pointer-events-auto win-outset bg-win-face shadow-xl"
            style={{ animation: 'bounceOnce 0.6s ease-out', minWidth: '200px' }}
          >
            <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-0.5">
              <span className="text-white text-[10px] font-bold">⚠ 경고</span>
            </div>
            <div className="px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📉</span>
                <div>
                  <div className="text-xs font-bold text-retro-red">{label}</div>
                  <div className="text-sm font-bold text-retro-red">{changeText}</div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

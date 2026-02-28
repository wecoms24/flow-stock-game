import { useState, useEffect, useRef } from 'react'

interface RegimeToast {
  id: number
  regime: 'CALM' | 'VOLATILE' | 'CRISIS'
  message: string
}

const TOAST_DURATION = 5000
const MAX_TOASTS = 2 // 최대 2개의 토스트만 표시

export function RegimeToast() {
  const [toasts, setToasts] = useState<RegimeToast[]>([])
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    // cleanup 함수에서 사용할 로컬 변수로 복사 (ESLint 규칙 준수)
    const timeouts = timeoutsRef.current

    const handleRegimeChange = (e: CustomEvent) => {
      const { regime, message } = e.detail
      const id = ++toastIdRef.current

      const toast: RegimeToast = {
        id,
        regime,
        message,
      }

      setToasts((prev) => {
        // 최대 2개까지만 표시, 오래된 것부터 제거
        const newToasts = [...prev, toast]
        if (newToasts.length > MAX_TOASTS) {
          const removedToast = newToasts.shift()
          if (removedToast) {
            // 제거된 토스트의 타이머만 정리
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

    window.addEventListener('regimeChange', handleRegimeChange as EventListener)

    return () => {
      window.removeEventListener('regimeChange', handleRegimeChange as EventListener)
      timeouts.forEach((tid) => clearTimeout(tid))
      timeouts.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-10 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const colors = {
          CALM: 'bg-win-face text-retro-darkgreen win-outset',
          VOLATILE: 'bg-win-face text-retro-brown win-outset',
          CRISIS: 'bg-win-face text-retro-red win-outset font-bold',
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto ${colors[toast.regime]} px-4 py-2 shadow-xl text-xs font-bold`}
            style={{
              animation: 'bounceOnce 0.6s ease-out',
            }}
          >
            {toast.message}
          </div>
        )
      })}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'

interface RegimeToast {
  id: number
  regime: 'CALM' | 'VOLATILE' | 'CRISIS'
  message: string
}

const TOAST_DURATION = 5000

export function RegimeToast() {
  const [toasts, setToasts] = useState<RegimeToast[]>([])
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const handleRegimeChange = (e: CustomEvent) => {
      const { regime, message } = e.detail
      const id = ++toastIdRef.current

      const toast: RegimeToast = {
        id,
        regime,
        message,
      }

      setToasts((prev) => [...prev, toast])

      const tid = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        timeoutsRef.current.delete(tid)
      }, TOAST_DURATION)
      timeoutsRef.current.add(tid)
    }

    window.addEventListener('regimeChange', handleRegimeChange as EventListener)

    return () => {
      window.removeEventListener('regimeChange', handleRegimeChange as EventListener)
      timeoutsRef.current.forEach((tid) => clearTimeout(tid))
      timeoutsRef.current.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const colors = {
          CALM: 'bg-green-100 border-green-500 text-green-900',
          VOLATILE: 'bg-yellow-100 border-yellow-500 text-yellow-900',
          CRISIS: 'bg-red-100 border-red-600 text-red-900',
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto win-border ${colors[toast.regime]} px-4 py-2 shadow-xl text-sm font-bold animate-bounce-once`}
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

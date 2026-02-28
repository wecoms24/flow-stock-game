import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { formatHour } from '../../config/timeConfig'

interface Toast {
  id: number
  emoji: string
  message: string
  type: string
}

const MAX_TOASTS = 2
const TOAST_DURATION = 4000

export function OfficeToast() {
  const officeEvents = useGameStore((s) => s.officeEvents)
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const [toasts, setToasts] = useState<Toast[]>([])
  const lastSeenRef = useRef(0)
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    if (!isGameStarted) return

    // 새로운 이벤트만 토스트로 표시
    const newEvents = officeEvents.slice(lastSeenRef.current)
    if (newEvents.length === 0) return

    lastSeenRef.current = officeEvents.length

    // 중요한 이벤트만 토스트로 표시 (일반 행동 변경은 제외)
    const importantTypes = [
      'interaction',
      'level_up',
      'resignation_warning',
      'resignation',
      'hire',
      'counseling',
      'conflict',
      'mentoring',
      'collaboration',
      'trade_executed',
      'trade_failed',
      'furniture_placed',
      'employee_assigned',
      'employee_hired',
      'employee_fired',
    ]

    const important = newEvents.filter(
      (evt) =>
        importantTypes.some((t) => evt.type.includes(t)) ||
        evt.type === 'stressed_out',
    )

    if (important.length === 0) return

    // 가장 최근 이벤트만 (최대 1개씩 추가)
    const latest = important[important.length - 1]
    const id = ++toastIdRef.current
    // 현재 시간을 useEffect 내부에서 직접 가져옴 (의존성 배열에 추가하지 않기 위해)
    const currentHour = useGameStore.getState().time.hour
    const toast: Toast = {
      id,
      emoji: latest.emoji,
      message: `${formatHour(currentHour)} | ${latest.message}`,
      type: latest.type,
    }

    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), toast])

    const tid = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timeoutsRef.current.delete(tid)
    }, TOAST_DURATION)
    timeoutsRef.current.add(tid)
  }, [officeEvents, isGameStarted])

  // Cleanup on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((tid) => clearTimeout(tid))
      timeouts.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-11 right-2 z-50 flex flex-col gap-1 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto win-outset bg-win-face px-2 py-1.5 shadow-lg text-xs max-w-64"
          style={{
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div className="flex items-start gap-1.5">
            <span className="text-base flex-shrink-0">{toast.emoji}</span>
            <span className="text-xs leading-tight">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

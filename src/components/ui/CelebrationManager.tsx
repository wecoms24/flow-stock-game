/**
 * CelebrationManager - Unified celebration display system
 *
 * Renders celebrations from a priority queue with 3 levels:
 * Level 1: Toast (bottom-right, 4s auto-dismiss)
 * Level 2: Banner (top-center, 6s auto-dismiss, with sound)
 * Level 3: Ceremony (center modal, confetti, manual dismiss)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CelebrationEvent } from '../../types/celebration'
import { RetroButton } from './RetroButton'

const MAX_TOASTS = 3
const MAX_BANNERS = 2

export function CelebrationManager() {
  const [toasts, setToasts] = useState<CelebrationEvent[]>([])
  const [banners, setBanners] = useState<CelebrationEvent[]>([])
  const [ceremony, setCeremony] = useState<CelebrationEvent | null>(null)
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const timeouts = timeoutsRef.current

    const handleCelebration = (e: CustomEvent<CelebrationEvent>) => {
      const event = e.detail

      switch (event.level) {
        case 1:
          setToasts((prev) => {
            const next = [...prev, event]
            return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
          })
          break
        case 2:
          setBanners((prev) => {
            const next = [...prev, event]
            return next.length > MAX_BANNERS ? next.slice(-MAX_BANNERS) : next
          })
          break
        case 3:
          setCeremony(event)
          break
      }

      // Auto-dismiss for levels 1 and 2
      if (event.level < 3 && event.duration && event.duration > 0) {
        const tid = setTimeout(() => {
          if (event.level === 1) {
            setToasts((prev) => prev.filter((t) => t.id !== event.id))
          } else {
            setBanners((prev) => prev.filter((b) => b.id !== event.id))
          }
          timeouts.delete(tid)
        }, event.duration)
        timeouts.add(tid)
      }

      // Confetti for level 3
      if (event.confetti) {
        import('canvas-confetti')
          .then((mod) => {
            mod.default({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            })
          })
          .catch(() => {})
      }
    }

    window.addEventListener('celebration', handleCelebration as EventListener)

    return () => {
      window.removeEventListener('celebration', handleCelebration as EventListener)
      timeouts.forEach((tid) => clearTimeout(tid))
      timeouts.clear()
    }
  }, [])

  const dismissCeremony = useCallback(() => {
    setCeremony(null)
  }, [])

  const colorClasses: Record<string, string> = {
    green: 'border-green-600 bg-green-50',
    red: 'border-red-600 bg-red-50',
    blue: 'border-blue-600 bg-blue-50',
    gold: 'border-yellow-500 bg-yellow-50',
    default: 'border-win-shadow bg-win-face',
  }

  return (
    <>
      {/* Level 1: Toasts (bottom-right) */}
      {toasts.length > 0 && (
        <div className="fixed bottom-10 right-4 z-[9998] flex flex-col gap-1.5 pointer-events-none" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto win-outset px-3 py-2 shadow-lg text-xs border-l-4 ${colorClasses[toast.color ?? 'default']}`}
              style={{ animation: 'slideInRight 0.3s ease-out' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{toast.icon}</span>
                <div>
                  <div className="font-bold">{toast.title}</div>
                  <div className="text-retro-gray">{toast.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level 2: Banners (top-center) */}
      {banners.length > 0 && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9998] flex flex-col gap-1.5 pointer-events-none" role="status" aria-live="assertive">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`pointer-events-auto win-outset px-4 py-2 shadow-xl text-xs border-2 ${colorClasses[banner.color ?? 'default']} min-w-[280px] text-center`}
              style={{ animation: 'bounceOnce 0.6s ease-out' }}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{banner.icon}</span>
                <div>
                  <div className="font-bold text-sm">{banner.title}</div>
                  <div>{banner.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level 3: Ceremony (center modal) */}
      {ceremony && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={dismissCeremony}
        >
          <div
            className="win-outset bg-win-face shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'bounceOnce 0.6s ease-out' }}
          >
            {/* Title bar */}
            <div className="bg-win-title-active text-white px-3 py-1.5 text-sm font-bold flex items-center gap-2">
              <span>{ceremony.icon}</span>
              <span>{ceremony.title}</span>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <div className="text-4xl mb-4">{ceremony.icon}</div>
              <div className="text-lg font-bold mb-2">{ceremony.title}</div>
              <div className="text-sm text-retro-gray mb-6">{ceremony.description}</div>
              <RetroButton onClick={dismissCeremony} className="px-6 py-1.5">
                확인
              </RetroButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Dispatch a celebration event
 * Suppressed during fast-forward to prevent spam
 */
let _isFastForwarding = false
export function setCelebrationSuppressed(suppressed: boolean) {
  _isFastForwarding = suppressed
}
export function dispatchCelebration(event: CelebrationEvent) {
  if (_isFastForwarding) return
  window.dispatchEvent(new CustomEvent('celebration', { detail: event }))
}

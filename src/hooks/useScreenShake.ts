import { useCallback, useRef } from 'react'

type ShakeIntensity = 'light' | 'medium' | 'heavy'

const SHAKE_CLASSES: Record<ShakeIntensity, string> = {
  light: 'shake-light',
  medium: 'shake-medium',
  heavy: 'shake-heavy',
}

const SHAKE_DURATIONS: Record<ShakeIntensity, number> = {
  light: 200,
  medium: 300,
  heavy: 500,
}

/**
 * Global screen shake hook. Applies CSS shake animation to a target element.
 * Respects prefers-reduced-motion media query.
 */
export function useScreenShake(targetRef: React.RefObject<HTMLElement | null>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const shake = useCallback(
    (intensity: ShakeIntensity = 'medium') => {
      const el = targetRef.current
      if (!el) return

      // Respect reduced motion preference (OS + user setting)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (localStorage.getItem('reduce_motion') === 'true') return

      // Clear any ongoing shake
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        for (const cls of Object.values(SHAKE_CLASSES)) {
          el.classList.remove(cls)
        }
      }

      // Force reflow to restart animation
      void el.offsetWidth

      el.classList.add(SHAKE_CLASSES[intensity])

      timeoutRef.current = setTimeout(() => {
        el.classList.remove(SHAKE_CLASSES[intensity])
        timeoutRef.current = undefined
      }, SHAKE_DURATIONS[intensity])
    },
    [targetRef],
  )

  return shake
}

/* ── Global shake event bus ── */

type ShakeHandler = (intensity: ShakeIntensity) => void

let globalShakeHandler: ShakeHandler | null = null

export function registerShakeHandler(handler: ShakeHandler) {
  globalShakeHandler = handler
  return () => {
    if (globalShakeHandler === handler) globalShakeHandler = null
  }
}

/** Trigger screen shake from anywhere (non-React code, engines, etc.) */
export function triggerScreenShake(intensity: ShakeIntensity = 'medium') {
  globalShakeHandler?.(intensity)
}

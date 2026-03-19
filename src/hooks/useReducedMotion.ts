import { useState, useEffect } from 'react'

/**
 * Hook that checks if reduced motion is preferred.
 * Respects both the OS-level prefers-reduced-motion media query
 * and a user toggle stored in localStorage.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    // Check localStorage user override first
    const stored = localStorage.getItem('reduce_motion')
    if (stored !== null) return stored === 'true'
    // Fall back to OS preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't set a manual override
      if (localStorage.getItem('reduce_motion') === null) {
        setPrefersReduced(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

/** Toggle the reduced motion setting and persist to localStorage */
export function setReducedMotion(value: boolean) {
  localStorage.setItem('reduce_motion', String(value))
}

/** Check reduced motion without a hook (for non-React code) */
export function isReducedMotion(): boolean {
  const stored = localStorage.getItem('reduce_motion')
  if (stored !== null) return stored === 'true'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

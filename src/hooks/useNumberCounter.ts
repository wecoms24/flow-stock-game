/**
 * useNumberCounter
 *
 * 숫자 카운팅 애니메이션 훅 (Motion useSpring 대안 — 순수 RAF 구현)
 */

import { useState, useEffect, useRef } from 'react'

interface NumberCounterOptions {
  from: number
  to: number
  duration?: number // ms, default 400
  easing?: (t: number) => number
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function useNumberCounter(options: NumberCounterOptions | null) {
  const { from = 0, to = 0, duration = 400, easing = easeOutCubic } = options ?? {}
  const [value, setValue] = useState(from)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!options) return

    const startTime = performance.now()
    const range = to - from

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)
      const currentValue = from + range * easedProgress

      setValue(currentValue)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [from, to, duration, easing, options])

  return Math.round(value)
}

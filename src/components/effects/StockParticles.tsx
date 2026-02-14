import { useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'

/* ── [Design Track] Stock up/down arrow dot particle effects ── */
/* Lightweight CSS-only particle system for stock price changes */

interface Particle {
  id: number
  x: number
  y: number
  isUp: boolean
  opacity: number
}

let particleId = 0

export function StockParticles() {
  const companies = useGameStore((s) => s.companies)
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)

  useEffect(() => {
    // Sample top 5 most volatile changes each tick
    const topChanges = companies
      .filter((c) => c.previousPrice > 0)
      .map((c) => ({
        change: Math.abs((c.price - c.previousPrice) / c.previousPrice),
        isUp: c.price >= c.previousPrice,
      }))
      .sort((a, b) => b.change - a.change)
      .slice(0, 3)

    for (const tc of topChanges) {
      if (tc.change > 0.001) {
        // Only show particles for > 0.1% change
        particlesRef.current.push({
          id: ++particleId,
          x: Math.random() * 100, // % position
          y: tc.isUp ? 100 : 0,
          isUp: tc.isUp,
          opacity: Math.min(1, tc.change * 50),
        })
      }
    }

    // Keep only recent particles
    if (particlesRef.current.length > 30) {
      particlesRef.current = particlesRef.current.slice(-20)
    }
  }, [companies])

  useEffect(() => {
    const animate = () => {
      const container = containerRef.current
      if (!container) return

      // Update particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          y: p.isUp ? p.y - 2 : p.y + 2,
          opacity: p.opacity - 0.02,
        }))
        .filter((p) => p.opacity > 0)

      // Render
      const html = particlesRef.current
        .map(
          (p) =>
            `<div style="position:absolute;left:${p.x}%;top:${p.y}%;opacity:${p.opacity};color:${p.isUp ? '#FF0000' : '#0000FF'};font-size:10px;pointer-events:none;text-shadow:0 0 2px currentColor">${p.isUp ? '▲' : '▼'}</div>`,
        )
        .join('')

      container.innerHTML = html
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[9997]"
      aria-hidden="true"
    />
  )
}

import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'

/* ── [Design Track] Stock up/down arrow dot particle effects ── */
/* Lightweight React-rendered particle system for stock price changes */

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
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const [renderParticles, setRenderParticles] = useState<Particle[]>([])

  useEffect(() => {
    // Sample top 3 most volatile changes each tick
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
      // Update particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          y: p.isUp ? p.y - 2 : p.y + 2,
          opacity: p.opacity - 0.02,
        }))
        .filter((p) => p.opacity > 0)

      setRenderParticles([...particlesRef.current])
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9997]"
      aria-hidden="true"
    >
      {renderParticles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            color: p.isUp ? '#FF0000' : '#0000FF',
            fontSize: '10px',
            pointerEvents: 'none',
            textShadow: '0 0 2px currentColor',
          }}
        >
          {p.isUp ? '▲' : '▼'}
        </div>
      ))}
    </div>
  )
}

/**
 * Office Canvas Component
 *
 * Canvas 렌더링 전용 컴포넌트 (background, ambient, particle)
 * OfficeWindow.tsx에서 분리하여 책임 분산
 */

import { useEffect, useRef } from 'react'
import { getBackgroundForLevel } from '../../data/officeBackgrounds'
import { particleSystem } from '../../systems/particleSystem'
import { ambientRenderer } from '../../systems/ambientRenderer'
import { performanceMonitor } from '../../utils/performanceMonitor'

interface OfficeCanvasProps {
  officeLevel: number
  onFpsUpdate?: (fps: number) => void
}

export function OfficeCanvas({ officeLevel, onFpsUpdate }: OfficeCanvasProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)

  // Background canvas (static gradient)
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // HiDPI support for background canvas
    const CANVAS_SIZE = 436
    const dpr = window.devicePixelRatio || 1

    canvas.width = CANVAS_SIZE * dpr
    canvas.height = CANVAS_SIZE * dpr
    canvas.style.width = `${CANVAS_SIZE}px`
    canvas.style.height = `${CANVAS_SIZE}px`

    ctx.scale(dpr, dpr)

    const bg = getBackgroundForLevel(officeLevel)

    // Parse CSS linear-gradient and draw on canvas
    // Example: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)"
    const gradientMatch = bg.backgroundImage.match(/linear-gradient\((\d+)deg,\s*([^)]+)\)/)

    if (gradientMatch) {
      const colors = gradientMatch[2].split(/,\s*/)

      // Create linear gradient (top to bottom for 180deg)
      // Use logical size (CANVAS_SIZE) not scaled canvas.height
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE)

      colors.forEach((colorStop) => {
        const parts = colorStop.trim().split(/\s+/)
        const color = parts[0]
        const stop = parts[1] ? parseFloat(parts[1]) / 100 : 0
        gradient.addColorStop(stop, color)
      })

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    } else {
      // Fallback: solid color
      ctx.fillStyle = bg.wallColor
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    }
  }, [officeLevel])

  // Unified animation loop for both particle and ambient rendering
  // Single RAF loop for consistent timing and performance
  useEffect(() => {
    const particleCanvas = particleCanvasRef.current
    const ambientCanvas = ambientCanvasRef.current

    if (!particleCanvas || !ambientCanvas) return

    const particleCtx = particleCanvas.getContext('2d')
    const ambientCtx = ambientCanvas.getContext('2d')

    if (!particleCtx || !ambientCtx) return

    // Set canvas size to match grid container with HiDPI support
    // Grid: 10x10 cells, 40px each, 4px gap, 8px padding = 420px + 16px = 436px
    const CANVAS_SIZE = 436
    const dpr = window.devicePixelRatio || 1

    // Set actual canvas resolution (HiDPI)
    particleCanvas.width = CANVAS_SIZE * dpr
    particleCanvas.height = CANVAS_SIZE * dpr
    ambientCanvas.width = CANVAS_SIZE * dpr
    ambientCanvas.height = CANVAS_SIZE * dpr

    // Set CSS display size (logical pixels)
    particleCanvas.style.width = `${CANVAS_SIZE}px`
    particleCanvas.style.height = `${CANVAS_SIZE}px`
    ambientCanvas.style.width = `${CANVAS_SIZE}px`
    ambientCanvas.style.height = `${CANVAS_SIZE}px`

    // Scale context to match HiDPI
    particleCtx.scale(dpr, dpr)
    ambientCtx.scale(dpr, dpr)

    // Initialize ambient effects
    const bg = getBackgroundForLevel(officeLevel)
    ambientRenderer.initialize(bg.ambientEffects, CANVAS_SIZE, CANVAS_SIZE)

    let animationId: number
    let lastTime = 0

    const animate = (time: number) => {
      // Calculate deltaTime (in milliseconds)
      const deltaTime = time - lastTime
      lastTime = time

      // Performance monitoring
      performanceMonitor.update(time)

      // Render particles
      particleCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      particleSystem.update(time)
      particleSystem.render(particleCtx)

      // Render ambient effects
      ambientCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ambientRenderer.update(deltaTime / 1000, bg.ambientEffects) // deltaTime in seconds
      ambientRenderer.render(ambientCtx, bg.ambientEffects)

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      particleSystem.clear()
      ambientRenderer.clear()
    }
  }, [officeLevel])

  // FPS 업데이트 (1초마다)
  useEffect(() => {
    if (!onFpsUpdate) return

    const interval = setInterval(() => {
      const currentFps = performanceMonitor.getCurrentFPS()
      onFpsUpdate(currentFps)
    }, 1000)

    return () => clearInterval(interval)
  }, [onFpsUpdate])

  return (
    <>
      {/* Background Canvas - z-index: 0 (static gradient) */}
      <canvas
        ref={bgCanvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      />

      {/* Ambient Effects Canvas - z-index: 5 (dust, sparks, cityscape) */}
      <canvas
        ref={ambientCanvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 5 }}
        aria-hidden="true"
      />

      {/* Particle Canvas - z-index: 30 (above grid) */}
      <canvas
        ref={particleCanvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 30 }}
        aria-hidden="true"
      />
    </>
  )
}

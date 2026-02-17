/**
 * Speech Bubble Component
 *
 * 직원 말풍선 표시 컴포넌트 (fade-in → 유지 → fade-out)
 */

import { useState, useEffect } from 'react'

interface SpeechBubbleProps {
  message: string
  x: number // 화면 좌표 (px)
  y: number // 화면 좌표 (px)
  duration?: number // 표시 시간 (ms), 기본 3000ms
  onComplete?: () => void
}

export function SpeechBubble({ message, x, y, duration = 3000, onComplete }: SpeechBubbleProps) {
  const [opacity, setOpacity] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Fade-in (200ms)
    const fadeInTimer = setTimeout(() => setOpacity(1), 10)

    // Fade-out 시작 (duration - 300ms)
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0)
    }, duration - 300)

    // 완전 제거 (duration + 300ms)
    const removeTimer = setTimeout(() => {
      setIsVisible(false)
      onComplete?.()
    }, duration + 300)

    return () => {
      clearTimeout(fadeInTimer)
      clearTimeout(fadeOutTimer)
      clearTimeout(removeTimer)
    }
  }, [duration, onComplete])

  if (!isVisible) return null

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%)',
        opacity,
        transition: 'opacity 300ms ease-in-out',
      }}
    >
      {/* 말풍선 본체 */}
      <div className="relative bg-white border-2 border-black px-3 py-2 rounded-lg shadow-lg max-w-[200px]">
        <p className="text-black text-xs font-semibold leading-tight whitespace-pre-line">
          {message}
        </p>

        {/* 꼬리 (아래 방향) */}
        <div
          className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '10px solid white',
          }}
        />
        <div
          className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
          style={{
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '12px solid black',
            zIndex: -1,
            marginTop: '-2px',
          }}
        />
      </div>
    </div>
  )
}

/**
 * 여러 말풍선을 관리하는 컨테이너
 */
interface SpeechBubbleContainerProps {
  bubbles: Array<{
    id: string
    employeeId: string
    message: string
    position: { x: number; y: number } // 화면 좌표
  }>
  onRemoveBubble: (id: string) => void
}

export function SpeechBubbleContainer({ bubbles, onRemoveBubble }: SpeechBubbleContainerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {bubbles.map((bubble) => (
        <SpeechBubble
          key={bubble.id}
          message={bubble.message}
          x={bubble.position.x}
          y={bubble.position.y}
          duration={3000}
          onComplete={() => onRemoveBubble(bubble.id)}
        />
      ))}
    </div>
  )
}

/**
 * CelebrationToast
 *
 * 마일스톤 달성 시 화면 상단에 표시되는 축하 토스트
 */

import { useEffect, useState } from 'react'

interface CelebrationToastProps {
  title: string
  description: string
  icon: string
  onDismiss?: () => void
  duration?: number // ms
}

export function CelebrationToast({
  title,
  description,
  icon,
  onDismiss,
  duration = 3000,
}: CelebrationToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Enter animation
    requestAnimationFrame(() => setIsVisible(true))

    // Auto dismiss
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300)

    const dismissTimer = setTimeout(() => {
      onDismiss?.()
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(dismissTimer)
    }
  }, [duration, onDismiss])

  return (
    <div
      className={`
        fixed top-4 left-1/2 z-[9999] -translate-x-1/2
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
    >
      <div
        className="
          flex items-center gap-3 px-5 py-3
          bg-gray-800 border-2 border-yellow-500
          shadow-lg shadow-yellow-500/20
          min-w-[300px] max-w-[500px]
        "
        style={{
          boxShadow: 'inset 1px 1px 0 #555, inset -1px -1px 0 #222, 2px 2px 0 #000',
        }}
      >
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-yellow-400 font-bold text-sm truncate">{title}</p>
          <p className="text-gray-300 text-xs truncate">{description}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * EmotionBadge
 *
 * 감정 이모지 + 색상 배지
 */

import { EMOTION_CONFIG, type EmotionalState } from '../../types/employeeBio'

interface EmotionBadgeProps {
  emotion: EmotionalState
  size?: 'sm' | 'md'
}

export function EmotionBadge({ emotion, size = 'sm' }: EmotionBadgeProps) {
  const config = EMOTION_CONFIG[emotion]
  const sizeClass = size === 'sm' ? 'text-[10px] px-1' : 'text-xs px-1.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-0.5 border ${sizeClass}`}
      style={{ borderColor: config.color, color: config.color }}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

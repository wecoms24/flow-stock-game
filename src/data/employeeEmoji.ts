import type { EmployeeRole } from '../types'
import type { EmployeeActionType } from '../engines/employeeBehavior'

/* ── Employee Emoji Character System ── */
/* 에셋 없이 이모지만으로 캐릭터 표현 */

export const ROLE_EMOJI: Record<EmployeeRole, string> = {
  analyst: '📊',
  trader: '📈',
  manager: '👔',
  intern: '🎒',
  ceo: '👑',
  hr_manager: '🤝',
}

export const BEHAVIOR_EMOJI: Record<EmployeeActionType, string> = {
  WORKING: '💻',
  IDLE: '😶',
  BREAK: '😌',
  SOCIALIZING: '🗣️',
  COFFEE: '☕',
  MEETING: '📋',
  STRESSED_OUT: '😫',
  COUNSELING: '💬',
}

export const MOOD_FACE: Record<string, string> = {
  happy: '😊',
  neutral: '😐',
  stressed: '😰',
  angry: '😤',
  excited: '🤩',
  tired: '😴',
}

export function getMoodFace(stress: number, satisfaction: number): string {
  if (stress > 70) return MOOD_FACE.stressed
  if (satisfaction < 30) return MOOD_FACE.angry
  if (satisfaction > 80 && stress < 20) return MOOD_FACE.excited
  if (stress > 50) return MOOD_FACE.tired
  if (satisfaction > 60) return MOOD_FACE.happy
  return MOOD_FACE.neutral
}

export function getEmployeeDisplayEmoji(
  role: EmployeeRole,
  stress: number,
  satisfaction: number,
): string {
  const mood = getMoodFace(stress, satisfaction)
  const roleIcon = ROLE_EMOJI[role]
  return `${roleIcon}${mood}`
}

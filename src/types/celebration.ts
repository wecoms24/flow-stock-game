/**
 * Unified Celebration System Types
 *
 * 3-level celebration hierarchy:
 * Level 1 (Toast): Small notifications, 4s, bottom-right
 * Level 2 (Banner): Full-width banner, 6s, top, with sound
 * Level 3 (Ceremony): Center modal, confetti + fanfare
 */

export type CelebrationLevel = 1 | 2 | 3

export interface CelebrationEvent {
  id: string
  level: CelebrationLevel
  title: string
  description: string
  icon: string
  color?: 'green' | 'red' | 'blue' | 'gold' | 'default'
  duration?: number // ms, defaults based on level
  confetti?: boolean // Level 3 default true
  sound?: string // sound key for soundManager
  timestamp: number
}

export interface CelebrationState {
  queue: CelebrationEvent[]
  current: CelebrationEvent | null
}

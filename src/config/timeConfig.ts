/* ── Business Hour Time Configuration ── */

import type { GameTime } from '../types'

export const TIME_CONFIG = {
  BUSINESS_START_HOUR: 9,
  BUSINESS_END_HOUR: 18,
  HOURS_PER_BUSINESS_DAY: 10, // 9~18 inclusive
  LUNCH_HOUR: 12,
  DAYS_PER_MONTH: 30,
  MONTHS_PER_YEAR: 12,
} as const

/** 영업시간 인덱스 (0-9) — 기존 tick과 동일한 역할 */
export function getBusinessHourIndex(hour: number): number {
  return hour - TIME_CONFIG.BUSINESS_START_HOUR
}

/** 절대 타임스탬프 계산 (기존 absoluteTick과 동일 공식) */
export function getAbsoluteTimestamp(time: GameTime, startYear = 1995): number {
  return (
    ((time.year - startYear) * 360 + (time.month - 1) * 30 + (time.day - 1)) * 10 +
    getBusinessHourIndex(time.hour)
  )
}

/** 시간대 구분 */
export type TimeOfDay = 'morning' | 'lunch' | 'afternoon' | 'closing'

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour <= 11) return 'morning'
  if (hour <= 12) return 'lunch'
  if (hour <= 16) return 'afternoon'
  return 'closing'
}

/** 시간 포맷팅 */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

import type { BadgeType, EmployeeTitle } from '../types'

/* ── XP Curve ── */
const BASE_XP = 100

export function xpForLevel(level: number): number {
  return Math.floor(BASE_XP * Math.pow(level, 1.5))
}

/* ── Title / Badge mapping ── */
export function titleForLevel(level: number): EmployeeTitle {
  if (level >= 30) return 'master'
  if (level >= 20) return 'senior'
  if (level >= 10) return 'junior'
  return 'intern'
}

export function badgeForLevel(level: number): BadgeType {
  if (level >= 30) return 'gold'
  if (level >= 20) return 'purple'
  if (level >= 10) return 'blue'
  return 'gray'
}

export const TITLE_LABELS: Record<EmployeeTitle, string> = {
  intern: '인턴',
  junior: '주니어',
  senior: '시니어',
  master: '마스터',
}

export const BADGE_COLORS: Record<BadgeType, string> = {
  gray: '#808080',
  blue: '#4169E1',
  purple: '#8B008B',
  gold: '#FFD700',
}

/* ── Skill Unlock Descriptions ── */
export const SKILL_UNLOCKS: Record<number, { name: string; description: string }> = {
  10: { name: 'Auto-Analysis', description: '매일 자동으로 시장 분석 1회 수행' },
  20: { name: 'Deep Insight', description: '예측 정확도 +10% 향상' },
  30: { name: 'Market Sense', description: '시장 변동성 사전 감지' },
}

/* ── XP Sources ── */
export const XP_AMOUNTS = {
  MONTHLY_WORK: 15, // 매월 근무
  TRADE_SUCCESS: 10, // 거래 성공 시
  PRAISE: 5, // 칭찬 받기
  PERFECT_STAMINA: 5, // 스태미너 50% 이상 유지
} as const

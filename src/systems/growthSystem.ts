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
  5: { name: 'Auto-Analysis', description: '매일 자동으로 시장 분석 1회 수행' },
  12: { name: 'Deep Insight', description: '예측 정확도 +10% 향상' },
  22: { name: 'Market Sense', description: '시장 변동성 사전 감지' },
}

/* ── XP Sources ── */
export const XP_AMOUNTS = {
  MONTHLY_WORK: 15, // 월간 총 XP (processHourly에서 /300 시간당 지급)
  TRADE_SUCCESS: 20, // 거래 성공 시
  PRAISE: 5, // 칭찬 받기
  PERFECT_STAMINA: 5, // 스태미너 50% 이상 유지
  INTERACTION_MENTORING: 8, // 멘토링 상호작용 시
  INTERACTION_COLLABORATION: 5, // 협업 상호작용 시
  PROPOSAL_APPROVED: 7, // 매매 제안 승인 시
  PROPOSAL_PROFITABLE: 25, // 수익 낸 거래 완료 시
  CRISIS_SURVIVAL: 12, // 위기 레짐에서 버티기
  SKILL_USAGE: 3, // 스킬 뱃지 효과 발동 시
  TRAINING_COMPLETE: 20, // 교육 프로그램 수료
  STREAK_BONUS: 8, // 연속 출근 보너스 (스트레스 50 미만 유지)
} as const

/* ── Level-Up Rewards ── */
export const LEVEL_REWARDS: Record<number, {
  title: string
  bonus: string
  statBoost?: { stress?: number; satisfaction?: number; stamina?: number }
  salaryMultiplier?: number
}> = {
  5: {
    title: '숙련',
    bonus: 'Auto-Analysis 해금',
    statBoost: { satisfaction: 5, stamina: 3 },
    salaryMultiplier: 1.1,
  },
  10: {
    title: '전문가',
    bonus: '분석 정확도 +5%',
    statBoost: { satisfaction: 10, stamina: 5 },
    salaryMultiplier: 1.2,
  },
  12: {
    title: '통찰자',
    bonus: 'Deep Insight 해금',
    statBoost: { satisfaction: 8, stamina: 5 },
  },
  15: { title: '베테랑', bonus: '시너지 보너스 +10%', statBoost: { satisfaction: 5 } },
  20: {
    title: '달인',
    bonus: '매매 슬리피지 -10%',
    statBoost: { satisfaction: 15, stamina: 10 },
    salaryMultiplier: 1.5,
  },
  22: {
    title: '선각자',
    bonus: 'Market Sense 해금',
    statBoost: { satisfaction: 10, stamina: 5 },
  },
  25: { title: '전설', bonus: '매매 수수료 -20%', statBoost: { satisfaction: 10 } },
  30: {
    title: '마스터',
    bonus: '전체 보너스 + 최종 승급',
    statBoost: { satisfaction: 20, stamina: 15 },
    salaryMultiplier: 2.0,
  },
}

/* ── Role-based XP Multiplier ── */
export function xpMultiplierForRole(role: string, level: number): number {
  const roleBase: Record<string, number> = {
    analyst: 1.0,
    trader: 1.1, // 트레이더는 XP 약간 빠르게
    manager: 0.9, // 매니저는 느리지만 효과 큼
    intern: 1.3, // 인턴은 빠르게 성장
    ceo: 0.7, // CEO는 느리게
    hr_manager: 0.8,
  }
  const base = roleBase[role] ?? 1.0
  // 저레벨일수록 빠르게 성장 (감소하는 보너스)
  const levelBonus = Math.max(0.5, 1.5 - level * 0.03)
  return base * levelBonus
}

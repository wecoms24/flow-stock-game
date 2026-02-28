/**
 * Employee Growth Milestones
 *
 * 직원 개인별 마일스톤 정의 — 성장, 근속, 성과, 기여도 기준
 * processMonthly()에서 매월 체크
 */

import type { Employee } from '../types'
import type { EmployeeBio } from '../types/employeeBio'

export type EmployeeMilestoneCategory = 'growth' | 'tenure' | 'performance' | 'contribution'

export interface EmployeeMilestoneDefinition {
  id: string
  category: EmployeeMilestoneCategory
  title: string
  description: string
  icon: string
  condition: (employee: Employee, bio: EmployeeBio) => boolean
  reward?: {
    satisfactionBonus?: number
    stressReduction?: number
    xpBonus?: number
  }
}

export const EMPLOYEE_MILESTONES: EmployeeMilestoneDefinition[] = [
  // ── Growth Milestones ──
  {
    id: 'skill_30',
    category: 'growth',
    title: '스킬 개화',
    description: '주요 스킬이 30에 도달했습니다',
    icon: '🌱',
    condition: (emp) => {
      const s = emp.skills ?? { analysis: 0, trading: 0, research: 0 }
      return Math.max(s.analysis, s.trading, s.research) >= 30
    },
    reward: { satisfactionBonus: 5, xpBonus: 50 },
  },
  {
    id: 'skill_50',
    category: 'growth',
    title: '숙련자',
    description: '주요 스킬이 50에 도달했습니다',
    icon: '⭐',
    condition: (emp) => {
      const s = emp.skills ?? { analysis: 0, trading: 0, research: 0 }
      return Math.max(s.analysis, s.trading, s.research) >= 50
    },
    reward: { satisfactionBonus: 8, xpBonus: 100 },
  },
  {
    id: 'skill_80',
    category: 'growth',
    title: '마스터 급',
    description: '주요 스킬이 80에 도달! 업계 최고 수준입니다',
    icon: '🏅',
    condition: (emp) => {
      const s = emp.skills ?? { analysis: 0, trading: 0, research: 0 }
      return Math.max(s.analysis, s.trading, s.research) >= 80
    },
    reward: { satisfactionBonus: 15, xpBonus: 200 },
  },
  {
    id: 'level_10',
    category: 'growth',
    title: '주니어 승진',
    description: '레벨 10 도달 — 주니어로 성장했습니다',
    icon: '📈',
    condition: (emp) => (emp.level ?? 1) >= 10,
    reward: { satisfactionBonus: 5, xpBonus: 30 },
  },
  {
    id: 'level_20',
    category: 'growth',
    title: '시니어 승진',
    description: '레벨 20 도달 — 시니어가 되었습니다!',
    icon: '🎖️',
    condition: (emp) => (emp.level ?? 1) >= 20,
    reward: { satisfactionBonus: 10, xpBonus: 80 },
  },
  {
    id: 'level_30',
    category: 'growth',
    title: '마스터 등극',
    description: '레벨 30 도달 — 마스터! 전설적인 인재입니다',
    icon: '👑',
    condition: (emp) => (emp.level ?? 1) >= 30,
    reward: { satisfactionBonus: 20, xpBonus: 200 },
  },

  // ── Tenure Milestones ──
  {
    id: 'tenure_1y',
    category: 'tenure',
    title: '1주년 기념',
    description: '입사 1년! 이제 우리 가족이에요',
    icon: '🎂',
    condition: (_emp, bio) => bio.monthsEmployed >= 12,
    reward: { satisfactionBonus: 5, stressReduction: 5 },
  },
  {
    id: 'tenure_3y',
    category: 'tenure',
    title: '3주년 기념',
    description: '3년 근속 — 중견 직원이 되었습니다',
    icon: '🎊',
    condition: (_emp, bio) => bio.monthsEmployed >= 36,
    reward: { satisfactionBonus: 8, stressReduction: 8 },
  },
  {
    id: 'tenure_5y',
    category: 'tenure',
    title: '5주년 기념',
    description: '5년 근속! 회사의 기둥입니다',
    icon: '🏆',
    condition: (_emp, bio) => bio.monthsEmployed >= 60,
    reward: { satisfactionBonus: 12, stressReduction: 10 },
  },
  {
    id: 'tenure_10y',
    category: 'tenure',
    title: '10주년 기념',
    description: '10년 근속!! 전설의 시작입니다',
    icon: '💎',
    condition: (_emp, bio) => bio.monthsEmployed >= 120,
    reward: { satisfactionBonus: 20, stressReduction: 15 },
  },
  {
    id: 'tenure_20y',
    category: 'tenure',
    title: '20주년 기념',
    description: '20년 함께했습니다. 이 회사의 역사 그 자체입니다',
    icon: '🌟',
    condition: (_emp, bio) => bio.monthsEmployed >= 240,
    reward: { satisfactionBonus: 30, stressReduction: 20 },
  },

  // ── Performance Milestones ──
  {
    id: 'first_trade',
    category: 'performance',
    title: '첫 거래 성공',
    description: '첫 번째 거래를 성공적으로 완료했습니다!',
    icon: '🎯',
    condition: (_emp, bio) => bio.totalSuccessfulTrades >= 1,
    reward: { satisfactionBonus: 3, xpBonus: 20 },
  },
  {
    id: 'trade_10',
    category: 'performance',
    title: '10회 거래 달성',
    description: '10번의 거래를 성공시켰습니다',
    icon: '📊',
    condition: (_emp, bio) => bio.totalSuccessfulTrades >= 10,
    reward: { satisfactionBonus: 5, xpBonus: 50 },
  },
  {
    id: 'trade_50',
    category: 'performance',
    title: '50회 거래 달성',
    description: '50번의 거래를 성공! 베테랑 트레이더입니다',
    icon: '💹',
    condition: (_emp, bio) => bio.totalSuccessfulTrades >= 50,
    reward: { satisfactionBonus: 10, xpBonus: 100 },
  },
  {
    id: 'trade_100',
    category: 'performance',
    title: '100회 거래 달성',
    description: '100번의 거래! 전설의 트레이더입니다',
    icon: '🔥',
    condition: (_emp, bio) => bio.totalSuccessfulTrades >= 100,
    reward: { satisfactionBonus: 15, xpBonus: 200 },
  },

  // ── Contribution Milestones ──
  {
    id: 'pnl_10m',
    category: 'contribution',
    title: '1천만원 기여',
    description: '누적 수익 기여 1,000만원 달성!',
    icon: '💰',
    condition: (_emp, bio) => (bio.totalPnlContribution ?? 0) >= 10_000_000,
    reward: { satisfactionBonus: 5, xpBonus: 30 },
  },
  {
    id: 'pnl_100m',
    category: 'contribution',
    title: '1억원 기여',
    description: '누적 수익 기여 1억원 달성!!',
    icon: '💎',
    condition: (_emp, bio) => (bio.totalPnlContribution ?? 0) >= 100_000_000,
    reward: { satisfactionBonus: 10, xpBonus: 100 },
  },
  {
    id: 'pnl_1b',
    category: 'contribution',
    title: '10억원 기여',
    description: '누적 수익 기여 10억원! 이 회사의 수익을 책임지는 인재입니다',
    icon: '🏦',
    condition: (_emp, bio) => (bio.totalPnlContribution ?? 0) >= 1_000_000_000,
    reward: { satisfactionBonus: 20, xpBonus: 300 },
  },
]

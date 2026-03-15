/**
 * Milestone Definitions
 *
 * 금융/시간/달성/직원 카테고리별 마일스톤
 */

import type { Milestone } from '../types'

export interface MilestoneDefinition {
  id: string
  title: string
  description: string
  icon: string
  category: 'financial' | 'time' | 'achievement' | 'employee'
  targetValue: number
  checkFn: (context: MilestoneContext) => number // 현재 값 반환
}

export interface MilestoneContext {
  totalAssets: number
  cash: number
  portfolioCount: number
  employeeCount: number
  yearsPassed: number
  totalTrades: number
  currentYear: number
  officeLevel: number
  competitorRank: number
  tradeStreak: number
  bestDayChange: number
  maxEmployeeLevel: number
  totalRealizedProfit: number
  sectorCount: number
  corporateSkillCount: number
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // Financial
  {
    id: 'assets_100m',
    title: '1억 돌파',
    description: '총 자산 1억 원 달성',
    icon: '💰',
    category: 'financial',
    targetValue: 100_000_000,
    checkFn: (ctx) => ctx.totalAssets,
  },
  {
    id: 'assets_500m',
    title: '5억 돌파',
    description: '총 자산 5억 원 달성',
    icon: '💎',
    category: 'financial',
    targetValue: 500_000_000,
    checkFn: (ctx) => ctx.totalAssets,
  },
  {
    id: 'assets_1b',
    title: '10억 돌파',
    description: '총 자산 10억 원 달성!',
    icon: '🏆',
    category: 'financial',
    targetValue: 1_000_000_000,
    checkFn: (ctx) => ctx.totalAssets,
  },
  {
    id: 'assets_5b',
    title: '50억 돌파',
    description: '총 자산 50억 원 달성! 대형 투자자 반열!',
    icon: '👑',
    category: 'financial',
    targetValue: 5_000_000_000,
    checkFn: (ctx) => ctx.totalAssets,
  },
  {
    id: 'cash_100m',
    title: '현금 부자',
    description: '현금 보유 1억 원 달성',
    icon: '🏦',
    category: 'financial',
    targetValue: 100_000_000,
    checkFn: (ctx) => ctx.cash,
  },

  // Time
  {
    id: 'year_2000',
    title: '새 천년',
    description: '2000년에 도달',
    icon: '🎆',
    category: 'time',
    targetValue: 2000,
    checkFn: (ctx) => ctx.currentYear,
  },
  {
    id: 'year_2010',
    title: '10년 생존',
    description: '2010년에 도달',
    icon: '📅',
    category: 'time',
    targetValue: 2010,
    checkFn: (ctx) => ctx.currentYear,
  },
  {
    id: 'year_2020',
    title: '20년 베테랑',
    description: '2020년에 도달',
    icon: '🎖️',
    category: 'time',
    targetValue: 2020,
    checkFn: (ctx) => ctx.currentYear,
  },

  // Achievement
  {
    id: 'portfolio_5',
    title: '분산 투자',
    description: '5개 종목 동시 보유',
    icon: '📊',
    category: 'achievement',
    targetValue: 5,
    checkFn: (ctx) => ctx.portfolioCount,
  },
  {
    id: 'portfolio_10',
    title: '포트폴리오 마스터',
    description: '10개 종목 동시 보유',
    icon: '📈',
    category: 'achievement',
    targetValue: 10,
    checkFn: (ctx) => ctx.portfolioCount,
  },
  {
    id: 'rank_1',
    title: '넘버 원',
    description: '랭킹 1위 달성',
    icon: '🥇',
    category: 'achievement',
    targetValue: 1,
    checkFn: (ctx) => ctx.competitorRank <= 1 ? 1 : 0,
  },

  // Employee
  {
    id: 'employee_3',
    title: '팀 빌더',
    description: '직원 3명 채용',
    icon: '👥',
    category: 'employee',
    targetValue: 3,
    checkFn: (ctx) => ctx.employeeCount,
  },
  {
    id: 'employee_5',
    title: '소규모 기업',
    description: '직원 5명 채용',
    icon: '🏢',
    category: 'employee',
    targetValue: 5,
    checkFn: (ctx) => ctx.employeeCount,
  },
  {
    id: 'office_2',
    title: '사무실 확장',
    description: '사무실 레벨 2 달성',
    icon: '🏗️',
    category: 'employee',
    targetValue: 2,
    checkFn: (ctx) => ctx.officeLevel,
  },

  // ── 추가 Financial 마일스톤 ──
  {
    id: 'assets_10b',
    title: '100억 돌파',
    description: '총 자산 100억 원 달성! 전설적 투자자!',
    icon: '🌟',
    category: 'financial',
    targetValue: 10_000_000_000,
    checkFn: (ctx) => ctx.totalAssets,
  },
  {
    id: 'assets_50b',
    title: '500억 돌파',
    description: '총 자산 500억 원! 재벌급 자산가!',
    icon: '🏰',
    category: 'financial',
    targetValue: 50_000_000_000,
    checkFn: (ctx) => ctx.totalAssets,
  },
  {
    id: 'realized_profit_1b',
    title: '실현 수익 10억',
    description: '총 실현 수익 10억 원 달성',
    icon: '📈',
    category: 'financial',
    targetValue: 1_000_000_000,
    checkFn: (ctx) => ctx.totalRealizedProfit,
  },
  {
    id: 'cash_1b',
    title: '현금의 제왕',
    description: '현금 보유 10억 원 달성',
    icon: '💵',
    category: 'financial',
    targetValue: 1_000_000_000,
    checkFn: (ctx) => ctx.cash,
  },

  // ── 추가 Time/시대 마일스톤 ──
  {
    id: 'year_1998',
    title: 'IMF 생존',
    description: '1998년 IMF 위기를 견뎌냄',
    icon: '🛡️',
    category: 'time',
    targetValue: 1998,
    checkFn: (ctx) => ctx.currentYear,
  },
  {
    id: 'year_2005',
    title: '10년 투자자',
    description: '10년간 시장에서 살아남음',
    icon: '⏰',
    category: 'time',
    targetValue: 2005,
    checkFn: (ctx) => ctx.currentYear,
  },
  {
    id: 'year_2008',
    title: '금융위기 생존',
    description: '2008년 글로벌 금융위기를 겪음',
    icon: '🌊',
    category: 'time',
    targetValue: 2008,
    checkFn: (ctx) => ctx.currentYear,
  },
  {
    id: 'year_2015',
    title: '20년 베테랑',
    description: '20년간 투자 경력',
    icon: '🎓',
    category: 'time',
    targetValue: 2015,
    checkFn: (ctx) => ctx.currentYear,
  },
  {
    id: 'year_2025',
    title: '30년 전설',
    description: '30년간 시장을 지배한 전설',
    icon: '🏛️',
    category: 'time',
    targetValue: 2025,
    checkFn: (ctx) => ctx.currentYear,
  },

  // ── 추가 Achievement 마일스톤 ──
  {
    id: 'streak_5',
    title: '연승의 기운',
    description: '5연속 수익 거래 달성',
    icon: '🔥',
    category: 'achievement',
    targetValue: 5,
    checkFn: (ctx) => ctx.tradeStreak,
  },
  {
    id: 'streak_10',
    title: '불패의 트레이더',
    description: '10연속 수익 거래 달성!',
    icon: '⚡',
    category: 'achievement',
    targetValue: 10,
    checkFn: (ctx) => ctx.tradeStreak,
  },
  {
    id: 'streak_20',
    title: '전설의 연승',
    description: '20연속 수익 거래! 경이로운 기록!',
    icon: '💫',
    category: 'achievement',
    targetValue: 20,
    checkFn: (ctx) => ctx.tradeStreak,
  },
  {
    id: 'best_day_5',
    title: '대박의 날',
    description: '하루 수익률 5% 이상 기록',
    icon: '🎯',
    category: 'achievement',
    targetValue: 5,
    checkFn: (ctx) => ctx.bestDayChange,
  },
  {
    id: 'best_day_10',
    title: '역사적인 하루',
    description: '하루 수익률 10% 이상 기록!',
    icon: '🚀',
    category: 'achievement',
    targetValue: 10,
    checkFn: (ctx) => ctx.bestDayChange,
  },
  {
    id: 'sector_5',
    title: '섹터 다각화',
    description: '5개 이상 다른 섹터에 투자',
    icon: '🌐',
    category: 'achievement',
    targetValue: 5,
    checkFn: (ctx) => ctx.sectorCount,
  },
  {
    id: 'portfolio_15',
    title: '대형 포트폴리오',
    description: '15개 종목 동시 보유',
    icon: '📋',
    category: 'achievement',
    targetValue: 15,
    checkFn: (ctx) => ctx.portfolioCount,
  },
  {
    id: 'trades_100',
    title: '100번째 거래',
    description: '총 100번의 거래를 완료',
    icon: '🔄',
    category: 'achievement',
    targetValue: 100,
    checkFn: (ctx) => ctx.totalTrades,
  },
  {
    id: 'trades_500',
    title: '거래의 달인',
    description: '총 500번의 거래를 완료!',
    icon: '🎰',
    category: 'achievement',
    targetValue: 500,
    checkFn: (ctx) => ctx.totalTrades,
  },

  // ── 추가 Employee 마일스톤 ──
  {
    id: 'employee_10',
    title: '중견 기업',
    description: '직원 10명 채용',
    icon: '🏙️',
    category: 'employee',
    targetValue: 10,
    checkFn: (ctx) => ctx.employeeCount,
  },
  {
    id: 'employee_15',
    title: '대기업',
    description: '직원 15명 이상의 대기업으로 성장',
    icon: '🏛️',
    category: 'employee',
    targetValue: 15,
    checkFn: (ctx) => ctx.employeeCount,
  },
  {
    id: 'office_3',
    title: '타워 입성',
    description: '사무실 레벨 3 달성! 최고급 오피스!',
    icon: '🏗️',
    category: 'employee',
    targetValue: 3,
    checkFn: (ctx) => ctx.officeLevel,
  },
  {
    id: 'max_employee_level_10',
    title: '시니어 양성',
    description: '직원 레벨 10 이상 달성',
    icon: '⭐',
    category: 'employee',
    targetValue: 10,
    checkFn: (ctx) => ctx.maxEmployeeLevel,
  },
  {
    id: 'max_employee_level_20',
    title: '마스터 양성',
    description: '직원 레벨 20 이상 달성!',
    icon: '🌟',
    category: 'employee',
    targetValue: 20,
    checkFn: (ctx) => ctx.maxEmployeeLevel,
  },
  {
    id: 'corp_skill_3',
    title: '기업 역량 구축',
    description: '기업 스킬 3개 해금',
    icon: '📚',
    category: 'employee',
    targetValue: 3,
    checkFn: (ctx) => ctx.corporateSkillCount,
  },
  {
    id: 'corp_skill_8',
    title: '지식 경영',
    description: '기업 스킬 8개 해금! 체계적 투자 인프라!',
    icon: '🧠',
    category: 'employee',
    targetValue: 8,
    checkFn: (ctx) => ctx.corporateSkillCount,
  },
]

export function createInitialMilestones(): Record<string, Milestone> {
  const milestones: Record<string, Milestone> = {}
  for (const def of MILESTONE_DEFINITIONS) {
    milestones[def.id] = {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      targetValue: def.targetValue,
      isUnlocked: false,
    }
  }
  return milestones
}

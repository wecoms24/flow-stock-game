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

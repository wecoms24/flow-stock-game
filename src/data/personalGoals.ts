/**
 * Personal Goals
 *
 * 연령/역할별 목표 템플릿
 */

import type { PersonalGoal, PersonalGoalType } from '../types/employeeBio'

interface GoalTemplate {
  type: PersonalGoalType
  title: string
  description: string
  targetValue: number
  reward: {
    xpBonus?: number
    satisfactionBonus?: number
    stressReduction?: number
    description: string
  }
  /** 해당 역할만 이 목표를 받음 (undefined면 모든 역할) */
  roles?: string[]
  /** 최소 레벨 */
  minLevel?: number
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  // 급여 목표
  {
    type: 'salary_milestone',
    title: '첫 급여 목표',
    description: '누적 급여 500만원 달성',
    targetValue: 5_000_000,
    reward: { satisfactionBonus: 10, description: '첫 재정 마일스톤!' },
  },
  {
    type: 'salary_milestone',
    title: '높은 급여 목표',
    description: '누적 급여 3,000만원 달성',
    targetValue: 30_000_000,
    reward: { satisfactionBonus: 15, xpBonus: 500, description: '재정적 안정을 찾았다!' },
    minLevel: 5,
  },

  // 레벨 목표
  {
    type: 'level_up',
    title: '주니어 트레이더',
    description: '레벨 5 달성',
    targetValue: 5,
    reward: { xpBonus: 200, satisfactionBonus: 5, description: '한 단계 성장!' },
  },
  {
    type: 'level_up',
    title: '시니어 트레이더',
    description: '레벨 15 달성',
    targetValue: 15,
    reward: { xpBonus: 1000, satisfactionBonus: 15, description: '베테랑의 반열에!' },
    minLevel: 5,
  },
  {
    type: 'level_up',
    title: '마스터 트레이더',
    description: '레벨 30 달성',
    targetValue: 30,
    reward: { xpBonus: 3000, satisfactionBonus: 20, stressReduction: 10, description: '경지에 이르다!' },
    minLevel: 15,
  },

  // 스킬 마스터
  {
    type: 'skill_mastery',
    title: '분석 달인',
    description: '분석 스킬 80 달성',
    targetValue: 80,
    reward: { xpBonus: 500, satisfactionBonus: 10, description: '분석의 경지!' },
    roles: ['analyst'],
    minLevel: 10,
  },
  {
    type: 'skill_mastery',
    title: '트레이딩 달인',
    description: '트레이딩 스킬 80 달성',
    targetValue: 80,
    reward: { xpBonus: 500, satisfactionBonus: 10, description: '매매의 신!' },
    roles: ['trader'],
    minLevel: 10,
  },

  // 근속 기간
  {
    type: 'tenure',
    title: '1년 근속',
    description: '12개월 근속 달성',
    targetValue: 12,
    reward: { satisfactionBonus: 8, stressReduction: 5, description: '1년을 함께!' },
  },
  {
    type: 'tenure',
    title: '3년 베테랑',
    description: '36개월 근속 달성',
    targetValue: 36,
    reward: { xpBonus: 1000, satisfactionBonus: 15, stressReduction: 10, description: '회사의 기둥!' },
  },

  // 거래 성공
  {
    type: 'trade_success',
    title: '첫 성공 거래',
    description: '성공 거래 10회 달성',
    targetValue: 10,
    reward: { xpBonus: 300, satisfactionBonus: 5, description: '거래 감각이 생겼다!' },
    roles: ['analyst', 'trader'],
  },
  {
    type: 'trade_success',
    title: '거래 마스터',
    description: '성공 거래 100회 달성',
    targetValue: 100,
    reward: { xpBonus: 2000, satisfactionBonus: 20, description: '백전백승의 경지!' },
    roles: ['analyst', 'trader'],
    minLevel: 10,
  },
]

/** 직원에게 적합한 목표 2-3개 생성 */
export function generateGoalsForEmployee(
  role: string,
  level: number,
): PersonalGoal[] {
  const eligible = GOAL_TEMPLATES.filter((t) => {
    if (t.roles && !t.roles.includes(role)) return false
    if (t.minLevel && level < t.minLevel) return false
    return true
  })

  // 셔플 후 2-3개 선택
  const shuffled = eligible.sort(() => Math.random() - 0.5)
  const count = Math.min(shuffled.length, 2 + (Math.random() > 0.5 ? 1 : 0))

  return shuffled.slice(0, count).map((t) => ({
    id: `goal_${t.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: t.type,
    title: t.title,
    description: t.description,
    targetValue: t.targetValue,
    currentValue: 0,
    isCompleted: false,
    reward: t.reward,
  }))
}

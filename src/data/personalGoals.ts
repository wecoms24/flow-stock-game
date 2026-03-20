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

  // ── 애널리스트 전용 목표 ──
  {
    type: 'skill_mastery',
    title: 'CFA 자격증 취득',
    description: '분석 스킬 90 달성으로 자격증 획득',
    targetValue: 90,
    reward: { xpBonus: 1500, satisfactionBonus: 20, description: 'CFA 합격! 전문 분석가 인증!' },
    roles: ['analyst'],
    minLevel: 15,
  },
  {
    type: 'level_up',
    title: '리서치 팀장 승진',
    description: '레벨 20 달성으로 팀장 자리에',
    targetValue: 20,
    reward: { xpBonus: 2000, satisfactionBonus: 25, stressReduction: 5, description: '리서치팀을 이끌게 되었다!' },
    roles: ['analyst'],
    minLevel: 10,
  },
  {
    type: 'trade_success',
    title: '독자적 투자 전략 개발',
    description: '성공 거래 50회로 독자 전략 완성',
    targetValue: 50,
    reward: { xpBonus: 1000, satisfactionBonus: 15, description: '나만의 투자 전략이 완성되었다!' },
    roles: ['analyst'],
    minLevel: 5,
  },
  {
    type: 'skill_mastery',
    title: '섹터 전문가',
    description: '리서치 스킬 70 달성',
    targetValue: 70,
    reward: { xpBonus: 800, satisfactionBonus: 12, description: '특정 섹터의 최고 전문가!' },
    roles: ['analyst'],
    minLevel: 8,
  },

  // ── 트레이더 전용 목표 ──
  {
    type: 'trade_success',
    title: '연간 수익률 50% 달성',
    description: '성공 거래 200회 달성',
    targetValue: 200,
    reward: { xpBonus: 3000, satisfactionBonus: 25, description: '전설적인 수익률 달성!' },
    roles: ['trader'],
    minLevel: 15,
  },
  {
    type: 'skill_mastery',
    title: '최저 슬리피지 기록',
    description: '트레이딩 스킬 90 달성',
    targetValue: 90,
    reward: { xpBonus: 1500, satisfactionBonus: 20, description: '슬리피지 최소화의 달인!' },
    roles: ['trader'],
    minLevel: 15,
  },
  {
    type: 'skill_mastery',
    title: '자동매매 시스템 마스터',
    description: '트레이딩 스킬 75 달성',
    targetValue: 75,
    reward: { xpBonus: 1000, satisfactionBonus: 15, description: '알고리즘 매매의 새 지평!' },
    roles: ['trader'],
    minLevel: 8,
  },
  {
    type: 'trade_success',
    title: '무패 연승 도전',
    description: '성공 거래 30회 연속 달성',
    targetValue: 30,
    reward: { xpBonus: 800, satisfactionBonus: 12, description: '연전연승! 흐름을 잡았다!' },
    roles: ['trader'],
    minLevel: 5,
  },
  {
    type: 'level_up',
    title: '수석 트레이더',
    description: '레벨 25 달성',
    targetValue: 25,
    reward: { xpBonus: 2500, satisfactionBonus: 20, description: '트레이딩 데스크의 에이스!' },
    roles: ['trader'],
    minLevel: 15,
  },

  // ── 매니저 전용 목표 ──
  {
    type: 'level_up',
    title: '팀 성과 1위',
    description: '레벨 20 달성으로 최고 팀 구축',
    targetValue: 20,
    reward: { xpBonus: 2000, satisfactionBonus: 20, description: '최고의 팀을 만들었다!' },
    roles: ['manager'],
    minLevel: 10,
  },
  {
    type: 'level_up',
    title: '부서장 승진',
    description: '레벨 28 달성',
    targetValue: 28,
    reward: { xpBonus: 3000, satisfactionBonus: 25, stressReduction: 10, description: '부서를 책임지는 리더가 되었다!' },
    roles: ['manager'],
    minLevel: 18,
  },
  {
    type: 'skill_mastery',
    title: '리스크 제로 월 달성',
    description: '분석 스킬 85 달성으로 완벽한 리스크 관리',
    targetValue: 85,
    reward: { xpBonus: 1200, satisfactionBonus: 18, description: '이번 달 손실 제로! 완벽한 리스크 관리!' },
    roles: ['manager'],
    minLevel: 10,
  },
  {
    type: 'trade_success',
    title: '팀 거래 성과 관리',
    description: '성공 거래 150회 승인 달성',
    targetValue: 150,
    reward: { xpBonus: 1500, satisfactionBonus: 15, description: '팀의 거래를 완벽하게 관리한다!' },
    roles: ['manager'],
    minLevel: 8,
  },
  {
    type: 'skill_mastery',
    title: '포트폴리오 최적화 달인',
    description: '리서치 스킬 80 달성',
    targetValue: 80,
    reward: { xpBonus: 1000, satisfactionBonus: 15, description: '포트폴리오 리밸런싱의 마스터!' },
    roles: ['manager'],
    minLevel: 12,
  },

  // ── 인턴 전용 목표 ──
  {
    type: 'level_up',
    title: '정직원 전환',
    description: '레벨 3 달성으로 정직원 전환',
    targetValue: 3,
    reward: { xpBonus: 500, satisfactionBonus: 20, stressReduction: 10, description: '드디어 정직원이 되었다!' },
    roles: ['intern'],
  },
  {
    type: 'skill_mastery',
    title: '선배에게 인정받기',
    description: '아무 스킬 40 달성',
    targetValue: 40,
    reward: { xpBonus: 300, satisfactionBonus: 15, description: '선배가 칭찬해줬다! 인정받는 기분!' },
    roles: ['intern'],
  },
  {
    type: 'trade_success',
    title: '첫 독자 분석 보고서',
    description: '성공 거래 5회 달성',
    targetValue: 5,
    reward: { xpBonus: 200, satisfactionBonus: 10, description: '나의 첫 분석이 성공했다!' },
    roles: ['intern'],
  },
  {
    type: 'tenure',
    title: '수습 기간 완료',
    description: '3개월 근속',
    targetValue: 3,
    reward: { satisfactionBonus: 12, stressReduction: 8, description: '수습 기간을 무사히 마쳤다!' },
    roles: ['intern'],
  },
  {
    type: 'skill_mastery',
    title: '엑셀 마스터',
    description: '분석 스킬 30 달성',
    targetValue: 30,
    reward: { xpBonus: 150, satisfactionBonus: 8, description: '엑셀 단축키를 모두 외웠다!' },
    roles: ['intern'],
  },

  // ── 공통 고급 목표 ──
  {
    type: 'tenure',
    title: '5년 장기 근속',
    description: '60개월 근속 달성',
    targetValue: 60,
    reward: { xpBonus: 2000, satisfactionBonus: 20, stressReduction: 15, description: '회사와 함께한 5년, 나의 두 번째 집!' },
    minLevel: 10,
  },
  {
    type: 'level_up',
    title: '임원 후보',
    description: '레벨 25 달성',
    targetValue: 25,
    reward: { xpBonus: 2500, satisfactionBonus: 20, description: '임원 후보로 거론되기 시작했다!' },
    minLevel: 15,
  },
  {
    type: 'salary_milestone',
    title: '억대 연봉',
    description: '누적 급여 1억원 달성',
    targetValue: 100_000_000,
    reward: { xpBonus: 1500, satisfactionBonus: 20, description: '드디어 억대 연봉 클럽!' },
    minLevel: 10,
  },
  {
    type: 'trade_success',
    title: '거래 장인',
    description: '성공 거래 500회 달성',
    targetValue: 500,
    reward: { xpBonus: 5000, satisfactionBonus: 25, stressReduction: 10, description: '거래의 신 경지에 도달!' },
    roles: ['analyst', 'trader'],
    minLevel: 20,
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

/**
 * Employee Bio Engine
 *
 * 바이오 생성, 감정 추론, 목표 진행, 이벤트 관리
 */

import type { EmployeeBio, EmotionalState, LifeEvent } from '../types/employeeBio'
import type { Employee } from '../types'
import { generateGoalsForEmployee } from '../data/personalGoals'

const PERSONALITIES = [
  '꼼꼼하고 내성적인 완벽주의자',
  '활발하고 사교적인 팀플레이어',
  '침착하고 논리적인 분석가',
  '열정적이고 도전적인 리더',
  '신중하고 보수적인 안전주의자',
  '창의적이고 직관적인 자유로운 영혼',
  '성실하고 책임감 강한 모범생',
  '야심차고 경쟁적인 승부사',
  '느긋하고 낙천적인 분위기 메이커',
  '예리하고 날카로운 비평가',
]

const BACKSTORIES = [
  '대학에서 경제학을 전공하고 주식 투자 동아리에서 활동했다.',
  '이전 직장에서 스타트업 경험을 쌓고 새로운 도전을 위해 왔다.',
  '수학 올림피아드 출신으로 숫자에 강한 자신감을 가지고 있다.',
  '경영대학원을 졸업하고 금융 업계에 첫 발을 디뎠다.',
  '가업을 이어받기 위해 실전 경험을 쌓으러 왔다.',
  '이공계 출신이지만 금융에 매력을 느껴 전향했다.',
  '해외 유학 후 글로벌 시각으로 시장을 분석한다.',
  '증권사 인턴 경험이 있어 업무 적응이 빠르다.',
  '독학으로 투자를 배워 실전 경험이 풍부하다.',
  '커뮤니케이션 전공으로 팀 내 조율 역할을 자처한다.',
]

/** 새 직원 바이오 생성 */
export function createBio(employee: Employee, currentTick: number): EmployeeBio {
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)]
  const backstory = BACKSTORIES[Math.floor(Math.random() * BACKSTORIES.length)]
  const goals = generateGoalsForEmployee(employee.role, employee.level ?? 1)

  const hiredEvent: LifeEvent = {
    id: `evt_hired_${employee.id}`,
    type: 'hired',
    title: '입사',
    description: `${employee.name}이(가) ${employee.role}로 입사했습니다.`,
    occurredAtTick: currentTick,
    emotionalImpact: 'excited',
  }

  return {
    employeeId: employee.id,
    personality,
    backstory,
    currentEmotion: 'excited',
    emotionHistory: [{ emotion: 'excited', tick: currentTick }],
    goals,
    lifeEvents: [hiredEvent],
    totalTradesParticipated: 0,
    totalSuccessfulTrades: 0,
    monthsEmployed: 0,
    counselingCount: 0,
    lastCounseledTick: 0,
    totalPnlContribution: 0,
    bestTradeProfit: 0,
    bestTradeTicker: '',
    worstTradeProfit: 0,
    worstTradeTicker: '',
    unlockedMilestones: [],
  }
}

/** 스트레스/만족도 기반 감정 추론 */
export function inferEmotion(employee: Employee): EmotionalState {
  const stress = employee.stress ?? 0
  const satisfaction = employee.satisfaction ?? 50
  const stamina = employee.stamina ?? 50

  if (stamina <= 0 || stress >= 90) return 'burned_out'
  if (stress >= 70) return 'stressed'
  if (stress >= 50 && satisfaction < 40) return 'anxious'
  if (satisfaction >= 80 && stress < 30) return 'happy'
  if (satisfaction >= 60) return 'content'
  if (satisfaction >= 40) return 'neutral'
  return 'anxious'
}

/** 목표 진행도 업데이트 */
export function updateGoals(
  bio: EmployeeBio,
  employee: Employee,
  currentTick: number,
): { updatedBio: EmployeeBio; completedGoalTitles: string[] } {
  const completedGoalTitles: string[] = []

  const updatedGoals = bio.goals.map((goal) => {
    if (goal.isCompleted) return goal

    let currentValue = goal.currentValue
    switch (goal.type) {
      case 'level_up':
        currentValue = employee.level ?? 1
        break
      case 'tenure':
        currentValue = bio.monthsEmployed
        break
      case 'trade_success':
        currentValue = bio.totalSuccessfulTrades
        break
      case 'salary_milestone':
        currentValue = (employee.salary ?? 0) * bio.monthsEmployed
        break
      case 'skill_mastery': {
        const skills = employee.skills ?? { analysis: 0, trading: 0, research: 0 }
        currentValue = Math.max(skills.analysis, skills.trading, skills.research)
        break
      }
    }

    const isCompleted = currentValue >= goal.targetValue
    if (isCompleted && !goal.isCompleted) {
      completedGoalTitles.push(goal.title)
    }

    return {
      ...goal,
      currentValue,
      isCompleted,
      completedAt: isCompleted && !goal.isCompleted ? currentTick : goal.completedAt,
    }
  })

  return {
    updatedBio: { ...bio, goals: updatedGoals },
    completedGoalTitles,
  }
}

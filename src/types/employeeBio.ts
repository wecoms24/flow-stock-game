/* ── Employee Bio & Personality System Types ── */

export type EmotionalState =
  | 'happy' // 행복 😊
  | 'content' // 만족 🙂
  | 'neutral' // 보통 😐
  | 'anxious' // 불안 😰
  | 'stressed' // 스트레스 😤
  | 'burned_out' // 번아웃 😵
  | 'excited' // 흥분 🤩
  | 'proud' // 자부심 😎

export const EMOTION_CONFIG: Record<EmotionalState, { icon: string; color: string; label: string }> =
  {
    happy: { icon: '😊', color: '#4CAF50', label: '행복' },
    content: { icon: '🙂', color: '#8BC34A', label: '만족' },
    neutral: { icon: '😐', color: '#9E9E9E', label: '보통' },
    anxious: { icon: '😰', color: '#FF9800', label: '불안' },
    stressed: { icon: '😤', color: '#F44336', label: '스트레스' },
    burned_out: { icon: '😵', color: '#9C27B0', label: '번아웃' },
    excited: { icon: '🤩', color: '#2196F3', label: '흥분' },
    proud: { icon: '😎', color: '#FFD700', label: '자부심' },
  }

export type PersonalGoalType =
  | 'salary_milestone' // 급여 목표
  | 'level_up' // 레벨 달성
  | 'skill_mastery' // 스킬 마스터
  | 'tenure' // 근속 기간
  | 'trade_success' // 성공 거래 횟수
  | 'promotion' // 승진

export interface PersonalGoal {
  id: string
  type: PersonalGoalType
  title: string
  description: string
  targetValue: number
  currentValue: number
  isCompleted: boolean
  completedAt?: number // 완료 틱
  reward?: GoalReward
}

export interface GoalReward {
  xpBonus?: number
  satisfactionBonus?: number
  stressReduction?: number
  description: string
}

export type LifeEventType =
  | 'hired' // 입사
  | 'promoted' // 승진
  | 'goal_completed' // 목표 달성
  | 'praised' // 칭찬 받음
  | 'scolded' // 꾸지람 받음
  | 'counseled' // 상담 받음
  | 'burnout_recovered' // 번아웃 회복
  | 'skill_learned' // 새 스킬 습득
  | 'trade_milestone' // 거래 마일스톤
  | 'anniversary' // 근속 기념일

export interface LifeEvent {
  id: string
  type: LifeEventType
  title: string
  description: string
  occurredAtTick: number
  emotionalImpact?: EmotionalState // 이 이벤트가 유발하는 감정
}

export interface EmployeeBio {
  employeeId: string
  personality: string // 한 줄 성격 요약 (e.g. "꼼꼼하고 내성적인 완벽주의자")
  backstory: string // 2-3줄 배경 이야기
  currentEmotion: EmotionalState
  emotionHistory: Array<{ emotion: EmotionalState; tick: number }> // 최근 10개
  goals: PersonalGoal[]
  lifeEvents: LifeEvent[] // 최근 20개
  totalTradesParticipated: number
  totalSuccessfulTrades: number
  monthsEmployed: number
  counselingCount: number
  lastCounseledTick: number
}

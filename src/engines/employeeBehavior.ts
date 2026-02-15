import type { Employee, EmployeeTrait, GameTime } from '../types'

/* ── Employee Behavior FSM ── */
/* 직원 행동 상태 머신: 스트레스/만족도/성격에 따라 행동 결정
 *
 * 상태: IDLE → WORKING → BREAK → IDLE
 *       IDLE → SOCIALIZING → IDLE
 *       WORKING → MEETING → IDLE
 *       BREAK → COFFEE → IDLE
 *       * → STRESSED_OUT → COUNSELING → IDLE
 *       COUNSELING → RESIGNED (만족도 < 10)
 */

export type EmployeeActionType =
  | 'WORKING'
  | 'IDLE'
  | 'BREAK'
  | 'SOCIALIZING'
  | 'COFFEE'
  | 'MEETING'
  | 'STRESSED_OUT'
  | 'COUNSELING'

export interface EmployeeBehavior {
  employeeId: string
  action: EmployeeActionType
  emoji: string // 현재 행동 이모지
  message?: string // 행동 관련 짧은 메시지
}

/* ── 행동별 이모지/메시지 ── */

const ACTION_CONFIG: Record<
  EmployeeActionType,
  { emoji: string; messages: string[] }
> = {
  WORKING: {
    emoji: '💻',
    messages: ['분석 중...', '차트 확인 중', '보고서 작성 중', '데이터 처리 중'],
  },
  IDLE: {
    emoji: '😐',
    messages: ['...', '뭐 하지', '음...'],
  },
  BREAK: {
    emoji: '😌',
    messages: ['잠깐 쉬자', '스트레칭!', '눈 좀 쉬고'],
  },
  SOCIALIZING: {
    emoji: '🗣️',
    messages: ['수다 중', '잡담 중', '얘기 나누는 중'],
  },
  COFFEE: {
    emoji: '☕',
    messages: ['커피 타임!', '에스프레소 더블', '카페인 충전!'],
  },
  MEETING: {
    emoji: '📋',
    messages: ['회의 중', '미팅 참석', '브리핑 중'],
  },
  STRESSED_OUT: {
    emoji: '😫',
    messages: ['너무 힘들다...', '못 하겠어...', '한계야...'],
  },
  COUNSELING: {
    emoji: '💬',
    messages: ['상담 중', '이야기 듣는 중'],
  },
}

/* ── 행동 가중치 ── */

interface ActionWeights {
  WORKING: number
  IDLE: number
  BREAK: number
  SOCIALIZING: number
  COFFEE: number
  MEETING: number
  STRESSED_OUT: number
  COUNSELING: number
}

function getBaseWeights(stress: number, satisfaction: number): ActionWeights {
  if (stress < 30 && satisfaction > 60) {
    return {
      WORKING: 70, IDLE: 5, BREAK: 5, SOCIALIZING: 10,
      COFFEE: 5, MEETING: 5, STRESSED_OUT: 0, COUNSELING: 0,
    }
  }
  if (stress < 60) {
    return {
      WORKING: 50, IDLE: 5, BREAK: 15, SOCIALIZING: 10,
      COFFEE: 8, MEETING: 5, STRESSED_OUT: 5, COUNSELING: 2,
    }
  }
  // 고스트레스
  return {
    WORKING: 20, IDLE: 10, BREAK: 20, SOCIALIZING: 5,
    COFFEE: 10, MEETING: 3, STRESSED_OUT: 25, COUNSELING: 7,
  }
}

/* ── Trait 가중치 보정 ── */

const TRAIT_MODIFIERS: Partial<Record<EmployeeTrait, Partial<ActionWeights>>> = {
  workaholic: { WORKING: 25, SOCIALIZING: -5, BREAK: -15, STRESSED_OUT: -5 },
  social: { SOCIALIZING: 25, WORKING: -5, BREAK: 5, STRESSED_OUT: -10 },
  introvert: { WORKING: 10, SOCIALIZING: -20, BREAK: 15, STRESSED_OUT: 5 },
  ambitious: { WORKING: 15, MEETING: 5, BREAK: -10, STRESSED_OUT: -5 },
  caffeine_addict: { COFFEE: 15, BREAK: -5 },
  perfectionist: { WORKING: 10, IDLE: -5, MEETING: 5 },
  sensitive: { STRESSED_OUT: 10, BREAK: 5, SOCIALIZING: -5 },
  nocturnal: {},
  tech_savvy: { WORKING: 5 },
  risk_averse: { WORKING: 5, STRESSED_OUT: -5, BREAK: 5 },
}

/* ── 시간대 보정 ── */

function applyTimeModifiers(weights: ActionWeights, time: GameTime): void {
  const tickOfDay = time.tick
  const totalTicksPerDay = 3600

  // 오전 시작 (틱 0-300): 워킹 증가
  if (tickOfDay < 300) {
    weights.WORKING += 10
    weights.IDLE -= 5
  }
  // 점심 시간대 (틱 1200-1600): 휴식/소셜 증가
  else if (tickOfDay >= 1200 && tickOfDay < 1600) {
    weights.BREAK += 15
    weights.SOCIALIZING += 10
    weights.COFFEE += 10
    weights.WORKING -= 15
  }
  // 오후 졸림 (틱 2000-2400): 커피/아이들 증가
  else if (tickOfDay >= 2000 && tickOfDay < 2400) {
    weights.COFFEE += 10
    weights.IDLE += 5
    weights.WORKING -= 5
  }
  // 퇴근 전 (틱 3200-3600): 아이들/소셜 증가
  else if (tickOfDay >= totalTicksPerDay - 400) {
    weights.IDLE += 10
    weights.SOCIALIZING += 5
    weights.WORKING -= 10
  }
}

/* ── 가중 랜덤 선택 ── */

function weightedRandomSelect(weights: ActionWeights): EmployeeActionType {
  // 음수를 0으로 클램프
  const entries = Object.entries(weights) as Array<[EmployeeActionType, number]>
  const clamped = entries.map(([action, w]) => [action, Math.max(0, w)] as const)
  const total = clamped.reduce((sum, [, w]) => sum + w, 0)

  if (total === 0) return 'IDLE'

  let roll = Math.random() * total
  for (const [action, w] of clamped) {
    roll -= w
    if (roll <= 0) return action
  }

  return 'WORKING'
}

/* ── 메인 결정 함수 ── */

export function decideAction(
  employee: Employee,
  neighbors: Employee[],
  time: GameTime,
): EmployeeBehavior {
  const stress = employee.stress ?? 0
  const satisfaction = employee.satisfaction ?? 80

  const weights = getBaseWeights(stress, satisfaction)

  // Trait 보정
  employee.traits?.forEach((trait) => {
    const mod = TRAIT_MODIFIERS[trait]
    if (mod) {
      Object.entries(mod).forEach(([key, val]) => {
        if (val !== undefined) {
          weights[key as keyof ActionWeights] += val
        }
      })
    }
  })

  // 시간대 보정
  applyTimeModifiers(weights, time)

  // 이웃 보정: 이웃이 많으면 social 계열 증가
  if (neighbors.length >= 2) {
    weights.SOCIALIZING += 5
    weights.MEETING += 3
  }

  // 만족도 극히 낮으면 강제 STRESSED_OUT
  if (satisfaction < 20) {
    weights.STRESSED_OUT += 30
    weights.WORKING -= 20
  }

  const action = weightedRandomSelect(weights)
  const config = ACTION_CONFIG[action]

  return {
    employeeId: employee.id,
    action,
    emoji: config.emoji,
    message: config.messages[Math.floor(Math.random() * config.messages.length)],
  }
}

/**
 * 행동에 따른 스탯 효과 반환
 * officeSystem에서 적용
 */
export function getActionEffects(action: EmployeeActionType): {
  staminaDelta: number
  stressDelta: number
  satisfactionDelta: number
  skillMultiplier: number
} {
  switch (action) {
    case 'WORKING':
      return { staminaDelta: -0.05, stressDelta: 0.02, satisfactionDelta: 0.01, skillMultiplier: 1.2 }
    case 'IDLE':
      return { staminaDelta: 0.02, stressDelta: -0.01, satisfactionDelta: -0.005, skillMultiplier: 0 }
    case 'BREAK':
      return { staminaDelta: 0.1, stressDelta: -0.04, satisfactionDelta: 0.02, skillMultiplier: 0 }
    case 'SOCIALIZING':
      return { staminaDelta: 0.03, stressDelta: -0.03, satisfactionDelta: 0.03, skillMultiplier: 0.3 }
    case 'COFFEE':
      return { staminaDelta: 0.15, stressDelta: -0.02, satisfactionDelta: 0.01, skillMultiplier: 0 }
    case 'MEETING':
      return { staminaDelta: -0.02, stressDelta: 0.01, satisfactionDelta: 0.01, skillMultiplier: 0.5 }
    case 'STRESSED_OUT':
      return { staminaDelta: -0.05, stressDelta: 0.03, satisfactionDelta: -0.02, skillMultiplier: 0 }
    case 'COUNSELING':
      return { staminaDelta: 0.08, stressDelta: -0.10, satisfactionDelta: 0.08, skillMultiplier: 0 }
  }
}

import type { Employee, EmployeeRole, EmployeeSkills, EmployeeTrait, GameTime, MarketRegime } from '../types'

/* ── Employee Behavior FSM ── */
/* 직원 행동 상태 머신: 스트레스/만족도/성격/시장상황에 따라 행동 결정
 *
 * 상태: IDLE → WORKING → BREAK → IDLE
 *       IDLE → SOCIALIZING → IDLE
 *       WORKING → MEETING → IDLE
 *       BREAK → COFFEE → IDLE
 *       * → STRESSED_OUT → COUNSELING → IDLE
 *       COUNSELING → RESIGNED (만족도 < 10)
 *       WORKING → STUDYING → IDLE
 *       * → CELEBRATING → IDLE
 *       * → PHONE_CALL → IDLE
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
  | 'CELEBRATING'
  | 'STUDYING'
  | 'PHONE_CALL'

export interface EmployeeBehavior {
  employeeId: string
  action: EmployeeActionType
  emoji: string // 현재 행동 이모지
  message?: string // 행동 관련 짧은 메시지
}

/* ── 역할별 WORKING 메시지 ── */

const ROLE_WORKING_MESSAGES: Record<EmployeeRole, string[]> = {
  analyst: [
    '차트 패턴 분석 중',
    '섹터 리포트 작성 중',
    '재무제표 검토 중',
    'PER/PBR 비교 분석',
    '목표가 산출 중',
    '산업 동향 조사 중',
    '실적 예측 모델링',
    '경쟁사 비교 분석 중',
  ],
  trader: [
    '호가창 모니터링',
    '주문 체결 대기 중',
    '매매 타이밍 포착 중',
    '손절라인 조정 중',
    '체결 내역 확인 중',
    '슬리피지 계산 중',
    '포지션 조정 중',
    '거래량 분석 중',
  ],
  manager: [
    '리스크 보고서 검토 중',
    '포트폴리오 배분 조정',
    '팀 성과 평가 중',
    '제안서 승인/반려 중',
    '리스크 한도 점검 중',
    '투자 전략 수립 중',
    '손익 현황 정리 중',
    '운용 보고서 작성 중',
  ],
  intern: [
    '엑셀 정리 중...',
    '자료 취합 중',
    '데이터 입력 중',
    '선배님 도와드리는 중',
    '회의록 작성 중',
    '복사 중...',
    '기초 분석 연습 중',
    '시장 용어 공부 중',
  ],
  ceo: [
    '전략 회의 준비 중',
    '실적 보고 검토 중',
    '투자 방향 결정 중',
    '이사회 자료 준비',
    '시장 전망 분석 중',
    '핵심 의사결정 중',
    '경영 전략 수립 중',
    '파트너십 검토 중',
  ],
  hr_manager: [
    '인사 평가 중',
    '면접 일정 조율 중',
    '직원 상담 기록 정리',
    '교육 프로그램 기획',
    '복리후생 검토 중',
    '조직문화 개선안 작성',
    '퇴직률 분석 중',
    '채용 공고 검토 중',
  ],
}

/* ── 행동별 이모지/메시지 ── */

const ACTION_CONFIG: Record<
  EmployeeActionType,
  { emoji: string; messages: string[] }
> = {
  WORKING: {
    emoji: '💻',
    messages: [
      '분석 중...',
      '차트 확인 중',
      '보고서 작성 중',
      '데이터 처리 중',
      '스프레드시트 작업 중',
      '시장 데이터 수집 중',
      '리포트 마감 임박!',
      '집중 모드 ON',
      '코드 리뷰 중',
      '모델 검증 중',
    ],
  },
  IDLE: {
    emoji: '😐',
    messages: ['...', '뭐 하지', '음...', '할 일이 없네', '멍...', '창 밖 구경 중', '딴 생각 중'],
  },
  BREAK: {
    emoji: '😌',
    messages: [
      '잠깐 쉬자',
      '스트레칭!',
      '눈 좀 쉬고',
      '5분만 쉬자',
      '허리 펴기',
      '산책 다녀올까',
      '잠깐 눈 감자...',
      '심호흡~',
    ],
  },
  SOCIALIZING: {
    emoji: '🗣️',
    messages: [
      '수다 중',
      '잡담 중',
      '얘기 나누는 중',
      '어제 삼성 올랐다며?',
      '요즘 AI주 장난 아니야',
      '금리 또 올린대',
      '그 종목 어떻게 됐어?',
      '코스피 3000 갈까?',
      '환율 미쳤다 진짜',
      '배당주 괜찮은 거 없나',
    ],
  },
  COFFEE: {
    emoji: '☕',
    messages: [
      '커피 타임!',
      '에스프레소 더블',
      '카페인 충전!',
      '바닐라 라떼!',
      '아이스만 마셔',
      '카페인 없으면 못 살아',
      '오늘 세 번째 커피...',
      '디카페인은 커피가 아니야',
      '핸드드립 내리는 중',
      '설탕 두 스푼!',
    ],
  },
  MEETING: {
    emoji: '📋',
    messages: [
      '회의 중',
      '미팅 참석',
      '브리핑 중',
      '전략 회의 중',
      '주간 리뷰 미팅',
      '실적 보고 중',
      '투자위원회 참석',
      '긴급 회의 소집',
      '팀 미팅 진행 중',
    ],
  },
  STRESSED_OUT: {
    emoji: '😫',
    messages: [
      '너무 힘들다...',
      '못 하겠어...',
      '한계야...',
      '야근 싫다...',
      '포지션이 불안해',
      '시장이 미쳤어',
      '실적 압박...',
      '번아웃 올 것 같아',
      '머리가 안 돌아가',
      '퇴사 생각 중...',
    ],
  },
  COUNSELING: {
    emoji: '💬',
    messages: [
      '상담 중',
      '이야기 듣는 중',
      '고민 상담 중',
      '마음 터놓는 중',
      '조언 듣는 중',
      '해결책 찾는 중',
    ],
  },
  CELEBRATING: {
    emoji: '🎉',
    messages: [
      '좋은 실적 축하!',
      '대박 수익!',
      '목표 달성!',
      '팀 성과 기념!',
      '승진 축하해!',
      '오늘 회식이다!',
      '분기 실적 최고!',
      '포트폴리오 신고가!',
    ],
  },
  STUDYING: {
    emoji: '📖',
    messages: [
      '자습 중',
      'CFA 교재 읽는 중',
      '리서치 페이퍼 읽는 중',
      '새 분석 기법 공부',
      '파이썬 코딩 연습',
      '재무 모델링 학습',
      '시장 이론 복습 중',
      '투자론 교과서 정독',
      '뉴스레터 읽는 중',
      '업계 보고서 스터디',
    ],
  },
  PHONE_CALL: {
    emoji: '📱',
    messages: [
      '전화 통화 중',
      '고객 상담 전화',
      '증권사 통화 중',
      '본사 보고 전화',
      '정보 교환 통화',
      '긴급 연락 받는 중',
      '컨퍼런스 콜 참여',
      '해외 지사 통화',
    ],
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
  CELEBRATING: number
  STUDYING: number
  PHONE_CALL: number
}

function getBaseWeights(stress: number, satisfaction: number): ActionWeights {
  if (stress < 30 && satisfaction > 60) {
    return {
      WORKING: 60, IDLE: 4, BREAK: 4, SOCIALIZING: 8,
      COFFEE: 4, MEETING: 4, STRESSED_OUT: 0, COUNSELING: 0,
      CELEBRATING: 5, STUDYING: 6, PHONE_CALL: 5,
    }
  }
  if (stress < 60) {
    return {
      WORKING: 42, IDLE: 4, BREAK: 12, SOCIALIZING: 8,
      COFFEE: 6, MEETING: 4, STRESSED_OUT: 4, COUNSELING: 2,
      CELEBRATING: 3, STUDYING: 8, PHONE_CALL: 7,
    }
  }
  // 고스트레스
  return {
    WORKING: 16, IDLE: 8, BREAK: 16, SOCIALIZING: 4,
    COFFEE: 8, MEETING: 3, STRESSED_OUT: 22, COUNSELING: 6,
    CELEBRATING: 1, STUDYING: 5, PHONE_CALL: 11,
  }
}

/* ── Trait 가중치 보정 ── */

const TRAIT_MODIFIERS: Partial<Record<EmployeeTrait, Partial<ActionWeights>>> = {
  workaholic: { WORKING: 25, SOCIALIZING: -5, BREAK: -15, STRESSED_OUT: -5, STUDYING: 5 },
  social: { SOCIALIZING: 25, WORKING: -5, BREAK: 5, STRESSED_OUT: -10, PHONE_CALL: 5 },
  introvert: { WORKING: 10, SOCIALIZING: -20, BREAK: 15, STRESSED_OUT: 5, STUDYING: 10 },
  ambitious: { WORKING: 15, MEETING: 5, BREAK: -10, STRESSED_OUT: -5, STUDYING: 8, CELEBRATING: 3 },
  caffeine_addict: { COFFEE: 15, BREAK: -5 },
  perfectionist: { WORKING: 10, IDLE: -5, MEETING: 5, STUDYING: 8 },
  sensitive: { STRESSED_OUT: 10, BREAK: 5, SOCIALIZING: -5, PHONE_CALL: -3 },
  nocturnal: {},
  tech_savvy: { WORKING: 5, STUDYING: 5 },
  risk_averse: { WORKING: 5, STRESSED_OUT: -5, BREAK: 5, STUDYING: 3 },
}

/* ── 시간대 보정 ── */

function applyTimeModifiers(weights: ActionWeights, time: GameTime): void {
  const hour = time.hour

  // 출근 직후 (9-10시): 워킹 증가, 높은 에너지
  if (hour <= 10) {
    weights.WORKING += 10
    weights.IDLE -= 5
  }
  // 점심 시간대 (12시): 휴식/소셜 증가
  else if (hour === 12) {
    weights.BREAK += 15
    weights.SOCIALIZING += 10
    weights.COFFEE += 10
    weights.WORKING -= 15
    weights.PHONE_CALL += 5
  }
  // 점심 후 졸음 (13시): 커피/아이들 증가
  else if (hour === 13) {
    weights.COFFEE += 10
    weights.IDLE += 5
    weights.WORKING -= 5
    weights.STUDYING += 3
  }
  // 오후 집중 시간 (14-15시): 작업/학습 증가
  else if (hour === 14 || hour === 15) {
    weights.WORKING += 5
    weights.STUDYING += 5
    weights.PHONE_CALL += 3
  }
  // 오후 슬럼프 (16시): 커피/아이들 증가
  else if (hour === 16) {
    weights.COFFEE += 10
    weights.IDLE += 5
    weights.WORKING -= 5
  }
  // 퇴근 시간 (17-18시): 아이들/소셜 증가
  else if (hour >= 17) {
    weights.IDLE += 10
    weights.SOCIALIZING += 5
    weights.WORKING -= 10
    weights.CELEBRATING += 3
  }
}

/* ── 시장 상황 보정 ── */

function applyMarketRegimeModifiers(weights: ActionWeights, regime: MarketRegime): void {
  switch (regime) {
    case 'CRISIS':
      weights.STRESSED_OUT += 20
      weights.WORKING -= 10
      weights.MEETING += 10
      weights.PHONE_CALL += 8
      weights.SOCIALIZING -= 5
      weights.CELEBRATING -= 5
      break
    case 'VOLATILE':
      weights.WORKING += 5
      weights.COFFEE += 5
      weights.PHONE_CALL += 3
      weights.STUDYING += 3
      weights.CELEBRATING -= 2
      break
    case 'CALM':
      weights.SOCIALIZING += 5
      weights.BREAK += 5
      weights.STUDYING += 3
      weights.CELEBRATING += 2
      break
  }
}

/* ── 퍼포먼스 기반 보정 ── */

function applyPerformanceModifiers(weights: ActionWeights, employee: Employee): void {
  const skills = employee.skills
  if (!skills) return

  // 역할별 핵심 스킬 확인
  const roleSkillMap: Record<EmployeeRole, keyof EmployeeSkills> = {
    analyst: 'analysis',
    trader: 'trading',
    manager: 'research',
    intern: 'analysis',
    ceo: 'analysis',
    hr_manager: 'research',
  }

  const primarySkill = roleSkillMap[employee.role]
  const skillValue = primarySkill ? skills[primarySkill] : 0

  // 낮은 스킬 (<30): 학습 필요
  if (skillValue < 30) {
    weights.STUDYING += 15
    weights.WORKING -= 5
  }
  // 높은 스킬 (>80): 멘토링/리더십 행동 (회의/소셜 통해 표현)
  else if (skillValue > 80) {
    weights.MEETING += 5
    weights.SOCIALIZING += 3
    weights.CELEBRATING += 2
    weights.PHONE_CALL += 3
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

/* ── 역할별 메시지 선택 ── */

function getWorkingMessage(employee: Employee): string {
  const roleMessages = ROLE_WORKING_MESSAGES[employee.role]
  if (roleMessages && roleMessages.length > 0) {
    // 80% 확률로 역할별 메시지, 20% 확률로 일반 메시지
    if (Math.random() < 0.8) {
      return roleMessages[Math.floor(Math.random() * roleMessages.length)]
    }
  }
  const generic = ACTION_CONFIG.WORKING.messages
  return generic[Math.floor(Math.random() * generic.length)]
}

/* ── 메인 결정 함수 ── */

export function decideAction(
  employee: Employee,
  neighbors: Employee[],
  time: GameTime,
  marketRegime?: MarketRegime,
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

  // 시장 상황 보정
  if (marketRegime) {
    applyMarketRegimeModifiers(weights, marketRegime)
  }

  // 퍼포먼스 기반 보정
  applyPerformanceModifiers(weights, employee)

  // 이웃 보정: 이웃이 많으면 social 계열 증가
  if (neighbors.length >= 2) {
    weights.SOCIALIZING += 5
    weights.MEETING += 3
    weights.CELEBRATING += 2
  }

  // 만족도 극히 낮으면 강제 STRESSED_OUT
  if (satisfaction < 20) {
    weights.STRESSED_OUT += 30
    weights.WORKING -= 20
  }

  // 만족도 높으면 축하 확률 증가
  if (satisfaction > 85) {
    weights.CELEBRATING += 5
  }

  const action = weightedRandomSelect(weights)
  const config = ACTION_CONFIG[action]

  // WORKING일 때 역할별 메시지 선택
  const message = action === 'WORKING'
    ? getWorkingMessage(employee)
    : config.messages[Math.floor(Math.random() * config.messages.length)]

  return {
    employeeId: employee.id,
    action,
    emoji: config.emoji,
    message,
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
    case 'CELEBRATING':
      return { staminaDelta: 0.05, stressDelta: -0.05, satisfactionDelta: 0.05, skillMultiplier: 0.1 }
    case 'STUDYING':
      return { staminaDelta: -0.03, stressDelta: 0.01, satisfactionDelta: 0.02, skillMultiplier: 0.8 }
    case 'PHONE_CALL':
      return { staminaDelta: -0.01, stressDelta: 0.01, satisfactionDelta: 0.0, skillMultiplier: 0.2 }
  }
}

/* ── 경고 시스템 ── */

// 스트레스 연속 카운터 (employeeId → 연속 high-stress 체크 횟수)
const stressStreakMap: Map<string, number> = new Map()

/**
 * 직원 경고 체크 - 높은 스트레스나 낮은 만족도 감지
 * @param employee 대상 직원
 * @param monthlyPerformance 월 실적 (향후 확장용, 현재 미사용)
 * @returns 경고 정보 또는 null
 */
export function checkWarning(
  employee: Employee,
  _monthlyPerformance?: number,
): { warned: boolean; reason: string } | null {
  const stress = employee.stress ?? 0
  const satisfaction = employee.satisfaction ?? 80

  // 스트레스 연속 체크
  if (stress > 80) {
    const prev = stressStreakMap.get(employee.id) ?? 0
    stressStreakMap.set(employee.id, prev + 1)
  } else {
    stressStreakMap.set(employee.id, 0)
  }

  const streak = stressStreakMap.get(employee.id) ?? 0

  // 3회 이상 연속 고스트레스
  if (streak >= 3) {
    return {
      warned: true,
      reason: `${employee.name}: 스트레스가 지속적으로 매우 높습니다 (${Math.round(stress)}). 즉시 조치가 필요합니다.`,
    }
  }

  // 만족도 극히 낮음
  if (satisfaction < 30) {
    return {
      warned: true,
      reason: `${employee.name}: 직무 만족도가 매우 낮습니다 (${Math.round(satisfaction)}). 면담을 권장합니다.`,
    }
  }

  return null
}

/* ── 퇴사 체크 ── */

/**
 * 직원 퇴사 가능성 체크 - 매우 보수적으로 판정
 * ALL 조건이 동시에 충족되어야 하며, 그래도 5% 확률만 적용
 * @param employee 대상 직원
 * @returns 퇴사 정보 또는 null
 */
export function checkResignation(
  employee: Employee,
): { resigns: boolean; reason: string } | null {
  const stress = employee.stress ?? 0
  const satisfaction = employee.satisfaction ?? 80
  const level = employee.level ?? 1
  const hiredMonth = employee.hiredMonth ?? 0

  // 모든 조건 동시 충족 필요:
  // 1. 극도로 낮은 만족도
  if (satisfaction >= 15) return null
  // 2. 극심한 스트레스
  if (stress <= 90) return null
  // 3. 최소 3개월 근무 (신입은 쉽게 떠나지 않음, level 또는 hiredMonth로 체크)
  if (level <= 0 && hiredMonth < 3) return null
  // 4. 5% 확률 적용 (극단적 조건이라도 대부분은 버팀)
  if (Math.random() > 0.05) return null

  const reasons = [
    '극심한 스트레스와 낮은 만족도로 퇴사를 결심했습니다.',
    '더 이상 견딜 수 없어 사직서를 제출했습니다.',
    '건강 악화와 번아웃으로 퇴사를 선택했습니다.',
    '근무 환경에 한계를 느끼고 떠나기로 했습니다.',
  ]

  return {
    resigns: true,
    reason: `${employee.name}: ${reasons[Math.floor(Math.random() * reasons.length)]}`,
  }
}

/**
 * 경고/퇴사 시스템 쿨다운 정리 (직원 해고/퇴사 시 호출)
 */
export function cleanupBehaviorState(employeeId: string): void {
  stressStreakMap.delete(employeeId)
}

/**
 * 경고/퇴사 시스템 리셋
 */
export function resetBehaviorState(): void {
  stressStreakMap.clear()
}

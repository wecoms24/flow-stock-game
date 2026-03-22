import { NEGOTIATION_CONFIG } from '../config/negotiationConfig'
import type { Employee } from '../types'
import type { NegotiationState, RhythmNote } from '../types/negotiation'

/**
 * 연봉 인상 요구액 계산
 * BASE_RAISE_DEMAND + (level * LEVEL_RAISE_BONUS) + 성과 보너스
 * 최대 MAX_RAISE_DEMAND 캡
 */
export function calculateRaiseDemand(employee: Employee): number {
  const {
    BASE_RAISE_DEMAND,
    LEVEL_RAISE_BONUS,
    PERFORMANCE_RAISE_BONUS,
    MAX_RAISE_DEMAND,
  } = NEGOTIATION_CONFIG

  const level = employee.level ?? 1
  let demand = BASE_RAISE_DEMAND + (level - 1) * LEVEL_RAISE_BONUS

  // 성과 보너스: 만족도 70 이상이면 추가 요구
  const satisfaction = employee.satisfaction ?? 50
  if (satisfaction >= 70) {
    demand += PERFORMANCE_RAISE_BONUS
  }

  // 스킬 평균이 높으면 추가 요구 (자신감)
  const skills = employee.skills
  if (skills) {
    const avgSkill = (skills.analysis + skills.trading + skills.research) / 3
    if (avgSkill >= 60) {
      demand += 0.02
    }
  }

  return Math.min(demand, MAX_RAISE_DEMAND)
}

/**
 * 리듬 노트 패턴 생성
 * 레벨에 비례한 노트 수 (MIN_NOTES ~ MAX_NOTES)
 * 균등 분포 + 약간의 랜덤성
 * 4레인 랜덤 배정
 */
export function generateRhythmNotes(employeeLevel: number): RhythmNote[] {
  const { MIN_NOTES, MAX_NOTES, RHYTHM_DURATION_MS } = NEGOTIATION_CONFIG

  // 레벨에 비례한 노트 수 (level 1 → MIN_NOTES, level 30 → MAX_NOTES)
  const levelRatio = Math.min((employeeLevel - 1) / 29, 1)
  const noteCount = Math.round(MIN_NOTES + levelRatio * (MAX_NOTES - MIN_NOTES))

  const notes: RhythmNote[] = []
  const interval = RHYTHM_DURATION_MS / (noteCount + 1)

  for (let i = 0; i < noteCount; i++) {
    // 균등 분포 + ±20% 랜덤 오프셋
    const baseTime = interval * (i + 1)
    const jitter = (Math.random() - 0.5) * interval * 0.4
    const time = Math.max(500, Math.min(RHYTHM_DURATION_MS - 500, baseTime + jitter))

    const lane = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3

    notes.push({ lane, time })
  }

  // 시간순 정렬
  notes.sort((a, b) => a.time - b.time)

  return notes
}

/**
 * 키 입력 판정
 * perfect: ±50ms 이내
 * good: ±120ms 이내
 * miss: 그 외
 */
export function judgeHit(
  note: RhythmNote,
  inputTime: number,
): 'perfect' | 'good' | 'miss' {
  const { HIT_WINDOW_PERFECT, HIT_WINDOW_GOOD } = NEGOTIATION_CONFIG
  const diff = Math.abs(note.time - inputTime)

  if (diff <= HIT_WINDOW_PERFECT) return 'perfect'
  if (diff <= HIT_WINDOW_GOOD) return 'good'
  return 'miss'
}

/**
 * 점수 계산
 * perfect = 100점, good = 60점, miss = 0점 (평균)
 */
export function calculateScore(notes: RhythmNote[]): number {
  if (notes.length === 0) return 0

  let totalScore = 0
  for (const note of notes) {
    if (note.hit === 'perfect') totalScore += 100
    else if (note.hit === 'good') totalScore += 60
    // miss = 0
  }

  return Math.round(totalScore / notes.length)
}

/**
 * 결과 결정
 * 80점 이상 → full (전액 승인)
 * 50~79 → partial (절충)
 * 49 이하 → rejected (거절)
 */
export function determineResult(
  score: number,
  demandedRaise: number,
): { result: 'full' | 'partial' | 'rejected'; finalRaise: number } {
  const { SCORE_FULL_APPROVE, SCORE_PARTIAL_MIN, PARTIAL_RAISE_RATIO } = NEGOTIATION_CONFIG

  if (score >= SCORE_FULL_APPROVE) {
    return { result: 'full', finalRaise: demandedRaise }
  }

  if (score >= SCORE_PARTIAL_MIN) {
    return {
      result: 'partial',
      finalRaise: Math.round(demandedRaise * PARTIAL_RAISE_RATIO * 100) / 100,
    }
  }

  return { result: 'rejected', finalRaise: 0 }
}

/**
 * 협상 시작 대상 직원 필터
 * lastNegotiationMonth가 없거나 (currentMonth - lastNegotiationMonth >= TRIGGER_INTERVAL_MONTHS)인 직원
 */
export function getEmployeesNeedingNegotiation(
  employees: Employee[],
  currentMonth: number,
): Employee[] {
  const { TRIGGER_INTERVAL_MONTHS } = NEGOTIATION_CONFIG

  return employees.filter((emp) => {
    // 인턴, CEO는 협상 대상이 아님
    if (emp.role === 'intern' || emp.role === 'ceo') return false

    const lastNeg = (emp as Employee & { lastNegotiationMonth?: number }).lastNegotiationMonth
    if (lastNeg == null) {
      // 첫 협상: 고용 후 최소 TRIGGER_INTERVAL_MONTHS개월 경과
      return currentMonth - emp.hiredMonth >= TRIGGER_INTERVAL_MONTHS
    }

    return currentMonth - lastNeg >= TRIGGER_INTERVAL_MONTHS
  })
}

/**
 * NegotiationState 초기 상태 생성
 */
export function createNegotiationState(employee: Employee): NegotiationState {
  const demandedRaise = calculateRaiseDemand(employee)
  const rhythmNotes = generateRhythmNotes(employee.level ?? 1)

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    currentSalary: employee.salary,
    demandedRaise,
    phase: 'intro',
    rhythmNotes,
    score: 0,
    startTime: 0,
  }
}

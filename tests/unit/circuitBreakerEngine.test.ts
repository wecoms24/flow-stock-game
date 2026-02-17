/* ── Circuit Breaker Engine Unit Tests ── */
import { describe, it, expect } from 'vitest'
import {
  initializeCircuitBreakerState,
  calculateKOSPIIndex,
  checkCircuitBreaker,
  resetCircuitBreakerForNewDay,
  isTradingHalted,
  getCircuitBreakerMessage,
} from '../../src/engines/circuitBreakerEngine'
import { CIRCUIT_BREAKER_CONFIG } from '../../src/config/priceLimit'
import type { GameTime } from '../../src/types'

const mockTime: GameTime = {
  year: 1995,
  month: 1,
  day: 1,
  hour: 10,
  minute: 30,
  tick: 100,
  speed: 1,
  isPaused: false,
  dayOfWeek: 1,
}

/* ──────────────────────────────────────────────── */
describe('initializeCircuitBreakerState', () => {
  it('초기 상태가 올바르게 설정됨', () => {
    const state = initializeCircuitBreakerState()
    expect(state.level).toBe(0)
    expect(state.isActive).toBe(false)
    expect(state.remainingTicks).toBe(0)
    expect(state.triggeredAt).toBeNull()
    expect(state.kospiSessionOpen).toBe(100)
    expect(state.kospiCurrent).toBe(100)
    expect(state.triggeredLevels).toEqual([])
  })
})

/* ──────────────────────────────────────────────── */
describe('calculateKOSPIIndex', () => {
  it('빈 배열이면 100 반환', () => {
    expect(calculateKOSPIIndex([])).toBe(100)
  })

  it('가격 변동 없으면 100 반환', () => {
    const companies = [
      { price: 10000, basePrice: 10000, marketCap: 1_000_000 },
      { price: 20000, basePrice: 20000, marketCap: 2_000_000 },
    ]
    expect(calculateKOSPIIndex(companies)).toBe(100)
  })

  it('시가총액 가중 지수 계산', () => {
    // Company A: +10% (weight 1/3), Company B: -5% (weight 2/3)
    // Weighted return = 0.1 * (1/3) + (-0.05) * (2/3) = 0.0333 - 0.0333 = 0
    const companies = [
      { price: 11000, basePrice: 10000, marketCap: 1_000_000 },
      { price: 19000, basePrice: 20000, marketCap: 2_000_000 },
    ]
    const index = calculateKOSPIIndex(companies)
    // 100 * (1 + 0.1*1/3 + (-0.05)*2/3) = 100 * (1 + 0.0333 - 0.0333) = 100
    expect(index).toBeCloseTo(100, 1)
  })

  it('전체 하락 시 지수 100 미만', () => {
    const companies = [
      { price: 9000, basePrice: 10000, marketCap: 1_000_000 }, // -10%
    ]
    const index = calculateKOSPIIndex(companies)
    expect(index).toBe(90) // 100 * (1 + (-0.1)) = 90
  })
})

/* ──────────────────────────────────────────────── */
describe('checkCircuitBreaker — triggeredLevels re-entry prevention', () => {
  it('Level 1 트리거 (-8%)', () => {
    const state = initializeCircuitBreakerState()
    const result = checkCircuitBreaker(92, 100, state, mockTime)

    expect(result.level).toBe(1)
    expect(result.isActive).toBe(true)
    expect(result.remainingTicks).toBe(CIRCUIT_BREAKER_CONFIG.LEVEL_1.haltDuration)
    expect(result.triggeredLevels).toContain(1)
  })

  it('Level 2 트리거 (-15%)', () => {
    const state = initializeCircuitBreakerState()
    const result = checkCircuitBreaker(85, 100, state, mockTime)

    expect(result.level).toBe(2)
    expect(result.isActive).toBe(true)
    expect(result.remainingTicks).toBe(CIRCUIT_BREAKER_CONFIG.LEVEL_2.haltDuration)
    expect(result.triggeredLevels).toContain(2)
  })

  it('Level 3 트리거 (-20%)', () => {
    const state = initializeCircuitBreakerState()
    const result = checkCircuitBreaker(80, 100, state, mockTime)

    expect(result.level).toBe(3)
    expect(result.isActive).toBe(true)
    expect(result.triggeredLevels).toContain(3)
  })

  it('이미 트리거된 레벨은 재트리거 안 됨 (re-entry prevention)', () => {
    // Level 1이 이미 발동됐고, 해제된 상태에서 다시 -8% 진입
    const state = {
      ...initializeCircuitBreakerState(),
      triggeredLevels: [1], // Level 1 already triggered today
    }
    const result = checkCircuitBreaker(92, 100, state, mockTime)

    // Level 1이 재트리거되면 안 됨 → level 0 유지
    expect(result.level).toBe(0)
    expect(result.isActive).toBe(false)
    expect(result.triggeredLevels).toEqual([1]) // 기존 기록 유지
  })

  it('Level 1 이미 발동 → Level 2까지 하락 시 Level 2만 발동', () => {
    const state = {
      ...initializeCircuitBreakerState(),
      triggeredLevels: [1], // Level 1 already triggered
    }
    const result = checkCircuitBreaker(85, 100, state, mockTime)

    expect(result.level).toBe(2)
    expect(result.isActive).toBe(true)
    expect(result.triggeredLevels).toEqual([1, 2]) // 1은 유지, 2 추가
  })

  it('Level 1,2 이미 발동 → Level 3까지 하락 시 Level 3만 발동', () => {
    const state = {
      ...initializeCircuitBreakerState(),
      triggeredLevels: [1, 2],
    }
    const result = checkCircuitBreaker(80, 100, state, mockTime)

    expect(result.level).toBe(3)
    expect(result.triggeredLevels).toEqual([1, 2, 3])
  })

  it('모든 레벨 이미 발동 → 더 이상 트리거 없음', () => {
    const state = {
      ...initializeCircuitBreakerState(),
      triggeredLevels: [1, 2, 3],
    }
    const result = checkCircuitBreaker(75, 100, state, mockTime) // -25%

    expect(result.level).toBe(0)
    expect(result.isActive).toBe(false)
    expect(result.triggeredLevels).toEqual([1, 2, 3])
  })

  it('변동 없으면 트리거 안 됨', () => {
    const state = initializeCircuitBreakerState()
    const result = checkCircuitBreaker(98, 100, state, mockTime) // -2%

    expect(result.level).toBe(0)
    expect(result.isActive).toBe(false)
    expect(result.triggeredLevels).toEqual([])
  })

  it('상승 시 트리거 안 됨', () => {
    const state = initializeCircuitBreakerState()
    const result = checkCircuitBreaker(120, 100, state, mockTime) // +20%

    expect(result.level).toBe(0)
    expect(result.isActive).toBe(false)
  })
})

/* ──────────────────────────────────────────────── */
describe('checkCircuitBreaker — halt countdown', () => {
  it('활성 상태에서 remainingTicks 감소', () => {
    const activeState = {
      level: 1 as const,
      isActive: true,
      remainingTicks: 10,
      triggeredAt: mockTime,
      kospiSessionOpen: 100,
      kospiCurrent: 92,
      triggeredLevels: [1],
    }
    const result = checkCircuitBreaker(93, 100, activeState, mockTime)

    expect(result.remainingTicks).toBe(9)
    expect(result.isActive).toBe(true)
  })

  it('remainingTicks 1이면 해제', () => {
    const activeState = {
      level: 1 as const,
      isActive: true,
      remainingTicks: 1,
      triggeredAt: mockTime,
      kospiSessionOpen: 100,
      kospiCurrent: 92,
      triggeredLevels: [1],
    }
    const result = checkCircuitBreaker(93, 100, activeState, mockTime)

    expect(result.remainingTicks).toBe(0)
    expect(result.isActive).toBe(false)
  })
})

/* ──────────────────────────────────────────────── */
describe('resetCircuitBreakerForNewDay', () => {
  it('새 세션에서 triggeredLevels 초기화', () => {
    const state = resetCircuitBreakerForNewDay(105)

    expect(state.level).toBe(0)
    expect(state.isActive).toBe(false)
    expect(state.remainingTicks).toBe(0)
    expect(state.kospiSessionOpen).toBe(105)
    expect(state.kospiCurrent).toBe(105)
    expect(state.triggeredLevels).toEqual([]) // 일별 초기화
  })
})

/* ──────────────────────────────────────────────── */
describe('isTradingHalted', () => {
  it('active + remainingTicks > 0이면 halted', () => {
    const state = {
      ...initializeCircuitBreakerState(),
      isActive: true,
      remainingTicks: 5,
    }
    expect(isTradingHalted(state)).toBe(true)
  })

  it('inactive이면 not halted', () => {
    const state = initializeCircuitBreakerState()
    expect(isTradingHalted(state)).toBe(false)
  })

  it('active but remainingTicks 0이면 not halted', () => {
    const state = {
      ...initializeCircuitBreakerState(),
      isActive: true,
      remainingTicks: 0,
    }
    expect(isTradingHalted(state)).toBe(false)
  })
})

/* ──────────────────────────────────────────────── */
describe('getCircuitBreakerMessage', () => {
  it('비활성이면 빈 문자열', () => {
    const state = initializeCircuitBreakerState()
    expect(getCircuitBreakerMessage(state)).toBe('')
  })

  it('Level 1 메시지', () => {
    const state = {
      ...initializeCircuitBreakerState(),
      level: 1 as const,
      isActive: true,
      remainingTicks: 30,
      kospiSessionOpen: 100,
      kospiCurrent: 91,
    }
    const msg = getCircuitBreakerMessage(state)
    expect(msg).toContain('Level 1')
    expect(msg).toContain('-9.0%')
  })

  it('Level 3 메시지에 장 마감 포함', () => {
    const state = {
      ...initializeCircuitBreakerState(),
      level: 3 as const,
      isActive: true,
      remainingTicks: Infinity,
      kospiSessionOpen: 100,
      kospiCurrent: 78,
    }
    const msg = getCircuitBreakerMessage(state)
    expect(msg).toContain('Level 3')
    expect(msg).toContain('장 마감')
  })
})

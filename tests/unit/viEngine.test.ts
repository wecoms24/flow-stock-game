/* ── VI Engine Unit Tests ── */
import { describe, it, expect } from 'vitest'
import {
  checkVITrigger,
  updateVIState,
  triggerVI,
  isVIHalted,
  getVIRemainingTicks,
  resetVIForNewDay,
} from '../../src/engines/viEngine'
import { VI_CONFIG } from '../../src/config/priceLimit'
import type { Company } from '../../src/types'

/** Minimal company stub with VI fields */
function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'test-co',
    name: 'Test Corp',
    ticker: 'TST',
    sector: 'tech',
    price: 10000,
    basePrice: 10000,
    drift: 0,
    volatility: 0.2,
    marketCap: 1_000_000_000,
    status: 'active',
    sessionOpenPrice: 10000,
    financials: {
      revenue: 100,
      netIncome: 10,
      debtRatio: 0.5,
      growthRate: 0.05,
      eps: 1000,
    },
    institutionFlow: {
      netBuyVolume: 0,
      topBuyers: [],
      topSellers: [],
      institutionalOwnership: 0.3,
    },
    viTriggered: false,
    viCooldown: 0,
    viRecentPrices: [],
    ...overrides,
  } as Company
}

/* ──────────────────────────────────────────────── */
describe('checkVITrigger', () => {
  it('3% 이상 변동 시 VI 트리거', () => {
    const company = makeCompany({
      price: 10400, // +4% from 10000
      viRecentPrices: [10000, 10100, 10200], // 3 price points
    })
    expect(checkVITrigger(company)).toBe(true)
  })

  it('3% 미만 변동 시 VI 미트리거', () => {
    const company = makeCompany({
      price: 10200, // +2% from 10000
      viRecentPrices: [10000, 10050, 10100],
    })
    expect(checkVITrigger(company)).toBe(false)
  })

  it('이미 VI 발동 중이면 트리거 안 함', () => {
    const company = makeCompany({
      price: 10500,
      viTriggered: true,
      viCooldown: 3,
      viRecentPrices: [10000, 10100, 10200],
    })
    expect(checkVITrigger(company)).toBe(false)
  })

  it('쿨다운 중이면 트리거 안 함', () => {
    const company = makeCompany({
      price: 10500,
      viTriggered: false,
      viCooldown: 10,
      viRecentPrices: [10000, 10100, 10200],
    })
    expect(checkVITrigger(company)).toBe(false)
  })

  it('가격 이력이 부족하면 트리거 안 함', () => {
    const company = makeCompany({
      price: 10500,
      viRecentPrices: [10000, 10100], // only 2, need 3
    })
    expect(checkVITrigger(company)).toBe(false)
  })

  it('하락 시에도 VI 트리거', () => {
    const company = makeCompany({
      price: 9600, // -4% from 10000
      viRecentPrices: [10000, 9900, 9800],
    })
    expect(checkVITrigger(company)).toBe(true)
  })
})

/* ──────────────────────────────────────────────── */
describe('updateVIState — cooldown double decrement fix', () => {
  it('VI 발동 중 쿨다운이 틱당 1만 감소 (이중 차감 버그 수정)', () => {
    const company = makeCompany({
      viTriggered: true,
      viCooldown: VI_CONFIG.HALT_DURATION, // 6
    })

    // 6틱 동안 1씩 감소해야 함
    let c = company
    const cooldowns: number[] = []

    for (let i = 0; i < VI_CONFIG.HALT_DURATION; i++) {
      c = updateVIState(c, c.price)
      cooldowns.push(c.viCooldown)
    }

    // 6, 5, 4, 3, 2, 1 → 쿨다운이 0 되면 해제 후 COOLDOWN_AFTER_HALT 설정
    expect(cooldowns).toEqual([5, 4, 3, 2, 1, VI_CONFIG.COOLDOWN_AFTER_HALT])

    // 마지막 업데이트 후 VI 해제 확인
    expect(c.viTriggered).toBe(false)
    expect(c.viCooldown).toBe(VI_CONFIG.COOLDOWN_AFTER_HALT) // 30
  })

  it('VI 해제 후 쿨다운이 정상적으로 감소', () => {
    const company = makeCompany({
      viTriggered: false,
      viCooldown: 3,
    })

    let c = company
    for (let i = 0; i < 3; i++) {
      c = updateVIState(c, c.price)
    }

    expect(c.viCooldown).toBe(0)
    expect(c.viTriggered).toBe(false)
  })

  it('VI 비활성 + 쿨다운 0이면 상태 변경 없음', () => {
    const company = makeCompany({
      viTriggered: false,
      viCooldown: 0,
    })

    const updated = updateVIState(company, company.price)
    expect(updated.viTriggered).toBe(false)
    expect(updated.viCooldown).toBe(0)
  })

  it('가격 이력 슬라이딩 윈도우 유지', () => {
    const company = makeCompany({
      viRecentPrices: [100, 200, 300],
    })

    const updated = updateVIState(company, 400)
    expect(updated.viRecentPrices).toEqual([200, 300, 400]) // window size 3
  })

  it('VI halt → cooldown 전체 시퀀스 정상 동작', () => {
    // 1. VI 트리거
    let c = makeCompany({ viTriggered: false, viCooldown: 0 })
    c = triggerVI(c)
    expect(c.viTriggered).toBe(true)
    expect(c.viCooldown).toBe(VI_CONFIG.HALT_DURATION) // 6

    // 2. 6틱 halt
    for (let i = 0; i < VI_CONFIG.HALT_DURATION; i++) {
      c = updateVIState(c, c.price)
    }
    expect(c.viTriggered).toBe(false)
    expect(c.viCooldown).toBe(VI_CONFIG.COOLDOWN_AFTER_HALT) // 30

    // 3. 30틱 cooldown
    for (let i = 0; i < VI_CONFIG.COOLDOWN_AFTER_HALT; i++) {
      c = updateVIState(c, c.price)
    }
    expect(c.viCooldown).toBe(0)
    expect(c.viTriggered).toBe(false)
  })
})

/* ──────────────────────────────────────────────── */
describe('triggerVI', () => {
  it('VI 트리거 시 viTriggered=true, viCooldown=HALT_DURATION', () => {
    const company = makeCompany()
    const result = triggerVI(company)

    expect(result.viTriggered).toBe(true)
    expect(result.viCooldown).toBe(VI_CONFIG.HALT_DURATION)
  })
})

/* ──────────────────────────────────────────────── */
describe('isVIHalted', () => {
  it('VI 발동 + 쿨다운 > 0이면 halted', () => {
    const company = makeCompany({ viTriggered: true, viCooldown: 3 })
    expect(isVIHalted(company)).toBe(true)
  })

  it('VI 미발동이면 not halted', () => {
    const company = makeCompany({ viTriggered: false, viCooldown: 5 })
    expect(isVIHalted(company)).toBe(false)
  })

  it('쿨다운 0이면 not halted', () => {
    const company = makeCompany({ viTriggered: true, viCooldown: 0 })
    expect(isVIHalted(company)).toBe(false)
  })
})

/* ──────────────────────────────────────────────── */
describe('getVIRemainingTicks', () => {
  it('VI 발동 중이면 남은 틱 반환', () => {
    const company = makeCompany({ viTriggered: true, viCooldown: 4 })
    expect(getVIRemainingTicks(company)).toBe(4)
  })

  it('VI 미발동이면 0 반환', () => {
    const company = makeCompany({ viTriggered: false, viCooldown: 10 })
    expect(getVIRemainingTicks(company)).toBe(0)
  })
})

/* ──────────────────────────────────────────────── */
describe('resetVIForNewDay', () => {
  it('모든 VI 상태 초기화', () => {
    const company = makeCompany({
      viTriggered: true,
      viCooldown: 15,
      viRecentPrices: [100, 200, 300],
    })

    const reset = resetVIForNewDay(company)
    expect(reset.viTriggered).toBe(false)
    expect(reset.viCooldown).toBe(0)
    expect(reset.viRecentPrices).toEqual([])
  })
})

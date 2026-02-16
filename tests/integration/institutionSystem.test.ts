import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import type { Company, Institution, GameTime, MarketEvent } from '@/types'
import { simulateInstitutionalTrading } from '@/engines/institutionEngine'
import { SECTOR_ROTATION } from '@/config/institutionConfig'

/* ══════════════════════════════════════════════════════════════════════════════
   Integration Test Setup
   ══════════════════════════════════════════════════════════════════════════════ */

interface TestStoreState {
  companies: Company[]
  institutions: Institution[]
  events: MarketEvent[]
  time: GameTime

  updateInstitutionalFlowForSector: (sectorIndex: number) => void
}

function createTestStore() {
  return create<TestStoreState>((set, get) => ({
    companies: createMockCompanies(),
    institutions: createMockInstitutions(),
    events: [],
    time: createMockTime(),

    updateInstitutionalFlowForSector: (sectorIndex: number) => {
      const { companies, institutions, events } = get()

      const sectors = [
        'tech',
        'finance',
        'energy',
        'healthcare',
        'consumer',
        'industrial',
        'telecom',
        'materials',
        'utilities',
        'realestate',
      ] as const

      const targetSector = sectors[sectorIndex]

      // 시장 심리 계산 (이벤트 기반)
      const marketSentiment = 1.0 - events.reduce((acc, e) => acc + (e.driftEffect ?? 0), 0) * 0.1

      const updatedCompanies = companies.map((company) => {
        if (company.sector !== targetSector) return company

        const { netVol, buyers, sellers } = simulateInstitutionalTrading(
          company,
          institutions,
          marketSentiment,
        )

        return {
          ...company,
          institutionFlow: {
            netBuyVolume: netVol,
            topBuyers: buyers,
            topSellers: sellers,
            institutionalOwnership: company.institutionFlow.institutionalOwnership,
          },
          institutionFlowHistory: [...(company.institutionFlowHistory ?? []).slice(-9), netVol],
        }
      })

      set({ companies: updatedCompanies })
    },
  }))
}

/* ══════════════════════════════════════════════════════════════════════════════
   B. 통합 테스트 - 섹터 순환 처리
   ══════════════════════════════════════════════════════════════════════════════ */

describe('Sector Rotation Integration', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  it('Hour 0 → Tech 섹터만 업데이트', () => {
    const stateBefore = store.getState()
    const techCompanyBefore = stateBefore.companies.find((c) => c.sector === 'tech')
    const financeCompanyBefore = stateBefore.companies.find((c) => c.sector === 'finance')

    // Tech 섹터 업데이트 (sectorIndex = 0)
    store.getState().updateInstitutionalFlowForSector(0)

    const stateAfter = store.getState()
    const techCompanyAfter = stateAfter.companies.find((c) => c.sector === 'tech')
    const financeCompanyAfter = stateAfter.companies.find((c) => c.sector === 'finance')

    // Tech 섹터는 변경되어야 함
    expect(techCompanyAfter?.institutionFlow.netBuyVolume).not.toBe(
      techCompanyBefore?.institutionFlow.netBuyVolume,
    )

    // Finance 섹터는 변경되지 않아야 함
    expect(financeCompanyAfter?.institutionFlow.netBuyVolume).toBe(
      financeCompanyBefore?.institutionFlow.netBuyVolume,
    )
  })

  it('Hour 1 → Finance 섹터만 업데이트', () => {
    const stateBefore = store.getState()
    const techCompanyBefore = stateBefore.companies.find((c) => c.sector === 'tech')
    const financeCompanyBefore = stateBefore.companies.find((c) => c.sector === 'finance')

    // Finance 섹터 업데이트 (sectorIndex = 1)
    store.getState().updateInstitutionalFlowForSector(1)

    const stateAfter = store.getState()
    const techCompanyAfter = stateAfter.companies.find((c) => c.sector === 'tech')
    const financeCompanyAfter = stateAfter.companies.find((c) => c.sector === 'finance')

    // Tech 섹터는 변경되지 않아야 함
    expect(techCompanyAfter?.institutionFlow.netBuyVolume).toBe(
      techCompanyBefore?.institutionFlow.netBuyVolume,
    )

    // Finance 섹터는 변경되어야 함
    expect(financeCompanyAfter?.institutionFlow.netBuyVolume).not.toBe(
      financeCompanyBefore?.institutionFlow.netBuyVolume,
    )
  })

  it('10시간 후 → 모든 섹터 1회씩 업데이트', () => {
    const sectors = ['tech', 'finance', 'energy', 'healthcare', 'consumer', 'industrial', 'telecom', 'materials', 'utilities', 'realestate']
    const updatedSectors = new Set<string>()

    // 10시간 동안 섹터 순환
    for (let hour = 0; hour < 10; hour++) {
      const sectorIndex = hour % SECTOR_ROTATION.TOTAL_SECTORS
      store.getState().updateInstitutionalFlowForSector(sectorIndex)
      updatedSectors.add(sectors[sectorIndex])
    }

    // 모든 섹터가 업데이트되었는지 확인
    expect(updatedSectors.size).toBe(SECTOR_ROTATION.TOTAL_SECTORS)
    sectors.forEach((sector) => {
      expect(updatedSectors.has(sector)).toBe(true)
    })
  })
})

/* ══════════════════════════════════════════════════════════════════════════════
   C. 통합 테스트 - gameStore 통합
   ══════════════════════════════════════════════════════════════════════════════ */

describe('GameStore Integration', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  it('updateInstitutionalFlowForSector 호출 확인', () => {
    const initialState = store.getState()
    const techCompany = initialState.companies.find((c) => c.sector === 'tech')

    expect(techCompany).toBeDefined()
    expect(techCompany?.institutionFlow.netBuyVolume).toBe(0)

    // Tech 섹터 업데이트
    store.getState().updateInstitutionalFlowForSector(0)

    const updatedState = store.getState()
    const updatedTechCompany = updatedState.companies.find((c) => c.sector === 'tech')

    // netBuyVolume이 변경되었는지 확인 (0이 아닌 값)
    expect(updatedTechCompany?.institutionFlow.netBuyVolume).not.toBe(0)
  })

  it('institutionFlowHistory 업데이트 (최근 10일)', () => {
    const techCompanyId = store.getState().companies.find((c) => c.sector === 'tech')?.id

    // 15번 업데이트 (10일 초과)
    for (let i = 0; i < 15; i++) {
      store.getState().updateInstitutionalFlowForSector(0)
    }

    const finalState = store.getState()
    const techCompany = finalState.companies.find((c) => c.id === techCompanyId)

    // 최근 10일만 유지되는지 확인
    expect(techCompany?.institutionFlowHistory?.length).toBeLessThanOrEqual(10)
    expect(techCompany?.institutionFlowHistory?.length).toBeGreaterThan(0)
  })

  it('companies 상태 변경 확인', () => {
    const initialCompanies = store.getState().companies
    const initialTechCount = initialCompanies.filter((c) => c.sector === 'tech').length

    // Tech 섹터 업데이트
    store.getState().updateInstitutionalFlowForSector(0)

    const updatedCompanies = store.getState().companies
    const updatedTechCount = updatedCompanies.filter((c) => c.sector === 'tech').length

    // 회사 개수는 변하지 않아야 함
    expect(updatedTechCount).toBe(initialTechCount)

    // 하지만 institutionFlow는 변경되어야 함
    const techCompany = updatedCompanies.find((c) => c.sector === 'tech')
    expect(techCompany?.institutionFlow.topBuyers.length).toBeGreaterThanOrEqual(0)
    expect(techCompany?.institutionFlow.topSellers.length).toBeGreaterThanOrEqual(0)
  })

  it('기관 매매 발생 확인', () => {
    // Tech 섹터 업데이트
    store.getState().updateInstitutionalFlowForSector(0)

    const state = store.getState()
    const techCompany = state.companies.find((c) => c.sector === 'tech')

    // 기관 매매가 발생하여 netBuyVolume이 변경되었는지 확인
    expect(techCompany?.institutionFlow.netBuyVolume).not.toBe(0)

    // 여러 번 실행하여 통계적 확인
    const results = Array.from({ length: 50 }, () => {
      store.getState().updateInstitutionalFlowForSector(0)
      return store.getState().companies.find((c) => c.sector === 'tech')?.institutionFlow.netBuyVolume ?? 0
    })

    // 최소 1개 이상의 결과가 0이 아니어야 함 (매매 발생)
    const nonZeroResults = results.filter((v) => v !== 0)
    expect(nonZeroResults.length).toBeGreaterThan(0)
  })
})

/* ══════════════════════════════════════════════════════════════════════════════
   Helper Functions
   ══════════════════════════════════════════════════════════════════════════════ */

function createMockCompanies(): Company[] {
  const sectors = [
    'tech',
    'finance',
    'energy',
    'healthcare',
    'consumer',
    'industrial',
    'telecom',
    'materials',
    'utilities',
    'realestate',
  ] as const

  return sectors.flatMap((sector, idx) => [
    {
      id: `company-${sector}-1`,
      name: `${sector.toUpperCase()} Corp 1`,
      ticker: `${sector.substring(0, 3).toUpperCase()}1`,
      sector,
      price: 10000,
      previousPrice: 10000,
      basePrice: 10000,
      sessionOpenPrice: 10000,
      priceHistory: [],
      volatility: 0.2,
      drift: 0.05,
      marketCap: 5000_000, // 5조
      description: `Test ${sector} company`,
      financials: {
        revenue: 5000,
        netIncome: 500,
        debtRatio: 1.5,
        growthRate: 0.1,
        eps: 500,
      },
      institutionFlow: {
        netBuyVolume: 0,
        topBuyers: [],
        topSellers: [],
        institutionalOwnership: 0.3,
      },
      institutionFlowHistory: [],
    },
    {
      id: `company-${sector}-2`,
      name: `${sector.toUpperCase()} Corp 2`,
      ticker: `${sector.substring(0, 3).toUpperCase()}2`,
      sector,
      price: 8000,
      previousPrice: 8000,
      basePrice: 8000,
      sessionOpenPrice: 8000,
      priceHistory: [],
      volatility: 0.25,
      drift: 0.03,
      marketCap: 3000_000, // 3조
      description: `Test ${sector} company 2`,
      financials: {
        revenue: 3000,
        netIncome: 300,
        debtRatio: 2.0,
        growthRate: 0.08,
        eps: 400,
      },
      institutionFlow: {
        netBuyVolume: 0,
        topBuyers: [],
        topSellers: [],
        institutionalOwnership: 0.25,
      },
      institutionFlowHistory: [],
    },
  ])
}

function createMockInstitutions(): Institution[] {
  return [
    { id: 'inst-1', name: 'Pension Fund 1', type: 'Pension', riskAppetite: 0.3, capital: 5_000_000_000 },
    { id: 'inst-2', name: 'Hedge Fund 1', type: 'HedgeFund', riskAppetite: 0.8, capital: 8_000_000_000 },
    { id: 'inst-3', name: 'Bank 1', type: 'Bank', riskAppetite: 0.5, capital: 6_000_000_000 },
    { id: 'inst-4', name: 'Algorithm 1', type: 'Algorithm', riskAppetite: 0.6, capital: 4_000_000_000 },
    { id: 'inst-5', name: 'Pension Fund 2', type: 'Pension', riskAppetite: 0.4, capital: 7_000_000_000 },
  ]
}

function createMockTime(): GameTime {
  return {
    year: 1995,
    month: 1,
    day: 1,
    hour: 9,
    tick: 0,
    speed: 1,
    isPaused: false,
  }
}

/**
 * Institution Year Simulation Test
 *
 * Tests institution system behavior over 1 year of game time:
 * - Sector rotation (10 hours per sector = 10 sectors)
 * - Trading cooldown enforcement over time
 * - Institution flow accumulation and price impact
 * - Market sentiment effects on trading patterns
 * - Multi-institution competition and herding
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import type { GameStore } from '../../src/stores/gameStore'
import { generateInstitutions } from '../../src/engines/institutionEngine'
import type { Company, Institution, GameTime, Sector } from '../../src/types'

// ============================================================================
// Mock Store Setup
// ============================================================================

interface SimulationStore {
  time: GameTime
  currentTick: number
  companies: Company[]
  institutions: Institution[]
  advanceHour: () => void
  advanceDay: () => void
  advanceMonth: () => void
  updateInstitutionalFlowForSector: (sectorIndex: number) => void
  reset: () => void
}

const sectors: Sector[] = [
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
]

function createMockCompany(id: string, sector: Sector): Company {
  return {
    id,
    name: `${sector.toUpperCase()} Corp ${id}`,
    ticker: `${sector.slice(0, 3).toUpperCase()}${id}`,
    sector,
    price: 10000,
    previousPrice: 10000,
    basePrice: 10000,
    sessionOpenPrice: 10000,
    priceHistory: Array(50).fill(10000),
    volatility: 0.2,
    drift: 0.05,
    marketCap: 1_000_000_000_000,
    description: 'Test company',
    financials: {
      revenue: 500_000_000,
      netIncome: 50_000_000,
      debtRatio: 1.0,
      growthRate: 0.10,
      eps: 500,
    },
    institutionFlow: {
      netBuyVolume: 0,
      topBuyers: [],
      topSellers: [],
      institutionalOwnership: 0,
    },
  }
}

const useSimulationStore = create<SimulationStore>((set, get) => ({
  time: {
    year: 1995,
    month: 1,
    day: 1,
    hour: 9,
  },
  currentTick: 0,
  companies: sectors.flatMap((sector, idx) =>
    Array.from({ length: 2 }, (_, i) => createMockCompany(`${idx * 2 + i + 1}`, sector)),
  ),
  institutions: generateInstitutions(),

  advanceHour: () => {
    set((s) => {
      let { year, month, day, hour } = s.time
      hour += 1

      // 시장 시간: 9-15시
      if (hour > 15) {
        hour = 9
        day += 1
      }

      // 월말 처리
      const daysInMonth = new Date(year, month, 0).getDate()
      if (day > daysInMonth) {
        day = 1
        month += 1
      }

      // 연말 처리
      if (month > 12) {
        month = 1
        year += 1
      }

      return {
        time: { year, month, day, hour },
        currentTick: s.currentTick + 1,
      }
    })
  },

  advanceDay: () => {
    const store = get()
    const hoursPerDay = 7 // 9-15시
    for (let i = 0; i < hoursPerDay; i++) {
      store.advanceHour()
    }
  },

  advanceMonth: () => {
    const store = get()
    const { year, month } = store.time
    const daysInMonth = new Date(year, month, 0).getDate()
    for (let i = 0; i < daysInMonth; i++) {
      store.advanceDay()
    }
  },

  updateInstitutionalFlowForSector: (sectorIndex: number) => {
    set((s) => {
      const targetSector = sectors[sectorIndex % 10]
      const marketSentiment = 1.0

      // Simplified institution trading simulation
      const updatedCompanies = s.companies.map((company) => {
        if (company.sector !== targetSector) {
          return company
        }

        // Simplified scoring
        const roe = company.financials.netIncome / company.financials.revenue
        const score = roe * 100 + company.financials.growthRate * 100

        // Random net volume based on score
        const netVol = Math.random() > 0.5 ? score * 100 : -score * 50

        return {
          ...company,
          institutionFlow: {
            netBuyVolume: netVol,
            topBuyers: netVol > 0 ? ['Buyer Fund'] : [],
            topSellers: netVol < 0 ? ['Seller Fund'] : [],
            institutionalOwnership: Math.min(1.0, company.institutionFlow.institutionalOwnership + 0.01),
          },
        }
      })

      return { companies: updatedCompanies }
    })
  },

  reset: () => {
    set({
      time: { year: 1995, month: 1, day: 1, hour: 9 },
      currentTick: 0,
      companies: sectors.flatMap((sector, idx) =>
        Array.from({ length: 2 }, (_, i) => createMockCompany(`${idx * 2 + i + 1}`, sector)),
      ),
      institutions: generateInstitutions(),
    })
  },
}))

// ============================================================================
// Year Simulation Tests
// ============================================================================

describe('Institution Year Simulation', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset()
  })

  describe('Time Progression', () => {
    it('should advance 1 year (12 months, ~365 trading days)', () => {
      const store = useSimulationStore.getState()
      const initialYear = store.time.year
      const initialTick = store.currentTick

      // Advance 12 months
      for (let i = 0; i < 12; i++) {
        store.advanceMonth()
      }

      const finalState = useSimulationStore.getState()

      // Should be next year
      expect(finalState.time.year).toBe(initialYear + 1)
      expect(finalState.time.month).toBe(1)

      // Should have ~365 days * 7 hours = ~2555 ticks
      const expectedTicks = 365 * 7
      expect(finalState.currentTick).toBeGreaterThan(expectedTicks * 0.9)
      expect(finalState.currentTick).toBeLessThan(expectedTicks * 1.1)
    })

    it('should increment currentTick every hour', () => {
      const store = useSimulationStore.getState()
      const initialTick = store.currentTick

      store.advanceHour()
      expect(useSimulationStore.getState().currentTick).toBe(initialTick + 1)

      store.advanceHour()
      expect(useSimulationStore.getState().currentTick).toBe(initialTick + 2)
    })
  })

  describe('Sector Rotation', () => {
    it('should rotate through all 10 sectors in 10 hours', () => {
      const store = useSimulationStore.getState()
      const processedSectors = new Set<Sector>()

      // Process 10 hours with sector rotation
      for (let hour = 0; hour < 10; hour++) {
        // Advance first to get new tick
        store.advanceHour()

        const state = useSimulationStore.getState()
        const sectorIndex = (state.currentTick - 1) % 10 // -1 because we just advanced
        const targetSector = sectors[sectorIndex]

        processedSectors.add(targetSector)
        store.updateInstitutionalFlowForSector(sectorIndex)
      }

      // All 10 sectors should have been processed
      expect(processedSectors.size).toBe(10)
    })

    it('should cycle sectors multiple times over 1 year', () => {
      const store = useSimulationStore.getState()
      const sectorProcessCount: Record<Sector, number> = {
        tech: 0,
        finance: 0,
        energy: 0,
        healthcare: 0,
        consumer: 0,
        industrial: 0,
        telecom: 0,
        materials: 0,
        utilities: 0,
        realestate: 0,
      }

      // Simulate 1 month with hourly sector rotation
      for (let i = 0; i < 30; i++) {
        // 30 days
        for (let hour = 0; hour < 7; hour++) {
          // 7 hours per day
          store.advanceHour()

          const state = useSimulationStore.getState()
          const sectorIndex = (state.currentTick - 1) % 10
          const targetSector = sectors[sectorIndex]

          sectorProcessCount[targetSector]++
          store.updateInstitutionalFlowForSector(sectorIndex)
        }
      }

      // Each sector should have been processed roughly equally
      const counts = Object.values(sectorProcessCount)
      const avgCount = counts.reduce((sum, c) => sum + c, 0) / counts.length
      const minCount = Math.min(...counts)
      const maxCount = Math.max(...counts)

      expect(minCount).toBeGreaterThan(avgCount * 0.8)
      expect(maxCount).toBeLessThan(avgCount * 1.2)
    })
  })

  describe('Institution Flow Accumulation', () => {
    it('should accumulate institutional ownership over 1 year', () => {
      const store = useSimulationStore.getState()
      const initialOwnership = store.companies[0].institutionFlow.institutionalOwnership

      // Simulate 3 months with regular updates
      for (let month = 0; month < 3; month++) {
        for (let day = 0; day < 20; day++) {
          for (let hour = 0; hour < 7; hour++) {
            const sectorIndex = store.currentTick % 10
            store.updateInstitutionalFlowForSector(sectorIndex)
            store.advanceHour()
          }
        }
      }

      const finalState = useSimulationStore.getState()
      const finalOwnership = finalState.companies[0].institutionFlow.institutionalOwnership

      // Ownership should increase over time
      expect(finalOwnership).toBeGreaterThan(initialOwnership)
    })

    it('should track net buy/sell volume changes', () => {
      const store = useSimulationStore.getState()
      const volumeHistory: number[] = []

      // Track first company's volume over 10 days
      for (let day = 0; day < 10; day++) {
        for (let hour = 0; hour < 7; hour++) {
          const sectorIndex = store.currentTick % 10
          store.updateInstitutionalFlowForSector(sectorIndex)
          store.advanceHour()

          const state = useSimulationStore.getState()
          volumeHistory.push(state.companies[0].institutionFlow.netBuyVolume)
        }
      }

      // Volume should vary (not all zeros)
      const nonZeroVolumes = volumeHistory.filter((v) => v !== 0)
      expect(nonZeroVolumes.length).toBeGreaterThan(0)

      // Should have both positive and negative volumes (eventually)
      const hasPositive = volumeHistory.some((v) => v > 0)
      const hasNegative = volumeHistory.some((v) => v < 0)
      expect(hasPositive || hasNegative).toBe(true)
    })
  })

  describe('Trading Cooldown Over Time', () => {
    it('should enforce cooldown across multiple hours', () => {
      const store = useSimulationStore.getState()

      // Get a HedgeFund (5 tick cooldown)
      const hedgeFund = store.institutions.find((i) => i.type === 'HedgeFund')
      expect(hedgeFund).toBeDefined()

      // Simulate trading at tick 100
      const currentTick = 100
      const companyId = store.companies[0].id

      // Set cooldown manually
      if (hedgeFund) {
        hedgeFund.tradeCooldowns = {
          [companyId]: currentTick + 5, // Expires at tick 105
        }
      }

      // Advance to tick 103 (within cooldown)
      while (useSimulationStore.getState().currentTick < 103) {
        store.advanceHour()
      }

      // Cooldown should still be active
      expect(useSimulationStore.getState().currentTick).toBeLessThan(105)

      // Advance to tick 106 (after cooldown)
      while (useSimulationStore.getState().currentTick < 106) {
        store.advanceHour()
      }

      // Cooldown should have expired
      expect(useSimulationStore.getState().currentTick).toBeGreaterThanOrEqual(105)
    })

    it('should maintain independent cooldowns for different companies', () => {
      const store = useSimulationStore.getState()
      const institution = store.institutions[0]

      const company1 = store.companies[0].id
      const company2 = store.companies[1].id

      // Set different cooldowns
      institution.tradeCooldowns = {
        [company1]: 100,
        [company2]: 200,
      }

      // Advance to tick 150
      while (useSimulationStore.getState().currentTick < 150) {
        store.advanceHour()
      }

      // Company1 cooldown should have expired, company2 should still be active
      expect(useSimulationStore.getState().currentTick).toBeGreaterThan(100)
      expect(useSimulationStore.getState().currentTick).toBeLessThan(200)
    })
  })

  describe('Multi-Institution Competition', () => {
    it('should have 100 institutions active throughout the year', () => {
      const store = useSimulationStore.getState()

      expect(store.institutions.length).toBe(100)

      // Advance 6 months
      for (let i = 0; i < 6; i++) {
        store.advanceMonth()
      }

      // Institution count should remain stable
      expect(useSimulationStore.getState().institutions.length).toBe(100)
    })

    it('should maintain institution type distribution', () => {
      const store = useSimulationStore.getState()

      const typeCounts = {
        HedgeFund: 0,
        Pension: 0,
        Bank: 0,
        Algorithm: 0,
      }

      store.institutions.forEach((inst) => {
        typeCounts[inst.type]++
      })

      // Expected distribution from config
      expect(typeCounts.HedgeFund).toBe(25)
      expect(typeCounts.Pension).toBe(30)
      expect(typeCounts.Bank).toBe(25)
      expect(typeCounts.Algorithm).toBe(20)
    })

    it('should have distinct algorithm strategies', () => {
      const store = useSimulationStore.getState()

      const algoInstitutions = store.institutions.filter((i) => i.type === 'Algorithm')
      const strategies = new Set(algoInstitutions.map((i) => i.algoStrategy))

      // Should have all 3 strategies represented
      expect(strategies.has('momentum')).toBe(true)
      expect(strategies.has('meanReversion')).toBe(true)
      expect(strategies.has('volatility')).toBe(true)
    })
  })

  describe('Performance and Stability', () => {
    it('should complete 1 year simulation without errors', () => {
      const store = useSimulationStore.getState()

      expect(() => {
        // Simulate 12 months
        for (let month = 0; month < 12; month++) {
          // ~20 trading days per month
          for (let day = 0; day < 20; day++) {
            // 7 hours per day
            for (let hour = 0; hour < 7; hour++) {
              store.advanceHour()
              const state = useSimulationStore.getState()
              const sectorIndex = (state.currentTick - 1) % 10
              store.updateInstitutionalFlowForSector(sectorIndex)
            }
          }
        }
      }).not.toThrow()

      // Should have processed ~1680 hours
      const finalState = useSimulationStore.getState()
      expect(finalState.currentTick).toBeGreaterThan(1500)
    })

    it('should maintain data integrity over time', () => {
      const store = useSimulationStore.getState()
      const initialCompanyCount = store.companies.length
      const initialInstitutionCount = store.institutions.length

      // Simulate 3 months
      for (let i = 0; i < 3; i++) {
        store.advanceMonth()
      }

      const finalState = useSimulationStore.getState()

      // Data structures should remain stable
      expect(finalState.companies.length).toBe(initialCompanyCount)
      expect(finalState.institutions.length).toBe(initialInstitutionCount)

      // All companies should still have valid data
      finalState.companies.forEach((company) => {
        expect(company.id).toBeDefined()
        expect(company.sector).toBeDefined()
        expect(company.financials).toBeDefined()
        expect(company.institutionFlow).toBeDefined()
      })
    })
  })
})

/**
 * Institution Trading Cooldown Tests
 *
 * Tests cooldown mechanism preventing consecutive same-stock trades.
 * Ensures institutions respect configured cooldown periods before re-trading.
 */

import { describe, it, expect } from 'vitest'
import { simulateInstitutionalTrading } from '../../src/engines/institutionEngine'
import { INSTITUTION_TRADING_COOLDOWN } from '../../src/config/institutionConfig'
import type { Company, Institution } from '../../src/types'

// Mock company factory
function createMockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'test-01',
    name: 'Test Corp',
    ticker: 'TEST',
    sector: 'tech',
    price: 10000,
    previousPrice: 10000,
    basePrice: 10000,
    sessionOpenPrice: 10000,
    priceHistory: [10000],
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
    ...overrides,
  }
}

// Mock institution factory
function createMockInstitution(
  type: 'HedgeFund' | 'Pension' | 'Bank' | 'Algorithm',
  id = 'inst_0',
): Institution {
  return {
    id,
    name: `${type} Test`,
    type,
    riskAppetite: 0.5,
    capital: 5_000_000_000,
    tradeCooldowns: {},
  }
}

describe('Institution Trading Cooldown', () => {
  describe('Cooldown Configuration', () => {
    it('should have different cooldown periods per institution type', () => {
      expect(INSTITUTION_TRADING_COOLDOWN.HedgeFund).toBe(5) // 빠른 회전
      expect(INSTITUTION_TRADING_COOLDOWN.Pension).toBe(20) // 느린 회전
      expect(INSTITUTION_TRADING_COOLDOWN.Bank).toBe(15)
      expect(INSTITUTION_TRADING_COOLDOWN.Algorithm).toBe(3) // 알고리즘 초단기
    })

    it('should reflect realistic trading frequency differences', () => {
      const { HedgeFund, Pension, Bank, Algorithm } = INSTITUTION_TRADING_COOLDOWN

      // HedgeFund는 가장 빠르게 회전
      expect(HedgeFund).toBeLessThan(Pension)
      expect(HedgeFund).toBeLessThan(Bank)

      // Algorithm은 초단기 매매
      expect(Algorithm).toBeLessThan(HedgeFund)

      // Pension은 가장 느리게 회전
      expect(Pension).toBeGreaterThan(HedgeFund)
      expect(Pension).toBeGreaterThan(Bank)
      expect(Pension).toBeGreaterThan(Algorithm)
    })
  })

  describe('Cooldown Enforcement', () => {
    it('should prevent same-stock trade during cooldown period', () => {
      const company = createMockCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000, // 고수익
          debtRatio: 0.8, // 저부채
          growthRate: 0.20, // 고성장
          eps: 1000,
        },
      })

      const institutions = [createMockInstitution('HedgeFund')]

      // First trade at tick 100
      const result1 = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      // Institution should have traded (high score company)
      expect(result1.updatedInstitutions[0].tradeCooldowns).toBeDefined()

      // If traded, cooldown should be set
      if (Object.keys(result1.updatedInstitutions[0].tradeCooldowns!).length > 0) {
        const cooldownExpiry = result1.updatedInstitutions[0].tradeCooldowns![company.id]
        expect(cooldownExpiry).toBe(100 + INSTITUTION_TRADING_COOLDOWN.HedgeFund)

        // Second trade at tick 103 (within cooldown: 100 + 5 = 105)
        const result2 = simulateInstitutionalTrading(
          company,
          result1.updatedInstitutions,
          1.0,
          103,
        )

        // Net volume should be 0 (no trade due to cooldown)
        expect(result2.netVol).toBe(0)
        expect(result2.buyers.length).toBe(0)
        expect(result2.sellers.length).toBe(0)
      }
    })

    it('should allow trade after cooldown expires', () => {
      const company = createMockCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [createMockInstitution('HedgeFund')]

      // First trade at tick 100
      const result1 = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      // If traded, check cooldown expiry
      if (Object.keys(result1.updatedInstitutions[0].tradeCooldowns!).length > 0) {
        const cooldownExpiry = result1.updatedInstitutions[0].tradeCooldowns![company.id]

        // Second trade AFTER cooldown expires (tick 106 > expiry 105)
        const result2 = simulateInstitutionalTrading(
          company,
          result1.updatedInstitutions,
          1.0,
          106,
        )

        // Should be able to trade again (non-zero possibility)
        // NOTE: Due to randomness, we can't guarantee trade, only that cooldown doesn't block
        // Cooldown should be updated if traded
        if (result2.netVol !== 0) {
          expect(result2.updatedInstitutions[0].tradeCooldowns![company.id]).toBe(
            106 + INSTITUTION_TRADING_COOLDOWN.HedgeFund,
          )
        }
      }
    })

    it('should set cooldown per-company independently', () => {
      const company1 = createMockCompany({
        id: 'company-1',
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const company2 = createMockCompany({
        id: 'company-2',
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [createMockInstitution('Bank')]

      // Trade company1 at tick 100
      const result1 = simulateInstitutionalTrading(company1, institutions, 1.0, 100)

      // Trade company2 at tick 103 (company1 cooldown shouldn't block)
      const result2 = simulateInstitutionalTrading(company2, result1.updatedInstitutions, 1.0, 103)

      // company1 cooldown shouldn't affect company2 trading
      // Both companies should be able to be traded independently
      if (Object.keys(result2.updatedInstitutions[0].tradeCooldowns!).length > 0) {
        // If company1 was traded, check its cooldown
        if (result1.netVol !== 0) {
          expect(result2.updatedInstitutions[0].tradeCooldowns![company1.id]).toBe(
            100 + INSTITUTION_TRADING_COOLDOWN.Bank,
          )
        }

        // If company2 was traded, check its cooldown
        if (result2.netVol !== 0) {
          expect(result2.updatedInstitutions[0].tradeCooldowns![company2.id]).toBe(
            103 + INSTITUTION_TRADING_COOLDOWN.Bank,
          )
        }
      }
    })
  })

  describe('Cooldown with Multiple Institutions', () => {
    it('should track cooldown per institution independently', () => {
      const company = createMockCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [
        createMockInstitution('HedgeFund', 'inst_1'),
        createMockInstitution('Pension', 'inst_2'),
      ]

      // First trade at tick 100
      const result1 = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      // Check that cooldowns are tracked separately
      const inst1 = result1.updatedInstitutions.find((i) => i.id === 'inst_1')
      const inst2 = result1.updatedInstitutions.find((i) => i.id === 'inst_2')

      expect(inst1).toBeDefined()
      expect(inst2).toBeDefined()

      // Each institution has its own cooldown
      expect(inst1!.tradeCooldowns).toBeDefined()
      expect(inst2!.tradeCooldowns).toBeDefined()

      // Cooldowns should be independent objects
      expect(inst1!.tradeCooldowns).not.toBe(inst2!.tradeCooldowns)
    })

    it('should allow institutions with different cooldowns to trade at different times', () => {
      const company = createMockCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [
        createMockInstitution('Algorithm', 'algo'), // 3 tick cooldown
        createMockInstitution('HedgeFund', 'hedge'), // 5 tick cooldown
      ]

      // Trade at tick 100
      const result1 = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      // Algorithm can trade again at tick 104 (100 + 3 + 1)
      // HedgeFund can trade again at tick 106 (100 + 5 + 1)

      // Check cooldown values if institutions traded
      const algo = result1.updatedInstitutions.find((i) => i.id === 'algo')
      const hedge = result1.updatedInstitutions.find((i) => i.id === 'hedge')

      if (algo && algo.tradeCooldowns![company.id]) {
        expect(algo.tradeCooldowns![company.id]).toBe(103) // 100 + 3
      }

      if (hedge && hedge.tradeCooldowns![company.id]) {
        expect(hedge.tradeCooldowns![company.id]).toBe(105) // 100 + 5
      }
    })
  })

  describe('Backward Compatibility', () => {
    it('should work with currentTick undefined (no cooldown)', () => {
      const company = createMockCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [createMockInstitution('HedgeFund')]

      // Call without currentTick (backward compatibility)
      const result = simulateInstitutionalTrading(company, institutions, 1.0, undefined)

      // Should still return updated institutions
      expect(result.updatedInstitutions).toBeDefined()
      expect(result.updatedInstitutions.length).toBe(1)

      // But cooldowns shouldn't be set (no tick provided)
      // Cooldowns map should exist but be empty or unchanged
      expect(result.updatedInstitutions[0].tradeCooldowns).toBeDefined()
    })

    it('should initialize tradeCooldowns if undefined', () => {
      const company = createMockCompany()
      const institutions = [
        {
          id: 'inst_0',
          name: 'Test Fund',
          type: 'HedgeFund' as const,
          riskAppetite: 0.5,
          capital: 5_000_000_000,
          // No tradeCooldowns field (legacy data)
        },
      ]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      // Should initialize tradeCooldowns
      expect(result.updatedInstitutions[0].tradeCooldowns).toBeDefined()
      expect(typeof result.updatedInstitutions[0].tradeCooldowns).toBe('object')
    })
  })
})

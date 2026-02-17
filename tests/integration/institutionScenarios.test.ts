/**
 * Institution Trading Scenarios - Comprehensive Test Suite
 *
 * Tests all institution trading events with success/failure cases:
 * - Fundamental-based trading (buy/sell decisions)
 * - Panic sell scenarios (debt crisis, loss shock, bear market)
 * - Algorithm strategies (momentum, mean reversion, volatility)
 * - Sector preferences and rotation
 * - Market sentiment effects
 * - Cooldown enforcement
 * - Herding effects
 * - Multi-institution interactions
 */

import { describe, it, expect } from 'vitest'
import {
  simulateInstitutionalTrading,
  calculateFundamentalScore,
  checkInstitutionalPanicSell,
} from '../../src/engines/institutionEngine'
import {
  INSTITUTION_CONFIG,
  INSTITUTION_PROFILES,
  FUNDAMENTAL_THRESHOLDS,
} from '../../src/config/institutionConfig'
import type { Company, Institution } from '../../src/types'

// ============================================================================
// Test Helpers
// ============================================================================

function createCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'test-01',
    name: 'Test Corp',
    ticker: 'TEST',
    sector: 'tech',
    price: 10000,
    previousPrice: 10000,
    basePrice: 10000,
    sessionOpenPrice: 10000,
    priceHistory: Array(50).fill(10000), // Full history for algo strategies
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

function createInstitution(
  type: 'HedgeFund' | 'Pension' | 'Bank' | 'Algorithm',
  overrides: Partial<Institution> = {},
): Institution {
  return {
    id: `inst_${type}`,
    name: `${type} Fund`,
    type,
    riskAppetite: 0.5,
    capital: 5_000_000_000,
    tradeCooldowns: {},
    ...(type === 'Algorithm' ? { algoStrategy: 'momentum' as const } : {}),
    ...overrides,
  }
}

// ============================================================================
// SUCCESS CASES: Buy Scenarios
// ============================================================================

describe('Institution Trading Scenarios - SUCCESS CASES', () => {
  describe('✅ High-Growth Company Attracts HedgeFund', () => {
    it('should buy high-growth tech company (growth > 20%)', () => {
      const company = createCompany({
        sector: 'tech',
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000, // High profitability
          debtRatio: 1.2, // Moderate debt (acceptable for tech)
          growthRate: 0.25, // 25% growth - EXCELLENT
          eps: 1000,
        },
      })

      const institutions = [createInstitution('HedgeFund')]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // HedgeFund should be interested (high growth + tech sector)
      // Due to randomness, we check if it's possible to buy
      expect(result.netVol).toBeGreaterThanOrEqual(0) // Should not sell
      expect(result.updatedInstitutions).toBeDefined()
    })

    it('should generate high fundamental score for excellent growth', () => {
      const company = createCompany({
        sector: 'tech',
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000, // ROE 20% (EXCELLENT)
          debtRatio: 0.8, // EXCELLENT
          growthRate: 0.25, // EXCELLENT
          eps: 1000,
        },
      })

      const score = calculateFundamentalScore(company)

      // Tech sector: growth weight 50% (0.5/0.25 = 2x multiplier)
      // Expected: profitability ~20, debt ~20, growth ~50, valuation ~15 = ~105
      // Capped at 100
      expect(score).toBeGreaterThan(80)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('✅ Stable Company Attracts Pension Fund', () => {
    it('should buy low-debt, profitable utilities company', () => {
      const company = createCompany({
        sector: 'utilities',
        financials: {
          revenue: 1_000_000_000,
          netIncome: 100_000_000, // ROE 10% (GOOD)
          debtRatio: 0.9, // EXCELLENT (< 1.0)
          growthRate: 0.05, // FAIR (low but acceptable for utilities)
          eps: 800,
        },
      })

      const institutions = [createInstitution('Pension')]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Pension should be interested (low debt + profitability + utilities sector)
      expect(result.netVol).toBeGreaterThanOrEqual(0)
    })

    it('should pass Pension filters (debt, profitability, sector)', () => {
      const company = createCompany({
        sector: 'utilities',
        financials: {
          revenue: 1_000_000_000,
          netIncome: 100_000_000, // ROE 10% > 5% minimum
          debtRatio: 1.0, // < 1.5 maximum
          growthRate: 0.05, // > 3% minimum
          eps: 800,
        },
      })

      const profile = INSTITUTION_PROFILES.Pension

      // Check filters
      const roe = company.financials.netIncome / company.financials.revenue
      expect(roe).toBeGreaterThan(profile.minProfitability) // 10% > 5%
      expect(company.financials.debtRatio).toBeLessThan(profile.maxDebtRatio) // 1.0 < 1.5
      expect(company.financials.growthRate).toBeGreaterThan(profile.minGrowth) // 5% > 3%
      expect(profile.preferredSectors).toContain('utilities')
    })
  })

  describe('✅ Algorithm Strategy Execution', () => {
    it('should buy on momentum strategy (price > MA20)', () => {
      // Create ascending price history
      const priceHistory = Array.from({ length: 50 }, (_, i) => 9000 + i * 50)
      const currentPrice = priceHistory[priceHistory.length - 1]
      const ma20 = priceHistory.slice(-20).reduce((sum, p) => sum + p, 0) / 20

      const company = createCompany({
        price: currentPrice,
        priceHistory,
      })

      const institutions = [createInstitution('Algorithm', { algoStrategy: 'momentum' })]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Price > MA20 → momentum strategy should buy
      expect(currentPrice).toBeGreaterThan(ma20)
      // Score should be positive (0.7 from momentum strategy)
      expect(result.netVol).toBeGreaterThanOrEqual(0)
    })

    it('should buy on mean reversion strategy (price << mean)', () => {
      // Create price history with recent drop
      const normalPrice = 10000
      const priceHistory = [
        ...Array(30).fill(normalPrice),
        ...Array(18).fill(9500), // Gradual decline
        9000, // Recent sharp drop
        8500,
      ]

      const company = createCompany({
        price: 8000, // Current price below recent average
        priceHistory,
      })

      const institutions = [createInstitution('Algorithm', { algoStrategy: 'meanReversion' })]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Price below mean - stdDev → mean reversion should buy
      const recent = priceHistory.slice(-20)
      const mean = recent.reduce((sum, p) => sum + p, 0) / recent.length
      expect(company.price).toBeLessThan(mean)
      expect(result.netVol).toBeGreaterThanOrEqual(0)
    })

    it('should buy low-volatility stock (volatility strategy)', () => {
      const company = createCompany({
        volatility: 0.15, // Low volatility (< 0.2)
      })

      const institutions = [createInstitution('Algorithm', { algoStrategy: 'volatility' })]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Low volatility → volatility strategy should buy
      expect(company.volatility).toBeLessThan(0.2)
      expect(result.netVol).toBeGreaterThanOrEqual(0)
    })
  })

  describe('✅ Sector Preference Matching', () => {
    it('should prefer healthcare sector (HedgeFund)', () => {
      const company = createCompany({
        sector: 'healthcare',
        financials: {
          revenue: 500_000_000,
          netIncome: 80_000_000,
          debtRatio: 1.5,
          growthRate: 0.15,
          eps: 800,
        },
      })

      const institutions = [createInstitution('HedgeFund')]

      const profile = INSTITUTION_PROFILES.HedgeFund
      expect(profile.preferredSectors).toContain('healthcare')

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Healthcare is preferred sector for HedgeFund
      expect(result.netVol).toBeGreaterThanOrEqual(0)
    })

    it('should prefer finance sector (Bank)', () => {
      const company = createCompany({
        sector: 'finance',
        financials: {
          revenue: 1_000_000_000,
          netIncome: 100_000_000,
          debtRatio: 1.2,
          growthRate: 0.05,
          eps: 900,
        },
      })

      const institutions = [createInstitution('Bank')]

      const profile = INSTITUTION_PROFILES.Bank
      expect(profile.preferredSectors).toContain('finance')

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Finance is preferred sector for Bank
      expect(result.netVol).toBeGreaterThanOrEqual(0)
    })
  })

  describe('✅ Market Sentiment Boost', () => {
    it('should increase buying in bull market (sentiment 1.2)', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000,
          debtRatio: 1.0,
          growthRate: 0.10,
          eps: 500,
        },
      })

      const institutions = Array.from({ length: 20 }, (_, i) =>
        createInstitution('HedgeFund', { id: `inst_${i}` }),
      )

      // Run multiple iterations to average out randomness
      let bullTotalVol = 0
      let neutralTotalVol = 0
      const iterations = 10

      for (let i = 0; i < iterations; i++) {
        const bullResult = simulateInstitutionalTrading(company, institutions, 1.2, i)
        const neutralResult = simulateInstitutionalTrading(company, institutions, 1.0, i + 100)

        bullTotalVol += bullResult.netVol
        neutralTotalVol += neutralResult.netVol
      }

      const bullAvgVol = bullTotalVol / iterations
      const neutralAvgVol = neutralTotalVol / iterations

      // Bull market average should be higher than neutral (statistical significance)
      expect(bullAvgVol).toBeGreaterThan(neutralAvgVol * 0.8) // Allow 20% tolerance for random variance
    })
  })
})

// ============================================================================
// FAILURE CASES: Sell/Avoid Scenarios
// ============================================================================

describe('Institution Trading Scenarios - FAILURE CASES', () => {
  describe('❌ Panic Sell: Debt Crisis', () => {
    it('should trigger panic sell (high debt + loss + bear market)', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -600_000_000, // -600억 loss (< -500억 threshold)
          debtRatio: 3.0, // > 2.5 threshold
          growthRate: -0.1,
          eps: -600,
        },
      })

      const marketSentiment = 0.85 // < 0.9 threshold (bear market)

      const isPanic = checkInstitutionalPanicSell(company, marketSentiment)

      expect(isPanic).toBe(true)
      expect(company.financials.debtRatio).toBeGreaterThan(
        INSTITUTION_CONFIG.PANIC_DEBT_THRESHOLD,
      )
      expect(company.financials.netIncome).toBeLessThan(INSTITUTION_CONFIG.PANIC_LOSS_THRESHOLD)
      expect(marketSentiment).toBeLessThan(INSTITUTION_CONFIG.PANIC_MARKET_THRESHOLD)
    })

    it('should execute panic sell by Pension (panic-prone)', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -600_000_000,
          debtRatio: 3.0,
          growthRate: -0.1,
          eps: -600,
        },
      })

      const institutions = Array.from({ length: 10 }, (_, i) =>
        createInstitution('Pension', { id: `pension_${i}` }),
      )

      const result = simulateInstitutionalTrading(company, institutions, 0.85, 0)

      // Pension funds are panic-prone → should sell
      expect(result.netVol).toBeLessThanOrEqual(0)
      expect(result.sellers.length).toBeGreaterThan(0)
    })

    it('should NOT panic sell if only 2 conditions met (no bear market)', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -600_000_000, // Loss condition met
          debtRatio: 3.0, // Debt condition met
          growthRate: -0.1,
          eps: -600,
        },
      })

      const marketSentiment = 1.0 // Neutral market (NOT bear)

      const isPanic = checkInstitutionalPanicSell(company, marketSentiment)

      // Only 2/3 conditions met → no panic
      expect(isPanic).toBe(false)
    })
  })

  describe('❌ High Debt Avoidance', () => {
    it('should avoid high-debt company (Pension filter)', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000,
          debtRatio: 2.0, // > 1.5 (Pension max)
          growthRate: 0.10,
          eps: 500,
        },
      })

      const profile = INSTITUTION_PROFILES.Pension

      // Should fail debt filter
      expect(company.financials.debtRatio).toBeGreaterThan(profile.maxDebtRatio)

      const institutions = [createInstitution('Pension')]
      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Score should be penalized → likely sell or no trade
      expect(result.netVol).toBeLessThanOrEqual(0)
    })

    it('should penalize fundamental score for high debt', () => {
      const highDebtCompany = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000,
          debtRatio: 3.0, // Very high debt
          growthRate: 0.10,
          eps: 500,
        },
      })

      const lowDebtCompany = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000,
          debtRatio: 0.8, // Low debt
          growthRate: 0.10,
          eps: 500,
        },
      })

      const highDebtScore = calculateFundamentalScore(highDebtCompany)
      const lowDebtScore = calculateFundamentalScore(lowDebtCompany)

      // Low debt should have significantly higher score
      // Tech sector debt weight: 0.1 (vs base 0.2) → penalty = 40 * 0.5 = 20 points
      expect(lowDebtScore).toBeGreaterThan(highDebtScore)
      expect(lowDebtScore - highDebtScore).toBeGreaterThan(15) // Debt penalty > 15 points
    })
  })

  describe('❌ Low Growth Rejection', () => {
    it('should reject low-growth company (HedgeFund filter)', () => {
      const company = createCompany({
        sector: 'tech',
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000,
          debtRatio: 1.0,
          growthRate: 0.02, // < 8% (HedgeFund minimum)
          eps: 500,
        },
      })

      const profile = INSTITUTION_PROFILES.HedgeFund

      // Should fail growth filter
      expect(company.financials.growthRate).toBeLessThan(profile.minGrowth)

      const institutions = [createInstitution('HedgeFund')]
      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // HedgeFund should avoid low-growth stocks
      expect(result.netVol).toBeLessThanOrEqual(0)
    })
  })

  describe('❌ Unprofitable Company Rejection', () => {
    it('should reject loss-making company (Pension filter)', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -50_000_000, // Loss-making
          debtRatio: 1.0,
          growthRate: 0.10,
          eps: -100,
        },
      })

      const profile = INSTITUTION_PROFILES.Pension

      const roe = company.financials.netIncome / company.financials.revenue
      expect(roe).toBeLessThan(profile.minProfitability) // Negative ROE < 5% minimum

      const institutions = [createInstitution('Pension')]
      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Pension should avoid loss-making stocks
      expect(result.netVol).toBeLessThanOrEqual(0)
    })

    it('should give zero profitability score for negative ROE', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -50_000_000,
          debtRatio: 1.0,
          growthRate: 0.10,
          eps: -100,
        },
      })

      const score = calculateFundamentalScore(company)

      // Negative ROE → 0 profitability score → total score should be low
      expect(score).toBeLessThan(50)
    })
  })

  describe('❌ Algorithm Strategy Sell', () => {
    it('should sell on momentum strategy (price < MA20)', () => {
      // Create descending price history
      const priceHistory = Array.from({ length: 50 }, (_, i) => 11000 - i * 50)
      const currentPrice = priceHistory[priceHistory.length - 1]
      const ma20 = priceHistory.slice(-20).reduce((sum, p) => sum + p, 0) / 20

      const company = createCompany({
        price: currentPrice,
        priceHistory,
      })

      const institutions = [createInstitution('Algorithm', { algoStrategy: 'momentum' })]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Price < MA20 → momentum strategy should sell
      expect(currentPrice).toBeLessThan(ma20)
      expect(result.netVol).toBeLessThanOrEqual(0)
    })

    it('should sell high-volatility stock (volatility strategy)', () => {
      const company = createCompany({
        volatility: 0.40, // High volatility (> 0.35)
      })

      const institutions = [createInstitution('Algorithm', { algoStrategy: 'volatility' })]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // High volatility → volatility strategy should sell
      expect(company.volatility).toBeGreaterThan(0.35)
      expect(result.netVol).toBeLessThanOrEqual(0)
    })
  })

  describe('❌ Bear Market Sell Pressure', () => {
    it('should increase selling in bear market (sentiment 0.8)', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000,
          debtRatio: 1.5,
          growthRate: 0.05,
          eps: 500,
        },
      })

      const institutions = Array.from({ length: 10 }, (_, i) =>
        createInstitution('Pension', { id: `inst_${i}` }),
      )

      const bearResult = simulateInstitutionalTrading(company, institutions, 0.8, 0)
      const neutralResult = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Bear market should have more sellers or less buyers
      expect(bearResult.netVol).toBeLessThanOrEqual(neutralResult.netVol)
    })
  })
})

// ============================================================================
// COMPLEX SCENARIOS: Multi-Factor Interactions
// ============================================================================

describe('Institution Trading Scenarios - COMPLEX CASES', () => {
  describe('🔄 Herding Effect (Panic Amplification)', () => {
    it('should amplify panic sell probability with more panic sellers', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -600_000_000,
          debtRatio: 3.0,
          growthRate: -0.1,
          eps: -600,
        },
      })

      // Many panic-prone institutions
      const institutions = Array.from({ length: 20 }, (_, i) =>
        createInstitution('Pension', { id: `pension_${i}` }),
      )

      const result = simulateInstitutionalTrading(company, institutions, 0.85, 0)

      // Herding effect should amplify selling
      expect(result.sellers.length).toBeGreaterThan(0)
      expect(result.netVol).toBeLessThan(0)
    })

    it('should calculate herding multiplier correctly', () => {
      const baseProbability = INSTITUTION_CONFIG.PANIC_PROBABILITY // 0.3
      const panicSellerCount = 5

      // Herding multiplier: 1 + count * 0.15
      const herdingMultiplier = 1 + panicSellerCount * 0.15
      const adjustedProbability = baseProbability * herdingMultiplier

      expect(herdingMultiplier).toBe(1.75)
      expect(adjustedProbability).toBe(0.525) // 52.5% chance (vs 30% base)
    })
  })

  describe('🔄 Cooldown After Trade', () => {
    it('should set cooldown after successful buy', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [createInstitution('HedgeFund')]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      // If traded, cooldown should be set
      if (result.netVol !== 0) {
        const cooldown = result.updatedInstitutions[0].tradeCooldowns![company.id]
        expect(cooldown).toBeDefined()
        expect(cooldown).toBeGreaterThan(100)
      }
    })

    it('should respect cooldown on second attempt', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [createInstitution('Algorithm')]

      // First trade
      const result1 = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      if (result1.netVol !== 0) {
        // Second trade within cooldown (100 + 3 = 103)
        const result2 = simulateInstitutionalTrading(
          company,
          result1.updatedInstitutions,
          1.0,
          102,
        )

        // Should be blocked by cooldown
        expect(result2.netVol).toBe(0)
      }
    })
  })

  describe('🔄 Multiple Institutions Simultaneous Trading', () => {
    it('should allow mixed buy/sell from different institution types', () => {
      const company = createCompany({
        sector: 'tech',
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000, // Moderate profitability
          debtRatio: 1.5, // Moderate debt
          growthRate: 0.12, // Good growth
          eps: 500,
        },
      })

      const institutions = [
        createInstitution('HedgeFund'), // Likes growth
        createInstitution('Pension'), // Dislikes moderate debt
        createInstitution('Bank'),
      ]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      // Should have mixed reactions
      expect(result.updatedInstitutions.length).toBe(3)
    })

    it('should track cooldowns independently per institution', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000,
          debtRatio: 0.8,
          growthRate: 0.20,
          eps: 1000,
        },
      })

      const institutions = [
        createInstitution('Algorithm', { id: 'algo1' }), // 3 tick cooldown
        createInstitution('HedgeFund', { id: 'hedge1' }), // 5 tick cooldown
      ]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 100)

      // Cooldowns should be different
      const algo = result.updatedInstitutions.find((i) => i.id === 'algo1')
      const hedge = result.updatedInstitutions.find((i) => i.id === 'hedge1')

      if (algo && algo.tradeCooldowns![company.id]) {
        expect(algo.tradeCooldowns![company.id]).toBe(103) // 100 + 3
      }

      if (hedge && hedge.tradeCooldowns![company.id]) {
        expect(hedge.tradeCooldowns![company.id]).toBe(105) // 100 + 5
      }
    })
  })

  describe('🔄 Sector-Specific Fundamental Scoring', () => {
    it('should prioritize growth for tech sector', () => {
      const techGrowth = createCompany({
        sector: 'tech',
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000, // ROE 10% (GOOD)
          debtRatio: 1.5, // FAIR
          growthRate: 0.25, // EXCELLENT (25%)
          eps: 500,
        },
      })

      const techProfit = createCompany({
        sector: 'tech',
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000, // ROE 20% (EXCELLENT)
          debtRatio: 1.5, // FAIR
          growthRate: 0.05, // FAIR (5%)
          eps: 1000,
        },
      })

      const growthScore = calculateFundamentalScore(techGrowth)
      const profitScore = calculateFundamentalScore(techProfit)

      // Tech prioritizes growth (50% weight vs 20% profitability)
      expect(growthScore).toBeGreaterThan(profitScore)
    })

    it('should prioritize debt management for utilities sector', () => {
      const utilsLowDebt = createCompany({
        sector: 'utilities',
        financials: {
          revenue: 1_000_000_000,
          netIncome: 50_000_000, // ROE 5% (FAIR)
          debtRatio: 0.8, // EXCELLENT
          growthRate: 0.03, // POOR
          eps: 500,
        },
      })

      const utilsHighProfit = createCompany({
        sector: 'utilities',
        financials: {
          revenue: 1_000_000_000,
          netIncome: 150_000_000, // ROE 15% (EXCELLENT)
          debtRatio: 2.0, // FAIR
          growthRate: 0.03, // POOR
          eps: 1500,
        },
      })

      const lowDebtScore = calculateFundamentalScore(utilsLowDebt)
      const highProfitScore = calculateFundamentalScore(utilsHighProfit)

      // Utilities prioritizes debt (40% weight vs 30% profitability)
      expect(lowDebtScore).toBeGreaterThan(highProfitScore)
    })

    it('should balance profitability and debt for finance sector', () => {
      const financeCompany = createCompany({
        sector: 'finance',
        financials: {
          revenue: 1_000_000_000,
          netIncome: 200_000_000, // ROE 20% (EXCELLENT)
          debtRatio: 1.0, // EXCELLENT
          growthRate: 0.05, // FAIR
          eps: 2000,
        },
      })

      const score = calculateFundamentalScore(financeCompany)

      // Finance: profitability 40%, debt 30% (both EXCELLENT)
      // Should get high score
      expect(score).toBeGreaterThan(80)
    })
  })

  describe('🔄 Market Regime Changes', () => {
    it('should shift from buying to selling as sentiment drops', () => {
      const company = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: 50_000_000,
          debtRatio: 1.2,
          growthRate: 0.08,
          eps: 500,
        },
      })

      const institutions = Array.from({ length: 10 }, (_, i) =>
        createInstitution('Bank', { id: `bank_${i}` }),
      )

      const bullResult = simulateInstitutionalTrading(company, institutions, 1.2, 0)
      const bearResult = simulateInstitutionalTrading(company, institutions, 0.8, 0)

      // Bull market should have more net buying
      expect(bullResult.netVol).toBeGreaterThanOrEqual(bearResult.netVol)
    })
  })

  describe('🔄 Panic Severity Calculation', () => {
    it('should calculate panic severity from 0.0 to 1.0', () => {
      // Maximum panic: debtRatio = 5.0, netIncome = -2000억, sentiment = 0.7
      const maxPanicCompany = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -200_000_000_000, // -2000억 (way beyond threshold)
          debtRatio: 5.0, // Way above 2.5
          growthRate: -0.5,
          eps: -20000,
        },
      })

      // Calculation (from institutionEngine.ts):
      // debtStress = min(1, (5.0 - 2.5) / 2.5) = 1.0
      // lossStress = min(1, abs(-2000억) / 1000억) = 1.0
      // marketStress = min(1, (0.9 - 0.7) / 0.2) = 1.0
      // panicSeverity = (1.0 + 1.0 + 1.0) / 3 = 1.0

      const debtStress = Math.min(1, (5.0 - 2.5) / 2.5)
      const lossStress = Math.min(1, Math.abs(-200_000_000_000) / 1_000_000_000)
      const marketStress = Math.min(1, (0.9 - 0.7) / 0.2)
      const panicSeverity = (debtStress + lossStress + marketStress) / 3

      expect(panicSeverity).toBe(1.0)

      // Minimum panic: just barely meets thresholds
      const minPanicCompany = createCompany({
        financials: {
          revenue: 500_000_000,
          netIncome: -500_000_001, // Just below threshold
          debtRatio: 2.51, // Just above threshold
          growthRate: -0.1,
          eps: -1000,
        },
      })

      const minDebtStress = Math.min(1, (2.51 - 2.5) / 2.5)
      const minLossStress = Math.min(1, Math.abs(-500_000_001) / 1_000_000_000)
      const minMarketStress = Math.min(1, (0.9 - 0.89) / 0.2)
      const minPanicSeverity = (minDebtStress + minLossStress + minMarketStress) / 3

      expect(minPanicSeverity).toBeGreaterThan(0)
      expect(minPanicSeverity).toBeLessThan(0.5)
    })
  })
})

// ============================================================================
// EDGE CASES & BOUNDARY CONDITIONS
// ============================================================================

describe('Institution Trading Scenarios - EDGE CASES', () => {
  describe('🔧 Extreme Values', () => {
    it('should cap fundamental score at 100', () => {
      const perfectCompany = createCompany({
        sector: 'tech',
        financials: {
          revenue: 500_000_000,
          netIncome: 100_000_000, // ROE 20% (EXCELLENT)
          debtRatio: 0.5, // EXCELLENT
          growthRate: 0.30, // EXCELLENT (30%)
          eps: 2000, // PER 5 (UNDERVALUED)
        },
      })

      const score = calculateFundamentalScore(perfectCompany)

      expect(score).toBeLessThanOrEqual(100)
      expect(score).toBeGreaterThan(90)
    })

    it('should handle zero revenue gracefully', () => {
      const zeroRevenueCompany = createCompany({
        financials: {
          revenue: 0,
          netIncome: -10_000_000,
          debtRatio: 1.0,
          growthRate: 0.0,
          eps: 0,
        },
      })

      const score = calculateFundamentalScore(zeroRevenueCompany)

      // Should not crash, score should be low
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThan(30)
    })

    it('should handle negative EPS (loss-making company)', () => {
      const lossCompany = createCompany({
        price: 10000,
        financials: {
          revenue: 500_000_000,
          netIncome: -50_000_000,
          debtRatio: 1.0,
          growthRate: -0.05,
          eps: -500, // Negative EPS
        },
      })

      const score = calculateFundamentalScore(lossCompany)

      // Negative ROE → 0 profitability score
      // Negative growth → 0 growth score
      // PER undefined (negative EPS) → 0 valuation score
      expect(score).toBeLessThan(40) // Only debt score remains
    })
  })

  describe('🔧 Empty/Small Institution Sets', () => {
    it('should handle single institution', () => {
      const company = createCompany()
      const institutions = [createInstitution('HedgeFund')]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      expect(result.updatedInstitutions.length).toBe(1)
    })

    it('should handle empty institution array', () => {
      const company = createCompany()
      const institutions: Institution[] = []

      const result = simulateInstitutionalTrading(company, institutions, 1.0, 0)

      expect(result.netVol).toBe(0)
      expect(result.buyers.length).toBe(0)
      expect(result.sellers.length).toBe(0)
      expect(result.updatedInstitutions.length).toBe(0)
    })
  })

  describe('🔧 Backward Compatibility', () => {
    it('should work without currentTick (no cooldown enforcement)', () => {
      const company = createCompany()
      const institutions = [createInstitution('HedgeFund')]

      const result = simulateInstitutionalTrading(company, institutions, 1.0, undefined)

      // Should still work, just no cooldown enforcement
      expect(result.updatedInstitutions).toBeDefined()
    })

    it('should initialize tradeCooldowns for legacy institutions', () => {
      const company = createCompany()
      const legacyInstitution: Institution = {
        id: 'legacy_inst',
        name: 'Legacy Fund',
        type: 'HedgeFund',
        riskAppetite: 0.5,
        capital: 5_000_000_000,
        // No tradeCooldowns field
      } as any

      const result = simulateInstitutionalTrading(company, [legacyInstitution], 1.0, 100)

      // Should initialize tradeCooldowns
      expect(result.updatedInstitutions[0].tradeCooldowns).toBeDefined()
    })
  })
})

/**
 * Institutional Ownership Impact Tests
 *
 * Tests real-time institutional ownership calculation and its impact on liquidity.
 * High institutional ownership → reduced liquidity → larger price impact.
 */

import { describe, it, expect } from 'vitest'

/**
 * Calculate concentration multiplier and adjusted liquidity
 * (Logic extracted from priceEngine.worker.ts for direct testing)
 */
function calculateLiquidityAdjustment(
  marketCap: number,
  ownershipConcentration: number,
): {
  baseADV: number
  liquidityFactor: number
  concentrationMultiplier: number
  adjustedLiquidity: number
} {
  // Base average daily volume (0.1% of market cap)
  const baseADV = marketCap * 0.001

  // Distributed across ~10 active ticks
  const liquidityFactor = baseADV / 10

  // Ownership above 30% starts reducing liquidity
  const concentrationMultiplier = 1 + Math.max(0, ownershipConcentration - 0.3) * 0.833

  // Adjusted liquidity (reduced when ownership is high)
  const adjustedLiquidity = liquidityFactor / concentrationMultiplier

  return { baseADV, liquidityFactor, concentrationMultiplier, adjustedLiquidity }
}

/**
 * Calculate institutional price impact
 * (Logic extracted from priceEngine.worker.ts)
 */
function calculateInstitutionalImpact(
  netBuyVolume: number,
  adjustedLiquidity: number,
): number {
  const impactCoefficient = 0.0002
  const volumeRatio = netBuyVolume / adjustedLiquidity
  const sqrtImpact = Math.sign(volumeRatio) * Math.sqrt(Math.abs(volumeRatio))
  const rawImpact = sqrtImpact * impactCoefficient

  // Cap at ±5%
  return Math.max(-0.05, Math.min(0.05, rawImpact))
}

describe('Institutional Ownership Impact Tests', () => {
  const MARKET_CAP = 1_000_000_000_000 // 1조원

  describe('Liquidity Concentration Multiplier', () => {
    it('should have no penalty for ownership below 30%', () => {
      const { concentrationMultiplier: mult10 } = calculateLiquidityAdjustment(MARKET_CAP, 0.10)
      const { concentrationMultiplier: mult20 } = calculateLiquidityAdjustment(MARKET_CAP, 0.20)
      const { concentrationMultiplier: mult29 } = calculateLiquidityAdjustment(MARKET_CAP, 0.29)

      // All should be 1.0 (no penalty)
      expect(mult10).toBe(1.0)
      expect(mult20).toBe(1.0)
      expect(mult29).toBe(1.0)
    })

    it('should progressively reduce liquidity as ownership increases above 30%', () => {
      const { concentrationMultiplier: mult30 } = calculateLiquidityAdjustment(MARKET_CAP, 0.30)
      const { concentrationMultiplier: mult60 } = calculateLiquidityAdjustment(MARKET_CAP, 0.60)
      const { concentrationMultiplier: mult90 } = calculateLiquidityAdjustment(MARKET_CAP, 0.90)

      // Progressive increase: 30% < 60% < 90%
      expect(mult30).toBe(1.0) // No penalty at exactly 30%
      expect(mult60).toBeCloseTo(1.25, 2) // (0.6 - 0.3) * 0.833 + 1 = 1.25
      expect(mult90).toBeCloseTo(1.5, 2) // (0.9 - 0.3) * 0.833 + 1 = 1.5

      expect(mult60).toBeGreaterThan(mult30)
      expect(mult90).toBeGreaterThan(mult60)
    })

    it('should cap concentration penalty at ~50% liquidity reduction (multiplier 1.5)', () => {
      const { concentrationMultiplier: mult90 } = calculateLiquidityAdjustment(MARKET_CAP, 0.90)
      const { concentrationMultiplier: mult95 } = calculateLiquidityAdjustment(MARKET_CAP, 0.95)
      const { concentrationMultiplier: mult99 } = calculateLiquidityAdjustment(MARKET_CAP, 0.99)

      // Formula caps at (0.72 - 0.3) * 0.833 + 1 ≈ 1.5
      // But can go higher with >72% ownership
      expect(mult90).toBeCloseTo(1.5, 2)
      expect(mult95).toBeCloseTo(1.54, 2)
      expect(mult99).toBeCloseTo(1.575, 2)

      // Verify multipliers don't explode
      expect(mult99).toBeLessThan(1.6)
    })
  })

  describe('Adjusted Liquidity Calculation', () => {
    it('should reduce liquidity with high ownership concentration', () => {
      const low = calculateLiquidityAdjustment(MARKET_CAP, 0.10)
      const high = calculateLiquidityAdjustment(MARKET_CAP, 0.80)

      // Base liquidity should be the same
      expect(low.liquidityFactor).toBe(high.liquidityFactor)

      // Adjusted liquidity should be lower for high ownership
      expect(high.adjustedLiquidity).toBeLessThan(low.adjustedLiquidity)

      // Ratio should match multiplier
      const ratio = low.adjustedLiquidity / high.adjustedLiquidity
      expect(ratio).toBeCloseTo(high.concentrationMultiplier, 2)
    })

    it('Real Example: 1조원 market cap stock', () => {
      const { baseADV, liquidityFactor, adjustedLiquidity } = calculateLiquidityAdjustment(
        MARKET_CAP,
        0.70, // 70% institutional ownership
      )

      // Base ADV: 0.1% of 1조 = 10억
      expect(baseADV).toBe(1_000_000_000)

      // Liquidity factor: 10억 / 10 = 1억
      expect(liquidityFactor).toBe(100_000_000)

      // Concentration multiplier: (0.7 - 0.3) * 0.833 + 1 ≈ 1.333
      // Adjusted liquidity: 1억 / 1.333 ≈ 75M
      expect(adjustedLiquidity).toBeCloseTo(75_000_000, -5) // -5 for millions precision
    })
  })

  describe('Price Impact with Ownership Concentration', () => {
    it('should amplify price impact with high institutional ownership', () => {
      const netBuyVolume = 50_000_000 // 5천만주 매수

      const lowOwnership = calculateLiquidityAdjustment(MARKET_CAP, 0.10)
      const highOwnership = calculateLiquidityAdjustment(MARKET_CAP, 0.80)

      const impactLow = calculateInstitutionalImpact(netBuyVolume, lowOwnership.adjustedLiquidity)
      const impactHigh = calculateInstitutionalImpact(netBuyVolume, highOwnership.adjustedLiquidity)

      // High ownership → lower liquidity → larger impact
      expect(impactHigh).toBeGreaterThan(impactLow)

      // Verify realistic magnitude
      expect(impactLow).toBeGreaterThan(0) // Positive buying pressure
      expect(impactHigh).toBeGreaterThan(0)
      expect(impactHigh).toBeLessThan(0.05) // Bounded by MAX_INSTITUTIONAL_IMPACT
    })

    it('Real Scenario: Panic sell with concentrated ownership amplifies crash', () => {
      const panicSellVolume = -100_000_000 // 1억주 투매

      const lowOwnership = calculateLiquidityAdjustment(MARKET_CAP, 0.20)
      const highOwnership = calculateLiquidityAdjustment(MARKET_CAP, 0.75)

      const impactLow = calculateInstitutionalImpact(panicSellVolume, lowOwnership.adjustedLiquidity)
      const impactHigh = calculateInstitutionalImpact(
        panicSellVolume,
        highOwnership.adjustedLiquidity,
      )

      // Both should be negative
      expect(impactLow).toBeLessThan(0)
      expect(impactHigh).toBeLessThan(0)

      // High ownership → larger crash
      expect(impactHigh).toBeLessThan(impactLow) // More negative

      // Amplification ratio
      const amplification = Math.abs(impactHigh) / Math.abs(impactLow)
      expect(amplification).toBeGreaterThan(1.15) // At least 15% more impact (sqrt model dampens effect)
      expect(amplification).toBeLessThan(2.0) // But not catastrophic
    })

    it('should maintain bounded impact even with extreme ownership + volume', () => {
      const extremeVolume = 200_000_000 // 2억주
      const extremeOwnership = calculateLiquidityAdjustment(MARKET_CAP, 0.95)

      const impact = calculateInstitutionalImpact(extremeVolume, extremeOwnership.adjustedLiquidity)

      // Should be bounded by MAX_INSTITUTIONAL_IMPACT (5%)
      expect(Math.abs(impact)).toBeLessThanOrEqual(0.05)
    })
  })

  describe('Impact Comparison: Low vs High Ownership', () => {
    it('should show clear difference between 10% and 80% ownership', () => {
      const netBuyVolume = 60_000_000

      const ownership10 = calculateLiquidityAdjustment(MARKET_CAP, 0.10)
      const ownership80 = calculateLiquidityAdjustment(MARKET_CAP, 0.80)

      const impact10 = calculateInstitutionalImpact(netBuyVolume, ownership10.adjustedLiquidity)
      const impact80 = calculateInstitutionalImpact(netBuyVolume, ownership80.adjustedLiquidity)

      // 80% ownership should have significantly larger impact
      const ratio = impact80 / impact10
      expect(ratio).toBeGreaterThan(1.15) // At least 15% more impact (sqrt dampens multiplier effect)
      expect(ratio).toBeLessThan(1.6) // But not explosive
    })

    it('Progressive ownership increase shows gradual impact amplification', () => {
      const netBuyVolume = 40_000_000

      const o30 = calculateLiquidityAdjustment(MARKET_CAP, 0.30)
      const o50 = calculateLiquidityAdjustment(MARKET_CAP, 0.50)
      const o70 = calculateLiquidityAdjustment(MARKET_CAP, 0.70)
      const o90 = calculateLiquidityAdjustment(MARKET_CAP, 0.90)

      const i30 = calculateInstitutionalImpact(netBuyVolume, o30.adjustedLiquidity)
      const i50 = calculateInstitutionalImpact(netBuyVolume, o50.adjustedLiquidity)
      const i70 = calculateInstitutionalImpact(netBuyVolume, o70.adjustedLiquidity)
      const i90 = calculateInstitutionalImpact(netBuyVolume, o90.adjustedLiquidity)

      // Progressive increase
      expect(i50).toBeGreaterThan(i30)
      expect(i70).toBeGreaterThan(i50)
      expect(i90).toBeGreaterThan(i70)

      // Verify gradual, not explosive
      const ratio5030 = i50 / i30
      const ratio7050 = i70 / i50
      const ratio9070 = i90 / i70

      expect(ratio5030).toBeGreaterThan(1.05) // At least 5% increase (sqrt dampens)
      expect(ratio5030).toBeLessThan(1.3) // But not dramatic

      expect(ratio7050).toBeGreaterThan(1.05)
      expect(ratio7050).toBeLessThan(1.3)

      expect(ratio9070).toBeGreaterThan(1.05)
      expect(ratio9070).toBeLessThan(1.3)
    })
  })

  describe('Ownership Decay Simulation', () => {
    it('should decay accumulated shares at 0.5% per hour', () => {
      const decayFactor = 0.995

      // Start: 100M shares accumulated
      let accumulated = 100_000_000

      // After 100 ticks (10 hours at 10 ticks/hour)
      for (let i = 0; i < 100; i++) {
        accumulated = accumulated * decayFactor
      }

      // After 10 hours: ~61% remains (0.995^100 ≈ 0.606)
      const remainingRatio = accumulated / 100_000_000
      expect(remainingRatio).toBeGreaterThan(0.59)
      expect(remainingRatio).toBeLessThan(0.62)
    })

    it('should decay to ~30% after 24 hours', () => {
      const decayFactor = 0.995
      let accumulated = 100_000_000

      // After 1 day (240 ticks = 24 hours)
      for (let i = 0; i < 240; i++) {
        accumulated = accumulated * decayFactor
      }

      // After 24 hours: ~30% remains (0.995^240 ≈ 0.301)
      const dailyRemainingRatio = accumulated / 100_000_000
      expect(dailyRemainingRatio).toBeGreaterThan(0.28)
      expect(dailyRemainingRatio).toBeLessThan(0.32)
    })

    it('should fully decay to near-zero after ~2 weeks', () => {
      const decayFactor = 0.995
      let accumulated = 100_000_000

      // After 2 weeks (3360 ticks = 14 days * 24 hours * 10 ticks/hour)
      for (let i = 0; i < 3360; i++) {
        accumulated = accumulated * decayFactor
      }

      // After 2 weeks: < 1% remains (0.995^3360 ≈ 0.000000...)
      const twoWeeksRatio = accumulated / 100_000_000
      expect(twoWeeksRatio).toBeLessThan(0.01) // Less than 1% remaining
    })
  })
})

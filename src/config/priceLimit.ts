/* ── Korean KRX Price Limit Configuration ── */

/**
 * Korean Stock Exchange (KRX) Price Limit Rules
 * - Daily price limit: ±30% from session open
 * - VI (Volatility Interruption): ±3% in 1 min (3 ticks) → 2 min (6 ticks) halt
 * - Circuit breaker: KOSPI index based
 * - Tick size: Price-based rounding rules
 */

/* ── Daily Price Limit ── */
export const MAX_DAILY_CHANGE = 0.30 // ±30% from session open (KRX standard)

/* ── VI (Volatility Interruption) Configuration ── */
export const VI_CONFIG = {
  THRESHOLD: 0.03, // ±3% price change
  DETECTION_WINDOW: 3, // 3 ticks (1 minute)
  HALT_DURATION: 6, // 6 ticks (2 minutes)
  COOLDOWN_AFTER_HALT: 30, // 30 ticks before next VI can trigger
} as const

/* ── Circuit Breaker Levels (KOSPI-based) ── */
export const CIRCUIT_BREAKER_CONFIG = {
  LEVEL_1: {
    threshold: -0.08, // KOSPI -8%
    haltDuration: 60, // 20 minutes (60 ticks)
    label: 'Level 1',
  },
  LEVEL_2: {
    threshold: -0.15, // KOSPI -15%
    haltDuration: 120, // 40 minutes (120 ticks)
    label: 'Level 2',
  },
  LEVEL_3: {
    threshold: -0.20, // KOSPI -20%
    haltDuration: Infinity, // Market close
    label: 'Level 3 (장 마감)',
  },
} as const

/* ── Tick Size Rules (KRX) ── */
/**
 * Apply KRX tick size rounding based on price range
 * - Under 1,000: 1 won
 * - 1,000~5,000: 5 won
 * - 5,000~10,000: 10 won
 * - 10,000~50,000: 50 won
 * - 50,000+: 100 won
 */
export function applyTickSize(price: number): number {
  if (price < 1000) return Math.round(price)
  if (price < 5000) return Math.round(price / 5) * 5
  if (price < 10000) return Math.round(price / 10) * 10
  if (price < 50000) return Math.round(price / 50) * 50
  return Math.round(price / 100) * 100
}

/**
 * Calculate upper and lower limit prices
 */
export function calculatePriceLimits(sessionOpenPrice: number): {
  upperLimit: number
  lowerLimit: number
} {
  const upperLimit = applyTickSize(sessionOpenPrice * (1 + MAX_DAILY_CHANGE))
  const lowerLimit = applyTickSize(sessionOpenPrice * (1 - MAX_DAILY_CHANGE))

  return { upperLimit, lowerLimit }
}

/**
 * Check if price has hit limit (상한가/하한가)
 */
export function isPriceLimitHit(
  price: number,
  sessionOpenPrice: number
): 'upper' | 'lower' | null {
  const { upperLimit, lowerLimit } = calculatePriceLimits(sessionOpenPrice)

  if (price >= upperLimit) return 'upper'
  if (price <= lowerLimit) return 'lower'
  return null
}

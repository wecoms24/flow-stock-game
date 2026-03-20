/* ── Technical Indicators (shared utility) ── */

/**
 * Simple Moving Average (SMA)
 * @param prices - Price history array
 * @param period - Number of periods for the average
 * @returns The SMA value
 */
export function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const recent = prices.slice(-period)
  return recent.reduce((sum, p) => sum + p, 0) / period
}

/**
 * Relative Strength Index (RSI)
 * @param prices - Price history array
 * @param period - RSI period (default 14)
 * @returns RSI value (0-100)
 */
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50 // Neutral

  const changes = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  const recentChanges = changes.slice(-period)
  const gains = recentChanges.filter((c) => c > 0).reduce((sum, c) => sum + c, 0) / period
  const losses =
    Math.abs(recentChanges.filter((c) => c < 0).reduce((sum, c) => sum + c, 0)) / period

  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param prices - Price history array
 * @param fastPeriod - Fast EMA period (default 12)
 * @param slowPeriod - Slow EMA period (default 26)
 * @param signalPeriod - Signal line period (default 9)
 * @returns { macd, signal, histogram } or null if insufficient data
 */
export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): { macd: number; signal: number; histogram: number } | null {
  if (prices.length < slowPeriod + signalPeriod) return null

  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)
  const macdLine = fastEMA - slowEMA

  // Simplified signal: use SMA of recent MACD approximations
  const macdValues: number[] = []
  for (let i = slowPeriod; i <= prices.length; i++) {
    const slice = prices.slice(0, i)
    const f = calculateEMA(slice, fastPeriod)
    const s = calculateEMA(slice, slowPeriod)
    macdValues.push(f - s)
  }

  const signalLine = macdValues.length >= signalPeriod
    ? macdValues.slice(-signalPeriod).reduce((sum, v) => sum + v, 0) / signalPeriod
    : macdLine

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine,
  }
}

/**
 * Exponential Moving Average (EMA)
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0

  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return ema
}

/**
 * Bollinger Bands
 * @param prices - Price history array
 * @param period - SMA period (default 20)
 * @param stdDev - Standard deviation multiplier (default 2)
 * @returns { upper, middle, lower, percentB } or null if insufficient data
 */
export function calculateBollingerBands(
  prices: number[],
  period = 20,
  stdDev = 2,
): { upper: number; middle: number; lower: number; percentB: number } | null {
  if (prices.length < period) return null

  const recent = prices.slice(-period)
  const middle = recent.reduce((sum, p) => sum + p, 0) / period

  const variance = recent.reduce((sum, p) => sum + (p - middle) ** 2, 0) / period
  const sd = Math.sqrt(variance)

  const upper = middle + stdDev * sd
  const lower = middle - stdDev * sd
  const currentPrice = prices[prices.length - 1]

  // %B: 0 = at lower band, 1 = at upper band
  const bandWidth = upper - lower
  const percentB = bandWidth > 0 ? (currentPrice - lower) / bandWidth : 0.5

  return { upper, middle, lower, percentB }
}

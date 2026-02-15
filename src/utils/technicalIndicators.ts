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

/** Market Impact Configuration
 *
 * Controls how order flow (player/competitor/AI trades) affects price dynamics.
 * impact = K * tanh(netNotional / LIQUIDITY_SCALE)
 */
export const MARKET_IMPACT_CONFIG = {
  /** Drift impact coefficient: k in impact = k * tanh(net / scale) */
  IMPACT_COEFFICIENT: 0.002,
  /** Liquidity baseline — higher value = less price impact per unit traded */
  LIQUIDITY_SCALE: 50_000_000,
  /** Imbalance → volatility amplification factor */
  IMBALANCE_SIGMA_FACTOR: 0.1,
  /** Maximum drift impact (clamp) */
  MAX_DRIFT_IMPACT: 0.05,
  /** Maximum sigma amplification multiplier */
  MAX_SIGMA_AMPLIFICATION: 2.0,
} as const

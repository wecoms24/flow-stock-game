/** Market Impact Configuration
 *
 * Controls how order flow (player/competitor/AI trades) affects price dynamics.
 * impact = K * tanh(netNotional / LIQUIDITY_SCALE)
 *
 * 🔧 Phase 0 Tuning (보수적 수준):
 * - IMPACT_COEFFICIENT: 0.002 → 0.01 (5배 증가)
 * - MAX_DRIFT_IMPACT: 0.05 → 0.03 (보수적 상한)
 * - 예상 효과: 100M 거래 시 +1~2% 가격 변화 (기존 0.2~0.4%)
 */
export const MARKET_IMPACT_CONFIG = {
  /** Drift impact coefficient: k in impact = k * tanh(net / scale) */
  IMPACT_COEFFICIENT: 0.01, // 🔧 튜닝: 0.002 → 0.01 (5배)
  /** Liquidity baseline — higher value = less price impact per unit traded */
  LIQUIDITY_SCALE: 50_000_000,
  /** Imbalance → volatility amplification factor */
  IMBALANCE_SIGMA_FACTOR: 0.1,
  /** Maximum drift impact (clamp) */
  MAX_DRIFT_IMPACT: 0.03, // 🔧 튜닝: 0.05 → 0.03 (보수적)
  /** Maximum sigma amplification multiplier */
  MAX_SIGMA_AMPLIFICATION: 2.0,
} as const

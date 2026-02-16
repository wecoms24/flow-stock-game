import type { MarketRegime, RegimeState, Company } from '../types'

/* ── Hidden Markov Model Configuration ── */

// Transition probabilities (row → column)
const TRANSITION_MATRIX: Record<MarketRegime, Record<MarketRegime, number>> = {
  CALM: {
    CALM: 0.95, // 95% stay calm
    VOLATILE: 0.04, // 4% transition to volatile
    CRISIS: 0.01, // 1% jump to crisis
  },
  VOLATILE: {
    CALM: 0.3, // 30% return to calm
    VOLATILE: 0.65, // 65% stay volatile
    CRISIS: 0.05, // 5% escalate to crisis
  },
  CRISIS: {
    CALM: 0.1, // 10% immediate recovery
    VOLATILE: 0.4, // 40% downgrade to volatile
    CRISIS: 0.5, // 50% stay in crisis
  },
}

// Volatility-based regime detection thresholds
const VOLATILITY_THRESHOLDS = {
  CRISIS: 0.045, // rolling volatility > 4.5% → CRISIS
  VOLATILE: 0.025, // rolling volatility > 2.5% → VOLATILE
  // CALM: below 2.5%
}

// Rolling window for volatility calculation (20 hours)
const ROLLING_WINDOW = 20

/* ── Regime Detection Engine ── */

/**
 * Calculate rolling volatility from market index history
 * Uses standard deviation of returns over ROLLING_WINDOW
 */
export function calculateRollingVolatility(indexHistory: number[]): number {
  if (indexHistory.length < 2) return 0

  const window = indexHistory.slice(-ROLLING_WINDOW)
  const returns = []
  for (let i = 1; i < window.length; i++) {
    returns.push((window[i] - window[i - 1]) / window[i - 1])
  }

  if (returns.length === 0) return 0

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance)
}

/**
 * Detect regime based on rolling volatility (observation-based transition)
 */
export function detectRegimeFromVolatility(volatility: number): MarketRegime {
  if (volatility >= VOLATILITY_THRESHOLDS.CRISIS) return 'CRISIS'
  if (volatility >= VOLATILITY_THRESHOLDS.VOLATILE) return 'VOLATILE'
  return 'CALM'
}

/**
 * Markov chain transition: pick next regime based on transition probabilities
 */
export function transitionRegime(current: MarketRegime): MarketRegime {
  const probs = TRANSITION_MATRIX[current]
  const rand = Math.random()

  let cumulative = 0
  for (const [regime, prob] of Object.entries(probs)) {
    cumulative += prob
    if (rand < cumulative) return regime as MarketRegime
  }

  return current // fallback (should never reach)
}

/**
 * Calculate market index from all companies (equal-weighted average)
 */
export function calculateMarketIndex(companies: Company[]): number {
  if (companies.length === 0) return 100

  const sum = companies.reduce((acc, c) => acc + c.price, 0)
  return sum / companies.length
}

/**
 * Initialize regime state
 */
export function initializeRegimeState(): RegimeState {
  return {
    current: 'CALM',
    duration: 0,
    transitionProb: TRANSITION_MATRIX.CALM,
  }
}

/**
 * Update regime state (called every tick)
 * Uses volatility-based detection + HMM transition probabilities
 */
export function updateRegimeState(
  state: RegimeState,
  indexHistory: number[],
): RegimeState {
  // Calculate rolling volatility
  const volatility = calculateRollingVolatility(indexHistory)

  // Detect regime from volatility
  const observedRegime = detectRegimeFromVolatility(volatility)

  // Decide transition: use observed regime if strong signal, otherwise HMM
  let nextRegime: MarketRegime

  if (observedRegime !== state.current) {
    // Strong signal from volatility → force transition
    nextRegime = observedRegime
  } else {
    // No strong signal → use Markov chain
    nextRegime = transitionRegime(state.current)
  }

  return {
    current: nextRegime,
    duration: nextRegime === state.current ? state.duration + 1 : 1,
    transitionProb: TRANSITION_MATRIX[nextRegime],
  }
}

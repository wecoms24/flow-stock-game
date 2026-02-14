/**
 * AI Trading Configuration
 *
 * Centralized configuration for all AI trading strategies and behaviors.
 * Adjust these values to tune game balance and difficulty.
 */

// ===== Trading Strategy Parameters =====

export const AI_STRATEGY_CONFIG = {
  /** 🔥 Shark (Aggressive) - High-risk, high-reward */
  SHARK: {
    /** Trade frequency: every 10-30 ticks */
    TRADE_FREQ_MIN: 10,
    TRADE_FREQ_MAX: 30,

    /** Min volatility threshold for stock selection */
    MIN_VOLATILITY: 0.003,

    /** Take profit threshold (25% gain) */
    TAKE_PROFIT_PERCENT: 0.25,

    /** Stop loss threshold (-15% loss) */
    STOP_LOSS_PERCENT: -0.15,

    /** Position size: 15-30% of available cash */
    POSITION_SIZE_MIN: 0.15,
    POSITION_SIZE_MAX: 0.3,

    /** Preferred sectors */
    PREFERRED_SECTORS: ['tech', 'healthcare'] as const,
  },

  /** 🐢 Turtle (Conservative) - Blue-chip long-term */
  TURTLE: {
    /** Trade frequency: every 100-200 ticks */
    TRADE_FREQ_MIN: 100,
    TRADE_FREQ_MAX: 200,

    /** Max volatility threshold for stock selection (annualized) */
    MAX_VOLATILITY: 0.25,

    /** Take profit threshold (10% gain) */
    TAKE_PROFIT_PERCENT: 0.1,

    /** Stop loss threshold (-5% loss) */
    STOP_LOSS_PERCENT: -0.05,

    /** Position size: 5-10% of available cash */
    POSITION_SIZE_MIN: 0.05,
    POSITION_SIZE_MAX: 0.1,

    /** Preferred blue-chip tickers (low volatility, high market cap) */
    BLUE_CHIPS: ['HSB', 'SFI', 'GDR', 'ASM', 'HMT', 'LFS', 'DTS', 'SKN', 'HBE', 'STW'] as const,
  },

  /** 🌊 Surfer (Trend Follower) - Momentum-based */
  SURFER: {
    /** Trade frequency: every 20-50 ticks */
    TRADE_FREQ_MIN: 20,
    TRADE_FREQ_MAX: 50,

    /** Moving average period */
    MA_PERIOD: 20,

    /** Trend confirmation: price must be 2% above MA20 */
    TREND_THRESHOLD_PERCENT: 0.02,

    /** Position size: 10-20% of available cash */
    POSITION_SIZE_MIN: 0.1,
    POSITION_SIZE_MAX: 0.2,
  },

  /** 🐻 Bear (Contrarian) - RSI-based value investing */
  BEAR: {
    /** Trade frequency: every 30-70 ticks */
    TRADE_FREQ_MIN: 30,
    TRADE_FREQ_MAX: 70,

    /** RSI period */
    RSI_PERIOD: 14,

    /** Oversold threshold (buy signal) */
    RSI_OVERSOLD: 30,

    /** Overbought threshold (sell signal) */
    RSI_OVERBOUGHT: 70,

    /** Position size: 12-25% of available cash */
    POSITION_SIZE_MIN: 0.12,
    POSITION_SIZE_MAX: 0.25,
  },
} as const

// ===== Panic Sell Parameters =====

export const PANIC_SELL_CONFIG = {
  /** Loss threshold to trigger panic (-8%) */
  LOSS_THRESHOLD_PERCENT: -0.08,

  /** Probability when loss threshold met (5%) */
  TRIGGER_PROBABILITY: 0.05,

  /** Cooldown period after panic sell (300 ticks) */
  COOLDOWN_TICKS: 300,
} as const

// ===== Technical Analysis Parameters =====

export const TECHNICAL_CONFIG = {
  /** Moving Average period for trend following */
  MA_PERIOD: 20,

  /** RSI period for momentum analysis */
  RSI_PERIOD: 14,

  /** Max price history to keep (prevents memory bloat) */
  MAX_PRICE_HISTORY: 50,
} as const

// ===== Performance Tuning =====

export const PERFORMANCE_CONFIG = {
  /** Distribute AI processing across N ticks */
  TICK_DISTRIBUTION: 5,

  /** Recalculate rankings every N ticks */
  RANKING_UPDATE_INTERVAL: 10,

  /** Keep last N competitor actions in history */
  MAX_ACTION_HISTORY: 100,

  /** Keep last N taunts in feed */
  MAX_TAUNT_HISTORY: 20,
} as const

// ===== AI Difficulty Multipliers =====

export const DIFFICULTY_MULTIPLIERS = {
  balanced: {
    /** Trade frequency multiplier (1.0 = normal) */
    frequencyMultiplier: 1.0,

    /** Position size multiplier (1.0 = normal) */
    positionSizeMultiplier: 1.0,
  },
  expert: {
    /** Trade more frequently (0.7 = 30% faster) */
    frequencyMultiplier: 0.7,

    /** Larger positions (1.3 = 30% bigger) */
    positionSizeMultiplier: 1.3,
  },
} as const

// Type exports for TypeScript inference
export type AIDifficulty = keyof typeof DIFFICULTY_MULTIPLIERS

import type { Competitor, Company, TradingStyle, CompetitorAction } from '../types'
import { PANIC_SELL_CONFIG, AI_STRATEGY_CONFIG, PERFORMANCE_CONFIG } from '../config/aiConfig'

// ===== Utility Functions =====

function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const recent = prices.slice(-period)
  return recent.reduce((sum, p) => sum + p, 0) / period
}

function calculateRSI(prices: number[], period = 14): number {
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

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 확률 기반 거래 시점 결정
 * 기존 `tick % random(min, max)` 방식은 작은 수의 배수 tick에 거래가 집중되는 불균일 분포 문제가 있음.
 * 매 호출마다 균일한 확률로 거래 여부를 결정하여 자연스러운 간격 제공.
 */
function shouldTrade(freqMin: number, freqMax: number): boolean {
  const targetInterval = freqMin + Math.random() * (freqMax - freqMin)
  return Math.random() < PERFORMANCE_CONFIG.TICK_DISTRIBUTION / targetInterval
}

// ===== AI Strategies =====

/**
 * 🔥 The Shark (Aggressive)
 * - High volatility stocks (tech/healthcare)
 * - Frequent trading (every 10-30 ticks)
 * - Large positions (15-30% of cash)
 * - Stop loss: -15%, Take profit: +25%
 */
function sharkStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  _priceHistory: Record<string, number[]>,
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.SHARK

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX)) return null

  // Find high volatility stocks
  const highVolStocks = companies
    .filter((c) => c.volatility > config.MIN_VOLATILITY)
    .filter((c) => config.PREFERRED_SECTORS.includes(c.sector as any))
    .sort((a, b) => b.volatility - a.volatility)

  if (highVolStocks.length === 0) return null

  // Select top volatility stock
  const target = highVolStocks[0]

  // Check if already holding - take profit/stop loss
  const position = competitor.portfolio[target.ticker]
  if (position) {
    const profitPercent = ((target.price - position.avgBuyPrice) / position.avgBuyPrice) * 100

    if (
      profitPercent > config.TAKE_PROFIT_PERCENT * 100 ||
      profitPercent < config.STOP_LOSS_PERCENT * 100
    ) {
      // Sell entire position
      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol: target.ticker,
        quantity: position.shares,
        price: target.price,
        timestamp: tick,
      }
    }
    return null // Hold
  }

  // Buy with configurable position size
  const positionSize =
    competitor.cash *
    (config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN))
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 🐢 The Turtle (Conservative)
 * - Low volatility blue chips
 * - Long-term holding (every 100-200 ticks)
 * - Small positions (5-10% of cash)
 * - Stop loss: -5%, Take profit: +10%
 */
function turtleStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  _priceHistory: Record<string, number[]>,
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.TURTLE

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX)) return null

  const safeStocks = companies
    .filter((c) => config.BLUE_CHIPS.some((chip) => c.ticker.includes(chip)))
    .filter((c) => c.volatility < config.MAX_VOLATILITY)

  if (safeStocks.length === 0) return null

  const target = safeStocks[random(0, safeStocks.length - 1)]

  // Check existing position
  const position = competitor.portfolio[target.ticker]
  if (position) {
    const profitPercent = ((target.price - position.avgBuyPrice) / position.avgBuyPrice) * 100

    if (
      profitPercent > config.TAKE_PROFIT_PERCENT * 100 ||
      profitPercent < config.STOP_LOSS_PERCENT * 100
    ) {
      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol: target.ticker,
        quantity: position.shares,
        price: target.price,
        timestamp: tick,
      }
    }
    return null
  }

  // Buy with configurable position size
  const positionSize =
    competitor.cash *
    (config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN))
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 🌊 The Surfer (Trend Follower)
 * - Buys above MA20 (uptrend)
 * - Sells below MA20 (downtrend)
 * - Medium frequency (every 20-50 ticks)
 * - Medium positions (10-20% of cash)
 */
function surferStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>,
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.SURFER

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX)) return null

  // Find stocks in uptrend
  const trendingStocks = companies.filter((c) => {
    const prices = priceHistory[c.ticker] || []
    if (prices.length < config.MA_PERIOD) return false

    const ma = calculateMA(prices, config.MA_PERIOD)
    return c.price > ma * (1 + config.TREND_THRESHOLD_PERCENT) // Above MA threshold
  })

  // Check holdings - sell if below MA
  for (const [symbol, position] of Object.entries(competitor.portfolio)) {
    const company = companies.find((c) => c.ticker === symbol)
    if (!company) continue

    const prices = priceHistory[symbol] || []
    if (prices.length < config.MA_PERIOD) continue

    const ma = calculateMA(prices, config.MA_PERIOD)

    if (company.price < ma) {
      // Trend broken - sell immediately
      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol,
        quantity: position.shares,
        price: company.price,
        timestamp: tick,
      }
    }
  }

  if (trendingStocks.length === 0) return null

  // Find strongest trend
  const strongestTrend = trendingStocks
    .map((c) => {
      const prices = priceHistory[c.ticker] || []
      const ma = calculateMA(prices, config.MA_PERIOD)
      const strength = (c.price - ma) / ma
      return { company: c, strength }
    })
    .sort((a, b) => b.strength - a.strength)[0]

  if (!strongestTrend) return null

  const target = strongestTrend.company

  // Don't buy if already holding
  if (competitor.portfolio[target.ticker]) return null

  const positionSize =
    competitor.cash *
    (config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN))
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 🐻 The Bear (Contrarian)
 * - Buys oversold (RSI < 30)
 * - Sells overbought (RSI > 70)
 * - Medium frequency (every 30-70 ticks)
 * - Medium-large positions (12-25% of cash)
 */
function bearStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>,
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.BEAR

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX)) return null

  // Check holdings - sell if overbought
  for (const [symbol, position] of Object.entries(competitor.portfolio)) {
    const prices = priceHistory[symbol] || []
    if (prices.length < config.RSI_PERIOD + 1) continue

    const rsi = calculateRSI(prices, config.RSI_PERIOD)

    if (rsi > config.RSI_OVERBOUGHT) {
      const company = companies.find((c) => c.ticker === symbol)
      if (!company) continue

      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol,
        quantity: position.shares,
        price: company.price,
        timestamp: tick,
      }
    }
  }

  // Find oversold stocks
  const oversoldStocks = companies.filter((c) => {
    const prices = priceHistory[c.ticker] || []
    if (prices.length < config.RSI_PERIOD + 1) return false

    const rsi = calculateRSI(prices, config.RSI_PERIOD)
    return rsi < config.RSI_OVERSOLD
  })

  if (oversoldStocks.length === 0) return null

  const target = oversoldStocks[random(0, oversoldStocks.length - 1)]

  // Don't buy if already holding
  if (competitor.portfolio[target.ticker]) return null

  const positionSize =
    competitor.cash *
    (config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN))
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 😱 Panic Sell Logic
 * - Triggers when position is down > 8%
 * - 5% probability when condition met
 * - 300 tick cooldown (prevents spam)
 */
function checkPanicSell(
  competitor: Competitor,
  companies: Company[],
  _tick: number,
): CompetitorAction | null {
  // Check cooldown (managed by gameStore now)
  if (competitor.panicSellCooldown > 0) {
    return null
  }

  // Check all holdings for losses
  for (const [symbol, position] of Object.entries(competitor.portfolio)) {
    const company = companies.find((c) => c.ticker === symbol)
    if (!company) continue

    const lossPercent = ((company.price - position.avgBuyPrice) / position.avgBuyPrice) * 100

    // Panic sell threshold + random probability
    if (
      lossPercent < PANIC_SELL_CONFIG.LOSS_THRESHOLD_PERCENT * 100 &&
      Math.random() < PANIC_SELL_CONFIG.TRIGGER_PROBABILITY
    ) {
      // Cooldown will be set by gameStore after this action is executed
      return {
        competitorId: competitor.id,
        action: 'panic_sell',
        symbol,
        quantity: position.shares,
        price: company.price,
        timestamp: _tick,
      }
    }
  }

  return null
}

// ===== Strategy Map =====

const STRATEGIES: Record<TradingStyle, typeof sharkStrategy> = {
  aggressive: sharkStrategy,
  conservative: turtleStrategy,
  'trend-follower': surferStrategy,
  contrarian: bearStrategy,
}

// ===== Main Processing Function =====

export function processAITrading(
  competitors: Competitor[],
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>,
): CompetitorAction[] {
  const actions: CompetitorAction[] = []

  competitors.forEach((competitor) => {

    // 1. Check panic sell first (priority)
    const panicAction = checkPanicSell(competitor, companies, tick)
    if (panicAction) {
      actions.push(panicAction)
      return
    }

    // 2. Execute normal strategy
    const strategy = STRATEGIES[competitor.style]
    const action = strategy(competitor, companies, tick, priceHistory)

    if (action) {
      actions.push(action)
    }
  })

  return actions
}

// ===== Competitor Generation =====

const COMPETITOR_NAMES = [
  'Warren Buffoon',
  'Elon Musk-rat',
  'Peter Lynch Pin',
  'Ray Dalio-ma',
  'George Soros-t',
  'Carl Icahn-t',
  'Bill Ackman-ia',
  'David Tepper-oni',
  'Stanley Druckenmiller',
]

const AVATARS = [
  '/avatars/shark.png',
  '/avatars/turtle.png',
  '/avatars/surfer.png',
  '/avatars/bear.png',
  '/avatars/trader1.png',
  '/avatars/trader2.png',
]

export function generateCompetitors(count: number, startingCash: number): Competitor[] {
  const styles: TradingStyle[] = ['aggressive', 'conservative', 'trend-follower', 'contrarian']
  const shuffledNames = [...COMPETITOR_NAMES].sort(() => Math.random() - 0.5)

  return Array.from({ length: count }, (_, i) => ({
    id: `competitor-${i}`,
    name: shuffledNames[i % shuffledNames.length],
    avatar: AVATARS[i % AVATARS.length],
    style: styles[i % styles.length],
    cash: startingCash,
    portfolio: {},
    totalAssetValue: startingCash,
    roi: 0,
    initialAssets: startingCash,
    lastDayChange: 0,
    panicSellCooldown: 0,
  }))
}

// ===== Price History Helper =====

/**
 * Extract price history for technical analysis
 * Limits to last 50 prices to prevent memory bloat (MA20 + RSI14 require ~30 prices)
 *
 * @param companies - Current stock data with price history
 * @returns Record of ticker -> price array (max 50 recent prices)
 */
export function getPriceHistory(companies: Company[]): Record<string, number[]> {
  const history: Record<string, number[]> = {}

  companies.forEach((company) => {
    // Use existing priceHistory from Company type
    const fullHistory = company.priceHistory || []

    // Limit to last 50 prices to prevent memory leak
    // 50 is sufficient for MA20 (20) + RSI14 (14) + buffer
    history[company.ticker] = fullHistory.slice(-50)
  })

  return history
}

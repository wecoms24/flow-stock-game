import type { Competitor, Company, TradingStyle, CompetitorAction, TauntMessage, MarketRegime } from '../types'
import type { PlayerProfile } from '../types/personalization'
import {
  PANIC_SELL_CONFIG,
  AI_STRATEGY_CONFIG,
  PERFORMANCE_CONFIG,
  REGIME_MODIFIERS,
  REGIME_PANIC_MULTIPLIER,
  COMPETITOR_MEMORY_CONFIG,
} from '../config/aiConfig'
import { calculateMA, calculateRSI } from '../utils/technicalIndicators'
import { PLAYER_RESPONSE_EFFECT_DURATION } from '../data/taunts'

/** Per-competitor effects from player taunt responses */
export interface PlayerResponseEffect {
  /** 자신감 응답: 거래 빈도 20% 증가 */
  tradeFrequencyBoost: boolean
  /** 겸손 응답: 도발 빈도 50% 감소 */
  tauntSuppression: boolean
}

/**
 * 플레이어의 최근 도발 응답으로부터 경쟁자별 효과를 계산
 * @param taunts 전체 도발 메시지 목록
 * @param currentTick 현재 게임 시간 (absolute timestamp)
 * @returns competitorId → PlayerResponseEffect 매핑
 */
export function computePlayerResponseEffects(
  taunts: TauntMessage[],
  currentTick: number,
): Record<string, PlayerResponseEffect> {
  const effects: Record<string, PlayerResponseEffect> = {}

  for (const taunt of taunts) {
    if (!taunt.playerResponse) continue

    const hoursElapsed = currentTick - taunt.timestamp
    const duration = PLAYER_RESPONSE_EFFECT_DURATION[taunt.playerResponse]

    if (duration <= 0 || hoursElapsed > duration) continue

    if (!effects[taunt.competitorId]) {
      effects[taunt.competitorId] = { tradeFrequencyBoost: false, tauntSuppression: false }
    }

    if (taunt.playerResponse === 'confident') {
      effects[taunt.competitorId].tradeFrequencyBoost = true
    } else if (taunt.playerResponse === 'humble') {
      effects[taunt.competitorId].tauntSuppression = true
    }
  }

  return effects
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 확률 기반 거래 시점 결정
 * 레짐 수정자를 반영하여 빈도를 조절
 */
function shouldTrade(freqMin: number, freqMax: number, frequencyMod: number = 1.0): boolean {
  const targetInterval = (freqMin + Math.random() * (freqMax - freqMin)) / Math.max(0.1, frequencyMod)
  return Math.random() < PERFORMANCE_CONFIG.HOUR_DISTRIBUTION / targetInterval
}

/**
 * 메모리 기반 종목 선택 가중치 적용
 * 섹터 승률이 낮으면 선택 확률 감소, 높으면 증가
 */
function applyMemoryWeight(companies: Company[], memory?: Competitor['memory']): Company[] {
  if (!memory || Object.keys(memory.sectorWinRate).length === 0) return companies

  // 승률 기반 가중치 적용: 낮으면 제외, 높으면 복제(선택 확률 증가)
  const weighted: Company[] = []
  for (const c of companies) {
    const sectorStats = memory.sectorWinRate[c.sector]
    if (!sectorStats || sectorStats.total < 3) {
      weighted.push(c)
      continue
    }

    const winRate = sectorStats.wins / sectorStats.total
    if (winRate < COMPETITOR_MEMORY_CONFIG.LOW_WINRATE_THRESHOLD) {
      if (Math.random() < 0.5) weighted.push(c) // 50% 확률로 제외
    } else if (winRate > COMPETITOR_MEMORY_CONFIG.HIGH_WINRATE_THRESHOLD) {
      weighted.push(c)
      if (Math.random() < 0.5) weighted.push(c) // 1.5x 선택 확률 (복제)
    } else {
      weighted.push(c)
    }
  }
  return weighted.length > 0 ? weighted : companies
}

/**
 * 메모리 기반 포지션 크기 조정
 */
function applyMemoryPositionBias(positionSize: number, memory?: Competitor['memory']): number {
  if (!memory) return positionSize
  return positionSize * (1.0 + memory.adaptationBias * COMPETITOR_MEMORY_CONFIG.POSITION_BIAS_SCALE)
}

// ===== AI Strategies =====

/**
 * 🔥 The Shark (Aggressive)
 * - High volatility stocks (tech/healthcare)
 * - Frequent trading (every 10-30 ticks)
 * - Large positions (15-30% of cash)
 * - Stop loss: -15%, Take profit: +25%
 * ✨ Phase 1: 레짐별 빈도/포지션 조정
 * ✨ Phase 2: 메모리 기반 종목 선택
 */
function sharkStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  _priceHistory: Record<string, number[]>,
  regime: MarketRegime = 'CALM',
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.SHARK
  const regimeMod = REGIME_MODIFIERS.aggressive[regime]

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX, regimeMod.frequencyMod)) return null

  // Find high volatility stocks (with memory filter)
  let highVolStocks = companies
    .filter((c) => c.status !== 'acquired')
    .filter((c) => c.volatility > config.MIN_VOLATILITY)
    .filter((c) => config.PREFERRED_SECTORS.includes(c.sector as any))
    .sort((a, b) => b.volatility - a.volatility)

  highVolStocks = applyMemoryWeight(highVolStocks, competitor.memory)
  if (highVolStocks.length === 0) return null

  // Select top volatility stock
  const target = highVolStocks[0]

  // Check if already holding - take profit/stop loss
  const position = competitor.portfolio[target.id]
  if (position) {
    const profitPercent = ((target.price - position.avgBuyPrice) / position.avgBuyPrice) * 100

    if (
      profitPercent > config.TAKE_PROFIT_PERCENT * 100 ||
      profitPercent < config.STOP_LOSS_PERCENT * 100
    ) {
      return {
        competitorId: competitor.id,
        action: 'sell',
        companyId: target.id,
        ticker: target.ticker,
        quantity: position.shares,
        price: target.price,
        timestamp: tick,
      }
    }
    return null
  }

  // Buy with regime-adjusted position size
  const baseSize =
    config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN)
  const positionSize = applyMemoryPositionBias(
    competitor.cash * baseSize * regimeMod.positionMod,
    competitor.memory,
  )
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    companyId: target.id,
    ticker: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 🐢 The Turtle (Conservative)
 * ✨ Phase 1: CRISIS 시 극단적 방어 (빈도 70% 감소)
 */
function turtleStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  _priceHistory: Record<string, number[]>,
  regime: MarketRegime = 'CALM',
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.TURTLE
  const regimeMod = REGIME_MODIFIERS.conservative[regime]

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX, regimeMod.frequencyMod)) return null

  let safeStocks = companies
    .filter((c) => c.status !== 'acquired')
    .filter((c) => config.BLUE_CHIPS.some((chip) => c.ticker.includes(chip)))
    .filter((c) => c.volatility < config.MAX_VOLATILITY)

  safeStocks = applyMemoryWeight(safeStocks, competitor.memory)
  if (safeStocks.length === 0) return null

  const target = safeStocks[random(0, safeStocks.length - 1)]

  const position = competitor.portfolio[target.id]
  if (position) {
    const profitPercent = ((target.price - position.avgBuyPrice) / position.avgBuyPrice) * 100

    if (
      profitPercent > config.TAKE_PROFIT_PERCENT * 100 ||
      profitPercent < config.STOP_LOSS_PERCENT * 100
    ) {
      return {
        competitorId: competitor.id,
        action: 'sell',
        companyId: target.id,
        ticker: target.ticker,
        quantity: position.shares,
        price: target.price,
        timestamp: tick,
      }
    }
    return null
  }

  const baseSize =
    config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN)
  const positionSize = applyMemoryPositionBias(
    competitor.cash * baseSize * regimeMod.positionMod,
    competitor.memory,
  )
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    companyId: target.id,
    ticker: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 🌊 The Surfer (Trend Follower)
 * ✨ Phase 1: 변동성을 기회로 활용 (VOLATILE/CRISIS에서 빈도 증가)
 */
function surferStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>,
  regime: MarketRegime = 'CALM',
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.SURFER
  const regimeMod = REGIME_MODIFIERS['trend-follower'][regime]

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX, regimeMod.frequencyMod)) return null

  // Find stocks in uptrend
  const trendingStocks = companies.filter((c) => {
    if (c.status === 'acquired') return false

    const prices = priceHistory[c.id] || []
    if (prices.length < config.MA_PERIOD) return false

    const ma = calculateMA(prices, config.MA_PERIOD)
    return c.price > ma * (1 + config.TREND_THRESHOLD_PERCENT) // Above MA threshold
  })

  // Check holdings - sell if below MA
  for (const [companyId, position] of Object.entries(competitor.portfolio)) {
    const company = companies.find((c) => c.id === companyId)
    if (!company) continue

    const prices = priceHistory[companyId] || []
    if (prices.length < config.MA_PERIOD) continue

    const ma = calculateMA(prices, config.MA_PERIOD)

    if (company.price < ma) {
      // Trend broken - sell immediately
      return {
        competitorId: competitor.id,
        action: 'sell',
        companyId,
        ticker: company.ticker,
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
      const prices = priceHistory[c.id] || []
      const ma = calculateMA(prices, config.MA_PERIOD)
      const strength = (c.price - ma) / ma
      return { company: c, strength }
    })
    .sort((a, b) => b.strength - a.strength)[0]

  if (!strongestTrend) return null

  const target = strongestTrend.company

  // Don't buy if already holding
  if (competitor.portfolio[target.id]) return null

  const baseSize =
    config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN)
  const positionSize = applyMemoryPositionBias(
    competitor.cash * baseSize * regimeMod.positionMod,
    competitor.memory,
  )
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    companyId: target.id,
    ticker: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 🐻 The Bear (Contrarian)
 * ✨ Phase 1: CRISIS에서 공격적 역발상 매수 (빈도/포지션 모두 1.5배)
 */
function bearStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>,
  regime: MarketRegime = 'CALM',
): CompetitorAction | null {
  const config = AI_STRATEGY_CONFIG.BEAR
  const regimeMod = REGIME_MODIFIERS.contrarian[regime]

  if (!shouldTrade(config.TRADE_FREQ_MIN, config.TRADE_FREQ_MAX, regimeMod.frequencyMod)) return null

  // Check holdings - sell if overbought
  for (const [companyId, position] of Object.entries(competitor.portfolio)) {
    const prices = priceHistory[companyId] || []
    if (prices.length < config.RSI_PERIOD + 1) continue

    const rsi = calculateRSI(prices, config.RSI_PERIOD)

    if (rsi > config.RSI_OVERBOUGHT) {
      const company = companies.find((c) => c.id === companyId)
      if (!company) continue

      return {
        competitorId: competitor.id,
        action: 'sell',
        companyId,
        ticker: company.ticker,
        quantity: position.shares,
        price: company.price,
        timestamp: tick,
      }
    }
  }

  // Find oversold stocks
  const oversoldStocks = companies.filter((c) => {
    if (c.status === 'acquired') return false

    const prices = priceHistory[c.id] || []
    if (prices.length < config.RSI_PERIOD + 1) return false

    const rsi = calculateRSI(prices, config.RSI_PERIOD)
    return rsi < config.RSI_OVERSOLD
  })

  if (oversoldStocks.length === 0) return null

  const target = oversoldStocks[random(0, oversoldStocks.length - 1)]

  // Don't buy if already holding
  if (competitor.portfolio[target.id]) return null

  const baseSize =
    config.POSITION_SIZE_MIN + Math.random() * (config.POSITION_SIZE_MAX - config.POSITION_SIZE_MIN)
  const positionSize = applyMemoryPositionBias(
    competitor.cash * baseSize * regimeMod.positionMod,
    competitor.memory,
  )
  const quantity = Math.floor(positionSize / target.price)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    companyId: target.id,
    ticker: target.ticker,
    quantity,
    price: target.price,
    timestamp: tick,
  }
}

/**
 * 😱 Panic Sell Logic
 * ✨ Phase 1: 레짐별 패닉 확률 차등 (CALM 0.6x → CRISIS 3.0x)
 */
function checkPanicSell(
  competitor: Competitor,
  companies: Company[],
  _tick: number,
  regime: MarketRegime = 'CALM',
): CompetitorAction | null {
  if (competitor.panicSellCooldown > 0) {
    return null
  }

  const panicMul = REGIME_PANIC_MULTIPLIER[regime]

  for (const [companyId, position] of Object.entries(competitor.portfolio)) {
    const company = companies.find((c) => c.id === companyId)
    if (!company) continue

    const lossPercent = ((company.price - position.avgBuyPrice) / position.avgBuyPrice) * 100

    if (
      lossPercent < PANIC_SELL_CONFIG.LOSS_THRESHOLD_PERCENT * 100 &&
      Math.random() < PANIC_SELL_CONFIG.TRIGGER_PROBABILITY * panicMul
    ) {
      return {
        competitorId: competitor.id,
        action: 'panic_sell',
        companyId,
        ticker: company.ticker,
        quantity: position.shares,
        price: company.price,
        timestamp: _tick,
      }
    }
  }

  return null
}

// ===== Strategy Map =====

type StrategyFn = (
  competitor: Competitor,
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>,
  regime?: MarketRegime,
) => CompetitorAction | null

const STRATEGIES: Record<TradingStyle, StrategyFn> = {
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
  playerProfile?: PlayerProfile,
  personalizationEnabled?: boolean,
  responseEffects?: Record<string, PlayerResponseEffect>,
  regime?: MarketRegime,
): CompetitorAction[] {
  const actions: CompetitorAction[] = []
  const currentRegime = regime ?? 'CALM'

  competitors.forEach((competitor) => {

    // 1. Check panic sell first (priority)
    const panicAction = checkPanicSell(competitor, companies, tick, currentRegime)
    if (panicAction) {
      actions.push(panicAction)
      return
    }

    // 2. Execute normal strategy (with regime awareness)
    const strategy = STRATEGIES[competitor.style]
    const action = strategy(competitor, companies, tick, priceHistory, currentRegime)

    // 2.5. Player "confident" response → 20% extra trade attempt
    if (!action && responseEffects?.[competitor.id]?.tradeFrequencyBoost) {
      if (Math.random() < 0.20) {
        const bonusAction = strategy(competitor, companies, tick, priceHistory, currentRegime)
        if (bonusAction) {
          actions.push(bonusAction)
          return
        }
      }
    }

    if (action) {
      // 3. Mirror Rival: adjust parameters based on player profile
      if (competitor.isMirrorRival && personalizationEnabled && playerProfile) {
        const positionMultiplier = playerProfile.riskTolerance // 0.0-1.0
        // Note: playerProfile.playPace affects frequency (handled in shouldTrade, not here)

        // Adjust position size based on player's risk tolerance
        const adjustedQuantity = Math.max(
          1,
          Math.floor(action.quantity * (0.5 + positionMultiplier)),
        )

        actions.push({
          ...action,
          quantity: adjustedQuantity,
        })
      } else {
        actions.push(action)
      }
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

  const competitors = Array.from({ length: count }, (_, i) => ({
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
    isMirrorRival: false,
    headToHeadWins: 0,
    headToHeadLosses: 0,
    memory: { recentTrades: [], sectorWinRate: {}, adaptationBias: 0 },
  }))

  // Designate one competitor as Mirror Rival (personalization feature)
  if (competitors.length > 0) {
    const mirrorIndex = Math.floor(Math.random() * competitors.length)
    competitors[mirrorIndex].isMirrorRival = true
  }

  return competitors
}

// ===== Price History Helper =====

/**
 * Extract price history for technical analysis
 * Limits to last 50 prices to prevent memory bloat (MA20 + RSI14 require ~30 prices)
 *
 * @param companies - Current stock data with price history
 * @returns Record of companyId -> price array (max 50 recent prices)
 */
export function getPriceHistory(companies: Company[]): Record<string, number[]> {
  const history: Record<string, number[]> = {}

  companies.forEach((company) => {
    // Use existing priceHistory from Company type
    const fullHistory = company.priceHistory || []

    // Limit to last 50 prices to prevent memory leak
    // 50 is sufficient for MA20 (20) + RSI14 (14) + buffer
    history[company.id] = fullHistory.slice(-50)
  })

  return history
}

// ===== Competitor Memory Helpers =====

/**
 * 경쟁자 메모리 초기화 (기존 세이브 호환용)
 */
export function initCompetitorMemory(): NonNullable<Competitor['memory']> {
  return { recentTrades: [], sectorWinRate: {}, adaptationBias: 0 }
}

/**
 * 매도 완료 시 경쟁자 트레이드 메모리 업데이트
 */
export function updateCompetitorMemory(
  memory: NonNullable<Competitor['memory']>,
  record: { companyId: string; sector: string; buyPrice: number; sellPrice: number; timestamp: number },
): NonNullable<Competitor['memory']> {
  const pnl = record.sellPrice - record.buyPrice
  const isWin = pnl > 0

  // 링 버퍼: 최대 20개
  const newTrades = [
    ...memory.recentTrades,
    {
      companyId: record.companyId,
      sector: record.sector,
      direction: 'sell' as const,
      buyPrice: record.buyPrice,
      sellPrice: record.sellPrice,
      pnl,
      timestamp: record.timestamp,
    },
  ].slice(-COMPETITOR_MEMORY_CONFIG.MAX_TRADE_RECORDS)

  // 섹터 승률 업데이트
  const sectorWinRate = { ...memory.sectorWinRate }
  if (!sectorWinRate[record.sector]) {
    sectorWinRate[record.sector] = { wins: 0, total: 0 }
  }
  sectorWinRate[record.sector] = {
    wins: sectorWinRate[record.sector].wins + (isWin ? 1 : 0),
    total: sectorWinRate[record.sector].total + 1,
  }

  // adaptationBias 업데이트 (비대칭)
  const biasDelta = isWin
    ? COMPETITOR_MEMORY_CONFIG.WIN_BIAS_DELTA
    : COMPETITOR_MEMORY_CONFIG.LOSS_BIAS_DELTA
  const newBias = Math.max(
    COMPETITOR_MEMORY_CONFIG.BIAS_MIN,
    Math.min(COMPETITOR_MEMORY_CONFIG.BIAS_MAX, memory.adaptationBias + biasDelta),
  )

  return {
    recentTrades: newTrades,
    sectorWinRate,
    adaptationBias: newBias,
  }
}

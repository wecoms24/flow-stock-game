# 🥊 Investment Battle Mode - Implementation Workflow

**Feature**: AI Competitor System with Real-time Ranking
**Status**: Implementation Plan
**Created**: 2026-02-14
**Estimated Duration**: 5-6 days (single developer) | 3-4 days (parallel tracks)

---

## 📋 Executive Summary

### Objective
Implement a competitive multiplayer-style mode where players compete against 1-5 AI rivals for the highest ROI (Return on Investment) in the stock market simulation. The system features 4 distinct AI trading strategies, real-time rankings, arcade-style UI effects, and a taunt messaging system.

### Key Features
- ✅ 1-5 AI competitors with unique trading personalities
- ✅ 4 AI strategies: Aggressive (Shark), Conservative (Turtle), Trend Follower (Surfer), Contrarian (Bear)
- ✅ "Panic Sell" logic for emotional trading simulation
- ✅ Real-time ranking leaderboard with ROI tracking
- ✅ Taunt message system with contextual AI reactions
- ✅ Arcade-style UI effects (RANK UP, CHAMPION animations)

### Complexity Assessment
- **Technical Complexity**: Medium (7/10)
  - AI strategy algorithms: Medium
  - Performance optimization: High (60 FPS requirement)
  - UI/UX integration: Medium
- **Integration Risk**: Medium
  - Requires Tick Engine modification
  - Zustand store expansion
  - Potential performance impact

### Critical Success Factors
1. **Performance**: Maintain 60 FPS with 5 active AI competitors
2. **Balance**: AI should be challenging but beatable with skill
3. **User Experience**: Intuitive UI with engaging competitive elements
4. **Code Quality**: TypeScript strict mode, ESLint compliance

---

## 🏗️ Architecture Analysis

### System Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Retro Stock OS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ StartScreen  │────────▶│  GameStore   │                │
│  │ (Setup UI)   │         │  (State)     │                │
│  └──────────────┘         └───────┬──────┘                │
│                                    │                        │
│                                    ▼                        │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ Tick Engine  │◀───────▶│ Competitor   │                │
│  │ (5 tick/AI)  │         │ Engine (AI)  │                │
│  └──────────────┘         └──────────────┘                │
│         │                         │                        │
│         │                         │                        │
│         ▼                         ▼                        │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ Price Engine │         │ Ranking      │                │
│  │ (Web Worker) │         │ Calculator   │                │
│  └──────────────┘         └───────┬──────┘                │
│                                    │                        │
│                                    ▼                        │
│                           ┌──────────────┐                 │
│                           │ Ranking      │                 │
│                           │ Window (UI)  │                 │
│                           └──────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New Components

| Component | Type | Purpose | Location |
|-----------|------|---------|----------|
| `Competitor` | Type | AI trader data structure | `src/types/index.ts` |
| `CompetitorEngine` | Engine | AI trading logic | `src/engines/competitorEngine.ts` |
| `RankingWindow` | UI | Leaderboard display | `src/components/windows/RankingWindow.tsx` |
| `RankChangeNotification` | Effect | Arcade animations | `src/components/effects/RankChangeNotification.tsx` |
| `taunts.ts` | Data | Taunt message templates | `src/data/taunts.ts` |

### Data Flow

```
Game Start
    │
    ├─▶ User selects competitor count (1-5)
    │
    ├─▶ initializeCompetitors(count, startingCash)
    │
    ├─▶ GameStore.competitors[] populated
    │
    └─▶ Game loop begins

Every Tick (200ms)
    │
    ├─▶ Price Engine updates stock prices
    │
    └─▶ Every 5 ticks:
        ├─▶ processCompetitorTick()
        │   ├─▶ For each competitor:
        │   │   ├─▶ Check panic sell (priority)
        │   │   ├─▶ Execute strategy logic
        │   │   └─▶ Generate trade action
        │   │
        │   └─▶ executeBatchActions()
        │
        └─▶ Every 10 ticks:
            ├─▶ calculateROI() for all
            ├─▶ updateRankings()
            └─▶ trigger UI animations if rank changed
```

---

## 📅 Implementation Phases

### Phase 1: Foundation (Day 1-2)
**Goal**: Establish core data structures and AI logic
**Dependencies**: None
**Parallelizable**: No

#### Tasks

##### Task 1.1: Type Definitions
**File**: `src/types/index.ts`
**Estimated Time**: 30 minutes
**Priority**: Critical

```typescript
// Add to existing types
export type TradingStyle = 'aggressive' | 'conservative' | 'trend-follower' | 'contrarian'

export interface Competitor {
  id: string
  name: string
  avatar: string // Path to pixel art avatar
  style: TradingStyle
  cash: number
  portfolio: Record<string, PortfolioPosition>
  totalAssetValue: number
  roi: number // (current - initial) / initial * 100
  initialAssets: number
  lastDayChange: number // Yesterday's ROI - Today's ROI
  panicSellCooldown: number // Ticks until next panic sell possible
}

export interface CompetitorAction {
  competitorId: string
  action: 'buy' | 'sell' | 'panic_sell'
  symbol: string
  quantity: number
  price: number
  timestamp: number
}

export interface TauntMessage {
  competitorId: string
  competitorName: string
  message: string
  type: 'rank_up' | 'rank_down' | 'overtake_player' | 'panic' | 'champion'
  timestamp: number
}
```

**Validation**:
```bash
npm run build  # TypeScript compilation success
tsc --noEmit   # Type check passes
```

---

##### Task 1.2: GameStore Extension
**File**: `src/stores/gameStore.ts`
**Estimated Time**: 45 minutes
**Priority**: Critical
**Dependencies**: Task 1.1

```typescript
// Add to GameStore interface
interface GameStore {
  // ... existing fields

  // Competitor system
  competitors: Competitor[]
  competitorCount: number // 0 = disabled, 1-5 = active
  competitorActions: CompetitorAction[] // Recent 100 actions
  taunts: TauntMessage[] // Recent 20 taunts

  // Actions
  initializeCompetitors: (count: number, startingCash: number) => void
  processCompetitorTick: () => void
  executeBatchActions: (actions: CompetitorAction[]) => void
  updateCompetitorAssets: () => void
  calculateRankings: () => { rank: number; name: string; roi: number }[]
  addTaunt: (taunt: TauntMessage) => void
}

// Implementation
const gameStore = create<GameStore>((set, get) => ({
  // ... existing state

  competitors: [],
  competitorCount: 0,
  competitorActions: [],
  taunts: [],

  initializeCompetitors: (count, startingCash) => {
    const competitors = generateCompetitors(count, startingCash)
    set({ competitors, competitorCount: count })
  },

  processCompetitorTick: () => {
    const { competitors, companies, time, competitorActions } = get()
    const priceHistory = getPriceHistory() // From chart data

    const newActions = processAITrading(
      competitors,
      companies,
      time.tick,
      priceHistory
    )

    get().executeBatchActions(newActions)

    // Update action log (keep last 100)
    set(state => ({
      competitorActions: [...state.competitorActions, ...newActions].slice(-100)
    }))
  },

  executeBatchActions: (actions) => {
    set(state => {
      const newCompetitors = [...state.competitors]
      const newTaunts = [...state.taunts]

      actions.forEach(action => {
        const competitor = newCompetitors.find(c => c.id === action.competitorId)
        if (!competitor) return

        if (action.action === 'buy') {
          const cost = action.quantity * action.price
          competitor.cash -= cost
          competitor.portfolio[action.symbol] = {
            quantity: (competitor.portfolio[action.symbol]?.quantity || 0) + action.quantity,
            averagePrice: calculateAveragePrice(competitor.portfolio[action.symbol], action),
            totalCost: (competitor.portfolio[action.symbol]?.totalCost || 0) + cost
          }
        } else if (action.action === 'sell' || action.action === 'panic_sell') {
          const position = competitor.portfolio[action.symbol]
          if (!position) return

          const proceeds = action.quantity * action.price
          competitor.cash += proceeds
          position.quantity -= action.quantity

          if (position.quantity <= 0) {
            delete competitor.portfolio[action.symbol]
          }

          // Add taunt for panic sell
          if (action.action === 'panic_sell') {
            newTaunts.push({
              competitorId: competitor.id,
              competitorName: competitor.name,
              message: PANIC_SELL_TAUNTS[Math.floor(Math.random() * PANIC_SELL_TAUNTS.length)],
              type: 'panic',
              timestamp: Date.now()
            })
          }
        }
      })

      return {
        competitors: newCompetitors,
        taunts: newTaunts.slice(-20) // Keep last 20
      }
    })
  },

  updateCompetitorAssets: () => {
    set(state => {
      const newCompetitors = state.competitors.map(competitor => {
        const portfolioValue = Object.entries(competitor.portfolio).reduce((sum, [symbol, position]) => {
          const currentPrice = state.companies.find(c => c.symbol === symbol)?.currentPrice || 0
          return sum + (position.quantity * currentPrice)
        }, 0)

        const totalAssetValue = competitor.cash + portfolioValue
        const roi = ((totalAssetValue - competitor.initialAssets) / competitor.initialAssets) * 100

        return {
          ...competitor,
          totalAssetValue,
          roi
        }
      })

      return { competitors: newCompetitors }
    })
  },

  calculateRankings: () => {
    const { competitors, player } = get()

    const all = [
      { name: 'You', roi: ((player.totalAssetValue - player.initialAssets) / player.initialAssets) * 100 },
      ...competitors.map(c => ({ name: c.name, roi: c.roi }))
    ]

    return all
      .sort((a, b) => b.roi - a.roi)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  },

  addTaunt: (taunt) => {
    set(state => ({
      taunts: [...state.taunts, taunt].slice(-20)
    }))
  }
}))
```

**Validation**:
- Zustand type checking passes
- Store actions callable from components
- State updates trigger re-renders

---

##### Task 1.3: AI Engine Core
**File**: `src/engines/competitorEngine.ts` (NEW)
**Estimated Time**: 3 hours
**Priority**: Critical
**Dependencies**: Task 1.1, 1.2

```typescript
import { Competitor, Company, TradingStyle, CompetitorAction } from '../types'

// ===== Utility Functions =====

function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const recent = prices.slice(-period)
  return recent.reduce((sum, p) => sum + p, 0) / period
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50 // Neutral

  const changes = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  const recentChanges = changes.slice(-period)
  const gains = recentChanges.filter(c => c > 0).reduce((sum, c) => sum + c, 0) / period
  const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((sum, c) => sum + c, 0)) / period

  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - (100 / (1 + rs))
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ===== AI Strategies =====

/**
 * 🔥 The Shark (Aggressive)
 * - High volatility stocks (Tech/Healthcare)
 * - Frequent trading (every 10-30 ticks)
 * - Large positions (15-30% of cash)
 * - Stop loss: -15%, Take profit: +25%
 */
function sharkStrategy(
  competitor: Competitor,
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>
): CompetitorAction | null {
  // Trade frequency check
  if (tick % random(10, 30) !== 0) return null

  // Find high volatility stocks
  const highVolStocks = companies
    .filter(c => c.volatility > 0.003)
    .filter(c => ['Tech', 'Healthcare'].includes(c.sector))
    .sort((a, b) => b.volatility - a.volatility)

  if (highVolStocks.length === 0) return null

  // Select top volatility stock
  const target = highVolStocks[0]

  // Check if already holding - take profit/stop loss
  const position = competitor.portfolio[target.symbol]
  if (position) {
    const profitPercent = ((target.currentPrice - position.averagePrice) / position.averagePrice) * 100

    if (profitPercent > 25 || profitPercent < -15) {
      // Sell entire position
      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol: target.symbol,
        quantity: position.quantity,
        price: target.currentPrice,
        timestamp: tick
      }
    }
    return null // Hold
  }

  // Buy with 15-30% of cash
  const positionSize = competitor.cash * (0.15 + Math.random() * 0.15)
  const quantity = Math.floor(positionSize / target.currentPrice)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.symbol,
    quantity,
    price: target.currentPrice,
    timestamp: tick
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
  priceHistory: Record<string, number[]>
): CompetitorAction | null {
  // Trade frequency check (very infrequent)
  if (tick % random(100, 200) !== 0) return null

  const blueChips = ['SAMSUNG', 'HYUNDAI', 'POSCO', 'SK', 'LG']
  const safeStocks = companies
    .filter(c => blueChips.includes(c.symbol))
    .filter(c => c.volatility < 0.002)

  if (safeStocks.length === 0) return null

  const target = safeStocks[random(0, safeStocks.length - 1)]

  // Check existing position
  const position = competitor.portfolio[target.symbol]
  if (position) {
    const profitPercent = ((target.currentPrice - position.averagePrice) / position.averagePrice) * 100

    if (profitPercent > 10 || profitPercent < -5) {
      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol: target.symbol,
        quantity: position.quantity,
        price: target.currentPrice,
        timestamp: tick
      }
    }
    return null
  }

  // Buy with 5-10% of cash
  const positionSize = competitor.cash * (0.05 + Math.random() * 0.05)
  const quantity = Math.floor(positionSize / target.currentPrice)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.symbol,
    quantity,
    price: target.currentPrice,
    timestamp: tick
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
  priceHistory: Record<string, number[]>
): CompetitorAction | null {
  if (tick % random(20, 50) !== 0) return null

  // Find stocks in uptrend
  const trendingStocks = companies.filter(c => {
    const prices = priceHistory[c.symbol] || []
    if (prices.length < 20) return false

    const ma20 = calculateMA(prices, 20)
    return c.currentPrice > ma20 * 1.02 // 2% above MA20
  })

  // Check holdings - sell if below MA20
  for (const [symbol, position] of Object.entries(competitor.portfolio)) {
    const company = companies.find(c => c.symbol === symbol)
    if (!company) continue

    const prices = priceHistory[symbol] || []
    if (prices.length < 20) continue

    const ma20 = calculateMA(prices, 20)

    if (company.currentPrice < ma20) {
      // Trend broken - sell immediately
      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol,
        quantity: position.quantity,
        price: company.currentPrice,
        timestamp: tick
      }
    }
  }

  if (trendingStocks.length === 0) return null

  // Find strongest trend
  const strongestTrend = trendingStocks
    .map(c => {
      const prices = priceHistory[c.symbol] || []
      const ma20 = calculateMA(prices, 20)
      const strength = (c.currentPrice - ma20) / ma20
      return { company: c, strength }
    })
    .sort((a, b) => b.strength - a.strength)[0]

  if (!strongestTrend) return null

  const target = strongestTrend.company

  // Don't buy if already holding
  if (competitor.portfolio[target.symbol]) return null

  const positionSize = competitor.cash * (0.10 + Math.random() * 0.10)
  const quantity = Math.floor(positionSize / target.currentPrice)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.symbol,
    quantity,
    price: target.currentPrice,
    timestamp: tick
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
  priceHistory: Record<string, number[]>
): CompetitorAction | null {
  if (tick % random(30, 70) !== 0) return null

  // Check holdings - sell if overbought (RSI > 70)
  for (const [symbol, position] of Object.entries(competitor.portfolio)) {
    const prices = priceHistory[symbol] || []
    if (prices.length < 15) continue

    const rsi = calculateRSI(prices, 14)

    if (rsi > 70) {
      return {
        competitorId: competitor.id,
        action: 'sell',
        symbol,
        quantity: position.quantity,
        price: companies.find(c => c.symbol === symbol)?.currentPrice || 0,
        timestamp: tick
      }
    }
  }

  // Find oversold stocks (RSI < 30)
  const oversoldStocks = companies.filter(c => {
    const prices = priceHistory[c.symbol] || []
    if (prices.length < 15) return false

    const rsi = calculateRSI(prices, 14)
    return rsi < 30
  })

  if (oversoldStocks.length === 0) return null

  const target = oversoldStocks[random(0, oversoldStocks.length - 1)]

  // Don't buy if already holding
  if (competitor.portfolio[target.symbol]) return null

  const positionSize = competitor.cash * (0.12 + Math.random() * 0.13)
  const quantity = Math.floor(positionSize / target.currentPrice)

  if (quantity <= 0) return null

  return {
    competitorId: competitor.id,
    action: 'buy',
    symbol: target.symbol,
    quantity,
    price: target.currentPrice,
    timestamp: tick
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
  tick: number
): CompetitorAction | null {
  // Check cooldown
  if (competitor.panicSellCooldown > 0) {
    competitor.panicSellCooldown--
    return null
  }

  // Check all holdings for losses
  for (const [symbol, position] of Object.entries(competitor.portfolio)) {
    const company = companies.find(c => c.symbol === symbol)
    if (!company) continue

    const lossPercent = ((company.currentPrice - position.averagePrice) / position.averagePrice) * 100

    // -8% loss + 5% random chance = panic sell
    if (lossPercent < -8 && Math.random() < 0.05) {
      competitor.panicSellCooldown = 300 // 300 tick cooldown

      return {
        competitorId: competitor.id,
        action: 'panic_sell',
        symbol,
        quantity: position.quantity,
        price: company.currentPrice,
        timestamp: tick
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
  contrarian: bearStrategy
}

// ===== Main Processing Function =====

export function processAITrading(
  competitors: Competitor[],
  companies: Company[],
  tick: number,
  priceHistory: Record<string, number[]>
): CompetitorAction[] {
  const actions: CompetitorAction[] = []

  competitors.forEach((competitor, index) => {
    // Distribute processing across ticks (offset by index)
    if ((tick + index) % 5 !== 0) return

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
  'Warren Buffoon', 'Elon Musk-rat', 'Peter Lynch Pin',
  'Ray Dalio-ma', 'George Soros-t', 'Carl Icahn-t',
  'Bill Ackman-ia', 'David Tepper-oni', 'Stanley Druckenmiller'
]

const AVATARS = [
  '/avatars/shark.png', '/avatars/turtle.png',
  '/avatars/surfer.png', '/avatars/bear.png',
  '/avatars/trader1.png', '/avatars/trader2.png'
]

export function generateCompetitors(count: number, startingCash: number): Competitor[] {
  const styles: TradingStyle[] = ['aggressive', 'conservative', 'trend-follower', 'contrarian']
  const shuffledNames = [...COMPETITOR_NAMES].sort(() => Math.random() - 0.5)

  return Array.from({ length: count }, (_, i) => ({
    id: `competitor-${i}`,
    name: shuffledNames[i],
    avatar: AVATARS[i % AVATARS.length],
    style: styles[i % styles.length],
    cash: startingCash,
    portfolio: {},
    totalAssetValue: startingCash,
    roi: 0,
    initialAssets: startingCash,
    lastDayChange: 0,
    panicSellCooldown: 0
  }))
}

// ===== Price History Helper =====

export function getPriceHistory(companies: Company[]): Record<string, number[]> {
  // This should be integrated with existing ChartWindow data
  // For now, return mock structure
  const history: Record<string, number[]> = {}

  companies.forEach(company => {
    // In real implementation, get from chart data store
    history[company.symbol] = [company.currentPrice] // Placeholder
  })

  return history
}
```

**Validation**:
- Unit tests for each strategy function
- Panic sell probability test (1000 iterations)
- Type checking passes

**Unit Test Examples**:
```typescript
// src/engines/__tests__/competitorEngine.test.ts
import { sharkStrategy, turtleStrategy, checkPanicSell } from '../competitorEngine'

describe('Shark Strategy', () => {
  test('selects high volatility stocks', () => {
    const competitor = createMockCompetitor('aggressive', 1000000)
    const companies = [
      { symbol: 'KAKAO', volatility: 0.005, sector: 'Tech', currentPrice: 50000 },
      { symbol: 'SAMSUNG', volatility: 0.001, sector: 'Tech', currentPrice: 60000 }
    ]

    const action = sharkStrategy(competitor, companies, 10, {})

    expect(action?.symbol).toBe('KAKAO') // Higher volatility
  })
})

describe('Panic Sell', () => {
  test('triggers at 5% probability when loss > 8%', () => {
    const competitor = createCompetitorWithLoss(-10)
    const companies = [
      { symbol: 'TEST', currentPrice: 90 } // -10% from position.averagePrice = 100
    ]

    let panicCount = 0
    for (let i = 0; i < 1000; i++) {
      if (checkPanicSell(competitor, companies, i)) {
        panicCount++
        competitor.panicSellCooldown = 0 // Reset for test
      }
    }

    expect(panicCount).toBeGreaterThan(30) // ~50 expected, allow variance
    expect(panicCount).toBeLessThan(70)
  })
})
```

---

### Checkpoint 1: Foundation Complete ✅

**Validation Criteria**:
- [ ] All TypeScript types compile without errors
- [ ] GameStore actions callable and type-safe
- [ ] AI engine unit tests pass (>90% coverage)
- [ ] No ESLint warnings in new files
- [ ] `npm run build` succeeds

**Estimated Time**: 4-5 hours total

---

### Phase 2: Integration (Day 2-3)
**Goal**: Connect AI engine to game tick loop
**Dependencies**: Phase 1 complete
**Parallelizable**: No

#### Tasks

##### Task 2.1: Tick Engine Integration
**File**: `src/engines/tickEngine.ts`
**Estimated Time**: 1 hour
**Priority**: Critical
**Dependencies**: Phase 1

```typescript
import { processAITrading, getPriceHistory } from './competitorEngine'

export function setupTickEngine() {
  let tickInterval: NodeJS.Timeout | null = null

  function tick() {
    const store = gameStore.getState()
    const { time, companies, competitors, competitorCount } = store

    // 1. Advance game time
    store.advanceTick()

    // 2. Update prices (existing Web Worker)
    updatePrices()

    // 3. AI trading (every 5 ticks, if competitors enabled)
    if (competitorCount > 0 && time.tick % 5 === 0) {
      store.processCompetitorTick()
    }

    // 4. Update competitor assets (every tick for accurate ROI)
    if (competitorCount > 0) {
      store.updateCompetitorAssets()
    }

    // 5. Ranking update (every 10 ticks)
    if (competitorCount > 0 && time.tick % 10 === 0) {
      const rankings = store.calculateRankings()
      checkRankChanges(rankings) // Trigger UI animations
    }

    // 6. Auto-save (every 300 ticks)
    if (time.tick % 300 === 0) {
      autoSave()
    }
  }

  // ... rest of tick engine
}

// Track previous rankings for change detection
let previousRankings: Record<string, number> = {}

function checkRankChanges(rankings: { name: string; rank: number }[]) {
  rankings.forEach(entry => {
    const prevRank = previousRankings[entry.name]

    if (prevRank && prevRank !== entry.rank) {
      // Rank changed - trigger notification
      if (entry.name === 'You') {
        // Player rank changed
        window.dispatchEvent(new CustomEvent('rankChange', {
          detail: { oldRank: prevRank, newRank: entry.rank }
        }))
      } else {
        // AI competitor rank changed - maybe add taunt
        if (entry.rank === 1 && prevRank !== 1) {
          gameStore.getState().addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "I'm #1 now! 🏆"`,
            type: 'champion',
            timestamp: Date.now()
          })
        }
      }
    }
  })

  // Update tracking
  previousRankings = rankings.reduce((acc, entry) => {
    acc[entry.name] = entry.rank
    return acc
  }, {} as Record<string, number>)
}
```

**Performance Check**:
```typescript
// Add performance monitoring
function tick() {
  const startTime = performance.now()

  // ... tick logic

  const endTime = performance.now()
  const tickDuration = endTime - startTime

  if (tickDuration > 16.67) { // 60 FPS = 16.67ms budget
    console.warn(`Tick exceeded budget: ${tickDuration.toFixed(2)}ms`)
  }
}
```

**Validation**:
- 60 FPS maintained with 5 competitors
- AI trades execute correctly
- No memory leaks after 1000 ticks

---

##### Task 2.2: Batch Action Execution
**File**: `src/stores/gameStore.ts`
**Estimated Time**: 1.5 hours
**Priority**: High
**Dependencies**: Task 2.1

*Already implemented in Task 1.2 - validate here*

**Additional Validation**:
```typescript
// Test batch execution performance
describe('Batch Actions', () => {
  test('executes 5 trades in < 5ms', () => {
    const actions = generateMockActions(5)

    const start = performance.now()
    gameStore.getState().executeBatchActions(actions)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(5)
  })

  test('maintains portfolio integrity', () => {
    const competitor = gameStore.getState().competitors[0]
    const initialCash = competitor.cash

    const action: CompetitorAction = {
      competitorId: competitor.id,
      action: 'buy',
      symbol: 'SAMSUNG',
      quantity: 10,
      price: 60000,
      timestamp: 0
    }

    gameStore.getState().executeBatchActions([action])

    const updated = gameStore.getState().competitors[0]
    expect(updated.cash).toBe(initialCash - (10 * 60000))
    expect(updated.portfolio['SAMSUNG'].quantity).toBe(10)
  })
})
```

---

##### Task 2.3: ROI Calculation & Ranking
**File**: `src/engines/competitorEngine.ts`
**Estimated Time**: 1 hour
**Priority**: Medium
**Dependencies**: Task 2.1

```typescript
// Memoized ROI calculation (already in gameStore.updateCompetitorAssets)
// Add caching layer for performance

const roiCache = new Map<string, { value: number; lastUpdate: number }>()

export function calculateROICached(
  competitor: Competitor,
  tick: number,
  companies: Company[]
): number {
  const cached = roiCache.get(competitor.id)

  // Cache valid for 10 ticks
  if (cached && tick - cached.lastUpdate < 10) {
    return cached.value
  }

  // Recalculate
  const portfolioValue = Object.entries(competitor.portfolio).reduce((sum, [symbol, position]) => {
    const currentPrice = companies.find(c => c.symbol === symbol)?.currentPrice || 0
    return sum + (position.quantity * currentPrice)
  }, 0)

  const totalAssetValue = competitor.cash + portfolioValue
  const roi = ((totalAssetValue - competitor.initialAssets) / competitor.initialAssets) * 100

  roiCache.set(competitor.id, { value: roi, lastUpdate: tick })

  return roi
}

// Clear cache when needed
export function clearROICache() {
  roiCache.clear()
}
```

**Validation**:
- ROI calculation accuracy: `(1000000 - 800000) / 800000 * 100 = 25%`
- Ranking order correct (descending by ROI)
- Cache hit rate > 70% during normal gameplay

---

### Checkpoint 2: Integration Complete ✅

**Validation Criteria**:
- [ ] AI trades execute every 5 ticks
- [ ] Performance: < 10% tick overhead
- [ ] Rankings update correctly every 10 ticks
- [ ] No race conditions or state corruption
- [ ] Memory stable after 1000+ ticks

**Estimated Time**: 3.5 hours total

---

### Phase 3: UI/UX (Day 3-5) - **병렬 작업 가능**
**Goal**: Build user-facing interfaces and effects
**Dependencies**: Phase 1 (types only)
**Parallelizable**: Yes (can work alongside Phase 2)

#### Tasks

##### Task 3.1: StartScreen Competitor Setup
**File**: `src/components/desktop/StartScreen.tsx`
**Estimated Time**: 2 hours
**Priority**: Medium
**Dependencies**: Task 1.1 (types)

```tsx
import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { generateCompetitors } from '../../engines/competitorEngine'

interface CompetitorSetupState {
  enabled: boolean
  count: number
  difficulty: 'balanced' | 'expert'
}

function CompetitorSetupPanel() {
  const [setup, setSetup] = useState<CompetitorSetupState>({
    enabled: false,
    count: 3,
    difficulty: 'balanced'
  })

  const initializeCompetitors = useGameStore(s => s.initializeCompetitors)

  const handleStartGame = (startingCash: number) => {
    if (setup.enabled) {
      initializeCompetitors(setup.count, startingCash)
    }

    // ... existing game start logic
  }

  return (
    <div className="retro-panel p-4 mb-4">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
        🥊 Investment Battle Mode
      </h3>

      <label className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={setup.enabled}
          onChange={e => setSetup({ ...setup, enabled: e.target.checked })}
        />
        <span>Enable AI Rivals</span>
      </label>

      {setup.enabled && (
        <div className="battle-setup">
          {/* Competitor Count Slider */}
          <div className="mb-4">
            <label className="block mb-2">
              Number of Rivals: <strong>{setup.count}</strong>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={setup.count}
              onChange={e => setSetup({ ...setup, count: Number(e.target.value) })}
              className="w-full retro-slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Easy (1)</span>
              <span>Hard (5)</span>
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="mb-4">
            <label className="block mb-2">AI Difficulty:</label>
            <div className="flex gap-2">
              <button
                className={`retro-button flex-1 ${setup.difficulty === 'balanced' ? 'active' : ''}`}
                onClick={() => setSetup({ ...setup, difficulty: 'balanced' })}
              >
                Balanced
              </button>
              <button
                className={`retro-button flex-1 ${setup.difficulty === 'expert' ? 'active' : ''}`}
                onClick={() => setSetup({ ...setup, difficulty: 'expert' })}
              >
                Expert
              </button>
            </div>
          </div>

          {/* Rival Preview */}
          <div className="rival-preview">
            <h4 className="text-sm font-semibold mb-2">Your Rivals:</h4>
            <div className="grid grid-cols-2 gap-2">
              {generatePreviewCompetitors(setup.count).map((rival, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-600"
                >
                  <div className="w-8 h-8 bg-gray-700 rounded pixel-avatar">
                    {/* Pixel art avatar placeholder */}
                    <span className="text-xs">{rival.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{rival.name}</div>
                    <div className="text-xs text-gray-400">{rival.styleLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        className="retro-button-primary w-full mt-4"
        onClick={() => handleStartGame(STARTING_CASH)}
      >
        {setup.enabled ? '⚔️ Start Battle!' : 'Start Game'}
      </button>
    </div>
  )
}

function generatePreviewCompetitors(count: number) {
  const names = ['Warren Buffoon', 'Elon Musk-rat', 'Peter Lynch Pin', 'Ray Dalio-ma', 'George Soros-t']
  const styles = ['aggressive', 'conservative', 'trend-follower', 'contrarian']
  const icons = ['🔥', '🐢', '🌊', '🐻']
  const labels = ['Aggressive', 'Conservative', 'Trend Follower', 'Contrarian']

  return Array.from({ length: count }, (_, i) => ({
    name: names[i],
    icon: icons[i % icons.length],
    styleLabel: labels[i % labels.length]
  }))
}
```

**CSS** (TailwindCSS v4):
```css
/* Add to global styles */
.retro-slider {
  @apply appearance-none h-2 bg-gray-700 rounded;
}

.retro-slider::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 bg-blue-500 rounded cursor-pointer;
}

.retro-checkbox {
  @apply w-4 h-4 accent-blue-500;
}

.pixel-avatar {
  @apply flex items-center justify-center text-lg;
  image-rendering: pixelated;
}
```

**Validation**:
- Slider updates count correctly
- Preview shows correct number of rivals
- Settings persist when toggling enabled/disabled
- Start button text changes based on mode

---

##### Task 3.2: RankingWindow (Priority)
**File**: `src/components/windows/RankingWindow.tsx` (NEW)
**Estimated Time**: 3 hours
**Priority**: Critical
**Dependencies**: Task 1.1, 1.2

```tsx
import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { WindowFrame } from './WindowFrame'
import { formatCurrency } from '../../utils/format'

interface RankingEntry {
  rank: number
  name: string
  isPlayer: boolean
  totalAssets: number
  roi: number
  oneDayChange: number
  trend: 'up' | 'down' | 'same'
}

export function RankingWindow() {
  const competitors = useGameStore(s => s.competitors)
  const player = useGameStore(s => s.player)
  const taunts = useGameStore(s => s.taunts)

  const rankings = useMemo(() => {
    const playerROI = ((player.totalAssetValue - player.initialAssets) / player.initialAssets) * 100

    const all = [
      {
        name: 'You',
        isPlayer: true,
        totalAssets: player.totalAssetValue,
        roi: playerROI,
        oneDayChange: player.lastDayChange || 0
      },
      ...competitors.map(c => ({
        name: c.name,
        isPlayer: false,
        totalAssets: c.totalAssetValue,
        roi: c.roi,
        oneDayChange: c.lastDayChange
      }))
    ]

    return all
      .sort((a, b) => b.totalAssets - a.totalAssets)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        trend: entry.oneDayChange > 0 ? 'up' as const :
               entry.oneDayChange < 0 ? 'down' as const :
               'same' as const
      }))
  }, [competitors, player])

  const playerRank = rankings.find(r => r.isPlayer)?.rank || 0

  return (
    <WindowFrame title="🏆 Investment Battle Rankings" windowType="ranking">
      <div className="ranking-window p-4">
        {/* Header Stats */}
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500 rounded">
          <div className="text-sm text-gray-300">Your Rank</div>
          <div className="text-3xl font-bold">
            {playerRank === 1 && '🥇'}
            {playerRank === 2 && '🥈'}
            {playerRank === 3 && '🥉'}
            {playerRank > 3 && `#${playerRank}`}
          </div>
        </div>

        {/* Rankings Table */}
        <div className="ranking-table mb-4 overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-800 border-b border-gray-600">
              <tr>
                <th className="p-2 text-left">Rank</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-right">Total Assets</th>
                <th className="p-2 text-right">ROI (%)</th>
                <th className="p-2 text-right">1-Day</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map(entry => (
                <tr
                  key={entry.name}
                  className={`
                    border-b border-gray-700
                    ${entry.isPlayer ? 'bg-blue-900/20 font-bold' : ''}
                    hover:bg-gray-700/50 transition-colors
                  `}
                  data-rank={entry.rank}
                >
                  <td className="p-2">
                    <span className="text-xl">
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && entry.rank}
                    </span>
                  </td>
                  <td className="p-2">
                    {entry.name}
                    {entry.isPlayer && <span className="ml-2 text-xs text-blue-400">(You)</span>}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatCurrency(entry.totalAssets)}
                  </td>
                  <td className={`p-2 text-right font-mono ${entry.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.roi >= 0 && '+'}
                    {entry.roi.toFixed(2)}%
                  </td>
                  <td className="p-2 text-right">
                    {entry.trend === 'up' && <span className="text-green-400">📈 +{entry.oneDayChange.toFixed(2)}%</span>}
                    {entry.trend === 'down' && <span className="text-red-400">📉 {entry.oneDayChange.toFixed(2)}%</span>}
                    {entry.trend === 'same' && <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Taunt Feed */}
        <div className="taunt-feed">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            💬 Rival Talk
          </h4>
          <div className="bg-gray-800 border border-gray-600 rounded p-2 max-h-40 overflow-auto">
            {taunts.length === 0 && (
              <div className="text-xs text-gray-500 italic">No messages yet...</div>
            )}
            {taunts.slice(-5).reverse().map((taunt, i) => (
              <div
                key={i}
                className={`
                  taunt mb-2 last:mb-0 text-xs p-1 rounded
                  ${taunt.type === 'panic' && 'bg-red-900/30 border-l-2 border-red-500'}
                  ${taunt.type === 'champion' && 'bg-yellow-900/30 border-l-2 border-yellow-500'}
                  ${taunt.type === 'overtake_player' && 'bg-purple-900/30 border-l-2 border-purple-500'}
                `}
              >
                <span className="font-semibold">{taunt.competitorName}:</span>
                <span className="ml-1 text-gray-300">{taunt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WindowFrame>
  )
}
```

**WindowManager Integration**:
```tsx
// src/components/windows/WindowManager.tsx
export function WindowManager() {
  const windows = useGameStore(s => s.windows)

  return (
    <>
      {windows.map(window => {
        switch (window.windowType) {
          // ... existing cases
          case 'ranking':
            return <RankingWindow key={window.id} />
          default:
            return null
        }
      })}
    </>
  )
}
```

**Taskbar Button**:
```tsx
// src/components/desktop/Taskbar.tsx
<button
  className="retro-button"
  onClick={() => openWindow('ranking')}
>
  🏆 Rankings
</button>
```

**Validation**:
- Rankings update in real-time
- Player row highlighted
- Correct sorting by total assets
- Taunts display in reverse chronological order
- Responsive design (works on small screens)

---

##### Task 3.3: Arcade Effects
**File**: `src/components/effects/RankChangeNotification.tsx` (NEW)
**Estimated Time**: 2 hours
**Priority**: Low
**Dependencies**: Task 3.2

```tsx
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface RankChangeNotificationProps {
  oldRank: number
  newRank: number
}

export function RankChangeNotification({ oldRank, newRank }: RankChangeNotificationProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 3000) // Show for 3 seconds

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  const isRankUp = newRank < oldRank
  const isChampion = newRank === 1 && oldRank !== 1

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="rank-notification animate-bounce-in">
        {isChampion ? (
          <div className="champion-notification text-center">
            <h1 className="text-6xl font-bold text-yellow-400 arcade-text mb-4 animate-pulse">
              🏆 CHAMPION 🏆
            </h1>
            <p className="text-2xl text-white">You've overtaken all rivals!</p>
          </div>
        ) : isRankUp ? (
          <div className="rank-up-notification text-center">
            <h2 className="text-4xl font-bold text-green-400 mb-2">RANK UP!</h2>
            <p className="text-3xl text-white glow">
              #{oldRank} → #{newRank}
            </p>
          </div>
        ) : (
          <div className="rank-down-notification text-center">
            <h2 className="text-4xl font-bold text-red-400 mb-2">RANK DOWN</h2>
            <p className="text-3xl text-white">
              #{oldRank} → #{newRank}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Hook to listen for rank changes
export function useRankChangeNotification() {
  const [notification, setNotification] = useState<{ oldRank: number; newRank: number } | null>(null)

  useEffect(() => {
    const handleRankChange = (e: CustomEvent) => {
      setNotification(e.detail)

      // Clear after animation
      setTimeout(() => {
        setNotification(null)
      }, 3500)
    }

    window.addEventListener('rankChange', handleRankChange as EventListener)

    return () => {
      window.removeEventListener('rankChange', handleRankChange as EventListener)
    }
  }, [])

  return notification
}
```

**CSS Animations**:
```css
/* Add to global styles */
@keyframes bounce-in {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.arcade-text {
  text-shadow:
    0 0 10px currentColor,
    0 0 20px currentColor,
    0 0 30px currentColor;
  font-family: 'Press Start 2P', monospace; /* If available */
}

.glow {
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}
```

**Integration in App**:
```tsx
// src/App.tsx
import { useRankChangeNotification } from './components/effects/RankChangeNotification'

function App() {
  const rankChange = useRankChangeNotification()

  return (
    <div>
      {/* ... existing app structure */}

      {rankChange && (
        <RankChangeNotification
          oldRank={rankChange.oldRank}
          newRank={rankChange.newRank}
        />
      )}
    </div>
  )
}
```

**Validation**:
- Animation triggers on rank change
- Champion animation for reaching #1
- No animation spam (3s cooldown)
- Accessible (doesn't block UI interaction)

---

##### Task 3.4: Taunt Message System
**File**: `src/data/taunts.ts` (NEW)
**Estimated Time**: 1 hour
**Priority**: Low

```typescript
export const PANIC_SELL_TAUNTS = [
  "손절이다! 더 떨어지기 전에!! 😱",
  "아... 이거 잘못 샀다... 😰",
  "제발 더 이상 떨어지지 마! 🙏",
  "물타기는 절대 안 해! 나가! 💸",
  "뉴스 보니까 망할 것 같은데... 📰💀"
]

export const RANK_UP_TAUNTS = [
  "올라간다! 올라가! 🚀",
  "이 정도면 프로 아니냐? 😎",
  "수익률 미쳤다 ㅋㅋㅋ 💰",
  "너희들 좀 따라와봐 🏃",
  "1등 가즈아! 🔥"
]

export const RANK_DOWN_TAUNTS = [
  "잠깐만... 왜 떨어져? 😨",
  "실수했나... 다시 생각해보자 🤔",
  "이게 왜 안 오르지? 📉",
  "운이 없었을 뿐이야... 🎲",
  "전략 수정이 필요해 📝"
]

export const OVERTAKE_PLAYER_TAUNTS = [
  "어? 내가 플레이어 넘었네? 😏",
  "이제부터가 진짜야! ⚡",
  "계속 이 자리 지킬게 💪",
  "뒤에서 잘 봐줘~ 👋",
  "추월 완료! 빠잉~ 🏎️"
]

export const CHAMPION_TAUNTS = [
  "나야말로 전설! 🏆👑",
  "1등의 자리는 외롭지 않아 😎",
  "이게 바로 실력이지 💎",
  "감히 누가 날 이기겠어? 🔥",
  "챔피언 등극! 🎉🎊"
]

export function getRandomTaunt(type: 'panic' | 'rank_up' | 'rank_down' | 'overtake' | 'champion'): string {
  const taunts = {
    panic: PANIC_SELL_TAUNTS,
    rank_up: RANK_UP_TAUNTS,
    rank_down: RANK_DOWN_TAUNTS,
    overtake: OVERTAKE_PLAYER_TAUNTS,
    champion: CHAMPION_TAUNTS
  }

  const pool = taunts[type]
  return pool[Math.floor(Math.random() * pool.length)]
}
```

**Integration in gameStore**:
```typescript
// Add taunt on specific events
function checkAndAddTaunts(previousRankings: RankingEntry[], newRankings: RankingEntry[]) {
  newRankings.forEach((entry, index) => {
    if (entry.isPlayer) return

    const prevEntry = previousRankings.find(r => r.name === entry.name)
    if (!prevEntry) return

    // Rank up
    if (entry.rank < prevEntry.rank) {
      gameStore.getState().addTaunt({
        competitorId: entry.name,
        competitorName: entry.name,
        message: getRandomTaunt('rank_up'),
        type: 'rank_up',
        timestamp: Date.now()
      })
    }

    // Overtook player
    const playerEntry = newRankings.find(r => r.isPlayer)
    const prevPlayerEntry = previousRankings.find(r => r.isPlayer)

    if (playerEntry && prevPlayerEntry &&
        entry.rank < playerEntry.rank &&
        prevEntry.rank > prevPlayerEntry.rank) {
      gameStore.getState().addTaunt({
        competitorId: entry.name,
        competitorName: entry.name,
        message: getRandomTaunt('overtake'),
        type: 'overtake_player',
        timestamp: Date.now()
      })
    }

    // Became champion
    if (entry.rank === 1 && prevEntry.rank !== 1) {
      gameStore.getState().addTaunt({
        competitorId: entry.name,
        competitorName: entry.name,
        message: getRandomTaunt('champion'),
        type: 'champion',
        timestamp: Date.now()
      })
    }
  })
}
```

**Validation**:
- Taunts appear contextually
- No spam (max 1 taunt per competitor per rank change)
- Korean messages display correctly
- Emoji render properly

---

### Checkpoint 3: UI Complete ✅

**Validation Criteria**:
- [ ] StartScreen competitor setup functional
- [ ] RankingWindow renders and updates in real-time
- [ ] Rank change animations trigger correctly
- [ ] Taunts display in feed with correct styling
- [ ] UI responsive and accessible
- [ ] No visual glitches or layout breaks

**Estimated Time**: 8 hours total (can be done in parallel with Phase 2)

---

### Phase 4: Polish & Testing (Day 5-6)
**Goal**: Optimize, balance, and ensure production quality
**Dependencies**: Phases 1-3 complete

#### Tasks

##### Task 4.1: Performance Optimization
**Estimated Time**: 2 hours
**Priority**: High

**Optimizations**:

1. **Tick Distribution Validation**
```typescript
// Verify AI processing is distributed
function validateTickDistribution() {
  const tickLog: Record<number, number> = {}

  for (let tick = 0; tick < 100; tick++) {
    competitors.forEach((c, i) => {
      if ((tick + i) % 5 === 0) {
        tickLog[tick] = (tickLog[tick] || 0) + 1
      }
    })
  }

  // Each tick should process 0-1 competitors (never all 5)
  expect(Math.max(...Object.values(tickLog))).toBeLessThanOrEqual(1)
}
```

2. **Memoization Check**
```typescript
// Ensure ROI cache is working
const cacheHits = roiCache.size
processCompetitorTick() // 10 times
expect(roiCache.size).toBe(cacheHits) // Cache should reuse
```

3. **Memory Leak Prevention**
```typescript
// Clear old actions/taunts
function pruneOldData() {
  set(state => ({
    competitorActions: state.competitorActions.slice(-100),
    taunts: state.taunts.slice(-20)
  }))
}
```

**Performance Benchmarks**:
- 60 FPS maintained for 1000+ ticks
- AI processing < 5ms per competitor
- Memory usage stable (< 200MB)

---

##### Task 4.2: Game Balance Tuning
**Estimated Time**: 3 hours
**Priority**: High

**Balance Adjustments**:

1. **AI Starting Cash Parity**
```typescript
// Ensure fair start
initializeCompetitors(count, PLAYER_STARTING_CASH)
```

2. **Strategy Win Rate Testing**
```typescript
// Run 100 simulations
function testBalance() {
  const results: Record<TradingStyle, number> = {
    aggressive: 0,
    conservative: 0,
    'trend-follower': 0,
    contrarian: 0
  }

  for (let i = 0; i < 100; i++) {
    const winner = simulateGame(30 * 12 * 30) // 30 years
    results[winner.style]++
  }

  // No strategy should dominate (> 40% win rate)
  expect(Math.max(...Object.values(results))).toBeLessThan(40)
}
```

3. **Difficulty Tuning**
```typescript
// Balanced mode: AI uses base strategies
// Expert mode: AI trades more frequently + larger positions
const AI_DIFFICULTY_MULTIPLIERS = {
  balanced: {
    frequencyMultiplier: 1.0,
    positionSizeMultiplier: 1.0
  },
  expert: {
    frequencyMultiplier: 0.7, // Trade more often
    positionSizeMultiplier: 1.3 // Larger positions
  }
}
```

4. **Panic Sell Probability Adjustment**
```typescript
// Test panic sell rate
const panicRate = testPanicSellRate(1000)
expect(panicRate).toBeGreaterThan(0.03) // At least 3%
expect(panicRate).toBeLessThan(0.07) // At most 7%
```

**Target Win Rates** (Player vs AI):
- 1 rival: 60-70% player win rate
- 3 rivals: 40-60% player win rate
- 5 rivals: 30-50% player win rate

---

##### Task 4.3: Bug Fixes & Refactoring
**Estimated Time**: 2 hours
**Priority**: Medium

**Common Issues**:

1. **Division by Zero**
```typescript
// Fix ROI calculation when initialAssets = 0
const roi = competitor.initialAssets > 0
  ? ((totalAssetValue - competitor.initialAssets) / competitor.initialAssets) * 100
  : 0
```

2. **Undefined Portfolio Access**
```typescript
// Check portfolio exists before accessing
const position = competitor.portfolio[symbol]
if (!position || position.quantity <= 0) return null
```

3. **Race Conditions**
```typescript
// Ensure atomic updates
set(state => {
  const newState = { ...state }
  // ... mutations
  return newState
})
```

4. **ESLint Fixes**
```bash
npm run lint -- --fix
```

**Refactoring**:
- Extract magic numbers to constants
- Add JSDoc comments for public functions
- Remove console.logs (use proper logging)

---

##### Task 4.4: Documentation
**Estimated Time**: 1 hour
**Priority**: Low

**Documents to Update**:

1. **CLAUDE.md**
```markdown
## Investment Battle Mode

### Overview
Competitive mode where players compete against 1-5 AI rivals for highest ROI.

### AI Strategies
- **Shark (Aggressive)**: High-risk, high-reward trading
- **Turtle (Conservative)**: Blue-chip long-term investing
- **Surfer (Trend Follower)**: Momentum-based trading
- **Bear (Contrarian)**: Contrarian value investing

### Performance Considerations
- AI processing distributed across ticks (5-tick offset)
- ROI calculations memoized for 10 ticks
- Max 5 competitors to maintain 60 FPS
```

2. **README.md**
```markdown
### 🥊 Investment Battle Mode
Compete against AI rivals with unique trading strategies:
- Select 1-5 competitors
- Real-time rankings
- Arcade-style UI effects
- Unlock "Legendary Investor" ending by beating all rivals
```

3. **Code Comments**
```typescript
/**
 * Processes AI competitor trading for the current tick
 *
 * Performance: Distributes processing across 5 ticks using offset
 * Each competitor processes on tick % 5 === index % 5
 *
 * @param competitors - Array of AI competitors
 * @param companies - Current stock data
 * @param tick - Current game tick
 * @param priceHistory - Historical price data for technical analysis
 * @returns Array of competitor actions to execute
 */
export function processAITrading(...)
```

---

### Checkpoint 4: Production Ready ✅

**Final Validation Criteria**:
- [ ] All unit tests pass
- [ ] Performance benchmarks met (60 FPS)
- [ ] Game balance validated (win rates within target)
- [ ] No critical/high bugs
- [ ] ESLint clean
- [ ] TypeScript strict mode passes
- [ ] Documentation updated
- [ ] User testing complete (30+ min gameplay)

**Estimated Time**: 8 hours total

---

## 🎯 Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **Performance Degradation** | Medium | High | Tick distribution, memoization, Web Worker offloading |
| **AI Balance Issues** | High | Medium | Extensive simulation testing, tunable difficulty parameters |
| **UI Complexity Creep** | Medium | Medium | MVP-first approach, defer nice-to-haves (sound effects) |
| **Existing Feature Regression** | Low | High | Comprehensive regression test suite before merge |
| **Save/Load Compatibility** | Medium | Medium | Version migration logic for SaveData |
| **Browser Compatibility** | Low | Low | Target modern browsers only (Chrome, Firefox, Safari) |

### Mitigation Details

#### Performance Degradation
**Symptoms**: FPS drops below 60, UI lag, slow tick processing

**Prevention**:
- Profile tick engine with 5 competitors before integration
- Use Chrome DevTools Performance tab to identify bottlenecks
- Set performance budget: AI < 5ms, UI < 16ms per tick

**Response**:
- Increase tick distribution (10-tick offset instead of 5)
- Reduce AI trade frequency
- Simplify strategy calculations (cache more aggressively)

#### AI Balance Issues
**Symptoms**: One strategy dominates, player can't win, or AI too easy

**Prevention**:
- Run 100+ game simulations with different strategies
- Test all difficulty combinations (1-5 rivals, balanced/expert)
- A/B test with real users

**Response**:
- Adjust strategy parameters (trade frequency, position size, risk tolerance)
- Add randomness to break determinism
- Implement dynamic difficulty (AI scales with player performance)

#### Save/Load Compatibility
**Symptoms**: Game crashes when loading old saves

**Prevention**:
```typescript
interface SaveData {
  version: string // Add version field
  // ... existing fields
  competitors?: Competitor[] // Optional for backward compatibility
}

function loadGame(): SaveData | null {
  const data = await loadFromIndexedDB()

  // Migration logic
  if (data.version === '1.0.0') {
    return {
      ...data,
      version: '2.0.0',
      competitors: [], // Add missing field
      competitorCount: 0
    }
  }

  return data
}
```

---

## ✅ Execution Checklist

### Pre-Implementation
- [ ] Create feature branch: `git checkout -b feature/investment-battle`
- [ ] Measure baseline performance (FPS, memory)
- [ ] Review CLAUDE.md architecture section
- [ ] Set up test environment

### Phase 1: Foundation
- [ ] Task 1.1: Type definitions complete
- [ ] Task 1.2: GameStore extended
- [ ] Task 1.3: AI engine implemented
- [ ] Unit tests written (>90% coverage)
- [ ] Checkpoint 1 validation passed

### Phase 2: Integration
- [ ] Task 2.1: Tick engine integrated
- [ ] Task 2.2: Batch actions functional
- [ ] Task 2.3: ROI calculation accurate
- [ ] Performance test passed (60 FPS)
- [ ] Checkpoint 2 validation passed

### Phase 3: UI/UX
- [ ] Task 3.1: StartScreen setup complete
- [ ] Task 3.2: RankingWindow implemented
- [ ] Task 3.3: Arcade effects working
- [ ] Task 3.4: Taunt system active
- [ ] Checkpoint 3 validation passed

### Phase 4: Polish
- [ ] Task 4.1: Performance optimized
- [ ] Task 4.2: Game balanced
- [ ] Task 4.3: Bugs fixed, code refactored
- [ ] Task 4.4: Documentation updated
- [ ] Checkpoint 4 validation passed

### Post-Implementation
- [ ] User acceptance testing (30+ min gameplay)
- [ ] Update CLAUDE.md with new architecture
- [ ] Update README.md with feature description
- [ ] Merge to main branch
- [ ] Deploy to production

---

## 📅 Recommended Execution Schedule

### Option A: Single Developer (5-6 days)

**Day 1**: Foundation
- 09:00 - 09:30 | Task 1.1: Types
- 09:30 - 10:15 | Task 1.2: GameStore
- 10:15 - 13:15 | Task 1.3: AI Engine
- 13:15 - 14:00 | Unit Tests
- 14:00 - 14:30 | Checkpoint 1

**Day 2**: Integration + UI Start
- 09:00 - 10:00 | Task 2.1: Tick Engine
- 10:00 - 11:30 | Task 2.2: Batch Actions
- 11:30 - 12:30 | Task 2.3: ROI Calculation
- 12:30 - 13:30 | Checkpoint 2
- 13:30 - 15:30 | Task 3.1: StartScreen

**Day 3**: UI Focus
- 09:00 - 12:00 | Task 3.2: RankingWindow
- 12:00 - 14:00 | Task 3.3: Arcade Effects
- 14:00 - 15:00 | Task 3.4: Taunt System
- 15:00 - 16:00 | Checkpoint 3

**Day 4**: Polish (Performance + Balance)
- 09:00 - 11:00 | Task 4.1: Performance Optimization
- 11:00 - 14:00 | Task 4.2: Game Balance
- 14:00 - 16:00 | Task 4.3: Bug Fixes

**Day 5**: Testing + Documentation
- 09:00 - 10:00 | Task 4.4: Documentation
- 10:00 - 12:00 | Integration Testing
- 12:00 - 15:00 | 30-year simulations × 3
- 15:00 - 17:00 | User acceptance testing

**Day 6** (if needed): Buffer + Deployment
- Final bug fixes
- Performance tuning
- Deployment preparation

### Option B: Parallel Tracks (3-4 days)

**Track A (Backend)**: Phase 1 → Phase 2
**Track B (Frontend)**: Phase 1 (types only) → Phase 3
**Merge**: Phase 4

**Day 1**:
- Track A: Tasks 1.1-1.3 (Foundation)
- Track B: Task 3.1 (StartScreen)

**Day 2**:
- Track A: Tasks 2.1-2.3 (Integration)
- Track B: Tasks 3.2-3.3 (RankingWindow + Effects)

**Day 3**:
- Track A: Task 4.1 (Performance)
- Track B: Task 3.4 (Taunts) + Task 4.3 (Bug Fixes)
- **Merge**: Integration testing

**Day 4**:
- Tasks 4.2 + 4.4 (Balance + Documentation)
- Final testing and deployment

---

## 🎓 Success Criteria (Definition of Done)

### Functional Completeness
- ✅ 5 AI competitors can trade simultaneously
- ✅ Real-time rankings display correctly
- ✅ All 4 AI strategies + panic sell implemented
- ✅ Taunt message system functional
- ✅ Arcade effects trigger appropriately
- ✅ Game can be won/lost against AI

### Performance
- ✅ 60 FPS maintained (5 competitors, full game)
- ✅ AI processing < 5ms per competitor per tick
- ✅ Memory usage < 200MB
- ✅ No memory leaks after 1000+ ticks
- ✅ Loading time < 3 seconds

### Code Quality
- ✅ TypeScript strict mode: 0 errors
- ✅ ESLint: 0 warnings
- ✅ Unit test coverage > 85%
- ✅ Integration tests pass
- ✅ Code review approved
- ✅ Documentation complete

### User Experience
- ✅ Intuitive UI (no user confusion)
- ✅ Immediate feedback on actions
- ✅ Engaging competitive elements
- ✅ Game balanced (challenging but fair)
- ✅ No critical/high bugs

### Regression Safety
- ✅ Existing game modes unaffected
- ✅ Save/load backward compatible
- ✅ Ending scenarios work correctly
- ✅ All original features functional

---

## 🚀 Next Steps

**After Workflow Approval**:

1. **Review and Approve Plan**
   - Stakeholder sign-off
   - Timeline confirmation
   - Resource allocation

2. **Begin Implementation**
   ```bash
   /sc:implement claudedocs/workflow_investment_battle.md --phase 1
   ```

3. **Iterative Execution**
   - Complete Phase 1 → Checkpoint 1
   - Complete Phase 2 → Checkpoint 2
   - Complete Phase 3 → Checkpoint 3
   - Complete Phase 4 → Final Validation

4. **Deployment**
   - Merge feature branch
   - Deploy to production
   - Monitor for issues

---

## 📊 Metrics & Monitoring

### Development Metrics
- **Velocity**: Tasks completed per day
- **Quality**: Bugs found per phase
- **Performance**: FPS maintained throughout

### Post-Launch Metrics
- **Engagement**: % of users enabling battle mode
- **Balance**: AI vs Player win rates
- **Performance**: Client-side FPS reports
- **Bugs**: User-reported issues

---

**END OF WORKFLOW DOCUMENT**

*This workflow is ready for execution. Use `/sc:implement` to begin step-by-step implementation.*

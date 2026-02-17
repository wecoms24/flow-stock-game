# Data Model: System Level-Up

**Date**: 2026-02-17
**Feature**: 001-system-level-up
**Purpose**: Define TypeScript interfaces for all new state entities with validation rules and state transitions

## Overview

This feature introduces 6 new state entity types to the existing Zustand store (`src/stores/gameStore.ts`). All entities follow strict TypeScript typing (no `any` types) and integrate with existing save data schema via Dexie migrations.

## Core Entities

### 1. AnimationSequence

**Purpose**: Orchestrates multi-step visual/audio feedback sequences for game actions (trades, milestones, level-ups)

**Interface**:
```typescript
type AnimationStepType = 'card_flip' | 'number_count' | 'particle' | 'sound' | 'delay'

interface AnimationStep {
  type: AnimationStepType
  duration: number // milliseconds
  params: {
    // Card flip
    cardId?: string
    flipDirection?: 'front-to-back' | 'back-to-front'

    // Number count
    from?: number
    to?: number
    format?: 'currency' | 'number' | 'percentage'

    // Particle
    particleType?: 'profit' | 'loss' | 'celebration' | 'coin'
    count?: number // max 50 per FR-003
    position?: { x: number; y: number }

    // Sound
    soundId?: 'trade_success' | 'profit' | 'loss' | 'milestone' | 'level_up'

    // Delay
    // No params - just duration
  }
}

interface AnimationSequence {
  id: string // unique ID for tracking
  triggerType: 'trade' | 'milestone' | 'level_up' | 'monthly_card' | 'event_chain'
  steps: AnimationStep[]
  totalDuration: number // sum of all step durations (calculated)
  priority: number // 0-10, higher = plays first (trades = 10, toasts = 1)
  startedAt: number // tick when sequence started
  status: 'queued' | 'playing' | 'completed' | 'cancelled'
}
```

**Validation Rules**:
- `steps.length` must be > 0 and ≤ 10 (prevent runaway sequences)
- `totalDuration` must equal sum of all `step.duration` values
- `params.count` for particle steps must be ≤ 50 (FR-003 performance limit)
- `priority` must be 0-10 inclusive

**State Transitions**:
```
queued → playing → completed
   ↓        ↓
   └──────> cancelled
```

**Store Integration**:
```typescript
// gameStore.ts additions
interface GameState {
  // ... existing state
  animationQueue: AnimationSequence[]
  nextAnimationId: number // atomic counter
}

interface GameActions {
  // ... existing actions
  queueAnimation: (sequence: Omit<AnimationSequence, 'id' | 'status' | 'startedAt'>) => void
  startAnimation: (id: string) => void
  completeAnimation: (id: string) => void
  cancelAnimation: (id: string) => void
  clearCompletedAnimations: () => void // cleanup old sequences
}
```

---

### 2. NewsCard

**Purpose**: Represents monthly market event cards presented to players for strategic selection

**Interface**:
```typescript
type SectorType = 'tech' | 'finance' | 'energy' | 'consumer' | 'healthcare'
type CardRarity = 'common' | 'uncommon' | 'rare' | 'forced' // forced = unselectable mandatory events

interface CardEffect {
  sector: SectorType
  driftChange: number // ± drift modifier (e.g., +0.05 = +5% drift)
  volatilityChange: number // ± volatility modifier
  duration: number // ticks (0 = permanent until next card)
}

interface NewsCard {
  id: string // unique ID for this card instance
  templateId: string // reference to card template in data/newsCards.ts
  title: string // "Tech Stock Surge", "Energy Crisis", etc.
  description: string // detailed event text
  effects: CardEffect[] // can affect multiple sectors
  rarity: CardRarity
  icon: string // emoji or asset path (e.g., "📈", "💥")
  exclusiveWith: string[] // templateIds that cannot appear in same draw
  presentedAt: number // tick when card was drawn
  selectedAt?: number // tick when player selected (undefined if not selected)
  isApplied: boolean // whether effects have been applied to market
}
```

**Validation Rules**:
- `effects.length` must be 1-3 (prevent overly complex cards)
- `effects[].sector` must be valid SectorType
- `effects[].driftChange` must be -0.5 to +0.5 (prevent market breaking)
- `effects[].volatilityChange` must be -0.3 to +0.3
- `rarity === 'forced'` implies card is auto-selected (no player choice)

**State Transitions**:
```
presented → selected → applied
     ↓
  expired (if not selected within 10 ticks)
```

**Store Integration**:
```typescript
interface GameState {
  monthlyCards: {
    current: NewsCard[] // 3 cards presented this month (or 1 if forced)
    selected: NewsCard[] // 2 cards player selected
    history: NewsCard[] // all past cards (for event chain branching)
  }
}

interface GameActions {
  drawMonthlyCards: () => void // select 3 random cards, respecting exclusivity
  selectCard: (cardId: string) => void // mark card as selected
  applyCardEffects: () => void // apply selected cards' effects to companies
  expireCards: () => void // cleanup if player didn't select within timeout
}
```

---

### 3. EventChain

**Purpose**: Represents multi-week narrative event sequences with branching outcomes based on player actions

**Interface**:
```typescript
type ChainWeek = 'WEEK_1' | 'WEEK_2' | 'WEEK_3' | 'RESOLVED'
type PlayerAction = 'bought_affected' | 'sold_affected' | 'held' | 'ignored'
type ChainBranch = 'investor_confidence' | 'panic_selling' | 'wait_and_see'
type ChainOutcome = 'positive' | 'neutral' | 'negative'

interface ChainEvent {
  title: string
  description: string
  effects: CardEffect[] // same structure as NewsCard effects
}

type EventChainState =
  | { type: 'WEEK_1'; event: ChainEvent }
  | { type: 'WEEK_2'; event: ChainEvent; branch: ChainBranch }
  | { type: 'WEEK_3'; event: ChainEvent; branch: ChainBranch }
  | { type: 'RESOLVED'; event: ChainEvent; outcome: ChainOutcome }
  | { type: 'PAUSED'; pausedAt: Exclude<EventChainState, { type: 'PAUSED' }>; reason: string }

interface EventChain {
  id: string // unique instance ID
  chainTemplateId: string // reference to chain template in data/eventChains.ts
  name: string // "Tech Company Crisis", "Energy Boom", etc.
  state: EventChainState
  startTick: number
  lastAdvanceTick: number
  affectedSectors: SectorType[] // sectors impacted by this chain
  playerActions: PlayerAction[] // history of player actions per week
}
```

**Validation Rules**:
- Chain can only advance once per week (7 days = 25,200 ticks at base speed)
- `playerActions.length` must equal current week number (Week 2 = 2 actions)
- Cannot have multiple active chains affecting same sector (prevent conflict)
- `pausedAt` state preserves exact prior state for resumption

**State Transitions**:
```
WEEK_1 ──(player action)──> WEEK_2 ──(player action)──> WEEK_3 ──(player action)──> RESOLVED
  ↓              ↓               ↓
PAUSED ──(forced event ends)──> Resume at exact prior state
```

**Store Integration**:
```typescript
interface GameState {
  eventChains: {
    active: EventChain[] // currently running chains (max 2 simultaneous)
    history: EventChain[] // completed chains (for player stats)
  }
}

interface GameActions {
  startEventChain: (chainTemplateId: string) => void
  advanceChain: (chainId: string, playerAction: PlayerAction) => void
  pauseChain: (chainId: string, reason: string) => void // when forced event interrupts
  resumeChain: (chainId: string) => void
  resolveChain: (chainId: string) => void // apply final resolution effects
}
```

---

### 4. SkillPath

**Purpose**: Represents an employee's career development trajectory with branching skill choices

**Interface**:
```typescript
type SkillPathType = 'trading' | 'analysis'
type SkillId = string // e.g., "trading-1", "analysis-2", "fund-manager"

interface SkillBonus {
  type: 'trade_profit' | 'slippage' | 'execution_speed' | 'prediction' | 'confidence' | 'risk_assessment'
  value: number // percentage (e.g., 0.20 = +20%)
}

interface SkillNode {
  id: SkillId
  name: string // "Fast Execution", "Pattern Recognition", etc.
  description: string
  levelRequired: number // employee level needed to unlock (5, 10, 20, 30)
  prerequisites: SkillId[] // skills that must be unlocked first
  bonuses: SkillBonus[]
  pathType: SkillPathType // which path this belongs to
}

interface SkillPath {
  employeeId: string
  selectedPath: SkillPathType | null // null if not chosen yet (chosen at level 5)
  unlockedSkills: SkillId[] // chronological order of unlocks
  currentLevel: number // cached from employee.level for quick lookups
  totalBonuses: SkillBonus[] // aggregated bonuses from all unlocked skills
  nextAvailableSkills: SkillId[] // skills player can unlock next (level requirements met)
}
```

**Validation Rules**:
- `selectedPath` must be null until employee reaches level 5 (FR-019)
- Cannot unlock skill if `prerequisites` not in `unlockedSkills`
- Cannot unlock skill if `employee.level < skill.levelRequired`
- `totalBonuses` must equal sum of all `unlockedSkills[].bonuses`
- Cannot change `selectedPath` after selection (permanent choice)

**State Transitions**:
```
No path selected (level <5)
   ↓
Path selected at level 5 (trading or analysis)
   ↓
Skill unlocks at levels 10, 20, 30
   ↓
Advanced path choices at level 20 (Fund Manager vs Day Trader, etc.)
```

**Store Integration**:
```typescript
interface GameState {
  skillPaths: Record<string, SkillPath> // keyed by employeeId
}

interface GameActions {
  selectSkillPath: (employeeId: string, pathType: SkillPathType) => void
  unlockSkill: (employeeId: string, skillId: SkillId) => void
  calculateTotalBonuses: (employeeId: string) => SkillBonus[]
  getAvailableSkills: (employeeId: string) => SkillId[]
  applySkillBonus: (employeeId: string, bonusType: SkillBonus['type']) => number
}
```

---

### 5. EmployeeBio

**Purpose**: Represents employee personality, life goals, and emotional state for narrative engagement

**Interface**:
```typescript
type PersonalityTrait = 'optimistic' | 'cautious' | 'ambitious' | 'impulsive' | 'steady' | 'anxious' | 'social' | 'focused' | 'creative' | 'analytical' // existing traits from data/traits.ts

type EmotionalState = 'excited' | 'content' | 'neutral' | 'worried' | 'stressed' | 'frustrated' | 'happy'

interface PersonalGoal {
  description: string // "Save 30M KRW for home down payment"
  targetAmount: number // KRW amount
  currentProgress: number // KRW accumulated so far
  progressPercent: number // calculated: (currentProgress / targetAmount) * 100
  milestonesReached: number[] // [25, 50, 75] (percent milestones)
}

interface LifeEvent {
  type: 'bonus' | 'level_up' | 'stress_counseling' | 'skill_unlock' | 'milestone' | 'resignation_warning'
  description: string // "Received bonus of 500K KRW", "Learned new skill: Fast Execution"
  tick: number
  impactOnMood: number // -10 to +10
}

interface EmployeeBio {
  employeeId: string
  name: string // cached from Employee.name
  age: number // 25-45, randomly assigned at hire
  personalGoal: PersonalGoal
  personalityTrait: PersonalityTrait // single trait (existing system)
  currentEmotion: EmotionalState
  recentLifeEvents: LifeEvent[] // last 10 events (FIFO queue)
  lastCounselingTick: number // for HR Manager cooldown
  satisfactionHistory: number[] // last 12 months (for trend analysis)
}
```

**Validation Rules**:
- `age` must be 25-45 inclusive
- `personalGoal.progressPercent` must equal `(currentProgress / targetAmount) * 100`
- `recentLifeEvents.length` must be ≤ 10 (enforce FIFO)
- `satisfactionHistory.length` must be ≤ 12 (12 months)
- `currentEmotion` derived from stress/satisfaction levels (not set directly)

**State Transitions**:
```
Emotion state flow (derived from stress/satisfaction):
- stress <30 && satisfaction >70 → 'happy'
- stress <50 && satisfaction >50 → 'content'
- stress <70 && satisfaction >30 → 'neutral'
- stress >70 || satisfaction <30 → 'worried'
- stress >85 → 'stressed'
- stress >95 || satisfaction <15 → 'frustrated'

Personal goal milestones:
  0% → 25% → 50% → 75% → 100% (each triggers celebration notification)
```

**Store Integration**:
```typescript
interface GameState {
  employeeBios: Record<string, EmployeeBio> // keyed by employeeId
}

interface GameActions {
  createEmployeeBio: (employeeId: string) => void // on hire
  updatePersonalGoalProgress: (employeeId: string, salaryAdded: number) => void // monthly
  addLifeEvent: (employeeId: string, event: LifeEvent) => void
  updateCurrentEmotion: (employeeId: string) => void // derived from stress/satisfaction
  celebrateMilestone: (employeeId: string, milestone: number) => void
  performCounseling: (employeeId: string) => void // HR Manager action
  deleteEmployeeBio: (employeeId: string) => void // on quit/fire
}
```

---

### 6. EconomicPressure

**Purpose**: Represents dynamic difficulty scaling through taxation, position limits, and event frequency modulation

**Interface**:
```typescript
type WealthTier = 'below_100M' | '100M_to_1B' | '1B_to_10B' | 'above_10B'

interface TaxConfig {
  tier: WealthTier
  rate: number // percentage (e.g., 0.005 = 0.5%)
  appliesAbove: number // KRW threshold
}

interface PositionLimit {
  tier: WealthTier
  maxPercentage: number // max % of portfolio in single stock (e.g., 0.20 = 20%)
  appliesAbove: number // KRW threshold
}

interface DifficultyModifier {
  tier: WealthTier
  negativeEventFrequencyMultiplier: number // e.g., 1.2 = 20% more negative events
  reliefEventEligible: boolean // can receive relief events if losing streak
}

interface PerformanceWindow {
  startTick: number
  endTick: number
  annualReturn: number // percentage
  monthlyLossStreak: number // consecutive months with >20% loss
}

interface EconomicPressure {
  currentWealthTier: WealthTier
  activeTaxConfig: TaxConfig
  activePositionLimit: PositionLimit
  activeDifficultyModifier: DifficultyModifier
  performanceHistory: PerformanceWindow[] // last 12 months (rolling window)
  lastTaxDeduction: number // tick when tax was last applied
  lastDifficultyAdjustment: number // tick when difficulty was last adjusted
}
```

**Validation Rules**:
- `currentWealthTier` derived from `player.cash + portfolioValue` (not set directly)
- `activeTaxConfig.rate` must be ≤ 0.01 (max 1% to prevent runaway taxation)
- `activePositionLimit.maxPercentage` must be ≥ 0.10 (min 10% to prevent over-restriction)
- `performanceHistory.length` must be ≤ 12 (12 months rolling window)
- Tax calculation: `min(assets * rate, monthlyIncome * 0.9)` (FR-030 cash flow protection)

**State Transitions**:
```
Wealth tier transitions (automatic based on total assets):
  below_100M → 100M_to_1B → 1B_to_10B → above_10B
       ↑____________↓_____________↓____________↓
         (can move down if losses occur)

Difficulty scaling (based on performance):
  High returns (>50% annual) → increase negative event frequency by 20%
  Loss streak (3+ months >20% loss) → trigger relief event eligibility
```

**Store Integration**:
```typescript
interface GameState {
  economicPressure: EconomicPressure
}

interface GameActions {
  updateWealthTier: () => void // called monthly, calculates tier from total assets
  applyWealthTax: () => void // monthly tax deduction (FR-027)
  enforcePositionLimit: (companyId: string, shares: number) => boolean // validate trade
  adjustDifficulty: () => void // monthly performance evaluation (FR-029)
  recordPerformance: (annualReturn: number) => void // add to performanceHistory
  checkReliefEligibility: () => boolean // loss streak check
}
```

---

## Entity Relationships

```
┌─────────────────┐
│ AnimationSequence│ (triggered by game events)
└─────────────────┘
        ↑
        │ triggers
        │
┌───────┴──────────┐
│   NewsCard       │◄─── drawn monthly
│   EventChain     │◄─── spawned quarterly (15% chance)
└──────────────────┘
        │
        │ affects
        ↓
┌──────────────────┐
│   Companies      │ (existing - price drift/volatility modified)
└──────────────────┘

┌──────────────────┐
│   Employee       │ (existing)
└──────────────────┘
        │
        │ 1:1
        ↓
┌──────────────────┐
│   SkillPath      │
│   EmployeeBio    │
└──────────────────┘

┌──────────────────┐
│   Player         │ (existing - cash, portfolio)
└──────────────────┘
        │
        │ 1:1
        ↓
┌──────────────────┐
│ EconomicPressure │
└──────────────────┘
```

## Save Data Migration

**Current SaveData Schema** (from CLAUDE.md `saveSystem.ts`):
```typescript
interface SaveData {
  version: string
  timestamp: number
  gameState: GameState // includes time, player, companies, competitors, events, windows
}
```

**Migration Strategy for New Entities**:

```typescript
// saveSystem.ts additions
const CURRENT_SAVE_VERSION = '2.0.0' // bump from existing version

const migrateSaveData = (save: SaveData): SaveData => {
  if (save.version === '1.x.x') {
    // Add new state slices with default values
    return {
      ...save,
      version: '2.0.0',
      gameState: {
        ...save.gameState,
        animationQueue: [],
        nextAnimationId: 0,
        monthlyCards: { current: [], selected: [], history: [] },
        eventChains: { active: [], history: [] },
        skillPaths: {}, // populate from existing employees
        employeeBios: {}, // populate from existing employees
        economicPressure: createDefaultEconomicPressure(save.gameState.player)
      }
    }
  }
  return save
}

const createDefaultEconomicPressure = (player: PlayerState): EconomicPressure => {
  const totalAssets = player.cash + calculatePortfolioValue(player.portfolio)
  return {
    currentWealthTier: getWealthTier(totalAssets),
    activeTaxConfig: getTaxConfigForTier(getWealthTier(totalAssets)),
    activePositionLimit: getPositionLimitForTier(getWealthTier(totalAssets)),
    activeDifficultyModifier: getDifficultyModifierForTier(getWealthTier(totalAssets)),
    performanceHistory: [],
    lastTaxDeduction: 0,
    lastDifficultyAdjustment: 0
  }
}
```

## Type Exports

All types defined in this document will be exported from `src/types/index.ts`:

```typescript
// Animation types
export type {
  AnimationStepType,
  AnimationStep,
  AnimationSequence
}

// Card & Event types
export type {
  SectorType,
  CardRarity,
  CardEffect,
  NewsCard,
  ChainWeek,
  PlayerAction,
  ChainBranch,
  ChainOutcome,
  ChainEvent,
  EventChainState,
  EventChain
}

// Skill types
export type {
  SkillPathType,
  SkillId,
  SkillBonus,
  SkillNode,
  SkillPath
}

// Employee bio types
export type {
  PersonalityTrait,
  EmotionalState,
  PersonalGoal,
  LifeEvent,
  EmployeeBio
}

// Economic pressure types
export type {
  WealthTier,
  TaxConfig,
  PositionLimit,
  DifficultyModifier,
  PerformanceWindow,
  EconomicPressure
}
```

## Next Steps

1. **Implement types** in `src/types/index.ts` with strict null checks
2. **Extend gameStore.ts** with new state slices and actions
3. **Create engine files** (`animationEngine.ts`, `cardDrawEngine.ts`, etc.) with type-safe logic
4. **Write unit tests** for state transitions and validation rules (Vitest)
5. **Document in quickstart.md** - developer guide for working with new entities

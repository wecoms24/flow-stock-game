# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retro Stock OS is a stock market trading game with a Windows 95-inspired UI, built as a single-page React application. The game simulates 30 years of stock trading (1995-2025) with real-time price movements, market events, employee management, AI competitor battles, institutional investors, and multiple ending scenarios.

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.9 (strict) + Vite 7
- **State Management**: Zustand 5 (single centralized store)
- **Styling**: TailwindCSS v4
- **Charts**: Chart.js + react-chartjs-2
- **Animation**: Motion (Framer Motion successor) + canvas-confetti
- **Audio**: Howler.js + Web Audio API oscillators (8-bit sounds)
- **Price Engine**: Web Worker with Geometric Brownian Motion (GBM) simulation
- **Persistence**: SQLite WASM (`@subframe7536/sqlite-wasm`) primary, Dexie (IndexedDB) fallback
- **WASM Support**: `vite-plugin-wasm` + `vite-plugin-top-level-await`, COOP/COEP headers required

## Development Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Type-check (tsc -b) + production build
npm run lint         # ESLint
npm run preview      # Preview production build
npm test             # Fast tests only (excludes simulation/performance)
npm run test:unit    # Unit tests only (tests/unit/)
npm run test:e2e     # E2E gameplay tests (tests/e2e/)
npm run test:sim     # Lightweight simulation tests (~2min, excludes heavy)
npm run test:sim:heavy # Full simulation incl. 5/10/20yr stress tests (~30min)
npm run test:perf    # Performance benchmarks (tests/performance/)
npm run test:all     # Everything (30min+, use sparingly)
npm run test:watch   # Watch mode
npm run test:ui      # Vitest UI
```

**Test Config**: `vitest.config.ts` (default: jsdom, 30s timeout, maxForks 4, excludes simulation/performance). `vitest.config.all.ts` (20min timeout, maxForks 2, includes all). Path alias: `@` → `./src`.

## Code Style

- **Prettier**: No semicolons, single quotes, trailing commas, tab width 2, 100 char line width
- **File Naming**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)
- **Imports**: Group by external → internal → types, alphabetize within groups

## Architecture

### State Management (Zustand)

Single store at `src/stores/gameStore.ts` (~5600 LOC). All state mutations go through store actions. Business logic is delegated to `src/engines/` pure functions — store actions are thin wrappers (5-20 LOC each).

**Core State Shape**:
- `time: GameTime` — Year/month/day/hour + speed/pause
- `player: PlayerState` — Cash, portfolio, employees[], officeGrid, officeLevel
- `companies: Company[]` — 20 stocks across 10 sectors with prices/drift/volatility/regimeVolatilities
- `competitors: Competitor[]` — AI rivals with independent portfolios and trading styles
- `events: MarketEvent[]` — Active events modifying drift/volatility (with aftereffect decay)
- `windows: WindowState[]` — Open window positions/z-index
- `proposals: TradeProposal[]` — Trade AI pipeline proposals (PENDING→APPROVED→EXECUTED)
- `taunts: TauntMessage[]` — AI competitor chat feed
- `corporateSkills: CorporateSkillState` — Company-level knowledge assets
- `training: TrainingState` — Active training programs + history
- `animationQueue: AnimationQueueState` — Pending trade animations
- `monthlyCards: MonthlyCardDrawState` — Monthly card selection + active effects
- `eventChains: ActiveEventChainState` — Multi-week event chain progress
- `economicPressure: EconomicPressure` — Wealth tier + tax + position limits
- `milestones: MilestoneProgress` — Achievement tracking
- `marketRegime: RegimeState` — HMM regime detection (CALM/VOLATILE/CRISIS)
- `circuitBreaker: CircuitBreakerState` — KOSPI circuit breaker (Level 1/2/3)
- `institutions: Institution[]` — 100 institutional investors with fundamental-driven trading
- `orderFlowByCompany: Record<string, OrderFlow>` — Market impact order flow (tanh model)
- `playerProfile: PlayerProfile` — Risk tolerance, play pace, attention (personalization)
- `limitOrders: LimitOrder[]` — Player limit orders
- `cashFlowLog: CashFlowEntry[]` — Financial ledger
- `realizedTrades: RealizedTrade[]` — Closed position P&L records
- `monthlyCashFlowSummaries: MonthlySummary[]` — Monthly financial summaries
- `hourlyAccumulators: HourlyAccumulators` — Salary/tax accumulation between monthly records
- `employeeBios: Record<string, EmployeeBio>` — Employee personality/life events
- `employeeBehaviors: Record<string, string>` — Employee behavior FSM states
- `aiProposal: LayoutProposal | null` — AI Architect office layout proposal

**10 Sectors**: `tech`, `finance`, `energy`, `healthcare`, `consumer`, `industrial`, `telecom`, `materials`, `utilities`, `realestate` — with inter-sector correlation matrix (`src/data/sectorCorrelation.ts`)

**Key Patterns**:
- Use selectors for performance: `useGameStore((s) => s.specificValue)`
- Never subscribe to the whole store
- Hourly processing (`processHourly`) handles salaries, taxes, stamina drain/recovery, mood drift, XP grants
- Monthly processing (`processMonthly`) handles cashflow recording, monthly cards, bio updates
- Employee processing (`processEmployeeTick`) runs on configurable hour intervals based on employee count

### Game Engine Pipeline

The tick engine (`src/engines/tickEngine.ts`) runs at `BASE_HOUR_MS (1000ms) / speed` — each interval = 1 game hour. Business hours are 9-18 (10 hours/day), 30 days/month.

```
Each hour:
1. advanceHour() — time progression
2. processHourly() — salary/tax/stamina/mood/XP
3. detectAndUpdateRegime() — HMM market regime detection (CALM/VOLATILE/CRISIS)
4. updateCircuitBreaker() — KOSPI-level circuit breaker check
5. updateVIStates() — Volatility Interruption per-company (KRX ±3% rule)
6. updateInstitutionalFlowForSector() — rotate sector for institutional flow (hour % 10)
7. updateSessionOpenPrices() — at 9:00 each day
8. processMonthly() — on day 1, hour 9
9. M&A processing — quarterly (3/6/9/12月 30日 18時)
10. Web Worker — GBM price calculation with sentiment/orderFlow/marketImpact/priceLimit data
11. Sentiment decay — natural sentiment decay
12. Event system — decay events, generate aftereffects (여진), spawn new events
13. News engine — historical events (1995-2025) + chain events
14. processEmployeeTick() — on hourIndex intervals (dynamic by empCount)
15. Trade AI Pipeline:
    a. processAnalystTick() (hourIndex%10===0) — stock analysis, generate proposals
    b. processManagerTick() (hourIndex%5===2) — approve/reject proposals
    c. expireOldProposals() (hourIndex%10===5) — clean stale proposals
    d. processTraderTick() (every hour) — execute approved proposals
16. processCompetitorTick() — AI trading (every 5 hours)
17. Monthly Card system — effect expiry + auto-selection timeout
18. Event Chains — weekly advancement (day 1/8/15/22/29 at 10:00)
19. Auto-save (every 300 hours)
```

Worker initialization happens in `App.tsx` useEffect. Speed changes trigger interval recalculation.

### Engine Layer (`src/engines/`)

| Engine | Purpose | Call Frequency |
|--------|---------|----------------|
| `tickEngine.ts` | Game loop coordinator | Every hour (1000ms/speed) |
| `competitorEngine.ts` | AI trading (4 strategies: Shark/Turtle/Surfer/Bear) | Every 5 hours |
| `officeSystem.ts` | Employee buff calculation + stress/satisfaction/skill updates | Variable by empCount |
| `hrAutomation.ts` | Auto stress care + training + weekly reports | Via processEmployeeTick |
| `tradePipeline/analystLogic.ts` | Analyst stock analysis + proposal generation | hourIndex%10===0 |
| `tradePipeline/managerLogic.ts` | Manager risk assessment + approve/reject | hourIndex%5===2 |
| `tradePipeline/traderLogic.ts` | Trader order execution with slippage | Every hour (when APPROVED exists) |
| `tradePipeline/adjacencyBonus.ts` | Office adjacency speed bonus calculation | Called by pipeline |
| `tradePipeline/profile.ts` | Trade pipeline profiling | Debug |
| `corporateSkillEngine.ts` | Corporate skill unlock/aggregate effects (pure functions) | On unlock + every pipeline tick |
| `trainingEngine.ts` | Training program lifecycle (create/advance/checkpoint/graduate) | Every hour for active programs |
| `signalGenerationEngine.ts` | Badge-enhanced trade signal generation with noise filtering | Called by analystLogic |
| `riskManagementEngine.ts` | Badge-based position sizing for Manager employees | Called by managerLogic |
| `tradeExecutionEngine.ts` | Badge-based order execution for Traders (slippage/delay) | Called by traderLogic |
| `animationEngine.ts` | Trade animation sequence execution (card flip/counter/particle) | On trade completion |
| `cardDrawEngine.ts` | Monthly card weighted random selection + effect application | Monthly processing |
| `employeeBioEngine.ts` | Employee personality/goals/life events/emotion management | Monthly + on events |
| `employeeBehavior.ts` | Employee behavior FSM (WORKING/IDLE/BREAK/SOCIALIZING/PANIC) | Per employee tick |
| `employeeInteraction.ts` | Adjacent employee auto-interaction with cooldowns | Per employee tick |
| `skillPathEngine.ts` | Skill path branching (Trading/Analysis) + bonus calculation | On level-up + pipeline |
| `eventChainEngine.ts` | Multi-week event FSM (state transitions/branching/resolution) | Weekly |
| `economicPressureEngine.ts` | Wealth tier classification + tax + position limit enforcement | Monthly + on buy |
| `mnaEngine.ts` | M&A evaluation + new company generation for IPOs | Quarterly |
| `regimeEngine.ts` | Hidden Markov Model market regime detection, KOSPI index calc | Every hour |
| `circuitBreakerEngine.ts` | KOSPI circuit breaker (Level 1/2/3 at -8%/-15%/-20%) | Every hour |
| `viEngine.ts` | Volatility Interruption (±3% in 3 hours → 6-hour halt, KRX-style) | Every hour |
| `institutionEngine.ts` | 100 institutional investors with fundamental/panic trading | Sector rotation |
| `newsEngine.ts` | Historical event processing (1995-2025), chain events, M&A news | Every hour |
| `sentimentEngine.ts` | Global + per-sector sentiment index with decay | Every hour |
| `cashFlowTracker.ts` | Cash flow entries, monthly aggregation, anomaly detection | On transactions |

### Market Systems

**Market Regime** (`regimeEngine.ts`): HMM-based detection of CALM/VOLATILE/CRISIS states. Companies have `regimeVolatilities` per regime. KOSPI index calculated from all active companies.

**Circuit Breaker** (`circuitBreakerEngine.ts`): KOSPI drops of -8% (L1), -15% (L2), -20% (L3) trigger market-wide halts. Session open tracking.

**Volatility Interruption** (`viEngine.ts`): Per-company KRX-style VI — ±3% in 3 hours triggers 6-hour halt.

**Price Limits** (`src/config/priceLimit.ts`): KRX rules — ±30% daily price change limit enforced in worker.

**Market Impact** (`src/config/marketImpactConfig.ts`): Order flow → price impact via tanh model. `orderFlowByCompany` tracks net notional + trade count.

**Sector Correlation** (`src/data/sectorCorrelation.ts`): 10×10 correlation matrix with `SPILLOVER_FACTOR=0.3` for cross-sector event propagation.

**Institutional Investors** (`institutionEngine.ts`, `src/config/institutionConfig.ts`): 100 institutions with fundamental-driven + panic-sell trading. Sector rotation processing.

**Sentiment** (`sentimentEngine.ts`): Global market sentiment + per-sector sentiment with natural decay. Events and M&A feed sentiment. Worker receives sentiment as drift/volatility modifiers.

### Competitor AI System

4 AI trading strategies configured in `src/config/aiConfig.ts`:
- **Shark** (aggressive): High-volatility stocks, frequent trades, large positions
- **Turtle** (conservative): Blue-chip stocks, long-term holds
- **Surfer** (trend-follower): Momentum-based (MA20), sells on trend break
- **Bear** (contrarian): RSI-based, buys oversold, sells overbought

All AIs can **panic sell** (뇌동매매) when portfolio drops >8% — configured in `PANIC_SELL_CONFIG`.

Price history for technical analysis is maintained per-company (max 50 data points). AI processing distributed across hours to avoid frame drops.

### Employee RPG System

**Traits** (`src/data/traits.ts`): 10 personality traits with rarity tiers (common 70% / uncommon 20% / rare 10%). Each trait modifies buff multipliers (stamina recovery, stress generation, skill growth).

**Office Grid** (`src/types/office.ts`): 10x10 grid where employees sit at desks. Furniture placement provides area-of-effect buffs calculated via Manhattan distance.

**Buff Pipeline** (`officeSystem.ts`):
```
Furniture buffs × Trait effects × Employee interactions → Final multipliers
→ Applied to: stamina recovery, stress generation, skill growth, morale
```

**Growth System** (`src/systems/growthSystem.ts`): XP curve (`BASE_XP * level^1.5`), titles (intern→junior→senior→master), badge colors (gray→blue→purple→gold), skill unlocks at levels 10/20/30.

**Skill Badges** (`src/data/skillBadges.ts`): 30 badges (10 trading + 10 analysis + 10 research) that modify pipeline behavior.

**Employee Behavior FSM** (`employeeBehavior.ts`): States: WORKING → IDLE → BREAK → SOCIALIZING → PANIC. Adjacent employees interact automatically with cooldowns (`employeeInteraction.ts`).

**Chatter** (`src/data/chatter.ts`): Priority-based speech bubbles with per-employee and per-template cooldowns. Call `cleanupChatterCooldown(id)` when employees leave.

**HR Manager**: Auto-hirable role that runs `processHRAutomation` — counsels stressed employees (50K cost, -15 stress), trains skills, generates weekly reports.

### Trade AI Pipeline (`src/engines/tradePipeline/`)

Employee-driven automated trading system. Analysts scan stocks → Managers approve/reject → Traders execute orders.

**Proposal Lifecycle** (`src/types/trade.ts`):
```
PENDING → APPROVED → EXECUTED (success)
       → REJECTED         → FAILED (insufficient funds, etc.)
       → EXPIRED (stale)
```

**Pipeline Configuration** (`src/config/tradeAIConfig.ts`):
- `CONFIDENCE_THRESHOLD: 70` — minimum confidence for proposal creation
- `MAX_PENDING_PROPOSALS: 10` — global pending proposal limit (oldest expired when exceeded)
- `PROPOSAL_EXPIRY_TICKS: 100` — auto-expire stale proposals
- `BASE_SLIPPAGE: 0.01` — base trade execution slippage (1%)
- `ADJACENCY_SPEED_BONUS: 0.30` — max 30% bonus for adjacent placement

**Adjacency Bonus** (`adjacencyBonus.ts`): When Analyst sits next to Manager, or Manager next to Trader, pipeline gets speed bonuses:
- Analyst: confidence threshold lowered (more proposals generated)
- Manager: processes 2 proposals per hour instead of 1
- Trader: reduced slippage on execution

**Fallback Behavior**:
- No Manager → auto-approve with 30% mistake rate
- No Trader → execute with 2x fee penalty
- Stress 100 → skip pipeline processing for that employee

**Key Store Actions**: `addProposal`, `updateProposalStatus`, `expireOldProposals`, `processAnalystTick`, `processManagerTick`, `processTraderTick`

### Corporate Skill System (`src/engines/corporateSkillEngine.ts`, `src/data/corporateSkills.ts`)

Two-layer skill architecture: **Company-level knowledge assets** (CorporateSkill) and **Employee RPG skills** (SkillTree), connected via Training System.

**CorporateSkill** (`src/types/corporateSkill.ts`): Company-wide policies/tools/infrastructure with 3 tiers and 4 categories (policy, knowledge, tool, infrastructure). 12 skills total defined in `corporateSkills.ts`.

**Effect Types**:
- `global`: Additive bonuses with caps — `signalAccuracyBonus` (max 50%), `slippageReduction` (max 80%), `commissionDiscount` (max 50%), `riskReductionBonus`, `maxPendingProposals`
- `conditional`: Strongest-wins — `stopLossThreshold`, `takeProfitThreshold`, `trailingStopPercent`, `maxSinglePositionPercent`
- `teachablePassiveId`: Links corporate skill → RPG skill tree node (unlocked via Training graduation)

**Aggregation** (`aggregateCorporateEffects`): Iterates all unlocked skills, sums global effects, picks strongest conditional effects. Called before every trade pipeline tick.

**Integration Points**: `AggregatedCorporateEffects` is passed to `analyzeStock()`, `generateProposal()`, `checkPortfolioExits()`, `executeEmployeeTrade()` in the trade pipeline.

### Training System (`src/engines/trainingEngine.ts`, `src/data/trainingEvents.ts`)

Education program management connecting corporate skills to individual employee growth.

**Program Lifecycle**: `in_progress` → `completed` (or `cancelled`)
- Max seats by tier: Tier 1=5, Tier 2=4, Tier 3=3
- Duration by tier: defined in `trainingEvents.ts`
- Cost: baseCost + costPerTrainee × traineeCount

**Checkpoints** at 25%/50%/75% progress:
- Types: `quiz`, `simulation`, `discussion`, `challenge`
- Pass/fail based on average trainee skill + trait bonuses + stress penalty + random factor
- Pass: XP bonus to trainees. Fail: stress increase + progress rollback

**Graduation** (`applyGraduation`):
- Adds skill to `employee.learnedCorporateSkills`
- Boosts category-relevant stat (policy→research, tool→analysis, infrastructure→trading)
- Unlocks `teachablePassiveId` in employee's RPG `unlockedSkills` (if defined in SKILL_TREE)

### RPG Skill Tree (`src/systems/skillSystem.ts`, `src/data/skillTree.ts`)

30-node passive skill tree (10 Analysis + 10 Trading + 10 Research) with modifier-based effects.

**Modifiers** (`getPassiveModifiers`):
- `operation: 'add'` with `CONFIDENCE_SCALE_MULTIPLIER (100)`: modifier 0.1 = +10 confidence points
- `operation: 'multiply'`: modifier 0.5 = 50% reduction (slippage, commission, delay)

**Integration**: `getPassiveModifiers(employee, effectType)` called in `analystLogic.ts` (signalAccuracy), `traderLogic.ts` (slippage, commission), `managerLogic.ts` (riskThreshold)

### M&A System (`src/engines/mnaEngine.ts`, `src/config/mnaConfig.ts`)

Corporate mergers and acquisitions system with quarterly evaluation, automatic IPOs, and portfolio exchanges.

**Quarterly Evaluation** (분기 말 3/6/9/12월 30일 18시):
- Cooldown: Minimum 2 years between M&A deals
- Probability: 15% per quarter (when cooldown expired)
- Acquirer selection: Top 40% companies by market cap
- Target selection: Bottom 50% by market cap + 20%+ price drop from base
- Premium: 20-40% random premium over current price
- Layoff rate: 10-60% (per-company `layoffRateOnAcquisition`)

**Deal Execution** (`gameStore.executeAcquisition`):
- Target status → `'acquired'`, `parentCompanyId` set to acquirer
- Player/AI portfolios: target shares → forced cash-out at deal price
- M&A news generated via `newsEngine.ts`
- Market sentiment impact via `sentimentEngine.ts`

**IPO Scheduling**: 180-360 hours delay. New company generated with sector preserved. IPO executes when elapsed, replaces slot.

**Company Status**: `'active'` (normal) or `'acquired'` (delisted). Worker filters out acquired companies.

### Config Layer (`src/config/`)

| Config | Purpose |
|--------|---------|
| `aiConfig.ts` | AI competitor strategies, PANIC_SELL_CONFIG, PERFORMANCE_CONFIG |
| `tradeAIConfig.ts` | Trade pipeline thresholds, slippage, adjacency bonuses |
| `mnaConfig.ts` | M&A deal parameters, cooldowns, premiums |
| `timeConfig.ts` | Business hours (9-18), hours/day (10), `getAbsoluteTimestamp`, `getBusinessHourIndex` |
| `priceLimit.ts` | KRX rules: ±30% daily limit, VI config, circuit breaker config |
| `marketImpactConfig.ts` | Order flow → price impact (tanh model coefficients) |
| `institutionConfig.ts` | 100 institutions, capital allocation, fundamental thresholds |
| `balanceConfig.ts` | Centralized EMPLOYEE_BALANCE, OFFICE_BALANCE constants |
| `skillBalance.ts` | SP per level, reset costs |
| `economicPressureConfig.ts` | Wealth tier configs, tax discounts |
| `aiArchitectConfig.ts` | AI office layout proposal frequency and balance |

### Data Layer (`src/data/`)

- `companies.ts`: 20 companies across 10 sectors with financials, eventSensitivity, regimeVolatilities
- `events.ts`: 50+ market event templates with weighted spawn probabilities
- `historicalEvents.ts`: Real 1995-2025 economic events (dot-com crash, 2008 crisis, etc.) with chain templates
- `sectorCorrelation.ts`: 10×10 sector correlation matrix + SPILLOVER_FACTOR
- `difficulty.ts`: Easy/Normal/Hard configs
- `employees.ts`: Name pool + role-based skill generation
- `traits.ts`: 10 personality traits with rarity and effect definitions
- `furniture.ts`: 10 furniture types with buff effects and costs
- `chatter.ts`: Speech bubble templates, pipeline message templates (`getPipelineMessage`)
- `taunts.ts`: AI competitor trash-talk by situation
- `corporateSkills.ts`: 12 corporate skill definitions (3 tiers × 4 categories)
- `skillTree.ts`: 30-node RPG passive skill tree (Analysis/Trading/Research)
- `skillBadges.ts`: 30 badges (10 trading + 10 analysis + 10 research) with effect mappings
- `trainingEvents.ts`: Training checkpoint templates + duration/cost by tier
- `newsCards.ts`: 50+ monthly card templates (5 sectors, 4 rarities)
- `eventChains.ts`: 10+ multi-week event chain templates with branching
- `milestones.ts`: Achievement milestone definitions
- `personalGoals.ts`: Employee personal goal templates by age/role
- `skillPaths.ts`: Trading/Analysis path branching definitions (Lv5/10/20/30)
- `officeBackgrounds.ts`: Office theme evolution by level (garage/startup/corporate/tower)

### Systems Layer (`src/systems/`)

- `saveSystem.ts`: SQLite primary + IndexedDB fallback save/load with auto-save
- `saveSystemLegacy.ts`: Legacy IndexedDB-only implementation (retained for migration)
- `growthSystem.ts`: XP curves, title/badge mapping, skill unlocks
- `soundManager.ts`: Audio management
- `skillSystem.ts`: RPG skill tree operations (unlock, modifier calculation, migration, validation)
- `animationScheduler.ts`: Priority queue + RAF coordination for trade animations (60Hz budget)
- `featureFlags.ts`: Feature flag system (`sqlite_enabled` default true)
- `aiArchitect.ts` / `aiArchitectDot.ts`: AI office layout proposal system
- `particleSystem.ts`: Particle effect system
- `ambientRenderer.ts` / `emotionRenderer.ts`: Visual rendering systems
- `spriteAnimator.ts` / `spritePlaceholder.ts`: Sprite animation and placeholder

### Utilities (`src/utils/`)

- `badgeConverter.ts`: Employee skill values (0-100) → SkillBadge array, `aggregateBadgeEffects`, `hasBadge`
- `technicalIndicators.ts`: Shared `calculateMA()` and `calculateRSI()` for technical analysis
- `floatingTextEmitter.ts`: Global event bus for floating text (separated for React Fast Refresh)
- `performanceMonitor.ts`: FPS and rendering performance monitoring (dev mode only)
- `skillFormatter.ts`: Korean-language labels for passive modifier targets
- `tutorialStorage.ts`: localStorage persistence for TutorialState

### Custom Hooks (`src/hooks/`)

- `useAnimationSequence.ts`: Bridges store animationQueue → animationScheduler → sound/particles
- `useNumberCounter.ts`: RAF-based number counting animation (from/to/duration/easing)
- `useParticleEffect.ts`: React wrapper for `particleSystem.emitParticles()`
- `useRankChangeNotification.ts`: Listens to DOM events for rank changes

### Window System

All windows use `WindowFrame` for consistent drag/resize/close behavior. `windowId` (unique per instance) vs `windowType` (e.g., 'trading', 'chart'). Window state managed in Zustand store. Multiple instances of same type supported.

**Window Types** (20): `portfolio`, `chart`, `trading`, `news`, `office`, `office_dot`, `office_history`, `employee_detail`, `ranking`, `settings`, `ending`, `institutional`, `proposals`, `acquisition`, `dashboard`, `achievement_log`, `monthly_cards`, `event_chain_tracker`, `skill_library`, `training_center`

**Window Layout Presets**: `trading`, `analysis`, `dashboard`, `ai-trading`, `institutional`, `comprehensive`

### Storage System

SQLite WASM (`@subframe7536/sqlite-wasm`) is the default storage backend. IndexedDB retained as fallback.

- `saveSystem.ts` tries SQLite first, falls back to IndexedDB on failure
- Migration from IndexedDB → SQLite via banner on app start (`App.tsx`)
- Feature flag toggle available in Settings window
- Migration status tracked in localStorage to prevent duplicate runs

## Key Workflows

### Adding a New Window Type

1. Create component in `src/components/windows/YourWindow.tsx`
2. Add window type to `WindowType` union in `src/types/index.ts`
3. Add rendering case in `WindowManager.tsx`
4. Add trigger in Taskbar or other UI

### Adding a New AI Strategy

1. Add strategy function in `competitorEngine.ts` (follow existing pattern: frequency check → stock selection → position sizing → buy/sell)
2. Add config params to `src/config/aiConfig.ts`
3. Add `TradingStyle` variant in `src/types/index.ts`
4. Add competitor name/avatar/taunt in generation logic

### Adding a New Employee Trait

1. Add trait key to `EmployeeTrait` union type in `src/types/index.ts`
2. Add `TraitConfig` definition in `src/data/traits.ts`
3. Add conditional logic in `officeSystem.ts` `applyTraitEffects()` if trait has special interactions
4. Add chatter template in `src/data/chatter.ts` if trait should trigger speech bubbles

### Adding New Furniture

1. Add `FurnitureType` variant in `src/types/office.ts`
2. Add catalog entry in `src/data/furniture.ts` with buffs, cost, sprite

## Common Gotchas

1. **Hour timing**: Intervals are approximate (`BASE_HOUR_MS / speed`); don't rely on exact timing
2. **Worker messages**: Prices update asynchronously; state changes are not immediate
3. **Portfolio recalculation**: Happens every price update — use `useMemo` in components
4. **Z-index**: Always use store's `nextZIndex` counter, never hardcode
5. **Save data migration**: When changing types, handle legacy format with nullish coalescing
6. **Employee cleanup**: When firing/resigning, must clean up: grid seat (`occupiedBy → null`), chatter cooldowns (`cleanupChatterCooldown`), monthly expenses
7. **HR cash safety**: HR automation spending uses `Math.max(0, cash - spent)` to prevent negative cash
8. **setTimeout in useEffect**: Track timeout IDs in a `useRef<Set>` and clear on unmount to prevent memory leaks
9. **Console tampering**: Production mode freezes `getState()` output to prevent cheating
10. **AI hour distribution**: Competitor trading spread across hours to avoid frame drops — don't process all AIs on same hour
11. **Trade pipeline cleanup**: When firing/resigning employees, orphaned PENDING/APPROVED proposals must be expired or reassigned
12. **Pipeline officeGrid guard**: All process*Tick actions must check `s.player.officeGrid` exists before calculating adjacency bonuses
13. **Corporate effects aggregation**: Call `aggregateCorporateEffects(corporateSkills)` before trade pipeline ticks — results are passed to analyst/manager/trader logic
14. **Training checkpoint resolution**: `resolveCheckpoint` must be called separately after `advanceTraining` detects a checkpoint — don't merge them
15. **Skill tree modifier scale**: RPG passive `add` modifiers use `CONFIDENCE_SCALE_MULTIPLIER (100)` — modifier 0.1 = +10 points, NOT +0.1
16. **teachablePassiveId guard**: `applyGraduation` checks `SKILL_TREE[passiveId]` exists before adding to `unlockedSkills` — undefined IDs are silently ignored
17. **Corporate effects caps**: `slippageReduction` capped at 0.8, `commissionDiscount` at 0.5, `signalAccuracyBonus` at 0.5 — exceeding caps is clipped in `aggregateCorporateEffects`
18. **Test process cleanup**: After running `vitest` or `playwright test`, verify no orphan processes remain (`ps aux | grep vitest`). Kill with `pkill -f vitest` before starting new test runs. Never run tests in background without a timeout limit.
19. **Hourly accumulator pattern**: `processHourly()` deducts cash each hour but does NOT call `recordCashFlow()` — accumulators (`hourlyAccumulators.salaryPaid/taxPaid`) track totals, and `processMonthly()` records single monthly entries then resets accumulators
20. **Cooldown units**: `praiseCooldown` / `scoldCooldown` are in **days** (decremented in `advanceHour` on dayChanged), not months. Set to 30 for ~1 month cooldown
21. **HR stress threshold**: HR automation triggers at `stress > 80` (daily check). Training runs every 30 days
22. **Acquired company filtering**: Worker, trading, and all UI must filter `companies.filter(c => c.status !== 'acquired')`. Forgetting this causes ghost price updates
23. **Event aftereffects (여진)**: Expiring events spawn aftereffect events at 10% drift / 15% volatility for 50 hours. Already-aftereffect events don't spawn more
24. **formatMoney duplication**: `formatMoney` is defined inline in multiple portfolio components (CashFlowTab, PnLTab, PortfolioWindow) — not centralized. Changes must be made in all locations

## Performance Considerations

- **Memoization**: Chart data and grid calculations are expensive; always `useMemo`
- **Selective re-renders**: Zustand selectors, not whole store subscriptions
- **Worker offloading**: GBM calculations stay in Web Worker
- **AI distribution**: Competitor trading spread across hours
- **Price history cap**: Max 50 data points per company for technical indicators
- **Chatter cooldowns**: Per-employee minimum interval + per-template cooldown prevents spam
- **Institutional sector rotation**: Only 1 sector processed per hour (hour % 10) to avoid processing all 100 institutions at once

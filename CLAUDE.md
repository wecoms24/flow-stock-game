# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retro Stock OS is a stock market trading game with a Windows 95-inspired UI, built as a single-page React application. The game simulates 30 years of stock trading (1995-2025) with real-time price movements, market events, employee management, AI competitor battles, and multiple ending scenarios.

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.9 + Vite 7
- **State Management**: Zustand 5 (single centralized store)
- **Styling**: TailwindCSS v4
- **Charts**: Chart.js + react-chartjs-2
- **Animation**: Motion (Framer Motion successor)
- **Audio**: Web Audio API oscillators (8-bit sounds, zero network overhead)
- **Price Engine**: Web Worker with Geometric Brownian Motion (GBM) simulation
- **Persistence**: Dexie (IndexedDB wrapper)

## Development Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Type-check (tsc -b) + production build
npm run lint         # ESLint
npm run preview      # Preview production build
npm test             # Fast tests only (~7s, excludes simulation/performance)
npm run test:unit    # Unit tests only
npm run test:e2e     # E2E gameplay tests
npm run test:sim     # Lightweight simulation tests (~2min)
npm run test:sim:heavy # Full simulation incl. 5/10/20yr stress tests (~30min)
npm run test:perf    # Performance benchmarks
npm run test:all     # Everything (30min+, use sparingly)
```

## Code Style

- **Prettier**: No semicolons, single quotes, trailing commas, 100 char line width
- **File Naming**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)
- **Imports**: Group by external → internal → types, alphabetize within groups

## Architecture

### State Management (Zustand)

Single store at `src/stores/gameStore.ts` (~5500 LOC). All state mutations go through store actions. Business logic is delegated to `src/engines/` pure functions — store actions are thin wrappers (5-20 LOC each).

**Core State Shape**:
- `time: GameTime` — Year/month/day/tick + speed/pause
- `player: PlayerState` — Cash, portfolio, employees[], officeGrid, officeLevel
- `companies: Company[]` — 20 stocks across 5 sectors with prices/drift/volatility
- `competitors: Competitor[]` — AI rivals with independent portfolios and trading styles
- `events: MarketEvent[]` — Active events modifying drift/volatility
- `windows: WindowState[]` — Open window positions/z-index
- `proposals: TradeProposal[]` — Trade AI pipeline proposals (PENDING→APPROVED→EXECUTED)
- `taunts: TauntMessage[]` — AI competitor chat feed
- `corporateSkills: Record<string, CorporateSkill>` — Company-level knowledge assets (해금/교육)
- `trainingState: TrainingState` — Active training programs + history
- `animationQueue: AnimationSequence[]` — Pending trade animations
- `monthlyCards: NewsCard[]` — Current month's active cards
- `eventChains: EventChainState[]` — Multi-week event chain progress
- `economicPressure: EconomicPressure` — Wealth tier + tax + position limits

**Key Patterns**:
- Use selectors for performance: `useGameStore((s) => s.specificValue)`
- Never subscribe to the whole store
- Hourly processing (`processHourly`) handles salaries, taxes, stamina drain/recovery, mood drift, XP grants (distributed per-tick)
- Monthly processing (`processMonthly`) handles cashflow recording, monthly cards, bio updates, event chains
- Employee tick processing (`processEmployeeTick`) runs every 10 ticks

### Game Engine Pipeline

The tick engine (`src/engines/tickEngine.ts`) runs at `BASE_TICK_MS (200ms) / speed`:

```
Each tick:
1. advanceHour() — time progression (10 ticks = 1 day, 300 ticks = 1 month)
2. processHourly() — salary/tax/stamina/mood/XP (distributed per-hour)
3. Web Worker — GBM price calculation for all 20 companies
4. updatePrices() — apply new prices to store
5. Event system — decay active events, spawn new ones
6. processEmployeeTick() (every 10 ticks) — stress/satisfaction/skills
7. aggregateCorporateEffects() — compute global/conditional trade modifiers
8. Trade AI Pipeline (with corporateEffects):
   a. processAnalystTick() (tick%10===0) — scan sectors, generate proposals
   b. processManagerTick() (tick%5===2) — approve/reject proposals
   c. expireOldProposals() (tick%10===5) — clean stale proposals
   d. processTraderTick() (every tick) — execute approved proposals
9. advanceTraining() — progress active training programs, trigger checkpoints
10. processAITrading() — competitor engine trades
11. processEventChains() (weekly) — advance multi-week event chains
12. processMonthly() (day 1, hour 9) — cashflow recording, monthly events
13. Auto-save (every 300 ticks)
```

Worker initialization happens in `App.tsx` useEffect. Speed changes trigger interval recalculation.

### Engine Layer (`src/engines/`)

| Engine | Purpose | Call Frequency |
|--------|---------|----------------|
| `tickEngine.ts` | Game loop coordinator | Every tick (200ms/speed) |
| `competitorEngine.ts` | AI trading (4 strategies: Shark/Turtle/Surfer/Bear) | Every tick via tick distribution |
| `officeSystem.ts` | Employee buff calculation + stress/satisfaction/skill updates | Every 10 ticks |
| `hrAutomation.ts` | Auto stress care + quarterly training + weekly reports | Via processEmployeeTick |
| `tradePipeline/analystLogic.ts` | Analyst stock analysis + proposal generation | Every 10 ticks (tick%10===0) |
| `tradePipeline/managerLogic.ts` | Manager risk assessment + approve/reject | Every 5 ticks (tick%5===2) |
| `tradePipeline/traderLogic.ts` | Trader order execution with slippage | Every tick (when APPROVED exists) |
| `tradePipeline/adjacencyBonus.ts` | Office adjacency speed bonus calculation | Called by pipeline ticks |
| `corporateSkillEngine.ts` | Corporate skill unlock/aggregate effects (pure functions) | On unlock + every tick aggregation |
| `trainingEngine.ts` | Training program lifecycle (create/advance/checkpoint/graduate) | Every tick for active programs |
| `signalGenerationEngine.ts` | Badge-enhanced trade signal generation with noise filtering | Called by analystLogic |
| `animationEngine.ts` | Trade animation sequence execution (card flip/counter/particle) | On trade completion |
| `cardDrawEngine.ts` | Monthly card weighted random selection + effect application | Monthly processing |
| `employeeBioEngine.ts` | Employee personality/goals/life events/emotion management | Monthly + on events |
| `skillPathEngine.ts` | Skill path branching (Trading/Analysis) + bonus calculation | On level-up + trade pipeline |
| `eventChainEngine.ts` | Multi-week event FSM (state transitions/branching/resolution) | Weekly tick processing |
| `economicPressureEngine.ts` | Wealth tier classification + tax + position limit enforcement | Monthly + on buy |

### Competitor AI System

4 AI trading strategies configured in `src/config/aiConfig.ts`:
- **Shark** (aggressive): High-volatility stocks, frequent trades, large positions
- **Turtle** (conservative): Blue-chip stocks, long-term holds
- **Surfer** (trend-follower): Momentum-based (MA20), sells on trend break
- **Bear** (contrarian): RSI-based, buys oversold, sells overbought

All AIs can **panic sell** (뇌동매매) when portfolio drops >8% — configured in `PANIC_SELL_CONFIG`.

Price history for technical analysis is maintained per-company (max 50 data points). AI processing is distributed across ticks via `PERFORMANCE_CONFIG.TICK_DISTRIBUTION` to avoid frame drops.

### Employee RPG System

**Traits** (`src/data/traits.ts`): 10 personality traits with rarity tiers (common 70% / uncommon 20% / rare 10%). Each trait modifies buff multipliers (stamina recovery, stress generation, skill growth).

**Office Grid** (`src/types/office.ts`): 10x10 grid where employees sit at desks. Furniture placement provides area-of-effect buffs calculated via Manhattan distance.

**Buff Pipeline** (`officeSystem.ts`):
```
Furniture buffs × Trait effects × Employee interactions → Final multipliers
→ Applied to: stamina recovery, stress generation, skill growth, morale
```

**Growth System** (`src/systems/growthSystem.ts`): XP curve (`BASE_XP * level^1.5`), titles (intern→junior→senior→master), badge colors (gray→blue→purple→gold), skill unlocks at levels 10/20/30.

**Chatter** (`src/data/chatter.ts`): Priority-based speech bubbles with per-employee and per-template cooldowns. Call `cleanupChatterCooldown(id)` when employees leave.

**HR Manager**: Auto-hirable role that runs `processHRAutomation` — counsels stressed employees (50K cost, -15 stress), trains skills quarterly (100K), generates weekly reports.

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
- Manager: processes 2 proposals per tick instead of 1
- Trader: reduced slippage on execution

**Fallback Behavior**:
- No Manager → auto-approve with 30% mistake rate
- No Trader → execute with 2x fee penalty
- Stress 100 → skip pipeline processing for that employee

**Visual Feedback** (`src/data/chatter.ts`): Pipeline events trigger speech bubbles via `getPipelineMessage()` and office events for toast notifications (`trade_executed`, `trade_failed`).

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

**Key Store Actions**: `unlockCorporateSkill`, `aggregateCorporateEffects` (via engine)

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

**Key Store Actions**: `startTraining`, `advanceTraining`, `resolveCheckpoint`, `cancelTraining`

### RPG Skill Tree (`src/systems/skillSystem.ts`, `src/data/skillTree.ts`)

30-node passive skill tree (10 Analysis + 10 Trading + 10 Research) with modifier-based effects.

**Modifiers** (`getPassiveModifiers`):
- `operation: 'add'` with `CONFIDENCE_SCALE_MULTIPLIER (100)`: modifier 0.1 = +10 confidence points
- `operation: 'multiply'`: modifier 0.5 = 50% reduction (slippage, commission, delay)

**Integration**: `getPassiveModifiers(employee, effectType)` called in `analystLogic.ts` (signalAccuracy), `traderLogic.ts` (slippage, commission), `managerLogic.ts` (riskThreshold)

### Signal Generation Engine (`src/engines/signalGenerationEngine.ts`)

Badge-enhanced trade signal generation with noise filtering.

**`generateTradeSignals(employee, companies, marketEvents)`**: Produces `TradeSignal[]` with confidence and noise flag. Called by `analyzeStock()` to add badge bonus (max +20 confidence).

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
- Acquirer headcount increases by retained employees
- Player/AI portfolios: target shares → forced cash-out at deal price
- M&A news generated (`createMnaNews`)
- Market sentiment impact (`onMnaOccurred`): large layoffs increase fear

**IPO Scheduling** (`gameStore.scheduleIPO`):
- Delay: 180-360 ticks (6-12 months) after acquisition
- New company generation: 12 prefixes × 11 suffixes (e.g., "Neo Tech", "Quantum Industries")
- Sector preserved, random price/volatility/drift
- IPO executes when `currentTick >= spawnTick`, replaces slot

**Company Status**:
- `'active'`: Normal trading
- `'acquired'`: Delisted, trading halted, visible in UI as "인수됨" badge
- Worker filters: `companies.filter(c => c.status !== 'acquired')` for price updates

**Key Store Actions**: `executeAcquisition`, `scheduleIPO`, `processScheduledIPOs`, `applyAcquisitionExchange`

### Data Layer (`src/data/`)

- `companies.ts`: 20 companies across 5 sectors (Tech, Finance, Energy, Consumer, Healthcare)
- `events.ts`: 50+ market event templates with weighted spawn probabilities
- `difficulty.ts`: Easy/Normal/Hard configs
- `employees.ts`: Name pool + role-based skill generation
- `traits.ts`: 10 personality traits with rarity and effect definitions
- `furniture.ts`: 10 furniture types with buff effects and costs
- `chatter.ts`: Employee speech bubble templates, selection logic, and pipeline message templates (`getPipelineMessage`)
- `taunts.ts`: AI competitor trash-talk by situation (panic sell, rank change, overtake)
- `corporateSkills.ts`: 12 corporate skill definitions (3 tiers × 4 categories)
- `skillTree.ts`: 30-node RPG passive skill tree (Analysis/Trading/Research branches)
- `trainingEvents.ts`: Training checkpoint templates + duration/cost by tier
- `newsCards.ts`: 50+ monthly card templates (5 sectors, 4 rarities)
- `eventChains.ts`: 10+ multi-week event chain templates with branching
- `milestones.ts`: Achievement milestone definitions (financial/time/performance)
- `personalGoals.ts`: Employee personal goal templates by age/role
- `skillPaths.ts`: Trading/Analysis path branching definitions (Lv5/10/20/30)

### Systems Layer (`src/systems/`)

- `saveSystem.ts`: Dual-write (SQLite primary + IndexedDB fallback) save/load with auto-save
- `growthSystem.ts`: XP curves, title/badge mapping, skill unlocks
- `soundManager.ts`: Web Audio API 8-bit sound effects (oscillator-based, zero assets)
- `skillSystem.ts`: RPG skill tree operations (unlock, modifier calculation, migration, validation)
- `animationScheduler.ts`: Priority queue + RAF coordination for trade animations (60Hz budget)
- `featureFlags.ts`: Feature flag system for SQLite rollout and progressive feature enablement

### Window System

All windows use `WindowFrame` for consistent drag/resize/close behavior. `windowId` (unique per instance) vs `windowType` (e.g., 'trading', 'chart'). Window state managed in Zustand store. Multiple instances of same type supported.

**Window Types** (22 total): `portfolio`, `chart`, `trading`, `news`, `office`, `office_dot`, `office_history`, `employee_detail`, `ranking`, `settings`, `ending`, `institutional`, `proposals`, `acquisition`, `dashboard`, `achievement_log`, `monthly_cards`, `event_chain_tracker`, `skill_library`, `training_center`

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

1. **Tick timing**: Intervals are approximate; don't rely on exact timing
2. **Worker messages**: Prices update asynchronously; state changes are not immediate
3. **Portfolio recalculation**: Happens every price update — use `useMemo` in components
4. **Z-index**: Always use store's `nextZIndex` counter, never hardcode
5. **Save data migration**: When changing types, handle legacy format with nullish coalescing
6. **Employee cleanup**: When firing/resigning, must clean up: grid seat (`occupiedBy → null`), chatter cooldowns (`cleanupChatterCooldown`), monthly expenses
7. **HR cash safety**: HR automation spending uses `Math.max(0, cash - spent)` to prevent negative cash
8. **setTimeout in useEffect**: Track timeout IDs in a `useRef<Set>` and clear on unmount to prevent memory leaks
9. **Console tampering**: Production mode freezes `getState()` output to prevent cheating
10. **AI tick distribution**: Competitor trading is spread across ticks to avoid frame drops — don't process all AIs on same tick
11. **Trade pipeline cleanup**: When firing/resigning employees, orphaned PENDING/APPROVED proposals must be expired or reassigned
12. **Pipeline officeGrid guard**: All process*Tick actions must check `s.player.officeGrid` exists before calculating adjacency bonuses
13. **Corporate effects aggregation**: Call `aggregateCorporateEffects(corporateSkills)` before trade pipeline ticks — results are passed to analyst/manager/trader logic
14. **Training checkpoint resolution**: `resolveCheckpoint` must be called separately after `advanceTraining` detects a checkpoint — don't merge them
15. **Skill tree modifier scale**: RPG passive `add` modifiers use `CONFIDENCE_SCALE_MULTIPLIER (100)` — modifier 0.1 = +10 points, NOT +0.1
16. **teachablePassiveId guard**: `applyGraduation` checks `SKILL_TREE[passiveId]` exists before adding to `unlockedSkills` — undefined IDs are silently ignored
17. **Corporate effects caps**: `slippageReduction` capped at 0.8, `commissionDiscount` at 0.5, `signalAccuracyBonus` at 0.5 — exceeding caps is clipped in `aggregateCorporateEffects`
18. **Test process cleanup**: After running `vitest` or `playwright test`, always verify no orphan processes remain (`ps aux | grep vitest`). Long-running stress tests (e.g., `cashFlow5YearStress`) can timeout and leave zombie processes — kill them with `pkill -f vitest` before starting new test runs. Never run tests in background without a timeout limit.
19. **Hourly accumulator pattern**: `processHourly()` deducts cash each tick but does NOT call `recordCashFlow()` — accumulators (`hourlyAccumulators.salaryPaid/taxPaid`) track totals, and `processMonthly()` records single monthly entries then resets accumulators. This prevents cashFlowLog explosion (300 entries/month → 1 entry/month).
20. **Cooldown units**: `praiseCooldown` / `scoldCooldown` are in **days** (decremented in `advanceHour` on dayChanged), not months. Set to 30 for ~1 month cooldown.
21. **HR stress threshold**: HR automation triggers at `stress > 80` (daily check), not 60 (was monthly). Training runs every 30 days.

## Performance Considerations

- **Memoization**: Chart data and grid calculations are expensive; always `useMemo`
- **Selective re-renders**: Zustand selectors, not whole store subscriptions
- **Worker offloading**: GBM calculations stay in Web Worker
- **AI distribution**: `PERFORMANCE_CONFIG.TICK_DISTRIBUTION` spreads AI across 5 ticks
- **Price history cap**: Max 50 data points per company for technical indicators
- **Chatter cooldowns**: Per-employee minimum interval + per-template cooldown prevents spam

## Active Technologies
- TypeScript 5.9 (strict mode) + React 19, Zustand 5, Vite 7, TailwindCSS v4 (001-employee-trade-ai)
- **SQLite (sql.js-httpvfs)** - Primary storage system for save data with multi-slot support (001-system-level-up)
- Dexie (IndexedDB) - Legacy storage system, retained for migration and fallback (001-system-level-up)
- TypeScript 5.9 (strict mode enabled) + React 19, Zustand 5, Motion (animation), Chart.js, TailwindCSS v4, Vite 7 (001-system-level-up)
- **Phase 5: SQLite Migration Complete** - SQLite enabled by default with automatic migration prompt for existing users

## Recent Changes
- M&A System: Corporate mergers, acquisitions, IPOs with quarterly evaluation and forced portfolio exchanges
- **001-employee-trade-ai**: Two-layer skill system (Corporate Skills + RPG Skill Tree), Training System, Signal Generation Engine, enhanced trade pipeline with corporate effects integration
- **Phase 5 Complete: SQLite Default with Migration UI** - SQLite enabled by default, migration banner for IndexedDB users
- **001-system-level-up (in progress)**: Animation system, dashboard, monthly cards, employee bio, skill paths, event chains, economic pressure

## Storage System Migration Phases (001-system-level-up)

### Phase 5: Deprecation & Migration UI (Complete ✅)
- **Default Storage**: SQLite enabled by default (`sqlite_enabled: true` in `featureFlags.ts`)
- **Migration Banner**: Automatic prompt for IndexedDB users on app start (`App.tsx`)
  - Detects existing IndexedDB data via `hasSaveData()`
  - Checks if SQLite migration already completed via `saveSlotExists(db, 'autosave')`
  - Shows upgrade banner with "업그레이드" and "나중에" buttons
  - Dismissible via localStorage (`migration_dismissed`)
- **User Flow**:
  - New users → SQLite by default (no migration needed)
  - Existing users → Migration banner → One-click upgrade
  - Dismissed banner → Never shown again (user choice preserved)
- **Graceful Degradation**: IndexedDB code retained for fallback and migration
- **Feature Flag**: Manual toggle still available in Settings window for advanced users

### Phase 4: Settings UI (Complete ✅)
- SQLite toggle in Settings window for user control (`SettingsWindow.tsx`)
- Real-time backend detection (IndexedDB vs SQLite)
- Migration status indicator in UI ("✅ 완료" / "⏳ 대기 중")
- Auto-reload prompt when changing storage backend
- Developer tools for migration reset (dev mode only via `import.meta.env.DEV`)
- Retro Windows 95 themed UI components with consistent styling
- Feature flag integration (`getFeatureFlag`, `setFeatureFlag`)
- Migration status check via `getMigrationStatusPublic()`

## Phase 3: SQLite Loading + Migration (Complete ✅)
- SQLite read capability enabled via `sqlite_enabled` feature flag
- `loadGame()` tries SQLite first, falls back to IndexedDB on failure (graceful degradation)
- One-time migration: IndexedDB → SQLite on app start (`migration.ts`)
- Migration validation: critical fields (cash, assets, employee count, tick) checked after migration
- IndexedDB data preserved (never deleted) - remains backup until Phase 5
- Migration status tracked in localStorage to prevent duplicate runs
- Full Company objects migrated (not just truncated SaveData)
- `hasSQLiteSave()` helper for checking SQLite save existence

## Phase 2: Dual-Write Storage System (Complete ✅)
- IndexedDB + SQLite dual-write mode for save data (graceful degradation)
- Feature flag system (`featureFlags.ts`) for SQLite rollout control
- `saveSystem.ts` coordinates both storage backends with Promise.allSettled
- SQLite writes enabled when feature flag set
- Legacy IndexedDB implementation preserved in `saveSystemLegacy.ts`

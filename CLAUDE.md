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
npm run dev       # Start dev server with HMR
npm run build     # Type-check (tsc -b) + production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Code Style

- **Prettier**: No semicolons, single quotes, trailing commas, 100 char line width
- **File Naming**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)
- **Imports**: Group by external → internal → types, alphabetize within groups

## Architecture

### State Management (Zustand)

Single store at `src/stores/gameStore.ts` (~1500 LOC). All state mutations go through store actions.

**Core State Shape**:
- `time: GameTime` — Year/month/day/tick + speed/pause
- `player: PlayerState` — Cash, portfolio, employees[], officeGrid, officeLevel
- `companies: Company[]` — 20 stocks across 5 sectors with prices/drift/volatility
- `competitors: Competitor[]` — AI rivals with independent portfolios and trading styles
- `events: MarketEvent[]` — Active events modifying drift/volatility
- `windows: WindowState[]` — Open window positions/z-index
- `proposals: TradeProposal[]` — Trade AI pipeline proposals (PENDING→APPROVED→EXECUTED)
- `taunts: TauntMessage[]` — AI competitor chat feed

**Key Patterns**:
- Use selectors for performance: `useGameStore((s) => s.specificValue)`
- Never subscribe to the whole store
- Monthly processing (`processMonthly`) handles salaries, stamina drain, XP grants
- Employee tick processing (`processEmployeeTick`) runs every 10 ticks

### Game Engine Pipeline

The tick engine (`src/engines/tickEngine.ts`) runs at `BASE_TICK_MS (200ms) / speed`:

```
Each tick:
1. advanceTick() — time progression (3600 ticks = 1 day)
2. Web Worker — GBM price calculation for all 20 companies
3. updatePrices() — apply new prices to store
4. Event system — decay active events, spawn new ones
5. processEmployeeTick() (every 10 ticks) — stress/satisfaction/skills
6. Trade AI Pipeline:
   a. processAnalystTick() (tick%10===0) — scan sectors, generate proposals
   b. processManagerTick() (tick%5===2) — approve/reject proposals
   c. expireOldProposals() (tick%10===5) — clean stale proposals
   d. processTraderTick() (every tick) — execute approved proposals
7. processAITrading() — competitor engine trades
8. Auto-save (every 300 ticks)
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

### Systems Layer (`src/systems/`)

- `saveSystem.ts`: Dexie-based IndexedDB save/load with auto-save
- `growthSystem.ts`: XP curves, title/badge mapping, skill unlocks
- `soundManager.ts`: Web Audio API 8-bit sound effects (oscillator-based, zero assets)

### Window System

All windows use `WindowFrame` for consistent drag/resize/close behavior. `windowId` (unique per instance) vs `windowType` (e.g., 'trading', 'chart'). Window state managed in Zustand store. Multiple instances of same type supported.

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

## Performance Considerations

- **Memoization**: Chart data and grid calculations are expensive; always `useMemo`
- **Selective re-renders**: Zustand selectors, not whole store subscriptions
- **Worker offloading**: GBM calculations stay in Web Worker
- **AI distribution**: `PERFORMANCE_CONFIG.TICK_DISTRIBUTION` spreads AI across 5 ticks
- **Price history cap**: Max 50 data points per company for technical indicators
- **Chatter cooldowns**: Per-employee minimum interval + per-template cooldown prevents spam

## Active Technologies
- TypeScript 5.9 (strict mode) + React 19, Zustand 5, Vite 7, TailwindCSS v4 (001-employee-trade-ai)
- Dexie (IndexedDB) - 기존 세이브 시스템 확장 (001-employee-trade-ai)

## Recent Changes
- M&A System: Corporate mergers, acquisitions, IPOs with quarterly evaluation and forced portfolio exchanges
- 001-employee-trade-ai: Added TypeScript 5.9 (strict mode) + React 19, Zustand 5, Vite 7, TailwindCSS v4

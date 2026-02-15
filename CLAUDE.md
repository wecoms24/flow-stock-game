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
6. processAITrading() — competitor engine trades
7. Auto-save (every 300 ticks)
```

Worker initialization happens in `App.tsx` useEffect. Speed changes trigger interval recalculation.

### Engine Layer (`src/engines/`)

| Engine | Purpose | Call Frequency |
|--------|---------|----------------|
| `tickEngine.ts` | Game loop coordinator | Every tick (200ms/speed) |
| `competitorEngine.ts` | AI trading (4 strategies: Shark/Turtle/Surfer/Bear) | Every tick via tick distribution |
| `officeSystem.ts` | Employee buff calculation + stress/satisfaction/skill updates | Every 10 ticks |
| `hrAutomation.ts` | Auto stress care + quarterly training + weekly reports | Via processEmployeeTick |

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

### Data Layer (`src/data/`)

- `companies.ts`: 20 companies across 5 sectors (Tech, Finance, Energy, Consumer, Healthcare)
- `events.ts`: 50+ market event templates with weighted spawn probabilities
- `difficulty.ts`: Easy/Normal/Hard configs
- `employees.ts`: Name pool + role-based skill generation
- `traits.ts`: 10 personality traits with rarity and effect definitions
- `furniture.ts`: 10 furniture types with buff effects and costs
- `chatter.ts`: Employee speech bubble templates and selection logic
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

## Performance Considerations

- **Memoization**: Chart data and grid calculations are expensive; always `useMemo`
- **Selective re-renders**: Zustand selectors, not whole store subscriptions
- **Worker offloading**: GBM calculations stay in Web Worker
- **AI distribution**: `PERFORMANCE_CONFIG.TICK_DISTRIBUTION` spreads AI across 5 ticks
- **Price history cap**: Max 50 data points per company for technical indicators
- **Chatter cooldowns**: Per-employee minimum interval + per-template cooldown prevents spam

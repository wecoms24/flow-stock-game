# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retro Stock OS is a stock market trading game with a Windows 95-inspired UI, built as a single-page React application. The game simulates 30 years of stock trading (1995-2025) with real-time price movements, market events, employee management, and multiple ending scenarios.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: Zustand (single centralized store)
- **Styling**: TailwindCSS v4
- **Charts**: Chart.js + react-chartjs-2
- **Price Engine**: Web Worker with Geometric Brownian Motion (GBM) simulation
- **Build Tool**: Vite with ES module worker support

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Type-check and build for production
npm run build

# Lint TypeScript/React code
npm run lint

# Preview production build
npm run preview
```

## Code Style

- **Prettier**: No semicolons, single quotes, trailing commas, 100 char line width
- **File Naming**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)
- **Imports**: Group by external → internal → types, alphabetize within groups

## Architecture

### State Management (Zustand)

All application state lives in a single Zustand store at `src/stores/gameStore.ts`:

```typescript
// Store structure
interface GameStore {
  // Game lifecycle
  isGameStarted: boolean
  isGameOver: boolean
  endingResult: EndingScenario | null

  // Core game state
  time: GameTime              // Year/month/day/tick + speed/pause
  player: PlayerState         // Cash, portfolio, employees, office
  companies: Company[]        // Stock prices, drift, volatility
  events: MarketEvent[]       // Active market events affecting prices
  news: NewsItem[]            // News feed with breaking alerts

  // UI state
  windows: WindowState[]      // Open windows with positions/z-index
  nextZIndex: number
  windowIdCounter: number

  // Actions
  // ... (game actions, trading, hiring, time control)
}
```

**Key Patterns**:
- All state mutations go through store actions (never direct `setState`)
- Use selectors for performance: `useGameStore((s) => s.specificValue)`
- Store handles all business logic (trading validation, price updates, event generation)

**Player State**:
```typescript
interface PlayerState {
  cash: number
  totalAssetValue: number
  portfolio: Record<string, PortfolioPosition>
  monthlyExpenses: number
  employees: Employee[]
  officeLevel: number // 1-3, affects max employees and stamina recovery
}
```

**Key Actions**:
- `buyStock()`, `sellStock()`: Trading with validation
- `hireEmployee()`, `fireEmployee()`: Employee management
- `upgradeOffice()`: Office upgrade (levels 1-3, costs 10M/30M, resets stamina)
- `advanceTick()`: Time progression and monthly processing
- `checkEnding()`: Evaluate ending scenarios

### Game Engine (`src/engines/tickEngine.ts`)

The tick engine is the game's heartbeat, managing time progression and coordinating systems:

```typescript
// Tick loop runs at BASE_TICK_MS (200ms) / speed multiplier
// Each tick:
1. Advances game time (3600 ticks = 1 game day)
2. Sends company data to Web Worker for GBM price calculation
3. Receives new prices and updates store
4. Decays active market events
5. Randomly generates new events based on difficulty
6. Auto-saves every 300 ticks (~2.5 minutes)
```

**Important**:
- Worker initialization happens in `App.tsx` useEffect
- Speed changes trigger interval recalculation
- Cleanup on unmount prevents memory leaks

### Web Worker (`src/workers/priceEngine.worker.ts`)

Offloads CPU-intensive Geometric Brownian Motion (GBM) calculations:

```typescript
// GBM formula: dS = μS dt + σS dW
// μ (drift) = trend direction
// σ (volatility) = price variance
// dW = Wiener process (random walk)
```

Market events modify drift/volatility for affected companies/sectors. The worker processes all companies in parallel each tick.

### Component Architecture

```
src/components/
├── desktop/          # Desktop shell components
│   ├── StartScreen   # Initial game screen with difficulty selection
│   ├── StockTicker   # Scrolling ticker tape
│   └── Taskbar       # Bottom taskbar with time/controls
├── windows/          # Window system (11 different windows)
│   ├── WindowFrame   # Reusable window chrome with drag/resize
│   ├── WindowManager # Renders all open windows
│   ├── TradingWindow # Buy/sell stocks
│   ├── ChartWindow   # Price history charts
│   ├── PortfolioWindow
│   ├── OfficeWindow  # Employee & office management
│   ├── NewsWindow
│   ├── RankingWindow
│   ├── SettingsWindow
│   ├── EndingScreen  # Game over modal
│   └── IsometricOffice # 3D office visualization
├── effects/          # Visual effects
│   ├── CRTOverlay    # Retro CRT scanline effect
│   └── StockParticles # Floating price change particles
├── ui/               # Reusable UI primitives
│   ├── Button
│   ├── Panel
│   └── ProgressBar
└── ErrorBoundary.tsx # Error boundary for graceful error handling
```

**Window System Pattern**:
- All windows use `WindowFrame` for consistent drag/resize/close behavior
- `windowId` (unique per instance) vs `windowType` (e.g., 'trading', 'chart')
- Window state (position, size, z-index) managed in Zustand store
- Multiple instances of same window type are supported

### Data Layer (`src/data/`)

Static game configuration:

- `companies.ts`: 20 companies across 5 sectors (Tech, Finance, Energy, Consumer, Healthcare)
- `events.ts`: 50+ market event templates with weighted probabilities
- `difficulty.ts`: Easy/Normal/Hard configs (starting cash, volatility, event frequency)
- `employees.ts`: Employee name generation with role-based salaries

All data is strongly typed via `src/types/index.ts`.

### Save System (`src/systems/saveSystem.ts`)

```typescript
// IndexedDB-based save/load
saveGame(data: SaveData): Promise<void>
loadGame(): Promise<SaveData | null>
deleteSave(): Promise<void>
hasSaveData(): Promise<boolean>

// Auto-save every 300 ticks
// Manual save on game over
// Load available from start screen
```

## Key Workflows

### Adding a New Window Type

1. Create component in `src/components/windows/YourWindow.tsx`
2. Add window type to `WindowType` union in `src/types/index.ts`
3. Implement `WindowManager.tsx` rendering logic
4. Add open/close actions in `gameStore.ts`
5. Add trigger button in appropriate location (Taskbar, etc.)

### Adding a New Market Event

1. Add event template to `src/data/events.ts` in `EVENT_TEMPLATES` array
2. Define impact (drift/volatility modifiers, severity, duration)
3. Specify affected sectors or companies (optional)
4. Set spawn weight (higher = more common)

### Modifying Game Difficulty

1. Edit `DIFFICULTY_TABLE` in `src/data/difficulty.ts`
2. Adjust: starting cash, volatility multiplier, event chance, salary multiplier
3. Test game balance across 30-year simulation

### Adding New Ending Scenarios

1. Add scenario to `ENDING_SCENARIOS` array in `gameStore.ts`
2. Define condition function: `(player, time) => boolean`
3. Priority order matters (first match wins)
4. Common endings: billionaire, legend, retirement, survivor, bankrupt

## Testing Strategy

Currently no automated tests. When adding tests:

- **Unit tests**: Game logic in `gameStore` actions (trading, hiring, events)
- **Integration tests**: Tick engine + worker price calculations
- **Component tests**: Window interactions, button states
- **E2E tests**: Full game playthrough scenarios

## Performance Considerations

- **Memoization**: Chart data processing is expensive; memoize with `useMemo`
- **Selective re-renders**: Use Zustand selectors, not whole store subscriptions
- **Worker offloading**: Keep GBM calculations in Web Worker (60 price updates/tick)
- **Event pooling**: Limit active events (currently no cap - consider adding)
- **Window limits**: Consider max open windows to prevent UI clutter

## Common Gotchas

1. **Tick timing**: Don't assume tick intervals are exact; they're approximate
2. **Worker messages**: Prices update asynchronously; don't rely on immediate state changes
3. **Portfolio calculations**: Total asset value recalculates on every price update (performance sensitive)
4. **Z-index management**: Always use store's `nextZIndex` counter, never hardcode
5. **Save data migration**: When changing `SaveData` type, handle legacy save format (e.g., `officeLevel ?? 1`)
6. **Employee stamina**: Drains monthly; zero stamina blocks hiring until office upgrade
7. **Error handling**: App wrapped in ErrorBoundary for graceful error recovery
8. **Console tampering**: Production mode freezes state from `getState()` to prevent cheating

## Future Architecture Considerations

- **Multi-store pattern**: Consider splitting Zustand store if it exceeds 1000 LOC
- **State machines**: Game lifecycle (start → playing → paused → ended) could use XState
- **Lazy loading**: Code-split windows with React.lazy() for faster initial load
- **Service workers**: Add offline support and background auto-save
- **Audio system**: Background music + sound effects for events/trades

## Active Technologies
- TypeScript 5.x + React 19 + React 19, Zustand (state), TailwindCSS v4 (styling), Chart.js + react-chartjs-2 (charts), Vite (build) (001-retro-stock-sim)
- IndexedDB (browser local storage for game save data) (001-retro-stock-sim)

## Recent Changes
- 001-retro-stock-sim: Added TypeScript 5.x + React 19 + React 19, Zustand (state), TailwindCSS v4 (styling), Chart.js + react-chartjs-2 (charts), Vite (build)

# Quickstart Guide: Retro Stock Simulator Core Engine

**Feature**: 001-retro-stock-sim
**Date**: 2026-02-14
**Branch**: `001-retro-stock-sim`

## Prerequisites

Before starting development, ensure you have:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: v2.30.0 or higher
- **Code Editor**: VS Code recommended (with ESLint + Prettier extensions)
- **Browser**: Chrome 90+ or Firefox 88+ (for Web Worker and IndexedDB support)

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone repository (if not already done)
git clone <repository-url>
cd flow-stock-game

# Checkout feature branch
git checkout 001-retro-stock-sim

# Install dependencies
npm install

# Verify installation
npm run lint
npm run build
```

### 2. Start Development Server

```bash
# Start Vite dev server with HMR
npm run dev

# Server starts at http://localhost:5173
# Open browser and verify game loads
```

### 3. Verify Existing Structure

Check that these files exist (from CLAUDE.md):

```bash
src/
├── components/
│   ├── desktop/
│   ├── windows/
│   ├── effects/
│   └── ui/
├── data/
├── engines/
├── stores/
├── systems/
├── types/
└── workers/
```

## Development Workflow

### Phase 1: Implement Core Entities

**Duration**: ~4 hours

1. **Define Types** (`src/types/index.ts`)

   ```typescript
   // Add new types from data-model.md
   export interface Company {
     id: number;
     ticker: string;
     name: string;
     sector: Sector;
     price: number;
     basePrice: number;
     drift: number;
     volatility: number;
     priceHistory: Array<{ tick: number; price: number }>;
   }

   export interface Player {
     cash: number;
     portfolio: Record<string, number>;
     netWorth: number;
     employees: Employee[];
     officeLevel: number;
     employeeStamina: number;
   }

   export interface GameTime {
     year: number;
     quarter: number;
     day: number;
     tick: number;
     speed: number;
     isPaused: boolean;
   }

   export interface MarketEvent {
     id: number;
     type: EventType;
     severity: number;
     title: string;
     description: string;
     driftModifier: number;
     volatilityModifier: number;
     duration: number;
     ticksRemaining: number;
     affectedSectors: Sector[];
     affectedCompanies: string[];
   }

   export interface WindowState {
     id: number;
     type: WindowType;
     position: { x: number; y: number };
     size: { width: number; height: number };
     zIndex: number;
     isMinimized: boolean;
     data?: any;
   }
   ```

2. **Verify Compilation**

   ```bash
   npm run build
   # Should compile without errors
   ```

### Phase 2: Implement Web Worker (GBM Engine)

**Duration**: ~6 hours

1. **Create Worker File** (`src/workers/priceEngine.worker.ts`)

   ```typescript
   // Mulberry32 PRNG
   function mulberry32(seed: number) {
     return function () {
       let t = (seed += 0x6d2b79f5);
       t = Math.imul(t ^ (t >>> 15), t | 1);
       t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
       return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
     };
   }

   // GBM formula
   function calculateNextPrice(
     currentPrice: number,
     drift: number,
     volatility: number,
     dt: number,
     random: () => number,
   ): number {
     const z = boxMuller(random); // Normal distribution
     const exponent = (drift - (volatility * volatility) / 2) * dt + volatility * Math.sqrt(dt) * z;
     return currentPrice * Math.exp(exponent);
   }

   // Box-Muller transform for normal distribution
   function boxMuller(random: () => number): number {
     const u1 = random();
     const u2 = random();
     return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
   }

   // Message handler
   self.onmessage = (e) => {
     const { type, companies, dt, seed } = e.data;

     if (type === 'UPDATE_PRICES') {
       const rng = mulberry32(seed);
       const newPrices = companies.map((company) => ({
         ticker: company.ticker,
         price: calculateNextPrice(company.currentPrice, company.drift, company.volatility, dt, rng),
       }));

       self.postMessage({
         type: 'PRICES_UPDATED',
         prices: newPrices,
       });
     }
   };
   ```

2. **Test Worker Locally**

   ```bash
   # Create test file: src/workers/priceEngine.test.ts
   # Run: npm run test (once testing is set up)
   ```

### Phase 3: Extend Zustand Store

**Duration**: ~8 hours

1. **Update Store** (`src/stores/gameStore.ts`)

   ```typescript
   import { create } from 'zustand';
   import { immer } from 'zustand/middleware/immer';

   interface GameStore {
     // State
     isGameStarted: boolean;
     isGameOver: boolean;
     time: GameTime;
     player: Player;
     companies: Company[];
     events: MarketEvent[];
     windows: WindowState[];
     nextZIndex: number;
     windowIdCounter: number;

     // Actions (from contracts/store-actions.ts)
     startGame: (difficulty: string) => void;
     endGame: () => void;
     loadGame: () => Promise<boolean>;
     saveGame: () => Promise<void>;
     advanceTick: () => void;
     setSpeed: (speed: number) => void;
     pauseGame: (paused: boolean) => void;
     buyStock: (ticker: string, shares: number) => { success: boolean; error?: string };
     sellStock: (ticker: string, shares: number) => { success: boolean; error?: string };
     // ... (see contracts/store-actions.ts for full list)
   }

   export const useGameStore = create<GameStore>()(
     immer((set, get) => ({
       // Initial state
       isGameStarted: false,
       isGameOver: false,
       time: { year: 1995, quarter: 1, day: 0, tick: 0, speed: 1.0, isPaused: false },
       player: { cash: 100000, portfolio: {}, netWorth: 100000, employees: [], officeLevel: 0, employeeStamina: 100 },
       companies: [],
       events: [],
       windows: [],
       nextZIndex: 1,
       windowIdCounter: 1,

       // Actions
       startGame: (difficulty) => {
         set((state) => {
           // Reset state, load companies, etc.
         });
       },

       advanceTick: () => {
         const state = get();
         if (state.time.isPaused || state.isGameOver) return;

         set((draft) => {
           draft.time.tick += 1;
           // Handle day/quarter/year rollover
           // Send message to worker
           // Process events
         });
       },

       // ... implement all actions from contracts
     })),
   );
   ```

2. **Verify Store**

   ```bash
   # Check TypeScript compilation
   npm run build

   # Test in browser console
   # useGameStore.getState().startGame('Normal')
   ```

### Phase 4: Implement Tick Engine

**Duration**: ~4 hours

1. **Update Tick Engine** (`src/engines/tickEngine.ts`)

   ```typescript
   import { useGameStore } from '../stores/gameStore';

   const BASE_TICK_MS = 200;
   let intervalId: number | null = null;
   let worker: Worker | null = null;

   export function startTickEngine() {
     if (intervalId) return;

     // Initialize worker
     worker = new Worker(new URL('../workers/priceEngine.worker.ts', import.meta.url), {
       type: 'module',
     });

     // Handle worker messages
     worker.onmessage = (e) => {
       if (e.data.type === 'PRICES_UPDATED') {
         useGameStore.getState().updateStockPrices(e.data.prices);
       }
     };

     // Start tick loop
     const tick = () => {
       const state = useGameStore.getState();
       const tickMs = BASE_TICK_MS / state.time.speed;

       useGameStore.getState().advanceTick();

       intervalId = window.setTimeout(tick, tickMs);
     };

     tick();
   }

   export function stopTickEngine() {
     if (intervalId) {
       clearTimeout(intervalId);
       intervalId = null;
     }
     if (worker) {
       worker.terminate();
       worker = null;
     }
   }
   ```

2. **Integrate in App** (`src/App.tsx`)

   ```typescript
   useEffect(() => {
     if (isGameStarted) {
       startTickEngine();
     }
     return () => stopTickEngine();
   }, [isGameStarted]);
   ```

### Phase 5: Implement Window Manager

**Duration**: ~6 hours

1. **Create Window Manager** (`src/components/windows/WindowManager.tsx`)

   ```typescript
   import { useGameStore } from '../../stores/gameStore';
   import WindowFrame from './WindowFrame';

   export default function WindowManager() {
     const windows = useGameStore((s) => s.windows);

     return (
       <div className="window-manager">
         {windows.map((window) => (
           <WindowFrame key={window.id} window={window}>
             {renderWindowContent(window)}
           </WindowFrame>
         ))}
       </div>
     );
   }

   function renderWindowContent(window: WindowState) {
     switch (window.type) {
       case 'trading':
         return <TradingWindow windowId={window.id} />;
       case 'chart':
         return <ChartWindow windowId={window.id} data={window.data} />;
       // ... other window types
       default:
         return null;
     }
   }
   ```

2. **Create Window Frame** (`src/components/windows/WindowFrame.tsx`)

   ```typescript
   import { useCallback, useRef } from 'react';
   import { useGameStore } from '../../stores/gameStore';

   export default function WindowFrame({ window, children }) {
     const updatePosition = useGameStore((s) => s.updateWindowPosition);
     const closeWindow = useGameStore((s) => s.closeWindow);
     const focusWindow = useGameStore((s) => s.focusWindow);

     const rafId = useRef<number>();
     const dragStart = useRef<{ x: number; y: number }>();

     const handleMouseDown = (e: React.MouseEvent) => {
       dragStart.current = { x: e.clientX - window.position.x, y: e.clientY - window.position.y };
       focusWindow(window.id);

       const handleMouseMove = (e: MouseEvent) => {
         rafId.current = requestAnimationFrame(() => {
           updatePosition(window.id, {
             x: e.clientX - dragStart.current.x,
             y: e.clientY - dragStart.current.y,
           });
         });
       };

       const handleMouseUp = () => {
         cancelAnimationFrame(rafId.current);
         document.removeEventListener('mousemove', handleMouseMove);
         document.removeEventListener('mouseup', handleMouseUp);
       };

       document.addEventListener('mousemove', handleMouseMove);
       document.addEventListener('mouseup', handleMouseUp);
     };

     return (
       <div
         className="window"
         style={{
           position: 'absolute',
           left: window.position.x,
           top: window.position.y,
           zIndex: window.zIndex,
           display: window.isMinimized ? 'none' : 'block',
         }}
       >
         <div className="window-titlebar" onMouseDown={handleMouseDown}>
           <span>{window.type}</span>
           <button onClick={() => closeWindow(window.id)}>×</button>
         </div>
         <div className="window-content">{children}</div>
       </div>
     );
   }
   ```

### Phase 6: Add Retro Styling

**Duration**: ~3 hours

1. **Create Pixel CSS** (`src/styles/pixel.css`)

   ```css
   * {
     image-rendering: -moz-crisp-edges;
     image-rendering: -webkit-crisp-edges;
     image-rendering: pixelated;
     image-rendering: crisp-edges;
   }

   @font-face {
     font-family: 'PixelFont';
     src: url('/fonts/PressStart2P.woff2');
     font-display: block;
   }

   body {
     font-family: 'PixelFont', monospace;
     -webkit-font-smoothing: none;
     -moz-osx-font-smoothing: grayscale;
     font-smooth: never;
   }

   .pixel-border {
     border: 2px solid #000;
     box-shadow:
       inset -1px -1px #fff,
       inset 1px 1px #0a0a0a;
   }
   ```

2. **Import in Main**

   ```typescript
   // src/main.tsx
   import './styles/pixel.css';
   ```

### Phase 7: Implement IndexedDB Save System

**Duration**: ~4 hours

1. **Install Dexie**

   ```bash
   npm install dexie
   ```

2. **Create Save System** (`src/systems/saveSystem.ts`)

   ```typescript
   import Dexie, { Table } from 'dexie';

   interface SaveData {
     id?: number;
     timestamp: number;
     gameTime: GameTime;
     player: Player;
     companies: Company[];
     events: MarketEvent[];
     windows: WindowState[];
     version: string;
   }

   class GameDatabase extends Dexie {
     saves!: Table<SaveData, number>;

     constructor() {
       super('RetroStockOS');
       this.version(1).stores({
         saves: '++id, timestamp, gameTime',
       });
     }
   }

   const db = new GameDatabase();

   export async function saveGame(state: GameState): Promise<void> {
     const saveData: SaveData = {
       timestamp: Date.now(),
       gameTime: state.time,
       player: state.player,
       companies: state.companies,
       events: state.events,
       windows: state.windows,
       version: '1.0.0',
     };

     await db.saves.put(saveData);
   }

   export async function loadGame(): Promise<SaveData | null> {
     const saves = await db.saves.orderBy('timestamp').reverse().limit(1).toArray();
     return saves[0] || null;
   }
   ```

## Testing Checklist

### Manual Testing

- [ ] Start game with each difficulty (Easy, Normal, Hard)
- [ ] Verify 100 companies load with correct initial prices
- [ ] Advance time: check tick → day → quarter → year progression
- [ ] Buy/sell stocks: verify cash and portfolio updates
- [ ] Open/close/drag 5+ windows simultaneously
- [ ] Minimize/restore windows from taskbar
- [ ] Save game, refresh browser, load game (verify state restoration)
- [ ] Run 30-year simulation (1995→2025) without crashes
- [ ] Check 60 FPS performance (browser DevTools Performance tab)
- [ ] Test on FHD (1920×1080) and QHD (2560×1440) displays

### Automated Testing (Future)

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Performance Monitoring

### Browser DevTools

1. **Open DevTools** (F12)
2. **Performance Tab** → Record
3. **Run game for 60 seconds**
4. **Stop recording**
5. **Verify**:
   - FPS: ~60 (green line)
   - Worker messages: <1ms latency
   - No memory leaks (heap size stable)

### Key Metrics

- **Tick cycle**: <16ms (Worker calculation time)
- **Frame rate**: 60 FPS (during active gameplay)
- **Save operation**: <200ms
- **Load operation**: <1 second

## Troubleshooting

### Common Issues

**Issue**: Worker not loading
**Solution**: Check Vite config for worker support, ensure `type: 'module'`

**Issue**: Prices not updating
**Solution**: Verify worker message passing, check console for errors

**Issue**: Save/load fails
**Solution**: Check IndexedDB quota, clear browser data if corrupted

**Issue**: 30 FPS instead of 60 FPS
**Solution**: Profile with DevTools, check for expensive re-renders

**Issue**: Pixel fonts blurry
**Solution**: Verify font-smoothing CSS, check font file loaded

## Next Steps

After completing this feature:

1. **Run `/speckit.tasks`** to generate detailed task breakdown
2. **Implement tasks** in dependency order
3. **Test thoroughly** (manual + automated)
4. **Create PR** when all acceptance criteria met

## Resources

- **CLAUDE.md**: Full project architecture and patterns
- **specs/001-retro-stock-sim/spec.md**: Feature requirements
- **specs/001-retro-stock-sim/data-model.md**: Entity definitions
- **specs/001-retro-stock-sim/contracts/store-actions.ts**: Store API
- **specs/001-retro-stock-sim/research.md**: Technical decisions

## Support

- **Questions**: Check CLAUDE.md first
- **Bugs**: Create GitHub issue with reproduction steps
- **Performance**: Use browser DevTools Profiler

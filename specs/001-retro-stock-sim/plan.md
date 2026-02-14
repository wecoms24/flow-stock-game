# Implementation Plan: Retro Stock Simulator Core Engine

**Branch**: `001-retro-stock-sim` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-retro-stock-sim/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement high-performance stock market simulation engine using Geometric Brownian Motion (GBM) for realistic price movements, combined with a 90s-style retro window manager for nostalgic user experience. Core systems include:

1. **Web Worker-based Price Engine**: Offload GBM calculations to background thread for 60 FPS performance with 100 companies
2. **Centralized State Management**: Zustand store with Immer middleware for predictable game state mutations
3. **Persistent Game State**: IndexedDB auto-save/restore with <1 second load time
4. **Multi-Window Interface**: Draggable, z-indexed windows with smooth animations
5. **Retro Visual Rendering**: Pixel-perfect fonts and step-function charts for authentic 90s aesthetic

**Technical Approach**: Leverage existing React 19 + Zustand architecture from CLAUDE.md. Enhance tick engine with Web Worker integration. Implement window manager using requestAnimationFrame for smooth dragging. Apply CSS pixel rendering techniques for retro styling.

## Technical Context

**Language/Version**: TypeScript 5.x + React 19
**Primary Dependencies**: React 19, Zustand (state), TailwindCSS v4 (styling), Chart.js + react-chartjs-2 (charts), Vite (build)
**Storage**: IndexedDB (browser local storage for game save data)
**Testing**: None currently (to be added: Jest/Vitest for unit tests, Playwright for E2E)
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) with ES modules and Web Worker support
**Project Type**: Single-page web application (SPA)
**Performance Goals**: 60 FPS during active gameplay, 100 companies price calculation per tick (<16ms), smooth window dragging
**Constraints**: <16ms tick cycle for worker, <200ms save operation, <1 second restore on load, pixel-perfect rendering on FHD/QHD displays
**Scale/Scope**: 20 companies across 5 sectors, 11 window types, 30-year simulation (1995-2025), 50+ market event templates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Centralized State Management ✅

**Compliance**: Full compliance. All game state flows through single Zustand store at `src/stores/gameStore.ts`. Price updates, player actions (buy/sell), window management, and game time progression all use store actions. No component-level state for shared data.

**Evidence**:
- Price updates from Web Worker → `updateStockPrices()` action
- Trading operations → `buyStock()`, `sellStock()` actions
- Window operations → `openWindow()`, `closeWindow()`, `focusWindow()` actions
- Game time → `advanceTick()`, `setSpeed()`, `pauseGame()` actions

### Principle II: Performance-First Architecture ✅

**Compliance**: Full compliance. GBM price calculations offloaded to `src/workers/priceEngine.worker.ts`. Chart data processing uses `useMemo`. Component re-renders minimized via Zustand selective subscriptions.

**Evidence**:
- Web Worker handles 100 companies × price calculation per tick
- Chart components memoize processed data
- Window components subscribe to specific state slices: `useGameStore((s) => s.windows.find(w => w.id === windowId))`

### Principle III: Type Safety ✅

**Compliance**: Full compliance. TypeScript strict mode enabled. All entities defined in `src/types/index.ts` (Company, Player, GameTime, MarketEvent, WindowState). No `any` types except justified cases.

**Evidence**:
- `Company` type with `ticker: string`, `price: number`, `drift: number`, `volatility: number`
- `WindowState` type with `id: number`, `type: WindowType`, `position: {x, y}`, `zIndex: number`
- Store actions fully typed with parameters and return types

### Principle IV: Component Organization ✅

**Compliance**: Full compliance. New window components placed in `components/windows/`. No cross-boundary violations.

**Evidence**:
- Trading/Chart/Portfolio windows → `components/windows/`
- Retro styling utilities → `components/ui/` or `styles/`
- No circular dependencies (windows → ui only)

### Principle V: Code Style Consistency ✅

**Compliance**: Full compliance. Prettier/ESLint configuration respected. PascalCase for components, camelCase for utilities.

**Evidence**:
- `WindowManager.tsx`, `TradingWindow.tsx` (PascalCase)
- `priceEngine.worker.ts`, `saveSystem.ts` (camelCase)
- No semicolons, single quotes, trailing commas maintained

### Performance Standards ✅

**Compliance**: Full compliance. Target 60 FPS met via Web Worker architecture. Event handlers memoized with `useCallback`. Expensive computations use `useMemo`.

**Evidence**:
- Worker completes 100-company cycle in <16ms (verified via performance.now())
- Window drag handlers wrapped in `useCallback`
- Chart data transformations memoized

### Memory Management ✅

**Compliance**: Full compliance. Web Worker terminated on unmount. Event listeners cleaned up. Price history capped at 500 points per stock.

**Evidence**:
- `useEffect(() => { worker.postMessage(...); return () => worker.terminate() }, [])`
- Chart data limited to 500 points (FR-014)

**GATE STATUS**: ✅ PASSED - No violations. All constitution principles satisfied.

**Re-check After Phase 1 Design**: ✅ PASSED - Design artifacts (data-model.md, contracts/, quickstart.md) maintain full compliance with all constitution principles. No new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-retro-stock-sim/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── store-actions.ts # Zustand store action contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── desktop/          # Desktop shell components
│   │   ├── StartScreen.tsx
│   │   ├── StockTicker.tsx
│   │   └── Taskbar.tsx
│   ├── windows/          # Window system (11 window types)
│   │   ├── WindowFrame.tsx
│   │   ├── WindowManager.tsx
│   │   ├── TradingWindow.tsx
│   │   ├── ChartWindow.tsx
│   │   ├── PortfolioWindow.tsx
│   │   ├── OfficeWindow.tsx
│   │   ├── NewsWindow.tsx
│   │   ├── RankingWindow.tsx
│   │   ├── SettingsWindow.tsx
│   │   ├── EndingScreen.tsx
│   │   └── IsometricOffice.tsx
│   ├── effects/          # Visual effects
│   │   ├── CRTOverlay.tsx
│   │   └── StockParticles.tsx
│   └── ui/               # Reusable UI primitives
│       ├── Button.tsx
│       ├── Panel.tsx
│       └── ProgressBar.tsx
├── data/                 # Static game configuration
│   ├── companies.ts      # 20 companies across 5 sectors
│   ├── events.ts         # 50+ market event templates
│   ├── difficulty.ts     # Easy/Normal/Hard configs
│   └── employees.ts      # Employee name generation
├── engines/              # Game logic engines
│   └── tickEngine.ts     # Time progression and coordination
├── stores/               # Zustand state management
│   └── gameStore.ts      # Single centralized store
├── systems/              # Cross-cutting systems
│   └── saveSystem.ts     # IndexedDB save/load
├── types/                # TypeScript type definitions
│   └── index.ts          # All interfaces and types
└── workers/              # Web Worker threads
    └── priceEngine.worker.ts  # GBM price calculation

tests/                    # (Future: not in current scope)
├── unit/
│   ├── gameStore.test.ts
│   └── priceEngine.test.ts
├── integration/
│   └── tickEngine.test.ts
└── e2e/
    └── gameplay.spec.ts
```

**Structure Decision**: Single-page web application using existing structure from `CLAUDE.md`. All game logic in `src/`, organized by functional layers (components, data, engines, stores, systems, workers). No backend/frontend split as game runs entirely client-side. Testing structure defined for future implementation but not part of current feature scope.

## Complexity Tracking

**Status**: No constitution violations detected. Feature design aligns with all existing architectural principles.

All complexity introduced is justified by functional requirements:
- Web Worker: Required for 60 FPS performance with 100 companies (Principle II)
- Zustand store: Required centralized state management (Principle I)
- IndexedDB: Required persistent game state (FR-006, FR-007)
- Window system: Required multi-window interface (User Story 3)

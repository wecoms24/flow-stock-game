---
description: "Task list for Retro Stock Simulator Core Engine implementation"
---

# Tasks: Retro Stock Simulator Core Engine

**Input**: Design documents from `/specs/001-retro-stock-sim/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/store-actions.ts

**Tests**: Tests are NOT included in this implementation as they were not explicitly requested in the specification. Tasks focus on core functionality delivery.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a single-page web application with structure at repository root:
- Source code: `src/`
- No separate test directory (tests future work)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify existing project structure matches plan.md specifications (src/components, src/data, src/engines, src/stores, src/systems, src/types, src/workers)
- [X] T002 [P] Install missing dependencies if any (Dexie.js for IndexedDB)
- [X] T003 [P] Verify Vite configuration supports Web Worker ES modules (vite.config.ts)
- [X] T004 [P] Verify TypeScript strict mode enabled in tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Define all TypeScript interfaces in src/types/index.ts (Company, Player, GameTime, MarketEvent, WindowState, Sector enum, WindowType enum, EventType enum, PricePoint, Employee, Difficulty, SaveData)
- [X] T006 [P] Create base Zustand store structure in src/stores/gameStore.ts with initial state and empty action placeholders (isGameStarted, isGameOver, time, player, companies, events, windows, nextZIndex, windowIdCounter)
- [X] T007 [P] Load static game data in src/data/companies.ts (verify 20 companies across 5 sectors exist)
- [X] T008 [P] Load static game data in src/data/difficulty.ts (verify Easy/Normal/Hard configs exist)
- [X] T009 [P] Verify event templates in src/data/events.ts (50+ market event templates)
- [X] T010 Create base tick engine structure in src/engines/tickEngine.ts (startTickEngine, stopTickEngine, BASE_TICK_MS constant)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Real-Time Stock Price Simulation (Priority: P1) 🎯 MVP

**Goal**: Implement GBM-based stock price engine that updates 100 companies at 60 FPS without UI lag

**Independent Test**: Start game, observe 100 companies' prices updating smoothly at 60 FPS for 60+ seconds, verify deterministic replay with same seed, confirm prices follow realistic patterns

### Implementation for User Story 1

- [X] T011 [P] [US1] Implement Mulberry32 PRNG in src/workers/priceEngine.worker.ts (seeded random number generator function)
- [X] T012 [P] [US1] Implement Box-Muller transform in src/workers/priceEngine.worker.ts (normal distribution from uniform random)
- [X] T013 [US1] Implement GBM formula in src/workers/priceEngine.worker.ts (calculateNextPrice function using drift, volatility, dt, and normal random)
- [X] T014 [US1] Create Web Worker message handler in src/workers/priceEngine.worker.ts (handle UPDATE_PRICES message, batch process 100 companies, post PRICES_UPDATED response)
- [X] T015 [US1] Implement startGame action in src/stores/gameStore.ts (reset state, load companies from data/companies.ts, initialize player with difficulty settings, set game time to 1995 Q1, initialize worker with seed)
- [X] T016 [US1] Implement advanceTick action in src/stores/gameStore.ts (increment tick counter, handle day/quarter/year rollover, send price update to worker, process market events decay, check game end condition)
- [X] T017 [US1] Implement updateStockPrices action in src/stores/gameStore.ts (receive worker message, update company.price, append to priceHistory with 500-point limit, recalculate player net worth)
- [X] T018 [US1] Implement setSpeed action in src/stores/gameStore.ts (validate 0.5-5.0 range, update time.speed)
- [X] T019 [US1] Implement pauseGame action in src/stores/gameStore.ts (toggle time.isPaused flag)
- [X] T020 [US1] Integrate tick engine with worker in src/engines/tickEngine.ts (initialize worker on start, setup message handler for PRICES_UPDATED, calculate tick interval based on speed, cleanup on stop)
- [X] T021 [US1] Implement buyStock action in src/stores/gameStore.ts (validate ticker exists, validate sufficient cash, deduct cash, add to portfolio, recalculate net worth, return success/error)
- [X] T022 [US1] Implement sellStock action in src/stores/gameStore.ts (validate ticker exists, validate sufficient shares, add cash, remove from portfolio, recalculate net worth, return success/error)
- [X] T023 [US1] Connect tick engine to App lifecycle in src/App.tsx (useEffect to start/stop engine based on isGameStarted)

**Checkpoint**: At this point, stock prices should update in real-time with GBM simulation, player can buy/sell stocks, game time progresses correctly

---

## Phase 4: User Story 2 - Persistent Game State (Priority: P2)

**Goal**: Implement IndexedDB save/load system with <1 second restore time and automatic quarterly saves

**Independent Test**: Play for several game years, close browser, reopen, verify all state (cash, portfolio, prices, time) restored within 1 second

### Implementation for User Story 2

- [X] T024 [P] [US2] Install Dexie.js dependency (npm install dexie)
- [X] T025 [P] [US2] Create Dexie database schema in src/systems/saveSystem.ts (GameDatabase class with saves table, SaveData interface)
- [X] T026 [US2] Implement saveGame function in src/systems/saveSystem.ts (serialize game state, write to IndexedDB, handle quota errors)
- [X] T027 [US2] Implement loadGame function in src/systems/saveSystem.ts (read latest save from IndexedDB, deserialize, return SaveData or null)
- [X] T028 [US2] Implement hasSaveData function in src/systems/saveSystem.ts (check if save exists)
- [X] T029 [US2] Implement deleteSave function in src/systems/saveSystem.ts (clear save data)
- [X] T030 [US2] Implement saveGame action in src/stores/gameStore.ts (call saveSystem.saveGame with current state)
- [X] T031 [US2] Implement loadGame action in src/stores/gameStore.ts (call saveSystem.loadGame, restore state, reinitialize worker with saved seed, reopen windows)
- [X] T032 [US2] Add auto-save trigger in advanceTick action in src/stores/gameStore.ts (save on quarter boundary)
- [X] T033 [US2] Add auto-save trigger in endGame action in src/stores/gameStore.ts (final save on game over)
- [X] T034 [US2] Integrate load functionality in StartScreen component in src/components/desktop/StartScreen.tsx (add "Continue" button if hasSaveData)

**Checkpoint**: Game state persists across browser sessions, auto-saves every quarter, loads within 1 second

---

## Phase 5: User Story 3 - Multi-Window Interface (Priority: P3)

**Goal**: Implement draggable, z-indexed window system with smooth animations and proper focus management

**Independent Test**: Open 5+ windows, drag to different positions, minimize/restore, verify focus changes, confirm smooth dragging with no lag

### Implementation for User Story 3

- [X] T035 [P] [US3] Implement openWindow action in src/stores/gameStore.ts (create WindowState, assign unique ID, set z-index to nextZIndex++, cascade position, add to windows array, return window ID)
- [X] T036 [P] [US3] Implement closeWindow action in src/stores/gameStore.ts (remove window from array by ID)
- [X] T037 [P] [US3] Implement focusWindow action in src/stores/gameStore.ts (update window z-index to nextZIndex++)
- [X] T038 [P] [US3] Implement minimizeWindow action in src/stores/gameStore.ts (set window.isMinimized = true)
- [X] T039 [P] [US3] Implement restoreWindow action in src/stores/gameStore.ts (set window.isMinimized = false, bring to foreground)
- [X] T040 [P] [US3] Implement updateWindowPosition action in src/stores/gameStore.ts (update window.position with bounds checking)
- [X] T041 [US3] Create WindowFrame component in src/components/windows/WindowFrame.tsx (render window chrome, title bar, close button, minimize button, handle drag with requestAnimationFrame, handle focus on click)
- [X] T042 [US3] Create WindowManager component in src/components/windows/WindowManager.tsx (render all windows from store, map window types to components, handle z-index ordering)
- [X] T043 [US3] Update Taskbar component in src/components/desktop/Taskbar.tsx (show minimized windows, handle restore on click)
- [X] T044 [US3] Integrate WindowManager in App component in src/App.tsx (render WindowManager in desktop layout)

**Checkpoint**: Windows can be opened, closed, dragged, minimized, restored, and properly focused with smooth animations

---

## Phase 6: User Story 4 - Retro Visual Style (Priority: P4)

**Goal**: Apply 90s pixel art aesthetic with crisp fonts and step-function charts on FHD/QHD displays

**Independent Test**: View game on FHD and QHD displays, verify pixel fonts are crisp without blur, charts use step-function rendering, all UI maintains pixel-perfect clarity

### Implementation for User Story 4

- [X] T045 [P] [US4] Create pixel rendering CSS in src/styles/pixel.css (image-rendering: pixelated, font-smoothing disabled, integer positioning utilities)
- [X] T046 [P] [US4] Import pixel font (Press Start 2P or VT323) in src/styles/pixel.css (@font-face declaration)
- [X] T047 [P] [US4] Apply global pixel styles in src/styles/pixel.css (body font-family, all elements image-rendering)
- [X] T048 [P] [US4] Create pixel border utilities in src/styles/pixel.css (.pixel-border class with inset shadows for 90s look)
- [X] T049 [US4] Configure Chart.js for pixel rendering in src/components/windows/ChartWindow.tsx (stepped: true, borderWidth: 1, pointRadius: 0, animation: false, parsing: false)
- [X] T050 [US4] Implement chart data memoization in src/components/windows/ChartWindow.tsx (useMemo to process priceHistory, limit to 500 points)
- [X] T051 [US4] Apply pixel styling to all window components in src/components/windows/ (add pixel-border classes, ensure integer positioning)
- [X] T052 [US4] Apply pixel styling to desktop components in src/components/desktop/ (StartScreen, StockTicker, Taskbar)
- [X] T053 [US4] Import pixel.css in src/main.tsx (global stylesheet import)

**Checkpoint**: Game has authentic 90s pixel art aesthetic with crisp rendering on all display resolutions

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final polish

- [X] T054 [P] Implement hireEmployee action in src/stores/gameStore.ts (validate cash, capacity, stamina, add employee, deduct cash)
- [X] T055 [P] Implement fireEmployee action in src/stores/gameStore.ts (remove employee by ID)
- [X] T056 [P] Implement upgradeOffice action in src/stores/gameStore.ts (validate level <3, deduct cash, increment level, reset stamina)
- [X] T057 [P] Implement endGame action in src/stores/gameStore.ts (pause game, evaluate ending scenario, open ending screen, trigger save)
- [X] T058 [P] Add market event generation in advanceTick action in src/stores/gameStore.ts (random event spawn based on difficulty, apply drift/volatility modifiers)
- [X] T059 [P] Implement all window type components in src/components/windows/ (TradingWindow, ChartWindow, PortfolioWindow, OfficeWindow, NewsWindow, RankingWindow, SettingsWindow, EndingScreen)
- [X] T060 Add error boundary in src/App.tsx (catch and display errors gracefully)
- [X] T061 [P] Add console state manipulation detection in src/stores/gameStore.ts (Object.freeze on state, log tampering attempts)
- [ ] T062 [P] Optimize component re-renders with React.memo and useCallback in src/components/ (identify expensive components with DevTools Profiler)
- [ ] T063 Run full game simulation test (1995→2025, 30 years) and verify no crashes or memory leaks
- [ ] T064 Performance audit with Chrome DevTools (verify 60 FPS, <16ms tick cycle, <1s load time)
- [ ] T065 Visual QA on FHD and QHD displays (verify pixel font clarity, chart rendering)
- [X] T066 [P] Update CLAUDE.md documentation with new architecture details (Web Worker integration, window system patterns, save system usage)
- [X] T067 Code cleanup and formatting (run ESLint, Prettier on all modified files)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1) can start immediately after Foundational
  - US2 (P2) can start after Foundational (independent of US1, but integrates save functionality)
  - US3 (P3) can start after Foundational (independent, but used to display US1/US2 features)
  - US4 (P4) can start after Foundational (visual polish, can be applied anytime)
- **Polish (Phase 7)**: Depends on all user stories (US1-US4) being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories ✅ MVP
- **User Story 2 (P2)**: Can start after Foundational - Integrates with US1 but independently testable (save any game state)
- **User Story 3 (P3)**: Can start after Foundational - Provides UI for US1/US2 but independently testable (window management works without content)
- **User Story 4 (P4)**: Can start after Foundational - Visual polish for all stories, independently testable (styling doesn't break functionality)

### Within Each User Story

**User Story 1**:
- T011, T012 parallel → T013 (needs PRNG and Box-Muller) → T014 (worker message handler)
- T015-T019, T021-T022 parallel (store actions) → T020 (engine integration) → T023 (App integration)

**User Story 2**:
- T024, T025, T026-T029 parallel (save system) → T030-T031 (store actions) → T032-T033 (integration) → T034 (UI)

**User Story 3**:
- T035-T040 parallel (store actions) → T041 (WindowFrame) → T042 (WindowManager) → T043 (Taskbar) → T044 (App integration)

**User Story 4**:
- T045-T048 parallel (CSS setup) → T049-T050 (Chart config) → T051-T052 (apply styling) → T053 (import)

### Parallel Opportunities

- **Setup (Phase 1)**: T002, T003, T004 can run in parallel
- **Foundational (Phase 2)**: T005, T006, T007, T008, T009 can run in parallel, then T010
- **US1**: T011-T012 parallel, T015-T019 + T021-T022 parallel
- **US2**: T024-T029 parallel, T030-T031 parallel, T032-T033 parallel
- **US3**: T035-T040 parallel
- **US4**: T045-T048 parallel, T051-T052 parallel
- **Polish**: T054-T059, T061-T062, T066-T067 can run in parallel

---

## Parallel Example: User Story 1

```bash
# First batch - Worker GBM components (parallel):
Task T011: "Implement Mulberry32 PRNG in src/workers/priceEngine.worker.ts"
Task T012: "Implement Box-Muller transform in src/workers/priceEngine.worker.ts"

# Second batch - Store actions (parallel):
Task T015: "Implement startGame action in src/stores/gameStore.ts"
Task T016: "Implement advanceTick action in src/stores/gameStore.ts"
Task T017: "Implement updateStockPrices action in src/stores/gameStore.ts"
Task T018: "Implement setSpeed action in src/stores/gameStore.ts"
Task T019: "Implement pauseGame action in src/stores/gameStore.ts"
Task T021: "Implement buyStock action in src/stores/gameStore.ts"
Task T022: "Implement sellStock action in src/stores/gameStore.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010) - CRITICAL
3. Complete Phase 3: User Story 1 (T011-T023)
4. **STOP and VALIDATE**:
   - Start game
   - Observe prices updating at 60 FPS
   - Buy/sell stocks
   - Verify game time progression
   - Test deterministic replay with same seed
5. Deploy/demo if ready ✅ **This is your MVP!**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (T011-T023) → Test independently → **Deploy/Demo (MVP!)**
3. Add User Story 2 (T024-T034) → Test independently → **Deploy/Demo (saves work!)**
4. Add User Story 3 (T035-T044) → Test independently → **Deploy/Demo (windows work!)**
5. Add User Story 4 (T045-T053) → Test independently → **Deploy/Demo (retro styled!)**
6. Add Polish (T054-T067) → Full feature complete

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T010)
2. **Once Foundational is done, split work**:
   - Developer A: User Story 1 (T011-T023) - Core simulation engine
   - Developer B: User Story 2 (T024-T034) - Save/load system
   - Developer C: User Story 3 (T035-T044) - Window manager
   - Developer D: User Story 4 (T045-T053) - Visual styling
3. **Stories complete and merge independently**
4. **Polish phase together** (T054-T067)

---

## Task Summary

**Total Tasks**: 67
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 6 tasks
- Phase 3 (US1 - Real-Time Simulation): 13 tasks ✅ MVP
- Phase 4 (US2 - Persistence): 11 tasks
- Phase 5 (US3 - Windows): 10 tasks
- Phase 6 (US4 - Retro Style): 9 tasks
- Phase 7 (Polish): 14 tasks

**Parallelizable Tasks**: 38 tasks marked with [P]
**User Story Breakdown**:
- US1: 13 tasks (19% of total)
- US2: 11 tasks (16% of total)
- US3: 10 tasks (15% of total)
- US4: 9 tasks (13% of total)
- Infrastructure + Polish: 24 tasks (36% of total)

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 23 tasks (34% of total)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **All tasks follow strict checklist format**: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- Tests were not included as they were not explicitly requested in the feature specification
- Focus on delivering working functionality that can be manually tested per acceptance scenarios in spec.md

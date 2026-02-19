<!--
Sync Impact Report:
- Version Change: 1.0.0 → 2.0.0 (Major: principles redefined, sections restructured)
- Modified Principles:
  - I. Centralized State Management → I. Centralized State Management (updated: engine delegation pattern)
  - II. Performance-First Architecture → II. Performance-First Architecture (rewritten: hour-based timing, market systems)
  - III. Type Safety → III. Type Safety (updated: expanded type file locations)
  - IV. Component Organization → IV. Component Organization (updated: added office/, tutorial/ directories)
  - V. Code Style Consistency → V. Code Style Consistency (minor: added tabWidth)
- Added Principles:
  - VI. Engine-Store Separation (NEW: formalizes existing pure-function engine pattern)
  - VII. Market Simulation Fidelity (NEW: KRX rules, regime detection, circuit breakers)
  - VIII. Hour-Based Time System (NEW: formalizes BASE_HOUR_MS paradigm, replaces tick terminology)
- Added Sections: None (section structure preserved)
- Removed Sections: None
- Major Content Changes:
  - Testing Requirements: Removed "no automated tests" claim; documented existing test suite
  - Performance Standards: Updated price history cap (1000 → 50), added institutional sector rotation
  - Development Workflow: Added test commands and coverage thresholds
- Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section generic, compatible
  ✅ spec-template.md - User story structure generic, compatible
  ✅ tasks-template.md - Task categorization generic, compatible
- Follow-up TODOs: None
-->

# Retro Stock OS Constitution

## Core Principles

### I. Centralized State Management (NON-NEGOTIABLE)

All application state MUST flow through the single Zustand store (`src/stores/gameStore.ts`). Direct
component state is prohibited for shared data. State mutations MUST occur only through store actions.
Store actions MUST be thin wrappers (5-20 LOC) that delegate business logic to pure functions in
`src/engines/`. Component subscriptions MUST use selectors for performance
(`useGameStore((s) => s.specificValue)`) — subscribing to the entire store is prohibited.

**Rationale**: Prevents state synchronization bugs across 20+ window types and multiple concurrent
game systems (trade pipeline, competitor AI, institutional investors, market regime). Single source
of truth enables predictable data flow and simplified debugging.

### II. Performance-First Architecture

CPU-intensive calculations MUST be offloaded to Web Workers. GBM price simulation runs in
`priceEngine.worker.ts` with sentiment, order flow, market impact, and price limit data — never on
the main thread. Chart data and office grid calculations MUST use `useMemo`. Component re-renders
MUST be minimized through Zustand selective subscriptions.

Processing-heavy systems MUST distribute work across hours:
- Institutional investor sector rotation: 1 sector per hour (hour % 10)
- Competitor AI trading: every 5 hours
- Employee processing: interval scales with employee count (10/20/30 hours)

**Rationale**: Game runs at `BASE_HOUR_MS (1000ms) / speed` with 20+ companies, 100 institutional
investors, 4 AI competitors, and employee systems all active simultaneously. Main thread blocking
causes UI stuttering. Distributed processing ensures smooth gameplay at all speed settings.

### III. Type Safety

TypeScript strict mode MUST be enabled. The `any` type is prohibited unless explicitly justified with
inline comment. All data structures MUST have interfaces defined in `src/types/` (organized by domain:
`index.ts`, `trade.ts`, `office.ts`, `cashFlow.ts`, `skills.ts`, `training.ts`, `corporateSkill.ts`,
`animation.ts`, `eventChain.ts`, `newsCard.ts`, `economicPressure.ts`, `employeeBio.ts`,
`skillPath.ts`, `personalization.ts`, `finance.ts`, `tutorial.ts`). Component props, store state,
and function signatures MUST be fully typed.

**Rationale**: Game state complexity (portfolio, 10 sectors, employee RPG, trade pipeline, market
regime, institutional investors, event chains) requires compiler-enforced correctness.

### IV. Component Organization

Components MUST be organized by functional purpose:
- `components/desktop/` — Desktop shell (StartScreen, StockTicker, Taskbar, MainDashboard)
- `components/windows/` — Window system (Trading, Chart, Portfolio, Office, etc.)
- `components/effects/` — Visual effects (CRTOverlay, StockParticles, TradeAnimationSequence)
- `components/ui/` — Reusable primitives (RetroButton, RetroPanel, ProgressGauge, BadgeIcon)
- `components/office/` — Office rendering (OfficeCanvas, SpeechBubble, BlueprintOverlay)
- `components/tutorial/` — Tutorial system (OfficeTutorial)

Cross-boundary dependencies are permitted only downward (windows → ui, desktop → ui). Circular
dependencies are prohibited.

**Rationale**: Clear organization enables rapid feature location across 20+ window types and
prevents architectural drift. Enforces separation between game shell, windows, and visual polish.

### V. Code Style Consistency

Prettier configuration MUST be respected:
- No semicolons
- Single quotes
- Trailing commas
- 100 character line width
- Tab width: 2 spaces

ESLint MUST pass without warnings. File naming: PascalCase for components (`.tsx`), camelCase for
utilities (`.ts`). Imports MUST be grouped: external → internal → types, alphabetized within groups.

**Rationale**: Consistent style reduces cognitive load during code review and eliminates bikeshedding.
Automated enforcement via Prettier/ESLint ensures compliance without manual effort.

### VI. Engine-Store Separation (NON-NEGOTIABLE)

All business logic MUST reside in pure functions within `src/engines/`. Store actions MUST NOT
contain business logic beyond dispatching to engine functions and updating state with results.
Engine functions MUST be stateless and side-effect free — they receive state as parameters and
return computed results. The only exception is `tickEngine.ts`, which orchestrates the game loop
and coordinates calls between store and engines.

Engine functions MUST be independently testable without store instantiation.

**Rationale**: The game has 20+ engines covering trading, market simulation, employees, and events.
Pure function engines enable unit testing without UI or store setup, prevent hidden state mutations,
and allow safe parallel development across engine domains.

### VII. Market Simulation Fidelity

Market simulation MUST follow KRX (Korean Exchange) conventions:
- Daily price limits: ±30% from session open price (`src/config/priceLimit.ts`)
- Volatility Interruption: ±3% in 3 hours triggers 6-hour halt per company (`viEngine.ts`)
- Circuit breaker: KOSPI index drops of -8% (L1), -15% (L2), -20% (L3) halt all trading
  (`circuitBreakerEngine.ts`)
- Market regime: HMM-based CALM/VOLATILE/CRISIS detection (`regimeEngine.ts`)
- Companies MUST define `regimeVolatilities` for behavior under each regime

Sector correlation MUST be maintained via the 10x10 matrix in `sectorCorrelation.ts`.
Event propagation MUST use `SPILLOVER_FACTOR` for cross-sector impact.

**Rationale**: Simulation credibility requires consistent rule enforcement. KRX rules prevent
unrealistic price swings and create emergent market dynamics (halts, regime shifts) that drive
gameplay depth.

### VIII. Hour-Based Time System

The game MUST use hour-based time units throughout. The term "tick" in legacy contexts refers to
one game hour. Time constants:
- `BASE_HOUR_MS = 1000` — 1 real second = 1 game hour at 1x speed
- Business hours: 9-18 (10 hours/day), configured in `src/config/timeConfig.ts`
- 30 days/month
- `hourIndex = getBusinessHourIndex(hour)` for pipeline scheduling
- `absoluteTimestamp = getAbsoluteTimestamp(time, startYear)` for proposal expiry

All new code MUST use `hourIndex` for scheduling, NOT raw hour values. Pipeline frequencies
(analyst every 10 hours, manager every 5 hours) MUST be expressed as `hourIndex % N === offset`.

**Rationale**: The migration from abstract ticks to real-world hours makes timing intuitive for
developers. Consistent use of `hourIndex` and `getAbsoluteTimestamp` prevents scheduling bugs
when business hours change.

## Performance Standards

### Rendering Performance

- Target 60 FPS during active gameplay
- Component re-renders MUST be minimized (use React DevTools Profiler to verify)
- Event handlers MUST be memoized with `useCallback` when passed as props
- Expensive computations MUST use `useMemo`

### Memory Management

- Web Worker MUST be terminated on component unmount (prevent memory leaks)
- Event listeners MUST be cleaned up in useEffect return functions
- Zustand subscriptions MUST be unsubscribed when components unmount
- Price history MUST be capped at 50 data points per company
- `setTimeout` IDs in `useEffect` MUST be tracked in `useRef<Set>` and cleared on unmount

### Load Time

- Production build MUST complete `npm run build` without errors
- Code splitting with `React.lazy()` permitted for infrequently-used windows
- SQLite WASM requires COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp`)

## Development Workflow

### Testing Requirements

The project maintains a comprehensive test suite:

```bash
npm test             # Fast tests (excludes simulation/performance)
npm run test:unit    # Unit tests (tests/unit/)
npm run test:e2e     # E2E gameplay tests (tests/e2e/)
npm run test:sim     # Lightweight simulation (~2min)
npm run test:sim:heavy # Full simulation incl. stress tests (~30min)
npm run test:perf    # Performance benchmarks
npm run test:all     # Everything (30min+, use sparingly)
```

Testing standards:
- Unit tests MUST cover engine pure functions (trading, hiring, events, market systems)
- Integration tests MUST validate engine interactions (circuit breaker, institution, VI)
- E2E tests MUST cover full game playthrough scenarios (start → play → ending)
- Simulation tests validate long-term economic behavior (1yr, 5yr, 10yr, 20yr)
- Performance benchmarks MUST verify no regression in tick processing, portfolio calculation
- Coverage thresholds: lines/functions/statements 80%, branches 70%
- Test processes MUST be cleaned up — verify no orphan vitest processes after test runs

### Code Review Standards

- All PRs MUST pass `npm run lint` without errors
- TypeScript compilation MUST succeed (`npm run build`)
- Breaking changes to save data MUST include migration strategy
- New window types MUST update `WindowManager.tsx`, `WindowType` union, and `CLAUDE.md`
- Performance-impacting changes MUST include justification and measurement
- New engines MUST be added to the engine table in `CLAUDE.md`

### Git Workflow

- Feature branches for all work (never commit directly to `main`)
- Commit messages MUST be descriptive (not "fix", "update", "changes")
- Breaking changes MUST be documented in commit message body
- Save data compatibility MUST be preserved or migration provided

### Documentation Requirements

- New window types MUST be documented in `CLAUDE.md`
- Game mechanics changes MUST update relevant sections in `CLAUDE.md`
- Architecture changes MUST be reflected in `CLAUDE.md` Architecture section
- Common gotchas MUST be added to `CLAUDE.md` Gotchas section
- New engines/configs/data files MUST be listed in their respective `CLAUDE.md` tables

## Governance

This constitution supersedes all other development practices. When conflicts arise between
constitution principles and convenience, principles win unless amendment is proposed.

**Amendment Process**:
1. Propose change with rationale in GitHub Issue or PR description
2. Demonstrate problem with current principle (concrete example required)
3. Update constitution file with version bump (see versioning rules below)
4. Update dependent templates and documentation
5. Merge only after constitution changes are approved

**Versioning**:
- MAJOR: Backward incompatible principle removals or redefinitions
- MINOR: New principle added or materially expanded guidance
- PATCH: Clarifications, wording fixes, non-semantic refinements

**Compliance Review**:
- All PRs MUST verify compliance with applicable principles
- Constitution violations MUST be justified with inline comments if exception granted
- Repeated violations without justification MAY result in PR rejection
- Use `CLAUDE.md` for runtime development guidance complementing these principles

**Version**: 2.0.0 | **Ratified**: 2025-02-14 | **Last Amended**: 2026-02-19

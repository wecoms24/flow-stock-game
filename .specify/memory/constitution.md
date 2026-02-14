<!--
Sync Impact Report:
- Version Change: N/A → 1.0.0 (Initial Constitution)
- Modified Principles: None (Initial creation)
- Added Sections: All (Core Principles, Performance Standards, Development Workflow, Governance)
- Removed Sections: None
- Templates Requiring Updates:
  ✅ constitution-template.md - Used as base
  ⚠ plan-template.md - Review for alignment with principles
  ⚠ spec-template.md - Review for alignment with principles
  ⚠ tasks-template.md - Review for alignment with principles
- Follow-up TODOs: None
-->

# Retro Stock OS Constitution

## Core Principles

### I. Centralized State Management (NON-NEGOTIABLE)

All application state MUST flow through the single Zustand store (`src/stores/gameStore.ts`). Direct
component state is prohibited for shared data. State mutations MUST occur only through store actions,
never via direct `setState` calls. Component subscriptions MUST use selectors for performance
(`useGameStore((s) => s.specificValue)`) rather than subscribing to the entire store.

**Rationale**: Prevents state synchronization bugs, enables predictable data flow, and maintains
single source of truth for game state across all UI components.

### II. Performance-First Architecture

CPU-intensive calculations MUST be offloaded to Web Workers. Price calculations (GBM simulation) run
in `priceEngine.worker.ts`, never on main thread. Chart data processing MUST use `useMemo`
memoization. Component re-renders MUST be minimized through Zustand selective subscriptions and
React optimization patterns.

**Rationale**: Game requires 60 price updates per tick across 20 companies. Main thread blocking
causes UI stuttering and poor user experience. Worker architecture ensures smooth 60 FPS gameplay.

### III. Type Safety

TypeScript strict mode MUST be enabled. The `any` type is prohibited unless explicitly justified with
inline comment explaining necessity. All data structures MUST have interfaces defined in
`src/types/index.ts`. Component props, store state, and function signatures MUST be fully typed.

**Rationale**: Game state complexity (portfolio, employees, events, time) requires compiler-enforced
correctness. Type errors caught at compile-time prevent runtime state corruption bugs.

### IV. Component Organization

Components MUST be organized by functional purpose:
- `components/desktop/` - Desktop shell (StartScreen, StockTicker, Taskbar)
- `components/windows/` - Window system (Trading, Chart, Portfolio, Office, etc.)
- `components/effects/` - Visual effects (CRTOverlay, StockParticles)
- `components/ui/` - Reusable primitives (Button, Panel, ProgressBar)

Cross-boundary dependencies are permitted only downward (windows → ui, desktop → ui). Circular
dependencies are prohibited.

**Rationale**: Clear organization enables rapid feature location and prevents architectural drift.
Enforces separation of concerns between game shell, interactive windows, and visual polish.

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

## Performance Standards

### Rendering Performance

- Target 60 FPS during active gameplay
- Component re-renders MUST be minimized (use React DevTools Profiler to verify)
- Event handlers MUST be memoized with `useCallback` when passed as props
- Expensive computations MUST use `useMemo`
- Window renders MUST be virtualized if >10 windows open simultaneously

### Memory Management

- Web Worker MUST be terminated on component unmount (prevent memory leaks)
- Event listeners MUST be cleaned up in useEffect return functions
- Zustand subscriptions MUST be unsubscribed when components unmount
- Large data arrays (price history) MUST be capped at reasonable limits (e.g., 1000 ticks)

### Load Time

- Initial bundle size MUST remain <500KB (gzipped)
- Code splitting MUST be implemented for windows if bundle exceeds limit
- Lazy loading with `React.lazy()` permitted for infrequently-used windows
- Production build MUST complete `npm run build` without errors

## Development Workflow

### Testing Requirements

Currently no automated tests exist. When tests are added:
- Unit tests MUST cover game logic in `gameStore` actions (trading, hiring, events)
- Integration tests MUST validate tick engine + worker price calculations
- Component tests MUST verify window interactions and button states
- E2E tests MUST cover full game playthrough scenarios (start → play → ending)

### Code Review Standards

- All PRs MUST pass `npm run lint` without errors
- TypeScript compilation MUST succeed (`npm run build`)
- Breaking changes to `SaveData` type MUST include migration strategy
- New window types MUST update `WindowManager.tsx` and type definitions
- Performance-impacting changes MUST include justification and measurement

### Git Workflow

- Feature branches for all work (never commit directly to `main`)
- Commit messages MUST be descriptive (not "fix", "update", "changes")
- Breaking changes MUST be documented in commit message body
- Save data compatibility MUST be preserved or migration provided

### Documentation Requirements

- New window types MUST be documented in `CLAUDE.md` with usage patterns
- Game mechanics changes MUST update relevant sections in `CLAUDE.md`
- Architecture changes MUST be reflected in `CLAUDE.md` Architecture section
- Common gotchas MUST be added to `CLAUDE.md` Gotchas section

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

**Version**: 1.0.0 | **Ratified**: 2025-02-14 | **Last Amended**: 2025-02-14

# Tasks: System Level-Up - UX/Game Experience Enhancement

**Input**: Design documents from `/specs/001-system-level-up/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Tests are OPTIONAL in this feature - marked with ⚠️. Implementation can proceed without tests initially. If TDD is desired, complete test tasks before corresponding implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story (7 user stories total).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6, US7)
- Include exact file paths in descriptions

## Path Conventions

Project structure: Single-page React application (src/ at repository root)
- Types: `src/types/index.ts`
- Store: `src/stores/gameStore.ts`
- Engines: `src/engines/*.ts`
- Components: `src/components/**/*.tsx`
- Systems: `src/systems/*.ts`
- Data: `src/data/*.ts`
- Hooks: `src/hooks/*.ts`
- Tests: `tests/**/*.test.ts` (Vitest)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, testing framework, and type definitions

- [ ] T001 Install Vitest dependencies: `npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event jsdom`
- [ ] T002 [P] Create Vitest configuration in vitest.config.ts
- [ ] T003 [P] Create test setup file in tests/setup.ts
- [ ] T004 [P] Verify Motion library is installed (should be in package.json from existing dependencies)
- [ ] T005 Update package.json scripts with test commands (`test`, `test:ui`, `test:coverage`)

**Checkpoint**: Development environment ready - can run `npm test`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and store structure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Define AnimationSequence types in src/types/index.ts (AnimationStepType, AnimationStep, AnimationSequence)
- [ ] T007 [P] Define NewsCard types in src/types/index.ts (SectorType, CardRarity, CardEffect, NewsCard)
- [ ] T008 [P] Define EventChain types in src/types/index.ts (ChainWeek, PlayerAction, ChainBranch, EventChainState, EventChain)
- [ ] T009 [P] Define SkillPath types in src/types/index.ts (SkillPathType, SkillId, SkillBonus, SkillNode, SkillPath)
- [ ] T010 [P] Define EmployeeBio types in src/types/index.ts (PersonalityTrait, EmotionalState, PersonalGoal, LifeEvent, EmployeeBio)
- [ ] T011 [P] Define EconomicPressure types in src/types/index.ts (WealthTier, TaxConfig, PositionLimit, DifficultyModifier, PerformanceWindow, EconomicPressure)
- [ ] T012 Extend GameState interface in src/stores/gameStore.ts with new state slices (animationQueue, monthlyCards, eventChains, skillPaths, employeeBios, economicPressure, nextAnimationId)
- [ ] T013 Initialize new state slices in gameStore with default values (empty arrays, empty objects, default economicPressure)
- [ ] T014 Update SaveData migration logic in src/systems/saveSystem.ts (v1.x.x → v2.0.0 migration strategy)

**Checkpoint**: Foundation ready - type-safe state structure complete, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Enhanced Game Flow with Visual Feedback (Priority: P1) 🎯 MVP

**Goal**: Deliver satisfying 1.5-second animation sequence for trades with particle effects and sound feedback

**Independent Test**: Execute a single stock trade and observe animation sequence (card flip → price counting → portfolio update → particle effects → sound). Verify 60 FPS maintained with 50 particles.

### Tests for User Story 1 (OPTIONAL) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [P] [US1] Unit test for animation queueing in tests/unit/engines/animationEngine.test.ts
- [ ] T016 [P] [US1] Unit test for particle pooling in tests/unit/systems/particlePool.test.ts
- [ ] T017 [P] [US1] Integration test for trade animation sequence in tests/integration/animationSequence.test.ts

### Implementation for User Story 1

#### Animation Infrastructure

- [ ] T018 [P] [US1] Create particle pooling system in src/systems/particlePool.ts (max 50 particles, reuse logic)
- [ ] T019 [P] [US1] Create animation scheduler in src/systems/animationScheduler.ts (performance-aware queueing, 60 Hz debouncing)
- [ ] T020 [US1] Create animation engine in src/engines/animationEngine.ts (RAF loop, sequence executor, priority sorting)

#### Store Actions for Animations

- [ ] T021 [US1] Implement queueAnimation action in src/stores/gameStore.ts (add to queue with priority sorting)
- [ ] T022 [P] [US1] Implement startAnimation action in src/stores/gameStore.ts (update status to 'playing')
- [ ] T023 [P] [US1] Implement completeAnimation action in src/stores/gameStore.ts (update status to 'completed')
- [ ] T024 [P] [US1] Implement cancelAnimation action in src/stores/gameStore.ts (update status to 'cancelled')
- [ ] T025 [P] [US1] Implement clearCompletedAnimations action in src/stores/gameStore.ts (cleanup old sequences)

#### Animation Components

- [ ] T026 [P] [US1] Create TradeAnimationSequence component in src/components/effects/TradeAnimationSequence.tsx (orchestrates 1.5s sequence)
- [ ] T027 [P] [US1] Create ParticleSystem component in src/components/effects/ParticleSystem.tsx (Motion + CSS hybrid, 50 particle cap, auto-scaling)
- [ ] T028 [P] [US1] Create NumberCounter component in src/components/effects/NumberCounter.tsx (Motion useSpring, number formatting)
- [ ] T029 [P] [US1] Create CelebrationToast component in src/components/effects/CelebrationToast.tsx (milestone achievement notifications)

#### Animation Hooks

- [ ] T030 [P] [US1] Create useAnimationSequence hook in src/hooks/useAnimationSequence.ts (animation orchestration logic)
- [ ] T031 [P] [US1] Create useParticleEffect hook in src/hooks/useParticleEffect.ts (particle lifecycle management)
- [ ] T032 [P] [US1] Create useNumberCounter hook in src/hooks/useNumberCounter.ts (number counting animation hook)

#### Integration with Trading

- [ ] T033 [US1] Enhance TradingWindow component in src/components/windows/TradingWindow.tsx to trigger animations on buy/sell
- [ ] T034 [US1] Add animation trigger logic to buy/sell store actions (queue animation sequence on trade)

#### Sound Integration (FR-002)

- [ ] T035 [P] [US1] Add new 8-bit sound effects to src/systems/soundManager.ts (profit, loss, milestone sounds)
- [ ] T036 [US1] Integrate sound playback into animation sequence steps

**Checkpoint**: US1 complete - trades trigger 1.5s animation with particles and sound, 60 FPS verified

---

## Phase 4: User Story 2 - Unified Information Dashboard (Priority: P1)

**Goal**: Create 3-column dashboard layout presenting portfolio status, quick actions, employee status, and market news in single view

**Independent Test**: Open game and verify players can answer "What's my current portfolio value?", "Who's my most stressed employee?", and "What's the latest market news?" within 3 seconds.

### Tests for User Story 2 (OPTIONAL) ⚠️

- [ ] T037 [P] [US2] Component test for MainDashboard in tests/unit/components/MainDashboard.test.tsx (3-column layout rendering)
- [ ] T038 [P] [US2] Integration test for dashboard updates in tests/integration/dashboardUpdates.test.ts (real-time portfolio gauge)

### Implementation for User Story 2

#### UI Components

- [ ] T039 [P] [US2] Create ProgressGauge component in src/components/ui/ProgressGauge.tsx (circular portfolio health gauge with Motion animation)
- [ ] T040 [P] [US2] Create MilestoneBar component in src/components/ui/MilestoneBar.tsx (financial goal progress bar with next milestone suggestion)
- [ ] T041 [P] [US2] Create EmployeeCardGrid component in src/components/desktop/EmployeeCardGrid.tsx (grid view, stress color-coding, skill icons)
- [ ] T042 [P] [US2] Create NewsFeed component in src/components/desktop/NewsFeed.tsx (scrolling news with auto-scroll, 2s highlight animation)
- [ ] T043 [P] [US2] Create QuickTradePanel component in src/components/desktop/QuickTradePanel.tsx (left column quick actions)

#### Main Dashboard

- [ ] T044 [US2] Create MainDashboard component in src/components/desktop/MainDashboard.tsx (3-column layout: QuickTradePanel | ProgressGauge+MilestoneBar | EmployeeCardGrid+NewsFeed)
- [ ] T045 [US2] Integrate MainDashboard into StartScreen component in src/components/desktop/StartScreen.tsx (replace scattered UI elements)

#### Store Integration for Dashboard

- [ ] T046 [US2] Add dashboard update debouncing to gameStore (60 Hz cap, max update every 16.67ms)
- [ ] T047 [US2] Create selectors for dashboard data in src/stores/gameStore.ts (portfolioValue, stressedEmployees, recentEvents)

#### Milestone System (FR-031 to FR-034)

- [ ] T048 [P] [US2] Create milestone definitions in src/data/milestones.ts (financial targets, 5/10/20/30 year markers)
- [ ] T049 [US2] Implement milestone suggestion logic in src/stores/gameStore.ts (auto-suggest next goal at 50% completion)
- [ ] T050 [US2] Add achievement tracking to gameStore (history of reached milestones)
- [ ] T051 [US2] Create Achievement Log window in src/components/windows/AchievementLogWindow.tsx

**Checkpoint**: US2 complete - unified dashboard displays all game state in 3-column layout, <500ms render time

---

## Phase 5: User Story 3 - Strategic Decision-Making through Monthly Card System (Priority: P2)

**Goal**: Present 3 news cards monthly for player selection (choose 2, 1 mandatory), apply market effects

**Independent Test**: Play through one month, select 2 cards from 3 options, verify stock prices reflect chosen events' sector impacts.

### Tests for User Story 3 (OPTIONAL) ⚠️

- [ ] T052 [P] [US3] Unit test for card draw logic in tests/unit/engines/cardDrawEngine.test.ts (exclusivity rules, forced events)
- [ ] T053 [P] [US3] Integration test for monthly card flow in tests/integration/monthlyCardFlow.test.ts (draw → select → apply effects)

### Implementation for User Story 3

#### Card Data & Engine

- [ ] T054 [US3] Create news card templates in src/data/newsCards.ts (50+ cards across 5 sectors, rarity tiers, exclusivity rules)
- [ ] T055 [US3] Create card draw engine in src/engines/cardDrawEngine.ts (random selection, exclusivity enforcement, forced event 10% probability)

#### Store Actions for Cards

- [ ] T056 [US3] Implement drawMonthlyCards action in src/stores/gameStore.ts (select 3 cards, respect exclusivity)
- [ ] T057 [P] [US3] Implement selectCard action in src/stores/gameStore.ts (mark card as selected, max 2 selections)
- [ ] T058 [P] [US3] Implement applyCardEffects action in src/stores/gameStore.ts (update company drift/volatility per card effects)
- [ ] T059 [P] [US3] Implement expireCards action in src/stores/gameStore.ts (auto-select 2 random after 10 ticks timeout)

#### UI Components for Cards

- [ ] T060 [P] [US3] Create NewsCard component in src/components/ui/NewsCard.tsx (CSS rotateY flip animation, sector icons, effect preview)
- [ ] T061 [US3] Create MonthlyCardDrawWindow component in src/components/windows/MonthlyCardDrawWindow.tsx (3-card layout, selection UI, confirmation)

#### Integration with Monthly Processing

- [ ] T062 [US3] Integrate card draw with monthly processing in src/stores/gameStore.ts processMonthly action (trigger draw at month start)
- [ ] T063 [US3] Add card selection timeout logic to tick engine in src/engines/tickEngine.ts (auto-select after 10 ticks)

**Checkpoint**: US3 complete - monthly cards present choices, effects apply to market, <200ms processing time

---

## Phase 6: User Story 4 - Employee Personality and Growth Arc (Priority: P2)

**Goal**: Add employee bios with personal goals, emotions, and milestone celebrations to create emotional investment

**Independent Test**: Hire employee, click card to view bio (name, age, goal, emotion), perform monthly counseling (stress -15), verify goal progress updates monthly.

### Tests for User Story 4 (OPTIONAL) ⚠️

- [ ] T064 [P] [US4] Unit test for bio creation in tests/unit/systems/growthSystem.test.ts (unique goals, age generation)
- [ ] T065 [P] [US4] Integration test for goal progression in tests/integration/employeeBioLifecycle.test.ts (hire → monthly updates → milestone → quit)

### Implementation for User Story 4

#### Store Actions for Bios

- [ ] T066 [US4] Implement createEmployeeBio action in src/stores/gameStore.ts (generate unique bio on hire)
- [ ] T067 [P] [US4] Implement updatePersonalGoalProgress action in src/stores/gameStore.ts (accumulate salary → goal progress)
- [ ] T068 [P] [US4] Implement addLifeEvent action in src/stores/gameStore.ts (track events, FIFO queue max 10)
- [ ] T069 [P] [US4] Implement updateCurrentEmotion action in src/stores/gameStore.ts (derive from stress/satisfaction)
- [ ] T070 [P] [US4] Implement celebrateMilestone action in src/stores/gameStore.ts (toast notification, +10 satisfaction)
- [ ] T071 [P] [US4] Implement performCounseling action in src/stores/gameStore.ts (HR Manager -15 stress, 50K cost, unique dialogue)
- [ ] T072 [P] [US4] Implement deleteEmployeeBio action in src/stores/gameStore.ts (cleanup on quit/fire)

#### Bio Generation Logic

- [ ] T073 [US4] Enhance employee generation in src/systems/growthSystem.ts (add bio creation on hire)
- [ ] T074 [US4] Create personal goal generation logic (financial targets based on age/role)
- [ ] T075 [US4] Create emotion derivation logic (map stress/satisfaction → emotion state)

#### UI Components for Bios

- [ ] T076 [US4] Create EmployeeBioPanel component in src/components/windows/EmployeeBioPanel.tsx (displays name, age, goal, progress bar, personality, emotion, recent events)
- [ ] T077 [US4] Create EmotionBadge component in src/components/ui/EmotionBadge.tsx (emotion visualization with color coding)

#### Integration with Employee System

- [ ] T078 [US4] Enhance OfficeWindow component in src/components/windows/OfficeWindow.tsx (integrate bio panel on employee card click)
- [ ] T079 [US4] Integrate goal progress updates with monthly processing in src/stores/gameStore.ts processMonthly action
- [ ] T080 [US4] Add milestone celebration triggers to updatePersonalGoalProgress (toast on 25/50/75/100%)

**Checkpoint**: US4 complete - employees have bios with goals/emotions, counseling works, milestones celebrate

---

## Phase 7: User Story 5 - Branching Skill Development Paths (Priority: P3)

**Goal**: Present 2 skill path choices at employee level 5 (Trading/Analysis), unlock skills at levels 10/20/30, apply bonuses

**Independent Test**: Train employee to level 5, select skill path, level to 10, verify skill unlocks and bonuses apply to trades/proposals.

### Tests for User Story 5 (OPTIONAL) ⚠️

- [ ] T081 [P] [US5] Unit test for skill calculation in tests/unit/engines/skillTreeEngine.test.ts (bonus aggregation, prerequisites)
- [ ] T082 [P] [US5] Integration test for skill progression in tests/integration/skillProgression.test.ts (level 5 → path → level 10 → unlock)

### Implementation for User Story 5

#### Skill Data & Engine

- [ ] T083 [US5] Create skill tree definitions in src/data/skillTrees.ts (Trading/Analysis paths, 4 levels each, prerequisites, bonuses)
- [ ] T084 [US5] Create skill tree engine in src/engines/skillTreeEngine.ts (bonus calculation, prerequisite validation, available skills)

#### Store Actions for Skills

- [ ] T085 [US5] Implement selectSkillPath action in src/stores/gameStore.ts (choose Trading/Analysis at level 5, permanent choice)
- [ ] T086 [P] [US5] Implement unlockSkill action in src/stores/gameStore.ts (add to unlockedSkills, recalculate totalBonuses)
- [ ] T087 [P] [US5] Implement calculateTotalBonuses action in src/stores/gameStore.ts (aggregate all unlocked skill bonuses)
- [ ] T088 [P] [US5] Implement getAvailableSkills action in src/stores/gameStore.ts (check level requirements, prerequisites)
- [ ] T089 [P] [US5] Implement applySkillBonus action in src/stores/gameStore.ts (apply bonus to trade profit, prediction accuracy, etc.)

#### UI Components for Skill Tree

- [ ] T090 [P] [US5] Create SkillNode component in src/components/ui/SkillNode.tsx (SVG node with unlock states: unlocked/available/locked, Motion animations)
- [ ] T091 [US5] Create SkillTreeWindow component in src/components/windows/SkillTreeWindow.tsx (SVG tree visualization, 2 paths, 4 levels, connecting lines)

#### Integration with Employee Leveling

- [ ] T092 [US5] Enhance employee leveling logic in src/systems/growthSystem.ts (present path choice at level 5, unlock skills at 10/20/30)
- [ ] T093 [US5] Integrate skill bonuses with trade execution in src/engines/tradePipeline/traderLogic.ts (+20% trade profit for Trading path)
- [ ] T094 [US5] Integrate skill bonuses with analyst proposals in src/engines/tradePipeline/analystLogic.ts (+30% prediction accuracy for Analysis path)

**Checkpoint**: US5 complete - skill trees visualize paths, bonuses apply to employee actions, strategic customization enabled

---

## Phase 8: User Story 6 - Multi-Week Event Chain System (Priority: P3)

**Goal**: Support 3-4 week event chains with branching based on player actions, display progress in news feed

**Independent Test**: Trigger event chain (15% monthly probability), observe 3 sequential events over 3 weeks with branching outcomes based on buy/hold/sell actions.

### Tests for User Story 6 (OPTIONAL) ⚠️

- [ ] T095 [P] [US6] Unit test for event chain state machine in tests/unit/engines/eventChainEngine.test.ts (state transitions, branching logic)
- [ ] T096 [P] [US6] Integration test for event chain lifecycle in tests/integration/eventChainFlow.test.ts (start → advance → resolve)

### Implementation for User Story 6

#### Event Chain Data & Engine

- [ ] T097 [US6] Create event chain templates in src/data/eventChains.ts (10+ chains, 3-4 week sequences, branch conditions)
- [ ] T098 [US6] Create event chain engine in src/engines/eventChainEngine.ts (state machine, player action detection, branching logic)

#### Store Actions for Event Chains

- [ ] T099 [US6] Implement startEventChain action in src/stores/gameStore.ts (initialize chain state, add to active chains)
- [ ] T100 [P] [US6] Implement advanceChain action in src/stores/gameStore.ts (progress to next week based on player action)
- [ ] T101 [P] [US6] Implement pauseChain action in src/stores/gameStore.ts (pause when forced event interrupts)
- [ ] T102 [P] [US6] Implement resumeChain action in src/stores/gameStore.ts (resume from paused state)
- [ ] T103 [P] [US6] Implement resolveChain action in src/stores/gameStore.ts (apply resolution effects, move to history)

#### UI Components for Event Chains

- [ ] T104 [P] [US6] Create EventChainBadge component in src/components/ui/EventChainBadge.tsx (progress indicator "Week 2 of 4")
- [ ] T105 [US6] Create EventChainTracker component in src/components/windows/EventChainTracker.tsx (detailed chain progress UI)

#### Integration with Event System

- [ ] T106 [US6] Integrate chain spawning with monthly processing in src/stores/gameStore.ts processMonthly action (15% probability)
- [ ] T107 [US6] Enhance NewsFeed component to display chain progress badges (integrate EventChainBadge)
- [ ] T108 [US6] Add chain advancement logic to weekly processing (detect player actions, call advanceChain)

**Checkpoint**: US6 complete - event chains span multiple weeks, branch based on actions, progress visible in news feed

---

## Phase 9: User Story 7 - Dynamic Economic Pressure System (Priority: P3)

**Goal**: Apply wealth tax (>100M KRW), enforce position limits (>1B KRW), adaptive difficulty scaling based on performance

**Independent Test**: Accumulate 100M KRW, verify 0.5% monthly tax. Reach 1B KRW, verify 20% position limit enforcement. Achieve >50% annual returns, verify negative event frequency increases 20%.

### Tests for User Story 7 (OPTIONAL) ⚠️

- [ ] T109 [P] [US7] Unit test for wealth tier calculation in tests/unit/engines/economicPressureEngine.test.ts (tier transitions, tax rates)
- [ ] T110 [P] [US7] Integration test for tax application in tests/integration/economicPressure.test.ts (monthly deduction, cash flow protection)

### Implementation for User Story 7

#### Economic Pressure Engine

- [ ] T111 [US7] Create economic pressure engine in src/engines/economicPressureEngine.ts (wealth tier calculation, tax computation, difficulty adjustment)

#### Store Actions for Economic Pressure

- [ ] T112 [US7] Implement updateWealthTier action in src/stores/gameStore.ts (calculate tier from total assets, update activeTaxConfig/activePositionLimit)
- [ ] T113 [P] [US7] Implement applyWealthTax action in src/stores/gameStore.ts (0.5% monthly deduction, min(tax, 90% income) cap)
- [ ] T114 [P] [US7] Implement enforcePositionLimit action in src/stores/gameStore.ts (validate trade, block if >20% concentration)
- [ ] T115 [P] [US7] Implement adjustDifficulty action in src/stores/gameStore.ts (increase negative events if >50% returns, relief events if loss streak)
- [ ] T116 [P] [US7] Implement recordPerformance action in src/stores/gameStore.ts (track annual returns, rolling 12-month window)
- [ ] T117 [P] [US7] Implement checkReliefEligibility action in src/stores/gameStore.ts (3+ months >20% loss)

#### Integration with Monthly/Trade Processing

- [ ] T118 [US7] Integrate wealth tier update with monthly processing in src/stores/gameStore.ts processMonthly action
- [ ] T119 [US7] Integrate tax application with monthly processing (call applyWealthTax after tier update)
- [ ] T120 [US7] Integrate position limit enforcement with trade validation in TradingWindow component
- [ ] T121 [US7] Integrate difficulty adjustment with monthly processing (call adjustDifficulty, modify event spawn rates)

**Checkpoint**: US7 complete - wealth tax applies, position limits enforce, difficulty scales dynamically

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories, performance optimization, documentation

- [ ] T122 [P] Performance optimization: Verify 60 FPS maintained during trades (use Chrome DevTools Performance tab)
- [ ] T123 [P] Performance optimization: Verify bundle size <500KB (run `npm run build`, check dist/assets/*.js)
- [ ] T124 [P] Performance optimization: Add React.memo to all animation components (TradeAnimationSequence, ParticleSystem, NumberCounter)
- [ ] T125 [P] Performance optimization: Add useCallback to all event handlers passed as props
- [ ] T126 [P] Memory leak prevention: Verify RAF loops cleaned up in useEffect return functions
- [ ] T127 [P] Memory leak prevention: Verify particle pooling prevents GC thrashing (DevTools Memory profiler)
- [ ] T128 [P] Code cleanup: Run ESLint and fix all warnings (`npm run lint`)
- [ ] T129 [P] Code cleanup: Ensure consistent import ordering (external → internal → types)
- [ ] T130 [P] Documentation: Update CLAUDE.md with new windows, entities, common gotchas
- [ ] T131 [P] Documentation: Add quickstart.md validation steps to developer guide
- [ ] T132 [P] Accessibility: Add keyboard navigation to all new windows (Enter/Space for card flip, Tab for navigation)
- [ ] T133 [P] Accessibility: Add aria-live regions for animation state changes
- [ ] T134 [P] Accessibility: Add "Skip animation" option in settings for motion-sensitive users
- [ ] T135 Save data validation: Test v1.x.x → v2.0.0 migration with existing save file
- [ ] T136 Save data validation: Verify all new state slices persist and load correctly
- [ ] T137 Integration testing: Run full playthrough (start → 30 years → ending) with all features active
- [ ] T138 [P] Performance testing: Test on low-end device (verify auto-scaling to 30 FPS, 20 particles)
- [ ] T139 [P] Browser compatibility: Test on Chrome, Safari, Firefox (desktop + mobile)
- [ ] T140 Bundle analysis: If bundle >480KB, implement lazy-loading for SkillTreeWindow and EventChainTracker

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) after Phase 2
  - Or sequentially in priority order: US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2) → US5 (P3) → US6 (P3) → US7 (P3)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

**Independent Stories** (can start in parallel after Foundational):
- **US1 (P1)**: Animation System - No dependencies on other stories
- **US2 (P1)**: Unified Dashboard - No dependencies on other stories (but integrates well with US1 animations)
- **US3 (P2)**: Monthly Card System - No dependencies on other stories
- **US4 (P2)**: Employee Bios - No dependencies on other stories
- **US5 (P3)**: Skill Tree - No dependencies on other stories
- **US6 (P3)**: Event Chains - No dependencies on other stories (similar to US3 but independent)
- **US7 (P3)**: Economic Pressure - No dependencies on other stories

**Integration Points** (non-blocking, enhance when combined):
- US1 + US2: Dashboard uses US1 animations for portfolio gauge updates
- US1 + US3: Card selection uses US1 card flip animations
- US1 + US4: Bio milestones use US1 celebration toast animations
- US4 + US5: Employee bios show skill tree progress
- US3 + US6: Event chains similar to monthly cards but independent implementation

### Within Each User Story

**General Pattern**:
1. Data/Templates → Engine Logic → Store Actions → Components → Integration
2. Tests (if included) MUST be written and FAIL before implementation
3. Core components before integration components
4. Story complete and independently testable before moving to next

**Parallel Opportunities**:
- **Within Foundational (Phase 2)**: All type definitions (T006-T011) can run in parallel
- **Within US1**: Particle pool, animation scheduler, engine logic (T018-T020) can start in parallel; then components (T026-T029) in parallel; then hooks (T030-T032) in parallel
- **Within US2**: All UI components (T039-T043) can run in parallel before dashboard assembly (T044)
- **Within US3**: Card data + engine (T054-T055) in parallel; then store actions (T057-T059) in parallel
- **Within US4**: Store actions (T067-T072) can run in parallel after bio creation logic (T066)
- **Within US5**: Skill data + engine (T083-T084) in parallel; then store actions (T086-T089) in parallel
- **Within US6**: Chain data + engine (T097-T098) in parallel; then store actions (T100-T103) in parallel
- **Within US7**: All store actions (T113-T117) can run in parallel after engine (T111)
- **Polish (Phase 10)**: Most tasks (T122-T134, T138-T139) can run in parallel

---

## Parallel Example: User Story 1 (Animation System)

```bash
# After Foundational phase completes, launch US1 infrastructure in parallel:
Task T018: "Create particle pooling system in src/systems/particlePool.ts"
Task T019: "Create animation scheduler in src/systems/animationScheduler.ts"
Task T020: "Create animation engine in src/engines/animationEngine.ts" (depends on T018-T019 for types)

# Then launch all store actions in parallel:
Task T022: "Implement startAnimation action"
Task T023: "Implement completeAnimation action"
Task T024: "Implement cancelAnimation action"
Task T025: "Implement clearCompletedAnimations action"

# Then launch all components in parallel:
Task T026: "Create TradeAnimationSequence component"
Task T027: "Create ParticleSystem component"
Task T028: "Create NumberCounter component"
Task T029: "Create CelebrationToast component"

# Then launch all hooks in parallel:
Task T030: "Create useAnimationSequence hook"
Task T031: "Create useParticleEffect hook"
Task T032: "Create useNumberCounter hook"
```

---

## Parallel Example: User Story 2 (Dashboard)

```bash
# After US1 completes (or in parallel if separate developers), launch all UI components:
Task T039: "Create ProgressGauge component"
Task T040: "Create MilestoneBar component"
Task T041: "Create EmployeeCardGrid component"
Task T042: "Create NewsFeed component"
Task T043: "Create QuickTradePanel component"

# Then assemble dashboard:
Task T044: "Create MainDashboard component" (depends on T039-T043)

# Milestone system can run in parallel with dashboard assembly:
Task T048: "Create milestone definitions"
Task T049: "Implement milestone suggestion logic"
Task T050: "Add achievement tracking"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

**Minimal Viable Product delivering core UX improvements**:

1. Complete Phase 1: Setup (T001-T005) → 1 day
2. Complete Phase 2: Foundational (T006-T014) → 2 days
3. Complete Phase 3: US1 Animation System (T015-T036) → 1.5 weeks
4. Complete Phase 4: US2 Unified Dashboard (T037-T051) → 1 week
5. **STOP and VALIDATE**: Test US1+US2 independently
   - Execute trades with animations (US1 independent test)
   - Answer 3 dashboard questions in 3 seconds (US2 independent test)
   - Verify 60 FPS + <500ms dashboard render
6. Deploy/demo if ready → **MVP!**

**Total MVP Timeline**: ~3 weeks (assuming 1 developer)

### Incremental Delivery (Add US3-US7 Progressively)

**After MVP, add one story at a time**:

1. **Foundation + US1 + US2** (3 weeks) → MVP deployed
2. **Add US3: Monthly Cards** (1 week) → Test independently → Deploy
3. **Add US4: Employee Bios** (1 week) → Test independently → Deploy
4. **Add US5: Skill Tree** (1 week) → Test independently → Deploy
5. **Add US6: Event Chains** (1 week) → Test independently → Deploy
6. **Add US7: Economic Pressure** (1 week) → Test independently → Deploy
7. **Polish (Phase 10)** (3 days) → Final QA → Full release

**Total Timeline**: ~8 weeks (all features)

### Parallel Team Strategy (3 Developers)

**Maximize parallelization after Foundational phase**:

1. **Week 1**: All devs complete Phase 1 (Setup) + Phase 2 (Foundational) together
2. **Week 2-3**: Once Foundational done (checkpoint):
   - Developer A: US1 (Animation System)
   - Developer B: US2 (Unified Dashboard)
   - Developer C: US3 (Monthly Card System)
3. **Week 4**:
   - Developer A: US4 (Employee Bios)
   - Developer B: US5 (Skill Tree)
   - Developer C: US6 (Event Chains)
4. **Week 5**:
   - Developer A: US7 (Economic Pressure)
   - Developer B + C: Polish tasks (performance, accessibility)
5. **Week 5-6**: Integration testing, browser compatibility, QA

**Total Timeline with 3 Devs**: ~5-6 weeks (all features, faster integration)

---

## Success Metrics (From spec.md Success Criteria)

**After MVP (US1 + US2)**:
- SC-001: Average session length 15min → 45min (target: +200% engagement)
- SC-003: 90% players complete trade with full animation sequence
- SC-005: 80% players understand game state in <3 seconds (dashboard test)
- SC-010: 60 FPS maintained on 90% devices
- SC-011: Dashboard render <500ms

**After Full Deployment (US1-US7)**:
- SC-002: Player replay rate 20% → 40%
- SC-004: NPS 5.0 → 6.5
- SC-006: Employee interaction 5 → 30 times per playthrough
- SC-007: 95% card selection rate (not auto-selecting)
- SC-008: 30% skill path variation (balanced choices)
- SC-009: 85% event chain completion rate
- SC-012: Card processing <200ms
- SC-013: Players reaching Year 10: 30% → 55%
- SC-014: Player-generated content +300%
- SC-015: Endings discovered per player 1.2 → 2.5

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run in parallel
- **[Story] labels** map tasks to specific user stories for traceability (US1-US7)
- **Each user story independently completable and testable** - can stop at any checkpoint
- **Tests are OPTIONAL** (⚠️ marked) - implement if TDD desired or after core features
- **Verify tests fail before implementing** (if using TDD approach)
- **Commit after each task or logical group** for granular version control
- **Stop at checkpoints to validate** story works independently
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 9 tasks
- **Phase 3 (US1)**: 22 tasks (3 tests + 19 implementation)
- **Phase 4 (US2)**: 15 tasks (2 tests + 13 implementation)
- **Phase 5 (US3)**: 12 tasks (2 tests + 10 implementation)
- **Phase 6 (US4)**: 17 tasks (2 tests + 15 implementation)
- **Phase 7 (US5)**: 14 tasks (2 tests + 12 implementation)
- **Phase 8 (US6)**: 14 tasks (2 tests + 12 implementation)
- **Phase 9 (US7)**: 13 tasks (2 tests + 11 implementation)
- **Phase 10 (Polish)**: 19 tasks

**Total Tasks**: 140 (17 tests + 123 implementation)
**Parallel Opportunities**: 60+ tasks marked [P] (can run concurrently)
**MVP Tasks**: 31 (Setup + Foundational + US1 + US2)

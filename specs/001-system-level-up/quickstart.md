# Quickstart Guide: System Level-Up Implementation

**Date**: 2026-02-17
**Feature**: 001-system-level-up
**Target Audience**: Developers implementing UX/game experience enhancements

## Prerequisites

Before starting implementation, ensure you have:

1. ✅ Read `spec.md` - Understand all 7 user stories and 34 functional requirements
2. ✅ Read `research.md` - Technical decisions (Motion, Vitest, particle system, etc.)
3. ✅ Read `data-model.md` - TypeScript interfaces for all 6 new entities
4. ✅ Reviewed CLAUDE.md - Project architecture and constitution compliance

## Getting Started

### Step 1: Setup Development Environment

```bash
# Install new dependencies
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event jsdom

# Verify Motion is already installed (should be included in package.json)
npm list motion # or npm list framer-motion

# Start development server
npm run dev
```

### Step 2: Configure Vitest (New Testing Framework)

Create `vitest.config.ts` in project root:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/tests/**', '**/*.config.*']
    }
  }
})
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  })
})
```

Run tests:
```bash
npm test                    # Run all tests
npm test -- --ui            # Run with Vitest UI
npm test -- --coverage      # Generate coverage report
```

### Step 3: Extend Type Definitions

Add new types to `src/types/index.ts` (see `data-model.md` for full interfaces):

```typescript
// src/types/index.ts additions

// Animation types
export type AnimationStepType = 'card_flip' | 'number_count' | 'particle' | 'sound' | 'delay'

export interface AnimationStep {
  type: AnimationStepType
  duration: number
  params: {
    // ... (see data-model.md for full definition)
  }
}

export interface AnimationSequence {
  id: string
  triggerType: 'trade' | 'milestone' | 'level_up' | 'monthly_card' | 'event_chain'
  steps: AnimationStep[]
  totalDuration: number
  priority: number
  startedAt: number
  status: 'queued' | 'playing' | 'completed' | 'cancelled'
}

// ... (add remaining types from data-model.md)
```

### Step 4: Extend Zustand Store

Modify `src/stores/gameStore.ts` to add new state slices:

```typescript
// src/stores/gameStore.ts

import { create } from 'zustand'
import type {
  AnimationSequence,
  NewsCard,
  EventChain,
  SkillPath,
  EmployeeBio,
  EconomicPressure
} from '../types'

interface GameState {
  // ... existing state (time, player, companies, etc.)

  // NEW: Animation system
  animationQueue: AnimationSequence[]
  nextAnimationId: number

  // NEW: Monthly card system
  monthlyCards: {
    current: NewsCard[]
    selected: NewsCard[]
    history: NewsCard[]
  }

  // NEW: Event chain system
  eventChains: {
    active: EventChain[]
    history: EventChain[]
  }

  // NEW: Skill progression
  skillPaths: Record<string, SkillPath> // keyed by employeeId

  // NEW: Employee personality
  employeeBios: Record<string, EmployeeBio> // keyed by employeeId

  // NEW: Economic pressure
  economicPressure: EconomicPressure
}

interface GameActions {
  // ... existing actions

  // NEW: Animation actions
  queueAnimation: (sequence: Omit<AnimationSequence, 'id' | 'status' | 'startedAt'>) => void
  startAnimation: (id: string) => void
  completeAnimation: (id: string) => void
  cancelAnimation: (id: string) => void
  clearCompletedAnimations: () => void

  // NEW: Monthly card actions
  drawMonthlyCards: () => void
  selectCard: (cardId: string) => void
  applyCardEffects: () => void
  expireCards: () => void

  // NEW: Event chain actions
  startEventChain: (chainTemplateId: string) => void
  advanceChain: (chainId: string, playerAction: PlayerAction) => void
  pauseChain: (chainId: string, reason: string) => void
  resumeChain: (chainId: string) => void
  resolveChain: (chainId: string) => void

  // NEW: Skill tree actions
  selectSkillPath: (employeeId: string, pathType: SkillPathType) => void
  unlockSkill: (employeeId: string, skillId: SkillId) => void
  calculateTotalBonuses: (employeeId: string) => SkillBonus[]

  // NEW: Employee bio actions
  createEmployeeBio: (employeeId: string) => void
  updatePersonalGoalProgress: (employeeId: string, salaryAdded: number) => void
  addLifeEvent: (employeeId: string, event: LifeEvent) => void
  updateCurrentEmotion: (employeeId: string) => void
  deleteEmployeeBio: (employeeId: string) => void

  // NEW: Economic pressure actions
  updateWealthTier: () => void
  applyWealthTax: () => void
  enforcePositionLimit: (companyId: string, shares: number) => boolean
  adjustDifficulty: () => void
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  // ... existing state initialization

  // NEW: Initialize new state slices
  animationQueue: [],
  nextAnimationId: 0,
  monthlyCards: { current: [], selected: [], history: [] },
  eventChains: { active: [], history: [] },
  skillPaths: {},
  employeeBios: {},
  economicPressure: {
    currentWealthTier: 'below_100M',
    activeTaxConfig: { tier: 'below_100M', rate: 0, appliesAbove: 0 },
    activePositionLimit: { tier: 'below_100M', maxPercentage: 1, appliesAbove: 0 },
    activeDifficultyModifier: { tier: 'below_100M', negativeEventFrequencyMultiplier: 1, reliefEventEligible: false },
    performanceHistory: [],
    lastTaxDeduction: 0,
    lastDifficultyAdjustment: 0
  },

  // NEW: Implement actions (see implementation guide below)
  queueAnimation: (sequence) => {
    const id = `anim-${get().nextAnimationId}`
    set((s) => ({
      nextAnimationId: s.nextAnimationId + 1,
      animationQueue: [
        ...s.animationQueue,
        {
          ...sequence,
          id,
          status: 'queued',
          startedAt: 0
        }
      ].sort((a, b) => b.priority - a.priority) // highest priority first
    }))
  },

  // ... (implement remaining actions - see data-model.md for contracts)
}))
```

## Implementation Roadmap

### Phase 1: Animation System (P1 - Week 1-2)

**Goal**: Implement satisfying visual/audio feedback for trades (FR-001 to FR-004)

**Tasks**:
1. Create `src/engines/animationEngine.ts` - Animation sequence executor
2. Create `src/systems/particlePool.ts` - Particle object pooling
3. Create `src/components/effects/TradeAnimationSequence.tsx` - Orchestrator
4. Create `src/components/effects/ParticleSystem.tsx` - Particle renderer
5. Create `src/components/effects/NumberCounter.tsx` - Number counting
6. Create `src/hooks/useAnimationSequence.ts` - Animation hook
7. Integrate with `TradingWindow.tsx` - Trigger on buy/sell

**Testing**:
```typescript
// tests/unit/engines/animationEngine.test.ts
import { describe, it, expect } from 'vitest'
import { queueAnimation, processAnimationQueue } from '@/engines/animationEngine'

describe('AnimationEngine', () => {
  it('should queue animations by priority', () => {
    const lowPriority = { triggerType: 'toast', steps: [], priority: 1 }
    const highPriority = { triggerType: 'trade', steps: [], priority: 10 }

    queueAnimation(lowPriority)
    queueAnimation(highPriority)

    const queue = getAnimationQueue()
    expect(queue[0].priority).toBe(10) // high priority first
  })
})
```

**Validation**:
- ✅ FR-001: 1.5-second trade animation sequence plays on trade
- ✅ FR-002: Distinct 8-bit sounds for profit/loss/milestone
- ✅ FR-003: 60 FPS with 50 particles, auto-scales to 20 at <30 FPS
- ✅ FR-004: Number counting duration 100-500ms based on value magnitude

---

### Phase 2: Unified Dashboard (P1 - Week 2-3)

**Goal**: Create 3-column dashboard layout (FR-005 to FR-008)

**Tasks**:
1. Create `src/components/desktop/MainDashboard.tsx` - 3-column layout
2. Create `src/components/ui/ProgressGauge.tsx` - Portfolio health gauge
3. Create `src/components/ui/MilestoneBar.tsx` - Financial goal progress
4. Refactor `StartScreen.tsx` - Integrate dashboard on game start
5. Create `src/components/desktop/EmployeeCardGrid.tsx` - Employee card view
6. Create `src/components/desktop/NewsFeed.tsx` - Scrolling news feed

**Layout Structure**:
```tsx
// MainDashboard.tsx
export const MainDashboard = () => {
  return (
    <div className="main-dashboard grid grid-cols-3 gap-4 h-full">
      {/* Left Column: Quick Trade */}
      <div className="col-span-1 bg-gray-200 p-4">
        <QuickTradePanel />
      </div>

      {/* Center Column: Portfolio Health */}
      <div className="col-span-1 bg-gray-100 p-4 flex flex-col items-center">
        <ProgressGauge value={portfolioValue} max={milestone} />
        <MilestoneBar current={cash} next={nextGoal} />
      </div>

      {/* Right Column: Employees + News */}
      <div className="col-span-1 bg-gray-200 p-4 flex flex-col gap-4">
        <EmployeeCardGrid employees={employees} />
        <NewsFeed events={recentEvents} />
      </div>
    </div>
  )
}
```

**Validation**:
- ✅ FR-005: 3-column layout renders on main screen
- ✅ FR-006: Portfolio gauge updates every tick with smooth animation
- ✅ FR-007: Employee cards show stress (color-coded), role, skills
- ✅ FR-008: News feed auto-scrolls to new events with 2s highlight

---

### Phase 3: Monthly Card System (P2 - Week 3-4)

**Goal**: Strategic card selection mechanics (FR-009 to FR-013)

**Tasks**:
1. Create `src/data/newsCards.ts` - Card template definitions (50+ cards)
2. Create `src/engines/cardDrawEngine.ts` - Card selection logic
3. Create `src/components/windows/MonthlyCardDrawWindow.tsx` - Card UI
4. Create `src/components/ui/NewsCard.tsx` - Individual card component
5. Integrate with monthly processing - Trigger card draw at month start

**Card Template Example**:
```typescript
// src/data/newsCards.ts
export const newsCardTemplates: NewsCardTemplate[] = [
  {
    templateId: 'tech-surge-1',
    title: '기술주 급등',
    description: 'AI 혁신 기대감으로 기술 섹터 강세',
    effects: [
      { sector: 'tech', driftChange: 0.15, volatilityChange: 0.05, duration: 3600 * 30 } // 30 days
    ],
    rarity: 'common',
    icon: '📈',
    exclusiveWith: ['tech-crash-1', 'tech-regulation-1']
  },
  // ... 49 more cards
]
```

**Validation**:
- ✅ FR-009: 3 cards presented monthly with title, effects, icon
- ✅ FR-010: Player selects exactly 2 cards, 3rd marked mandatory
- ✅ FR-011: Effects applied immediately after selection
- ✅ FR-012: 10% chance forced event (single card, auto-applied)
- ✅ FR-013: Auto-select 2 random cards after 10 ticks (2s timeout)

---

### Phase 4: Employee Bio System (P2 - Week 4-5)

**Goal**: Personality and life goals for employees (FR-014 to FR-018)

**Tasks**:
1. Create `src/components/windows/EmployeeBioPanel.tsx` - Bio detail panel
2. Enhance `src/systems/growthSystem.ts` - Add bio creation on hire
3. Create monthly salary → personal goal progress logic
4. Implement HR Manager counseling (stress reduction + dialogue)
5. Create milestone celebration toasts (25%, 50%, 75%, 100%)

**Bio Panel Example**:
```tsx
// EmployeeBioPanel.tsx
export const EmployeeBioPanel = ({ employeeId }: Props) => {
  const bio = useGameStore(s => s.employeeBios[employeeId])

  return (
    <WindowFrame title={`${bio.name} (${bio.age}세)`}>
      <div className="bio-content p-4">
        <section className="personal-goal mb-4">
          <h3>현재 목표</h3>
          <p>{bio.personalGoal.description}</p>
          <ProgressBar
            value={bio.personalGoal.progressPercent}
            max={100}
            label={`${bio.personalGoal.currentProgress.toLocaleString()} / ${bio.personalGoal.targetAmount.toLocaleString()} KRW`}
          />
        </section>

        <section className="personality mb-4">
          <h3>성격</h3>
          <p>{getPersonalityDescription(bio.personalityTrait)}</p>
        </section>

        <section className="emotion mb-4">
          <h3>현재 기분</h3>
          <EmotionBadge emotion={bio.currentEmotion} />
          <p>{getEmotionMessage(bio.currentEmotion)}</p>
        </section>

        <section className="recent-events">
          <h3>최근 소식</h3>
          <ul>
            {bio.recentLifeEvents.slice(0, 5).map(event => (
              <li key={event.tick}>{event.description}</li>
            ))}
          </ul>
        </section>
      </div>
    </WindowFrame>
  )
}
```

**Validation**:
- ✅ FR-014: Unique bios with name, age, goal, trait, emotion
- ✅ FR-015: Goal progress tracks accumulated salary
- ✅ FR-016: Celebration notifications at 25/50/75/100% milestones
- ✅ FR-017: Emotion updated based on recent events
- ✅ FR-018: HR Manager counseling costs 50K, reduces stress by 15

---

### Phase 5: Skill Tree System (P3 - Week 5-6)

**Goal**: Branching skill development (FR-019 to FR-022)

**Tasks**:
1. Create `src/data/skillTrees.ts` - Skill node definitions
2. Create `src/engines/skillTreeEngine.ts` - Skill calculation logic
3. Create `src/components/windows/SkillTreeWindow.tsx` - Tree visualization
4. Create `src/components/ui/SkillNode.tsx` - Individual skill node
5. Integrate with employee leveling - Present path choice at level 5

**Validation**:
- ✅ FR-019: 2 paths at level 5 (Trading: +20% profit, Analysis: +30% accuracy)
- ✅ FR-020: Advanced skills unlock at 10, 20, 30
- ✅ FR-021: Bonuses apply immediately to all future actions
- ✅ FR-022: Tree shows unlocked (green), available (yellow), locked (gray)

---

### Phase 6: Event Chain System (P3 - Week 6-7)

**Goal**: Multi-week narrative events (FR-023 to FR-026)

**Tasks**:
1. Create `src/data/eventChains.ts` - Chain templates (10+ chains)
2. Create `src/engines/eventChainEngine.ts` - State machine logic
3. Create `src/components/windows/EventChainTracker.tsx` - Progress UI
4. Create `src/components/ui/EventChainBadge.tsx` - Chain indicator
5. Integrate with monthly processing - 15% chance to start chain

**Validation**:
- ✅ FR-023: Chains span 3-4 weeks, each week builds on previous
- ✅ FR-024: Branching based on player action (bought/sold/held)
- ✅ FR-025: Progress displayed in news feed (e.g., "Week 2 of 4")
- ✅ FR-026: Resolution events ±15-25% stock impact

---

### Phase 7: Economic Pressure System (P3 - Week 7-8)

**Goal**: Dynamic difficulty scaling (FR-027 to FR-030)

**Tasks**:
1. Create `src/engines/economicPressureEngine.ts` - Tax/limit/difficulty logic
2. Integrate with monthly processing - Apply wealth tax
3. Integrate with trading - Enforce position limits
4. Create adaptive difficulty - Increase negative events if high returns

**Validation**:
- ✅ FR-027: 0.5% monthly tax on assets >100M KRW
- ✅ FR-028: 20% portfolio limit per stock when assets >1B KRW
- ✅ FR-029: Adaptive difficulty (20% more negatives if >50% returns)
- ✅ FR-030: Tax capped at 90% monthly income (prevent cash flow death)

---

## Component Architecture

### Animation Flow

```
User Action (buy stock)
   ↓
TradingWindow.tsx
   ↓
queueAnimation({ triggerType: 'trade', steps: [...] })
   ↓
animationEngine.ts (processes queue on RAF loop)
   ↓
TradeAnimationSequence.tsx (orchestrates steps)
   ↓
┌─────────────┬──────────────┬──────────────┬────────────┐
│ CardFlip    │ NumberCounter│ ParticleSystem│ SoundManager│
└─────────────┴──────────────┴──────────────┴────────────┘
   ↓             ↓              ↓              ↓
Motion       Motion         Motion         Web Audio API
useAnimate   useSpring      layout         oscillators
```

### Monthly Card Flow

```
Monthly Processing (processMonthly in gameStore.ts)
   ↓
drawMonthlyCards()
   ↓
cardDrawEngine.ts (select 3 cards, respect exclusivity)
   ↓
MonthlyCardDrawWindow.tsx opens
   ↓
User selects 2 cards (or auto-select after 10 ticks)
   ↓
applyCardEffects()
   ↓
Update company drift/volatility
   ↓
Start animations (card flip, market reaction)
```

### Skill Tree Flow

```
Employee Levels Up (processEmployeeTick in gameStore.ts)
   ↓
IF level === 5 → Present skill path choice
   ↓
SkillTreeWindow.tsx opens
   ↓
User selects path (Trading or Analysis)
   ↓
selectSkillPath(employeeId, pathType)
   ↓
skillTreeEngine.ts calculates available skills
   ↓
Future level-ups (10, 20, 30) → unlockSkill()
   ↓
Bonuses applied to employee actions (trades, proposals)
```

## Performance Optimization Checklist

- [ ] Particle count capped at 50 (FR-003)
- [ ] Auto-scale to 20 particles when FPS <30 (FR-003)
- [ ] All animation components use `React.memo`
- [ ] Event handlers memoized with `useCallback`
- [ ] Chart data memoized with `useMemo`
- [ ] Dashboard updates debounced to max 60 Hz (16.67ms)
- [ ] Zustand selectors used (not whole store subscriptions)
- [ ] Web Worker continues handling price calculations (no main thread blocking)
- [ ] Old animations cleaned up (clearCompletedAnimations every 100 ticks)
- [ ] Event chain state pruned when resolved (prevent unbounded growth)

## Common Pitfalls

1. **Animation Memory Leaks**: Always cleanup RAF loops in `useEffect` return functions
2. **Particle GC Thrashing**: Use particle pooling (reuse objects, don't create/destroy)
3. **Dashboard Re-render Storms**: Use Zustand selectors, not `useGameStore()` without selector
4. **Save Data Corruption**: Test migration from v1.x.x → v2.0.0 thoroughly
5. **Skill Bonus Stacking**: Don't apply bonuses multiple times (check `unlockedSkills` before adding)
6. **Event Chain Conflicts**: Max 2 active chains, prevent sector overlap
7. **Tax Cash Flow Death**: Enforce `min(tax, 90% income)` cap (FR-030)

## Testing Strategy

### Unit Tests (Vitest)
- Engine logic (cardDrawEngine, skillTreeEngine, economicPressureEngine)
- State transitions (event chain state machine)
- Validation rules (particle count ≤50, skill prerequisites)
- Calculation functions (totalBonuses, wealthTier)

### Integration Tests (Vitest + React Testing Library)
- Full animation sequences (trade → card flip → particles → sound)
- Monthly card flow (draw → select → apply effects)
- Skill progression (level 5 → path choice → level 10 → unlock)
- Employee bio lifecycle (hire → bio creation → monthly updates → quit → cleanup)

### Manual Testing Checklist
- [ ] Trade triggers 1.5s animation with particles + sound
- [ ] Dashboard updates every tick (200ms at base speed)
- [ ] Monthly cards present 3 options, enforce 2 selections
- [ ] Employee bio panel shows personality, goal progress, emotion
- [ ] Skill tree visualizes 2 paths, unlocked skills highlighted
- [ ] Event chain progresses weekly, shows "Week 2 of 4" indicator
- [ ] Wealth tax applies at 100M KRW, position limit at 1B KRW
- [ ] Bundle size <500KB (check `dist/assets/*.js`)
- [ ] 60 FPS maintained during trades (check DevTools Performance tab)
- [ ] Save/load preserves all new state (test v1 → v2 migration)

## Next Steps

After completing all phases:

1. **Run full test suite**: `npm test -- --coverage` (target >80% coverage)
2. **Performance audit**: `npm run build` → verify bundle <500KB, test 60 FPS on low-end device
3. **Accessibility audit**: Keyboard navigation, screen reader support for all new components
4. **Documentation update**: Update CLAUDE.md with new windows, entities, common gotchas
5. **Create tasks.md**: Use `/speckit.tasks` to generate implementation task breakdown

## Support

For questions or issues during implementation:
- Check `spec.md` for functional requirements
- Check `research.md` for technical decisions rationale
- Check `data-model.md` for entity relationships
- Review CLAUDE.md constitution for compliance
- Run `/speckit.clarify` if specification needs refinement

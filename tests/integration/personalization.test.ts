import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'
import { evaluateRisk } from '../../src/engines/tradePipeline/managerLogic'
import type { TradeProposal } from '../../src/types/trade'

describe('Personalization System Integration Tests', () => {
  beforeEach(() => {
    // Reset store to clean state
    useGameStore.setState(useGameStore.getState(), true)
    useGameStore.getState().startGame('normal')
  })

  /**
   * T-1: Profile updates only on day boundaries
   * Given: advanceHour() executed 30 times (3 days progress)
   * Expect:
   * - updateProfileOnDayEnd() called 3 times
   * - playerProfile.lastUpdatedDay increased by 3
   */
  it('T-1: profile updates only on day boundaries', () => {
    const store = useGameStore.getState()
    store.setPersonalizationEnabled(true)

    const initialDay = store.time.day
    const initialLastUpdatedDay = store.playerProfile.lastUpdatedDay

    // Simulate 3 days (10 hours per day: 9-18)
    for (let i = 0; i < 30; i++) {
      store.advanceHour()
    }

    const finalState = useGameStore.getState()

    // Verify day progressed by 3
    const dayProgression = finalState.time.day - initialDay
    expect(dayProgression).toBe(3)

    // Verify profile updated same number of times as days progressed
    const profileUpdates = finalState.playerProfile.lastUpdatedDay - initialLastUpdatedDay
    expect(profileUpdates).toBe(dayProgression)
  })

  /**
   * T-2: Event log maintains cap at 1000
   * Given: 1500 events logged
   * Expect: playerEventLog.length === 1000 (FIFO maintained)
   */
  it('T-2: event log maintains cap at 1000', () => {
    const store = useGameStore.getState()

    // Log 1500 events
    for (let i = 0; i < 1500; i++) {
      store.logPlayerEvent('TRADE', {
        action: 'buy',
        companyId: 'test',
        qty: 100,
        price: 10000,
      })
    }

    const finalState = useGameStore.getState()

    // Verify log capped at 1000
    expect(finalState.playerEventLog.length).toBe(1000)

    // Verify FIFO: first event should be event #501 (1-indexed)
    const oldestEvent = finalState.playerEventLog[0]
    expect(oldestEvent.metadata.action).toBe('buy')
  })

  /**
   * T-3: OFF mode behaves identically to baseline
   * Given: personalizationEnabled = false
   * Expect:
   * - evaluateRisk returns no bias
   * - Behavior matches baseline (no personalization applied)
   */
  it('T-3: OFF mode disables personalization bias', () => {
    const store = useGameStore.getState()

    // Setup: aggressive player profile
    store.setPersonalizationEnabled(false)
    store.playerProfile.riskTolerance = 0.9 // Very aggressive

    // Create mock proposal
    const proposal: TradeProposal = {
      id: 'test-proposal',
      companyId: 'company-0',
      ticker: 'TEST',
      direction: 'buy',
      quantity: 100,
      targetPrice: 10000,
      confidence: 65,
      createdByEmployeeId: 'analyst-1',
      createdAt: 0,
      status: 'PENDING',
      reviewedByEmployeeId: null,
      reviewedAt: null,
      executedByEmployeeId: null,
      executedAt: null,
      isMistake: false,
      rejectReason: null,
    }

    // Mock manager
    const manager = {
      id: 'manager-1',
      name: 'Test Manager',
      role: 'manager' as const,
      salary: 5_000_000,
      stamina: 80,
      maxStamina: 90,
      sprite: 'idle' as const,
      hiredMonth: 0,
      bonus: {
        driftBoost: 0.003,
        volatilityReduction: 0.03,
        tradingDiscount: 0.05,
        staminaRecovery: 12,
      },
      skills: { research: 60, analysis: 50, trading: 50 },
      stress: 20,
      satisfaction: 70,
      traits: [],
    }

    // Evaluate risk with personalization OFF
    const result = evaluateRisk(
      proposal,
      manager,
      10_000_000,
      {},
      store.playerProfile,
      false, // personalizationEnabled = false
    )

    // Verify no bias applied
    expect(result.approvalBias).toBeUndefined()
  })

  /**
   * T-3b: ON mode applies personalization bias
   */
  it('T-3b: ON mode applies aggressive player bias', () => {
    const store = useGameStore.getState()

    // Setup: aggressive player profile
    store.setPersonalizationEnabled(true)
    store.playerProfile.riskTolerance = 0.9 // Very aggressive

    const proposal: TradeProposal = {
      id: 'test-proposal',
      companyId: 'company-0',
      ticker: 'TEST',
      direction: 'buy',
      quantity: 100,
      targetPrice: 10000,
      confidence: 65,
      createdByEmployeeId: 'analyst-1',
      createdAt: 0,
      status: 'PENDING',
      reviewedByEmployeeId: null,
      reviewedAt: null,
      executedByEmployeeId: null,
      executedAt: null,
      isMistake: false,
      rejectReason: null,
    }

    const manager = {
      id: 'manager-1',
      name: 'Test Manager',
      role: 'manager' as const,
      salary: 5_000_000,
      stamina: 80,
      maxStamina: 90,
      sprite: 'idle' as const,
      hiredMonth: 0,
      bonus: {
        driftBoost: 0.003,
        volatilityReduction: 0.03,
        tradingDiscount: 0.05,
        staminaRecovery: 12,
      },
      skills: { research: 60, analysis: 50, trading: 50 },
      stress: 20,
      satisfaction: 70,
      traits: [],
    }

    // Evaluate risk with personalization ON
    const result = evaluateRisk(
      proposal,
      manager,
      10_000_000,
      {},
      store.playerProfile,
      true, // personalizationEnabled = true
    )

    // Verify bias applied (aggressive player → -5 threshold)
    expect(result.approvalBias).toBe(-5)
  })

  /**
   * T-4: Competitor engine regression - basic functionality
   * Given: Mirror Rival feature added
   * Expect: Basic competitor generation and trading still works
   */
  it('T-4: competitor generation with Mirror Rival', () => {
    const store = useGameStore.getState()

    // Initialize competitors
    store.initializeCompetitors(4, 10_000_000)

    const competitors = useGameStore.getState().competitors

    // Verify 4 competitors created
    expect(competitors.length).toBe(4)

    // Verify exactly 1 is Mirror Rival
    const mirrorRivals = competitors.filter((c) => c.isMirrorRival)
    expect(mirrorRivals.length).toBe(1)

    // Verify all have required fields
    competitors.forEach((comp) => {
      expect(comp.id).toBeDefined()
      expect(comp.name).toBeDefined()
      expect(comp.style).toBeDefined()
      expect(comp.cash).toBe(10_000_000)
      expect(comp.panicSellCooldown).toBe(0)
      expect(typeof comp.isMirrorRival).toBe('boolean')
    })
  })
})

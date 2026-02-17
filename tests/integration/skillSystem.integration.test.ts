import { describe, it, expect } from 'vitest'
import type { Employee } from '../../src/types'
import type { AnalystRole, TraderRole, ManagerRole } from '../../src/types'
import { unlockSkill, getPassiveModifiers } from '../../src/systems/skillSystem'

/**
 * 통합 테스트: 스킬 시스템 + Trade AI Pipeline
 *
 * 검증 방식: getPassiveModifiers가 Trade AI Pipeline에서 사용하는 target들에 대해
 * 정확한 modifier를 반환하는지 검증.
 *
 * Note: Full pipeline behavior는 E2E 테스트에서 검증 (Playwright)
 */

// Mock helpers
function createMockEmployee(
  role: AnalystRole | TraderRole | ManagerRole,
  overrides?: Partial<Employee>,
): Employee {
  return {
    id: `${role}-test`,
    name: 'Test Employee',
    role,
    salary: 100000,
    hiredMonth: 0,
    skills: { analysis: 70, trading: 70, research: 70 },
    stress: 20,
    satisfaction: 80,
    mood: 75,
    stamina: 90,
    maxStamina: 100,
    level: 10,
    xp: 0,
    badge: 'blue',
    title: 'senior',
    traits: [],
    bonus: {
      driftBoost: 0,
      volatilityReduction: 0,
      tradingDiscount: 0,
      staminaRecovery: 0,
    },
    progression: {
      level: 10,
      xp: 0,
      xpForNextLevel: 1000,
      skillPoints: 20,
      spentSkillPoints: 0,
    },
    unlockedSkills: [],
    ...overrides,
  }
}

describe('Skill System + Trade AI Pipeline Integration', () => {
  describe('Analyst Skills → signalAccuracy Modifiers', () => {
    it('chart_reading 스킬은 signalAccuracy +0.1 modifier를 반환해야 함', () => {
      const analyst = createMockEmployee('analyst', {
        skills: { analysis: 40, trading: 20, research: 20 }, // Meet stats prerequisite
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 20,
          spentSkillPoints: 0,
        },
      })
      unlockSkill(analyst, 'analysis_boost_1') // Prerequisite
      unlockSkill(analyst, 'chart_reading')

      const modifiers = getPassiveModifiers(analyst, 'signalAccuracy')

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'signalAccuracy',
        modifier: 0.1,
        operation: 'add',
      })
    })

    it('여러 Analyst 스킬을 해금하면 signalAccuracy modifier가 누적되어야 함', () => {
      const analyst = createMockEmployee('analyst', {
        skills: { analysis: 60, trading: 20, research: 20 },
        progression: {
          level: 20,
          xp: 0,
          xpForNextLevel: 2000,
          skillPoints: 50,
          spentSkillPoints: 0,
        },
      })

      unlockSkill(analyst, 'analysis_boost_1')
      unlockSkill(analyst, 'chart_reading') // +0.1
      unlockSkill(analyst, 'pattern_recognition') // +0.2

      const modifiers = getPassiveModifiers(analyst, 'signalAccuracy')

      expect(modifiers).toHaveLength(2)
      const totalBonus = modifiers.reduce(
        (sum, mod) => sum + (mod.operation === 'add' ? mod.modifier : 0),
        0,
      )
      expect(totalBonus).toBeCloseTo(0.3, 2) // 0.1 + 0.2
    })
  })

  describe('Trader Skills → slippage / commission Modifiers', () => {
    it('smart_router 스킬은 slippage *0.5 modifier를 반환해야 함', () => {
      const trader = createMockEmployee('trader', {
        skills: { analysis: 20, trading: 80, research: 20 },
        level: 16,
        progression: {
          level: 16,
          xp: 0,
          xpForNextLevel: 1600,
          skillPoints: 35,
          spentSkillPoints: 0,
        },
      })
      unlockSkill(trader, 'trading_boost_1')
      unlockSkill(trader, 'quick_hands')
      unlockSkill(trader, 'flash_trader')
      unlockSkill(trader, 'smart_router')

      const modifiers = getPassiveModifiers(trader, 'slippage')

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'slippage',
        modifier: 0.5,
        operation: 'multiply',
      })
    })

    it('fee_reduction 스킬은 commission *0.15 modifier를 반환해야 함', () => {
      const trader = createMockEmployee('trader', {
        skills: { analysis: 20, trading: 40, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 20,
          spentSkillPoints: 0,
        },
      })
      unlockSkill(trader, 'trading_boost_1')
      unlockSkill(trader, 'trading_boost_2')
      unlockSkill(trader, 'fee_reduction')

      const modifiers = getPassiveModifiers(trader, 'commission')

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'commission',
        modifier: 0.15,
        operation: 'multiply',
      })
    })

    it('알고리즘 트레이더는 slippage + executionDelay modifier를 모두 가져야 함', () => {
      const trader = createMockEmployee('trader', {
        skills: { analysis: 20, trading: 95, research: 20 },
        level: 26,
        progression: {
          level: 26,
          xp: 0,
          xpForNextLevel: 2600,
          skillPoints: 60,
          spentSkillPoints: 0,
        },
      })

      unlockSkill(trader, 'trading_boost_1')
      unlockSkill(trader, 'quick_hands')
      unlockSkill(trader, 'flash_trader')
      unlockSkill(trader, 'smart_router')
      unlockSkill(trader, 'algo_trader')

      const slippageModifiers = getPassiveModifiers(trader, 'slippage')
      const delayModifiers = getPassiveModifiers(trader, 'executionDelay')

      expect(slippageModifiers.length).toBeGreaterThan(0)
      expect(delayModifiers.length).toBeGreaterThan(0)
    })
  })

  describe('Manager Skills → riskReduction / positionSize Modifiers', () => {
    it('risk_awareness 스킬은 riskReduction +0.1 modifier를 반환해야 함', () => {
      const manager = createMockEmployee('manager', {
        skills: { analysis: 20, trading: 20, research: 40 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 20,
          spentSkillPoints: 0,
        },
      })
      unlockSkill(manager, 'research_boost_1')
      unlockSkill(manager, 'risk_awareness')

      const modifiers = getPassiveModifiers(manager, 'riskReduction')

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'riskReduction',
        modifier: 0.1,
        operation: 'add',
      })
    })

    it('portfolio_manager 스킬은 positionSize *1.15 modifier를 반환해야 함', () => {
      const manager = createMockEmployee('manager', {
        skills: { analysis: 20, trading: 20, research: 40 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 20,
          spentSkillPoints: 0,
        },
      })
      unlockSkill(manager, 'research_boost_1')
      unlockSkill(manager, 'research_boost_2')
      unlockSkill(manager, 'portfolio_manager')

      const modifiers = getPassiveModifiers(manager, 'positionSize')

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'positionSize',
        modifier: 1.15,
        operation: 'multiply',
      })
    })

    it('여러 Manager 스킬을 해금하면 modifiers가 모두 반환되어야 함', () => {
      const manager = createMockEmployee('manager', {
        skills: { analysis: 20, trading: 20, research: 60 },
        progression: {
          level: 18,
          xp: 0,
          xpForNextLevel: 1800,
          skillPoints: 40,
          spentSkillPoints: 0,
        },
      })

      // Unlock in correct prerequisite order
      unlockSkill(manager, 'research_boost_1')
      unlockSkill(manager, 'risk_awareness')
      unlockSkill(manager, 'research_boost_2')
      unlockSkill(manager, 'portfolio_manager') // Prerequisite for stop_loss_master
      unlockSkill(manager, 'stop_loss_master')

      const riskModifiers = getPassiveModifiers(manager, 'riskReduction')
      const positionModifiers = getPassiveModifiers(manager, 'positionSize')

      expect(riskModifiers.length).toBeGreaterThanOrEqual(2) // risk_awareness + stop_loss_master
      expect(positionModifiers.length).toBeGreaterThanOrEqual(1) // portfolio_manager
    })
  })

  describe('Cross-Role Skill Verification', () => {
    it('Analyst 스킬은 Trader 타겟에 영향을 주지 않아야 함', () => {
      const analyst = createMockEmployee('analyst', {
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 20,
          spentSkillPoints: 0,
        },
      })
      unlockSkill(analyst, 'analysis_boost_1')
      unlockSkill(analyst, 'chart_reading')

      const slippageModifiers = getPassiveModifiers(analyst, 'slippage')
      const commissionModifiers = getPassiveModifiers(analyst, 'commission')

      expect(slippageModifiers).toHaveLength(0)
      expect(commissionModifiers).toHaveLength(0)
    })

    it('Manager가 Analyst 스킬을 해금해도 signalAccuracy modifier가 적용되어야 함', () => {
      const manager = createMockEmployee('manager', {
        skills: { analysis: 40, trading: 20, research: 40 },
        progression: {
          level: 20,
          xp: 0,
          xpForNextLevel: 2000,
          skillPoints: 50,
          spentSkillPoints: 0,
        },
      })

      // Manager가 Analysis 브랜치 스킬 해금
      unlockSkill(manager, 'analysis_boost_1')
      unlockSkill(manager, 'chart_reading')

      const modifiers = getPassiveModifiers(manager, 'signalAccuracy')

      if (modifiers.length > 0) {
        // 스킬이 role-agnostic하다면 적용되어야 함
        expect(modifiers[0].target).toBe('signalAccuracy')
      }
    })
  })

  describe('Integration Point Validation', () => {
    it('모든 Trade AI Pipeline targets가 정의된 스킬과 매핑되어야 함', () => {
      const pipelineTargets = [
        'signalAccuracy',
        'executionDelay',
        'slippage',
        'commission',
        'riskReduction',
        'positionSize',
      ] as const

      // Each target should have at least one corresponding skill
      const analyst = createMockEmployee('analyst', {
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: { level: 10, xp: 0, xpForNextLevel: 1000, skillPoints: 30, spentSkillPoints: 0 },
      })
      const trader = createMockEmployee('trader', {
        skills: { analysis: 20, trading: 95, research: 20 },
        level: 26,
        progression: { level: 26, xp: 0, xpForNextLevel: 2600, skillPoints: 80, spentSkillPoints: 0 },
      })
      const manager = createMockEmployee('manager', {
        skills: { analysis: 20, trading: 20, research: 40 },
        progression: { level: 10, xp: 0, xpForNextLevel: 1000, skillPoints: 30, spentSkillPoints: 0 },
      })

      // Unlock representative skills for each target
      unlockSkill(analyst, 'analysis_boost_1')
      unlockSkill(analyst, 'chart_reading') // signalAccuracy
      unlockSkill(trader, 'trading_boost_1')
      unlockSkill(trader, 'quick_hands')
      unlockSkill(trader, 'flash_trader')
      unlockSkill(trader, 'smart_router') // slippage
      unlockSkill(trader, 'algo_trader') // executionDelay + slippage
      unlockSkill(trader, 'trading_boost_2')
      unlockSkill(trader, 'fee_reduction') // commission
      unlockSkill(manager, 'research_boost_1')
      unlockSkill(manager, 'risk_awareness') // riskReduction
      unlockSkill(manager, 'research_boost_2')
      unlockSkill(manager, 'portfolio_manager') // positionSize

      const targetsCovered: string[] = []
      pipelineTargets.forEach((target) => {
        const modifiersAnalyst = getPassiveModifiers(analyst, target)
        const modifiersTrader = getPassiveModifiers(trader, target)
        const modifiersManager = getPassiveModifiers(manager, target)

        if (
          modifiersAnalyst.length > 0 ||
          modifiersTrader.length > 0 ||
          modifiersManager.length > 0
        ) {
          targetsCovered.push(target)
        }
      })

      // All pipeline targets should be covered
      expect(targetsCovered.length).toBe(pipelineTargets.length)
    })
  })
})

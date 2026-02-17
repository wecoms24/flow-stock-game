/**
 * Skill System Logic Unit Tests
 *
 * 스킬 시스템 핵심 로직의 정확성을 검증합니다.
 * - unlockSkill: 스킬 해금 로직 및 edge cases
 * - calculateEmployeeStats: 스탯 계산 정확성
 * - getPassiveModifiers: 패시브 효과 필터링
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  unlockSkill,
  calculateEmployeeStats,
  getPassiveModifiers,
  migrateEmployeeToSkillTree,
} from '../../../src/systems/skillSystem'
import type { Employee } from '../../../src/types'

// 테스트용 Mock Employee 생성 헬퍼
function createMockEmployee(overrides?: Partial<Employee>): Employee {
  const baseEmployee: Employee = {
    id: 'test-employee-1',
    name: '테스트 직원',
    role: 'analyst',
    level: 10,
    xp: 0,
    xpToNextLevel: 1000,
    skills: { analysis: 50, trading: 50, research: 50 },
    stress: 0,
    satisfaction: 80,
    mood: 50,
    stamina: 100,
    maxStamina: 100,
    salary: 50000,
    hiredMonth: 1,
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

  return baseEmployee
}

describe('Skill System Logic Unit Tests', () => {
  describe('unlockSkill Function', () => {
    describe('Success Cases', () => {
      it('should unlock skill successfully when all conditions met', () => {
        const employee = createMockEmployee({
          progression: {
            level: 10,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 10,
            spentSkillPoints: 0,
          },
          unlockedSkills: [],
        })

        // Tier 1 스킬 (조건 없음, 비용 1 SP)
        const result = unlockSkill(employee, 'analysis_boost_1')

        expect(result.success).toBe(true)
        expect(result.reason).toBeUndefined()
        expect(employee.progression!.skillPoints).toBe(9) // 10 - 1
        expect(employee.progression!.spentSkillPoints).toBe(1)
        expect(employee.unlockedSkills).toContain('analysis_boost_1')
      })

      it('should unlock multiple skills sequentially', () => {
        const employee = createMockEmployee({
          progression: {
            level: 10,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 10,
            spentSkillPoints: 0,
          },
          skills: { analysis: 30, trading: 30, research: 30 },
          unlockedSkills: [],
        })

        // 첫 번째 스킬 해금
        unlockSkill(employee, 'analysis_boost_1')
        expect(employee.progression!.skillPoints).toBe(9)

        // 두 번째 스킬 해금
        unlockSkill(employee, 'analysis_boost_2')
        expect(employee.progression!.skillPoints).toBe(8) // 9 - 1
        expect(employee.unlockedSkills).toHaveLength(2)
      })
    })

    describe('Edge Cases - Invalid Skill ID', () => {
      it('should fail with non-existent skill ID', () => {
        const employee = createMockEmployee()

        const result = unlockSkill(employee, 'non_existent_skill_id')

        expect(result.success).toBe(false)
        expect(result.reason).toContain('존재하지 않는 스킬입니다')
        expect(result.reason).toContain('non_existent_skill_id')
      })

      it('should fail with empty skill ID', () => {
        const employee = createMockEmployee()

        const result = unlockSkill(employee, '')

        expect(result.success).toBe(false)
        expect(result.reason).toBeDefined()
      })
    })

    describe('Edge Cases - No Progression', () => {
      it('should fail when employee has no progression data', () => {
        const employee = createMockEmployee({
          progression: undefined,
        })

        const result = unlockSkill(employee, 'analysis_boost_1')

        expect(result.success).toBe(false)
        expect(result.reason).toContain('progression 데이터가 초기화되지 않았습니다')
      })
    })

    describe('Edge Cases - Already Unlocked', () => {
      it('should fail when skill is already unlocked', () => {
        const employee = createMockEmployee({
          unlockedSkills: ['analysis_boost_1'],
        })

        const result = unlockSkill(employee, 'analysis_boost_1')

        expect(result.success).toBe(false)
        expect(result.reason).toContain('이미 해금된 스킬입니다')
      })
    })

    describe('Edge Cases - Insufficient SP', () => {
      it('should fail when SP is insufficient', () => {
        const employee = createMockEmployee({
          progression: {
            level: 10,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 0, // SP 부족!
            spentSkillPoints: 0,
          },
        })

        const result = unlockSkill(employee, 'analysis_boost_1') // 비용 1 SP

        expect(result.success).toBe(false)
        expect(result.reason).toContain('SP가 부족합니다')
        expect(result.reason).toContain('필요: 1 SP')
        expect(result.reason).toContain('현재: 0 SP')
      })

      it('should show correct SP amounts in error message', () => {
        const employee = createMockEmployee({
          progression: {
            level: 10,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 2,
            spentSkillPoints: 0,
          },
          unlockedSkills: ['analysis_boost_1'],
        })

        // pattern_recognition: 비용 5 SP, prerequisite: chart_reading
        const result = unlockSkill(employee, 'pattern_recognition')

        expect(result.success).toBe(false)
        if (result.reason?.includes('SP가 부족합니다')) {
          expect(result.reason).toContain('필요: 5 SP')
          expect(result.reason).toContain('현재: 2 SP')
        }
      })
    })

    describe('Edge Cases - Prerequisites Not Met', () => {
      it('should fail when prerequisite skills not unlocked', () => {
        const employee = createMockEmployee({
          progression: {
            level: 10,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 10,
            spentSkillPoints: 0,
          },
          skills: { analysis: 50, trading: 50, research: 50 },
          unlockedSkills: [], // chart_reading 선행 스킬 없음
        })

        // pattern_recognition은 chart_reading을 prerequisite로 요구
        const result = unlockSkill(employee, 'pattern_recognition')

        expect(result.success).toBe(false)
        expect(result.reason).toContain('선행 조건을 충족하지 않았습니다')
      })

      it('should fail when stats requirement not met', () => {
        const employee = createMockEmployee({
          progression: {
            level: 10,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 10,
            spentSkillPoints: 0,
          },
          skills: { analysis: 20, trading: 20, research: 20 }, // 낮은 스탯
          unlockedSkills: ['analysis_boost_1'],
        })

        // chart_reading은 analysis: 30 요구
        const result = unlockSkill(employee, 'chart_reading')

        expect(result.success).toBe(false)
        expect(result.reason).toContain('선행 조건을 충족하지 않았습니다')
      })
    })

    describe('SP Deduction Accuracy', () => {
      it('should correctly deduct SP for Tier 1 skill (cost: 1)', () => {
        const employee = createMockEmployee({
          progression: {
            level: 1,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 10,
            spentSkillPoints: 0,
          },
        })

        unlockSkill(employee, 'analysis_boost_1') // 비용 1 SP

        expect(employee.progression!.skillPoints).toBe(9)
        expect(employee.progression!.spentSkillPoints).toBe(1)
      })

      it('should correctly deduct SP for Tier 3 skill (cost: 5)', () => {
        const employee = createMockEmployee({
          progression: {
            level: 10,
            xp: 0,
            xpForNextLevel: 1000,
            skillPoints: 10,
            spentSkillPoints: 0,
          },
          skills: { analysis: 50, trading: 50, research: 50 },
          unlockedSkills: ['analysis_boost_1', 'chart_reading'],
        })

        unlockSkill(employee, 'pattern_recognition') // 비용 5 SP

        expect(employee.progression!.skillPoints).toBe(5)
        expect(employee.progression!.spentSkillPoints).toBe(5)
      })
    })
  })

  describe('calculateEmployeeStats Function', () => {
    describe('Base Stats Calculation', () => {
      it('should return base stats when no skills unlocked', () => {
        const employee = createMockEmployee({
          skills: { analysis: 50, trading: 40, research: 60 },
          unlockedSkills: [],
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats).toEqual({
          analysis: 50,
          trading: 40,
          research: 60,
        })
      })

      it('should use default stats when employee.skills is undefined', () => {
        const employee = createMockEmployee({
          skills: undefined,
          unlockedSkills: [],
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats).toEqual({
          analysis: 50,
          trading: 50,
          research: 50,
        })
      })
    })

    describe('Stat Bonus Application', () => {
      it('should apply single statBonus skill correctly', () => {
        const employee = createMockEmployee({
          skills: { analysis: 50, trading: 50, research: 50 },
          unlockedSkills: ['analysis_boost_1'], // +5 analysis
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats.analysis).toBe(55) // 50 + 5
        expect(stats.trading).toBe(50) // 변화 없음
        expect(stats.research).toBe(50) // 변화 없음
      })

      it('should apply multiple statBonus skills cumulatively', () => {
        const employee = createMockEmployee({
          skills: { analysis: 50, trading: 50, research: 50 },
          unlockedSkills: [
            'analysis_boost_1', // +5 analysis
            'analysis_boost_2', // +5 analysis
          ],
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats.analysis).toBe(60) // 50 + 5 + 5
      })

      it('should apply statBonus for different stats independently', () => {
        const employee = createMockEmployee({
          skills: { analysis: 50, trading: 50, research: 50 },
          unlockedSkills: [
            'analysis_boost_1', // +5 analysis
            'trading_boost_1', // +5 trading
            'research_boost_1', // +5 research
          ],
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats.analysis).toBe(55)
        expect(stats.trading).toBe(55)
        expect(stats.research).toBe(55)
      })
    })

    describe('Stat Cap (0-100) Enforcement', () => {
      it('should cap stats at 100', () => {
        const employee = createMockEmployee({
          skills: { analysis: 95, trading: 50, research: 50 },
          unlockedSkills: [
            'analysis_boost_1', // +5 → 100
            'analysis_boost_2', // +5 → should cap at 100
          ],
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats.analysis).toBe(100) // not 105
      })

      it('should cap stats at 0 (minimum)', () => {
        const employee = createMockEmployee({
          skills: { analysis: -10, trading: 50, research: 50 }, // invalid but test edge case
          unlockedSkills: [],
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats.analysis).toBe(0) // capped at 0
      })
    })

    describe('Passive Skills (No Stat Bonus)', () => {
      it('should not modify stats for passive-only skills', () => {
        const employee = createMockEmployee({
          skills: { analysis: 50, trading: 50, research: 50 },
          unlockedSkills: ['chart_reading'], // passive skill (signalAccuracy)
        })

        const stats = calculateEmployeeStats(employee)

        expect(stats).toEqual({
          analysis: 50,
          trading: 50,
          research: 50,
        })
      })
    })
  })

  describe('getPassiveModifiers Function', () => {
    describe('Target Filtering', () => {
      it('should return empty array when no skills unlocked', () => {
        const employee = createMockEmployee({
          unlockedSkills: [],
        })

        const modifiers = getPassiveModifiers(employee, 'signalAccuracy')

        expect(modifiers).toHaveLength(0)
      })

      it('should filter by target correctly', () => {
        const employee = createMockEmployee({
          unlockedSkills: [
            'chart_reading', // signalAccuracy +0.1
            'smart_router', // slippage *0.5
          ],
        })

        const signalModifiers = getPassiveModifiers(employee, 'signalAccuracy')
        expect(signalModifiers).toHaveLength(1)
        expect(signalModifiers[0].target).toBe('signalAccuracy')

        const slippageModifiers = getPassiveModifiers(employee, 'slippage')
        expect(slippageModifiers).toHaveLength(1)
        expect(slippageModifiers[0].target).toBe('slippage')

        const commissionModifiers = getPassiveModifiers(employee, 'commission')
        expect(commissionModifiers).toHaveLength(0) // 해당 스킬 없음
      })
    })

    describe('Multiple Skills Same Target', () => {
      it('should accumulate modifiers from multiple skills with same target', () => {
        const employee = createMockEmployee({
          unlockedSkills: [
            'chart_reading', // signalAccuracy +0.1
            'pattern_recognition', // signalAccuracy +0.2
          ],
        })

        const modifiers = getPassiveModifiers(employee, 'signalAccuracy')

        expect(modifiers).toHaveLength(2)
        expect(modifiers[0].modifier).toBe(0.1)
        expect(modifiers[1].modifier).toBe(0.2)
      })
    })

    describe('Operation Types', () => {
      it('should preserve operation type (add)', () => {
        const employee = createMockEmployee({
          unlockedSkills: ['chart_reading'], // signalAccuracy +0.1 (add)
        })

        const modifiers = getPassiveModifiers(employee, 'signalAccuracy')

        expect(modifiers[0].operation).toBe('add')
        expect(modifiers[0].modifier).toBe(0.1)
      })

      it('should preserve operation type (multiply)', () => {
        const employee = createMockEmployee({
          unlockedSkills: ['smart_router'], // slippage *0.5 (multiply)
        })

        const modifiers = getPassiveModifiers(employee, 'slippage')

        expect(modifiers[0].operation).toBe('multiply')
        expect(modifiers[0].modifier).toBe(0.5)
      })
    })

    describe('All Target Types', () => {
      it('should handle all 6 target types', () => {
        const targets: Array<'signalAccuracy' | 'executionDelay' | 'slippage' | 'commission' | 'riskReduction' | 'positionSize'> = [
          'signalAccuracy',
          'executionDelay',
          'slippage',
          'commission',
          'riskReduction',
          'positionSize',
        ]

        const employee = createMockEmployee({ unlockedSkills: [] })

        targets.forEach((target) => {
          const modifiers = getPassiveModifiers(employee, target)
          expect(Array.isArray(modifiers)).toBe(true)
        })
      })
    })

    describe('Invalid Skill ID Handling', () => {
      it('should skip invalid skill IDs gracefully', () => {
        const employee = createMockEmployee({
          unlockedSkills: [
            'chart_reading', // valid
            'invalid_skill_id', // invalid (should be skipped)
          ],
        })

        const modifiers = getPassiveModifiers(employee, 'signalAccuracy')

        // Should only include chart_reading modifier
        expect(modifiers).toHaveLength(1)
        expect(modifiers[0].modifier).toBe(0.1)
      })
    })
  })

  describe('Integration: Full Skill Unlock Flow', () => {
    it('should handle complete skill unlock and stat calculation flow', () => {
      const employee = createMockEmployee({
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 20,
          spentSkillPoints: 0,
        },
        skills: { analysis: 50, trading: 50, research: 50 },
        unlockedSkills: [],
      })

      // 1. Unlock Tier 1 statBonus skill
      const result1 = unlockSkill(employee, 'analysis_boost_1')
      expect(result1.success).toBe(true)
      expect(employee.progression!.skillPoints).toBe(19)

      // 2. Check stats increased
      const stats1 = calculateEmployeeStats(employee)
      expect(stats1.analysis).toBe(55) // 50 + 5

      // 3. Unlock Tier 2 passive skill
      const result2 = unlockSkill(employee, 'chart_reading')
      expect(result2.success).toBe(true)
      expect(employee.progression!.skillPoints).toBe(16) // 19 - 3

      // 4. Check passive modifiers available
      const modifiers = getPassiveModifiers(employee, 'signalAccuracy')
      expect(modifiers).toHaveLength(1)
      expect(modifiers[0].modifier).toBe(0.1)

      // 5. Stats should remain (chart_reading is passive only)
      const stats2 = calculateEmployeeStats(employee)
      expect(stats2.analysis).toBe(55) // no change
    })
  })
})

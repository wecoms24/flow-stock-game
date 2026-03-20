/**
 * Skill Tree Data Integrity Tests
 *
 * 빌드타임에 스킬 트리의 구조적 무결성을 검증합니다.
 * - 순환 참조 검증
 * - prerequisite 스킬 ID 존재 검증
 * - 스킬 ID 포맷 검증
 */

import { describe, it, expect } from 'vitest'
import { SKILL_TREE } from '../../../src/data/skillTree'
import { validateSkillTree } from '../../../src/systems/skillSystem'

describe('Skill Tree Data Integrity', () => {
  describe('Circular Reference Detection', () => {
    it('should not have circular references in skill dependencies', () => {
      const validation = validateSkillTree()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      if (!validation.valid) {
        console.error('❌ Skill tree validation errors:', validation.errors)
      }
    })
  })

  describe('Prerequisite Skill ID Validation', () => {
    it('모든 prerequisite 스킬 ID는 SKILL_TREE에 존재해야 함', () => {
      const allSkillIds = Object.keys(SKILL_TREE)
      const invalidPrerequisites: Array<{ skillId: string; invalidPrereq: string }> = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        const prereqSkills = skill.prerequisites.skills ?? []

        prereqSkills.forEach((prereqId) => {
          if (!allSkillIds.includes(prereqId)) {
            invalidPrerequisites.push({ skillId, invalidPrereq: prereqId })
          }
        })
      })

      if (invalidPrerequisites.length > 0) {
        console.error('❌ Invalid prerequisite skill IDs found:', invalidPrerequisites)
      }

      expect(invalidPrerequisites).toHaveLength(0)
    })

    it('자기 자신을 prerequisite로 가질 수 없음', () => {
      const selfReferences: string[] = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        const prereqSkills = skill.prerequisites.skills ?? []

        if (prereqSkills.includes(skillId)) {
          selfReferences.push(skillId)
        }
      })

      if (selfReferences.length > 0) {
        console.error('❌ Skills with self-reference:', selfReferences)
      }

      expect(selfReferences).toHaveLength(0)
    })
  })

  describe('Skill ID Format Validation', () => {
    it('모든 스킬 ID는 snake_case 포맷이어야 함', () => {
      const invalidIds: string[] = []
      const snakeCaseRegex = /^[a-z]+(_[a-z0-9]+)*$/

      Object.keys(SKILL_TREE).forEach((skillId) => {
        if (!snakeCaseRegex.test(skillId)) {
          invalidIds.push(skillId)
        }
      })

      if (invalidIds.length > 0) {
        console.error('❌ Invalid skill ID format:', invalidIds)
      }

      expect(invalidIds).toHaveLength(0)
    })

    it('모든 스킬은 유효한 카테고리를 가져야 함', () => {
      const validCategories = ['analysis', 'trading', 'research']
      const invalidCategories: Array<{ skillId: string; category: string }> = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        if (!validCategories.includes(skill.category)) {
          invalidCategories.push({ skillId, category: skill.category })
        }
      })

      if (invalidCategories.length > 0) {
        console.error('❌ Invalid skill categories:', invalidCategories)
      }

      expect(invalidCategories).toHaveLength(0)
    })

    it('모든 스킬은 유효한 티어를 가져야 함 (1-5)', () => {
      const validTiers = [1, 2, 3, 4, 5]
      const invalidTiers: Array<{ skillId: string; tier: number }> = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        if (!validTiers.includes(skill.tier)) {
          invalidTiers.push({ skillId, tier: skill.tier })
        }
      })

      if (invalidTiers.length > 0) {
        console.error('❌ Invalid skill tiers:', invalidTiers)
      }

      expect(invalidTiers).toHaveLength(0)
    })
  })

  describe('Skill Tree Structure Validation', () => {
    it('모든 스킬은 name, emoji, description을 가져야 함', () => {
      const incompleteSkills: string[] = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        if (!skill.name || !skill.emoji || !skill.description) {
          incompleteSkills.push(skillId)
        }
      })

      if (incompleteSkills.length > 0) {
        console.error('❌ Incomplete skill definitions:', incompleteSkills)
      }

      expect(incompleteSkills).toHaveLength(0)
    })

    it('모든 스킬은 유효한 effect를 가져야 함', () => {
      const invalidEffects: string[] = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        const effect = skill.effect

        if (!effect || !effect.type) {
          invalidEffects.push(skillId)
          return
        }

        // statBonus 타입 검증
        if (effect.type === 'statBonus') {
          if (!effect.stat || !['analysis', 'trading', 'research'].includes(effect.stat)) {
            invalidEffects.push(`${skillId} (invalid stat)`)
          }
          if (typeof effect.value !== 'number') {
            invalidEffects.push(`${skillId} (invalid value)`)
          }
        }

        // passive 타입 검증
        if (effect.type === 'passive') {
          if (!Array.isArray(effect.effects) || effect.effects.length === 0) {
            invalidEffects.push(`${skillId} (no passive effects)`)
          }
        }
      })

      if (invalidEffects.length > 0) {
        console.error('❌ Invalid skill effects:', invalidEffects)
      }

      expect(invalidEffects).toHaveLength(0)
    })

    it('모든 스킬의 position은 유효한 row, col을 가져야 함', () => {
      const invalidPositions: string[] = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        const pos = skill.position

        if (!pos || typeof pos.row !== 'number' || typeof pos.col !== 'number') {
          invalidPositions.push(skillId)
        }
      })

      if (invalidPositions.length > 0) {
        console.error('❌ Invalid skill positions:', invalidPositions)
      }

      expect(invalidPositions).toHaveLength(0)
    })

    it('children 배열의 모든 스킬 ID는 실제 존재해야 함', () => {
      const allSkillIds = Object.keys(SKILL_TREE)
      const invalidChildren: Array<{ skillId: string; invalidChild: string }> = []

      Object.entries(SKILL_TREE).forEach(([skillId, skill]) => {
        skill.children.forEach((childId) => {
          if (!allSkillIds.includes(childId)) {
            invalidChildren.push({ skillId, invalidChild: childId })
          }
        })
      })

      if (invalidChildren.length > 0) {
        console.error('❌ Invalid child skill IDs:', invalidChildren)
      }

      expect(invalidChildren).toHaveLength(0)
    })
  })

  describe('Skill Tree Statistics', () => {
    it('스킬 트리 통계 출력 (정보 제공용)', () => {
      const totalSkills = Object.keys(SKILL_TREE).length
      const byCategory = {
        analysis: 0,
        trading: 0,
        research: 0,
      }
      const byTier = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
      }

      Object.values(SKILL_TREE).forEach((skill) => {
        byCategory[skill.category]++
        byTier[skill.tier]++
      })

      console.log('📊 Skill Tree Statistics:')
      console.log(`  Total Skills: ${totalSkills}`)
      console.log(`  By Category:`, byCategory)
      console.log(`  By Tier:`, byTier)

      // 통계 검증: 30 기본 + 6 브릿지 = 36
      expect(totalSkills).toBe(36)
      expect(byCategory.analysis).toBe(12) // 10 + 2 브릿지
      expect(byCategory.trading).toBe(12) // 10 + 2 브릿지
      expect(byCategory.research).toBe(12) // 10 + 2 브릿지
    })
  })
})

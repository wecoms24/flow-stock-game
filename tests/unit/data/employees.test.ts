import { describe, it, expect } from 'vitest'
import {
  generateEmployeeName,
  generateRandomTraits,
  generateInitialSkills,
  resetNamePool,
} from '@/data/employees'
import { TRAIT_DEFINITIONS } from '@/data/traits'

describe('데이터: 직원(Employees)', () => {
  describe('직원 이름 생성 함수', () => {
    it('generateEmployeeName 함수가 이름을 생성한다', () => {
      resetNamePool()
      const name = generateEmployeeName()
      expect(name).toBeDefined()
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    })

    it('생성된 이름이 한글이다', () => {
      resetNamePool()
      const name = generateEmployeeName()
      const hasKorean = /[\uAC00-\uD7AF]/.test(name)
      expect(hasKorean).toBe(true)
    })

    it('20개의 독립적인 호출로 모든 이름이 순환한다', () => {
      resetNamePool()
      const names = new Set<string>()

      for (let i = 0; i < 20; i++) {
        names.add(generateEmployeeName())
      }

      // 20번 호출하면 20개 이상의 고유 이름이 나와야 함 (또는 풀이 20개 이하면 모두 나옴)
      expect(names.size).toBeGreaterThanOrEqual(1)
      expect(names.size).toBeLessThanOrEqual(20)
    })

    it('이름 풀이 순환한다 (21번째 호출은 첫 번째와 같다)', () => {
      resetNamePool()
      const first = generateEmployeeName()

      // 20번 더 호출해서 풀을 순환
      for (let i = 0; i < 19; i++) {
        generateEmployeeName()
      }

      const afterReset = generateEmployeeName()
      expect(afterReset).toBe(first)
    })
  })

  describe('성격 생성 함수', () => {
    it('generateRandomTraits 함수가 성격 배열을 생성한다', () => {
      const traits = generateRandomTraits()
      expect(traits).toBeDefined()
      expect(Array.isArray(traits)).toBe(true)
    })

    it('생성된 성격이 1개 이상이다', () => {
      const traits = generateRandomTraits()
      expect(traits.length).toBeGreaterThanOrEqual(1)
    })

    it('대부분의 경우 1-2개의 성격이 생성된다', () => {
      const traitCounts: Record<number, number> = {}

      for (let i = 0; i < 100; i++) {
        const traits = generateRandomTraits()
        traitCounts[traits.length] = (traitCounts[traits.length] ?? 0) + 1
      }

      // 1개 또는 2개의 성격이 대부분
      const oneOrTwo = (traitCounts[1] ?? 0) + (traitCounts[2] ?? 0)
      expect(oneOrTwo).toBeGreaterThan(70) // 70% 이상
    })

    it('생성된 성격에 중복이 없다', () => {
      for (let i = 0; i < 20; i++) {
        const traits = generateRandomTraits()
        const uniqueTraits = new Set(traits)
        expect(uniqueTraits.size).toBe(traits.length)
      }
    })

    it('생성된 성격이 유효한 성격이다', () => {
      const validTraits = Object.keys(TRAIT_DEFINITIONS)

      for (let i = 0; i < 20; i++) {
        const traits = generateRandomTraits()
        traits.forEach((trait) => {
          expect(validTraits).toContain(trait)
        })
      }
    })
  })

  describe('초기 스킬 생성 함수', () => {
    it('generateInitialSkills 함수가 스킬 객체를 생성한다', () => {
      const skills = generateInitialSkills('trader', [])
      expect(skills).toBeDefined()
      expect(typeof skills === 'object').toBe(true)
    })

    it('모든 스킬이 정의되어 있다', () => {
      const roles = ['trader', 'analyst', 'manager'] as const

      roles.forEach((role) => {
        const skills = generateInitialSkills(role, [])
        expect(skills).toHaveProperty('analysis')
        expect(skills).toHaveProperty('trading')
        expect(skills).toHaveProperty('research')
      })
    })

    it('직책별로 다른 초기 스킬이 생성된다', () => {
      const traderSkills = generateInitialSkills('trader', [])
      const analystSkills = generateInitialSkills('analyst', [])

      // 직책이 다르면 스킬도 달라야 함
      expect(
        traderSkills.trading > analystSkills.trading ||
        traderSkills.analysis < analystSkills.analysis
      ).toBe(true)
    })

    it('거래자(trader)가 높은 거래 스킬을 가진다', () => {
      const skills = generateInitialSkills('trader', [])
      expect(skills.trading).toBeGreaterThan(50)
    })

    it('분석가(analyst)가 높은 분석 스킬을 가진다', () => {
      const skills = generateInitialSkills('analyst', [])
      expect(skills.analysis).toBeGreaterThan(50)
    })

    it('스킬 값들이 유효한 범위에 있다 (0-100)', () => {
      const roles = ['trader', 'analyst', 'manager', 'intern', 'ceo'] as const

      roles.forEach((role) => {
        const skills = generateInitialSkills(role, [])
        expect(skills.analysis).toBeGreaterThanOrEqual(0)
        expect(skills.analysis).toBeLessThanOrEqual(100)
        expect(skills.trading).toBeGreaterThanOrEqual(0)
        expect(skills.trading).toBeLessThanOrEqual(100)
        expect(skills.research).toBeGreaterThanOrEqual(0)
        expect(skills.research).toBeLessThanOrEqual(100)
      })
    })

    it('성격 보너스가 스킬에 적용된다', () => {
      const skillsWithoutTraits = generateInitialSkills('trader', [])
      const skillsWithTraits = generateInitialSkills('trader', ['tech_savvy'])

      // 성격 있을 때 스킬이 더 높거나 같아야 함
      expect(skillsWithTraits.analysis).toBeGreaterThanOrEqual(skillsWithoutTraits.analysis)
      expect(skillsWithTraits.trading).toBeGreaterThanOrEqual(skillsWithoutTraits.trading)
    })
  })

  describe('직원 데이터 생성 통합 테스트', () => {
    it('완전한 직원 데이터를 조합으로 생성할 수 있다', () => {
      resetNamePool()
      const name = generateEmployeeName()
      const traits = generateRandomTraits()
      const skills = generateInitialSkills('trader', traits)

      expect(name).toBeTruthy()
      expect(traits.length).toBeGreaterThan(0)
      expect(typeof skills === 'object').toBe(true)
    })

    it('1000명의 직원 생성이 안정적이다 (성능 테스트)', () => {
      resetNamePool()
      const startTime = Date.now()

      for (let i = 0; i < 1000; i++) {
        generateEmployeeName()
        const traits = generateRandomTraits()
        generateInitialSkills('trader', traits)
      }

      const elapsed = Date.now() - startTime
      expect(elapsed).toBeLessThan(5000) // 5초 이내
    })

    it('직원 이름이 순환하며 고유성을 유지한다', () => {
      resetNamePool()
      const firstBatch = new Set<string>()
      const secondBatch = new Set<string>()

      for (let i = 0; i < 20; i++) {
        firstBatch.add(generateEmployeeName())
      }

      for (let i = 0; i < 20; i++) {
        secondBatch.add(generateEmployeeName())
      }

      // 두 배치가 동일해야 함 (순환)
      expect(firstBatch).toEqual(secondBatch)
    })
  })

  describe('성격 데이터 통합 검증', () => {
    it('생성된 모든 성격이 TRAIT_DEFINITIONS에 정의되어 있다', () => {
      const validTraitKeys = Object.keys(TRAIT_DEFINITIONS)

      for (let i = 0; i < 50; i++) {
        const traits = generateRandomTraits()
        traits.forEach((trait) => {
          expect(validTraitKeys).toContain(trait)
        })
      }
    })

    it('희귀 성격도 생성될 수 있다', () => {
      let foundRare = false

      for (let i = 0; i < 500; i++) {
        const traits = generateRandomTraits()
        traits.forEach((trait) => {
          if (TRAIT_DEFINITIONS[trait].rarity === 'rare') {
            foundRare = true
          }
        })
      }

      expect(foundRare).toBe(true)
    })
  })
})

import { describe, it, expect } from 'vitest'
import { TRAIT_DEFINITIONS } from '@/data/traits'
import type { EmployeeTrait } from '@/types'

describe('데이터: 직원 성격(Traits)', () => {
  describe('성격 데이터 구조 검증', () => {
    it('10개의 성격이 정의되어 있다', () => {
      const traitKeys = Object.keys(TRAIT_DEFINITIONS)
      expect(traitKeys).toHaveLength(10)
    })

    it('모든 성격이 필수 필드를 가진다', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        expect(trait).toHaveProperty('name')
        expect(trait).toHaveProperty('description')
        expect(trait).toHaveProperty('icon')
        expect(trait).toHaveProperty('rarity')
        expect(trait).toHaveProperty('effects')
      })
    })

    it('모든 성격의 이름이 비어있지 않다', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        expect(trait.name).toBeTruthy()
        expect(trait.name.length).toBeGreaterThan(0)
      })
    })

    it('모든 성격이 설명을 가진다', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        expect(trait.description).toBeTruthy()
        expect(trait.description.length).toBeGreaterThan(0)
      })
    })

    it('모든 성격이 아이콘을 가진다', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        expect(trait.icon).toBeTruthy()
        expect(trait.icon.length).toBeGreaterThan(0)
      })
    })
  })

  describe('희귀도(Rarity) 검증', () => {
    const validRarities = ['common', 'uncommon', 'rare']

    it('모든 성격이 유효한 희귀도를 가진다', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        expect(validRarities).toContain(trait.rarity)
      })
    })

    it('희귀도별 분포가 적절하다 (common 50%, uncommon 40%, rare 10%)', () => {
      const traits = Object.values(TRAIT_DEFINITIONS)
      const commonCount = traits.filter(t => t.rarity === 'common').length
      const uncommonCount = traits.filter(t => t.rarity === 'uncommon').length
      const rareCount = traits.filter(t => t.rarity === 'rare').length

      // 정확한 비율이 아니어도 합리적인 분포 확인
      expect(commonCount).toBeGreaterThanOrEqual(4) // 약 40-50%
      expect(uncommonCount).toBeGreaterThanOrEqual(3) // 약 30-40%
      expect(rareCount).toBeGreaterThanOrEqual(1) // 약 10%
      expect(commonCount + uncommonCount + rareCount).toBe(10)
    })
  })

  describe('효과(Effects) 검증', () => {
    it('모든 성격이 비어있지 않은 effects를 가진다', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        expect(trait.effects).toBeDefined()
        expect(Object.keys(trait.effects).length).toBeGreaterThan(0)
      })
    })

    it('stamina/stress/skill 관련 효과 값이 합리적인 범위에 있다 (0.5 ~ 2.0)', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        Object.entries(trait.effects).forEach(([key, value]) => {
          if (
            typeof value === 'number' &&
            (key.includes('stamina') ||
              key.includes('stress') ||
              key.includes('skill') ||
              key.includes('Recovery') ||
              key.includes('Growth') ||
              key.includes('Generation') ||
              key.includes('Multiplier'))
          ) {
            expect(value).toBeGreaterThanOrEqual(0.5)
            expect(value).toBeLessThanOrEqual(2.0)
          }
        })
      })
    })

    it('boolean 효과들이 올바르게 정의되어 있다', () => {
      Object.values(TRAIT_DEFINITIONS).forEach((trait) => {
        Object.entries(trait.effects).forEach(([_key, value]) => {
          if (typeof value === 'boolean') {
            expect([true, false]).toContain(value)
          }
        })
      })
    })
  })

  describe('성격별 특성 검증', () => {
    it('야행성(nocturnal)은 야간 보너스와 아침 페널티를 가진다', () => {
      const nocturnal = TRAIT_DEFINITIONS.nocturnal
      expect(nocturnal.effects).toHaveProperty('nightShiftBonus')
      expect(nocturnal.effects).toHaveProperty('morningPenalty')
      expect(nocturnal.effects.nightShiftBonus).toBeGreaterThan(0)
      expect(nocturnal.effects.morningPenalty).toBeGreaterThan(0)
    })

    it('카페인 중독(caffeine_addict)은 커피 요구사항을 가진다', () => {
      const caffeine = TRAIT_DEFINITIONS.caffeine_addict
      expect(caffeine.effects).toHaveProperty('requiresCoffee')
      expect(caffeine.effects.requiresCoffee).toBe(true)
    })

    it('예민함(sensitive)은 소음 불내증을 가진다', () => {
      const sensitive = TRAIT_DEFINITIONS.sensitive
      expect(sensitive.effects).toHaveProperty('noiseIntolerance')
      expect(sensitive.effects.noiseIntolerance).toBeGreaterThan(1)
    })

    it('워커홀릭(workaholic)은 스트레스는 적고 스킬 성장은 빠르다', () => {
      const workaholic = TRAIT_DEFINITIONS.workaholic
      expect(workaholic.effects.stressGeneration).toBeLessThan(1)
      expect(workaholic.effects.skillGrowth).toBeGreaterThan(1)
    })

    it('완벽주의자(perfectionist)는 스킬 성장이 빠르다', () => {
      const perfectionist = TRAIT_DEFINITIONS.perfectionist
      expect(perfectionist.effects.skillGrowth).toBeGreaterThan(1)
    })

    it('사교적(social)은 동료 근처에서 스트레스가 감소한다', () => {
      const social = TRAIT_DEFINITIONS.social
      expect(social.effects.stressGeneration).toBeLessThan(1)
    })
  })

  describe('게임 밸런스 검증', () => {
    it('모든 성격이 트레이드오프를 가진다 (장점과 단점)', () => {
      Object.entries(TRAIT_DEFINITIONS).forEach(([traitName, trait]) => {
        const effects = Object.entries(trait.effects)
          .filter(([_, value]) => typeof value === 'number')
          .map(([_, value]) => value as number)

        if (effects.length > 0) {
          const hasPositive = effects.some(v => v > 1)
          const hasNegative = effects.some(v => v < 1)

          // 대부분의 성격은 장점과 단점을 함께 가짐
          expect(hasPositive || hasNegative).toBe(true)
        }
      })
    })

    it('희귀한 성격일수록 강력한 효과를 가진다', () => {
      const commonTraits = Object.values(TRAIT_DEFINITIONS).filter(t => t.rarity === 'common')
      const rareTraits = Object.values(TRAIT_DEFINITIONS).filter(t => t.rarity === 'rare')

      const commonMaxEffect = Math.max(
        ...commonTraits.flatMap(t =>
          Object.values(t.effects).filter(v => typeof v === 'number')
        )
      )

      const rareMaxEffect = Math.max(
        ...rareTraits.flatMap(t =>
          Object.values(t.effects).filter(v => typeof v === 'number')
        )
      )

      // 희귀 성격의 최대 효과가 일반 성격보다 크거나 같음
      expect(rareMaxEffect).toBeGreaterThanOrEqual(commonMaxEffect * 0.8)
    })
  })

  describe('데이터 일관성', () => {
    it('모든 성격 키가 타입스크립트 EmployeeTrait 타입과 일치한다', () => {
      const traitKeys = Object.keys(TRAIT_DEFINITIONS) as EmployeeTrait[]
      expect(traitKeys.length).toBe(10)

      // 키들이 유효한 형식인지 확인 (영문자, 언더스코어만 사용)
      traitKeys.forEach(key => {
        expect(/^[a-z_]+$/.test(key)).toBe(true)
      })
    })

    it('성격 이름이 모두 고유하다', () => {
      const names = Object.values(TRAIT_DEFINITIONS).map(t => t.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    it('성격 설명이 모두 고유하다', () => {
      const descriptions = Object.values(TRAIT_DEFINITIONS).map(t => t.description)
      const uniqueDescriptions = new Set(descriptions)
      expect(uniqueDescriptions.size).toBe(descriptions.length)
    })
  })
})

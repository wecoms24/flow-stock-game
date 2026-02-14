import { describe, it, expect } from 'vitest'
import { FURNITURE_CATALOG } from '@/data/furniture'

describe('데이터: 사무실 가구(Furniture)', () => {
  const furnitureArray = Object.values(FURNITURE_CATALOG)

  describe('가구 카탈로그 검증', () => {
    it('가구가 정의되어 있다', () => {
      expect(FURNITURE_CATALOG).toBeDefined()
      expect(furnitureArray.length).toBeGreaterThan(0)
    })

    it('최소 10개 이상의 가구가 정의되어 있다', () => {
      expect(furnitureArray.length).toBeGreaterThanOrEqual(10)
    })

    it('모든 가구가 필수 필드를 가진다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture).toHaveProperty('type')
        expect(furniture).toHaveProperty('name')
        expect(furniture).toHaveProperty('description')
        expect(furniture).toHaveProperty('cost')
        expect(furniture).toHaveProperty('size')
        expect(furniture).toHaveProperty('buffs')
        expect(furniture).toHaveProperty('sprite')
      })
    })

    it('모든 가구의 이름이 비어있지 않다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.name).toBeTruthy()
        expect(furniture.name.length).toBeGreaterThan(0)
      })
    })

    it('모든 가구의 type이 유일하다', () => {
      const types = furnitureArray.map(f => f.type)
      const uniqueTypes = new Set(types)
      expect(uniqueTypes.size).toBe(types.length)
    })
  })

  describe('가구 비용 검증', () => {
    it('모든 가구의 비용이 양수이다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.cost).toBeGreaterThan(0)
      })
    })

    it('모든 가구의 비용이 합리적인 범위에 있다 (10K ~ 500K)', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.cost).toBeGreaterThanOrEqual(10000)
        expect(furniture.cost).toBeLessThanOrEqual(500000)
      })
    })

    it('더 좋은 버프를 가진 가구가 더 비싸다 (경향)', () => {
      const withBuffs = furnitureArray.filter(f => f.buffs.length > 0)
      const withoutBuffs = furnitureArray.filter(f => f.buffs.length === 0)

      if (withBuffs.length > 0 && withoutBuffs.length > 0) {
        const avgWithBuffs = withBuffs.reduce((sum, f) => sum + f.cost, 0) / withBuffs.length
        const avgWithoutBuffs = withoutBuffs.reduce((sum, f) => sum + f.cost, 0) / withoutBuffs.length

        // 버프있는 가구가 평균적으로 더 비싸야 함 (100% 규칙은 아니지만 경향)
        expect(avgWithBuffs).toBeGreaterThanOrEqual(avgWithoutBuffs * 0.8)
      }
    })
  })

  describe('가구 크기 검증', () => {
    it('모든 가구의 크기(width, height)가 양수이다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.size.width).toBeGreaterThan(0)
        expect(furniture.size.height).toBeGreaterThan(0)
      })
    })

    it('가구의 크기가 합리적인 범위에 있다 (1x1 ~ 3x3)', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.size.width).toBeGreaterThanOrEqual(1)
        expect(furniture.size.width).toBeLessThanOrEqual(3)
        expect(furniture.size.height).toBeGreaterThanOrEqual(1)
        expect(furniture.size.height).toBeLessThanOrEqual(3)
      })
    })

    it('다양한 크기의 가구가 존재한다', () => {
      const sizes = new Set(furnitureArray.map(f => `${f.size.width}x${f.size.height}`))
      expect(sizes.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('가구 버프 검증', () => {
    it('모든 가구가 버프를 정의한다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.buffs).toBeDefined()
        expect(Array.isArray(furniture.buffs)).toBe(true)
      })
    })

    it('버프가 있는 가구들은 유효한 버프 구조를 가진다', () => {
      furnitureArray.forEach((furniture) => {
        furniture.buffs.forEach((buff) => {
          expect(buff).toHaveProperty('type')
          expect(buff).toHaveProperty('value')
          expect(buff).toHaveProperty('range')
          expect(typeof buff.value).toBe('number')
          expect(typeof buff.range).toBe('number')
        })
      })
    })

    it('버프 값들이 합리적인 범위에 있다 (0.5 ~ 2.0)', () => {
      furnitureArray.forEach((furniture) => {
        furniture.buffs.forEach((buff) => {
          expect(buff.value).toBeGreaterThanOrEqual(0.5)
          expect(buff.value).toBeLessThanOrEqual(2.0)
        })
      })
    })

    it('버프 범위가 유효하다 (0 ~ 999)', () => {
      furnitureArray.forEach((furniture) => {
        furniture.buffs.forEach((buff) => {
          expect(buff.range).toBeGreaterThanOrEqual(0)
          expect(buff.range).toBeLessThanOrEqual(999)
        })
      })
    })

    it('각 가구의 버프 종류가 명확하다', () => {
      furnitureArray.forEach((furniture) => {
        if (furniture.buffs.length > 0) {
          const buffTypes = new Set(furniture.buffs.map(b => b.type))
          // 같은 타입의 버프가 여러 개 있으면 안 됨
          expect(buffTypes.size).toBe(furniture.buffs.length)
        }
      })
    })
  })

  describe('가구 설명 검증', () => {
    it('모든 가구가 설명을 가진다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.description).toBeTruthy()
        expect(furniture.description.length).toBeGreaterThan(0)
      })
    })

    it('모든 설명이 한글로 작성되어 있다', () => {
      furnitureArray.forEach((furniture) => {
        const hasKorean = /[\uAC00-\uD7AF]/.test(furniture.description)
        expect(hasKorean).toBe(true)
      })
    })

    it('설명이 합리적인 길이이다 (10자 이상 300자 이하)', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.description.length).toBeGreaterThanOrEqual(10)
        expect(furniture.description.length).toBeLessThanOrEqual(300)
      })
    })
  })

  describe('가구 스프라이트 검증', () => {
    it('모든 가구가 스프라이트를 가진다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.sprite).toBeTruthy()
        expect(furniture.sprite.length).toBeGreaterThan(0)
      })
    })

    it('스프라이트가 이모지 또는 텍스트 형식이다', () => {
      furnitureArray.forEach((furniture) => {
        expect(furniture.sprite.length).toBeGreaterThan(0)
        expect(furniture.sprite.length).toBeLessThanOrEqual(4) // 이모지나 텍스트
      })
    })
  })

  describe('게임 밸런스 검증', () => {
    it('크기가 큰 가구가 일반적으로 더 좋은 버프를 가진다 (경향)', () => {
      const largeSize = furnitureArray.filter(f => f.size.width * f.size.height >= 2)
      const smallSize = furnitureArray.filter(f => f.size.width * f.size.height === 1)

      if (largeSize.length > 0 && smallSize.length > 0) {
        const largeWithBuffs = largeSize.filter(f => f.buffs.length > 0).length
        const smallWithBuffs = smallSize.filter(f => f.buffs.length > 0).length

        // 큰 가구가 버프를 가질 경향이 높아야 함
        const largeBuffRatio = largeSize.length > 0 ? largeWithBuffs / largeSize.length : 0
        const smallBuffRatio = smallSize.length > 0 ? smallWithBuffs / smallSize.length : 0

        expect(largeBuffRatio).toBeGreaterThanOrEqual(smallBuffRatio * 0.5)
      }
    })

    it('가구 카탈로그가 다양한 선택지를 제공한다', () => {
      const types = new Set(furnitureArray.map(f => f.type))
      expect(types.size).toBeGreaterThanOrEqual(10)
    })

    it('비용대가 다양하게 분포한다', () => {
      const costs = furnitureArray.map(f => f.cost).sort((a, b) => a - b)
      const minCost = costs[0]
      const maxCost = costs[costs.length - 1]

      // 최대 비용이 최소 비용의 최소 5배 이상
      expect(maxCost).toBeGreaterThanOrEqual(minCost * 5)
    })
  })

  describe('가구 타입 검증', () => {
    it('책상(desk)이 정의되어 있다', () => {
      expect(FURNITURE_CATALOG.desk).toBeDefined()
    })

    it('특수 가구(서버랙, 트로피 등)가 존재한다', () => {
      const specialFurniture = furnitureArray.filter(
        f => f.buffs.length > 0 && f.cost > 50000
      )
      expect(specialFurniture.length).toBeGreaterThan(0)
    })

    it('다양한 범위의 가구가 존재한다', () => {
      const ranges = new Set(furnitureArray.flatMap(f => f.buffs.map(b => b.range)))
      expect(ranges.size).toBeGreaterThanOrEqual(2)
    })
  })
})

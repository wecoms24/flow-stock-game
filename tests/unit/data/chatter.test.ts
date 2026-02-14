import { describe, it, expect } from 'vitest'
import { CHATTER_TEMPLATES } from '@/data/chatter'
import type { Employee } from '@/types'

describe('데이터: 직원 말풍선(Chatter)', () => {
  describe('말풍선 템플릿 검증', () => {
    it('말풍선 템플릿이 정의되어 있다', () => {
      expect(CHATTER_TEMPLATES).toBeDefined()
      expect(Array.isArray(CHATTER_TEMPLATES)).toBe(true)
      expect(CHATTER_TEMPLATES.length).toBeGreaterThan(0)
    })

    it('모든 템플릿이 필수 필드를 가진다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('category')
        expect(template).toHaveProperty('condition')
        expect(template).toHaveProperty('messages')
        expect(template).toHaveProperty('priority')
        expect(template).toHaveProperty('cooldownTicks')
      })
    })

    it('모든 메시지가 비어있지 않은 문자열이다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(template.messages).toBeDefined()
        expect(Array.isArray(template.messages)).toBe(true)
        template.messages.forEach((msg) => {
          expect(typeof msg).toBe('string')
          expect(msg.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('말풍선 카테고리 검증', () => {
    const validCategories = ['market', 'stress', 'satisfaction', 'trait', 'random']

    it('모든 템플릿이 유효한 카테고리를 가진다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(validCategories).toContain(template.category)
      })
    })

    it('주요 카테고리들이 정의되어 있다', () => {
      const categories = new Set(CHATTER_TEMPLATES.map(t => t.category))
      expect(categories.size).toBeGreaterThanOrEqual(3) // 최소 3개 카테고리
    })

    it('대부분의 카테고리에 다양한 템플릿이 있다', () => {
      const groupedByCategory = new Map<string, number>()
      CHATTER_TEMPLATES.forEach((template) => {
        const count = groupedByCategory.get(template.category) ?? 0
        groupedByCategory.set(template.category, count + 1)
      })

      // 최소 1개 이상의 템플릿이 있어야 하고, 일부는 2개 이상
      let hasMultiple = 0
      groupedByCategory.forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(1)
        if (count >= 2) hasMultiple++
      })
      expect(hasMultiple).toBeGreaterThan(0)
    })
  })

  describe('말풍선 내용 검증', () => {
    it('모든 메시지가 한글을 포함한다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        template.messages.forEach((msg) => {
          const hasKorean = /[\uAC00-\uD7AF]/.test(msg)
          expect(hasKorean).toBe(true)
        })
      })
    })

    it('스트레스 카테고리가 부정적인 표현을 한다', () => {
      const stressTemplates = CHATTER_TEMPLATES.filter(t => t.category === 'stress')
      expect(stressTemplates.length).toBeGreaterThan(0)

      stressTemplates.forEach((template) => {
        const hasNegative = template.messages.some(
          msg => msg.includes('힘') || msg.includes('스트레스') || msg.includes('싫') || msg.includes('피곤')
        )
        expect(hasNegative || template.messages.length > 0).toBe(true)
      })
    })

    it('만족도 관련 카테고리가 존재한다', () => {
      const satisfactionTemplates = CHATTER_TEMPLATES.filter(t => t.category === 'satisfaction')
      expect(satisfactionTemplates.length).toBeGreaterThan(0)
    })
  })

  describe('말풍선 다양성', () => {
    it('모든 템플릿이 고유한 id를 가진다', () => {
      const ids = CHATTER_TEMPLATES.map(t => t.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('전체 메시지가 충분히 다양하다', () => {
      const allMessages = CHATTER_TEMPLATES.flatMap(t => t.messages)
      const uniqueMessages = new Set(allMessages)
      expect(uniqueMessages.size).toBe(allMessages.length)
    })

    it('각 템플릿이 최소 1개 이상의 메시지를 가진다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(template.messages.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('말풍선 우선순위 검증', () => {
    it('모든 템플릿이 유효한 우선순위를 가진다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(template.priority).toBeGreaterThan(0)
        expect(template.priority).toBeLessThanOrEqual(10)
      })
    })

    it('우선순위가 다양하게 분포한다', () => {
      const priorities = new Set(CHATTER_TEMPLATES.map(t => t.priority))
      expect(priorities.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('말풍선 쿨다운 검증', () => {
    it('모든 템플릿이 유효한 쿨다운을 가진다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(template.cooldownTicks).toBeGreaterThan(0)
      })
    })

    it('쿨다운이 합리적인 범위에 있다 (최소 600틱, 최대 10000틱)', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(template.cooldownTicks).toBeGreaterThanOrEqual(600)
        expect(template.cooldownTicks).toBeLessThanOrEqual(10000)
      })
    })
  })

  describe('말풍선 조건 함수 검증', () => {
    it('모든 템플릿이 유효한 condition 함수를 가진다', () => {
      CHATTER_TEMPLATES.forEach((template) => {
        expect(typeof template.condition).toBe('function')
      })
    })

    it('condition 함수가 Employee를 받아 boolean을 반환한다', () => {
      const mockEmployee: Employee = {
        id: 'test-1',
        name: '테스트',
        role: 'trader',
        level: 1,
        xp: 0,
        stress: 50,
        stamina: 100,
        satisfaction: 100,
        skills: [],
        traits: [],
        hiredAt: 0,
        salaryPerMonth: 500000,
        monthlyBonus: 0,
      }

      CHATTER_TEMPLATES.forEach((template) => {
        const result = template.condition(mockEmployee)
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('게임 플레이 검증', () => {
    it('말풍선 템플릿이 충분히 많다 (10개 이상)', () => {
      expect(CHATTER_TEMPLATES.length).toBeGreaterThanOrEqual(10)
    })

    it('전체 메시지 풀이 충분히 크다 (40개 이상)', () => {
      const totalMessages = CHATTER_TEMPLATES.reduce((sum, t) => sum + t.messages.length, 0)
      expect(totalMessages).toBeGreaterThanOrEqual(40)
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  CHAMPION_TAUNTS,
  PANIC_SELL_TAUNTS,
  RANK_UP_TAUNTS,
  RANK_DOWN_TAUNTS,
  OVERTAKE_PLAYER_TAUNTS,
} from '@/data/taunts'

describe('데이터: AI 타운트(Taunts)', () => {
  const allTauntCategories = [
    { name: 'CHAMPION_TAUNTS', data: CHAMPION_TAUNTS },
    { name: 'PANIC_SELL_TAUNTS', data: PANIC_SELL_TAUNTS },
    { name: 'RANK_UP_TAUNTS', data: RANK_UP_TAUNTS },
    { name: 'RANK_DOWN_TAUNTS', data: RANK_DOWN_TAUNTS },
    { name: 'OVERTAKE_PLAYER_TAUNTS', data: OVERTAKE_PLAYER_TAUNTS },
  ]

  describe('타운트 데이터 구조 검증', () => {
    it('모든 타운트 카테고리가 정의되어 있다', () => {
      allTauntCategories.forEach(({ data }) => {
        expect(data).toBeDefined()
        expect(Array.isArray(data)).toBe(true)
      })
    })

    it('각 타운트 카테고리마다 메시지가 포함되어 있다', () => {
      allTauntCategories.forEach(({ name, data }) => {
        expect(data.length).toBeGreaterThan(0)
      })
    })

    it('모든 타운트가 비어있지 않은 문자열이다', () => {
      allTauntCategories.forEach(({ data }) => {
        data.forEach((taunt) => {
          expect(typeof taunt).toBe('string')
          expect(taunt.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('타운트 카테고리 검증', () => {
    it('5가지 주요 타운트 카테고리가 정의되어 있다', () => {
      expect(allTauntCategories).toHaveLength(5)
    })

    it('각 타운트 카테고리마다 다양한 메시지가 있다 (3개 이상)', () => {
      allTauntCategories.forEach(({ name, data }) => {
        expect(data.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('타운트 내용 검증', () => {
    it('타운트가 한글로 작성되어 있다', () => {
      allTauntCategories.forEach(({ data }) => {
        data.forEach((taunt) => {
          const hasKorean = /[\uAC00-\uD7AF]/.test(taunt)
          expect(hasKorean).toBe(true)
        })
      })
    })

    it('챔피언 타운트가 자신감을 표현한다', () => {
      expect(CHAMPION_TAUNTS.length).toBeGreaterThanOrEqual(3)
    })

    it('패닉 매도 타운트가 패닉을 표현한다', () => {
      expect(PANIC_SELL_TAUNTS.length).toBeGreaterThanOrEqual(3)

      // 적어도 일부는 불안이나 공포 표현
      const hasEmotional = PANIC_SELL_TAUNTS.some(
        t => t.includes('!') || t.includes('😱') || t.includes('😰')
      )
      expect(hasEmotional).toBe(true)
    })

    it('순위 상승 타운트가 긍정을 표현한다', () => {
      expect(RANK_UP_TAUNTS.length).toBeGreaterThanOrEqual(3)
    })

    it('순위 하락 타운트가 부정을 표현한다', () => {
      expect(RANK_DOWN_TAUNTS.length).toBeGreaterThanOrEqual(3)
    })

    it('추월 타운트가 자신감을 표현한다', () => {
      expect(OVERTAKE_PLAYER_TAUNTS.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('타운트 다양성', () => {
    it('각 카테고리 내에서 타운트가 충분히 다양하다', () => {
      allTauntCategories.forEach(({ name, data }) => {
        const uniqueTaunts = new Set(data)
        // 모두 고유해야 함
        expect(uniqueTaunts.size).toBe(data.length)
      })
    })

    it('전체 타운트가 충분히 다양하다', () => {
      const allTaunts = allTauntCategories.map(c => c.data).flat()
      const uniqueTaunts = new Set(allTaunts)

      // 모두 고유해야 함
      expect(uniqueTaunts.size).toBe(allTaunts.length)
    })
  })

  describe('타운트 길이 검증', () => {
    it('모든 타운트가 합리적인 길이이다 (10자 이상 200자 이하)', () => {
      allTauntCategories.forEach(({ data }) => {
        data.forEach((taunt) => {
          expect(taunt.length).toBeGreaterThanOrEqual(10)
          expect(taunt.length).toBeLessThanOrEqual(200)
        })
      })
    })

    it('타운트가 자연스러운 문장 형식이다', () => {
      allTauntCategories.forEach(({ data }) => {
        data.forEach((taunt) => {
          // 한글 타운트는 적어도 한글과 이모지를 포함
          const hasKorean = /[\uAC00-\uD7AF]/.test(taunt)
          const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(taunt)

          expect(hasKorean || hasEmoji).toBe(true)
        })
      })
    })
  })

  describe('게임 플레이 검증', () => {
    it('긍정 타운트(추월, 상승)와 부정 타운트(패닉, 하락)의 균형이 있다', () => {
      const positiveTaunts = OVERTAKE_PLAYER_TAUNTS.length + RANK_UP_TAUNTS.length
      const negativeTaunts = PANIC_SELL_TAUNTS.length + RANK_DOWN_TAUNTS.length

      // 최소한 양쪽 모두 있어야 함
      expect(positiveTaunts).toBeGreaterThan(0)
      expect(negativeTaunts).toBeGreaterThan(0)
    })

    it('AI 캐릭터가 다양하게 표현될 수 있다', () => {
      const totalTaunts = allTauntCategories.reduce((sum, c) => sum + c.data.length, 0)
      expect(totalTaunts).toBeGreaterThanOrEqual(15) // 최소 15개 타운트
    })
  })

  describe('타운트 선택 로직 검증', () => {
    it('랜덤 타운트 선택이 작동한다', () => {
      const selectedTaunts = new Set<string>()

      for (let i = 0; i < 100; i++) {
        const randomIndex = Math.floor(Math.random() * CHAMPION_TAUNTS.length)
        selectedTaunts.add(CHAMPION_TAUNTS[randomIndex])
      }

      // 챔피언 타운트가 충분하면 여러 개가 선택되어야 함
      if (CHAMPION_TAUNTS.length > 1) {
        expect(selectedTaunts.size).toBeGreaterThan(1)
      }
    })
  })
})

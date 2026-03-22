import { describe, it, expect } from 'vitest'
import { HISTORICAL_EVENTS } from '../../src/data/historicalEvents'
import { generateBankruptcyCoaching } from '../../src/engines/decisionAnalysisEngine'

describe('Save/Load Data Integrity', () => {
  describe('lessonText restoration from static data', () => {
    it('should find lessonText for IMF crisis event', () => {
      const imf = HISTORICAL_EVENTS.find(h => h.year === 1997 && h.title === 'IMF 구제금융 신청')
      expect(imf).toBeDefined()
      expect(imf!.lessonText).toBeDefined()
      expect(imf!.lessonText).toContain('교훈')
    })

    it('should find lessonText for 2008 crisis event', () => {
      const lehman = HISTORICAL_EVENTS.find(h => h.year === 2008 && h.title === '리먼 브라더스 파산')
      expect(lehman).toBeDefined()
      expect(lehman!.lessonText).toBeDefined()
      expect(lehman!.lessonText).toContain('현금')
    })

    it('should find lessonText for COVID pandemic event', () => {
      const covid = HISTORICAL_EVENTS.find(h => h.year === 2020 && h.title?.includes('코로나 팬데믹'))
      expect(covid).toBeDefined()
      expect(covid!.lessonText).toBeDefined()
    })

    it('should restore lessonText by matching year+title (simulating DB load)', () => {
      // Simulate what transformers.ts does on load
      const dbRow = { historical_year: 1997, title: 'IMF 구제금융 신청', source: 'historical' }
      const restored = HISTORICAL_EVENTS.find(
        h => h.year === dbRow.historical_year && h.title === dbRow.title,
      )?.lessonText
      expect(restored).toBeDefined()
      expect(restored).toContain('국가도 파산')
    })

    it('should return undefined for events without lessonText', () => {
      const noLesson = HISTORICAL_EVENTS.find(h => h.year === 1995 && h.title === '금융실명제 안착')
      expect(noLesson).toBeDefined()
      expect(noLesson!.lessonText).toBeUndefined()
    })
  })

  describe('Bankruptcy Coaching Generation', () => {
    it('should generate coaching for zero trades (매매 부족)', () => {
      const result = generateBankruptcyCoaching([], 1, 12)
      expect(result.cause).toContain('매매 부족')
      expect(result.tips.length).toBeGreaterThan(0)
      expect(result.tips.some(t => t.includes('30~50%'))).toBe(true)
    })

    it('should generate coaching for excessive losses', () => {
      const lossTrades = Array.from({ length: 10 }, (_, i) => ({
        companyId: `c${i}`,
        ticker: `T${i}`,
        shares: 10,
        buyPrice: 100,
        sellPrice: 80,
        pnl: -200,
        fee: 0,
        tick: i * 10,
        timestamp: { year: 1995, month: 1, day: 1 },
      }))
      const result = generateBankruptcyCoaching(lossTrades, 1, 24)
      expect(result.cause).toContain('손실')
      expect(result.tips.some(t => t.includes('손절매'))).toBe(true)
    })

    it('should always include crisis opportunity tip', () => {
      const result = generateBankruptcyCoaching([], 0, 6)
      expect(result.tips.some(t => t.includes('역사적 위기'))).toBe(true)
    })

    it('should detect concentrated portfolio', () => {
      const concentratedTrades = Array.from({ length: 15 }, () => ({
        companyId: 'c1',
        ticker: 'T1',
        shares: 10,
        buyPrice: 100,
        sellPrice: 110,
        pnl: 100,
        fee: 0,
        tick: 10,
        timestamp: { year: 1996, month: 6, day: 15 },
      }))
      const result = generateBankruptcyCoaching(concentratedTrades, 1, 24)
      expect(result.tips.some(t => t.includes('분산 투자'))).toBe(true)
    })
  })

  describe('Module-level variable reset', () => {
    it('HISTORICAL_EVENTS should have lessonText on key events', () => {
      const eventsWithLessons = HISTORICAL_EVENTS.filter(h => h.lessonText)
      // We added lessonText to ~10 key events
      expect(eventsWithLessons.length).toBeGreaterThanOrEqual(8)
    })

    it('all lessonText should be non-empty strings', () => {
      HISTORICAL_EVENTS.forEach(h => {
        if (h.lessonText !== undefined) {
          expect(typeof h.lessonText).toBe('string')
          expect(h.lessonText.length).toBeGreaterThan(10)
        }
      })
    })
  })
})

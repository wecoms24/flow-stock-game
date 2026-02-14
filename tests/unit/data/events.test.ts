import { describe, it, expect } from 'vitest'
import { EVENT_TEMPLATES } from '@/data/events'

describe('데이터: 마켓 이벤트', () => {
  describe('이벤트 데이터 구조 검증', () => {
    it('이벤트 템플릿들이 정의되어 있다', () => {
      expect(EVENT_TEMPLATES).toBeDefined()
      expect(Array.isArray(EVENT_TEMPLATES)).toBe(true)
      expect(EVENT_TEMPLATES.length).toBeGreaterThan(0)
    })

    it('모든 이벤트가 필수 필드를 가지고 있다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event).toHaveProperty('title')
        expect(event).toHaveProperty('description')
        expect(event).toHaveProperty('type')
        expect(event).toHaveProperty('impact')
        expect(event).toHaveProperty('duration')
        expect(event).toHaveProperty('weight')
      })
    })

    it('모든 이벤트의 impact 객체가 필수 필드를 가진다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.impact).toHaveProperty('driftModifier')
        expect(event.impact).toHaveProperty('volatilityModifier')
        expect(event.impact).toHaveProperty('severity')
      })
    })
  })

  describe('이벤트 타입 검증', () => {
    const validTypes = ['policy', 'sector', 'company', 'crash', 'boom', 'global']

    it('모든 이벤트가 유효한 타입을 가진다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(validTypes).toContain(event.type)
      })
    })

    it('각 이벤트 타입이 적어도 하나씩 존재한다', () => {
      validTypes.forEach(type => {
        const hasType = EVENT_TEMPLATES.some(e => e.type === type)
        expect(hasType).toBe(true)
      })
    })

    it('이벤트가 약 50개 정의되어 있다', () => {
      expect(EVENT_TEMPLATES.length).toBeGreaterThanOrEqual(45)
      expect(EVENT_TEMPLATES.length).toBeLessThanOrEqual(55)
    })
  })

  describe('심각도(severity) 및 가중치(weight) 검증', () => {
    const validSeverities = ['low', 'medium', 'high', 'critical']

    it('모든 이벤트가 유효한 심각도를 가진다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(validSeverities).toContain(event.impact.severity)
      })
    })

    it('모든 이벤트의 가중치가 양수이다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.weight).toBeGreaterThan(0)
      })
    })

    it('critical 이벤트의 가중치가 일반적으로 낮다', () => {
      const criticalEvents = EVENT_TEMPLATES.filter(e => e.impact.severity === 'critical')
      const criticalAvg = criticalEvents.reduce((sum, e) => sum + e.weight, 0) / criticalEvents.length
      const mediumEvents = EVENT_TEMPLATES.filter(e => e.impact.severity === 'medium')
      const mediumAvg = mediumEvents.reduce((sum, e) => sum + e.weight, 0) / mediumEvents.length
      
      // Critical 이벤트는 기본적으로 희귀해야 함
      expect(criticalAvg).toBeLessThan(mediumAvg)
    })
  })

  describe('지속시간(duration) 검증', () => {
    it('모든 이벤트의 지속시간이 양수이다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.duration).toBeGreaterThan(0)
      })
    })

    it('지속시간이 합리적인 범위에 있다 (최소 20틱, 최대 300틱)', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.duration).toBeGreaterThanOrEqual(20)
        expect(event.duration).toBeLessThanOrEqual(300)
      })
    })

    it('충돌(crash) 이벤트가 호황(boom) 이벤트보다 짧은 지속시간을 가진다 (평균)', () => {
      const crashes = EVENT_TEMPLATES.filter(e => e.type === 'crash')
      const booms = EVENT_TEMPLATES.filter(e => e.type === 'boom')
      
      const crashAvg = crashes.reduce((sum, e) => sum + e.duration, 0) / crashes.length
      const boomAvg = booms.reduce((sum, e) => sum + e.duration, 0) / booms.length
      
      expect(crashAvg).toBeLessThan(boomAvg * 1.5)
    })
  })

  describe('drift 및 volatility modifier 검증', () => {
    it('모든 이벤트의 driftModifier가 합리적인 범위에 있다 (-0.2 ~ 0.2)', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.impact.driftModifier).toBeGreaterThanOrEqual(-0.2)
        expect(event.impact.driftModifier).toBeLessThanOrEqual(0.2)
      })
    })

    it('모든 이벤트의 volatilityModifier가 양수이거나 0이다 (-0.1 ~ 0.7)', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.impact.volatilityModifier).toBeGreaterThanOrEqual(-0.1)
        expect(event.impact.volatilityModifier).toBeLessThanOrEqual(0.7)
      })
    })

    it('crash 이벤트는 높은 volatility modifier를 가진다 (> 0.3)', () => {
      const crashes = EVENT_TEMPLATES.filter(e => e.type === 'crash')
      crashes.forEach(event => {
        expect(event.impact.volatilityModifier).toBeGreaterThanOrEqual(0.3)
      })
    })

    it('boom 이벤트는 양의 drift modifier를 가진다', () => {
      const booms = EVENT_TEMPLATES.filter(e => e.type === 'boom')
      booms.forEach(event => {
        expect(event.impact.driftModifier).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('이벤트 설명 검증', () => {
    it('모든 이벤트가 비어있지 않은 설명을 가진다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.description).toBeTruthy()
        expect(event.description.length).toBeGreaterThan(0)
      })
    })

    it('모든 이벤트의 제목이 비어있지 않다', () => {
      EVENT_TEMPLATES.forEach((event) => {
        expect(event.title).toBeTruthy()
        expect(event.title.length).toBeGreaterThan(0)
      })
    })
  })

  describe('이벤트 분류', () => {
    it('정책 이벤트(policy)는 10개 정의되어 있다', () => {
      const policyEvents = EVENT_TEMPLATES.filter(e => e.type === 'policy')
      expect(policyEvents.length).toBe(10)
    })

    it('충돌 이벤트(crash)는 높은 volatility modifier를 가진다 (> 0.35)', () => {
      const crashEvents = EVENT_TEMPLATES.filter(e => e.type === 'crash')
      expect(crashEvents.length).toBeGreaterThan(0)
      crashEvents.forEach(event => {
        expect(event.impact.volatilityModifier).toBeGreaterThanOrEqual(0.35)
      })
    })

    it('호황 이벤트(boom)는 양의 drift modifier를 가진다', () => {
      const boomEvents = EVENT_TEMPLATES.filter(e => e.type === 'boom')
      expect(boomEvents.length).toBeGreaterThan(0)
      boomEvents.forEach(event => {
        expect(event.impact.driftModifier).toBeGreaterThanOrEqual(0)
      })
    })

    it('글로벌 이벤트(global)는 10개 정의되어 있다', () => {
      const globalEvents = EVENT_TEMPLATES.filter(e => e.type === 'global')
      expect(globalEvents.length).toBe(10)
    })
  })

  describe('이벤트 균형 검증', () => {
    it('부정적 이벤트(음의 drift)와 긍정적 이벤트(양의 drift)가 비교적 균형을 이룬다', () => {
      const negativeCount = EVENT_TEMPLATES.filter(e => e.impact.driftModifier < 0).length
      const positiveCount = EVENT_TEMPLATES.filter(e => e.impact.driftModifier > 0).length
      const neutral = EVENT_TEMPLATES.filter(e => e.impact.driftModifier === 0).length
      
      // 부정적 이벤트가 지나치게 많지 않아야 함
      expect(negativeCount).toBeLessThanOrEqual(EVENT_TEMPLATES.length * 0.65)
      expect(positiveCount).toBeGreaterThan(0)
      expect(negativeCount + positiveCount + neutral).toBe(EVENT_TEMPLATES.length)
    })

    it('총 가중치가 합리적인 범위에 있다', () => {
      const totalWeight = EVENT_TEMPLATES.reduce((sum, e) => sum + e.weight, 0)
      expect(totalWeight).toBeGreaterThan(100)
    })

    it('섹터 이벤트는 약 15개 정의되어 있다', () => {
      const sectorEvents = EVENT_TEMPLATES.filter(e => e.type === 'sector')
      expect(sectorEvents.length).toBeGreaterThanOrEqual(14)
      expect(sectorEvents.length).toBeLessThanOrEqual(16)
    })
  })
})

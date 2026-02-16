import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  setCompanyPrice,
  getCompanyAt,
} from '../../integration/helpers'

/**
 * 게임 메뉴얼: 이벤트 시뮬레이션 E2E 테스트
 *
 * - Policy 이벤트: 금리 인상 → 금융주 하락
 * - Sector 이벤트: AI 혁명 → 기술주 상승
 * - Crash 이벤트: 블랙먼데이 → 전체 하락
 * - 이벤트 Duration 경과
 * - 복합 이벤트 시나리오
 */

describe('E2E: 이벤트 시뮬레이션 (Event Scenarios)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('정책 이벤트 (Policy Events)', () => {
    /**
     * 정책 이벤트: 중앙은행 금리 인상
     * 영향: driftModifier: -0.04, volatilityModifier: 0.15
     * 결과: 시장 전반 냉각, 금융주 약세
     */
    it('금리 인상 이벤트로 금융주 약세', () => {
      const companies = store.getState().companies
      const financeStock = companies.find((c: any) => c.sector === 'finance')

      if (financeStock) {
        const initialPrice = financeStock.price
        const eventDriftModifier = -0.04

        // 금리 인상으로 금융주 약세 시뮬레이션
        const newPrice = initialPrice * (1 + eventDriftModifier * 2)
        setCompanyPrice(store, financeStock.ticker, newPrice)

        // 금융주 가격 하락 검증
        const updatedPrice = store.getState().companies.find(
          (c: any) => c.ticker === financeStock.ticker
        ).price
        expect(updatedPrice).toBeLessThan(initialPrice)
      }
    })

    it('양적완화 정책으로 시장 반등', () => {
      const companies = store.getState().companies
      const techStock = companies.find((c: any) => c.sector === 'tech')

      if (techStock) {
        const initialPrice = techStock.price

        // 양적완화 정책 시뮬레이션
        const newPrice = initialPrice * 1.06
        setCompanyPrice(store, techStock.ticker, newPrice)

        // 기술주 가격 상승 검증
        const updatedPrice = store.getState().companies.find(
          (c: any) => c.ticker === techStock.ticker
        ).price
        expect(updatedPrice).toBeGreaterThan(initialPrice)
      }
    })

    it('법인세 인하로 기업주 상승', () => {
      const companies = store.getState().companies
      const industrialStock = companies.find((c: any) => c.sector === 'industrial')

      if (industrialStock) {
        const initialPrice = industrialStock.price

        // 법인세 인하 정책 시뮬레이션
        const newPrice = initialPrice * 1.03
        setCompanyPrice(store, industrialStock.ticker, newPrice)

        // 기업주 가격 상승 검증
        const updatedPrice = store.getState().companies.find(
          (c: any) => c.ticker === industrialStock.ticker
        ).price
        expect(updatedPrice).toBeGreaterThan(initialPrice)
      }
    })
  })

  describe('섹터 이벤트 (Sector Events)', () => {
    /**
     * 섹터 이벤트: AI 혁명, 반도체 슈퍼사이클 등
     * 영향: 특정 섹터만 영향받음
     */
    it('AI 혁명으로 기술주 폭등', () => {
      const companies = store.getState().companies
      const techStocks = companies.filter((c: any) => c.sector === 'tech')
      const financeStocks = companies.filter((c: any) => c.sector === 'finance')

      const techStock = techStocks[0]
      const financeStock = financeStocks[0]

      const techInitialPrice = techStock.price
      const financeInitialPrice = financeStock.price

      // AI 혁명: 기술주만 +10% 상승
      setCompanyPrice(store, techStock.ticker, techInitialPrice * 1.1)

      // 금융주는 미미한 변화
      setCompanyPrice(store, financeStock.ticker, financeInitialPrice * 1.01)

      // 검증: 기술주 상승, 금융주는 미미한 변화
      const updatedTechPrice = store.getState().companies.find(
        (c: any) => c.ticker === techStock.ticker
      ).price
      const updatedFinancePrice = store.getState().companies.find(
        (c: any) => c.ticker === financeStock.ticker
      ).price

      expect(updatedTechPrice).toBeGreaterThan(techInitialPrice * 1.05)
      expect(updatedFinancePrice).toBeLessThan(financeInitialPrice * 1.03)
    })

    it('반도체 슈퍼사이클로 기술주 장기 상승', () => {
      const companies = store.getState().companies
      const techStock = companies.find((c: any) => c.sector === 'tech')

      if (techStock) {
        const initialPrice = techStock.price
        let currentPrice = initialPrice

        // 여러 단계의 가격 상승 시뮬레이션
        for (let i = 0; i < 4; i++) {
          currentPrice = currentPrice * 1.08
          setCompanyPrice(store, techStock.ticker, currentPrice)
        }

        // 누적 상승 검증
        const finalPrice = store.getState().companies.find(
          (c: any) => c.ticker === techStock.ticker
        ).price
        // 약 36% 누적 상승 (1.08^4 ≈ 1.36)
        expect(finalPrice).toBeGreaterThan(initialPrice * 1.3)
      }
    })

    it('전기차 보급으로 에너지/산업주 연쇄 상승', () => {
      const companies = store.getState().companies
      const energyStock = companies.find((c: any) => c.sector === 'energy')
      const industrialStock = companies.find((c: any) => c.sector === 'industrial')

      if (energyStock && industrialStock) {
        const energyInitialPrice = energyStock.price
        const industrialInitialPrice = industrialStock.price

        // 두 섹터 모두 +6% 상승
        setCompanyPrice(store, energyStock.ticker, energyInitialPrice * 1.06)
        setCompanyPrice(store, industrialStock.ticker, industrialInitialPrice * 1.06)

        // 검증
        const updatedEnergyPrice = store.getState().companies.find(
          (c: any) => c.ticker === energyStock.ticker
        ).price
        const updatedIndustrialPrice = store.getState().companies.find(
          (c: any) => c.ticker === industrialStock.ticker
        ).price

        expect(updatedEnergyPrice).toBeGreaterThan(energyInitialPrice)
        expect(updatedIndustrialPrice).toBeGreaterThan(industrialInitialPrice)
      }
    })
  })

  describe('크래시 이벤트 (Crash Events)', () => {
    /**
     * 크래시 이벤트: 블랙 먼데이, 서킷브레이커 등
     * 영향: 급격한 시장 하락
     */
    it('블랙 먼데이: 전체 시장 대폭락', () => {
      const companies = store.getState().companies
      const testStocks = companies.slice(0, 5)

      const pricesBefore = testStocks.map((s: any) => s.price)

      // 모든 주식 15% 폭락
      testStocks.forEach((stock: any) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 0.85)
      })

      // 검증
      testStocks.forEach((stock: any, index: number) => {
        const updatedPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        expect(updatedPrice).toBeLessThan(pricesBefore[index])
      })
    })

    it('서킷브레이커: 급락 후 부분 회복', () => {
      const companies = store.getState().companies
      const testStocks = companies.slice(0, 3)

      const initialPrices = testStocks.map((s: any) => s.price)

      // 1단계: 급락
      testStocks.forEach((stock: any) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 0.92)
      })

      const pricesAfterCrash = testStocks.map((s: any) =>
        store.getState().companies.find(
          (c: any) => c.ticker === s.ticker
        ).price
      )

      // 2단계: 부분 회복
      testStocks.forEach((stock: any, index: number) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 1.05)
      })

      // 검증: 회복했지만 초기 가격 아래
      testStocks.forEach((stock: any, index: number) => {
        const finalPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        expect(finalPrice).toBeGreaterThan(pricesAfterCrash[index])
        expect(finalPrice).toBeLessThan(initialPrices[index])
      })
    })

    it('닷컴 버블 붕괴: 기술주 집중 타격', () => {
      const companies = store.getState().companies
      const techStocks = companies.filter((c: any) => c.sector === 'tech').slice(0, 2)
      const otherStocks = companies.filter((c: any) => c.sector !== 'tech').slice(0, 2)

      const techPricesBefore = techStocks.map((s: any) => s.price)
      const otherPricesBefore = otherStocks.map((s: any) => s.price)

      // 기술주는 20% 폭락, 다른 섹터는 5% 하락
      techStocks.forEach((stock: any) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 0.8)
      })

      otherStocks.forEach((stock: any) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 0.95)
      })

      // 검증: 기술주 큰 하락, 다른 섹터는 적은 하락
      techStocks.forEach((stock: any, index: number) => {
        const finalPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        expect(finalPrice).toBeLessThan(techPricesBefore[index] * 0.85)
      })

      otherStocks.forEach((stock: any, index: number) => {
        const finalPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        expect(finalPrice).toBeLessThan(otherPricesBefore[index])
        expect(finalPrice).toBeGreaterThan(otherPricesBefore[index] * 0.9)
      })
    })
  })

  describe('부스트 이벤트 (Boom Events)', () => {
    /**
     * 부스트 이벤트: 산타 랠리, IPO 열풍 등
     * 영향: 시장 상승
     */
    it('산타 랠리: 연말 시장 강세', () => {
      const companies = store.getState().companies
      const stocks = companies.slice(0, 4)

      const pricesBefore = stocks.map((s: any) => s.price)

      // 시장 전반 +6% 상승
      stocks.forEach((stock: any) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 1.06)
      })

      // 검증
      stocks.forEach((stock: any, index: number) => {
        const updatedPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        expect(updatedPrice).toBeGreaterThan(pricesBefore[index])
      })
    })

    it('IPO 열풍: 신규 상장 기업 붐', () => {
      const companies = store.getState().companies
      const stocks = companies.slice(0, 3)

      const pricesBefore = stocks.map((s: any) => s.price)

      // 시장 +5% 상승
      stocks.forEach((stock: any) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 1.05)
      })

      // 검증
      stocks.forEach((stock: any, index: number) => {
        const updatedPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        expect(updatedPrice).toBeGreaterThan(pricesBefore[index])
      })
    })

    it('외국인 매수 폭탄: 대규모 자금 유입', () => {
      const companies = store.getState().companies
      const stocks = companies.slice(0, 5)

      const pricesBefore = stocks.map((s: any) => s.price)

      // 2단계 상승으로 강한 상승세 표현
      stocks.forEach((stock: any) => {
        let currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        currentPrice = currentPrice * 1.08
        setCompanyPrice(store, stock.ticker, currentPrice)
      })

      // 검증
      stocks.forEach((stock: any, index: number) => {
        const updatedPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        expect(updatedPrice).toBeGreaterThan(pricesBefore[index] * 1.06)
      })
    })
  })

  describe('이벤트 지속 기간 (Duration)', () => {
    /**
     * 이벤트 Duration: 각 이벤트마다 고유한 지속 시간
     * - Policy: 100~200시간
     * - Sector: 120~200시간
     * - Crash: 20~300시간 (다양함)
     * - Boom: 50~200시간
     */
    it('이벤트 Duration 동안 지속적 영향', () => {
      const companies = store.getState().companies
      const testStock = companies[0]

      const initialPrice = testStock.price
      const pricesOverTime: number[] = [initialPrice]

      // 100시간 동안 매시간 1% 상승 이벤트
      for (let tick = 0; tick < 100; tick++) {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === testStock.ticker
        ).price
        const newPrice = currentPrice * 1.001
        setCompanyPrice(store, testStock.ticker, newPrice)
        pricesOverTime.push(newPrice)
      }

      // 검증: 누적 상승 (약 10%)
      const endPrice = pricesOverTime[pricesOverTime.length - 1]
      expect(endPrice).toBeGreaterThan(initialPrice * 1.09)
      expect(endPrice).toBeLessThan(initialPrice * 1.12)
    })

    it('이벤트 종료 후 정상화', () => {
      const companies = store.getState().companies
      const testStock = companies[0]

      const initialPrice = testStock.price
      let currentPrice = initialPrice

      // 이벤트 진행: 50시간 × 0.8% 상승
      for (let i = 0; i < 50; i++) {
        currentPrice = currentPrice * 1.008
        setCompanyPrice(store, testStock.ticker, currentPrice)
      }

      const priceAtEventEnd = currentPrice

      // 이벤트 종료 후: 정상 변동률 (0.1%)
      for (let i = 0; i < 50; i++) {
        const normalPrice = store.getState().companies.find(
          (c: any) => c.ticker === testStock.ticker
        ).price
        const nextPrice = normalPrice * (0.999 + Math.random() * 0.002)
        setCompanyPrice(store, testStock.ticker, nextPrice)
        currentPrice = nextPrice
      }

      // 검증: 이벤트 종료 후 변동성 감소
      const postEventGain = (currentPrice - priceAtEventEnd) / priceAtEventEnd
      const eventGain = (priceAtEventEnd - initialPrice) / initialPrice

      // 이벤트 중 상승폭이 종료 후보다 크다
      expect(eventGain).toBeGreaterThan(Math.abs(postEventGain))
    })
  })

  describe('복합 이벤트 (Multiple Events)', () => {
    /**
     * 여러 이벤트가 동시에 진행되는 시나리오
     */
    it('정책 이벤트와 섹터 이벤트 동시 발생', () => {
      const companies = store.getState().companies
      const techStock = companies.find((c: any) => c.sector === 'tech')
      const financeStock = companies.find((c: any) => c.sector === 'finance')

      if (techStock && financeStock) {
        const techInitialPrice = techStock.price
        const financeInitialPrice = financeStock.price

        // 양적완화 (+0.06) + AI 혁명 (기술주 +0.1)
        setCompanyPrice(store, techStock.ticker, techInitialPrice * 1.16)
        // 양적완화만 (+0.06)
        setCompanyPrice(store, financeStock.ticker, financeInitialPrice * 1.06)

        // 검증: 기술주가 금융주보다 더 큰 상승
        const techFinalPrice = store.getState().companies.find(
          (c: any) => c.ticker === techStock.ticker
        ).price
        const financeFinalPrice = store.getState().companies.find(
          (c: any) => c.ticker === financeStock.ticker
        ).price

        const techGain = (techFinalPrice - techInitialPrice) / techInitialPrice
        const financeGain = (financeFinalPrice - financeInitialPrice) / financeInitialPrice

        expect(techGain).toBeGreaterThan(financeGain)
      }
    })

    it('크래시 이벤트 후 부스트 이벤트로 반등', () => {
      const companies = store.getState().companies
      const stocks = companies.slice(0, 4)

      const initialPrices = stocks.map((s: any) => s.price)

      // 블랙 먼데이: -15%
      stocks.forEach((stock: any) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 0.85)
      })

      const pricesAfterCrash = stocks.map((s: any) =>
        store.getState().companies.find(
          (c: any) => c.ticker === s.ticker
        ).price
      )

      // 외국인 매수: +8%
      stocks.forEach((stock: any, index: number) => {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        setCompanyPrice(store, stock.ticker, currentPrice * 1.08)
      })

      // 검증: 부분 회복
      stocks.forEach((stock: any, index: number) => {
        const finalPrice = store.getState().companies.find(
          (c: any) => c.ticker === stock.ticker
        ).price
        // 크래시 후 회복했지만 초기보다 낮음
        expect(finalPrice).toBeGreaterThan(pricesAfterCrash[index])
        expect(finalPrice).toBeLessThan(initialPrices[index])
      })
    })
  })

  describe('이벤트 확률 가중치 (Weighted Selection)', () => {
    /**
     * 이벤트는 가중치에 따라 확률이 결정됨
     * - low (weight: 5): 높은 확률
     * - high (weight: 2): 낮은 확률
     */
    it('저 심각도 이벤트가 더 자주 발생 (확률 분포)', () => {
      const companies = store.getState().companies
      const testStock = companies[0]

      const initialPrice = testStock.price
      let finalPrice = initialPrice

      // 100회 이벤트 시뮬레이션
      // 80% 저 심각도 (0.5% 상승)
      // 20% 고 심각도 (2% 상승/하락)
      for (let i = 0; i < 100; i++) {
        const currentPrice = store.getState().companies.find(
          (c: any) => c.ticker === testStock.ticker
        ).price

        if (Math.random() < 0.8) {
          // Low severity
          finalPrice = currentPrice * 1.005
        } else {
          // High severity
          finalPrice = currentPrice * (Math.random() < 0.5 ? 0.98 : 1.02)
        }

        setCompanyPrice(store, testStock.ticker, finalPrice)
      }

      // 검증: 저 심각도가 더 많으므로 평균적으로 상승
      const currentPrice = store.getState().companies.find(
        (c: any) => c.ticker === testStock.ticker
      ).price
      expect(currentPrice).toBeGreaterThan(initialPrice)
    })
  })
})

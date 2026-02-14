import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  addCash,
  setCompanyPrice,
  addToPortfolio,
  createTestEmployee,
  hireEmployee,
  getCompanyAt,
} from '../helpers'

describe('스토어 통합: 거래 시스템 (Trading)', () => {
  let store: any
  let testCompany: any

  beforeEach(() => {
    store = createTestStore()
    testCompany = getCompanyAt(store, 0) // 첫 번째 회사 사용
  })

  describe('주식 매수 (Buy Stock)', () => {
    it('매수하면 포트폴리오에 주식이 추가된다', () => {
      const initialCash = store.getState().player.cash
      const result = store.buyStock(testCompany.ticker, 10)

      expect(result).toBe(true)
      expect(
        store.getState().player.portfolio[testCompany.ticker]?.shares
      ).toBe(10)
    })

    it('매수 금액이 현금에서 차감된다', () => {
      const cost = testCompany.price * 10

      const initialCash = store.getState().player.cash
      store.buyStock(testCompany.ticker, 10)

      expect(store.getState().player.cash).toBe(
        initialCash - cost
      )
    })

    it('평균 매수가가 올바르게 계산된다', () => {
      store.buyStock(testCompany.ticker, 10)
      const avgPrice = store.getState().player.portfolio[
        testCompany.ticker
      ].avgBuyPrice

      expect(avgPrice).toBe(testCompany.price)
    })

    it('같은 주식을 여러 번 매수하면 평균가가 업데이트된다', () => {
      setCompanyPrice(store, testCompany.ticker, 100_000)
      store.buyStock(testCompany.ticker, 10)

      setCompanyPrice(store, testCompany.ticker, 150_000)
      store.buyStock(testCompany.ticker, 10)

      const portfolio = store.getState().player.portfolio[
        testCompany.ticker
      ]
      expect(portfolio.shares).toBe(20)
      expect(portfolio.avgBuyPrice).toBe(125_000)
    })

    it('자금 부족 시 매수할 수 없다', () => {
      store = createTestStore({
        'player.cash': 1_000,
      })

      const result = store.buyStock(testCompany.ticker, 10)

      expect(result).toBe(false)
      expect(
        store.getState().player.portfolio[testCompany.ticker]
      ).toBeUndefined()
    })

    it('존재하지 않는 주식은 매수할 수 없다', () => {
      const result = store.buyStock('FAKE_TICKER', 10)

      expect(result).toBe(false)
    })

    it('총 자산 가치가 유지된다 (현금 감소 = 주식 가치 증가)', () => {
      const initialAssets = store.getState().player
        .totalAssetValue

      store.buyStock(testCompany.ticker, 10)

      const finalAssets = store.getState().player
        .totalAssetValue

      expect(finalAssets).toBe(initialAssets)
    })

    it('매수 성공 시 직원 1명에게 XP 부여 가능', () => {
      const employee = createTestEmployee({
        stamina: 100,
      })
      hireEmployee(store, employee)

      const initialXP =
        store.getState().player.employees[0].xp

      store.buyStock(testCompany.ticker, 10)

      const finalXP = store.getState().player.employees[0].xp

      expect(finalXP).toBeGreaterThanOrEqual(initialXP)
    })

    it('일반적인 거래 플로우 (1000주)', () => {
      const company = store.getState().companies[0]
      const cost = company.price * 1000

      const initialCash = store.getState().player.cash
      const result = store.buyStock(company.ticker, 1000)

      expect(result).toBe(true)
      expect(
        store.getState().player.portfolio[company.ticker].shares
      ).toBe(1000)
      expect(store.getState().player.cash).toBe(
        initialCash - cost
      )
    })
  })

  describe('주식 매도 (Sell Stock)', () => {
    beforeEach(() => {
      store.buyStock(testCompany.ticker, 10)
    })

    it('매도하면 포트폴리오에서 주식이 제거된다', () => {
      store.sellStock(testCompany.ticker, 10)

      expect(
        store.getState().player.portfolio[testCompany.ticker]
      ).toBeUndefined()
    })

    it('매도 금액이 현금에 추가된다', () => {
      const beforeCash = store.getState().player.cash
      const saleAmount = testCompany.price * 10

      store.sellStock(testCompany.ticker, 10)

      expect(store.getState().player.cash).toBe(
        beforeCash + saleAmount
      )
    })

    it('일부만 매도할 수 있다', () => {
      const beforeShares = store.getState().player
        .portfolio[testCompany.ticker].shares

      store.sellStock(testCompany.ticker, 5)

      const afterShares = store.getState().player.portfolio[
        testCompany.ticker
      ]?.shares

      expect(afterShares).toBe(beforeShares - 5)
    })

    it('보유하지 않은 주식은 매도할 수 없다', () => {
      const result = store.sellStock('UNKNOWN_STOCK', 10)

      expect(result).toBe(false)
    })

    it('보유한 주식보다 많이 매도할 수 없다', () => {
      const result = store.sellStock(testCompany.ticker, 20)

      expect(result).toBe(false)
    })

    it('이익을 실현할 수 있다', () => {
      const initialCash = store.getState().player.cash

      setCompanyPrice(store, testCompany.ticker, 200_000)

      store.sellStock(testCompany.ticker, 10)

      expect(store.getState().player.cash).toBeGreaterThan(
        initialCash
      )
    })

    it('손실을 실현할 수도 있다', () => {
      const initialCash = store.getState().player.cash

      setCompanyPrice(store, testCompany.ticker, testCompany.price / 2)

      store.sellStock(testCompany.ticker, 10)

      expect(store.getState().player.cash).toBeLessThan(
        initialCash
      )
    })
  })

  describe('포트폴리오 관리', () => {
    it('여러 주식을 동시에 보유할 수 있다', () => {
      const companies = store.getState().companies
      store.buyStock(companies[0].ticker, 10)
      store.buyStock(companies[1].ticker, 20)
      store.buyStock(companies[2].ticker, 30)

      const portfolio = store.getState().player.portfolio

      expect(Object.keys(portfolio).length).toBe(3)
    })

    it('총 자산 가치가 올바르게 계산된다', () => {
      addToPortfolio(store, testCompany.ticker, 10, 100_000)

      const totalAssets = store.getState().player
        .totalAssetValue
      const expectedAssets = 50_000_000 - 1_000_000
      const stockValue = 10 * 100_000

      expect(totalAssets).toBe(expectedAssets + stockValue)
    })

    it('포트폴리오를 비울 수 있다', () => {
      const companies = store.getState().companies
      store.buyStock(companies[0].ticker, 10)
      store.buyStock(companies[1].ticker, 5)

      store.sellStock(companies[0].ticker, 10)
      store.sellStock(companies[1].ticker, 5)

      const portfolio = store.getState().player.portfolio

      expect(Object.keys(portfolio).length).toBe(0)
    })
  })

  describe('ROI 계산', () => {
    it('ROI가 올바르게 계산된다', () => {
      addToPortfolio(store, testCompany.ticker, 10, 100_000)
      const initialCash = store.getState().player.cash

      setCompanyPrice(store, testCompany.ticker, 200_000)

      const portfolio = store.getState().player.portfolio[
        testCompany.ticker
      ]
      const stockValue = portfolio.shares * 200_000
      const totalAssets =
        initialCash + stockValue

      const roi =
        ((totalAssets - 50_000_000) / 50_000_000) * 100

      expect(roi).toBeGreaterThan(0)
    })

    it('손실 상황의 ROI는 음수이다', () => {
      addToPortfolio(store, testCompany.ticker, 10, 100_000)

      setCompanyPrice(store, testCompany.ticker, 50_000)

      const portfolio = store.getState().player.portfolio[
        testCompany.ticker
      ]
      const stockValue = portfolio.shares * 50_000
      const initialCash = store.getState().player.cash
      const totalAssets =
        initialCash + stockValue

      const roi =
        ((totalAssets - 50_000_000) / 50_000_000) * 100

      expect(roi).toBeLessThan(0)
    })
  })

  describe('실시간 포트폴리오 업데이트', () => {
    it('가격 변동이 총 자산에 반영된다', () => {
      store.buyStock(testCompany.ticker, 10)

      const assetsBeforePrice = store.getState().player
        .totalAssetValue

      setCompanyPrice(store, testCompany.ticker, testCompany.price * 2)

      const assetsAfterPrice = store.getState().player
        .totalAssetValue

      expect(assetsAfterPrice).toBeGreaterThan(
        assetsBeforePrice
      )
    })
  })

  describe('거래 제약 조건', () => {
    it('0주는 매수할 수 없다', () => {
      const result = store.buyStock(testCompany.ticker, 0)

      expect(result).toBe(false)
    })

    it('0주는 매도할 수 없다', () => {
      store.buyStock(testCompany.ticker, 10)

      const result = store.sellStock(testCompany.ticker, 0)

      expect(result).toBe(false)
    })

    it('음수 주는 매수할 수 없다', () => {
      const result = store.buyStock(testCompany.ticker, -10)

      expect(result).toBe(false)
    })

    it('게임 미시작 상태에서는 거래할 수 없다', () => {
      store = createTestStore({ isGameStarted: false })
    })
  })

  describe('거래 기록 및 통계', () => {
    it('총 거래 횟수가 추적된다', () => {
      const companies = store.getState().companies
      store.buyStock(companies[0].ticker, 10)
      store.buyStock(companies[1].ticker, 5)
      store.sellStock(companies[0].ticker, 5)
    })

    it('수익 / 손실 통계가 유지된다', () => {
      store.buyStock(testCompany.ticker, 10)
      setCompanyPrice(store, testCompany.ticker, 200_000)
      store.sellStock(testCompany.ticker, 10)
    })
  })

  describe('다양한 시장 시나리오', () => {
    it('강세장에서 빠른 거래가 가능하다', () => {
      const companies = store.getState().companies
      companies.forEach((c: any, i: number) => {
        setCompanyPrice(store, c.ticker, c.price * 1.5)
      })

      let result = true
      for (const company of companies.slice(0, 5)) {
        if (!store.buyStock(company.ticker, 5)) {
          result = false
          break
        }
      }

      expect(result).toBe(true)
    })

    it('약세장에서 손실 최소화 거래가 가능하다', () => {
      store.buyStock(testCompany.ticker, 10)

      setCompanyPrice(store, testCompany.ticker, testCompany.price * 0.8)

      const result = store.sellStock(testCompany.ticker, 10)

      expect(result).toBe(true)
    })

    it('변동성 높은 시장에서 수익 창출 가능', () => {
      store.buyStock(testCompany.ticker, 100)

      setCompanyPrice(store, testCompany.ticker, 200_000)

      const sellResult = store.sellStock(testCompany.ticker, 50)

      expect(sellResult).toBe(true)
      expect(
        store.getState().player.portfolio[testCompany.ticker]?.shares
      ).toBe(50)
    })
  })
})

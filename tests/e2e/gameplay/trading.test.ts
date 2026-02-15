import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  addCash,
  setCompanyPrice,
  getCompanyAt,
} from '../../integration/helpers'

/**
 * 게임 메뉴얼: 거래 시나리오 E2E 테스트
 *
 * - 수익 시나리오: 저가 매수 → 고가 매도
 * - 손실 시나리오: 고가 매수 → 저가 매도
 * - 분할 매수/매도: 분할매수/분할매도로 평균 조정
 * - 포트폴리오 다각화: 여러 주식 동시 보유 효과
 */
describe('E2E: 거래 시나리오 (Trading Scenarios)', () => {
  let store: any
  let testCompany: any

  beforeEach(() => {
    store = createTestStore()
    testCompany = getCompanyAt(store, 0)
  })

  describe('수익 시나리오 (Profitable Trading)', () => {
    /**
     * 전략: 저가에 매수 후 가격 상승 시 매도
     * 조건: 최종 자산 > 초기 자산
     */
    it('저가 매수 후 고가 매도로 이익 실현', () => {
      // Given: 초기 상태
      const initialCash = store.getState().player.cash
      const initialAssets = store.getState().player.totalAssetValue
      const buyPrice = testCompany.price

      // When: 저가에 100주 매수
      const shares = 100
      store.buyStock(testCompany.ticker, shares)

      // Then: 현금 감소, 포트폴리오 증가
      const afterBuyCash = store.getState().player.cash
      const afterBuyAssets = store.getState().player.totalAssetValue

      expect(afterBuyCash).toBeLessThan(initialCash)
      expect(
        store.getState().player.portfolio[testCompany.ticker]
      ).toBeDefined()

      // When: 가격이 2배 상승
      const sellPrice = buyPrice * 2
      setCompanyPrice(store, testCompany.ticker, sellPrice)

      // Then: 자산이 증가
      const assetsWithPriceIncrease =
        store.getState().player.totalAssetValue
      expect(assetsWithPriceIncrease).toBeGreaterThan(afterBuyAssets)

      // When: 고가에 모두 매도
      const initialCashBeforeSell = store.getState().player.cash
      store.sellStock(testCompany.ticker, shares)

      // Then: 이익 실현
      const finalCash = store.getState().player.cash
      const profitAmount = finalCash - initialCash

      expect(profitAmount).toBeGreaterThan(0)
      expect(finalCash).toBeGreaterThan(initialCash)
    })

    it('단계적 수익 창출 (장기 포지션)', () => {
      // Given: 초기 자금
      const initialAssets = store.getState().player.totalAssetValue

      // When: 1차 매수
      const basePrice = testCompany.price
      store.buyStock(testCompany.ticker, 50)

      // And: 3개월 후 가격 상승
      setCompanyPrice(store, testCompany.ticker, basePrice * 1.2)

      // And: 2차 추가 매수 (평균가 조정)
      store.buyStock(testCompany.ticker, 50)

      // And: 6개월 후 가격 추가 상승
      setCompanyPrice(store, testCompany.ticker, basePrice * 1.5)

      // Then: 총 이익 확인
      const finalAssets = store.getState().player.totalAssetValue
      expect(finalAssets).toBeGreaterThan(initialAssets)
    })

    it('수익 확정: 매도 후 현금 증가', () => {
      // Given: 저가 매수
      const initialCash = store.getState().player.cash
      const buyPrice = testCompany.price
      store.buyStock(testCompany.ticker, 100)

      // When: 가격 상승
      setCompanyPrice(store, testCompany.ticker, buyPrice * 3)

      // And: 매도 실행
      const cashBeforeSell = store.getState().player.cash
      const sellResult = store.sellStock(testCompany.ticker, 100)

      // Then: 성공적 매도로 현금 증가
      expect(sellResult).toBe(true)
      const cashAfterSell = store.getState().player.cash
      expect(cashAfterSell).toBeGreaterThan(initialCash)
    })

    it('최대 수익: 1주에 1000배 증가 시나리오', () => {
      // Given: 초기 자금과 주식
      const initialCash = store.getState().player.cash
      const cheapStock = getCompanyAt(store, 0)
      const initialPrice = cheapStock.price

      // When: 1주 매수
      store.buyStock(cheapStock.ticker, 1)

      // And: 극단적 가격 상승 (1000배)
      setCompanyPrice(store, cheapStock.ticker, initialPrice * 1000)

      // And: 매도
      store.sellStock(cheapStock.ticker, 1)

      // Then: 엄청난 이익
      const finalCash = store.getState().player.cash
      const profit = finalCash - initialCash

      expect(profit).toBeGreaterThan(initialPrice * 999)
    })
  })

  describe('손실 시나리오 (Loss Trading)', () => {
    /**
     * 전략: 고가에 매수 후 가격 하락 시 매도
     * 조건: 최종 자산 < 초기 자산
     */
    it('고가 매수 후 저가 매도로 손실 실현', () => {
      // Given: 초기 자산
      const initialAssets = store.getState().player.totalAssetValue
      const initialCash = store.getState().player.cash
      const buyPrice = testCompany.price

      // When: 고가에 100주 매수
      store.buyStock(testCompany.ticker, 100)

      // Then: 포트폴리오 생성
      expect(
        store.getState().player.portfolio[testCompany.ticker].shares
      ).toBe(100)

      // When: 가격이 50% 하락
      setCompanyPrice(store, testCompany.ticker, buyPrice * 0.5)

      // And: 저가에 매도
      store.sellStock(testCompany.ticker, 100)

      // Then: 손실 발생
      const finalCash = store.getState().player.cash
      const lossAmount = initialCash - finalCash

      expect(lossAmount).toBeGreaterThan(0)
      expect(finalCash).toBeLessThan(initialCash)
    })

    it('점진적 손실: 계속 하락하는 주식 보유', () => {
      // Given: 초기 자산
      const initialAssets = store.getState().player.totalAssetValue
      const basePrice = testCompany.price

      // When: 100주 매수
      store.buyStock(testCompany.ticker, 100)

      // And: 월간 하락 시뮬레이션
      setCompanyPrice(store, testCompany.ticker, basePrice * 0.95)
      setCompanyPrice(store, testCompany.ticker, basePrice * 0.90)
      setCompanyPrice(store, testCompany.ticker, basePrice * 0.80)
      setCompanyPrice(store, testCompany.ticker, basePrice * 0.70)

      // Then: 자산 감소
      const assetsAfterDecline =
        store.getState().player.totalAssetValue
      expect(assetsAfterDecline).toBeLessThan(initialAssets)
    })

    it('최대 손실: 주식이 99% 폭락', () => {
      // Given: 초기 자금
      const initialCash = store.getState().player.cash
      const originalPrice = testCompany.price

      // When: 100주 매수
      store.buyStock(testCompany.ticker, 100)

      // And: 가격 폭락 (99% 손실)
      setCompanyPrice(store, testCompany.ticker, originalPrice * 0.01)

      // And: 폭락 후 매도
      store.sellStock(testCompany.ticker, 100)

      // Then: 거의 모든 투자금 손실
      const finalCash = store.getState().player.cash
      const remainingRatio = finalCash / initialCash

      expect(remainingRatio).toBeLessThan(0.02) // 1% 이하만 남음
    })

    it('손절매: 손실이 일정 수준에서 매도 결정', () => {
      // Given: 초기 자금
      const initialCash = store.getState().player.cash
      const buyPrice = testCompany.price
      const stopLossThreshold = buyPrice * 0.9 // 10% 손실

      // When: 100주 매수
      store.buyStock(testCompany.ticker, 100)

      // And: 가격 15% 하락
      setCompanyPrice(store, testCompany.ticker, buyPrice * 0.85)

      // Then: 손절매 트리거 (10% 이상 손실)
      const currentPrice = store.getState().companies.find(
        (c: any) => c.ticker === testCompany.ticker
      ).price

      const isStopLossTriggered = currentPrice <= stopLossThreshold

      expect(isStopLossTriggered).toBe(true)

      // When: 손절매 실행
      store.sellStock(testCompany.ticker, 100)

      // Then: 손실 제한
      const finalCash = store.getState().player.cash
      const maxLoss = initialCash - finalCash

      expect(maxLoss).toBeLessThan(initialCash * 0.2) // 최대 20% 손실
    })
  })

  describe('분할 매매 전략', () => {
    /**
     * 분할 매수/매도로 평균 가격 조정
     * 리스크 분산 효과 검증
     */
    it('분할 매수로 평균가 낮춤', () => {
      // Given: 초기 상태
      const initialCash = store.getState().player.cash

      // When: 1차 매수 (고가)
      const highPrice = testCompany.price
      store.buyStock(testCompany.ticker, 50)

      // And: 가격 하락
      setCompanyPrice(store, testCompany.ticker, highPrice * 0.8)

      // And: 2차 매수 (저가)
      store.buyStock(testCompany.ticker, 50)

      // Then: 평균가 계산
      const portfolio = store.getState().player.portfolio[testCompany.ticker]
      const avgPrice = portfolio.avgBuyPrice

      // 평균가는 고가와 저가의 중간 정도
      expect(avgPrice).toBeLessThan(highPrice)
      expect(avgPrice).toBeGreaterThan(highPrice * 0.8)
    })

    it('분할 매도로 이익 극대화', () => {
      // Given: 보유 주식
      const basePrice = testCompany.price
      store.buyStock(testCompany.ticker, 100)

      // When: 가격 2배 상승 후 절반 매도
      setCompanyPrice(store, testCompany.ticker, basePrice * 2)
      const cashAfterFirstSell = store.getState().player.cash

      const portfolio1 = store.getState().player.portfolio[testCompany.ticker]
      store.sellStock(testCompany.ticker, 50)

      // And: 가격 추가 상승 후 나머지 매도
      setCompanyPrice(store, testCompany.ticker, basePrice * 3)
      store.sellStock(testCompany.ticker, 50)

      // Then: 다단계 이익 확인
      const finalCash = store.getState().player.cash
      expect(finalCash).toBeGreaterThan(cashAfterFirstSell)
    })
  })

  describe('포트폴리오 다각화', () => {
    /**
     * 여러 주식 동시 보유로 리스크 분산
     */
    it('3개 주식 다각화 포트폴리오 구성', () => {
      // Given: 초기 자금
      const initialCash = store.getState().player.cash
      const companies = store.getState().companies.slice(0, 3)

      // When: 3개 주식에 분산 투자
      const investmentPerStock = initialCash / 6 // 각 주식에 주당 가격으로 계산
      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 10)
      })

      // Then: 3개 주식 모두 포트폴리오에 포함
      const portfolio = store.getState().player.portfolio
      expect(Object.keys(portfolio).length).toBe(3)
    })

    it('다각화로 손실 최소화', () => {
      // Given: 3개 주식 포트폴리오
      const companies = store.getState().companies.slice(0, 3)
      const basePrice = companies[0].price

      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 10)
      })

      const assetsAfterBuy = store.getState().player.totalAssetValue

      // When: 1개 주식만 폭락 (-80%)
      setCompanyPrice(store, companies[0].ticker, basePrice * 0.2)

      // Then: 전체 자산의 일부만 손실
      const assetsAfterCrash =
        store.getState().player.totalAssetValue
      const totalLoss = assetsAfterBuy - assetsAfterCrash

      // 전체 투자금의 25% 이상 손실하지 않음 (3개 중 1개이므로)
      expect(totalLoss).toBeLessThan(assetsAfterBuy * 0.3)
    })

    it('다각화 효과: 일부 상승으로 전체 수익', () => {
      // Given: 3개 주식 균등 투자
      const companies = store.getState().companies.slice(0, 3)
      const basePrices = companies.map((c: any) => c.price)

      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 10)
      })

      const assetsAfterBuy = store.getState().player.totalAssetValue

      // When: 1개 주식만 3배 상승
      setCompanyPrice(store, companies[0].ticker, basePrices[0] * 3)

      // Then: 전체 자산도 증가
      const assetsAfterGain = store.getState().player.totalAssetValue
      expect(assetsAfterGain).toBeGreaterThan(assetsAfterBuy)
    })
  })

  describe('거래 제약 조건 E2E', () => {
    it('매수 후 매도 후 재매수 가능', () => {
      // Given: 초기 상태
      expect(
        store.getState().player.portfolio[testCompany.ticker]
      ).toBeUndefined()

      // When: 매수
      store.buyStock(testCompany.ticker, 100)
      expect(
        store.getState().player.portfolio[testCompany.ticker].shares
      ).toBe(100)

      // And: 매도
      store.sellStock(testCompany.ticker, 100)
      expect(
        store.getState().player.portfolio[testCompany.ticker]
      ).toBeUndefined()

      // Then: 재매수 가능
      const result = store.buyStock(testCompany.ticker, 50)
      expect(result).toBe(true)
      expect(
        store.getState().player.portfolio[testCompany.ticker].shares
      ).toBe(50)
    })

    it('자금 부족 시 거래 불가', () => {
      // Given: 초기 자금이 매우 적은 상태
      const poorStore = createTestStore({ 'player.cash': 10_000 })
      const company = getCompanyAt(poorStore, 0)

      // When: 자금 부족으로 매수 시도
      const result = poorStore.buyStock(company.ticker, 100)

      // Then: 거래 실패
      expect(result).toBe(false)
    })

    it('보유하지 않은 주식 매도 불가', () => {
      // Given: 비어있는 포트폴리오
      const portfolio = store.getState().player.portfolio
      expect(Object.keys(portfolio).length).toBe(0)

      // When: 보유하지 않은 주식 매도 시도
      const result = store.sellStock('NONEXISTENT', 100)

      // Then: 거래 실패
      expect(result).toBe(false)
    })
  })
})

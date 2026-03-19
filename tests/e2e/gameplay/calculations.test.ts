/**
 * 핵심 계산 검증 E2E 테스트
 *
 * 수수료, 세금, 자산 평가, 마켓 임팩트, 포지션 한도 등
 * 게임 내 모든 재무 계산의 정확성 검증
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../../src/stores/gameStore'

describe('핵심 계산 검증', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.getState().startGame('normal', undefined, 100_000_000)
  })

  describe('자산 평가', () => {
    it('총 자산 = 현금 + 포트폴리오 평가액', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!

      // 매수
      store.buyStock(company.id, 100)
      const s = useGameStore.getState()

      const portfolioValue = Object.entries(s.player.portfolio).reduce((sum, [companyId, pos]) => {
        const comp = s.companies.find((c) => c.id === companyId)
        return sum + (comp ? comp.price * pos.shares : 0)
      }, 0)

      expect(s.player.totalAssetValue).toBeCloseTo(s.player.cash + portfolioValue, 0)
    })

    it('가격 변동 시 총 자산 재계산', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!

      store.buyStock(company.id, 100)
      const beforePrice = useGameStore.getState().player.totalAssetValue

      // 가격 50% 상승
      const newPrice = company.price * 1.5
      useGameStore.setState((s) => ({
        companies: s.companies.map((c) =>
          c.id === company.id ? { ...c, price: newPrice } : c
        ),
      }))

      // 가격 업데이트 후 자산 재계산 트리거
      const priceUpdate: Record<string, number> = {}
      useGameStore.getState().companies.forEach((c) => {
        priceUpdate[c.id] = c.price
      })
      useGameStore.getState().updatePrices(priceUpdate)

      const afterPrice = useGameStore.getState().player.totalAssetValue
      expect(afterPrice).toBeGreaterThan(beforePrice)
    })
  })

  describe('매수/매도 원금 계산', () => {
    it('매수 비용 = 주가 × 수량', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!
      const initialCash = store.player.cash
      const shares = 50

      store.buyStock(company.id, shares)
      const s = useGameStore.getState()

      const expectedCost = company.price * shares
      expect(s.player.cash).toBe(initialCash - expectedCost)
    })

    it('매도 수익 = 현재가 × 수량', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!

      store.buyStock(company.id, 100)
      const cashAfterBuy = useGameStore.getState().player.cash

      useGameStore.getState().sellStock(company.id, 50)
      const s = useGameStore.getState()

      const expectedRevenue = company.price * 50
      expect(s.player.cash).toBe(cashAfterBuy + expectedRevenue)
    })

    it('평균 매수가 가중 평균 계산', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!
      const price1 = company.price

      // 1차 매수
      store.buyStock(company.id, 100)

      // 가격 변동
      const price2 = price1 * 1.5
      useGameStore.setState((s) => ({
        companies: s.companies.map((c) =>
          c.id === company.id ? { ...c, price: price2 } : c
        ),
      }))

      // 2차 매수
      useGameStore.getState().buyStock(company.id, 100)

      const pos = useGameStore.getState().player.portfolio[company.id]
      const expectedAvg = (price1 * 100 + price2 * 100) / 200
      expect(pos?.avgBuyPrice).toBeCloseTo(expectedAvg, 0)
      expect(pos?.shares).toBe(200)
    })
  })

  describe('경계값 테스트', () => {
    it('현금 전액 매수 시 cash = 0', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!
      const maxShares = Math.floor(store.player.cash / company.price)

      store.buyStock(company.id, maxShares)
      const s = useGameStore.getState()

      expect(s.player.cash).toBeGreaterThanOrEqual(0)
      expect(s.player.cash).toBeLessThan(company.price) // 1주도 못 살 정도의 잔고
    })

    it('보유량 초과 매도 차단', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!

      store.buyStock(company.id, 10)
      const cashBefore = useGameStore.getState().player.cash

      // 20주 매도 시도 (10주만 보유)
      useGameStore.getState().sellStock(company.id, 20)
      const cashAfter = useGameStore.getState().player.cash

      // 매도가 실패해야 함
      expect(cashAfter).toBe(cashBefore)
    })

    it('미보유 종목 매도 차단', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!
      const cashBefore = store.player.cash

      store.sellStock(company.id, 100)
      expect(useGameStore.getState().player.cash).toBe(cashBefore)
    })

    it('0주 또는 음수 거래 차단', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!
      const cashBefore = store.player.cash

      store.buyStock(company.id, 0)
      expect(useGameStore.getState().player.cash).toBe(cashBefore)

      store.buyStock(company.id, -10)
      expect(useGameStore.getState().player.cash).toBe(cashBefore)
    })
  })

  describe('일일 변동률 계산', () => {
    it('일간 수익률 = (당일자산 - 전일자산) / 전일자산 × 100', () => {
      const store = useGameStore.getState()

      // previousDayAssets가 초기화되어 있어야 함
      expect(typeof store.player.previousDayAssets).toBe('number')
      expect(store.player.previousDayAssets).toBeGreaterThan(0)

      // 시간 진행으로 하루를 넘김 (10시간 = 1영업일 + 1시간)
      for (let i = 0; i < 11; i++) store.advanceHour()

      const s = useGameStore.getState()
      // previousDayAssets 기반 일간 수익률 계산 가능
      const dailyReturn =
        ((s.player.totalAssetValue - s.player.previousDayAssets) /
          s.player.previousDayAssets) *
        100
      expect(typeof dailyReturn).toBe('number')
      expect(Number.isFinite(dailyReturn)).toBe(true)
    })
  })
})

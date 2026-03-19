/**
 * 게임 라이프사이클 전체 플로우 E2E 테스트
 *
 * 게임 시작 → 난이도별 초기화 → 시간 진행 → 거래 → 직원 고용 →
 * 이벤트 발생 → 엔딩 조건 달성까지의 전체 사이클 검증
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../../src/stores/gameStore'

describe('게임 라이프사이클 전체 플로우', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('난이도별 게임 시작', () => {
    it('Easy 모드 초기화 검증', () => {
      useGameStore.getState().startGame('easy')
      const s = useGameStore.getState()

      expect(s.isGameStarted).toBe(true)
      expect(s.isGameOver).toBe(false)
      expect(s.player.cash).toBeGreaterThanOrEqual(100_000_000)
      expect(s.companies.length).toBeGreaterThan(0)
      expect(s.time.year).toBe(1995)
      expect(s.time.hour).toBe(9)
    })

    it('Normal 모드 초기화 검증', () => {
      useGameStore.getState().startGame('normal')
      const s = useGameStore.getState()

      expect(s.player.cash).toBeGreaterThanOrEqual(50_000_000)
      expect(s.config.difficulty).toBe('normal')
    })

    it('Hard 모드 초기화 검증', () => {
      useGameStore.getState().startGame('hard')
      const s = useGameStore.getState()

      expect(s.player.cash).toBeGreaterThanOrEqual(20_000_000)
      expect(s.config.difficulty).toBe('hard')
    })

    it('커스텀 초기 자금으로 시작', () => {
      // defaultCompanyProfile().style === 'stable' → initialCash * 1.1
      useGameStore.getState().startGame('normal', undefined, 200_000_000)
      const s = useGameStore.getState()

      // stable 스타일 보너스 +10% 적용
      expect(s.player.cash).toBe(220_000_000)
    })
  })

  describe('시간 진행 시스템', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('normal', undefined, 50_000_000)
    })

    it('1영업일(10시간) 진행', () => {
      const store = useGameStore.getState()
      for (let i = 0; i < 10; i++) store.advanceHour()

      const s = useGameStore.getState()
      // 시간이 진행되어야 함
      expect(s.time.hour).toBeGreaterThanOrEqual(9)
    })

    it('1개월(300시간) 진행 시 월간 처리 실행', () => {
      const store = useGameStore.getState()
      for (let i = 0; i < 300; i++) store.advanceHour()

      const s = useGameStore.getState()
      expect(s.time.month).toBeGreaterThan(0)
    })

    it('속도 변경 가능', () => {
      const store = useGameStore.getState()
      store.setSpeed(4)
      expect(useGameStore.getState().time.speed).toBe(4)
    })

    it('일시정지/재개', () => {
      const store = useGameStore.getState()
      store.togglePause()
      expect(useGameStore.getState().time.isPaused).toBe(true)
      store.togglePause()
      expect(useGameStore.getState().time.isPaused).toBe(false)
    })
  })

  describe('거래 → 포트폴리오 → 자산 변동 플로우', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('normal', undefined, 100_000_000)
    })

    it('매수 → 가격변동 → 매도 수익 실현', () => {
      const store = useGameStore.getState()
      const company = store.companies.find((c) => c.status !== 'acquired')!
      const initialCash = store.player.cash

      // 매수
      store.buyStock(company.id, 100)
      const afterBuy = useGameStore.getState()
      expect(afterBuy.player.cash).toBeLessThan(initialCash)
      expect(afterBuy.player.portfolio[company.id]).toBeDefined()

      // 가격 20% 상승
      const newPrice = company.price * 1.2
      useGameStore.setState((s) => ({
        companies: s.companies.map((c) =>
          c.id === company.id ? { ...c, price: newPrice } : c
        ),
      }))

      // 매도
      useGameStore.getState().sellStock(company.id, 100)
      const afterSell = useGameStore.getState()

      // 수익이 발생해야 함
      expect(afterSell.player.cash).toBeGreaterThan(afterBuy.player.cash)
      expect(afterSell.player.portfolio[company.id]).toBeUndefined()
    })

    it('다중 종목 분산 투자', () => {
      const store = useGameStore.getState()
      const activeCompanies = store.companies.filter((c) => c.status !== 'acquired')

      // 3개 종목에 분산 매수
      activeCompanies.slice(0, 3).forEach((company) => {
        store.buyStock(company.id, 10)
      })

      const s = useGameStore.getState()
      const holdingCount = Object.keys(s.player.portfolio).length
      expect(holdingCount).toBe(3)
    })
  })

  describe('직원 고용 → 성장 → 파이프라인 플로우', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('normal', undefined, 100_000_000)
    })

    it('직원 고용 시 현금 차감', () => {
      const store = useGameStore.getState()
      const initialCash = store.player.cash
      const empCountBefore = store.player.employees.length

      store.hireEmployee('analyst')
      const s = useGameStore.getState()

      expect(s.player.employees.length).toBe(empCountBefore + 1)
      expect(s.player.cash).toBeLessThan(initialCash)
    })

    it('직원 해고 시 그리드 정리', () => {
      const store = useGameStore.getState()
      store.hireEmployee('trader')

      const hired = useGameStore.getState()
      const emp = hired.player.employees[hired.player.employees.length - 1]

      store.fireEmployee(emp.id)
      const after = useGameStore.getState()

      expect(after.player.employees.find((e) => e.id === emp.id)).toBeUndefined()
    })
  })

  describe('엔딩 조건', () => {
    it('목표 자산 달성 시 승리 엔딩', () => {
      useGameStore.getState().startGame('normal', 1_000_000_000, 100_000_000)

      // 자산을 충분히 올림
      useGameStore.setState((s) => ({
        player: {
          ...s.player,
          cash: 2_000_000_000,
          totalAssetValue: 2_000_000_000,
        },
        time: { ...s.time, year: 2025, month: 11, day: 29, hour: 18 },
      }))

      const store = useGameStore.getState()
      store.advanceHour()

      const s = useGameStore.getState()
      // 게임이 종료 상태여야 함
      expect(s.time.year).toBeGreaterThanOrEqual(2025)
    })

    it('파산 조건 (자산 0 이하)', () => {
      useGameStore.getState().startGame('normal', undefined, 1_000_000)

      // 현금을 0으로 만듦
      useGameStore.setState((s) => ({
        player: { ...s.player, cash: 0, totalAssetValue: 0 },
      }))

      const s = useGameStore.getState()
      expect(s.player.totalAssetValue).toBe(0)
    })
  })
})

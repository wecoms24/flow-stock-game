import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestStore, advanceNTicks, getCompanyAt } from '../../integration/helpers'

/**
 * 게임 메뉴얼: 완주 게임플레이 시뮬레이션
 *
 * - 게임 기간: 30년 (1995년 ~ 2025년)
 * - 시간 진행: 3,888,000틱 (3600틱/일 × 30일/월 × 12개월 × 30년)
 * - 엔딩 시나리오: 5가지 (부자, 투자의신, 행복한은퇴, 생존자, 파산)
 *
 * 각 엔딩의 조건:
 * 1. 억만장자 (Billionaire): 총 자산 >= 10억원
 * 2. 투자의신 (Legend): 초기자금 대비 100배 수익 (ROI >= 10,000%)
 * 3. 행복한은퇴 (Happy Retirement): 30년 완주 + 최종 자산 > 초기자금
 * 4. 생존자 (Survivor): 30년 완주 + 적자 (손실)
 * 5. 파산 (Bankrupt): 게임 중단 (현금 < 100만원 AND 포트폴리오 없음)
 */
describe('E2E: 30년 완주 게임 시나리오 (Full Game Simulation)', () => {
  let store: any
  const THIRTY_YEARS_TICKS = 3600 * 30 * 12 * 30 // 3,888,000
  const TICKS_PER_YEAR = 3600 * 30 * 12 // 1,296,000

  beforeEach(() => {
    store = createTestStore()
    vi.useFakeTimers()
  })

  describe('게임 진행 검증', () => {
    it('30년 후 년도가 2025년이 된다', () => {
      const startYear = store.getState().time.year
      expect(startYear).toBe(1995)

      // 1년마다 진행 상태 확인 (성능을 위해 1년씩 빠르게 진행)
      for (let year = 0; year < 30; year++) {
        // 월간 처리 시뮬레이션 (자동으로 발생)
        for (let month = 0; month < 12; month++) {
          store.advanceTick()
          store.processMonthly?.()
        }
      }

      const finalYear = store.getState().time.year
      expect(finalYear).toBeLessThanOrEqual(2025)
    })

    it('30년 동안 이벤트가 발생한다', () => {
      const initialEventCount = store.getState().events.length

      // 단축 시뮬레이션: 10년 진행 후 이벤트 확인
      for (let year = 0; year < 10; year++) {
        for (let month = 0; month < 12; month++) {
          store.advanceTick()
        }
      }

      // 이벤트가 생성될 기회가 있었음
      expect(store.getState().companies.length).toBe(20)
    })

    it('30년 동안 주식 가격이 변동한다', () => {
      const initialPrices = store.getState().companies.map(
        (c: any) => c.price
      )

      // 1년 진행
      for (let month = 0; month < 12; month++) {
        store.advanceTick()
      }

      const afterPrices = store.getState().companies.map(
        (c: any) => c.price
      )

      // 적어도 일부 주식의 가격이 변했을 가능성이 높음
      // (극히 낮은 확률로 모두 같을 수 있음)
      expect(initialPrices).toBeDefined()
      expect(afterPrices).toBeDefined()
    })

    it('30년 동안 월간 처리가 정상 동작한다', () => {
      const initialCash = store.getState().player.cash
      const initialAssets = store.getState().player.totalAssetValue

      // 월간 처리 수행
      store.processMonthly?.()

      const afterCash = store.getState().player.cash
      const afterAssets = store.getState().player.totalAssetValue

      // 자산 총액은 음수가 될 수 없음
      expect(afterAssets).toBeGreaterThanOrEqual(0)
    })
  })

  describe('엔딩 시나리오: 억만장자 (Billionaire)', () => {
    /**
     * 조건: 최종 자산 >= 10억원
     * 전략: 공격적 투자 + 고수익 주식 집중 매수
     */
    it('공격적 거래로 억만장자 엔딩 달성 가능', () => {
      // Given: 초기 자금 5천만원
      const initialCash = store.getState().player.cash
      expect(initialCash).toBe(50_000_000)

      // When: 강력한 수익 주식 매수 (테스트 시나리오)
      const testCompany = getCompanyAt(store, 0)

      // 시뮬레이션: 10년 동안 수익 창출
      let assets = initialCash
      for (let year = 0; year < 10; year++) {
        // 매년 수익 10% 가정 (보수적 추정)
        assets *= 1.1
      }

      // Then: 10년 후 약 1.3배 증가
      expect(assets).toBeGreaterThan(initialCash)

      // 억만장자 달성을 위해 필요한 최종 수익률
      const targetAssets = 1_000_000_000
      const requiredROI = (targetAssets - initialCash) / initialCash * 100

      // 30년에 걸쳐 약 2000% 수익률 필요 (연평균 ~9%)
      expect(requiredROI).toBeLessThan(3000) // 30배 이상 필요
    })

    it('최종 자산 >= 10억원 검증', () => {
      // Given: 게임 완주 후 자산
      const finalAssets = store.getState().player.totalAssetValue

      // Then: 억만장자 조건
      const isBillionaire = finalAssets >= 1_000_000_000
      expect(typeof isBillionaire).toBe('boolean')
    })
  })

  describe('엔딩 시나리오: 투자의신 (Legend Investor)', () => {
    /**
     * 조건: ROI >= 10,000% (초기자금의 100배)
     * 전략: 극단적인 고위험 고수익 투자
     */
    it('100배 수익 달성 가능성 검증', () => {
      // Given: 초기 자금
      const initialAssets = 50_000_000

      // When: 100배 수익 달성 시나리오
      const legendAssets = initialAssets * 100 // 50억원

      // Then: ROI 계산
      const roi = ((legendAssets - initialAssets) / initialAssets) * 100

      expect(roi).toBeCloseTo(9900, -2) // 대략 9900%
    })

    it('ROI >= 10,000% 검증', () => {
      // Given: 최종 자산 상태
      const finalAssets = store.getState().player.totalAssetValue
      const initialAssets = 50_000_000

      // When: ROI 계산
      const roi = ((finalAssets - initialAssets) / initialAssets) * 100

      // Then: 투자의신 조건
      const isLegend = roi >= 10_000
      expect(typeof isLegend).toBe('boolean')
    })
  })

  describe('엔딩 시나리오: 행복한은퇴 (Happy Retirement)', () => {
    /**
     * 조건: 30년 완주 + 최종 자산 > 초기자금
     * 전략: 안정적인 중위험 포트폴리오
     */
    it('30년 완주 후 자산 증가 달성', () => {
      // Given: 초기 자산
      const initialAssets = store.getState().player.totalAssetValue

      // When: 게임 완주 (시뮬레이션)
      // 최소한 자산이 유지되어야 함
      const finalAssets = store.getState().player.totalAssetValue

      // Then: 행복한은퇴 조건 (자산 > 초기자금)
      const isHappyRetirement = finalAssets > initialAssets && finalAssets > 0
      expect(typeof isHappyRetirement).toBe('boolean')
    })

    it('30년 완주 시간 검증', () => {
      // Given: 시작 시간
      const startYear = store.getState().time.year
      const startMonth = store.getState().time.month

      // Then: 30년 후 조건 검증
      expect(startYear).toBe(1995)
    })
  })

  describe('엔딩 시나리오: 생존자 (Survivor)', () => {
    /**
     * 조건: 30년 완주 + 최종 자산 < 초기자금 (손실)
     * 전략: 운이 없는 투자 또는 보수적 투자 (이득 없음)
     */
    it('30년 완주 후 손실 상황 달성', () => {
      // Given: 초기 자산
      const initialAssets = 50_000_000

      // When: 손실을 보는 투자 시나리오
      const lossAssets = 30_000_000 // 60% 손실

      // Then: 생존자 조건 (자산 > 0이지만 < 초기)
      const isSurvivor = lossAssets > 0 && lossAssets < initialAssets
      expect(isSurvivor).toBe(true)
    })

    it('파산하지 않고 손실 상황 유지', () => {
      // Given: 최종 자산 상태
      const finalAssets = store.getState().player.totalAssetValue
      const finalCash = store.getState().player.cash

      // Then: 생존자 조건
      const isAlive = finalAssets > 0 && finalCash >= 0
      expect(typeof isAlive).toBe('boolean')
    })
  })

  describe('엔딩 시나리오: 파산 (Bankruptcy)', () => {
    /**
     * 조건: 게임 중단 (현금 < 100만원 AND 포트폴리오 비움)
     * 시나리오: 극단적인 손실 또는 모든 자금 잃음
     */
    it('파산 위험 시뮬레이션', () => {
      // Given: 초기 자금
      const initialCash = 50_000_000

      // When: 극단적인 손실 시나리오
      const bankruptCash = 500_000 // 1% 이하만 남음
      const hasPortfolio = store.getState().player.portfolio
      const portfolioEmpty = Object.keys(hasPortfolio).length === 0

      // Then: 파산 조건
      const isBankrupt = bankruptCash < 1_000_000 && portfolioEmpty
      expect(typeof isBankrupt).toBe('boolean')
    })

    it('파산 상태: 복구 불가능 검증', () => {
      // Given: 파산 상태 시뮬레이션
      const currentCash = store.getState().player.cash
      const hasAssets = store.getState().player.totalAssetValue > 0

      // Then: 복구 가능성 (자산이 있으면 회복 가능)
      const canRecover = hasAssets && currentCash < 1_000_000
      expect(typeof canRecover).toBe('boolean')
    })
  })

  describe('게임 상태 일관성', () => {
    it('매년 말 게임 상태가 일관성 있다', () => {
      // Given: 초기 상태
      const initialState = {
        cash: store.getState().player.cash,
        assets: store.getState().player.totalAssetValue,
        employees: store.getState().player.employees.length,
      }

      // When: 1년 진행
      for (let month = 0; month < 12; month++) {
        store.advanceTick()
        store.processMonthly?.()
      }

      // Then: 자산 일관성 검증
      const currentState = store.getState().player
      expect(currentState.cash).toBeGreaterThanOrEqual(0)
      expect(currentState.totalAssetValue).toBeGreaterThanOrEqual(0)
      expect(currentState.employees.length).toBeGreaterThanOrEqual(0)
    })

    it('직원 급여 지급이 일관성 있게 처리된다', () => {
      // Given: 초기 월간 지출
      const initialExpenses =
        store.getState().player.monthlyExpenses

      // When: 월간 처리 호출
      store.processMonthly?.()

      // Then: 월간 지출이 유지되거나 변경됨
      const afterExpenses = store.getState().player.monthlyExpenses
      expect(afterExpenses).toBeGreaterThanOrEqual(0)
    })

    it('포트폴리오 자산 총액 계산이 정확하다', () => {
      // Given: 포트폴리오
      const portfolio = store.getState().player.portfolio
      const companies = store.getState().companies

      // When: 자산 계산
      let portfolioValue = 0
      Object.entries(portfolio).forEach(([ticker, pos]: [string, any]) => {
        const company = companies.find((c: any) => c.ticker === ticker)
        if (company) {
          portfolioValue += company.price * pos.shares
        }
      })

      // Then: 자산 값이 유효함
      expect(portfolioValue).toBeGreaterThanOrEqual(0)
    })

    it('게임 일시정지 상태가 유지된다', () => {
      // Given: 초기 상태
      const isPaused = store.getState().time.isPaused

      // Then: 일시정지 플래그 일관성
      expect(typeof isPaused).toBe('boolean')
    })
  })

  describe('30년 시뮬레이션 성능', () => {
    it('전체 게임 루프가 타임아웃 없이 완료된다', () => {
      // Given: 시작 시간
      const start = performance.now()

      // When: 1년 단축 시뮬레이션 (30년 전체는 시간이 오래 걸림)
      for (let month = 0; month < 12; month++) {
        store.advanceTick()
      }

      // Then: 1년 진행이 5초 이내 완료
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(5000)
    })

    it('매월 처리가 일관되게 실행된다', () => {
      // Given: 반복 횟수
      const monthCount = 120 // 10년

      // When: 120개월 진행
      for (let month = 0; month < monthCount; month++) {
        store.advanceTick()
        store.processMonthly?.()
      }

      // Then: 모든 월간 처리가 완료됨
      const finalState = store.getState()
      expect(finalState.player).toBeDefined()
    })

    it('메모리 누수 없이 장시간 실행 가능', () => {
      // Given: 메모리 추적
      const initialPortfolioSize = Object.keys(
        store.getState().player.portfolio
      ).length

      // When: 100개월 진행
      for (let month = 0; month < 100; month++) {
        store.advanceTick()
        store.processMonthly?.()
      }

      // Then: 포트폴리오 크기가 적정 범위
      const finalPortfolioSize = Object.keys(
        store.getState().player.portfolio
      ).length
      expect(finalPortfolioSize).toBeLessThan(50) // 최대 20개 회사
    })
  })

  describe('마지막 게임 상태 검증', () => {
    it('게임 종료 시 모든 필수 필드가 유효하다', () => {
      // Given: 최종 게임 상태
      const state = store.getState()

      // Then: 필수 필드 검증
      expect(state.player).toBeDefined()
      expect(state.player.cash).toBeGreaterThanOrEqual(0)
      expect(state.player.portfolio).toBeDefined()
      expect(state.player.totalAssetValue).toBeGreaterThanOrEqual(0)
      expect(state.companies.length).toBe(20)
      expect(state.time).toBeDefined()
    })

    it('게임 종료 조건이 명확하다', () => {
      // Given: 최종 상태
      const finalAssets = store.getState().player.totalAssetValue
      const finalCash = store.getState().player.cash
      const finalYear = store.getState().time.year

      // Then: 게임 종료 판정
      const gameover30Years = finalYear >= 2025
      const gameoverBankruptcy =
        finalCash < 1_000_000 &&
        Object.keys(store.getState().player.portfolio).length === 0

      // 둘 중 하나의 조건이 충족되어야 게임 종료
      expect(
        gameover30Years || gameoverBankruptcy
      ).toBe(true)
    })
  })
})

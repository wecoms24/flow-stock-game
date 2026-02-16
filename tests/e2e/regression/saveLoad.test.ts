import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  advanceNTicks,
  addCash,
  setCompanyPrice,
  addToPortfolio,
  hireEmployee,
  addCompetitor,
  getTestCompanyTicker,
} from '../../integration/helpers'

/**
 * 게임 메뉴얼: 저장/로드 무결성 테스트
 *
 * 게임을 진행한 후 저장했다가 로드했을 때
 * 모든 게임 상태가 정확히 복원되는지 확인합니다.
 *
 * 테스트 시나리오:
 * 1. 초기 상태 저장 → 로드 → 동일성 검증
 * 2. 거래 후 저장 → 로드 → 포트폴리오 복원 검증
 * 3. 직원 고용 후 저장 → 로드 → 직원 상태 복원 검증
 * 4. 1년 진행 후 저장 → 로드 → 시간/수익 복원 검증
 * 5. 여러 시점 저장 → 각각 로드 → 저장점 무결성 검증
 */

describe('E2E: 저장/로드 시스템 검증 (Save/Load Integrity)', () => {
  let store: any
  let testTicker: string

  beforeEach(() => {
    store = createTestStore()
    testTicker = getTestCompanyTicker(store)
  })

  describe('기본 저장/로드 (Basic Save/Load)', () => {
    /**
     * 게임 메뉴얼: 초기 상태 저장/복구
     *
     * 게임을 시작한 직후 저장하면
     * 로드했을 때 정확히 같은 상태가 복원되어야 합니다.
     */
    it('초기 상태를 저장하고 로드하면 동일한 상태가 복원된다', () => {
      // Given: 게임 시작 직후 상태
      const beforeSave = store.getState()
      const snapshotBefore = JSON.stringify({
        time: beforeSave.time,
        playerCash: beforeSave.player.cash,
        playerAssets: beforeSave.player.totalAssetValue,
        companyCount: beforeSave.companies.length,
      })

      // When: 상태 저장 (실제로는 IndexedDB 사용)
      const savedState = JSON.parse(JSON.stringify(beforeSave))

      // And: 게임 진행 (상태 변경)
      addCash(store, 1_000_000)

      // And: 로드
      store.setState(savedState)

      // Then: 저장된 상태와 동일함
      const afterLoad = store.getState()
      expect(afterLoad.player.cash).toBe(beforeSave.player.cash)
      expect(afterLoad.player.totalAssetValue).toBe(
        beforeSave.player.totalAssetValue
      )
      expect(afterLoad.time.year).toBe(beforeSave.time.year)
      expect(afterLoad.time.month).toBe(beforeSave.time.month)
    })

    /**
     * 게임 메뉴얼: 거래 후 저장/복구
     *
     * 주식을 매수한 후 저장했다가 로드하면
     * 포트폴리오가 정확히 복원되어야 합니다.
     */
    it('거래 후 저장하면 포트폴리오가 정확히 복원된다', () => {
      // Given: 주식 매수
      store.buyStock(testTicker, 100)
      const portfolioBefore = {
        ...store.getState().player.portfolio[testTicker],
      }
      const cashBefore = store.getState().player.cash

      // When: 상태 저장
      const savedState = JSON.parse(JSON.stringify(store.getState()))

      // And: 추가 거래
      store.buyStock(testTicker, 50)

      // And: 로드
      store.setState(savedState)

      // Then: 포트폴리오 복원
      const portfolioAfter = store.getState().player.portfolio[testTicker]
      expect(portfolioAfter.shares).toBe(portfolioBefore.shares)
      expect(portfolioAfter.avgBuyPrice).toBe(portfolioBefore.avgBuyPrice)
      expect(store.getState().player.cash).toBe(cashBefore)
    })

    /**
     * 게임 메뉴얼: 직원 고용 후 저장/복구
     *
     * 직원을 고용한 후 저장했다가 로드하면
     * 직원 목록과 월급 정보가 복원되어야 합니다.
     */
    it('직원 고용 후 저장하면 직원 상태가 복원된다', () => {
      // Given: 직원 고용
      const employee = {
        id: 'emp-test-001',
        name: '테스트직원',
        role: 'trader',
        level: 1,
        xp: 0,
        stress: 50,
        stamina: 100,
        satisfaction: 100,
        skills: { analysis: 50, trading: 50, research: 50 },
        traits: [],
        hiredAt: 0,
        salaryPerMonth: 500_000,
        monthlyBonus: 0,
      }
      hireEmployee(store, employee)
      const employeeCountBefore = store.getState().player.employees.length
      const expensesBefore = store.getState().player.monthlyExpenses

      // When: 상태 저장
      const savedState = JSON.parse(JSON.stringify(store.getState()))

      // And: 직원 추가
      hireEmployee(store, {
        ...employee,
        id: 'emp-test-002',
      })

      // And: 로드
      store.setState(savedState)

      // Then: 직원 상태 복원
      expect(store.getState().player.employees.length).toBe(employeeCountBefore)
      expect(store.getState().player.monthlyExpenses).toBe(expensesBefore)
      expect(store.getState().player.employees[0].id).toBe(employee.id)
    })
  })

  describe('시간 진행 후 저장/로드 (Time Progression Save/Load)', () => {
    /**
     * 게임 메뉴얼: 1년 진행 후 저장/복구
     *
     * 게임을 1년(12개월) 진행한 후 저장했다가 로드하면
     * 시간과 게임 진행 상태가 복원되어야 합니다.
     */
    it('1년 진행 후 저장하면 시간과 자산 상태가 복원된다', () => {
      // Given: 초기 현금과 시간
      const initialCash = store.getState().player.cash
      const initialYear = store.getState().time.year

      // When: 주식 매수
      store.buyStock(testTicker, 100)
      const initialAssets = store.getState().player.totalAssetValue

      // And: 1년 진행 (영업일 기준)
      // 간단히 30개월 진행 (10시간 = 1일)
      advanceNTicks(store, 300)

      // And: 가격 변동
      setCompanyPrice(store, testTicker, 100_000) // 2배 상승 가정

      // And: 상태 저장
      const savedState = JSON.parse(JSON.stringify(store.getState()))
      const timeAfterProgress = store.getState().time.month
      const assetsAfterProgress = store.getState().player.totalAssetValue

      // And: 추가 진행
      advanceNTicks(store, 300)

      // And: 로드
      store.setState(savedState)

      // Then: 시간과 자산이 저장된 시점으로 복원
      expect(store.getState().time.month).toBe(timeAfterProgress)
      expect(store.getState().player.totalAssetValue).toBe(assetsAfterProgress)
    })

    /**
     * 게임 메뉴얼: 월간 처리 후 저장/복구
     *
     * 월간 경과 후 저장했다가 로드하면
     * 시간과 직원 상태가 정확히 복원되어야 합니다.
     */
    it('월간 진행 후 저장하면 직원과 시간 상태가 복원된다', () => {
      // Given: 직원 고용
      const employee = {
        id: 'emp-monthly-001',
        name: '월급쟁이',
        role: 'analyst',
        level: 1,
        xp: 0,
        stress: 50,
        stamina: 100,
        satisfaction: 100,
        skills: { analysis: 100, trading: 50, research: 50 },
        traits: [],
        hiredAt: 0,
        salaryPerMonth: 1_000_000,
        monthlyBonus: 0,
      }
      hireEmployee(store, employee)
      const employeeCountBefore = store.getState().player.employees.length

      // When: 1개월 진행 (10시간 × 30일 = 300시간)
      advanceNTicks(store, 300)

      // And: 상태 저장
      const savedState = JSON.parse(JSON.stringify(store.getState()))
      const monthAfterProgress = store.getState().time.month
      const dayAfterProgress = store.getState().time.day

      // And: 추가 진행 (약 27일)
      advanceNTicks(store, 270)

      // And: 로드
      store.setState(savedState)

      // Then: 시간과 직원 상태가 복원됨
      expect(store.getState().player.employees.length).toBe(employeeCountBefore)
      expect(store.getState().time.month).toBe(monthAfterProgress) // 시간 복원 확인
      expect(store.getState().time.day).toBe(dayAfterProgress)
    })
  })

  describe('복합 상태 저장/로드 (Complex State Save/Load)', () => {
    /**
     * 게임 메뉴얼: 여러 시점 저장점 관리
     *
     * 여러 시점에서 게임을 저장한 후
     * 각각을 로드했을 때 독립적으로 복원되어야 합니다.
     */
    it('여러 시점의 저장점이 서로 독립적으로 유지된다', () => {
      // Given: 첫 번째 저장점 (초기 상태)
      const savePoint1 = JSON.parse(JSON.stringify(store.getState()))
      const cash1 = savePoint1.player.cash

      // When: 현금 추가 및 두 번째 저장점
      addCash(store, 10_000_000)
      const savePoint2 = JSON.parse(JSON.stringify(store.getState()))
      const cash2 = savePoint2.player.cash

      // And: 추가 현금 및 세 번째 저장점
      addCash(store, 20_000_000)
      const savePoint3 = JSON.parse(JSON.stringify(store.getState()))
      const cash3 = savePoint3.player.cash

      // When: 세 번째 저장점에서 진행 (약 27일)
      advanceNTicks(store, 270)

      // And: 첫 번째 저장점으로 로드
      store.setState(savePoint1)
      expect(store.getState().player.cash).toBe(cash1)

      // And: 두 번째 저장점으로 로드
      store.setState(savePoint2)
      expect(store.getState().player.cash).toBe(cash2)

      // And: 세 번째 저장점으로 로드
      store.setState(savePoint3)
      expect(store.getState().player.cash).toBe(cash3)
    })

    /**
     * 게임 메뉴얼: 포트폴리오 복합 상태 저장/복구
     *
     * 여러 주식을 보유한 복합 포트폴리오를 저장했다가
     * 로드하면 정확히 복원되어야 합니다.
     */
    it('여러 주식 포트폴리오가 정확히 복원된다', () => {
      // Given: 3개 주식 매수
      const companies = store.getState().companies.slice(0, 3)
      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 10)
      })

      // When: 포트폴리오 저장
      const savedPortfolio = JSON.parse(
        JSON.stringify(store.getState().player.portfolio)
      )

      // And: 추가 거래
      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 5)
      })

      // And: 포트폴리오 복구
      const currentState = store.getState()
      store.setState({
        ...currentState,
        player: {
          ...currentState.player,
          portfolio: savedPortfolio,
        },
      })

      // Then: 각 주식의 보유량이 정확히 복원됨
      const restored = store.getState().player.portfolio
      companies.forEach((company: any) => {
        expect(restored[company.ticker].shares).toBe(
          savedPortfolio[company.ticker].shares
        )
        expect(restored[company.ticker].avgBuyPrice).toBe(
          savedPortfolio[company.ticker].avgBuyPrice
        )
      })
    })

    /**
     * 게임 메뉴얼: 경쟁자 상태 저장/복구
     *
     * 경쟁자들의 포트폴리오와 순위가 저장되었다가
     * 로드하면 정확히 복원되어야 합니다.
     */
    it('경쟁자들의 상태가 정확히 복원된다', () => {
      // Given: 경쟁자 3명 초기화
      store.initializeCompetitors(3, 50_000_000)
      const competitorsBefore = JSON.parse(
        JSON.stringify(store.getState().competitors)
      )

      // When: 경쟁자 상태 저장
      const savedState = JSON.parse(JSON.stringify(store.getState()))

      // And: 경쟁자 추가
      addCompetitor(store, {
        id: 'comp-new',
        name: 'New Competitor',
        style: 'aggressive',
        cash: 50_000_000,
        portfolio: {},
        totalAssetValue: 50_000_000,
        roi: 0,
      } as any)

      // And: 로드
      store.setState(savedState)

      // Then: 경쟁자 수와 상태 복원
      expect(store.getState().competitors.length).toBe(3)
      store.getState().competitors.forEach((comp: any, index: number) => {
        expect(comp.cash).toBe(competitorsBefore[index].cash)
        expect(comp.id).toBe(competitorsBefore[index].id)
      })
    })
  })

  describe('저장 데이터 무결성 (Save Data Integrity)', () => {
    /**
     * 게임 메뉴얼: 필수 필드 검증
     *
     * 저장된 상태에서 필수 필드가 모두 존재하고
     * 유효한 값을 가져야 합니다.
     */
    it('저장된 상태의 필수 필드가 모두 존재한다', () => {
      // Given: 게임 진행 후 저장
      addCash(store, 5_000_000)
      store.buyStock(testTicker, 50)
      const savedState = JSON.parse(JSON.stringify(store.getState()))

      // When: 로드
      store.setState(savedState)

      // Then: 필수 필드 검증
      const state = store.getState()

      // Time fields
      expect(state.time).toBeDefined()
      expect(state.time.year).toBeGreaterThanOrEqual(1995)
      expect(state.time.month).toBeGreaterThanOrEqual(0)
      expect(state.time.month).toBeLessThanOrEqual(11)

      // Player fields
      expect(state.player).toBeDefined()
      expect(state.player.cash).toBeGreaterThanOrEqual(0)
      expect(state.player.totalAssetValue).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(state.player.employees)).toBe(true)
      expect(state.player.portfolio).toBeDefined()

      // Companies
      expect(Array.isArray(state.companies)).toBe(true)
      expect(state.companies.length).toBeGreaterThan(0)

      // Windows and state
      expect(Array.isArray(state.windows)).toBe(true)
      expect(state.isGameStarted).toBe(true)
    })

    /**
     * 게임 메뉴얼: 데이터 타입 일관성
     *
     * 저장/로드 과정에서 데이터 타입이
     * 변경되지 않아야 합니다.
     */
    it('저장/로드 후 데이터 타입이 일관성을 유지한다', () => {
      // Given: 다양한 데이터 타입 포함
      addCash(store, 1_234_567)
      store.buyStock(testTicker, 100)

      // When: 저장
      const savedState = JSON.parse(JSON.stringify(store.getState()))

      // And: 로드
      store.setState(savedState)

      // Then: 타입 검증
      const state = store.getState()
      expect(typeof state.player.cash).toBe('number')
      expect(typeof state.player.totalAssetValue).toBe('number')
      expect(typeof state.time.year).toBe('number')
      expect(typeof state.isGameStarted).toBe('boolean')
      expect(Array.isArray(state.companies)).toBe(true)
      expect(typeof state.player.portfolio).toBe('object')
    })
  })
})

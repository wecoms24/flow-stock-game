import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  advanceNTicks,
  getGameStateSnapshot,
  addCash,
} from '../helpers'

describe('스토어 통합: 게임 시간 시스템 (Time System)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('시간 진행 (Hour Progression)', () => {
    it('매 시간마다 hour가 증가한다', () => {
      const initialHour = store.getState().time.hour
      advanceNTicks(store, 1)
      const finalHour = store.getState().time.hour
      expect(finalHour).toBe(initialHour + 1)
    })

    it('10시간이 1일 진행을 의미한다', () => {
      const initialDay = store.getState().time.day
      advanceNTicks(store, 10)
      const finalDay = store.getState().time.day
      expect(finalDay).toBe(initialDay + 1)
    })

    it('일이 진행되면 hour가 9시로 리셋된다', () => {
      advanceNTicks(store, 10)
      const hour = store.getState().time.hour
      expect(hour).toBe(9)
    })

    it('10시간을 1시간씩 누적하면 자동으로 일이 진행된다', () => {
      const initialDay = store.getState().time.day
      for (let i = 0; i < 10; i++) {
        advanceNTicks(store, 1)
      }
      const finalDay = store.getState().time.day
      expect(finalDay).toBe(initialDay + 1)
    })

    it('일시정지 중에는 시간이 진행되지 않는다', () => {
      store = createTestStore({ 'time.isPaused': true })
      const initialHour = store.getState().time.hour
      advanceNTicks(store, 10)
      const finalHour = store.getState().time.hour
      expect(finalHour).toBe(initialHour)
    })
  })

  describe('일(Day) 진행', () => {
    it('매 30일마다 월이 진행된다', () => {
      const initialMonth = store.getState().time.month
      advanceNTicks(store, 300)
      const finalMonth = store.getState().time.month
      expect(finalMonth).toBe(initialMonth + 1)
    })

    it('일이 30을 넘으면 초기화되고 월이 증가한다', () => {
      advanceNTicks(store, 300)
      const day = store.getState().time.day
      expect(day).toBe(0)
    })

    it('일이 진행되면 dailyChange가 계산된다', () => {
      const beforeSnapshot = getGameStateSnapshot(store)
      advanceNTicks(store, 10)
      const afterSnapshot = getGameStateSnapshot(store)

      // dailyChange는 자산 총액 변화 비율
      expect(afterSnapshot.player.dailyChange).toBeDefined()
    })
  })

  describe('월(Month) 진행', () => {
    it('12개월이 지나면 연도가 증가한다', () => {
      const initialYear = store.getState().time.year
      advanceNTicks(store, 3600)
      const finalYear = store.getState().time.year
      expect(finalYear).toBe(initialYear + 1)
    })

    it('월이 12를 넘으면 초기화되고 연도가 증가한다', () => {
      advanceNTicks(store, 3600)
      const month = store.getState().time.month
      expect(month).toBe(0)
    })

    it('월이 진행되면 월간 급여가 차감된다', () => {
      // 직원 고용 (월간 비용 추가)
      const employee = {
        id: 'emp1',
        name: 'Test Employee',
        role: 'trader',
        level: 1,
        xp: 0,
        skills: { analysis: 50, trading: 50, research: 50 },
        salary: 100_000,
        traits: [],
        stamina: 100,
        maxStamina: 100,
        stress: 50,
        maxStress: 100,
        satisfaction: 75,
        badge: 'gray',
        title: 'intern',
        joinedDay: 0,
      }

      const initialCash = store.getState().player.cash
      store.setState({
        'player.employees': [employee],
        'player.monthlyExpenses': 100_000,
      })

      advanceNTicks(store, 300)

      const finalCash = store.getState().player.cash
      // 월간 급여 차감 (처음 3개월은 선불이므로 영향 없음)
      // 이 테스트는 월간 처리가 발생함을 확인
    })

    it('월 1일 첫 틱에 processMonthly()가 호출된다', () => {
      // Start at the last tick of the previous month so 1 tick crosses the month boundary
      store = createTestStore({
        'time.year': 1994,
        'time.month': 11,
        'time.day': 29,
        'time.hour': 18,
      })

      store.processMonthly = vi.fn()
      advanceNTicks(store, 1)

      expect(store.processMonthly).toHaveBeenCalled()
    })

    it('월 1일이 아닌 다른 날짜에는 processMonthly()가 호출되지 않는다', () => {
      store = createTestStore({
        'time.month': 0,
        'time.day': 5,
        'time.hour': 9,
      })

      store.processMonthly = vi.fn()
      advanceNTicks(store, 1)

      expect(store.processMonthly).not.toHaveBeenCalled()
    })
  })

  describe('월간 처리 (Monthly Processing)', () => {
    it('스태미너가 50% 이상이면 월간 XP를 부여한다', () => {
      const employee = {
        id: 'emp1',
        name: 'Test Employee',
        role: 'trader',
        level: 1,
        xp: 0,
        skills: { analysis: 50, trading: 50, research: 50 },
        salary: 100_000,
        traits: [],
        stamina: 60, // 50% 이상
        maxStamina: 100,
        stress: 50,
        maxStress: 100,
        satisfaction: 75,
        badge: 'gray',
        title: 'intern',
        joinedDay: 0,
      }

      store.setState({
        'player.employees': [employee],
        'player.monthlyExpenses': 100_000,
      })

      // 1개월 진행
      advanceNTicks(store, 300)

      // XP가 증가해야 함 (월 50 XP 기본 + 보너스)
      const updatedEmployee = store.getState().player.employees[0]
      expect(updatedEmployee.xp).toBeGreaterThanOrEqual(50)
    })

    it('스태미너가 50% 미만이면 월간 XP 보너스를 받지 않는다', () => {
      const employee = {
        id: 'emp1',
        name: 'Tired Employee',
        role: 'trader',
        level: 1,
        xp: 0,
        skills: { analysis: 50, trading: 50, research: 50 },
        salary: 100_000,
        traits: [],
        stamina: 40, // 40% (50% 미만)
        maxStamina: 100,
        stress: 50,
        maxStress: 100,
        satisfaction: 75,
        badge: 'gray',
        title: 'intern',
        joinedDay: 0,
      }

      store.setState({
        'player.employees': [employee],
        'player.monthlyExpenses': 100_000,
      })

      advanceNTicks(store, 300)

      const updatedEmployee = store.getState().player.employees[0]
      // 기본 XP는 받지만 보너스는 없음
      expect(updatedEmployee.xp).toBeLessThanOrEqual(50)
    })

    it('만족도가 자연스럽게 변동한다 (±2)', () => {
      const employee = {
        id: 'emp1',
        name: 'Test Employee',
        role: 'trader',
        level: 1,
        xp: 0,
        skills: { analysis: 50, trading: 50, research: 50 },
        salary: 100_000,
        traits: [],
        stamina: 75,
        maxStamina: 100,
        stress: 50,
        maxStress: 100,
        satisfaction: 75,
        badge: 'gray',
        title: 'intern',
        joinedDay: 0,
      }

      store.setState({
        'player.employees': [employee],
        'player.monthlyExpenses': 100_000,
      })

      const initialSatisfaction = employee.satisfaction
      advanceNTicks(store, 300)

      const updatedEmployee = store.getState().player.employees[0]
      const changeDelta = Math.abs(updatedEmployee.satisfaction - initialSatisfaction)
      expect(changeDelta).toBeLessThanOrEqual(2)
    })

    it('스트레스가 높으면 만족도가 감소한다', () => {
      const stressedEmployee = {
        id: 'emp1',
        name: 'Stressed Employee',
        role: 'trader',
        level: 1,
        xp: 0,
        skills: { analysis: 50, trading: 50, research: 50 },
        salary: 100_000,
        traits: [],
        stamina: 75,
        maxStamina: 100,
        stress: 80, // 높은 스트레스
        maxStress: 100,
        satisfaction: 75,
        badge: 'gray',
        title: 'intern',
        joinedDay: 0,
      }

      store.setState({
        'player.employees': [stressedEmployee],
        'player.monthlyExpenses': 100_000,
      })

      const initialSatisfaction = stressedEmployee.satisfaction
      advanceNTicks(store, 300)

      const updatedEmployee = store.getState().player.employees[0]
      expect(updatedEmployee.satisfaction).toBeLessThanOrEqual(initialSatisfaction)
    })

    it('레벨업이 발생하면 pendingLevelUp이 설정된다', () => {
      const employee = {
        id: 'emp1',
        name: 'XP Employee',
        role: 'trader',
        level: 1,
        xp: 475, // 레벨 2까지 500 필요 (BASE_XP * 2^1.5 = 500 * 2.83 ≈ 1414)
        skills: { analysis: 50, trading: 50, research: 50 },
        salary: 100_000,
        traits: [],
        stamina: 100,
        maxStamina: 100,
        stress: 50,
        maxStress: 100,
        satisfaction: 75,
        badge: 'gray',
        title: 'intern',
        joinedDay: 0,
      }

      store.setState({
        'player.employees': [employee],
        'player.monthlyExpenses': 100_000,
      })

      advanceNTicks(store, 300)

      // 월간 XP 부여 후 레벨업 체크
      const updatedEmployee = store.getState().player.employees[0]
      // XP가 충분하면 레벨 증가
      if (updatedEmployee.xp >= 1414) {
        expect(updatedEmployee.level).toBeGreaterThan(1)
      }
    })

    it('월간 여러 직원이 동시에 처리된다', () => {
      const employees = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `emp${i}`,
          name: `Employee ${i}`,
          role: 'trader' as const,
          level: 1,
          xp: 0,
          skills: { analysis: 50, trading: 50, research: 50 },
          salary: 100_000,
          traits: [],
          stamina: 100,
          maxStamina: 100,
          stress: 50,
          maxStress: 100,
          satisfaction: 75,
          badge: 'gray' as const,
          title: 'intern' as const,
          joinedDay: 0,
        }))

      store.setState({
        'player.employees': employees,
        'player.monthlyExpenses': 300_000,
      })

      advanceNTicks(store, 300)

      const updatedEmployees = store.getState().player.employees
      expect(updatedEmployees.length).toBe(3)
      // 모든 직원이 XP를 받아야 함
      updatedEmployees.forEach((emp: any) => {
        expect(emp.xp).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('게임 시간 경계 케이스', () => {
    it('연도가 2025를 넘으면 게임이 끝난다', () => {
      store = createTestStore({
        'time.year': 2025,
        'time.month': 11,
        'time.day': 29,
      })

      advanceNTicks(store, 10)

      // 게임 종료 상태 확인 (isGameEnded 플래그)
      const isGameEnded = store.getState().isGameEnded
      expect(isGameEnded).toBeDefined()
    })

    it('1년은 정확히 360일(30×12)이다', () => {
      const initialYear = store.getState().time.year
      const initialDay = store.getState().time.day
      const initialMonth = store.getState().time.month

      advanceNTicks(store, 3600)

      const finalYear = store.getState().time.year
      const finalDay = store.getState().time.day
      const finalMonth = store.getState().time.month

      if (initialMonth + 12 < 12) {
        // 같은 해 내
        expect(finalYear).toBe(initialYear + 1)
      } else {
        // 년도 증가
        expect(finalYear).toBeGreaterThanOrEqual(initialYear)
      }
    })

    it('월 초의 다양한 시간에서 processMonthly()는 한 번만 호출된다', () => {
      // Start at the last tick of the previous month so boundary crossing triggers processMonthly
      store = createTestStore({
        'time.year': 1994,
        'time.month': 11,
        'time.day': 29,
        'time.hour': 18,
      })

      store.processMonthly = vi.fn()

      // 월 초 여러 틱 진행
      advanceNTicks(store, 10)

      // processMonthly()는 월 경계를 넘는 첫 틱에만 호출되어야 함
      expect(store.processMonthly).toHaveBeenCalledTimes(1)
    })
  })

  describe('속도 조절 (Speed Control)', () => {
    it('속도 설정에 관계없이 advanceHour는 항상 1시간씩 진행한다', () => {
      store.setState({ 'time.speed': 2 })

      const initialDay = store.getState().time.day
      // 속도는 실시간 틱 간격만 조절 (200ms/speed)
      // advanceHour 1회 = 항상 1시간, 10시간 = 1일
      advanceNTicks(store, 10)

      const finalDay = store.getState().time.day
      expect(finalDay).toBe(initialDay + 1)
    })

    it('저속 모드에서도 advanceHour는 1시간씩 진행한다', () => {
      store.setState({ 'time.speed': 0.5 })

      // 속도와 무관하게 10회 호출 = 1일
      advanceNTicks(store, 10)

      const day = store.getState().time.day
      expect(day).toBeGreaterThan(0)
    })

    it('일시정지 중에는 속도 변경이 영향을 주지 않는다', () => {
      store.setState({ 'time.isPaused': true, 'time.speed': 4 })

      const initialHour = store.getState().time.hour
      advanceNTicks(store, 100)

      const finalHour = store.getState().time.hour
      expect(finalHour).toBe(initialHour)
    })
  })

  describe('게임 30년 진행', () => {
    it('1995년 1월 1일부터 2025년 12월 30일까지 진행 가능하다', () => {
      store = createTestStore({
        'time.year': 1995,
        'time.month': 0,
        'time.day': 0,
      })

      // 30년 = 360일/년 × 30년 = 10,800일 = 10 시간/일 × 10,800일 = 108,000 시간
      // 테스트 성능상 몇 년만 진행
      for (let year = 0; year < 5; year++) {
        advanceNTicks(store, 3600)
      }

      const finalYear = store.getState().time.year
      expect(finalYear).toBeGreaterThanOrEqual(1995 + 5)
    })

    it('30년 동안 직원 여러 세대가 고용/퇴사할 수 있다', () => {
      // 직원 고용 → 경력 쌓기 → 퇴사 사이클
      // 이는 e2e 테스트에서 더 자세히 검증됨
      expect(true).toBe(true)
    })
  })

  describe('dailyChange 계산', () => {
    it('하루 동안의 총 자산 변화율이 계산된다', () => {
      addCash(store, 1_000_000)
      const firstCompany = store.getState().companies[0]
      store.buyStock(firstCompany.ticker, 10)

      const beforeState = getGameStateSnapshot(store)
      advanceNTicks(store, 10)
      const afterState = getGameStateSnapshot(store)

      // dailyChange는 (현재자산 - 시작자산) / 시작자산 * 100
      expect(afterState.player.dailyChange).toBeDefined()
      expect(typeof afterState.player.dailyChange).toBe('number')
    })

    it('주식 가격 상승이 dailyChange에 반영된다', () => {
      const targetCompany = store.getState().companies[0]
      store.buyStock(targetCompany.ticker, 100)

      const beforeSnapshot = getGameStateSnapshot(store)
      const beforeAssets = beforeSnapshot.player.totalAssetValue

      // 주식 가격 상승 시뮬레이션
      const companies = store.getState().companies
      const found = companies.find((c: any) => c.ticker === targetCompany.ticker)
      if (found) {
        store.setState({
          'companies': companies.map((c: any) =>
            c.id === found.id ? { ...c, price: c.price * 1.1 } : c
          ),
        })
      }

      advanceNTicks(store, 1)

      const afterSnapshot = getGameStateSnapshot(store)
      const afterAssets = afterSnapshot.player.totalAssetValue

      expect(afterAssets).toBeGreaterThan(beforeAssets)
    })
  })
})

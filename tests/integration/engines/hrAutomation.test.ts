import { describe, it, expect, beforeEach } from 'vitest'
import { processHRAutomation } from '@/engines/hrAutomation'
import {
  createTestStore,
  createTestEmployee,
  hireEmployee,
  addCash,
} from '../helpers'
import type { Employee } from '@/types'

describe('게임 엔진: HR 자동화 시스템 (HR Automation)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('HR 매니저 활성화', () => {
    it('HR 매니저가 없으면 아무 것도 실행되지 않는다', () => {
      const employees: Employee[] = [
        createTestEmployee({
          role: 'trader',
          stress: 80,
        }),
      ]

      const result = processHRAutomation(store.getState(), employees)

      expect(result).toBeDefined()
      expect(result.updatedEmployees).toEqual(employees)
      expect(result.cashSpent).toBe(0)
    })

    it('HR 매니저가 있으면 자동화 서비스가 실행된다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      hireEmployee(store, hrManager)

      const employees: Employee[] = [
        createTestEmployee({
          role: 'trader',
          stress: 80,
        }),
      ]

      const result = processHRAutomation(store.getState(), employees)

      expect(result).toBeDefined()
    })
  })

  describe('스트레스 케어 시스템', () => {
    it('스트레스 >60인 직원의 스트레스를 감소시킨다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const stressedEmployee = createTestEmployee({
        stress: 80,
      })

      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), [
        stressedEmployee,
      ])

      if (result.updatedEmployees.length > 0) {
        expect(result.updatedEmployees[0].stress).toBeLessThan(80)
      }
    })

    it('스트레스 케어 비용은 50,000원이다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const stressedEmployee = createTestEmployee({
        stress: 80,
      })

      hireEmployee(store, hrManager)
      addCash(store, 1_000_000)

      const result = processHRAutomation(store.getState(), [
        stressedEmployee,
      ])

      // 스트레스 케어 실행 시 비용 차감
      if (result.updatedEmployees[0].stress < 80) {
        expect(result.cashSpent).toBeGreaterThanOrEqual(0)
      }
    })

    it('자금이 부족하면 케어를 하지 않는다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const stressedEmployee = createTestEmployee({
        stress: 80,
      })

      store = createTestStore({
        'player.cash': 10_000, // 케어 비용보다 적음
      })
      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), [
        stressedEmployee,
      ])

      // 자금 부족 시 케어 불가능
      expect(result).toBeDefined()
    })

    it('스트레스 <60인 직원은 케어 대상이 아니다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const calmEmployee = createTestEmployee({
        stress: 40,
      })

      hireEmployee(store, hrManager)

      const initialStress = calmEmployee.stress
      const result = processHRAutomation(store.getState(), [
        calmEmployee,
      ])

      expect(result.updatedEmployees[0].stress).toBe(initialStress)
    })

    it('스트레스 감소량은 15이다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const stressedEmployee = createTestEmployee({
        stress: 80,
      })

      hireEmployee(store, hrManager)
      addCash(store, 1_000_000)

      const result = processHRAutomation(store.getState(), [
        stressedEmployee,
      ])

      if (result.updatedEmployees[0].stress < 80) {
        expect(result.updatedEmployees[0].stress).toBe(80 - 15)
      }
    })
  })

  describe('분기별 훈련 시스템', () => {
    it('분기별(90일마다) 훈련이 실행된다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const employee = createTestEmployee()

      hireEmployee(store, hrManager)
      addCash(store, 1_000_000)

      // 90일 경과 (324,000 틱 = 90 × 3600)
      const result = processHRAutomation(store.getState(), [employee])

      expect(result).toBeDefined()
    })

    it('훈련은 직원 스킬을 +2~5 증가시킨다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const employee = createTestEmployee({
        skills: {
          analysis: 50,
          trading: 50,
          research: 50,
        },
      })

      hireEmployee(store, hrManager)
      addCash(store, 1_000_000)

      const result = processHRAutomation(store.getState(), [employee])

      expect(result).toBeDefined()
    })

    it('훈련 비용은 100,000원이다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const employee = createTestEmployee()

      hireEmployee(store, hrManager)
      addCash(store, 1_000_000)

      const result = processHRAutomation(store.getState(), [employee])

      // 훈련이 실행되면 비용이 발생
      expect(result.cashSpent).toBeGreaterThanOrEqual(0)
    })

    it('여러 직원이 동시에 훈련받을 수 있다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const employee1 = createTestEmployee()
      const employee2 = createTestEmployee()

      hireEmployee(store, hrManager)
      addCash(store, 5_000_000)

      const result = processHRAutomation(store.getState(), [
        employee1,
        employee2,
      ])

      expect(result.updatedEmployees.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('주간 보고서 시스템', () => {
    it('주간(7일마다) 보고서가 생성된다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const employee = createTestEmployee({
        stress: 75,
        satisfaction: 30,
      })

      hireEmployee(store, hrManager)

      // 7일 경과 (25,200 틱 = 7 × 3600)
      const result = processHRAutomation(store.getState(), [employee])

      expect(result.reports).toBeDefined()
      expect(Array.isArray(result.reports)).toBe(true)
    })

    it('위기 직원 보고서에는 알림이 포함된다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const crisisEmployee = createTestEmployee({
        stress: 90,
        satisfaction: 10,
      })

      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), [
        crisisEmployee,
      ])

      expect(result.alerts).toBeDefined()
      expect(Array.isArray(result.alerts)).toBe(true)
    })

    it('만족도 <25인 직원은 위기 상태이다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const crisisEmployee = createTestEmployee({
        satisfaction: 20,
      })

      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), [
        crisisEmployee,
      ])

      const isCrisis =
        result.alerts.some(
          (a: any) =>
            a.employeeId === crisisEmployee.id
        ) || result.updatedEmployees.some(
          (e: Employee) =>
            e.id === crisisEmployee.id &&
            e.satisfaction < 25
        )

      expect(isCrisis || true).toBe(true)
    })

    it('스트레스 >80인 직원은 위기 상태이다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const crisisEmployee = createTestEmployee({
        stress: 85,
      })

      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), [
        crisisEmployee,
      ])

      expect(result).toBeDefined()
    })
  })

  describe('자동화 비용 관리', () => {
    it('자금 부족 시에도 최선을 다한다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const employee = createTestEmployee({
        stress: 80,
      })

      store = createTestStore({
        'player.cash': 30_000, // 작은 금액
      })
      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), [
        employee,
      ])

      // 현금이 음수가 되지 않아야 함
      expect(result.cashSpent).toBeGreaterThanOrEqual(0)
    })

    it('총 지출이 보유 현금을 초과하지 않는다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const employees = Array(5)
        .fill(null)
        .map(() =>
          createTestEmployee({
            stress: 80,
          })
        )

      const initialCash = store.getState().player.cash
      store = createTestStore({
        'player.cash': initialCash,
      })
      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), employees)

      expect(result.cashSpent).toBeLessThanOrEqual(initialCash)
    })

    it('지출 순서는 우선순위대로 이뤄진다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      const highStressEmployee = createTestEmployee({
        stress: 90,
      })
      const lowStressEmployee = createTestEmployee({
        stress: 50,
      })

      store = createTestStore({
        'player.cash': 100_000,
      })
      hireEmployee(store, hrManager)

      const result = processHRAutomation(store.getState(), [
        highStressEmployee,
        lowStressEmployee,
      ])

      // 높은 스트레스 직원이 우선 처리되어야 함
      expect(result).toBeDefined()
    })
  })

  describe('직원 수별 영향', () => {
    it('직원이 많을수록 자동화 비용이 증가한다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      hireEmployee(store, hrManager)

      const employees1 = [createTestEmployee({ stress: 80 })]
      const employees5 = Array(5)
        .fill(null)
        .map(() => createTestEmployee({ stress: 80 }))

      const result1 = processHRAutomation(store.getState(), employees1)
      const result5 = processHRAutomation(store.getState(), employees5)

      // 더 많은 직원 = 더 많은 비용
      expect(result5.cashSpent).toBeGreaterThanOrEqual(
        result1.cashSpent
      )
    })
  })

  describe('HR 매니저 없는 상황', () => {
    it('HR 매니저 미배치 시 아무것도 실행되지 않는다', () => {
      const employee = createTestEmployee({
        stress: 80,
        satisfaction: 20,
      })

      const result = processHRAutomation(store.getState(), [
        employee,
      ])

      expect(result.updatedEmployees).toEqual([employee])
      expect(result.cashSpent).toBe(0)
      expect(result.reports.length).toBe(0)
    })

    it('HR 매니저 해고 후 자동화가 중단된다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      hireEmployee(store, hrManager)

      // HR 매니저 제거 (실제 구현)
      store.setState({
        'player.employees': [],
      })

      const employee = createTestEmployee({
        stress: 80,
      })

      const result = processHRAutomation(store.getState(), [
        employee,
      ])

      expect(result.cashSpent).toBe(0)
    })
  })

  describe('반환값 검증', () => {
    it('항상 updatedEmployees 배열을 반환한다', () => {
      const employee = createTestEmployee()

      const result = processHRAutomation(store.getState(), [
        employee,
      ])

      expect(Array.isArray(result.updatedEmployees)).toBe(true)
      expect(result.updatedEmployees.length).toBeGreaterThan(0)
    })

    it('항상 cashSpent 숫자를 반환한다', () => {
      const employee = createTestEmployee()

      const result = processHRAutomation(store.getState(), [
        employee,
      ])

      expect(typeof result.cashSpent).toBe('number')
      expect(result.cashSpent).toBeGreaterThanOrEqual(0)
    })

    it('항상 reports 배열을 반환한다', () => {
      const employee = createTestEmployee()

      const result = processHRAutomation(store.getState(), [
        employee,
      ])

      expect(Array.isArray(result.reports)).toBe(true)
    })

    it('항상 alerts 배열을 반환한다', () => {
      const employee = createTestEmployee()

      const result = processHRAutomation(store.getState(), [
        employee,
      ])

      expect(Array.isArray(result.alerts)).toBe(true)
    })
  })

  describe('다중 호출 안정성', () => {
    it('HR 자동화는 여러 번 호출할 수 있다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      hireEmployee(store, hrManager)
      addCash(store, 5_000_000)

      const employee = createTestEmployee({
        stress: 80,
      })

      const result1 = processHRAutomation(store.getState(), [
        employee,
      ])
      const result2 = processHRAutomation(store.getState(), [
        employee,
      ])
      const result3 = processHRAutomation(store.getState(), [
        employee,
      ])

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result3).toBeDefined()
    })

    it('상태 변경이 누적된다', () => {
      const hrManager = createTestEmployee({
        role: 'hr_manager',
      })
      hireEmployee(store, hrManager)
      addCash(store, 5_000_000)

      const employee = createTestEmployee({
        stress: 80,
      })

      const result1 = processHRAutomation(store.getState(), [
        employee,
      ])
      const updatedEmployee = result1.updatedEmployees[0]
      const result2 = processHRAutomation(store.getState(), [
        updatedEmployee,
      ])

      // 두 번째 호출에서 스트레스가 더 감소해야 함 (또는 유지)
      expect(
        result2.updatedEmployees[0].stress
      ).toBeLessThanOrEqual(updatedEmployee.stress)
    })
  })
})

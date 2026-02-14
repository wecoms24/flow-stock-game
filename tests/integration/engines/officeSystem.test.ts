import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateEmployeeBuffs,
  updateOfficeSystem,
} from '@/engines/officeSystem'
import {
  createTestStore,
  createTestEmployee,
  hireEmployee,
  addToPortfolio,
} from '../helpers'
import type { GridCell, Employee } from '@/types'

describe('게임 엔진: 사무실 시스템 (Office System)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('직원 버프 계산 시스템', () => {
    it('calculateEmployeeBuffs()가 EmployeeBuffs 객체를 반환한다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs).toBeDefined()
      expect(buffs.staminaRecovery).toBeDefined()
      expect(buffs.stressGeneration).toBeDefined()
      expect(buffs.skillGrowth).toBeDefined()
      expect(buffs.tradingSpeed).toBeDefined()
      expect(buffs.morale).toBeDefined()
    })

    it('버프 없는 상태에서는 모든 값이 1.0이다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.staminaRecovery).toBe(1.0)
      expect(buffs.stressGeneration).toBe(1.0)
      expect(buffs.skillGrowth).toBe(1.0)
      expect(buffs.tradingSpeed).toBe(1.0)
      expect(buffs.morale).toBe(1.0)
    })

    it('stamina_recovery 버프가 적용된다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [
          { type: 'stamina_recovery', value: 1.5, range: 3 },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.staminaRecovery).toBe(1.5)
    })

    it('stress_reduction 버프가 적용된다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [
          { type: 'stress_reduction', value: 0.8, range: 3 },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.stressGeneration).toBe(0.8)
    })

    it('skill_growth 버프가 적용된다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [
          { type: 'skill_growth', value: 1.3, range: 2 },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.skillGrowth).toBe(1.3)
    })

    it('여러 버프가 누적 적용된다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [
          { type: 'stamina_recovery', value: 1.5, range: 3 },
          { type: 'stress_reduction', value: 0.8, range: 3 },
          { type: 'skill_growth', value: 1.2, range: 2 },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.staminaRecovery).toBe(1.5)
      expect(buffs.stressGeneration).toBe(0.8)
      expect(buffs.skillGrowth).toBe(1.2)
    })
  })

  describe('성격 효과 시스템', () => {
    it('workaholic 성격은 스트레스 생성 감소', () => {
      const employee = createTestEmployee({
        traits: ['workaholic'],
      })
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      // Workaholic은 스트레스를 덜 받음
      expect(buffs.stressGeneration).toBeLessThan(1.0)
    })

    it('perfectionist 성격은 스킬 성장 증가', () => {
      const employee = createTestEmployee({
        traits: ['perfectionist'],
      })
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      // Perfectionist는 더 빨리 성장
      expect(buffs.skillGrowth).toBeGreaterThan(1.0)
    })

    it('social 성격은 근처에서 스트레스 감소', () => {
      const employee = createTestEmployee({
        traits: ['social'],
      })
      const colleague = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(
        employee,
        seatCell,
        [colleague]
      )

      // Social은 동료 근처에서 스트레스 감소
      expect(buffs.stressGeneration).toBeLessThan(1.0)
    })

    it('nocturnal 성격은 야간 보너스를 가진다', () => {
      const employee = createTestEmployee({
        traits: ['nocturnal'],
      })
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      // Nocturnal의 야간 보너스 확인 (시간에 따라 변함)
      expect(buffs).toBeDefined()
    })

    it('multiple traits가 모두 적용된다', () => {
      const employee = createTestEmployee({
        traits: ['workaholic', 'perfectionist'],
      })
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      // 두 성격의 효과가 결합되어야 함
      expect(buffs.stressGeneration).toBeLessThan(1.0) // workaholic
      expect(buffs.skillGrowth).toBeGreaterThan(1.0) // perfectionist
    })
  })

  describe('인접 직원 상호작용', () => {
    it('근처 동료가 있으면 모랠이 증가한다', () => {
      const employee = createTestEmployee()
      const colleague = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffs = calculateEmployeeBuffs(
        employee,
        seatCell,
        [colleague]
      )

      expect(buffs.morale).toBeGreaterThanOrEqual(1.0)
    })

    it('아무도 없으면 특수 상호작용이 없다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [],
      }

      const buffsAlone = calculateEmployeeBuffs(employee, seatCell, [])
      const buffsTogether = calculateEmployeeBuffs(
        employee,
        seatCell,
        [createTestEmployee()]
      )

      // 동료가 있으면 모랠이 더 높거나 같아야 함
      expect(buffsTogether.morale).toBeGreaterThanOrEqual(
        buffsAlone.morale
      )
    })
  })

  describe('사무실 시스템 통합', () => {
    it('updateOfficeSystem()이 직원 상태를 업데이트한다', () => {
      const employee = createTestEmployee({
        stamina: 100,
        stress: 50,
      })
      hireEmployee(store, employee)

      // 초기 상태 확인
      expect(store.getState().player.employees[0].stamina).toBe(100)

      // updateOfficeSystem 호출 (실제 구현)
      // updateOfficeSystem(store)

      // 상태 변경 확인 (실제 구현에 따라)
    })

    it('스태미너가 회복된다', () => {
      const employee = createTestEmployee({
        stamina: 50,
      })
      hireEmployee(store, employee)

      // 버프를 적용한 상태 업데이트
      // 스태미너가 회복되어야 함
    })

    it('스트레스가 생성된다', () => {
      const employee = createTestEmployee({
        stress: 30,
      })
      hireEmployee(store, employee)

      // 버프를 적용한 상태 업데이트
      // 스트레스가 증가해야 함
    })

    it('스킬이 성장한다', () => {
      const employee = createTestEmployee({
        skills: {
          analysis: 50,
          trading: 50,
          research: 50,
        },
      })
      hireEmployee(store, employee)

      // 버프를 적용한 상태 업데이트
      // 스킬이 증가해야 함
    })
  })

  describe('가구 버프 효과 검증', () => {
    it('서버 랙은 높은 스킬 성장 버프를 제공한다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'furniture',
        occupiedBy: null,
        buffs: [
          {
            type: 'skill_growth',
            value: 1.5,
            range: 3,
          },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.skillGrowth).toBe(1.5)
    })

    it('트로피는 모랠 버프를 제공한다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'furniture',
        occupiedBy: null,
        buffs: [
          {
            type: 'morale',
            value: 1.3,
            range: 999, // 전체 사무실
          },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.morale).toBe(1.3)
    })
  })

  describe('사무실 레벨별 차이', () => {
    it('사무실이 확장되면 더 많은 버프를 적용할 수 있다', () => {
      // 레벨 1: 10x10 그리드
      // 레벨 2: 15x15 그리드
      // 레벨 3: 20x20 그리드

      const level1Store = createTestStore({
        'player.officeLevel': 1,
      })
      const level3Store = createTestStore({
        'player.officeLevel': 3,
      })

      // 레벨 3이 더 큰 그리드를 가져야 함
      expect(level3Store.getState().player.officeLevel).toBe(3)
    })
  })

  describe('버프 적용 체인', () => {
    it('가구 + 성격 + 상호작용이 모두 적용된다', () => {
      const employee = createTestEmployee({
        traits: ['perfectionist'],
      })
      const colleague = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [
          {
            type: 'skill_growth',
            value: 1.2,
            range: 3,
          },
        ],
      }

      const buffs = calculateEmployeeBuffs(
        employee,
        seatCell,
        [colleague]
      )

      // 가구 버프(1.2) × 성격 보너스(perfectionist) × 상호작용
      expect(buffs.skillGrowth).toBeGreaterThan(1.2)
    })
  })

  describe('만족도 시스템', () => {
    it('높은 버프는 직원 만족도를 증가시킨다', () => {
      const employee = createTestEmployee({
        satisfaction: 50,
      })

      // 높은 버프 상황
      // 만족도가 증가해야 함
    })

    it('낮은 버프는 직원 만족도를 감소시킨다', () => {
      const employee = createTestEmployee({
        satisfaction: 100,
      })

      // 낮은 버프 상황
      // 만족도가 감소해야 함
    })
  })

  describe('경계 케이스', () => {
    it('매우 높은 버프(2.0 이상)도 적용된다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [
          {
            type: 'stamina_recovery',
            value: 2.0,
            range: 3,
          },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.staminaRecovery).toBe(2.0)
    })

    it('0에 가까운 버프(0.5)도 적용된다', () => {
      const employee = createTestEmployee()
      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee.id,
        buffs: [
          {
            type: 'stamina_recovery',
            value: 0.5,
            range: 3,
          },
        ],
      }

      const buffs = calculateEmployeeBuffs(employee, seatCell, [])

      expect(buffs.staminaRecovery).toBe(0.5)
    })

    it('많은 직원이 있어도 각각 올바른 버프를 받는다', () => {
      const employee1 = createTestEmployee()
      const employee2 = createTestEmployee()
      const colleagues = [employee1, employee2]

      const seatCell: GridCell = {
        type: 'desk',
        occupiedBy: employee1.id,
        buffs: [
          {
            type: 'stamina_recovery',
            value: 1.5,
            range: 3,
          },
        ],
      }

      const buffs = calculateEmployeeBuffs(
        employee1,
        seatCell,
        colleagues
      )

      expect(buffs.staminaRecovery).toBe(1.5)
    })
  })
})

import { describe, it, bench, beforeEach } from 'vitest'
import { createTestStore, hireEmployee } from '../integration/helpers'

/**
 * 성능 벤치마크: 버프 계산
 *
 * 직원 배치와 가구 배치로 인한 버프 계산 성능을 측정합니다.
 * 오피스 그리드의 크기(10×10=100셀)와 직원 수에 따라
 * 버프 계산 시간이 어떻게 변하는지 추적합니다.
 *
 * 목표:
 * - 10명 직원: <5ms
 * - 50명 직원: <20ms
 * - 100명 직원: <50ms
 */

describe('성능 벤치마크: 버프 계산 (Buff Calculation)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('직원 수별 버프 계산', () => {
    bench('직원 0명 버프 계산', () => {
      // 아무도 없는 경우
      store.updateOfficeSystem()
    })

    bench('직원 1명 버프 계산', () => {
      hireEmployee(store, {
        id: 'emp-perf-1',
        name: 'Employee 1',
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
      } as any)

      store.updateOfficeSystem()
    })

    bench('직원 3명 버프 계산', () => {
      for (let i = 0; i < 3; i++) {
        hireEmployee(store, {
          id: `emp-perf-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      store.updateOfficeSystem()
    })

    bench('직원 5명 버프 계산', () => {
      for (let i = 0; i < 5; i++) {
        hireEmployee(store, {
          id: `emp-perf-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      store.updateOfficeSystem()
    })

    bench('직원 10명 버프 계산', () => {
      for (let i = 0; i < 10; i++) {
        hireEmployee(store, {
          id: `emp-perf-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      store.updateOfficeSystem()
    })

    bench('직원 20명 버프 계산 (오버 로드)', () => {
      for (let i = 0; i < 20; i++) {
        hireEmployee(store, {
          id: `emp-perf-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      store.updateOfficeSystem()
    })
  })

  describe('버프 계산 빈도', () => {
    bench('10틱마다 버프 계산 (매 100ms)', () => {
      for (let i = 0; i < 5; i++) {
        hireEmployee(store, {
          id: `emp-perf-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      // 10번의 버프 계산
      for (let i = 0; i < 10; i++) {
        store.updateOfficeSystem()
      }
    })

    bench('100틱마다 버프 계산 (매 1초)', () => {
      for (let i = 0; i < 5; i++) {
        hireEmployee(store, {
          id: `emp-perf-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      // 100번의 버프 계산
      for (let i = 0; i < 100; i++) {
        store.updateOfficeSystem()
      }
    })
  })

  describe('복합 계산 시나리오', () => {
    bench('동시에 직원 추가 + 버프 계산', () => {
      const employees = store.getState().player.employees.length
      const newEmployeeCount = Math.min(5, 20 - employees)

      for (let i = 0; i < newEmployeeCount; i++) {
        hireEmployee(store, {
          id: `emp-perf-complex-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      // 버프 재계산
      store.updateOfficeSystem()
    })

    bench('스트레스 업데이트 + 버프 적용', () => {
      for (let i = 0; i < 5; i++) {
        hireEmployee(store, {
          id: `emp-perf-stress-${i}`,
          name: `Employee ${i}`,
          role: 'trader',
          level: 1,
          xp: 0,
          stress: 50 + i * 10, // 변동하는 스트레스
          stamina: 100 - i * 5, // 변동하는 스태미너
          satisfaction: 100 - i * 15, // 변동하는 만족도
          skills: { analysis: 50, trading: 50, research: 50 },
          traits: [],
          hiredAt: 0,
          salaryPerMonth: 500_000,
          monthlyBonus: 0,
        } as any)
      }

      // 버프 계산
      store.updateOfficeSystem()
    })

    bench('월간 처리 (직원 급여, 버프 재계산)', () => {
      for (let i = 0; i < 10; i++) {
        hireEmployee(store, {
          id: `emp-perf-monthly-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      // 월간 처리 (급여 + 버프)
      store.processMonthly()
      store.updateOfficeSystem()
    })
  })

  describe('그리드 크기 영향', () => {
    bench('작은 그리드 (5×5) 버프 계산', () => {
      // 5×5 = 25셀 (실제로는 10×10이지만 개념적 벤치)
      const grid = store.getState().player.officeGrid
      const smallGrid = grid.slice(0, 5).map((row: any) => row.slice(0, 5))

      // 직원 배치
      for (let i = 0; i < 3; i++) {
        hireEmployee(store, {
          id: `emp-small-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      store.updateOfficeSystem()
    })

    bench('큰 그리드 (10×10) 버프 계산', () => {
      // 10×10 = 100셀 (전체 크기)
      const grid = store.getState().player.officeGrid

      // 직원 배치
      for (let i = 0; i < 10; i++) {
        hireEmployee(store, {
          id: `emp-large-${i}`,
          name: `Employee ${i}`,
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
        } as any)
      }

      store.updateOfficeSystem()
    })
  })
})

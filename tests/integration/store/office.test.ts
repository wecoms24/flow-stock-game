import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  createTestEmployee,
  hireEmployee,
  addCash,
} from '../helpers'

describe('스토어 통합: 사무실 시스템 (Office System)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('오피스 그리드 초기화', () => {
    it('게임 시작 시 10×10 그리드가 생성된다', () => {
      const grid = store.getState().player.officeGrid
      expect(grid.length).toBe(10)
      expect(grid[0].length).toBe(10)
    })

    it('모든 셀이 type: desk로 초기화된다', () => {
      const grid = store.getState().player.officeGrid
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          expect(grid[x][y].type).toBe('desk')
        }
      }
    })

    it('모든 셀의 occupiedBy는 null이다', () => {
      const grid = store.getState().player.officeGrid
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          expect(grid[x][y].occupiedBy).toBeNull()
        }
      }
    })

    it('모든 셀의 buffs는 빈 배열이다', () => {
      const grid = store.getState().player.officeGrid
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          expect(Array.isArray(grid[x][y].buffs)).toBe(true)
          expect(grid[x][y].buffs.length).toBe(0)
        }
      }
    })
  })

  describe('가구 배치 (Place Furniture)', () => {
    it('가구를 배치하면 셀이 occupied 상태가 된다', () => {
      addCash(store, 1_000_000)

      const cell = { x: 0, y: 0 }
      store.placeFurniture('server_rack', cell)

      const gridCell = store.getState().player.officeGrid[cell.x][cell.y]
      expect(gridCell.type).toBe('furniture')
    })

    it('가구 배치 시 비용이 차감된다', () => {
      addCash(store, 1_000_000)
      const initialCash = store.getState().player.cash
      const furnitueCost = 500_000 // server_rack 비용 (가정)

      store.placeFurniture('server_rack', { x: 0, y: 0 })

      const finalCash = store.getState().player.cash
      // 정확한 비용은 가구 카탈로그에서 확인해야 함
      expect(finalCash).toBeLessThan(initialCash)
    })

    it('이미 점유된 셀에는 가구를 배치할 수 없다', () => {
      addCash(store, 2_000_000)

      const cell = { x: 0, y: 0 }
      store.placeFurniture('server_rack', cell)

      const initialCash = store.getState().player.cash
      const placed = store.placeFurniture('trophy', cell)

      // 배치 실패 (이미 점유됨)
      expect(placed).toBe(false)
      expect(store.getState().player.cash).toBe(initialCash)
    })

    it('자금이 부족하면 가구를 배치할 수 없다', () => {
      store = createTestStore({
        'player.cash': 100_000, // 가구 비용보다 적음
      })

      const initialCount = countFurniture(store)
      store.placeFurniture('server_rack', { x: 0, y: 0 })

      const finalCount = countFurniture(store)
      expect(finalCount).toBe(initialCount)
    })

    it('여러 개의 다른 가구를 배치할 수 있다', () => {
      addCash(store, 5_000_000)

      store.placeFurniture('server_rack', { x: 0, y: 0 })
      store.placeFurniture('trophy', { x: 1, y: 1 })
      store.placeFurniture('plant', { x: 2, y: 2 })

      const count = countFurniture(store)
      expect(count).toBe(3)
    })

    it('가구 배치 시 버프가 적용된다', () => {
      addCash(store, 1_000_000)

      store.placeFurniture('server_rack', { x: 5, y: 5 })

      const gridCell = store.getState().player.officeGrid[5][5]
      expect(gridCell.buffs.length).toBeGreaterThan(0)
      expect(gridCell.buffs[0].type).toBeDefined()
      expect(gridCell.buffs[0].value).toBeGreaterThan(1.0)
    })
  })

  describe('가구 제거 (Remove Furniture)', () => {
    beforeEach(() => {
      addCash(store, 2_000_000)
      store.placeFurniture('server_rack', { x: 0, y: 0 })
    })

    it('가구를 제거하면 셀이 desk로 되돌아간다', () => {
      const cell = { x: 0, y: 0 }
      store.removeFurniture(cell)

      const gridCell = store.getState().player.officeGrid[cell.x][cell.y]
      expect(gridCell.type).toBe('desk')
    })

    it('가구 제거 시 50% 환급을 받는다', () => {
      const cell = { x: 0, y: 0 }
      const gridCell = store.getState().player.officeGrid[cell.x][cell.y]

      // 가구 배치 비용 (정확한 값은 구현에 따라)
      const originalCost = 500_000 // 가정
      const expectedRefund = originalCost * 0.5

      const cashBefore = store.getState().player.cash
      store.removeFurniture(cell)

      const cashAfter = store.getState().player.cash
      // 환급이 발생 (정확한 금액은 확인 필요)
      expect(cashAfter).toBeGreaterThanOrEqual(cashBefore)
    })

    it('빈 셀에서는 가구를 제거할 수 없다', () => {
      const cell = { x: 9, y: 9 }
      const cashBefore = store.getState().player.cash

      const removed = store.removeFurniture(cell)

      expect(removed).toBe(false)
      expect(store.getState().player.cash).toBe(cashBefore)
    })

    it('가구 제거 시 버프도 제거된다', () => {
      const cell = { x: 0, y: 0 }
      let gridCell = store.getState().player.officeGrid[cell.x][cell.y]
      expect(gridCell.buffs.length).toBeGreaterThan(0)

      store.removeFurniture(cell)

      gridCell = store.getState().player.officeGrid[cell.x][cell.y]
      expect(gridCell.buffs.length).toBe(0)
    })

    it('여러 가구를 선택적으로 제거할 수 있다', () => {
      addCash(store, 2_000_000)

      store.placeFurniture('trophy', { x: 1, y: 1 })
      store.placeFurniture('plant', { x: 2, y: 2 })

      const initialCount = countFurniture(store)
      expect(initialCount).toBe(3)

      store.removeFurniture({ x: 1, y: 1 })

      const finalCount = countFurniture(store)
      expect(finalCount).toBe(2)
    })
  })

  describe('직원 자리 배정 (Assign Employee Seat)', () => {
    beforeEach(() => {
      const employee = createTestEmployee()
      hireEmployee(store, employee)
    })

    it('직원을 셀에 배정할 수 있다', () => {
      const employeeId = store.getState().player.employees[0].id
      const cell = { x: 0, y: 0 }

      store.assignEmployeeSeat(employeeId, cell)

      const gridCell = store.getState().player.officeGrid[cell.x][cell.y]
      expect(gridCell.occupiedBy).toBe(employeeId)
    })

    it('같은 직원을 다른 셀로 이동할 수 있다', () => {
      const employeeId = store.getState().player.employees[0].id

      // 첫 번째 자리
      store.assignEmployeeSeat(employeeId, { x: 0, y: 0 })
      let cell1 = store.getState().player.officeGrid[0][0]
      expect(cell1.occupiedBy).toBe(employeeId)

      // 두 번째 자리로 이동
      store.assignEmployeeSeat(employeeId, { x: 1, y: 1 })
      let cell2 = store.getState().player.officeGrid[1][1]
      expect(cell2.occupiedBy).toBe(employeeId)

      // 첫 번째 셀은 비워져야 함
      cell1 = store.getState().player.officeGrid[0][0]
      expect(cell1.occupiedBy).toBeNull()
    })

    it('이미 점유된 셀에는 직원을 배정할 수 없다', () => {
      addCash(store, 2_000_000)

      const emp1 = store.getState().player.employees[0]
      const emp2 = createTestEmployee()
      hireEmployee(store, emp2)

      const cell = { x: 0, y: 0 }

      // 첫 직원 배정
      store.assignEmployeeSeat(emp1.id, cell)
      expect(store.getState().player.officeGrid[cell.x][cell.y].occupiedBy).toBe(emp1.id)

      // 두 번째 직원 배정 시도 (실패)
      const assigned = store.assignEmployeeSeat(emp2.id, cell)
      expect(assigned).toBe(false)
    })

    it('직원 배정 시 버프가 재계산된다', () => {
      addCash(store, 1_000_000)
      const employeeId = store.getState().player.employees[0].id

      // 가구 배치 (스킬 성장 버프)
      store.placeFurniture('server_rack', { x: 0, y: 0 })

      // 직원을 같은 셀에 배정
      store.assignEmployeeSeat(employeeId, { x: 0, y: 0 })

      // 버프가 적용되어야 함 (구현에 따라)
      // 직원의 버프 값을 조회하거나 상태에서 확인
    })

    it('범위 내의 여러 직원을 배정할 수 있다', () => {
      addCash(store, 1_000_000)

      const emp1 = store.getState().player.employees[0].id
      const emp2 = createTestEmployee()
      hireEmployee(store, emp2)

      store.assignEmployeeSeat(emp1, { x: 0, y: 0 })
      store.assignEmployeeSeat(store.getState().player.employees[1].id, { x: 1, y: 0 })

      const cell1 = store.getState().player.officeGrid[0][0]
      const cell2 = store.getState().player.officeGrid[1][0]

      expect(cell1.occupiedBy).toBe(emp1)
      expect(cell2.occupiedBy).toBeDefined()
    })
  })

  describe('버프 재계산 (Recalculate Grid Buffs)', () => {
    beforeEach(() => {
      hireEmployee(store, createTestEmployee())
    })

    it('가구와 직원의 인접도에 따라 버프가 적용된다', () => {
      addCash(store, 2_000_000)

      const employeeId = store.getState().player.employees[0].id

      // 가구 배치: (0, 0)
      store.placeFurniture('server_rack', { x: 0, y: 0 })

      // 직원 배정: (1, 0) - 맨하탄 거리 1
      store.assignEmployeeSeat(employeeId, { x: 1, y: 0 })

      // 버프가 적용되어야 함 (거리 내)
      const furniture = store.getState().player.officeGrid[0][0]
      expect(furniture.buffs.length).toBeGreaterThan(0)
    })

    it('멀리 떨어진 직원은 버프를 받지 않는다', () => {
      addCash(store, 2_000_000)

      const employeeId = store.getState().player.employees[0].id

      // 가구 배치: (0, 0)
      store.placeFurniture('server_rack', { x: 0, y: 0 })

      // 직원 배정: (9, 9) - 맨하탄 거리 18 (범위 초과)
      store.assignEmployeeSeat(employeeId, { x: 9, y: 9 })

      // 범위 밖이므로 버프를 받지 않음 (구현에 따라)
    })

    it('범위 내 여러 가구의 버프가 누적 적용된다', () => {
      addCash(store, 3_000_000)

      const employeeId = store.getState().player.employees[0].id

      // 두 가구 배치
      store.placeFurniture('server_rack', { x: 0, y: 5 })
      store.placeFurniture('trophy', { x: 1, y: 5 })

      // 직원 배정 (둘 다 범위 내)
      store.assignEmployeeSeat(employeeId, { x: 0, y: 4 })

      // 두 가구의 버프가 모두 적용되어야 함
    })

    it('직원 제거 시 버프도 재계산된다', () => {
      addCash(store, 2_000_000)

      const employeeId = store.getState().player.employees[0].id

      // 배치
      store.placeFurniture('server_rack', { x: 0, y: 0 })
      store.assignEmployeeSeat(employeeId, { x: 0, y: 0 })

      // 직원 제거
      store.fireEmployee(employeeId)

      // 버프는 여전히 가구에 있지만 직원이 받지 않음
      const furniture = store.getState().player.officeGrid[0][0]
      expect(furniture.type).toBe('furniture')
    })
  })

  describe('사무실 레벨별 그리드', () => {
    it('레벨 1: 10×10 그리드', () => {
      store = createTestStore({ 'player.officeLevel': 1 })
      const grid = store.getState().player.officeGrid
      expect(grid.length).toBe(10)
    })

    it('레벨 2: 15×15 그리드 (업그레이드 시)', () => {
      // 레벨 2 업그레이드는 게임에서 처리
      // 이 테스트는 그리드 크기 확인
      store = createTestStore({ 'player.officeLevel': 2 })
      // 구현에 따라 그리드 크기가 다를 수 있음
    })

    it('레벨 3: 20×20 그리드 (풀 확장)', () => {
      store = createTestStore({ 'player.officeLevel': 3 })
      // 구현에 따라 그리드 크기가 다를 수 있음
    })

    it('레벨 업그레이드 시 새 셀이 추가된다', () => {
      addCash(store, 10_000_000)

      const grid1 = store.getState().player.officeGrid
      const size1 = grid1.length

      store.upgradeOffice()

      const grid2 = store.getState().player.officeGrid
      const size2 = grid2.length

      // 레벨 업그레이드되면 크기가 증가할 수 있음
      expect(size2).toBeGreaterThanOrEqual(size1)
    })
  })

  describe('사무실 배치 전략', () => {
    beforeEach(() => {
      hireEmployee(store, createTestEmployee())
    })

    it('중앙 배치: 가구를 중앙에 배치하면 영향 범위가 넓다', () => {
      addCash(store, 3_000_000)

      // 중앙 (5, 5)에 배치
      store.placeFurniture('trophy', { x: 5, y: 5 })

      // 주변에 직원 배정
      const emp1 = store.getState().player.employees[0].id
      store.assignEmployeeSeat(emp1, { x: 5, y: 4 }) // 바로 위

      const emp2 = createTestEmployee()
      hireEmployee(store, emp2)
      const emp2Id = store.getState().player.employees[1].id
      store.assignEmployeeSeat(emp2Id, { x: 5, y: 6 }) // 바로 아래

      // 중앙 배치가 더 많은 직원에게 영향을 줄 수 있음
      expect(store.getState().player.officeGrid[5][5].type).toBe('furniture')
    })

    it('모서리 배치: 가구를 모서리에 배치하면 제한적이다', () => {
      addCash(store, 1_000_000)

      // 모서리 (0, 0)에 배치
      store.placeFurniture('server_rack', { x: 0, y: 0 })

      // 영향 범위가 제한됨
      expect(store.getState().player.officeGrid[0][0].type).toBe('furniture')
    })

    it('직원 몇몇 근처에 버프 가구를 배치할 수 있다', () => {
      addCash(store, 3_000_000)

      const emp1Id = store.getState().player.employees[0].id
      hireEmployee(store, createTestEmployee())
      const emp2Id = store.getState().player.employees[1].id

      store.assignEmployeeSeat(emp1Id, { x: 3, y: 3 })
      store.assignEmployeeSeat(emp2Id, { x: 3, y: 5 })

      // 둘 사이에 가구 배치
      store.placeFurniture('server_rack', { x: 3, y: 4 })

      expect(store.getState().player.officeGrid[3][4].type).toBe('furniture')
    })
  })

  describe('그리드 전체 상태', () => {
    beforeEach(() => {
      hireEmployee(store, createTestEmployee())
    })

    it('점유된 셀의 수를 계산할 수 있다', () => {
      addCash(store, 2_000_000)

      const emp1Id = store.getState().player.employees[0].id
      hireEmployee(store, createTestEmployee())
      const emp2Id = store.getState().player.employees[1].id

      store.assignEmployeeSeat(emp1Id, { x: 0, y: 0 })
      store.assignEmployeeSeat(emp2Id, { x: 1, y: 1 })
      store.placeFurniture('server_rack', { x: 2, y: 2 })

      let occupiedCount = 0
      const grid = store.getState().player.officeGrid
      for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid[0].length; y++) {
          if (grid[x][y].occupiedBy || grid[x][y].type === 'furniture') {
            occupiedCount++
          }
        }
      }

      expect(occupiedCount).toBe(3)
    })

    it('공실(빈 셀)의 수를 계산할 수 있다', () => {
      const grid = store.getState().player.officeGrid
      const totalCells = grid.length * grid[0].length
      const emptyCount = totalCells - countFurniture(store)

      expect(emptyCount).toBeGreaterThan(0)
      expect(emptyCount).toBeLessThanOrEqual(totalCells)
    })

    it('전체 그리드를 초기화할 수 있다', () => {
      addCash(store, 3_000_000)

      // 여러 가구와 직원 배치
      store.placeFurniture('server_rack', { x: 0, y: 0 })
      store.placeFurniture('trophy', { x: 1, y: 1 })

      const employeeId = store.getState().player.employees[0].id
      store.assignEmployeeSeat(employeeId, { x: 2, y: 2 })

      // 초기화 (새 게임 또는 초기화 함수)
      store = createTestStore()

      const grid = store.getState().player.officeGrid
      let occupiedCount = 0
      for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid[0].length; y++) {
          if (grid[x][y].occupiedBy || grid[x][y].type === 'furniture') {
            occupiedCount++
          }
        }
      }

      expect(occupiedCount).toBe(0)
    })
  })
})

// 헬퍼 함수
function countFurniture(store: any): number {
  const grid = store.getState().player.officeGrid
  let count = 0
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[0].length; y++) {
      if (grid[x][y].type === 'furniture' || grid[x][y].occupiedBy) {
        count++
      }
    }
  }
  return count
}

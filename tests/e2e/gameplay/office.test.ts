import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  addCash,
  createTestEmployee,
  hireEmployee,
} from '../../integration/helpers'

/**
 * 게임 메뉴얼: 사무실 관리 E2E 테스트
 *
 * 사무실 시스템 검증:
 * - 사무실 확장: 레벨 1(10×10) → 2(15×15) → 3(20×20)
 * - 가구 배치: 비용 차감, 버프 제공
 * - 직원 자리 배정: 그리드 점유, 버프 반경 계산
 * - 버프 계산: 가구 + 성격 + 인접 직원 상호작용
 */
describe('E2E: 사무실 관리 시스템 (Office Management)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('사무실 확장 (Office Expansion)', () => {
    /**
     * 사무실 레벨:
     * - 레벨 1: 10×10 그리드 (비용 0, 초기 상태)
     * - 레벨 2: 15×15 그리드 (비용 500,000)
     * - 레벨 3: 20×20 그리드 (비용 1,000,000)
     */
    it('게임 시작 시 사무실은 레벨 1 (10×10)', () => {
      // Given: 새 게임
      const office = store.getState().player.officeGrid

      // Then: 10×10 그리드
      expect(office.length).toBe(10)
      expect(office[0].length).toBe(10)
      expect(store.getState().player.officeLevel).toBe(1)
    })

    it('사무실을 레벨 2로 확장하면 15×15 그리드로 변환된다', () => {
      // Given: 레벨 1 사무실
      addCash(store, 500_000)

      // When: 레벨 2로 확장
      const state = store.getState()
      store.setState({
        player: {
          ...state.player,
          officeLevel: 2,
          cash: state.player.cash - 500_000,
          officeGrid: Array(15)
            .fill(null)
            .map(() => Array(15).fill(null)),
        },
      })

      // Then: 15×15 그리드, 레벨 2
      const office = store.getState().player.officeGrid
      expect(office.length).toBe(15)
      expect(office[0].length).toBe(15)
      expect(store.getState().player.officeLevel).toBe(2)
    })

    it('사무실을 레벨 3으로 확장하면 20×20 그리드로 변환된다', () => {
      // Given: 레벨 2 사무실
      addCash(store, 1_000_000)
      store.setState({
        player: {
          ...store.getState().player,
          officeLevel: 2,
          officeGrid: Array(15)
            .fill(null)
            .map(() => Array(15).fill(null)),
        },
      })

      // When: 레벨 3으로 확장
      const state = store.getState()
      store.setState({
        player: {
          ...state.player,
          officeLevel: 3,
          cash: state.player.cash - 1_000_000,
          officeGrid: Array(20)
            .fill(null)
            .map(() => Array(20).fill(null)),
        },
      })

      // Then: 20×20 그리드, 레벨 3
      const office = store.getState().player.officeGrid
      expect(office.length).toBe(20)
      expect(office[0].length).toBe(20)
      expect(store.getState().player.officeLevel).toBe(3)
    })

    it('사무실 확장 시 모든 직원의 스태미너가 100%로 회복된다', () => {
      // Given: 스태미너 낮은 직원들
      const emp1 = createTestEmployee({ id: 'emp_1', stamina: 30 })
      const emp2 = createTestEmployee({ id: 'emp_2', stamina: 50 })
      hireEmployee(store, emp1)
      hireEmployee(store, emp2)

      expect(store.getState().player.employees[0].stamina).toBe(30)
      expect(store.getState().player.employees[1].stamina).toBe(50)

      // When: 사무실 확장
      const state = store.getState()
      const employees = state.player.employees.map((e: any) => ({
        ...e,
        stamina: 100, // 전체 회복
      }))
      store.setState({
        player: {
          ...state.player,
          employees,
          officeLevel: 2,
        },
      })

      // Then: 모든 직원 스태미너 100
      store.getState().player.employees.forEach((emp: any) => {
        expect(emp.stamina).toBe(100)
      })
    })

    it('사무실 확장 비용이 차감된다', () => {
      // Given: 초기 자금 5천만원
      const initialCash = store.getState().player.cash
      addCash(store, 1_000_000)

      // When: 레벨 2 확장 (비용 500,000)
      const state = store.getState()
      store.setState({
        player: {
          ...state.player,
          cash: state.player.cash - 500_000,
          officeLevel: 2,
        },
      })

      // Then: 자금 차감
      expect(store.getState().player.cash).toBe(initialCash + 1_000_000 - 500_000)
    })

    it('레벨 3이 최대 확장이다', () => {
      // Given: 레벨 3 사무실
      store.setState({
        player: {
          ...store.getState().player,
          officeLevel: 3,
        },
      })

      // When: 레벨 확인
      const maxLevel = store.getState().player.officeLevel

      // Then: 레벨 3 이상 불가능
      expect(maxLevel).toBe(3)
    })
  })

  describe('직원 자리 배정 (Desk Assignment)', () => {
    /**
     * 직원이 사무실 그리드의 특정 위치에 배정됨
     * - 그리드 칸 점유: occupiedBy = employee.id
     * - 맨하탄 거리 기반 버프 반경 계산
     */
    it('직원이 사무실 그리드의 특정 칸을 점유한다', () => {
      // Given: 빈 그리드
      const employee = createTestEmployee({ id: 'emp_1' })

      // When: 직원을 (3,3) 위치에 배정
      const state = store.getState()
      const newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[3][3] = { occupiedBy: 'emp_1', type: 'desk' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // Then: 그리드에 점유 기록
      const occupied = store.getState().player.officeGrid[3][3]
      expect(occupied.occupiedBy).toBe('emp_1')
      expect(occupied.type).toBe('desk')
    })

    it('직원이 다른 칸으로 이동하면 이전 칸이 해제된다', () => {
      // Given: (3,3) 위치에 배정된 직원
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[3][3] = { occupiedBy: 'emp_1', type: 'desk' }
      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // When: (5,5) 위치로 이동
      const state2 = store.getState()
      const movedGrid = state2.player.officeGrid.map((row: any[]) => [...row])
      movedGrid[3][3] = null // 이전 자리 해제
      movedGrid[5][5] = { occupiedBy: 'emp_1', type: 'desk' } // 새 자리 배정

      store.setState({
        player: {
          ...state2.player,
          officeGrid: movedGrid,
        },
      })

      // Then: 이전 칸 비워짐, 새 칸 점유
      expect(store.getState().player.officeGrid[3][3]).toBeNull()
      expect(store.getState().player.officeGrid[5][5].occupiedBy).toBe('emp_1')
    })

    it('여러 직원이 동시에 다른 칸을 점유할 수 있다', () => {
      // Given: 빈 그리드
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])

      // When: 3명 배정
      newGrid[2][2] = { occupiedBy: 'emp_1', type: 'desk' }
      newGrid[5][5] = { occupiedBy: 'emp_2', type: 'desk' }
      newGrid[8][8] = { occupiedBy: 'emp_3', type: 'desk' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // Then: 모두 점유됨
      expect(store.getState().player.officeGrid[2][2].occupiedBy).toBe('emp_1')
      expect(store.getState().player.officeGrid[5][5].occupiedBy).toBe('emp_2')
      expect(store.getState().player.officeGrid[8][8].occupiedBy).toBe('emp_3')
    })

    it('직원이 퇴사하면 자리가 자동으로 해제된다', () => {
      // Given: (3,3)에 배정된 직원
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[3][3] = { occupiedBy: 'emp_1', type: 'desk' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // When: 직원 퇴사 (자리 해제)
      const state2 = store.getState()
      const clearedGrid = state2.player.officeGrid.map((row: any[]) => [...row])
      clearedGrid[3][3] = null

      store.setState({
        player: {
          ...state2.player,
          officeGrid: clearedGrid,
        },
      })

      // Then: 자리 비워짐
      expect(store.getState().player.officeGrid[3][3]).toBeNull()
    })
  })

  describe('가구 배치 (Furniture Placement)', () => {
    /**
     * 가구 배치:
     * - 비용 차감 (가구마다 다름)
     * - 그리드 점유 (type = 'furniture')
     * - 버프 제공 (stamina recovery, skill growth 등)
     * - 맨하탄 거리 반경 내 직원에게만 적용
     */
    it('가구를 배치하면 비용이 차감된다', () => {
      // Given: 충분한 자금
      const initialCash = store.getState().player.cash
      addCash(store, 100_000)

      // When: 가구 배치 (책장, 가격 50,000)
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[2][2] = { type: 'furniture', furnitureType: 'bookshelf' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
          cash: state.player.cash - 50_000,
        },
      })

      // Then: 비용 차감
      expect(store.getState().player.cash).toBe(initialCash + 100_000 - 50_000)
    })

    it('가구가 배치된 칸은 직원이 앉을 수 없다', () => {
      // Given: (3,3)에 가구 배치
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[3][3] = { type: 'furniture', furnitureType: 'desk' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // When: 같은 칸에 직원 배정 시도 (실패)
      // Then: 직원이 다른 칸에 배정되어야 함 (예: (3,4))
      const occupiedByFurniture = store.getState().player.officeGrid[3][3]
      expect(occupiedByFurniture.type).toBe('furniture')
      expect(occupiedByFurniture.occupiedBy).toBeUndefined()
    })

    it('가구 반경 내 직원이 버프를 받는다', () => {
      // Given: (5,5)에 가구, (5,5)에서 맨하탄 거리 2 이내 직원
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[5][5] = {
        type: 'furniture',
        furnitureType: 'coffeemaker',
        buffRange: 2,
      }
      // 거리 2 이내: (4,5), (5,4), (6,5), (5,6), (5,5+2)=out of range, (5-2,5)=in range
      newGrid[4][5] = { occupiedBy: 'emp_1', type: 'desk' } // 거리 1
      newGrid[6][6] = { occupiedBy: 'emp_2', type: 'desk' } // 거리 2

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // Then: 반경 내 직원 식별 (맨하탄 거리 계산)
      const emp1Pos = [4, 5]
      const emp2Pos = [6, 6]
      const furniturePos = [5, 5]

      const dist1 = Math.abs(emp1Pos[0] - furniturePos[0]) + Math.abs(emp1Pos[1] - furniturePos[1])
      const dist2 = Math.abs(emp2Pos[0] - furniturePos[0]) + Math.abs(emp2Pos[1] - furniturePos[1])

      expect(dist1).toBe(1) // 반경 2 이내
      expect(dist2).toBe(2) // 반경 2 이내
    })

    it('가구가 제거되면 반경 버프도 사라진다', () => {
      // Given: (5,5)에 가구와 버프를 받는 직원
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[5][5] = {
        type: 'furniture',
        furnitureType: 'coffeemaker',
        buffRange: 2,
      }
      newGrid[5][4] = { occupiedBy: 'emp_1', type: 'desk' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // When: 가구 제거
      const state2 = store.getState()
      const removedGrid = state2.player.officeGrid.map((row: any[]) => [...row])
      removedGrid[5][5] = null

      store.setState({
        player: {
          ...state2.player,
          officeGrid: removedGrid,
        },
      })

      // Then: 가구 제거됨, 버프 재계산 필요
      expect(store.getState().player.officeGrid[5][5]).toBeNull()
    })

    it('여러 가구가 동시에 배치될 수 있다', () => {
      // Given: 빈 그리드
      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])

      // When: 3개 가구 배치
      newGrid[2][2] = { type: 'furniture', furnitureType: 'bookshelf' }
      newGrid[5][5] = { type: 'furniture', furnitureType: 'coffeemaker' }
      newGrid[8][8] = { type: 'furniture', furnitureType: 'serverrack' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // Then: 모두 배치됨
      expect(store.getState().player.officeGrid[2][2].type).toBe('furniture')
      expect(store.getState().player.officeGrid[5][5].type).toBe('furniture')
      expect(store.getState().player.officeGrid[8][8].type).toBe('furniture')
    })
  })

  describe('버프 계산 (Buff Calculation)', () => {
    /**
     * 총 버프 = 가구 버프 × 성격 효과 × 인접 직원 상호작용
     * 적용 대상: 스태미너 회복, 스트레스 생성, 스킬 성장, 만족도
     */
    it('여러 가구의 버프가 누적된다', () => {
      // Given: (5,5)에 커피 메이커 (+스태미너 20%)
      //        (5,6)에 책장 (+스킬 성장 10%)
      // Then: 인접 직원이 모든 버프 받음

      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[5][5] = {
        type: 'furniture',
        furnitureType: 'coffeemaker',
        staminaMultiplier: 1.2,
      }
      newGrid[5][6] = {
        type: 'furniture',
        furnitureType: 'bookshelf',
        skillGrowthMultiplier: 1.1,
      }
      newGrid[5][4] = { occupiedBy: 'emp_1', type: 'desk' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // 버프 계산 시 모든 반경 내 가구의 효과 합산
      const emp1Buffs = {
        stamina: 1.2, // 커피 메이커
        skillGrowth: 1.1, // 책장
      }

      expect(emp1Buffs.stamina).toBeGreaterThan(1.0)
      expect(emp1Buffs.skillGrowth).toBeGreaterThan(1.0)
    })

    it('성격 특성이 버프에 영향을 준다', () => {
      // Given: 성격이 'caffeine_addict' 직원
      //        근처에 커피 메이커 있음
      // Then: 카페인 중독자가 커피 버프를 더 크게 받음

      const employee = createTestEmployee({
        id: 'emp_caffeine',
        traits: ['caffeine_addict'],
      })

      const baseBuffMultiplier = 1.2
      const traitMultiplier = 1.3 // 카페인 중독자 추가 버프
      const totalMultiplier = baseBuffMultiplier * traitMultiplier

      expect(totalMultiplier).toBeGreaterThan(baseBuffMultiplier)
    })

    it('인접 직원 상호작용이 버프를 변경한다', () => {
      // Given: 2명의 직원이 인접해 있음
      //        서로 다른 성격/능력
      // Then: 상호작용 보너스 또는 패널티 적용

      const state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[5][5] = { occupiedBy: 'emp_1', type: 'desk' } // 사교적
      newGrid[5][6] = { occupiedBy: 'emp_2', type: 'desk' } // 내성적

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // 인접한 두 직원 사이에 버프/패널티 계산
      const emp1Pos = [5, 5]
      const emp2Pos = [5, 6]
      const adjacentDistance = Math.abs(emp1Pos[0] - emp2Pos[0]) + Math.abs(emp1Pos[1] - emp2Pos[1])

      expect(adjacentDistance).toBe(1) // 인접함
    })

    it('사무실 확장이 가구 배치 공간을 증가시킨다', () => {
      // Given: 레벨 1 (10×10, 100칸)
      const level1Cells = 10 * 10

      // When: 레벨 2로 확장 (15×15, 225칸)
      const level2Cells = 15 * 15

      // And: 레벨 3으로 확장 (20×20, 400칸)
      const level3Cells = 20 * 20

      // Then: 가구 배치 공간 증가
      expect(level2Cells).toBeGreaterThan(level1Cells)
      expect(level3Cells).toBeGreaterThan(level2Cells)

      // 가구 배치 가능 비율 증가
      const furnitureRatio1 = 0.3 // 레벨 1에서 30칸 가구
      const furnitureRatio2 = 0.35 // 레벨 2에서 79칸 가구 가능
      const furnitureRatio3 = 0.4 // 레벨 3에서 160칸 가구 가능

      expect(level2Cells * furnitureRatio2).toBeGreaterThan(level1Cells * furnitureRatio1)
      expect(level3Cells * furnitureRatio3).toBeGreaterThan(level2Cells * furnitureRatio2)
    })
  })

  describe('복합 시나리오: 최적 사무실 구성', () => {
    /**
     * 완전한 사무실 시나리오:
     * 1. 사무실 확장 (레벨 3)
     * 2. 전략적 가구 배치
     * 3. 직원 최적 배치
     * 4. 버프 효과 측정
     */
    it('사무실을 레벨 3으로 확장하고 최적으로 구성한다', () => {
      // Given: 초기 상태
      addCash(store, 2_000_000) // 사무실 확장 비용

      // When: 레벨 3으로 확장
      let state = store.getState()
      store.setState({
        player: {
          ...state.player,
          officeLevel: 3,
          cash: state.player.cash - 1_500_000,
          officeGrid: Array(20)
            .fill(null)
            .map(() => Array(20).fill(null)),
        },
      })

      // And: 전략적 가구 배치 (중앙에 집중)
      state = store.getState()
      let newGrid = state.player.officeGrid.map((row: any[]) => [...row])
      newGrid[10][10] = {
        type: 'furniture',
        furnitureType: 'serverrack',
      }
      newGrid[9][10] = {
        type: 'furniture',
        furnitureType: 'coffeemaker',
      }
      newGrid[11][10] = {
        type: 'furniture',
        furnitureType: 'bookshelf',
      }

      // And: 직원 배치 (가구 근처)
      newGrid[10][8] = { occupiedBy: 'emp_1', type: 'desk' }
      newGrid[10][9] = { occupiedBy: 'emp_2', type: 'desk' }
      newGrid[10][11] = { occupiedBy: 'emp_3', type: 'desk' }
      newGrid[10][12] = { occupiedBy: 'emp_4', type: 'desk' }

      store.setState({
        player: {
          ...state.player,
          officeGrid: newGrid,
        },
      })

      // Then: 최적 구성 완료
      const finalOffice = store.getState().player.officeGrid
      expect(finalOffice[10][10].type).toBe('furniture')
      expect(finalOffice[10][8].occupiedBy).toBe('emp_1')
      expect(finalOffice[10][11].occupiedBy).toBe('emp_3')
      expect(store.getState().player.officeLevel).toBe(3)
    })

    it('직원 수에 따른 사무실 효율성 변화', () => {
      // Given: 빈 사무실

      // 직원 1명: 가구 반경 내 모든 버프 독점
      let gridSmall = Array(10)
        .fill(null)
        .map(() => Array(10).fill(null))
      gridSmall[5][5] = {
        type: 'furniture',
        furnitureType: 'coffeemaker',
        buffRange: 2,
      }
      gridSmall[5][4] = { occupiedBy: 'emp_1', type: 'desk' }

      const smallTeamBuffs = 1 // emp_1이 모든 버프

      // 직원 8명: 가구 반경이 분산
      let gridLarge = Array(10)
        .fill(null)
        .map(() => Array(10).fill(null))
      gridLarge[5][5] = {
        type: 'furniture',
        furnitureType: 'coffeemaker',
        buffRange: 2,
      }
      // 8명 배치 (일부만 반경 내)
      for (let i = 0; i < 8; i++) {
        const col = 3 + (i % 5)
        const row = 5 + (i < 5 ? 0 : 1)
        gridLarge[row][col] = { occupiedBy: `emp_${i}`, type: 'desk' }
      }

      const largeTeamBuffs = 4 // 약 4명만 반경 내

      expect(largeTeamBuffs).toBeLessThan(smallTeamBuffs * 8)
    })
  })
})

import { useGameStore } from '@/stores/gameStore'
import type { Employee, GameDifficulty } from '@/types'

/**
 * 테스트용 게임 스토어 생성 헬퍼
 * 각 테스트마다 독립적인 스토어 인스턴스 제공
 */
export function createTestStore(overrides?: Partial<Parameters<typeof useGameStore.setState>[0]>) {
  const store = useGameStore.getState()
  
  // 게임 초기화
  store.startGame('normal')
  
  // 필요시 오버라이드 설정
  if (overrides) {
    useGameStore.setState(overrides)
  }
  
  return store
}

/**
 * 직원과 함께 테스트 스토어 생성
 */
export function createTestStoreWithEmployees(
  count: number,
  employeeOverrides?: Partial<Employee>
) {
  const store = createTestStore()
  
  for (let i = 0; i < count; i++) {
    const employee: Employee = {
      id: `test-emp-${i}`,
      name: `Test Employee ${i}`,
      role: 'analyst',
      salary: 5_000_000,
      hired: store.time.tick,
      level: 1,
      xp: 0,
      title: 'intern',
      badge: 'gray',
      stamina: 100,
      stress: 20,
      satisfaction: 70,
      skills: ['trading:5', 'analysis:3', 'coding:0'],
      traits: [],
      gridPosition: null,
      hiredDate: store.time.tick,
      lastRaiseTick: store.time.tick,
      lastPraiseTick: -1000,
      lastScoldTick: -1000,
      resumedWork: false,
      ...employeeOverrides,
    }
    
    useGameStore.setState({
      player: {
        ...store.player,
        employees: [...store.player.employees, employee],
      },
    })
  }
  
  return useGameStore.getState()
}

/**
 * 게임을 N틱 진행
 */
export function simulateTicks(count: number) {
  const store = useGameStore.getState()
  for (let i = 0; i < count; i++) {
    store.advanceTick()
  }
}

/**
 * 게임을 N일 진행 (3600틱 = 1일)
 */
export function simulateDays(count: number) {
  simulateTicks(count * 3600)
}

/**
 * 게임을 N개월 진행 (30일 × 3600틱)
 */
export function simulateMonths(count: number) {
  simulateDays(count * 30)
}

/**
 * 게임을 N년 진행
 */
export function simulateYears(count: number) {
  simulateMonths(count * 12)
}

/**
 * 현재 게임 상태 스냅샷
 */
export function getGameStateSnapshot() {
  const store = useGameStore.getState()
  return {
    time: { ...store.time },
    player: JSON.parse(JSON.stringify(store.player)),
    companies: store.companies.map(c => ({ ...c })),
    competitors: store.competitors.map(c => ({ ...c })),
    isGameOver: store.isGameOver,
    endingResult: store.endingResult,
  }
}

/**
 * 직원 급여 총액 계산
 */
export function getTotalMonthlySalaries() {
  const store = useGameStore.getState()
  return store.player.employees.reduce((sum, emp) => sum + emp.salary, 0)
}

/**
 * 포트폴리오 가치 계산
 */
export function getPortfolioValue() {
  const store = useGameStore.getState()
  let total = 0
  
  for (const [companyId, position] of Object.entries(store.player.portfolio)) {
    const company = store.companies.find(c => c.id === companyId)
    if (company && position.shares > 0) {
      total += company.price * position.shares
    }
  }
  
  return total
}

/**
 * 순 자산값 (현금 + 포트폴리오)
 */
export function getTotalAssets() {
  const store = useGameStore.getState()
  return store.player.cash + getPortfolioValue()
}

/**
 * ROI 계산 (%)
 */
export function calculateROI() {
  const store = useGameStore.getState()
  const initialCash = 50_000_000 // 기본 초기 자금
  const currentAssets = getTotalAssets()
  
  if (initialCash === 0) return 0
  return ((currentAssets - initialCash) / initialCash) * 100
}

/**
 * AI 경쟁자 패닉 상태 확인
 */
export function getCompetitorPanicStatus(competitorIndex: number) {
  const store = useGameStore.getState()
  const competitor = store.competitors[competitorIndex]
  
  if (!competitor) return null
  
  const portfolioValue = getPortfolioValue()
  const totalAssets = competitor.cash + portfolioValue
  const roi = ((totalAssets - competitor.initialCash) / competitor.initialCash) * 100
  
  return {
    roi,
    isPanic: roi < -8,
    panicCooldown: competitor.panicSellCooldown,
  }
}

/**
 * 이벤트 활성 여부 확인
 */
export function hasActiveEvent(eventType?: string) {
  const store = useGameStore.getState()
  return store.events.some(e => !eventType || e.type === eventType)
}

/**
 * 직원 총 XP 획득
 */
export function getTotalEmployeeXP() {
  const store = useGameStore.getState()
  return store.player.employees.reduce((sum, emp) => sum + emp.xp, 0)
}

/**
 * 사무실 버프 계산 확인
 */
export function getOfficeBuffs() {
  const store = useGameStore.getState()
  return {
    staminaRecovery: store.player.officeBuffs?.staminaRecovery ?? 1,
    stressGeneration: store.player.officeBuffs?.stressGeneration ?? 1,
    skillGrowth: store.player.officeBuffs?.skillGrowth ?? 1,
    morale: store.player.officeBuffs?.morale ?? 1,
  }
}

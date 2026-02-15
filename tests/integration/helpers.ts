import { vi } from 'vitest'
import { create } from 'zustand'
import type {
  GameState,
  Company,
  PlayerState,
  Employee,
  Competitor,
  PortfolioPosition,
  GameTime,
} from '@/types'
import { COMPANIES } from '@/data/companies'
import { DIFFICULTY_TABLE } from '@/data/difficulty'

/**
 * 테스트용 게임 스토어 생성 헬퍼
 * 실제 useGameStore와 동일한 초기 상태로 시작
 */
export function createTestStore(overrides?: Partial<GameState>) {
  // 실제 store의 초기 상태를 최대한 재현
  const baseState: GameState = {
    // Time
    time: {
      year: 1995,
      month: 1,
      day: 1,
      tick: 0,
      isPaused: false,
    },
    // Player
    player: {
      cash: 50_000_000, // 초기 자금
      portfolio: {}, // 빈 포트폴리오
      employees: [],
      monthlyExpenses: 0,
      totalAssetValue: 50_000_000,
      officeGrid: initializeOfficeGrid(),
      officeLevel: 1,
    },
    // Game
    companies: COMPANIES,
    competitors: [],
    competitorCount: 0,
    events: [],
    windows: [],
    news: [],
    taunts: [],
    isGameStarted: true,
    gameSpeed: 1,
    difficultyConfig: DIFFICULTY_TABLE.normal,
    difficulty: 'normal',
    // Add missing required fields
    levelUpNotifications: [],
  }

  // Apply overrides
  const initialState = { ...baseState, ...overrides }

  // Add missing competitor-related fields
  initialState.competitorActions = []
  ;(initialState as any).rankings = []

  // Create Zustand store
  const store = create<GameState>(() => initialState)

  // Mock essential actions
  store.setState = vi.fn((updater) => {
    const current = store.getState()
    const newState =
      typeof updater === 'function' ? updater(current) : updater
    // Manually update state (simulating Zustand behavior)
    Object.assign(current, newState)
  }) as any

  // Add mock methods
  ;(store as any).advanceTick = vi.fn(() => {
    const state = store.getState()
    const newTick = state.time.tick + 1
    const newDay = state.time.day + (newTick % 3600 === 0 ? 1 : 0)
    const newMonth =
      state.time.month + (newDay > 30 ? 1 : 0)
    const newYear = state.time.year + (newMonth > 12 ? 1 : 0)

    store.setState({
      time: {
        year: newYear % 31 === 0 ? state.time.year : newYear,
        month: newMonth > 12 ? 1 : newMonth,
        day: newDay > 30 ? 1 : newDay,
        tick: newTick % 3600,
        isPaused: state.time.isPaused,
      },
    })
  })

  ;(store as any).updatePrices = vi.fn((prices: Record<string, number>) => {
    const state = store.getState()
    const updatedCompanies = state.companies.map((c) => ({
      ...c,
      price: prices[c.id] || c.price,
    }))
    store.setState({ companies: updatedCompanies })
  })

  ;(store as any).buyStock = vi.fn(
    (ticker: string, shares: number) => {
      if (shares <= 0) return false

      const state = store.getState()
      const company = state.companies.find((c) => c.ticker === ticker)
      if (!company) return false

      const cost = company.price * shares
      if (state.player.cash < cost) return false

      const existing = state.player.portfolio[ticker] || {
        ticker,
        shares: 0,
        avgBuyPrice: 0,
      }

      const newAvgPrice =
        (existing.avgBuyPrice * existing.shares +
          company.price * shares) /
        (existing.shares + shares)

      store.setState({
        player: {
          ...state.player,
          cash: state.player.cash - cost,
          portfolio: {
            ...state.player.portfolio,
            [ticker]: {
              ticker,
              shares: existing.shares + shares,
              avgBuyPrice: newAvgPrice,
            },
          },
          totalAssetValue:
            state.player.totalAssetValue -
            cost,
        },
      })
      return true
    }
  )

  ;(store as any).sellStock = vi.fn(
    (ticker: string, shares: number) => {
      if (shares <= 0) return false

      const state = store.getState()
      const position = state.player.portfolio[ticker]
      if (!position || position.shares < shares) return false

      const company = state.companies.find((c) => c.ticker === ticker)
      if (!company) return false

      const revenue = company.price * shares
      const newShares = position.shares - shares

      const newPortfolio = { ...state.player.portfolio }
      if (newShares > 0) {
        newPortfolio[ticker] = { ...position, shares: newShares }
      } else {
        delete newPortfolio[ticker]
      }

      store.setState({
        player: {
          ...state.player,
          cash: state.player.cash + revenue,
          portfolio: newPortfolio,
          totalAssetValue:
            state.player.totalAssetValue +
            revenue,
        },
      })
      return true
    }
  )

  ;(store as any).processMonthly = vi.fn(() => {
    // No-op for tests
  })

  ;(store as any).processEmployeeTick = vi.fn(() => {
    // No-op for tests
  })

  ;(store as any).updateCompetitorAssets = vi.fn(() => {
    // No-op for tests
  })

  ;(store as any).initializeCompetitors = vi.fn((count: number, initialCash: number) => {
    const competitors: Competitor[] = []
    const styles = ['aggressive', 'conservative', 'trend-follower', 'contrarian']

    for (let i = 0; i < count; i++) {
      competitors.push({
        id: `competitor-${i}`,
        name: `Competitor ${i}`,
        style: styles[i % 4] as any,
        cash: initialCash,
        portfolio: {},
        totalAssets: initialCash,
        roi: 0,
        panicSellCooldown: 0,
      } as any)
    }

    store.setState({
      competitors,
      competitorCount: count,
    })
  })

  ;(store as any).processCompetitorTick = vi.fn((tick: number) => {
    // Simpl e mock - just decrease panic cooldown
    const state = store.getState()
    const updatedCompetitors = state.competitors.map((c: any) => ({
      ...c,
      panicSellCooldown: Math.max(0, c.panicSellCooldown - 5),
    }))
    store.setState({ competitors: updatedCompetitors })
  })

  ;(store as any).calculateRankings = vi.fn(() => {
    const state = store.getState()
    const rankings = [...state.competitors].sort(
      (a: any, b: any) => b.totalAssets - a.totalAssets
    )
    store.setState({ rankings } as any)
  })

  ;(store as any).addTaunt = vi.fn((taunt: any) => {
    const state = store.getState()
    const newTaunts = [...state.taunts, taunt]
    if (newTaunts.length > 20) newTaunts.shift()
    store.setState({ taunts: newTaunts })
  })

  ;(store as any).startGame = vi.fn((difficulty: string, options?: any) => {
    const competitors = options?.competitorCount || 0
    if (competitors > 0) {
      ;(store as any).initializeCompetitors(competitors, 50_000_000)
    }
  })

  return store
}

/**
 * 테스트용 오피스 그리드 초기화
 */
function initializeOfficeGrid() {
  const grid = Array(10)
    .fill(null)
    .map(() =>
      Array(10)
        .fill(null)
        .map(() => ({
          type: 'empty' as const,
          occupiedBy: null,
          buffs: [],
        }))
    )
  return grid
}

/**
 * n개 틱만큼 게임을 진행
 */
export function advanceNTicks(store: any, n: number) {
  for (let i = 0; i < n; i++) {
    store.advanceTick()
  }
}

/**
 * 게임 상태 스냅샷 생성
 */
export function getGameStateSnapshot(store: any) {
  const state = store.getState()
  return {
    time: { ...state.time },
    playerCash: state.player.cash,
    playerAssets: state.player.totalAssetValue,
    employeeCount: state.player.employees.length,
    competitorCount: state.competitors.length,
    eventCount: state.events.length,
  }
}

/**
 * 테스트 직원 생성
 */
export function createTestEmployee(
  overrides?: Partial<Employee>
): Employee {
  const defaults: Employee = {
    id: `emp-${Math.random().toString(36).substr(2, 9)}`,
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
  return { ...defaults, ...overrides }
}

/**
 * 테스트 회사 생성
 */
export function createTestCompany(
  overrides?: Partial<Company>
): Company {
  const defaults: Company = {
    id: `company-${Math.random().toString(36).substr(2, 9)}`,
    name: '테스트주식',
    ticker: 'TEST',
    sector: 'Tech',
    price: 50_000,
    drift: 0,
    volatility: 0.02,
    newsImpact: [],
  }
  return { ...defaults, ...overrides }
}

/**
 * 테스트 경쟁자 생성
 */
export function createTestCompetitor(
  overrides?: Partial<Competitor>
): Competitor {
  const defaults: Competitor = {
    id: `comp-${Math.random().toString(36).substr(2, 9)}`,
    name: '경쟁자',
    style: 'aggressive',
    cash: 50_000_000,
    portfolio: {},
    roi: 0,
    rank: 1,
    panicCooldown: 0,
    taunts: [],
  }
  return { ...defaults, ...overrides }
}

/**
 * 포트폴리오에 주식 추가 (테스트용)
 */
export function addToPortfolio(
  store: any,
  ticker: string,
  shares: number,
  avgBuyPrice: number
) {
  const state = store.getState()
  store.setState({
    player: {
      ...state.player,
      portfolio: {
        ...state.player.portfolio,
        [ticker]: { ticker, shares, avgBuyPrice },
      },
    },
  })
}

/**
 * 직원 추가 (테스트용)
 */
export function hireEmployee(store: any, employee: Employee) {
  const state = store.getState()
  store.setState({
    player: {
      ...state.player,
      employees: [...state.player.employees, employee],
      monthlyExpenses:
        state.player.monthlyExpenses +
        employee.salaryPerMonth / 3,
    },
  })
}

/**
 * 경쟁자 추가 (테스트용)
 */
export function addCompetitor(store: any, competitor: Competitor) {
  const state = store.getState()
  store.setState({
    competitors: [...state.competitors, competitor],
    competitorCount: state.competitors.length + 1,
  })
}

/**
 * 게임 속도 변경 (테스트용)
 */
export function setGameSpeed(store: any, speed: number) {
  const state = store.getState()
  store.setState({
    gameSpeed: speed,
  })
}

/**
 * 게임 일시정지 토글 (테스트용)
 */
export function togglePause(store: any) {
  const state = store.getState()
  store.setState({
    time: {
      ...state.time,
      isPaused: !state.time.isPaused,
    },
  })
}

/**
 * 현금 추가 (테스트용)
 */
export function addCash(store: any, amount: number) {
  const state = store.getState()
  store.setState({
    player: {
      ...state.player,
      cash: state.player.cash + amount,
      totalAssetValue:
        state.player.totalAssetValue + amount,
    },
  })
}

/**
 * 회사 가격 설정 (테스트용)
 */
export function setCompanyPrice(
  store: any,
  ticker: string,
  price: number
) {
  const state = store.getState()
  const updatedCompanies = state.companies.map((c) =>
    c.ticker === ticker ? { ...c, price } : c
  )
  store.setState({ companies: updatedCompanies })
}

/**
 * 첫 번째 유효한 회사 티커 반환 (테스트용)
 */
export function getTestCompanyTicker(store: any): string {
  const state = store.getState()
  const company = state.companies[0]
  return company?.ticker || 'NXT' // 기본값: 첫 회사 또는 NXT
}

/**
 * 특정 인덱스의 회사 반환 (테스트용)
 */
export function getCompanyAt(store: any, index: number) {
  const state = store.getState()
  return state.companies[index]
}

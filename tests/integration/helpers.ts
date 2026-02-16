import { vi } from 'vitest'
import { create } from 'zustand'
import type {
  Company,
  PlayerState,
  Employee,
  Competitor,
  PortfolioPosition,
  GameTime,
  MarketEvent,
  WindowState,
  NewsItem,
  GameConfig,
  DifficultyConfig,
  TauntMessage,
  CompetitorAction,
  TradingStyle,
  EmployeeRole,
  EmployeeSkills,
  EmployeeTrait,
} from '@/types'
import { EMPLOYEE_ROLE_CONFIG } from '@/types'
import type { GridCell, BuffEffect } from '@/types/office'
import { COMPANIES } from '@/data/companies'
import { DIFFICULTY_TABLE } from '@/data/difficulty'
import { FURNITURE_CATALOG } from '@/data/furniture'
import { badgeForLevel, titleForLevel, xpForLevel } from '@/systems/growthSystem'
import type { TradeProposal } from '@/types/trade'

// ═══════════════════════════════════════════════════════
//  Test Store State Shape
// ═══════════════════════════════════════════════════════

interface TestGameState {
  config: GameConfig
  difficultyConfig: DifficultyConfig
  isGameStarted: boolean
  isGameOver: boolean
  isGameEnded: boolean

  time: GameTime
  lastProcessedMonth: number

  player: PlayerState & {
    officeGrid: GridCell[][]
    dailyChange: number
    previousDayAssets: number
    chatterCooldown: Record<string, number>
  }

  companies: Company[]
  events: MarketEvent[]
  news: NewsItem[]

  windows: WindowState[]
  nextZIndex: number
  windowIdCounter: number
  isFlashing: boolean
  unreadNewsCount: number

  competitors: Competitor[]
  competitorCount: number
  competitorActions: CompetitorAction[]
  taunts: TauntMessage[]

  proposals: TradeProposal[]
}

// ═══════════════════════════════════════════════════════
//  Office Grid Initialization
// ═══════════════════════════════════════════════════════

function initializeOfficeGrid(): GridCell[][] {
  return Array.from({ length: 10 }, (_, x) =>
    Array.from({ length: 10 }, (_, y) => ({
      x,
      y,
      type: 'desk' as const,
      occupiedBy: null,
      buffs: [],
    })),
  )
}

// ═══════════════════════════════════════════════════════
//  Deep Path Utilities
// ═══════════════════════════════════════════════════════

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Parse a path string into segments.
 * "player.cash" → ["player", "cash"]
 * "competitors[0].cash" → ["competitors", 0, "cash"]
 * "time.isPaused" → ["time", "isPaused"]
 */
function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = []
  let current = ''

  for (let i = 0; i < path.length; i++) {
    const char = path[i]
    if (char === '.') {
      if (current) segments.push(current)
      current = ''
    } else if (char === '[') {
      if (current) segments.push(current)
      current = ''
      i++
      let index = ''
      while (i < path.length && path[i] !== ']') {
        index += path[i]
        i++
      }
      const num = parseInt(index)
      segments.push(isNaN(num) ? index : num)
    } else {
      current += char
    }
  }
  if (current) segments.push(current)
  return segments
}

function setNestedValue(obj: any, path: string, value: unknown): void {
  const segments = parsePath(path)
  let current = obj
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (current[seg] === undefined || current[seg] === null) {
      current[seg] = typeof segments[i + 1] === 'number' ? [] : {}
    }
    current = current[seg]
  }
  current[segments[segments.length - 1]] = value
}

function getNestedValue(obj: any, path: string): unknown {
  const segments = parsePath(path)
  let current = obj
  for (const seg of segments) {
    if (current === undefined || current === null) return undefined
    current = current[seg]
  }
  return current
}

// ═══════════════════════════════════════════════════════
//  Test Store Factory
// ═══════════════════════════════════════════════════════

export function createTestStore(overrides?: Record<string, unknown>) {
  const baseState: TestGameState = {
    config: {
      difficulty: 'normal',
      startYear: 1995,
      endYear: 2025,
      initialCash: 50_000_000,
      maxCompanies: 100,
      targetAsset: 1_000_000_000,
    },
    difficultyConfig: DIFFICULTY_TABLE.normal,
    isGameStarted: true,
    isGameOver: false,
    isGameEnded: false,

    time: {
      year: 1995,
      quarter: 1,
      month: 0,
      day: 0,
      hour: 9,
      speed: 1,
      isPaused: false,
    },
    lastProcessedMonth: -1,

    player: {
      cash: 50_000_000,
      totalAssetValue: 50_000_000,
      portfolio: {},
      monthlyExpenses: 0,
      employees: [],
      officeLevel: 1,
      officeGrid: initializeOfficeGrid(),
      lastDayChange: 0,
      previousDayAssets: 50_000_000,
      dailyChange: 0,
      chatterCooldown: {},
    },

    companies: COMPANIES.map((c) => ({ ...c, priceHistory: [c.price] })),
    events: [],
    news: [],

    windows: [],
    nextZIndex: 1,
    windowIdCounter: 0,
    isFlashing: false,
    unreadNewsCount: 0,

    competitors: [],
    competitorCount: 0,
    competitorActions: [],
    taunts: [],

    proposals: [],
  }

  // Apply overrides with dot-notation support
  const initialState = deepClone(baseState)
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (key.includes('.') || key.includes('[')) {
        setNestedValue(initialState, key, value)
      } else {
        ;(initialState as Record<string, unknown>)[key] = value
      }
    }
  }

  // Compute lastProcessedMonth from final time state (after overrides)
  // Always set to current absMonth so processMonthly only fires on actual month transitions
  const absMonth = initialState.time.month + initialState.time.year * 12
  initialState.lastProcessedMonth = absMonth

  // Create Zustand store
  const rawStore = create<TestGameState>(() => initialState)

  // Override setState to support dot-notation
  const originalSetState = rawStore.setState.bind(rawStore)
  const store = rawStore as any
  store.setState = (updater: any, replace?: boolean) => {
    if (typeof updater === 'function') {
      originalSetState(updater, replace)
      return
    }
    if (typeof updater !== 'object' || updater === null) {
      originalSetState(updater, replace)
      return
    }

    const keys = Object.keys(updater)
    const hasDeepKeys = keys.some((k) => k.includes('.') || k.includes('['))

    if (hasDeepKeys) {
      const currentState = deepClone(store.getState())
      for (const [key, value] of Object.entries(updater)) {
        if (key.includes('.') || key.includes('[')) {
          setNestedValue(currentState, key, value)
        } else {
          ;(currentState as Record<string, unknown>)[key] = value
        }
      }
      originalSetState(currentState, true)
    } else {
      originalSetState(updater, replace)
    }
  }

  // ═══════════════════════════════════════════════════════
  //  getState() wrapper: auto-compute level/badge/title
  // ═══════════════════════════════════════════════════════

  const originalGetState = store.getState.bind(store)
  store.getState = () => {
    const state = originalGetState()

    // Dynamic totalAssetValue recalculation from cash + portfolio stock values
    let totalAssetValue = state.player?.cash ?? 0
    const portfolio = state.player?.portfolio ?? {}
    const companies = state.companies ?? []
    for (const ticker of Object.keys(portfolio)) {
      const holding = portfolio[ticker]
      if (holding && holding.shares > 0) {
        const company = companies.find((c: any) => c.ticker === ticker)
        const currentPrice = company?.price ?? holding.avgBuyPrice ?? 0
        totalAssetValue += holding.shares * currentPrice
      }
    }

    const playerPatch: any = {
      ...state.player,
      totalAssetValue,
    }

    if (state.player?.employees?.length > 0) {
      playerPatch.employees = state.player.employees.map((e: any) => {
        const rawXP = e.xp ?? 0
        // Derive level from accumulated XP WITHOUT consuming it
        let derivedLevel = e.level ?? 1
        let accXP = 0
        while (rawXP >= accXP + xpForLevel(derivedLevel)) {
          accXP += xpForLevel(derivedLevel)
          derivedLevel++
        }
        return {
          ...e,
          level: derivedLevel,
          xp: rawXP,
          badge: badgeForLevel(derivedLevel),
          title: titleForLevel(derivedLevel),
        }
      })
    }

    return {
      ...state,
      player: playerPatch,
    }
  }

  // ═══════════════════════════════════════════════════════
  //  Mock Actions
  // ═══════════════════════════════════════════════════════

  // ── buyStock ──
  store.buyStock = vi.fn((ticker: string, shares: number): boolean => {
    if (shares <= 0) return false

    const state = store.getState()
    if (!state.isGameStarted) return false

    const company = state.companies.find((c: Company) => c.ticker === ticker)
    if (!company) return false

    const cost = company.price * shares
    if (state.player.cash < cost) return false

    const existing = state.player.portfolio[ticker]
    const existingShares = existing?.shares ?? 0
    const existingAvg = existing?.avgBuyPrice ?? 0

    const newShares = existingShares + shares
    const newAvgPrice =
      newShares > 0
        ? (existingAvg * existingShares + company.price * shares) / newShares
        : company.price

    store.setState({
      player: {
        ...state.player,
        cash: state.player.cash - cost,
        portfolio: {
          ...state.player.portfolio,
          [ticker]: {
            companyId: company.id,
            shares: newShares,
            avgBuyPrice: newAvgPrice,
          },
        },
        totalAssetValue: state.player.totalAssetValue,
      },
    })
    return true
  })

  // ── sellStock ──
  store.sellStock = vi.fn((ticker: string, shares: number): boolean => {
    if (shares <= 0) return false

    const state = store.getState()
    const position = state.player.portfolio[ticker]
    if (!position || position.shares < shares) return false

    const company = state.companies.find((c: Company) => c.ticker === ticker)
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
        totalAssetValue: state.player.totalAssetValue,
      },
    })
    return true
  })

  // ── advanceHour (hour-based time: 9-18 per day, 10 hours/day) ──
  store.advanceHour = vi.fn((skipWorker?: boolean) => {
    const rawState = originalGetState()
    if (rawState.time.isPaused) return

    const oldHour = rawState.time.hour
    const newHour = oldHour + 1

    // ═══ FAST PATH: no day boundary crossed (hour <= 18) ═══
    if (newHour <= 18) {
      rawState.time.hour = newHour

      // Event decay
      if (rawState.events && rawState.events.length > 0) {
        const updated = rawState.events
          .map((e: any) => ({ ...e, remainingTicks: (e.remainingTicks ?? 0) - 1 }))
          .filter((e: any) => e.remainingTicks > 0)
        rawState.events = updated
      }

      // Worker postMessage
      if (!skipWorker && typeof globalThis !== 'undefined' && (globalThis as any).Worker) {
        try {
          const workerMock = (globalThis as any).Worker
          const diffConfig = rawState.difficultyConfig
          const volMult = diffConfig?.volatilityMultiplier ?? 1.0
          const companyData = (rawState.companies ?? []).map((c: any) => ({
            id: c.id,
            ticker: c.ticker,
            price: c.price,
            drift: c.drift ?? 0,
            volatility: (c.volatility ?? 0.3) * volMult,
            sector: c.sector,
          }))
          const eventModifiers = (rawState.events ?? []).map((e: any) => ({
            id: e.id,
            driftModifier: e.impact?.driftModifier ?? 1,
            volatilityModifier: e.impact?.volatilityModifier ?? 1,
            affectedSectors: e.affectedSectors ?? [],
          }))
          const mockInstances = workerMock.mock?.results
          if (mockInstances && mockInstances.length > 0) {
            const lastWorker = mockInstances[mockInstances.length - 1]?.value
            if (lastWorker && typeof lastWorker.postMessage === 'function') {
              lastWorker.postMessage({
                type: 'tick',
                companies: companyData,
                dt: 1 / 10,
                events: eventModifiers,
              })
            }
          }
        } catch {
          // Worker mock not available, skip
        }
      }

      // processEmployeeTick (every hour, same as old every-10-ticks)
      const hourIndex = newHour - 9
      const oldHourIndex = oldHour - 9
      if (hourIndex !== oldHourIndex) {
        if ((rawState.player?.employees?.length ?? 0) > 0 && typeof store.processEmployeeTick === 'function') {
          store.processEmployeeTick()
        }
      }

      // updateCompetitorAssets when competitors exist
      {
        const compCount = rawState.competitorCount ?? 0
        if (compCount > 0 && typeof store.updateCompetitorAssets === 'function') {
          store.updateCompetitorAssets()
        }
      }
      return
    }

    // ═══ SLOW PATH: day boundary crossed (hour > 18) ═══
    let { day, month, year } = rawState.time
    let dayChanged = false

    // Day boundary: hour > 18 means next day
    day += 1
    dayChanged = true

    // Month boundary: 30 days per month
    while (day >= 30) {
      day -= 30
      month++
    }

    // Year boundary: 12 months per year
    while (month >= 12) {
      month -= 12
      year++
    }

    const quarter = (Math.ceil((month + 1) / 3)) as 1 | 2 | 3 | 4

    // Event decay
    let updatedEvents = rawState.events
    if (rawState.events && rawState.events.length > 0) {
      updatedEvents = rawState.events
        .map((e: any) => ({ ...e, remainingTicks: (e.remainingTicks ?? 0) - 1 }))
        .filter((e: any) => e.remainingTicks > 0)
    }

    // isGameEnded check
    const isGameEnded = year > 2025 ? true : (rawState.isGameEnded ?? false)

    const updates: any = {
      time: {
        ...rawState.time,
        year,
        quarter,
        month,
        day,
        hour: 9, // Reset to business start
      },
      events: updatedEvents,
      isGameEnded,
    }

    // Calculate dailyChange on day change
    if (dayChanged) {
      const fullState = store.getState()
      const change =
        fullState.player.previousDayAssets > 0
          ? ((fullState.player.totalAssetValue - fullState.player.previousDayAssets) /
              fullState.player.previousDayAssets) *
            100
          : 0
      updates.player = {
        ...fullState.player,
        dailyChange: change,
        previousDayAssets: fullState.player.totalAssetValue,
        lastDayChange: change,
      }
    }

    store.setState(updates)

    // Worker postMessage on day changes
    if (dayChanged && typeof globalThis !== 'undefined' && (globalThis as any).Worker) {
      try {
        const workerMock = (globalThis as any).Worker
        const rawState2 = originalGetState()
        const diffConfig = rawState2.difficultyConfig
        const volMult = diffConfig?.volatilityMultiplier ?? 1.0
        const companyData = (rawState2.companies ?? []).map((c: any) => ({
          id: c.id,
          ticker: c.ticker,
          price: c.price,
          drift: c.drift ?? 0,
          volatility: (c.volatility ?? 0.3) * volMult,
          sector: c.sector,
        }))
        const eventModifiers = (rawState2.events ?? []).map((e: any) => ({
          id: e.id,
          driftModifier: e.impact?.driftModifier ?? 1,
          volatilityModifier: e.impact?.volatilityModifier ?? 1,
          affectedSectors: e.affectedSectors ?? [],
        }))
        const mockInstances = workerMock.mock?.results
        if (mockInstances && mockInstances.length > 0) {
          const lastWorker = mockInstances[mockInstances.length - 1]?.value
          if (lastWorker && typeof lastWorker.postMessage === 'function') {
            lastWorker.postMessage({
              type: 'tick',
              companies: companyData,
              dt: 1 / 10,
              events: eventModifiers,
            })
          }
        }
      } catch {
        // Worker mock not available, skip
      }
    }

    // processMonthly guard
    {
      const rawS = originalGetState()
      const currentAbsMonth = rawS.time.month + rawS.time.year * 12
      const lastProcessed = rawS.lastProcessedMonth
      if (currentAbsMonth !== lastProcessed) {
        store.setState({ lastProcessedMonth: currentAbsMonth })
        if (typeof store.processMonthly === 'function') {
          store.processMonthly()
        }
      }
    }

    // processEmployeeTick on day boundary
    {
      const rawS = originalGetState()
      const empCount = rawS.player?.employees?.length ?? 0
      if (empCount > 0 && typeof store.processEmployeeTick === 'function') {
        store.processEmployeeTick()
      }
    }

    // updateCompetitorAssets when competitors exist
    {
      const rawS = originalGetState()
      const compCount = rawS.competitorCount ?? 0
      if (compCount > 0 && typeof store.updateCompetitorAssets === 'function') {
        store.updateCompetitorAssets()
      }
    }
  })

  // ── updatePrices ──
  store.updatePrices = vi.fn((prices: Record<string, number>) => {
    const state = store.getState()
    const updatedCompanies = state.companies.map((c: Company) => ({
      ...c,
      previousPrice: c.price,
      price: prices[c.id] ?? c.price,
    }))

    let stockValue = 0
    for (const [ticker, pos] of Object.entries(state.player.portfolio) as [
      string,
      PortfolioPosition,
    ][]) {
      const comp = updatedCompanies.find((c: Company) => c.ticker === ticker)
      if (comp) {
        stockValue += comp.price * pos.shares
      }
    }

    store.setState({
      companies: updatedCompanies,
      player: {
        ...state.player,
        totalAssetValue: state.player.cash + stockValue,
      },
    })
  })

  // ── processMonthly ──
  store.processMonthly = vi.fn(() => {
    const state = store.getState()
    const employees = state.player.employees
    if (!employees || employees.length === 0) return

    const updatedEmployees = employees.map((emp: any) => {
      const updated = { ...emp }

      // XP grant: base 50, bonus if stamina >= 50%
      const staminaRatio = (updated.stamina ?? 100) / (updated.maxStamina ?? 100)
      const baseXP = 50
      const bonusXP = staminaRatio >= 0.5 ? Math.floor(Math.random() * 20) + 10 : 0
      updated.xp = (updated.xp ?? 0) + baseXP + bonusXP

      // Monthly stamina recovery: +30~50
      updated.stamina = Math.min(
        updated.maxStamina ?? 100,
        (updated.stamina ?? 0) + 30 + Math.floor(Math.random() * 20),
      )

      // Satisfaction fluctuation: ±2, but forced negative when stress > 60
      let satChange = Math.floor(Math.random() * 5) - 2
      if ((updated.stress ?? 0) > 60) {
        satChange = -Math.abs(satChange) - 1 // Always negative when stressed
      }
      updated.satisfaction = Math.max(
        0,
        Math.min(100, (updated.satisfaction ?? 80) + satChange),
      )

      return updated
    })

    // Deduct salaries
    const totalSalary = state.player.monthlyExpenses
    const newCash = Math.max(0, state.player.cash - totalSalary)

    store.setState({
      player: {
        ...state.player,
        cash: newCash,
        employees: updatedEmployees,
      },
    })
  })

  // ── processEmployeeTick (stamina drain + stress) ──
  store.processEmployeeTick = vi.fn(() => {
    const state = store.getState()
    const employees = state.player.employees
    if (!employees || employees.length === 0) return

    const updatedEmployees = employees.map((emp: any) => {
      const updated = { ...emp }
      // Slow stamina drain per hour-group
      updated.stamina = Math.max(0, (updated.stamina ?? 100) - 0.02)
      // Slight stress increase (0.0005 per hour-group: ~0.15 per month at 300 calls)
      updated.stress = Math.min(100, (updated.stress ?? 0) + 0.0005)
      return updated
    })

    store.setState({
      player: { ...state.player, employees: updatedEmployees },
    })
  })

  // ── fireEmployee ──
  store.fireEmployee = vi.fn((employeeId: string) => {
    const state = store.getState()
    const empIndex = state.player.employees.findIndex((e: Employee) => e.id === employeeId)
    if (empIndex === -1) return false

    const emp = state.player.employees[empIndex]
    const newEmployees = state.player.employees.filter((e: Employee) => e.id !== employeeId)

    // Clear grid seat
    const newGrid = state.player.officeGrid.map((row: GridCell[]) =>
      row.map((cell: GridCell) =>
        cell.occupiedBy === employeeId ? { ...cell, occupiedBy: null } : cell,
      ),
    )

    // Clear chatter cooldown
    const newCooldown = { ...state.player.chatterCooldown }
    delete newCooldown[employeeId]

    store.setState({
      player: {
        ...state.player,
        employees: newEmployees,
        monthlyExpenses: Math.max(0, state.player.monthlyExpenses - (emp.salary ?? 0)),
        officeGrid: newGrid,
        chatterCooldown: newCooldown,
      },
    })
    return true
  })

  // ── assignEmployeeSeat ──
  store.assignEmployeeSeat = vi.fn(
    (employeeId: string, cell: { x: number; y: number }): boolean => {
      const state = store.getState()
      const grid = state.player.officeGrid
      const target = grid[cell.x]?.[cell.y]
      if (!target) return false

      // Check if target is already occupied by another employee
      if (target.occupiedBy && target.occupiedBy !== employeeId) return false

      // Clear old seat
      const newGrid = grid.map((row: GridCell[]) =>
        row.map((c: GridCell) =>
          c.occupiedBy === employeeId ? { ...c, occupiedBy: null } : { ...c },
        ),
      )

      // Set new seat
      newGrid[cell.x][cell.y] = {
        ...newGrid[cell.x][cell.y],
        occupiedBy: employeeId,
      }

      store.setState({
        player: { ...state.player, officeGrid: newGrid },
      })
      return true
    },
  )

  // ── placeFurniture ──
  store.placeFurniture = vi.fn(
    (furnitureType: string, cell: { x: number; y: number }): boolean => {
      const state = store.getState()
      const catalog = (FURNITURE_CATALOG as any)[furnitureType]
      if (!catalog) return false

      const cost = catalog.cost ?? 0
      if (state.player.cash < cost) return false

      const target = state.player.officeGrid[cell.x]?.[cell.y]
      if (!target) return false
      if (target.type === 'furniture' || target.occupiedBy) return false

      const newGrid = state.player.officeGrid.map((row: GridCell[]) =>
        row.map((c: GridCell) => ({ ...c })),
      )

      newGrid[cell.x][cell.y] = {
        ...newGrid[cell.x][cell.y],
        type: 'furniture' as const,
        occupiedBy: furnitureType,
        buffs: catalog.buffs ?? [{ type: 'skill_growth', value: 1.1, range: 2 }],
      }

      store.setState({
        player: {
          ...state.player,
          cash: state.player.cash - cost,
          officeGrid: newGrid,
        },
      })
      return true
    },
  )

  // ── removeFurniture ──
  store.removeFurniture = vi.fn((cell: { x: number; y: number }): boolean => {
    const state = store.getState()
    const target = state.player.officeGrid[cell.x]?.[cell.y]
    if (!target || target.type !== 'furniture') return false

    const furnitureType = target.occupiedBy
    const catalog = furnitureType ? (FURNITURE_CATALOG as any)[furnitureType] : null
    const refund = catalog ? Math.floor(catalog.cost * 0.5) : 0

    const newGrid = state.player.officeGrid.map((row: GridCell[]) =>
      row.map((c: GridCell) => ({ ...c })),
    )

    newGrid[cell.x][cell.y] = {
      ...newGrid[cell.x][cell.y],
      type: 'desk' as const,
      occupiedBy: null,
      buffs: [],
    }

    store.setState({
      player: {
        ...state.player,
        cash: state.player.cash + refund,
        officeGrid: newGrid,
      },
    })
    return true
  })

  // ── upgradeOffice ──
  store.upgradeOffice = vi.fn(() => {
    const state = store.getState()
    const currentLevel = state.player.officeLevel
    const upgradeCosts: Record<number, number> = { 1: 5_000_000, 2: 30_000_000 }
    const cost = upgradeCosts[currentLevel]
    if (!cost || state.player.cash < cost) return false

    const newEmployees = state.player.employees.map((e: any) => ({
      ...e,
      stamina: e.maxStamina ?? 100,
    }))

    store.setState({
      player: {
        ...state.player,
        officeLevel: currentLevel + 1,
        cash: state.player.cash - cost,
        employees: newEmployees,
      },
    })
    return true
  })

  // ── initializeCompetitors ──
  store.initializeCompetitors = vi.fn(
    (count: number, initialCash: number) => {
      const styles: TradingStyle[] = [
        'aggressive',
        'conservative',
        'trend-follower',
        'contrarian',
      ]
      const competitors: Competitor[] = []

      for (let i = 0; i < count; i++) {
        competitors.push({
          id: `competitor-${i}`,
          name: `Competitor ${i}`,
          avatar: `🤖`,
          style: styles[i % 4],
          cash: initialCash,
          portfolio: {},
          totalAssetValue: initialCash,
          roi: 0,
          initialAssets: initialCash,
          lastDayChange: 0,
          panicSellCooldown: 0,
        })
      }

      store.setState({
        competitors,
        competitorCount: count,
      })
    },
  )

  // ── processCompetitorTick ──
  store.processCompetitorTick = vi.fn(() => {
    const state = store.getState()
    const updatedCompetitors = state.competitors.map((c: Competitor) => ({
      ...c,
      panicSellCooldown: Math.max(0, c.panicSellCooldown - 5),
    }))
    store.setState({ competitors: updatedCompetitors })
  })

  // ── updateCompetitorAssets ──
  store.updateCompetitorAssets = vi.fn(() => {
    const state = store.getState()
    const updatedCompetitors = state.competitors.map((c: Competitor) => {
      let stockValue = 0
      for (const [companyId, pos] of Object.entries(c.portfolio) as [
        string,
        any,
      ][]) {
        const comp = state.companies.find((co: Company) => co.id === companyId)
        if (comp && pos.shares) {
          stockValue += comp.price * pos.shares
        }
      }
      const totalAssetValue = c.cash + stockValue
      const roi =
        c.initialAssets > 0
          ? ((totalAssetValue - c.initialAssets) / c.initialAssets) * 100
          : 0
      return { ...c, totalAssetValue, roi }
    })
    store.setState({ competitors: updatedCompetitors })
  })

  // ── calculateRankings ──
  store.calculateRankings = vi.fn(() => {
    const state = store.getState()
    const playerRoi =
      state.player.roi !== undefined
        ? state.player.roi
        : state.config.initialCash > 0
          ? ((state.player.totalAssetValue - state.config.initialCash) /
              state.config.initialCash) *
            100
          : 0
    const entries = [
      {
        id: 'player',
        name: '플레이어',
        totalAssetValue: state.player.totalAssetValue,
        roi: playerRoi,
        isPlayer: true,
      },
      ...state.competitors.map((c: Competitor) => ({
        id: c.id,
        name: c.name,
        totalAssetValue: c.totalAssetValue,
        roi: c.roi,
        isPlayer: false,
      })),
    ]
    const rankings = entries
      .sort((a, b) => b.roi - a.roi)
      .map((e, i) => ({ ...e, rank: i + 1 }))
    store.setState({ rankings })
    return rankings
  })

  // ── addTaunt ──
  store.addTaunt = vi.fn((taunt: TauntMessage) => {
    const state = store.getState()
    const newTaunts = [...state.taunts, taunt]
    if (newTaunts.length > 20) newTaunts.shift()
    store.setState({ taunts: newTaunts })
  })

  // ── startGame ──
  store.startGame = vi.fn((difficulty: string, options?: any) => {
    const competitors = options?.competitorCount || 0
    if (competitors > 0) {
      store.initializeCompetitors(competitors, 50_000_000)
    }
  })

  // ── Trade AI Pipeline stubs ──
  store.addProposal = vi.fn(() => {})
  store.updateProposalStatus = vi.fn(() => {})
  store.expireOldProposals = vi.fn(() => {})
  store.processAnalystTick = vi.fn(() => {})
  store.processManagerTick = vi.fn(() => {})
  store.processTraderTick = vi.fn(() => {})

  return store
}

// ═══════════════════════════════════════════════════════
//  Helper Functions
// ═══════════════════════════════════════════════════════

/**
 * n시간만큼 게임을 진행 (1호출 = 1영업시간)
 */
export function advanceNTicks(store: any, n: number) {
  // For large hour counts, skip per-hour Worker postMessage for performance
  const skipWorker = n > 100
  for (let i = 0; i < n; i++) {
    store.advanceHour(skipWorker)
  }
}

/**
 * 게임 상태 스냅샷 생성
 */
export function getGameStateSnapshot(store: any) {
  const state = store.getState()
  return {
    time: { ...state.time },
    player: {
      cash: state.player.cash,
      totalAssetValue: state.player.totalAssetValue,
      dailyChange: state.player.dailyChange ?? 0,
      lastDayChange: state.player.lastDayChange ?? 0,
      employees: state.player.employees,
      officeLevel: state.player.officeLevel,
    },
    playerCash: state.player.cash,
    playerAssets: state.player.totalAssetValue,
    employeeCount: state.player.employees.length,
    competitorCount: state.competitors.length,
    eventCount: state.events.length,
  }
}

/**
 * 테스트 직원 생성 — matches actual Employee type
 */
export function createTestEmployee(overrides?: Partial<Employee>): Employee {
  const role: EmployeeRole = (overrides?.role as EmployeeRole) || 'trader'
  const cfg = EMPLOYEE_ROLE_CONFIG[role]

  const defaults: Employee = {
    id: `emp-${Math.random().toString(36).substr(2, 9)}`,
    name: '테스트직원',
    role,
    salary: cfg.baseSalary,
    stamina: 100,
    maxStamina: cfg.maxStamina,
    sprite: 'idle',
    hiredMonth: 0,
    bonus: { ...cfg.bonus },
    traits: [],
    stress: 50,
    satisfaction: 80,
    skills: { analysis: 50, trading: 50, research: 50 },
    level: 1,
    xp: 0,
    badge: 'gray' as const,
    title: 'intern' as const,
    mood: 50,
  }
  return { ...defaults, ...overrides }
}

/**
 * 테스트 회사 생성 — matches actual Company type
 */
export function createTestCompany(overrides?: Partial<Company>): Company {
  const defaults: Company = {
    id: `company-${Math.random().toString(36).substr(2, 9)}`,
    name: '테스트주식',
    ticker: 'TEST',
    sector: 'tech',
    price: 50_000,
    previousPrice: 50_000,
    basePrice: 50_000,
    priceHistory: [50_000],
    drift: 0,
    volatility: 0.02,
    marketCap: 5_000_000_000,
    description: '테스트 회사',
  }
  return { ...defaults, ...overrides }
}

/**
 * 테스트 경쟁자 생성 — matches actual Competitor type
 */
export function createTestCompetitor(overrides?: Partial<Competitor>): Competitor {
  const defaults: Competitor = {
    id: `comp-${Math.random().toString(36).substr(2, 9)}`,
    name: '경쟁자',
    avatar: '🤖',
    style: 'aggressive',
    cash: 50_000_000,
    portfolio: {},
    totalAssetValue: 50_000_000,
    roi: 0,
    initialAssets: 50_000_000,
    lastDayChange: 0,
    panicSellCooldown: 0,
  }
  return { ...defaults, ...overrides }
}

/**
 * 포트폴리오에 주식 추가 (테스트용)
 * - 비용(shares × avgBuyPrice) 차감
 * - 회사 가격을 avgBuyPrice로 설정 (일관된 평가)
 */
export function addToPortfolio(
  store: any,
  ticker: string,
  shares: number,
  avgBuyPrice: number,
) {
  const state = store.getState()
  const cost = shares * avgBuyPrice

  // Set company price to avgBuyPrice for consistent valuation
  const updatedCompanies = state.companies.map((c: Company) =>
    c.ticker === ticker ? { ...c, previousPrice: c.price, price: avgBuyPrice } : c,
  )

  const company = updatedCompanies.find((c: Company) => c.ticker === ticker)
  const companyId = company?.id ?? ticker

  // Recalculate existing stock value with updated prices
  let existingStockValue = 0
  for (const [t, pos] of Object.entries(state.player.portfolio) as [
    string,
    PortfolioPosition,
  ][]) {
    const comp = updatedCompanies.find((c: Company) => c.ticker === t)
    if (comp) existingStockValue += comp.price * pos.shares
  }

  const newCash = state.player.cash - cost
  const newStockValue = avgBuyPrice * shares

  store.setState({
    companies: updatedCompanies,
    player: {
      ...state.player,
      cash: newCash,
      portfolio: {
        ...state.player.portfolio,
        [ticker]: { companyId, shares, avgBuyPrice },
      },
      totalAssetValue: newCash + existingStockValue + newStockValue,
    },
  })
}

/**
 * 직원 추가 (테스트용) - 3개월 선불 급여 차감
 */
export function hireEmployee(store: any, employee: Employee) {
  const state = store.getState()
  const upfrontCost = (employee.salary ?? 0) * 3

  // Cash check - if not enough, still add but note it
  const newCash = state.player.cash - upfrontCost

  store.setState({
    player: {
      ...state.player,
      cash: newCash,
      employees: [...state.player.employees, employee],
      monthlyExpenses: state.player.monthlyExpenses + (employee.salary ?? 0),
      totalAssetValue: state.player.totalAssetValue - upfrontCost,
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
    time: { ...state.time, speed },
  })
}

/**
 * 게임 일시정지 토글 (테스트용)
 */
export function togglePause(store: any) {
  const state = store.getState()
  store.setState({
    time: { ...state.time, isPaused: !state.time.isPaused },
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
      totalAssetValue: state.player.totalAssetValue + amount,
    },
  })
}

/**
 * 회사 가격 설정 (테스트용) — also recalculates totalAssetValue
 */
export function setCompanyPrice(store: any, ticker: string, price: number) {
  const state = store.getState()
  const updatedCompanies = state.companies.map((c: Company) =>
    c.ticker === ticker ? { ...c, previousPrice: c.price, price } : c,
  )

  let stockValue = 0
  for (const [t, pos] of Object.entries(state.player.portfolio) as [
    string,
    PortfolioPosition,
  ][]) {
    const comp = updatedCompanies.find((c: Company) => c.ticker === t)
    if (comp) stockValue += comp.price * pos.shares
  }

  store.setState({
    companies: updatedCompanies,
    player: {
      ...state.player,
      totalAssetValue: state.player.cash + stockValue,
    },
  })
}

/**
 * 첫 번째 유효한 회사 티커 반환 (테스트용)
 */
export function getTestCompanyTicker(store: any): string {
  const state = store.getState()
  const company = state.companies[0]
  return company?.ticker || 'NXT'
}

/**
 * 특정 인덱스의 회사 반환 (테스트용)
 */
export function getCompanyAt(store: any, index: number) {
  const state = store.getState()
  return state.companies[index]
}

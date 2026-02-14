import { create } from 'zustand'
import type {
  Company,
  PlayerState,
  GameTime,
  MarketEvent,
  WindowState,
  NewsItem,
  GameConfig,
  Difficulty,
  DifficultyConfig,
  PortfolioPosition,
  EndingScenario,
  Employee,
  EmployeeRole,
  SaveData,
} from '../types'
import { EMPLOYEE_ROLE_CONFIG } from '../types'
import { COMPANIES } from '../data/companies'
import { DIFFICULTY_TABLE } from '../data/difficulty'
import { generateEmployeeName, resetNamePool } from '../data/employees'
import { saveGame, loadGame, deleteSave } from '../systems/saveSystem'

/* ── Ending Scenarios ── */
const ENDING_SCENARIOS: EndingScenario[] = [
  {
    id: 'billionaire',
    type: 'billionaire',
    title: '억만장자의 탄생',
    description: '당신은 전설적인 투자자가 되었습니다. 총 자산 10억 원을 돌파!',
    condition: (player) => player.totalAssetValue >= 1_000_000_000,
  },
  {
    id: 'legend',
    type: 'legend',
    title: '투자의 신',
    description: '초기 자본 대비 100배 이상의 수익을 달성! 당신의 이름은 역사에 남을 것입니다.',
    condition: (player, _time) => player.totalAssetValue >= player.cash * 100,
  },
  {
    id: 'retirement',
    type: 'retirement',
    title: '행복한 은퇴',
    description: '30년간의 여정을 무사히 마치고 안정적인 자산과 함께 은퇴합니다.',
    condition: (player, time) => time.year >= 2025 && player.totalAssetValue > 0,
  },
  {
    id: 'survivor',
    type: 'survivor',
    title: '생존자',
    description: '험난한 시장에서 30년을 버텨냈지만, 초기 자본을 지키지 못했습니다.',
    condition: (player, time) => time.year >= 2025 && player.totalAssetValue > 0,
  },
  {
    id: 'bankrupt',
    type: 'bankrupt',
    title: '파산',
    description: '자산이 바닥났습니다. 시장은 냉혹합니다.',
    condition: (player) => player.cash <= 0 && Object.keys(player.portfolio).length === 0,
  },
]

/* ── Store Interface ── */
interface GameStore {
  // Game config
  config: GameConfig
  difficultyConfig: DifficultyConfig
  isGameStarted: boolean
  isGameOver: boolean
  endingResult: EndingScenario | null

  // Time
  time: GameTime
  lastProcessedMonth: number

  // Player
  player: PlayerState

  // Market
  companies: Company[]
  events: MarketEvent[]
  news: NewsItem[]

  // UI
  windows: WindowState[]
  nextZIndex: number
  windowIdCounter: number
  isFlashing: boolean
  unreadNewsCount: number

  // Actions - Game
  startGame: (difficulty: Difficulty) => void
  loadSavedGame: () => Promise<boolean>
  autoSave: () => void
  setSpeed: (speed: GameTime['speed']) => void
  togglePause: () => void
  checkEnding: () => void

  // Actions - Time
  advanceTick: () => void
  processMonthly: () => void

  // Actions - Trading
  buyStock: (companyId: string, shares: number) => void
  sellStock: (companyId: string, shares: number) => void

  // Actions - Market
  updatePrices: (prices: Record<string, number>) => void
  addEvent: (event: MarketEvent) => void
  addNews: (news: NewsItem) => void
  markNewsRead: () => void

  // Actions - Employees
  hireEmployee: (role: EmployeeRole) => void
  fireEmployee: (id: string) => void

  // Actions - Windows
  openWindow: (type: WindowState['type'], props?: Record<string, unknown>) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  focusWindow: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (id: string, width: number, height: number) => void

  // Flash
  triggerFlash: () => void
}

let employeeIdCounter = 0

export const useGameStore = create<GameStore>((set, get) => ({
  config: { difficulty: 'normal', startYear: 1995, endYear: 2025, initialCash: 50_000_000, maxCompanies: 100 },
  difficultyConfig: DIFFICULTY_TABLE.normal,
  isGameStarted: false,
  isGameOver: false,
  endingResult: null,

  time: { year: 1995, month: 1, day: 1, tick: 0, speed: 1, isPaused: true },
  lastProcessedMonth: 0,

  player: {
    cash: 50_000_000,
    totalAssetValue: 50_000_000,
    portfolio: {},
    monthlyExpenses: 0,
    employees: [],
  },

  companies: [],
  events: [],
  news: [],

  windows: [],
  nextZIndex: 1,
  windowIdCounter: 0,
  isFlashing: false,
  unreadNewsCount: 0,

  /* ── Game Actions ── */
  startGame: (difficulty) => {
    const dcfg = DIFFICULTY_TABLE[difficulty]
    const companies = COMPANIES.map((c) => ({
      ...c,
      priceHistory: [c.price],
    }))

    resetNamePool()
    employeeIdCounter = 0

    const cfg: GameConfig = {
      difficulty,
      startYear: dcfg.startYear,
      endYear: dcfg.endYear,
      initialCash: dcfg.initialCash,
      maxCompanies: dcfg.maxCompanies,
    }

    set({
      config: cfg,
      difficultyConfig: dcfg,
      isGameStarted: true,
      isGameOver: false,
      endingResult: null,
      time: { year: dcfg.startYear, month: 1, day: 1, tick: 0, speed: 1, isPaused: false },
      lastProcessedMonth: 0,
      player: {
        cash: dcfg.initialCash,
        totalAssetValue: dcfg.initialCash,
        portfolio: {},
        monthlyExpenses: 0,
        employees: [],
      },
      companies,
      events: [],
      news: [{
        id: 'welcome',
        timestamp: { year: dcfg.startYear, month: 1, day: 1, tick: 0, speed: 1, isPaused: false },
        headline: `${dcfg.startYear}년, 당신의 투자 여정이 시작됩니다`,
        body: '초기 자본금으로 현명한 투자를 시작하세요. 시장은 기회와 위험으로 가득합니다.',
        isBreaking: true,
        sentiment: 'neutral' as const,
      }],
      windows: [],
      nextZIndex: 1,
      windowIdCounter: 0,
      unreadNewsCount: 1,
    })

    deleteSave()

    const store = get()
    store.openWindow('portfolio')
    store.openWindow('chart')
    store.openWindow('news')
  },

  loadSavedGame: async () => {
    const data = await loadGame()
    if (!data) return false

    // Reconstruct companies from save + base data
    const companies = COMPANIES.map((base) => {
      const saved = data.companies.find((s) => s.id === base.id)
      if (!saved) return { ...base, priceHistory: [base.price] }
      return {
        ...base,
        price: saved.price,
        previousPrice: saved.previousPrice,
        priceHistory: saved.priceHistory,
        marketCap: saved.price * 1_000_000,
      }
    })

    const dcfg = DIFFICULTY_TABLE[data.config.difficulty]

    set({
      config: data.config,
      difficultyConfig: dcfg,
      isGameStarted: true,
      isGameOver: false,
      endingResult: null,
      time: data.time,
      player: data.player,
      companies,
      events: data.events,
      news: data.news,
      windows: [],
      nextZIndex: 1,
      windowIdCounter: 0,
      unreadNewsCount: 0,
    })

    const store = get()
    store.openWindow('portfolio')
    store.openWindow('chart')
    store.openWindow('news')
    return true
  },

  autoSave: () => {
    const s = get()
    if (!s.isGameStarted || s.isGameOver) return

    const data: SaveData = {
      version: 1,
      timestamp: Date.now(),
      config: s.config,
      time: s.time,
      player: s.player,
      companies: s.companies.map((c) => ({
        id: c.id,
        price: c.price,
        previousPrice: c.previousPrice,
        priceHistory: c.priceHistory,
      })),
      events: s.events,
      news: s.news.slice(0, 50), // Save only recent news
    }
    saveGame(data)
  },

  setSpeed: (speed) => set((s) => ({ time: { ...s.time, speed } })),

  togglePause: () => set((s) => ({ time: { ...s.time, isPaused: !s.time.isPaused } })),

  checkEnding: () => {
    const state = get()
    if (state.isGameOver) return

    for (const scenario of ENDING_SCENARIOS) {
      if (scenario.condition(state.player, state.time)) {
        set({
          isGameOver: true,
          endingResult: scenario,
          time: { ...state.time, isPaused: true },
        })
        break
      }
    }
  },

  /* ── Time ── */
  advanceTick: () =>
    set((s) => {
      let { year, month, day, tick } = s.time
      tick += 1
      if (tick >= 10) {
        tick = 0
        day += 1
      }
      if (day > 30) {
        day = 1
        month += 1
      }
      if (month > 12) {
        month = 1
        year += 1
      }
      return { time: { ...s.time, year, month, day, tick } }
    }),

  /* ── Monthly Processing: salary deduction + stamina drain ── */
  processMonthly: () => {
    const state = get()
    const monthNum = (state.time.year - state.config.startYear) * 12 + state.time.month

    if (monthNum <= state.lastProcessedMonth) return

    const dcfg = state.difficultyConfig

    set((s) => {
      // Calculate total salary
      const totalSalary = s.player.employees.reduce((sum, emp) => sum + emp.salary, 0)

      // Process employee stamina:
      // - Drain stamina from work this month
      // - Exhausted employees (stamina=0) do NOT recover → must be fired/rested
      // - Non-exhausted employees recover a small amount
      const updatedEmployees = s.player.employees.map((emp) => {
        const drain = 10 * dcfg.staminaDrainMultiplier
        let newStamina = emp.stamina - drain

        // Recovery only if employee still has some stamina after drain
        if (newStamina > 0) {
          newStamina = Math.min(emp.maxStamina, newStamina + emp.bonus.staminaRecovery)
        } else {
          newStamina = 0 // Fully exhausted — no recovery until rest
        }

        const sprite = newStamina <= 20 ? 'exhausted' as const
          : newStamina <= 60 ? 'typing' as const
          : 'idle' as const

        return { ...emp, stamina: newStamina, sprite }
      })

      const newCash = s.player.cash - totalSalary

      return {
        lastProcessedMonth: monthNum,
        player: {
          ...s.player,
          cash: newCash,
          employees: updatedEmployees,
          monthlyExpenses: totalSalary,
          totalAssetValue: newCash + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })
  },

  /* ── Trading ── */
  buyStock: (companyId, shares) =>
    set((s) => {
      if (shares <= 0) return s
      const company = s.companies.find((c) => c.id === companyId)
      if (!company) return s
      const cost = company.price * shares
      if (cost > s.player.cash) return s

      const existing = s.player.portfolio[companyId]
      const newPosition: PortfolioPosition = existing
        ? {
            companyId,
            shares: existing.shares + shares,
            avgBuyPrice:
              (existing.avgBuyPrice * existing.shares + company.price * shares) /
              (existing.shares + shares),
          }
        : { companyId, shares, avgBuyPrice: company.price }

      const newCash = s.player.cash - cost
      const newPortfolio = { ...s.player.portfolio, [companyId]: newPosition }

      return {
        player: {
          ...s.player,
          cash: newCash,
          portfolio: newPortfolio,
          totalAssetValue: newCash + calcPortfolioValue(newPortfolio, s.companies),
        },
      }
    }),

  sellStock: (companyId, shares) =>
    set((s) => {
      if (shares <= 0) return s
      const company = s.companies.find((c) => c.id === companyId)
      const position = s.player.portfolio[companyId]
      if (!company || !position || position.shares < shares) return s

      const revenue = company.price * shares
      const remaining = position.shares - shares
      const newPortfolio = { ...s.player.portfolio }

      if (remaining === 0) {
        delete newPortfolio[companyId]
      } else {
        newPortfolio[companyId] = { ...position, shares: remaining }
      }

      const newCash = s.player.cash + revenue

      return {
        player: {
          ...s.player,
          cash: newCash,
          portfolio: newPortfolio,
          totalAssetValue: newCash + calcPortfolioValue(newPortfolio, s.companies),
        },
      }
    }),

  /* ── Market ── */
  updatePrices: (prices) =>
    set((s) => {
      const newCompanies = s.companies.map((c) => {
        const newPrice = prices[c.id]
        if (newPrice === undefined) return c
        return {
          ...c,
          previousPrice: c.price,
          price: newPrice,
          priceHistory: [...c.priceHistory.slice(-299), newPrice],
          marketCap: newPrice * 1_000_000,
        }
      })

      const portfolioValue = calcPortfolioValue(s.player.portfolio, newCompanies)

      return {
        companies: newCompanies,
        player: {
          ...s.player,
          totalAssetValue: s.player.cash + portfolioValue,
        },
      }
    }),

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),

  addNews: (news) => set((s) => ({
    news: [news, ...s.news].slice(0, 100),
    unreadNewsCount: s.unreadNewsCount + 1,
  })),

  markNewsRead: () => set({ unreadNewsCount: 0 }),

  /* ── Employees ── */
  hireEmployee: (role) =>
    set((s) => {
      const roleConfig = EMPLOYEE_ROLE_CONFIG[role]
      const salary = Math.round(roleConfig.baseSalary * s.difficultyConfig.employeeSalaryMultiplier)

      if (s.player.cash < salary * 3) return s // Must afford 3 months upfront

      const employee: Employee = {
        id: `emp-${++employeeIdCounter}`,
        name: generateEmployeeName(),
        role,
        salary,
        stamina: roleConfig.maxStamina,
        maxStamina: roleConfig.maxStamina,
        sprite: 'idle',
        hiredMonth: (s.time.year - s.config.startYear) * 12 + s.time.month,
        bonus: { ...roleConfig.bonus },
      }

      // Deduct 3-month upfront signing bonus
      const newCash = s.player.cash - salary * 3

      return {
        player: {
          ...s.player,
          cash: newCash,
          employees: [...s.player.employees, employee],
          monthlyExpenses: s.player.monthlyExpenses + salary,
          totalAssetValue: newCash + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    }),

  fireEmployee: (id) =>
    set((s) => {
      const emp = s.player.employees.find((e) => e.id === id)
      if (!emp) return s
      return {
        player: {
          ...s.player,
          employees: s.player.employees.filter((e) => e.id !== id),
          monthlyExpenses: Math.max(0, s.player.monthlyExpenses - emp.salary),
        },
      }
    }),

  /* ── Windows ── */
  openWindow: (type, props) =>
    set((s) => {
      const existing = s.windows.find((w) => w.type === type && !w.isMinimized)
      if (existing) {
        return {
          windows: s.windows.map((w) =>
            w.id === existing.id ? { ...w, zIndex: s.nextZIndex } : w,
          ),
          nextZIndex: s.nextZIndex + 1,
        }
      }

      const counter = s.windowIdCounter + 1
      const id = `win-${counter}`
      const offset = (s.windows.length % 5) * 30
      const titles: Record<WindowState['type'], string> = {
        portfolio: '내 포트폴리오',
        chart: '주가 차트',
        trading: '매매 창',
        news: '뉴스',
        office: '사무실',
        ranking: '랭킹',
        settings: '설정',
      }

      const win: WindowState = {
        id,
        type,
        title: titles[type],
        x: 50 + offset,
        y: 50 + offset,
        width: type === 'chart' ? 500 : type === 'office' ? 420 : 380,
        height: type === 'chart' ? 350 : type === 'office' ? 400 : 300,
        isMinimized: false,
        isMaximized: false,
        zIndex: s.nextZIndex,
        props,
      }

      return {
        windows: [...s.windows, win],
        nextZIndex: s.nextZIndex + 1,
        windowIdCounter: counter,
      }
    }),

  closeWindow: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  minimizeWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)),
    })),

  focusWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex: s.nextZIndex } : w)),
      nextZIndex: s.nextZIndex + 1,
    })),

  moveWindow: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  resizeWindow: (id, width, height) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    })),

  /* ── Flash ── */
  triggerFlash: () => {
    set({ isFlashing: true })
    setTimeout(() => set({ isFlashing: false }), 500)
  },
}))

/* ── Helper ── */
function calcPortfolioValue(
  portfolio: Record<string, PortfolioPosition>,
  companies: Company[],
): number {
  let total = 0
  for (const pos of Object.values(portfolio)) {
    const company = companies.find((c) => c.id === pos.companyId)
    if (company) total += company.price * pos.shares
  }
  return total
}

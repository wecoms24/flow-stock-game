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
  PortfolioPosition,
  EndingScenario,
} from '../types'
import { COMPANIES } from '../data/companies'

/* ── Game Configuration by Difficulty ── */
const DIFFICULTY_CONFIG: Record<Difficulty, Omit<GameConfig, 'difficulty'>> = {
  easy: { startYear: 1995, endYear: 2025, initialCash: 100_000_000, maxCompanies: 100 },
  normal: { startYear: 1995, endYear: 2025, initialCash: 50_000_000, maxCompanies: 100 },
  hard: { startYear: 1995, endYear: 2025, initialCash: 20_000_000, maxCompanies: 100 },
}

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
  isGameStarted: boolean
  isGameOver: boolean
  endingResult: EndingScenario | null

  // Time
  time: GameTime

  // Player
  player: PlayerState

  // Market
  companies: Company[]
  events: MarketEvent[]
  news: NewsItem[]

  // UI - Window Manager
  windows: WindowState[]
  nextZIndex: number
  windowIdCounter: number

  // Flash effect
  isFlashing: boolean

  // Actions - Game
  startGame: (difficulty: Difficulty) => void
  setSpeed: (speed: GameTime['speed']) => void
  togglePause: () => void
  checkEnding: () => void

  // Actions - Time
  advanceTick: () => void

  // Actions - Trading
  buyStock: (companyId: string, shares: number) => void
  sellStock: (companyId: string, shares: number) => void

  // Actions - Market
  updatePrices: (prices: Record<string, number>) => void
  addEvent: (event: MarketEvent) => void
  addNews: (news: NewsItem) => void

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

export const useGameStore = create<GameStore>((set, get) => ({
  config: { difficulty: 'normal', ...DIFFICULTY_CONFIG.normal },
  isGameStarted: false,
  isGameOver: false,
  endingResult: null,

  time: {
    year: 1995,
    month: 1,
    day: 1,
    tick: 0,
    speed: 1,
    isPaused: true,
  },

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

  /* ── Game Actions ── */
  startGame: (difficulty) => {
    const cfg = DIFFICULTY_CONFIG[difficulty]
    const companies = COMPANIES.map((c) => ({
      ...c,
      priceHistory: [c.price],
    }))

    set({
      config: { difficulty, ...cfg },
      isGameStarted: true,
      isGameOver: false,
      endingResult: null,
      time: { year: cfg.startYear, month: 1, day: 1, tick: 0, speed: 1, isPaused: false },
      player: {
        cash: cfg.initialCash,
        totalAssetValue: cfg.initialCash,
        portfolio: {},
        monthlyExpenses: 0,
        employees: [],
      },
      companies,
      events: [],
      news: [
        {
          id: 'welcome',
          timestamp: { year: cfg.startYear, month: 1, day: 1, tick: 0, speed: 1, isPaused: false },
          headline: `${cfg.startYear}년, 당신의 투자 여정이 시작됩니다`,
          body: '초기 자본금으로 현명한 투자를 시작하세요. 시장은 기회와 위험으로 가득합니다.',
          isBreaking: true,
        },
      ],
      windows: [],
      nextZIndex: 1,
      windowIdCounter: 0, // Reset on new game
    })

    // Open default windows
    const store = get()
    store.openWindow('portfolio')
    store.openWindow('chart')
    store.openWindow('news')
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

  /* ── Trading ── */
  buyStock: (companyId, shares) =>
    set((s) => {
      if (shares <= 0) return s // Validate: positive shares only
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
      if (shares <= 0) return s // Validate: positive shares only
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

      // Recalculate total asset value with updated prices
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

  addNews: (news) => set((s) => ({ news: [news, ...s.news].slice(0, 100) })),

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
        width: type === 'chart' ? 500 : 380,
        height: type === 'chart' ? 350 : 300,
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

  closeWindow: (id) =>
    set((s) => ({
      windows: s.windows.filter((w) => w.id !== id),
    })),

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

/* ── Helper: calculate total portfolio market value ── */
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

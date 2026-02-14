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
} from '../types'
import { COMPANIES } from '../data/companies'

/* ── Game Configuration by Difficulty ── */
const DIFFICULTY_CONFIG: Record<Difficulty, Omit<GameConfig, 'difficulty'>> = {
  easy: { startYear: 1995, endYear: 2025, initialCash: 100_000_000, maxCompanies: 100 },
  normal: { startYear: 1995, endYear: 2025, initialCash: 50_000_000, maxCompanies: 100 },
  hard: { startYear: 1995, endYear: 2025, initialCash: 20_000_000, maxCompanies: 100 },
}

/* ── Store Interface ── */
interface GameStore {
  // Game config
  config: GameConfig
  isGameStarted: boolean

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

  // Flash effect
  isFlashing: boolean

  // Actions - Game
  startGame: (difficulty: Difficulty) => void
  setSpeed: (speed: GameTime['speed']) => void
  togglePause: () => void

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

let windowIdCounter = 0

export const useGameStore = create<GameStore>((set, get) => ({
  config: { difficulty: 'normal', ...DIFFICULTY_CONFIG.normal },
  isGameStarted: false,

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
    })

    // Open default windows
    const store = get()
    store.openWindow('portfolio')
    store.openWindow('chart')
    store.openWindow('news')
  },

  setSpeed: (speed) => set((s) => ({ time: { ...s.time, speed } })),

  togglePause: () => set((s) => ({ time: { ...s.time, isPaused: !s.time.isPaused } })),

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

      return {
        player: {
          ...s.player,
          cash: s.player.cash - cost,
          portfolio: { ...s.player.portfolio, [companyId]: newPosition },
        },
      }
    }),

  sellStock: (companyId, shares) =>
    set((s) => {
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

      return {
        player: {
          ...s.player,
          cash: s.player.cash + revenue,
          portfolio: newPortfolio,
        },
      }
    }),

  /* ── Market ── */
  updatePrices: (prices) =>
    set((s) => ({
      companies: s.companies.map((c) => {
        const newPrice = prices[c.id]
        if (newPrice === undefined) return c
        return {
          ...c,
          previousPrice: c.price,
          price: newPrice,
          priceHistory: [...c.priceHistory.slice(-299), newPrice],
          marketCap: newPrice * 1_000_000,
        }
      }),
    })),

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

      const id = `win-${++windowIdCounter}`
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

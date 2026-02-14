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
  WindowLayoutPreset,
  Competitor,
  CompetitorAction,
  TauntMessage,
  LevelUpEvent,
} from '../types'
import type { OfficeGrid, FurnitureType, FurnitureItem } from '../types/office'
import { EMPLOYEE_ROLE_CONFIG } from '../types'
import { COMPANIES } from '../data/companies'
import { DIFFICULTY_TABLE } from '../data/difficulty'
import { generateEmployeeName, resetNamePool, generateRandomTraits, generateInitialSkills } from '../data/employees'
import { TRAIT_DEFINITIONS } from '../data/traits'
import { FURNITURE_CATALOG, canBuyFurniture } from '../data/furniture'
import { saveGame, loadGame, deleteSave } from '../systems/saveSystem'
import {
  generateCompetitors,
  processAITrading,
  getPriceHistory,
} from '../engines/competitorEngine'
import { PANIC_SELL_CONFIG, PERFORMANCE_CONFIG } from '../config/aiConfig'
import { xpForLevel, titleForLevel, badgeForLevel, SKILL_UNLOCKS, XP_AMOUNTS } from '../systems/growthSystem'
import { soundManager } from '../systems/soundManager'
import { updateOfficeSystem } from '../engines/officeSystem'
import { processHRAutomation } from '../engines/hrAutomation'
import { cleanupChatterCooldown } from '../data/chatter'

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Competitor system
  competitors: Competitor[]
  competitorCount: number // 0 = disabled, 1-5 = active
  competitorActions: CompetitorAction[] // Recent 100 actions
  taunts: TauntMessage[] // Recent 20 taunts

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
  upgradeOffice: () => void

  // Actions - Competitors
  initializeCompetitors: (count: number, startingCash: number) => void
  processCompetitorTick: () => void
  executeBatchActions: (actions: CompetitorAction[]) => void
  updateCompetitorAssets: () => void
  calculateRankings: () => Array<{ rank: number; name: string; roi: number; isPlayer: boolean }>
  addTaunt: (taunt: TauntMessage) => void

  // Actions - Growth System (Sprint 3)
  pendingLevelUp: LevelUpEvent | null
  gainXP: (employeeId: string, amount: number, source?: string) => void
  praiseEmployee: (employeeId: string) => void
  scoldEmployee: (employeeId: string) => void
  dismissLevelUp: () => void

  // Actions - Office Grid (Sprint 2)
  initializeOfficeGrid: () => void
  placeFurniture: (type: FurnitureType, x: number, y: number) => boolean
  removeFurniture: (furnitureId: string) => void
  assignEmployeeSeat: (employeeId: string, x: number, y: number) => boolean
  unassignEmployeeSeat: (employeeId: string) => void
  recalculateGridBuffs: () => void
  processEmployeeTick: () => void

  // Actions - Windows
  openWindow: (type: WindowState['type'], props?: Record<string, unknown>) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  focusWindow: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (id: string, width: number, height: number) => void
  applyWindowLayout: (preset: WindowLayoutPreset) => void

  // Flash
  triggerFlash: () => void
}

let employeeIdCounter = 0

export const useGameStore = create<GameStore>((set, get) => ({
  config: {
    difficulty: 'normal',
    startYear: 1995,
    endYear: 2025,
    initialCash: 50_000_000,
    maxCompanies: 100,
  },
  difficultyConfig: DIFFICULTY_TABLE.normal,
  isGameStarted: false,
  isGameOver: false,
  endingResult: null,

  time: { year: 1995, quarter: 1, month: 1, day: 1, tick: 0, speed: 1, isPaused: true },
  lastProcessedMonth: 0,

  player: {
    cash: 50_000_000,
    totalAssetValue: 50_000_000,
    portfolio: {},
    monthlyExpenses: 0,
    employees: [],
    officeLevel: 1,
    lastDayChange: 0,
    previousDayAssets: 50_000_000,
  },

  companies: [],
  events: [],
  news: [],

  windows: [],
  nextZIndex: 1,
  windowIdCounter: 0,
  isFlashing: false,
  unreadNewsCount: 0,

  pendingLevelUp: null,

  competitors: [],
  competitorCount: 0,
  competitorActions: [],
  taunts: [],

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
      time: { year: dcfg.startYear, quarter: 1, month: 1, day: 1, tick: 0, speed: 1, isPaused: false },
      lastProcessedMonth: 0,
      player: {
        cash: dcfg.initialCash,
        totalAssetValue: dcfg.initialCash,
        portfolio: {},
        monthlyExpenses: 0,
        employees: [],
        officeLevel: 1,
        lastDayChange: 0,
        previousDayAssets: dcfg.initialCash,
      },
      companies,
      events: [],
      news: [
        {
          id: 'welcome',
          timestamp: { year: dcfg.startYear, quarter: 1, month: 1, day: 1, tick: 0, speed: 1, isPaused: false },
          headline: `${dcfg.startYear}년, 당신의 투자 여정이 시작됩니다`,
          body: '초기 자본금으로 현명한 투자를 시작하세요. 시장은 기회와 위험으로 가득합니다.',
          isBreaking: true,
          sentiment: 'neutral' as const,
        },
      ],
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
      player: {
        ...data.player,
        officeLevel: data.player.officeLevel ?? 1, // Migration for old saves
      },
      companies,
      events: data.events,
      news: data.news,
      competitors: data.competitors ?? [],
      competitorCount: data.competitorCount ?? 0,
      competitorActions: [],
      taunts: [],
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
      competitors: s.competitors,
      competitorCount: s.competitorCount,
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
      const oldDay = s.time.day
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

      // Calculate daily change when day changes
      const dayChanged = day !== oldDay
      let updatedPlayer = s.player

      if (dayChanged) {
        const currentAssets = s.player.totalAssetValue
        const previousAssets = s.player.previousDayAssets
        const changePercent =
          previousAssets > 0 ? ((currentAssets - previousAssets) / previousAssets) * 100 : 0

        updatedPlayer = {
          ...s.player,
          lastDayChange: changePercent,
          previousDayAssets: currentAssets,
        }
      }

      return {
        time: { ...s.time, year, month, day, tick },
        player: updatedPlayer,
      }
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

        const sprite =
          newStamina <= 20
            ? ('exhausted' as const)
            : newStamina <= 60
              ? ('typing' as const)
              : ('idle' as const)

        // Growth system: cooldown decay & mood drift
        const newPraiseCooldown = Math.max(0, (emp.praiseCooldown ?? 0) - 1)
        const newScoldCooldown = Math.max(0, (emp.scoldCooldown ?? 0) - 1)
        const currentMood = emp.mood ?? 50
        const newMood = currentMood + (currentMood < 50 ? 2 : currentMood > 50 ? -1 : 0)

        return {
          ...emp,
          stamina: newStamina,
          sprite,
          praiseCooldown: newPraiseCooldown,
          scoldCooldown: newScoldCooldown,
          mood: Math.max(0, Math.min(100, newMood)),
        }
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

    // Grant monthly XP to working employees (single batch set)
    set((s) => {
      let firstLevelUp: LevelUpEvent | null = null
      const batchEmployees = s.player.employees.map((emp) => {
        if (emp.stamina <= 0) return emp

        let totalXP = XP_AMOUNTS.MONTHLY_WORK
        if (emp.stamina > emp.maxStamina * 0.5) {
          totalXP += XP_AMOUNTS.PERFECT_STAMINA
        }

        const currentLevel = emp.level ?? 1
        const currentXP = (emp.xp ?? 0) + totalXP
        const xpNeeded = emp.xpToNextLevel ?? xpForLevel(currentLevel)

        if (currentXP >= xpNeeded) {
          const newLevel = currentLevel + 1
          const newTitle = titleForLevel(newLevel)
          const newBadge = badgeForLevel(newLevel)
          const oldTitle = emp.title ?? 'intern'
          const logEntry = {
            day: (s.time.year - s.config.startYear) * 360 + (s.time.month - 1) * 30 + s.time.day,
            event: 'LEVEL_UP' as const,
            description: `Lv.${newLevel} 달성!${newTitle !== oldTitle ? ` ${newTitle.toUpperCase()}로 승급!` : ''}`,
          }

          // Queue first level-up for UI display
          if (!firstLevelUp) {
            firstLevelUp = {
              employeeId: emp.id,
              employeeName: emp.name,
              newLevel,
              newTitle: newTitle !== oldTitle ? newTitle : undefined,
              newBadge: newBadge !== (emp.badge ?? 'gray') ? newBadge : undefined,
              unlockedSkill: SKILL_UNLOCKS[newLevel]?.name,
            }
          }

          return {
            ...emp,
            level: newLevel,
            xp: currentXP - xpNeeded,
            xpToNextLevel: xpForLevel(newLevel),
            title: newTitle,
            badge: newBadge,
            growthLog: [...(emp.growthLog ?? []), logEntry].slice(-50),
          }
        }

        return {
          ...emp,
          level: currentLevel,
          xp: currentXP,
          xpToNextLevel: xpNeeded,
          title: emp.title ?? titleForLevel(currentLevel),
          badge: emp.badge ?? badgeForLevel(currentLevel),
        }
      })

      return {
        player: { ...s.player, employees: batchEmployees },
        ...(firstLevelUp ? { pendingLevelUp: firstLevelUp } : {}),
      }
    })
  },

  /* ── Trading ── */
  buyStock: (companyId, shares) => {
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
    })

    // Grant trade XP to a random working employee
    const emps = get().player.employees.filter((e) => e.stamina > 0)
    if (emps.length > 0) {
      const lucky = emps[Math.floor(Math.random() * emps.length)]
      get().gainXP(lucky.id, XP_AMOUNTS.TRADE_SUCCESS, 'trade_success')
    }
  },

  sellStock: (companyId, shares) => {
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
    })

    // Grant trade XP to a random working employee
    const emps = get().player.employees.filter((e) => e.stamina > 0)
    if (emps.length > 0) {
      const lucky = emps[Math.floor(Math.random() * emps.length)]
      get().gainXP(lucky.id, XP_AMOUNTS.TRADE_SUCCESS, 'trade_success')
    }
  },

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

      // Update event impact tracking
      const updatedEvents = s.events.map((evt) => {
        if (!evt.priceImpactSnapshot || evt.remainingTicks <= 0) return evt

        const updatedSnapshot = { ...evt.priceImpactSnapshot }

        Object.keys(updatedSnapshot).forEach((companyId) => {
          const company = newCompanies.find((c) => c.id === companyId)
          if (company && updatedSnapshot[companyId]) {
            const snapshot = updatedSnapshot[companyId]
            const currentChange = company.price - snapshot.priceBefore

            // Update peak change if current change is more extreme
            if (Math.abs(currentChange) > Math.abs(snapshot.peakChange)) {
              snapshot.peakChange = currentChange
            }

            snapshot.currentChange = currentChange
          }
        })

        return {
          ...evt,
          priceImpactSnapshot: updatedSnapshot,
        }
      })

      const portfolioValue = calcPortfolioValue(s.player.portfolio, newCompanies)

      return {
        companies: newCompanies,
        events: updatedEvents,
        player: {
          ...s.player,
          totalAssetValue: s.player.cash + portfolioValue,
        },
      }
    }),

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),

  addNews: (news) =>
    set((s) => ({
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

      // ✨ Sprint 1: Generate traits and skills
      const traits = generateRandomTraits()
      const skills = generateInitialSkills(role, traits)

      // Apply trait salary multiplier
      let adjustedSalary = salary
      traits.forEach((trait) => {
        const config = TRAIT_DEFINITIONS[trait]
        if (config.effects.salaryMultiplier) {
          adjustedSalary = Math.round(adjustedSalary * config.effects.salaryMultiplier)
        }
      })

      const employee: Employee = {
        id: `emp-${++employeeIdCounter}`,
        name: generateEmployeeName(),
        role,
        salary: adjustedSalary,
        stamina: roleConfig.maxStamina,
        maxStamina: roleConfig.maxStamina,
        sprite: 'idle',
        hiredMonth: (s.time.year - s.config.startYear) * 12 + s.time.month,
        bonus: { ...roleConfig.bonus },

        // ✨ Sprint 1: RPG System
        traits,
        skills,
        stress: 0, // 초기 스트레스 0
        satisfaction: 100, // 초기 만족도 100
        seatIndex: null, // 미배치 상태
      }

      // Deduct 3-month upfront signing bonus (adjusted salary)
      const newCash = s.player.cash - adjustedSalary * 3

      return {
        player: {
          ...s.player,
          cash: newCash,
          employees: [...s.player.employees, employee],
          monthlyExpenses: s.player.monthlyExpenses + adjustedSalary,
          totalAssetValue: newCash + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    }),

  fireEmployee: (id) => {
    cleanupChatterCooldown(id)
    set((s) => {
      const emp = s.player.employees.find((e) => e.id === id)
      if (!emp) return s

      // 좌석 배치 해제
      if (emp.seatIndex != null && s.player.officeGrid) {
        const gridW = s.player.officeGrid.size.width
        const y = Math.floor(emp.seatIndex / gridW)
        const x = emp.seatIndex % gridW
        const cell = s.player.officeGrid.cells[y]?.[x]
        if (cell && cell.occupiedBy === id) {
          cell.occupiedBy = null
          cell.type = 'empty'
        }
      }

      return {
        player: {
          ...s.player,
          employees: s.player.employees.filter((e) => e.id !== id),
          monthlyExpenses: Math.max(0, s.player.monthlyExpenses - emp.salary),
        },
      }
    })
  },

  upgradeOffice: () =>
    set((s) => {
      const currentLevel = s.player.officeLevel
      if (currentLevel >= 3) return s // Max level

      // Upgrade costs by level
      const upgradeCosts: Record<number, number> = {
        1: 10_000_000, // Level 1 → 2
        2: 30_000_000, // Level 2 → 3
      }

      const cost = upgradeCosts[currentLevel]
      if (s.player.cash < cost) return s // Not enough cash

      // Reset all employee stamina to max on office upgrade
      const refreshedEmployees = s.player.employees.map((emp) => ({
        ...emp,
        stamina: emp.maxStamina,
      }))

      return {
        player: {
          ...s.player,
          cash: s.player.cash - cost,
          officeLevel: currentLevel + 1,
          employees: refreshedEmployees,
          totalAssetValue:
            s.player.cash - cost + calcPortfolioValue(s.player.portfolio, s.companies),
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
        ending: '게임 종료',
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

  /* ── Window Layout Presets ── */
  applyWindowLayout: (preset) => {
    // 기존 창 모두 닫기
    set({ windows: [] })

    // 실제 화면 크기 사용 (태스크바 높이 제외)
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight - 40 // 태스크바 + 여유 공간

    const GAP = 10 // 윈도우 간 간격

    let windowsToCreate: WindowState[] = []
    let nextId = 1
    let nextZ = 1

    switch (preset) {
      case 'trading': {
        // 트레이딩 레이아웃: 좌측(차트 + 거래창), 우측(뉴스 + 포트폴리오)
        const leftWidth = Math.floor(screenWidth * 0.55) - GAP * 2
        const rightX = Math.floor(screenWidth * 0.55) + GAP
        const rightWidth = screenWidth - rightX - GAP * 2
        const topHeight = Math.floor(screenHeight * 0.5) - GAP * 2
        const bottomY = Math.floor(screenHeight * 0.5) + GAP

        windowsToCreate = [
          {
            id: `win-${nextId++}`,
            type: 'chart',
            title: '주가 차트',
            x: GAP,
            y: GAP,
            width: leftWidth,
            height: topHeight,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
          {
            id: `win-${nextId++}`,
            type: 'trading',
            title: '매매 창',
            x: GAP,
            y: bottomY,
            width: leftWidth,
            height: screenHeight - bottomY - GAP,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
          {
            id: `win-${nextId++}`,
            type: 'news',
            title: '뉴스',
            x: rightX,
            y: GAP,
            width: rightWidth,
            height: topHeight,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
          {
            id: `win-${nextId++}`,
            type: 'portfolio',
            title: '내 포트폴리오',
            x: rightX,
            y: bottomY,
            width: rightWidth,
            height: screenHeight - bottomY - GAP,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
        ]
        break
      }

      case 'analysis': {
        // 분석 레이아웃: 좌측(포트폴리오 + 사무실), 우측(차트 크게)
        const leftWidth = Math.floor(screenWidth * 0.35) - GAP * 2
        const rightX = Math.floor(screenWidth * 0.35) + GAP
        const rightWidth = screenWidth - rightX - GAP * 2
        const topHeight = Math.floor(screenHeight * 0.5) - GAP * 2
        const bottomY = Math.floor(screenHeight * 0.5) + GAP

        windowsToCreate = [
          {
            id: `win-${nextId++}`,
            type: 'portfolio',
            title: '내 포트폴리오',
            x: GAP,
            y: GAP,
            width: leftWidth,
            height: topHeight,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
          {
            id: `win-${nextId++}`,
            type: 'office',
            title: '사무실',
            x: GAP,
            y: bottomY,
            width: leftWidth,
            height: screenHeight - bottomY - GAP,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
          {
            id: `win-${nextId++}`,
            type: 'chart',
            title: '주가 차트',
            x: rightX,
            y: GAP,
            width: rightWidth,
            height: screenHeight - GAP * 2,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
        ]
        break
      }

      case 'dashboard': {
        // 대시보드 레이아웃: 2x3 그리드 (6개 창)
        const colWidth = Math.floor((screenWidth - GAP * 4) / 3)
        const rowHeight = Math.floor((screenHeight - GAP * 3) / 2)

        const layouts: Array<{
          type: WindowState['type']
          title: string
          col: number
          row: number
        }> = [
          { type: 'portfolio', title: '내 포트폴리오', col: 0, row: 0 },
          { type: 'chart', title: '주가 차트', col: 1, row: 0 },
          { type: 'trading', title: '매매 창', col: 2, row: 0 },
          { type: 'news', title: '뉴스', col: 0, row: 1 },
          { type: 'office', title: '사무실', col: 1, row: 1 },
          { type: 'ranking', title: '랭킹', col: 2, row: 1 },
        ]

        windowsToCreate = layouts.map(({ type, title, col, row }) => ({
          id: `win-${nextId++}`,
          type,
          title,
          x: GAP + col * (colWidth + GAP),
          y: GAP + row * (rowHeight + GAP),
          width: colWidth,
          height: rowHeight,
          isMinimized: false,
          isMaximized: false,
          zIndex: nextZ++,
        }))
        break
      }
    }

    // 모든 윈도우를 한 번에 설정
    set({
      windows: windowsToCreate,
      windowIdCounter: nextId,
      nextZIndex: nextZ,
    })
  },

  /* ── Flash ── */
  triggerFlash: () => {
    set({ isFlashing: true })
    setTimeout(() => set({ isFlashing: false }), 500)
  },

  /* ── Competitor Actions ── */
  initializeCompetitors: (count, startingCash) => {
    const competitors = generateCompetitors(count, startingCash)
    set({ competitors, competitorCount: count })
  },

  processCompetitorTick: () => {
    const { competitors, companies, time } = get()
    if (competitors.length === 0) return

    // Decrease panic sell cooldowns (compensate for TICK_DISTRIBUTION interval)
    set((state) => ({
      competitors: state.competitors.map((c) => ({
        ...c,
        panicSellCooldown: Math.max(0, c.panicSellCooldown - PERFORMANCE_CONFIG.TICK_DISTRIBUTION),
      })),
    }))

    // Get updated state after cooldown decrease
    const updatedState = get()

    // Get price history for technical analysis
    const priceHistory = getPriceHistory(companies)

    // Process AI trading
    const actions = processAITrading(
      updatedState.competitors,
      companies,
      time.tick,
      priceHistory,
    )

    // Execute batch actions
    if (actions.length > 0) {
      get().executeBatchActions(actions)
    }
  },

  executeBatchActions: (actions) => {
    set((state) => {
      const newCompetitors = [...state.competitors]
      const newTaunts = [...state.taunts]

      actions.forEach((action) => {
        const competitor = newCompetitors.find((c) => c.id === action.competitorId)
        if (!competitor) return

        if (action.action === 'buy') {
          const cost = action.quantity * action.price

          // Validate sufficient cash
          if (competitor.cash < cost) {
            console.warn(
              `[AI Trade] ${competitor.name} insufficient cash: ${competitor.cash.toFixed(0)} < ${cost.toFixed(0)}`,
            )
            return
          }

          competitor.cash -= cost

          const position = competitor.portfolio[action.symbol]
          if (position) {
            const totalCost = position.avgBuyPrice * position.shares + cost
            const totalShares = position.shares + action.quantity
            position.shares = totalShares
            position.avgBuyPrice = totalCost / totalShares
          } else {
            competitor.portfolio[action.symbol] = {
              companyId: action.symbol,
              shares: action.quantity,
              avgBuyPrice: action.price,
            }
          }
        } else if (action.action === 'sell' || action.action === 'panic_sell') {
          const position = competitor.portfolio[action.symbol]
          if (!position) return

          // Validate sufficient shares
          if (position.shares < action.quantity) {
            console.warn(
              `[AI Trade] ${competitor.name} insufficient shares: ${position.shares} < ${action.quantity}`,
            )
            return
          }

          const proceeds = action.quantity * action.price
          competitor.cash += proceeds
          position.shares -= action.quantity

          if (position.shares <= 0) {
            delete competitor.portfolio[action.symbol]
          }

          // Add taunt for panic sell and set cooldown
          if (action.action === 'panic_sell') {
            competitor.panicSellCooldown = PANIC_SELL_CONFIG.COOLDOWN_TICKS

            newTaunts.push({
              competitorId: competitor.id,
              competitorName: competitor.name,
              message: `${competitor.name}: "손절이다! 더 떨어지기 전에!!" 😱`,
              type: 'panic',
              timestamp: Date.now(),
            })
          }
        }
      })

      return {
        competitors: newCompetitors,
        taunts: newTaunts.slice(-20), // Keep last 20
        competitorActions: [...state.competitorActions, ...actions].slice(-100), // Keep last 100
      }
    })
  },

  updateCompetitorAssets: () => {
    set((state) => {
      const newCompetitors = state.competitors.map((competitor) => {
        const portfolioValue = Object.entries(competitor.portfolio).reduce(
          (sum, [symbol, position]) => {
            const company = state.companies.find((c) => c.ticker === symbol)
            const currentPrice = company?.price || 0
            return sum + position.shares * currentPrice
          },
          0,
        )

        const totalAssetValue = competitor.cash + portfolioValue
        const roi =
          competitor.initialAssets > 0
            ? ((totalAssetValue - competitor.initialAssets) / competitor.initialAssets) * 100
            : 0

        return {
          ...competitor,
          totalAssetValue,
          roi,
        }
      })

      return { competitors: newCompetitors }
    })
  },

  calculateRankings: () => {
    const { competitors, player } = get()

    const playerROI =
      player.totalAssetValue > 0
        ? ((player.totalAssetValue - (get().config.initialCash || player.totalAssetValue)) /
            (get().config.initialCash || player.totalAssetValue)) *
          100
        : 0

    const all = [
      { name: 'You', roi: playerROI, isPlayer: true },
      ...competitors.map((c) => ({ name: c.name, roi: c.roi, isPlayer: false })),
    ]

    return all
      .sort((a, b) => b.roi - a.roi)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  },

  addTaunt: (taunt) => {
    set((state) => ({
      taunts: [...state.taunts, taunt].slice(-20), // Keep last 20
    }))
  },

  /* ── Growth System (Sprint 3) ── */
  gainXP: (employeeId, amount, _source) => {
    soundManager.playXPGain()
    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) return s

      const emp = s.player.employees[empIdx]
      const currentLevel = emp.level ?? 1
      const currentXP = (emp.xp ?? 0) + amount
      const xpNeeded = emp.xpToNextLevel ?? xpForLevel(currentLevel)

      if (currentXP >= xpNeeded) {
        // LEVEL UP!
        const newLevel = currentLevel + 1
        const newTitle = titleForLevel(newLevel)
        const newBadge = badgeForLevel(newLevel)
        const oldTitle = emp.title ?? 'intern'
        const skillUnlock = SKILL_UNLOCKS[newLevel]

        const logEntry = {
          day: (s.time.year - s.config.startYear) * 360 + (s.time.month - 1) * 30 + s.time.day,
          event: 'LEVEL_UP' as const,
          description: `Lv.${newLevel} 달성!${newTitle !== oldTitle ? ` ${newTitle.toUpperCase()}로 승급!` : ''}`,
        }

        const updatedEmployees = [...s.player.employees]
        updatedEmployees[empIdx] = {
          ...emp,
          level: newLevel,
          xp: currentXP - xpNeeded,
          xpToNextLevel: xpForLevel(newLevel),
          title: newTitle,
          badge: newBadge,
          growthLog: [...(emp.growthLog ?? []), logEntry].slice(-50),
        }

        // Dispatch level-up event for UI effects
        const levelUpEvent: LevelUpEvent = {
          employeeId,
          employeeName: emp.name,
          newLevel,
          newTitle: newTitle !== oldTitle ? newTitle : undefined,
          newBadge: newBadge !== (emp.badge ?? 'gray') ? newBadge : undefined,
          unlockedSkill: skillUnlock?.name,
        }

        return {
          pendingLevelUp: levelUpEvent,
          player: { ...s.player, employees: updatedEmployees },
        }
      }

      // Normal XP gain (no level up)
      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = {
        ...emp,
        level: currentLevel,
        xp: currentXP,
        xpToNextLevel: xpNeeded,
        title: emp.title ?? titleForLevel(currentLevel),
        badge: emp.badge ?? badgeForLevel(currentLevel),
      }

      return { player: { ...s.player, employees: updatedEmployees } }
    })
  },

  praiseEmployee: (employeeId) => {
    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) return s

      const emp = s.player.employees[empIdx]
      if ((emp.praiseCooldown ?? 0) > 0) return s // Still on cooldown

      const gameDay = (s.time.year - s.config.startYear) * 360 + (s.time.month - 1) * 30 + s.time.day

      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = {
        ...emp,
        mood: Math.min(100, (emp.mood ?? 50) + 15),
        satisfaction: Math.min(100, (emp.satisfaction ?? 50) + 5),
        praiseCooldown: 1, // 1 month cooldown (decremented per-month in processMonthly)
        growthLog: [
          ...(emp.growthLog ?? []),
          { day: gameDay, event: 'PRAISED' as const, description: '칭찬을 받았다!' },
        ].slice(-50),
      }

      return { player: { ...s.player, employees: updatedEmployees } }
    })

    // Grant bonus XP
    get().gainXP(employeeId, XP_AMOUNTS.PRAISE, 'praise')
  },

  scoldEmployee: (employeeId) => {
    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) return s

      const emp = s.player.employees[empIdx]
      if ((emp.scoldCooldown ?? 0) > 0) return s

      const gameDay = (s.time.year - s.config.startYear) * 360 + (s.time.month - 1) * 30 + s.time.day

      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = {
        ...emp,
        mood: Math.max(0, (emp.mood ?? 50) - 10),
        stress: Math.min(100, (emp.stress ?? 0) + 8),
        satisfaction: Math.max(0, (emp.satisfaction ?? 50) - 3),
        scoldCooldown: 1, // 1 month cooldown
        // If exhausted, resume work
        sprite: emp.sprite === 'exhausted' ? 'typing' : emp.sprite,
        stamina: emp.sprite === 'exhausted' ? Math.max(10, emp.stamina) : emp.stamina,
        growthLog: [
          ...(emp.growthLog ?? []),
          { day: gameDay, event: 'SCOLDED' as const, description: '꾸짖음을 받았다...' },
        ].slice(-50),
      }

      return { player: { ...s.player, employees: updatedEmployees } }
    })
  },

  dismissLevelUp: () => set({ pendingLevelUp: null }),

  /* ── Office Grid (Sprint 2) ── */
  initializeOfficeGrid: () => {
    set((s) => {
      if (s.player.officeGrid) return s // 이미 초기화됨

      const grid = createInitialOfficeGrid()
      return {
        player: {
          ...s.player,
          officeGrid: grid,
        },
      }
    })
  },

  placeFurniture: (type, x, y) => {
    const state = get()
    if (!state.player.officeGrid) {
      state.initializeOfficeGrid()
    }

    const grid = state.player.officeGrid!
    const { officeLevel, cash } = state.player
    const { canBuy, reason } = canBuyFurniture(type, officeLevel, cash)

    if (!canBuy) {
      console.warn(`Cannot buy furniture: ${reason}`)
      return false
    }

    const catalog = FURNITURE_CATALOG[type]

    // 공간 확인
    if (!isSpaceAvailable(x, y, catalog.size, grid)) {
      console.warn('Space not available')
      return false
    }

    // 가구 생성
    const furniture: FurnitureItem = {
      id: `furniture-${Date.now()}-${Math.random()}`,
      type,
      position: { x, y },
      size: catalog.size,
      buffs: catalog.buffs,
      cost: catalog.cost,
      sprite: catalog.sprite,
    }

    set((s) => {
      const grid = s.player.officeGrid!

      // 가구 추가
      grid.furniture.push(furniture)

      // 셀 점유 처리
      for (let dy = 0; dy < catalog.size.height; dy++) {
        for (let dx = 0; dx < catalog.size.width; dx++) {
          grid.cells[y + dy][x + dx].occupiedBy = furniture.id
          grid.cells[y + dy][x + dx].type = 'furniture'
        }
      }

      // 비용 차감
      const newCash = s.player.cash - catalog.cost

      return {
        player: {
          ...s.player,
          cash: newCash,
          totalAssetValue: newCash + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })

    // 버프 재계산
    get().recalculateGridBuffs()
    return true
  },

  removeFurniture: (furnitureId) => {
    set((s) => {
      const grid = s.player.officeGrid
      if (!grid) return s

      const furniture = grid.furniture.find((f) => f.id === furnitureId)
      if (!furniture) return s

      // 셀 점유 해제
      for (let dy = 0; dy < furniture.size.height; dy++) {
        for (let dx = 0; dx < furniture.size.width; dx++) {
          const cell = grid.cells[furniture.position.y + dy][furniture.position.x + dx]
          cell.occupiedBy = null
          cell.type = 'empty'
        }
      }

      // 가구 목록에서 제거
      grid.furniture = grid.furniture.filter((f) => f.id !== furnitureId)

      // 비용 환불 (50%)
      const refund = furniture.cost * 0.5
      const newCash = s.player.cash + refund

      return {
        player: {
          ...s.player,
          cash: newCash,
          totalAssetValue: newCash + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })

    get().recalculateGridBuffs()
  },

  assignEmployeeSeat: (employeeId, x, y) => {
    const state = get()
    const grid = state.player.officeGrid
    if (!grid) return false

    const cell = grid.cells[y]?.[x]
    if (!cell || cell.type !== 'empty' || cell.occupiedBy !== null) {
      return false
    }

    set((s) => {
      const employee = s.player.employees.find((e) => e.id === employeeId)
      if (!employee) return s

      // 기존 좌석 해제
      if (employee.seatIndex !== null && employee.seatIndex !== undefined) {
        const oldY = Math.floor(employee.seatIndex / 10)
        const oldX = employee.seatIndex % 10
        const oldCell = s.player.officeGrid?.cells[oldY]?.[oldX]
        if (oldCell) {
          oldCell.occupiedBy = null
          oldCell.type = 'empty'
        }
      }

      // 새 좌석 배치
      employee.seatIndex = y * 10 + x
      cell.occupiedBy = employeeId
      cell.type = 'desk'

      return s
    })

    return true
  },

  unassignEmployeeSeat: (employeeId) => {
    set((s) => {
      const employee = s.player.employees.find((e) => e.id === employeeId)
      if (!employee || employee.seatIndex === null || employee.seatIndex === undefined) return s

      const grid = s.player.officeGrid
      if (!grid) return s

      const y = Math.floor(employee.seatIndex / 10)
      const x = employee.seatIndex % 10
      const cell = grid.cells[y]?.[x]

      if (cell) {
        cell.occupiedBy = null
        cell.type = 'empty'
      }

      employee.seatIndex = null

      return s
    })
  },

  processEmployeeTick: () => {
    const state = get()
    if (state.player.employees.length === 0) return

    const { updatedEmployees, resignedIds, warnings } = updateOfficeSystem(
      state.player.employees,
      state.player.officeGrid,
    )

    // 퇴사 경고 뉴스
    warnings.forEach((w) => {
      state.addNews({
        id: `news-resign-warn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: { ...state.time },
        headline: `${w.name} 퇴사 위기!`,
        body: `${w.name}의 만족도가 위험 수준입니다. 빠른 조치가 필요합니다.`,
        isBreaking: true,
        sentiment: 'negative',
        relatedCompanies: [],
        impactSummary: '직원 퇴사 위험',
      })
    })

    // 퇴사 처리: 좌석 정리 + 쿨다운 정리 + 뉴스
    resignedIds.forEach((id) => {
      const emp = state.player.employees.find((e) => e.id === id)
      cleanupChatterCooldown(id)
      if (emp) {
        // 좌석 정리
        if (emp.seatIndex != null && state.player.officeGrid) {
          const gridW = state.player.officeGrid.size.width
          const y = Math.floor(emp.seatIndex / gridW)
          const x = emp.seatIndex % gridW
          const cell = state.player.officeGrid.cells[y]?.[x]
          if (cell && cell.occupiedBy === id) {
            cell.occupiedBy = null
            cell.type = 'empty'
          }
        }
        state.addNews({
          id: `news-resign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: { ...state.time },
          headline: `${emp.name} 퇴사`,
          body: `${emp.name}이(가) 불만족으로 퇴사했습니다.`,
          isBreaking: false,
          sentiment: 'negative',
          relatedCompanies: [],
          impactSummary: '직원 퇴사',
        })
      }
    })

    // HR 매니저 자동화 (50틱마다 = ~10초)
    const gameDays = Math.floor(
      (state.time.year - 1995) * 360 +
      (state.time.month - 1) * 30 +
      state.time.day,
    )
    const hrResult = processHRAutomation(updatedEmployees, state.player.cash, gameDays)

    // HR 알림 뉴스
    hrResult.alerts.forEach((alert) => {
      state.addNews({
        id: `news-hr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: { ...state.time },
        headline: alert.title,
        body: alert.content,
        isBreaking: alert.criticalCount > 2,
        sentiment: 'negative',
        relatedCompanies: [],
        impactSummary: `${alert.criticalCount}명 긴급 관리`,
      })
    })

    set((s) => ({
      player: {
        ...s.player,
        employees: hrResult.updatedEmployees,
        cash: Math.max(0, s.player.cash - hrResult.cashSpent),
      },
    }))
  },

  recalculateGridBuffs: () => {
    set((s) => {
      const grid = s.player.officeGrid
      if (!grid) return s

      // 모든 셀 버프 초기화
      grid.cells.flat().forEach((cell) => {
        cell.buffs = []
      })

      // 각 가구의 버프 적용
      grid.furniture.forEach((furniture) => {
        furniture.buffs.forEach((buff) => {
          const { x, y } = furniture.position
          const range = buff.range

          if (range === 0) {
            // 해당 칸만
            grid.cells[y][x].buffs.push(buff)
          } else if (range === 999) {
            // 전체 범위
            grid.cells.flat().forEach((cell) => cell.buffs.push(buff))
          } else {
            // 범위 내 셀 (맨해튼 거리)
            for (let dy = -range; dy <= range; dy++) {
              for (let dx = -range; dx <= range; dx++) {
                const nx = x + dx
                const ny = y + dy

                if (
                  Math.abs(dx) + Math.abs(dy) <= range &&
                  nx >= 0 &&
                  nx < grid.size.width &&
                  ny >= 0 &&
                  ny < grid.size.height
                ) {
                  grid.cells[ny][nx].buffs.push(buff)
                }
              }
            }
          }
        })
      })

      return s
    })
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

/**
 * 10x10 빈 오피스 그리드 생성
 */
function createInitialOfficeGrid(): OfficeGrid {
  const size = { width: 10, height: 10 }
  const cells: import('../types/office').GridCell[][] = []

  for (let y = 0; y < size.height; y++) {
    const row: import('../types/office').GridCell[] = []
    for (let x = 0; x < size.width; x++) {
      row.push({
        x,
        y,
        occupiedBy: null,
        type: 'empty',
        buffs: [],
      })
    }
    cells.push(row)
  }

  return {
    size,
    cells,
    furniture: [],
  }
}

/**
 * 가구 배치 공간 확인
 */
function isSpaceAvailable(
  x: number,
  y: number,
  size: { width: number; height: number },
  grid: OfficeGrid,
): boolean {
  // 그리드 범위 체크
  if (x < 0 || y < 0 || x + size.width > grid.size.width || y + size.height > grid.size.height) {
    return false
  }

  // 셀 점유 체크
  for (let dy = 0; dy < size.height; dy++) {
    for (let dx = 0; dx < size.width; dx++) {
      const cell = grid.cells[y + dy][x + dx]
      if (cell.occupiedBy !== null) {
        return false
      }
    }
  }

  return true
}

/* ── Console Tampering Detection ── */
// Prevent direct state manipulation via console in production
if (import.meta.env.PROD) {
  const originalGetState = useGameStore.getState
  useGameStore.getState = () => {
    const state = originalGetState()
    // Return frozen copy to prevent console tampering
    return Object.freeze({ ...state }) as typeof state
  }
}

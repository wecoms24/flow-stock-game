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
  OrderFlow,
  Institution,
  Sector,
} from '../types'
import type { OfficeGrid, FurnitureType, FurnitureItem } from '../types/office'
import type { TradeProposal, ProposalStatus } from '../types/trade'
import type { PlayerEvent, PlayerProfile } from '../types/personalization'
import type { MnaDeal } from '../engines/mnaEngine'
import { MAX_EVENT_LOG_SIZE, defaultProfile } from '../types/personalization'
import { computeProfileFromEvents } from '../systems/personalization/profile'
import { TRADE_AI_CONFIG } from '../config/tradeAIConfig'
import { getAbsoluteTimestamp } from '../config/timeConfig'
import { OFFICE_BALANCE } from '../config/balanceConfig'
import { EMPLOYEE_ROLE_CONFIG } from '../types'
import { COMPANIES, initializeCompanyFinancials } from '../data/companies'
import { DIFFICULTY_TABLE } from '../data/difficulty'
import { generateEmployeeName, resetNamePool, generateRandomTraits, generateInitialSkills, generateAssignedSectors } from '../data/employees'
import { calculateMarketSentiment } from '../engines/tickEngine'
import { TRAIT_DEFINITIONS } from '../data/traits'
import { FURNITURE_CATALOG, canBuyFurniture } from '../data/furniture'
import { saveGame, loadGame, deleteSave } from '../systems/saveSystem'
import {
  generateCompetitors,
  processAITrading,
  getPriceHistory,
} from '../engines/competitorEngine'
import {
  generateInstitutions,
  simulateInstitutionalTrading,
} from '../engines/institutionEngine'
import { PANIC_SELL_CONFIG, PERFORMANCE_CONFIG } from '../config/aiConfig'
import { xpForLevel, titleForLevel, badgeForLevel, SKILL_UNLOCKS, XP_AMOUNTS } from '../systems/growthSystem'
import { soundManager } from '../systems/soundManager'
import { updateOfficeSystem } from '../engines/officeSystem'
import { processHRAutomation } from '../engines/hrAutomation'
import { cleanupChatterCooldown, getPipelineMessage } from '../data/chatter'
import { cleanupInteractionCooldowns } from '../engines/employeeInteraction'
import { resetNewsEngine } from '../engines/newsEngine'
import { resetSentiment } from '../engines/sentimentEngine'
import { analyzeStock, generateProposal } from '../engines/tradePipeline/analystLogic'
import { evaluateRisk } from '../engines/tradePipeline/managerLogic'
import { executeProposal } from '../engines/tradePipeline/traderLogic'
import { calculateAdjacencyBonus } from '../engines/tradePipeline/adjacencyBonus'
import {
  initializeRegimeState,
  calculateMarketIndex,
  updateRegimeState,
} from '../engines/regimeEngine'
import {
  calculateKOSPIIndex,
  checkCircuitBreaker,
  resetCircuitBreakerForNewDay,
  isTradingHalted,
} from '../engines/circuitBreakerEngine'
import {
  checkVITrigger,
  updateVIState,
  triggerVI,
  isVIHalted,
  resetVIForNewDay,
} from '../engines/viEngine'

/* ── Ending Scenarios ── */
function getEndingScenarios(config: GameConfig): EndingScenario[] {
  const targetLabel = (config.targetAsset / 100_000_000).toFixed(0)
  return [
    {
      id: 'billionaire',
      type: 'billionaire',
      title: '목표 달성!',
      description: `당신은 전설적인 투자자가 되었습니다. 목표 자산 ${targetLabel}억 원 돌파!`,
      condition: (player) => player.totalAssetValue >= config.targetAsset,
    },
    {
      id: 'legend',
      type: 'legend',
      title: '투자의 신',
      description: '초기 자본 대비 50배 이상의 수익을 달성! 당신의 이름은 역사에 남을 것입니다.',
      condition: (player) => player.totalAssetValue >= config.initialCash * 50,
    },
    {
      id: 'retirement',
      type: 'retirement',
      title: '행복한 은퇴',
      description: '30년간의 여정을 무사히 마치고 안정적인 자산과 함께 은퇴합니다.',
      condition: (player, time) =>
        time.year >= config.endYear && player.totalAssetValue >= config.initialCash,
    },
    {
      id: 'survivor',
      type: 'survivor',
      title: '생존자',
      description: '험난한 시장에서 30년을 버텨냈지만, 초기 자본을 지키지 못했습니다.',
      condition: (player, time) =>
        time.year >= config.endYear &&
        player.totalAssetValue > 0 &&
        player.totalAssetValue < config.initialCash,
    },
    {
      id: 'bankrupt',
      type: 'bankrupt',
      title: '파산',
      description: '자산이 바닥났습니다. 시장은 냉혹합니다.',
      condition: (player) => player.cash <= 0 && Object.keys(player.portfolio).length === 0,
    },
  ]
}

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
  currentTick: number // 게임 시작 이후 경과 틱 (매 시간마다 증가)

  // Player
  player: PlayerState

  // Market
  companies: Company[]
  events: MarketEvent[]
  news: NewsItem[]
  marketRegime: import('../types').RegimeState
  marketIndexHistory: number[] // last 20 hours for regime detection
  circuitBreaker: import('../engines/circuitBreakerEngine').CircuitBreakerState

  // UI
  windows: WindowState[]
  nextZIndex: number
  windowIdCounter: number
  isFlashing: boolean
  unreadNewsCount: number

  // Trade AI Pipeline
  proposals: TradeProposal[]

  // Actions - Trade AI Pipeline
  addProposal: (proposal: TradeProposal) => void
  updateProposalStatus: (id: string, status: ProposalStatus, updates?: Partial<TradeProposal>) => void
  expireOldProposals: (currentTimestamp: number) => void
  processAnalystTick: () => void
  processManagerTick: () => void
  processTraderTick: () => void

  // Competitor system
  competitors: Competitor[]
  competitorCount: number // 0 = disabled, 1-5 = active
  competitorActions: CompetitorAction[] // Recent 100 actions
  taunts: TauntMessage[] // Recent 20 taunts
  officeEvents: Array<{ timestamp: number; type: string; emoji: string; message: string; employeeIds: string[] }>
  employeeBehaviors: Record<string, string> // employeeId → action type (WORKING, IDLE, etc.)

  // Order Flow (Deep Market)
  orderFlowByCompany: Record<string, OrderFlow>

  // Institutional Investors
  institutions: Institution[]

  // Personalization System
  playerEventLog: PlayerEvent[]
  playerProfile: PlayerProfile
  personalizationEnabled: boolean

  // Actions - Personalization
  logPlayerEvent: (kind: PlayerEvent['kind'], metadata: Record<string, any>) => void
  updateProfileOnDayEnd: () => void
  updateProfileOnMonthEnd: () => void
  setPersonalizationEnabled: (enabled: boolean) => void

  // Actions - Game
  startGame: (difficulty: Difficulty, targetAsset?: number, customInitialCash?: number) => void
  loadSavedGame: () => Promise<boolean>
  autoSave: () => void
  setSpeed: (speed: GameTime['speed']) => void
  togglePause: () => void
  checkEnding: () => void

  // Actions - Time
  advanceHour: () => void
  processMonthly: () => void

  // Actions - Trading
  buyStock: (companyId: string, shares: number) => void
  sellStock: (companyId: string, shares: number) => void

  // Actions - Market
  updatePrices: (prices: Record<string, number>) => void
  updateSessionOpenPrices: () => void // Update session open prices at market open
  addEvent: (event: MarketEvent) => void
  addNews: (news: NewsItem) => void
  markNewsRead: () => void
  detectAndUpdateRegime: () => void
  calculateMarketIndex: () => number
  updateCircuitBreaker: () => void
  updateVIStates: () => void
  canTrade: (companyId: string) => boolean // Check if trading is allowed (VI + circuit breaker)

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

  // Actions - Institutional Investors
  initializeInstitutions: () => void
  updateInstitutionalFlow: () => void
  updateInstitutionalFlowForSector: (sectorIndex: number) => void

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
  toggleMaximizeWindow: (id: string) => void
  focusWindow: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (id: string, width: number, height: number) => void
  updateWindowProps: (type: WindowState['type'], props: Record<string, unknown>) => void
  applyWindowLayout: (preset: WindowLayoutPreset) => void

  // M&A System
  lastMnaQuarter: number
  pendingIPOs: Array<{ slotIndex: number; spawnTick: number; newCompany: Company }>

  // Actions - M&A
  getActiveCompanies: () => Company[]
  getCompanyById: (id: string) => Company | undefined
  executeAcquisition: (acquirerId: string, targetId: string, deal: MnaDeal) => void
  scheduleIPO: (slotIndex: number, delayTicks: number, newCompany: Company) => void
  processScheduledIPOs: () => void
  applyAcquisitionExchange: (deal: MnaDeal) => void

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
    targetAsset: 1_000_000_000,
  },
  difficultyConfig: DIFFICULTY_TABLE.normal,
  isGameStarted: false,
  isGameOver: false,
  endingResult: null,

  time: { year: 1995, quarter: 1, month: 1, day: 1, hour: 9, speed: 1, isPaused: true },
  lastProcessedMonth: 0,
  currentTick: 0,

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
  marketRegime: initializeRegimeState(),
  marketIndexHistory: [],
  circuitBreaker: { level: 0, isActive: false, remainingTicks: 0, triggeredAt: null, kospiSessionOpen: 100, kospiCurrent: 100 },

  windows: [],
  nextZIndex: 1,
  windowIdCounter: 0,
  isFlashing: false,
  unreadNewsCount: 0,

  pendingLevelUp: null,
  lastMnaQuarter: 0,
  pendingIPOs: [],

  competitors: [],
  competitorCount: 0,
  competitorActions: [],
  taunts: [],
  officeEvents: [],
  employeeBehaviors: {},
  proposals: [],
  orderFlowByCompany: {},
  institutions: [],

  // Personalization System
  playerEventLog: [],
  playerProfile: defaultProfile(),
  personalizationEnabled: false,

  /* ── Game Actions ── */
  startGame: (difficulty, targetAsset, customInitialCash) => {
    const dcfg = DIFFICULTY_TABLE[difficulty]
    const companies = COMPANIES.map((c) =>
      initializeCompanyFinancials({
        ...c,
        priceHistory: [c.price],
      })
    )

    // Initialize institutions
    const institutions = generateInstitutions()

    resetNamePool()
    employeeIdCounter = 0

    const initialCash = customInitialCash ?? dcfg.initialCash

    const cfg: GameConfig = {
      difficulty,
      startYear: dcfg.startYear,
      endYear: dcfg.endYear,
      initialCash,
      maxCompanies: dcfg.maxCompanies,
      targetAsset: targetAsset ?? 1_000_000_000,
    }

    set({
      config: cfg,
      difficultyConfig: dcfg,
      isGameStarted: true,
      isGameOver: false,
      endingResult: null,
      time: { year: dcfg.startYear, quarter: 1, month: 1, day: 1, hour: 9, speed: 1, isPaused: false },
      lastProcessedMonth: 0,
      currentTick: 0,
      player: {
        cash: initialCash,
        totalAssetValue: initialCash,
        portfolio: {},
        monthlyExpenses: 0,
        employees: [],
        officeLevel: 1,
        lastDayChange: 0,
        previousDayAssets: initialCash,
      },
      companies,
      events: [],
      news: [
        {
          id: 'welcome',
          timestamp: { year: dcfg.startYear, quarter: 1, month: 1, day: 1, hour: 9, speed: 1, isPaused: false },
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
      proposals: [],
      institutions,
      // Personalization: sync lastUpdatedDay with game start day
      playerProfile: { ...defaultProfile(), lastUpdatedDay: 1 },
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

    // 엔진 내부 상태 리셋 (이전 세션 잔여 데이터 방지)
    resetNewsEngine()
    resetSentiment()

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

    // 직원 데이터 마이그레이션 (Sprint 3 필드 기본값)
    const migratedPlayer = {
      ...data.player,
      officeLevel: data.player.officeLevel ?? 1,
      employees: data.player.employees.map((emp) => ({
        ...emp,
        stress: emp.stress ?? 0,
        satisfaction: emp.satisfaction ?? 80,
        skills: emp.skills ?? { analysis: 30, trading: 30, research: 30 },
        traits: emp.traits ?? [],
        level: emp.level ?? 1,
        xp: emp.xp ?? 0,
        xpToNextLevel: emp.xpToNextLevel ?? 100,
        mood: emp.mood ?? 50,
      })),
    }

    const migratedConfig = {
      ...data.config,
      targetAsset: data.config.targetAsset ?? 1_000_000_000,
    }

    // 컴페티터 필드 마이그레이션
    const migratedCompetitors = (data.competitors ?? []).map((c) => ({
      ...c,
      panicSellCooldown: c.panicSellCooldown ?? 0,
      lastDayChange: c.lastDayChange ?? 0,
      totalAssetValue: c.totalAssetValue ?? c.cash,
      roi: c.roi ?? 0,
      initialAssets: c.initialAssets ?? c.cash,
    }))

    // 시간 상태: isPaused를 반드시 false로 강제 (게임 재개 보장)
    const loadedTime = { ...data.time, isPaused: false }

    // lastProcessedMonth 복원 (없으면 현재 시점 기준 계산 — 월급 이중 차감 방지)
    const fallbackMonth = (data.time.year - (data.config.startYear ?? 1995)) * 12 + data.time.month
    const lastProcessedMonth = data.lastProcessedMonth ?? fallbackMonth

    set({
      config: migratedConfig,
      difficultyConfig: dcfg,
      isGameStarted: true,
      isGameOver: false,
      endingResult: null,
      time: loadedTime,
      currentTick: data.currentTick ?? 0,
      lastProcessedMonth,
      player: migratedPlayer,
      companies,
      events: data.events,
      news: data.news,
      competitors: migratedCompetitors,
      competitorCount: data.competitorCount ?? 0,
      competitorActions: [],
      taunts: [],
      officeEvents: [],
      employeeBehaviors: {},
      proposals: data.proposals ?? [],
      institutions: data.institutions ?? [],
      orderFlowByCompany: {},
      marketRegime: data.marketRegime ?? initializeRegimeState(),
      marketIndexHistory: data.marketIndexHistory ?? [],
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
      currentTick: s.currentTick,
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
      proposals: s.proposals,
      lastProcessedMonth: s.lastProcessedMonth,
      institutions: s.institutions,
      marketRegime: s.marketRegime,
      marketIndexHistory: s.marketIndexHistory,
    }
    saveGame(data)
  },

  /* ── Trade AI Pipeline CRUD ── */
  addProposal: (proposal) =>
    set((s) => {
      const pendingCount = s.proposals.filter((p) => p.status === 'PENDING').length
      if (pendingCount >= TRADE_AI_CONFIG.MAX_PENDING_PROPOSALS) {
        // Expire oldest PENDING proposal to make room
        const oldestPending = s.proposals
          .filter((p) => p.status === 'PENDING')
          .sort((a, b) => a.createdAt - b.createdAt)[0]
        if (!oldestPending) return s
        const updated = s.proposals.map((p) =>
          p.id === oldestPending.id ? { ...p, status: 'EXPIRED' as ProposalStatus } : p,
        )
        return { proposals: [...updated, proposal] }
      }
      return { proposals: [...s.proposals, proposal] }
    }),

  updateProposalStatus: (id, status, updates) =>
    set((s) => ({
      proposals: s.proposals.map((p) => {
        if (p.id !== id) return p
        // State transition validation
        const validTransitions: Record<string, string[]> = {
          PENDING: ['APPROVED', 'REJECTED', 'EXPIRED'],
          APPROVED: ['EXECUTED', 'FAILED'],
        }
        const allowed = validTransitions[p.status]
        if (!allowed || !allowed.includes(status)) return p
        return { ...p, ...updates, status }
      }),
    })),

  expireOldProposals: (currentTimestamp) =>
    set((s) => ({
      proposals: s.proposals.map((p) =>
        p.status === 'PENDING' &&
        currentTimestamp - p.createdAt > TRADE_AI_CONFIG.PROPOSAL_EXPIRE_HOURS
          ? { ...p, status: 'EXPIRED' as ProposalStatus }
          : p,
      ),
    })),

  /**
   * PIPELINE STAGE 1: Analyst creates PENDING proposals
   *
   * State Transition: (None) → PENDING
   *
   * Flow:
   * 1. Find all Analysts with stress < 100 and assigned seats
   * 2. For each Analyst's assigned sectors:
   *    - Analyze stocks with RSI/MA indicators
   *    - If signal strength >= confidence threshold (adjusted by adjacency bonus):
   *      → Create TradeProposal with status = PENDING
   * 3. Dedup: If multiple Analysts propose same stock, keep highest confidence only
   * 4. Apply MAX_PENDING_PROPOSALS limit (FIFO expire)
   *
   * Call Frequency: Every 10 ticks (tick % 10 === 0)
   *
   * Edge Cases:
   * - All pipeline employees stress >= 100 → Skip processing, emit warning
   * - No Analysts seated → Early return
   * - Manager adjacent → Lower confidence threshold (adjacency bonus)
   */
  processAnalystTick: () => {
    const s = get()
    if (!s.player.officeGrid) return

    // Check if ALL pipeline employees are stressed out (stress >= 100)
    const pipelineRoles = ['analyst', 'manager', 'trader'] as const
    const pipelineEmployees = s.player.employees.filter(
      (e) => pipelineRoles.includes(e.role as typeof pipelineRoles[number]) && e.seatIndex != null,
    )
    if (pipelineEmployees.length > 0 && pipelineEmployees.every((e) => (e.stress ?? 0) >= 100)) {
      // Cooldown: only warn once per 100 ticks to prevent spam
      const tick = getAbsoluteTimestamp(s.time, s.config.startYear)
      const lastStressWarning = s.officeEvents
        .filter((ev) => ev.type === 'warning' && ev.message === '직원들이 지쳐 거래를 중단했습니다!')
        .at(-1)
      if (!lastStressWarning || tick - lastStressWarning.timestamp > 100) {
        set((st) => ({
          officeEvents: [...st.officeEvents, {
            timestamp: tick,
            type: 'warning',
            emoji: '😫',
            message: '직원들이 지쳐 거래를 중단했습니다!',
            employeeIds: pipelineEmployees.map((e) => e.id),
          }].slice(-200),
        }))
      }
      return
    }

    const analysts = s.player.employees.filter(
      (e) => e.role === 'analyst' && e.seatIndex != null && (e.stress ?? 0) < 100,
    )
    if (analysts.length === 0) return

    const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)

    let newProposals = [...s.proposals]
    const newEvents: typeof s.officeEvents = []

    for (const analyst of analysts) {
      // Adjacency bonus: lower confidence threshold if Manager is adjacent
      const adjBonus = calculateAdjacencyBonus(analyst, 'manager', s.player.employees, s.player.officeGrid)

      const sectors = analyst.assignedSectors ?? []
      const targetCompanies = sectors.length > 0
        ? s.companies.filter((c) => c.status !== 'acquired' && sectors.includes(c.sector))
        : s.companies.filter((c) => c.status !== 'acquired').slice(0, 5) // fallback: first 5 if no sector assigned

      for (const company of targetCompanies) {
        const result = analyzeStock(company, company.priceHistory, analyst, adjBonus)
        if (!result) continue

        const proposal = generateProposal(analyst, company, result, absoluteTick, newProposals)
        if (!proposal) continue

        // Check max pending
        const pendingCount = newProposals.filter((p) => p.status === 'PENDING').length
        if (pendingCount >= TRADE_AI_CONFIG.MAX_PENDING_PROPOSALS) break

        newProposals = [...newProposals, proposal]

        // Pipeline chatter: analyst created a proposal (accumulated, not set() here)
        const msg = getPipelineMessage('proposal_created', {
          ticker: company.ticker,
          direction: result.direction,
          confidence: result.confidence,
          hour: s.time.hour,
        })
        newEvents.push({
          timestamp: absoluteTick,
          type: 'proposal_created',
          emoji: result.isInsight ? '💡' : '📊',
          message: `${analyst.name}: ${msg}`,
          employeeIds: [analyst.id],
        })

        break // One proposal per analyst per tick
      }
    }

    if (newProposals.length !== s.proposals.length) {
      // Cross-analyst dedup: same stock PENDING → keep highest confidence only
      const pendingByStock = new Map<string, typeof newProposals>()
      for (const p of newProposals) {
        if (p.status !== 'PENDING') continue
        const existing = pendingByStock.get(p.companyId)
        if (existing) existing.push(p)
        else pendingByStock.set(p.companyId, [p])
      }
      const expireIds = new Set<string>()
      for (const [, proposals] of pendingByStock) {
        if (proposals.length <= 1) continue
        proposals.sort((a, b) => b.confidence - a.confidence)
        for (let i = 1; i < proposals.length; i++) {
          expireIds.add(proposals[i].id)
        }
      }
      if (expireIds.size > 0) {
        newProposals = newProposals.map((p) =>
          expireIds.has(p.id) ? { ...p, status: 'EXPIRED' as ProposalStatus } : p,
        )
      }

      set((st) => ({
        proposals: newProposals,
        officeEvents: newEvents.length > 0
          ? [...st.officeEvents, ...newEvents].slice(-200)
          : st.officeEvents,
      }))
    } else if (newEvents.length > 0) {
      // No new proposals but chatter events to flush (edge case)
      set((st) => ({
        officeEvents: [...st.officeEvents, ...newEvents].slice(-200),
      }))
    }
  },

  /**
   * PIPELINE STAGE 2: Manager reviews PENDING proposals
   *
   * State Transitions:
   * - PENDING → APPROVED (if risk evaluation passes)
   * - PENDING → REJECTED (if risk too high, insufficient funds, or low confidence)
   *
   * Flow:
   * 1. Find all PENDING proposals
   * 2. Find Manager with stress < 100 (or null for auto-approval fallback)
   * 3. For each proposal (1 or 2 if adjacency bonus):
   *    - Evaluate risk score = confidence - risk factors
   *    - Risk factors: skill level, fund availability, position concentration, personalization bias
   *    - If score >= threshold: APPROVED
   *    - If score < threshold: REJECTED (with specific reason)
   * 4. If no Manager exists:
   *    - Auto-approve with 30% mistake rate (isMistake = true)
   * 5. Apply stress to Analyst on rejection (+5 stress)
   *
   * Call Frequency: Every 5 ticks (tick % 5 === 2)
   *
   * Edge Cases:
   * - No Manager → Auto-approve with mistake rate
   * - Manager adjacent to Analyst → Process 2 proposals per tick instead of 1
   * - Personalization enabled → Adjust approval bias based on player risk tolerance
   */
  processManagerTick: () => {
    const s = get()
    if (!s.player.officeGrid) return
    const pendingProposals = s.proposals.filter((p) => p.status === 'PENDING')
    if (pendingProposals.length === 0) return

    const manager = s.player.employees.find(
      (e) => e.role === 'manager' && e.seatIndex != null && (e.stress ?? 0) < 100,
    ) ?? null

    const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)

    // Adjacency bonus: Manager adjacent to relevant roles can process extra proposals
    const adjBonus = manager
      ? calculateAdjacencyBonus(manager, 'analyst', s.player.employees, s.player.officeGrid)
      : 0
    const processCount = adjBonus > 0 ? 2 : 1 // Process 2 proposals if adjacent

    let updatedProposals = [...s.proposals]
    let updatedEmployees = [...s.player.employees]
    const managerEvents: typeof s.officeEvents = []

    for (let i = 0; i < Math.min(processCount, pendingProposals.length); i++) {
      const proposal = pendingProposals[i]
      const result = evaluateRisk(
        proposal,
        manager,
        s.player.cash,
        s.player.portfolio,
        s.playerProfile,
        s.personalizationEnabled,
      )

      updatedProposals = updatedProposals.map((p) => {
        if (p.id !== proposal.id) return p
        return {
          ...p,
          status: (result.approved ? 'APPROVED' : 'REJECTED') as ProposalStatus,
          reviewedByEmployeeId: manager?.id ?? null,
          reviewedAt: absoluteTick,
          isMistake: result.isMistake ?? false,
          rejectReason: result.reason ?? null,
        }
      })

      // Apply stress on rejection to the analyst who proposed
      if (!result.approved) {
        updatedEmployees = updatedEmployees.map((e) =>
          e.id === proposal.createdByEmployeeId
            ? { ...e, stress: Math.min(100, (e.stress ?? 0) + TRADE_AI_CONFIG.REJECTION_STRESS_GAIN) }
            : e,
        )
      }

      // Pipeline chatter: manager approved/rejected (accumulated, not set() here)
      const msgType = result.approved ? 'proposal_approved' : 'proposal_rejected'
      const managerName = manager?.name ?? '시스템'
      const msg = getPipelineMessage(msgType, { ticker: proposal.ticker, hour: s.time.hour })
      managerEvents.push({
        timestamp: absoluteTick,
        type: msgType,
        emoji: result.approved ? '✅' : '❌',
        message: `${managerName}: ${msg}`,
        employeeIds: [manager?.id ?? '', proposal.createdByEmployeeId].filter(Boolean),
      })

      // Personalization: log approval bias if applied
      if (result.approvalBias && result.approvalBias !== 0) {
        managerEvents.push({
          timestamp: absoluteTick,
          type: 'personalization',
          emoji: '🎯',
          message: `개인화 정책: 승인 임계치 ${result.approvalBias > 0 ? '+' : ''}${result.approvalBias} 적용`,
          employeeIds: [],
        })
      }
    }

    set((st) => ({
      proposals: updatedProposals,
      player: { ...s.player, employees: updatedEmployees },
      officeEvents: managerEvents.length > 0
        ? [...st.officeEvents, ...managerEvents].slice(-200)
        : st.officeEvents,
    }))
  },

  /**
   * PIPELINE STAGE 3: Trader executes APPROVED proposals
   *
   * State Transitions:
   * - APPROVED → EXECUTED (if trade succeeds)
   * - APPROVED → FAILED (if insufficient funds or portfolio constraint)
   *
   * Flow:
   * 1. Find all APPROVED proposals (FIFO order)
   * 2. Find Trader with stress < 100 (or null for penalty fallback)
   * 3. Execute first proposal:
   *    - Calculate slippage based on Trader skill and adjacency bonus
   *    - Execute actual trade (buyStock/sellStock)
   *    - Apply fee (0.1% base, 2x if no Trader)
   *    - If success: EXECUTED (record executedPrice, slippage)
   *    - If failure: FAILED (record reason)
   * 4. Increase satisfaction (+3) for all involved employees (Analyst, Manager, Trader)
   * 5. Emit toast notification if trade is significant (>= 5% of total assets)
   *
   * Call Frequency: Every tick (1 tick)
   *
   * Edge Cases:
   * - No Trader → Execute with 2x fee penalty
   * - Trader adjacent to Manager → Reduced slippage
   * - Insufficient funds → FAILED status
   */
  processTraderTick: () => {
    const s = get()
    if (!s.player.officeGrid) return
    const approvedProposals = s.proposals.filter((p) => p.status === 'APPROVED')
    if (approvedProposals.length === 0) return

    const trader = s.player.employees.find(
      (e) => e.role === 'trader' && e.seatIndex != null && (e.stress ?? 0) < 100,
    ) ?? null

    const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)

    // Adjacency bonus: Trader adjacent to Manager reduces slippage further
    const adjBonus = trader
      ? calculateAdjacencyBonus(trader, 'manager', s.player.employees, s.player.officeGrid)
      : 0

    // Process one approved proposal per tick
    const proposal = approvedProposals[0]
    const company = s.companies.find((c) => c.id === proposal.companyId)
    if (!company) return

    const result = executeProposal(proposal, trader, company.price, s.player.cash, adjBonus)

    if (result.success) {
      // Execute the actual trade (buyStock/sellStock are separate actions)
      if (proposal.direction === 'buy') {
        get().buyStock(proposal.companyId, proposal.quantity)
      } else {
        get().sellStock(proposal.companyId, proposal.quantity)
      }

      // Compute toast significance after trade execution
      const traderName = trader?.name ?? '시스템'
      const execMsg = getPipelineMessage('trade_executed', {
        ticker: proposal.ticker,
        direction: proposal.direction,
        hour: get().time.hour,
      })
      const tradeValue = result.executedPrice * proposal.quantity
      const totalAssets = get().player.totalAssetValue
      const isSignificant = totalAssets > 0 && tradeValue >= totalAssets * 0.05

      // Single atomic set: fee + proposal EXECUTED + satisfaction + toast
      set((st) => ({
        proposals: st.proposals.map((p) =>
          p.id === proposal.id
            ? {
                ...p,
                status: 'EXECUTED' as ProposalStatus,
                executedByEmployeeId: trader?.id ?? null,
                executedAt: absoluteTick,
                executedPrice: result.executedPrice,
                slippage: result.slippage,
              }
            : p,
        ),
        player: {
          ...st.player,
          cash: Math.max(0, st.player.cash - result.fee),
          employees: st.player.employees.map((e) => {
            if (
              e.id === proposal.createdByEmployeeId ||
              e.id === proposal.reviewedByEmployeeId ||
              e.id === trader?.id
            ) {
              return {
                ...e,
                satisfaction: Math.min(100, (e.satisfaction ?? 50) + TRADE_AI_CONFIG.SUCCESS_SATISFACTION_GAIN),
              }
            }
            return e
          }),
        },
        officeEvents: isSignificant
          ? [...st.officeEvents, {
              timestamp: absoluteTick,
              type: 'trade_executed',
              emoji: '💰',
              message: `${traderName}: ${execMsg}`,
              employeeIds: [trader?.id ?? '', proposal.createdByEmployeeId].filter(Boolean),
            }].slice(-200)
          : st.officeEvents,
      }))
    } else {
      // Compute toast significance for failure
      const failTraderName = trader?.name ?? '시스템'
      const failMsg = getPipelineMessage('trade_failed', { ticker: proposal.ticker, hour: get().time.hour })
      const failTradeValue = proposal.targetPrice * proposal.quantity
      const failTotalAssets = get().player.totalAssetValue
      const isFailSignificant = failTotalAssets > 0 && failTradeValue >= failTotalAssets * 0.05

      // Single atomic set: proposal FAILED + stress + toast
      set((st) => ({
        proposals: st.proposals.map((p) =>
          p.id === proposal.id
            ? {
                ...p,
                status: 'FAILED' as ProposalStatus,
                executedByEmployeeId: trader?.id ?? null,
                executedAt: absoluteTick,
                rejectReason: result.reason ?? 'execution_failed',
              }
            : p,
        ),
        player: {
          ...st.player,
          employees: st.player.employees.map((e) => {
            if (
              e.id === proposal.createdByEmployeeId ||
              e.id === proposal.reviewedByEmployeeId ||
              e.id === trader?.id
            ) {
              return {
                ...e,
                stress: Math.min(100, (e.stress ?? 0) + TRADE_AI_CONFIG.FAILURE_STRESS_GAIN),
              }
            }
            return e
          }),
        },
        officeEvents: isFailSignificant
          ? [...st.officeEvents, {
              timestamp: absoluteTick,
              type: 'trade_failed',
              emoji: '💸',
              message: `${failTraderName}: ${failMsg}`,
              employeeIds: [trader?.id ?? '', proposal.createdByEmployeeId].filter(Boolean),
            }].slice(-200)
          : st.officeEvents,
      }))
    }
  },

  setSpeed: (speed) => {
    set((s) => ({ time: { ...s.time, speed } }))
    // Personalization: Log settings change
    get().logPlayerEvent('SETTINGS', { speed })
  },

  togglePause: () => {
    const wasPaused = get().time.isPaused
    set((s) => ({ time: { ...s.time, isPaused: !s.time.isPaused } }))
    // Personalization: Log settings change
    get().logPlayerEvent('SETTINGS', { isPaused: !wasPaused })
  },

  checkEnding: () => {
    const state = get()
    if (state.isGameOver) return

    const scenarios = getEndingScenarios(state.config)
    for (const scenario of scenarios) {
      if (scenario.condition(state.player, state.time, state.config)) {
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
  advanceHour: () => {
    const oldDay = get().time.day

    set((s) => {
      let { year, month, day, hour } = s.time
      hour += 1
      if (hour > 18) {
        hour = 9
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
        time: { ...s.time, year, month, day, hour },
        currentTick: s.currentTick + 1,
        player: updatedPlayer,
        // Reset order flow on day change
        ...(dayChanged ? { orderFlowByCompany: {} } : {}),
      }
    })

    // Personalization: Update profile on day end
    const newDay = get().time.day
    if (newDay !== oldDay && get().personalizationEnabled) {
      get().updateProfileOnDayEnd()
    }
  },

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

    // Personalization: Update profile on month end
    if (get().personalizationEnabled) {
      get().updateProfileOnMonthEnd()
    }
  },

  /* ── Trading ── */
  buyStock: (companyId, shares) => {
    // Check if trading is allowed
    if (!get().canTrade(companyId)) {
      soundManager.playClick() // Use available sound method
      return
    }

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

      // Accumulate order flow
      const prev = s.orderFlowByCompany[companyId]
      const flow: OrderFlow = prev
        ? { buyNotional: prev.buyNotional + cost, sellNotional: prev.sellNotional, netNotional: prev.netNotional + cost, tradeCount: prev.tradeCount + 1 }
        : { buyNotional: cost, sellNotional: 0, netNotional: cost, tradeCount: 1 }

      return {
        player: {
          ...s.player,
          cash: newCash,
          portfolio: newPortfolio,
          totalAssetValue: newCash + calcPortfolioValue(newPortfolio, s.companies),
        },
        orderFlowByCompany: { ...s.orderFlowByCompany, [companyId]: flow },
      }
    })

    // Personalization: Log trade event
    const company = get().companies.find((c) => c.id === companyId)
    if (company) {
      get().logPlayerEvent('TRADE', {
        action: 'buy',
        companyId,
        ticker: company.ticker,
        qty: shares,
        price: company.price,
      })
    }

    // Grant trade XP to a random working employee
    const emps = get().player.employees.filter((e) => e.stamina > 0)
    if (emps.length > 0) {
      const lucky = emps[Math.floor(Math.random() * emps.length)]
      get().gainXP(lucky.id, XP_AMOUNTS.TRADE_SUCCESS, 'trade_success')
    }
  },

  sellStock: (companyId, shares) => {
    // Check if trading is allowed
    if (!get().canTrade(companyId)) {
      soundManager.playClick() // Use available sound method
      return
    }

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

      // Accumulate order flow
      const prev = s.orderFlowByCompany[companyId]
      const flow: OrderFlow = prev
        ? { buyNotional: prev.buyNotional, sellNotional: prev.sellNotional + revenue, netNotional: prev.netNotional - revenue, tradeCount: prev.tradeCount + 1 }
        : { buyNotional: 0, sellNotional: revenue, netNotional: -revenue, tradeCount: 1 }

      return {
        player: {
          ...s.player,
          cash: newCash,
          portfolio: newPortfolio,
          totalAssetValue: newCash + calcPortfolioValue(newPortfolio, s.companies),
        },
        orderFlowByCompany: { ...s.orderFlowByCompany, [companyId]: flow },
      }
    })

    // Personalization: Log trade event
    const company = get().companies.find((c) => c.id === companyId)
    const position = get().player.portfolio[companyId]
    if (company && position) {
      const pnl = (company.price - position.avgBuyPrice) * shares
      get().logPlayerEvent('TRADE', {
        action: 'sell',
        companyId,
        ticker: company.ticker,
        qty: shares,
        price: company.price,
        pnl,
      })
    }

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
      // Skip price updates if circuit breaker is active
      if (s.circuitBreaker.isActive && s.circuitBreaker.remainingTicks > 0) {
        return {} // No state change during circuit breaker halt
      }

      const newCompanies = s.companies.map((c) => {
        // Skip price update if VI is active for this company
        if (isVIHalted(c)) {
          return updateVIState(c, c.price) // Update VI state but keep price frozen
        }

        const newPrice = prices[c.id]
        if (newPrice === undefined) return c

        // Check if VI should trigger BEFORE applying new price
        const shouldTriggerVI = checkVITrigger({ ...c, price: newPrice })

        let updatedCompany = {
          ...c,
          previousPrice: c.price,
          price: newPrice,
          priceHistory: [...c.priceHistory.slice(-299), newPrice],
          marketCap: newPrice * 1_000_000,
        }

        // Update VI state with new price
        updatedCompany = updateVIState(updatedCompany, newPrice)

        // Trigger VI if needed
        if (shouldTriggerVI) {
          updatedCompany = triggerVI(updatedCompany)
        }

        return updatedCompany
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
        player: { ...s.player, totalAssetValue: s.player.cash + portfolioValue },
      }
    }),

  updateSessionOpenPrices: () =>
    set((s) => {
      // Calculate KOSPI index at session open
      const kospiIndex = calculateKOSPIIndex(s.companies)

      return {
        companies: s.companies.map((c) => {
          const resetVI = resetVIForNewDay(c)
          return {
            ...resetVI,
            sessionOpenPrice: c.price, // Set session open to current price
          }
        }),
        circuitBreaker: resetCircuitBreakerForNewDay(kospiIndex),
      }
    }),

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),

  addNews: (news) =>
    set((s) => ({
      news: [news, ...s.news].slice(0, 100),
      unreadNewsCount: s.unreadNewsCount + 1,
    })),

  markNewsRead: () => set({ unreadNewsCount: 0 }),

  /* ── Market Regime Detection ── */
  calculateMarketIndex: () => {
    const state = get()
    return calculateMarketIndex(state.companies)
  },

  detectAndUpdateRegime: () =>
    set((s) => {
      // Calculate current market index
      const currentIndex = calculateMarketIndex(s.companies)

      // Update index history (keep last 20)
      const newIndexHistory = [...s.marketIndexHistory, currentIndex].slice(-20)

      // Update regime state based on volatility + HMM
      const newRegimeState = updateRegimeState(s.marketRegime, newIndexHistory)

      // Trigger toast notification on regime change
      const regimeEvents: typeof s.officeEvents = []
      if (newRegimeState.current !== s.marketRegime.current) {
        const regimeInfo = {
          CALM: { emoji: '🟢', message: '시장 레짐: 평온 🟢' },
          VOLATILE: { emoji: '🟡', message: '시장 레짐: 변동성 증가 🟡' },
          CRISIS: { emoji: '🔴', message: '시장 레짐: 위기 상황 🔴' },
        }
        const { emoji, message } = regimeInfo[newRegimeState.current]

        // Toast 이벤트 발생
        window.dispatchEvent(
          new CustomEvent('regimeChange', {
            detail: {
              regime: newRegimeState.current,
              message,
            },
          }),
        )

        // 알림 센터에도 추가
        const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)
        regimeEvents.push({
          timestamp: absoluteTick,
          type: 'regime_change',
          emoji,
          message,
          employeeIds: [],
        })
      }

      return {
        marketIndexHistory: newIndexHistory,
        marketRegime: newRegimeState,
        officeEvents:
          regimeEvents.length > 0 ? [...s.officeEvents, ...regimeEvents].slice(-200) : s.officeEvents,
      }
    }),

  updateCircuitBreaker: () =>
    set((s) => {
      // Calculate KOSPI index
      const kospiIndex = calculateKOSPIIndex(s.companies)

      // Check circuit breaker
      const newCircuitBreaker = checkCircuitBreaker(
        kospiIndex,
        s.circuitBreaker.kospiSessionOpen,
        s.circuitBreaker,
        s.time
      )

      // Trigger notification on circuit breaker activation
      if (newCircuitBreaker.isActive && !s.circuitBreaker.isActive) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('circuitBreaker', {
              detail: {
                level: newCircuitBreaker.level,
                dailyReturn: ((kospiIndex - newCircuitBreaker.kospiSessionOpen) / newCircuitBreaker.kospiSessionOpen) * 100,
              },
            }),
          )
        }, 0)
      }

      return {
        circuitBreaker: newCircuitBreaker,
      }
    }),

  updateVIStates: () =>
    set((s) => ({
      companies: s.companies.map((c) => {
        // Check if VI should trigger
        if (checkVITrigger(c)) {
          const triggered = triggerVI(c)
          // Trigger notification
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('viTriggered', {
                detail: {
                  companyName: c.name,
                  ticker: c.ticker,
                },
              }),
            )
          }, 0)
          return triggered
        }
        return c
      }),
    })),

  canTrade: (companyId) => {
    const s = get()

    // Check circuit breaker
    if (isTradingHalted(s.circuitBreaker)) {
      return false
    }

    // Check VI for specific company
    const company = s.companies.find((c) => c.id === companyId)
    if (!company) return false

    // Check if company is acquired
    if (company.status === 'acquired') {
      return false
    }

    return !isVIHalted(company)
  },

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
        stress: 0,
        satisfaction: 100,
        seatIndex: null,

        // ✨ Trade AI Pipeline: Analyst sector assignment
        assignedSectors: role === 'analyst' ? generateAssignedSectors() : undefined,
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
    cleanupInteractionCooldowns(id)
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

      // Reassign or expire orphaned proposals from this employee
      // APPROVED proposals must stay APPROVED (fallback system handles them)
      // Only PENDING proposals can be EXPIRED
      const remainingEmployees = s.player.employees.filter((e) => e.id !== id)
      const updatedProposals = s.proposals.map((p) => {
        if (p.status !== 'PENDING' && p.status !== 'APPROVED') return p

        let changed = false
        const updates: Partial<typeof p> = {}

        if (p.createdByEmployeeId === id) {
          const replacement = remainingEmployees.find((e) => e.role === emp.role && e.seatIndex != null)
          if (replacement) {
            updates.createdByEmployeeId = replacement.id
            changed = true
          } else if (p.status === 'PENDING') {
            // Only PENDING can be expired; APPROVED stays for fallback execution
            return { ...p, status: 'EXPIRED' as ProposalStatus }
          }
        }
        if (p.reviewedByEmployeeId === id) {
          updates.reviewedByEmployeeId = null
          changed = true
        }
        if (p.executedByEmployeeId === id) {
          updates.executedByEmployeeId = null
          changed = true
        }

        return changed ? { ...p, ...updates } : p
      })

      return {
        proposals: updatedProposals,
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
      if (currentLevel >= OFFICE_BALANCE.MAX_LEVEL) return s

      const cost = OFFICE_BALANCE.UPGRADE_COSTS[currentLevel]
      if (s.player.cash < cost) return s // Not enough cash

      // Reset all employee stamina to max on office upgrade
      const refreshedEmployees = s.player.employees.map((emp) => ({
        ...emp,
        stamina: emp.maxStamina,
      }))

      // 그리드 확장: 기존 직원/가구 보존하며 새 크기로 재생성
      const newLevel = currentLevel + 1
      const newGrid = createInitialOfficeGrid(newLevel)
      const oldGrid = s.player.officeGrid
      if (oldGrid) {
        // 기존 셀 데이터 복사 (기존 범위 내)
        for (let y = 0; y < oldGrid.size.height; y++) {
          for (let x = 0; x < oldGrid.size.width; x++) {
            if (newGrid.cells[y]?.[x] && oldGrid.cells[y]?.[x]) {
              newGrid.cells[y][x] = oldGrid.cells[y][x]
            }
          }
        }
        // 기존 가구 목록 보존
        newGrid.furniture = [...oldGrid.furniture]
      }

      return {
        player: {
          ...s.player,
          cash: s.player.cash - cost,
          officeLevel: newLevel,
          employees: refreshedEmployees,
          officeGrid: newGrid,
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
            w.id === existing.id
              ? { ...w, zIndex: s.nextZIndex, props: props ? { ...w.props, ...props } : w.props }
              : w,
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
        office_history: '사무실 히스토리',
        employee_detail: '직원 상세',
        settings: '설정',
        ending: '게임 종료',
        institutional: '기관 매매',
        proposals: '제안서 목록',
      }

      const win: WindowState = {
        id,
        type,
        title: titles[type],
        x: 50 + offset,
        y: 50 + offset,
        width: type === 'chart' ? 500 : type === 'trading' ? 380 : type === 'office' ? 420 : type === 'employee_detail' ? 340 : 380,
        height: type === 'chart' ? 350 : type === 'trading' ? 480 : type === 'office' ? 400 : type === 'employee_detail' ? 420 : 300,
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

  toggleMaximizeWindow: (id) =>
    set((s) => {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight - 40
      return {
        windows: s.windows.map((w) => {
          if (w.id !== id) return w
          if (w.isMaximized) {
            const defaultSizes: Record<string, { width: number; height: number }> = {
              chart: { width: 500, height: 350 },
              trading: { width: 380, height: 480 },
              office: { width: 420, height: 400 },
            }
            const defaults = defaultSizes[w.type] ?? { width: 380, height: 300 }
            const prev = w.preMaximize ?? { x: 50, y: 50, ...defaults }
            return { ...w, isMaximized: false, x: prev.x, y: prev.y, width: prev.width, height: prev.height, preMaximize: undefined }
          }
          return { ...w, isMaximized: true, preMaximize: { x: w.x, y: w.y, width: w.width, height: w.height }, x: 0, y: 0, width: screenWidth, height: screenHeight }
        }),
      }
    }),

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

  updateWindowProps: (type, props) =>
    set((s) => {
      let updated = false
      return {
        windows: s.windows.map((w) => {
          if (!updated && w.type === type) {
            updated = true
            return { ...w, props: { ...w.props, ...props } }
          }
          return w
        }),
      }
    }),

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

      case 'ai-trading': {
        // AI 트레이딩 레이아웃: 좌측(제안서 + 사무실), 우측(차트 + 랭킹)
        const leftWidth = Math.floor(screenWidth * 0.4) - GAP * 2
        const rightX = Math.floor(screenWidth * 0.4) + GAP
        const rightWidth = screenWidth - rightX - GAP * 2
        const topHeight = Math.floor(screenHeight * 0.55) - GAP * 2
        const bottomY = Math.floor(screenHeight * 0.55) + GAP

        windowsToCreate = [
          {
            id: `win-${nextId++}`,
            type: 'proposals',
            title: '제안서 목록',
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
            height: topHeight,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
          },
          {
            id: `win-${nextId++}`,
            type: 'ranking',
            title: '랭킹',
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

      case 'institutional': {
        // 기관 모니터링 레이아웃: 좌측(기관 크게), 우측(차트 + 뉴스)
        const leftWidth = Math.floor(screenWidth * 0.5) - GAP * 2
        const rightX = Math.floor(screenWidth * 0.5) + GAP
        const rightWidth = screenWidth - rightX - GAP * 2
        const topHeight = Math.floor(screenHeight * 0.6) - GAP * 2
        const bottomY = Math.floor(screenHeight * 0.6) + GAP

        // 첫 번째 회사 ID 가져오기
        const companies = get().companies
        const firstCompanyId = companies[0]?.id || 'tech-01'

        windowsToCreate = [
          {
            id: `win-${nextId++}`,
            type: 'institutional',
            title: '기관 매매 동향',
            x: GAP,
            y: GAP,
            width: leftWidth,
            height: screenHeight - GAP * 2,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZ++,
            props: { companyId: firstCompanyId },
          },
          {
            id: `win-${nextId++}`,
            type: 'chart',
            title: '주가 차트',
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
            type: 'news',
            title: '뉴스',
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

      case 'comprehensive': {
        // 종합 분석 레이아웃: 2x3 그리드 (6개 창) - 새로운 윈도우 포함
        const colWidth = Math.floor((screenWidth - GAP * 4) / 3)
        const rowHeight = Math.floor((screenHeight - GAP * 3) / 2)

        // 첫 번째 회사 ID 가져오기
        const companies = get().companies
        const firstCompanyId = companies[0]?.id || 'tech-01'

        const layouts: Array<{
          type: WindowState['type']
          title: string
          col: number
          row: number
          props?: Record<string, unknown>
        }> = [
          { type: 'portfolio', title: '내 포트폴리오', col: 0, row: 0 },
          { type: 'chart', title: '주가 차트', col: 1, row: 0 },
          { type: 'trading', title: '매매 창', col: 2, row: 0 },
          { type: 'proposals', title: '제안서 목록', col: 0, row: 1 },
          {
            type: 'institutional',
            title: '기관 매매',
            col: 1,
            row: 1,
            props: { companyId: firstCompanyId },
          },
          { type: 'ranking', title: '랭킹', col: 2, row: 1 },
        ]

        windowsToCreate = layouts.map(({ type, title, col, row, props }) => ({
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
          props,
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

  /* ── M&A System ── */
  getActiveCompanies: () => {
    return get().companies.filter((c) => c.status === 'active')
  },

  getCompanyById: (id) => {
    return get().companies.find((c) => c.id === id)
  },

  executeAcquisition: (acquirerId: string, targetId: string, deal: MnaDeal) => {
    const currentTick = get().currentTick

    set((s) => ({
      companies: s.companies.map((c) => {
        // 타깃 회사 상태 변경
        if (c.id === targetId) {
          return {
            ...c,
            status: 'acquired' as const,
            parentCompanyId: acquirerId,
            acquiredAtTick: currentTick,
            headcount: 0, // 직원은 인수자로 이동
            mnaHistory: [
              ...(c.mnaHistory ?? []),
              {
                type: 'target' as const,
                otherCompanyId: acquirerId,
                tick: currentTick,
                dealPrice: deal.dealPrice,
                headcountImpact: {
                  before: c.headcount ?? 0,
                  after: 0,
                },
              },
            ],
          }
        }

        // 인수자 회사 headcount 증가
        if (c.id === acquirerId) {
          const newHeadcount = (c.headcount ?? 0) + deal.estimatedHeadcountRetained
          return {
            ...c,
            headcount: newHeadcount,
            mnaHistory: [
              ...(c.mnaHistory ?? []),
              {
                type: 'acquirer' as const,
                otherCompanyId: targetId,
                tick: currentTick,
                dealPrice: deal.dealPrice,
                headcountImpact: {
                  before: c.headcount ?? 0,
                  after: newHeadcount,
                },
              },
            ],
          }
        }

        return c
      }),
    }))

    // 포트폴리오 교환
    get().applyAcquisitionExchange(deal)
  },

  scheduleIPO: (slotIndex, delayTicks, newCompany) => {
    set((s) => ({
      pendingIPOs: [
        ...s.pendingIPOs,
        { slotIndex, spawnTick: s.currentTick + delayTicks, newCompany },
      ],
    }))
  },

  processScheduledIPOs: () => {
    set((s) => {
      const now = s.currentTick
      const ready = s.pendingIPOs.filter((ipo) => ipo.spawnTick <= now)
      const remaining = s.pendingIPOs.filter((ipo) => ipo.spawnTick > now)

      if (ready.length === 0) return { pendingIPOs: remaining }

      const newCompanies = [...s.companies]

      ready.forEach((ipo) => {
        // 슬롯의 회사를 새 회사로 교체
        newCompanies[ipo.slotIndex] = ipo.newCompany

        console.log(
          `[IPO] ${ipo.newCompany.name} (${ipo.newCompany.ticker}) listed at slot ${ipo.slotIndex}`,
        )
      })

      return {
        companies: newCompanies,
        pendingIPOs: remaining,
      }
    })
  },

  applyAcquisitionExchange: (deal: MnaDeal) => {
    set((s) => {
      const target = s.companies.find((c) => c.id === deal.targetId)
      if (!target) return s

      // 1. 플레이어 포트폴리오 교환
      const playerPosition = s.player.portfolio[deal.targetId]
      let newPlayerCash = s.player.cash
      const newPlayerPortfolio = { ...s.player.portfolio }
      const newOfficeEvents = [...s.officeEvents]

      if (playerPosition) {
        const payout = playerPosition.shares * deal.dealPrice
        const profit = payout - playerPosition.shares * playerPosition.avgBuyPrice
        const profitRate = (profit / (playerPosition.shares * playerPosition.avgBuyPrice)) * 100

        newPlayerCash += payout
        delete newPlayerPortfolio[deal.targetId]

        console.log(
          `[M&A Exchange] Player: ${playerPosition.shares} shares → ${payout.toFixed(0)} cash`,
        )

        // Toast 이벤트 추가
        newOfficeEvents.push({
          timestamp: s.currentTick,
          type: 'mna_exchange',
          emoji: '💰',
          message: `${target.name} M&A 정산: ${payout.toLocaleString()}원 (${profit >= 0 ? '+' : ''}${profitRate.toFixed(1)}%)`,
          employeeIds: [],
        })
      }

      // 2. AI 경쟁자 포트폴리오 교환
      const newCompetitors = s.competitors.map((comp) => {
        const position = comp.portfolio[deal.targetId]
        if (!position) return comp

        const payout = position.shares * deal.dealPrice
        const newPortfolio = { ...comp.portfolio }
        delete newPortfolio[deal.targetId]

        console.log(
          `[M&A Exchange] ${comp.name}: ${position.shares} shares → ${payout.toFixed(0)} cash`,
        )

        return {
          ...comp,
          cash: comp.cash + payout,
          portfolio: newPortfolio,
        }
      })

      return {
        player: {
          ...s.player,
          cash: newPlayerCash,
          portfolio: newPlayerPortfolio,
        },
        competitors: newCompetitors,
        officeEvents: newOfficeEvents,
      }
    })
  },

  /* ── Competitor Actions ── */
  initializeCompetitors: (count, startingCash) => {
    const competitors = generateCompetitors(count, startingCash)
    set({ competitors, competitorCount: count })
  },

  processCompetitorTick: () => {
    const { competitors, companies, time, playerProfile, personalizationEnabled } = get()
    if (competitors.length === 0) return

    // Decrease panic sell cooldowns (compensate for HOUR_DISTRIBUTION interval)
    set((state) => ({
      competitors: state.competitors.map((c) => ({
        ...c,
        panicSellCooldown: Math.max(0, c.panicSellCooldown - PERFORMANCE_CONFIG.HOUR_DISTRIBUTION),
      })),
    }))

    // Get updated state after cooldown decrease
    const updatedState = get()

    // Get price history for technical analysis
    const priceHistory = getPriceHistory(companies)

    // Process AI trading (with Mirror Rival personalization)
    const actions = processAITrading(
      updatedState.competitors,
      companies,
      time.hour,
      priceHistory,
      playerProfile,
      personalizationEnabled,
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
      const batchTick = getAbsoluteTimestamp(state.time, state.config.startYear)

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

          const position = competitor.portfolio[action.companyId]
          if (position) {
            const totalCost = position.avgBuyPrice * position.shares + cost
            const totalShares = position.shares + action.quantity
            position.shares = totalShares
            position.avgBuyPrice = totalCost / totalShares
          } else {
            competitor.portfolio[action.companyId] = {
              companyId: action.companyId,
              shares: action.quantity,
              avgBuyPrice: action.price,
            }
          }
        } else if (action.action === 'sell' || action.action === 'panic_sell') {
          const position = competitor.portfolio[action.companyId]
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
            delete competitor.portfolio[action.companyId]
          }

          // Add taunt for panic sell and set cooldown
          if (action.action === 'panic_sell') {
            competitor.panicSellCooldown = PANIC_SELL_CONFIG.COOLDOWN_HOURS

            newTaunts.push({
              competitorId: competitor.id,
              competitorName: competitor.name,
              message: `${competitor.name}: "손절이다! 더 떨어지기 전에!!" 😱`,
              type: 'panic',
              timestamp: batchTick,
            })
          }
        }
      })

      // Accumulate order flow from competitor trades
      const newOrderFlow = { ...state.orderFlowByCompany }
      actions.forEach((action) => {
        const notional = action.quantity * action.price
        const prev = newOrderFlow[action.companyId]
        if (action.action === 'buy') {
          newOrderFlow[action.companyId] = prev
            ? { buyNotional: prev.buyNotional + notional, sellNotional: prev.sellNotional, netNotional: prev.netNotional + notional, tradeCount: prev.tradeCount + 1 }
            : { buyNotional: notional, sellNotional: 0, netNotional: notional, tradeCount: 1 }
        } else {
          newOrderFlow[action.companyId] = prev
            ? { buyNotional: prev.buyNotional, sellNotional: prev.sellNotional + notional, netNotional: prev.netNotional - notional, tradeCount: prev.tradeCount + 1 }
            : { buyNotional: 0, sellNotional: notional, netNotional: -notional, tradeCount: 1 }
        }
      })

      return {
        competitors: newCompetitors,
        taunts: newTaunts.slice(-20), // Keep last 20
        competitorActions: [...state.competitorActions, ...actions].slice(-100), // Keep last 100
        orderFlowByCompany: newOrderFlow,
      }
    })
  },

  updateCompetitorAssets: () => {
    set((state) => {
      const newCompetitors = state.competitors.map((competitor) => {
        const portfolioValue = Object.entries(competitor.portfolio).reduce(
          (sum, [companyId, position]) => {
            const company = state.companies.find((c) => c.id === companyId)
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

  /* ── Institutional Investors ── */
  initializeInstitutions: () => {
    const institutions = generateInstitutions()
    set({ institutions })
  },

  updateInstitutionalFlow: () => {
    const { companies, institutions, events, currentTick } = get()

    // Calculate market sentiment based on active events
    const marketSentiment = calculateMarketSentiment(events)

    // Track updated institutions across all companies
    let latestInstitutions = institutions

    const updatedCompanies = companies.map((company) => {
      const { netVol, buyers, sellers, updatedInstitutions } = simulateInstitutionalTrading(
        company,
        latestInstitutions,
        marketSentiment,
        currentTick,
      )

      // Update institutions for next company
      latestInstitutions = updatedInstitutions

      // 누적 기관 보유 주식 수 계산 (감쇠 적용)
      const previousAccumulated = company.accumulatedInstitutionalShares ?? 0
      const decayFactor = 0.995 // 시간당 0.5% 자연 감소
      const newAccumulated = Math.max(0, previousAccumulated * decayFactor + netVol)

      // 기관 보유 비중 계산
      const totalShares = company.marketCap / company.price
      const ownershipRatio = Math.min(0.9, Math.max(0, newAccumulated / totalShares))

      return {
        ...company,
        institutionFlow: {
          netBuyVolume: netVol,
          topBuyers: buyers,
          topSellers: sellers,
          institutionalOwnership: ownershipRatio,
        },
        institutionFlowHistory: [
          ...(company.institutionFlowHistory ?? []).slice(-9),
          netVol,
        ],
        accumulatedInstitutionalShares: newAccumulated,
      }
    })

    set({ companies: updatedCompanies, institutions: latestInstitutions })
  },

  updateInstitutionalFlowForSector: (sectorIndex: number) => {
    const { companies, institutions, events, currentTick } = get()

    // 섹터 배열 정의 (10개)
    const sectors: Sector[] = [
      'tech',
      'finance',
      'energy',
      'healthcare',
      'consumer',
      'industrial',
      'telecom',
      'materials',
      'utilities',
      'realestate',
    ]

    const targetSector = sectors[sectorIndex % sectors.length]
    const marketSentiment = calculateMarketSentiment(events)

    // Track updated institutions across all companies in sector
    let latestInstitutions = institutions

    const updatedCompanies = companies.map((company) => {
      // 해당 섹터가 아니면 업데이트하지 않음
      if (company.sector !== targetSector) {
        return company
      }

      const { netVol, buyers, sellers, updatedInstitutions } = simulateInstitutionalTrading(
        company,
        latestInstitutions,
        marketSentiment,
        currentTick,
      )

      // Update institutions for next company in sector
      latestInstitutions = updatedInstitutions

      // 누적 기관 보유 주식 수 계산 (감쇠 적용: 시간이 지나면 보유 비중 자연 감소)
      const previousAccumulated = company.accumulatedInstitutionalShares ?? 0
      const decayFactor = 0.995 // 시간당 0.5% 자연 감소 (매도/희석)
      const newAccumulated = Math.max(0, previousAccumulated * decayFactor + netVol)

      // 기관 보유 비중 = 누적 보유량 / (시가총액 / 현재가)
      const totalShares = company.marketCap / company.price
      const ownershipRatio = Math.min(0.9, Math.max(0, newAccumulated / totalShares))

      return {
        ...company,
        institutionFlow: {
          netBuyVolume: netVol,
          topBuyers: buyers,
          topSellers: sellers,
          institutionalOwnership: ownershipRatio,
        },
        institutionFlowHistory: [
          ...(company.institutionFlowHistory ?? []).slice(-9),
          netVol,
        ],
        accumulatedInstitutionalShares: newAccumulated,
      }
    })

    set({ companies: updatedCompanies, institutions: latestInstitutions })
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

      const grid = createInitialOfficeGrid(s.player.officeLevel)
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
        const gridW = s.player.officeGrid?.size.width ?? 10
        const oldY = Math.floor(employee.seatIndex / gridW)
        const oldX = employee.seatIndex % gridW
        const oldCell = s.player.officeGrid?.cells[oldY]?.[oldX]
        if (oldCell) {
          oldCell.occupiedBy = null
          oldCell.type = 'empty'
        }
      }

      // 새 좌석 배치
      const gridW = s.player.officeGrid?.size.width ?? 10
      employee.seatIndex = y * gridW + x
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

      const gridW = grid.size.width
      const y = Math.floor(employee.seatIndex / gridW)
      const x = employee.seatIndex % gridW
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

    const { updatedEmployees, resignedIds, warnings, officeEvents, behaviors } = updateOfficeSystem(
      state.player.employees,
      state.player.officeGrid,
      state.time,
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

    // 퇴사 처리: 좌석 정리 + 쿨다운 정리 + 제안서 정리 + 뉴스
    resignedIds.forEach((id) => {
      const emp = state.player.employees.find((e) => e.id === id)
      cleanupChatterCooldown(id)
      cleanupInteractionCooldowns(id)
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
        // Expire orphaned PENDING proposals from resigned employee
        // APPROVED proposals stay APPROVED (fallback system handles them)
        set((st) => ({
          proposals: st.proposals.map((p) => {
            const isRelated =
              p.createdByEmployeeId === id || p.reviewedByEmployeeId === id || p.executedByEmployeeId === id
            if (!isRelated) return p

            if (p.status === 'PENDING') {
              return { ...p, status: 'EXPIRED' as ProposalStatus }
            }
            if (p.status === 'APPROVED') {
              // Clear employee references but keep APPROVED for fallback execution
              const updates: Partial<typeof p> = {}
              if (p.createdByEmployeeId === id) updates.createdByEmployeeId = id // keep original creator for audit
              if (p.reviewedByEmployeeId === id) updates.reviewedByEmployeeId = null
              if (p.executedByEmployeeId === id) updates.executedByEmployeeId = null
              return Object.keys(updates).length > 0 ? { ...p, ...updates } : p
            }
            return p
          }),
        }))
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

    // 행동 맵 생성
    const behaviorMap: Record<string, string> = {}
    behaviors.forEach((b) => { behaviorMap[b.employeeId] = b.action })

    set((s) => ({
      player: {
        ...s.player,
        employees: hrResult.updatedEmployees,
        cash: Math.max(0, s.player.cash - hrResult.cashSpent),
      },
      officeEvents: [...s.officeEvents, ...officeEvents].slice(-200), // Keep last 200
      employeeBehaviors: behaviorMap,
    }))
  },

  /* ── Personalization Actions ── */
  logPlayerEvent: (kind, metadata) =>
    set((s) => {
      const newEvent: PlayerEvent = {
        kind,
        timestamp: Date.now(),
        day: s.time.day + (s.time.year - s.config.startYear) * 12 * 30, // 게임 내 총 일 수
        metadata,
      }

      const updatedLog = [...s.playerEventLog, newEvent]

      // FIFO: 상한 초과 시 앞에서 제거
      if (updatedLog.length > MAX_EVENT_LOG_SIZE) {
        updatedLog.shift()
      }

      return { playerEventLog: updatedLog }
    }),

  updateProfileOnDayEnd: () =>
    set((s) => {
      if (!s.personalizationEnabled) return {}

      const currentDay = s.time.day + (s.time.year - s.config.startYear) * 12 * 30

      // 중복 실행 방지
      if (s.playerProfile.lastUpdatedDay === currentDay) return {}

      // 프로필 계산
      const newProfile = computeProfileFromEvents(s.playerEventLog, currentDay)

      return {
        playerProfile: newProfile,
      }
    }),

  updateProfileOnMonthEnd: () => {
    const state = get()
    state.updateProfileOnDayEnd()
  },

  setPersonalizationEnabled: (enabled) =>
    set({
      personalizationEnabled: enabled,
    }),

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
 * 오피스 레벨에 맞는 빈 오피스 그리드 생성
 */
function createInitialOfficeGrid(level: number = 1): OfficeGrid {
  const size = OFFICE_BALANCE.GRID_SIZES[level] ?? OFFICE_BALANCE.GRID_SIZES[1]
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

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
  LimitOrder,
  TradingLimits,
  StopLossTakeProfit,
} from '../types'
import type { OfficeGrid, FurnitureType, FurnitureItem, OfficeLayout, DeskType, DecorationType, DeskItem, DecorationItem } from '../types/office'
import type { TradeProposal, ProposalStatus } from '../types/trade'
import type { CashFlowEntry, CashFlowCategory, RealizedTrade, MonthlySummary } from '../types/cashFlow'
import { createCashFlowEntry, purgeOldEntries, detectAnomalies, aggregateMonthly } from '../engines/cashFlowTracker'
import type { PlayerEvent, PlayerProfile } from '../types/personalization'
import type { MnaDeal } from '../engines/mnaEngine'
import { MAX_EVENT_LOG_SIZE, defaultProfile } from '../types/personalization'
import { computeProfileFromEvents } from '../systems/personalization/profile'
import { TRADE_AI_CONFIG } from '../config/tradeAIConfig'
import { getAbsoluteTimestamp, TIME_CONFIG } from '../config/timeConfig'
import { drawCards } from '../engines/cardDrawEngine'
import { createBio, inferEmotion, updateGoals } from '../engines/employeeBioEngine'
import { checkEmployeeMilestones } from '../engines/employeeMilestoneEngine'
import { getRandomTaunt as getRandomTauntFn, getContextualTradeTaunt, getBigTradeTaunt } from '../data/taunts'
import { calculateBonuses } from '../engines/skillPathEngine'
import { selectChain, initChainState, advanceChainWeek, getCurrentWeekModifiers, canStartChain } from '../engines/eventChainEngine'
import { EVENT_CHAIN_TEMPLATES } from '../data/eventChains'
import { updateTier, calculateMonthlyTax, checkPositionLimit, recordMonthlyPerformance } from '../engines/economicPressureEngine'
import { OFFICE_BALANCE } from '../config/balanceConfig'
import { getTierConfig, RELIEF_TAX_DISCOUNT } from '../config/economicPressureConfig'
import { EMPLOYEE_ROLE_CONFIG } from '../types'
import type { GameMode } from '../types'
import { REALTIME_CONNECTION_INITIAL } from '../types/realtime'
import { COMPANIES, initializeCompanyFinancials } from '../data/companies'
import { KOSPI_COMPANIES } from '../data/kospiCompanies'
import { historicalDataService } from '../services/historicalDataService'
import { DIFFICULTY_TABLE } from '../data/difficulty'
import { generateEmployeeName, resetNamePool, generateRandomTraits, generateInitialSkills, generateAssignedSectors } from '../data/employees'
import { calculateMarketSentiment } from '../engines/tickEngine'
import { TRAIT_DEFINITIONS } from '../data/traits'
import { FURNITURE_CATALOG, canBuyFurniture, DESK_CATALOG, DECORATION_CATALOG } from '../data/furniture'
import { saveGame, loadGame, deleteSave } from '../systems/saveSystem'
import {
  grantSkillPointsOnLevelUp,
  migrateEmployeeToSkillTree,
  unlockSkill,
  resetSkillTree,
} from '../systems/skillSystem'
import { calculateResetCost } from '../config/skillBalance'
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
import { processHRAutomation, type HRAutomationResult } from '../engines/hrAutomation'
import { cleanupChatterCooldown, getPipelineMessage, resetChatterCooldowns, triggerChatter } from '../data/chatter'
import { cleanupInteractionCooldowns } from '../engines/employeeInteraction'
import { createTradeAnimationSequence, createMilestoneAnimationSequence } from '../engines/animationEngine'
import { MILESTONE_DEFINITIONS, createInitialMilestones, type MilestoneContext } from '../data/milestones'
import { resetNewsEngine } from '../engines/newsEngine'
import { generateBadgesFromSkills } from '../utils/badgeConverter' // ✨ 신규: 뱃지 생성
import { createInitialCorporateSkills } from '../data/corporateSkills'
import {
  validateUnlock,
  unlockCorporateSkill as unlockCorpSkill,
  aggregateCorporateEffects,
  calculateUnlockStats,
} from '../engines/corporateSkillEngine'
import {
  createTrainingProgram,
  calculateTotalCost as calcTrainingCost,
  advanceTraining,
  resolveCheckpoint,
  cancelTraining,
  canStartTraining,
  applyGraduation,
} from '../engines/trainingEngine'
import { resetSentiment } from '../engines/sentimentEngine'
import { defaultChapterProgress, defaultCompanyProfile } from '../types/chapter'
import type { CompanyProfile } from '../types/chapter'
import { getChapterNumber } from '../data/chapters'
import { evaluateChapterObjectives } from '../engines/chapterEngine'
import { analyzeStock, generateProposal, checkPortfolioExits } from '../engines/tradePipeline/analystLogic'
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
  lastHRProcessDay: number // ✨ HR 자동화 마지막 실행일 (gameDays 기준)
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

  // AI Architect (Week 4 Integration)
  aiProposal: import('../systems/aiArchitect').LayoutProposal | null

  // Actions - AI Architect
  generateAIProposal: (maxMoves?: number, maxPurchases?: number) => void
  applyAIProposal: () => void
  rejectAIProposal: () => void

  // Competitor system
  competitors: Competitor[]
  competitorCount: number // 0 = disabled, 1-5 = active
  competitorActions: CompetitorAction[] // Recent 100 actions
  taunts: TauntMessage[] // Recent 20 taunts
  officeEvents: Array<{ timestamp: number; type: string; emoji: string; message: string; employeeIds: string[]; hour?: number }>
  employeeBehaviors: Record<string, string> // employeeId → action type (WORKING, IDLE, etc.)

  // Realtime Connection (한투 API)
  realtimeConnection: import('../types/realtime').RealtimeConnectionState

  // Actions - Realtime
  updateRealtimeStatus: (partial: Partial<import('../types/realtime').RealtimeConnectionState>) => void

  // Order Flow (Deep Market)
  orderFlowByCompany: Record<string, OrderFlow>

  // Institutional Investors
  institutions: Institution[]

  // Chapter & Company Profile
  chapterProgress: import('../types/chapter').ChapterProgress
  companyProfile: import('../types/chapter').CompanyProfile

  // Personalization System
  playerEventLog: PlayerEvent[]
  playerProfile: PlayerProfile
  personalizationEnabled: boolean

  // Actions - Personalization
  logPlayerEvent: (kind: PlayerEvent['kind'], metadata: Record<string, unknown>) => void
  updateProfileOnDayEnd: () => void
  updateProfileOnMonthEnd: () => void
  setPersonalizationEnabled: (enabled: boolean) => void

  // Actions - Game
  startGame: (difficulty: Difficulty, targetAsset?: number, customInitialCash?: number, gameMode?: GameMode, kisCredentials?: import('../types').KISCredentials, companyProfile?: CompanyProfile) => void
  loadSavedGame: () => Promise<boolean>
  autoSave: () => void
  setSpeed: (speed: GameTime['speed']) => void
  togglePause: () => void
  checkEnding: () => void

  // Hourly processing accumulators
  hourlyAccumulators: import('../types').HourlyAccumulators

  // Actions - Time
  advanceHour: () => void
  processHourly: () => void
  processMonthly: () => void

  // Actions - Trading
  buyStock: (companyId: string, shares: number) => void
  sellStock: (companyId: string, shares: number) => void

  // Actions - Market
  updatePrices: (prices: Record<string, number>) => void
  updateSessionOpenPrices: (historicalOpens?: Record<string, number>) => void // Update session open prices at market open
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
  updateEmployeeBadges: (employeeId: string) => void
  setTradingLimits: (employeeId: string, limits: TradingLimits | null) => void
  setStopLossTakeProfit: (employeeId: string, config: StopLossTakeProfit | null) => void
  upgradeOffice: () => void

  // Actions - Competitors
  initializeCompetitors: (count: number, startingCash: number) => void
  processCompetitorTick: () => void
  executeBatchActions: (actions: CompetitorAction[]) => void
  updateCompetitorAssets: () => void
  calculateRankings: () => Array<{ rank: number; name: string; roi: number; isPlayer: boolean }>
  addTaunt: (taunt: TauntMessage) => void
  updateRivalryTracking: (competitorName: string, competitorIsAhead: boolean) => void

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

  // Actions - RPG Skill Tree System
  unlockEmployeeSkill: (employeeId: string, skillId: string) => { success: boolean; reason?: string }
  resetEmployeeSkillTree: (employeeId: string) => { success: boolean; cost: number; reason?: string }

  // Actions - Office Grid (Sprint 2, 레거시)
  initializeOfficeGrid: () => void
  placeFurniture: (type: FurnitureType, x: number, y: number) => boolean
  removeFurniture: (furnitureId: string) => void
  assignEmployeeSeat: (employeeId: string, x: number, y: number) => boolean
  unassignEmployeeSeat: (employeeId: string) => void
  recalculateGridBuffs: () => void
  processEmployeeTick: () => void

  // Actions - Office Dot Layout (새 시스템)
  initializeOfficeLayout: () => void
  buyDesk: (type: import('../types/office').DeskType, x: number, y: number) => boolean
  buyDecoration: (type: import('../types/office').DecorationType, x: number, y: number) => boolean
  removeDesk: (deskId: string) => void
  removeDecoration: (decorationId: string) => void
  assignEmployeeToDesk: (employeeId: string, deskId: string) => boolean
  unassignEmployeeFromDesk: (employeeId: string) => void
  moveDeskPosition: (deskId: string, x: number, y: number) => void
  moveDecorationPosition: (decorationId: string, x: number, y: number) => void

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
  playerAcquisitionHistory: import('../types').PlayerAcquisitionHistory[]
  lastPlayerAcquisitionTick: number
  isAcquiring: boolean // 중복 인수 방지 플래그

  // Actions - M&A
  getActiveCompanies: () => Company[]
  getCompanyById: (id: string) => Company | undefined
  executeAcquisition: (acquirerId: string, targetId: string, deal: MnaDeal) => void
  scheduleIPO: (slotIndex: number, delayTicks: number, newCompany: Company) => void
  processScheduledIPOs: () => void
  applyAcquisitionExchange: (deal: MnaDeal) => void
  playerAcquireCompany: (targetId: string, premium: number, layoffRate: number) => void
  executeKospiIPO: (companyId: string, ipoPrice: number) => void // KOSPI 모드 IPO 실행

  // Limit Order System
  limitOrders: LimitOrder[]

  // Auto-sell (profit-taking) System
  autoSellEnabled: boolean
  autoSellPercent: number

  // Cash Flow Tracking
  cashFlowLog: CashFlowEntry[]
  realizedTrades: RealizedTrade[]
  monthlyCashFlowSummaries: MonthlySummary[]
  cashFlowAnomalies: string[]

  // Actions - Cash Flow
  recordCashFlow: (category: CashFlowCategory, amount: number, description: string, meta?: CashFlowEntry['meta']) => void
  recordRealizedTrade: (trade: RealizedTrade) => void
  purgeCashFlowLog: () => void

  // Actions - Auto-sell
  setAutoSellEnabled: (enabled: boolean) => void
  setAutoSellPercent: (percent: number) => void
  processAutoSell: () => void

  // Actions - Limit Orders
  createLimitOrder: (companyId: string, targetPrice: number, shares: number) => void
  cancelLimitOrder: (orderId: string) => void
  processLimitOrders: () => void // 매 틱마다 호출, 조건 달성 시 자동 실행

  // ✨ UX Enhancement System - Animation Queue
  animationQueue: import('../types/animation').AnimationQueueState
  queueAnimation: (sequence: import('../types/animation').AnimationSequence) => void
  startAnimation: () => void
  completeAnimation: () => void
  cancelAnimation: () => void

  // ✨ UX Enhancement System - Monthly Cards
  monthlyCards: import('../types/newsCard').MonthlyCardDrawState
  drawMonthlyCards: () => void
  selectCard: (cardId: string) => void
  applyCardEffects: () => void
  expireCards: () => void

  // ✨ UX Enhancement System - Event Chains
  eventChains: import('../types/eventChain').ActiveEventChainState
  startEventChain: (chainId: string) => void
  advanceChain: () => void
  resolveChain: (chainId: string) => void

  // ✨ UX Enhancement System - Employee Bio
  employeeBios: Record<string, import('../types/employeeBio').EmployeeBio>
  createEmployeeBio: (employeeId: string) => void
  updateGoalProgress: (employeeId: string) => void
  addLifeEvent: (employeeId: string, event: import('../types/employeeBio').LifeEvent) => void
  updateEmotion: (employeeId: string) => void
  deleteEmployeeBio: (employeeId: string) => void

  // ✨ Core Values: Employee Milestone Notifications
  milestoneNotifications: Array<{
    employeeId: string
    employeeName: string
    milestoneId: string
    title: string
    description: string
    icon: string
    timestamp: number
  }>
  dismissMilestoneNotification: (index: number) => void

  // ✨ UX Enhancement System - Skill Paths
  employeeSkillPaths: Record<string, import('../types/skillPath').EmployeeSkillPathState>
  selectSkillPath: (employeeId: string, path: import('../types/skillPath').SkillPathType) => void
  calculatePathBonuses: (employeeId: string) => import('../types/skillPath').SkillBonusEffect[]

  // ✨ UX Enhancement System - Economic Pressure
  economicPressure: import('../types/economicPressure').EconomicPressure
  updateWealthTier: () => void
  applyWealthTax: () => void
  enforcePositionLimit: (companyId: string, shares: number) => { allowed: boolean; maxShares: number }
  recordPerformance: () => void

  // ✨ UX Enhancement System - Milestones
  milestones: import('../types').MilestoneProgress
  checkMilestones: () => void

  // ✨ Corporate Skill System
  corporateSkills: import('../types/corporateSkill').CorporateSkillState
  unlockCorporateSkill: (skillId: string) => { success: boolean; reason?: string }
  getCorporateEffects: () => import('../engines/corporateSkillEngine').AggregatedCorporateEffects

  // ✨ Training System
  training: import('../types/training').TrainingState
  startTraining: (skillId: string, traineeIds: string[], instructorId?: string | null) => { success: boolean; reason?: string }
  advanceTrainingTick: () => void
  cancelTrainingProgram: (programId: string) => void

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
    gameMode: 'virtual',
  },
  difficultyConfig: DIFFICULTY_TABLE.normal,
  isGameStarted: false,
  isGameOver: false,
  endingResult: null,

  time: { year: 1995, quarter: 1, month: 1, day: 1, hour: 9, speed: 1, isPaused: true },
  lastProcessedMonth: 0,
  lastHRProcessDay: -1, // ✨ HR 자동화 쿨다운 초기값
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
    lastDailyTradeResetDay: 0,
    dailyTradeCount: 0,
  },

  companies: [],
  events: [],
  news: [],
  marketRegime: initializeRegimeState(),
  marketIndexHistory: [],
  circuitBreaker: { level: 0, isActive: false, remainingTicks: 0, triggeredAt: null, kospiSessionOpen: 100, kospiCurrent: 100, triggeredLevels: [] },

  windows: [],
  nextZIndex: 1,
  windowIdCounter: 0,
  isFlashing: false,
  unreadNewsCount: 0,

  pendingLevelUp: null,
  lastMnaQuarter: 0,
  pendingIPOs: [],
  playerAcquisitionHistory: [],
  lastPlayerAcquisitionTick: 0,
  isAcquiring: false,
  limitOrders: [],
  autoSellEnabled: false,
  autoSellPercent: 10,

  competitors: [],
  competitorCount: 0,
  competitorActions: [],
  taunts: [],
  officeEvents: [],
  employeeBehaviors: {},
  proposals: [],
  aiProposal: null, // Week 4 Integration
  realtimeConnection: { ...REALTIME_CONNECTION_INITIAL },
  orderFlowByCompany: {},
  institutions: [],

  // Cash Flow Tracking
  cashFlowLog: [],
  realizedTrades: [],
  monthlyCashFlowSummaries: [],
  cashFlowAnomalies: [],

  // Chapter & Company Profile
  chapterProgress: defaultChapterProgress(),
  companyProfile: defaultCompanyProfile(),

  // Personalization System
  playerEventLog: [],
  playerProfile: defaultProfile(),
  personalizationEnabled: false,

  // ✨ UX Enhancement System
  animationQueue: { queue: [], current: null, currentStepIndex: 0, isPlaying: false },
  monthlyCards: {
    availableCards: [],
    selectedCardIds: [],
    isDrawn: false,
    isSelectionComplete: false,
    activeCards: [],
    drawMonth: 0,
    selectionDeadlineTick: 0,
  },
  eventChains: { chains: [], completedChainIds: [], lastChainEndTick: 0 },
  employeeBios: {},
  milestoneNotifications: [],
  employeeSkillPaths: {},
  economicPressure: {
    currentTier: 'beginner',
    previousTier: 'beginner',
    monthlyTaxPaid: 0,
    totalTaxPaid: 0,
    consecutiveHighPerformanceMonths: 0,
    negativeEventMultiplier: 1.0,
    performanceHistory: [],
    reliefEligible: false,
  },
  milestones: { milestones: {}, totalUnlocked: 0, lastCheckedTick: 0 },
  corporateSkills: { skills: createInitialCorporateSkills(), totalUnlocked: 0, totalSpent: 0 },
  training: { programs: [], completedCount: 0, totalTraineesGraduated: 0 },
  hourlyAccumulators: { salaryPaid: 0, taxPaid: 0 },

  /* ── Game Actions ── */
  startGame: (difficulty, targetAsset, customInitialCash, gameMode = 'virtual', kisCredentials, companyProfile) => {
    const dcfg = DIFFICULTY_TABLE[difficulty]

    // KOSPI 모드: 실제 종목 사용 + historicalDataService에서 실제 통계 로드
    let companies: Company[]
    if (gameMode === 'kospi' && historicalDataService.isReady) {
      companies = KOSPI_COMPANIES.map((c) => {
        const stats = c.historicalTicker
          ? historicalDataService.getStockStats(c.historicalTicker)
          : null

        // KOSPI DB의 ipo_date는 실제 상장일이 아닌 "데이터 시작일"임.
        // 모든 종목이 동일한 날짜(2000-05-29)를 가지므로 이 값으로 pre-IPO 판단 불가.
        // → 모든 KOSPI 종목은 game start에서 active로 시작, 하드코딩 가격 사용.
        // (1995-1999 구간은 GBM 시뮬레이션, 2000+ 구간은 correctionDrift로 실데이터 추적)

        // 초기 가격: 하드코딩 가격 사용 (DB base_price는 2000년 기준이라 1995 시뮬레이션에 부적합)
        const realPrice = c.price

        // 시작 월 실제 일별 종가로 priceHistory 미리 채우기 (차트 초기 표시)
        // 1995년은 DB에 데이터 없을 수 있으므로 빈 경우 realPrice로 채움
        const initPriceHistory: number[] = []
        if (c.historicalTicker) {
          for (let gameDay = 1; gameDay <= 30; gameDay++) {
            const close = historicalDataService.getClose(
              c.historicalTicker,
              dcfg.startYear,
              1,
              gameDay,
            )
            if (close != null && close > 0) initPriceHistory.push(close)
          }
        }
        if (initPriceHistory.length === 0) initPriceHistory.push(realPrice)

        return initializeCompanyFinancials({
          ...c,
          price: realPrice,
          previousPrice: realPrice,
          basePrice: realPrice,
          sessionOpenPrice: realPrice,
          priceHistory: initPriceHistory,
          drift: stats?.annualDrift ?? c.drift,
          volatility: stats?.annualVolatility ?? c.volatility,
          regimeVolatilities: {
            CALM: (stats?.annualVolatility ?? c.volatility) * 0.5,
            VOLATILE: stats?.annualVolatility ?? c.volatility,
            CRISIS: (stats?.annualVolatility ?? c.volatility) * 2.0,
          },
        })
      })
    } else if (gameMode === 'realtime') {
      // 실시간 모드: KOSPI 종목 사용, 역사 DB 불필요
      companies = KOSPI_COMPANIES.map((c) =>
        initializeCompanyFinancials({
          ...c,
          priceHistory: [c.price],
        })
      )
    } else {
      companies = COMPANIES.map((c) =>
        initializeCompanyFinancials({
          ...c,
          priceHistory: [c.price],
        })
      )
    }

    // Initialize institutions
    const institutions = generateInstitutions()

    resetNamePool()
    employeeIdCounter = 0

    let initialCash = customInitialCash ?? dcfg.initialCash

    // New Game+ bonus application from meta progression (only for default cash)
    let ngpHasAnalyst = false
    if (!customInitialCash) {
      try {
        const metaRaw = localStorage.getItem('retro_stock_meta_progression')
        if (metaRaw) {
          const meta = JSON.parse(metaRaw) as { newGamePlusBonuses?: string[] }
          if (meta.newGamePlusBonuses) {
            let bonusMultiplier = 1.0
            for (const bonusId of meta.newGamePlusBonuses) {
              if (bonusId === 'extra_cash') bonusMultiplier += 0.1
              if (bonusId === 'sector_intel') bonusMultiplier += 0.05
              if (bonusId === 'free_analyst') ngpHasAnalyst = true
            }
            initialCash = Math.round(initialCash * bonusMultiplier)
          }
        }
      } catch { /* ignore parse errors */ }
    }

    // Company profile style bonuses
    const profile = companyProfile ?? defaultCompanyProfile()
    let styleHasAnalyst = false
    if (profile.style === 'aggressive') {
      initialCash = Math.round(initialCash * 0.8) // -20% initial cash
    } else if (profile.style === 'stable') {
      initialCash = Math.round(initialCash * 1.1) // +10% initial cash
    } else if (profile.style === 'analytical') {
      styleHasAnalyst = true // free analyst
    }

    const cfg: GameConfig = {
      difficulty,
      startYear: gameMode === 'realtime' ? new Date().getFullYear() : dcfg.startYear,
      endYear: gameMode === 'realtime' ? new Date().getFullYear() + 30 : dcfg.endYear,
      initialCash,
      maxCompanies: dcfg.maxCompanies,
      targetAsset: targetAsset ?? 1_000_000_000,
      gameMode,
      kisCredentials,
    }

    set({
      config: cfg,
      difficultyConfig: dcfg,
      isGameStarted: true,
      isGameOver: false,
      endingResult: null,
      time: gameMode === 'realtime'
        ? {
            year: new Date().getFullYear(),
            quarter: Math.floor(new Date().getMonth() / 3) + 1 as 1 | 2 | 3 | 4,
            month: new Date().getMonth() + 1,
            day: new Date().getDate(),
            hour: Math.max(9, Math.min(18, new Date().getHours())), // 영업시간 범위로 클램프
            speed: 1 as const,
            isPaused: false,
          }
        : { year: dcfg.startYear, quarter: 1 as const, month: 1, day: 1, hour: 9, speed: 1 as const, isPaused: false },
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
        lastDailyTradeResetDay: 0, // ✨ 하루 거래 제한 초기화
        dailyTradeCount: 0, // ✨ 하루 거래 제한 초기화
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
      autoSellEnabled: false,
      autoSellPercent: 10,
      // Personalization: sync lastUpdatedDay with game start day
      playerProfile: { ...defaultProfile(), lastUpdatedDay: 1 },
      // ✨ UX Enhancement System reset
      animationQueue: { queue: [], current: null, currentStepIndex: 0, isPlaying: false },
      monthlyCards: {
        availableCards: [],
        selectedCardIds: [],
        isDrawn: false,
        isSelectionComplete: false,
        activeCards: [],
        drawMonth: 0,
        selectionDeadlineTick: 0,
      },
      eventChains: { chains: [], completedChainIds: [], lastChainEndTick: 0 },
      employeeBios: {},
      milestoneNotifications: [],
      employeeSkillPaths: {},
      economicPressure: {
        currentTier: 'beginner',
        previousTier: 'beginner',
        monthlyTaxPaid: 0,
        totalTaxPaid: 0,
        consecutiveHighPerformanceMonths: 0,
        negativeEventMultiplier: 1.0,
        performanceHistory: [],
        reliefEligible: false,
      },
      milestones: { milestones: {}, totalUnlocked: 0, lastCheckedTick: 0 },
      corporateSkills: { skills: createInitialCorporateSkills(), totalUnlocked: 0, totalSpent: 0 },
      training: { programs: [], completedCount: 0, totalTraineesGraduated: 0 },
      hourlyAccumulators: { salaryPaid: 0, taxPaid: 0 },
      chapterProgress: defaultChapterProgress(),
      companyProfile: profile,
      realtimeConnection: { ...REALTIME_CONNECTION_INITIAL },
    })

    deleteSave()

    const store = get()

    // Initialize institutional flow for all sectors (10 sectors)
    // This ensures institutionFlowHistory has initial data for all companies
    for (let sectorIndex = 0; sectorIndex < 10; sectorIndex++) {
      store.updateInstitutionalFlowForSector(sectorIndex)
    }

    // Free analyst bonus (New Game+ or analytical style)
    if (ngpHasAnalyst || styleHasAnalyst) {
      store.hireEmployee('analyst')
    }

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
    resetChatterCooldowns()

    // Reconstruct companies from save + base data
    const loadedGameMode = (data.config as any).gameMode ?? 'virtual'
    const baseCompanies = (loadedGameMode === 'kospi' || loadedGameMode === 'realtime') ? KOSPI_COMPANIES : COMPANIES
    const companies = baseCompanies.map((base) => {
      const saved = data.companies.find((s) => s.id === base.id)
      if (!saved) return { ...base, priceHistory: [base.price], institutionFlowHistory: [] }
      return {
        ...base,
        price: saved.price,
        previousPrice: saved.previousPrice,
        priceHistory: saved.priceHistory,
        marketCap: saved.price * 1_000_000,
        status: (saved as any).status ?? 'active',
        historicalTicker: base.historicalTicker,
        // Migrate institutionFlowHistory if missing (for old save files)
        institutionFlowHistory: (saved as any).institutionFlowHistory ?? [],
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
        deskId: emp.deskId ?? null,
        seatIndex: emp.seatIndex ?? null,
        // 신규 스킬 시스템 필드 마이그레이션
        learnedCorporateSkills: emp.learnedCorporateSkills ?? [],
        activeTrainingId: emp.activeTrainingId ?? null,
        unlockedSkills: emp.unlockedSkills ?? [],
        badges: emp.badges ?? [],
      })),
    }

    // 실시간 모드: localStorage에서 자격증명 복원 (DB에 저장하지 않으므로)
    let restoredKisCredentials: import('../types').KISCredentials | undefined
    const loadedMode = ((data.config as any).gameMode ?? 'virtual') as GameMode
    if (loadedMode === 'realtime') {
      try {
        const saved = localStorage.getItem('kis_credentials')
        if (saved) restoredKisCredentials = JSON.parse(saved)
      } catch { /* ignore */ }
    }

    const migratedConfig: GameConfig = {
      ...data.config,
      targetAsset: data.config.targetAsset ?? 1_000_000_000,
      gameMode: loadedMode,
      kisCredentials: restoredKisCredentials,
    }

    // 컴페티터 필드 마이그레이션
    const migratedCompetitors = (data.competitors ?? []).map((c) => ({
      ...c,
      panicSellCooldown: c.panicSellCooldown ?? 0,
      lastDayChange: c.lastDayChange ?? 0,
      totalAssetValue: c.totalAssetValue ?? c.cash,
      roi: c.roi ?? 0,
      initialAssets: c.initialAssets ?? c.cash,
      headToHeadWins: c.headToHeadWins ?? 0,
      headToHeadLosses: c.headToHeadLosses ?? 0,
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
      autoSellEnabled: data.autoSellEnabled ?? false,
      autoSellPercent: data.autoSellPercent ?? 10,
      cashFlowLog: data.cashFlowLog ?? [],
      realizedTrades: data.realizedTrades ?? [],
      monthlyCashFlowSummaries: data.monthlyCashFlowSummaries ?? [],
      cashFlowAnomalies: [],
      // ✨ UX Enhancement System (v7 migration with defaults)
      animationQueue: data.animationQueue ?? { queue: [], current: null, currentStepIndex: 0, isPlaying: false },
      monthlyCards: data.monthlyCards ?? {
        availableCards: [],
        selectedCardIds: [],
        isDrawn: false,
        isSelectionComplete: false,
        activeCards: [],
        drawMonth: 0,
        selectionDeadlineTick: 0,
      },
      eventChains: data.eventChains ?? { chains: [], completedChainIds: [], lastChainEndTick: 0 },
      employeeBios: data.employeeBios ?? {},
      employeeSkillPaths: data.employeeSkillPaths ?? {},
      economicPressure: data.economicPressure ?? {
        currentTier: 'beginner',
        previousTier: 'beginner',
        monthlyTaxPaid: 0,
        totalTaxPaid: 0,
        consecutiveHighPerformanceMonths: 0,
        negativeEventMultiplier: 1.0,
        performanceHistory: [],
        reliefEligible: false,
      },
      milestones: data.milestones ?? { milestones: {}, totalUnlocked: 0, lastCheckedTick: 0 },
      corporateSkills: data.corporateSkills ?? { skills: createInitialCorporateSkills(), totalUnlocked: 0, totalSpent: 0 },
      training: data.training ?? { programs: [], completedCount: 0, totalTraineesGraduated: 0 },
      hourlyAccumulators: { salaryPaid: 0, taxPaid: 0 }, // Always reset on load to prevent double-counting across save/load
      chapterProgress: (data as any).chapterProgress ?? { ...defaultChapterProgress(), currentChapter: getChapterNumber(data.time.year) },
      companyProfile: (data as any).companyProfile ?? defaultCompanyProfile(),
      windows: [],
      nextZIndex: 1,
      windowIdCounter: 0,
      unreadNewsCount: 0,
    })

    // 직원 ID 카운터 복원 (중복 ID 방지)
    const maxEmpId = migratedPlayer.employees.reduce((max, emp) => {
      const num = parseInt(emp.id.replace('emp-', ''), 10)
      return Number.isNaN(num) ? max : Math.max(max, num)
    }, 0)
    employeeIdCounter = maxEmpId

    const store = get()

    // Initialize institutional flow if missing (for migrated old save files)
    // Check if any company has empty institutionFlowHistory
    const needsInitialization = store.companies.some(
      (c) => !c.institutionFlowHistory || c.institutionFlowHistory.length === 0
    )
    if (needsInitialization) {
      for (let sectorIndex = 0; sectorIndex < 10; sectorIndex++) {
        store.updateInstitutionalFlowForSector(sectorIndex)
      }
    }

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
      companies: s.companies,
      events: s.events,
      news: s.news.slice(0, 50), // Save only recent news
      competitors: s.competitors,
      competitorCount: s.competitorCount,
      proposals: s.proposals,
      lastProcessedMonth: s.lastProcessedMonth,
      institutions: s.institutions,
      marketRegime: s.marketRegime,
      marketIndexHistory: s.marketIndexHistory,
      autoSellEnabled: s.autoSellEnabled,
      autoSellPercent: s.autoSellPercent,
      cashFlowLog: s.cashFlowLog,
      realizedTrades: s.realizedTrades,
      monthlyCashFlowSummaries: s.monthlyCashFlowSummaries,
      // ✨ UX Enhancement System (v7)
      animationQueue: s.animationQueue,
      monthlyCards: s.monthlyCards,
      eventChains: s.eventChains,
      employeeBios: s.employeeBios,
      employeeSkillPaths: s.employeeSkillPaths,
      economicPressure: s.economicPressure,
      milestones: s.milestones,
      corporateSkills: s.corporateSkills,
      training: s.training,
      hourlyAccumulators: s.hourlyAccumulators,
      chapterProgress: s.chapterProgress,
      companyProfile: s.companyProfile,
    }
    saveGame(data)
  },

  /* ── Cash Flow Tracking ── */
  recordCashFlow: (category, amount, description, meta) => {
    const s = get()
    const entry = createCashFlowEntry(
      s.currentTick,
      { year: s.time.year, month: s.time.month, day: s.time.day },
      category,
      amount,
      description,
      meta,
    )
    set((st) => ({
      cashFlowLog: [...st.cashFlowLog, entry].slice(-5000),
    }))
  },

  recordRealizedTrade: (trade) =>
    set((s) => ({
      realizedTrades: [...s.realizedTrades, trade].slice(-500),
    })),

  purgeCashFlowLog: () => {
    const s = get()
    const { prunedEntries, newSummaries } = purgeOldEntries(
      s.cashFlowLog,
      s.time.year,
      s.time.month,
      s.monthlyCashFlowSummaries,
    )

    // Detect anomalies for current month
    const currentSummary = aggregateMonthly(
      s.cashFlowLog,
      s.time.year,
      s.time.month,
      s.player.cash,
    )
    const anomalies = detectAnomalies(
      s.player.cash,
      s.player.totalAssetValue,
      currentSummary,
      s.player.employees.length,
    )

    // ✨ 월말 총자산 스냅샷 기록
    const enrichedSummaries = newSummaries.map((summary) => ({
      ...summary,
      totalAssetValue: s.player.totalAssetValue,
    }))

    set({
      cashFlowLog: prunedEntries,
      monthlyCashFlowSummaries: [...s.monthlyCashFlowSummaries, ...enrichedSummaries].slice(-360),
      cashFlowAnomalies: anomalies.length > 0
        ? [...s.cashFlowAnomalies, ...anomalies].slice(-50)
        : s.cashFlowAnomalies,
    })
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
    if (!s.player.officeLayout) return

    // Check if ALL pipeline employees are stressed out (stress >= 100)
    const pipelineRoles = ['analyst', 'manager', 'trader'] as const
    const pipelineEmployees = s.player.employees.filter(
      (e) => pipelineRoles.includes(e.role as typeof pipelineRoles[number]) && e.deskId != null,
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
            hour: s.time.hour,
          }].slice(-200),
        }))
      }
      return
    }

    const analysts = s.player.employees.filter(
      (e) => e.role === 'analyst' && e.deskId != null && (e.stress ?? 0) < 100,
    )
    if (analysts.length === 0) return

    const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)

    let newProposals = [...s.proposals]
    const newEvents: typeof s.officeEvents = []

    // ✨ Corporate Skill 효과를 루프 전에 한 번만 계산
    const corpEffects = s.getCorporateEffects()

    // ✨ AI Enhancement: Check portfolio for Stop Loss / Take Profit triggers
    // ✨ Corporate Skill conditional 효과 (stopLoss/takeProfit) 도 함께 적용
    for (const analyst of analysts) {
      const exitProposals = checkPortfolioExits(analyst, s.player.portfolio, s.companies, absoluteTick, newProposals, corpEffects)
      if (exitProposals.length > 0) {
        newProposals = [...newProposals, ...exitProposals]
        for (const proposal of exitProposals) {
          newEvents.push({
            timestamp: absoluteTick,
            type: 'proposal_created',
            emoji: '🎯',
            message: `${analyst.name}: ${proposal.ticker} 자동 손익실현 (${proposal.confidence >= 80 ? '손절' : '익절'})`,
            employeeIds: [analyst.id],
            hour: s.time.hour,
          })
        }
      }
    }

    for (const analyst of analysts) {
      // Adjacency bonus: lower confidence threshold if Manager is adjacent
      const adjBonus = calculateAdjacencyBonus(analyst, 'manager', s.player.employees, s.player.officeLayout)

      const sectors = analyst.assignedSectors ?? []
      const targetCompanies = sectors.length > 0
        ? s.companies.filter((c) => c.status !== 'acquired' && sectors.includes(c.sector))
        : s.companies.filter((c) => c.status !== 'acquired').slice(0, 5) // fallback: first 5 if no sector assigned

      for (const company of targetCompanies) {
        const result = analyzeStock(company, company.priceHistory, analyst, adjBonus, [], corpEffects)
        if (!result) continue

        const proposal = generateProposal(analyst, company, result, absoluteTick, newProposals, s.player.cash, corpEffects)
        if (!proposal) continue

        // Check max pending (corporate skill bonus applied)
        const maxPending = TRADE_AI_CONFIG.MAX_PENDING_PROPOSALS + corpEffects.maxPendingProposals
        const pendingCount = newProposals.filter((p) => p.status === 'PENDING').length
        if (pendingCount >= maxPending) break

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
          hour: s.time.hour,
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
    if (!s.player.officeLayout) return
    const pendingProposals = s.proposals.filter((p) => p.status === 'PENDING')
    if (pendingProposals.length === 0) return

    const manager = s.player.employees.find(
      (e) => e.role === 'manager' && e.deskId != null && (e.stress ?? 0) < 100,
    ) ?? null

    const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)

    // Adjacency bonus: Manager adjacent to relevant roles can process extra proposals
    const adjBonus = manager
      ? calculateAdjacencyBonus(manager, 'analyst', s.player.employees, s.player.officeLayout)
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
        hour: s.time.hour,
      })

      // Personalization: log approval bias if applied
      if (result.approvalBias && result.approvalBias !== 0) {
        managerEvents.push({
          timestamp: absoluteTick,
          type: 'personalization',
          emoji: '🎯',
          message: `개인화 정책: 승인 임계치 ${result.approvalBias > 0 ? '+' : ''}${result.approvalBias} 적용`,
          employeeIds: [],
          hour: s.time.hour,
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
    let s = get() // ✨ let으로 변경: 리셋 후 재할당 가능
    if (!s.player.officeLayout) return

    // ✨ 하루 거래 제한: 날짜가 바뀌면 카운터 리셋
    const currentDay = s.time.day // GameTime의 day 필드 사용 (1~30)
    if (currentDay !== s.player.lastDailyTradeResetDay) {
      set((st) => ({
        player: {
          ...st.player,
          lastDailyTradeResetDay: currentDay,
          dailyTradeCount: 0,
        },
      }))
      s = get() // ✨ 리셋 후 최신 상태로 업데이트
    }

    // ✨ 하루 거래 제한: 최대 3회 체크
    if (s.player.dailyTradeCount >= 3) {
      // Cooldown: 하루에 한 번만 경고 (스팸 방지)
      const lastLimitWarning = s.officeEvents
        .filter((ev) => ev.type === 'warning' && ev.message.includes('하루 거래 한도'))
        .at(-1)
      const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)
      if (!lastLimitWarning || absoluteTick - lastLimitWarning.timestamp > 3600) {
        set((st) => ({
          officeEvents: [...st.officeEvents, {
            timestamp: absoluteTick,
            type: 'warning',
            emoji: '⏸️',
            message: '하루 거래 한도 도달 (3회). 내일 다시 시도하세요.',
            employeeIds: [],
            hour: s.time.hour,
          }].slice(-200),
        }))
      }
      return
    }

    const approvedProposals = s.proposals.filter((p) => p.status === 'APPROVED')
    if (approvedProposals.length === 0) return

    const trader = s.player.employees.find(
      (e) => e.role === 'trader' && e.deskId != null && (e.stress ?? 0) < 100,
    ) ?? null

    const absoluteTick = getAbsoluteTimestamp(s.time, s.config.startYear)

    // Adjacency bonus: Trader adjacent to Manager reduces slippage further
    const adjBonus = trader
      ? calculateAdjacencyBonus(trader, 'manager', s.player.employees, s.player.officeLayout)
      : 0

    // Process one approved proposal per tick
    const proposal = approvedProposals[0]
    const company = s.companies.find((c) => c.id === proposal.companyId)
    if (!company) return

    // Check if trading is allowed (circuit breaker + VI)
    if (!get().canTrade(proposal.companyId)) return

    // ✨ Trading Limits: Check trader's per-trade limits
    if (trader?.tradingLimits?.enabled) {
      const limits = trader.tradingLimits
      const tradeAmount = proposal.targetPrice * proposal.quantity

      if (proposal.direction === 'buy' && limits.maxBuyAmount !== null && tradeAmount > limits.maxBuyAmount) {
        // Reject: exceeds buy limit
        set((st) => ({
          proposals: st.proposals.map((p) =>
            p.id === proposal.id
              ? {
                  ...p,
                  status: 'REJECTED' as ProposalStatus,
                  reviewedByEmployeeId: trader.id,
                  reviewedAt: absoluteTick,
                  rejectReason: 'exceeds_buy_limit',
                }
              : p,
          ),
          officeEvents: [...st.officeEvents, {
            timestamp: absoluteTick,
            type: 'trade_rejected',
            emoji: '🚫',
            message: `${trader.name}: 매수 한도 초과 (${(tradeAmount / 1_000_000).toFixed(1)}M > ${(limits.maxBuyAmount! / 1_000_000).toFixed(1)}M)`,
            employeeIds: [trader.id],
            hour: s.time.hour,
          }].slice(-200),
        }))
        return
      }

      if (proposal.direction === 'sell' && limits.maxSellAmount !== null && tradeAmount > limits.maxSellAmount) {
        // Reject: exceeds sell limit
        set((st) => ({
          proposals: st.proposals.map((p) =>
            p.id === proposal.id
              ? {
                  ...p,
                  status: 'REJECTED' as ProposalStatus,
                  reviewedByEmployeeId: trader.id,
                  reviewedAt: absoluteTick,
                  rejectReason: 'exceeds_sell_limit',
                }
              : p,
          ),
          officeEvents: [...st.officeEvents, {
            timestamp: absoluteTick,
            type: 'trade_rejected',
            emoji: '🚫',
            message: `${trader.name}: 매도 한도 초과 (${(tradeAmount / 1_000_000).toFixed(1)}M > ${(limits.maxSellAmount! / 1_000_000).toFixed(1)}M)`,
            employeeIds: [trader.id],
            hour: s.time.hour,
          }].slice(-200),
        }))
        return
      }
    }

    const corpEffectsForTrade = s.getCorporateEffects()
    const result = executeProposal(proposal, trader, company.price, s.player.cash, adjBonus, company.volatility ?? 0.2, corpEffectsForTrade)

    if (result.success) {
      // Compute toast significance
      const traderName = trader?.name ?? '시스템'
      const execMsg = getPipelineMessage('trade_executed', {
        ticker: proposal.ticker,
        direction: proposal.direction,
        hour: s.time.hour,
      })
      const tradeValue = result.executedPrice * proposal.quantity
      const totalAssets = s.player.totalAssetValue
      const isSignificant = totalAssets > 0 && tradeValue >= totalAssets * 0.05

      // Single atomic set: trade execution + fee + proposal EXECUTED + satisfaction + toast
      // Uses result.executedPrice (slippage-applied) instead of company.price
      set((st) => {
        const executedPrice = result.executedPrice
        const quantity = proposal.quantity

        let newCash = st.player.cash
        let newPortfolio = { ...st.player.portfolio }

        if (proposal.direction === 'buy') {
          const cost = executedPrice * quantity
          newCash -= cost
          const existing = newPortfolio[proposal.companyId]
          newPortfolio[proposal.companyId] = existing
            ? {
                companyId: proposal.companyId,
                shares: existing.shares + quantity,
                avgBuyPrice:
                  (existing.avgBuyPrice * existing.shares + executedPrice * quantity) /
                  (existing.shares + quantity),
              }
            : { companyId: proposal.companyId, shares: quantity, avgBuyPrice: executedPrice }
        } else {
          const revenue = executedPrice * quantity
          newCash += revenue
          const position = newPortfolio[proposal.companyId]
          if (position) {
            const remaining = position.shares - quantity
            if (remaining <= 0) {
              delete newPortfolio[proposal.companyId]
            } else {
              newPortfolio[proposal.companyId] = { ...position, shares: remaining }
            }
          }
        }

        // Deduct fee atomically
        newCash = Math.max(0, newCash - result.fee)

        return {
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
            cash: newCash,
            portfolio: newPortfolio,
            totalAssetValue: newCash + calcPortfolioValue(newPortfolio, st.companies),
            dailyTradeCount: st.player.dailyTradeCount + 1, // ✨ 하루 거래 카운트 증가
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
                hour: s.time.hour,
              }].slice(-200)
            : st.officeEvents,
        }
      })

      // Record cash flow entries for the trade
      // Note: `s` is the pre-trade snapshot (line 1053), so s.player.portfolio still has the position
      const tradeMeta = { companyId: proposal.companyId, ticker: proposal.ticker, shares: proposal.quantity }
      if (proposal.direction === 'buy') {
        get().recordCashFlow('TRADE_BUY', -(result.executedPrice * proposal.quantity), `${proposal.ticker} ${proposal.quantity}주 매수`, tradeMeta)
      } else {
        // Use pre-trade snapshot for buyPrice (position may be deleted after atomic set)
        const preSellPos = s.player.portfolio[proposal.companyId]
        if (preSellPos) {
          const buyPrice = preSellPos.avgBuyPrice
          get().recordCashFlow('TRADE_SELL', result.executedPrice * proposal.quantity, `${proposal.ticker} ${proposal.quantity}주 매도`, tradeMeta)
          const tradePnl = (result.executedPrice - buyPrice) * proposal.quantity
          get().recordRealizedTrade({
            companyId: proposal.companyId,
            ticker: proposal.ticker,
            shares: proposal.quantity,
            buyPrice,
            sellPrice: result.executedPrice,
            pnl: tradePnl,
            fee: result.fee,
            tick: s.currentTick,
            timestamp: { year: s.time.year, month: s.time.month, day: s.time.day },
          })

          // ✨ Core Values: PnL attribution to involved employees
          const involvedIds = [
            proposal.createdByEmployeeId,
            proposal.reviewedByEmployeeId,
            trader?.id,
          ].filter((id): id is string => !!id)
          if (involvedIds.length > 0) {
            const pnlShare = tradePnl / involvedIds.length
            set((st) => {
              const updatedBios = { ...st.employeeBios }
              for (const eid of involvedIds) {
                const bio = updatedBios[eid]
                if (!bio) continue
                const prev = bio.totalPnlContribution ?? 0
                updatedBios[eid] = {
                  ...bio,
                  totalPnlContribution: prev + pnlShare,
                  totalTradesParticipated: (bio.totalTradesParticipated ?? 0) + 1,
                  totalSuccessfulTrades: (bio.totalSuccessfulTrades ?? 0) + (tradePnl >= 0 ? 1 : 0),
                  bestTradeProfit:
                    pnlShare > (bio.bestTradeProfit ?? 0) ? pnlShare : (bio.bestTradeProfit ?? 0),
                  bestTradeTicker:
                    pnlShare > (bio.bestTradeProfit ?? 0) ? proposal.ticker : (bio.bestTradeTicker ?? ''),
                  worstTradeProfit:
                    pnlShare < (bio.worstTradeProfit ?? 0) ? pnlShare : (bio.worstTradeProfit ?? 0),
                  worstTradeTicker:
                    pnlShare < (bio.worstTradeProfit ?? 0) ? proposal.ticker : (bio.worstTradeTicker ?? ''),
                }
              }
              return { employeeBios: updatedBios }
            })
          }
        }
      }
      if (result.fee > 0) {
        get().recordCashFlow('TRADE_FEE', -result.fee, `${proposal.ticker} 거래 수수료`, tradeMeta)
      }
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
              hour: s.time.hour,
            }].slice(-200)
          : st.officeEvents,
      }))
    }
  },

  // AI Architect Actions (Week 4 Integration)
  generateAIProposal: (maxMoves, maxPurchases) => generateAIProposalAction(maxMoves, maxPurchases),
  applyAIProposal: () => applyAIProposalAction(),
  rejectAIProposal: () => rejectAIProposalAction(),

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

        // Cooldown decay: -1 per day (was monthly)
        const decayedEmployees = s.player.employees.map((emp) => ({
          ...emp,
          praiseCooldown: Math.max(0, (emp.praiseCooldown ?? 0) - 1),
          scoldCooldown: Math.max(0, (emp.scoldCooldown ?? 0) - 1),
        }))

        updatedPlayer = {
          ...s.player,
          employees: decayedEmployees,
          lastDayChange: changePercent,
          previousDayAssets: currentAssets,
        }
      }

      // Chapter objective evaluation (lightweight hourly check)
      const updatedChapter = evaluateChapterObjectives(
        {
          year,
          cash: updatedPlayer.cash,
          totalAssetValue: updatedPlayer.totalAssetValue,
          employeeCount: updatedPlayer.employees.length,
          officeLevel: updatedPlayer.officeLevel,
          competitorAssets: s.competitors.map((c) => c.totalAssetValue),
          corporateSkillsUnlocked: s.corporateSkills.totalUnlocked,
          initialCash: s.config.initialCash,
          targetAsset: s.config.targetAsset,
        },
        s.chapterProgress,
      )

      return {
        time: { ...s.time, year, month, day, hour },
        currentTick: s.currentTick + 1,
        player: updatedPlayer,
        // Reset order flow on day change
        ...(dayChanged ? { orderFlowByCompany: {} } : {}),
        chapterProgress: updatedChapter,
      }
    })

    // Personalization: Update profile on day end
    const newDay = get().time.day
    if (newDay !== oldDay && get().personalizationEnabled) {
      get().updateProfileOnDayEnd()
    }
  },

  /* ── Hourly Processing: salary/tax/stamina/mood/XP distributed per-hour ── */
  processHourly: () => {
    const s = get()
    if (s.player.employees.length === 0 && s.economicPressure.currentTier === 'beginner') return

    const HPM = TIME_CONFIG.HOURS_PER_MONTH // 300
    const dcfg = s.difficultyConfig

    set((st) => {
      // 1. Hourly salary (rounded to prevent floating-point accumulation drift)
      const hourlySalary = Math.round(st.player.employees.reduce((sum, emp) => sum + emp.salary / HPM, 0))

      // 2. Hourly wealth tax (rounded)
      const totalAssets = st.player.cash + calcPortfolioValue(st.player.portfolio, st.companies)
      const { tax: taxCfg } = getTierConfig(st.economicPressure.currentTier)
      let taxRate = taxCfg.monthlyTaxRate
      if (st.economicPressure.reliefEligible) {
        taxRate *= RELIEF_TAX_DISCOUNT
      }
      const hourlyTax = Math.round(totalAssets * taxRate / HPM)

      // 3. Deduct cash
      const totalDeduction = hourlySalary + hourlyTax
      const newCash = Math.max(0, st.player.cash - totalDeduction)

      // 4. Process employees: stamina drain/recovery, mood drift, XP
      let firstLevelUp: LevelUpEvent | null = null
      const updatedEmployees = st.player.employees.map((emp) => {
        // Stamina drain
        const drain = (10 * dcfg.staminaDrainMultiplier) / HPM
        let newStamina = emp.stamina - drain

        // Recovery only if employee still has stamina after drain
        if (newStamina > 0) {
          const recovery = emp.bonus.staminaRecovery / HPM
          newStamina = Math.min(emp.maxStamina, newStamina + recovery)
        } else {
          newStamina = 0
        }

        // Mood drift: toward 50
        const currentMood = emp.mood ?? 50
        const moodDelta = (currentMood < 50 ? 2 : currentMood > 50 ? -1 : 0) / HPM
        const newMood = Math.max(0, Math.min(100, currentMood + moodDelta))

        // Sprite update based on stamina
        const sprite: Employee['sprite'] =
          newStamina <= 20 ? 'exhausted' : newStamina <= 60 ? 'typing' : 'idle'

        // XP accumulation — skip if exhausted after drain
        if (newStamina <= 0) {
          return { ...emp, stamina: newStamina, sprite, mood: newMood }
        }

        const hourlyXP = XP_AMOUNTS.MONTHLY_WORK / HPM
        const bonusXP = newStamina > emp.maxStamina * 0.5 ? XP_AMOUNTS.PERFECT_STAMINA / HPM : 0
        const totalXP = hourlyXP + bonusXP

        const currentLevel = emp.level ?? 1
        const currentXP = (emp.xp ?? 0) + totalXP
        const xpNeeded = emp.xpToNextLevel ?? xpForLevel(currentLevel)

        if (currentXP >= xpNeeded) {
          const newLevel = currentLevel + 1
          const newTitle = titleForLevel(newLevel)
          const newBadge = badgeForLevel(newLevel)
          const oldTitle = emp.title ?? 'intern'
          const logEntry = {
            day: (st.time.year - st.config.startYear) * 360 + (st.time.month - 1) * 30 + st.time.day,
            event: 'LEVEL_UP' as const,
            description: `Lv.${newLevel} 달성!${newTitle !== oldTitle ? ` ${newTitle.toUpperCase()}로 승급!` : ''}`,
          }

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
            stamina: newStamina,
            sprite,
            mood: newMood,
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
          stamina: newStamina,
          sprite,
          mood: newMood,
          xp: currentXP,
        }
      })

      return {
        player: {
          ...st.player,
          cash: newCash,
          employees: updatedEmployees,
          totalAssetValue: newCash + calcPortfolioValue(st.player.portfolio, st.companies),
        },
        hourlyAccumulators: {
          salaryPaid: st.hourlyAccumulators.salaryPaid + hourlySalary,
          taxPaid: st.hourlyAccumulators.taxPaid + hourlyTax,
        },
        ...(firstLevelUp ? { pendingLevelUp: firstLevelUp } : {}),
      }
    })
  },

  /* ── Monthly Processing: cashflow recording + monthly events ── */
  processMonthly: () => {
    const state = get()
    const monthNum = (state.time.year - state.config.startYear) * 12 + state.time.month

    if (monthNum <= state.lastProcessedMonth) return

    // Record accumulated salary/tax from hourly processing
    const accum = state.hourlyAccumulators
    const totalSalaryOwed = state.player.employees.reduce((sum, emp) => sum + emp.salary, 0)

    set((s) => ({
      lastProcessedMonth: monthNum,
      player: {
        ...s.player,
        monthlyExpenses: accum.salaryPaid,
      },
      // Reset accumulators for next month
      hourlyAccumulators: { salaryPaid: 0, taxPaid: 0 },
    }))

    // Record salary cash flow (single monthly entry from accumulated hourly deductions)
    if (accum.salaryPaid > 0) {
      get().recordCashFlow('SALARY', -accum.salaryPaid, `${state.time.month}월 급여 (${state.player.employees.length}명)`)
    }

    // Detect salary deficit (hourly cash clamping may have underpaid)
    if (totalSalaryOwed > 0 && accum.salaryPaid < totalSalaryOwed * 0.95) {
      const deficit = totalSalaryOwed - accum.salaryPaid
      set((st) => ({
        cashFlowAnomalies: [
          ...st.cashFlowAnomalies,
          `급여 부족! ${Math.round(deficit).toLocaleString()}원 미지급 (현금 부족으로 일부 미지급)`,
        ].slice(-50),
      }))
    }

    // Record tax cash flow
    if (accum.taxPaid > 0) {
      get().recordCashFlow('TAX' as CashFlowCategory, -accum.taxPaid, `부유세 (${state.economicPressure.currentTier} 구간)`)

      // Update economic pressure tax tracking
      set((st) => ({
        economicPressure: {
          ...st.economicPressure,
          monthlyTaxPaid: accum.taxPaid,
          totalTaxPaid: st.economicPressure.totalTaxPaid + accum.taxPaid,
        },
      }))
    }

    // Purge old cash flow entries + anomaly detection
    get().purgeCashFlowLog()

    // 경제적 압박: 부의 구간 업데이트 + 실적 기록 (세금은 이미 hourly에서 처리)
    get().updateWealthTier()
    get().recordPerformance()

    // 월간 카드 뽑기
    get().drawMonthlyCards()

    // 직원 바이오 월간 업데이트 (근속, 감정, 목표)
    const latestState = get()
    latestState.player.employees.forEach((emp) => {
      const bio = latestState.employeeBios[emp.id]
      if (bio) {
        set((st) => ({
          employeeBios: {
            ...st.employeeBios,
            [emp.id]: { ...st.employeeBios[emp.id], monthsEmployed: bio.monthsEmployed + 1 },
          },
        }))
        latestState.updateGoalProgress(emp.id)
        latestState.updateEmotion(emp.id)
      }
    })

    // ✨ Core Values: Employee Growth Milestone Check (monthly)
    {
      const currentState = get()
      const tick = currentState.currentTick
      const newNotifications: typeof currentState.milestoneNotifications = []

      currentState.player.employees.forEach((emp) => {
        const bio = currentState.employeeBios[emp.id]
        if (!bio) return

        const result = checkEmployeeMilestones(emp, bio, tick)
        if (result.newMilestones.length === 0) return

        // Update bio with unlocked milestones + life events + rewards
        set((st) => {
          const existingBio = st.employeeBios[emp.id]
          if (!existingBio) return st
          return {
            employeeBios: {
              ...st.employeeBios,
              [emp.id]: {
                ...existingBio,
                unlockedMilestones: [
                  ...(existingBio.unlockedMilestones ?? []),
                  ...result.newMilestones.map((m) => m.id),
                ],
                lifeEvents: [
                  ...existingBio.lifeEvents,
                  ...result.lifeEvents,
                ].slice(-30),
              },
            },
            player: {
              ...st.player,
              employees: st.player.employees.map((e) =>
                e.id === emp.id
                  ? {
                      ...e,
                      satisfaction: Math.min(100, (e.satisfaction ?? 50) + result.totalSatisfactionBonus),
                      stress: Math.max(0, (e.stress ?? 0) - result.totalStressReduction),
                      xp: (e.xp ?? 0) + result.totalXpBonus,
                    }
                  : e,
              ),
            },
          }
        })

        // Queue notifications + trigger milestone chatter
        for (const m of result.newMilestones) {
          newNotifications.push({
            employeeId: emp.id,
            employeeName: emp.name,
            milestoneId: m.id,
            title: m.title,
            description: m.description,
            icon: m.icon,
            timestamp: tick,
          })

          // Trigger milestone speech bubble in office
          const chatterMap: Record<string, string> = {
            growth: 'milestone_skill',
            tenure: 'milestone_tenure',
            performance: 'milestone_trade',
            contribution: 'milestone_contribution',
          }
          const chatterId = chatterMap[m.category]
          if (chatterId) {
            triggerChatter(emp.id, chatterId)
          }
        }
      })

      if (newNotifications.length > 0) {
        set((st) => ({
          milestoneNotifications: [...st.milestoneNotifications, ...newNotifications].slice(-20),
        }))
      }
    }

    // ✨ Core Values: 월 1회 Rivalry tracking (headToHead 갱신)
    {
      const rankings = get().calculateRankings()
      const playerEntry = rankings.find((r) => r.isPlayer)
      if (playerEntry) {
        for (const entry of rankings) {
          if (entry.isPlayer) continue
          get().updateRivalryTracking(entry.name, entry.rank < playerEntry.rank)
        }
      }
    }

    // 이벤트 체인: 15% 확률로 새 체인 시작
    {
      const chainState = get().eventChains
      const tick = get().currentTick
      if (canStartChain(chainState, tick) && Math.random() < 0.15) {
        const chain = selectChain(get().time.year, chainState.completedChainIds)
        if (chain) {
          get().startEventChain(chain.id)
        }
      }
    }

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

    // 포지션 제한 검증
    const posLimit = get().enforcePositionLimit(companyId, shares)
    if (!posLimit.allowed) return
    const limitedShares = Math.min(shares, posLimit.maxShares)

    set((s) => {
      if (limitedShares <= 0) return s
      const company = s.companies.find((c) => c.id === companyId)
      if (!company) return s
      const cost = company.price * limitedShares
      if (cost > s.player.cash) return s

      const existing = s.player.portfolio[companyId]
      const newPosition: PortfolioPosition = existing
        ? {
            companyId,
            shares: existing.shares + limitedShares,
            avgBuyPrice:
              (existing.avgBuyPrice * existing.shares + company.price * limitedShares) /
              (existing.shares + limitedShares),
          }
        : { companyId, shares: limitedShares, avgBuyPrice: company.price }

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
        qty: limitedShares,
        price: company.price,
      })
    }

    // Record cash flow
    {
      const c = get().companies.find((co) => co.id === companyId)
      if (c) {
        get().recordCashFlow('TRADE_BUY', -(c.price * limitedShares), `${c.ticker} ${limitedShares}주 매수`, { companyId, ticker: c.ticker, shares: limitedShares })
      }
    }

    // Grant trade XP to a random working employee
    const emps = get().player.employees.filter((e) => e.stamina > 0)
    if (emps.length > 0) {
      const lucky = emps[Math.floor(Math.random() * emps.length)]
      get().gainXP(lucky.id, XP_AMOUNTS.TRADE_SUCCESS, 'trade_success')
    }

    // ✨ Queue trade animation
    {
      const c = get().companies.find((co) => co.id === companyId)
      if (c) {
        get().queueAnimation(
          createTradeAnimationSequence({
            action: 'buy',
            companyName: c.name,
            ticker: c.ticker,
            shares: limitedShares,
            price: c.price,
            totalCost: c.price * limitedShares,
          })
        )
      }
    }
  },

  sellStock: (companyId, shares) => {
    // Check if trading is allowed
    if (!get().canTrade(companyId)) {
      soundManager.playClick() // Use available sound method
      return
    }

    // Capture avgBuyPrice before sell (position may be deleted after full sell)
    const preSellAvgBuyPrice = get().player.portfolio[companyId]?.avgBuyPrice ?? 0

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

    // Personalization: Log trade event + cash flow recording
    const company = get().companies.find((c) => c.id === companyId)
    // Note: position may have been deleted (if sold all shares), use pre-sell snapshot
    const sellBuyPrice = preSellAvgBuyPrice
    if (company) {
      const revenue = company.price * shares
      get().recordCashFlow('TRADE_SELL', revenue, `${company.ticker} ${shares}주 매도`, { companyId, ticker: company.ticker, shares })
      const pnl = (company.price - sellBuyPrice) * shares
      get().recordRealizedTrade({
        companyId,
        ticker: company.ticker,
        shares,
        buyPrice: sellBuyPrice,
        sellPrice: company.price,
        pnl,
        fee: 0,
        tick: get().currentTick,
        timestamp: { year: get().time.year, month: get().time.month, day: get().time.day },
      })

      const position = get().player.portfolio[companyId]
      get().logPlayerEvent('TRADE', {
        action: 'sell',
        companyId,
        ticker: company.ticker,
        qty: shares,
        price: company.price,
        pnl,
      })
      void position // suppress unused warning
    }

    // Grant trade XP to a random working employee
    const emps = get().player.employees.filter((e) => e.stamina > 0)
    if (emps.length > 0) {
      const lucky = emps[Math.floor(Math.random() * emps.length)]
      get().gainXP(lucky.id, XP_AMOUNTS.TRADE_SUCCESS, 'trade_success')
    }

    // ✨ Queue trade animation
    if (company) {
      const pnl = (company.price - preSellAvgBuyPrice) * shares
      get().queueAnimation(
        createTradeAnimationSequence({
          action: 'sell',
          companyName: company.name,
          ticker: company.ticker,
          shares,
          price: company.price,
          totalCost: company.price * shares,
          profitLoss: pnl,
        })
      )
    }
  },

  /* ── Realtime ── */
  updateRealtimeStatus: (partial) =>
    set((s) => ({
      realtimeConnection: { ...s.realtimeConnection, ...partial },
    })),

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
          // Dispatch VI notification
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('viTriggered', {
                detail: { companyName: c.name, ticker: c.ticker },
              }),
            )
          }, 0)
        }

        return updatedCompany
      })

      // Build price map once for O(1) lookups
      const priceMap = buildPriceMap(newCompanies)

      // Update event impact tracking
      const updatedEvents = s.events.map((evt) => {
        if (!evt.priceImpactSnapshot || evt.remainingTicks <= 0) return evt

        const updatedSnapshot = { ...evt.priceImpactSnapshot }

        Object.keys(updatedSnapshot).forEach((companyId) => {
          const companyPrice = priceMap.get(companyId)
          if (companyPrice !== undefined && updatedSnapshot[companyId]) {
            const snapshot = updatedSnapshot[companyId]
            const currentChange = companyPrice - snapshot.priceBefore

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

      const portfolioValue = calcPortfolioValue(s.player.portfolio, priceMap)

      return {
        companies: newCompanies,
        events: updatedEvents,
        player: { ...s.player, totalAssetValue: s.player.cash + portfolioValue },
      }
    }),

  updateSessionOpenPrices: (historicalOpens) =>
    set((s) => {
      // Calculate KOSPI index at session open
      const kospiIndex = calculateKOSPIIndex(s.companies)

      return {
        companies: s.companies.map((c) => {
          const resetVI = resetVIForNewDay(c)
          // KOSPI 모드: 실제 시가가 제공되면 사용
          const openPrice = historicalOpens?.[c.id] ?? c.price
          return {
            ...resetVI,
            sessionOpenPrice: openPrice,
            // 실제 시가가 현재가와 다르면 가격도 보정
            ...(historicalOpens?.[c.id] ? { price: openPrice, previousPrice: c.price } : {}),
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
          hour: s.time.hour,
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

  // VI cooldown decay only — VI trigger detection is handled in updatePrices()
  updateVIStates: () =>
    set((s) => ({
      companies: s.companies.map((c) => updateVIState(c, c.price)),
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
  hireEmployee: (role) => {
    set((s) => {
      const roleConfig = EMPLOYEE_ROLE_CONFIG[role]
      const salary = Math.round(roleConfig.baseSalary * s.difficultyConfig.employeeSalaryMultiplier)

      // ✨ Sprint 1: Generate traits and skills
      const traits = generateRandomTraits()
      const skills = generateInitialSkills(role, traits)

      // Apply trait salary multiplier (BEFORE guard check)
      let adjustedSalary = salary
      traits.forEach((trait) => {
        const config = TRAIT_DEFINITIONS[trait]
        if (config.effects.salaryMultiplier) {
          adjustedSalary = Math.round(adjustedSalary * config.effects.salaryMultiplier)
        }
      })

      if (s.player.cash < adjustedSalary * 3) return s // Must afford 3 months upfront (adjusted)

      // ✨ 뱃지 생성 (스킬 기반)
      const badges = generateBadgesFromSkills(skills)

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
        badges, // ✨ 신규: 스킬 뱃지
        stress: 0,
        satisfaction: 100,
        seatIndex: null,
        deskId: null,

        // ✨ Trade AI Pipeline: Analyst sector assignment
        assignedSectors: role === 'analyst' ? generateAssignedSectors() : undefined,

        // ✨ Stop Loss/Take Profit 기본값 활성화
        stopLossTakeProfit: {
          enabled: true,
          stopLossPercent: -10,   // -10% 손절
          takeProfitPercent: 15,  // +15% 익절
        },

        // ✨ Growth System
        level: 1,
        xp: 0,
        xpToNextLevel: 1000,
      }

      // ✨ RPG Skill Tree: Initialize progression system
      migrateEmployeeToSkillTree(employee)

      // Deduct 3-month upfront signing bonus (adjusted salary)
      const newCash = s.player.cash - adjustedSalary * 3

      // officeLayout 자동 초기화 (첫 고용 시)
      const layout = s.player.officeLayout ?? createInitialOfficeLayout()

      // 빈 책상에 자동 배치
      const emptyDesk = layout.desks.find((d) => !d.employeeId)
      let updatedLayout = layout
      if (emptyDesk) {
        employee.deskId = emptyDesk.id
        updatedLayout = {
          ...layout,
          desks: layout.desks.map((d) =>
            d.id === emptyDesk.id ? { ...d, employeeId: employee.id } : d,
          ),
        }
      }

      return {
        player: {
          ...s.player,
          cash: newCash,
          employees: [...s.player.employees, employee],
          monthlyExpenses: s.player.monthlyExpenses + adjustedSalary,
          totalAssetValue: newCash + calcPortfolioValue(s.player.portfolio, s.companies),
          officeLayout: updatedLayout,
        },
      }
    })

    // Record cash flow for hire bonus (use post-set state to get actual employee + cost)
    const postState = get()
    const newEmp = postState.player.employees[postState.player.employees.length - 1]
    if (newEmp) {
      const signingBonus = newEmp.salary * 3
      get().recordCashFlow('HIRE_BONUS', -signingBonus, `${newEmp.name} 채용 보너스`, { employeeId: newEmp.id })
      // 바이오 자동 생성
      get().createEmployeeBio(newEmp.id)
      // 오피스 토스트 이벤트
      const roleLabel = ({ analyst: '애널리스트', trader: '트레이더', manager: '매니저', intern: '인턴', ceo: 'CEO', hr_manager: 'HR매니저' } as Record<string, string>)[newEmp.role] ?? newEmp.role
      set((s) => ({
        officeEvents: [...s.officeEvents, {
          timestamp: Date.now(),
          type: 'employee_hired',
          emoji: '🎉',
          message: `${newEmp.name} (${roleLabel}) 입사 — 앞으로의 활약 기대!`,
          employeeIds: [newEmp.id],
        }],
      }))
    }
  },

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

      // Training program cleanup: 해고 직원을 수강생/강사에서 제거
      const cleanedPrograms = s.training.programs.map((p) => {
        if (p.status !== 'in_progress') return p
        const wasTrainee = p.traineeIds.includes(id)
        const wasInstructor = p.instructorId === id
        if (!wasTrainee && !wasInstructor) return p
        return {
          ...p,
          traineeIds: p.traineeIds.filter((tid) => tid !== id),
          instructorId: wasInstructor ? null : p.instructorId,
        }
      })

      return {
        proposals: updatedProposals,
        training: { ...s.training, programs: cleanedPrograms },
        player: {
          ...s.player,
          employees: s.player.employees.filter((e) => e.id !== id),
          monthlyExpenses: Math.max(0, s.player.monthlyExpenses - emp.salary),
        },
        officeEvents: [...s.officeEvents, {
          timestamp: Date.now(),
          type: 'employee_fired',
          emoji: '👋',
          message: `${emp.name} 퇴사 처리 완료 — 관련 제안서 만료됨`,
          employeeIds: [id],
        }],
      }
    })
  },

  /* ── Update Employee Badges when skills change ── */
  updateEmployeeBadges: (employeeId) =>
    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) return s

      const emp = s.player.employees[empIdx]
      if (!emp.skills) return s

      const newBadges = generateBadgesFromSkills(emp.skills)
      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = { ...emp, badges: newBadges }

      return {
        player: { ...s.player, employees: updatedEmployees },
      }
    }),

  /* ── Set Trading Limits for Employee ── */
  setTradingLimits: (employeeId, limits) =>
    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) return s

      const emp = s.player.employees[empIdx]
      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = { ...emp, tradingLimits: limits ?? undefined }

      return {
        player: { ...s.player, employees: updatedEmployees },
      }
    }),

  /* ── Set Stop Loss / Take Profit for Employee ── */
  setStopLossTakeProfit: (employeeId, config) =>
    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) return s

      const emp = s.player.employees[empIdx]
      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = { ...emp, stopLossTakeProfit: config ?? undefined }

      return {
        player: { ...s.player, employees: updatedEmployees },
      }
    }),

  upgradeOffice: () => {
    const s = get()
    const currentLevel = s.player.officeLevel
    if (currentLevel >= OFFICE_BALANCE.MAX_LEVEL) return
    const cost = OFFICE_BALANCE.UPGRADE_COSTS[currentLevel]
    if (s.player.cash < cost) return

    const newLevel = currentLevel + 1

    set((st) => {
      // Reset all employee stamina to max on office upgrade
      const refreshedEmployees = st.player.employees.map((emp) => ({
        ...emp,
        stamina: emp.maxStamina,
      }))

      // 그리드 확장: 기존 직원/가구 보존하며 새 크기로 재생성
      const newGrid = createInitialOfficeGrid(newLevel)
      const oldGrid = st.player.officeGrid
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
          ...st.player,
          cash: st.player.cash - cost,
          officeLevel: newLevel,
          employees: refreshedEmployees,
          officeGrid: newGrid,
          totalAssetValue:
            st.player.cash - cost + calcPortfolioValue(st.player.portfolio, st.companies),
        },
      }
    })

    // Record with pre-computed cost (no race condition)
    get().recordCashFlow('OFFICE_UPGRADE', -cost, `사무실 레벨 ${newLevel} 업그레이드`)
  },

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
        office_dot: '도트 사무실',
        ranking: '랭킹',
        office_history: '사무실 히스토리',
        employee_detail: '직원 상세',
        settings: '설정',
        ending: '게임 종료',
        institutional: '기관 매매',
        proposals: '제안서 목록',
        acquisition: '기업 인수(M&A)',
        dashboard: '대시보드',
        achievement_log: '달성 기록',
        monthly_cards: '월간 카드',
        event_chain_tracker: '이벤트 체인',
        skill_library: '스킬 도감',
        training_center: '교육 센터',
      }

      const windowSizes: Record<string, { width: number; height: number }> = {
        chart: { width: 500, height: 380 },
        trading: { width: 420, height: 500 },
        office: { width: 750, height: 650 },
        office_dot: { width: 750, height: 650 },
        employee_detail: { width: 420, height: 520 },
        proposals: { width: 480, height: 420 },
        skill_library: { width: 580, height: 500 },
        training_center: { width: 580, height: 500 },
        monthly_cards: { width: 620, height: 480 },
        acquisition: { width: 680, height: 560 },
        ranking: { width: 420, height: 480 },
        news: { width: 440, height: 400 },
        institutional: { width: 500, height: 560 },
        event_chain_tracker: { width: 500, height: 440 },
        achievement_log: { width: 500, height: 440 },
        settings: { width: 420, height: 360 },
        dashboard: { width: 900, height: 680 },
      }
      const windowSize = windowSizes[type] ?? { width: 420, height: 340 }

      const win: WindowState = {
        id,
        type,
        title: titles[type],
        x: 50 + offset,
        y: 50 + offset,
        width: windowSize.width,
        height: windowSize.height,
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
              chart: { width: 500, height: 380 },
              trading: { width: 420, height: 500 },
              office: { width: 750, height: 650 },
              office_dot: { width: 750, height: 650 },
              employee_detail: { width: 420, height: 520 },
              proposals: { width: 480, height: 420 },
              skill_library: { width: 580, height: 500 },
              training_center: { width: 580, height: 500 },
              monthly_cards: { width: 620, height: 480 },
              acquisition: { width: 680, height: 560 },
              ranking: { width: 420, height: 480 },
              news: { width: 440, height: 400 },
              institutional: { width: 500, height: 560 },
              event_chain_tracker: { width: 500, height: 440 },
              achievement_log: { width: 500, height: 440 },
              settings: { width: 420, height: 360 },
              dashboard: { width: 900, height: 680 },
            }
            const defaults = defaultSizes[w.type] ?? { width: 420, height: 340 }
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

  /* ── UX Enhancement: Animation Queue ── */
  queueAnimation: (sequence) => {
    set((s) => ({
      animationQueue: {
        ...s.animationQueue,
        queue: [...s.animationQueue.queue, sequence].sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }),
      },
    }))
  },

  startAnimation: () => {
    set((s) => {
      if (s.animationQueue.isPlaying || s.animationQueue.queue.length === 0) return s
      const [next, ...rest] = s.animationQueue.queue
      return {
        animationQueue: {
          queue: rest,
          current: next,
          currentStepIndex: 0,
          isPlaying: true,
        },
      }
    })
  },

  completeAnimation: () => {
    set((s) => ({
      animationQueue: {
        ...s.animationQueue,
        current: null,
        currentStepIndex: 0,
        isPlaying: false,
      },
    }))
  },

  cancelAnimation: () => {
    set({
      animationQueue: { queue: [], current: null, currentStepIndex: 0, isPlaying: false },
    })
  },

  /* ── UX Enhancement: Monthly Cards ── */
  drawMonthlyCards: () => {
    const s = get()
    // 이미 이번 달에 뽑았으면 스킵
    if (s.monthlyCards.isDrawn && s.monthlyCards.drawMonth === s.time.month) return

    const cards = drawCards(s.time.year)
    const currentTimestamp = getAbsoluteTimestamp(s.time, s.config.startYear)

    set({
      monthlyCards: {
        ...s.monthlyCards,
        availableCards: cards,
        selectedCardIds: [],
        isDrawn: true,
        isSelectionComplete: false,
        drawMonth: s.time.month,
        selectionDeadlineTick: currentTimestamp + 100, // ~10시간 후 자동 선택
      },
    })

    // 카드 드로우 윈도우 자동 열기
    get().openWindow('monthly_cards')
  },

  selectCard: (cardId) => {
    set((s) => {
      if (s.monthlyCards.isSelectionComplete) return s

      const isAlreadySelected = s.monthlyCards.selectedCardIds.includes(cardId)
      let newSelected: string[]

      if (isAlreadySelected) {
        // 선택 해제
        newSelected = s.monthlyCards.selectedCardIds.filter((id) => id !== cardId)
      } else if (s.monthlyCards.selectedCardIds.length < 2) {
        // 새로 선택 (최대 2장)
        newSelected = [...s.monthlyCards.selectedCardIds, cardId]
      } else {
        return s // 이미 2장 선택됨
      }

      return {
        monthlyCards: {
          ...s.monthlyCards,
          selectedCardIds: newSelected,
        },
      }
    })
  },

  applyCardEffects: () => {
    const s = get()
    if (s.monthlyCards.isSelectionComplete || s.monthlyCards.selectedCardIds.length === 0) return

    const selectedCards = s.monthlyCards.availableCards.filter((c) =>
      s.monthlyCards.selectedCardIds.includes(c.id),
    )
    const currentTimestamp = getAbsoluteTimestamp(s.time, s.config.startYear)

    const newActiveCards = selectedCards.map((card) => ({
      card,
      remainingTicks: card.effects[0]?.duration ?? 360,
      appliedAt: currentTimestamp,
    }))

    set((st) => ({
      monthlyCards: {
        ...st.monthlyCards,
        isSelectionComplete: true,
        activeCards: [...st.monthlyCards.activeCards, ...newActiveCards],
      },
    }))
  },

  expireCards: () => {
    set((s) => ({
      monthlyCards: {
        ...s.monthlyCards,
        activeCards: s.monthlyCards.activeCards
          .map((ac) => ({ ...ac, remainingTicks: ac.remainingTicks - 1 }))
          .filter((ac) => ac.remainingTicks > 0),
      },
    }))
  },

  /* ── UX Enhancement: Event Chains ── */
  startEventChain: (chainId) => {
    const s = get()
    const currentTick = s.currentTick
    const chainState = initChainState(chainId, currentTick)

    set((st) => ({
      eventChains: {
        ...st.eventChains,
        chains: [...st.eventChains.chains, chainState],
      },
    }))

    // 첫 주차 이벤트 수정자를 시장 이벤트로 추가
    const modifiers = getCurrentWeekModifiers(chainState)
    if (modifiers) {
      const template = EVENT_CHAIN_TEMPLATES.find((c) => c.id === chainId)
      if (template) {
        const evt: MarketEvent = {
          id: `chain_${chainId}_w0`,
          title: `[${template.icon} ${template.title}] ${modifiers.title}`,
          description: modifiers.description,
          type: template.category === 'global' ? 'global' : 'sector',
          impact: {
            driftModifier: modifiers.driftModifier,
            volatilityModifier: modifiers.volatilityModifier,
            severity: 'medium',
          },
          duration: 168,
          remainingTicks: 70,
          startTimestamp: { ...s.time },
          affectedSectors: modifiers.affectedSectors,
          affectedCompanies: modifiers.affectedCompanyIds,
        }
        set((st) => ({ events: [evt, ...st.events] }))
      }
    }

    // 이벤트 체인 트래커 창 열기
    get().openWindow('event_chain_tracker')
  },

  advanceChain: () => {
    const s = get()
    const activeChain = s.eventChains.chains.find((c) => c.status === 'active')
    if (!activeChain) return

    const currentTick = s.currentTick
    const advanced = advanceChainWeek(activeChain, currentTick)

    set((st) => ({
      eventChains: {
        ...st.eventChains,
        chains: st.eventChains.chains.map((c) =>
          c.chainId === activeChain.chainId ? advanced : c,
        ),
        ...(advanced.status === 'completed'
          ? {
              completedChainIds: [...st.eventChains.completedChainIds, activeChain.chainId],
              lastChainEndTick: currentTick,
            }
          : {}),
      },
    }))

    // 새 주차 이벤트 수정자 추가
    if (advanced.status === 'active') {
      const modifiers = getCurrentWeekModifiers(advanced)
      if (modifiers) {
        const template = EVENT_CHAIN_TEMPLATES.find((c) => c.id === activeChain.chainId)
        if (template) {
          const evt: MarketEvent = {
            id: `chain_${activeChain.chainId}_w${advanced.currentWeek}`,
            title: `[${template.icon} ${template.title}] ${modifiers.title}`,
            description: modifiers.description,
            type: template.category === 'global' ? 'global' : 'sector',
            impact: {
              driftModifier: modifiers.driftModifier,
              volatilityModifier: modifiers.volatilityModifier,
              severity: 'medium',
            },
            duration: 168,
            remainingTicks: 70,
            startTimestamp: { ...s.time },
            affectedSectors: modifiers.affectedSectors,
            affectedCompanies: modifiers.affectedCompanyIds,
          }
          set((st) => ({ events: [evt, ...st.events] }))
        }
      }
    }
  },

  resolveChain: (chainId) => {
    set((s) => ({
      eventChains: {
        ...s.eventChains,
        chains: s.eventChains.chains.map((c) =>
          c.chainId === chainId ? { ...c, status: 'completed' as const } : c
        ),
        completedChainIds: [...s.eventChains.completedChainIds, chainId],
        lastChainEndTick: s.currentTick,
      },
    }))
  },

  /* ── UX Enhancement: Employee Bio ── */
  createEmployeeBio: (employeeId) => {
    const s = get()
    const employee = s.player.employees.find((e) => e.id === employeeId)
    if (!employee || s.employeeBios[employeeId]) return

    const currentTick = getAbsoluteTimestamp(s.time, s.config.startYear)
    const bio = createBio(employee, currentTick)
    set((st) => ({
      employeeBios: { ...st.employeeBios, [employeeId]: bio },
    }))
  },

  updateGoalProgress: (employeeId) => {
    const s = get()
    const bio = s.employeeBios[employeeId]
    const employee = s.player.employees.find((e) => e.id === employeeId)
    if (!bio || !employee) return

    const currentTick = getAbsoluteTimestamp(s.time, s.config.startYear)
    const { updatedBio, completedGoalTitles } = updateGoals(bio, employee, currentTick)

    // 목표 달성 시 라이프 이벤트 추가
    const newEvents = completedGoalTitles.map((title) => ({
      id: `evt_goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'goal_completed' as const,
      title: '목표 달성',
      description: `"${title}" 목표를 달성했습니다!`,
      occurredAtTick: currentTick,
      emotionalImpact: 'proud' as const,
    }))

    set((st) => ({
      employeeBios: {
        ...st.employeeBios,
        [employeeId]: {
          ...updatedBio,
          lifeEvents: [...updatedBio.lifeEvents, ...newEvents].slice(-20),
          currentEmotion: newEvents.length > 0 ? 'proud' : updatedBio.currentEmotion,
        },
      },
    }))
  },

  addLifeEvent: (employeeId, event) => {
    set((s) => {
      const bio = s.employeeBios[employeeId]
      if (!bio) return s
      return {
        employeeBios: {
          ...s.employeeBios,
          [employeeId]: {
            ...bio,
            lifeEvents: [...bio.lifeEvents.slice(-19), event],
          },
        },
      }
    })
  },

  updateEmotion: (employeeId) => {
    const s = get()
    const bio = s.employeeBios[employeeId]
    const employee = s.player.employees.find((e) => e.id === employeeId)
    if (!bio || !employee) return

    const newEmotion = inferEmotion(employee)
    if (newEmotion === bio.currentEmotion) return

    const currentTick = getAbsoluteTimestamp(s.time, s.config.startYear)
    set((st) => ({
      employeeBios: {
        ...st.employeeBios,
        [employeeId]: {
          ...bio,
          currentEmotion: newEmotion,
          emotionHistory: [...bio.emotionHistory, { emotion: newEmotion, tick: currentTick }].slice(-10),
        },
      },
    }))
  },

  deleteEmployeeBio: (employeeId) => {
    set((s) => {
      const { [employeeId]: _, ...rest } = s.employeeBios
      return { employeeBios: rest }
    })
  },

  /* ── Core Values: Employee Milestone Notifications ── */
  dismissMilestoneNotification: (index) => {
    set((s) => ({
      milestoneNotifications: s.milestoneNotifications.filter((_, i) => i !== index),
    }))
  },

  /* ── UX Enhancement: Skill Paths ── */
  selectSkillPath: (employeeId, path) => {
    set((s) => ({
      employeeSkillPaths: {
        ...s.employeeSkillPaths,
        [employeeId]: {
          selectedPath: path,
          pathLevel: 0,
          unlockedBonuses: [],
        },
      },
    }))
  },

  calculatePathBonuses: (employeeId) => {
    const s = get()
    const pathState = s.employeeSkillPaths[employeeId]
    const employee = s.player.employees.find((e) => e.id === employeeId)
    if (!pathState || !employee) return []
    return calculateBonuses(pathState, employee.level ?? 1)
  },

  /* ── UX Enhancement: Economic Pressure ── */
  updateWealthTier: () => {
    const s = get()
    const totalAssets = s.player.cash + calcPortfolioValue(s.player.portfolio, s.companies)
    const updated = updateTier(s.economicPressure, totalAssets)
    if (updated !== s.economicPressure) {
      set({ economicPressure: updated })
    }
  },

  applyWealthTax: () => {
    const s = get()
    const totalAssets = s.player.cash + calcPortfolioValue(s.player.portfolio, s.companies)
    const { taxAmount, updatedPressure } = calculateMonthlyTax(s.economicPressure, totalAssets)

    if (taxAmount > 0) {
      const newCash = Math.max(0, s.player.cash - taxAmount)
      set((st) => ({
        player: { ...st.player, cash: newCash },
        economicPressure: updatedPressure,
      }))
      get().recordCashFlow('TAX' as CashFlowCategory, -taxAmount, `부유세 (${s.economicPressure.currentTier} 구간)`)
    }
  },

  enforcePositionLimit: (companyId, shares) => {
    const s = get()
    const totalAssets = s.player.cash + calcPortfolioValue(s.player.portfolio, s.companies)
    const company = s.companies.find((c) => c.id === companyId)
    if (!company) return { allowed: true, maxShares: shares }

    const currentPosition = s.player.portfolio[companyId]
    const currentShares = currentPosition?.shares ?? 0

    return checkPositionLimit(
      s.economicPressure.currentTier,
      totalAssets,
      currentShares * company.price,
      currentShares,
      company.price,
      shares,
    )
  },

  recordPerformance: () => {
    const s = get()
    const totalAssets = s.player.cash + calcPortfolioValue(s.player.portfolio, s.companies)
    const lastPerf = s.economicPressure.performanceHistory
    const startAssets = lastPerf.length > 0
      ? lastPerf[lastPerf.length - 1].endAssets
      : totalAssets

    const updated = recordMonthlyPerformance(
      s.economicPressure,
      s.time.year,
      s.time.month,
      startAssets,
      totalAssets,
      s.economicPressure.monthlyTaxPaid,
    )
    set({ economicPressure: updated })
  },

  /* ── UX Enhancement: Milestones ── */
  checkMilestones: () => {
    const s = get()
    // Initialize milestones if empty
    let currentMilestones = s.milestones.milestones
    if (Object.keys(currentMilestones).length === 0) {
      currentMilestones = createInitialMilestones()
    }

    const rankings = s.calculateRankings()
    const playerRank = rankings.find((r) => r.isPlayer)?.rank ?? 99

    const ctx: MilestoneContext = {
      totalAssets: s.player.totalAssetValue,
      cash: s.player.cash,
      portfolioCount: Object.keys(s.player.portfolio).length,
      employeeCount: s.player.employees.length,
      yearsPassed: s.time.year - s.config.startYear,
      totalTrades: 0,
      currentYear: s.time.year,
      officeLevel: s.player.officeLevel,
      competitorRank: playerRank,
    }

    let totalUnlocked = s.milestones.totalUnlocked
    const updated = { ...currentMilestones }
    for (const def of MILESTONE_DEFINITIONS) {
      const milestone = updated[def.id]
      if (!milestone || milestone.isUnlocked) continue

      const currentValue = def.checkFn(ctx)
      if (currentValue >= def.targetValue) {
        updated[def.id] = { ...milestone, isUnlocked: true, unlockedAt: s.currentTick }
        totalUnlocked++

        // Queue celebration animation
        get().queueAnimation(
          createMilestoneAnimationSequence({
            title: milestone.title,
            description: milestone.description,
            icon: milestone.icon,
          })
        )
      }
    }

    set({
      milestones: {
        milestones: updated,
        totalUnlocked,
        lastCheckedTick: s.currentTick,
      },
    })
  },

  /* ── Corporate Skill System ── */
  unlockCorporateSkill: (skillId) => {
    const s = get()
    const { skills } = s.corporateSkills
    const validation = validateUnlock(skillId, skills, s.player.cash)
    if (!validation.canUnlock) {
      return { success: false, reason: validation.reason }
    }

    const skill = skills[skillId]
    const newSkills = unlockCorpSkill(skillId, skills, s.currentTick)
    const stats = calculateUnlockStats(newSkills)

    set({
      player: { ...s.player, cash: s.player.cash - skill.cost },
      corporateSkills: {
        skills: newSkills,
        totalUnlocked: stats.totalUnlocked,
        totalSpent: stats.totalSpent,
      },
    })

    // 현금 흐름 기록
    s.recordCashFlow('SKILL_RESET', -skill.cost, `회사 스킬 해금: ${skill.name}`)

    return { success: true }
  },

  getCorporateEffects: () => {
    const effects = aggregateCorporateEffects(get().corporateSkills.skills)
    // 공격형 프로필: 수수료 -10% 추가 (기존 할인에 가산, cap 0.5 유지)
    if (get().companyProfile.style === 'aggressive') {
      effects.commissionDiscount = Math.min(0.5, effects.commissionDiscount + 0.1)
    }
    return effects
  },

  /* ── Training System ── */
  startTraining: (skillId, traineeIds, instructorId = null) => {
    const s = get()
    const skill = s.corporateSkills.skills[skillId]
    if (!skill) return { success: false, reason: '존재하지 않는 스킬입니다.' }

    const validation = canStartTraining(skill, traineeIds, s.player.employees, s.training.programs, s.player.cash)
    if (!validation.canStart) return { success: false, reason: validation.reason }

    const program = createTrainingProgram(skill, traineeIds, instructorId, s.currentTick)
    const totalCost = calcTrainingCost(program)

    set((st) => ({
      player: {
        ...st.player,
        cash: st.player.cash - totalCost,
        employees: st.player.employees.map((e) =>
          program.traineeIds.includes(e.id)
            ? { ...e, activeTrainingId: program.id }
            : e,
        ),
      },
      training: {
        ...st.training,
        programs: [...st.training.programs, program],
      },
    }))

    s.recordCashFlow('SKILL_RESET', -totalCost, `교육 프로그램: ${program.name}`)
    return { success: true }
  },

  advanceTrainingTick: () => {
    const s = get()
    if (s.training.programs.length === 0) return

    const activePrograms = s.training.programs.filter((p) => p.status === 'in_progress')
    if (activePrograms.length === 0) return

    let updatedPrograms = [...s.training.programs]
    let updatedEmployees = [...s.player.employees]
    let completedDelta = 0
    let graduatedDelta = 0

    for (const program of activePrograms) {
      const { program: advanced, reachedCheckpoint } = advanceTraining(program, s.currentTick)

      // 체크포인트 도달 시 자동 처리
      let finalProgram = advanced
      if (reachedCheckpoint) {
        const trainees = updatedEmployees.filter((e) => program.traineeIds.includes(e.id))
        const result = resolveCheckpoint(advanced, reachedCheckpoint.atProgress, trainees)
        finalProgram = result.program

        // XP/스트레스 적용
        updatedEmployees = updatedEmployees.map((e) => {
          let updated = e
          if (result.xpRewards[e.id]) {
            updated = { ...updated, xp: (updated.xp ?? 0) + result.xpRewards[e.id] }
          }
          if (result.stressChanges[e.id]) {
            updated = { ...updated, stress: Math.min(100, (updated.stress ?? 0) + result.stressChanges[e.id]) }
          }
          return updated
        })
      }

      // 수료 처리
      if (finalProgram.status === 'completed' && program.status === 'in_progress') {
        const skill = s.corporateSkills.skills[finalProgram.targetSkillId]
        if (skill) {
          const passCount = finalProgram.checkpoints.filter((cp) => cp.passed === true).length
          // 졸업 인원은 실제 traineeIds 수로 카운트 (map 외부에서 계산)
          graduatedDelta += finalProgram.traineeIds.length
          updatedEmployees = updatedEmployees.map((e) => {
            if (finalProgram.traineeIds.includes(e.id)) {
              return applyGraduation(e, skill, passCount)
            }
            return e
          })
        }
        completedDelta++
      }

      updatedPrograms = updatedPrograms.map((p) => (p.id === program.id ? finalProgram : p))
    }

    // 오래된 완료 프로그램 정리 (최대 20개 유지)
    const completed = updatedPrograms.filter((p) => p.status === 'completed' || p.status === 'cancelled')
    if (completed.length > 20) {
      const toRemove = completed.slice(0, completed.length - 20).map((p) => p.id)
      updatedPrograms = updatedPrograms.filter((p) => !toRemove.includes(p.id))
    }

    set((st) => ({
      player: { ...st.player, employees: updatedEmployees },
      training: {
        programs: updatedPrograms,
        completedCount: st.training.completedCount + completedDelta,
        totalTraineesGraduated: st.training.totalTraineesGraduated + graduatedDelta,
      },
    }))
  },

  cancelTrainingProgram: (programId) => {
    const s = get()
    const program = s.training.programs.find((p) => p.id === programId)
    if (!program || program.status !== 'in_progress') return

    set((st) => ({
      player: {
        ...st.player,
        employees: st.player.employees.map((e) =>
          e.activeTrainingId === programId ? { ...e, activeTrainingId: null } : e,
        ),
      },
      training: {
        ...st.training,
        programs: st.training.programs.map((p) =>
          p.id === programId ? cancelTraining(p) : p,
        ),
      },
    }))
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
    const prevCash = get().player.cash
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
          hour: s.time.hour,
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

    // Record M&A cashout if player received money
    const cashGained = get().player.cash - prevCash
    if (cashGained > 0) {
      const target = get().companies.find((c) => c.id === deal.targetId)
      get().recordCashFlow('MNA_CASHOUT', cashGained, `${target?.name ?? '인수'} M&A 정산`, { companyId: deal.targetId, ticker: target?.ticker })
    }
  },

  playerAcquireCompany: (targetId: string, premium: number, layoffRate: number) => {
    const state = get()

    // 중복 인수 방지 체크
    if (state.isAcquiring) {
      console.warn('[Player M&A] Already processing an acquisition')
      return
    }

    const target = state.companies.find((c) => c.id === targetId)
    if (!target || target.status !== 'active') {
      console.error('[Player M&A] Target company not found or not active')
      return
    }

    const totalCost = target.marketCap * (1 + premium)
    if (state.player.cash < totalCost) {
      console.error('[Player M&A] Insufficient cash')
      return
    }

    // 쿨다운 체크 (1년 = 360 ticks)
    const ticksSinceLastAcquisition = state.currentTick - state.lastPlayerAcquisitionTick
    if (ticksSinceLastAcquisition < 360 && state.lastPlayerAcquisitionTick > 0) {
      console.warn('[Player M&A] Cooldown not expired (need 1 year gap)')
      return
    }

    // 인수 처리 시작
    set({ isAcquiring: true })

    console.log(
      `[Player M&A] Acquiring ${target.name} for ${(totalCost / 100_000_000).toFixed(0)}억 (${(premium * 100).toFixed(0)}% premium)`,
    )

    // 현금 차감
    set((s) => ({
      player: {
        ...s.player,
        cash: s.player.cash - totalCost,
      },
      lastPlayerAcquisitionTick: s.currentTick,
    }))

    // Record M&A cash flow
    get().recordCashFlow('MNA_ACQUISITION', -totalCost, `${target.name} 인수`, { companyId: targetId, ticker: target.ticker })

    // 인수 실행 (플레이어를 인수자로 표시하기 위해 특수 ID 사용)
    const playerAcquirerId = 'PLAYER'
    const deal: MnaDeal = {
      acquirerId: playerAcquirerId,
      targetId: target.id,
      premium,
      layoffRate,
      dealPrice: target.price * (1 + premium),
      estimatedHeadcountRetained: Math.round((target.headcount ?? 0) * (1 - layoffRate)),
      estimatedHeadcountLaidOff: Math.round((target.headcount ?? 0) * layoffRate),
    }

    // 타깃 회사 상태 변경
    set((s) => ({
      companies: s.companies.map((c) => {
        if (c.id === targetId) {
          return {
            ...c,
            status: 'acquired' as const,
            parentCompanyId: playerAcquirerId,
            acquiredAtTick: s.currentTick,
            headcount: 0,
            mnaHistory: [
              ...(c.mnaHistory ?? []),
              {
                type: 'target' as const,
                otherCompanyId: playerAcquirerId,
                tick: s.currentTick,
                dealPrice: deal.dealPrice,
                headcountImpact: {
                  before: c.headcount ?? 0,
                  after: 0,
                },
              },
            ],
          }
        }
        return c
      }),
    }))

    // 플레이어 인수 히스토리 기록
    set((s) => ({
      playerAcquisitionHistory: [
        ...s.playerAcquisitionHistory,
        {
          companyId: target.id,
          companyName: target.name,
          tick: s.currentTick,
          cost: totalCost,
          premium,
          layoffRate,
        },
      ],
    }))

    // IPO 예약 (동적 import)
    const targetIndex = state.companies.findIndex((c) => c.id === targetId)
    if (targetIndex >= 0) {
      const delayTicks = 180 + Math.random() * 180
      import('../engines/mnaEngine')
        .then(({ generateNewCompany }) => {
          const newCompany = generateNewCompany(target)
          get().scheduleIPO(targetIndex, delayTicks, newCompany)
        })
        .catch((err) => {
          console.error('[Player M&A] Failed to schedule IPO:', err)
        })
    }

    // M&A 뉴스 생성 (동적 import)
    import('../engines/newsEngine')
      .then(({ createMnaNews }) => {
        const currentState = get()
        const news = createMnaNews(
          deal,
          { id: playerAcquirerId, name: '당신', ticker: 'PLAYER', sector: target.sector },
          target,
          currentState.time,
        )
        set((s) => ({
          news: [news, ...s.news],
          unreadNewsCount: s.unreadNewsCount + 1,
        }))
      })
      .catch((err) => {
        console.error('[Player M&A] Failed to generate M&A news:', err)
      })

    // 시장 심리 업데이트 (동적 import)
    import('../engines/sentimentEngine')
      .then(({ onMnaOccurred }) => {
        onMnaOccurred(target.sector, layoffRate > 0.4)
      })
      .catch((err) => {
        console.error('[Player M&A] Failed to update sentiment:', err)
      })

    // 토스트 알림
    set((s) => ({
      officeEvents: [
        ...s.officeEvents,
        {
          timestamp: s.currentTick,
          type: 'player_acquisition',
          emoji: '🤝',
          message: `${target.name} 인수 완료 (${(totalCost / 100_000_000).toFixed(0)}억 원)`,
          employeeIds: [],
          hour: s.time.hour,
        },
      ],
    }))

    soundManager.playClick()

    // 인수 처리 완료
    set({ isAcquiring: false })
  },

  executeKospiIPO: (companyId: string, ipoPrice: number) => {
    set((s) => ({
      companies: s.companies.map((c) => {
        if (c.id !== companyId) return c
        return {
          ...c,
          status: 'active' as const,
          price: ipoPrice,
          previousPrice: ipoPrice,
          basePrice: ipoPrice,
          sessionOpenPrice: ipoPrice,
          priceHistory: [ipoPrice],
          marketCap: ipoPrice * 1_000_000,
        }
      }),
      news: [
        {
          id: `ipo-${companyId}-${s.time.year}`,
          timestamp: { ...s.time },
          headline: `[IPO] ${s.companies.find((c) => c.id === companyId)?.name ?? companyId} 상장!`,
          body: `신규 종목이 KOSPI에 상장되었습니다. 상장가 ${ipoPrice.toLocaleString()}원`,
          isBreaking: true,
          sentiment: 'positive' as const,
        },
        ...s.news,
      ],
      unreadNewsCount: s.unreadNewsCount + 1,
    }))
    console.log(`[KOSPI IPO] ${companyId} 상장 @ ${ipoPrice.toLocaleString()}원`)
  },

  /* ── Auto-sell (Profit-Taking) Actions ── */
  setAutoSellEnabled: (enabled) => set({ autoSellEnabled: enabled }),
  setAutoSellPercent: (percent) => set({ autoSellPercent: Math.max(1, Math.min(100, percent)) }),

  processAutoSell: () => {
    const state = get()
    if (!state.autoSellEnabled || state.autoSellPercent <= 0) return

    const { portfolio } = state.player
    const threshold = state.autoSellPercent

    for (const [companyId, position] of Object.entries(portfolio)) {
      const company = state.companies.find((c) => c.id === companyId)
      if (!company || position.shares <= 0) continue

      const returnPct = ((company.price - position.avgBuyPrice) / position.avgBuyPrice) * 100
      if (returnPct >= threshold) {
        const shares = position.shares
        const ticker = company.ticker

        get().sellStock(companyId, shares)

        set((s) => ({
          officeEvents: [
            ...s.officeEvents,
            {
              timestamp: s.currentTick,
              type: 'auto_sell_executed',
              emoji: '📈',
              message: `자동 익절: ${ticker} +${returnPct.toFixed(1)}% 달성, ${shares}주 매도`,
              employeeIds: [],
              hour: s.time.hour,
            },
          ].slice(-200),
        }))
      }
    }
  },

  /* ── Limit Order Actions ── */
  createLimitOrder: (companyId, targetPrice, shares) => {
    const state = get()
    const position = state.player.portfolio[companyId]

    if (!position || position.shares < shares) {
      console.error('[Limit Order] Insufficient shares')
      return
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const order: LimitOrder = {
      id: orderId,
      companyId,
      type: 'SELL',
      targetPrice,
      shares,
      createdTick: state.currentTick,
    }

    set((s) => ({
      limitOrders: [...s.limitOrders, order],
    }))

    console.log(`[Limit Order] Created: ${shares}주 @${targetPrice.toLocaleString()}원`)
  },

  cancelLimitOrder: (orderId) => {
    set((s) => ({
      limitOrders: s.limitOrders.filter((o) => o.id !== orderId),
    }))
    console.log(`[Limit Order] Cancelled: ${orderId}`)
  },

  processLimitOrders: () => {
    const state = get()
    const { limitOrders, companies, player } = state

    limitOrders.forEach((order) => {
      const company = companies.find((c) => c.id === order.companyId)
      if (!company) return

      const position = player.portfolio[order.companyId]
      if (!position || position.shares < order.shares) {
        // 보유 주식이 부족하면 주문 취소
        get().cancelLimitOrder(order.id)
        return
      }

      // 목표가 달성 체크
      if (order.type === 'SELL' && company.price >= order.targetPrice) {
        console.log(
          `[Limit Order] Triggered: ${company.ticker} ${order.shares}주 @${company.price.toLocaleString()}원`,
        )

        // 자동 매도 실행
        get().sellStock(order.companyId, order.shares)

        // 주문 제거
        get().cancelLimitOrder(order.id)

        // 토스트 알림
        set((s) => ({
          officeEvents: [
            ...s.officeEvents,
            {
              timestamp: s.currentTick,
              type: 'limit_order_executed',
              emoji: '🎯',
              message: `목표가 도달: ${company.name} ${order.shares}주 매도 (${company.price.toLocaleString()}원)`,
              employeeIds: [],
              hour: s.time.hour,
            },
          ].slice(-200),
        }))
      }
    })
  },

  /* ── Competitor Actions ── */
  initializeCompetitors: (count, startingCash) => {
    const competitors = generateCompetitors(count, startingCash)
    set({ competitors, competitorCount: count })
  },

  processCompetitorTick: () => {
    const { competitors, companies, time, playerProfile, personalizationEnabled, circuitBreaker } = get()
    if (competitors.length === 0) return

    // Skip all AI trading during circuit breaker halt
    if (isTradingHalted(circuitBreaker)) return

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

    // Filter out actions targeting VI-halted companies
    const tradableActions = actions.filter((action) => {
      const company = companies.find((c) => c.id === action.companyId)
      return company && !isVIHalted(company)
    })

    // Execute batch actions
    if (tradableActions.length > 0) {
      get().executeBatchActions(tradableActions)
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
            const panicMsg = getRandomTauntFn('panic', state.time.hour, competitor.style)

            newTaunts.push({
              competitorId: competitor.id,
              competitorName: competitor.name,
              message: `${competitor.name}: "${panicMsg}"`,
              type: 'panic',
              timestamp: batchTick,
            })
          }
        }

        // ✨ Core Values: Contextual trade brag (~8% probability)
        if (action.action === 'buy' && Math.random() < 0.08) {
          const company = state.companies.find((c) => c.id === action.companyId)
          const bragMsg = getContextualTradeTaunt(competitor.style, {
            ticker: action.ticker ?? company?.ticker,
            sector: company?.sector,
          })
          if (bragMsg) {
            newTaunts.push({
              competitorId: competitor.id,
              competitorName: competitor.name,
              message: `${competitor.name}: "${bragMsg}"`,
              type: 'trade_brag',
              timestamp: batchTick,
            })
          }
        }

        // ✨ Core Values: 대량 거래 알림 (자산의 15% 이상, 매수/매도 모두)
        if (action.action === 'buy' || action.action === 'sell') {
          const tradeValue = action.quantity * action.price
          const totalAssets = competitor.totalAssetValue || competitor.cash + tradeValue
          if (totalAssets > 0 && tradeValue / totalAssets >= 0.15) {
            const company = state.companies.find((c) => c.id === action.companyId)
            const ticker = action.ticker ?? company?.ticker ?? '???'
            const amountText = tradeValue >= 100_000_000
              ? `${(tradeValue / 100_000_000).toFixed(0)}억`
              : `${(tradeValue / 10_000).toFixed(0)}만`
            const bigMsg = getBigTradeTaunt(competitor.style, { ticker, amount: amountText })
            newTaunts.push({
              competitorId: competitor.id,
              competitorName: competitor.name,
              message: `${competitor.name}: "${action.action === 'sell' ? '[매도] ' : ''}${bigMsg}"`,
              type: 'big_trade',
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
      const priceMap = buildPriceMap(state.companies)
      const newCompetitors = state.competitors.map((competitor) => {
        const portfolioValue = Object.entries(competitor.portfolio).reduce(
          (sum, [companyId, position]) => {
            const currentPrice = priceMap.get(companyId) ?? 0
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

  /* ── Core Values: Rivalry Tracking ── */
  updateRivalryTracking: (competitorName: string, competitorIsAhead: boolean) => {
    set((st) => ({
      competitors: st.competitors.map((c) =>
        c.name === competitorName
          ? {
              ...c,
              headToHeadWins: (c.headToHeadWins ?? 0) + (competitorIsAhead ? 1 : 0),
              headToHeadLosses: (c.headToHeadLosses ?? 0) + (competitorIsAhead ? 0 : 1),
            }
          : c,
      ),
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
    void _source // 향후 확장을 위해 보존 (로그, 분석 등)
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
        const updatedEmp = {
          ...emp,
          level: newLevel,
          xp: currentXP - xpNeeded,
          xpToNextLevel: xpForLevel(newLevel),
          title: newTitle,
          badge: newBadge,
          growthLog: [...(emp.growthLog ?? []), logEntry].slice(-50),
        }

        // ✨ RPG Skill Tree: Grant Skill Points on level up
        grantSkillPointsOnLevelUp(updatedEmp)

        updatedEmployees[empIdx] = updatedEmp

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
    // Note: Badge updates happen in processEmployeeTick when skills actually change
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
        praiseCooldown: 30, // 30-day cooldown (decremented daily in advanceHour)
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
        scoldCooldown: 30, // 30-day cooldown (decremented daily in advanceHour)
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

  /* ── RPG Skill Tree System ── */
  unlockEmployeeSkill: (employeeId, skillId) => {
    let result: { success: boolean; reason?: string } = { success: false, reason: '' }

    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) {
        result = { success: false, reason: '직원을 찾을 수 없습니다' }
        return s
      }

      const emp = s.player.employees[empIdx]

      // Unlock skill (modifies emp in place)
      const unlockResult = unlockSkill(emp, skillId)

      if (!unlockResult.success) {
        result = unlockResult
        return s
      }

      // Update employee in store
      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = { ...emp }

      result = { success: true }
      return { player: { ...s.player, employees: updatedEmployees } }
    })

    return result
  },

  resetEmployeeSkillTree: (employeeId) => {
    let result: { success: boolean; cost: number; reason?: string } = {
      success: false,
      cost: 0,
      reason: '',
    }

    set((s) => {
      const empIdx = s.player.employees.findIndex((e) => e.id === employeeId)
      if (empIdx === -1) {
        result = { success: false, cost: 0, reason: '직원을 찾을 수 없습니다' }
        return s
      }

      const emp = s.player.employees[empIdx]

      // 리셋할 SP가 없는 경우
      if (!emp.progression || emp.progression.spentSkillPoints === 0) {
        result = { success: false, cost: 0, reason: '리셋할 스킬이 없습니다' }
        return s
      }

      // 비용 계산
      const cost = calculateResetCost(emp.progression.level)

      // 현금 부족 확인
      if (s.player.cash < cost) {
        result = {
          success: false,
          cost,
          reason: `현금이 부족합니다 (필요: ${cost.toLocaleString()}원)`,
        }
        return s
      }

      // 스킬 트리 리셋 (SP 환불, 스킬 제거)
      resetSkillTree(emp)

      // 현금 차감
      const newCash = s.player.cash - cost

      // 업데이트
      const updatedEmployees = [...s.player.employees]
      updatedEmployees[empIdx] = { ...emp }

      result = { success: true, cost }
      return {
        player: {
          ...s.player,
          cash: newCash,
          employees: updatedEmployees,
          totalAssetValue: newCash + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })

    if (result.success && result.cost > 0) {
      get().recordCashFlow('SKILL_RESET', -result.cost, `스킬 리셋`, { employeeId })
    }

    return result
  },

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
    const catalogSize = catalog.size ?? { width: 1, height: 1 }
    if (!isSpaceAvailable(x, y, catalogSize, grid)) {
      console.warn('Space not available')
      return false
    }

    // 가구 생성
    const furniture: FurnitureItem = {
      id: `furniture-${Date.now()}-${Math.random()}`,
      type,
      position: { x, y },
      size: catalogSize,
      buffs: catalog.buffs,
      cost: catalog.cost,
      sprite: catalog.sprite,
    }

    set((s) => {
      const grid = s.player.officeGrid!

      // 가구 추가
      grid.furniture.push(furniture)

      // 셀 점유 처리
      for (let dy = 0; dy < catalogSize.height; dy++) {
        for (let dx = 0; dx < catalogSize.width; dx++) {
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

    // 버프 재계산 + 현금 흐름 기록
    get().recalculateGridBuffs()
    get().recordCashFlow('OFFICE_FURNITURE', -catalog.cost, `가구 구매: ${type}`)
    return true
  },

  removeFurniture: (furnitureId) => {
    const preFurniture = get().player.officeGrid?.furniture.find((f) => f.id === furnitureId)

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
    if (preFurniture) {
      const refund = preFurniture.cost * 0.5
      get().recordCashFlow('OFFICE_FURNITURE', refund, `가구 환불: ${preFurniture.type}`)
    }
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
        set((st) => {
          // Training program cleanup: 퇴사 직원을 수강생/강사에서 제거
          const cleanedPrograms = st.training.programs.map((p) => {
            if (p.status !== 'in_progress') return p
            const wasTrainee = p.traineeIds.includes(id)
            const wasInstructor = p.instructorId === id
            if (!wasTrainee && !wasInstructor) return p
            return {
              ...p,
              traineeIds: p.traineeIds.filter((tid) => tid !== id),
              instructorId: wasInstructor ? null : p.instructorId,
            }
          })

          return {
            training: { ...st.training, programs: cleanedPrograms },
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
          }
        })
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

    // ✨ 하루에 1번만 실행 (쿨다운 체크)
    let hrResult: HRAutomationResult
    if (gameDays !== state.lastHRProcessDay) {
      hrResult = processHRAutomation(updatedEmployees, state.player.cash, gameDays)

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

      // 쿨다운 업데이트
      set({ lastHRProcessDay: gameDays })
    } else {
      // 오늘 이미 실행됨 - 직원 상태만 반환 (비용 청구 없음)
      hrResult = { updatedEmployees, cashSpent: 0, reports: [], alerts: [] }
    }

    // 행동 맵 생성
    const behaviorMap: Record<string, string> = {}
    behaviors.forEach((b) => { behaviorMap[b.employeeId] = b.action })

    // ✨ 스킬 변경 직후 뱃지 업데이트 (배치 처리)
    const processedMap = new Map<string, Employee>()
    hrResult.updatedEmployees.forEach((emp) => {
      if (!emp.skills) {
        processedMap.set(emp.id, emp)
      } else {
        const newBadges = generateBadgesFromSkills(emp.skills)
        processedMap.set(emp.id, { ...emp, badges: newBadges })
      }
    })

    // 병합 전략: 틱 처리 결과(stress/stamina/skills/badges)만 적용,
    // 유저 액션 필드(deskId, seatIndex 등)는 현재 상태에서 보존
    set((s) => ({
      player: {
        ...s.player,
        employees: s.player.employees.map((currentEmp) => {
          const processed = processedMap.get(currentEmp.id)
          if (!processed) return currentEmp

          return {
            ...currentEmp,           // 현재 상태 보존 (deskId, seatIndex 등)
            stress: processed.stress,
            satisfaction: processed.satisfaction,
            stamina: processed.stamina,
            maxStamina: processed.maxStamina,
            skills: processed.skills,
            badges: processed.badges,
            sprite: processed.sprite,
          }
        }),
        cash: Math.max(0, s.player.cash - hrResult.cashSpent),
      },
      officeEvents: [...s.officeEvents, ...officeEvents].slice(-200), // Keep last 200
      employeeBehaviors: behaviorMap,
    }))

    // Record HR cash flow
    if (hrResult.cashSpent > 0) {
      get().recordCashFlow('HR_CARE', -hrResult.cashSpent, `HR 자동 관리 비용`)
    }

    // ✨ Training System: 교육 프로그램 진행
    get().advanceTrainingTick()
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

  /* ── Office Dot Layout Actions ── */

  initializeOfficeLayout: () => {
    set((s) => {
      if (s.player.officeLayout) return s // 이미 초기화됨

      const layout = createInitialOfficeLayout()
      return {
        player: {
          ...s.player,
          officeLayout: layout,
        },
      }
    })
  },

  buyDesk: (type: DeskType, x: number, y: number) => {
    // 초기화 후 반드시 최신 상태 재조회 (stale state 방지)
    if (!get().player.officeLayout) {
      get().initializeOfficeLayout()
    }
    const state = get()
    const layout = state.player.officeLayout
    if (!layout) {
      console.error('[buyDesk] officeLayout still null after init')
      return false
    }

    const catalog = DESK_CATALOG[type]
    const { officeLevel, cash } = state.player

    if (layout.desks.length >= layout.maxDesks) {
      console.warn(`[buyDesk] 최대 ${layout.maxDesks}개 도달`)
      return false
    }
    if (catalog.unlockLevel && officeLevel < catalog.unlockLevel) {
      console.warn(`[buyDesk] 레벨 ${catalog.unlockLevel} 필요`)
      return false
    }
    if (cash < catalog.cost) {
      console.warn(`[buyDesk] 자금 부족 (보유: ${cash}, 필요: ${catalog.cost})`)
      return false
    }

    const deskId = `desk_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const newDesk: DeskItem = {
      id: deskId,
      type,
      position: { x, y },
      employeeId: null,
      buffs: catalog.buffs,
      cost: catalog.cost,
      sprite: catalog.sprite,
    }

    set((s) => {
      const currentLayout = s.player.officeLayout
      if (!currentLayout) return s

      return {
        player: {
          ...s.player,
          cash: s.player.cash - catalog.cost,
          officeLayout: {
            ...currentLayout,
            desks: [...currentLayout.desks, newDesk],
          },
          totalAssetValue: s.player.cash - catalog.cost + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })

    console.log(`[buyDesk] ✅ 책상 구매 성공: ${type} at (${x},${y}), id=${deskId}`)
    get().recordCashFlow('OFFICE_FURNITURE', -catalog.cost, `책상 구매: ${type}`)
    // Action feedback toast
    set((s) => ({
      officeEvents: [...s.officeEvents, {
        timestamp: s.currentTick,
        type: 'furniture_placed',
        emoji: '🪑',
        message: `${catalog.sprite ?? type} 배치 완료 — ${catalog.buffs ? '버프 적용 중' : '장식'}`,
        employeeIds: [],
      }].slice(-200),
    }))
    soundManager.playClick()
    return true
  },

  buyDecoration: (type: DecorationType, x: number, y: number) => {
    if (!get().player.officeLayout) {
      get().initializeOfficeLayout()
    }
    const state = get()
    if (!state.player.officeLayout) {
      console.error('[buyDecoration] officeLayout still null after init')
      return false
    }

    const catalog = DECORATION_CATALOG[type]
    const { officeLevel, cash } = state.player

    // 레벨 체크
    if (catalog.unlockLevel && officeLevel < catalog.unlockLevel) {
      console.warn(`Cannot buy decoration: 레벨 ${catalog.unlockLevel} 필요`)
      return false
    }

    // 자금 체크
    if (cash < catalog.cost) {
      console.warn(`Cannot buy decoration: 자금 부족`)
      return false
    }

    // 장식 생성
    const decorationId = `deco_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const newDecoration: DecorationItem = {
      id: decorationId,
      type,
      position: { x, y },
      buffs: catalog.buffs,
      cost: catalog.cost,
      sprite: catalog.sprite,
    }

    set((s) => {
      const currentLayout = s.player.officeLayout
      if (!currentLayout) return s

      return {
        player: {
          ...s.player,
          cash: s.player.cash - catalog.cost,
          officeLayout: {
            ...currentLayout,
            decorations: [...currentLayout.decorations, newDecoration],
          },
          totalAssetValue: s.player.cash - catalog.cost + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })

    get().recordCashFlow('OFFICE_FURNITURE', -catalog.cost, `장식 구매: ${type}`)
    set((s) => ({
      officeEvents: [...s.officeEvents, {
        timestamp: s.currentTick,
        type: 'furniture_placed',
        emoji: '🎨',
        message: `${catalog.sprite ?? type} 장식 배치 — 반경 내 직원 버프 적용`,
        employeeIds: [],
      }].slice(-200),
    }))
    soundManager.playClick()
    return true
  },

  removeDesk: (deskId: string) => {
    const preDesk = get().player.officeLayout?.desks.find((d) => d.id === deskId)

    set((s) => {
      const layout = s.player.officeLayout
      if (!layout) return s

      const desk = layout.desks.find((d) => d.id === deskId)
      if (!desk) return s

      // 책상 제거 및 50% 환불
      const refund = Math.floor(desk.cost * 0.5)
      const updatedDesks = layout.desks.filter((d) => d.id !== deskId)

      // 직원 배치 해제 (이뮤터블)
      const updatedEmployees = desk.employeeId
        ? s.player.employees.map((e) =>
            e.id === desk.employeeId ? { ...e, deskId: null } : e
          )
        : s.player.employees

      return {
        player: {
          ...s.player,
          employees: updatedEmployees,
          cash: s.player.cash + refund,
          officeLayout: { ...layout, desks: updatedDesks },
          totalAssetValue: s.player.cash + refund + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })

    if (preDesk) {
      const refund = Math.floor(preDesk.cost * 0.5)
      get().recordCashFlow('OFFICE_FURNITURE', refund, `책상 환불`)
    }
    soundManager.playClick()
  },

  removeDecoration: (decorationId: string) => {
    const preDecoration = get().player.officeLayout?.decorations.find((d) => d.id === decorationId)

    set((s) => {
      const layout = s.player.officeLayout
      if (!layout) return s

      const decoration = layout.decorations.find((d) => d.id === decorationId)
      if (!decoration) return s

      // 장식 제거 및 50% 환불
      const refund = Math.floor(decoration.cost * 0.5)
      const updatedDecorations = layout.decorations.filter((d) => d.id !== decorationId)

      return {
        player: {
          ...s.player,
          cash: s.player.cash + refund,
          officeLayout: { ...layout, decorations: updatedDecorations },
          totalAssetValue: s.player.cash + refund + calcPortfolioValue(s.player.portfolio, s.companies),
        },
      }
    })

    if (preDecoration) {
      const refund = Math.floor(preDecoration.cost * 0.5)
      get().recordCashFlow('OFFICE_FURNITURE', refund, `장식 환불: ${preDecoration.type}`)
    }
    soundManager.playClick()
  },

  assignEmployeeToDesk: (employeeId: string, deskId: string) => {
    console.log(`[assignEmployeeToDesk] 호출: emp=${employeeId}, desk=${deskId}`)
    const state = get()
    const layout = state.player.officeLayout
    if (!layout) {
      console.error('[assignEmployeeToDesk] ❌ officeLayout 없음')
      return false
    }

    const desk = layout.desks.find((d) => d.id === deskId)
    if (!desk) {
      console.error(`[assignEmployeeToDesk] ❌ 책상 ${deskId} 없음 (desks: ${layout.desks.map(d => d.id).join(',')})`)
      return false
    }

    if (desk.employeeId) {
      console.warn(`[assignEmployeeToDesk] ❌ 책상 이미 배치됨: ${desk.employeeId}`)
      return false
    }

    const employee = state.player.employees.find((e) => e.id === employeeId)
    if (!employee) {
      console.error(`[assignEmployeeToDesk] ❌ 직원 ${employeeId} 없음`)
      return false
    }

    set((s) => {
      const currentLayout = s.player.officeLayout
      if (!currentLayout) return s

      const updatedDesks = currentLayout.desks.map((d) => {
        if (employee.deskId && d.id === employee.deskId) {
          return { ...d, employeeId: null }
        }
        if (d.id === deskId) {
          return { ...d, employeeId }
        }
        return d
      })

      const updatedEmployees = s.player.employees.map((e) =>
        e.id === employeeId ? { ...e, deskId } : e
      )

      return {
        player: {
          ...s.player,
          employees: updatedEmployees,
          officeLayout: { ...currentLayout, desks: updatedDesks },
        },
      }
    })

    console.log(`[assignEmployeeToDesk] ✅ 배치 성공: ${employee.name} → ${deskId}`)
    // Check adjacency for feedback toast
    const updatedLayout = get().player.officeLayout
    if (updatedLayout) {
      const targetDesk = updatedLayout.desks.find((d) => d.id === deskId)
      if (targetDesk) {
        const adjacent = updatedLayout.desks.filter((d) =>
          d.id !== deskId && d.employeeId &&
          Math.abs(d.position.x - targetDesk.position.x) + Math.abs(d.position.y - targetDesk.position.y) <= 80
        )
        const adjNames = adjacent.map((d) => {
          const e = get().player.employees.find((emp) => emp.id === d.employeeId)
          return e?.name
        }).filter(Boolean)
        const adjMsg = adjNames.length > 0
          ? ` — ${adjNames.join(', ')}와(과) 인접 시너지!`
          : ''
        set((s) => ({
          officeEvents: [...s.officeEvents, {
            timestamp: s.currentTick,
            type: 'employee_assigned',
            emoji: '👤',
            message: `${employee.name} 자리 배치 완료${adjMsg}`,
            employeeIds: [employeeId],
          }].slice(-200),
        }))
      }
    }
    soundManager.playClick()
    return true
  },

  unassignEmployeeFromDesk: (employeeId: string) => {
    set((s) => {
      const layout = s.player.officeLayout
      if (!layout) return s

      const employee = s.player.employees.find((e) => e.id === employeeId)
      if (!employee || !employee.deskId) return s

      const employeeDeskId = employee.deskId

      // 이뮤터블 업데이트
      const updatedDesks = layout.desks.map((d) =>
        d.id === employeeDeskId ? { ...d, employeeId: null } : d
      )

      const updatedEmployees = s.player.employees.map((e) =>
        e.id === employeeId ? { ...e, deskId: null } : e
      )

      return {
        player: {
          ...s.player,
          employees: updatedEmployees,
          officeLayout: { ...layout, desks: updatedDesks },
        },
      }
    })

    soundManager.playClick()
  },

  moveDeskPosition: (deskId: string, x: number, y: number) => {
    set((s) => {
      const layout = s.player.officeLayout
      if (!layout) return s

      const updatedDesks = layout.desks.map((d) =>
        d.id === deskId ? { ...d, position: { x, y } } : d
      )

      return {
        player: {
          ...s.player,
          officeLayout: { ...layout, desks: updatedDesks },
        },
      }
    })
  },

  moveDecorationPosition: (decorationId: string, x: number, y: number) => {
    set((s) => {
      const layout = s.player.officeLayout
      if (!layout) return s

      const updatedDecorations = layout.decorations.map((d) =>
        d.id === decorationId ? { ...d, position: { x, y } } : d
      )

      return {
        player: {
          ...s.player,
          officeLayout: { ...layout, decorations: updatedDecorations },
        },
      }
    })
  },
}))

/* ── Helper ── */
function buildPriceMap(companies: Company[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const c of companies) map.set(c.id, c.price)
  return map
}

function calcPortfolioValue(
  portfolio: Record<string, PortfolioPosition>,
  companiesOrMap: Company[] | Map<string, number>,
): number {
  const priceMap =
    companiesOrMap instanceof Map ? companiesOrMap : buildPriceMap(companiesOrMap)
  let total = 0
  for (const pos of Object.values(portfolio)) {
    const price = priceMap.get(pos.companyId)
    if (price !== undefined) total += price * pos.shares
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

/* ── AI Architect Actions (Week 4 Integration) ── */

import { generateOptimalLayout } from '../systems/aiArchitect'

// AI 배치 제안 생성
function generateAIProposalAction(maxMoves: number = 999, maxPurchases: number = 999) {
  const s = useGameStore.getState()
  if (!s.player.officeGrid) return

  try {
    const proposal = generateOptimalLayout(
      s.player.employees,
      s.player.officeGrid,
      s.player.cash,
      0.1, // 예산 10%
      maxMoves, // 최대 이동 제안 수
      maxPurchases, // 최대 가구 구매 제안 수
    )

    useGameStore.setState({ aiProposal: proposal })
  } catch (error) {
    console.error('AI 제안 생성 실패:', error)
    useGameStore.setState({ aiProposal: null })
  }
}

// AI 제안 적용
function applyAIProposalAction() {
  const s = useGameStore.getState()
  const proposal = s.aiProposal

  if (!proposal || !s.player.officeGrid) {
    console.warn('적용할 AI 제안이 없습니다')
    return
  }

  const gridWidth = s.player.officeGrid.size.width

  // 인덱스를 (x, y) 좌표로 변환
  const indexToCoord = (index: number) => {
    const x = index % gridWidth
    const y = Math.floor(index / gridWidth)
    return { x, y }
  }

  // 1. 직원 이동 및 배치
  proposal.moves.forEach((move) => {
    if (move.from === -1) {
      // ✨ 미배치 직원: 신규 배치
      const coord = indexToCoord(move.to)
      s.assignEmployeeSeat(move.employeeId, coord.x, coord.y)
    } else {
      // 기존 직원 이동
      // 기존 자리 해제
      s.unassignEmployeeSeat(move.employeeId)
      // 새 자리 배정
      const coord = indexToCoord(move.to)
      s.assignEmployeeSeat(move.employeeId, coord.x, coord.y)
    }
  })

  // 2. 가구 구매 및 배치
  proposal.purchases.forEach((purchase) => {
    const totalCost = purchase.cost

    // 자금 확인
    if (s.player.cash >= totalCost) {
      s.placeFurniture(purchase.type, purchase.x, purchase.y)
      // placeFurniture에서 이미 cash 차감함
    } else {
      console.warn(`가구 구매 실패: 자금 부족 (${purchase.type})`)
    }
  })

  // 3. 사운드 재생
  import('../systems/soundManager').then(({ soundManager }) => {
    soundManager.playAIApprove()
  })

  // 4. 제안 초기화
  useGameStore.setState({ aiProposal: null })
}

// AI 제안 거절
function rejectAIProposalAction() {
  useGameStore.setState({ aiProposal: null })
}

/* ── Office Dot Layout System ── */

/**
 * 빈 도트 사무실 레이아웃 생성
 */
function createInitialOfficeLayout(): OfficeLayout {
  return {
    desks: [],
    decorations: [],
    maxDesks: 7, // CEO 1 + Analyst 2 + Manager 2 + Trader 2
    canvasSize: { width: 600, height: 400 },
  }
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

/* ── Core Type Definitions ── */

export interface PricePoint {
  tick: number
  price: number
}

export interface Company {
  id: string
  name: string
  ticker: string
  sector: Sector
  price: number
  previousPrice: number
  basePrice: number // Initial/reference price for GBM
  priceHistory: number[]
  volatility: number // sigma for GBM
  drift: number // mu for GBM
  marketCap: number
  description: string
  eventSensitivity?: Record<string, number> // 이벤트 카테고리별 감응도 (1.0 = 기본)
}

export type Sector =
  | 'tech'
  | 'finance'
  | 'energy'
  | 'healthcare'
  | 'consumer'
  | 'industrial'
  | 'telecom'
  | 'materials'
  | 'utilities'
  | 'realestate'

export interface PortfolioPosition {
  companyId: string
  shares: number
  avgBuyPrice: number
}

export interface PlayerState {
  cash: number
  totalAssetValue: number
  portfolio: Record<string, PortfolioPosition>
  monthlyExpenses: number
  employees: Employee[]
  officeLevel: number // 1-3, affects max employees and stamina recovery
  officeGrid?: import('./office').OfficeGrid // ✨ Sprint 2: Office Grid (선택적)
  lastDayChange: number // Yesterday's asset value change percentage
  previousDayAssets: number // Asset value at previous day start for change calculation
}

export interface Employee {
  id: string
  name: string
  role: EmployeeRole
  salary: number
  stamina: number // 0-100
  maxStamina: number
  sprite: EmployeeSpriteState
  hiredMonth: number // month number since start
  bonus: EmployeeBonus

  // ✨ RPG System - Sprint 1 (선택적 속성으로 하위 호환성 유지)
  traits?: EmployeeTrait[] // 성격 태그 (1-2개)
  seatIndex?: number | null // 그리드 좌표 (null = 미배치)
  stress?: number // 스트레스 (0-100)
  satisfaction?: number // 만족도 (0-100)
  skills?: EmployeeSkills // 스킬 스탯

  // ✨ Trade AI Pipeline
  assignedSectors?: import('./trade').AssignedSector[] // Analyst 담당 섹터 (1-2개)

  // ✨ Growth System - Sprint 3
  level?: number // 1-30+ (default 1)
  xp?: number // 현재 경험치 (default 0)
  xpToNextLevel?: number // 다음 레벨 필요 XP
  title?: EmployeeTitle // 직급 타이틀
  badge?: BadgeType // 뱃지 등급
  growthLog?: GrowthLogEntry[] // 성장 일지
  praiseCooldown?: number // 칭찬 쿨다운 (게임 일 기준)
  scoldCooldown?: number // 꾸짖기 쿨다운 (게임 일 기준)
  mood?: number // 기분 (0-100, default 50)
}

/* ── Employee Growth System Types ── */
export type EmployeeTitle = 'intern' | 'junior' | 'senior' | 'master'
export type BadgeType = 'gray' | 'blue' | 'purple' | 'gold'

export interface GrowthLogEntry {
  day: number // 게임 내 일 수
  event: 'LEVEL_UP' | 'SKILL_UNLOCK' | 'ACHIEVEMENT' | 'PRAISED' | 'SCOLDED'
  description: string
}

export interface LevelUpEvent {
  employeeId: string
  employeeName: string
  newLevel: number
  newTitle?: EmployeeTitle
  newBadge?: BadgeType
  unlockedSkill?: string
}

export type EmployeeRole = 'analyst' | 'trader' | 'manager' | 'intern' | 'ceo' | 'hr_manager'

export interface HRReport {
  id: string
  employeeId: string
  issue: 'high_stress' | 'low_satisfaction' | 'skill_gap'
  severity: 'low' | 'medium' | 'high'
  recommendation: string
  timestamp: number
}

export type EmployeeSpriteState = 'idle' | 'typing' | 'exhausted'

/* ── Employee Trait System ── */
export type EmployeeTrait =
  | 'nocturnal' // 야행성
  | 'caffeine_addict' // 카페인 중독
  | 'sensitive' // 예민함
  | 'workaholic' // 워커홀릭
  | 'perfectionist' // 완벽주의자
  | 'social' // 사교적
  | 'introvert' // 내향적
  | 'tech_savvy' // 기술 능숙
  | 'risk_averse' // 위험 회피
  | 'ambitious' // 야심가

export interface EmployeeSkills {
  analysis: number // 분석 능력 (0-100)
  trading: number // 거래 속도 (0-100)
  research: number // 리서치 품질 (0-100)
}

export interface TraitEffect {
  // 직접 효과
  staminaRecovery?: number // 스태미너 회복 속도 배율
  stressGeneration?: number // 스트레스 생성 속도 배율
  skillGrowth?: number // 스킬 성장 속도 배율

  // 조건부 효과
  nightShiftBonus?: number // 야간 근무 효율
  morningPenalty?: number // 오전 패널티
  noiseIntolerance?: number // 소음 민감도

  // 요구사항
  requiresCoffee?: boolean // 커피머신 필요
  requiresQuiet?: boolean // 조용한 환경 필요
  salaryMultiplier?: number // 월급 배율
}

export interface TraitConfig {
  name: string
  description: string
  icon: string
  effects: TraitEffect
  rarity: 'common' | 'uncommon' | 'rare'
}

export interface EmployeeBonus {
  driftBoost: number
  volatilityReduction: number
  tradingDiscount: number
  staminaRecovery: number
}

export const EMPLOYEE_ROLE_CONFIG: Record<
  EmployeeRole,
  {
    title: string
    baseSalary: number
    maxStamina: number
    bonus: EmployeeBonus
  }
> = {
  intern: {
    title: '인턴',
    baseSalary: 500_000,
    maxStamina: 60,
    bonus: { driftBoost: 0.001, volatilityReduction: 0, tradingDiscount: 0, staminaRecovery: 15 },
  },
  analyst: {
    title: '애널리스트',
    baseSalary: 2_000_000,
    maxStamina: 80,
    bonus: {
      driftBoost: 0.005,
      volatilityReduction: 0.02,
      tradingDiscount: 0,
      staminaRecovery: 10,
    },
  },
  trader: {
    title: '트레이더',
    baseSalary: 3_000_000,
    maxStamina: 70,
    bonus: { driftBoost: 0, volatilityReduction: 0, tradingDiscount: 0.1, staminaRecovery: 8 },
  },
  manager: {
    title: '매니저',
    baseSalary: 5_000_000,
    maxStamina: 90,
    bonus: {
      driftBoost: 0.003,
      volatilityReduction: 0.03,
      tradingDiscount: 0.05,
      staminaRecovery: 12,
    },
  },
  ceo: {
    title: 'CEO',
    baseSalary: 10_000_000,
    maxStamina: 100,
    bonus: {
      driftBoost: 0.01,
      volatilityReduction: 0.05,
      tradingDiscount: 0.15,
      staminaRecovery: 5,
    },
  },
  hr_manager: {
    title: 'HR 매니저',
    baseSalary: 5_000_000,
    maxStamina: 85,
    bonus: {
      driftBoost: 0,
      volatilityReduction: 0,
      tradingDiscount: 0,
      staminaRecovery: 15,
    },
  },
}

export interface GameTime {
  year: number
  quarter: number // 1-4 (data-model spec)
  month: number // 1-12
  day: number // 1-30
  tick: number // ticks within a day
  speed: GameSpeed
  isPaused: boolean
}

export type GameSpeed = 1 | 2 | 4

export const EventType = {
  Economic: 'Economic',
  Political: 'Political',
  Natural: 'Natural',
  Tech: 'Tech',
  Social: 'Social',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]

export type EventSource = 'random' | 'historical' | 'procedural' | 'chained' | 'aftereffect'

export type EventCategory =
  | 'policy'
  | 'global'
  | 'sector'
  | 'company'
  | 'boom'
  | 'crash'
  | 'earnings'
  | 'scandal'
  | 'innovation'
  | 'regulation'
  | 'macro'
  | 'social'

export interface MarketEvent {
  id: string
  title: string
  description: string
  type: 'boom' | 'crash' | 'sector' | 'company' | 'policy' | 'global'
  eventType?: EventType // data-model spec category
  impact: EventImpact
  duration: number // in ticks
  remainingTicks: number
  affectedSectors?: Sector[]
  affectedCompanies?: string[]
  // Event tracking fields
  startTimestamp: GameTime
  priceImpactSnapshot?: Record<
    string,
    {
      priceBefore: number
      peakChange: number
      currentChange: number
    }
  >
  // Enhanced event system fields
  source?: EventSource
  chainParentId?: string // parent event ID for chained events
  historicalYear?: number // original year for historical events
  propagationPhase?: number // 0-1, how much of the effect is applied
}

export interface EventImpact {
  driftModifier: number
  volatilityModifier: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface WindowState {
  id: string
  type: WindowType
  title: string
  x: number
  y: number
  width: number
  height: number
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  props?: Record<string, unknown>
  preMaximize?: { x: number; y: number; width: number; height: number }
}

export type WindowType =
  | 'portfolio'
  | 'chart'
  | 'trading'
  | 'news'
  | 'office'
  | 'office_history'
  | 'employee_detail'
  | 'ranking'
  | 'settings'
  | 'ending'

export type WindowLayoutPreset = 'trading' | 'analysis' | 'dashboard'

export type NewsSentiment = 'positive' | 'negative' | 'neutral'

export interface NewsItem {
  id: string
  timestamp: GameTime
  headline: string
  body: string
  eventId?: string
  isBreaking: boolean
  sentiment: NewsSentiment
  // Impact tracking fields
  relatedCompanies?: string[]
  impactSummary?: string
}

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface DifficultyConfig {
  startYear: number
  endYear: number
  initialCash: number
  maxCompanies: number
  eventChance: number // per-tick event probability
  volatilityMultiplier: number // global volatility multiplier
  employeeSalaryMultiplier: number // salary cost multiplier
  staminaDrainMultiplier: number // how fast employees get tired
}

export interface GameConfig {
  difficulty: Difficulty
  startYear: number
  endYear: number
  initialCash: number
  maxCompanies: number
  targetAsset: number
}

export interface VictoryGoal {
  id: string
  label: string
  icon: string
  targetAsset: number
  description: string
}

export interface EndingScenario {
  id: string
  type: 'billionaire' | 'retirement' | 'bankrupt' | 'legend' | 'survivor'
  title: string
  description: string
  condition: (player: PlayerState, time: GameTime, config: GameConfig) => boolean
}

export interface LeaderboardEntry {
  rank: number
  playerName: string
  finalAssets: number
  endingType: string
  difficulty: Difficulty
  timestamp: number
}

/* ── Save/Load types for IndexedDB ── */
export interface SaveData {
  version: number
  timestamp: number
  config: GameConfig
  time: GameTime
  player: PlayerState
  companies: Array<{ id: string; price: number; previousPrice: number; priceHistory: number[] }>
  events: MarketEvent[]
  news: NewsItem[]
  competitors?: Competitor[] // Optional for backward compatibility
  competitorCount?: number
  proposals?: import('./trade').TradeProposal[] // Trade AI Pipeline (optional for backward compat)
  lastProcessedMonth?: number // Monthly processing tracking
}

/* ── Investment Battle Mode Types ── */

export type TradingStyle = 'aggressive' | 'conservative' | 'trend-follower' | 'contrarian'

export interface Competitor {
  id: string
  name: string
  avatar: string // Path to pixel art avatar
  style: TradingStyle
  cash: number
  portfolio: Record<string, PortfolioPosition>
  totalAssetValue: number
  roi: number // (current - initial) / initial * 100
  initialAssets: number
  lastDayChange: number // Yesterday's ROI - Today's ROI
  panicSellCooldown: number // Ticks until next panic sell possible
}

export interface CompetitorAction {
  competitorId: string
  action: 'buy' | 'sell' | 'panic_sell'
  symbol: string
  quantity: number
  price: number
  timestamp: number
}

export interface TauntMessage {
  competitorId: string
  competitorName: string
  message: string
  type: 'rank_up' | 'rank_down' | 'overtake_player' | 'panic' | 'champion'
  timestamp: number
}

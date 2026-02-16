/* ── Core Type Definitions ── */

export interface PricePoint {
  hour: number
  price: number
}

/* ── Institutional Investor System Types ── */

// 재무 데이터 (펀더멘털)
export interface Financials {
  revenue: number // 연 매출액 (억 원)
  netIncome: number // 연 순이익 (억 원, 음수 가능)
  debtRatio: number // 부채비율 (0.5 ~ 3.0, 높을수록 위험)
  growthRate: number // 성장률 (-0.3 ~ 0.5, drift 조정에 사용)
  eps: number // 주당순이익 (정보성)
}

// 기관 수급 데이터
export interface InstitutionalFlow {
  netBuyVolume: number // 순매수량 (양수: 매수우위, 음수: 매도우위)
  topBuyers: string[] // 주요 매수 기관명 (최대 3개)
  topSellers: string[] // 주요 매도 기관명 (최대 3개)
  institutionalOwnership: number // 기관 보유 비중 (0.0 ~ 1.0, 정보성)
}

// 기관 투자자
export interface Institution {
  id: string
  name: string
  type: 'HedgeFund' | 'Pension' | 'Bank' | 'Algorithm'
  riskAppetite: number // 위험 선호도 (0.0 ~ 1.0, 높을수록 변동성 큰 주식 선호)
  capital: number // 운용 자산 (10억 ~ 100억)
  algoStrategy?: 'momentum' | 'meanReversion' | 'volatility' // 알고리즘 전략 (Algorithm 타입만)
  tradeCooldowns?: Record<string, number> // 거래 쿨다운 { companyId: expiryTick }
}

export interface Company {
  id: string
  name: string
  ticker: string
  sector: Sector
  price: number
  previousPrice: number
  basePrice: number // Initial/reference price for GBM (also used as IPO price for absolute bounds)
  sessionOpenPrice: number // Session open price for daily price limits (updated at market open)
  priceHistory: number[]
  volatility: number // sigma for GBM
  drift: number // mu for GBM
  marketCap: number
  description: string
  eventSensitivity?: Record<string, number> // 이벤트 카테고리별 감응도 (1.0 = 기본)
  financials: Financials // 재무 데이터
  institutionFlow: InstitutionalFlow // 기관 수급
  institutionFlowHistory?: number[] // 최근 10일 기관 순매수량 추이
  accumulatedInstitutionalShares?: number // 누적 기관 매수 주식 수 (보유 비중 계산용)
  regimeVolatilities?: RegimeVolatilities // 레짐별 변동성 (선택적 for backward compat)
  // VI (Volatility Interruption) fields
  viTriggered?: boolean // VI 발동 중 여부
  viCooldown?: number // VI 쿨다운 (남은 틱 수)
  viRecentPrices?: number[] // 최근 3 ticks 가격 (VI 감지용)
  // M&A 시스템 필드
  status?: 'active' | 'acquired' | 'delisted' // 회사 상태
  parentCompanyId?: string | null // 인수한 회사 ID (없으면 null)
  acquiredAtTick?: number | null // 인수된 게임 틱
  headcount?: number // 회사 전체 직원 수 (대략적 규모)
  layoffRateOnAcquisition?: number // 인수 시 해고 비율 (0~1)
  mnaHistory?: MnaHistoryEntry[] // M&A 이력
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
  hour: number // 9-18 (영업시간)
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
  | 'institutional'
  | 'proposals'
  | 'acquisition'

export type WindowLayoutPreset =
  | 'trading'
  | 'analysis'
  | 'dashboard'
  | 'ai-trading'
  | 'institutional'
  | 'comprehensive'

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
  currentTick?: number // Game tick counter (optional for backward compat)
  player: PlayerState
  companies: Array<{ id: string; price: number; previousPrice: number; priceHistory: number[] }>
  events: MarketEvent[]
  news: NewsItem[]
  competitors?: Competitor[] // Optional for backward compatibility
  competitorCount?: number
  proposals?: import('./trade').TradeProposal[] // Trade AI Pipeline (optional for backward compat)
  lastProcessedMonth?: number // Monthly processing tracking
  institutions?: Institution[] // Institutional investors (optional for backward compat)
  // Market Regime System
  marketRegime?: RegimeState
  marketIndexHistory?: number[]
  // Korean Price Limit System
  circuitBreaker?: import('../engines/circuitBreakerEngine').CircuitBreakerState
  // Personalization System (v3.1)
  playerEventLog?: import('./personalization').PlayerEvent[]
  playerProfile?: import('./personalization').PlayerProfile
  personalizationEnabled?: boolean
  // M&A System (v5)
  lastMnaQuarter?: number
  pendingIPOs?: Array<{ slotIndex: number; spawnTick: number; newCompany: Company }>
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
  isMirrorRival?: boolean // True if this competitor mirrors player behavior
}

export interface CompetitorAction {
  competitorId: string
  action: 'buy' | 'sell' | 'panic_sell'
  companyId: string
  ticker?: string // display only
  quantity: number
  price: number
  timestamp: number
}

export interface OrderFlow {
  buyNotional: number
  sellNotional: number
  netNotional: number // buy - sell
  tradeCount: number
}

export interface TauntMessage {
  competitorId: string
  competitorName: string
  message: string
  type: 'rank_up' | 'rank_down' | 'overtake_player' | 'panic' | 'champion'
  timestamp: number
}

/* ── Market Regime System (HMM-based) ── */
export type MarketRegime = 'CALM' | 'VOLATILE' | 'CRISIS'

export interface RegimeState {
  current: MarketRegime
  duration: number // hours in current regime
  transitionProb: Record<MarketRegime, number> // next regime probabilities
}

export interface RegimeVolatilities {
  CALM: number // 평시 변동성 (기존의 50%)
  VOLATILE: number // 고변동 구간 (기존 값 유지)
  CRISIS: number // 위기 수준 (기존의 2배)
}

/* ── M&A System Types ── */
export interface MnaHistoryEntry {
  type: 'acquirer' | 'target'
  otherCompanyId: string
  tick: number
  dealPrice: number
  headcountImpact?: { before: number; after: number }
}

/* ── Player Acquisition Types ── */

export interface AcquisitionTarget {
  company: Company
  premium: number // 최소 프리미엄 (0.3 = 30%)
  totalCost: number // 인수 총 비용
  riskScore: number // 리스크 점수 (0-100, 낮을수록 안전)
  synergy: number // 시너지 점수 (0-100, 높을수록 좋음)
  expectedLayoffRate: number // 예상 해고율
}

export interface PlayerAcquisitionHistory {
  companyId: string
  companyName: string
  tick: number
  cost: number
  premium: number
  layoffRate: number
}

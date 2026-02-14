/* ── Core Type Definitions ── */

export interface Company {
  id: string
  name: string
  ticker: string
  sector: Sector
  price: number
  previousPrice: number
  priceHistory: number[]
  volatility: number // sigma for GBM
  drift: number // mu for GBM
  marketCap: number
  description: string
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
}

export type EmployeeRole = 'analyst' | 'trader' | 'manager' | 'intern' | 'ceo'

export type EmployeeSpriteState = 'idle' | 'typing' | 'exhausted'

export interface EmployeeBonus {
  driftBoost: number
  volatilityReduction: number
  tradingDiscount: number
  staminaRecovery: number
}

export const EMPLOYEE_ROLE_CONFIG: Record<EmployeeRole, {
  title: string
  baseSalary: number
  maxStamina: number
  bonus: EmployeeBonus
}> = {
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
    bonus: { driftBoost: 0.005, volatilityReduction: 0.02, tradingDiscount: 0, staminaRecovery: 10 },
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
    bonus: { driftBoost: 0.003, volatilityReduction: 0.03, tradingDiscount: 0.05, staminaRecovery: 12 },
  },
  ceo: {
    title: 'CEO',
    baseSalary: 10_000_000,
    maxStamina: 100,
    bonus: { driftBoost: 0.01, volatilityReduction: 0.05, tradingDiscount: 0.15, staminaRecovery: 5 },
  },
}

export interface GameTime {
  year: number
  month: number // 1-12
  day: number // 1-30
  tick: number // ticks within a day
  speed: GameSpeed
  isPaused: boolean
}

export type GameSpeed = 1 | 2 | 4

export interface MarketEvent {
  id: string
  title: string
  description: string
  type: 'boom' | 'crash' | 'sector' | 'company' | 'policy' | 'global'
  impact: EventImpact
  duration: number // in ticks
  remainingTicks: number
  affectedSectors?: Sector[]
  affectedCompanies?: string[]
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
}

export type WindowType =
  | 'portfolio'
  | 'chart'
  | 'trading'
  | 'news'
  | 'office'
  | 'ranking'
  | 'settings'

export type NewsSentiment = 'positive' | 'negative' | 'neutral'

export interface NewsItem {
  id: string
  timestamp: GameTime
  headline: string
  body: string
  eventId?: string
  isBreaking: boolean
  sentiment: NewsSentiment
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
}

export interface EndingScenario {
  id: string
  type: 'billionaire' | 'retirement' | 'bankrupt' | 'legend' | 'survivor'
  title: string
  description: string
  condition: (player: PlayerState, time: GameTime) => boolean
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
}

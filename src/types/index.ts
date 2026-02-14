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
}

export type EmployeeRole = 'analyst' | 'trader' | 'manager' | 'intern' | 'ceo'

export type EmployeeSpriteState = 'idle' | 'typing' | 'exhausted'

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

export interface NewsItem {
  id: string
  timestamp: GameTime
  headline: string
  body: string
  eventId?: string
  isBreaking: boolean
}

export type Difficulty = 'easy' | 'normal' | 'hard'

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

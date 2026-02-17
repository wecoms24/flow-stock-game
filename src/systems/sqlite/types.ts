/* ── SQLite Row Type Definitions ── */

import type { Difficulty } from '../../types'

// Re-export types for transformers.ts (these are used in JSON.parse/stringify operations)
export type {
  GameTime,
  PortfolioPosition,
  MarketEvent,
  NewsItem,
  Competitor,
  Company,
  Employee,
  Institution,
} from '../../types'
export type { TradeProposal } from '../../types/trade'
export type { RegimeState } from '../../types'
export type { CircuitBreakerState } from '../../engines/circuitBreakerEngine'

/* ── Main Save Slot Table ── */

export interface SaveRow {
  id: number
  slot_name: string
  schema_version: number
  created_at: number
  updated_at: number

  // Game config
  difficulty: Difficulty
  start_year: number
  end_year: number
  initial_cash: number

  // Game time
  current_tick: number
  year: number
  quarter: number
  month: number
  day: number
  hour: number
  speed: 1 | 2 | 4
  is_paused: 0 | 1

  // Player state
  player_cash: number
  player_total_assets: number
  player_monthly_expenses: number
  player_office_level: number
  player_portfolio: string // JSON: Record<companyId, PortfolioPosition>
  player_office_grid: string | null // JSON: OfficeGrid (legacy)
  player_office_layout: string | null // JSON: OfficeLayout (new)
  player_last_day_change: number
  player_previous_day_assets: number

  // System state
  last_processed_month: number
  last_mna_quarter: number
  auto_sell_enabled: 0 | 1
  auto_sell_percent: number | null

  // JSON columns for complex objects
  market_regime: string | null // JSON: RegimeState
  market_index_history: string | null // JSON: number[]
  circuit_breaker: string | null // JSON: CircuitBreakerState

  // v6: Cash Flow Tracking
  cash_flow_log: string | null // JSON: CashFlowEntry[]
  realized_trades: string | null // JSON: RealizedTrade[]
  monthly_summaries: string | null // JSON: MonthlySummary[]
}

/* ── Relation Tables (1:N) ── */

export interface CompanyRow {
  id: number
  save_id: number
  company_id: string
  name: string
  ticker: string
  sector: string
  price: number
  previous_price: number
  base_price: number
  session_open_price: number
  volatility: number
  drift: number
  market_cap: number
  description: string
  status: 'active' | 'acquired' | 'delisted'
  parent_company_id: string | null
  acquired_at_tick: number | null
  headcount: number
  layoff_rate_on_acquisition: number

  // JSON columns
  price_history: string // JSON: number[]
  financials: string // JSON: Financials
  institution_flow: string // JSON: InstitutionalFlow
  institution_flow_history: string | null // JSON: number[]
  accumulated_institutional_shares: number | null
  regime_volatilities: string | null // JSON: RegimeVolatilities
  event_sensitivity: string | null // JSON: Record<string, number>
  mna_history: string // JSON: MnaHistoryEntry[]
  vi_triggered: 0 | 1
  vi_cooldown: number
  vi_recent_prices: string | null // JSON: number[]
}

export interface EmployeeRow {
  id: number
  save_id: number
  employee_id: string
  name: string
  role: string
  salary: number
  stamina: number
  max_stamina: number
  sprite: string
  hired_month: number
  stress: number
  satisfaction: number
  level: number
  xp: number
  xp_to_next_level: number
  title: string
  badge: string
  seat_index: number | null
  desk_id: string | null
  praise_cooldown: number | null
  scold_cooldown: number | null
  mood: number

  // JSON columns
  bonus: string // JSON: EmployeeBonus
  traits: string | null // JSON: EmployeeTrait[]
  skills: string // JSON: EmployeeSkills
  badges: string | null // JSON: SkillBadge[]
  assigned_sectors: string | null // JSON: AssignedSector[]
  growth_log: string | null // JSON: GrowthLogEntry[]
  progression: string | null // JSON: EmployeeProgression
  unlocked_skills: string | null // JSON: string[]
}

export interface CompetitorRow {
  id: number
  save_id: number
  competitor_id: string
  name: string
  avatar: string
  style: string
  cash: number
  total_asset_value: number
  roi: number
  initial_assets: number
  last_day_change: number
  panic_sell_cooldown: number
  is_mirror_rival: 0 | 1

  // JSON columns
  portfolio: string // JSON: Record<string, PortfolioPosition>
}

export interface MarketEventRow {
  id: number
  save_id: number
  event_id: string
  title: string
  description: string
  type: string
  event_type: string | null
  duration: number
  remaining_ticks: number
  source: string | null
  chain_parent_id: string | null
  historical_year: number | null
  propagation_phase: number | null

  // JSON columns
  impact: string // JSON: EventImpact
  affected_sectors: string | null // JSON: Sector[]
  affected_companies: string | null // JSON: string[]
  start_timestamp: string // JSON: GameTime
  price_impact_snapshot: string | null // JSON: Record<string, {...}>
}

export interface NewsItemRow {
  id: number
  save_id: number
  news_id: string
  headline: string
  body: string
  event_id: string | null
  is_breaking: 0 | 1
  sentiment: string

  // JSON columns
  timestamp: string // JSON: GameTime
  related_companies: string | null // JSON: string[]
  impact_summary: string | null
}

export interface TradeProposalRow {
  id: number
  save_id: number
  proposal_id: string
  company_id: number | null // FK to companies.id
  ticker: string
  direction: string // 'buy' | 'sell'
  quantity: number
  target_price: number
  confidence: number
  created_by_employee_id: number | null // FK to employees.id
  reviewed_by_employee_id: number | null // FK to employees.id
  executed_by_employee_id: number | null // FK to employees.id
  status: string
  created_at: number
  reviewed_at: number | null
  executed_at: number | null
  executed_price: number | null
  slippage: number | null
  is_mistake: number // 0 | 1
  reject_reason: string | null
}

export interface InstitutionRow {
  id: number
  save_id: number
  institution_id: string
  name: string
  type: string
  risk_appetite: number
  capital: number
  algo_strategy: string | null

  // JSON columns
  trade_cooldowns: string | null // JSON: Record<string, number>
}

export interface PendingIPORow {
  id: number
  save_id: number
  slot_index: number
  spawn_tick: number

  // JSON column (entire Company object)
  new_company: string // JSON: Company
}

/* ── Helper Types ── */

export interface SaveSlotInfo {
  id: number
  slot_name: string
  updated_at: number
  player_cash: number
  year: number
  month: number
  difficulty: Difficulty
  player_total_assets: number
}

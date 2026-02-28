/**
 * Endgame Recap Types
 *
 * 30년 회고 시스템을 위한 타입 정의
 */

export type InvestmentStyle = 'aggressive' | 'balanced' | 'conservative' | 'dividend'

export interface KeyTimelineEvent {
  year: number
  month: number
  title: string
  description: string
  icon: string
  impact: 'positive' | 'negative' | 'neutral'
}

export interface StarEmployee {
  id: string
  name: string
  role: string
  monthsEmployed: number
  totalPnlContribution: number
  bestTradeTicker: string
  bestTradeProfit: number
  finalLevel: number
  testimonial: string
  milestoneCount: number
}

export interface CompetitorResult {
  id: string
  name: string
  style: string
  roi: number
  rank: number
  headToHeadWins: number
  headToHeadLosses: number
  finalQuote: string
  styleIcon: string
}

export interface SectorAnalysis {
  sector: string
  tradeCount: number
  totalPnl: number
  winRate: number
  avgHoldTicks: number
  concentration: number
}

export interface TimingAnalysis {
  buyLowRate: number
  sellHighRate: number
  panicSellCount: number
  panicHoldCount: number
  crisisROI: number
}

export interface RiskBehavior {
  label: string
  evidence: string[]
  riskScore: number
}

export interface DecisionAnalysis {
  sectorBreakdown: SectorAnalysis[]
  timing: TimingAnalysis
  riskBehavior: RiskBehavior
  personalInsight: string
}

export interface TurningPoint {
  year: number
  month: number
  type: 'first_billion' | 'first_master' | 'rank_1' | 'flywheel' | 'hedgehog'
  label: string
  value?: number
}

export interface EndgameRecap {
  // Summary
  finalAssets: number
  totalROI: number
  investmentStyle: InvestmentStyle
  playYears: number
  startYear: number
  endYear: number

  // Timeline
  keyEvents: KeyTimelineEvent[]
  bestYear: { year: number; roi: number } | null
  worstYear: { year: number; roi: number } | null
  totalTradesExecuted: number

  // Employees
  starEmployees: StarEmployee[]
  totalEmployeesEverHired: number
  currentEmployeeCount: number
  longestTenureEmployee: { name: string; months: number } | null

  // Competitors
  playerRank: number
  competitorResults: CompetitorResult[]

  // Narrative
  headlines: string[]

  // Decision Analysis
  decisionAnalysis: DecisionAnalysis
  oneLineStory: string
  turningPoints: TurningPoint[]
  assetCurve: Array<{ year: number; month: number; cash: number }>
}

/* ── Cash Flow Tracking Types ── */

export type CashFlowCategory =
  | 'TRADE_BUY'
  | 'TRADE_SELL'
  | 'TRADE_FEE'
  | 'SALARY'
  | 'HIRE_BONUS'
  | 'HR_CARE'
  | 'HR_TRAINING'
  | 'OFFICE_UPGRADE'
  | 'OFFICE_FURNITURE'
  | 'SKILL_RESET'
  | 'MNA_ACQUISITION'
  | 'MNA_CASHOUT'

export interface CashFlowEntry {
  tick: number
  timestamp: { year: number; month: number; day: number }
  category: CashFlowCategory
  amount: number // positive = 유입, negative = 유출
  description: string
  meta?: {
    companyId?: string
    ticker?: string
    employeeId?: string
    shares?: number
  }
}

export interface RealizedTrade {
  companyId: string
  ticker: string
  shares: number
  buyPrice: number
  sellPrice: number
  pnl: number
  fee: number
  tick: number
  timestamp: { year: number; month: number; day: number }
}

export interface MonthlySummary {
  year: number
  month: number
  tradeBuys: number
  tradeSells: number
  tradeFees: number
  salaries: number
  hireBonuses: number
  hrCosts: number
  officeCosts: number
  skillResets: number
  mnaCosts: number
  mnaCashOuts: number
  openingCash: number
  closingCash: number
}

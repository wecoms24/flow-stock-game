/* ── Financial Report System Types ── */

export interface LedgerEntry {
  id: string
  hour: number
  category: 'TRADING' | 'SALARY' | 'OFFICE' | 'EVENT'
  amount: number // 수입(+), 지출(-)
  description: string
}

export interface QuarterReport {
  year: number
  quarter: number
  revenue: number
  expenses: number
  netIncome: number
  topGainer: { ticker: string; profit: number } | null
  topLoser: { ticker: string; loss: number } | null
  tradingVolume: number
  employeeCost: number
  officeCost: number
}

export interface QuarterStats {
  tradingVolume: number
  tradingPnL: number
  employeeCost: number
  officeCost: number
  eventImpact: number
}

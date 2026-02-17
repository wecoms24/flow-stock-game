/* ── Cash Flow Tracker: Pure Functions ── */

import type {
  CashFlowEntry,
  CashFlowCategory,
  RealizedTrade,
  MonthlySummary,
} from '../types/cashFlow'

/** Create a cash flow entry */
export function createCashFlowEntry(
  tick: number,
  timestamp: { year: number; month: number; day: number },
  category: CashFlowCategory,
  amount: number,
  description: string,
  meta?: CashFlowEntry['meta'],
): CashFlowEntry {
  return { tick, timestamp, category, amount, description, meta }
}

/** Aggregate individual entries into a monthly summary */
export function aggregateMonthly(
  entries: CashFlowEntry[],
  year: number,
  month: number,
  openingCash: number,
): MonthlySummary {
  const monthEntries = entries.filter(
    (e) => e.timestamp.year === year && e.timestamp.month === month,
  )

  const sum = (cat: CashFlowCategory) =>
    monthEntries
      .filter((e) => e.category === cat)
      .reduce((acc, e) => acc + e.amount, 0)

  const tradeBuys = sum('TRADE_BUY')
  const tradeSells = sum('TRADE_SELL')
  const tradeFees = sum('TRADE_FEE')
  const salaries = sum('SALARY')
  const hireBonuses = sum('HIRE_BONUS')
  const hrCare = sum('HR_CARE')
  const hrTraining = sum('HR_TRAINING')
  const hrCosts = hrCare + hrTraining
  const officeUpgrade = sum('OFFICE_UPGRADE')
  const officeFurniture = sum('OFFICE_FURNITURE')
  const officeCosts = officeUpgrade + officeFurniture
  const skillResets = sum('SKILL_RESET')
  const mnaCosts = sum('MNA_ACQUISITION')
  const mnaCashOuts = sum('MNA_CASHOUT')

  const totalChange =
    tradeBuys + tradeSells + tradeFees + salaries + hireBonuses +
    hrCosts + officeCosts + skillResets + mnaCosts + mnaCashOuts

  return {
    year,
    month,
    tradeBuys,
    tradeSells,
    tradeFees,
    salaries,
    hireBonuses,
    hrCosts,
    officeCosts,
    skillResets,
    mnaCosts,
    mnaCashOuts,
    openingCash,
    closingCash: openingCash + totalChange,
  }
}

/** Purge entries older than 6 months, replacing them with monthly summaries */
export function purgeOldEntries(
  entries: CashFlowEntry[],
  currentYear: number,
  currentMonth: number,
  existingSummaries: MonthlySummary[],
): {
  prunedEntries: CashFlowEntry[]
  newSummaries: MonthlySummary[]
} {
  const cutoffMonths = (currentYear * 12 + currentMonth) - 6
  const recentEntries: CashFlowEntry[] = []
  const oldEntries: CashFlowEntry[] = []

  for (const entry of entries) {
    const entryMonths = entry.timestamp.year * 12 + entry.timestamp.month
    if (entryMonths >= cutoffMonths) {
      recentEntries.push(entry)
    } else {
      oldEntries.push(entry)
    }
  }

  // Group old entries by year-month and create summaries for uncovered months
  const existingKeys = new Set(
    existingSummaries.map((s) => `${s.year}-${s.month}`),
  )
  const newSummaries: MonthlySummary[] = []

  const monthGroups = new Map<string, CashFlowEntry[]>()
  for (const entry of oldEntries) {
    const key = `${entry.timestamp.year}-${entry.timestamp.month}`
    if (!existingKeys.has(key)) {
      if (!monthGroups.has(key)) monthGroups.set(key, [])
      monthGroups.get(key)!.push(entry)
    }
  }

  // Sort month groups chronologically for chaining opening/closing cash
  const sortedKeys = Array.from(monthGroups.keys()).sort((a, b) => {
    const [ay, am] = a.split('-').map(Number)
    const [by, bm] = b.split('-').map(Number)
    return (ay * 12 + am) - (by * 12 + bm)
  })

  // Chain openingCash: use previous summary's closingCash, or 0 if unavailable
  for (const key of sortedKeys) {
    const [y, m] = key.split('-').map(Number)
    const groupEntries = monthGroups.get(key)!

    // Try to find previous month's closing cash from existing or newly created summaries
    const prevMonthKey = m === 1 ? `${y - 1}-12` : `${y}-${m - 1}`
    const prevSummary = existingSummaries.find((s) => `${s.year}-${s.month}` === prevMonthKey)
      ?? newSummaries.find((s) => `${s.year}-${s.month}` === prevMonthKey)
    const openingCash = prevSummary?.closingCash ?? 0

    newSummaries.push(aggregateMonthly(groupEntries, y, m, openingCash))
  }

  return { prunedEntries: recentEntries, newSummaries }
}

/** Compute P&L summary from realized trades and current portfolio */
export function computePnLSummary(
  realizedTrades: RealizedTrade[],
  portfolio: Record<string, { companyId: string; shares: number; avgBuyPrice: number }>,
  companies: Array<{ id: string; price: number; ticker: string }>,
  monthlySummaries: MonthlySummary[],
  cashFlowLog: CashFlowEntry[],
): {
  realizedPnL: number
  unrealizedPnL: number
  totalFees: number
  totalSalaries: number
  totalHireBonuses: number
  totalHRCosts: number
  totalOfficeCosts: number
  totalSkillResets: number
  totalMnACosts: number
  totalMnACashOuts: number
  byTicker: Array<{ ticker: string; pnl: number; trades: number }>
} {
  // Realized P&L from trades
  const realizedPnL = realizedTrades.reduce((sum, t) => sum + t.pnl, 0)
  const totalFees = realizedTrades.reduce((sum, t) => sum + t.fee, 0)

  // Unrealized P&L from current portfolio
  let unrealizedPnL = 0
  for (const pos of Object.values(portfolio)) {
    const company = companies.find((c) => c.id === pos.companyId)
    if (!company) continue
    unrealizedPnL += (company.price - pos.avgBuyPrice) * pos.shares
  }

  // Aggregate costs from summaries + recent entries
  const sumFromSummaries = (field: keyof MonthlySummary) =>
    monthlySummaries.reduce((sum, s) => sum + (s[field] as number), 0)

  const sumFromLog = (cat: CashFlowCategory) =>
    cashFlowLog.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0)

  const totalSalaries = sumFromSummaries('salaries') + sumFromLog('SALARY')
  const totalHireBonuses = sumFromSummaries('hireBonuses') + sumFromLog('HIRE_BONUS')
  const totalHRCosts = sumFromSummaries('hrCosts') + sumFromLog('HR_CARE') + sumFromLog('HR_TRAINING')
  const totalOfficeCosts = sumFromSummaries('officeCosts') + sumFromLog('OFFICE_UPGRADE') + sumFromLog('OFFICE_FURNITURE')
  const totalSkillResets = sumFromSummaries('skillResets') + sumFromLog('SKILL_RESET')
  const totalMnACosts = sumFromSummaries('mnaCosts') + sumFromLog('MNA_ACQUISITION')
  const totalMnACashOuts = sumFromSummaries('mnaCashOuts') + sumFromLog('MNA_CASHOUT')

  // Per-ticker realized P&L
  const tickerMap = new Map<string, { pnl: number; trades: number }>()
  for (const t of realizedTrades) {
    const existing = tickerMap.get(t.ticker) ?? { pnl: 0, trades: 0 }
    tickerMap.set(t.ticker, { pnl: existing.pnl + t.pnl, trades: existing.trades + 1 })
  }
  const byTicker = Array.from(tickerMap.entries())
    .map(([ticker, data]) => ({ ticker, ...data }))
    .sort((a, b) => b.pnl - a.pnl)

  return {
    realizedPnL,
    unrealizedPnL,
    totalFees,
    totalSalaries,
    totalHireBonuses,
    totalHRCosts,
    totalOfficeCosts,
    totalSkillResets,
    totalMnACosts,
    totalMnACashOuts,
    byTicker,
  }
}

/** Compute cash flow breakdown for a specific month */
export function computeCashFlowSummary(
  monthlySummaries: MonthlySummary[],
  cashFlowLog: CashFlowEntry[],
  year: number,
  month: number,
): MonthlySummary | null {
  // Check if we have a pre-computed summary
  const existing = monthlySummaries.find((s) => s.year === year && s.month === month)
  if (existing) return existing

  // Compute from raw entries
  const monthEntries = cashFlowLog.filter(
    (e) => e.timestamp.year === year && e.timestamp.month === month,
  )
  if (monthEntries.length === 0) return null

  return aggregateMonthly(monthEntries, year, month, 0)
}

/** Detect cash flow anomalies */
export function detectAnomalies(
  cash: number,
  totalAssets: number,
  monthlySummary: MonthlySummary | null,
  employeeCount: number,
): string[] {
  const anomalies: string[] = []

  if (cash < 0) {
    anomalies.push('현금이 마이너스입니다!')
  }

  if (monthlySummary) {
    const totalExpenses = Math.abs(
      monthlySummary.tradeBuys + monthlySummary.tradeFees +
      monthlySummary.salaries + monthlySummary.hireBonuses +
      monthlySummary.hrCosts + monthlySummary.officeCosts +
      monthlySummary.skillResets + monthlySummary.mnaCosts,
    )

    if (totalAssets > 0 && totalExpenses > totalAssets * 0.3) {
      const pct = Math.round((totalExpenses / totalAssets) * 100)
      anomalies.push(`이번 달 지출이 자산의 ${pct}%입니다`)
    }

    if (monthlySummary.salaries !== 0) {
      const feeRatio = Math.abs(monthlySummary.tradeFees) / Math.abs(monthlySummary.salaries)
      if (feeRatio > 0.5) {
        const pct = Math.round(feeRatio * 100)
        anomalies.push(`거래 수수료가 월급의 ${pct}%입니다`)
      }
    }

    if (employeeCount > 0 && Math.abs(monthlySummary.hrCosts) > employeeCount * 100_000) {
      anomalies.push('HR 비용이 비정상적으로 높습니다')
    }
  }

  return anomalies
}

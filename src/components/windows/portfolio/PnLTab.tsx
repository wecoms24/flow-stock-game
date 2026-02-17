import { useMemo } from 'react'
import { useGameStore } from '../../../stores/gameStore'
import { computePnLSummary } from '../../../engines/cashFlowTracker'

const formatMoney = (v: number) => {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}억`
  if (Math.abs(v) >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString()
}

export function PnLTab() {
  const realizedTrades = useGameStore((s) => s.realizedTrades)
  const portfolio = useGameStore((s) => s.player.portfolio)
  const companies = useGameStore((s) => s.companies)
  const monthlySummaries = useGameStore((s) => s.monthlyCashFlowSummaries)
  const cashFlowLog = useGameStore((s) => s.cashFlowLog)

  const summary = useMemo(
    () =>
      computePnLSummary(
        realizedTrades,
        portfolio,
        companies,
        monthlySummaries,
        cashFlowLog,
      ),
    [realizedTrades, portfolio, companies, monthlySummaries, cashFlowLog],
  )

  const netProfit = summary.realizedPnL + summary.unrealizedPnL

  return (
    <div className="text-xs space-y-2 h-full overflow-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-1">
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[9px] text-retro-gray">실현손익</div>
          <div
            className={`font-bold text-[11px] ${summary.realizedPnL >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
          >
            {summary.realizedPnL >= 0 ? '+' : ''}
            {formatMoney(summary.realizedPnL)}
          </div>
        </div>
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[9px] text-retro-gray">미실현손익</div>
          <div
            className={`font-bold text-[11px] ${summary.unrealizedPnL >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
          >
            {summary.unrealizedPnL >= 0 ? '+' : ''}
            {formatMoney(summary.unrealizedPnL)}
          </div>
        </div>
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[9px] text-retro-gray">순이익</div>
          <div
            className={`font-bold text-[11px] ${netProfit >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
          >
            {netProfit >= 0 ? '+' : ''}
            {formatMoney(netProfit)}
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="win-inset bg-white p-2 space-y-0.5">
        <div className="text-[10px] font-bold mb-1">비용 브레이크다운</div>
        <CostRow label="급여 합계" amount={summary.totalSalaries} />
        <CostRow label="채용 보너스" amount={summary.totalHireBonuses} />
        <CostRow label="HR 비용" amount={summary.totalHRCosts} />
        <CostRow label="사무실 비용" amount={summary.totalOfficeCosts} />
        <CostRow label="거래 수수료" amount={-summary.totalFees} />
        <CostRow label="스킬 리셋" amount={summary.totalSkillResets} />
        <CostRow label="M&A 비용" amount={summary.totalMnACosts} />
        {summary.totalMnACashOuts > 0 && (
          <CostRow label="M&A 정산" amount={summary.totalMnACashOuts} isPositive />
        )}
      </div>

      {/* Per-ticker realized P&L */}
      {summary.byTicker.length > 0 && (
        <div>
          <div className="text-[10px] font-bold mb-1">종목별 실현손익</div>
          <table className="w-full">
            <thead>
              <tr className="text-retro-gray text-[9px]">
                <th className="text-left font-normal">종목</th>
                <th className="text-right font-normal">거래수</th>
                <th className="text-right font-normal">실현손익</th>
              </tr>
            </thead>
            <tbody>
              {summary.byTicker.map((row) => (
                <tr key={row.ticker} className="hover:bg-win-highlight/20">
                  <td className="text-left font-bold">{row.ticker}</td>
                  <td className="text-right text-retro-gray">{row.trades}</td>
                  <td
                    className={`text-right font-bold ${row.pnl >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
                  >
                    {row.pnl >= 0 ? '+' : ''}
                    {formatMoney(row.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary.byTicker.length === 0 && realizedTrades.length === 0 && (
        <div className="text-center text-retro-gray py-4">실현된 거래가 없습니다</div>
      )}
    </div>
  )
}

function CostRow({
  label,
  amount,
  isPositive,
}: {
  label: string
  amount: number
  isPositive?: boolean
}) {
  if (amount === 0) return null
  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-retro-gray">{label}</span>
      <span className={isPositive ? 'text-stock-up' : amount < 0 ? 'text-stock-down' : ''}>
        {amount > 0 && !isPositive ? '' : amount > 0 ? '+' : ''}
        {formatMoney(amount)}원
      </span>
    </div>
  )
}

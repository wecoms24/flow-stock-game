import { useMemo } from 'react'
import { useGameStore } from '../../../stores/gameStore'
import { computePnLSummary } from '../../../engines/cashFlowTracker'

const formatMoney = (v: number) => {
  // 1억원 (100_000_000) 기준으로 통일
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
  const currentCash = useGameStore((s) => s.player.cash)
  const initialCash = useGameStore((s) => s.config.initialCash)

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

  // 누적 현금 흐름 항목 (전체 기간)
  const cashFlowItems = useMemo(() => {
    const items = [
      { label: '주식 매수', amount: summary.totalTradeBuys },
      { label: '주식 매도', amount: summary.totalTradeSells },
      { label: '거래 수수료', amount: -summary.totalFees },
      { label: '급여', amount: summary.totalSalaries },
      { label: '채용 보너스', amount: summary.totalHireBonuses },
      { label: 'HR 비용', amount: summary.totalHRCosts },
      { label: '사무실 비용', amount: summary.totalOfficeCosts },
      { label: '부유세', amount: summary.totalTaxes },
      { label: '스킬 비용', amount: summary.totalSkillResets },
      { label: 'M&A 인수', amount: summary.totalMnACosts },
      { label: 'M&A 정산', amount: summary.totalMnACashOuts },
    ].filter((e) => e.amount !== 0)

    const totalFlow = items.reduce((sum, e) => sum + Math.abs(e.amount), 0)

    return items
      .map((e) => ({
        ...e,
        isIncome: e.amount > 0,
        percentage: totalFlow > 0 ? (Math.abs(e.amount) / totalFlow) * 100 : 0,
      }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  }, [summary])

  const totalOutflow = cashFlowItems
    .filter((e) => e.amount < 0)
    .reduce((sum, e) => sum + e.amount, 0)
  const totalInflow = cashFlowItems
    .filter((e) => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0)
  const cashChange = currentCash - initialCash

  return (
    <div className="text-xs space-y-2 h-full overflow-auto">
      {/* 누적 현금 흐름 대시보드 */}
      <div className="win-inset bg-white p-2 space-y-1.5">
        <div className="text-[11px] font-bold">현금 흐름 추적 (누적)</div>

        {/* 현금 상황 */}
        <div className="flex justify-between text-[11px]">
          <span className="text-retro-gray">초기 자금</span>
          <span>{formatMoney(initialCash)}원</span>
        </div>
        <div className="flex justify-between text-[11px] font-bold">
          <span>현재 현금</span>
          <span className={cashChange >= 0 ? 'text-stock-up' : 'text-stock-down'}>
            {formatMoney(currentCash)}원
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-retro-gray">현금 변동</span>
          <span className={cashChange >= 0 ? 'text-stock-up' : 'text-stock-down'}>
            {cashChange >= 0 ? '+' : ''}
            {formatMoney(cashChange)}원
          </span>
        </div>

        {/* 현금 흐름 항목별 진행 바 */}
        {cashFlowItems.length > 0 && (
          <div className="pt-1.5 border-t border-win-shadow">
            <div className="text-[10px] font-bold mb-1.5">항목별 현금 흐름</div>
            {cashFlowItems.map((item, i) => (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="flex items-center gap-1">
                    {item.isIncome ? (
                      <span className="text-green-600 text-[8px]">▲</span>
                    ) : (
                      <span className="text-red-600 text-[8px]">▼</span>
                    )}
                    {item.label}
                  </span>
                  <span
                    className={`font-bold ${item.isIncome ? 'text-stock-up' : 'text-stock-down'}`}
                  >
                    {item.isIncome ? '+' : ''}
                    {formatMoney(item.amount)}원
                    <span className="text-retro-gray font-normal ml-1">
                      ({item.percentage.toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-win-shadow h-2 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.isIncome ? 'bg-green-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 총 수입/지출 요약 */}
        <div className="pt-1.5 border-t border-win-shadow space-y-0.5">
          {totalInflow > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-retro-gray">총 유입</span>
              <span className="text-stock-up font-bold">+{formatMoney(totalInflow)}원</span>
            </div>
          )}
          {totalOutflow < 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-retro-gray">총 유출</span>
              <span className="text-stock-down font-bold">{formatMoney(totalOutflow)}원</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] font-bold">
            <span>순 현금 변동</span>
            <span className={totalInflow + totalOutflow >= 0 ? 'text-stock-up' : 'text-stock-down'}>
              {totalInflow + totalOutflow >= 0 ? '+' : ''}
              {formatMoney(totalInflow + totalOutflow)}원
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-1">
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[10px] text-retro-gray">실현손익</div>
          <div
            className={`font-bold text-[12px] ${summary.realizedPnL >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
          >
            {summary.realizedPnL >= 0 ? '+' : ''}
            {formatMoney(summary.realizedPnL)}
          </div>
        </div>
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[10px] text-retro-gray">미실현손익</div>
          <div
            className={`font-bold text-[12px] ${summary.unrealizedPnL >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
          >
            {summary.unrealizedPnL >= 0 ? '+' : ''}
            {formatMoney(summary.unrealizedPnL)}
          </div>
        </div>
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[10px] text-retro-gray">순이익</div>
          <div
            className={`font-bold text-[12px] ${netProfit >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
          >
            {netProfit >= 0 ? '+' : ''}
            {formatMoney(netProfit)}
          </div>
        </div>
      </div>

      {/* Per-ticker realized P&L */}
      {summary.byTicker.length > 0 && (
        <div>
          <div className="text-[11px] font-bold mb-1">종목별 실현손익</div>
          <table className="w-full">
            <thead>
              <tr className="text-retro-gray text-[10px]">
                <th className="text-left font-normal">종목</th>
                <th className="text-right font-normal">거래수</th>
                <th className="text-right font-normal">실현손익</th>
              </tr>
            </thead>
            <tbody>
              {summary.byTicker.map((row) => (
                <tr key={row.ticker} className="hover:bg-win-highlight/20">
                  <td className="text-left font-bold text-[10px]">{row.ticker}</td>
                  <td className="text-right text-retro-gray text-[10px]">{row.trades}</td>
                  <td
                    className={`text-right font-bold text-[10px] ${row.pnl >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
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

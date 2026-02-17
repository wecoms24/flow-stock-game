import { useMemo, useState } from 'react'
import { useGameStore } from '../../../stores/gameStore'
import { computeCashFlowSummary } from '../../../engines/cashFlowTracker'

const formatMoney = (v: number) => {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}억`
  if (Math.abs(v) >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString()
}

export function CashFlowTab() {
  const time = useGameStore((s) => s.time)
  const monthlySummaries = useGameStore((s) => s.monthlyCashFlowSummaries)
  const cashFlowLog = useGameStore((s) => s.cashFlowLog)
  const anomalies = useGameStore((s) => s.cashFlowAnomalies)
  const config = useGameStore((s) => s.config)

  const [selectedYear, setSelectedYear] = useState(time.year)
  const [selectedMonth, setSelectedMonth] = useState(time.month)

  const summary = useMemo(
    () => computeCashFlowSummary(monthlySummaries, cashFlowLog, selectedYear, selectedMonth),
    [monthlySummaries, cashFlowLog, selectedYear, selectedMonth],
  )

  // Recent 6 months for bar chart
  const recentMonths = useMemo(() => {
    const months: Array<{ year: number; month: number; net: number; label: string }> = []
    let y = time.year
    let m = time.month
    for (let i = 0; i < 6; i++) {
      const s = computeCashFlowSummary(monthlySummaries, cashFlowLog, y, m)
      const net = s ? s.closingCash - s.openingCash : 0
      months.unshift({ year: y, month: m, net, label: `${m}월` })
      m--
      if (m < 1) {
        m = 12
        y--
      }
    }
    return months
  }, [monthlySummaries, cashFlowLog, time.year, time.month])

  const maxAbsNet = Math.max(...recentMonths.map((m) => Math.abs(m.net)), 1)

  const navigateMonth = (delta: number) => {
    let newMonth = selectedMonth + delta
    let newYear = selectedYear
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    } else if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    if (newYear >= config.startYear && newYear <= config.endYear) {
      setSelectedYear(newYear)
      setSelectedMonth(newMonth)
    }
  }

  const investmentSubtotal = summary
    ? summary.tradeBuys + summary.tradeSells + summary.tradeFees
    : 0
  const operatingSubtotal = summary
    ? summary.salaries + summary.hireBonuses + summary.hrCosts + summary.officeCosts + summary.skillResets
    : 0
  const otherSubtotal = summary ? summary.mnaCosts + summary.mnaCashOuts : 0
  const netChange = investmentSubtotal + operatingSubtotal + otherSubtotal

  return (
    <div className="text-xs space-y-2 h-full overflow-auto">
      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="p-1.5 bg-red-100 border border-red-400 rounded text-[10px] text-red-700">
          {anomalies.slice(-3).map((a, i) => (
            <div key={i}>&#9888; {a}</div>
          ))}
        </div>
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-2">
        <button
          className="win-btn px-2 py-0.5 text-[10px]"
          onClick={() => navigateMonth(-1)}
        >
          &#9664;
        </button>
        <span className="font-bold text-[11px]">
          {selectedYear}년 {selectedMonth}월
        </span>
        <button
          className="win-btn px-2 py-0.5 text-[10px]"
          onClick={() => navigateMonth(1)}
        >
          &#9654;
        </button>
      </div>

      {!summary ? (
        <div className="text-center text-retro-gray py-4">해당 월의 데이터가 없습니다</div>
      ) : (
        <>
          {/* Investment Activities */}
          <Section title="투자활동">
            <FlowRow label="주식 매수" amount={summary.tradeBuys} />
            <FlowRow label="주식 매도" amount={summary.tradeSells} />
            <FlowRow label="거래 수수료" amount={summary.tradeFees} />
            <hr className="border-win-shadow my-0.5" />
            <FlowRow label="소계" amount={investmentSubtotal} isBold />
          </Section>

          {/* Operating Activities */}
          <Section title="영업활동">
            <FlowRow label="급여" amount={summary.salaries} />
            <FlowRow label="채용 보너스" amount={summary.hireBonuses} />
            <FlowRow label="HR 비용" amount={summary.hrCosts} />
            <FlowRow label="사무실 비용" amount={summary.officeCosts} />
            <FlowRow label="스킬 리셋" amount={summary.skillResets} />
            <hr className="border-win-shadow my-0.5" />
            <FlowRow label="소계" amount={operatingSubtotal} isBold />
          </Section>

          {/* Other Activities */}
          {(summary.mnaCosts !== 0 || summary.mnaCashOuts !== 0) && (
            <Section title="기타활동">
              <FlowRow label="M&A 인수" amount={summary.mnaCosts} />
              <FlowRow label="M&A 정산" amount={summary.mnaCashOuts} />
              <hr className="border-win-shadow my-0.5" />
              <FlowRow label="소계" amount={otherSubtotal} isBold />
            </Section>
          )}

          {/* Bottom Summary */}
          <div className="win-inset bg-white p-2 space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-retro-gray">기초 현금</span>
              <span>{formatMoney(summary.openingCash)}원</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold">
              <span>월간 순변동</span>
              <span className={netChange >= 0 ? 'text-stock-up' : 'text-stock-down'}>
                {netChange >= 0 ? '+' : ''}
                {formatMoney(netChange)}원
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-retro-gray">기말 현금</span>
              <span className="font-bold">{formatMoney(summary.closingCash)}원</span>
            </div>
          </div>
        </>
      )}

      {/* 6-Month Trend Bar Chart (div-based) */}
      <div>
        <div className="text-[10px] font-bold mb-1">최근 6개월 추이</div>
        <div className="flex items-end gap-1 h-16">
          {recentMonths.map((m) => {
            const height = maxAbsNet > 0 ? (Math.abs(m.net) / maxAbsNet) * 100 : 0
            const isPositive = m.net >= 0
            return (
              <div
                key={`${m.year}-${m.month}`}
                className="flex-1 flex flex-col items-center justify-end h-full"
              >
                <div
                  className={`w-full rounded-t ${isPositive ? 'bg-stock-up' : 'bg-stock-down'}`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${m.year}년 ${m.month}월: ${m.net >= 0 ? '+' : ''}${formatMoney(m.net)}`}
                />
                <div className="text-[8px] text-retro-gray mt-0.5">{m.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="win-inset bg-white p-2 space-y-0.5">
      <div className="text-[10px] font-bold mb-0.5">{title}</div>
      {children}
    </div>
  )
}

function FlowRow({
  label,
  amount,
  isBold,
}: {
  label: string
  amount: number
  isBold?: boolean
}) {
  if (amount === 0 && !isBold) return null
  return (
    <div className={`flex justify-between text-[10px] ${isBold ? 'font-bold' : ''}`}>
      <span className={isBold ? '' : 'text-retro-gray'}>{label}</span>
      <span className={amount > 0 ? 'text-stock-up' : amount < 0 ? 'text-stock-down' : ''}>
        {amount > 0 ? '+' : ''}
        {formatMoney(amount)}원
      </span>
    </div>
  )
}

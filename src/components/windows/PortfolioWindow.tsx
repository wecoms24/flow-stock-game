import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { VICTORY_GOALS } from '../../data/difficulty'
import { formatMoney } from '../../utils/formatMoney'
import type { Sector } from '../../types'
import { PnLTab } from './portfolio/PnLTab'
import { CashFlowTab } from './portfolio/CashFlowTab'

/** Mini sparkline canvas for portfolio value trend */
function MiniSparkline({ data, width = 120, height = 28 }: { data: number[]; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 2

    const isPositive = data[data.length - 1] >= data[0]
    const strokeColor = isPositive ? '#22c55e' : '#ef4444'
    const fillColor = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'

    const stepX = (width - padding * 2) / (data.length - 1)

    // Fill area
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    for (let i = 0; i < data.length; i++) {
      const x = padding + i * stepX
      const y = height - padding - ((data[i] - min) / range) * (height - padding * 2)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(padding + (data.length - 1) * stepX, height - padding)
    ctx.closePath()
    ctx.fillStyle = fillColor
    ctx.fill()

    // Stroke line
    ctx.beginPath()
    for (let i = 0; i < data.length; i++) {
      const x = padding + i * stepX
      const y = height - padding - ((data[i] - min) / range) * (height - padding * 2)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.stroke()

    // End dot
    const lastX = padding + (data.length - 1) * stepX
    const lastY = height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)
    ctx.beginPath()
    ctx.arc(lastX, lastY, 2, 0, Math.PI * 2)
    ctx.fillStyle = strokeColor
    ctx.fill()
  }, [data, width, height])

  if (data.length < 2) return null
  return <canvas ref={canvasRef} style={{ width, height }} className="block" />
}

const SECTOR_LABELS: Record<Sector, string> = {
  tech: '기술',
  finance: '금융',
  energy: '에너지',
  healthcare: '헬스케어',
  consumer: '소비재',
  industrial: '산업재',
  telecom: '통신',
  materials: '소재',
  utilities: '유틸리티',
  realestate: '부동산',
}

const SECTOR_COLORS: Record<Sector, string> = {
  tech: 'bg-blue-500',
  finance: 'bg-green-600',
  energy: 'bg-yellow-500',
  healthcare: 'bg-red-500',
  consumer: 'bg-purple-500',
  industrial: 'bg-gray-500',
  telecom: 'bg-cyan-500',
  materials: 'bg-orange-500',
  utilities: 'bg-teal-500',
  realestate: 'bg-pink-500',
}

type TabId = 'overview' | 'pnl' | 'cashflow'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: '포트폴리오' },
  { id: 'pnl', label: '손익계산서' },
  { id: 'cashflow', label: '현금흐름' },
]

export function PortfolioWindow() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-win-shadow bg-win-face shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`px-3 py-1 text-[10px] font-bold border border-win-shadow border-b-0 rounded-t ${
              activeTab === tab.id
                ? 'bg-white -mb-px z-10 relative'
                : 'bg-win-face text-retro-gray hover:bg-win-highlight/30'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden p-1">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'pnl' && <PnLTab />}
        {activeTab === 'cashflow' && <CashFlowTab />}
      </div>
    </div>
  )
}

function OverviewTab() {
  const player = useGameStore((s) => s.player)
  const companies = useGameStore((s) => s.companies)
  const config = useGameStore((s) => s.config)
  const time = useGameStore((s) => s.time)

  const positions = Object.values(player.portfolio)

  const totalStockValue = useMemo(
    () =>
      positions.reduce((sum, pos) => {
        const company = companies.find((c) => c.id === pos.companyId)
        return sum + (company ? company.price * pos.shares : 0)
      }, 0),
    [positions, companies],
  )

  const totalAssets = player.cash + totalStockValue

  const returnRate =
    config.initialCash > 0
      ? ((totalAssets - config.initialCash) / config.initialCash) * 100
      : 0

  // Sparkline: track portfolio value history (last 30 data points)
  const sparklineHistoryRef = useRef<number[]>([])
  const lastRecordedHourRef = useRef(-1)

  const recordSparkline = useCallback(() => {
    const currentHour = time.year * 12 * 30 * 10 + time.month * 30 * 10 + time.day * 10 + time.hour
    // Record at most once per 10 game hours
    if (currentHour - lastRecordedHourRef.current >= 10) {
      lastRecordedHourRef.current = currentHour
      sparklineHistoryRef.current = [...sparklineHistoryRef.current.slice(-29), totalAssets]
    }
  }, [time.year, time.month, time.day, time.hour, totalAssets])
  recordSparkline()

  const sparklineData = sparklineHistoryRef.current

  // Victory goal info
  const currentGoal = VICTORY_GOALS.find((g) => g.targetAsset === config.targetAsset)
  const goalProgress = Math.min((totalAssets / config.targetAsset) * 100, 100)
  const goalReached = totalAssets >= config.targetAsset

  // Time info
  const remainingYears = config.endYear - time.year
  const elapsedYears = time.year - config.startYear
  const totalYears = config.endYear - config.startYear

  // Cash ratio
  const cashRatio = totalAssets > 0 ? (player.cash / totalAssets) * 100 : 100

  // Sector distribution
  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {}
    for (const pos of positions) {
      const company = companies.find((c) => c.id === pos.companyId)
      if (!company) continue
      const value = company.price * pos.shares
      const sector = company.sector
      sectors[sector] = (sectors[sector] ?? 0) + value
    }
    return Object.entries(sectors)
      .map(([sector, value]) => ({
        sector: sector as Sector,
        value,
        percent: totalStockValue > 0 ? (value / totalStockValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [positions, companies, totalStockValue])

  // Sorted positions by value (descending)
  const sortedPositions = useMemo(
    () =>
      positions
        .map((pos) => {
          const company = companies.find((c) => c.id === pos.companyId)
          if (!company) return null
          const currentValue = company.price * pos.shares
          const costBasis = pos.avgBuyPrice * pos.shares
          const pnl = currentValue - costBasis
          const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
          return { pos, company, currentValue, pnl, pnlPercent }
        })
        .filter(Boolean)
        .sort((a, b) => b!.currentValue - a!.currentValue) as Array<{
        pos: (typeof positions)[0]
        company: (typeof companies)[0]
        currentValue: number
        pnl: number
        pnlPercent: number
      }>,
    [positions, companies],
  )


  return (
    <div
      className="text-xs space-y-2 h-full overflow-auto transition-colors duration-500"
      style={{
        backgroundColor: returnRate > 5
          ? 'rgba(34,197,94,0.04)'
          : returnRate < -5
            ? 'rgba(239,68,68,0.04)'
            : 'transparent',
      }}
    >
      {/* ── Victory Goal Progress ── */}
      <div className="p-2 bg-win-face border border-win-shadow rounded">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-[11px]">
            {currentGoal?.icon ?? '🎯'} 목표: {currentGoal?.label ?? '커스텀'}
          </span>
          <MiniSparkline data={sparklineData} width={80} height={20} />
        </div>
        {/* Enhanced progress bar with gradient fill and embedded percentage */}
        <div className="relative w-full h-5 bg-win-shadow rounded overflow-hidden border border-win-shadow">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${goalProgress}%`,
              background: goalReached
                ? 'linear-gradient(90deg, #16a34a, #22c55e, #4ade80)'
                : goalProgress >= 75
                  ? 'linear-gradient(90deg, #ca8a04, #eab308, #facc15)'
                  : goalProgress >= 50
                    ? 'linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)'
                    : 'linear-gradient(90deg, #4338ca, #6366f1, #818cf8)',
            }}
          />
          <span
            className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
            style={{
              color: goalProgress > 45 ? '#fff' : '#333',
              textShadow: goalProgress > 45 ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {goalReached ? '목표 달성!' : `${goalProgress.toFixed(1)}%`}
          </span>
        </div>
        <div className="flex justify-between mt-0.5 text-[9px] text-retro-gray">
          <span>{formatMoney(totalAssets)}원</span>
          <span>/ {formatMoney(config.targetAsset)}원</span>
        </div>
      </div>

      {/* ── Game Stats Grid ── */}
      <div className="grid grid-cols-3 gap-1">
        <div
          className="win-inset bg-white p-1.5 text-center"
          style={{ borderLeft: `3px solid ${returnRate >= 0 ? '#22c55e' : '#ef4444'}` }}
        >
          <div className="text-[9px] text-retro-gray">수익률</div>
          <div
            className={`font-bold text-[11px] ${returnRate >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
          >
            {returnRate >= 0 ? '+' : ''}
            {returnRate.toFixed(1)}%
          </div>
        </div>
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[9px] text-retro-gray">일간 변동</div>
          <div
            className={`font-bold text-[11px] ${
              player.lastDayChange > 0
                ? 'text-stock-up'
                : player.lastDayChange < 0
                  ? 'text-stock-down'
                  : ''
            }`}
          >
            {player.lastDayChange > 0 ? '+' : ''}
            {player.lastDayChange.toFixed(2)}%
          </div>
        </div>
        <div className="win-inset bg-white p-1.5 text-center">
          <div className="text-[9px] text-retro-gray">남은 시간</div>
          <div className={`font-bold text-[11px] ${remainingYears <= 3 ? 'text-stock-down' : ''}`}>
            {remainingYears}년
          </div>
        </div>
      </div>

      {/* ── Trade Streak ── */}
      {(player.tradeStreak ?? 0) > 0 && (
        <div className="win-inset bg-white p-1.5 flex items-center justify-between">
          <span className="text-[9px] text-retro-gray">연속 수익</span>
          <span
            className={`font-bold text-[11px] ${
              (player.tradeStreak ?? 0) >= 10
                ? 'text-orange-500'
                : (player.tradeStreak ?? 0) >= 5
                  ? 'text-yellow-500'
                  : 'text-stock-up'
            }`}
          >
            🔥 {player.tradeStreak}연승
          </span>
        </div>
      )}

      {/* ── Asset Breakdown ── */}
      <div className="win-inset bg-white p-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-retro-gray">보유 현금</span>
          <span className="font-bold tabular-nums">{player.cash.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-retro-gray">주식 평가</span>
          <span className="font-bold tabular-nums">{totalStockValue.toLocaleString()}원</span>
        </div>
        <hr className="border-win-shadow" />
        <div className="flex justify-between items-baseline">
          <span className="text-retro-gray font-bold">총 자산</span>
          <span className="font-bold text-retro-darkblue text-xl tabular-nums">{totalAssets.toLocaleString()}원</span>
        </div>

        {/* Cash/Stock ratio bar */}
        <div className="w-full h-2 bg-blue-200 rounded overflow-hidden flex">
          <div
            className="h-full bg-green-500"
            style={{ width: `${cashRatio}%` }}
            title={`현금 ${cashRatio.toFixed(0)}%`}
          />
          <div
            className="h-full bg-blue-500"
            style={{ width: `${100 - cashRatio}%` }}
            title={`주식 ${(100 - cashRatio).toFixed(0)}%`}
          />
        </div>
        <div className="flex justify-between text-[9px] text-retro-gray">
          <span>현금 {cashRatio.toFixed(0)}%</span>
          <span>주식 {(100 - cashRatio).toFixed(0)}%</span>
        </div>
      </div>

      {/* ── Game Info Bar ── */}
      <div className="flex gap-1 text-[9px]">
        <span className="px-1.5 py-0.5 bg-win-face border border-win-shadow rounded">
          {config.difficulty.toUpperCase()}
        </span>
        <span className="px-1.5 py-0.5 bg-win-face border border-win-shadow rounded">
          {time.year}년 {time.month}월
        </span>
        <span className="px-1.5 py-0.5 bg-win-face border border-win-shadow rounded">
          {elapsedYears}/{totalYears}년차
        </span>
        {player.employees.length > 0 && (
          <span className="px-1.5 py-0.5 bg-win-face border border-win-shadow rounded">
            직원 {player.employees.length}명
          </span>
        )}
        {player.monthlyExpenses > 0 && (
          <span className="px-1.5 py-0.5 bg-win-face border border-win-shadow rounded text-stock-down">
            월 -{formatMoney(player.monthlyExpenses)}
          </span>
        )}
      </div>

      {/* ── Sector Distribution ── */}
      {sectorData.length > 0 && (
        <div>
          <div className="text-[10px] font-bold mb-1">섹터 분포</div>
          <div className="space-y-0.5">
            {sectorData.map(({ sector, percent }) => (
              <div key={sector} className="flex items-center gap-1">
                <span className="w-8 text-[9px] text-retro-gray truncate">
                  {SECTOR_LABELS[sector]}
                </span>
                <div className="flex-1 h-2 bg-win-shadow rounded overflow-hidden">
                  <div
                    className={`h-full ${SECTOR_COLORS[sector]}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[9px] text-retro-gray">
                  {percent.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="border-win-shadow" />

      {/* ── Positions Table ── */}
      {sortedPositions.length === 0 ? (
        <div className="text-center text-retro-gray py-4">보유 종목이 없습니다</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-retro-gray">
              <th className="text-left font-normal">종목</th>
              <th className="text-right font-normal">수량</th>
              <th className="text-right font-normal">평가액</th>
              <th className="text-right font-normal">손익</th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map(({ pos, company, currentValue, pnl, pnlPercent }) => {
              const isUp = pnlPercent >= 0
              return (
                <tr key={pos.companyId} className="hover:bg-win-highlight/20">
                  <td className="text-left">
                    <span className="font-bold">{company.ticker}</span>
                    <span className="text-[9px] text-retro-gray ml-0.5">
                      {SECTOR_LABELS[company.sector]}
                    </span>
                  </td>
                  <td className="text-right">{pos.shares}</td>
                  <td className="text-right text-[10px]">{formatMoney(currentValue)}</td>
                  <td className={`text-right font-bold ${isUp ? 'text-stock-up' : 'text-stock-down'}`}>
                    <div>{isUp ? '+' : ''}{pnlPercent.toFixed(1)}%</div>
                    <div className="text-[9px] font-normal">
                      {isUp ? '+' : ''}{formatMoney(pnl)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { VICTORY_GOALS } from '../../data/difficulty'
import type { Sector } from '../../types'
import { PnLTab } from './portfolio/PnLTab'
import { CashFlowTab } from './portfolio/CashFlowTab'

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

  const formatMoney = (v: number) => {
    // 1억원 (100_000_000) 기준으로 통일
    if (Math.abs(v) >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
    if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}만`
    return v.toLocaleString()
  }

  return (
    <div className="text-xs space-y-2 h-full overflow-auto">
      {/* ── Victory Goal Progress ── */}
      <div className="p-2 bg-win-face border border-win-shadow rounded">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-[11px]">
            {currentGoal?.icon ?? '🎯'} 목표: {currentGoal?.label ?? '커스텀'}
          </span>
          <span
            className={`text-[10px] font-bold ${goalReached ? 'text-stock-up' : 'text-retro-gray'}`}
          >
            {goalReached ? '달성!' : `${goalProgress.toFixed(1)}%`}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-3 bg-win-shadow rounded overflow-hidden border border-win-shadow">
          <div
            className={`h-full transition-all duration-300 ${
              goalReached
                ? 'bg-stock-up'
                : goalProgress >= 75
                  ? 'bg-yellow-400'
                  : goalProgress >= 50
                    ? 'bg-blue-400'
                    : 'bg-win-highlight'
            }`}
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5 text-[9px] text-retro-gray">
          <span>{formatMoney(totalAssets)}원</span>
          <span>/ {formatMoney(config.targetAsset)}원</span>
        </div>
      </div>

      {/* ── Game Stats Grid ── */}
      <div className="grid grid-cols-3 gap-1">
        <div className="win-inset bg-white p-1.5 text-center">
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

      {/* ── Asset Breakdown ── */}
      <div className="win-inset bg-white p-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-retro-gray">보유 현금</span>
          <span className="font-bold">{player.cash.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-retro-gray">주식 평가</span>
          <span className="font-bold">{totalStockValue.toLocaleString()}원</span>
        </div>
        <hr className="border-win-shadow" />
        <div className="flex justify-between">
          <span className="text-retro-gray">총 자산</span>
          <span className="font-bold text-retro-darkblue">{totalAssets.toLocaleString()}원</span>
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

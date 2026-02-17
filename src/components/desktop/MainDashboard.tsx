/**
 * MainDashboard
 *
 * 3컬럼 레이아웃: 포트폴리오 게이지 | 직원 현황 | 뉴스 + 빠른 거래
 */

import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { ProgressGauge } from '../ui/ProgressGauge'
import { MilestoneBar } from '../ui/MilestoneBar'
import { EmployeeCardGrid } from './EmployeeCardGrid'
import { NewsFeed } from './NewsFeed'
import { QuickTradePanel } from './QuickTradePanel'

function calcPortfolioHealth(
  cash: number,
  totalAssets: number,
  employeeStress: number[],
): number {
  // Cash ratio (20% weight)
  const cashRatio = Math.min(1, cash / Math.max(totalAssets, 1))
  const cashScore = cashRatio * 100

  // Diversification placeholder (30% weight) - based on total assets growth
  const growthScore = Math.min(100, (totalAssets / 50_000_000) * 50)

  // Employee health (50% weight)
  const avgStress =
    employeeStress.length > 0
      ? employeeStress.reduce((a, b) => a + b, 0) / employeeStress.length
      : 0
  const empScore = 100 - avgStress

  return cashScore * 0.2 + growthScore * 0.3 + empScore * 0.5
}

export function MainDashboard() {
  const player = useGameStore((s) => s.player)
  const time = useGameStore((s) => s.time)
  const config = useGameStore((s) => s.config)
  const milestones = useGameStore((s) => s.milestones)

  const portfolioHealth = useMemo(() => {
    const stresses = player.employees.map((e) => e.stress ?? 0)
    return calcPortfolioHealth(player.cash, player.totalAssetValue, stresses)
  }, [player.cash, player.totalAssetValue, player.employees])

  const targetProgress = useMemo(() => {
    return Math.min(100, (player.totalAssetValue / config.targetAsset) * 100)
  }, [player.totalAssetValue, config.targetAsset])

  const milestoneMarkers = useMemo(() => {
    const ms = Object.values(milestones.milestones)
    const financials = ms.filter((m) => m.category === 'financial')
    return financials.slice(0, 4).map((m, i) => ({
      position: ((i + 1) / 5) * 100,
      label: m.title,
      icon: m.icon,
      isUnlocked: m.isUnlocked,
    }))
  }, [milestones])

  const dayChange = player.lastDayChange
  const dayChangeColor = dayChange > 0 ? 'text-green-400' : dayChange < 0 ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="h-full flex flex-col gap-2 p-2 overflow-y-auto">
      {/* Top: Asset summary */}
      <div className="flex items-center gap-3 p-2 bg-gray-800 border border-gray-700">
        <ProgressGauge value={portfolioHealth} size={64} label="건강도" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400">총 자산</p>
          <p className="text-lg font-bold text-white">
            ₩{player.totalAssetValue.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className={dayChangeColor}>
              {dayChange > 0 ? '▲' : dayChange < 0 ? '▼' : '─'} {Math.abs(dayChange).toFixed(2)}%
            </span>
            <span className="text-gray-500">
              현금 ₩{player.cash.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">
            {time.year}.{String(time.month).padStart(2, '0')}.{String(time.day).padStart(2, '0')}
          </p>
          <p className="text-[10px] text-gray-500">
            목표: ₩{(config.targetAsset / 100_000_000).toFixed(0)}억
          </p>
        </div>
      </div>

      {/* Target progress */}
      <MilestoneBar
        progress={targetProgress}
        markers={milestoneMarkers}
        className="px-1"
      />

      {/* 3 Column grid */}
      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
        {/* Column 1: Portfolio positions */}
        <div className="flex flex-col border border-gray-700 bg-gray-800/50">
          <div className="px-2 py-1 border-b border-gray-700 bg-gray-800">
            <span className="text-xs font-bold text-gray-300">📊 보유 종목</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            <PortfolioQuickView />
          </div>
        </div>

        {/* Column 2: Employee status */}
        <div className="flex flex-col border border-gray-700 bg-gray-800/50">
          <div className="px-2 py-1 border-b border-gray-700 bg-gray-800">
            <span className="text-xs font-bold text-gray-300">👥 직원 현황</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            <EmployeeCardGrid />
          </div>
        </div>

        {/* Column 3: News + Quick Trade */}
        <div className="flex flex-col border border-gray-700 bg-gray-800/50">
          <div className="px-2 py-1 border-b border-gray-700 bg-gray-800">
            <span className="text-xs font-bold text-gray-300">📰 뉴스</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5" style={{ maxHeight: '45%' }}>
            <NewsFeed />
          </div>
          <div className="px-2 py-1 border-t border-b border-gray-700 bg-gray-800">
            <span className="text-xs font-bold text-gray-300">⚡ 빠른 거래</span>
          </div>
          <div className="p-1.5">
            <QuickTradePanel />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 간략한 포트폴리오 뷰 */
function PortfolioQuickView() {
  const portfolio = useGameStore((s) => s.player.portfolio)
  const companies = useGameStore((s) => s.companies)

  const positions = useMemo(() => {
    return Object.values(portfolio)
      .map((pos) => {
        const company = companies.find((c) => c.id === pos.companyId)
        if (!company) return null
        const currentValue = company.price * pos.shares
        const buyValue = pos.avgBuyPrice * pos.shares
        const pnl = currentValue - buyValue
        const pnlPercent = buyValue > 0 ? (pnl / buyValue) * 100 : 0
        return { ...pos, company, currentValue, pnl, pnlPercent }
      })
      .filter(Boolean)
      .sort((a, b) => (b?.currentValue ?? 0) - (a?.currentValue ?? 0))
  }, [portfolio, companies])

  if (positions.length === 0) {
    return <p className="text-gray-500 text-xs text-center py-4">보유 종목이 없습니다</p>
  }

  return (
    <div className="space-y-1">
      {positions.map((pos) => {
        if (!pos) return null
        const pnlColor = pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'
        return (
          <div key={pos.companyId} className="p-1 border border-gray-700 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">{pos.company.ticker}</span>
              <span className={pnlColor}>
                {pos.pnl >= 0 ? '+' : ''}
                {pos.pnlPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{pos.shares}주</span>
              <span>₩{pos.currentValue.toLocaleString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

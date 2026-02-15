import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import type { Company, TradingStyle } from '../../types'

/* ── Constants ── */
const STYLE_EMOJI: Record<TradingStyle, string> = {
  aggressive: '🔥',
  conservative: '🐢',
  'trend-follower': '🌊',
  contrarian: '🐻',
}

const STYLE_LABELS: Record<TradingStyle, string> = {
  aggressive: '공격형',
  conservative: '안정형',
  'trend-follower': '추세형',
  contrarian: '역발상형',
}

const ACTION_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  buy: { label: '매수', color: 'text-stock-up', icon: '📈' },
  sell: { label: '매도', color: 'text-stock-down', icon: '📉' },
  panic_sell: { label: '패닉매도', color: 'text-red-700', icon: '🚨' },
}

type TabId = 'ranking' | 'trades' | 'detail'

const EMPTY_COMPANIES: Company[] = []

export function RankingWindow() {
  const competitors = useGameStore((s) => s.competitors)
  const player = useGameStore((s) => s.player)
  const taunts = useGameStore((s) => s.taunts)
  const config = useGameStore((s) => s.config)
  const competitorCount = useGameStore((s) => s.competitorCount)
  const competitorActions = useGameStore((s) => s.competitorActions)

  const [activeTab, setActiveTab] = useState<TabId>('ranking')
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null)

  // Only subscribe to companies when detail tab is active (avoids per-tick re-renders)
  const needsCompanies = activeTab === 'detail' && !!selectedCompetitorId
  const companies = useGameStore((s) =>
    needsCompanies ? s.companies : EMPTY_COMPANIES,
  )

  // Investment Battle Mode rankings
  const battleRankings = useMemo(() => {
    if (competitorCount === 0) return []

    const playerROI =
      config.initialCash > 0
        ? ((player.totalAssetValue - config.initialCash) / config.initialCash) * 100
        : 0

    const all = [
      {
        id: '__player__',
        name: 'You',
        style: null as TradingStyle | null,
        isPlayer: true,
        totalAssets: player.totalAssetValue,
        roi: playerROI,
        oneDayChange: player.lastDayChange,
      },
      ...competitors.map((c) => ({
        id: c.id,
        name: c.name,
        style: c.style as TradingStyle | null,
        isPlayer: false,
        totalAssets: c.totalAssetValue,
        roi: c.roi,
        oneDayChange: c.lastDayChange,
      })),
    ]

    return all
      .sort((a, b) => b.totalAssets - a.totalAssets)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        trend:
          entry.oneDayChange > 0
            ? ('up' as const)
            : entry.oneDayChange < 0
              ? ('down' as const)
              : ('same' as const),
      }))
  }, [competitors, player, config.initialCash, competitorCount])

  const playerRank = battleRankings.find((r) => r.isPlayer)?.rank || 0

  // Competitor name map for trade feed
  const competitorNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of competitors) {
      map[c.id] = c.name
    }
    return map
  }, [competitors])

  // Sorted actions (newest first)
  const sortedActions = useMemo(
    () => [...competitorActions].sort((a, b) => b.timestamp - a.timestamp),
    [competitorActions],
  )

  // Selected competitor data
  const selectedCompetitor = useMemo(
    () => (selectedCompetitorId ? competitors.find((c) => c.id === selectedCompetitorId) : null),
    [competitors, selectedCompetitorId],
  )

  // Company price map
  const companyPriceMap = useMemo(() => {
    const map: Record<string, { price: number; ticker: string }> = {}
    for (const c of companies) {
      map[c.id] = { price: c.price, ticker: c.ticker }
    }
    return map
  }, [companies])

  // Selected competitor's portfolio with current prices
  const competitorPortfolio = useMemo(() => {
    if (!selectedCompetitor) return []
    return Object.entries(selectedCompetitor.portfolio)
      .filter(([, pos]) => pos.shares > 0)
      .map(([companyId, pos]) => {
        const info = companyPriceMap[companyId]
        const currentPrice = info?.price ?? pos.avgBuyPrice
        const ticker = info?.ticker ?? companyId
        const pnlPct =
          pos.avgBuyPrice > 0 ? ((currentPrice - pos.avgBuyPrice) / pos.avgBuyPrice) * 100 : 0
        return {
          companyId,
          ticker,
          shares: pos.shares,
          avgBuyPrice: pos.avgBuyPrice,
          currentPrice,
          pnlPct,
        }
      })
  }, [selectedCompetitor, companyPriceMap])

  // Selected competitor's recent trades (last 20)
  const competitorTradeHistory = useMemo(() => {
    if (!selectedCompetitorId) return []
    return sortedActions
      .filter((a) => a.competitorId === selectedCompetitorId)
      .slice(0, 20)
  }, [sortedActions, selectedCompetitorId])

  // Selected competitor's taunts
  const competitorTaunts = useMemo(() => {
    if (!selectedCompetitorId) return []
    return taunts.filter((t) => t.competitorId === selectedCompetitorId)
  }, [taunts, selectedCompetitorId])

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`
    }
    return value.toFixed(0)
  }

  const time = useGameStore((s) => s.time)

  const handleCompetitorClick = (id: string) => {
    setSelectedCompetitorId(id)
    setActiveTab('detail')
  }

  // Show battle mode rankings if competitors are active
  if (competitorCount > 0) {
    return (
      <div className="text-xs h-full flex flex-col overflow-auto">
        {/* Tab Bar */}
        <div className="flex gap-0.5 px-2 pt-2 pb-1 shrink-0">
          <RetroButton
            size="sm"
            variant={activeTab === 'ranking' ? 'primary' : 'default'}
            onClick={() => setActiveTab('ranking')}
          >
            🏆 랭킹
          </RetroButton>
          <RetroButton
            size="sm"
            variant={activeTab === 'trades' ? 'primary' : 'default'}
            onClick={() => setActiveTab('trades')}
          >
            📊 거래내역
          </RetroButton>
          <RetroButton
            size="sm"
            variant={activeTab === 'detail' ? 'primary' : 'default'}
            onClick={() => setActiveTab('detail')}
            disabled={!selectedCompetitorId}
          >
            👤 상세
          </RetroButton>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden px-2 pb-2 flex flex-col gap-2">
          {/* Tab 1: Rankings */}
          {activeTab === 'ranking' && (
            <>
              {/* Header Stats */}
              <div className="p-2 bg-win-highlight border-2 border-win-shadow rounded shrink-0">
                <div className="text-[10px] text-retro-gray">Your Rank</div>
                <div className="text-2xl font-bold">
                  {playerRank === 1 && '🥇'}
                  {playerRank === 2 && '🥈'}
                  {playerRank === 3 && '🥉'}
                  {playerRank > 3 && `#${playerRank}`}
                </div>
              </div>

              {/* Rankings Table */}
              <div className="flex-1 overflow-auto border-2 border-win-shadow bg-white">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-win-face border-b-2 border-win-shadow">
                    <tr>
                      <th className="p-1 text-left">Rank</th>
                      <th className="p-1 text-left">Name</th>
                      <th className="p-1 text-right">Assets</th>
                      <th className="p-1 text-right">ROI</th>
                      <th className="p-1 text-right">1-Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battleRankings.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-win-shadow ${
                          entry.isPlayer
                            ? 'bg-win-highlight font-bold'
                            : 'hover:bg-win-face cursor-pointer'
                        }`}
                        data-rank={entry.rank}
                        onClick={() => {
                          if (!entry.isPlayer) handleCompetitorClick(entry.id)
                        }}
                      >
                        <td className="p-1">
                          <span className="text-sm">
                            {entry.rank === 1 && '🥇'}
                            {entry.rank === 2 && '🥈'}
                            {entry.rank === 3 && '🥉'}
                            {entry.rank > 3 && entry.rank}
                          </span>
                        </td>
                        <td className="p-1">
                          {entry.style && (
                            <span className="mr-0.5">{STYLE_EMOJI[entry.style]}</span>
                          )}
                          {entry.name}
                          {entry.isPlayer && (
                            <span className="ml-1 text-[9px] text-win-highlight-text">(You)</span>
                          )}
                        </td>
                        <td className="p-1 text-right font-mono">
                          {formatCurrency(entry.totalAssets)}
                        </td>
                        <td
                          className={`p-1 text-right font-mono ${entry.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {entry.roi >= 0 && '+'}
                          {entry.roi.toFixed(2)}%
                        </td>
                        <td className="p-1 text-right">
                          {entry.trend === 'up' && <span className="text-green-600">📈</span>}
                          {entry.trend === 'down' && <span className="text-red-600">📉</span>}
                          {entry.trend === 'same' && <span className="text-retro-gray">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Taunt Feed */}
              <div className="border-2 border-win-shadow bg-white p-2 shrink-0">
                <div className="text-[10px] font-bold mb-1 flex items-center gap-1">
                  💬 Rival Talk
                </div>
                <div className="space-y-1">
                  {taunts.length === 0 && (
                    <div className="text-[9px] text-retro-gray italic">No messages yet...</div>
                  )}
                  {taunts
                    .slice(-5)
                    .reverse()
                    .map((taunt) => (
                      <div
                        key={`${taunt.timestamp}-${taunt.competitorId}`}
                        className={`text-[9px] p-1 rounded ${
                          taunt.type === 'panic'
                            ? 'bg-red-50 border-l-2 border-red-500'
                            : taunt.type === 'champion'
                              ? 'bg-yellow-50 border-l-2 border-yellow-500'
                              : taunt.type === 'overtake_player'
                                ? 'bg-purple-50 border-l-2 border-purple-500'
                                : 'bg-blue-50 border-l-2 border-blue-500'
                        }`}
                      >
                        <span className="font-semibold">{taunt.competitorName}:</span>
                        <span className="ml-1 text-retro-gray">{taunt.message}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {/* Tab 2: Trade Feed */}
          {activeTab === 'trades' && (
            <div className="flex-1 overflow-auto border-2 border-win-shadow bg-white">
              {sortedActions.length === 0 ? (
                <div className="p-4 text-center text-retro-gray text-[11px]">
                  아직 거래 내역이 없습니다...
                </div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-win-face border-b-2 border-win-shadow">
                    <tr>
                      <th className="p-1 text-left">경쟁자</th>
                      <th className="p-1 text-left">액션</th>
                      <th className="p-1 text-left">종목</th>
                      <th className="p-1 text-right">수량</th>
                      <th className="p-1 text-right">가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedActions.map((action) => {
                      const display = ACTION_DISPLAY[action.action] ?? {
                        label: action.action,
                        color: '',
                        icon: '',
                      }
                      const isPanic = action.action === 'panic_sell'
                      return (
                        <tr
                          key={`${action.timestamp}-${action.competitorId}-${action.symbol}`}
                          className={`border-b border-win-shadow ${isPanic ? 'bg-red-50' : 'hover:bg-win-face'}`}
                        >
                          <td className="p-1 font-medium">
                            {competitorNameMap[action.competitorId] ?? '?'}
                          </td>
                          <td className={`p-1 font-bold ${display.color}`}>
                            {display.icon} {display.label}
                          </td>
                          <td className="p-1 font-mono">{action.symbol}</td>
                          <td className="p-1 text-right font-mono">
                            {action.quantity.toLocaleString()}
                          </td>
                          <td className="p-1 text-right font-mono">
                            {formatCurrency(action.price)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 3: Competitor Detail */}
          {activeTab === 'detail' && (
            <>
              {!selectedCompetitor ? (
                <div className="flex-1 flex items-center justify-center text-retro-gray text-[11px]">
                  랭킹 탭에서 경쟁자를 클릭하세요
                </div>
              ) : (
                <div className="flex-1 overflow-auto space-y-2">
                  {/* Back button */}
                  <div className="shrink-0">
                    <RetroButton size="sm" onClick={() => setActiveTab('ranking')}>
                      ← 뒤로
                    </RetroButton>
                  </div>

                  {/* Profile */}
                  <div className="p-2 bg-win-highlight border-2 border-win-shadow rounded">
                    <div className="text-sm font-bold">
                      {STYLE_EMOJI[selectedCompetitor.style]} {selectedCompetitor.name}
                    </div>
                    <div className="text-[10px] text-retro-gray">
                      전략: {STYLE_LABELS[selectedCompetitor.style]}
                    </div>
                  </div>

                  {/* Asset Summary (2-col grid) */}
                  <div className="grid grid-cols-2 gap-1">
                    <div className="win-inset bg-white p-1.5">
                      <div className="text-[9px] text-retro-gray">총자산</div>
                      <div className="font-bold font-mono">
                        {formatCurrency(selectedCompetitor.totalAssetValue)}
                      </div>
                    </div>
                    <div className="win-inset bg-white p-1.5">
                      <div className="text-[9px] text-retro-gray">보유현금</div>
                      <div className="font-bold font-mono">
                        {formatCurrency(selectedCompetitor.cash)}
                      </div>
                    </div>
                    <div className="win-inset bg-white p-1.5 col-span-2">
                      <div className="text-[9px] text-retro-gray">수익률</div>
                      <div
                        className={`font-bold font-mono ${selectedCompetitor.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {selectedCompetitor.roi >= 0 && '+'}
                        {selectedCompetitor.roi.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Holdings */}
                  <div>
                    <div className="text-[10px] font-bold mb-1">📦 보유 종목</div>
                    {competitorPortfolio.length === 0 ? (
                      <div className="text-[9px] text-retro-gray p-1">보유 종목 없음</div>
                    ) : (
                      <div className="border-2 border-win-shadow bg-white overflow-auto">
                        <table className="w-full text-[10px]">
                          <thead className="sticky top-0 bg-win-face border-b border-win-shadow">
                            <tr>
                              <th className="p-0.5 text-left">종목</th>
                              <th className="p-0.5 text-right">수량</th>
                              <th className="p-0.5 text-right">현재가</th>
                              <th className="p-0.5 text-right">손익%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {competitorPortfolio.map((pos) => (
                              <tr key={pos.companyId} className="border-b border-win-shadow">
                                <td className="p-0.5 font-mono">{pos.ticker}</td>
                                <td className="p-0.5 text-right font-mono">
                                  {pos.shares.toLocaleString()}
                                </td>
                                <td className="p-0.5 text-right font-mono">
                                  {formatCurrency(pos.currentPrice)}
                                </td>
                                <td
                                  className={`p-0.5 text-right font-mono ${pos.pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {pos.pnlPct >= 0 && '+'}
                                  {pos.pnlPct.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Trades */}
                  <div>
                    <div className="text-[10px] font-bold mb-1">📊 최근 거래</div>
                    {competitorTradeHistory.length === 0 ? (
                      <div className="text-[9px] text-retro-gray p-1">거래 내역 없음</div>
                    ) : (
                      <div className="border-2 border-win-shadow bg-white overflow-auto">
                        <table className="w-full text-[10px]">
                          <thead className="sticky top-0 bg-win-face border-b border-win-shadow">
                            <tr>
                              <th className="p-0.5 text-left">액션</th>
                              <th className="p-0.5 text-left">종목</th>
                              <th className="p-0.5 text-right">수량</th>
                              <th className="p-0.5 text-right">가격</th>
                            </tr>
                          </thead>
                          <tbody>
                            {competitorTradeHistory.map((action) => {
                              const display = ACTION_DISPLAY[action.action] ?? {
                                label: action.action,
                                color: '',
                                icon: '',
                              }
                              return (
                                <tr
                                  key={`${action.timestamp}-${action.symbol}`}
                                  className={`border-b border-win-shadow ${action.action === 'panic_sell' ? 'bg-red-50' : ''}`}
                                >
                                  <td className={`p-0.5 font-bold ${display.color}`}>
                                    {display.icon} {display.label}
                                  </td>
                                  <td className="p-0.5 font-mono">{action.symbol}</td>
                                  <td className="p-0.5 text-right font-mono">
                                    {action.quantity.toLocaleString()}
                                  </td>
                                  <td className="p-0.5 text-right font-mono">
                                    {formatCurrency(action.price)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Taunts */}
                  <div>
                    <div className="text-[10px] font-bold mb-1">💬 발언</div>
                    {competitorTaunts.length === 0 ? (
                      <div className="text-[9px] text-retro-gray p-1">발언 없음</div>
                    ) : (
                      <div className="space-y-1">
                        {competitorTaunts
                          .slice(-10)
                          .reverse()
                          .map((taunt) => (
                            <div
                              key={`${taunt.timestamp}-${taunt.type}`}
                              className={`text-[9px] p-1 rounded ${
                                taunt.type === 'panic'
                                  ? 'bg-red-50 border-l-2 border-red-500'
                                  : taunt.type === 'champion'
                                    ? 'bg-yellow-50 border-l-2 border-yellow-500'
                                    : 'bg-blue-50 border-l-2 border-blue-500'
                              }`}
                            >
                              {taunt.message}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Original single-player milestone mode
  const milestones = [
    { label: '자산 1천만원', target: 10_000_000, icon: '🥉' },
    { label: '자산 5천만원', target: 50_000_000, icon: '🥈' },
    { label: '자산 1억원', target: 100_000_000, icon: '🥇' },
    { label: '자산 5억원', target: 500_000_000, icon: '🏆' },
    { label: '자산 10억원', target: 1_000_000_000, icon: '👑' },
  ]
  const elapsed = time.year - config.startYear
  const returnRate =
    config.initialCash > 0
      ? ((player.totalAssetValue - config.initialCash) / config.initialCash) * 100
      : 0

  return (
    <div className="text-xs p-1 space-y-3">
      <div className="text-center">
        <div className="text-sm font-bold">🏆 투자 성과</div>
      </div>

      {/* Current stats */}
      <div className="win-inset bg-white p-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-retro-gray">난이도:</span>
          <span className="font-bold">{config.difficulty.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-retro-gray">경과 기간:</span>
          <span className="font-bold">{elapsed}년</span>
        </div>
        <div className="flex justify-between">
          <span className="text-retro-gray">초기 자본:</span>
          <span>{config.initialCash.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-retro-gray">현재 자산:</span>
          <span className="font-bold">{player.totalAssetValue.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-retro-gray">수익률:</span>
          <span className={`font-bold ${returnRate >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {returnRate >= 0 ? '+' : ''}
            {returnRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-1">
        <div className="font-bold">달성 마일스톤</div>
        {milestones.map((m) => {
          const achieved = player.totalAssetValue >= m.target
          return (
            <div
              key={m.target}
              className={`flex items-center gap-1 p-1 ${achieved ? 'bg-retro-yellow/20' : 'opacity-50'}`}
            >
              <span>{m.icon}</span>
              <span className={achieved ? 'font-bold' : 'line-through'}>{m.label}</span>
              {achieved && <span className="ml-auto text-retro-green text-[10px]">달성!</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

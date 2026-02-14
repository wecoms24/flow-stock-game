import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function RankingWindow() {
  const competitors = useGameStore((s) => s.competitors)
  const player = useGameStore((s) => s.player)
  const taunts = useGameStore((s) => s.taunts)
  const config = useGameStore((s) => s.config)
  const competitorCount = useGameStore((s) => s.competitorCount)

  // Investment Battle Mode rankings
  const battleRankings = useMemo(() => {
    if (competitorCount === 0) return []

    const playerROI =
      config.initialCash > 0
        ? ((player.totalAssetValue - config.initialCash) / config.initialCash) * 100
        : 0

    const all = [
      {
        name: 'You',
        isPlayer: true,
        totalAssets: player.totalAssetValue,
        roi: playerROI,
        oneDayChange: player.lastDayChange,
      },
      ...competitors.map((c) => ({
        name: c.name,
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

  // Single-player mode (original milestones)
  const { time } = useGameStore()
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

  // Show battle mode rankings if competitors are active
  if (competitorCount > 0) {
    return (
      <div className="text-xs p-3 h-full flex flex-col gap-3 overflow-hidden">
        {/* Header Stats */}
        <div className="p-2 bg-win-highlight border-2 border-win-shadow rounded">
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
                  key={entry.name}
                  className={`border-b border-win-shadow ${entry.isPlayer ? 'bg-win-highlight font-bold' : 'hover:bg-win-face'}`}
                  data-rank={entry.rank}
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
                    {entry.name}
                    {entry.isPlayer && (
                      <span className="ml-1 text-[9px] text-win-highlight-text">(You)</span>
                    )}
                  </td>
                  <td className="p-1 text-right font-mono">{formatCurrency(entry.totalAssets)}</td>
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
        <div className="border-2 border-win-shadow bg-white p-2 max-h-32 overflow-auto">
          <div className="text-[10px] font-bold mb-1 flex items-center gap-1">💬 Rival Talk</div>
          <div className="space-y-1">
            {taunts.length === 0 && (
              <div className="text-[9px] text-retro-gray italic">No messages yet...</div>
            )}
            {taunts
              .slice(-5)
              .reverse()
              .map((taunt, i) => (
                <div
                  key={i}
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
      </div>
    )
  }

  // Original single-player milestone mode
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

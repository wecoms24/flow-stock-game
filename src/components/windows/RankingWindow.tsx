import { useGameStore } from '../../stores/gameStore'

export function RankingWindow() {
  const { player, time, config } = useGameStore()

  // Simple milestone-based ranking for single-player
  const milestones = [
    { label: '자산 1천만원', target: 10_000_000, icon: '🥉' },
    { label: '자산 5천만원', target: 50_000_000, icon: '🥈' },
    { label: '자산 1억원', target: 100_000_000, icon: '🥇' },
    { label: '자산 5억원', target: 500_000_000, icon: '🏆' },
    { label: '자산 10억원', target: 1_000_000_000, icon: '👑' },
  ]

  const elapsed = time.year - config.startYear
  const returnRate = config.initialCash > 0
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
            {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(1)}%
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

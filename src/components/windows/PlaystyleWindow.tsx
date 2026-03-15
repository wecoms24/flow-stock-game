import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

/* ── Archetype Classification ── */
function getArchetype(
  riskTolerance: number,
  playPace: number,
  attention: number,
): { name: string; description: string } {
  if (riskTolerance < 0.35) {
    return { name: '신중한 축적자', description: '낮은 리스크를 선호하며 안정적인 수익을 추구합니다.' }
  }
  if (playPace > 0.65 && riskTolerance > 0.65) {
    return { name: '모멘텀 서퍼', description: '빠른 속도와 높은 리스크로 시장 흐름을 탑니다.' }
  }
  if (attention > 0.65) {
    return { name: '분석가', description: '높은 집중도로 시장을 면밀히 분석합니다.' }
  }
  if (riskTolerance > 0.65 && attention < 0.35) {
    return { name: '대담한 투자자', description: '과감한 결정을 빠르게 내리는 직감형 투자자입니다.' }
  }
  return { name: '균형 잡힌 투자자', description: '리스크와 수익의 균형을 잘 맞추는 투자자입니다.' }
}

/* ── Stat Bar ── */
function StatBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100)
  const barColor =
    percent >= 70 ? 'bg-[#008000]' : percent >= 40 ? 'bg-[#808000]' : 'bg-[#800000]'

  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span>{label}</span>
        <span className="font-bold">{percent}%</span>
      </div>
      <div className="win-inset h-4 relative">
        <div
          className={`${barColor} h-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/* ── Main Component ── */
export function PlaystyleWindow() {
  const playerProfile = useGameStore((s) => s.playerProfile)
  const realizedTrades = useGameStore((s) => s.realizedTrades)
  const companies = useGameStore((s) => s.companies)
  const tradeStreak = useGameStore((s) => s.player.tradeStreak)

  const archetype = useMemo(
    () =>
      getArchetype(playerProfile.riskTolerance, playerProfile.playPace, playerProfile.attention),
    [playerProfile.riskTolerance, playerProfile.playPace, playerProfile.attention],
  )

  const tradingStats = useMemo(() => {
    const trades = realizedTrades ?? []
    const total = trades.length
    const wins = trades.filter((t) => t.pnl > 0).length
    const winRate = total > 0 ? (wins / total) * 100 : 0
    const avgProfit = total > 0 ? trades.reduce((sum, t) => sum + t.pnl, 0) / total : 0
    return { total, wins, winRate, avgProfit }
  }, [realizedTrades])

  const sectorBreakdown = useMemo(() => {
    const trades = realizedTrades ?? []
    const companyMap = new Map(companies.map((c) => [c.id, c]))
    const sectorCounts: Record<string, number> = {}

    for (const trade of trades) {
      const company = companyMap.get(trade.companyId)
      if (company) {
        sectorCounts[company.sector] = (sectorCounts[company.sector] ?? 0) + 1
      }
    }

    const sorted = Object.entries(sectorCounts).sort(([, a], [, b]) => b - a)
    const max = sorted.length > 0 ? sorted[0][1] : 1
    return { sorted, max }
  }, [realizedTrades, companies])

  const SECTOR_LABELS: Record<string, string> = {
    tech: 'IT',
    finance: '금융',
    energy: '에너지',
    healthcare: '의료',
    consumer: '소비재',
    industrial: '산업재',
    telecom: '통신',
    materials: '소재',
    utilities: '유틸리티',
    realestate: '부동산',
  }

  const SECTOR_COLORS: Record<string, string> = {
    tech: '#0000FF',
    finance: '#008000',
    energy: '#FF8000',
    healthcare: '#FF0000',
    consumer: '#800080',
    industrial: '#808080',
    telecom: '#008080',
    materials: '#804000',
    utilities: '#000080',
    realestate: '#808000',
  }

  function formatMoney(amount: number): string {
    const abs = Math.abs(amount)
    const sign = amount < 0 ? '-' : '+'
    if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`
    if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
    return `${sign}${abs.toLocaleString()}원`
  }

  return (
    <div className="p-3 text-xs overflow-y-auto h-full" style={{ maxHeight: 460 }}>
      {/* Section 1: Archetype */}
      <div className="win-panel p-3 mb-3 text-center">
        <div className="text-sm font-bold mb-1">플레이스타일 분석</div>
        <div
          className="text-base font-bold mb-1"
          style={{ color: '#000080' }}
        >
          {archetype.name}
        </div>
        <div className="text-[10px] text-gray-600">{archetype.description}</div>
      </div>

      {/* Section 2: Stats Grid */}
      <div className="win-panel p-3 mb-3">
        <div className="text-xs font-bold mb-2 border-b border-gray-400 pb-1">성향 지표</div>
        <StatBar label="위험 성향" value={playerProfile.riskTolerance} />
        <StatBar label="플레이 속도" value={playerProfile.playPace} />
        <StatBar label="집중도" value={playerProfile.attention} />
      </div>

      {/* Section 3: Trading Summary */}
      <div className="win-panel p-3 mb-3">
        <div className="text-xs font-bold mb-2 border-b border-gray-400 pb-1">거래 요약</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="win-inset p-2 text-center">
            <div className="text-[10px] text-gray-600">총 거래</div>
            <div className="font-bold">{tradingStats.total}건</div>
          </div>
          <div className="win-inset p-2 text-center">
            <div className="text-[10px] text-gray-600">승률</div>
            <div className="font-bold">{tradingStats.winRate.toFixed(1)}%</div>
          </div>
          <div className="win-inset p-2 text-center">
            <div className="text-[10px] text-gray-600">평균 수익</div>
            <div
              className="font-bold"
              style={{ color: tradingStats.avgProfit >= 0 ? '#008000' : '#FF0000' }}
            >
              {tradingStats.total > 0 ? formatMoney(tradingStats.avgProfit) : '-'}
            </div>
          </div>
          <div className="win-inset p-2 text-center">
            <div className="text-[10px] text-gray-600">연속 수익</div>
            <div className="font-bold">{tradeStreak}연승</div>
          </div>
        </div>
      </div>

      {/* Section 4: Sector Breakdown */}
      <div className="win-panel p-3">
        <div className="text-xs font-bold mb-2 border-b border-gray-400 pb-1">섹터별 거래</div>
        {sectorBreakdown.sorted.length === 0 ? (
          <div className="text-center text-gray-500 py-2">거래 기록이 없습니다</div>
        ) : (
          <div className="space-y-1.5">
            {sectorBreakdown.sorted.map(([sector, count]) => (
              <div key={sector}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span>{SECTOR_LABELS[sector] ?? sector}</span>
                  <span>{count}건</span>
                </div>
                <div className="win-inset h-3 relative">
                  <div
                    className="h-full"
                    style={{
                      width: `${(count / sectorBreakdown.max) * 100}%`,
                      backgroundColor: SECTOR_COLORS[sector] ?? '#808080',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

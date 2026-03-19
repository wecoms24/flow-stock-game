import { useMemo, useRef, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { CompetitorPortrait } from '../ui/CompetitorPortrait'
import type { TradingStyle } from '../../types'

function formatGap(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000_000) return `₩${(abs / 1_000_000_000_000).toFixed(1)}T`
  if (abs >= 1_000_000_000) return `₩${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `₩${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `₩${(abs / 1_000).toFixed(0)}K`
  return `₩${abs.toFixed(0)}`
}

export function CompetitorWidget() {
  const competitors = useGameStore((s) => s.competitors)
  const playerTotalAssets = useGameStore((s) => s.player.totalAssetValue)
  const playerROI = useGameStore((s) => {
    const totalAssets = s.player.totalAssetValue
    const initialCash = s.config.initialCash
    return initialCash > 0 ? ((totalAssets - initialCash) / initialCash) * 100 : 0
  })

  const prevRankRef = useRef<number | null>(null)

  const { sorted, playerRank, gapToFirst } = useMemo(() => {
    const sorted = [...competitors].sort((a, b) => b.roi - a.roi).slice(0, 3)
    const countAhead = competitors.filter((c) => c.roi > playerROI).length
    const playerRank = countAhead + 1

    let gapToFirst = 0
    if (playerRank > 1) {
      const firstPlace = competitors.reduce((best, c) =>
        c.totalAssetValue > best.totalAssetValue ? c : best
      , competitors[0])
      gapToFirst = firstPlace.totalAssetValue - playerTotalAssets
    }

    return { sorted, playerRank, gapToFirst }
  }, [competitors, playerROI, playerTotalAssets])

  const rankDelta = prevRankRef.current != null ? prevRankRef.current - playerRank : 0

  useEffect(() => {
    prevRankRef.current = playerRank
  }, [playerRank])

  if (sorted.length === 0) return null

  return (
    <div className="flex items-center gap-0.5 px-1" title="라이벌 순위 (상위 3)">
      <span className="text-[8px] text-win-text opacity-70 mr-0.5">
        #{playerRank}
        {rankDelta > 0 && <span className="text-stock-up ml-px">▲{rankDelta}</span>}
        {rankDelta < 0 && <span className="text-stock-down ml-px">▼{Math.abs(rankDelta)}</span>}
      </span>
      <span className="text-[7px] text-win-text opacity-60 mr-0.5">
        {playerRank === 1 ? '1위 (나)' : `1위까지 ${formatGap(gapToFirst)}`}
      </span>
      {sorted.map((comp) => {
        const isAhead = comp.roi > playerROI
        const wins = comp.headToHeadWins ?? 0
        const losses = comp.headToHeadLosses ?? 0
        const record = wins + losses > 0 ? `${wins}승${losses}패` : ''
        return (
          <div
            key={comp.id}
            className="flex items-center gap-0.5 text-[9px] tabular-nums"
            title={`${comp.name} (${comp.style})\nROI: ${comp.roi >= 0 ? '+' : ''}${comp.roi.toFixed(1)}%\n대결: ${record || '기록 없음'}`}
          >
            <CompetitorPortrait
              style={comp.style as TradingStyle}
              mood={isAhead ? 'winning' : 'losing'}
              size={16}
            />
            <span
              className={isAhead ? 'text-stock-down font-bold' : 'text-stock-up'}
            >
              {comp.roi >= 0 ? '+' : ''}{comp.roi.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

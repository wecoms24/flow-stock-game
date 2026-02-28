import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

const STYLE_ICONS: Record<string, string> = {
  aggressive: '🦈',
  conservative: '🐢',
  'trend-follower': '🏄',
  contrarian: '🐻',
}

export function CompetitorWidget() {
  const competitors = useGameStore((s) => s.competitors)
  const playerROI = useGameStore((s) => {
    const totalAssets = s.player.totalAssetValue
    const initialCash = s.config.initialCash
    return initialCash > 0 ? ((totalAssets - initialCash) / initialCash) * 100 : 0
  })

  const sorted = useMemo(
    () => [...competitors].sort((a, b) => b.roi - a.roi).slice(0, 3),
    [competitors],
  )

  if (sorted.length === 0) return null

  return (
    <div className="flex items-center gap-0.5 px-1" title="라이벌 순위 (상위 3)">
      {sorted.map((comp) => {
        const isAhead = comp.roi > playerROI
        return (
          <div
            key={comp.id}
            className="flex items-center gap-0.5 text-[9px] tabular-nums"
            title={`${comp.name} (${comp.style}) ROI: ${comp.roi >= 0 ? '+' : ''}${comp.roi.toFixed(1)}%`}
          >
            <span>{STYLE_ICONS[comp.style] ?? '💼'}</span>
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

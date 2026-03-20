import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function StockTicker() {
  const companies = useGameStore((s) => s.companies)
  const totalAssetValue = useGameStore((s) => s.player.totalAssetValue)
  const initialCash = useGameStore((s) => s.config.initialCash)
  const roi = initialCash > 0 ? ((totalAssetValue - initialCash) / initialCash) * 100 : 0
  const isProfit = roi >= 0

  // Memoize sort to prevent re-sorting 100 companies every render
  const topCompanies = useMemo(
    () => [...companies].sort((a, b) => b.marketCap - a.marketCap).slice(0, 20),
    [companies],
  )

  const tickerItems = useMemo(
    () =>
      topCompanies.map((c) => {
        const change = c.price - c.previousPrice
        const changePercent = c.previousPrice ? (change / c.previousPrice) * 100 : 0
        const isUp = change >= 0
        return { id: c.id, ticker: c.ticker, price: c.price, changePercent, isUp }
      }),
    [topCompanies],
  )

  const formatAsset = (n: number) => {
    if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`
    if (n >= 1e4) return `${Math.floor(n / 1e4).toLocaleString()}만`
    return n.toLocaleString()
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-7 bg-retro-black z-[10000] overflow-hidden flex items-center">
      {/* 좌측: 주가 티커 */}
      <div className="ticker-scroll whitespace-nowrap flex gap-6 text-[13px] flex-1">
        {[0, 1].map((pass) =>
          tickerItems.map((item) => (
            <span key={`${pass}-${item.id}`} className="inline-flex items-center gap-1">
              <span className="text-retro-yellow font-bold">{item.ticker}</span>
              <span className="text-retro-white">{item.price.toLocaleString()}</span>
              <span className={item.isUp ? 'text-retro-red' : 'text-retro-cyan'}>
                {item.isUp ? '▲' : '▼'}
                {Math.abs(item.changePercent).toFixed(1)}%
              </span>
            </span>
          )),
        )}
      </div>

      {/* 가운데: 디지털 시계 스타일 수익률 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 px-3 py-0.5 rounded shrink-0 flex items-center gap-2"
        style={{
          background: 'rgba(0,0,0,0.85)',
          border: `1px solid ${isProfit ? '#ff4444' : '#4488ff'}40`,
          boxShadow: `0 0 8px ${isProfit ? '#ff4444' : '#4488ff'}30`,
        }}
      >
        <span
          className="font-mono font-bold text-[15px] tabular-nums tracking-wider"
          style={{
            color: isProfit ? '#ff4444' : '#4488ff',
            textShadow: `0 0 6px ${isProfit ? '#ff4444' : '#4488ff'}80`,
          }}
        >
          {isProfit ? '+' : ''}{roi.toFixed(2)}%
        </span>
        <span
          className="text-[10px] font-mono tabular-nums opacity-70"
          style={{ color: isProfit ? '#ff8888' : '#88aaff' }}
        >
          {formatAsset(totalAssetValue)}원
        </span>
      </div>
    </div>
  )
}

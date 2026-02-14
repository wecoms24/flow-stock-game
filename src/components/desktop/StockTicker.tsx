import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function StockTicker() {
  const companies = useGameStore((s) => s.companies)

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

  return (
    <div className="fixed top-0 left-0 right-0 h-5 bg-retro-black z-[10000] overflow-hidden flex items-center">
      <div className="ticker-scroll whitespace-nowrap flex gap-6 text-[11px]">
        {/* Render twice for seamless CSS animation loop */}
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
    </div>
  )
}

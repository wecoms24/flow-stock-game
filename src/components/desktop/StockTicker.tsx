import { useGameStore } from '../../stores/gameStore'

export function StockTicker() {
  const companies = useGameStore((s) => s.companies)

  // Show top 20 companies by market cap for the ticker
  const topCompanies = [...companies]
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 20)

  return (
    <div className="fixed top-0 left-0 right-0 h-5 bg-retro-black z-[10000] overflow-hidden flex items-center">
      <div className="ticker-scroll whitespace-nowrap flex gap-6 text-[11px]">
        {topCompanies.map((c) => {
          const change = c.price - c.previousPrice
          const changePercent = c.previousPrice ? (change / c.previousPrice) * 100 : 0
          const isUp = change >= 0

          return (
            <span key={c.id} className="inline-flex items-center gap-1">
              <span className="text-retro-yellow font-bold">{c.ticker}</span>
              <span className="text-retro-white">{c.price.toLocaleString()}</span>
              <span className={isUp ? 'text-retro-red' : 'text-retro-cyan'}>
                {isUp ? '▲' : '▼'}
                {Math.abs(changePercent).toFixed(1)}%
              </span>
            </span>
          )
        })}
        {/* Duplicate for seamless scrolling */}
        {topCompanies.map((c) => {
          const change = c.price - c.previousPrice
          const changePercent = c.previousPrice ? (change / c.previousPrice) * 100 : 0
          const isUp = change >= 0

          return (
            <span key={`dup-${c.id}`} className="inline-flex items-center gap-1">
              <span className="text-retro-yellow font-bold">{c.ticker}</span>
              <span className="text-retro-white">{c.price.toLocaleString()}</span>
              <span className={isUp ? 'text-retro-red' : 'text-retro-cyan'}>
                {isUp ? '▲' : '▼'}
                {Math.abs(changePercent).toFixed(1)}%
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

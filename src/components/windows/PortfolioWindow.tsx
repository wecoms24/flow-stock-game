import { useGameStore } from '../../stores/gameStore'

export function PortfolioWindow() {
  const { player, companies } = useGameStore()

  const positions = Object.values(player.portfolio)
  const totalStockValue = positions.reduce((sum, pos) => {
    const company = companies.find((c) => c.id === pos.companyId)
    return sum + (company ? company.price * pos.shares : 0)
  }, 0)
  const totalAssets = player.cash + totalStockValue

  return (
    <div className="text-xs space-y-2">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span className="text-retro-gray">보유 현금:</span>
        <span className="text-right font-bold">
          {player.cash.toLocaleString()}원
        </span>
        <span className="text-retro-gray">주식 평가:</span>
        <span className="text-right font-bold">
          {totalStockValue.toLocaleString()}원
        </span>
        <span className="text-retro-gray">총 자산:</span>
        <span className="text-right font-bold text-retro-darkblue">
          {totalAssets.toLocaleString()}원
        </span>
      </div>

      <hr className="border-win-shadow" />

      {/* Positions Table */}
      {positions.length === 0 ? (
        <div className="text-center text-retro-gray py-4">보유 종목이 없습니다</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-retro-gray">
              <th className="text-left font-normal">종목</th>
              <th className="text-right font-normal">수량</th>
              <th className="text-right font-normal">현재가</th>
              <th className="text-right font-normal">수익률</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const company = companies.find((c) => c.id === pos.companyId)
              if (!company) return null
              const currentValue = company.price * pos.shares
              const costBasis = pos.avgBuyPrice * pos.shares
              const pnlPercent = ((currentValue - costBasis) / costBasis) * 100
              const isUp = pnlPercent >= 0

              return (
                <tr key={pos.companyId} className="hover:bg-win-highlight/20">
                  <td className="text-left">
                    <span className="font-bold">{company.ticker}</span>
                  </td>
                  <td className="text-right">{pos.shares}</td>
                  <td className="text-right">{company.price.toLocaleString()}</td>
                  <td className={`text-right font-bold ${isUp ? 'text-stock-up' : 'text-stock-down'}`}>
                    {isUp ? '+' : ''}
                    {pnlPercent.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

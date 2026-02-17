/**
 * QuickTradePanel
 *
 * 빠른 매수/매도 패널 (대시보드 내)
 */

import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function QuickTradePanel() {
  const companies = useGameStore((s) => s.companies)
  const cash = useGameStore((s) => s.player.cash)
  const portfolio = useGameStore((s) => s.player.portfolio)
  const buyStock = useGameStore((s) => s.buyStock)
  const sellStock = useGameStore((s) => s.sellStock)

  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [shares, setShares] = useState(1)

  const activeCompanies = useMemo(
    () => companies.filter((c) => c.status === 'active'),
    [companies],
  )

  const selectedCompany = activeCompanies.find((c) => c.id === selectedCompanyId)
  const position = selectedCompanyId ? portfolio[selectedCompanyId] : undefined
  const totalCost = selectedCompany ? selectedCompany.price * shares : 0
  const canBuy = totalCost <= cash && totalCost > 0
  const canSell = position ? position.shares >= shares : false

  return (
    <div className="space-y-2">
      {/* Company selector */}
      <select
        value={selectedCompanyId}
        onChange={(e) => setSelectedCompanyId(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 text-white text-xs p-1"
      >
        <option value="">종목 선택...</option>
        {activeCompanies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.ticker} - ₩{c.price.toLocaleString()}
          </option>
        ))}
      </select>

      {/* Shares input */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-400 w-8">수량</label>
        <input
          type="number"
          min={1}
          value={shares}
          onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
          className="flex-1 bg-gray-800 border border-gray-600 text-white text-xs p-1 w-16"
        />
      </div>

      {/* Price info */}
      {selectedCompany && (
        <div className="text-[10px] text-gray-400">
          <div className="flex justify-between">
            <span>거래 금액</span>
            <span className="text-white">₩{totalCost.toLocaleString()}</span>
          </div>
          {position && (
            <div className="flex justify-between">
              <span>보유 수량</span>
              <span className="text-white">{position.shares}주</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => {
            if (selectedCompanyId && canBuy) buyStock(selectedCompanyId, shares)
          }}
          disabled={!canBuy}
          className={`
            flex-1 py-1 text-xs font-bold border
            ${canBuy ? 'bg-blue-800 border-blue-600 text-blue-200 hover:bg-blue-700' : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'}
          `}
        >
          매수
        </button>
        <button
          onClick={() => {
            if (selectedCompanyId && canSell) sellStock(selectedCompanyId, shares)
          }}
          disabled={!canSell}
          className={`
            flex-1 py-1 text-xs font-bold border
            ${canSell ? 'bg-red-800 border-red-600 text-red-200 hover:bg-red-700' : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'}
          `}
        >
          매도
        </button>
      </div>
    </div>
  )
}

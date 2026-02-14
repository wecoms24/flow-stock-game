import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import type { Company } from '../../types'

interface TradingWindowProps {
  companyId?: string
}

export function TradingWindow({ companyId }: TradingWindowProps) {
  const { companies, player, buyStock, sellStock } = useGameStore()
  const [selectedId, setSelectedId] = useState(companyId ?? companies[0]?.id ?? '')
  const [shares, setShares] = useState(1)
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [companiesSnapshot, setCompaniesSnapshot] = useState<Company[]>(companies)

  // 드롭다운 열릴 때 가격 스냅샷 저장
  const handleDropdownOpen = () => {
    setIsDropdownOpen(true)
    setCompaniesSnapshot(companies)
  }

  // 드롭다운 닫힐 때 최신 가격으로 전환
  const handleDropdownClose = () => {
    setIsDropdownOpen(false)
  }

  // 선택 중일 때는 스냅샷, 아닐 때는 실시간 가격
  const displayCompanies = isDropdownOpen ? companiesSnapshot : companies

  const company = companies.find((c) => c.id === selectedId)
  const position = player.portfolio[selectedId]

  if (!company) return <div className="text-xs text-retro-gray">종목 없음</div>

  const totalCost = company.price * shares
  const maxBuyable = Math.floor(player.cash / company.price)
  const maxSellable = position?.shares ?? 0

  const handleTrade = () => {
    if (mode === 'buy') {
      buyStock(selectedId, shares)
    } else {
      sellStock(selectedId, shares)
    }
    setShares(1)
  }

  return (
    <div className="text-xs space-y-2">
      {/* Company selector */}
      <select
        className="w-full win-inset bg-white px-1 py-0.5"
        value={selectedId}
        onFocus={handleDropdownOpen}
        onBlur={handleDropdownClose}
        onChange={(e) => {
          setSelectedId(e.target.value)
          setShares(1)
          handleDropdownClose()
        }}
      >
        {displayCompanies.map((c) => (
          <option key={c.id} value={c.id}>
            [{c.ticker}] {c.name} - {c.price.toLocaleString()}원
          </option>
        ))}
      </select>

      {/* Buy/Sell toggle */}
      <div className="flex gap-1">
        <RetroButton
          size="sm"
          variant={mode === 'buy' ? 'primary' : 'default'}
          onClick={() => setMode('buy')}
          className={mode === 'buy' ? 'text-stock-up' : ''}
        >
          매수
        </RetroButton>
        <RetroButton
          size="sm"
          variant={mode === 'sell' ? 'primary' : 'default'}
          onClick={() => setMode('sell')}
          className={mode === 'sell' ? 'text-stock-down' : ''}
        >
          매도
        </RetroButton>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span className="text-retro-gray">현재가:</span>
        <span className="text-right">{company.price.toLocaleString()}원</span>
        <span className="text-retro-gray">보유 현금:</span>
        <span className="text-right">{player.cash.toLocaleString()}원</span>
        <span className="text-retro-gray">보유 수량:</span>
        <span className="text-right">{position?.shares ?? 0}주</span>
      </div>

      {/* Quantity */}
      <div className="flex items-center gap-1">
        <span className="text-retro-gray">수량:</span>
        <input
          type="number"
          min={1}
          max={mode === 'buy' ? maxBuyable : maxSellable}
          value={shares}
          onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
          className="win-inset bg-white px-1 py-0.5 w-16 text-right"
        />
        <RetroButton size="sm" onClick={() => setShares(mode === 'buy' ? maxBuyable : maxSellable)}>
          최대
        </RetroButton>
      </div>

      {/* Total */}
      <div className="flex justify-between font-bold">
        <span>{mode === 'buy' ? '매수' : '매도'} 금액:</span>
        <span className={mode === 'buy' ? 'text-stock-up' : 'text-stock-down'}>
          {totalCost.toLocaleString()}원
        </span>
      </div>

      {/* Execute */}
      <RetroButton
        variant={mode === 'buy' ? 'primary' : 'danger'}
        size="lg"
        className="w-full"
        onClick={handleTrade}
        disabled={
          mode === 'buy'
            ? totalCost > player.cash || shares <= 0
            : shares > maxSellable || shares <= 0
        }
      >
        {mode === 'buy' ? `${shares}주 매수` : `${shares}주 매도`}
      </RetroButton>
    </div>
  )
}

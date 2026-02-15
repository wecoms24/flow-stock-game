import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'

interface TradingWindowProps {
  companyId?: string
}

type Tab = 'market' | 'holdings'

export function TradingWindow({ companyId }: TradingWindowProps) {
  const companies = useGameStore((s) => s.companies)
  const player = useGameStore((s) => s.player)
  const buyStock = useGameStore((s) => s.buyStock)
  const sellStock = useGameStore((s) => s.sellStock)
  const updateWindowProps = useGameStore((s) => s.updateWindowProps)

  const [selectedId, setSelectedId] = useState(companyId ?? companies[0]?.id ?? '')
  const [shares, setShares] = useState(1)
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [tab, setTab] = useState<Tab>('market')

  // 차트 창에서 기업 변경 시 동기화 (외부 prop 변경만 추적)
  useEffect(() => {
    if (companyId) {
      setSelectedId(companyId)
      setShares(1)
    }
  }, [companyId])

  const company = companies.find((c) => c.id === selectedId)
  const position = player.portfolio[selectedId]

  // 보유 종목 리스트 (손익 계산 포함)
  const holdings = useMemo(() => {
    const companyMap = new Map(companies.map((c) => [c.id, c]))
    return Object.values(player.portfolio)
      .filter((pos) => pos.shares > 0)
      .map((pos) => {
        const comp = companyMap.get(pos.companyId)
        if (!comp) return null
        const currentValue = comp.price * pos.shares
        const investedValue = pos.avgBuyPrice * pos.shares
        const pnl = currentValue - investedValue
        const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0
        return { ...pos, company: comp, currentValue, investedValue, pnl, pnlPercent }
      })
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .sort((a, b) => b.currentValue - a.currentValue)
  }, [player.portfolio, companies])

  // 총 평가 손익
  const totalPnl = useMemo(
    () => holdings.reduce((sum, h) => sum + h.pnl, 0),
    [holdings],
  )
  const totalInvested = useMemo(
    () => holdings.reduce((sum, h) => sum + h.investedValue, 0),
    [holdings],
  )
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

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

  const handleSelectCompany = (id: string) => {
    setSelectedId(id)
    setShares(1)
    const hasChart = useGameStore.getState().windows.some((w) => w.type === 'chart')
    if (hasChart) {
      updateWindowProps('chart', { companyId: id })
    }
  }

  const change = company.price - company.previousPrice
  const changePercent = company.previousPrice ? (change / company.previousPrice) * 100 : 0
  const isUp = change >= 0

  return (
    <div className="flex flex-col h-full text-xs">
      {/* 상단 자산 요약 */}
      <div className="win-inset bg-white p-1.5 mb-1">
        <div className="flex justify-between items-center">
          <span className="text-retro-gray">보유 현금</span>
          <span className="font-bold">{player.cash.toLocaleString()}원</span>
        </div>
        {holdings.length > 0 && (
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-retro-gray">평가 손익</span>
            <span className={`font-bold ${totalPnl >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
              {totalPnl >= 0 ? '+' : ''}
              {totalPnl.toLocaleString()}원 ({totalPnl >= 0 ? '+' : ''}
              {totalPnlPercent.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* 탭 전환 */}
      <div className="flex mb-1">
        <button
          className={`flex-1 py-1 text-center cursor-pointer ${
            tab === 'market'
              ? 'win-pressed bg-white font-bold'
              : 'win-outset bg-win-face'
          }`}
          onClick={() => setTab('market')}
        >
          전체 종목
        </button>
        <button
          className={`flex-1 py-1 text-center cursor-pointer ${
            tab === 'holdings'
              ? 'win-pressed bg-white font-bold'
              : 'win-outset bg-win-face'
          }`}
          onClick={() => setTab('holdings')}
        >
          내 보유 ({holdings.length})
        </button>
      </div>

      {/* 종목 리스트 */}
      <div className="win-inset bg-white flex-1 min-h-0 overflow-y-auto mb-1">
        {tab === 'market' ? (
          /* 전체 종목 리스트 */
          companies.map((c) => {
            const ch = c.price - c.previousPrice
            const chPct = c.previousPrice ? (ch / c.previousPrice) * 100 : 0
            const isHolding = player.portfolio[c.id]?.shares > 0
            return (
              <div
                key={c.id}
                className={`flex items-center px-1.5 py-1 cursor-pointer border-b border-retro-gray/20 ${
                  c.id === selectedId
                    ? 'bg-win-title-active text-white'
                    : 'hover:bg-retro-gray/10'
                }`}
                onClick={() => handleSelectCompany(c.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold truncate">{c.ticker}</span>
                    {isHolding && (
                      <span
                        className={`text-[9px] px-0.5 ${
                          c.id === selectedId
                            ? 'bg-white/30 text-white'
                            : 'bg-win-title-active/20 text-win-title-active'
                        }`}
                      >
                        보유
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      c.id === selectedId ? 'text-white/70' : 'text-retro-gray'
                    }`}
                  >
                    {c.name}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-bold">{c.price.toLocaleString()}</div>
                  <div
                    className={`text-[10px] ${
                      c.id === selectedId
                        ? 'text-white/80'
                        : ch >= 0
                          ? 'text-stock-up'
                          : 'text-stock-down'
                    }`}
                  >
                    {ch >= 0 ? '+' : ''}
                    {chPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })
        ) : holdings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-retro-gray">
            보유 종목이 없습니다
          </div>
        ) : (
          /* 보유 종목 리스트 */
          holdings.map((h) => (
            <div
              key={h.companyId}
              className={`flex items-center px-1.5 py-1 cursor-pointer border-b border-retro-gray/20 ${
                h.companyId === selectedId
                  ? 'bg-win-title-active text-white'
                  : 'hover:bg-retro-gray/10'
              }`}
              onClick={() => handleSelectCompany(h.companyId)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{h.company.ticker}</div>
                <div
                  className={`text-[10px] ${
                    h.companyId === selectedId ? 'text-white/70' : 'text-retro-gray'
                  }`}
                >
                  {h.shares}주 / 평단 {h.avgBuyPrice.toLocaleString()}원
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="font-bold">{h.currentValue.toLocaleString()}</div>
                <div
                  className={`text-[10px] ${
                    h.companyId === selectedId
                      ? 'text-white/80'
                      : h.pnl >= 0
                        ? 'text-stock-up'
                        : 'text-stock-down'
                  }`}
                >
                  {h.pnl >= 0 ? '+' : ''}
                  {h.pnl.toLocaleString()}원 ({h.pnl >= 0 ? '+' : ''}
                  {h.pnlPercent.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 매매 패널 */}
      <div className="win-outset bg-win-face p-1.5 space-y-1.5">
        {/* 선택된 종목 정보 */}
        <div className="flex items-baseline justify-between">
          <span className="font-bold">[{company.ticker}] {company.name}</span>
          <div className="text-right">
            <span className="font-bold text-sm">{company.price.toLocaleString()}</span>
            <span className={`ml-1 ${isUp ? 'text-stock-up' : 'text-stock-down'}`}>
              {isUp ? '▲' : '▼'}{Math.abs(changePercent).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 매수/매도 토글 */}
        <div className="flex gap-0.5">
          <button
            className={`flex-1 py-1 text-center cursor-pointer font-bold ${
              mode === 'buy'
                ? 'bg-stock-up text-white win-pressed'
                : 'win-outset bg-win-face'
            }`}
            onClick={() => setMode('buy')}
          >
            매수
          </button>
          <button
            className={`flex-1 py-1 text-center cursor-pointer font-bold ${
              mode === 'sell'
                ? 'bg-stock-down text-white win-pressed'
                : 'win-outset bg-win-face'
            }`}
            onClick={() => setMode('sell')}
          >
            매도
          </button>
        </div>

        {/* 수량 입력 */}
        <div className="flex items-center gap-1">
          <button
            className="win-outset bg-win-face px-2 py-0.5 cursor-pointer active:win-pressed"
            onClick={() => setShares(Math.max(1, shares - 1))}
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={mode === 'buy' ? maxBuyable : maxSellable}
            value={shares}
            onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
            className="win-inset bg-white px-1 py-0.5 flex-1 text-center"
          />
          <button
            className="win-outset bg-win-face px-2 py-0.5 cursor-pointer active:win-pressed"
            onClick={() =>
              setShares(Math.min(shares + 1, mode === 'buy' ? maxBuyable : maxSellable))
            }
          >
            +
          </button>
          <RetroButton
            size="sm"
            onClick={() => setShares(mode === 'buy' ? maxBuyable : maxSellable)}
          >
            최대
          </RetroButton>
        </div>

        {/* 빠른 수량 버튼 */}
        <div className="flex gap-0.5">
          {[10, 50, 100].map((n) => (
            <button
              key={n}
              className="flex-1 win-outset bg-win-face py-0.5 text-center cursor-pointer active:win-pressed text-[10px]"
              onClick={() =>
                setShares(
                  Math.min(n, mode === 'buy' ? maxBuyable : maxSellable),
                )
              }
            >
              {n}주
            </button>
          ))}
          <button
            className="flex-1 win-outset bg-win-face py-0.5 text-center cursor-pointer active:win-pressed text-[10px]"
            onClick={() => {
              const half = Math.floor((mode === 'buy' ? maxBuyable : maxSellable) / 2)
              setShares(Math.max(1, half))
            }}
          >
            50%
          </button>
        </div>

        {/* 주문 요약 + 실행 */}
        <div className="flex items-center gap-1">
          <div className="flex-1 text-right">
            <span className="text-retro-gray">
              {mode === 'buy' ? '매수' : '매도'} 금액:{' '}
            </span>
            <span className={`font-bold ${mode === 'buy' ? 'text-stock-up' : 'text-stock-down'}`}>
              {totalCost.toLocaleString()}원
            </span>
          </div>
          <RetroButton
            variant={mode === 'buy' ? 'primary' : 'danger'}
            size="md"
            onClick={handleTrade}
            disabled={
              mode === 'buy'
                ? totalCost > player.cash || shares <= 0
                : shares > maxSellable || shares <= 0
            }
            className={mode === 'buy' ? 'text-stock-up' : ''}
          >
            {mode === 'buy' ? `${shares}주 매수` : `${shares}주 매도`}
          </RetroButton>
        </div>

        {/* 보유 정보 (보유 중일 때만) */}
        {position && position.shares > 0 && (
          <div className="win-inset bg-white p-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-retro-gray">보유 {position.shares}주</span>
              <span className="text-retro-gray">
                평단 {position.avgBuyPrice.toLocaleString()}원
              </span>
              <span
                className={`font-bold ${
                  company.price >= position.avgBuyPrice ? 'text-stock-up' : 'text-stock-down'
                }`}
              >
                {company.price >= position.avgBuyPrice ? '+' : ''}
                {(
                  ((company.price - position.avgBuyPrice) / position.avgBuyPrice) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

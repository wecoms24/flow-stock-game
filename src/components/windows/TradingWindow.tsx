import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { isPriceLimitHit } from '../../config/priceLimit'
import { isVIHalted, getVIRemainingTicks } from '../../engines/viEngine'
import { triggerScreenShake } from '../../hooks/useScreenShake'
import { emitFloatingText } from '../../utils/floatingTextEmitter'
import type { Sector } from '../../types'

const SECTOR_LABELS: Record<Sector, string> = {
  tech: '기술',
  finance: '금융',
  energy: '에너지',
  healthcare: '헬스케어',
  consumer: '소비재',
  industrial: '산업재',
  telecom: '통신',
  materials: '소재',
  utilities: '유틸리티',
  realestate: '부동산',
}

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
  const canTrade = useGameStore((s) => s.canTrade)
  const circuitBreaker = useGameStore((s) => s.circuitBreaker)
  const openWindow = useGameStore((s) => s.openWindow)
  const limitOrders = useGameStore((s) => s.limitOrders)
  const createLimitOrder = useGameStore((s) => s.createLimitOrder)
  const cancelLimitOrder = useGameStore((s) => s.cancelLimitOrder)
  const enforcePositionLimit = useGameStore((s) => s.enforcePositionLimit)
  const wealthTier = useGameStore((s) => s.economicPressure.currentTier)

  const [selectedId, setSelectedId] = useState(companyId ?? companies[0]?.id ?? '')
  const [shares, setShares] = useState(1)
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [tab, setTab] = useState<Tab>('market')
  const [limitPrice, setLimitPrice] = useState<Record<string, string>>({}) // 목표가 입력
  const [tradeFeedback, setTradeFeedback] = useState<'success-buy' | 'success-sell' | 'error' | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 차트 창에서 기업 변경 시 동기화 (외부 prop 변경만 추적)
  // 조건문으로 무한 루프 방지됨 - controlled component 패턴
  const prevCompanyIdRef = useRef<string | undefined>(companyId)
  useEffect(() => {
    if (companyId && companyId !== prevCompanyIdRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(companyId)
      setShares(1)
      prevCompanyIdRef.current = companyId
    }
  }, [companyId])

  const company = companies.find((c) => c.id === selectedId)
  const position = player.portfolio[selectedId]

  // Mini chart canvas ref
  const chartCanvasRef = useRef<HTMLCanvasElement>(null)

  const showFeedback = useCallback((type: 'success-buy' | 'success-sell' | 'error') => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    setTradeFeedback(type)
    feedbackTimeoutRef.current = setTimeout(() => setTradeFeedback(null), 600)
  }, [])

  // Mini chart drawing effect
  useEffect(() => {
    const canvas = chartCanvasRef.current
    if (!canvas || !company) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const history = company.priceHistory
    if (!history || history.length < 2) {
      // No data: draw empty state
      ctx.fillStyle = '#0c0c1e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#6b7280'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('데이터 없음', canvas.width / 2, canvas.height / 2)
      return
    }

    const w = canvas.width
    const h = canvas.height
    const padding = { top: 16, bottom: 16, left: 4, right: 45 }

    const drawW = w - padding.left - padding.right
    const drawH = h - padding.top - padding.bottom

    const minPrice = Math.min(...history)
    const maxPrice = Math.max(...history)
    const priceRange = maxPrice - minPrice || 1

    const isUpTrend = history[history.length - 1] >= history[0]
    const lineColor = isUpTrend ? '#22c55e' : '#ef4444'

    // Background
    ctx.fillStyle = '#0c0c1e'
    ctx.fillRect(0, 0, w, h)

    // Price line
    ctx.beginPath()
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'

    for (let i = 0; i < history.length; i++) {
      const x = padding.left + (i / (history.length - 1)) * drawW
      const y = padding.top + drawH - ((history[i] - minPrice) / priceRange) * drawH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Fill area under the line
    ctx.lineTo(padding.left + drawW, padding.top + drawH)
    ctx.lineTo(padding.left, padding.top + drawH)
    ctx.closePath()
    ctx.fillStyle = isUpTrend ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
    ctx.fill()

    // Y-axis labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(maxPrice.toLocaleString(), w - 2, padding.top + 3)
    ctx.fillText(minPrice.toLocaleString(), w - 2, padding.top + drawH + 1)
  }, [company])

  // 52주 최고/최저 계산
  const priceStats = useMemo(() => {
    if (!company || !company.priceHistory || company.priceHistory.length === 0) {
      return { high52: company?.price ?? 0, low52: company?.price ?? 0 }
    }
    return {
      high52: Math.max(...company.priceHistory),
      low52: Math.min(...company.priceHistory),
    }
  }, [company])

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

  // 인수 가능 회사 판단 (AcquisitionWindow와 동일한 로직)
  const isAcquirable = (c: typeof companies[0]) => {
    if (c.status !== 'active') return false

    const activeCompanies = companies.filter((co) => co.status === 'active')
    if (activeCompanies.length < 2) return false

    // 시가총액 하위 50% 체크
    const sorted = [...activeCompanies].sort((a, b) => b.marketCap - a.marketCap)
    const medianIndex = Math.floor(sorted.length * 0.5)
    const isLowerHalf = sorted.slice(medianIndex).some((co) => co.id === c.id)

    // 가격 20% 이상 하락 체크
    const priceDropRatio = 1 - c.price / c.basePrice

    return isLowerHalf && priceDropRatio >= 0.2
  }

  const handleOpenAcquisition = (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 회사 선택 방지
    openWindow('acquisition', { preselectedCompanyId: companyId })
  }

  if (!company) return <div className="text-xs text-retro-gray">종목 없음</div>

  const totalCost = company.price * shares
  const maxBuyable = Math.floor(player.cash / company.price)
  const maxSellable = position?.shares ?? 0

  const handleTrade = () => {
    const cashBefore = useGameStore.getState().player.cash
    const portfolioBefore = useGameStore.getState().player.portfolio[selectedId]?.shares ?? 0

    if (mode === 'buy') {
      buyStock(selectedId, shares)
    } else {
      sellStock(selectedId, shares)
    }

    // Check if trade actually executed by comparing state
    const cashAfter = useGameStore.getState().player.cash
    const portfolioAfter = useGameStore.getState().player.portfolio[selectedId]?.shares ?? 0
    const tradeExecuted = mode === 'buy'
      ? portfolioAfter > portfolioBefore
      : portfolioAfter < portfolioBefore

    if (tradeExecuted) {
      showFeedback(mode === 'buy' ? 'success-buy' : 'success-sell')
      // Floating text feedback
      const sharesTraded = Math.abs(portfolioAfter - portfolioBefore)
      const color = mode === 'buy' ? '#FF0000' : '#0000FF'
      emitFloatingText(
        mode === 'buy' ? `+${sharesTraded}주 매수` : `-${sharesTraded}주 매도`,
        window.innerWidth / 2,
        window.innerHeight / 2,
        color,
      )
      // Proportional shake: bigger trade = bigger shake
      const tradeValue = Math.abs(cashAfter - cashBefore)
      const totalAssets = cashAfter + Object.values(useGameStore.getState().player.portfolio)
        .reduce((sum, p) => {
          const c = useGameStore.getState().companies.find(co => co.id === p.companyId)
          return sum + (c ? c.price * p.shares : 0)
        }, 0)
      const tradeRatio = totalAssets > 0 ? tradeValue / totalAssets : 0
      if (tradeRatio > 0.1) {
        triggerScreenShake('medium')
      } else if (tradeRatio > 0.03) {
        triggerScreenShake('light')
      }
    } else {
      showFeedback('error')
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
    <div className="flex h-full text-xs gap-1">
      {/* Left column: trading controls */}
      <div className="flex flex-col flex-1 min-w-0">
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
            const isAcquired = c.status === 'acquired'
            const parent = isAcquired ? companies.find(co => co.id === c.parentCompanyId) : null

            const canAcquire = isAcquirable(c)

            return (
              <div
                key={c.id}
                className={`flex items-center px-1.5 py-1 cursor-pointer border-b border-retro-gray/20 ${
                  isAcquired ? 'opacity-50 bg-gray-100' : ''
                } ${
                  c.id === selectedId
                    ? 'bg-win-title-active text-white'
                    : 'hover:bg-retro-gray/10'
                }`}
                onClick={() => handleSelectCompany(c.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold truncate">{c.ticker}</span>
                    {isAcquired && (
                      <span className="text-[9px] px-0.5 bg-orange-500 text-white">
                        인수됨
                      </span>
                    )}
                    {isHolding && !isAcquired && (
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
                    {canAcquire && !isAcquired && (
                      <button
                        className="text-[9px] px-1 py-0.5 bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 win-outset"
                        onClick={(e) => handleOpenAcquisition(c.id, e)}
                        title="인수 가능 (시총 하위 50% + 20% 하락)"
                      >
                        인수
                      </button>
                    )}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      c.id === selectedId ? 'text-white/70' : 'text-retro-gray'
                    }`}
                  >
                    {c.name}
                    {isAcquired && parent && (
                      <span className="ml-1 text-[9px]">→ {parent.name}</span>
                    )}
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
          holdings.map((h) => {
            const activeOrders = limitOrders.filter((o) => o.companyId === h.companyId)
            const hasActiveOrder = activeOrders.length > 0

            return (
              <div
                key={h.companyId}
                className="border-b border-retro-gray/20 last:border-b-0"
              >
                {/* 종목 정보 */}
                <div
                  className={`flex items-center px-1.5 py-1 cursor-pointer ${
                    h.companyId === selectedId
                      ? 'bg-win-title-active text-white'
                      : 'hover:bg-retro-gray/10'
                  }`}
                  onClick={() => handleSelectCompany(h.companyId)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold truncate">{h.company.ticker}</span>
                      {hasActiveOrder && (
                        <span className="text-[9px] px-0.5 bg-yellow-500 text-white">
                          예약 {activeOrders.length}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] ${
                        h.companyId === selectedId ? 'text-white/70' : 'text-retro-gray'
                      }`}
                    >
                      {h.shares}주 / <span title="평균 매입 단가">평단</span> {h.avgBuyPrice.toLocaleString()}원
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

                {/* 예약 매매 설정 */}
                <div className="px-1.5 py-1 bg-retro-gray/5 space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-retro-gray shrink-0">🎯 목표가:</span>
                    <input
                      type="number"
                      min={1}
                      step={100}
                      placeholder={`현재 ${h.company.price.toLocaleString()}`}
                      value={limitPrice[h.companyId] ?? ''}
                      onChange={(e) =>
                        setLimitPrice({ ...limitPrice, [h.companyId]: e.target.value })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="win-inset bg-white px-1 py-0.5 flex-1 text-center"
                    />
                    <button
                      className="win-outset bg-win-face px-1 py-0.5 text-[9px] hover:bg-retro-gray/10 active:win-pressed shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        const targetPrice = parseInt(limitPrice[h.companyId] ?? '0')
                        if (targetPrice > 0 && targetPrice > h.company.price) {
                          createLimitOrder(h.companyId, targetPrice, h.shares)
                          setLimitPrice({ ...limitPrice, [h.companyId]: '' })
                        }
                      }}
                      disabled={!limitPrice[h.companyId] || parseInt(limitPrice[h.companyId]) <= h.company.price}
                    >
                      전체 예약
                    </button>
                  </div>

                  {/* 활성 예약 주문 목록 */}
                  {activeOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-1 text-[9px] text-retro-gray bg-yellow-50 px-1 py-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="flex-1">
                        {order.shares}주 @ {order.targetPrice.toLocaleString()}원
                      </span>
                      <button
                        className="win-outset bg-win-face px-1 hover:bg-red-100 active:win-pressed"
                        onClick={() => cancelLimitOrder(order.id)}
                      >
                        취소
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단 매매 패널 */}
      <div className="win-outset bg-win-face p-1.5 space-y-1.5">
        {/* 선택된 종목 정보 */}
        <div className="flex items-baseline justify-between">
          <span className="font-bold">[{company.ticker}] {company.name}</span>
          <div className="text-right">
            <span className="font-bold text-lg tabular-nums">{company.price.toLocaleString()}</span>
            <span className={`ml-1 ${isUp ? 'text-stock-up' : 'text-stock-down'}`}>
              {isUp ? '▲' : '▼'}{Math.abs(changePercent).toFixed(1)}%
            </span>
            {/* Price Limit Indicator */}
            {(() => {
              const limitHit = isPriceLimitHit(company.price, company.sessionOpenPrice)
              if (limitHit === 'upper') {
                return <span className="ml-2 text-xs text-red-600 font-bold">▲상한가</span>
              }
              if (limitHit === 'lower') {
                return <span className="ml-2 text-xs text-blue-600 font-bold">▼하한가</span>
              }
              return null
            })()}
            {/* VI Indicator */}
            {isVIHalted(company) && (
              <span className="ml-2 text-xs text-yellow-600 font-bold animate-pulse" title="변동성 완화장치 - 단기 급등락 시 거래 일시 정지">
                ⚠️ VI 발동 중 ({getVIRemainingTicks(company)}h)
              </span>
            )}
          </div>
        </div>

        {/* Circuit Breaker Warning */}
        {circuitBreaker.isActive && circuitBreaker.remainingTicks > 0 && (
          <div className="bg-red-600 text-white text-xs px-2 py-1 text-center font-bold">
            🚨 서킷브레이커 발동 - 전 종목 거래 정지
          </div>
        )}

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

        {/* 포지션 제한 경고 */}
        {mode === 'buy' && shares > 0 && wealthTier !== 'beginner' && (() => {
          const limit = enforcePositionLimit(selectedId, shares)
          if (limit.maxShares < shares) {
            return (
              <div className="text-[9px] text-orange-600 bg-orange-50 p-1 rounded border border-orange-300">
                ⚠️ 포지션 제한: 최대 {limit.maxShares}주 매수 가능 ({wealthTier} 구간)
              </div>
            )
          }
          return null
        })()}

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
              !canTrade(selectedId) || // Trading halted (circuit breaker or VI)
              (mode === 'buy'
                ? totalCost > player.cash || shares <= 0
                : shares > maxSellable || shares <= 0)
            }
            className={`${mode === 'buy' ? 'text-stock-up' : ''} ${
              tradeFeedback === 'success-buy' ? '!bg-green-200 transition-colors' :
              tradeFeedback === 'success-sell' ? '!bg-red-200 transition-colors' :
              tradeFeedback === 'error' ? 'button-shake !border-retro-red' : ''
            }`}
          >
            {!canTrade(selectedId)
              ? '거래정지'
              : tradeFeedback === 'success-buy'
                ? '체결!'
                : tradeFeedback === 'success-sell'
                  ? '체결!'
                  : tradeFeedback === 'error'
                    ? '실패'
                    : mode === 'buy'
                      ? `${shares}주 매수`
                      : `${shares}주 매도`
            }
          </RetroButton>
        </div>

        {/* 보유 정보 (보유 중일 때만) */}
        {position && position.shares > 0 && (
          <div className="win-inset bg-white p-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-retro-gray">보유 {position.shares}주</span>
              <span className="text-retro-gray">
                <span title="평균 매입 단가">평단</span> {position.avgBuyPrice.toLocaleString()}원
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

      {/* 전체 활성 예약 주문 (있을 때만) */}
      {limitOrders.length > 0 && (
        <div className="win-outset bg-win-face p-1.5 mt-1">
          <div className="text-[10px] font-bold mb-1 text-retro-gray">
            🎯 활성 예약 주문 ({limitOrders.length})
          </div>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {limitOrders.map((order) => {
              const orderCompany = companies.find((c) => c.id === order.companyId)
              if (!orderCompany) return null

              const progress =
                orderCompany.price >= order.targetPrice
                  ? 100
                  : (orderCompany.price / order.targetPrice) * 100

              return (
                <div
                  key={order.id}
                  className="win-inset bg-white px-1 py-0.5 text-[9px] flex items-center gap-1"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">
                      [{orderCompany.ticker}] {order.shares}주
                    </div>
                    <div className="text-retro-gray flex items-center gap-1">
                      <span>목표 {order.targetPrice.toLocaleString()}원</span>
                      <span
                        className={`${
                          progress >= 100 ? 'text-stock-up font-bold' : 'text-yellow-600'
                        }`}
                      >
                        ({progress.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <button
                    className="win-outset bg-win-face px-1 py-0.5 hover:bg-red-100 active:win-pressed shrink-0"
                    onClick={() => cancelLimitOrder(order.id)}
                  >
                    취소
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div>

      {/* Right column: mini chart + company info */}
      <div className="flex flex-col w-[280px] shrink-0 min-h-0 overflow-hidden">
        {/* Company name and price */}
        <div className="win-inset bg-white p-1.5 mb-1">
          <div className="font-bold truncate">{company.ticker} - {company.name}</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold tabular-nums">{company.price.toLocaleString()}원</span>
            <span className={`text-[10px] ${isUp ? 'text-stock-up' : 'text-stock-down'}`}>
              {isUp ? '▲' : '▼'}{Math.abs(changePercent).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Mini price chart */}
        <div className="win-inset mb-1">
          <canvas
            ref={chartCanvasRef}
            width={280}
            height={160}
            className="w-full block"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Key stats */}
        <div className="win-inset bg-white p-1.5 mb-1 space-y-1">
          <div className="font-bold text-retro-gray mb-1">종목 정보</div>
          <div className="flex justify-between">
            <span className="text-retro-gray">52주 최고</span>
            <span className="font-bold text-stock-up">{priceStats.high52.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-retro-gray">52주 최저</span>
            <span className="font-bold text-stock-down">{priceStats.low52.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-retro-gray">시가총액</span>
            <span className="font-bold">
              {company.marketCap >= 1_0000_0000
                ? `${(company.marketCap / 1_0000_0000).toFixed(1)}억`
                : `${(company.marketCap / 10000).toFixed(0)}만`}원
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-retro-gray">섹터</span>
            <span className="font-bold">{SECTOR_LABELS[company.sector]}</span>
          </div>
        </div>

        {/* Position info (if holding) */}
        {position && position.shares > 0 && (() => {
          const posValue = company.price * position.shares
          const investedValue = position.avgBuyPrice * position.shares
          const posPnl = posValue - investedValue
          const posPnlPct = investedValue > 0 ? (posPnl / investedValue) * 100 : 0
          return (
            <div className="win-inset bg-white p-1.5 space-y-1">
              <div className="font-bold text-retro-gray mb-1">내 포지션</div>
              <div className="flex justify-between">
                <span className="text-retro-gray">보유 수량</span>
                <span className="font-bold">{position.shares}주</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-gray">평균 단가</span>
                <span className="font-bold">{position.avgBuyPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-gray">평가 금액</span>
                <span className="font-bold">{posValue.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-gray">평가 손익</span>
                <span className={`font-bold ${posPnl >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                  {posPnl >= 0 ? '+' : ''}{posPnl.toLocaleString()}원
                  ({posPnl >= 0 ? '+' : ''}{posPnlPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import type { Plugin } from 'chart.js'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { getFearGreedIndex, isSentimentActive } from '../../engines/sentimentEngine'

/* ── Event Marker + Band Plugin ── */
interface EventMarkerOptions {
  markers: Array<{
    tickIndex: number
    endTickIndex?: number // 이벤트 밴드 종료 위치
    event: {
      id: string
      title: string
      impact: { severity: string; driftModifier: number }
      source?: string
    }
    changePercent: string
  }>
  onMarkerClick?: (eventId: string) => void
  fearGreedIndex?: number // 센티먼트 지수 (0-100)
}

const eventMarkerPlugin: Plugin<'line', EventMarkerOptions> = {
  id: 'eventMarkers',
  afterDatasetsDraw(chart, _args, options) {
    const markers = options.markers || []
    const ctx = chart.ctx
    const xAxis = chart.scales.x
    const yAxis = chart.scales.y

    // 센티먼트 인디케이터 바
    const fgi = options.fearGreedIndex
    if (fgi !== undefined && fgi !== null) {
      ctx.save()
      const barWidth = chart.width - 40
      const barX = 20
      const barY = yAxis.top - 3

      // 배경
      const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0)
      grad.addColorStop(0, 'rgba(0,0,255,0.3)')
      grad.addColorStop(0.5, 'rgba(128,128,128,0.2)')
      grad.addColorStop(1, 'rgba(255,0,0,0.3)')
      ctx.fillStyle = grad
      ctx.fillRect(barX, barY, barWidth, 3)

      // 인디케이터
      const indicatorX = barX + (fgi / 100) * barWidth
      ctx.fillStyle = fgi > 60 ? '#FF4444' : fgi < 40 ? '#4444FF' : '#888888'
      ctx.beginPath()
      ctx.arc(indicatorX, barY + 1.5, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    if (!markers.length) return

    // 이벤트 밴드 (반투명 배경) 먼저 그리기
    markers.forEach((marker) => {
      if (marker.endTickIndex === undefined) return
      const startX = xAxis.getPixelForValue(marker.tickIndex)
      const endX = xAxis.getPixelForValue(marker.endTickIndex)
      const topY = yAxis.top
      const bottomY = yAxis.bottom
      const width = Math.max(2, endX - startX)

      const isPositive = marker.event.impact.driftModifier >= 0
      const isAfterEffect = marker.event.source === 'aftereffect'

      ctx.save()
      if (isAfterEffect) {
        // 여진: 점선 패턴 배경
        ctx.fillStyle = isPositive ? 'rgba(255, 200, 200, 0.15)' : 'rgba(200, 200, 255, 0.15)'
        ctx.setLineDash([3, 3])
      } else {
        ctx.fillStyle = isPositive ? 'rgba(255, 200, 200, 0.2)' : 'rgba(200, 200, 255, 0.2)'
      }
      ctx.fillRect(startX, topY, width, bottomY - topY)
      ctx.setLineDash([])
      ctx.restore()
    })

    // 이벤트 마커 (수직선 + 삼각형)
    markers.forEach((marker) => {
      const x = xAxis.getPixelForValue(marker.tickIndex)
      const topY = yAxis.top
      const bottomY = yAxis.bottom

      const severity = marker.event.impact.severity
      const color =
        severity === 'critical'
          ? 'rgba(255, 0, 0, 0.6)'
          : severity === 'high'
            ? 'rgba(255, 100, 0, 0.6)'
            : severity === 'medium'
              ? 'rgba(255, 200, 0, 0.6)'
              : 'rgba(100, 100, 100, 0.4)'

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, topY)
      ctx.lineTo(x, bottomY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(x, topY)
      ctx.lineTo(x - 5, topY - 8)
      ctx.lineTo(x + 5, topY - 8)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    })
  },
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  eventMarkerPlugin,
)

const PERIOD_OPTIONS = [
  { label: '1일', ticks: 10 },
  { label: '1주', ticks: 70 },
  { label: '2주', ticks: 140 },
  { label: '1개월', ticks: 300 },
  { label: '3개월', ticks: 900 },
  { label: '6개월', ticks: 1800 },
  { label: '1년', ticks: 3600 },
  { label: '전체', ticks: 0 },
] as const

type SortOption = 'name' | 'price' | 'change' | 'sector'
type ChangeFilter = 'all' | 'up5' | 'down5' | 'stable'

interface ChartWindowProps {
  companyId?: string
}

export function ChartWindow({ companyId }: ChartWindowProps) {
  const companies = useGameStore((s) => s.companies)
  const events = useGameStore((s) => s.events)
  const currentTime = useGameStore((s) => s.time)
  const updateWindowProps = useGameStore((s) => s.updateWindowProps)
  const [selectedId, setSelectedIdLocal] = useState(companyId ?? companies[0]?.id ?? '')

  // 매매 창에서 기업 변경 시 동기화 (외부 prop 변경만 추적)
  // 조건문으로 무한 루프 방지됨 - controlled component 패턴
  const prevCompanyIdRef = useRef<string | undefined>(companyId)
  useEffect(() => {
    if (companyId && companyId !== prevCompanyIdRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIdLocal(companyId)
      prevCompanyIdRef.current = companyId
    }
  }, [companyId])

  const setSelectedId = (id: string) => {
    setSelectedIdLocal(id)
    updateWindowProps('trading', { companyId: id })
  }
  const [periodTicks, setPeriodTicks] = useState(300) // default 30 days
  const [showEventMarkers, setShowEventMarkers] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let result = [...companies]

    // Search filter (ticker or name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (c) => c.ticker.toLowerCase().includes(term) || c.name.toLowerCase().includes(term),
      )
    }

    // Sector filter
    if (sectorFilter !== 'all') {
      result = result.filter((c) => c.sector === sectorFilter)
    }

    // Change filter
    if (changeFilter !== 'all') {
      result = result.filter((c) => {
        const changePercent = ((c.price - c.previousPrice) / c.previousPrice) * 100
        if (changeFilter === 'up5') return changePercent >= 5
        if (changeFilter === 'down5') return changePercent <= -5
        if (changeFilter === 'stable') return Math.abs(changePercent) <= 2
        return true
      })
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'price') return b.price - a.price
      if (sortBy === 'sector') return a.sector.localeCompare(b.sector)
      if (sortBy === 'change') {
        const changeA = ((a.price - a.previousPrice) / a.previousPrice) * 100
        const changeB = ((b.price - b.previousPrice) / b.previousPrice) * 100
        return changeB - changeA
      }
      return 0
    })

    return result
  }, [companies, searchTerm, sectorFilter, changeFilter, sortBy])

  // Auto-select first company if current selection is filtered out
  // 조건문으로 무한 루프 방지됨 - 필터 변경 시 유효한 선택 유지
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIdLocal((current) => {
      if (filteredCompanies.length > 0 && !filteredCompanies.find((c) => c.id === current)) {
        const newId = filteredCompanies[0].id
        updateWindowProps('trading', { companyId: newId })
        return newId
      }
      return current
    })
  }, [filteredCompanies, updateWindowProps])

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('')
    setSectorFilter('all')
    setChangeFilter('all')
    setSortBy('name')
  }

  const selected = companies.find((c) => c.id === selectedId)

  // Filter events relevant to selected company
  const relevantEvents = useMemo(() => {
    if (!selected) return []
    return events.filter((evt) => {
      // Include if affects this company's sector or is global
      if (evt.affectedSectors && evt.affectedSectors.includes(selected.sector)) {
        return true
      }
      // Include if specifically affects this company
      if (evt.affectedCompanies && evt.affectedCompanies.includes(selected.id)) {
        return true
      }
      // Include global events (no specific sectors/companies)
      if (!evt.affectedSectors && !evt.affectedCompanies) {
        return true
      }
      return false
    })
  }, [selected, events])

  const chartData = useMemo(() => {
    if (!selected) return null
    const history =
      periodTicks > 0 ? selected.priceHistory.slice(-periodTicks) : selected.priceHistory

    // Generate date labels based on period
    const labels = history.map((_, i) => {
      const ticksAgo = history.length - 1 - i
      const daysAgo = Math.floor(ticksAgo / 10)
      const hoursAgo = ticksAgo % 10

      // 현재 시간에서 거슬러 올라가기
      const year = currentTime.year
      const month = currentTime.month
      const day = currentTime.day - daysAgo
      const hour = currentTime.hour - hoursAgo

      // 기간에 따라 라벨 포맷 변경
      if (periodTicks <= 10) {
        // 1일: 시간 표시
        return `${String(Math.max(0, hour)).padStart(2, '0')}시`
      } else if (periodTicks <= 140) {
        // 2주 이하: 일 단위
        return `${Math.max(1, day)}일`
      } else if (periodTicks <= 900) {
        // 3개월 이하: 월.일
        return `${month}.${Math.max(1, day)}`
      } else {
        // 그 이상: 년.월
        return `${year}.${month}`
      }
    })

    return {
      labels,
      datasets: [
        {
          data: history,
          borderColor: selected.price >= selected.previousPrice ? '#FF0000' : '#0000FF',
          backgroundColor:
            selected.price >= selected.previousPrice ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,255,0.1)',
          borderWidth: 1.5,
          pointRadius: 0,
          stepped: 'middle' as const,
          fill: true,
          tension: 0,
        },
      ],
    }
  }, [selected, periodTicks, currentTime])

  // Calculate event markers for the chart (with band end positions)
  const eventMarkers = useMemo(() => {
    if (!selected || !showEventMarkers || !relevantEvents.length) return []

    const historyLength =
      periodTicks > 0
        ? Math.min(periodTicks, selected.priceHistory.length)
        : selected.priceHistory.length

    const startTick = selected.priceHistory.length - historyLength

    return relevantEvents
      .map((evt) => {
        // Calculate tick index when event started
        const eventStartTick =
          (evt.startTimestamp.year - currentTime.year) * 12 * 30 * 10 +
          (evt.startTimestamp.month - currentTime.month) * 30 * 10 +
          (evt.startTimestamp.day - currentTime.day) * 10 +
          (evt.startTimestamp.hour - currentTime.hour)

        const tickIndex = selected.priceHistory.length + eventStartTick - startTick

        // 이벤트 밴드 종료 위치 계산
        const elapsed = evt.duration - evt.remainingTicks
        const endTickIndex = tickIndex + elapsed

        // Only show if within visible range
        if (tickIndex >= historyLength && endTickIndex < 0) return null
        if (tickIndex < 0 && endTickIndex < 0) return null

        const impact = evt.priceImpactSnapshot?.[selected.id]
        const changePercent = impact
          ? ((impact.currentChange / impact.priceBefore) * 100).toFixed(2)
          : '?'

        return {
          tickIndex: Math.max(0, tickIndex),
          endTickIndex: Math.min(historyLength - 1, endTickIndex),
          event: evt,
          changePercent,
        }
      })
      .filter((m) => m !== null) as Array<{
      tickIndex: number
      endTickIndex: number
      event: (typeof relevantEvents)[0]
      changePercent: string
    }>
  }, [selected, showEventMarkers, relevantEvents, periodTicks, currentTime])

  // Sentiment data
  const fearGreedIdx = useMemo(() => {
    if (!isSentimentActive()) return undefined
    return getFearGreedIndex()
  }, [currentTime.hour])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 } as const,
      scales: {
        x: {
          display: true,
          ticks: {
            font: { family: 'DungGeunMo', size: 9 },
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: periodTicks <= 10 ? 10 : periodTicks <= 70 ? 7 : periodTicks <= 300 ? 10 : 12,
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            font: { family: 'DungGeunMo', size: 10 },
            callback: (value: string | number) =>
              typeof value === 'number' ? value.toLocaleString() : value,
          },
          grid: {
            color: 'rgba(0,0,0,0.1)',
          },
        },
      },
      plugins: {
        tooltip: {
          titleFont: { family: 'DungGeunMo' },
          bodyFont: { family: 'DungGeunMo' },
        },
        eventMarkers: {
          markers: eventMarkers,
          onMarkerClick: (eventId: string) => setSelectedEventId(eventId),
          fearGreedIndex: fearGreedIdx,
        },
      },
    }),
    [eventMarkers, fearGreedIdx, periodTicks],
  )

  if (!selected || !chartData) {
    return <div className="text-xs text-retro-gray">종목을 선택하세요</div>
  }

  const change = selected.price - selected.previousPrice
  const changePercent = selected.previousPrice ? (change / selected.previousPrice) * 100 : 0
  const isUp = change >= 0

  const sectors = [
    { value: 'all', label: '전체', emoji: '📊' },
    { value: 'tech', label: '기술', emoji: '💻' },
    { value: 'finance', label: '금융', emoji: '🏦' },
    { value: 'energy', label: '에너지', emoji: '⚡' },
    { value: 'healthcare', label: '헬스', emoji: '🏥' },
    { value: 'consumer', label: '소비재', emoji: '🛒' },
  ]

  const hasActiveFilters = searchTerm || sectorFilter !== 'all' || changeFilter !== 'all'

  return (
    <div className="flex flex-col h-full text-xs">
      {/* 검색 및 빠른 필터 (항상 표시) */}
      <div className="win-inset bg-white p-1 mb-1 space-y-1">
        {/* 검색창 */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="🔍 티커/이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 win-inset bg-white px-1.5 py-0.5 text-xs"
          />
          {hasActiveFilters && (
            <RetroButton size="sm" onClick={resetFilters} className="text-[10px]">
              초기화
            </RetroButton>
          )}
        </div>

        {/* 빠른 섹터 필터 */}
        <div className="flex gap-0.5 flex-wrap">
          {sectors.map((sector) => (
            <RetroButton
              key={sector.value}
              size="sm"
              variant={sectorFilter === sector.value ? 'primary' : 'default'}
              onClick={() => setSectorFilter(sector.value)}
              className="text-[9px] px-1 py-0.5"
            >
              {sector.emoji} {sector.label}
            </RetroButton>
          ))}
        </div>

        {/* 등락률 필터 */}
        <div className="flex gap-0.5">
          <RetroButton
            size="sm"
            variant={changeFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setChangeFilter('all')}
            className="text-[9px] px-1 py-0.5"
          >
            전체
          </RetroButton>
          <RetroButton
            size="sm"
            variant={changeFilter === 'up5' ? 'primary' : 'default'}
            onClick={() => setChangeFilter('up5')}
            className="text-[9px] px-1 py-0.5 text-stock-up"
          >
            ▲ +5% 이상
          </RetroButton>
          <RetroButton
            size="sm"
            variant={changeFilter === 'down5' ? 'primary' : 'default'}
            onClick={() => setChangeFilter('down5')}
            className="text-[9px] px-1 py-0.5 text-stock-down"
          >
            ▼ -5% 이하
          </RetroButton>
          <RetroButton
            size="sm"
            variant={changeFilter === 'stable' ? 'primary' : 'default'}
            onClick={() => setChangeFilter('stable')}
            className="text-[9px] px-1 py-0.5"
          >
            ±2% 이내
          </RetroButton>
        </div>

        {/* 종목 선택 및 결과 개수 */}
        <div className="flex items-center gap-1">
          <select
            className="flex-1 win-inset bg-white px-1 py-0.5 text-xs"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {filteredCompanies.map((c) => {
              const changePercent = ((c.price - c.previousPrice) / c.previousPrice) * 100
              const arrow = changePercent >= 0 ? '▲' : '▼'
              return (
                <option key={c.id} value={c.id}>
                  {c.ticker} {arrow} {changePercent.toFixed(1)}% - {c.name}
                </option>
              )
            })}
          </select>
          <span className="text-[9px] text-retro-gray shrink-0">
            {filteredCompanies.length}개
          </span>
        </div>
      </div>

      {/* 기간 및 컨트롤 */}
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        {/* Period toggle buttons */}
        {PERIOD_OPTIONS.map((opt) => (
          <RetroButton
            key={opt.label}
            size="sm"
            onClick={() => setPeriodTicks(opt.ticks)}
            className={`text-[10px] ${periodTicks === opt.ticks ? 'win-pressed font-bold' : ''}`}
          >
            {opt.label}
          </RetroButton>
        ))}

        <div className="w-px h-4 bg-win-shadow" />

        <RetroButton
          size="sm"
          variant={showEventMarkers ? 'primary' : 'default'}
          onClick={() => setShowEventMarkers(!showEventMarkers)}
          className="text-[10px]"
        >
          이벤트 {showEventMarkers ? 'ON' : 'OFF'}
        </RetroButton>

        <RetroButton
          size="sm"
          variant={showAdvancedFilters ? 'primary' : 'default'}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-[10px]"
        >
          고급 필터
        </RetroButton>

        <RetroButton
          size="sm"
          onClick={() => useGameStore.getState().openWindow('trading', { companyId: selectedId })}
        >
          매매
        </RetroButton>
      </div>

      {/* Price info */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-base font-bold">{selected.price.toLocaleString()}원</span>
        <span className={`font-bold ${isUp ? 'text-stock-up' : 'text-stock-down'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toLocaleString()} ({isUp ? '+' : ''}
          {changePercent.toFixed(2)}%)
        </span>
      </div>

      {/* 고급 필터 패널 */}
      {showAdvancedFilters && (
        <div className="mb-1 win-inset bg-white p-1 space-y-1 text-[10px]">
          {/* Sort */}
          <div className="flex items-center gap-1">
            <span className="text-retro-gray">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 win-inset bg-white px-1 py-0.5"
            >
              <option value="name">이름순</option>
              <option value="price">가격순</option>
              <option value="change">등락률순</option>
              <option value="sector">섹터순</option>
            </select>
          </div>

          {/* 추가 섹터 */}
          <div className="flex flex-wrap gap-0.5">
            <span className="text-retro-gray w-full">추가 섹터:</span>
            {['industrial', 'telecom', 'materials', 'utilities', 'realestate'].map((sector) => (
              <RetroButton
                key={sector}
                size="sm"
                variant={sectorFilter === sector ? 'primary' : 'default'}
                onClick={() => setSectorFilter(sector)}
                className="text-[9px] px-1 py-0.5"
              >
                {sector === 'industrial' && '산업재'}
                {sector === 'telecom' && '통신'}
                {sector === 'materials' && '원자재'}
                {sector === 'utilities' && '유틸리티'}
                {sector === 'realestate' && '부동산'}
              </RetroButton>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Sentiment Indicator */}
      {fearGreedIdx !== undefined && (
        <div className="mt-1 win-inset bg-white px-2 py-0.5 text-[10px] flex items-center gap-2">
          <span className="text-retro-gray">센티먼트:</span>
          <span
            className={`font-bold ${fearGreedIdx > 60 ? 'text-red-500' : fearGreedIdx < 40 ? 'text-blue-500' : 'text-gray-600'}`}
          >
            {fearGreedIdx > 75
              ? '극도의 탐욕'
              : fearGreedIdx > 60
                ? '탐욕'
                : fearGreedIdx < 25
                  ? '극도의 공포'
                  : fearGreedIdx < 40
                    ? '공포'
                    : '중립'}
          </span>
          <span className="text-retro-gray">({Math.round(fearGreedIdx)})</span>
        </div>
      )}

      {/* Event Info Panel */}
      {showEventMarkers && relevantEvents.length > 0 && (
        <div className="mt-1 win-inset bg-white p-1 text-[10px] overflow-y-auto">
          <div className="font-bold mb-0.5">관련 이벤트 ({relevantEvents.length})</div>
          <div className="space-y-0.5">
            {relevantEvents.slice(0, 5).map((evt) => {
              const impact = evt.priceImpactSnapshot?.[selected.id]
              const changePercent = impact
                ? ((impact.currentChange / impact.priceBefore) * 100).toFixed(2)
                : '0.00'
              const isPositive = parseFloat(changePercent) >= 0

              return (
                <div
                  key={evt.id}
                  className={`p-0.5 cursor-pointer ${
                    selectedEventId === evt.id
                      ? 'bg-win-title-active text-white'
                      : 'hover:bg-retro-gray/20'
                  }`}
                  onClick={() => setSelectedEventId(selectedEventId === evt.id ? null : evt.id)}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-1 ${
                        evt.impact.severity === 'critical'
                          ? 'bg-stock-down text-white'
                          : evt.impact.severity === 'high'
                            ? 'bg-orange-500 text-white'
                            : 'bg-retro-gray text-white'
                      }`}
                    >
                      {evt.impact.severity}
                    </span>
                    <span className="flex-1 truncate">{evt.title}</span>
                    {impact && (
                      <span
                        className={`font-bold ${isPositive ? 'text-stock-up' : 'text-stock-down'}`}
                      >
                        {isPositive ? '+' : ''}
                        {changePercent}%
                      </span>
                    )}
                  </div>
                  {selectedEventId === evt.id && impact && (
                    <div className="mt-0.5 pl-1 text-retro-gray space-y-0.5">
                      <div>시작가: {impact.priceBefore.toLocaleString()}원</div>
                      <div>
                        최대 변화: {impact.peakChange >= 0 ? '+' : ''}
                        {impact.peakChange.toLocaleString()}원 (
                        {((impact.peakChange / impact.priceBefore) * 100).toFixed(2)}%)
                      </div>
                      <div>
                        현재 변화: {impact.currentChange >= 0 ? '+' : ''}
                        {impact.currentChange.toLocaleString()}원
                      </div>
                      <div className="text-[9px]">
                        {evt.remainingTicks > 0
                          ? `진행중 (${Math.ceil(evt.remainingTicks / 10)}일 남음)`
                          : '종료됨'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

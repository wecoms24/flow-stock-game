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
  ScatterController,
} from 'chart.js'
import type { Plugin } from 'chart.js'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { EmptyState } from '../ui/EmptyState'
import { getFearGreedIndex, isSentimentActive } from '../../engines/sentimentEngine'
import { getAbsoluteTimestamp } from '../../config/timeConfig'
import type { TradeProposal } from '../../types/trade'

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

// 마커 hover 상태 저장 (플러그인-레벨 공유)
let hoveredMarkerInfo: { x: number; y: number; title: string; summary: string } | null = null

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
      const barHeight = 8
      const barWidth = chart.width - 80
      const barX = 40
      const barY = yAxis.top - barHeight - 4

      // 배경
      const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0)
      grad.addColorStop(0, 'rgba(68,68,255,0.4)')
      grad.addColorStop(0.5, 'rgba(128,128,128,0.25)')
      grad.addColorStop(1, 'rgba(255,68,68,0.4)')
      ctx.fillStyle = grad
      ctx.fillRect(barX, barY, barWidth, barHeight)

      // 텍스트 라벨
      ctx.font = '9px DungGeunMo, monospace'
      ctx.fillStyle = '#4488FF'
      ctx.textAlign = 'right'
      ctx.fillText('공포', barX - 4, barY + barHeight - 1)
      ctx.fillStyle = '#FF4444'
      ctx.textAlign = 'left'
      ctx.fillText('탐욕', barX + barWidth + 4, barY + barHeight - 1)

      // 인디케이터
      const indicatorX = barX + (fgi / 100) * barWidth
      ctx.fillStyle = fgi > 60 ? '#FF4444' : fgi < 40 ? '#4488FF' : '#C0C0C0'
      ctx.beginPath()
      ctx.arc(indicatorX, barY + barHeight / 2, 5, 0, Math.PI * 2)
      ctx.fill()

      // 수치 라벨
      ctx.fillStyle = '#C0C0C0'
      ctx.textAlign = 'center'
      ctx.font = '8px DungGeunMo, monospace'
      ctx.fillText(String(Math.round(fgi)), indicatorX, barY - 2)

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

      // Event type icon (emoji) instead of plain triangle
      const isPositive = marker.event.impact.driftModifier >= 0
      const icon =
        severity === 'critical' ? '💥'
        : severity === 'high' ? '⚠️'
        : isPositive ? '💡'
        : '📰'

      ctx.font = '14px serif'
      ctx.textAlign = 'center'
      // Glow effect for critical/high severity
      if (severity === 'critical' || severity === 'high') {
        ctx.shadowColor = severity === 'critical' ? 'rgba(255,0,0,0.8)' : 'rgba(255,165,0,0.6)'
        ctx.shadowBlur = 8
      }
      ctx.fillText(icon, x, topY - 4)
      ctx.shadowBlur = 0

      ctx.restore()
    })
  },
  afterDraw(chart) {
    // 마커 hover 시 툴팁 렌더링
    if (!hoveredMarkerInfo) return
    const { x, y, title, summary } = hoveredMarkerInfo
    const ctx = chart.ctx
    ctx.save()
    ctx.font = '10px DungGeunMo, monospace'
    const lines = [title, summary]
    const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12
    const boxH = lines.length * 14 + 8
    const boxX = Math.min(x + 8, chart.width - maxWidth - 4)
    const boxY = Math.max(y - boxH - 4, 4)
    ctx.fillStyle = 'rgba(0,0,0,0.85)'
    ctx.fillRect(boxX, boxY, maxWidth, boxH)
    ctx.fillStyle = '#FFD700'
    ctx.fillText(lines[0], boxX + 6, boxY + 14)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(lines[1], boxX + 6, boxY + 28)
    ctx.restore()
  },
  afterEvent(chart, args, options) {
    const markers = (options as EventMarkerOptions).markers || []
    if (!markers.length || args.event.type !== 'mousemove') {
      if (hoveredMarkerInfo) { hoveredMarkerInfo = null; chart.draw() }
      return
    }
    const mouseX = args.event.x ?? 0
    const mouseY = args.event.y ?? 0
    const xAxis = chart.scales.x
    let found = false
    for (const marker of markers) {
      const mx = xAxis.getPixelForValue(marker.tickIndex)
      if (Math.abs(mouseX - mx) < 10) {
        const sev = marker.event.impact.severity
        const drift = marker.event.impact.driftModifier
        const dir = drift >= 0 ? '↑' : '↓'
        const summary = `${marker.event.title} → ${dir} ${marker.changePercent}%`
        if (!hoveredMarkerInfo || hoveredMarkerInfo.title !== marker.event.title) {
          hoveredMarkerInfo = { x: mouseX, y: mouseY, title: `[${sev}]`, summary }
          chart.draw()
        }
        found = true
        break
      }
    }
    if (!found && hoveredMarkerInfo) { hoveredMarkerInfo = null; chart.draw() }
  },
}

/* ── Trade Annotation Plugin: employee names near trade markers ── */
interface TradeAnnotationOptions {
  employeeMap: Map<string, string>
}

const tradeAnnotationPlugin: Plugin<'line', TradeAnnotationOptions> = {
  id: 'tradeAnnotations',
  afterDatasetsDraw(chart, _args, options) {
    const empMap = options.employeeMap
    if (!empMap || empMap.size === 0) return

    // Find the scatter dataset with _tradeMarkerData
    for (let dsIdx = 0; dsIdx < chart.data.datasets.length; dsIdx++) {
      const ds = chart.data.datasets[dsIdx] as any
      const markerData = ds._tradeMarkerData as
        | Array<{
            x: number
            y: number
            trade: TradeProposal & { executedAt: number; executedPrice: number }
          }>
        | undefined
      if (!markerData?.length) continue

      const ctx = chart.ctx
      const meta = chart.getDatasetMeta(dsIdx)

      ctx.save()
      ctx.font = '9px DungGeunMo, monospace'
      ctx.textAlign = 'center'

      // Track label positions to avoid overlap
      const placedLabels: Array<{ x: number; y: number }> = []

      markerData.forEach((d, i) => {
        const element = meta.data[i]
        if (!element) return

        const px = element.x
        const py = element.y
        const isBuy = d.trade.direction === 'buy'
        const empName = empMap.get(d.trade.createdByEmployeeId) ?? '?'
        const reactionText = isBuy ? '매수 신호!' : '매도 신호!'
        const label = `${empName}: ${reactionText}`

        // Position label above for buys, below for sells
        const labelOffsetY = isBuy ? -16 : 20

        // Check overlap with already placed labels
        let finalY = py + labelOffsetY
        for (const placed of placedLabels) {
          if (Math.abs(px - placed.x) < 60 && Math.abs(finalY - placed.y) < 12) {
            finalY += isBuy ? -12 : 12
          }
        }
        placedLabels.push({ x: px, y: finalY })

        // Background box
        const textWidth = ctx.measureText(label).width + 6
        const boxX = px - textWidth / 2
        const boxY = finalY - 9

        ctx.fillStyle = isBuy ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)'
        ctx.fillRect(boxX, boxY, textWidth, 12)

        // Text
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(label, px, finalY)
      })

      ctx.restore()
    }
  },
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  ScatterController,
  eventMarkerPlugin,
  tradeAnnotationPlugin,
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
  const proposals = useGameStore((s) => s.proposals)
  const employees = useGameStore((s) => s.player.employees)
  const [selectedId, setSelectedIdLocal] = useState(companyId ?? companies[0]?.id ?? '')
  const orderFlowByCompany = useGameStore((s) => s.orderFlowByCompany)

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
  const [showTradeMarkers, setShowTradeMarkers] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const isFlashing = useGameStore((s) => s.isFlashing)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

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

  // Employee lookup map for trade marker annotations
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const emp of employees) {
      map.set(emp.id, emp.name)
    }
    return map
  }, [employees])

  // Executed trades for the selected company
  const executedTrades = useMemo(() => {
    if (!selected || !showTradeMarkers || !proposals?.length) return []
    return proposals.filter(
      (p): p is TradeProposal & { executedAt: number; executedPrice: number } =>
        p.companyId === selected.id &&
        p.status === 'EXECUTED' &&
        p.executedAt !== null &&
        p.executedPrice !== null,
    )
  }, [selected, showTradeMarkers, proposals])

  const chartData = useMemo(() => {
    if (!selected) return null
    const history =
      periodTicks > 0 ? selected.priceHistory.slice(-periodTicks) : selected.priceHistory

    const historyLength = history.length
    const currentAbsTick = getAbsoluteTimestamp(currentTime)

    // Generate date labels based on period
    const labels = history.map((_, i) => {
      // 역순: 맨 처음(i=0)이 가장 오래된 시점
      const ticksFromStart = i
      const ticksFromEnd = history.length - 1 - i

      // 기간에 따라 라벨 포맷 변경
      if (periodTicks <= 10) {
        // 1일: 시간 단위 (0시부터 시작)
        const hour = (currentTime.hour - ticksFromEnd + 240) % 24 // 음수 방지
        return `${String(hour).padStart(2, '0')}시`
      } else if (periodTicks <= 70) {
        // 1주: 매 10틱마다 하나씩 (일 단위)
        const dayOffset = Math.floor(ticksFromStart / 10)
        return `${dayOffset + 1}일`
      } else if (periodTicks <= 300) {
        // 1개월: 매 30틱마다 하나씩
        const dayOffset = Math.floor(ticksFromStart / 10)
        return `${dayOffset + 1}일`
      } else {
        // 3개월 이상: 월.일 형식
        const totalDays = Math.floor(ticksFromStart / 10)
        const month = ((currentTime.month - 1 + Math.floor(totalDays / 30)) % 12) + 1
        const day = (totalDays % 30) + 1
        return `${month}.${day}`
      }
    })

    // Map executed trades to chart x-axis indices
    const tradeMarkerData: Array<{
      x: number
      y: number
      trade: TradeProposal & { executedAt: number; executedPrice: number }
    }> = []

    for (const trade of executedTrades) {
      // executedAt is absolute tick; map to chart index
      const tickOffset = currentAbsTick - trade.executedAt
      const chartIndex = historyLength - 1 - tickOffset
      if (chartIndex >= 0 && chartIndex < historyLength) {
        tradeMarkerData.push({
          x: chartIndex,
          y: trade.executedPrice,
          trade,
        })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasets: Array<any> = [
      {
        data: history,
        borderColor: selected.price >= selected.previousPrice ? '#FF4444' : '#4488FF',
        backgroundColor:
          selected.price >= selected.previousPrice ? 'rgba(255,68,68,0.15)' : 'rgba(68,136,255,0.15)',
        borderWidth: 1.5,
        pointRadius: 0,
        stepped: 'middle' as const,
        fill: true,
        tension: 0,
      },
    ]

    // Add trade marker scatter dataset if there are executed trades in visible range
    if (tradeMarkerData.length > 0) {
      datasets.push({
        type: 'scatter' as const,
        label: '매매 내역',
        data: tradeMarkerData.map((d) => ({ x: d.x, y: d.y })),
        pointStyle: tradeMarkerData.map((d) =>
          d.trade.direction === 'buy' ? 'triangle' : 'triangle',
        ),
        rotation: tradeMarkerData.map((d) => (d.trade.direction === 'sell' ? 180 : 0)),
        pointBackgroundColor: tradeMarkerData.map((d) =>
          d.trade.direction === 'buy' ? '#22c55e' : '#ef4444',
        ),
        pointBorderColor: tradeMarkerData.map((d) =>
          d.trade.direction === 'buy' ? '#166534' : '#991b1b',
        ),
        pointBorderWidth: 1,
        pointRadius: 8,
        pointHoverRadius: 11,
        fill: false,
        showLine: false,
        // Store trade data for tooltip + annotation plugin
        _tradeMarkerData: tradeMarkerData,
      })
    }

    return {
      labels,
      datasets,
    }
  }, [selected, periodTicks, currentTime, executedTrades])

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
            color: '#C0C0C0',
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: periodTicks <= 10 ? 10 : periodTicks <= 70 ? 7 : periodTicks <= 300 ? 10 : 12,
          },
          grid: {
            display: false,
          },
          border: {
            color: 'rgba(192, 192, 192, 0.3)',
          },
        },
        y: {
          ticks: {
            font: { family: 'DungGeunMo', size: 10 },
            color: '#C0C0C0',
            callback: (value: string | number) =>
              typeof value === 'number' ? value.toLocaleString() : value,
          },
          grid: {
            color: 'rgba(192, 192, 192, 0.12)',
          },
          border: {
            color: 'rgba(192, 192, 192, 0.3)',
          },
        },
      },
      plugins: {
        tooltip: {
          titleFont: { family: 'DungGeunMo' },
          bodyFont: { family: 'DungGeunMo' },
          backgroundColor: 'rgba(0, 0, 128, 0.92)',
          titleColor: '#FFFFFF',
          bodyColor: '#C0C0C0',
          borderColor: '#C0C0C0',
          borderWidth: 1,
          callbacks: {
            title: (items: Array<{ datasetIndex: number; raw: unknown }>) => {
              const item = items[0]
              if (!item) return ''
              const ds = chartData?.datasets[item.datasetIndex] as any | undefined
              if (ds?._tradeMarkerData) {
                return '매매 체결'
              }
              return ''
            },
            label: (context: { datasetIndex: number; dataIndex: number; raw: unknown; formattedValue: string }) => {
              const ds = chartData?.datasets[context.datasetIndex] as any | undefined
              const markerData = ds?._tradeMarkerData as
                | Array<{
                    x: number
                    y: number
                    trade: TradeProposal & { executedAt: number; executedPrice: number }
                  }>
                | undefined
              if (markerData) {
                const d = markerData[context.dataIndex]
                if (!d) return ''
                const trade = d.trade
                const empName = employeeMap.get(trade.createdByEmployeeId) ?? '?'
                const dir = trade.direction === 'buy' ? '매수' : '매도'
                const slipStr = trade.slippage !== null ? ` (슬리피지: ${(trade.slippage * 100).toFixed(1)}%)` : ''
                return [
                  `${dir} ${trade.quantity}주 @ ${trade.executedPrice.toLocaleString()}원${slipStr}`,
                  `분석가: ${empName} | 확신도: ${trade.confidence}%`,
                  trade.isMistake ? '실수 거래' : '',
                ].filter(Boolean)
              }
              // Default: price tooltip
              const val = typeof context.raw === 'number' ? context.raw : 0
              return `${val.toLocaleString()}원`
            },
          },
        },
        eventMarkers: {
          markers: eventMarkers,
          onMarkerClick: (eventId: string) => setSelectedEventId(eventId),
          fearGreedIndex: fearGreedIdx,
        },
        tradeAnnotations: {
          employeeMap,
        },
      },
    }),
    [eventMarkers, fearGreedIdx, periodTicks, chartData, employeeMap],
  )

  if (!selected || !chartData) {
    return <EmptyState icon="📊" title="종목을 선택하세요" description="왼쪽 목록에서 관심 종목을 클릭하세요" />
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
      {/* 통합 필터 패널 */}
      <div className="win-inset bg-[#1a1a2e] p-1 mb-1 space-y-1 text-retro-silver">
        {/* 검색창 + 정렬 + 필터 토글 */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="🔍 티커/이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 win-inset bg-[#0c0c1e] px-1.5 py-0.5 text-xs text-retro-silver"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="win-inset bg-[#0c0c1e] text-retro-silver px-1 py-0.5 text-xs"
          >
            <option value="name">이름순</option>
            <option value="price">가격순</option>
            <option value="change">등락률순</option>
            <option value="sector">섹터순</option>
          </select>
          <RetroButton size="sm" onClick={() => setShowFilters(!showFilters)} className="text-[11px] !bg-[#1a1a3e] !text-retro-silver !border-retro-silver/30">
            {showFilters ? '▾ 필터' : '▸ 필터'}
          </RetroButton>
          {hasActiveFilters && (
            <RetroButton size="sm" onClick={resetFilters} className="text-[11px] !bg-[#1a1a3e] !text-retro-silver !border-retro-silver/30">
              초기화
            </RetroButton>
          )}
        </div>

        {/* 접기/펼치기 가능한 섹터 + 등락률 필터 */}
        {showFilters && (
          <div className="bg-[#12122a] border border-retro-silver/20 rounded p-1.5 space-y-1">
            <div className="flex gap-0.5 flex-wrap">
              {sectors.map((sector) => (
                <RetroButton
                  key={sector.value}
                  size="sm"
                  variant={sectorFilter === sector.value ? 'primary' : 'default'}
                  onClick={() => setSectorFilter(sector.value)}
                  className="text-[11px] px-1.5 py-0.5"
                >
                  {sector.emoji} {sector.label}
                </RetroButton>
              ))}
              {[
                { value: 'industrial', label: '산업재' },
                { value: 'telecom', label: '통신' },
                { value: 'materials', label: '원자재' },
                { value: 'utilities', label: '유틸리티' },
                { value: 'realestate', label: '부동산' },
              ].map((sector) => (
                <RetroButton
                  key={sector.value}
                  size="sm"
                  variant={sectorFilter === sector.value ? 'primary' : 'default'}
                  onClick={() => setSectorFilter(sector.value)}
                  className="text-[11px] px-1.5 py-0.5"
                >
                  {sector.label}
                </RetroButton>
              ))}
            </div>

            <div className="flex gap-0.5">
              <RetroButton
                size="sm"
                variant={changeFilter === 'all' ? 'primary' : 'default'}
                onClick={() => setChangeFilter('all')}
                className="text-[10px] px-1 py-0.5"
              >
                전체
              </RetroButton>
              <RetroButton
                size="sm"
                variant={changeFilter === 'up5' ? 'primary' : 'default'}
                onClick={() => setChangeFilter('up5')}
                className="text-[10px] px-1 py-0.5 text-stock-up"
              >
                ▲ +5% 이상
              </RetroButton>
              <RetroButton
                size="sm"
                variant={changeFilter === 'down5' ? 'primary' : 'default'}
                onClick={() => setChangeFilter('down5')}
                className="text-[10px] px-1 py-0.5 text-stock-down"
              >
                ▼ -5% 이하
              </RetroButton>
              <RetroButton
                size="sm"
                variant={changeFilter === 'stable' ? 'primary' : 'default'}
                onClick={() => setChangeFilter('stable')}
                className="text-[10px] px-1 py-0.5"
              >
                ±2% 이내
              </RetroButton>
            </div>
          </div>
        )}

        {/* 종목 선택 및 결과 개수 */}
        <div className="flex items-center gap-1">
          <select
            className="flex-1 win-inset bg-white px-1 py-0.5 text-xs"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {filteredCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ticker} - {c.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-retro-gray shrink-0">
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
          variant={showTradeMarkers ? 'primary' : 'default'}
          onClick={() => setShowTradeMarkers(!showTradeMarkers)}
          className="text-[10px]"
        >
          매매 {showTradeMarkers ? 'ON' : 'OFF'}
        </RetroButton>

        <RetroButton
          size="sm"
          onClick={() => useGameStore.getState().openWindow('trading', { companyId: selectedId })}
        >
          매매창
        </RetroButton>
      </div>

      {/* Price info */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-base font-bold tabular-nums">{selected.price.toLocaleString()}원</span>
        <span className={`font-bold ${isUp ? 'text-stock-up' : 'text-stock-down'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toLocaleString()} ({isUp ? '+' : ''}
          {changePercent.toFixed(2)}%)
        </span>
      </div>

      {/* Chart */}
      <div className={`flex-1 min-h-0 transition-colors duration-500 bg-[#1a1a2e] win-inset ${isFlashing ? 'brightness-125' : ''}`}>
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Sentiment Indicator */}
      {fearGreedIdx !== undefined && (
        <div className="mt-1 win-inset bg-[#1a1a2e] px-2 py-1 text-[10px] flex items-center gap-2">
          <span className="text-retro-gray font-bold">공포</span>
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
          <span className="text-retro-silver tabular-nums">({Math.round(fearGreedIdx)})</span>
          <span className="text-retro-gray font-bold">탐욕</span>
        </div>
      )}

      {/* Institutional Order Flow */}
      {orderFlowByCompany[selectedId] && (
        <div className="mt-0.5 win-inset bg-[#1a1a2e] px-2 py-1 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-retro-gray font-bold shrink-0">기관 수급</span>
            {/* Net flow bar */}
            <div className="flex-1 h-3 bg-[#0c0c1e] relative overflow-hidden rounded-sm">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-retro-gray/30" />
              {/* Flow bar */}
              <div
                className="absolute top-0 bottom-0 transition-all duration-300"
                style={{
                  left: orderFlowByCompany[selectedId].netNotional >= 0 ? '50%' : undefined,
                  right: orderFlowByCompany[selectedId].netNotional < 0 ? '50%' : undefined,
                  width: `${Math.min(50, Math.abs(orderFlowByCompany[selectedId].netNotional) / (selected?.marketCap ?? 1) * 5000)}%`,
                  backgroundColor: orderFlowByCompany[selectedId].netNotional >= 0 ? '#22c55e' : '#ef4444',
                }}
              />
            </div>
            {/* Numeric value */}
            <span className={`font-bold tabular-nums shrink-0 ${orderFlowByCompany[selectedId].netNotional >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {orderFlowByCompany[selectedId].netNotional >= 0 ? '+' : ''}{(orderFlowByCompany[selectedId].netNotional / 1_000_000).toFixed(1)}M
            </span>
            {/* Trade count */}
            <span className="text-retro-gray shrink-0">
              {orderFlowByCompany[selectedId].tradeCount}건
            </span>
          </div>
        </div>
      )}

      {/* Event Info Panel */}
      {showEventMarkers && relevantEvents.length > 0 && (
        <div className="mt-1 win-inset bg-[#1a1a2e] p-1 text-[10px] text-retro-silver overflow-y-auto">
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

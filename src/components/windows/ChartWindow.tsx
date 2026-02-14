import { useState, useMemo } from 'react'
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
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export function ChartWindow() {
  const companies = useGameStore((s) => s.companies)
  const [selectedId, setSelectedId] = useState(companies[0]?.id ?? '')

  const selected = companies.find((c) => c.id === selectedId)

  const chartData = useMemo(() => {
    if (!selected) return null
    const labels = selected.priceHistory.map((_, i) => `${i}`)
    return {
      labels,
      datasets: [
        {
          data: selected.priceHistory,
          borderColor: selected.price >= selected.previousPrice ? '#FF0000' : '#0000FF',
          backgroundColor:
            selected.price >= selected.previousPrice
              ? 'rgba(255,0,0,0.1)'
              : 'rgba(0,0,255,0.1)',
          borderWidth: 1.5,
          pointRadius: 0,
          stepped: 'middle' as const,
          fill: true,
          tension: 0,
        },
      ],
    }
  }, [selected])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 } as const,
      scales: {
        x: {
          display: false,
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
      },
    }),
    [],
  )

  if (!selected || !chartData) {
    return <div className="text-xs text-retro-gray">종목을 선택하세요</div>
  }

  const change = selected.price - selected.previousPrice
  const changePercent = selected.previousPrice
    ? (change / selected.previousPrice) * 100
    : 0
  const isUp = change >= 0

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Ticker selector */}
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        <select
          className="win-inset bg-white px-1 py-0.5 text-xs"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.ticker} - {c.name}
            </option>
          ))}
        </select>
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

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  )
}

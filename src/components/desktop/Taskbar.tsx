import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { PixelIcon } from '../ui/PixelIcon'
import { NotificationCenter } from '../ui/NotificationCenter'
import { formatHour } from '../../config/timeConfig'
import type { WindowType, WindowLayoutPreset } from '../../types'

const TASKBAR_ITEMS: { type: WindowType; icon: string; label: string }[] = [
  { type: 'portfolio', icon: 'portfolio', label: '포트폴리오' },
  { type: 'chart', icon: 'chart', label: '차트' },
  { type: 'trading', icon: 'trading', label: '매매' },
  { type: 'proposals', icon: 'trading', label: '제안서' },
  { type: 'institutional', icon: 'news', label: '기관' },
  { type: 'news', icon: 'news', label: '뉴스' },
  { type: 'office', icon: 'office', label: '사무실' },
  { type: 'office_history', icon: 'office_history', label: '히스토리' },
  { type: 'ranking', icon: 'ranking', label: '랭킹' },
  { type: 'settings', icon: 'settings', label: '설정' },
]

const LAYOUT_PRESETS: { preset: WindowLayoutPreset; label: string; icon: string }[] = [
  { preset: 'trading', label: '트레이딩', icon: '📊' },
  { preset: 'analysis', label: '분석', icon: '📈' },
  { preset: 'dashboard', label: '대시보드', icon: '🎛️' },
  { preset: 'ai-trading', label: 'AI 트레이딩', icon: '🤖' },
  { preset: 'institutional', label: '기관 모니터링', icon: '🏦' },
  { preset: 'comprehensive', label: '종합 분석', icon: '📋' },
]

export function Taskbar() {
  const {
    time,
    openWindow,
    windows,
    minimizeWindow,
    setSpeed,
    togglePause,
    unreadNewsCount,
    markNewsRead,
    applyWindowLayout,
  } = useGameStore()

  const [showLayoutMenu, setShowLayoutMenu] = useState(false)

  const companies = useGameStore((s) => s.companies)
  const marketRegime = useGameStore((s) => s.marketRegime)
  const circuitBreaker = useGameStore((s) => s.circuitBreaker)

  const handleOpenWindow = (type: WindowType) => {
    // Institutional window needs a companyId prop
    if (type === 'institutional') {
      const firstCompany = companies[0]
      openWindow(type, { companyId: firstCompany?.id || 'tech-01' })
    } else {
      openWindow(type)
    }
    if (type === 'news') markNewsRead()
  }

  const handleApplyLayout = (preset: WindowLayoutPreset) => {
    applyWindowLayout(preset)
    setShowLayoutMenu(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-win-face win-outset flex items-center px-1 gap-0.5 z-[10000]">
      {/* Start button */}
      <RetroButton variant="primary" size="sm" className="font-bold text-xs shrink-0">
        <span className="flex items-center gap-1">
          <PixelIcon name="chart" size={12} />
          Stock-OS
        </span>
      </RetroButton>

      <div className="w-px h-5 bg-win-shadow mx-0.5" />

      {/* Quick launch with SVG icons + notification badges */}
      {TASKBAR_ITEMS.map((item) => (
        <RetroButton
          key={item.type}
          size="sm"
          onClick={() => handleOpenWindow(item.type)}
          title={item.label}
          className="relative"
        >
          <PixelIcon name={item.icon} size={14} />
          {/* News badge */}
          {item.type === 'news' && unreadNewsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-stock-up text-retro-white text-[8px] leading-none px-0.5 rounded-sm min-w-[10px] text-center">
              {unreadNewsCount > 9 ? '9+' : unreadNewsCount}
            </span>
          )}
        </RetroButton>
      ))}

      <div className="w-px h-5 bg-win-shadow mx-0.5" />

      {/* Active windows */}
      <div className="flex-1 flex gap-0.5 overflow-hidden">
        {windows.map((win) => (
          <RetroButton
            key={win.id}
            size="sm"
            className={`text-[10px] max-w-24 truncate ${win.isMinimized ? 'opacity-60' : ''}`}
            onClick={() => minimizeWindow(win.id)}
          >
            {win.title}
          </RetroButton>
        ))}
      </div>

      <div className="w-px h-5 bg-win-shadow mx-0.5" />

      {/* Layout Presets */}
      <div className="relative shrink-0">
        <RetroButton
          size="sm"
          onClick={() => setShowLayoutMenu(!showLayoutMenu)}
          title="레이아웃 선택"
          className="text-[10px]"
        >
          <span className="flex items-center gap-1">
            🪟 레이아웃
          </span>
        </RetroButton>

        {/* Dropdown Menu */}
        {showLayoutMenu && (
          <div className="absolute bottom-full left-0 mb-1 win-outset bg-win-face p-1 space-y-0.5 min-w-[100px] z-50">
            {LAYOUT_PRESETS.map(({ preset, label, icon }) => (
              <RetroButton
                key={preset}
                size="sm"
                onClick={() => handleApplyLayout(preset)}
                className="text-[10px] w-full justify-start"
              >
                <span className="flex items-center gap-1">
                  {icon} {label}
                </span>
              </RetroButton>
            ))}
          </div>
        )}
      </div>

      {/* Speed controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <RetroButton size="sm" onClick={togglePause} title={time.isPaused ? '재생' : '일시정지'}>
          <span className="text-[10px]">{time.isPaused ? '▶' : '⏸'}</span>
        </RetroButton>
        {([1, 2, 4] as const).map((spd) => (
          <RetroButton
            key={spd}
            size="sm"
            onClick={() => setSpeed(spd)}
            className={`text-[10px] ${time.speed === spd ? 'win-pressed font-bold' : ''}`}
          >
            {spd}x
          </RetroButton>
        ))}
      </div>

      <div className="w-px h-5 bg-win-shadow mx-0.5" />

      {/* Circuit Breaker Indicator */}
      {circuitBreaker.isActive && circuitBreaker.remainingTicks > 0 && (
        <div
          className="win-inset px-2 py-0.5 text-[10px] shrink-0 flex items-center gap-1 bg-red-600 text-white font-bold animate-pulse"
          title={`서킷브레이커 Level ${circuitBreaker.level} - KOSPI ${((circuitBreaker.kospiCurrent - circuitBreaker.kospiSessionOpen) / circuitBreaker.kospiSessionOpen * 100).toFixed(1)}%`}
        >
          <span>🚨</span>
          <span>CB Lv{circuitBreaker.level}</span>
          {circuitBreaker.level < 3 && <span>{circuitBreaker.remainingTicks}h</span>}
        </div>
      )}

      {/* Market Regime Indicator */}
      <div
        className={`win-inset px-2 py-0.5 text-[10px] shrink-0 flex items-center gap-1 ${
          marketRegime.current === 'CRISIS' ? 'animate-pulse' : ''
        }`}
        title={`시장 레짐: ${marketRegime.current} (${marketRegime.duration}시간)`}
      >
        {marketRegime.current === 'CALM' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />}
        {marketRegime.current === 'VOLATILE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500" />}
        {marketRegime.current === 'CRISIS' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" />}
        <span className="font-bold">
          {marketRegime.current === 'CALM' && '평온'}
          {marketRegime.current === 'VOLATILE' && '변동'}
          {marketRegime.current === 'CRISIS' && '위기'}
        </span>
      </div>

      <div className="w-px h-5 bg-win-shadow mx-0.5" />

      {/* Notification Center */}
      <NotificationCenter />

      <div className="w-px h-5 bg-win-shadow mx-0.5" />

      {/* Clock */}
      <div className="win-inset bg-white px-2 py-0.5 text-[10px] shrink-0 tabular-nums flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" title="장 중" />
        {time.year}.{String(time.month).padStart(2, '0')}.{String(time.day).padStart(2, '0')}{' '}
        {formatHour(time.hour)}
      </div>
    </div>
  )
}

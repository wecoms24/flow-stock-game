import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { PixelIcon, type IconName } from '../ui/PixelIcon'
import { NotificationCenter } from '../ui/NotificationCenter'
import { formatHour } from '../../config/timeConfig'
import type { WindowType, WindowLayoutPreset } from '../../types'

// 단일 진실의 원천: 모든 메뉴 항목 정의
const MENU_ITEMS = [
  { category: '거래', type: 'portfolio' as WindowType, icon: 'portfolio' as IconName, label: '포트폴리오', menuLabel: '포트폴리오' },
  { category: '거래', type: 'chart' as WindowType, icon: 'chart' as IconName, label: '차트', menuLabel: '차트' },
  { category: '거래', type: 'trading' as WindowType, icon: 'trading' as IconName, label: '매매', menuLabel: '매매' },
  { category: '거래', type: 'proposals' as WindowType, icon: 'document' as IconName, label: '제안서', menuLabel: 'AI 제안서' },
  { category: '정보', type: 'news' as WindowType, icon: 'news' as IconName, label: '뉴스', menuLabel: '뉴스' },
  { category: '정보', type: 'institutional' as WindowType, icon: 'institution' as IconName, label: '기관', menuLabel: '기관 투자자' },
  { category: '관리', type: 'office' as WindowType, icon: 'office' as IconName, label: '사무실', menuLabel: '사무실' },
  { category: '관리', type: 'office_history' as WindowType, icon: 'office_history' as IconName, label: '히스토리', menuLabel: '사무실 히스토리' },
  { category: '관리', type: 'employee_detail' as WindowType, icon: 'employee' as IconName, label: '직원 정보', menuLabel: '직원 정보' },
  { category: '관리', type: 'ranking' as WindowType, icon: 'ranking' as IconName, label: '랭킹', menuLabel: '랭킹' },
  { category: '시스템', type: 'settings' as WindowType, icon: 'settings' as IconName, label: '설정', menuLabel: '설정' },
] as const

// 파생 데이터: Taskbar 빠른 실행 아이콘
const TASKBAR_ITEMS = MENU_ITEMS.map(({ type, icon, label }) => ({ type, icon, label }))

// 파생 데이터: 시작 메뉴 카테고리 구조
const START_MENU_CATEGORIES = Array.from(
  MENU_ITEMS.reduce((acc, item) => {
    if (!acc.has(item.category)) {
      acc.set(item.category, [])
    }
    acc.get(item.category)!.push({
      type: item.type,
      icon: item.icon,
      label: item.menuLabel,
    })
    return acc
  }, new Map<string, Array<{ type: WindowType; icon: IconName; label: string }>>())
).map(([name, items]) => ({ name, items }))

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
  const [showStartMenu, setShowStartMenu] = useState(false)
  const startMenuRef = useRef<HTMLDivElement>(null)
  const layoutMenuRef = useRef<HTMLDivElement>(null)

  // 성능 최적화: 필요한 것만 구독
  const firstCompanyId = useGameStore((s) => s.companies[0]?.id ?? 'tech-01')
  const firstEmployeeId = useGameStore((s) => s.player.employees[0]?.id)
  const hasEmployees = useGameStore((s) => s.player.employees.length > 0)
  const marketRegime = useGameStore((s) => s.marketRegime)
  const circuitBreaker = useGameStore((s) => s.circuitBreaker)

  const handleOpenWindow = (type: WindowType) => {
    // Institutional window needs a companyId prop
    if (type === 'institutional') {
      openWindow(type, { companyId: firstCompanyId })
    } else if (type === 'employee_detail') {
      // Employee detail window needs an employeeId prop
      if (hasEmployees && firstEmployeeId) {
        openWindow(type, { employeeId: firstEmployeeId })
      } else {
        // 직원이 없으면 office 윈도우를 대신 열기
        openWindow('office')
      }
    } else {
      openWindow(type)
    }
    if (type === 'news') markNewsRead()
  }

  const handleApplyLayout = (preset: WindowLayoutPreset) => {
    applyWindowLayout(preset)
    setShowLayoutMenu(false)
  }

  // 시작 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!showStartMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (startMenuRef.current && !startMenuRef.current.contains(e.target as Node)) {
        setShowStartMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStartMenu])

  // 레이아웃 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!showLayoutMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLayoutMenu])

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-win-face win-outset flex items-center px-1 gap-0.5 z-[10000]">
      {/* Start button with menu */}
      <div className="relative shrink-0" ref={startMenuRef}>
        <RetroButton
          variant="primary"
          size="sm"
          className={`font-bold text-xs ${showStartMenu ? 'win-pressed' : ''}`}
          onClick={() => setShowStartMenu(!showStartMenu)}
        >
          <span className="flex items-center gap-1">
            <PixelIcon name="chart" size={12} />
            Stock-OS
          </span>
        </RetroButton>

        {/* Windows 95 Start Menu */}
        {showStartMenu && (
          <div className="absolute bottom-full left-0 mb-1 win-outset bg-win-face flex z-50 shadow-lg">
            {/* Left vertical bar */}
            <div className="w-6 bg-gradient-to-b from-blue-700 to-blue-900 flex items-end justify-center py-2 px-1">
              <div
                className="text-white font-bold text-xs whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Stock-OS
              </div>
            </div>

            {/* Right menu content */}
            <div className="p-1 min-w-[180px]">
              {START_MENU_CATEGORIES.map((category, idx) => (
                <div key={category.name}>
                  {idx > 0 && <div className="h-px bg-win-shadow my-1" />}
                  <div className="text-[10px] font-bold text-gray-600 px-2 py-1">{category.name}</div>
                  {category.items.map((item) => (
                    <RetroButton
                      key={item.type}
                      size="sm"
                      onClick={() => {
                        handleOpenWindow(item.type)
                        setShowStartMenu(false)
                      }}
                      className="text-xs w-full justify-start mb-0.5"
                    >
                      <span className="flex items-center gap-2">
                        <PixelIcon name={item.icon} size={14} />
                        {item.label}
                      </span>
                    </RetroButton>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
      <div className="relative shrink-0" ref={layoutMenuRef}>
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

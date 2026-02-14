import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import type { WindowType } from '../../types'

const TASKBAR_ITEMS: { type: WindowType; icon: string; label: string }[] = [
  { type: 'portfolio', icon: '📊', label: '포트폴리오' },
  { type: 'chart', icon: '📈', label: '차트' },
  { type: 'trading', icon: '💰', label: '매매' },
  { type: 'news', icon: '📰', label: '뉴스' },
  { type: 'office', icon: '🏢', label: '사무실' },
  { type: 'ranking', icon: '🏆', label: '랭킹' },
  { type: 'settings', icon: '⚙', label: '설정' },
]

export function Taskbar() {
  const { time, openWindow, windows, minimizeWindow, setSpeed, togglePause } = useGameStore()

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-win-face win-outset flex items-center px-1 gap-0.5 z-[10000]">
      {/* Start button */}
      <RetroButton variant="primary" size="sm" className="font-bold text-xs shrink-0">
        Stock-OS
      </RetroButton>

      <div className="w-px h-5 bg-win-shadow mx-0.5" />

      {/* Quick launch */}
      {TASKBAR_ITEMS.map((item) => (
        <RetroButton
          key={item.type}
          size="sm"
          onClick={() => openWindow(item.type)}
          title={item.label}
        >
          <span className="text-[10px]">{item.icon}</span>
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

      {/* Clock */}
      <div className="win-inset bg-white px-2 py-0.5 text-[10px] shrink-0 tabular-nums">
        {time.year}.{String(time.month).padStart(2, '0')}.{String(time.day).padStart(2, '0')}
      </div>
    </div>
  )
}

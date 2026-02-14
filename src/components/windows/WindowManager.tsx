import { useGameStore } from '../../stores/gameStore'
import { WindowFrame } from './WindowFrame'
import { PortfolioWindow } from './PortfolioWindow'
import { ChartWindow } from './ChartWindow'
import { TradingWindow } from './TradingWindow'
import { NewsWindow } from './NewsWindow'
import type { WindowType } from '../../types'

const WINDOW_COMPONENTS: Record<WindowType, React.ComponentType<Record<string, unknown>>> = {
  portfolio: PortfolioWindow as React.ComponentType<Record<string, unknown>>,
  chart: ChartWindow as React.ComponentType<Record<string, unknown>>,
  trading: TradingWindow as React.ComponentType<Record<string, unknown>>,
  news: NewsWindow as React.ComponentType<Record<string, unknown>>,
  office: () => (
    <div className="text-xs text-retro-gray text-center py-8">사무실 뷰 (준비 중)</div>
  ),
  ranking: () => (
    <div className="text-xs text-retro-gray text-center py-8">랭킹 보드 (준비 중)</div>
  ),
  settings: () => (
    <div className="text-xs text-retro-gray text-center py-8">설정 (준비 중)</div>
  ),
}

export function WindowManager() {
  const windows = useGameStore((s) => s.windows)

  return (
    <>
      {windows.map((win) => {
        const Component = WINDOW_COMPONENTS[win.type]
        return (
          <WindowFrame key={win.id} window={win}>
            <Component {...(win.props ?? {})} />
          </WindowFrame>
        )
      })}
    </>
  )
}

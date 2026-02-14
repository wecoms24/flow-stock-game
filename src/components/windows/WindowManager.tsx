import { useGameStore } from '../../stores/gameStore'
import { WindowFrame } from './WindowFrame'
import { PortfolioWindow } from './PortfolioWindow'
import { ChartWindow } from './ChartWindow'
import { TradingWindow } from './TradingWindow'
import { NewsWindow } from './NewsWindow'
import { OfficeWindow } from './OfficeWindow'
import { RankingWindow } from './RankingWindow'
import { SettingsWindow } from './SettingsWindow'
import type { WindowType } from '../../types'

const WINDOW_COMPONENTS: Record<WindowType, React.ComponentType<Record<string, unknown>>> = {
  portfolio: PortfolioWindow as React.ComponentType<Record<string, unknown>>,
  chart: ChartWindow as React.ComponentType<Record<string, unknown>>,
  trading: TradingWindow as React.ComponentType<Record<string, unknown>>,
  news: NewsWindow as React.ComponentType<Record<string, unknown>>,
  office: OfficeWindow as React.ComponentType<Record<string, unknown>>,
  ranking: RankingWindow as React.ComponentType<Record<string, unknown>>,
  settings: SettingsWindow as React.ComponentType<Record<string, unknown>>,
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

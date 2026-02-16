import { useGameStore } from '../../stores/gameStore'
import { WindowFrame } from './WindowFrame'
import { PortfolioWindow } from './PortfolioWindow'
import { ChartWindow } from './ChartWindow'
import { TradingWindow } from './TradingWindow'
import { NewsWindow } from './NewsWindow'
import { OfficeWindow } from './OfficeWindow'
import { RankingWindow } from './RankingWindow'
import { SettingsWindow } from './SettingsWindow'
import { EndingScreen } from './EndingScreen'
import { OfficeHistoryWindow } from './OfficeHistoryWindow'
import { EmployeeDetailWindow } from './EmployeeDetailWindow'
import { InstitutionalWindow } from './InstitutionalWindow'
import { ProposalListWindow } from './ProposalListWindow'
import { AcquisitionWindow } from './AcquisitionWindow'
import type { WindowType } from '../../types'

const WINDOW_COMPONENTS: Record<WindowType, React.ComponentType<unknown>> = {
  portfolio: PortfolioWindow as React.ComponentType<unknown>,
  chart: ChartWindow as React.ComponentType<unknown>,
  trading: TradingWindow as React.ComponentType<unknown>,
  news: NewsWindow as React.ComponentType<unknown>,
  office: OfficeWindow as React.ComponentType<unknown>,
  ranking: RankingWindow as React.ComponentType<unknown>,
  office_history: OfficeHistoryWindow as React.ComponentType<unknown>,
  employee_detail: EmployeeDetailWindow as React.ComponentType<unknown>,
  settings: SettingsWindow as React.ComponentType<unknown>,
  ending: EndingScreen as React.ComponentType<unknown>,
  institutional: InstitutionalWindow as React.ComponentType<unknown>,
  proposals: ProposalListWindow as React.ComponentType<unknown>,
  acquisition: AcquisitionWindow as React.ComponentType<unknown>,
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

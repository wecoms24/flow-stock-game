import { lazy, Suspense } from 'react'
import { AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { WindowFrame } from './WindowFrame'
import type { WindowType } from '../../types'

const PortfolioWindow = lazy(() => import('./PortfolioWindow').then((m) => ({ default: m.PortfolioWindow })))
const ChartWindow = lazy(() => import('./ChartWindow').then((m) => ({ default: m.ChartWindow })))
const TradingWindow = lazy(() => import('./TradingWindow').then((m) => ({ default: m.TradingWindow })))
const NewsWindow = lazy(() => import('./NewsWindow').then((m) => ({ default: m.NewsWindow })))
const OfficeDotWindow = lazy(() => import('./OfficeDotWindow').then((m) => ({ default: m.OfficeDotWindow })))
const RankingWindow = lazy(() => import('./RankingWindow').then((m) => ({ default: m.RankingWindow })))
const SettingsWindow = lazy(() => import('./SettingsWindow').then((m) => ({ default: m.SettingsWindow })))
const EndingScreen = lazy(() => import('./EndingScreen').then((m) => ({ default: m.EndingScreen })))
const OfficeHistoryWindow = lazy(() => import('./OfficeHistoryWindow').then((m) => ({ default: m.OfficeHistoryWindow })))
const EmployeeDetailWindow = lazy(() => import('./EmployeeDetailWindow').then((m) => ({ default: m.EmployeeDetailWindow })))
const InstitutionalWindow = lazy(() => import('./InstitutionalWindow').then((m) => ({ default: m.InstitutionalWindow })))
const ProposalListWindow = lazy(() => import('./ProposalListWindow').then((m) => ({ default: m.ProposalListWindow })))
const AcquisitionWindow = lazy(() => import('./AcquisitionWindow').then((m) => ({ default: m.AcquisitionWindow })))
const MainDashboard = lazy(() => import('../desktop/MainDashboard').then((m) => ({ default: m.MainDashboard })))
const MonthlyCardDrawWindow = lazy(() => import('./MonthlyCardDrawWindow').then((m) => ({ default: m.MonthlyCardDrawWindow })))
const EventChainTracker = lazy(() => import('./EventChainTracker').then((m) => ({ default: m.EventChainTracker })))
const AchievementLogWindow = lazy(() => import('./AchievementLogWindow').then((m) => ({ default: m.AchievementLogWindow })))
const SkillLibraryWindow = lazy(() => import('./SkillLibraryWindow').then((m) => ({ default: m.SkillLibraryWindow })))
const TrainingCenterWindow = lazy(() => import('./TrainingCenterWindow').then((m) => ({ default: m.TrainingCenterWindow })))
const PlaystyleWindow = lazy(() => import('./PlaystyleWindow').then((m) => ({ default: m.PlaystyleWindow })))

const WINDOW_COMPONENTS: Record<WindowType, React.LazyExoticComponent<React.ComponentType<unknown>>> = {
  portfolio: PortfolioWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  chart: ChartWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  trading: TradingWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  news: NewsWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  office: OfficeDotWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  office_dot: OfficeDotWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  ranking: RankingWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  office_history: OfficeHistoryWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  employee_detail: EmployeeDetailWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  settings: SettingsWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  ending: EndingScreen as React.LazyExoticComponent<React.ComponentType<unknown>>,
  institutional: InstitutionalWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  proposals: ProposalListWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  acquisition: AcquisitionWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  dashboard: MainDashboard as React.LazyExoticComponent<React.ComponentType<unknown>>,
  achievement_log: AchievementLogWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  monthly_cards: MonthlyCardDrawWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  event_chain_tracker: EventChainTracker as React.LazyExoticComponent<React.ComponentType<unknown>>,
  skill_library: SkillLibraryWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  training_center: TrainingCenterWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
  playstyle_analytics: PlaystyleWindow as React.LazyExoticComponent<React.ComponentType<unknown>>,
}

function WindowFallback() {
  return (
    <div className="flex items-center justify-center h-full text-xs text-retro-gray">
      로딩 중...
    </div>
  )
}

export function WindowManager() {
  const windows = useGameStore((s) => s.windows)

  return (
    <AnimatePresence mode="popLayout">
      {windows.map((win) => {
        const Component = WINDOW_COMPONENTS[win.type]
        return (
          <WindowFrame key={win.id} window={win}>
            <Suspense fallback={<WindowFallback />}>
              <Component {...(win.props ?? {})} />
            </Suspense>
          </WindowFrame>
        )
      })}
    </AnimatePresence>
  )
}

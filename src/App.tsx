import { useEffect, useState } from 'react'
import { useGameStore } from './stores/gameStore'
import { initTickEngine, startTickLoop, destroyTickEngine } from './engines/tickEngine'
import { StartScreen } from './components/desktop/StartScreen'
import { StockTicker } from './components/desktop/StockTicker'
import { Taskbar } from './components/desktop/Taskbar'
import { WindowManager } from './components/windows/WindowManager'
import { EndingScreen } from './components/windows/EndingScreen'
import { CRTOverlay } from './components/effects/CRTOverlay'
import { StockParticles } from './components/effects/StockParticles'
import { RankChangeNotification } from './components/effects/RankChangeNotification'
import { useRankChangeNotification } from './hooks/useRankChangeNotification'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LevelUpOverlay } from './components/effects/LevelUpOverlay'
import { FloatingTextContainer } from './components/effects/FloatingText'
import { OfficeToast } from './components/ui/OfficeToast'
import { RegimeToast } from './components/ui/RegimeToast'
import { hasSaveData } from './systems/saveSystem'

export default function App() {
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const time = useGameStore((s) => s.time)
  const checkEnding = useGameStore((s) => s.checkEnding)
  const [hasSave, setHasSave] = useState(false)
  const rankChange = useRankChangeNotification()

  // Check for existing save on mount
  useEffect(() => {
    hasSaveData().then(setHasSave)
  }, [])

  useEffect(() => {
    initTickEngine()
    startTickLoop()
    return () => destroyTickEngine()
  }, [])

  // Check ending conditions every new day
  useEffect(() => {
    if (isGameStarted && !isGameOver && time.hour === 9) {
      checkEnding()
    }
  }, [isGameStarted, isGameOver, time.year, time.month, time.day, time.hour, checkEnding])

  if (!isGameStarted) {
    return (
      <ErrorBoundary>
        <StartScreen hasSave={hasSave} onSaveLoaded={() => setHasSave(false)} />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen bg-win-bg overflow-hidden">
        <StockTicker />

        <div className="absolute top-5 left-0 right-0 bottom-8">
          <WindowManager />
        </div>

        <Taskbar />

        {/* Visual effects */}
        <StockParticles />
        <FloatingTextContainer />
        <LevelUpOverlay />
        <OfficeToast />
        <RegimeToast />

        {isGameOver && <EndingScreen />}

        {/* Rank change notification */}
        {rankChange && (
          <RankChangeNotification oldRank={rankChange.oldRank} newRank={rankChange.newRank} />
        )}

        <CRTOverlay />
      </div>
    </ErrorBoundary>
  )
}

import { useEffect } from 'react'
import { useGameStore } from './stores/gameStore'
import { initTickEngine, startTickLoop, destroyTickEngine } from './engines/tickEngine'
import { StartScreen } from './components/desktop/StartScreen'
import { StockTicker } from './components/desktop/StockTicker'
import { Taskbar } from './components/desktop/Taskbar'
import { WindowManager } from './components/windows/WindowManager'
import { EndingScreen } from './components/windows/EndingScreen'
import { CRTOverlay } from './components/effects/CRTOverlay'

export default function App() {
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const time = useGameStore((s) => s.time)
  const checkEnding = useGameStore((s) => s.checkEnding)

  useEffect(() => {
    initTickEngine()
    startTickLoop()
    return () => destroyTickEngine()
  }, [])

  // Check ending conditions periodically (every new day = tick 0)
  useEffect(() => {
    if (isGameStarted && !isGameOver && time.tick === 0) {
      checkEnding()
    }
  }, [isGameStarted, isGameOver, time.year, time.month, time.day, time.tick, checkEnding])

  if (!isGameStarted) {
    return <StartScreen />
  }

  return (
    <div className="w-screen h-screen bg-win-bg overflow-hidden">
      {/* Stock ticker bar at top */}
      <StockTicker />

      {/* Desktop area - between ticker and taskbar */}
      <div className="absolute top-5 left-0 right-0 bottom-8">
        <WindowManager />
      </div>

      {/* Taskbar at bottom */}
      <Taskbar />

      {/* Ending overlay */}
      {isGameOver && <EndingScreen />}

      {/* CRT effects on top of everything */}
      <CRTOverlay />
    </div>
  )
}

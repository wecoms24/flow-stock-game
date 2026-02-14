import { useEffect } from 'react'
import { useGameStore } from './stores/gameStore'
import { initTickEngine, startTickLoop, destroyTickEngine } from './engines/tickEngine'
import { StartScreen } from './components/desktop/StartScreen'
import { StockTicker } from './components/desktop/StockTicker'
import { Taskbar } from './components/desktop/Taskbar'
import { WindowManager } from './components/windows/WindowManager'
import { CRTOverlay } from './components/effects/CRTOverlay'

export default function App() {
  const isGameStarted = useGameStore((s) => s.isGameStarted)

  useEffect(() => {
    initTickEngine()
    startTickLoop()
    return () => destroyTickEngine()
  }, [])

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

      {/* CRT effects on top of everything */}
      <CRTOverlay />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useGameStore } from './stores/gameStore'
import { initTickEngine, startTickLoop, destroyTickEngine } from './engines/tickEngine'
import { validateSkillTree } from './systems/skillSystem'
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
import { migrateIndexedDBToSQLite } from './systems/sqlite/migration'
import { getFeatureFlag, setFeatureFlag } from './systems/featureFlags'
import { initializeDB, saveSlotExists } from './systems/sqlite'

export default function App() {
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const time = useGameStore((s) => s.time)
  const checkEnding = useGameStore((s) => s.checkEnding)
  const [hasSave, setHasSave] = useState(false)
  const [showMigrationBanner, setShowMigrationBanner] = useState(false)
  const rankChange = useRankChangeNotification()

  // Check for existing save on mount + show migration prompt if needed
  useEffect(() => {
    const initializeApp = async () => {
      // Check for save data first
      const saveExists = await hasSaveData()
      setHasSave(saveExists)

      // Check if migration prompt should be shown
      const sqliteEnabled = getFeatureFlag('sqlite_enabled')
      const migrationDismissed = localStorage.getItem('migration_dismissed') === 'true'

      if (sqliteEnabled && saveExists && !migrationDismissed) {
        // Check if migration already completed
        try {
          const db = await initializeDB()
          const hasSQLiteSave = await saveSlotExists(db, 'autosave')
          setShowMigrationBanner(!hasSQLiteSave)
        } catch {
          setShowMigrationBanner(true)
        }
      }
    }

    initializeApp().catch(console.error)
  }, [])

  useEffect(() => {
    // ✨ RPG Skill Tree: Validate skill tree on game start
    const validation = validateSkillTree()
    if (!validation.valid) {
      console.error('❌ Skill tree validation failed:', validation.errors)
    } else {
      console.log('✅ Skill tree validation passed')
    }

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

  // Handle migration banner actions
  const handleMigrateNow = async () => {
    try {
      await migrateIndexedDBToSQLite()
      setShowMigrationBanner(false)
      console.log('[App] Migration completed successfully')
    } catch (error) {
      console.error('[App] Migration failed:', error)
      // Revert feature flag so the app falls back to IndexedDB
      setFeatureFlag('sqlite_enabled', false)
      alert(
        '마이그레이션 실패. IndexedDB 모드로 전환합니다.\n\n' +
          (error instanceof Error ? error.message : String(error)),
      )
      setShowMigrationBanner(false)
    }
  }

  const handleMigrateLater = () => {
    localStorage.setItem('migration_dismissed', 'true')
    setShowMigrationBanner(false)
  }

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
        {/* Migration banner */}
        {showMigrationBanner && (
          <div className="absolute top-0 left-0 right-0 z-[9999] bg-yellow-100 border-b-2 border-yellow-400 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💾</div>
              <div>
                <div className="font-bold text-gray-800">새로운 SQLite 저장 시스템 업그레이드</div>
                <div className="text-sm text-gray-600">
                  더 빠른 로딩과 다중 세이브 슬롯 기능을 사용할 수 있습니다.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleMigrateNow}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                업그레이드
              </button>
              <button
                onClick={handleMigrateLater}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                나중에
              </button>
            </div>
          </div>
        )}

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

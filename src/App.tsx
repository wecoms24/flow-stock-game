import { useEffect, useRef, useState } from 'react'
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
import { TradeAnimationSequence } from './components/effects/TradeAnimationSequence'
import { MarketClosedDialog } from './components/effects/MarketClosedDialog'
import { RetroButton } from './components/ui/RetroButton'
import { CeremonyOverlay } from './components/ui/CeremonyOverlay'
import { ToastContainer, showToast } from './components/ui/ToastContainer'
import { RankCelebration } from './components/ui/RankCelebration'
import { CelebrationManager } from './components/ui/CelebrationManager'
import { ChapterModal } from './components/tutorial/ChapterModal'
import { TutorialSpotlight, isTutorialCompleted } from './components/tutorial/TutorialSpotlight'
import { FastForwardOverlay } from './components/ui/FastForwardOverlay'
import { useScreenShake, registerShakeHandler, triggerScreenShake } from './hooks/useScreenShake'
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
  const [showTutorial, setShowTutorial] = useState(false)
  const rankChange = useRankChangeNotification()
  const desktopRef = useRef<HTMLDivElement>(null)
  const shake = useScreenShake(desktopRef)

  // Register global shake handler so engines can trigger shakes
  useEffect(() => {
    return registerShakeHandler(shake)
  }, [shake])

  // Bridge existing CustomEvent toasts → unified ToastContainer
  useEffect(() => {
    const handleRegimeChange = (e: Event) => {
      const { regime, message } = (e as CustomEvent).detail
      const typeMap: Record<string, 'info' | 'warning' | 'critical'> = {
        CALM: 'info', VOLATILE: 'warning', CRISIS: 'critical',
      }
      showToast({ type: typeMap[regime] ?? 'info', title: '시장 레짐 변경', message, icon: regime === 'CRISIS' ? '🔴' : regime === 'VOLATILE' ? '🟡' : '🟢' })
      if (regime === 'CRISIS') triggerScreenShake('heavy')
      else if (regime === 'VOLATILE') triggerScreenShake('medium')
    }
    const handleDailyRecord = (e: Event) => {
      const { type, changePercent } = (e as CustomEvent).detail
      const isBest = type === 'best'
      showToast({
        type: isBest ? 'success' : 'critical',
        title: isBest ? '최고의 날!' : '최악의 날...',
        message: `${isBest ? '+' : ''}${changePercent.toFixed(1)}%`,
        icon: isBest ? '📈' : '📉',
      })
    }
    const handleCircuitBreaker = (e: Event) => {
      const { level } = (e as CustomEvent).detail
      showToast({ type: 'critical', title: `서킷브레이커 Level ${level}`, message: '시장 전체 거래가 일시 중단됩니다', icon: '🚨', duration: 8000 })
      triggerScreenShake('heavy')
    }
    window.addEventListener('regimeChange', handleRegimeChange)
    window.addEventListener('dailyRecord', handleDailyRecord)
    window.addEventListener('circuitBreaker', handleCircuitBreaker)
    return () => {
      window.removeEventListener('regimeChange', handleRegimeChange)
      window.removeEventListener('dailyRecord', handleDailyRecord)
      window.removeEventListener('circuitBreaker', handleCircuitBreaker)
    }
  }, [])

  // Bridge store-based toasts → unified ToastContainer
  useEffect(() => {
    const lastOffice = { count: 0 }
    const lastTaunts = { count: 0 }
    const lastMilestones = { count: 0 }
    const unsub = useGameStore.subscribe((s) => {
      // Office events
      if (s.officeEvents.length > lastOffice.count) {
        const newEvents = s.officeEvents.slice(lastOffice.count)
        const importantTypes = ['level_up', 'hire', 'resignation', 'trade_executed', 'counseling', 'collaboration']
        for (const evt of newEvents) {
          if (importantTypes.includes(evt.type)) {
            showToast({ type: 'info', title: evt.emoji + ' 사무실', message: evt.message, duration: 4000 })
          }
        }
        lastOffice.count = s.officeEvents.length
      }
      // Rival taunts (big_trade)
      if (s.taunts.length > lastTaunts.count) {
        const newTaunts = s.taunts.slice(lastTaunts.count)
        for (const t of newTaunts) {
          if (t.type === 'big_trade') {
            showToast({ type: 'warning', title: '📢 ' + t.competitorName, message: t.message, duration: 5000 })
          }
        }
        lastTaunts.count = s.taunts.length
      }
      // Employee milestones
      if (s.milestoneNotifications.length > lastMilestones.count) {
        const newMilestones = s.milestoneNotifications.slice(lastMilestones.count)
        for (const m of newMilestones) {
          showToast({ type: 'success', title: m.icon + ' ' + m.title, message: `${m.employeeName}: ${m.description}`, duration: 4000 })
        }
        lastMilestones.count = s.milestoneNotifications.length
      }
    })
    return unsub
  }, [])

  // Check for existing save on mount + show migration prompt if needed
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for save data first
        const saveExists = await hasSaveData()
        setHasSave(saveExists)

        // Check if migration prompt should be shown
        const sqliteEnabled = getFeatureFlag('sqlite_enabled')
        const migrationDismissed = localStorage.getItem('migration_dismissed') === 'true'

        if (sqliteEnabled && saveExists && !migrationDismissed) {
          // Check if migration already completed
          // Use extra caution: SQLite init can fail on first page load
          try {
            const db = await initializeDB()
            const hasSQLiteSave = await saveSlotExists(db, 'autosave')
            setShowMigrationBanner(!hasSQLiteSave)
          } catch (error) {
            console.error(
              '[App] SQLite 초기화 실패. IndexedDB로 폴백합니다.',
              error instanceof Error ? error.message : String(error),
            )
            // Auto-disable SQLite on initialization failure
            setFeatureFlag('sqlite_enabled', false)
            setShowMigrationBanner(false)
            // Show alert to user
            console.warn(
              '⚠️ SQLite를 사용할 수 없습니다. IndexedDB 저장 방식을 사용합니다.\n' +
                '게임은 정상적으로 작동하지만, SQLite 기능은 비활성화됩니다.',
            )
          }
        }
      } catch (error) {
        console.error('[App] 초기화 중 오류:', error)
        // Graceful degradation: Continue with IndexedDB fallback
        setHasSave(false)
        setShowMigrationBanner(false)
      }
    }

    initializeApp()
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

  // 게임 시작/로드 시 엔진 재초기화 (실시간 모드 등 gameMode 반영)
  useEffect(() => {
    if (isGameStarted) {
      destroyTickEngine()
      initTickEngine()
      startTickLoop()
      // Show tutorial on first game start
      if (!isTutorialCompleted()) {
        // Delay to let UI render first
        const timer = setTimeout(() => setShowTutorial(true), 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [isGameStarted])

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
      <div ref={desktopRef} className="w-screen h-screen bg-win-bg overflow-hidden">
        {/* Migration banner */}
        {showMigrationBanner && (
          <div className="absolute top-0 left-0 right-0 z-[9999] bg-retro-yellow text-retro-black win-outset p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💾</div>
              <div>
                <div className="font-bold">새로운 SQLite 저장 시스템 업그레이드</div>
                <div className="text-xs">
                  더 빠른 로딩과 다중 세이브 슬롯 기능을 사용할 수 있습니다.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <RetroButton
                variant="primary"
                onClick={handleMigrateNow}
              >
                업그레이드
              </RetroButton>
              <RetroButton
                onClick={handleMigrateLater}
              >
                나중에
              </RetroButton>
            </div>
          </div>
        )}

        <StockTicker />

        <div className="absolute top-7 left-0 right-0 bottom-9">
          <WindowManager />
        </div>

        <Taskbar />

        {/* Unified toast system */}
        <ToastContainer />

        {/* Visual effects */}
        <StockParticles />
        <FloatingTextContainer />
        <LevelUpOverlay />
        <RankCelebration />
        <CelebrationManager />
        <CeremonyOverlay />
        <TradeAnimationSequence />
        <ChapterModal />
        <FastForwardOverlay />

        {/* Tutorial spotlight overlay */}
        {showTutorial && (
          <TutorialSpotlight onComplete={() => setShowTutorial(false)} />
        )}

        {isGameOver && <EndingScreen />}

        {/* Realtime mode: market closed dialog */}
        <MarketClosedDialog />

        {/* Rank change notification */}
        {rankChange && (
          <RankChangeNotification oldRank={rankChange.oldRank} newRank={rankChange.newRank} />
        )}

        <CRTOverlay />
      </div>
    </ErrorBoundary>
  )
}

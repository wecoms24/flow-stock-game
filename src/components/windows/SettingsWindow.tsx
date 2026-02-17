import { useState, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { soundManager } from '../../systems/soundManager'
import { getFeatureFlag, setFeatureFlag } from '../../systems/featureFlags'
import { getMigrationStatusPublic, resetMigrationStatus } from '../../systems/sqlite/migration'

export function SettingsWindow() {
  const {
    time,
    config,
    setSpeed,
    togglePause,
    startGame,
    personalizationEnabled,
    setPersonalizationEnabled,
    playerProfile,
    autoSellEnabled,
    autoSellPercent,
    setAutoSellEnabled,
    setAutoSellPercent,
  } = useGameStore()
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled)
  const [volume, setVolume] = useState(soundManager.volume)

  // SQLite Settings
  const [sqliteEnabled, setSqliteEnabled] = useState(getFeatureFlag('sqlite_enabled'))
  const [currentBackend, setCurrentBackend] = useState<'IndexedDB' | 'SQLite' | '확인 중...'>('확인 중...')
  const [isMigrationCompleted, setIsMigrationCompleted] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)

  // Detect current backend on mount
  useEffect(() => {
    // Simple backend detection based on feature flag only
    // Avoids SQLite initialization errors by not querying DB
    if (sqliteEnabled) {
      setCurrentBackend('SQLite')
    } else {
      setCurrentBackend('IndexedDB')
    }
  }, [sqliteEnabled])

  // Check migration status
  useEffect(() => {
    if (sqliteEnabled) {
      const status = getMigrationStatusPublic()
      setIsMigrationCompleted(status.completed)
    }
  }, [sqliteEnabled])

  const handleSQLiteToggle = (enabled: boolean) => {
    setFeatureFlag('sqlite_enabled', enabled)
    setSqliteEnabled(enabled)
    setNeedsReload(true)
    soundManager.playClick()
  }

  const handleResetMigration = () => {
    if (confirm('마이그레이션 상태를 초기화하시겠습니까?\n\n⚠️ 개발자 전용 기능입니다.')) {
      resetMigrationStatus()
      setIsMigrationCompleted(false)
      soundManager.playClick()
      alert('마이그레이션 상태가 초기화되었습니다.\n페이지를 새로고침하면 다시 마이그레이션이 실행됩니다.')
    }
  }

  return (
    <div className="text-xs p-1 space-y-3">
      <div className="text-center">
        <div className="text-sm font-bold">⚙ 설정</div>
      </div>

      {/* Game speed */}
      <div className="space-y-1">
        <div className="font-bold">게임 속도</div>
        <div className="flex gap-1">
          {([1, 2, 4] as const).map((spd) => (
            <RetroButton
              key={spd}
              size="sm"
              onClick={() => setSpeed(spd)}
              className={time.speed === spd ? 'win-pressed font-bold' : ''}
            >
              {spd}x
            </RetroButton>
          ))}
          <RetroButton size="sm" onClick={togglePause}>
            {time.isPaused ? '▶ 재생' : '⏸ 일시정지'}
          </RetroButton>
        </div>
      </div>

      {/* Game info */}
      <div className="space-y-1">
        <div className="font-bold">게임 정보</div>
        <div className="win-inset bg-white p-2 space-y-0.5">
          <div className="flex justify-between">
            <span className="text-retro-gray">난이도:</span>
            <span>{config.difficulty.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-retro-gray">기간:</span>
            <span>
              {config.startYear} ~ {config.endYear}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-retro-gray">현재:</span>
            <span>
              {time.year}년 {time.month}월 {time.day}일
            </span>
          </div>
        </div>
      </div>

      {/* Sound settings */}
      <div className="space-y-1">
        <div className="font-bold">사운드</div>
        <div className="win-inset bg-white p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-retro-gray">효과음:</span>
            <RetroButton
              size="sm"
              onClick={() => {
                soundManager.toggle()
                setSoundEnabled(soundManager.enabled)
                if (soundManager.enabled) soundManager.playClick()
              }}
              className={soundEnabled ? 'win-pressed' : ''}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </RetroButton>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-retro-gray">볼륨:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => {
                const v = Number(e.target.value) / 100
                soundManager.setVolume(v)
                setVolume(v)
              }}
              className="flex-1"
              style={{ accentColor: '#000080' }}
            />
            <span className="text-[10px] w-8 text-right">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Auto-sell (profit-taking) */}
      <div className="space-y-1">
        <div className="font-bold">📈 자동 매도 (익절)</div>
        <div className="win-inset bg-white p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-retro-gray">자동 익절:</span>
            <RetroButton
              size="sm"
              onClick={() => setAutoSellEnabled(!autoSellEnabled)}
              className={autoSellEnabled ? 'win-pressed' : ''}
            >
              {autoSellEnabled ? 'ON' : 'OFF'}
            </RetroButton>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-retro-gray">수익률:</span>
            <input
              type="range"
              min="1"
              max="100"
              value={autoSellPercent}
              onChange={(e) => setAutoSellPercent(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: '#000080' }}
              disabled={!autoSellEnabled}
            />
            <span className="text-[10px] w-8 text-right">{autoSellPercent}%</span>
          </div>
          <div className="text-[10px] text-retro-gray">
            보유 주식 수익률이 {autoSellPercent}% 이상이면 자동 전량 매도
          </div>
        </div>
      </div>

      {/* Personalization */}
      <div className="space-y-1">
        <div className="font-bold">🎯 개인화 시스템</div>
        <div className="win-inset bg-white p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-retro-gray">개인화 기능:</span>
            <RetroButton
              size="sm"
              onClick={() => setPersonalizationEnabled(!personalizationEnabled)}
              className={personalizationEnabled ? 'win-pressed' : ''}
            >
              {personalizationEnabled ? 'ON' : 'OFF'}
            </RetroButton>
          </div>
          {personalizationEnabled && (
            <div className="text-[10px] space-y-0.5 mt-1 border-t border-retro-gray/30 pt-1">
              <div className="flex justify-between">
                <span className="text-retro-gray">위험 선호:</span>
                <span>{(playerProfile.riskTolerance * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-gray">플레이 속도:</span>
                <span>{(playerProfile.playPace * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-gray">집중도:</span>
                <span>{(playerProfile.attention * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-retro-gray">학습 단계:</span>
                <span className="uppercase">{playerProfile.learningStage}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SQLite Storage System */}
      <div className="space-y-1">
        <div className="font-bold">🗄️ 저장 시스템</div>
        <div className="win-inset bg-white p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-retro-gray">SQLite 사용:</span>
            <RetroButton
              size="sm"
              onClick={() => handleSQLiteToggle(!sqliteEnabled)}
              className={sqliteEnabled ? 'win-pressed' : ''}
            >
              {sqliteEnabled ? 'ON' : 'OFF'}
            </RetroButton>
          </div>
          <div className="text-[10px] text-retro-gray">
            더 빠른 저장/로드를 위한 새로운 시스템 (베타)
          </div>
          <div className="text-[10px] space-y-0.5 mt-1 border-t border-retro-gray/30 pt-1">
            <div className="flex justify-between">
              <span className="text-retro-gray">현재 백엔드:</span>
              <span>{currentBackend}</span>
            </div>
            {sqliteEnabled && (
              <div className="flex justify-between">
                <span className="text-retro-gray">마이그레이션:</span>
                <span>{isMigrationCompleted ? '✅ 완료' : '⏳ 대기 중'}</span>
              </div>
            )}
          </div>
          {needsReload && (
            <div className="text-[10px] bg-yellow-100 border border-yellow-400 p-1 mt-1 space-y-1">
              <div className="font-bold">⚠️ 새로고침 필요</div>
              <div className="text-retro-gray">
                변경사항을 적용하려면 페이지를 새로고침하세요.
              </div>
              <RetroButton
                size="sm"
                onClick={() => window.location.reload()}
                className="w-full mt-0.5"
              >
                🔄 새로고침
              </RetroButton>
            </div>
          )}
          {import.meta.env.DEV && (
            <div className="text-[10px] border-t border-retro-gray/30 pt-1 mt-1">
              <div className="text-retro-gray mb-0.5">개발자 도구</div>
              <RetroButton
                size="sm"
                variant="danger"
                onClick={handleResetMigration}
                className="w-full"
              >
                🔧 마이그레이션 초기화
              </RetroButton>
            </div>
          )}
        </div>
      </div>

      {/* New game */}
      <div className="space-y-1">
        <div className="font-bold">새 게임</div>
        <div className="flex gap-1">
          <RetroButton size="sm" onClick={() => startGame('easy')}>
            Easy
          </RetroButton>
          <RetroButton size="sm" onClick={() => startGame('normal')}>
            Normal
          </RetroButton>
          <RetroButton size="sm" variant="danger" onClick={() => startGame('hard')}>
            Hard
          </RetroButton>
        </div>
      </div>

      <div className="text-[10px] text-retro-gray text-center mt-2">
        Retro Stock-OS 95 v0.1.0
        <br />
        (c) 2026 Wecoms.co.ltd
      </div>
    </div>
  )
}

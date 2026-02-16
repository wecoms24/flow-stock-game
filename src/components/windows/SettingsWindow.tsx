import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { soundManager } from '../../systems/soundManager'

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
  } = useGameStore()
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled)
  const [volume, setVolume] = useState(soundManager.volume)

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

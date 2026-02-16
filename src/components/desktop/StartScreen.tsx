import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'
import type { Difficulty } from '../../types'
import { DIFFICULTY_TABLE, VICTORY_GOALS } from '../../data/difficulty'
import { AUM_CONFIG } from '../../config/aiConfig'

interface StartScreenProps {
  hasSave: boolean
  onSaveLoaded: () => void
}

/* ── Boot sequence lines (retro BIOS style) ── */
const BOOT_LINES = [
  'Stock-OS 95 BIOS v1.0',
  'Copyright (c) 2026 Wecoms.co.ltd',
  '',
  'CPU: Pentium(R) Trading Processor 166MHz',
  'Memory Test: 16384K OK',
  '',
  'Detecting Hard Drives...',
  '  Primary: WD-StockData 540MB ... OK',
  '  Secondary: CD-ROM Drive ... Not Found',
  '',
  'Loading MARKET.SYS ...',
  'Loading TICKER.DRV ...',
  'Loading PORTFOLIO.EXE ...',
  '',
  'Starting Stock-OS 95...',
]

interface CompetitorSetup {
  enabled: boolean
  count: number
  aumMultiplier: number
  isCustomAum: boolean
}

export function StartScreen({ hasSave, onSaveLoaded }: StartScreenProps) {
  const startGame = useGameStore((s) => s.startGame)
  const initializeCompetitors = useGameStore((s) => s.initializeCompetitors)
  const loadSavedGame = useGameStore((s) => s.loadSavedGame)
  const [bootPhase, setBootPhase] = useState<'booting' | 'ready'>('booting')
  const [bootLineIdx, setBootLineIdx] = useState(0)
  const [competitorSetup, setCompetitorSetup] = useState<CompetitorSetup>({
    enabled: false,
    count: 3,
    aumMultiplier: AUM_CONFIG.DEFAULT_MULTIPLIERS.normal,
    isCustomAum: false,
  })
  const [selectedGoalIdx, setSelectedGoalIdx] = useState(1) // default: 억만장자 (10억)
  const [customInitialCash, setCustomInitialCash] = useState<string>('') // 커스텀 초기 자본 (빈 문자열 = 난이도 기본값 사용)

  // Boot animation: reveal lines one by one
  useEffect(() => {
    if (bootPhase !== 'booting') return
    if (bootLineIdx >= BOOT_LINES.length) {
      const timer = setTimeout(() => setBootPhase('ready'), 600)
      return () => clearTimeout(timer)
    }
    const delay = BOOT_LINES[bootLineIdx] === '' ? 100 : 80 + Math.random() * 60
    const timer = setTimeout(() => setBootLineIdx((i) => i + 1), delay)
    return () => clearTimeout(timer)
  }, [bootPhase, bootLineIdx])

  // Allow skipping boot with click/key
  const skipBoot = () => {
    setBootLineIdx(BOOT_LINES.length)
    setBootPhase('ready')
  }

  const handleContinue = async () => {
    const success = await loadSavedGame()
    if (success) {
      onSaveLoaded()
    }
  }

  const difficulties: { key: Difficulty; label: string; cash: string; desc: string }[] = [
    { key: 'easy', label: 'Easy', cash: '1억원', desc: '넉넉한 자본, 낮은 변동성' },
    { key: 'normal', label: 'Normal', cash: '5천만원', desc: '표준 밸런스' },
    { key: 'hard', label: 'Hard', cash: '2천만원', desc: '높은 변동성, 빠른 스태미너 소모' },
  ]

  const handleStartGame = (difficulty: Difficulty) => {
    // Parse custom initial cash (빈 문자열이면 undefined → 난이도 기본값 사용)
    const parsedCustomCash = customInitialCash.trim()
      ? parseInt(customInitialCash.replace(/[^0-9]/g, ''), 10)
      : undefined
    const initialCash = parsedCustomCash ?? DIFFICULTY_TABLE[difficulty].initialCash

    if (competitorSetup.enabled) {
      // Use custom AUM if manually adjusted, otherwise use difficulty default
      const multiplier = competitorSetup.isCustomAum
        ? competitorSetup.aumMultiplier
        : (AUM_CONFIG.DEFAULT_MULTIPLIERS[difficulty] ?? AUM_CONFIG.DEFAULT_MULTIPLIERS.normal)
      const totalAUM = initialCash * multiplier
      const perCompetitorCash = Math.floor(totalAUM / competitorSetup.count)

      initializeCompetitors(competitorSetup.count, perCompetitorCash)
    }

    startGame(difficulty, VICTORY_GOALS[selectedGoalIdx].targetAsset, parsedCustomCash)
  }

  const competitorNames = [
    { name: 'Warren Buffoon', icon: '🔥' },
    { name: 'Elon Musk-rat', icon: '🐢' },
    { name: 'Peter Lynch Pin', icon: '🌊' },
    { name: 'Ray Dalio-ma', icon: '🐻' },
    { name: 'George Soros-t', icon: '⚡' },
  ]

  const competitorStyles = ['Aggressive', 'Conservative', 'Trend Follower', 'Contrarian']

  // ── Boot Phase ──
  if (bootPhase === 'booting') {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col justify-start p-6 cursor-pointer"
        onClick={skipBoot}
        onKeyDown={skipBoot}
        role="button"
        tabIndex={0}
      >
        <div className="font-mono text-retro-green text-xs leading-relaxed">
          {BOOT_LINES.slice(0, bootLineIdx).map((line, i) => (
            <div key={i}>{line || '\u00A0'}</div>
          ))}
          {bootLineIdx < BOOT_LINES.length && <span className="animate-pulse">_</span>}
        </div>
        <div className="absolute bottom-4 right-4 text-retro-gray text-[10px]">
          클릭하여 건너뛰기
        </div>
      </div>
    )
  }

  // ── Ready Phase (difficulty select) ──
  return (
    <div className="fixed inset-0 bg-retro-darkblue flex items-center justify-center">
      <RetroPanel className="p-1 max-w-md w-full">
        <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold mb-1">
          Retro Stock-OS 95 - Setup
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-retro-darkblue">Retro Stock-OS 95</div>
            <div className="text-xs text-retro-gray">
              1995년부터 2025년까지, 30년간의 주식 투자 시뮬레이션
            </div>
          </div>

          {/* Continue button */}
          {hasSave && (
            <>
              <RetroButton variant="primary" size="lg" className="w-full" onClick={handleContinue}>
                이어하기 (자동 저장)
              </RetroButton>
              <hr className="border-win-shadow" />
            </>
          )}

          {/* Investment Battle Mode Setup */}
          <RetroPanel variant="inset" className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="battle-mode"
                className="w-4 h-4 accent-win-highlight"
                checked={competitorSetup.enabled}
                onChange={(e) =>
                  setCompetitorSetup({ ...competitorSetup, enabled: e.target.checked })
                }
              />
              <label htmlFor="battle-mode" className="text-sm font-bold cursor-pointer">
                🥊 Investment Battle Mode
              </label>
            </div>

            {competitorSetup.enabled && (
              <div className="space-y-3 pl-2 border-l-2 border-win-shadow">
                {/* Competitor Count Slider */}
                <div>
                  <label className="block text-xs mb-1">
                    Number of Rivals: <strong>{competitorSetup.count}</strong>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={competitorSetup.count}
                    onChange={(e) =>
                      setCompetitorSetup({ ...competitorSetup, count: Number(e.target.value) })
                    }
                    className="w-full h-1 bg-win-shadow rounded appearance-none cursor-pointer accent-win-highlight"
                  />
                  <div className="flex justify-between text-[10px] text-retro-gray mt-1">
                    <span>Easy (1)</span>
                    <span>Hard (5)</span>
                  </div>
                </div>

                {/* AUM Multiplier Slider */}
                <div>
                  <label className="block text-xs mb-1">
                    AUM: <strong>x{competitorSetup.aumMultiplier}</strong>
                    <span className="text-retro-gray ml-1">
                      (Normal 기준 경쟁자당{' '}
                      {(
                        (DIFFICULTY_TABLE.normal.initialCash * competitorSetup.aumMultiplier) /
                        competitorSetup.count /
                        10000
                      ).toLocaleString()}
                      만원)
                    </span>
                  </label>
                  <input
                    type="range"
                    min={AUM_CONFIG.MIN_MULTIPLIER}
                    max={AUM_CONFIG.MAX_MULTIPLIER}
                    step={1}
                    value={competitorSetup.aumMultiplier}
                    onChange={(e) =>
                      setCompetitorSetup({
                        ...competitorSetup,
                        aumMultiplier: Number(e.target.value),
                        isCustomAum: true,
                      })
                    }
                    className="w-full h-1 bg-win-shadow rounded appearance-none cursor-pointer accent-win-highlight"
                  />
                  <div className="flex justify-between text-[10px] text-retro-gray mt-1">
                    <span>x1 (동등)</span>
                    <span>x100 (압도적)</span>
                  </div>
                </div>

                {/* Rival Preview */}
                <div>
                  <div className="text-[10px] font-bold mb-1">Your Rivals:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {competitorNames.slice(0, competitorSetup.count).map((rival, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 p-1 bg-win-face rounded text-[10px]"
                      >
                        <span className="text-sm">{rival.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-semibold">{rival.name}</div>
                          <div className="text-retro-gray">{competitorStyles[i % 4]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </RetroPanel>

          {/* Victory Goal Selection */}
          <RetroPanel variant="inset" className="p-3 space-y-2">
            <div className="text-sm font-bold">🎯 승리 목표:</div>
            <div className="grid grid-cols-2 gap-1">
              {VICTORY_GOALS.map((goal, idx) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoalIdx(idx)}
                  className={`p-2 text-left text-[11px] border rounded transition-colors ${
                    selectedGoalIdx === idx
                      ? 'border-win-highlight bg-win-highlight/10 font-bold'
                      : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{goal.icon}</span>
                    <span>{goal.label}</span>
                  </div>
                  <div className="text-retro-gray text-[10px]">{goal.description}</div>
                </button>
              ))}
            </div>
          </RetroPanel>

          {/* Custom Initial Cash Input */}
          <RetroPanel variant="inset" className="p-3 space-y-2">
            <div className="text-sm font-bold">💰 초기 자본 설정:</div>
            <div className="space-y-1">
              <label className="block text-xs text-retro-gray">
                커스텀 초기 자본 (비워두면 난이도별 기본값 사용)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customInitialCash}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setCustomInitialCash(value)
                  }}
                  placeholder="예: 50000000"
                  className="flex-1 px-2 py-1 text-sm border-2 border-win-shadow bg-white focus:border-win-highlight outline-none"
                />
                <button
                  onClick={() => setCustomInitialCash('')}
                  className="px-2 py-1 text-xs bg-win-face border border-win-shadow hover:bg-win-highlight/10"
                >
                  초기화
                </button>
              </div>
              {customInitialCash && (
                <div className="text-xs text-stock-up font-bold">
                  설정된 초기 자본: {parseInt(customInitialCash).toLocaleString()}원
                </div>
              )}
            </div>
          </RetroPanel>

          <div className="space-y-2">
            <div className="text-sm font-bold">새 게임 시작:</div>
            {difficulties.map((d) => {
              const effectiveCash = customInitialCash.trim()
                ? parseInt(customInitialCash)
                : DIFFICULTY_TABLE[d.key].initialCash
              return (
                <RetroPanel key={d.key} variant="inset" className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{d.label}</div>
                      <div className="text-[10px] text-retro-gray">{d.desc}</div>
                      <div className="text-[10px]">
                        초기자본:{' '}
                        <span className="text-retro-darkblue font-bold">
                          {customInitialCash.trim() ? (
                            <>
                              {effectiveCash.toLocaleString()}원{' '}
                              <span className="text-retro-gray">(커스텀)</span>
                            </>
                          ) : (
                            d.cash
                          )}
                        </span>
                        {' · '}목표:{' '}
                        <span className="text-stock-up font-bold">
                          {VICTORY_GOALS[selectedGoalIdx].description}
                        </span>
                      </div>
                    </div>
                    <RetroButton variant="primary" onClick={() => handleStartGame(d.key)}>
                      {competitorSetup.enabled ? '⚔️ Battle!' : '시작'}
                    </RetroButton>
                  </div>
                </RetroPanel>
              )
            })}
          </div>

          <div className="text-[10px] text-retro-gray text-center">
            (c) 2026 Wecoms.co.ltd - Retro Stock-OS 95
          </div>
        </div>
      </RetroPanel>
    </div>
  )
}

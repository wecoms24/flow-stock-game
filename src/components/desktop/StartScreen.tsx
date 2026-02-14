import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'
import type { Difficulty } from '../../types'

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

export function StartScreen({ hasSave, onSaveLoaded }: StartScreenProps) {
  const startGame = useGameStore((s) => s.startGame)
  const loadSavedGame = useGameStore((s) => s.loadSavedGame)
  const [bootPhase, setBootPhase] = useState<'booting' | 'ready'>('booting')
  const [bootLineIdx, setBootLineIdx] = useState(0)

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
          {bootLineIdx < BOOT_LINES.length && (
            <span className="animate-pulse">_</span>
          )}
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
            <div className="text-2xl font-bold text-retro-darkblue">
              Retro Stock-OS 95
            </div>
            <div className="text-xs text-retro-gray">
              1995년부터 2025년까지, 30년간의 주식 투자 시뮬레이션
            </div>
          </div>

          {/* Continue button */}
          {hasSave && (
            <>
              <RetroButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleContinue}
              >
                이어하기 (자동 저장)
              </RetroButton>
              <hr className="border-win-shadow" />
            </>
          )}

          <div className="space-y-2">
            <div className="text-sm font-bold">새 게임 시작:</div>
            {difficulties.map((d) => (
              <RetroPanel key={d.key} variant="inset" className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{d.label}</div>
                    <div className="text-[10px] text-retro-gray">{d.desc}</div>
                    <div className="text-[10px]">
                      초기자본: <span className="text-retro-darkblue font-bold">{d.cash}</span>
                    </div>
                  </div>
                  <RetroButton variant="primary" onClick={() => startGame(d.key)}>
                    시작
                  </RetroButton>
                </div>
              </RetroPanel>
            ))}
          </div>

          <div className="text-[10px] text-retro-gray text-center">
            (c) 2026 Wecoms.co.ltd - Retro Stock-OS 95
          </div>
        </div>
      </RetroPanel>
    </div>
  )
}

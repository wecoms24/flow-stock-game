import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'
import type { Difficulty } from '../../types'

interface StartScreenProps {
  hasSave: boolean
  onSaveLoaded: () => void
}

export function StartScreen({ hasSave, onSaveLoaded }: StartScreenProps) {
  const startGame = useGameStore((s) => s.startGame)
  const loadSavedGame = useGameStore((s) => s.loadSavedGame)

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

import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'
import type { Difficulty } from '../../types'

export function StartScreen() {
  const startGame = useGameStore((s) => s.startGame)

  const difficulties: { key: Difficulty; label: string; cash: string; desc: string }[] = [
    {
      key: 'easy',
      label: 'Easy',
      cash: '1억원',
      desc: '넉넉한 자본으로 여유롭게 시작',
    },
    {
      key: 'normal',
      label: 'Normal',
      cash: '5천만원',
      desc: '적절한 도전과 전략이 필요',
    },
    {
      key: 'hard',
      label: 'Hard',
      cash: '2천만원',
      desc: '한 번의 실수가 파산으로',
    },
  ]

  return (
    <div className="fixed inset-0 bg-retro-darkblue flex items-center justify-center">
      <RetroPanel className="p-1 max-w-md w-full">
        {/* Title bar */}
        <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold mb-1">
          Retro Stock-OS 95 - Setup
        </div>

        <div className="p-4 space-y-4">
          {/* Logo area */}
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-retro-darkblue">
              📊 Retro Stock-OS 95
            </div>
            <div className="text-xs text-retro-gray">
              1995년부터 2025년까지, 30년간의 주식 투자 시뮬레이션
            </div>
          </div>

          <hr className="border-win-shadow" />

          {/* Difficulty selection */}
          <div className="space-y-2">
            <div className="text-sm font-bold">난이도 선택:</div>
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

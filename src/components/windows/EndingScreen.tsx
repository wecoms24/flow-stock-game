import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'

export function EndingScreen() {
  const { endingResult, player, time, config, startGame } = useGameStore()

  if (!endingResult) return null

  const returnRate =
    config.initialCash > 0
      ? ((player.totalAssetValue - config.initialCash) / config.initialCash) * 100
      : 0

  const goalProgress = Math.min(
    (player.totalAssetValue / config.targetAsset) * 100,
    999.9,
  )
  const goalReached = player.totalAssetValue >= config.targetAsset

  const icons: Record<string, string> = {
    billionaire: '💰',
    legend: '⭐',
    retirement: '🏖️',
    survivor: '🛡️',
    bankrupt: '💀',
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[20000]">
      <RetroPanel className="p-1 max-w-md w-full">
        <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold">
          게임 종료 - {endingResult.title}
        </div>

        <div className="p-4 space-y-4 text-center">
          <div className="text-4xl">{icons[endingResult.type] ?? '📊'}</div>

          <div>
            <div className="text-lg font-bold">{endingResult.title}</div>
            <div className="text-xs text-retro-gray mt-1">{endingResult.description}</div>
          </div>

          <div className="win-inset bg-white p-3 text-xs text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-retro-gray">플레이 기간:</span>
              <span className="font-bold">
                {config.startYear} ~ {time.year}년 ({time.year - config.startYear}년)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-gray">초기 자본:</span>
              <span>{config.initialCash.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-gray">최종 자산:</span>
              <span className="font-bold">{player.totalAssetValue.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-gray">총 수익률:</span>
              <span
                className={`font-bold ${returnRate >= 0 ? 'text-stock-up' : 'text-stock-down'}`}
              >
                {returnRate >= 0 ? '+' : ''}
                {returnRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-gray">목표 자산:</span>
              <span className="font-bold">{config.targetAsset.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-gray">목표 달성률:</span>
              <span
                className={`font-bold ${goalReached ? 'text-stock-up' : 'text-stock-down'}`}
              >
                {goalProgress.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-retro-gray">난이도:</span>
              <span>{config.difficulty.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            <RetroButton
              variant="primary"
              onClick={() => startGame(config.difficulty, config.targetAsset)}
            >
              다시 시작
            </RetroButton>
            <RetroButton onClick={() => startGame('easy', config.targetAsset)}>Easy</RetroButton>
            <RetroButton onClick={() => startGame('normal', config.targetAsset)}>
              Normal
            </RetroButton>
            <RetroButton
              variant="danger"
              onClick={() => startGame('hard', config.targetAsset)}
            >
              Hard
            </RetroButton>
          </div>
        </div>
      </RetroPanel>
    </div>
  )
}

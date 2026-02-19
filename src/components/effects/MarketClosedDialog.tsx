import { useState, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { isKRXMarketOpen } from '../../config/kisConfig'
import { historicalDataService } from '../../services/historicalDataService'
import { destroyTickEngine, initTickEngine, startTickLoop } from '../../engines/tickEngine'
import { RetroButton } from '../ui/RetroButton'

/**
 * MarketClosedDialog
 * ==================
 * 실시간 모드에서 KRX 장이 마감된 경우 안내 다이얼로그.
 * KOSPI 역사 데이터 모드로 전환하거나 실시간 모드를 유지할 수 있다.
 */
export function MarketClosedDialog() {
  const config = useGameStore((s) => s.config)
  const startGame = useGameStore((s) => s.startGame)

  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  useEffect(() => {
    if (config.gameMode === 'realtime' && !dismissed && !isKRXMarketOpen()) {
      setVisible(true)
    }
  }, [config.gameMode, dismissed])

  if (!visible) return null

  const now = new Date()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} (${dayNames[now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const handleSwitchToKospi = async () => {
    setSwitching(true)
    destroyTickEngine()

    try {
      await historicalDataService.initialize((progress) => {
        setLoadProgress(progress)
      })
      setLoadProgress(100)

      startGame(config.difficulty, config.targetAsset, config.initialCash, 'kospi')
      // isGameStarted는 true→true로 변하지 않아 App.tsx useEffect가 재실행되지 않으므로
      // 여기서 직접 엔진을 재시작한다.
      initTickEngine()
      startTickLoop()
    } catch (error) {
      console.error('[MarketClosedDialog] KOSPI 전환 실패:', error)
      // 엔진 복구: 실시간 모드로 엔진 재시작
      initTickEngine()
      startTickLoop()
      setSwitching(false)
    }
  }

  const handleKeepRealtime = () => {
    setDismissed(true)
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-retro-bg border-4 border-retro-gray w-96 shadow-retro">
        {/* Title Bar */}
        <div className="bg-win-title-active text-white px-2 py-1 font-bold text-xs flex justify-between items-center">
          <span>KRX 장 마감 안내</span>
          {!switching && (
            <button
              onClick={handleKeepRealtime}
              className="hover:bg-white/20 px-1"
            >
              X
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          {switching ? (
            /* KOSPI 전환 진행 중 */
            <div className="space-y-3">
              <div className="text-xs text-center">
                KOSPI 역사 데이터를 로딩 중입니다...
              </div>
              <div className="win-inset bg-white p-0.5">
                <div
                  className="h-4 bg-win-title-active transition-all duration-300"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-center text-gray-500">
                {loadProgress}%
              </div>
            </div>
          ) : (
            /* 장 마감 안내 */
            <>
              <div className="text-xs space-y-2">
                <p className="font-bold">
                  현재 장이 마감된 상태입니다.
                </p>
                <div className="border border-retro-gray p-2 bg-retro-gray/5 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>현재 시각:</span>
                    <span className="font-bold">{timeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>장 운영시간:</span>
                    <span className="font-bold">평일 09:00 ~ 15:30</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-600">
                  실시간 모드는 장 운영시간에만 체결 데이터를 수신합니다.
                  KOSPI 역사 데이터 모드로 전환하면 과거 실제 주가를 기반으로
                  즉시 게임을 시작할 수 있습니다.
                </p>
              </div>

              <div className="flex gap-2">
                <RetroButton
                  variant="primary"
                  size="sm"
                  onClick={handleSwitchToKospi}
                  className="flex-1"
                >
                  KOSPI 데이터 모드로 전환
                </RetroButton>
                <RetroButton
                  size="sm"
                  onClick={handleKeepRealtime}
                  className="flex-1"
                >
                  실시간 모드 유지
                </RetroButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

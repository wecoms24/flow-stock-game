import { useEffect, useCallback } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from './RetroButton'

export function FastForwardOverlay() {
  const isFastForwarding = useGameStore((s) => s.isFastForwarding)
  const progress = useGameStore((s) => s.fastForwardProgress)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isFastForwarding) {
        useGameStore.getState().cancelFastForward()
      } else {
        useGameStore.setState({ fastForwardProgress: null })
      }
    }
  }, [isFastForwarding])

  useEffect(() => {
    if (!progress) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [progress, handleKeyDown])

  // Show overlay during fast forward OR when summary is ready (progress exists but not forwarding)
  if (!progress) return null

  const isProcessing = isFastForwarding
  const percent = progress.skippedHours > 0
    ? Math.round((progress.current / progress.skippedHours) * 100)
    : 0

  const dismissSummary = () => {
    useGameStore.setState({ fastForwardProgress: null })
  }

  const cancelFastForward = () => {
    useGameStore.getState().cancelFastForward()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" role="dialog" aria-modal="true">
      <div className="win-outset bg-win-face p-4 min-w-[360px] max-w-[480px]">
        {/* Title bar */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-win-shadow">
          <span className="text-sm font-bold">
            {isProcessing ? '>> 빨리감기 진행 중...' : '>> 빨리감기 완료'}
          </span>
        </div>

        {/* Time display */}
        <div className="win-inset bg-white p-2 mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>
              시작: {progress.startTime.year}.
              {String(progress.startTime.month).padStart(2, '0')}.
              {String(progress.startTime.day).padStart(2, '0')}
            </span>
            <span className="font-bold tabular-nums">
              {progress.current}시간 경과
            </span>
          </div>

          {/* Progress bar */}
          <div className="win-inset h-4 bg-white relative overflow-hidden">
            <div
              className="h-full bg-win-hilight transition-all duration-100"
              style={{ width: `${isProcessing ? percent : 100}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mix-blend-difference text-white">
              {isProcessing ? `${percent}%` : '완료'}
            </span>
          </div>
        </div>

        {/* Events log */}
        {progress.events.length > 0 && (
          <div className="win-inset bg-white p-2 mb-3 max-h-[200px] overflow-y-auto">
            <div className="text-[10px] font-bold mb-1 text-win-shadow">
              발생 이벤트 ({progress.events.length})
            </div>
            {progress.events.map((evt, i) => (
              <div key={i} className="text-[10px] py-0.5 border-b border-gray-100 last:border-0">
                {evt}
              </div>
            ))}
          </div>
        )}

        {progress.events.length === 0 && isProcessing && (
          <div className="text-[10px] text-center text-win-shadow mb-3">
            이벤트를 탐색하는 중...
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {isProcessing ? (
            <RetroButton size="sm" onClick={cancelFastForward}>
              <span className="text-xs">취소</span>
            </RetroButton>
          ) : (
            <RetroButton size="sm" onClick={dismissSummary}>
              <span className="text-xs">확인</span>
            </RetroButton>
          )}
        </div>
      </div>
    </div>
  )
}

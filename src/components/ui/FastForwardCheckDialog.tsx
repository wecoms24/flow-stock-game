import { useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from './RetroButton'

function parseWarning(warning: string): { icon: string; title: string; hint: string } {
  if (warning.startsWith('unplaced:')) {
    const count = warning.split(':')[1] ?? '?'
    return {
      icon: '🪑',
      title: `미배치 직원 ${count}명`,
      hint: '책상에 배치해야 매매를 시작합니다',
    }
  }
  if (warning === 'no_stocks') {
    return {
      icon: '📉',
      title: '보유 주식 없음',
      hint: '주식 없이 빨리감기하면 급여만 소진됩니다',
    }
  }
  if (warning === 'low_cash') {
    return {
      icon: '💸',
      title: '현금 부족 위험 (3개월 미만)',
      hint: '직원 감축 또는 주식 매도를 고려하세요',
    }
  }
  return { icon: '⚠', title: warning, hint: '' }
}

export function FastForwardCheckDialog() {
  const warnings = useGameStore((s) => s.fastForwardWarnings)
  const confirmFastForward = useGameStore((s) => s.confirmFastForward)
  const dismissFastForward = useGameStore((s) => s.dismissFastForward)

  useEffect(() => {
    if (!warnings) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissFastForward()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [warnings, dismissFastForward])

  if (!warnings || warnings.length === 0) return null

  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center">
      <div
        className="win-outset bg-[#c0c0c0] w-[380px] max-w-[90vw] shadow-xl"
        style={{ fontFamily: 'MS Sans Serif, Tahoma, sans-serif' }}
      >
        {/* Title bar */}
        <div className="bg-[#000080] text-white text-xs font-bold px-2 py-1 flex items-center gap-1.5">
          <span className="text-sm">⚠️</span>
          <span>빨리감기 점검</span>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          <div className="text-[11px] text-gray-800">
            빨리감기 전 다음 사항을 확인하세요:
          </div>

          <div className="space-y-2">
            {warnings.map((w, i) => {
              const { icon, title, hint } = parseWarning(w)
              return (
                <div
                  key={i}
                  className="win-inset bg-white p-2 flex items-start gap-2"
                >
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-gray-900">
                      ⚠ {title}
                    </div>
                    {hint && (
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        → {hint}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <RetroButton
              size="sm"
              onClick={confirmFastForward}
              className="text-[11px] min-w-[100px]"
            >
              무시하고 진행
            </RetroButton>
            <RetroButton
              size="sm"
              variant="primary"
              onClick={dismissFastForward}
              className="text-[11px] min-w-[100px]"
            >
              돌아가기
            </RetroButton>
          </div>
        </div>
      </div>
    </div>
  )
}

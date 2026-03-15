import { useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { useGameStore } from '../../stores/gameStore'
import { OFFICE_BACKGROUNDS } from '../../data/officeBackgrounds'
import { OFFICE_BALANCE } from '../../config/balanceConfig'
import { RetroButton } from './RetroButton'

export function CeremonyOverlay() {
  const pendingCeremony = useGameStore((s) => s.pendingCeremony)
  const dismissCeremony = useGameStore((s) => s.dismissCeremony)
  const confettiFired = useRef(false)

  useEffect(() => {
    if (pendingCeremony && !confettiFired.current) {
      confettiFired.current = true
      // Fire confetti from both sides
      const defaults = { spread: 60, ticks: 100, gravity: 0.8, decay: 0.94 }
      confetti({ ...defaults, particleCount: 80, origin: { x: 0.2, y: 0.6 }, angle: 60 })
      confetti({ ...defaults, particleCount: 80, origin: { x: 0.8, y: 0.6 }, angle: 120 })
    }
    if (!pendingCeremony) {
      confettiFired.current = false
    }
  }, [pendingCeremony])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && pendingCeremony) dismissCeremony()
  }, [pendingCeremony, dismissCeremony])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!pendingCeremony) return null

  const { fromLevel, toLevel } = pendingCeremony

  const oldBg = OFFICE_BACKGROUNDS[fromLevel]
  const newBg = OFFICE_BACKGROUNDS[toLevel]

  const oldName = oldBg?.displayName ?? `레벨 ${fromLevel}`
  const newName = newBg?.displayName ?? `레벨 ${toLevel}`

  const oldGrid = OFFICE_BALANCE.GRID_SIZES[fromLevel]
  const newGrid = OFFICE_BALANCE.GRID_SIZES[toLevel]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="win-panel bg-win-face w-[420px] max-w-[90vw]">
        {/* Title bar */}
        <div className="bg-win-title-active text-white px-2 py-1 flex items-center gap-2 text-sm font-bold select-none">
          <span>사무실 업그레이드 완료!</span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Icon + message */}
          <div className="flex items-start gap-3">
            <div className="text-3xl flex-shrink-0">🏢</div>
            <div className="text-sm">
              <p className="font-bold mb-1">사무실이 성공적으로 업그레이드되었습니다!</p>
              <p className="text-xs text-gray-600">
                새로운 공간에서 더 큰 성과를 이루세요.
              </p>
            </div>
          </div>

          {/* Level comparison */}
          <div className="win-inset bg-white p-3">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">이전</div>
                <div className="win-outset bg-win-face px-3 py-1.5 font-bold">
                  Lv.{fromLevel}
                </div>
                <div className="text-xs mt-1 text-gray-600">{oldName}</div>
              </div>
              <div className="text-xl font-bold text-gray-400">→</div>
              <div className="text-center">
                <div className="text-xs text-blue-600 mb-1 font-bold">NEW</div>
                <div className="win-outset bg-win-face px-3 py-1.5 font-bold text-blue-700 border-blue-400">
                  Lv.{toLevel}
                </div>
                <div className="text-xs mt-1 font-bold text-blue-600">{newName}</div>
              </div>
            </div>
          </div>

          {/* New capabilities */}
          <div className="win-inset bg-white p-3 text-xs space-y-1.5">
            <div className="font-bold text-sm mb-2">새로운 기능:</div>
            {newGrid && oldGrid && (
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  사무실 크기: {oldGrid.width}x{oldGrid.height} → {newGrid.width}x{newGrid.height}
                </span>
              </div>
            )}
            {newGrid && (
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>더 넓은 공간에 가구와 직원 배치 가능</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>전 직원 체력 완전 회복</span>
            </div>
            {newBg && oldBg && newBg.theme !== oldBg.theme && (
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  새로운 테마: {newBg.description}
                </span>
              </div>
            )}
          </div>

          {/* OK button */}
          <div className="flex justify-center pt-1">
            <RetroButton
              variant="primary"
              size="lg"
              onClick={dismissCeremony}
              className="min-w-[120px]"
            >
              확인
            </RetroButton>
          </div>
        </div>
      </div>
    </div>
  )
}

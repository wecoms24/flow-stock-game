import { useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { TITLE_LABELS, BADGE_COLORS, SKILL_UNLOCKS } from '../../systems/growthSystem'
import { soundManager } from '../../systems/soundManager'
import confetti from 'canvas-confetti'

export function LevelUpOverlay() {
  const pendingLevelUp = useGameStore((s) => s.pendingLevelUp)
  const dismissLevelUp = useGameStore((s) => s.dismissLevelUp)
  const hasPlayed = useRef(false)

  useEffect(() => {
    if (pendingLevelUp && !hasPlayed.current) {
      hasPlayed.current = true
      soundManager.playLevelUp()

      // Pixel-style confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#4169E1', '#8B008B', '#FF0000', '#00FF00'],
        shapes: ['square'],
        scalar: 1.2,
      })

      if (pendingLevelUp.newBadge) {
        setTimeout(() => {
          soundManager.playBadgeUnlock()
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.5, x: 0.5 },
            colors: [BADGE_COLORS[pendingLevelUp.newBadge!], '#FFFFFF'],
            shapes: ['square'],
          })
        }, 600)
      }
    }

    return () => {
      hasPlayed.current = false
    }
  }, [pendingLevelUp])

  if (!pendingLevelUp) return null

  const badgeColor = pendingLevelUp.newBadge
    ? BADGE_COLORS[pendingLevelUp.newBadge]
    : '#808080'
  const skillUnlock = pendingLevelUp.unlockedSkill
    ? SKILL_UNLOCKS[pendingLevelUp.newLevel]
    : null

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={dismissLevelUp}
    >
      <div
        className="win-outset bg-win-face p-4 text-center animate-bounce-in"
        style={{ minWidth: 280, maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Star decoration */}
        <div className="text-3xl levelup-stars">
          {'★'.repeat(Math.min(5, Math.ceil(pendingLevelUp.newLevel / 6)))}
        </div>

        {/* LEVEL UP text */}
        <div
          className="text-2xl font-bold mt-2 levelup-text"
          style={{ color: badgeColor }}
        >
          LEVEL UP!
        </div>

        {/* Employee name */}
        <div className="text-sm mt-2">{pendingLevelUp.employeeName}</div>

        {/* Level display */}
        <div className="text-xl font-bold mt-1" style={{ color: badgeColor }}>
          Lv.{pendingLevelUp.newLevel}
        </div>

        {/* New title */}
        {pendingLevelUp.newTitle && (
          <div className="mt-2 win-inset bg-white p-2">
            <div className="text-[10px] text-retro-gray">새로운 직급</div>
            <div className="text-sm font-bold" style={{ color: badgeColor }}>
              {TITLE_LABELS[pendingLevelUp.newTitle]}
            </div>
          </div>
        )}

        {/* New badge */}
        {pendingLevelUp.newBadge && (
          <div className="mt-1 win-inset bg-white p-2">
            <div className="text-[10px] text-retro-gray">새로운 뱃지</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <BadgePixel color={badgeColor} size={24} />
              <span className="text-sm font-bold" style={{ color: badgeColor }}>
                {pendingLevelUp.newBadge.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Skill unlock */}
        {skillUnlock && (
          <div className="mt-1 win-inset bg-yellow-50 p-2 border-yellow-400">
            <div className="text-[10px] text-yellow-700">스킬 해금!</div>
            <div className="text-sm font-bold text-yellow-900">{skillUnlock.name}</div>
            <div className="text-[10px] text-yellow-800">{skillUnlock.description}</div>
          </div>
        )}

        {/* Dismiss button */}
        <button
          className="mt-3 win-outset bg-win-face px-4 py-1 text-xs cursor-pointer active:win-pressed"
          onClick={dismissLevelUp}
        >
          확인
        </button>
      </div>
    </div>
  )
}

/* Inline pixel badge SVG */
function BadgePixel({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="5" y="0" width="6" height="2" fill={color} />
      <rect x="3" y="2" width="10" height="2" fill={color} />
      <rect x="2" y="4" width="12" height="6" fill={color} />
      <rect x="3" y="10" width="10" height="2" fill={color} />
      <rect x="5" y="12" width="6" height="2" fill={color} />
      <rect x="6" y="14" width="4" height="2" fill={color} />
      {/* Shine */}
      <rect x="4" y="5" width="2" height="2" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}

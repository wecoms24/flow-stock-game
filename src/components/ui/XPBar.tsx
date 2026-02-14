import type { Employee } from '../../types'
import { xpForLevel, BADGE_COLORS, badgeForLevel } from '../../systems/growthSystem'

interface XPBarProps {
  employee: Employee
  compact?: boolean
}

export function XPBar({ employee, compact = false }: XPBarProps) {
  const level = employee.level ?? 1
  const xp = employee.xp ?? 0
  const xpNeeded = employee.xpToNextLevel ?? xpForLevel(level)
  const badge = employee.badge ?? badgeForLevel(level)
  const percent = Math.min(100, (xp / xpNeeded) * 100)
  const barColor = BADGE_COLORS[badge]

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[8px] font-bold" style={{ color: barColor }}>
          Lv.{level}
        </span>
        <div className="flex-1 h-1.5 bg-gray-300 win-inset" style={{ minWidth: 30 }}>
          <div
            className="h-full xp-bar-fill"
            style={{ width: `${percent}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold" style={{ color: barColor }}>
          Lv.{level}
        </span>
        <span className="text-[7px] text-retro-gray">
          {xp}/{xpNeeded} XP
        </span>
      </div>
      <div className="h-2 bg-gray-300 win-inset">
        <div
          className="h-full xp-bar-fill"
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

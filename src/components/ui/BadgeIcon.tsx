import type { BadgeType, EmployeeTitle } from '../../types'
import { BADGE_COLORS, TITLE_LABELS } from '../../systems/growthSystem'

interface BadgeIconProps {
  badge: BadgeType
  title?: EmployeeTitle
  size?: number
  showLabel?: boolean
}

export function BadgeIcon({ badge, title, size = 14, showLabel = false }: BadgeIconProps) {
  const color = BADGE_COLORS[badge]

  return (
    <span className="inline-flex items-center gap-0.5" title={title ? TITLE_LABELS[title] : badge}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Shield shape */}
        <rect x="4" y="1" width="8" height="2" fill={color} />
        <rect x="2" y="3" width="12" height="2" fill={color} />
        <rect x="1" y="5" width="14" height="4" fill={color} />
        <rect x="2" y="9" width="12" height="2" fill={color} />
        <rect x="4" y="11" width="8" height="2" fill={color} />
        <rect x="6" y="13" width="4" height="2" fill={color} />
        {/* Star highlight */}
        <rect x="7" y="5" width="2" height="2" fill="rgba(255,255,255,0.6)" />
        <rect x="5" y="7" width="6" height="1" fill="rgba(255,255,255,0.3)" />
      </svg>
      {showLabel && title && (
        <span className="text-[8px] font-bold" style={{ color }}>
          {TITLE_LABELS[title]}
        </span>
      )}
    </span>
  )
}

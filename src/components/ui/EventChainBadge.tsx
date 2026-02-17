/**
 * EventChainBadge — "Week 2 of 4" 진행 배지
 */

interface EventChainBadgeProps {
  currentWeek: number // 0-based
  totalWeeks: number
  icon?: string
  title?: string
  size?: 'sm' | 'md'
}

export function EventChainBadge({ currentWeek, totalWeeks, icon, title, size = 'sm' }: EventChainBadgeProps) {
  const progress = ((currentWeek + 1) / totalWeeks) * 100

  return (
    <div className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
      {icon && <span>{icon}</span>}
      {title && <span className="font-bold truncate max-w-[80px]">{title}</span>}
      <div className="flex items-center gap-1">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-retro-gray whitespace-nowrap">
          {currentWeek + 1}/{totalWeeks}주
        </span>
      </div>
    </div>
  )
}

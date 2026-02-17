/**
 * MilestoneBar
 *
 * 수평 진행도 바 + 마일스톤 마커
 */

interface MilestoneMarker {
  position: number // 0-100 percentage
  label: string
  icon: string
  isUnlocked: boolean
}

interface MilestoneBarProps {
  progress: number // 0-100
  markers: MilestoneMarker[]
  className?: string
}

export function MilestoneBar({ progress, markers, className = '' }: MilestoneBarProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Background bar */}
      <div className="h-3 bg-gray-700 border border-gray-600 relative">
        {/* Progress fill */}
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />

        {/* Milestone markers */}
        {markers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${marker.position}%` }}
          >
            <div
              className={`
                w-5 h-5 flex items-center justify-center
                text-xs border
                ${
                  marker.isUnlocked
                    ? 'bg-yellow-600 border-yellow-400'
                    : 'bg-gray-600 border-gray-500'
                }
              `}
              title={marker.label}
            >
              {marker.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Labels below */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-500">0%</span>
        <span className="text-[10px] text-gray-500">100%</span>
      </div>
    </div>
  )
}

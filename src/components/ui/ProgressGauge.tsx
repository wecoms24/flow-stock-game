/**
 * ProgressGauge
 *
 * SVG 원형 게이지 컴포넌트 (포트폴리오 건강도 등)
 */

interface ProgressGaugeProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  label?: string
  color?: string
  bgColor?: string
  className?: string
}

export function ProgressGauge({
  value,
  size = 80,
  strokeWidth = 6,
  label,
  color = '#4CAF50',
  bgColor = '#333',
  className = '',
}: ProgressGaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(100, value))
  const dashOffset = circumference - (progress / 100) * circumference

  const getColor = () => {
    if (color !== '#4CAF50') return color
    if (progress >= 70) return '#4CAF50'
    if (progress >= 40) return '#FF9800'
    return '#F44336'
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
        {label && <p className="text-[10px] text-gray-400">{label}</p>}
      </div>
    </div>
  )
}

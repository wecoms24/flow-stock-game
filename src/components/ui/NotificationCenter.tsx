import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { formatHour } from '../../config/timeConfig'

export function NotificationCenter() {
  const officeEvents = useGameStore((s) => s.officeEvents)
  const hour = useGameStore((s) => s.time.hour)
  const [isOpen, setIsOpen] = useState(false)

  // 중요한 이벤트만 필터링
  const importantTypes = [
    'interaction',
    'level_up',
    'resignation_warning',
    'resignation',
    'hire',
    'counseling',
    'conflict',
    'mentoring',
    'collaboration',
    'trade_executed',
    'trade_failed',
    'stressed_out',
  ]

  const notifications = useMemo(() => {
    return officeEvents
      .filter((evt) => importantTypes.some((t) => evt.type.includes(t)))
      .slice(-50) // 최근 50개만
      .reverse() // 최신순
  }, [officeEvents])

  const unreadCount = useMemo(() => {
    // 최근 10개를 읽지 않은 것으로 간주
    return Math.min(notifications.length, 10)
  }, [notifications])

  return (
    <div className="relative">
      {/* 알림 아이콘 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative px-2 py-1 hover:bg-gray-200 active:bg-gray-300 flex items-center gap-1"
        title="알림 센터"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 알림 목록 */}
      {isOpen && (
        <>
          {/* 오버레이 (클릭하면 닫힘) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 알림 패널 */}
          <div className="absolute top-full right-0 mt-0.5 w-80 max-h-96 win-border bg-win-bg shadow-lg z-50 overflow-hidden">
            {/* 헤더 */}
            <div className="bg-win-title text-white px-2 py-1 text-xs font-bold flex items-center justify-between">
              <span>알림 센터</span>
              <span className="text-[10px] opacity-80">최근 {notifications.length}개</span>
            </div>

            {/* 알림 리스트 */}
            <div className="overflow-y-auto max-h-80 win-inset bg-white">
              {notifications.length === 0 ? (
                <div className="text-center text-retro-gray py-8 text-xs">
                  알림이 없습니다
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((evt, idx) => (
                    <div
                      key={`${evt.type}-${evt.timestamp}-${idx}`}
                      className="px-2 py-1.5 hover:bg-gray-50 text-[10px]"
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="text-base flex-shrink-0">{evt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-retro-gray mb-0.5">
                            {formatHour(hour)}
                          </div>
                          <div className="break-words">{evt.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

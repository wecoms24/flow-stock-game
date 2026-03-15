import { useState, useMemo, useCallback } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { formatHour } from '../../config/timeConfig'

// 중요한 이벤트 타입 (컴포넌트 외부에 정의하여 재생성 방지)
const IMPORTANT_TYPES = [
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
  'regime_change', // 시장 레짐 변경 알림
]

type NotificationFilter = 'all' | 'critical' | 'trade' | 'office'

const FILTER_CATEGORIES: Record<NotificationFilter, string[]> = {
  all: IMPORTANT_TYPES,
  critical: ['resignation_warning', 'resignation', 'stressed_out', 'regime_change'],
  trade: ['trade_executed', 'trade_failed'],
  office: ['interaction', 'level_up', 'hire', 'counseling', 'conflict', 'mentoring', 'collaboration'],
}

const FILTER_LABELS: Record<NotificationFilter, string> = {
  all: '전체',
  critical: '긴급',
  trade: '거래',
  office: '오피스',
}

export function NotificationCenter() {
  const officeEvents = useGameStore((s) => s.officeEvents)
  const hour = useGameStore((s) => s.time.hour)
  const [isOpen, setIsOpen] = useState(false)
  const [lastReadIndex, setLastReadIndex] = useState(0)
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const allNotifications = useMemo(() => {
    return officeEvents
      .filter((evt) => IMPORTANT_TYPES.some((t) => evt.type.includes(t)))
      .slice(-50) // 최근 50개만
      .reverse() // 최신순
  }, [officeEvents])

  const notifications = useMemo(() => {
    if (filter === 'all') return allNotifications
    const types = FILTER_CATEGORIES[filter]
    return allNotifications.filter((evt) => types.some((t) => evt.type.includes(t)))
  }, [allNotifications, filter])

  const unreadCount = useMemo(() => {
    return Math.max(0, allNotifications.length - lastReadIndex)
  }, [allNotifications, lastReadIndex])

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      // 패널 열 때 현재 알림 수를 기록하여 읽음 처리
      setLastReadIndex(allNotifications.length)
    }
    setIsOpen((prev) => !prev)
  }, [isOpen, allNotifications.length])

  return (
    <div className="relative">
      {/* 알림 아이콘 버튼 */}
      <button
        onClick={handleToggle}
        className="relative px-2 py-1 win-outset bg-win-face active:win-pressed flex items-center gap-1"
        title="알림 센터"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center font-bold">
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

          {/* 알림 패널 — 태스크바가 하단 fixed이므로 위로 열림 */}
          <div className="absolute bottom-full right-0 mb-0.5 w-80 max-h-96 win-outset bg-win-face shadow-lg z-50 overflow-hidden">
            {/* 헤더 */}
            <div className="bg-win-title-active text-white px-2 py-1 text-xs font-bold flex items-center justify-between">
              <span>알림 센터</span>
              <span className="text-xs opacity-80">최근 {notifications.length}개</span>
            </div>

            {/* 필터 버튼 */}
            <div className="flex gap-0.5 px-1 py-1 bg-win-face border-b border-win-shadow">
              {(Object.keys(FILTER_LABELS) as NotificationFilter[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-1.5 py-0.5 text-[10px] ${
                    filter === key
                      ? 'win-pressed font-bold bg-win-highlight text-white'
                      : 'win-outset bg-win-face hover:bg-win-highlight/20'
                  }`}
                >
                  {FILTER_LABELS[key]}
                </button>
              ))}
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
                      className="px-2 py-1.5 hover:bg-win-highlight/20 text-xs"
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="text-base flex-shrink-0">{evt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-retro-gray mb-0.5">
                            {formatHour(evt.hour ?? hour)}
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

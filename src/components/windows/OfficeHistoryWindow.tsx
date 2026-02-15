import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'

type FilterType = 'all' | 'behavior' | 'interaction' | 'warning' | 'resign'

const FILTER_LABELS: Record<FilterType, string> = {
  all: '전체',
  behavior: '행동',
  interaction: '상호작용',
  warning: '경고',
  resign: '퇴사',
}

export function OfficeHistoryWindow() {
  const officeEvents = useGameStore((s) => s.officeEvents)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEvents = useMemo(() => {
    let events = [...officeEvents].reverse() // 최신 순

    if (filter !== 'all') {
      events = events.filter((e) => e.type === filter)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      events = events.filter((e) => e.message.toLowerCase().includes(term))
    }

    return events.slice(0, 100) // 최대 100개 표시
  }, [officeEvents, filter, searchTerm])

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'behavior': return 'text-blue-700 bg-blue-100'
      case 'interaction': return 'text-green-700 bg-green-100'
      case 'warning': return 'text-orange-700 bg-orange-100'
      case 'resign': return 'text-red-700 bg-red-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getEventTypeLabel = (type: string): string => {
    switch (type) {
      case 'behavior': return '행동'
      case 'interaction': return '대화'
      case 'warning': return '경고'
      case 'resign': return '퇴사'
      default: return type
    }
  }

  return (
    <div className="text-xs p-2 space-y-2 overflow-y-auto h-full">
      {/* Header */}
      <div className="text-center">
        <div className="text-sm font-bold">사무실 히스토리</div>
        <div className="text-retro-gray text-[10px]">
          총 {officeEvents.length}건의 기록
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex gap-1 items-center flex-wrap">
        {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
          <RetroButton
            key={f}
            size="sm"
            variant={filter === f ? 'primary' : 'default'}
            onClick={() => setFilter(f)}
            className="text-[8px]"
          >
            {FILTER_LABELS[f]}
          </RetroButton>
        ))}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="검색..."
          className="flex-1 min-w-20 border-2 border-gray-400 rounded px-1 py-0.5 text-[9px] bg-white"
        />
      </div>

      {/* Event List */}
      <div className="win-inset bg-white p-1 space-y-0.5 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-400 text-[10px] py-8">
            기록이 없습니다
          </div>
        ) : (
          filteredEvents.map((event, idx) => (
            <div
              key={`${event.timestamp}-${idx}`}
              className="flex items-start gap-1.5 p-1 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {/* Emoji */}
              <span className="text-base flex-shrink-0 mt-0.5">{event.emoji}</span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`text-[7px] px-1 py-0.5 rounded font-bold ${getEventTypeColor(event.type)}`}>
                    {getEventTypeLabel(event.type)}
                  </span>
                </div>
                <div className="text-[10px] mt-0.5 break-words">{event.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

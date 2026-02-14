import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import type { NewsSentiment } from '../../types'

const PAGE_SIZE = 20

const SENTIMENT_BADGE: Record<NewsSentiment, { label: string; className: string }> = {
  positive: { label: '호재', className: 'bg-stock-up text-retro-white' },
  negative: { label: '악재', className: 'bg-stock-down text-retro-white' },
  neutral: { label: '중립', className: 'bg-retro-gray text-retro-white' },
}

export function NewsWindow() {
  const news = useGameStore((s) => s.news)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visibleNews = news.slice(0, visibleCount)
  const hasMore = visibleCount < news.length

  return (
    <div className="text-xs space-y-1">
      {news.length === 0 ? (
        <div className="text-retro-gray text-center py-4">뉴스가 없습니다</div>
      ) : (
        <>
          {visibleNews.map((item) => {
            const badge = item.sentiment ? SENTIMENT_BADGE[item.sentiment] : null
            return (
              <div
                key={item.id}
                className={`p-1.5 ${item.isBreaking ? 'bg-retro-yellow/20 win-outset' : 'border-b border-win-shadow'}`}
              >
                <div className="flex items-center gap-1">
                  {item.isBreaking && (
                    <span className="bg-stock-up text-retro-white px-1 text-[10px] font-bold">
                      속보
                    </span>
                  )}
                  {badge && (
                    <span className={`${badge.className} px-1 text-[10px] font-bold`}>
                      {badge.label}
                    </span>
                  )}
                  <span className="text-retro-gray text-[10px]">
                    {item.timestamp.year}.{String(item.timestamp.month).padStart(2, '0')}.
                    {String(item.timestamp.day).padStart(2, '0')}
                  </span>
                </div>
                <div className="font-bold mt-0.5">{item.headline}</div>
                <div className="text-retro-gray mt-0.5">{item.body}</div>
              </div>
            )
          })}
          {hasMore && (
            <button
              className="w-full text-center text-retro-darkblue py-1 cursor-pointer hover:underline"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              이전 뉴스 더 보기 ({news.length - visibleCount}건 남음)
            </button>
          )}
        </>
      )}
    </div>
  )
}

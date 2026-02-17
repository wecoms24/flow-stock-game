/**
 * NewsFeed
 *
 * 최신 뉴스 피드 (자동 스크롤)
 */

import { useRef, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'

const SENTIMENT_COLOR = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  neutral: 'text-gray-400',
}

const SENTIMENT_ICON = {
  positive: '📈',
  negative: '📉',
  neutral: '📰',
}

export function NewsFeed() {
  const news = useGameStore((s) => s.news)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new news arrives
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [news.length])

  const recentNews = news.slice(-8)

  return (
    <div ref={containerRef} className="overflow-y-auto max-h-full space-y-1 pr-1 scrollbar-thin">
      {recentNews.length === 0 ? (
        <p className="text-gray-500 text-xs text-center py-2">뉴스가 없습니다</p>
      ) : (
        recentNews.map((item) => (
          <div
            key={item.id}
            className={`
              p-1.5 border border-gray-700 bg-gray-800/50 text-xs
              ${item.isBreaking ? 'border-l-2 border-l-red-500' : ''}
            `}
          >
            <div className="flex items-start gap-1">
              <span className="flex-shrink-0">
                {SENTIMENT_ICON[item.sentiment]}
              </span>
              <div className="min-w-0">
                <p className={`font-bold truncate ${SENTIMENT_COLOR[item.sentiment]}`}>
                  {item.headline}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {item.timestamp.year}.{String(item.timestamp.month).padStart(2, '0')}.
                  {String(item.timestamp.day).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

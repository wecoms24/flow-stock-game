import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { EmptyState } from '../ui/EmptyState'
import { SkeletonLoader } from '../ui/SkeletonLoader'
import type { NewsSentiment } from '../../types'

const PAGE_SIZE = 20

const SENTIMENT_BADGE: Record<NewsSentiment, { label: string; className: string }> = {
  positive: { label: '호재', className: 'bg-stock-up text-retro-white' },
  negative: { label: '악재', className: 'bg-stock-down text-retro-white' },
  neutral: { label: '중립', className: 'bg-retro-gray text-retro-white' },
}

const SENTIMENT_BORDER: Record<NewsSentiment, string> = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#9ca3af',
}

export function NewsWindow() {
  const news = useGameStore((s) => s.news)
  const openWindow = useGameStore((s) => s.openWindow)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visibleNews = news.slice(0, visibleCount)
  const hasMore = visibleCount < news.length

  return (
    <div className="text-xs space-y-1">
      {news.length === 0 ? (
        <EmptyState icon="📰" title="뉴스가 없습니다" description="게임이 진행되면 시장 뉴스가 여기에 표시됩니다">
          <SkeletonLoader lines={3} className="mt-2 w-48" />
          <div className="mt-2 text-[10px] text-retro-gray">
            게임 속도를 높이면 더 빨리 뉴스를 볼 수 있습니다
          </div>
        </EmptyState>
      ) : (
        <>
          {visibleNews.map((item, idx) => {
            const badge = item.sentiment ? SENTIMENT_BADGE[item.sentiment] : null
            const borderColor = item.sentiment ? SENTIMENT_BORDER[item.sentiment] : undefined
            const isMnaNews = item.headline.includes('인수')
            const companies = useGameStore.getState().companies

            return (
              <div
                key={item.id}
                className={`p-2 ${isMnaNews ? 'bg-orange-50/10' : ''} ${item.isBreaking ? 'bg-retro-yellow/20 win-outset' : 'border-b border-win-shadow'}`}
                style={{
                  borderLeft: isMnaNews
                    ? '4px solid #f97316'
                    : borderColor
                      ? `3px solid ${borderColor}`
                      : '3px solid transparent',
                  animation: idx < 3 ? `newsSlideIn 0.3s ease-out ${idx * 0.05}s both` : undefined,
                }}
              >
                <div className="flex items-center gap-1">
                  {isMnaNews && (
                    <span className="bg-orange-500 text-retro-white px-1.5 py-0.5 text-[10px] font-bold">
                      M&A
                    </span>
                  )}
                  {item.isBreaking && (
                    <span className="bg-stock-up text-retro-white px-1.5 py-0.5 text-[10px] font-bold">
                      속보
                    </span>
                  )}
                  {badge && (
                    <span className={`${badge.className} px-1.5 py-0.5 text-[10px] font-bold`}>
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
                {item.relatedCompanies && item.relatedCompanies.length > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-retro-gray">영향 종목:</span>
                    {item.relatedCompanies.slice(0, 3).map((id) => {
                      const company = companies.find((c) => c.id === id)
                      if (!company) return null
                      return (
                        <button
                          key={id}
                          onClick={() => openWindow('chart', { companyId: id })}
                          className="text-[11px] px-2 py-1 bg-win-face border border-win-shadow hover:bg-win-highlight/20 active:win-pressed cursor-pointer font-bold transition-colors"
                          title={`${company.name} 차트 열기`}
                        >
                          {company.ticker}
                        </button>
                      )
                    })}
                  </div>
                )}
                {item.impactSummary && (
                  <div className="mt-1 text-[10px] text-retro-darkblue">
                    📊 {item.impactSummary}
                  </div>
                )}
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

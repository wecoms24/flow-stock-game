import { useGameStore } from '../../stores/gameStore'

export function NewsWindow() {
  const news = useGameStore((s) => s.news)

  return (
    <div className="text-xs space-y-1">
      {news.length === 0 ? (
        <div className="text-retro-gray text-center py-4">뉴스가 없습니다</div>
      ) : (
        news.map((item) => (
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
              <span className="text-retro-gray text-[10px]">
                {item.timestamp.year}.{String(item.timestamp.month).padStart(2, '0')}.
                {String(item.timestamp.day).padStart(2, '0')}
              </span>
            </div>
            <div className="font-bold mt-0.5">{item.headline}</div>
            <div className="text-retro-gray mt-0.5">{item.body}</div>
          </div>
        ))
      )}
    </div>
  )
}

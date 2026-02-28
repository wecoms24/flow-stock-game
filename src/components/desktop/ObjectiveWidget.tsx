import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { CHAPTERS } from '../../data/chapters'

/** Taskbar에 표시되는 작은 목표 카드 위젯 — 읽기 전용 (store 기록은 advanceHour에서) */
export function ObjectiveWidget() {
  const currentChapter = useGameStore((s) => s.chapterProgress.currentChapter)
  const objectiveStatus = useGameStore((s) => s.chapterProgress.objectiveStatus)

  const chapter = useMemo(() => CHAPTERS.find((ch) => ch.id === currentChapter), [currentChapter])

  // 렌더링만 담당: store의 objectiveStatus를 그대로 표시
  const objectives = useMemo(() => {
    if (!chapter) return []
    return chapter.objectives.map((obj) => {
      const status = objectiveStatus[obj.id]
      return {
        id: obj.id,
        label: obj.label,
        progress: status?.progress ?? 0,
        completed: status?.completed ?? false,
      }
    })
  }, [chapter, objectiveStatus])

  if (!chapter || objectives.length === 0) return null

  return (
    <div className="flex items-center gap-1 shrink-0" title={`챕터 ${chapter.id}: ${chapter.name}`}>
      <span className="text-[9px] text-retro-gray font-bold">Ch{chapter.id}</span>
      {objectives.map((obj) => (
        <div
          key={obj.id}
          className="flex items-center gap-0.5"
          title={`${obj.label}: ${obj.progress}%`}
        >
          {obj.completed ? (
            <span className="text-[10px]">✅</span>
          ) : (
            <div className="w-8 h-1.5 bg-win-shadow rounded-sm overflow-hidden">
              <div
                className="h-full bg-win-highlight transition-all duration-500"
                style={{ width: `${obj.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

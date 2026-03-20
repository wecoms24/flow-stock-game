import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroPanel } from '../ui/RetroPanel'
import { RetroButton } from '../ui/RetroButton'
import { CHAPTERS } from '../../data/chapters'

export function ChapterModal() {
  const currentChapter = useGameStore((s) => s.chapterProgress.currentChapter)
  const chapterShown = useGameStore((s) => s.chapterProgress.chapterShown)
  const objectiveStatus = useGameStore((s) => s.chapterProgress.objectiveStatus)
  const [visible, setVisible] = useState(false)
  const prevChapterRef = useRef<number | null>(null)

  const chapter = CHAPTERS.find((ch) => ch.id === currentChapter)
  const alreadyShown = chapterShown[currentChapter]

  // 챕터 전환 감지 — isPaused/togglePause를 deps에서 제거하여 수동 일시정지 시 재실행 방지
  useEffect(() => {
    if (!chapter || alreadyShown) {
      prevChapterRef.current = currentChapter
      return
    }

    const prev = prevChapterRef.current
    if (prev === null || prev !== currentChapter) {
      setVisible(true)
      // 명령형 호출: deps에 넣지 않음
      const state = useGameStore.getState()
      if (!state.time.isPaused) state.togglePause()
    }
    prevChapterRef.current = currentChapter
  }, [currentChapter, chapter, alreadyShown])

  const handleClose = () => {
    setVisible(false)
    useGameStore.setState((s) => ({
      chapterProgress: {
        ...s.chapterProgress,
        chapterShown: { ...s.chapterProgress.chapterShown, [currentChapter]: true },
      },
    }))
    const state = useGameStore.getState()
    if (state.time.isPaused) state.togglePause()
  }

  if (!visible || !chapter) return null

  // 이전 챕터 결과
  const prevChapterData = currentChapter > 1
    ? CHAPTERS.find((ch) => ch.id === currentChapter - 1)
    : null
  const prevObjectiveResults = prevChapterData?.objectives.map((obj) => ({
    label: obj.label,
    completed: objectiveStatus[obj.id]?.completed ?? false,
  }))

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[20000]">
      <RetroPanel className="p-1 max-w-lg w-full mx-4">
        <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold mb-1">
          📖 챕터 {chapter.id}: {chapter.name} ({chapter.yearRange[0]}-{chapter.yearRange[1]})
        </div>
        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          {prevObjectiveResults && prevObjectiveResults.length > 0 && (
            <RetroPanel variant="inset" className="p-2 space-y-1">
              <div className="text-xs font-bold text-retro-gray">이전 챕터 결과:</div>
              {prevObjectiveResults.map((r) => (
                <div key={r.label} className="text-[11px] flex items-center gap-1">
                  <span>{r.completed ? '✅' : '❌'}</span>
                  <span className={r.completed ? 'text-stock-up' : 'text-stock-down'}>{r.label}</span>
                </div>
              ))}
            </RetroPanel>
          )}

          <div className="text-sm leading-relaxed">{chapter.description}</div>

          <RetroPanel variant="inset" className="p-2 space-y-1">
            <div className="text-xs font-bold">🎯 이번 챕터 목표:</div>
            {chapter.objectives.map((obj) => (
              <div key={obj.id} className="text-[11px] flex items-center gap-1">
                <span>☐</span>
                <span className="font-semibold">{obj.label}</span>
                <span className="text-retro-gray">— {obj.description}</span>
              </div>
            ))}
          </RetroPanel>

          {chapter.unlockedFeatures && chapter.unlockedFeatures.length > 0 && (
            <div className="text-[11px] text-retro-gray">
              <span className="font-bold">🔓 새로운 기능: </span>
              {chapter.unlockedFeatures.join(', ')}
            </div>
          )}

          <RetroButton variant="primary" className="w-full" onClick={handleClose}>
            확인
          </RetroButton>
        </div>
      </RetroPanel>
    </div>
  )
}

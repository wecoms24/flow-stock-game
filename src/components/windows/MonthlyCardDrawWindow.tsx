/**
 * MonthlyCardDrawWindow
 *
 * 월간 카드 3장 선택 UI (최대 2장 선택)
 */

import { useCallback, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { NewsCardComponent } from '../ui/NewsCard'
import { EmptyState } from '../ui/EmptyState'

export function MonthlyCardDrawWindow() {
  const monthlyCards = useGameStore((s) => s.monthlyCards)
  const selectCard = useGameStore((s) => s.selectCard)
  const applyCardEffects = useGameStore((s) => s.applyCardEffects)
  const time = useGameStore((s) => s.time)

  const { availableCards, selectedCardIds, isSelectionComplete, isDrawn } = monthlyCards

  const canConfirm = selectedCardIds.length === 2 && !isSelectionComplete

  const handleSelect = useCallback(
    (cardId: string) => {
      if (isSelectionComplete) return
      selectCard(cardId)
    },
    [isSelectionComplete, selectCard],
  )

  const handleConfirm = useCallback(() => {
    if (canConfirm) {
      applyCardEffects()
    }
  }, [canConfirm, applyCardEffects])

  const selectedCardTitles = useMemo(() => {
    return availableCards
      .filter((c) => selectedCardIds.includes(c.id))
      .map((c) => c.title)
  }, [availableCards, selectedCardIds])

  if (!isDrawn) {
    return (
      <EmptyState
        icon="🃏"
        title="다음 달 초에 카드가 배분됩니다"
        description={`${time.year}년 ${time.month}월`}
      />
    )
  }

  if (isSelectionComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-300 p-4">
        <p className="text-lg mb-2">✅</p>
        <p className="text-xs font-bold mb-2">이번 달 카드 선택 완료!</p>
        <div className="space-y-1">
          {selectedCardTitles.map((title, i) => (
            <p key={i} className="text-[10px] text-gray-400">
              • {title}
            </p>
          ))}
        </div>
        <p className="text-[9px] text-gray-500 mt-3">
          효과가 시장에 적용 중입니다
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-2 gap-2">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold text-white">
          {time.year}년 {time.month}월 뉴스 카드
        </p>
        <p className="text-[10px] text-gray-400">
          3장 중 2장을 선택하세요 ({selectedCardIds.length}/2)
        </p>
      </div>

      {/* Cards */}
      <div className="flex justify-center gap-3 flex-1 items-center">
        {availableCards.map((card, i) => {
          const isSelected = selectedCardIds.includes(card.id)
          const isDisabled = !isSelected && selectedCardIds.length >= 2
          return (
            <NewsCardComponent
              key={card.id}
              card={card}
              isSelected={isSelected}
              isDisabled={isDisabled}
              onSelect={handleSelect}
              index={i}
            />
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`
            px-4 py-1.5 text-xs font-bold border
            ${canConfirm
              ? 'bg-blue-800 border-blue-600 text-blue-200 hover:bg-blue-700'
              : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'}
          `}
        >
          확인 ({selectedCardIds.length}/2)
        </button>
      </div>

      {/* Selected card names */}
      {selectedCardIds.length > 0 && (
        <div className="text-center">
          <p className="text-[9px] text-gray-500">
            선택됨: {selectedCardTitles.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

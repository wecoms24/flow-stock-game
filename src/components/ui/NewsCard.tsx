/**
 * NewsCard
 *
 * CSS rotateY 플립 카드 컴포넌트
 */

import { useState } from 'react'
import type { NewsCard as NewsCardType } from '../../types/newsCard'

const RARITY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: 'border-gray-500', bg: 'bg-gray-700', text: 'text-gray-300' },
  uncommon: { border: 'border-blue-500', bg: 'bg-blue-900/50', text: 'text-blue-300' },
  rare: { border: 'border-purple-500', bg: 'bg-purple-900/50', text: 'text-purple-300' },
  legendary: { border: 'border-yellow-500', bg: 'bg-yellow-900/50', text: 'text-yellow-300' },
}

const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  legendary: '전설',
}

interface NewsCardProps {
  card: NewsCardType
  isSelected: boolean
  isDisabled: boolean
  onSelect: (cardId: string) => void
}

export function NewsCardComponent({ card, isSelected, isDisabled, onSelect }: NewsCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const colors = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.common

  const handleClick = () => {
    if (!isFlipped) {
      setIsFlipped(true)
      return
    }
    if (!isDisabled) {
      onSelect(card.id)
    }
  }

  const effectSummary = card.effects.map((eff) => {
    const parts: string[] = []
    if (eff.driftModifier !== 0) {
      parts.push(`추세 ${eff.driftModifier > 0 ? '+' : ''}${(eff.driftModifier * 100).toFixed(1)}%`)
    }
    if (eff.volatilityModifier !== 0) {
      parts.push(`변동성 ${eff.volatilityModifier > 0 ? '+' : ''}${(eff.volatilityModifier * 100).toFixed(1)}%`)
    }
    if (eff.targetSector) {
      parts.push(`[${eff.targetSector}]`)
    }
    return parts.join(' ')
  })

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: '600px', width: '150px', height: '210px' }}
      onClick={handleClick}
    >
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front (back of card) */}
        <div
          className="absolute inset-0 flex items-center justify-center border-2 border-gray-600 bg-gray-800"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center">
            <span className="text-3xl">🃏</span>
            <p className="text-xs text-gray-400 mt-2">클릭하여 공개</p>
          </div>
        </div>

        {/* Back (card face) */}
        <div
          className={`absolute inset-0 border-2 ${colors.border} ${colors.bg} p-2 flex flex-col ${isSelected ? 'ring-2 ring-white' : ''}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg">{card.icon}</span>
            <span className={`text-[9px] px-1 ${colors.text} border ${colors.border}`}>
              {RARITY_LABELS[card.rarity] ?? card.rarity}
            </span>
          </div>

          {/* Title */}
          <p className="text-xs font-bold text-white mb-1 leading-tight">{card.title}</p>

          {/* Description */}
          <p className="text-[9px] text-gray-300 mb-1 flex-1 leading-tight">
            {card.description}
          </p>

          {/* Effects */}
          <div className="border-t border-gray-600 pt-1 mt-auto">
            {effectSummary.map((eff, i) => (
              <p key={i} className="text-[8px] text-gray-400 leading-tight">
                {eff}
              </p>
            ))}
            <p className="text-[8px] text-gray-500 mt-0.5">
              지속: {Math.round(card.effects[0]?.duration / 10)}일
            </p>
          </div>

          {/* Forced badge */}
          {card.isForced && (
            <div className="absolute top-0 right-0 bg-red-600 text-white text-[7px] px-1">
              필수
            </div>
          )}

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute inset-0 border-2 border-white bg-white/10 flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

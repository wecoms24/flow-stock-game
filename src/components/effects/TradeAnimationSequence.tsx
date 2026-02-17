/**
 * TradeAnimationSequence
 *
 * 1.5초 거래 애니메이션 오케스트레이터
 * 큐에서 시퀀스를 가져와 cardFlip → numberCount → particle → sound 순서로 실행
 */

import { useState, useCallback } from 'react'
import { useAnimationSequence } from '../../hooks/useAnimationSequence'
import type { AnimationStep } from '../../types/animation'
import { NumberCounter } from './NumberCounter'
import { CelebrationToast } from './CelebrationToast'

interface CardFlipState {
  companyName: string
  ticker: string
  action: 'buy' | 'sell'
  shares: number
  price: number
  isFlipped: boolean
}

interface CounterState {
  from: number
  to: number
  color: 'green' | 'red' | 'white'
  prefix: string
}

interface CelebrationState {
  title: string
  description: string
  icon: string
}

export function TradeAnimationSequence() {
  const [cardFlip, setCardFlip] = useState<CardFlipState | null>(null)
  const [counter, setCounter] = useState<CounterState | null>(null)
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)

  const onCardFlip = useCallback((payload: AnimationStep['payload']) => {
    const p = payload as {
      type: 'cardFlip'
      companyName: string
      ticker: string
      action: 'buy' | 'sell'
      shares: number
      price: number
    }
    setCardFlip({
      companyName: p.companyName,
      ticker: p.ticker,
      action: p.action,
      shares: p.shares,
      price: p.price,
      isFlipped: false,
    })
    // Trigger flip after mount
    requestAnimationFrame(() => {
      setCardFlip((prev) => (prev ? { ...prev, isFlipped: true } : null))
    })
    // Clear after step
    setTimeout(() => setCardFlip(null), 350)
  }, [])

  const onNumberCount = useCallback((payload: AnimationStep['payload']) => {
    const p = payload as {
      type: 'numberCount'
      from: number
      to: number
      prefix?: string
      color: 'green' | 'red' | 'white'
    }
    setCounter({
      from: p.from,
      to: p.to,
      color: p.color,
      prefix: p.prefix ?? '',
    })
    setTimeout(() => setCounter(null), 450)
  }, [])

  const onCelebration = useCallback((payload: AnimationStep['payload']) => {
    const p = payload as {
      type: 'celebration'
      title: string
      description: string
      icon: string
    }
    setCelebration({
      title: p.title,
      description: p.description,
      icon: p.icon,
    })
  }, [])

  const { isPlaying } = useAnimationSequence({
    onCardFlip,
    onNumberCount,
    onCelebration,
  })

  if (!isPlaying && !cardFlip && !counter && !celebration) return null

  return (
    <>
      {/* Card Flip Overlay */}
      {cardFlip && (
        <div className="fixed inset-0 z-[9990] pointer-events-none flex items-center justify-center">
          <div
            className={`
              w-48 h-28 transition-transform duration-300
              ${cardFlip.isFlipped ? '[transform:rotateY(180deg)]' : ''}
            `}
            style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
          >
            {/* Card Front */}
            <div
              className="absolute inset-0 bg-gray-700 border-2 border-gray-500 flex items-center justify-center backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-2xl">📊</span>
            </div>
            {/* Card Back */}
            <div
              className={`
                absolute inset-0 border-2 flex flex-col items-center justify-center
                backface-hidden [transform:rotateY(180deg)]
                ${cardFlip.action === 'buy' ? 'bg-blue-900 border-blue-500' : 'bg-red-900 border-red-500'}
              `}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-xs text-gray-400">{cardFlip.ticker}</span>
              <span className="text-sm font-bold text-white">{cardFlip.companyName}</span>
              <span
                className={`text-xs mt-1 ${cardFlip.action === 'buy' ? 'text-blue-300' : 'text-red-300'}`}
              >
                {cardFlip.action === 'buy' ? '매수' : '매도'} {cardFlip.shares}주
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Number Counter */}
      {counter && (
        <div className="fixed inset-0 z-[9991] pointer-events-none flex items-center justify-center">
          <div className="bg-black/60 px-6 py-3 border border-gray-600">
            <NumberCounter
              from={counter.from}
              to={counter.to}
              color={counter.color}
              prefix={counter.prefix}
              suffix="원"
              duration={400}
            />
          </div>
        </div>
      )}

      {/* Celebration Toast */}
      {celebration && (
        <CelebrationToast
          title={celebration.title}
          description={celebration.description}
          icon={celebration.icon}
          onDismiss={() => setCelebration(null)}
          duration={2000}
        />
      )}
    </>
  )
}

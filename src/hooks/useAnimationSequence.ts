/**
 * useAnimationSequence
 *
 * 애니메이션 큐를 구독하고 RAF 기반 시퀀스 재생을 관리하는 훅
 */

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../stores/gameStore'
import type { AnimationStep } from '../types/animation'
import { runSequence, cancelScheduler, setStepHandler } from '../systems/animationScheduler'
import { soundManager } from '../systems/soundManager'
import { emitParticles } from '../systems/particleSystem'
import type { ParticleType as SystemParticleType } from '../systems/particleSystem'

interface AnimationCallbacks {
  onCardFlip?: (payload: AnimationStep['payload']) => void
  onNumberCount?: (payload: AnimationStep['payload']) => void
  onCelebration?: (payload: AnimationStep['payload']) => void
  onToast?: (payload: AnimationStep['payload']) => void
}

export function useAnimationSequence(callbacks?: AnimationCallbacks) {
  const queue = useGameStore((s) => s.animationQueue.queue)
  const current = useGameStore((s) => s.animationQueue.current)
  const isPlaying = useGameStore((s) => s.animationQueue.isPlaying)
  const startAnimation = useGameStore((s) => s.startAnimation)
  const completeAnimation = useGameStore((s) => s.completeAnimation)
  const cbRef = useRef(callbacks)
  cbRef.current = callbacks

  // Step handler
  const handleStep = useCallback(async (step: AnimationStep) => {
    switch (step.type) {
      case 'cardFlip':
        cbRef.current?.onCardFlip?.(step.payload)
        break
      case 'numberCount':
        cbRef.current?.onNumberCount?.(step.payload)
        break
      case 'particle': {
        const p = step.payload as { type: 'particle'; particleType: string; count: number }
        const particleTypeMap: Record<string, SystemParticleType> = {
          profit: 'profit',
          loss: 'loss',
          celebration: 'celebration',
          coin: 'coin',
        }
        const mappedType = particleTypeMap[p.particleType] ?? 'sparkle'
        emitParticles(mappedType, window.innerWidth / 2, window.innerHeight / 2, p.count)
        break
      }
      case 'sound': {
        const s = step.payload as { type: 'sound'; soundId: string }
        const soundMap: Record<string, () => void> = {
          tradeSuccess: () => soundManager.playTradeSuccess(),
          tradeProfit: () => soundManager.playTradeProfit(),
          tradeLoss: () => soundManager.playTradeLoss(),
          milestone: () => soundManager.playMilestone(),
          cardFlip: () => soundManager.playCardFlip(),
          coinDrop: () => soundManager.playCoinDrop(),
        }
        soundMap[s.soundId]?.()
        break
      }
      case 'celebration':
        cbRef.current?.onCelebration?.(step.payload)
        break
      case 'toast':
        cbRef.current?.onToast?.(step.payload)
        break
      case 'delay':
        // No action needed, scheduler handles timing
        break
    }
  }, [])

  // Register step handler
  useEffect(() => {
    setStepHandler(handleStep)
  }, [handleStep])

  // Auto-start when queue has items and not playing
  useEffect(() => {
    if (queue.length > 0 && !isPlaying) {
      startAnimation()
    }
  }, [queue.length, isPlaying, startAnimation])

  // Run current sequence
  useEffect(() => {
    if (current && isPlaying) {
      runSequence(current, () => {
        completeAnimation()
      })
    }
  }, [current, isPlaying, completeAnimation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelScheduler()
    }
  }, [])

  return { current, isPlaying, queue }
}

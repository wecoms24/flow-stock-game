/**
 * Animation Engine
 *
 * 거래 애니메이션 시퀀스 생성 + 스텝 핸들러
 * 시퀀스: cardFlip → numberCount → particle → sound → delay
 */

import type {
  AnimationSequence,
  AnimationStep,
  AnimationPriority,
  ParticleType,
} from '../types/animation'

let sequenceCounter = 0

/**
 * 거래 성공 시 1.5초 애니메이션 시퀀스 생성
 */
export function createTradeAnimationSequence(params: {
  action: 'buy' | 'sell'
  companyName: string
  ticker: string
  shares: number
  price: number
  totalCost: number
  profitLoss?: number // sell 시에만
}): AnimationSequence {
  const { action, companyName, ticker, shares, price, totalCost, profitLoss } = params
  const id = `trade-anim-${++sequenceCounter}`

  const steps: AnimationStep[] = [
    // Step 1: Card flip (300ms)
    {
      type: 'cardFlip',
      duration: 300,
      payload: {
        type: 'cardFlip',
        companyName,
        ticker,
        action,
        shares,
        price,
      },
    },
    // Step 2: Number counting (400ms)
    {
      type: 'numberCount',
      duration: 400,
      payload: {
        type: 'numberCount',
        from: 0,
        to: totalCost,
        prefix: '₩',
        color: action === 'buy' ? 'white' : profitLoss && profitLoss > 0 ? 'green' : 'red',
      },
    },
    // Step 3: Particle effect (300ms)
    {
      type: 'particle',
      duration: 300,
      payload: {
        type: 'particle',
        particleType: getParticleType(action, profitLoss),
        count: profitLoss && profitLoss > 0 ? 20 : 10,
      },
    },
    // Step 4: Sound effect (100ms)
    {
      type: 'sound',
      duration: 100,
      payload: {
        type: 'sound',
        soundId: action === 'buy' ? 'tradeSuccess' : profitLoss && profitLoss > 0 ? 'tradeProfit' : 'tradeLoss',
      },
    },
    // Step 5: Short delay before dismiss (400ms)
    {
      type: 'delay',
      duration: 400,
      payload: { type: 'delay' },
    },
  ]

  return {
    id,
    steps,
    priority: 'normal',
    createdAt: Date.now(),
    totalDuration: steps.reduce((sum, s) => sum + s.duration, 0),
  }
}

/**
 * 마일스톤 축하 애니메이션 시퀀스
 */
export function createMilestoneAnimationSequence(params: {
  title: string
  description: string
  icon: string
}): AnimationSequence {
  const id = `milestone-anim-${++sequenceCounter}`
  const steps: AnimationStep[] = [
    {
      type: 'celebration',
      duration: 500,
      payload: {
        type: 'celebration',
        title: params.title,
        description: params.description,
        icon: params.icon,
      },
    },
    {
      type: 'particle',
      duration: 500,
      payload: {
        type: 'particle',
        particleType: 'celebration',
        count: 30,
      },
    },
    {
      type: 'sound',
      duration: 100,
      payload: {
        type: 'sound',
        soundId: 'milestone',
      },
    },
    {
      type: 'delay',
      duration: 900,
      payload: { type: 'delay' },
    },
  ]

  return {
    id,
    steps,
    priority: 'high' as AnimationPriority,
    createdAt: Date.now(),
    totalDuration: steps.reduce((sum, s) => sum + s.duration, 0),
  }
}

function getParticleType(action: 'buy' | 'sell', profitLoss?: number): ParticleType {
  if (action === 'buy') return 'coin'
  if (profitLoss && profitLoss > 0) return 'profit'
  return 'loss'
}

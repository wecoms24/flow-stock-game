/* ── Trade Animation System Types ── */

export type AnimationStepType =
  | 'cardFlip' // 카드 뒤집기 (매수/매도 확인)
  | 'numberCount' // 숫자 카운팅 (수익/손실)
  | 'particle' // 파티클 이펙트
  | 'sound' // 사운드 효과
  | 'delay' // 딜레이
  | 'toast' // 토스트 알림
  | 'celebration' // 마일스톤 축하

export type ParticleType = 'profit' | 'loss' | 'celebration' | 'coin'

export interface AnimationStep {
  type: AnimationStepType
  duration: number // ms
  payload: AnimationStepPayload
}

export type AnimationStepPayload =
  | CardFlipPayload
  | NumberCountPayload
  | ParticlePayload
  | SoundPayload
  | DelayPayload
  | ToastPayload
  | CelebrationPayload

export interface CardFlipPayload {
  type: 'cardFlip'
  companyName: string
  ticker: string
  action: 'buy' | 'sell'
  shares: number
  price: number
}

export interface NumberCountPayload {
  type: 'numberCount'
  from: number
  to: number
  prefix?: string // e.g. '₩'
  suffix?: string // e.g. '원'
  color: 'green' | 'red' | 'white'
}

export interface ParticlePayload {
  type: 'particle'
  particleType: ParticleType
  count: number
  originX?: number
  originY?: number
}

export interface SoundPayload {
  type: 'sound'
  soundId: string
}

export interface DelayPayload {
  type: 'delay'
}

export interface ToastPayload {
  type: 'toast'
  message: string
  variant: 'success' | 'warning' | 'info'
}

export interface CelebrationPayload {
  type: 'celebration'
  title: string
  description: string
  icon: string
}

export type AnimationPriority = 'high' | 'normal' | 'low'

export interface AnimationSequence {
  id: string
  steps: AnimationStep[]
  priority: AnimationPriority
  createdAt: number
  totalDuration: number // ms, pre-calculated
}

export interface AnimationQueueState {
  queue: AnimationSequence[]
  current: AnimationSequence | null
  currentStepIndex: number
  isPlaying: boolean
}

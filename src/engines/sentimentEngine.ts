import type { MarketEvent, Sector, NewsSentiment } from '../types'

/* ── Market Sentiment Engine ── */
/* 글로벌 시장 심리 지수 + 섹터별 센티먼트
 * - 이벤트 발생 시 센티먼트 업데이트
 * - 매 틱 자연 감쇠 (mean reversion)
 * - 극단값에서 변동성 증폭
 */

export interface MarketSentiment {
  global: number // -1.0 ~ +1.0 (음수: 공포, 양수: 탐욕)
  sectors: Record<Sector, number> // 섹터별 센티먼트
  momentum: number // 변화 속도 (-0.1 ~ +0.1)
  fearGreedIndex: number // 0 (극도 공포) ~ 100 (극도 탐욕)
}

const ALL_SECTORS: Sector[] = [
  'tech', 'finance', 'energy', 'healthcare', 'consumer',
  'industrial', 'telecom', 'materials', 'utilities', 'realestate',
]

let sentiment: MarketSentiment = createDefaultSentiment()

function createDefaultSentiment(): MarketSentiment {
  const sectors = {} as Record<Sector, number>
  ALL_SECTORS.forEach((s) => { sectors[s] = 0 })
  return {
    global: 0,
    sectors,
    momentum: 0,
    fearGreedIndex: 50,
  }
}

/* ── 이벤트 발생 시 센티먼트 업데이트 ── */

const SEVERITY_WEIGHT: Record<string, number> = {
  low: 0.3,
  medium: 0.6,
  high: 1.0,
  critical: 1.5,
}

export function onEventOccurred(event: MarketEvent): void {
  isActive = true // 이벤트 발생 시 활성화

  const severityWeight = SEVERITY_WEIGHT[event.impact.severity] ?? 0.5
  const drift = event.impact.driftModifier

  // 글로벌 센티먼트 영향
  const globalDelta = drift > 0
    ? Math.min(0.15, drift * severityWeight * 3)
    : Math.max(-0.20, drift * severityWeight * 3)

  sentiment.global = clamp(sentiment.global + globalDelta, -1.0, 1.0)

  // 모멘텀 업데이트
  sentiment.momentum = clamp(sentiment.momentum + globalDelta * 0.3, -0.1, 0.1)

  // 섹터별 센티먼트 영향
  if (event.affectedSectors && event.affectedSectors.length > 0) {
    const sectorDelta = drift > 0
      ? Math.min(0.25, drift * severityWeight * 4)
      : Math.max(-0.30, drift * severityWeight * 4)

    event.affectedSectors.forEach((sector) => {
      sentiment.sectors[sector] = clamp(
        (sentiment.sectors[sector] ?? 0) + sectorDelta,
        -1.0,
        1.0,
      )
    })
  }

  updateFearGreedIndex()
}

/* ── 매 틱 자연 감쇠 (매 100틱에 0.01씩 0으로 수렴) ── */

let decayCounter = 0

// 캐시: 센티먼트가 0이면 계산 스킵 (성능 최적화)
let isActive = false

export function tickSentiment(): void {
  // 센티먼트가 비활성이면 완전 스킵
  if (!isActive) return

  decayCounter++
  if (decayCounter < 100) return
  decayCounter = 0

  // 글로벌 mean reversion
  sentiment.global *= 0.99
  if (Math.abs(sentiment.global) < 0.005) sentiment.global = 0

  // 모멘텀 감쇠
  sentiment.momentum *= 0.95
  if (Math.abs(sentiment.momentum) < 0.001) sentiment.momentum = 0

  // 섹터별 mean reversion
  let anySectorActive = false
  ALL_SECTORS.forEach((sector) => {
    sentiment.sectors[sector] *= 0.98
    if (Math.abs(sentiment.sectors[sector]) < 0.005) {
      sentiment.sectors[sector] = 0
    } else {
      anySectorActive = true
    }
  })

  updateFearGreedIndex()

  // 모두 0으로 수렴하면 비활성화
  if (sentiment.global === 0 && sentiment.momentum === 0 && !anySectorActive) {
    isActive = false
  }
}

function updateFearGreedIndex(): void {
  // -1.0 ~ +1.0 → 0 ~ 100
  sentiment.fearGreedIndex = Math.round((sentiment.global + 1) * 50)
}

/* ── 가격 엔진에 전달할 modifier 계산 ── */

/**
 * 글로벌 센티먼트에 의한 drift 보정
 * 센티먼트 ±1.0 → drift ±0.02
 */
export function getSentimentDriftModifier(): number {
  return sentiment.global * 0.02
}

/**
 * 섹터별 센티먼트에 의한 drift 보정
 */
export function getSectorSentimentDrift(sector: Sector): number {
  return (sentiment.sectors[sector] ?? 0) * 0.015
}

/**
 * 센티먼트 극단값에서 변동성 증폭
 * - 극도 탐욕(>0.8): +20% 변동성
 * - 극도 공포(<-0.8): +30% 변동성
 * - 중립: 0%
 */
export function getSentimentVolatilityMultiplier(): number {
  const absVal = Math.abs(sentiment.global)
  if (absVal < 0.5) return 1.0
  if (sentiment.global > 0.8) return 1.2 // 과열
  if (sentiment.global < -0.8) return 1.3 // 패닉
  // 0.5 ~ 0.8 구간: 선형 보간
  return 1.0 + (absVal - 0.5) / 0.3 * (sentiment.global > 0 ? 0.2 : 0.3)
}

/* ── 뉴스 센티먼트 결정 ── */

export function getNewsSentimentFromDrift(drift: number): NewsSentiment {
  if (drift > 0.01) return 'positive'
  if (drift < -0.01) return 'negative'
  return 'neutral'
}

/* ── Getters ── */

export function getSentiment(): Readonly<MarketSentiment> {
  return sentiment
}

export function getFearGreedIndex(): number {
  return sentiment.fearGreedIndex
}

export function isSentimentActive(): boolean {
  return isActive
}

/* ── 리셋 ── */

export function resetSentiment(): void {
  sentiment = createDefaultSentiment()
  decayCounter = 0
  isActive = false
}

/* ── M&A Sentiment Impact ── */

/**
 * M&A 이벤트 발생 시 센티먼트 업데이트
 */
export function onMnaOccurred(
  targetSector: Sector,
  isLargeLayoff: boolean, // layoffRate > 0.4
): void {
  isActive = true

  if (isLargeLayoff) {
    // 대규모 해고: 공포 증가
    sentiment.global = clamp(sentiment.global - 0.1, -1.0, 1.0)
    sentiment.sectors[targetSector] = clamp(
      (sentiment.sectors[targetSector] ?? 0) - 0.15,
      -1.0,
      1.0,
    )
    sentiment.momentum = clamp(sentiment.momentum - 0.05, -0.1, 0.1)
  } else {
    // 소규모 해고/효율적 합병: 중립~약간 긍정
    sentiment.sectors[targetSector] = clamp(
      (sentiment.sectors[targetSector] ?? 0) + 0.05,
      -1.0,
      1.0,
    )
  }

  updateFearGreedIndex()
}

/* ── Utility ── */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

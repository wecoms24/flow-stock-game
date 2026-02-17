import type { Employee, Company, MarketEvent } from '../types'
import type { TradeSignal } from '../types/skills'
import { aggregateBadgeEffects } from '../utils/badgeConverter'

/**
 * 신호 생성 엔진
 *
 * 직원의 analysis 스킬과 뱃지를 기반으로 매매 신호 생성
 * - 낮은 스킬 = 높은 잡음 (noise signal)
 * - 뱃지 보너스로 정확도 향상
 */

/**
 * 직원이 여러 회사를 분석하여 매매 신호 생성
 *
 * @param employee - 분석하는 직원 (Analyst 역할)
 * @param companies - 분석 대상 회사 목록
 * @param marketEvents - 현재 활성화된 이벤트 (sentiment 등)
 * @returns 매매 신호 배열 (buy/sell/hold)
 */
export function generateTradeSignals(
  employee: Employee,
  companies: Company[],
  marketEvents: MarketEvent[]
): TradeSignal[] {
  const signals: TradeSignal[] = []

  // 1. 기본 분석 정확도 (analysis 스탯 기반)
  const baseAccuracy = (employee.skills?.analysis ?? 50) / 100 // 0.0 ~ 1.0

  // 2. 뱃지 보너스 적용
  const badgeEffects = aggregateBadgeEffects(employee.badges)
  const finalAccuracy = Math.min(baseAccuracy * (1 + badgeEffects.signalAccuracy), 1.0)

  // 3. 각 회사별 신호 생성
  for (const company of companies) {
    // 잡음 필터링 (낮은 스킬 = 높은 잡음)
    const signalToNoiseRatio = finalAccuracy * 2 // 0.0 ~ 2.0
    const isRealSignal = Math.random() < signalToNoiseRatio / 2

    if (!isRealSignal) {
      // 잘못된 신호 (잡음)
      signals.push(generateNoiseSignal(company))
      continue
    }

    // 실제 분석 수행
    let confidence = finalAccuracy * 100 // 0 ~ 100

    // 간단한 분석 로직 (예시)
    const priceChange = company.price - company.previousPrice
    const recentTrend = calculateRecentTrend(company.priceHistory)

    let action: 'buy' | 'sell' | 'hold' = 'hold'
    let reason = ''

    if (recentTrend > 0.05 && priceChange > 0) {
      action = 'buy'
      reason = '상승 추세 지속'
      confidence += 10
    } else if (recentTrend < -0.05 && priceChange < 0) {
      action = 'sell'
      reason = '하락 추세 지속'
      confidence += 10
    } else if (Math.abs(recentTrend) < 0.02) {
      action = 'hold'
      reason = '횡보장'
    }

    // 시장 이벤트 반영 (sentiment)
    const eventEffect = calculateEventEffect(company, marketEvents)
    confidence += eventEffect

    signals.push({
      companyId: company.id,
      action,
      confidence: Math.min(Math.max(confidence, 0), 100),
      isNoise: false,
      reason,
    })
  }

  return signals
}

/**
 * 잡음 신호 생성 (잘못된 분석)
 */
function generateNoiseSignal(company: Company): TradeSignal {
  const randomAction: ('buy' | 'sell' | 'hold')[] = ['buy', 'sell', 'hold']
  const action = randomAction[Math.floor(Math.random() * randomAction.length)]

  return {
    companyId: company.id,
    action,
    confidence: Math.random() * 40, // 낮은 신뢰도
    isNoise: true,
    reason: '분석 오류',
  }
}

/**
 * 최근 가격 추세 계산 (단순 선형 회귀)
 */
function calculateRecentTrend(priceHistory: number[]): number {
  if (priceHistory.length < 2) return 0

  const recentPrices = priceHistory.slice(-10) // 최근 10개
  if (recentPrices.length < 2) return 0

  const firstPrice = recentPrices[0]
  const lastPrice = recentPrices[recentPrices.length - 1]

  return (lastPrice - firstPrice) / firstPrice
}

/**
 * 이벤트 효과 계산 (sentiment 등)
 */
function calculateEventEffect(company: Company, events: MarketEvent[]): number {
  let effect = 0

  for (const event of events) {
    // 섹터별 이벤트 영향
    if (event.affectedSectors && event.affectedSectors.includes(company.sector)) {
      if (event.impact.driftModifier > 0) {
        effect += 5 // 긍정적 이벤트
      } else if (event.impact.driftModifier < 0) {
        effect -= 5 // 부정적 이벤트
      }
    }
  }

  return effect
}

/**
 * 특정 뱃지 보유 확인 헬퍼
 */
export function hasSpecificBadge(employee: Employee, badgeId: string): boolean {
  if (!employee.badges) return false
  return employee.badges.some((badge) => badge.id === badgeId)
}

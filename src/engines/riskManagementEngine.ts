import type { Employee } from '../types'
import type { TradeSignal, PortfolioInfo } from '../types/skills'
import { aggregateBadgeEffects, hasBadge } from '../utils/badgeConverter'

/**
 * 리스크 관리 엔진
 *
 * 직원의 research 스킬과 뱃지를 기반으로 포지션 사이징
 * - 낮은 스킬 = 높은 리스크 (큰 포지션)
 * - 뱃지 보너스로 리스크 감소
 */

/**
 * 적정 포지션 크기 계산
 *
 * @param employee - 리스크 평가하는 직원 (Manager 역할)
 * @param signal - 매매 신호 (신뢰도 포함)
 * @param portfolio - 포트폴리오 정보 (총 자산, 현금)
 * @returns 적정 포지션 크기 (금액)
 */
export function calculatePositionSize(
  employee: Employee,
  signal: TradeSignal,
  portfolio: PortfolioInfo
): number {
  // 1. 기본 리스크 한도 (research 스탯 기반)
  const riskAwareness = (employee.skills?.research ?? 50) / 100 // 0.0 ~ 1.0
  let maxRiskPerTrade = 0.05 * (1 - riskAwareness * 0.5) // 2.5% ~ 5%
  // research 0 → 5% 리스크
  // research 100 → 2.5% 리스크

  // 2. 뱃지 보너스 적용
  const badgeEffects = aggregateBadgeEffects(employee.badges)
  maxRiskPerTrade *= 1 - badgeEffects.riskReduction
  maxRiskPerTrade = Math.max(maxRiskPerTrade, 0.01) // 최소 1%

  // 3. 기본 포지션 크기 계산
  let positionSize = portfolio.totalValue * maxRiskPerTrade

  // 4. Kelly Criterion 전문가 뱃지
  if (hasBadge(employee.badges, 'kelly_criterion_expert')) {
    const winRate = signal.confidence / 100 // 0.0 ~ 1.0
    const kellyFraction = Math.max(winRate * 2 - 1, 0.1) // 최소 0.1
    positionSize *= kellyFraction * badgeEffects.positionSizeMultiplier
  }

  // 5. 신뢰도 기반 조정 (신뢰도 낮으면 포지션 축소)
  const confidenceMultiplier = signal.confidence / 100
  positionSize *= Math.max(confidenceMultiplier, 0.3) // 최소 30%

  // 6. 현금 여유 확인
  positionSize = Math.min(positionSize, portfolio.cash * 0.9) // 현금의 90%까지만

  // 7. 최종 포지션 크기 (정수)
  return Math.floor(positionSize)
}

/**
 * 포트폴리오 집중도 계산 (특정 종목 비중)
 */
export function calculateConcentration(
  portfolio: PortfolioInfo,
  companyId: string
): number {
  if (!portfolio.positions || portfolio.positions.length === 0) return 0

  const position = portfolio.positions.find((p) => p.companyId === companyId)
  if (!position) return 0

  const positionValue = position.shares * position.avgBuyPrice
  return positionValue / portfolio.totalValue
}

/**
 * 과도한 집중 위험 확인
 */
export function isConcentrationRisky(concentration: number): boolean {
  return concentration > 0.3 // 30% 이상 집중되면 위험
}

/**
 * 포트폴리오 전체 리스크 평가
 */
export function assessPortfolioRisk(portfolio: PortfolioInfo): {
  totalRisk: number // 0.0 ~ 1.0
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  recommendation: string
} {
  if (!portfolio.positions || portfolio.positions.length === 0) {
    return {
      totalRisk: 0,
      riskLevel: 'low',
      recommendation: '포지션 없음',
    }
  }

  // 1. 집중도 리스크
  const concentrations = portfolio.positions.map((pos) => {
    const posValue = pos.shares * pos.avgBuyPrice
    return posValue / portfolio.totalValue
  })
  const maxConcentration = Math.max(...concentrations)

  // 2. 레버리지 리스크
  const totalPositionValue = portfolio.positions.reduce(
    (sum, pos) => sum + pos.shares * pos.avgBuyPrice,
    0
  )
  const leverage = totalPositionValue / portfolio.totalValue

  // 3. 종합 리스크 점수
  let totalRisk = 0
  totalRisk += maxConcentration * 0.5 // 집중도 50% 가중치
  totalRisk += Math.max(leverage - 1, 0) * 0.3 // 레버리지 30% 가중치
  totalRisk += (1 - portfolio.cash / portfolio.totalValue) * 0.2 // 현금 비중 20%

  // 4. 리스크 등급
  let riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  let recommendation: string

  if (totalRisk < 0.3) {
    riskLevel = 'low'
    recommendation = '안전한 포트폴리오'
  } else if (totalRisk < 0.6) {
    riskLevel = 'medium'
    recommendation = '적정 수준의 리스크'
  } else if (totalRisk < 0.8) {
    riskLevel = 'high'
    recommendation = '포지션 축소 권장'
  } else {
    riskLevel = 'extreme'
    recommendation = '긴급 리스크 감소 필요'
  }

  return {
    totalRisk,
    riskLevel,
    recommendation,
  }
}

/**
 * 손절매 필요 여부 판단
 */
export function shouldStopLoss(
  currentLoss: number, // 음수 (예: -0.05 = -5%)
  maxAcceptableLoss: number // 음수 (예: -0.03 = -3%)
): boolean {
  return currentLoss < maxAcceptableLoss
}

/**
 * 익절 필요 여부 판단
 */
export function shouldTakeProfit(
  currentProfit: number, // 양수 (예: 0.10 = 10%)
  targetProfit: number // 양수 (예: 0.10 = 10%)
): boolean {
  return currentProfit >= targetProfit
}

import type { Employee } from '../types'
import type { TradeOrder, TradeExecutionResult, MarketCondition } from '../types/skills'
import { aggregateBadgeEffects, hasBadge } from '../utils/badgeConverter'

/**
 * 매매 실행 엔진
 *
 * 직원의 trading 스킬과 뱃지를 기반으로 주문 실행
 * - 낮은 스킬 = 느린 실행 + 높은 슬리피지
 * - 뱃지 보너스로 실행 속도 향상 + 슬리피지 감소
 */

/**
 * 직원이 주문을 실행하고 결과 반환
 *
 * @param employee - 주문을 실행하는 직원 (Trader 역할)
 * @param order - 주문 정보 (가격, 수량, 방향)
 * @param marketCondition - 시장 상태 (거래량, 변동성)
 * @returns 실행 결과 (실제 가격, 지연, 수수료, 슬리피지)
 */
export function executeEmployeeTrade(
  employee: Employee,
  order: TradeOrder,
  marketCondition: MarketCondition
): TradeExecutionResult {
  // 1. 기본 실행 속도 (trading 스탯 기반)
  const baseSpeed = (employee.skills?.trading ?? 50) / 100 // 0.0 ~ 1.0
  let executionDelay = (1 - baseSpeed) * 50 // 0 ~ 50틱 (trading 100 → 0틱, trading 0 → 50틱)

  // 2. 뱃지 보너스 적용
  const badgeEffects = aggregateBadgeEffects(employee.badges)

  // Flash Trader, Momentum Trader 등의 속도 보너스
  executionDelay *= 1 - badgeEffects.executionSpeedBonus
  executionDelay = Math.max(executionDelay, 0)

  // 3. 슬리피지 계산
  let slippage = (1 - baseSpeed) * 0.02 // 최대 2% (trading 0 → 2%, trading 100 → 0%)

  // Smart Router 등의 슬리피지 감소
  slippage *= 1 - badgeEffects.slippageReduction
  slippage = Math.max(slippage, 0)

  // 4. 시장 충격 (대량 주문)
  const marketImpact = calculateMarketImpact(order.quantity, marketCondition.volume)
  slippage += marketImpact

  // 5. 변동성 영향
  slippage += marketCondition.volatility * 0.01 // 변동성 높을수록 슬리피지 증가

  // 6. 최종 가격 계산
  let actualPrice = order.targetPrice
  if (order.direction === 'buy') {
    actualPrice *= 1 + slippage // 매수 시 더 비싸게
  } else {
    actualPrice *= 1 - slippage // 매도 시 더 싸게
  }

  // 7. 수수료 계산
  const commission = calculateCommission(employee, order, actualPrice)

  return {
    executedPrice: actualPrice,
    delay: Math.round(executionDelay),
    commission,
    slippage,
  }
}

/**
 * 시장 충격 계산 (대량 주문일수록 가격 영향 큼)
 */
function calculateMarketImpact(quantity: number, marketVolume: number): number {
  // 거래량 대비 주문 크기
  const orderRatio = quantity / Math.max(marketVolume, 1)

  // 대량 주문일수록 슬리피지 증가 (최대 1%)
  return Math.min(orderRatio * 0.1, 0.01)
}

/**
 * 수수료 계산
 */
function calculateCommission(
  employee: Employee,
  order: TradeOrder,
  executedPrice: number
): number {
  const baseRate = 0.003 // 기본 수수료율 0.3%
  let rate = baseRate

  // Scalper 뱃지: 단타 수수료 감소
  if (hasBadge(employee.badges, 'scalper') && (order.duration ?? 0) < 60) {
    rate *= 0.5
  }

  // Cost Minimizer 뱃지: 모든 수수료 감소
  if (hasBadge(employee.badges, 'cost_minimizer')) {
    rate *= 0.7
  }

  return executedPrice * order.quantity * rate
}

/**
 * 실행 지연이 큰지 확인 (성능 경고용)
 */
export function isExecutionSlow(result: TradeExecutionResult): boolean {
  return result.delay > 30 // 30틱 이상이면 느린 것으로 판단
}

/**
 * 슬리피지가 과도한지 확인 (경고용)
 */
export function isSlippageHigh(result: TradeExecutionResult): boolean {
  return result.slippage > 0.015 // 1.5% 이상이면 높은 것으로 판단
}

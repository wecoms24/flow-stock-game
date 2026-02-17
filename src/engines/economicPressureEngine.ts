/**
 * Economic Pressure Engine
 *
 * 부의 구간 분류, 세금 계산, 포지션 검증, 난이도 조절
 */

import type { EconomicPressure, WealthTier, MonthlyPerformance } from '../types/economicPressure'
import {
  getTierForAssets,
  getTierConfig,
  HIGH_PERFORMANCE_THRESHOLD,
  RELIEF_CONSECUTIVE_LOSS_MONTHS,
  RELIEF_TAX_DISCOUNT,
} from '../config/economicPressureConfig'

/** 부의 구간 업데이트 */
export function updateTier(
  pressure: EconomicPressure,
  totalAssets: number,
): EconomicPressure {
  const newTier = getTierForAssets(totalAssets)
  if (newTier === pressure.currentTier) return pressure

  return {
    ...pressure,
    previousTier: pressure.currentTier,
    currentTier: newTier,
  }
}

/** 월간 총 세금 계산 (processHourly에서 시간당 분할 적용, 이 함수는 월말 정산용) */
export function calculateMonthlyTax(
  pressure: EconomicPressure,
  totalAssets: number,
): { taxAmount: number; updatedPressure: EconomicPressure } {
  const { tax } = getTierConfig(pressure.currentTier)
  let rate = tax.monthlyTaxRate

  // 구제 자격 시 세금 감면
  if (pressure.reliefEligible) {
    rate *= RELIEF_TAX_DISCOUNT
  }

  const taxAmount = Math.floor(totalAssets * rate)

  return {
    taxAmount,
    updatedPressure: {
      ...pressure,
      monthlyTaxPaid: taxAmount,
      totalTaxPaid: pressure.totalTaxPaid + taxAmount,
    },
  }
}

/** 포지션 제한 검증 */
export function checkPositionLimit(
  tier: WealthTier,
  totalAssets: number,
  _positionValue: number,
  currentShares: number,
  pricePerShare: number,
  requestedShares: number,
): { allowed: boolean; maxShares: number } {
  const { positionLimit } = getTierConfig(tier)

  const maxPositionValue = totalAssets * positionLimit.maxPositionPercent
  const currentPositionValue = currentShares * pricePerShare
  const newPositionValue = currentPositionValue + requestedShares * pricePerShare

  if (newPositionValue > maxPositionValue) {
    const remainingValue = Math.max(0, maxPositionValue - currentPositionValue)
    const maxShares = Math.floor(remainingValue / pricePerShare)
    return { allowed: maxShares > 0, maxShares }
  }

  return { allowed: true, maxShares: requestedShares }
}

/** 월간 실적 기록 */
export function recordMonthlyPerformance(
  pressure: EconomicPressure,
  year: number,
  month: number,
  startAssets: number,
  endAssets: number,
  taxPaid: number,
): EconomicPressure {
  const returnRate = startAssets > 0 ? (endAssets - startAssets) / startAssets : 0

  const newPerformance: MonthlyPerformance = {
    month,
    year,
    startAssets,
    endAssets,
    returnRate,
    taxPaid,
  }

  // 최근 12개월만 유지
  const history = [...pressure.performanceHistory, newPerformance].slice(-12)

  // 연속 고수익 개월 계산
  let consecutiveHigh = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].returnRate >= HIGH_PERFORMANCE_THRESHOLD) {
      consecutiveHigh++
    } else {
      break
    }
  }

  // 난이도 배율: 연속 고수익 시 부정적 이벤트 증가
  const negativeEventMultiplier = 1.0 + consecutiveHigh * 0.15 // 연속 1개월당 15%씩 증가

  // 연속 손실 구제 자격 확인
  let consecutiveLoss = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].returnRate < 0) {
      consecutiveLoss++
    } else {
      break
    }
  }
  const reliefEligible = consecutiveLoss >= RELIEF_CONSECUTIVE_LOSS_MONTHS

  return {
    ...pressure,
    performanceHistory: history,
    consecutiveHighPerformanceMonths: consecutiveHigh,
    negativeEventMultiplier,
    reliefEligible,
  }
}

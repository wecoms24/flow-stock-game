/**
 * Economic Pressure Configuration
 *
 * 부의 구간 임계값, 세율, 포지션 제한
 */

import type { WealthTier, TaxConfig, PositionLimit, WealthTierThreshold } from '../types/economicPressure'

/** 부의 구간 정의 */
export const WEALTH_TIER_THRESHOLDS: WealthTierThreshold[] = [
  { tier: 'beginner', minAssets: 0, label: '초보 투자자', icon: '🌱', color: 'text-gray-500' },
  { tier: 'growing', minAssets: 50_000_000, label: '성장 투자자', icon: '📈', color: 'text-green-600' },
  { tier: 'established', minAssets: 100_000_000, label: '숙련 투자자', icon: '💼', color: 'text-blue-600' },
  { tier: 'wealthy', minAssets: 500_000_000, label: '부유층', icon: '💎', color: 'text-purple-600' },
  { tier: 'elite', minAssets: 1_000_000_000, label: '엘리트', icon: '👑', color: 'text-yellow-600' },
  { tier: 'tycoon', minAssets: 5_000_000_000, label: '재벌', icon: '🏰', color: 'text-red-600' },
]

/** 월간 세율 (자산 기반 부유세, processHourly에서 /300 시간당 적용) */
export const TAX_CONFIGS: TaxConfig[] = [
  { tier: 'beginner', monthlyTaxRate: 0, description: '면세' },
  { tier: 'growing', monthlyTaxRate: 0.001, description: '0.1% 월세' },
  { tier: 'established', monthlyTaxRate: 0.003, description: '0.3% 월세' },
  { tier: 'wealthy', monthlyTaxRate: 0.005, description: '0.5% 월세' },
  { tier: 'elite', monthlyTaxRate: 0.008, description: '0.8% 월세' },
  { tier: 'tycoon', monthlyTaxRate: 0.012, description: '1.2% 월세' },
]

/** 포지션 제한 (단일 종목 집중 방지) */
export const POSITION_LIMITS: PositionLimit[] = [
  { tier: 'beginner', maxPositionPercent: 1.0, maxTotalPositions: 20 },
  { tier: 'growing', maxPositionPercent: 0.5, maxTotalPositions: 20 },
  { tier: 'established', maxPositionPercent: 0.4, maxTotalPositions: 20 },
  { tier: 'wealthy', maxPositionPercent: 0.3, maxTotalPositions: 15 },
  { tier: 'elite', maxPositionPercent: 0.2, maxTotalPositions: 15 },
  { tier: 'tycoon', maxPositionPercent: 0.15, maxTotalPositions: 10 },
]

/** 연속 고수익에 따른 난이도 조절 */
export const HIGH_PERFORMANCE_THRESHOLD = 0.1 // 월 10% 이상 = 고수익
export const RELIEF_CONSECUTIVE_LOSS_MONTHS = 3 // 연속 3개월 손실 시 구제
export const RELIEF_TAX_DISCOUNT = 0.5 // 구제 시 세금 50% 감면

export function getTierConfig(tier: WealthTier) {
  return {
    threshold: WEALTH_TIER_THRESHOLDS.find((t) => t.tier === tier)!,
    tax: TAX_CONFIGS.find((t) => t.tier === tier)!,
    positionLimit: POSITION_LIMITS.find((t) => t.tier === tier)!,
  }
}

export function getTierForAssets(totalAssets: number): WealthTier {
  // 높은 구간부터 역순으로 확인
  for (let i = WEALTH_TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalAssets >= WEALTH_TIER_THRESHOLDS[i].minAssets) {
      return WEALTH_TIER_THRESHOLDS[i].tier
    }
  }
  return 'beginner'
}

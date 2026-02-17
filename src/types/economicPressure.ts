/* ── Economic Pressure System Types ── */

export type WealthTier =
  | 'beginner' // 5천만 미만
  | 'growing' // 5천만 ~ 1억
  | 'established' // 1억 ~ 5억
  | 'wealthy' // 5억 ~ 10억
  | 'elite' // 10억 ~ 50억
  | 'tycoon' // 50억 이상

export interface TaxConfig {
  tier: WealthTier
  monthlyTaxRate: number // 월간 세율 (processHourly에서 /300 분할 적용, e.g. 0.005 = 0.5%)
  description: string
}

export interface PositionLimit {
  tier: WealthTier
  maxPositionPercent: number // 단일 종목 최대 포지션 비율 (e.g. 0.3 = 30%)
  maxTotalPositions: number // 최대 보유 종목 수
}

export interface EconomicPressure {
  currentTier: WealthTier
  previousTier: WealthTier
  monthlyTaxPaid: number // 이번 달 누적 납부 세금 (hourlyAccumulators.taxPaid에서 월말 기록)
  totalTaxPaid: number // 누적 세금
  consecutiveHighPerformanceMonths: number // 연속 고수익 월수
  negativeEventMultiplier: number // 부정적 이벤트 발생 배율 (1.0 = 기본)
  performanceHistory: MonthlyPerformance[] // 최근 12개월
  reliefEligible: boolean // 구제 자격 여부 (연속 3개월 손실 시)
}

export interface MonthlyPerformance {
  month: number // 게임 월
  year: number // 게임 연도
  startAssets: number
  endAssets: number
  returnRate: number // 수익률 (-1.0 ~ ∞)
  taxPaid: number
}

export interface WealthTierThreshold {
  tier: WealthTier
  minAssets: number
  label: string
  icon: string
  color: string
}

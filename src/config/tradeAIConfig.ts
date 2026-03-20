/* ── Trade AI Pipeline Configuration ── */

import type { MarketRegime } from '../types'

export const TRADE_AI_CONFIG = {
  /** Analyst 분석 주기 (영업시간 수) */
  ANALYST_HOUR_INTERVAL: 10,
  /** Manager 검토 주기 (영업시간 수) */
  MANAGER_HOUR_INTERVAL: 5,
  /** Trader 체결 주기 (영업시간 수) */
  TRADER_HOUR_INTERVAL: 1,
  /** 제안서 생성 최소 Confidence */
  CONFIDENCE_THRESHOLD: 70,
  /** 최대 PENDING 제안서 수 */
  MAX_PENDING_PROPOSALS: 10,
  /** PENDING 자동 만료 영업시간 수 */
  PROPOSAL_EXPIRE_HOURS: 50,
  /** 기본 슬리피지 비율 (1%) */
  BASE_SLIPPAGE: 0.01,
  /** Manager 부재 시 실수 확률 (30%) */
  NO_MANAGER_MISTAKE_RATE: 0.30,
  /** Trader 부재 시 수수료 배율 */
  NO_TRADER_FEE_MULTIPLIER: 2.0,
  /** 인접 배치 시 속도 보너스 (30%) */
  ADJACENCY_SPEED_BONUS: 0.30,
  /** Analyst Insight 발동 확률 (5%) */
  INSIGHT_CHANCE: 0.05,
  /** Insight 발동 시 Confidence 보너스 */
  INSIGHT_CONFIDENCE_BONUS: 20,
  /** 체결 성공 시 만족도 증가 */
  SUCCESS_SATISFACTION_GAIN: 5,
  /** 체결 실패 시 스트레스 증가 */
  FAILURE_STRESS_GAIN: 15,
  /** 반려 시 Analyst 스트레스 증가 */
  REJECTION_STRESS_GAIN: 8,
} as const

// ===== Phase 3: 레짐별 지표 가중치 =====

/**
 * 4개 지표 복합 스코어 가중치 (레짐별)
 * RSI + MA + MACD + BB = 1.0
 */
export const INDICATOR_WEIGHTS: Record<
  MarketRegime,
  { rsi: number; ma: number; macd: number; bb: number }
> = {
  CALM: { rsi: 0.30, ma: 0.25, macd: 0.25, bb: 0.20 },
  VOLATILE: { rsi: 0.25, ma: 0.15, macd: 0.25, bb: 0.35 },
  CRISIS: { rsi: 0.45, ma: 0.15, macd: 0.10, bb: 0.30 },
} as const

/** 복합 시그널 매매 임계값 */
export const COMPOSITE_SIGNAL_THRESHOLD = 0.1

// ===== Phase 4: 매니저/트레이더 레짐 설정 =====

/**
 * 매니저: 레짐별 임계값 보정 + 집중도 한도
 */
export const MANAGER_REGIME_CONFIG: Record<
  MarketRegime,
  { thresholdBonus: number; concentrationLimit: number }
> = {
  CALM: { thresholdBonus: 0, concentrationLimit: 0.30 },
  VOLATILE: { thresholdBonus: 10, concentrationLimit: 0.25 },
  CRISIS: { thresholdBonus: 20, concentrationLimit: 0.20 },
} as const

/**
 * 트레이더: 레짐별 슬리피지 배수 + 대형 주문 기준
 */
export const TRADER_REGIME_CONFIG: Record<
  MarketRegime,
  { slippageMultiplier: number; largeOrderThreshold: number }
> = {
  CALM: { slippageMultiplier: 0.8, largeOrderThreshold: 0.05 },
  VOLATILE: { slippageMultiplier: 1.0, largeOrderThreshold: 0.05 },
  CRISIS: { slippageMultiplier: 1.5, largeOrderThreshold: 0.05 },
} as const

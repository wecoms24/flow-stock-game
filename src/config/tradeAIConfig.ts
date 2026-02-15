/* ── Trade AI Pipeline Configuration ── */

export const TRADE_AI_CONFIG = {
  /** Analyst 분석 주기 (틱) */
  ANALYST_TICK_INTERVAL: 10,
  /** Manager 검토 주기 (틱) */
  MANAGER_TICK_INTERVAL: 5,
  /** Trader 체결 주기 (틱) */
  TRADER_TICK_INTERVAL: 1,
  /** 제안서 생성 최소 Confidence */
  CONFIDENCE_THRESHOLD: 70,
  /** 최대 PENDING 제안서 수 */
  MAX_PENDING_PROPOSALS: 10,
  /** PENDING 자동 만료 틱 수 */
  PROPOSAL_EXPIRE_TICKS: 100,
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

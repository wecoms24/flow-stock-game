/** FEAT-3: 실시간 매매 판단 피드백 설정 */

export const TRADE_FEEDBACK = {
  /** 20일 저점/고점 범위 (10% 이내면 "근처") */
  NEAR_EXTREME_THRESHOLD: 0.10,
  /** 매도 시 큰 수익 기준 (수익률 20% 이상이면 celebration) */
  BIG_PROFIT_THRESHOLD: 0.20,
  /** 매도 시 일반 수익 기준 (5% 이상이면 toast) */
  SMALL_PROFIT_THRESHOLD: 0.05,
  /** 피드백 쿨다운 (게임 시간 3시간) */
  COOLDOWN_TICKS: 3,
  /** 피드백 억제 속도 (4x 이상에서 억제) */
  MAX_SPEED: 4,
} as const

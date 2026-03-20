export const NEGOTIATION_CONFIG = {
  TRIGGER_INTERVAL_MONTHS: 4, // 4개월마다 트리거
  BASE_RAISE_DEMAND: 0.05, // 기본 5% 인상 요구
  PERFORMANCE_RAISE_BONUS: 0.03, // 성과 좋으면 추가 3%
  LEVEL_RAISE_BONUS: 0.02, // 레벨당 추가 2%
  MAX_RAISE_DEMAND: 0.25, // 최대 25% 요구

  RHYTHM_DURATION_MS: 20000, // 20초 게임
  MIN_NOTES: 15, // 최소 노트 수
  MAX_NOTES: 35, // 최대 노트 수
  NOTE_SPEED: 300, // 노트 낙하 속도 (px/s)
  HIT_WINDOW_PERFECT: 50, // ±50ms 이내 perfect
  HIT_WINDOW_GOOD: 120, // ±120ms 이내 good

  SCORE_FULL_APPROVE: 80, // 80점 이상 → 전액 승인
  SCORE_PARTIAL_MIN: 50, // 50~79 → 절충
  PARTIAL_RAISE_RATIO: 0.5, // 절충 시 요구의 50%

  REJECTION_SATISFACTION_PENALTY: -15, // 거절 시 만족도 -15
  FULL_APPROVE_SATISFACTION_BONUS: 10, // 전액 승인 시 만족도 +10
} as const

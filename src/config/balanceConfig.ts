/**
 * Centralized Balance Configuration
 *
 * All game balance constants in one place for easy tuning.
 * Previously scattered as magic numbers across officeSystem.ts, gameStore.ts, etc.
 */

export const EMPLOYEE_BALANCE = {
  /** 배치된 직원: 스트레스 축적 기본률 (버프 곱셈 전) */
  STRESS_ACCUMULATION_RATE: 0.03,

  /** 배치된 직원: 스킬 성장 기본률 (버프/행동 곱셈 전) */
  SKILL_GROWTH_RATE: 0.005,

  /** 주 스킬 외 부 스킬 성장 비율 (주 스킬의 30%) */
  SKILL_SPILLOVER_RATIO: 0.3,

  /** 미배치 직원: 스태미나 회복량 (틱당) */
  IDLE_STAMINA_RECOVERY: 0.05,

  /** 미배치 직원: 스트레스 감소량 (틱당) */
  IDLE_STRESS_REDUCTION: 0.02,

  /** 만족도 폴백 계산: 기준 스트레스 */
  SATISFACTION_STRESS_BASELINE: 30,

  /** 만족도 폴백 계산: 패널티 계수 */
  SATISFACTION_PENALTY_RATE: 0.005,

  /** 퇴사 경고 만족도 하한 */
  RESIGN_WARNING_THRESHOLD: 20,

  /** 자동 퇴사 만족도 하한 */
  AUTO_RESIGN_THRESHOLD: 10,

  /** 기본 만족도 (undefined일 때 폴백) */
  DEFAULT_SATISFACTION: 80,
} as const

export const STRESS_AI = {
  /** 기본 스트레스 축적률 (기존값) */
  BASE_RATE: 0.03,
  /** CRISIS 레짐 시 스트레스 배율 */
  MARKET_CRISIS_MULTIPLIER: 2.5,
  /** VOLATILE 레짐 시 스트레스 배율 */
  MARKET_VOLATILE_MULTIPLIER: 1.5,
  /** 포지션 손실 10% 이상 시 추가 스트레스 발생 기준 */
  POSITION_LOSS_THRESHOLD: -0.10,
  /** 포지션 손실 시 추가 스트레스 */
  POSITION_LOSS_STRESS: 0.05,
  /** 팀 사기 전파율 (주변 직원 영향) */
  TEAM_MORALE_SPREAD: 0.3,
  /** 번아웃 진입 스트레스 임계값 */
  BURNOUT_THRESHOLD: 90,
  /** 최소 번아웃 지속 시간 (24시간 = ~2.5일) */
  BURNOUT_MIN_TICKS: 24,
  /** 번아웃 해제 시 스트레스 설정값 */
  BURNOUT_RECOVERY_STRESS: 50,
  /** 번아웃 시 스태미나 추가 감소 */
  BURNOUT_STAMINA_DRAIN: 0.10,
  /** 번아웃 시 스킬 성장 배율 (0 = 성장 없음) */
  BURNOUT_SKILL_MULTIPLIER: 0,
} as const

export const SALARY_BALANCE = {
  /** 수습 기간 (개월) */
  PROBATION_MONTHS: 3,
  /** 수습 중 급여 비율 (50%) */
  PROBATION_SALARY_RATE: 0.5,
  /** 채용 시 선지급 급여 배수 (v6 밸런스: 2배 → 1배, 진입장벽 완화) */
  HIRING_COST_MULTIPLIER: 1,
} as const

export const STRESS_WARNING = {
  /** 스트레스 경고 시작 레벨 */
  THRESHOLD: 70,
  /** 경고 쿨다운 (게임 시간, 시간 단위) */
  COOLDOWN_HOURS: 200,
} as const

export const OFFICE_BALANCE = {
  /** 오피스 레벨별 그리드 크기 */
  GRID_SIZES: {
    1: { width: 10, height: 10 },
    2: { width: 15, height: 15 },
    3: { width: 20, height: 20 },
  } satisfies Record<number, { width: number; height: number }> as Record<number, { width: number; height: number }>,

  /** 오피스 업그레이드 비용 */
  UPGRADE_COSTS: {
    1: 10_000_000,
    2: 30_000_000,
  } satisfies Record<number, number> as Record<number, number>,

  /** 최대 오피스 레벨 */
  MAX_LEVEL: 3,
} as const

/** v6 밸런스: 초기 게임 현금 이자 (세이프티넷) */
export const CASH_INTEREST = {
  /** 월 이자율 0.3% (연 ~3.6%, 예금 수준) */
  MONTHLY_RATE: 0.003,
  /** 적용 상한 티어 — growing(1억) 이하에서만 적용 */
  MAX_TIER: 'growing' as const,
} as const

/** v6 밸런스: 급여 삭감 요청 메카닉 — TODO: v7에서 구현 예정, 현재 미사용 */
export const PAY_CUT = {
  /** 최대 삭감률 30% */
  MAX_RATE: 0.30,
  /** 삭감률 × 이 값 = 만족도 감소 (30% 삭감 → -15 만족도) */
  SATISFACTION_PENALTY: 50,
  /** 최대 삭감 유지 기간 (개월) */
  MAX_DURATION_MONTHS: 6,
} as const

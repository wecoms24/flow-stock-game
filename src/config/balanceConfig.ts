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

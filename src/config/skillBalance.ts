/**
 * 스킬 시스템 밸런스 설정
 * 모든 수치를 중앙에서 관리하여 밸런스 조정 용이
 */

export const SKILL_BALANCE = {
  /* ── SP (Skill Point) 시스템 ── */

  /** 레벨당 SP 획득량 */
  SP_PER_LEVEL: 3,

  /** 신규 직원 초기 SP (레벨 1 기준) */
  INITIAL_SP: 3,

  /* ── 스킬 리셋 ── */

  /** 레벨당 리셋 비용 */
  RESET_COST_PER_LEVEL: 100_000,

  /** 최소 리셋 비용 (저레벨도 부담) */
  RESET_MIN_COST: 300_000,

  /** 최대 리셋 비용 캡 */
  RESET_MAX_COST: 5_000_000,

  /* ── 티어별 기본 SP 비용 ── */

  /**
   * 개별 스킬에서 오버라이드 가능
   * 대부분의 스킬은 이 기본값 사용
   */
  TIER_COSTS: {
    1: 1,
    2: 3,
    3: 5,
    4: 10,
    5: 15,
  } as Record<1 | 2 | 3 | 4 | 5, number>,

  /* ── 효과 배율 (전역 조정) ── */

  /**
   * 모든 스킬 효과에 곱해지는 배율
   * 밸런스 조정 시 이 값만 변경하면 모든 스킬에 일괄 적용
   */
  EFFECT_MULTIPLIERS: {
    signalAccuracy: 1.0, // 신호 정확도
    executionDelay: 1.0, // 실행 지연
    slippage: 1.0, // 슬리피지
    commission: 1.0, // 수수료
    riskReduction: 1.0, // 리스크 감소
    positionSize: 1.0, // 포지션 크기
  },

  /* ── 스케일 변환 상수 ── */

  /**
   * Confidence 스케일 승수 (0-100 스케일)
   *
   * Analyst의 신호 신뢰도는 0-100 범위이므로,
   * 스킬 modifier (0.1 = 10%)를 percentage points로 변환하기 위해 100을 곱함
   *
   * 예: modifier 0.1 (10%) × 100 = +10 confidence points
   *
   * @see src/engines/tradePipeline/analystLogic.ts
   */
  CONFIDENCE_SCALE_MULTIPLIER: 100,

  /**
   * Manager threshold 스케일 승수 (0-100 스케일)
   *
   * Manager의 승인 threshold도 0-100 범위이므로,
   * 리스크 감소 modifier를 threshold 조정값으로 변환하기 위해 100을 곱함
   *
   * 예: modifier 0.1 (10% 리스크 감소) × 100 = -10 threshold points (승인 쉬워짐)
   *
   * @see src/engines/tradePipeline/managerLogic.ts
   */
  THRESHOLD_SCALE_MULTIPLIER: 100,

  /**
   * Slippage/Commission 스케일 승수 (ratio 스케일)
   *
   * Slippage와 commission은 이미 ratio(0-1) 형태이므로,
   * modifier를 직접 곱하거나 더하면 됨 (승수 = 1)
   *
   * 예: modifier 0.5 (50% 감소) → slippage *= 0.5 (직접 곱셈)
   *
   * @see src/engines/tradePipeline/traderLogic.ts
   */
  SLIPPAGE_SCALE_MULTIPLIER: 1,

  /* ── 레벨 제한 ── */

  /** 최대 레벨 (이론적 상한) */
  MAX_LEVEL: 100,

  /** Tier 4 스킬 해금 최소 레벨 */
  MIN_LEVEL_TIER_4: 15,

  /** Tier 5 스킬 해금 최소 레벨 */
  MIN_LEVEL_TIER_5: 25,

  /* ── 스탯 제한 ── */

  /** 스탯 최소값 */
  MIN_STAT: 0,

  /** 스탯 최대값 */
  MAX_STAT: 100,
}

/**
 * 스킬 리셋 비용 계산
 */
export function calculateResetCost(employeeLevel: number): number {
  const baseCost = employeeLevel * SKILL_BALANCE.RESET_COST_PER_LEVEL
  return Math.max(
    SKILL_BALANCE.RESET_MIN_COST,
    Math.min(baseCost, SKILL_BALANCE.RESET_MAX_COST),
  )
}

/**
 * 레벨당 SP 계산 (향후 레벨 스케일링 추가 가능)
 */
export function calculateSPForLevel(_level: number): number {
  return SKILL_BALANCE.SP_PER_LEVEL
}

/**
 * 스킬 효과에 배율 적용
 */
export function applyEffectMultiplier(
  target: keyof typeof SKILL_BALANCE.EFFECT_MULTIPLIERS,
  baseValue: number,
): number {
  return baseValue * SKILL_BALANCE.EFFECT_MULTIPLIERS[target]
}

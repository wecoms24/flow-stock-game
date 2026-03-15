/**
 * Prestige / New Game+ System Types
 *
 * 30년 캠페인 완료 후 New Game+ 옵션 제공
 * localStorage 키 'retro-stock-prestige'에 별도 저장 (게임 세이브와 분리)
 */

/** 프레스티지 저장 데이터 */
export interface PrestigeData {
  /** 프레스티지 레벨 (클리어 횟수, 최대 10) */
  level: number
  /** 총 클리어 횟수 */
  totalCompletions: number
  /** 다음 New Game+에 이월할 Corporate Skill ID (1개) */
  carryOverSkillId: string | null
  /** 최고 최종 자산 */
  bestFinalAssets: number
  /** 최고 ROI (%) */
  bestROI: number
  /** 마지막 클리어 타임스탬프 */
  lastCompletionTimestamp: number
}

/** 프레스티지 보너스 (게임 시작 시 적용) */
export interface PrestigeBonuses {
  /** 초기 자본 배율 (1.0 = 기본, 최대 1.5) */
  cashMultiplier: number
  /** 이월할 Corporate Skill ID (null = 없음) */
  carryOverSkillId: string | null
  /** 프레스티지 레벨 */
  level: number
}

/** 프레스티지 상수 */
export const PRESTIGE_CONSTANTS = {
  /** localStorage 키 */
  STORAGE_KEY: 'retro-stock-prestige',
  /** 레벨당 초기 자본 보너스 */
  CASH_BONUS_PER_LEVEL: 0.05,
  /** 최대 프레스티지 레벨 */
  MAX_LEVEL: 10,
  /** 최대 초기 자본 보너스 (50%) */
  MAX_CASH_BONUS: 0.5,
} as const

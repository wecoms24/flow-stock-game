/**
 * AI Architect Configuration
 *
 * AI 배치 시스템의 밸런스 파라미터
 * Task 4.2: AI Balance Tuning (Week 4)
 */

export const AI_ARCHITECT_CONFIG = {
  // AI 제안 빈도
  AUTO_SUGGEST_INTERVAL: 3600 * 10, // 10일마다 자동 제안 (미사용, 향후 확장)

  // 최소 개선 임계값 (이하면 제안 안 함)
  MIN_IMPROVEMENT_THRESHOLD: 0.15, // 15% 이상 개선 시에만 제안

  // 가구 구매 예산 비율
  FURNITURE_BUDGET_RATIO: 0.1, // 현금의 10%

  // 직원 재배치 제한
  MAX_MOVES_PER_PROPOSAL: 5, // 한 번에 최대 5명만 이동

  // AI 정확도 (의도적 불완전성)
  ACCURACY: 0.9, // 90% 확률로 최적해 제시 (향후 랜덤성 추가 가능)

  // 제안 쿨다운 (향후 자동 제안 시 사용)
  PROPOSAL_COOLDOWN: 3600, // 1일 쿨다운 (3600 틱)

  // 시너지 점수 기준
  SYNERGY_THRESHOLDS: {
    EXCELLENT: 80, // 80+ = 매우 우수
    GOOD: 60, // 60-79 = 우수
    ACCEPTABLE: 40, // 40-59 = 양호
    POOR: 0, // 0-39 = 개선 필요
  },

  // 효율성 평가 기준
  EFFICIENCY_THRESHOLDS: {
    EXCELLENT: 90, // 90+ = excellent (추천 강력)
    GOOD: 70, // 70-89 = good (추천)
    ACCEPTABLE: 50, // 50-69 = acceptable (선택 가능)
    NOT_RECOMMENDED: 0, // <50 = not_recommended (비추천)
  },

  // 직원 배치 개선 임계값
  EMPLOYEE_MOVE_THRESHOLD: 0.2, // 현재 점수 × 1.2 이상일 때만 이동 제안 (20% 개선)

  // 가구 ROI 계산 계수
  FURNITURE_ROI: {
    BENEFIT_MULTIPLIER: 100, // 시간당 수익 계산 계수
    MAX_PAYBACK_PERIOD: 720, // 최대 회수 기간 (시간) = 30일
  },
} as const

/**
 * 플레이테스트 시나리오 (문서용)
 */
export const PLAYTEST_SCENARIOS = [
  {
    name: '신입 5명 고용',
    description: 'AI 제안 확인 → 수동 수정 가능성 테스트',
    expectedBehavior: '시너지 기반 최적 배치 제안',
  },
  {
    name: '스트레스 70% 상황',
    description: '가구 구매 제안 적절성',
    expectedBehavior: '휴게 가구 우선 제안',
  },
  {
    name: '자금 부족 상황',
    description: '우선순위 제안 검증',
    expectedBehavior: '직원 재배치만 제안 (가구 제외)',
  },
]

/**
 * 밸런스 조정 히스토리 (향후 참고)
 */
export const BALANCE_HISTORY = [
  {
    version: 'v1.0',
    date: '2026-02-16',
    changes: [
      'MIN_IMPROVEMENT_THRESHOLD: 0.15 (초기값)',
      'FURNITURE_BUDGET_RATIO: 0.1 (초기값)',
      'EMPLOYEE_MOVE_THRESHOLD: 0.2 (20% 개선)',
    ],
  },
]

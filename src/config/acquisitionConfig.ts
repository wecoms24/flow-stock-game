export const ACQUISITION_MGMT_CONFIG = {
  // 통합 진행
  MONTHLY_INTEGRATION_PROGRESS: 4,    // 월간 통합 진행도 +4
  PHASE_THRESHOLDS: {
    restructuring: 0,    // 0~24%
    integration: 25,     // 25~49%
    synergy: 50,         // 50~74%
    complete: 75,        // 75~100%
  },

  // 배당
  BASE_DIVIDEND_YIELD: 0.02,          // 기본 분기 배당 수익률 2%
  SYNERGY_DIVIDEND_BONUS: 0.01,       // 시너지 단계 추가 1%
  COMPLETE_DIVIDEND_BONUS: 0.02,      // 완료 단계 추가 2%

  // 랜덤 이벤트
  EVENT_PROBABILITY: 0.40,            // 분기별 40% 확률
  EVENTS: [
    {
      type: 'layoff' as const,
      title: '대량 해고',
      description: '구조조정 과정에서 대규모 인력 감축이 진행됩니다.',
      weight: 25,
      effect: { integrationDelta: 5, dividendYieldDelta: -0.005, acquirerDriftDelta: 0.01 },
    },
    {
      type: 'incentive' as const,
      title: '성과 인센티브',
      description: '핵심 인재 유지를 위한 인센티브 프로그램이 시행됩니다.',
      weight: 20,
      effect: { integrationDelta: 3, dividendYieldDelta: -0.003 },
    },
    {
      type: 'marketing' as const,
      title: '마케팅 지원',
      description: '인수 기업의 브랜드 통합 마케팅이 진행됩니다.',
      weight: 20,
      effect: { integrationDelta: 2, acquirerDriftDelta: 0.02 },
    },
    {
      type: 'scandal' as const,
      title: '내부 스캔들',
      description: '인수 과정에서 회계 부정이 발견되었습니다.',
      weight: 15,
      effect: { integrationDelta: -8, dividendYieldDelta: -0.01, acquirerDriftDelta: -0.03 },
    },
    {
      type: 'innovation' as const,
      title: '기술 혁신',
      description: '인수 기업의 핵심 기술이 시너지를 발휘합니다.',
      weight: 10,
      effect: { integrationDelta: 7, acquirerDriftDelta: 0.03 },
    },
    {
      type: 'merger_bonus' as const,
      title: '합병 보너스',
      description: '통합 시너지로 예상 이상의 수익이 발생합니다.',
      weight: 10,
      effect: { integrationDelta: 4, dividendYieldDelta: 0.01, acquirerDriftDelta: 0.02 },
    },
  ],

  // 시너지
  COMPLETE_SYNERGY_DRIFT_BONUS: 0.03, // 통합 완료 시 인수자 drift +3%
} as const

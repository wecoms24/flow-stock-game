/* ── M&A System Configuration ── */

export const MNA_CONFIG = {
  // 발생 빈도
  MIN_YEARS_BETWEEN_DEALS: 2, // 최소 2년 간격
  MNA_PROB_PER_QUARTER: 0.15, // 분기당 15% 확률

  // 후보 선정
  MIN_COMPANIES_FOR_MNA: 15, // 최소 15개 회사 필요
  ACQUIRER_MIN_MARKETCAP_PERCENTILE: 0.6, // 상위 40% 이상
  TARGET_MAX_MARKETCAP_PERCENTILE: 0.5, // 하위 50% 이하
  TARGET_MIN_PRICE_DROP: 0.2, // 최근 가격 20% 이상 하락

  // 딜 조건
  PREMIUM_RANGE: [0.2, 0.4] as const, // 20-40% 프리미엄
  LAYOFF_RANGE: [0.1, 0.6] as const, // 10-60% 해고율

  // IPO 스케줄
  IPO_DELAY_TICKS_MIN: 180, // 최소 180시간 (약 6개월)
  IPO_DELAY_TICKS_MAX: 360, // 최대 360시간 (약 12개월)
} as const

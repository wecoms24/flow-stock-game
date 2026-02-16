import type { Sector, Institution } from '../types'

/* ── 기관 투자자 시스템 설정 ── */

export const INSTITUTION_CONFIG = {
  // Performance
  TOTAL_INSTITUTIONS: 100,
  ACTIVE_PER_COMPANY_MIN: 5,
  ACTIVE_PER_COMPANY_MAX: 8,

  // Trading behavior
  CAPITAL_ALLOCATION_MIN: 0.0005, // 0.05%
  CAPITAL_ALLOCATION_MAX: 0.001, // 0.1%

  // Panic sell thresholds
  PANIC_DEBT_THRESHOLD: 2.5, // 부채비율 > 2.5
  PANIC_LOSS_THRESHOLD: -500_000_000, // -500억 순이익
  PANIC_MARKET_THRESHOLD: 0.9, // 시장 심리 < 0.9
  PANIC_PROBABILITY: 0.3, // 30% 확률로 발생
  PANIC_SELL_MULTIPLIER: 0.002, // 자산의 0.2% 매도

  // AUM distribution
  AUM_MIN: 1_000_000_000, // 10억
  AUM_MAX: 10_000_000_000, // 100억

  // Type distribution (총 100개)
  TYPE_DISTRIBUTION: {
    HedgeFund: 25,
    Pension: 30,
    Bank: 25,
    Algorithm: 20,
  },

  // Fundamental score weights (총 100점)
  SCORE_WEIGHTS: {
    PROFITABILITY: 30, // 수익성 (0-30점)
    DEBT_MANAGEMENT: 20, // 부채 관리 (-20 ~ +20점)
    GROWTH: 25, // 성장성 (0-25점)
    VALUATION: 25, // 밸류에이션 (0-25점)
  },
} as const

/* ── 기관 타입별 투자 성향 ── */
export const INSTITUTION_PROFILES = {
  Pension: {
    maxDebtRatio: 1.5,
    minGrowth: 0.03,
    minProfitability: 0.05, // 최소 ROE 5%
    preferredSectors: ['utilities', 'consumer', 'finance'] as Sector[],
    scoreWeights: {
      safety: 0.6, // 안전성 60%
      growth: 0.2, // 성장성 20%
      valuation: 0.2, // 밸류에이션 20%
    },
    panicSellProne: true, // 패닉셀 가능
  },
  HedgeFund: {
    maxDebtRatio: 3.0,
    minGrowth: 0.08,
    minProfitability: 0.0, // 적자 기업도 투자 가능
    preferredSectors: ['tech', 'healthcare', 'energy'] as Sector[],
    scoreWeights: {
      safety: 0.1, // 안전성 10%
      growth: 0.7, // 성장성 70%
      valuation: 0.2, // 밸류에이션 20%
    },
    panicSellProne: false, // 패닉셀 없음 (오히려 저점 매수)
  },
  Bank: {
    maxDebtRatio: 2.0,
    minGrowth: 0.02,
    minProfitability: 0.03, // 최소 ROE 3%
    preferredSectors: ['finance', 'industrial', 'consumer'] as Sector[],
    scoreWeights: {
      safety: 0.5, // 안전성 50%
      growth: 0.3, // 성장성 30%
      valuation: 0.2, // 밸류에이션 20%
    },
    panicSellProne: true, // 패닉셀 가능
  },
  Algorithm: {
    maxDebtRatio: 5.0, // 제한 없음
    minGrowth: -1.0, // 제한 없음
    minProfitability: -1.0, // 제한 없음
    preferredSectors: [] as Sector[], // 모든 섹터
    scoreWeights: {
      safety: 0.33,
      growth: 0.33,
      valuation: 0.34,
    },
    panicSellProne: false, // 랜덤 행동
  },
} as const

/* ── 펀더멘털 점수 계산 임계값 ── */
export const FUNDAMENTAL_THRESHOLDS = {
  // ROE (Return on Equity) = netIncome / revenue
  ROE_EXCELLENT: 0.15, // 15% 이상 → 30점
  ROE_GOOD: 0.10, // 10% 이상 → 20점
  ROE_FAIR: 0.05, // 5% 이상 → 10점
  ROE_POOR: 0.0, // 0% 이상 → 5점
  // 음수 → 0점

  // 부채비율
  DEBT_EXCELLENT: 1.0, // 1.0 이하 → +20점
  DEBT_GOOD: 1.5, // 1.5 이하 → +10점
  DEBT_FAIR: 2.0, // 2.0 이하 → 0점
  DEBT_POOR: 2.5, // 2.5 이하 → -10점
  // 2.5 초과 → -20점

  // 성장률
  GROWTH_EXCELLENT: 0.20, // 20% 이상 → 25점
  GROWTH_GOOD: 0.10, // 10% 이상 → 15점
  GROWTH_FAIR: 0.05, // 5% 이상 → 10점
  GROWTH_POOR: 0.0, // 0% 이상 → 5점
  // 음수 → 0점

  // PER (Price to Earnings Ratio) = price / eps
  PER_UNDERVALUED: 10, // 10 이하 → 25점 (저평가)
  PER_FAIR: 15, // 15 이하 → 15점
  PER_NEUTRAL: 20, // 20 이하 → 10점
  PER_OVERVALUED: 30, // 30 이하 → 5점
  // 30 초과 → 0점
} as const

/* ── 섹터별 펀더멘털 가중치 ── */
/**
 * 섹터 특성에 따른 펀더멘털 평가 가중치
 *
 * 각 섹터는 고유한 투자 논리를 가짐:
 * - Tech: 혁신과 성장성 중시 (미래 가치)
 * - Finance: 수익성과 재무 건전성 중시 (안정성)
 * - Utilities: 부채 관리와 배당 중시 (현금 흐름)
 * - Healthcare: 혁신과 안정성의 균형
 *
 * 가중치 합 = 1.0 (검증 필수)
 */
export const SECTOR_FUNDAMENTAL_WEIGHTS: Record<
  Sector,
  {
    profitability: number // ROE 가중치 (기준: 0.3)
    debt: number // 부채비율 가중치 (기준: 0.2)
    growth: number // 성장률 가중치 (기준: 0.25)
    valuation: number // PER 가중치 (기준: 0.25)
  }
> = {
  // Tech: 혁신 주도형 (성장 > 밸류에이션 > 수익 > 부채)
  tech: {
    profitability: 0.2, // 20% - 성장 우선, 수익은 나중
    debt: 0.1, // 10% - R&D 투자를 위한 부채 허용
    growth: 0.5, // 50% - 성장성이 가장 중요
    valuation: 0.2, // 20% - 미래 가치 기대
  },

  // Finance: 안정성 우선 (수익 > 부채 > 밸류 > 성장)
  finance: {
    profitability: 0.4, // 40% - 안정적 수익 중요
    debt: 0.3, // 30% - 재무 건전성 핵심
    growth: 0.1, // 10% - 안정성 > 성장성
    valuation: 0.2, // 20% - 적정 밸류에이션
  },

  // Energy: 자본 집약형 (부채 > 수익 > 밸류 > 성장)
  energy: {
    profitability: 0.3, // 30% - 현금 흐름 중시
    debt: 0.35, // 35% - 자본 집약적 특성
    growth: 0.15, // 15% - 성숙 산업
    valuation: 0.2, // 20% - 자산 가치 평가
  },

  // Healthcare: 혁신 + 안정성 균형
  healthcare: {
    profitability: 0.25, // 25% - 신약 개발 투자 고려
    debt: 0.2, // 20% - 중간 수준 부채 허용
    growth: 0.35, // 35% - 혁신 중시
    valuation: 0.2, // 20% - 파이프라인 가치 평가
  },

  // Consumer: 균형형 (수익 = 성장 = 밸류 > 부채)
  consumer: {
    profitability: 0.3, // 30% - 소비 트렌드 수익화
    debt: 0.2, // 20% - 중간 부채 관리
    growth: 0.3, // 30% - 시장 확대
    valuation: 0.2, // 20% - 브랜드 가치
  },

  // Industrial: 전통 제조업 (수익 > 부채 > 성장 = 밸류)
  industrial: {
    profitability: 0.35, // 35% - 제조 마진 중요
    debt: 0.3, // 30% - 설비 투자 부채 관리
    growth: 0.15, // 15% - 성숙 산업
    valuation: 0.2, // 20% - 자산 가치
  },

  // Telecom: 인프라 중심 (부채 > 수익 > 밸류 > 성장)
  telecom: {
    profitability: 0.3, // 30% - 안정적 수익
    debt: 0.35, // 35% - 인프라 투자 부채
    growth: 0.15, // 15% - 성숙 시장
    valuation: 0.2, // 20% - 네트워크 가치
  },

  // Materials: 원자재 중심 (부채 > 수익 > 밸류 > 성장)
  materials: {
    profitability: 0.3, // 30% - 원자재 마진
    debt: 0.35, // 35% - 채굴/생산 자본 부채
    growth: 0.15, // 15% - 경기 민감
    valuation: 0.2, // 20% - 자원 가치
  },

  // Utilities: 배당 중심 (부채 > 수익 > 밸류 > 성장)
  utilities: {
    profitability: 0.3, // 30% - 안정적 배당
    debt: 0.4, // 40% - 부채 관리 최우선
    growth: 0.1, // 10% - 성장보다 안정
    valuation: 0.2, // 20% - 배당수익률
  },

  // Real Estate: 자산 중심 (부채 > 밸류 > 수익 > 성장)
  realestate: {
    profitability: 0.25, // 25% - 임대 수익
    debt: 0.4, // 40% - 레버리지 부채 관리
    growth: 0.15, // 15% - 자산 확대
    valuation: 0.2, // 20% - 부동산 가치
  },
} as const

// 가중치 합 검증 (개발 시 활성화)
if (import.meta.env.MODE !== 'production') {
  Object.entries(SECTOR_FUNDAMENTAL_WEIGHTS).forEach(([sector, weights]) => {
    const sum = weights.profitability + weights.debt + weights.growth + weights.valuation
    if (Math.abs(sum - 1.0) > 0.001) {
      console.warn(`[SECTOR_WEIGHTS] ${sector} weights sum = ${sum.toFixed(3)}, expected 1.0`)
    }
  })
}

/* ── 섹터 순환 설정 ── */
export const SECTOR_ROTATION = {
  TOTAL_SECTORS: 10,
  ROTATION_INTERVAL_HOURS: 1, // 매 시간 한 섹터씩
} as const

/* ── 기관 거래 쿨다운 설정 ── */
/**
 * 기관 타입별 동일 종목 재거래 쿨다운 (ticks)
 *
 * 리얼리즘:
 * - 실제 기관들은 포지션 조정 후 관망 기간을 가짐
 * - 연속 매수/매도 방지로 시장 충격 분산
 * - HedgeFund: 빠른 회전 (5 ticks = 30분)
 * - Algorithm: 초단기 매매 (3 ticks = 15분)
 * - Pension/Bank: 느린 회전 (15-20 ticks = 1.5-2시간)
 */
export const INSTITUTION_TRADING_COOLDOWN: Record<Institution['type'], number> = {
  HedgeFund: 5, // 5 ticks (30분) - 빠른 회전
  Pension: 20, // 20 ticks (2시간) - 느린 회전
  Bank: 15, // 15 ticks (1.5시간) - 중간 회전
  Algorithm: 3, // 3 ticks (15분) - 알고리즘은 빠름
} as const

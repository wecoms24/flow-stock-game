import type { SkillBadge } from '../types/skills'

/**
 * 직원 스킬 뱃지 카탈로그 (30개)
 * 카테고리별 10개씩: trading, analysis, research
 */
export const SKILL_BADGES_CATALOG: Record<string, SkillBadge> = {
  /* ─────────────────────────────────────────────────────────────
     Trading 범주 (10개) - 매매 실행 관련
     ───────────────────────────────────────────────────────────── */

  flash_trader: {
    id: 'flash_trader',
    name: '빠른 손',
    emoji: '⚡',
    level: 3,
    category: 'trading',
    description: '주문을 번개처럼 빠르게 실행해요',
    playerMessage: '주문 실행 속도 +50%',
    _technical: {
      executionSpeedBonus: 0.5,
    },
  },

  smart_router: {
    id: 'smart_router',
    name: '스마트 라우터',
    emoji: '🎯',
    level: 4,
    category: 'trading',
    description: '최적의 가격으로 주문을 실행해요',
    playerMessage: '슬리피지 -80%',
    _technical: {
      slippageReduction: 0.8,
    },
  },

  scalper: {
    id: 'scalper',
    name: '스캘퍼',
    emoji: '🏃',
    level: 2,
    category: 'trading',
    description: '단타 매매에 특화되어 있어요',
    playerMessage: '단타 수수료 -50%',
    _technical: {
      // 수수료 감소는 tradeExecutionEngine에서 duration 확인
    },
  },

  market_maker: {
    id: 'market_maker',
    name: '마켓 메이커',
    emoji: '🏦',
    level: 5,
    category: 'trading',
    description: '대량 주문도 거뜬해요',
    playerMessage: '대량 주문 슬리피지 -60%',
    _technical: {
      slippageReduction: 0.6,
    },
  },

  night_trader: {
    id: 'night_trader',
    name: '야간 매매왕',
    emoji: '🌙',
    level: 2,
    category: 'trading',
    description: '밤에도 거래를 계속해요',
    playerMessage: '야간 매매 속도 +30%',
    _technical: {
      executionSpeedBonus: 0.3,
    },
  },

  zen_trader: {
    id: 'zen_trader',
    name: '침착한 트레이더',
    emoji: '🧘',
    level: 3,
    category: 'trading',
    description: '시장 변동성에 흔들리지 않아요',
    playerMessage: '스트레스 상황 실행 안정성 +40%',
    _technical: {
      executionSpeedBonus: 0.2,
      slippageReduction: 0.2,
    },
  },

  momentum_trader: {
    id: 'momentum_trader',
    name: '모멘텀 트레이더',
    emoji: '🚀',
    level: 3,
    category: 'trading',
    description: '급등/급락 시 빠르게 반응해요',
    playerMessage: '변동성 높을 때 실행 속도 +60%',
    _technical: {
      executionSpeedBonus: 0.6,
    },
  },

  patient_trader: {
    id: 'patient_trader',
    name: '인내의 달인',
    emoji: '⏳',
    level: 2,
    category: 'trading',
    description: '최적의 타이밍을 기다려요',
    playerMessage: '지정가 주문 체결률 +40%',
    _technical: {
      slippageReduction: 0.4,
    },
  },

  arbitrage_master: {
    id: 'arbitrage_master',
    name: '차익 거래 마스터',
    emoji: '⚖️',
    level: 4,
    category: 'trading',
    description: '가격 차이를 노려 이익을 얻어요',
    playerMessage: '매매 차익 +25%',
    _technical: {
      slippageReduction: 0.5,
      executionSpeedBonus: 0.5,
    },
  },

  cost_minimizer: {
    id: 'cost_minimizer',
    name: '수수료 절감왕',
    emoji: '💰',
    level: 2,
    category: 'trading',
    description: '수수료를 최소화해요',
    playerMessage: '모든 거래 수수료 -30%',
    _technical: {
      // 수수료 감소는 tradeExecutionEngine에서 처리
    },
  },

  /* ─────────────────────────────────────────────────────────────
     Analysis 범주 (10개) - 신호 생성 관련
     ───────────────────────────────────────────────────────────── */

  chart_master: {
    id: 'chart_master',
    name: '차트 달인',
    emoji: '📊',
    level: 4,
    category: 'analysis',
    description: '차트 패턴을 정확히 읽어내요',
    playerMessage: '신호 정확도 +30%',
    _technical: {
      signalAccuracy: 0.3,
    },
  },

  indicator_wizard: {
    id: 'indicator_wizard',
    name: '지표 마법사',
    emoji: '🔮',
    level: 3,
    category: 'analysis',
    description: '기술적 지표를 잘 활용해요',
    playerMessage: '신호 신뢰도 +25%',
    _technical: {
      signalAccuracy: 0.25,
    },
  },

  trend_follower: {
    id: 'trend_follower',
    name: '추세 추종자',
    emoji: '📈',
    level: 2,
    category: 'analysis',
    description: '트렌드를 잘 따라가요',
    playerMessage: '트렌드 장에서 신호 +20%',
    _technical: {
      signalAccuracy: 0.2,
    },
  },

  contrarian: {
    id: 'contrarian',
    name: '역발상 투자자',
    emoji: '🔄',
    level: 5,
    category: 'analysis',
    description: '극단적인 시장 상황을 역이용해요',
    playerMessage: '공포/탐욕 극단 시 신호 +50%',
    _technical: {
      signalAccuracy: 0.5,
    },
  },

  pattern_hunter: {
    id: 'pattern_hunter',
    name: '패턴 사냥꾼',
    emoji: '🎯',
    level: 3,
    category: 'analysis',
    description: '헤드앤숄더, 삼각수렴 등을 찾아내요',
    playerMessage: '패턴 발견 시 신호 +35%',
    _technical: {
      signalAccuracy: 0.35,
    },
  },

  volume_analyst: {
    id: 'volume_analyst',
    name: '거래량 분석가',
    emoji: '📦',
    level: 2,
    category: 'analysis',
    description: '거래량으로 추세를 예측해요',
    playerMessage: '거래량 이상 감지 시 신호 +20%',
    _technical: {
      signalAccuracy: 0.2,
    },
  },

  candlestick_reader: {
    id: 'candlestick_reader',
    name: '캔들 독해가',
    emoji: '🕯️',
    level: 2,
    category: 'analysis',
    description: '캔들스틱 패턴을 정확히 읽어요',
    playerMessage: '반전 신호 정확도 +25%',
    _technical: {
      signalAccuracy: 0.25,
    },
  },

  support_resistance_pro: {
    id: 'support_resistance_pro',
    name: '지지선/저항선 전문가',
    emoji: '🎚️',
    level: 3,
    category: 'analysis',
    description: '주요 가격대를 정확히 파악해요',
    playerMessage: '지지/저항 돌파 신호 +30%',
    _technical: {
      signalAccuracy: 0.3,
    },
  },

  fibonacci_wizard: {
    id: 'fibonacci_wizard',
    name: '피보나치 마법사',
    emoji: '🌀',
    level: 4,
    category: 'analysis',
    description: '피보나치 되돌림을 활용해요',
    playerMessage: '되돌림 구간 예측 +40%',
    _technical: {
      signalAccuracy: 0.4,
    },
  },

  multi_timeframe: {
    id: 'multi_timeframe',
    name: '다중 시간대 분석가',
    emoji: '⏰',
    level: 5,
    category: 'analysis',
    description: '여러 시간대를 동시에 분석해요',
    playerMessage: '신호 품질 +50%',
    _technical: {
      signalAccuracy: 0.5,
    },
  },

  /* ─────────────────────────────────────────────────────────────
     Research 범주 (10개) - 리스크 관리 관련
     ───────────────────────────────────────────────────────────── */

  risk_manager: {
    id: 'risk_manager',
    name: '리스크 관리자',
    emoji: '🛡️',
    level: 3,
    category: 'research',
    description: '위험을 줄이고 안전하게 투자해요',
    playerMessage: '거래당 리스크 -30%',
    _technical: {
      riskReduction: 0.3,
    },
  },

  kelly_criterion_expert: {
    id: 'kelly_criterion_expert',
    name: '켈리 공식 전문가',
    emoji: '📐',
    level: 5,
    category: 'research',
    description: '최적의 포지션 크기를 계산해요',
    playerMessage: '신뢰도 기반 포지션 사이징',
    _technical: {
      positionSizeMultiplier: 1.5,
    },
  },

  diversification_pro: {
    id: 'diversification_pro',
    name: '분산 투자 전문가',
    emoji: '🌐',
    level: 2,
    category: 'research',
    description: '여러 종목에 분산 투자해요',
    playerMessage: '포트폴리오 리스크 -25%',
    _technical: {
      riskReduction: 0.25,
    },
  },

  correlation_analyst: {
    id: 'correlation_analyst',
    name: '상관관계 분석가',
    emoji: '🔗',
    level: 4,
    category: 'research',
    description: '종목 간 상관관계를 파악해요',
    playerMessage: '헤지 효과 +40%',
    _technical: {
      riskReduction: 0.4,
    },
  },

  volatility_researcher: {
    id: 'volatility_researcher',
    name: '변동성 연구원',
    emoji: '📉',
    level: 3,
    category: 'research',
    description: '변동성을 예측하고 대응해요',
    playerMessage: '변동성 대응 +30%',
    _technical: {
      riskReduction: 0.3,
    },
  },

  macro_economist: {
    id: 'macro_economist',
    name: '거시 경제 전문가',
    emoji: '🌍',
    level: 4,
    category: 'research',
    description: '경제 흐름을 읽고 대응해요',
    playerMessage: '이벤트 대응 +35%',
    _technical: {
      riskReduction: 0.2,
      signalAccuracy: 0.15,
    },
  },

  fundamental_analyst: {
    id: 'fundamental_analyst',
    name: '펀더멘털 분석가',
    emoji: '📚',
    level: 3,
    category: 'research',
    description: '기업 가치를 정확히 평가해요',
    playerMessage: '장기 투자 안정성 +30%',
    _technical: {
      riskReduction: 0.3,
    },
  },

  sector_specialist: {
    id: 'sector_specialist',
    name: '섹터 전문가',
    emoji: '🏭',
    level: 2,
    category: 'research',
    description: '특정 산업에 정통해요',
    playerMessage: '담당 섹터 리스크 -20%',
    _technical: {
      riskReduction: 0.2,
    },
  },

  news_reader: {
    id: 'news_reader',
    name: '뉴스 독해가',
    emoji: '📰',
    level: 2,
    category: 'research',
    description: '뉴스를 빠르게 파악하고 대응해요',
    playerMessage: '이벤트 조기 감지 +25%',
    _technical: {
      signalAccuracy: 0.15,
      riskReduction: 0.1,
    },
  },

  sentiment_analyst: {
    id: 'sentiment_analyst',
    name: '심리 분석가',
    emoji: '🧠',
    level: 3,
    category: 'research',
    description: '시장 심리를 읽어내요',
    playerMessage: '공포/탐욕 지수 활용 +30%',
    _technical: {
      signalAccuracy: 0.2,
      riskReduction: 0.1,
    },
  },
}

/* ── Phase 7: 뱃지 시너지 ── */

export interface BadgeSynergyRule {
  badges: [string, string]
  name: string
  icon: string
  description: string
  effects: {
    executionSpeedBonus?: number
    signalAccuracy?: number
    slippageReduction?: number
    riskReduction?: number
    positionSizeMultiplier?: number
  }
}

export const BADGE_SYNERGIES: BadgeSynergyRule[] = [
  {
    badges: ['flash_trader', 'chart_master'],
    name: '스피드 리더',
    icon: '⚡📊',
    description: '빠른 체결 + 정확한 차트 읽기',
    effects: { executionSpeedBonus: 0.2, signalAccuracy: 0.1 },
  },
  {
    badges: ['risk_manager', 'contrarian'],
    name: '위기 알파',
    icon: '🛡️🔄',
    description: 'VOLATILE/CRISIS에서 리스크 최소화',
    effects: { riskReduction: 0.15 },
  },
  {
    badges: ['kelly_criterion_expert', 'market_maker'],
    name: '최적 실행',
    icon: '📐🏦',
    description: '최적 포지션 + 대량 체결',
    effects: { positionSizeMultiplier: 1.2, slippageReduction: 0.2 },
  },
  {
    badges: ['momentum_trader', 'trend_follower'],
    name: '추세 라이더',
    icon: '🚀📈',
    description: '추세 추종 극대화',
    effects: { signalAccuracy: 0.15, executionSpeedBonus: 0.15 },
  },
  {
    badges: ['zen_trader', 'risk_manager'],
    name: '철벽 방어',
    icon: '🧘🛡️',
    description: '침착한 리스크 관리',
    effects: { riskReduction: 0.2, slippageReduction: 0.1 },
  },
  {
    badges: ['fibonacci_wizard', 'pattern_hunter'],
    name: '패턴 마스터',
    icon: '🌀🎯',
    description: '피보나치 + 패턴 분석의 시너지',
    effects: { signalAccuracy: 0.2 },
  },
  {
    badges: ['macro_economist', 'sentiment_analyst'],
    name: '시장 독심술',
    icon: '🌍🧠',
    description: '거시 경제 + 시장 심리의 통합 분석',
    effects: { signalAccuracy: 0.15, riskReduction: 0.1 },
  },
  {
    badges: ['arbitrage_master', 'smart_router'],
    name: '극한 효율',
    icon: '⚖️🎯',
    description: '차익 거래 + 스마트 라우팅',
    effects: { slippageReduction: 0.25, executionSpeedBonus: 0.2 },
  },
]

/**
 * 뱃지 시너지 탐지 및 보너스 반환
 */
export function findBadgeSynergies(badges: import('../types/skills').SkillBadge[] | undefined): BadgeSynergyRule[] {
  if (!badges || badges.length < 2) return []

  const badgeIds = new Set(badges.map((b) => b.id))
  const active: BadgeSynergyRule[] = []

  for (const rule of BADGE_SYNERGIES) {
    if (badgeIds.has(rule.badges[0]) && badgeIds.has(rule.badges[1])) {
      active.push(rule)
    }
  }

  return active
}

/**
 * 스킬 수치(0-100) → 뱃지 레벨(1-5) 변환
 */
export function skillToBadgeLevel(skillValue: number): 1 | 2 | 3 | 4 | 5 {
  if (skillValue >= 90) return 5
  if (skillValue >= 75) return 4
  if (skillValue >= 60) return 3
  if (skillValue >= 40) return 2
  return 1
}

/**
 * 스킬 카테고리별 대표 뱃지 ID 매핑
 * (특정 스킬 수치가 높을 때 자동으로 부여할 뱃지)
 */
export const SKILL_CATEGORY_BADGES: Record<
  'analysis' | 'trading' | 'research',
  Array<{ threshold: number; badgeId: string }>
> = {
  trading: [
    { threshold: 90, badgeId: 'arbitrage_master' },
    { threshold: 80, badgeId: 'market_maker' },
    { threshold: 70, badgeId: 'smart_router' },
    { threshold: 60, badgeId: 'flash_trader' },
    { threshold: 50, badgeId: 'scalper' },
    { threshold: 40, badgeId: 'cost_minimizer' },
  ],
  analysis: [
    { threshold: 90, badgeId: 'multi_timeframe' },
    { threshold: 80, badgeId: 'fibonacci_wizard' },
    { threshold: 70, badgeId: 'chart_master' },
    { threshold: 60, badgeId: 'pattern_hunter' },
    { threshold: 50, badgeId: 'indicator_wizard' },
    { threshold: 40, badgeId: 'trend_follower' },
  ],
  research: [
    { threshold: 90, badgeId: 'kelly_criterion_expert' },
    { threshold: 80, badgeId: 'correlation_analyst' },
    { threshold: 70, badgeId: 'macro_economist' },
    { threshold: 60, badgeId: 'risk_manager' },
    { threshold: 50, badgeId: 'fundamental_analyst' },
    { threshold: 40, badgeId: 'diversification_pro' },
  ],
}

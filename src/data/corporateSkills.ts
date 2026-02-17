/**
 * Corporate Skill Catalog
 *
 * 회사가 해금하는 지식자산/시스템/정책
 * 3개 Tier: Tier 1 (기초) → Tier 2 (중급) → Tier 3 (고급)
 */

import type { CorporateSkill } from '../types/corporateSkill'

export const CORPORATE_SKILL_DEFINITIONS: CorporateSkill[] = [
  // ── Tier 1: 기초 (전제조건 없음) ──

  {
    id: 'stop_loss_policy',
    name: '손절매 정책',
    description: '전사 손절매 -5% 룰 적용. 모든 포지션에 자동 손절매 실행.',
    icon: '🛑',
    category: 'policy',
    tier: 1,
    cost: 500_000,
    prerequisites: [],
    effects: {
      conditional: { stopLossThreshold: -0.05 },
      teachablePassiveId: 'trailing_stop',
    },
    unlocked: false,
  },
  {
    id: 'diversification_rule',
    name: '분산투자 규칙',
    description: '단일 종목 최대 비중 40% 제한. 집중 리스크 방지.',
    icon: '📊',
    category: 'policy',
    tier: 1,
    cost: 300_000,
    prerequisites: [],
    effects: {
      conditional: { maxSinglePositionPercent: 0.4 },
      global: { riskReductionBonus: 0.05 },
    },
    unlocked: false,
  },
  {
    id: 'basic_chart_tools',
    name: '기본 차트 도구',
    description: 'RSI, 이동평균 분석 도구 도입. 전체 신호 정확도 +5%.',
    icon: '📈',
    category: 'tool',
    tier: 1,
    cost: 400_000,
    prerequisites: [],
    effects: {
      global: { signalAccuracyBonus: 0.05 },
      teachablePassiveId: 'chart_pattern_basic',
    },
    unlocked: false,
  },
  {
    id: 'news_terminal',
    name: '뉴스 터미널',
    description: '실시간 뉴스 피드 시스템. 이벤트 반영 속도 향상.',
    icon: '📰',
    category: 'tool',
    tier: 1,
    cost: 600_000,
    prerequisites: [],
    effects: {
      global: { signalAccuracyBonus: 0.03 },
      teachablePassiveId: 'news_reader',
    },
    unlocked: false,
  },

  // ── Tier 2: 중급 (Tier 1 전제) ──

  {
    id: 'advanced_stop_loss',
    name: '고급 손절매 시스템',
    description: '트레일링 스톱 + 동적 손절가 조정. 수익 보호 강화.',
    icon: '🔧',
    category: 'policy',
    tier: 2,
    cost: 1_500_000,
    prerequisites: ['stop_loss_policy'],
    effects: {
      conditional: {
        stopLossThreshold: -0.03,
        trailingStopPercent: 0.05,
      },
      teachablePassiveId: 'trailing_stop_master',
    },
    unlocked: false,
  },
  {
    id: 'position_sizing_system',
    name: '포지션 사이징 시스템',
    description: '켈리 공식 기반 적정 투자 금액 자동 계산.',
    icon: '⚖️',
    category: 'tool',
    tier: 2,
    cost: 1_200_000,
    prerequisites: ['diversification_rule'],
    effects: {
      global: { riskReductionBonus: 0.1 },
      teachablePassiveId: 'kelly_criterion',
    },
    unlocked: false,
  },
  {
    id: 'algorithm_trading_bot',
    name: '알고리즘 트레이딩 봇',
    description: '자동 주문 실행 시스템. 슬리피지 -20%, 수수료 -10%.',
    icon: '🤖',
    category: 'tool',
    tier: 2,
    cost: 2_000_000,
    prerequisites: ['basic_chart_tools'],
    effects: {
      global: {
        slippageReduction: 0.2,
        commissionDiscount: 0.1,
      },
      teachablePassiveId: 'smart_router',
    },
    unlocked: false,
  },
  {
    id: 'high_speed_network',
    name: '고속 네트워크',
    description: '초고속 데이터 회선. 주문 실행 속도 대폭 향상.',
    icon: '⚡',
    category: 'infrastructure',
    tier: 2,
    cost: 1_800_000,
    prerequisites: ['news_terminal'],
    effects: {
      global: { slippageReduction: 0.15 },
      teachablePassiveId: 'flash_trader',
    },
    unlocked: false,
  },
  {
    id: 'fundamental_analysis_lib',
    name: '기본적 분석 라이브러리',
    description: '재무제표, 밸류에이션 분석 도구. 신호 정확도 +10%.',
    icon: '📚',
    category: 'knowledge',
    tier: 2,
    cost: 1_000_000,
    prerequisites: ['basic_chart_tools'],
    effects: {
      global: { signalAccuracyBonus: 0.1 },
      teachablePassiveId: 'fundamental_analyst',
    },
    unlocked: false,
  },

  // ── Tier 3: 고급 (Tier 2 전제) ──

  {
    id: 'risk_parity_system',
    name: '리스크 패리티 시스템',
    description: '포트폴리오 위험 균등 배분. 전체 리스크 -15%.',
    icon: '🛡️',
    category: 'policy',
    tier: 3,
    cost: 3_000_000,
    prerequisites: ['position_sizing_system', 'advanced_stop_loss'],
    effects: {
      global: { riskReductionBonus: 0.15 },
      conditional: { maxSinglePositionPercent: 0.25 },
    },
    unlocked: false,
  },
  {
    id: 'ai_signal_engine',
    name: 'AI 신호 엔진',
    description: '머신러닝 기반 패턴 인식. 신호 정확도 +15%, 제안서 +5개.',
    icon: '🧠',
    category: 'tool',
    tier: 3,
    cost: 5_000_000,
    prerequisites: ['algorithm_trading_bot', 'fundamental_analysis_lib'],
    effects: {
      global: {
        signalAccuracyBonus: 0.15,
        maxPendingProposals: 5,
      },
    },
    unlocked: false,
  },
  {
    id: 'data_center',
    name: '자체 데이터센터',
    description: '최저 지연 주문 실행. 슬리피지 -30%, 수수료 -15%.',
    icon: '🏢',
    category: 'infrastructure',
    tier: 3,
    cost: 8_000_000,
    prerequisites: ['high_speed_network', 'algorithm_trading_bot'],
    effects: {
      global: {
        slippageReduction: 0.3,
        commissionDiscount: 0.15,
      },
    },
    unlocked: false,
  },
  {
    id: 'quant_research_lab',
    name: '퀀트 리서치 랩',
    description: '고급 정량 분석 연구소. 모든 분석 능력 극대화.',
    icon: '🔬',
    category: 'knowledge',
    tier: 3,
    cost: 4_000_000,
    prerequisites: ['fundamental_analysis_lib'],
    effects: {
      global: { signalAccuracyBonus: 0.2 },
      teachablePassiveId: 'quant_specialist',
    },
    unlocked: false,
  },
]

/** 초기 Corporate Skills 상태 생성 */
export function createInitialCorporateSkills(): Record<string, CorporateSkill> {
  const skills: Record<string, CorporateSkill> = {}
  for (const def of CORPORATE_SKILL_DEFINITIONS) {
    skills[def.id] = { ...def }
  }
  return skills
}

/** 특정 스킬의 전제조건 충족 여부 확인 */
export function arePrerequisitesMet(
  skillId: string,
  unlockedSkills: Record<string, CorporateSkill>,
): boolean {
  const skill = CORPORATE_SKILL_DEFINITIONS.find((s) => s.id === skillId)
  if (!skill) return false
  return skill.prerequisites.every((prereqId) => {
    const prereq = unlockedSkills[prereqId]
    if (!prereq && import.meta.env.DEV) {
      console.warn(`[CorporateSkill] prerequisite '${prereqId}' for '${skillId}' not found in unlocked skills`)
    }
    return prereq?.unlocked
  })
}

import type { SkillNode } from '../types/skills'

/**
 * RPG 스킬 트리 데이터 (30개 노드)
 * - Analysis: 10개
 * - Trading: 10개
 * - Research: 10개
 *
 * ## Modifier 값 해석 가이드
 *
 * ### operation: 'add' (절대값 추가)
 * - **Confidence/Threshold 스케일 (0-100)**:
 *   - modifier 0.1 = +10% confidence points
 *   - modifier 0.2 = +20% confidence points
 *   - 적용 시 `modifier * CONFIDENCE_SCALE_MULTIPLIER (100)`로 변환
 *
 * - **Risk Reduction 스케일 (0-100)**:
 *   - modifier 0.1 = 10% 리스크 감소
 *   - modifier 0.25 = 25% 리스크 감소
 *   - 적용 시 `threshold -= modifier * THRESHOLD_SCALE_MULTIPLIER (100)`
 *
 * ### operation: 'multiply' (배율 적용)
 * - **Slippage/Commission/Delay (ratio 스케일)**:
 *   - modifier 0.5 = 50% 감소 (절반으로 줄임)
 *   - modifier 0.7 = 70%로 감소 (30% 줄임)
 *   - modifier 1.15 = 15% 증가
 *   - 적용 시 `value *= modifier` (직접 곱셈)
 *
 * @see src/config/skillBalance.ts - CONFIDENCE_SCALE_MULTIPLIER, THRESHOLD_SCALE_MULTIPLIER
 * @see src/engines/tradePipeline/ - 실제 적용 로직
 */

/* ── Analysis Branch (분석 특화) ── */

export const ANALYSIS_SKILLS: SkillNode[] = [
  // Tier 1
  {
    id: 'analysis_boost_1',
    name: '분석력 강화 I',
    emoji: '📈',
    tier: 1,
    category: 'analysis',
    cost: 1,
    prerequisites: {},
    effect: { type: 'statBonus', stat: 'analysis', value: 5 },
    description: '기본 분석 능력을 향상시킵니다 (Analysis +5)',
    position: { row: 0, col: 0 },
    children: ['chart_reading', 'analysis_boost_2'],
  },
  {
    id: 'analysis_boost_2',
    name: '분석력 강화 II',
    emoji: '📊',
    tier: 1,
    category: 'analysis',
    cost: 1,
    prerequisites: { skills: ['analysis_boost_1'] },
    effect: { type: 'statBonus', stat: 'analysis', value: 5 },
    description: '분석 능력을 더욱 강화합니다 (Analysis +5)',
    position: { row: 0, col: 1 },
    children: ['fundamental_analysis'],
  },

  // Tier 2
  {
    id: 'chart_reading',
    name: '차트 읽기',
    emoji: '📊',
    tier: 2,
    category: 'analysis',
    cost: 3,
    prerequisites: { skills: ['analysis_boost_1'], stats: { analysis: 30 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'signalAccuracy', modifier: 0.1, operation: 'add' }],
    },
    description: '기술적 분석 신뢰도가 10% 향상됩니다',
    position: { row: 1, col: 0 },
    children: ['pattern_recognition'],
  },
  {
    id: 'fundamental_analysis',
    name: '재무제표 분석',
    emoji: '📈',
    tier: 2,
    category: 'analysis',
    cost: 3,
    prerequisites: { skills: ['analysis_boost_2'], stats: { analysis: 30 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'signalAccuracy', modifier: 0.1, operation: 'add' }],
    },
    description: '펀더멘털 분석 신뢰도가 10% 향상됩니다',
    position: { row: 1, col: 1 },
    children: ['value_investor'],
  },

  // Tier 3
  {
    id: 'pattern_recognition',
    name: '패턴 인식',
    emoji: '🔍',
    tier: 3,
    category: 'analysis',
    cost: 5,
    prerequisites: { skills: ['chart_reading'], stats: { analysis: 50 } },
    effect: {
      type: 'passive',
      // 📌 Example: modifier 0.2 = +20 confidence points (add operation, 0-100 scale)
      effects: [{ target: 'signalAccuracy', modifier: 0.2, operation: 'add' }],
    },
    description: '차트 패턴 자동 감지로 신뢰도 20% 향상',
    position: { row: 2, col: 0 },
    children: ['chart_master'],
  },
  {
    id: 'value_investor',
    name: '펀더멘털 전문가',
    emoji: '💼',
    tier: 3,
    category: 'analysis',
    cost: 5,
    prerequisites: { skills: ['fundamental_analysis'], stats: { analysis: 50 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'signalAccuracy', modifier: 0.2, operation: 'add' }],
    },
    description: '기업 가치 평가 정확도 20% 향상',
    position: { row: 2, col: 1 },
    children: ['deep_value'],
  },

  // Tier 4
  {
    id: 'chart_master',
    name: '차트 마스터',
    emoji: '⭐',
    tier: 4,
    category: 'analysis',
    cost: 10,
    prerequisites: { level: 15, skills: ['pattern_recognition'], stats: { analysis: 70 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'signalAccuracy', modifier: 0.3, operation: 'add' }],
    },
    description: '기술적 분석 신뢰도 30% 향상 (마스터급)',
    position: { row: 3, col: 0 },
    children: ['market_prophet'],
  },
  {
    id: 'deep_value',
    name: '가치 투자가',
    emoji: '💎',
    tier: 4,
    category: 'analysis',
    cost: 10,
    prerequisites: { level: 15, skills: ['value_investor'], stats: { analysis: 70 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'signalAccuracy', modifier: 0.3, operation: 'add' }],
    },
    description: '저평가 종목 발견 확률 30% 향상',
    position: { row: 3, col: 1 },
    children: ['data_scientist'],
  },

  // Tier 5
  {
    id: 'market_prophet',
    name: '시장 예지자',
    emoji: '🔮',
    tier: 5,
    category: 'analysis',
    cost: 15,
    prerequisites: { level: 25, skills: ['chart_master'], stats: { analysis: 90 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'signalAccuracy', modifier: 0.4, operation: 'add' }],
    },
    description: '모든 신호 신뢰도 40% 향상 (전설급)',
    position: { row: 4, col: 0 },
    children: [],
  },
  {
    id: 'data_scientist',
    name: '데이터 사이언티스트',
    emoji: '🧠',
    tier: 5,
    category: 'analysis',
    cost: 15,
    prerequisites: { level: 25, skills: ['deep_value'], stats: { analysis: 90 } },
    effect: {
      type: 'passive',
      // ✨ Phase 9: Tier 5 리밸런스 — 과분석 패널티
      effects: [
        { target: 'signalAccuracy', modifier: 0.4, operation: 'add' },
        { target: 'executionDelay', modifier: 1.15, operation: 'multiply' }, // 과분석 지연
      ],
    },
    description: 'AI 신호 생성 (신뢰도 +40%, 체결 지연 +15%)',
    position: { row: 4, col: 1 },
    children: [],
  },
]

/* ── Trading Branch (매매 특화) ── */

export const TRADING_SKILLS: SkillNode[] = [
  // Tier 1
  {
    id: 'trading_boost_1',
    name: '매매력 강화 I',
    emoji: '💪',
    tier: 1,
    category: 'trading',
    cost: 1,
    prerequisites: {},
    effect: { type: 'statBonus', stat: 'trading', value: 5 },
    description: '기본 매매 능력을 향상시킵니다 (Trading +5)',
    position: { row: 0, col: 0 },
    children: ['quick_hands', 'trading_boost_2'],
  },
  {
    id: 'trading_boost_2',
    name: '매매력 강화 II',
    emoji: '💼',
    tier: 1,
    category: 'trading',
    cost: 1,
    prerequisites: { skills: ['trading_boost_1'] },
    effect: { type: 'statBonus', stat: 'trading', value: 5 },
    description: '매매 능력을 더욱 강화합니다 (Trading +5)',
    position: { row: 0, col: 1 },
    children: ['fee_reduction'],
  },

  // Tier 2
  {
    id: 'quick_hands',
    name: '빠른 손',
    emoji: '⚡',
    tier: 2,
    category: 'trading',
    cost: 3,
    prerequisites: { skills: ['trading_boost_1'], stats: { trading: 30 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'executionDelay', modifier: 0.25, operation: 'multiply' }],
    },
    description: '주문 지연 시간이 25% 감소합니다',
    position: { row: 1, col: 0 },
    children: ['flash_trader'],
  },
  {
    id: 'fee_reduction',
    name: '수수료 절감',
    emoji: '💰',
    tier: 2,
    category: 'trading',
    cost: 3,
    prerequisites: { skills: ['trading_boost_2'], stats: { trading: 30 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'commission', modifier: 0.15, operation: 'multiply' }],
    },
    description: '거래 수수료가 15% 감소합니다',
    position: { row: 1, col: 1 },
    children: ['scalper'],
  },

  // Tier 3
  {
    id: 'flash_trader',
    name: 'Flash Trader',
    emoji: '🚀',
    tier: 3,
    category: 'trading',
    cost: 5,
    prerequisites: { skills: ['quick_hands'], stats: { trading: 50 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'executionDelay', modifier: 0.5, operation: 'multiply' }],
    },
    description: '주문 지연 시간이 50% 감소합니다',
    position: { row: 2, col: 0 },
    children: ['smart_router'],
  },
  {
    id: 'scalper',
    name: '스캘퍼',
    emoji: '🎯',
    tier: 3,
    category: 'trading',
    cost: 5,
    prerequisites: { skills: ['fee_reduction'], stats: { trading: 50 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'commission', modifier: 0.3, operation: 'multiply' }],
    },
    description: '단타 매매 시 수수료 30% 감소',
    position: { row: 2, col: 1 },
    children: ['market_maker'],
  },

  // Tier 4
  {
    id: 'smart_router',
    name: 'Smart Router',
    emoji: '🧠',
    tier: 4,
    category: 'trading',
    cost: 10,
    prerequisites: { level: 15, skills: ['flash_trader'], stats: { trading: 70 } },
    effect: {
      type: 'passive',
      // 📌 Example: modifier 0.5 = 50% reduction (multiply operation, slippage *= 0.5)
      effects: [{ target: 'slippage', modifier: 0.5, operation: 'multiply' }],
    },
    description: '슬리피지가 50% 감소합니다',
    position: { row: 3, col: 0 },
    children: ['algo_trader'],
  },
  {
    id: 'market_maker',
    name: '마켓 메이커',
    emoji: '📊',
    tier: 4,
    category: 'trading',
    cost: 10,
    prerequisites: { level: 15, skills: ['scalper'], stats: { trading: 70 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'slippage', modifier: 0.3, operation: 'multiply' }],
    },
    description: '호가 유리한 가격으로 체결 확률 30% 증가',
    position: { row: 3, col: 1 },
    children: ['hft_master'],
  },

  // Tier 5
  {
    id: 'algo_trader',
    name: '알고리즘 트레이더',
    emoji: '🤖',
    tier: 5,
    category: 'trading',
    cost: 15,
    prerequisites: { level: 25, skills: ['smart_router'], stats: { trading: 90 } },
    effect: {
      type: 'passive',
      effects: [
        { target: 'executionDelay', modifier: 0.7, operation: 'multiply' },
        { target: 'slippage', modifier: 0.7, operation: 'multiply' },
      ],
    },
    description: '자동 최적 타이밍 체결 (지연 -30%, 슬리피지 -30%)',
    position: { row: 4, col: 0 },
    children: [],
  },
  {
    id: 'hft_master',
    name: 'HFT 마스터',
    emoji: '⚡',
    tier: 5,
    category: 'trading',
    cost: 15,
    prerequisites: { level: 25, skills: ['market_maker'], stats: { trading: 90 } },
    effect: {
      type: 'passive',
      // ✨ Phase 9: Tier 5 리밸런스 — 절대 우위 제거
      effects: [
        { target: 'executionDelay', modifier: 0.1, operation: 'multiply' },
        { target: 'slippage', modifier: 0.1, operation: 'multiply' },
        { target: 'signalAccuracy', modifier: -0.1, operation: 'add' }, // 과속 트레이딩 정확도 패널티
      ],
    },
    description: '초고속 매매 (지연 -90%, 슬리피지 -90%, 정확도 -10%)',
    position: { row: 4, col: 1 },
    children: [],
  },
]

/* ── Research Branch (리스크 관리) ── */

export const RESEARCH_SKILLS: SkillNode[] = [
  // Tier 1
  {
    id: 'research_boost_1',
    name: '리서치력 강화 I',
    emoji: '🔬',
    tier: 1,
    category: 'research',
    cost: 1,
    prerequisites: {},
    effect: { type: 'statBonus', stat: 'research', value: 5 },
    description: '기본 리서치 능력을 향상시킵니다 (Research +5)',
    position: { row: 0, col: 0 },
    children: ['risk_awareness', 'research_boost_2'],
  },
  {
    id: 'research_boost_2',
    name: '리서치력 강화 II',
    emoji: '📚',
    tier: 1,
    category: 'research',
    cost: 1,
    prerequisites: { skills: ['research_boost_1'] },
    effect: { type: 'statBonus', stat: 'research', value: 5 },
    description: '리서치 능력을 더욱 강화합니다 (Research +5)',
    position: { row: 0, col: 1 },
    children: ['portfolio_manager'],
  },

  // Tier 2
  {
    id: 'risk_awareness',
    name: '리스크 인식',
    emoji: '🛡️',
    tier: 2,
    category: 'research',
    cost: 3,
    prerequisites: { skills: ['research_boost_1'], stats: { research: 30 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'riskReduction', modifier: 0.1, operation: 'add' }],
    },
    description: '포지션 리스크가 10% 감소합니다',
    position: { row: 1, col: 0 },
    children: ['kelly_criterion'],
  },
  {
    id: 'portfolio_manager',
    name: '포트폴리오 관리',
    emoji: '📊',
    tier: 2,
    category: 'research',
    cost: 3,
    prerequisites: { skills: ['research_boost_2'], stats: { research: 30 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'positionSize', modifier: 1.15, operation: 'multiply' }],
    },
    description: '분산 투자 효과로 포지션 크기 15% 증가',
    position: { row: 1, col: 1 },
    children: ['stop_loss_master'],
  },

  // Tier 3
  {
    id: 'kelly_criterion',
    name: 'Kelly Criterion',
    emoji: '📐',
    tier: 3,
    category: 'research',
    cost: 5,
    prerequisites: { skills: ['risk_awareness'], stats: { research: 50 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'positionSize', modifier: 1.3, operation: 'multiply' }],
    },
    description: '최적 포지션 사이징 (신뢰도 기반 크기 조정)',
    position: { row: 2, col: 0 },
    children: ['risk_master'],
  },
  {
    id: 'stop_loss_master',
    name: '손절 마스터',
    emoji: '✂️',
    tier: 3,
    category: 'research',
    cost: 5,
    prerequisites: { skills: ['portfolio_manager'], stats: { research: 50 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'riskReduction', modifier: 0.2, operation: 'add' }],
    },
    description: '손절 타이밍 최적화로 리스크 20% 감소',
    position: { row: 2, col: 1 },
    children: ['hedge_expert'],
  },

  // Tier 4
  {
    id: 'risk_master',
    name: 'Risk Master',
    emoji: '👑',
    tier: 4,
    category: 'research',
    cost: 10,
    prerequisites: { level: 15, skills: ['kelly_criterion'], stats: { research: 70 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'riskReduction', modifier: 0.3, operation: 'add' }],
    },
    description: '포지션 리스크 30% 감소 (마스터급)',
    position: { row: 3, col: 0 },
    children: ['quant_analyst'],
  },
  {
    id: 'hedge_expert',
    name: '헤지 전문가',
    emoji: '🔒',
    tier: 4,
    category: 'research',
    cost: 10,
    prerequisites: { level: 15, skills: ['stop_loss_master'], stats: { research: 70 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'riskReduction', modifier: 0.25, operation: 'add' }],
    },
    description: '역상관 종목 자동 헤징으로 리스크 25% 감소',
    position: { row: 3, col: 1 },
    children: ['risk_manager_ultimate'],
  },

  // Tier 5
  {
    id: 'quant_analyst',
    name: '퀀트 분석가',
    emoji: '📈',
    tier: 5,
    category: 'research',
    cost: 15,
    prerequisites: { level: 25, skills: ['risk_master'], stats: { research: 90 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'riskReduction', modifier: 0.4, operation: 'add' }],
    },
    description: '통계적 리스크 관리로 리스크 40% 감소',
    position: { row: 4, col: 0 },
    children: [],
  },
  {
    id: 'risk_manager_ultimate',
    name: '리스크 매니저',
    emoji: '🏆',
    tier: 5,
    category: 'research',
    cost: 15,
    prerequisites: { level: 25, skills: ['hedge_expert'], stats: { research: 90 } },
    effect: {
      type: 'passive',
      effects: [{ target: 'riskReduction', modifier: 0.5, operation: 'add' }],
    },
    description: '모든 리스크 50% 감소 (전설급)',
    position: { row: 4, col: 1 },
    children: [],
  },
]

/* ── Phase 9: Cross-Category Bridge Nodes ── */

export const BRIDGE_SKILLS: SkillNode[] = [
  {
    id: 'quant_analyst_bridge',
    name: '퀀트 분석 브릿지',
    emoji: '🔗',
    tier: 3,
    category: 'analysis',
    cost: 4,
    prerequisites: { skills: ['pattern_recognition'], stats: { analysis: 50, research: 30 } },
    effect: {
      type: 'passive',
      effects: [
        { target: 'signalAccuracy', modifier: 0.1, operation: 'add' },
        { target: 'riskReduction', modifier: 0.1, operation: 'add' },
      ],
    },
    description: 'Analysis → Research 브릿지 (정확도 +10%, 리스크 -10%)',
    position: { row: 2, col: 2 },
    children: [],
  },
  {
    id: 'technical_trader_bridge',
    name: '기술적 매매 브릿지',
    emoji: '🔗',
    tier: 3,
    category: 'analysis',
    cost: 4,
    prerequisites: { skills: ['value_investor'], stats: { analysis: 50, trading: 30 } },
    effect: {
      type: 'passive',
      effects: [
        { target: 'signalAccuracy', modifier: 0.05, operation: 'add' },
        { target: 'executionDelay', modifier: 0.85, operation: 'multiply' },
      ],
    },
    description: 'Analysis → Trading 브릿지 (정확도 +5%, 체결지연 -15%)',
    position: { row: 2, col: 3 },
    children: [],
  },
  {
    id: 'risk_trader_bridge',
    name: '리스크 매매 브릿지',
    emoji: '🔗',
    tier: 3,
    category: 'research',
    cost: 4,
    prerequisites: { skills: ['kelly_criterion'], stats: { research: 50, trading: 30 } },
    effect: {
      type: 'passive',
      effects: [
        { target: 'riskReduction', modifier: 0.05, operation: 'add' },
        { target: 'slippage', modifier: 0.85, operation: 'multiply' },
      ],
    },
    description: 'Research → Trading 브릿지 (리스크 -5%, 슬리피지 -15%)',
    position: { row: 2, col: 2 },
    children: [],
  },
  {
    id: 'macro_analyst_bridge',
    name: '거시 분석 브릿지',
    emoji: '🔗',
    tier: 3,
    category: 'research',
    cost: 4,
    prerequisites: { skills: ['stop_loss_master'], stats: { research: 50, analysis: 30 } },
    effect: {
      type: 'passive',
      effects: [
        { target: 'riskReduction', modifier: 0.05, operation: 'add' },
        { target: 'signalAccuracy', modifier: 0.1, operation: 'add' },
      ],
    },
    description: 'Research → Analysis 브릿지 (리스크 -5%, 정확도 +10%)',
    position: { row: 2, col: 3 },
    children: [],
  },
  {
    id: 'algo_execution_bridge',
    name: '알고 실행 브릿지',
    emoji: '🔗',
    tier: 3,
    category: 'trading',
    cost: 4,
    prerequisites: { skills: ['flash_trader'], stats: { trading: 50, analysis: 30 } },
    effect: {
      type: 'passive',
      effects: [
        { target: 'executionDelay', modifier: 0.8, operation: 'multiply' },
        { target: 'signalAccuracy', modifier: 0.05, operation: 'add' },
      ],
    },
    description: 'Trading → Analysis 브릿지 (체결지연 -20%, 정확도 +5%)',
    position: { row: 2, col: 2 },
    children: [],
  },
  {
    id: 'hedged_execution_bridge',
    name: '헤지 실행 브릿지',
    emoji: '🔗',
    tier: 3,
    category: 'trading',
    cost: 4,
    prerequisites: { skills: ['scalper'], stats: { trading: 50, research: 30 } },
    effect: {
      type: 'passive',
      effects: [
        { target: 'slippage', modifier: 0.9, operation: 'multiply' },
        { target: 'riskReduction', modifier: 0.1, operation: 'add' },
      ],
    },
    description: 'Trading → Research 브릿지 (슬리피지 -10%, 리스크 -10%)',
    position: { row: 2, col: 3 },
    children: [],
  },
]

/**
 * 전체 스킬 트리 (36개 노드: 30 기본 + 6 브릿지)
 */
export const SKILL_TREE: Record<string, SkillNode> = [
  ...ANALYSIS_SKILLS,
  ...TRADING_SKILLS,
  ...RESEARCH_SKILLS,
  ...BRIDGE_SKILLS,
].reduce(
  (acc, skill) => {
    acc[skill.id] = skill
    return acc
  },
  {} as Record<string, SkillNode>,
)

/**
 * 카테고리별 스킬 조회
 */
export function getSkillsByCategory(category: 'analysis' | 'trading' | 'research'): SkillNode[] {
  return Object.values(SKILL_TREE).filter((skill) => skill.category === category)
}

/**
 * 티어별 스킬 조회
 */
export function getSkillsByTier(tier: 1 | 2 | 3 | 4 | 5): SkillNode[] {
  return Object.values(SKILL_TREE).filter((skill) => skill.tier === tier)
}

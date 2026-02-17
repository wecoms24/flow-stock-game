/* ── Skill Badge System Types ── */

/**
 * 스킬 뱃지 (UI 표시용)
 * 기존 EmployeeSkills (숫자)를 게이머 친화적 뱃지로 표시
 */
export interface SkillBadge {
  id: string
  name: string // "빠른 손", "차트 달인"
  emoji: string // "⚡", "📊"
  level: 1 | 2 | 3 | 4 | 5 // ★ 등급 (별 개수)
  category: 'analysis' | 'trading' | 'research'
  description: string // "주문을 번개처럼 빠르게 실행해요"
  playerMessage: string // "주문 실행 속도 +50%"

  // 내부 로직용 (플레이어는 안 봄)
  _technical?: {
    signalAccuracy?: number // 0-1 (신호 품질 향상)
    executionSpeedBonus?: number // 0-1 (실행 속도 향상)
    slippageReduction?: number // 0-1 (슬리피지 감소)
    riskReduction?: number // 0-1 (리스크 감소)
    positionSizeMultiplier?: number // 포지션 크기 배율 (1.0 = 100%)
  }
}

/**
 * 스킬 수치 → 뱃지 레벨 변환 함수 타입
 */
export type SkillToBadgeLevelFn = (skillValue: number) => 1 | 2 | 3 | 4 | 5

/**
 * 매매 신호 (신호 생성 엔진에서 사용)
 */
export interface TradeSignal {
  companyId: string
  action: 'buy' | 'sell' | 'hold'
  confidence: number // 0-100
  isNoise: boolean
  reason?: string
}

/**
 * 매매 실행 결과 (매매 실행 엔진에서 사용)
 */
export interface TradeExecutionResult {
  executedPrice: number
  delay: number // 틱 단위
  commission: number
  slippage: number
}

/**
 * 주문 요청 (매매 실행 엔진 입력)
 */
export interface TradeOrder {
  targetPrice: number
  quantity: number
  direction: 'buy' | 'sell'
  duration?: number // 보유 기간 (틱 단위, scalper 판단용)
}

/**
 * 시장 상태 (매매 실행 엔진 입력)
 */
export interface MarketCondition {
  volume: number
  volatility: number
}

/**
 * 포트폴리오 정보 (리스크 관리 엔진 입력)
 */
export interface PortfolioInfo {
  totalValue: number
  cash: number
  positions?: Array<{ companyId: string; shares: number; avgBuyPrice: number }>
}

/* ── RPG Skill Tree System Types ── */

/**
 * 직원 성장 및 스킬 포인트 시스템
 */
export interface EmployeeProgression {
  level: number
  xp: number
  xpForNextLevel: number
  skillPoints: number // 사용 가능 SP
  spentSkillPoints: number // 사용한 SP
}

/**
 * 스킬 노드 (트리 구조)
 */
export interface SkillNode {
  id: string
  name: string
  emoji: string
  tier: 1 | 2 | 3 | 4 | 5
  category: 'analysis' | 'trading' | 'research'

  // 비용 및 조건
  cost: number // SP 비용
  prerequisites: SkillPrerequisites

  // 효과
  effect: SkillEffect

  // 설명
  description: string

  // UI 배치 (트리 시각화용)
  position: { row: number; col: number }
  children: string[] // 후속 스킬 ID
}

/**
 * 스킬 해금 조건
 */
export interface SkillPrerequisites {
  level?: number // 최소 레벨
  skills?: string[] // 선행 스킬 ID
  stats?: {
    analysis?: number
    trading?: number
    research?: number
  }
}

/**
 * 스킬 효과 (유니온 타입)
 */
export type SkillEffect = StatBonusEffect | PassiveEffect | SpecializationEffect

/**
 * 스탯 보너스 효과
 */
export interface StatBonusEffect {
  type: 'statBonus'
  stat: 'analysis' | 'trading' | 'research'
  value: number
}

/**
 * 패시브 스킬 효과
 */
export interface PassiveEffect {
  type: 'passive'
  effects: PassiveModifier[]
}

/**
 * 패시브 수정자
 */
export interface PassiveModifier {
  target:
    | 'signalAccuracy' // 신호 정확도
    | 'executionDelay' // 실행 지연
    | 'slippage' // 슬리피지
    | 'commission' // 수수료
    | 'riskReduction' // 리스크 감소
    | 'positionSize' // 포지션 크기
  modifier: number // 수정 값 (비율 또는 절대값)
  operation: 'add' | 'multiply' // 적용 방식
}

/**
 * 특화 스킬 효과 (고급)
 */
export interface SpecializationEffect {
  type: 'specialization'
  specializationId: string
  effects: PassiveModifier[]
}

/**
 * 스킬 노드 상태 (UI용)
 */
export type SkillNodeState =
  | 'locked' // 🔒 조건 미충족
  | 'available' // ✅ 구매 가능 (SP 충분)
  | 'insufficient' // ⚠️ 조건 충족, SP 부족
  | 'unlocked' // ⭐ 이미 해금됨

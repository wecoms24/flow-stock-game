/**
 * Corporate Skill Types
 *
 * 회사가 연구/구매/해금하는 지식자산(플레이북/시스템/인프라)
 * 직원 개인이 아닌 회사 전체가 소유하며, 교육 프로그램으로 직원에게 전파
 */

export type CorporateSkillCategory =
  | 'policy' // 전사 정책 (손절매 룰, 분산투자 규칙)
  | 'tool' // 도구/시스템 (알고리즘 봇, 실시간 뉴스피드)
  | 'infrastructure' // 시설/인프라 (고속 네트워크, 데이터센터)
  | 'knowledge' // 지식 체계 (기술적 분석, 기본적 분석)

export type CorporateSkillTier = 1 | 2 | 3

export interface CorporateSkillEffect {
  /** 전사 적용 효과 */
  global?: {
    signalAccuracyBonus?: number // 전체 신호 정확도 보너스
    slippageReduction?: number // 전체 슬리피지 감소
    commissionDiscount?: number // 수수료 할인율
    maxPendingProposals?: number // 최대 제안서 수 증가
    riskReductionBonus?: number // 리스크 감소 보너스
  }
  /** 특정 조건 발동 효과 */
  conditional?: {
    stopLossThreshold?: number // 자동 손절매 임계값 (예: -0.03 = -3%)
    takeProfitThreshold?: number // 자동 익절 임계값 (예: 0.10 = 10%)
    trailingStopPercent?: number // 트레일링 스톱 비율
    maxSinglePositionPercent?: number // 단일 종목 최대 비중
  }
  /** 교육 가능 여부: 직원에게 전파 시 제공되는 패시브 ID */
  teachablePassiveId?: string
}

export interface CorporateSkill {
  id: string
  name: string
  description: string
  icon: string
  category: CorporateSkillCategory
  tier: CorporateSkillTier
  cost: number // 해금 비용 (현금)
  prerequisites: string[] // 선행 Corporate Skill ID
  effects: CorporateSkillEffect
  unlocked: boolean
  unlockedAt?: number // 해금 틱
}

/** 회사가 보유한 Corporate Skills 상태 */
export interface CorporateSkillState {
  skills: Record<string, CorporateSkill>
  totalUnlocked: number
  totalSpent: number // 총 투자 금액
}

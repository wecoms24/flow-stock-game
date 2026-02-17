/* ── Monthly News Card System Types ── */

import type { Sector } from './index'

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface CardEffect {
  targetSector?: Sector
  targetCompanyId?: string
  driftModifier: number // 드리프트 변화량
  volatilityModifier: number // 변동성 변화량
  duration: number // 효과 지속 틱 수
}

export interface NewsCard {
  id: string
  templateId: string
  title: string
  description: string
  rarity: CardRarity
  icon: string
  sector?: Sector
  effects: CardEffect[]
  isForced: boolean // 강제 이벤트 카드 (반드시 선택해야 함)
  exclusiveWith?: string[] // 함께 선택 불가능한 카드 templateId[]
}

export interface NewsCardTemplate {
  id: string
  title: string
  description: string
  rarity: CardRarity
  icon: string
  sector?: Sector
  effects: CardEffect[]
  weight: number // 가중 확률 (높을수록 자주 등장)
  isForced: boolean
  exclusiveWith?: string[]
  minYear?: number // 이 연도 이후부터 등장
  maxYear?: number // 이 연도까지만 등장
}

export interface MonthlyCardDrawState {
  availableCards: NewsCard[] // 이번 달 뽑은 카드 3장
  selectedCardIds: string[] // 플레이어가 선택한 카드 (최대 2장)
  isDrawn: boolean // 이번 달 카드 뽑기 완료 여부
  isSelectionComplete: boolean // 선택 완료 여부
  activeCards: ActiveNewsCard[] // 현재 적용 중인 카드 효과
  drawMonth: number // 카드를 뽑은 월 (중복 뽑기 방지)
  selectionDeadlineTick: number // 자동 선택 시한 (틱)
}

export interface ActiveNewsCard {
  card: NewsCard
  remainingTicks: number // 남은 효과 틱
  appliedAt: number // 적용 시작 틱
}

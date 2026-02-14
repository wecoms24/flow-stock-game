/* ── Office Grid System Types ── */

// 가구 타입
export type FurnitureType =
  | 'desk' // 책상 (기본 배치)
  | 'premium_chair' // 고급 의자
  | 'plant' // 화분
  | 'server_rack' // 서버 랙
  | 'coffee_machine' // 커피머신
  | 'trophy' // CEO 트로피
  | 'air_purifier' // 공기청정기
  | 'whiteboard' // 화이트보드
  | 'bookshelf' // 책장
  | 'lounge_chair' // 휴게 의자

// 버프 효과 타입
export type BuffEffectType =
  | 'stamina_recovery' // 스태미너 회복
  | 'stress_reduction' // 스트레스 감소
  | 'skill_growth' // 스킬 성장
  | 'trading_speed' // 거래 속도
  | 'morale' // 사기

export interface BuffEffect {
  type: BuffEffectType
  value: number // 배율 (1.0 = 100%)
  range: number // 영향 범위 (칸 수, 0 = 해당 칸만, 999 = 전체)
}

// 가구 아이템
export interface FurnitureItem {
  id: string
  type: FurnitureType
  position: { x: number; y: number }
  size: { width: number; height: number } // 그리드 칸 수
  buffs: BuffEffect[]
  cost: number // 구매 비용
  sprite?: string // 스프라이트 이미지 경로 (선택적)
}

// 그리드 셀 타입
export type GridCellType = 'empty' | 'desk' | 'furniture' | 'wall'

// 그리드 셀
export interface GridCell {
  x: number
  y: number
  occupiedBy: string | null // furniture ID or employee ID
  type: GridCellType
  buffs: BuffEffect[] // 해당 칸에 영향을 주는 버프 목록 (계산됨)
}

// 사무실 그리드
export interface OfficeGrid {
  size: { width: number; height: number } // 기본 10x10
  cells: GridCell[][] // 2D 배열
  furniture: FurnitureItem[] // 배치된 가구 목록
}

/* ── Furniture Catalog Item ── */
export interface FurnitureCatalogItem {
  type: FurnitureType
  name: string
  description: string
  cost: number
  size: { width: number; height: number }
  buffs: BuffEffect[]
  sprite?: string
  unlockLevel?: number // 특정 레벨부터 구매 가능
}

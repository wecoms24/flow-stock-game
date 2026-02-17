/* ── Office Dot Layout System Types ── */

// 책상 타입
export type DeskType = 'basic' | 'premium'

// 장식 가구 타입 (책상 제외)
export type DecorationType =
  | 'plant' // 화분
  | 'server_rack' // 서버 랙
  | 'coffee_machine' // 커피머신
  | 'trophy' // CEO 트로피
  | 'air_purifier' // 공기청정기
  | 'whiteboard' // 화이트보드
  | 'bookshelf' // 책장
  | 'lounge_chair' // 휴게 의자

// 모든 가구 타입 (하위 호환성)
export type FurnitureType = DeskType | DecorationType

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
  range: number // 영향 범위 (픽셀 거리)
}

/* ── 책상 시스템 ── */
export interface DeskItem {
  id: string
  type: DeskType
  position: { x: number; y: number } // 픽셀 좌표 (자유 배치)
  employeeId: string | null // 배치된 직원 ID
  buffs: BuffEffect[] // 해당 책상의 버프
  cost: number
  sprite: string
}

/* ── 장식 가구 시스템 ── */
export interface DecorationItem {
  id: string
  type: DecorationType
  position: { x: number; y: number } // 픽셀 좌표 (자유 배치)
  buffs: BuffEffect[]
  cost: number
  sprite: string
}

/* ── 사무실 레이아웃 (도트 형식) ── */
export interface OfficeLayout {
  desks: DeskItem[] // 배치된 책상 목록
  decorations: DecorationItem[] // 배치된 장식 가구
  maxDesks: number // 최대 책상 개수 (7개: CEO 1 + 각 역할 2명씩)
  canvasSize: { width: number; height: number } // 캔버스 크기 (픽셀)
}

/* ── 카탈로그 아이템 정의 ── */
export interface DeskCatalogItem {
  type: DeskType
  name: string
  description: string
  cost: number
  buffs: BuffEffect[]
  sprite: string
  unlockLevel?: number
}

export interface DecorationCatalogItem {
  type: DecorationType
  name: string
  description: string
  cost: number
  buffs: BuffEffect[]
  sprite: string
  unlockLevel?: number
}

// 하위 호환성을 위한 통합 타입
export interface FurnitureCatalogItem {
  type: FurnitureType
  name: string
  description: string
  cost: number
  size?: { width: number; height: number } // deprecated, 하위 호환용
  buffs: BuffEffect[]
  sprite?: string
  unlockLevel?: number
}

/* ── 레거시 타입 (하위 호환성) ── */
export type GridCellType = 'empty' | 'desk' | 'furniture' | 'wall'

export interface GridCell {
  x: number
  y: number
  occupiedBy: string | null
  type: GridCellType
  buffs: BuffEffect[]
}

export interface OfficeGrid {
  size: { width: number; height: number }
  cells: GridCell[][]
  furniture: FurnitureItem[]
}

export interface FurnitureItem {
  id: string
  type: FurnitureType
  position: { x: number; y: number }
  size: { width: number; height: number }
  buffs: BuffEffect[]
  cost: number
  sprite?: string
}

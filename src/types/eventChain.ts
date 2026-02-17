/* ── Event Chain System Types ── */

import type { Sector } from './index'

export interface ChainWeek {
  week: number // 1-4
  title: string
  description: string
  driftModifier: number
  volatilityModifier: number
  affectedSectors?: Sector[]
  affectedCompanyIds?: string[]
}

export type PlayerAction =
  | 'buy_affected' // 영향받는 섹터/종목 매수
  | 'sell_affected' // 영향받는 섹터/종목 매도
  | 'hold' // 보유 유지
  | 'none' // 아무 행동도 안함

export interface ChainBranch {
  condition: PlayerAction
  label: string
  nextWeeks: ChainWeek[] // 이 분기 선택 시 이후 진행될 주차
  outcomeDescription: string
}

export type ChainStatus = 'active' | 'paused' | 'completed' | 'failed'

export interface EventChainState {
  chainId: string
  currentWeek: number // 0-based index
  status: ChainStatus
  startedAtTick: number
  lastAdvanceTick: number
  playerActions: PlayerAction[] // 주차별 플레이어 행동 기록
  selectedBranchIndex?: number // 분기 선택 인덱스
  totalWeeks: number
}

export interface EventChain {
  id: string
  title: string
  description: string
  icon: string
  category: 'macro' | 'sector' | 'company' | 'global'
  weeks: ChainWeek[]
  branches: ChainBranch[] // week 2 이후 분기
  branchAtWeek: number // 분기가 발생하는 주차 (0-based)
  triggerCondition?: {
    minYear?: number
    maxYear?: number
    requiredSector?: Sector
    minMarketDrop?: number // 시장 하락률 조건 (e.g. 0.05 = 5% 이상 하락 시)
  }
  weight: number // 등장 확률 가중치
}

export interface ActiveEventChainState {
  chains: EventChainState[] // 동시에 최대 1개 활성
  completedChainIds: string[] // 완료된 체인 ID (중복 방지)
  lastChainEndTick: number // 마지막 체인 종료 틱 (쿨다운)
}

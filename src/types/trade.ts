/* ── Trade AI Pipeline Type Definitions ── */

import type { Sector } from './index'

export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED' | 'EXPIRED'

export interface TradeProposal {
  id: string
  companyId: string
  ticker: string
  direction: 'buy' | 'sell'
  quantity: number
  targetPrice: number
  confidence: number // 0-100
  status: ProposalStatus
  createdByEmployeeId: string
  reviewedByEmployeeId: string | null
  executedByEmployeeId: string | null
  createdAt: number // absolute tick
  reviewedAt: number | null
  executedAt: number | null
  executedPrice: number | null
  slippage: number | null // 0-0.01
  isMistake: boolean
  rejectReason: string | null
}

export interface TradeResult {
  proposalId: string
  pnl: number
  totalCost: number
  fee: number
}

/** Analyst 담당 섹터 타입 (Employee.assignedSectors에서 사용) */
export type AssignedSector = Sector

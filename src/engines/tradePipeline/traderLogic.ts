/* ── Trader Logic: Order Execution Pipeline (Pure Functions) ── */

import type { Employee } from '../../types'
import type { TradeProposal } from '../../types/trade'
import { TRADE_AI_CONFIG } from '../../config/tradeAIConfig'

/**
 * Execute a trade proposal and return the execution result.
 *
 * Slippage: BASE_SLIPPAGE * (1 - tradingSkill / 100)
 * No trader fallback: fee multiplier 2x
 */
export function executeProposal(
  proposal: TradeProposal,
  trader: Employee | null,
  currentPrice: number,
  playerCash: number,
  adjacencyBonus: number = 0,
): {
  success: boolean
  executedPrice: number
  slippage: number
  fee: number
  reason?: string
} {
  const tradingSkill = trader?.skills?.trading ?? 0
  const hasTrader = trader !== null

  // Calculate slippage (adjacency bonus further reduces slippage)
  const baseSlippage = TRADE_AI_CONFIG.BASE_SLIPPAGE * (1 - tradingSkill / 100)
  const slippage = baseSlippage * (1 - adjacencyBonus)
  const slippageDirection = proposal.direction === 'buy' ? 1 : -1
  const executedPrice = currentPrice * (1 + slippage * slippageDirection)

  // Calculate fee
  const baseFee = executedPrice * proposal.quantity * 0.001 // 0.1% base fee
  const feeMultiplier = hasTrader ? 1 : TRADE_AI_CONFIG.NO_TRADER_FEE_MULTIPLIER
  const fee = baseFee * feeMultiplier

  // Validate buy: check if player has enough cash
  if (proposal.direction === 'buy') {
    const totalCost = executedPrice * proposal.quantity + fee
    if (totalCost > playerCash) {
      return {
        success: false,
        executedPrice,
        slippage,
        fee,
        reason: 'insufficient_funds',
      }
    }
  }

  return {
    success: true,
    executedPrice,
    slippage,
    fee,
  }
}

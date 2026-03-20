/* ── Trader Logic: Order Execution Pipeline (Pure Functions) ── */

import type { Employee, MarketRegime } from '../../types'
import type { TradeProposal } from '../../types/trade'
import { TRADE_AI_CONFIG, TRADER_REGIME_CONFIG } from '../../config/tradeAIConfig'
import { aggregateBadgeEffects } from '../../utils/badgeConverter'
import { executeEmployeeTrade } from '../tradeExecutionEngine' // ✨ 신규 엔진 통합
import { getPassiveModifiers } from '../../systems/skillSystem' // ✨ RPG Skill Tree
import type { AggregatedCorporateEffects } from '../corporateSkillEngine' // ✨ 회사 스킬

/**
 * Execute a trade proposal and return the execution result.
 *
 * ✨ Enhanced with badge system:
 * - Badge effects (flash_trader, smart_router, etc.)
 * - Adjacency bonus still applies
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
  volatility: number = 0.2,
  corporateEffects?: AggregatedCorporateEffects,
  regime?: MarketRegime,
  totalAssetValue?: number,
): {
  success: boolean
  executedPrice: number
  slippage: number
  fee: number
  reason?: string
  appliedBadgeEffects?: string[]
  partialFillRemaining?: number
} {
  const regimeConfig = TRADER_REGIME_CONFIG[regime ?? 'CALM']
  const hasTrader = trader !== null

  let executedPrice: number
  let slippage: number
  let fee: number
  const appliedBadgeEffects: string[] = []

  if (hasTrader && trader) {
    // ✨ 신규 실행 엔진 사용 (뱃지 효과 반영)
    const executionResult = executeEmployeeTrade(
      trader,
      {
        targetPrice: currentPrice,
        quantity: proposal.quantity,
        direction: proposal.direction,
        duration: 0, // 신규 매매는 보유 기간 0 (scalper 배지 50% 할인 항상 적용)
      },
      {
        volume: Math.max(proposal.quantity, 100), // 임시 volume
        volatility,
      }
    )

    executedPrice = executionResult.executedPrice
    slippage = executionResult.slippage
    fee = executionResult.commission

    // ✨ 뱃지 집계 효과 기록 (실제 적용은 executeEmployeeTrade 내부에서 처리됨)
    const badgeEffects = aggregateBadgeEffects(trader.badges)
    if (badgeEffects.executionSpeedBonus > 0) {
      appliedBadgeEffects.push(`executionSpeed +${(badgeEffects.executionSpeedBonus * 100).toFixed(0)}%`)
    }
    if (badgeEffects.slippageReduction > 0) {
      appliedBadgeEffects.push(`slippageReduction -${(badgeEffects.slippageReduction * 100).toFixed(0)}%`)
    }
    if (badgeEffects.positionSizeMultiplier !== 1.0) {
      appliedBadgeEffects.push(`positionSize x${badgeEffects.positionSizeMultiplier.toFixed(1)}`)
    }

    // ✨ RPG Skill Tree: Apply trader passive modifiers
    const slippageModifiers = getPassiveModifiers(trader, 'slippage')
    for (const mod of slippageModifiers) {
      if (mod.operation === 'add') {
        slippage += mod.modifier
      } else if (mod.operation === 'multiply') {
        slippage *= mod.modifier // modifier 0.5 = 50% 감소
      }
    }

    const commissionModifiers = getPassiveModifiers(trader, 'commission')
    for (const mod of commissionModifiers) {
      if (mod.operation === 'add') {
        fee += fee * mod.modifier
      } else if (mod.operation === 'multiply') {
        fee *= mod.modifier // modifier 0.85 = 15% 감소
      }
    }

    // ✨ Phase 8: gambler trait — 슬리피지 +15% (공격적 트레이딩 대가)
    if (trader.traits?.includes('gambler')) {
      slippage *= 1.15
    }

    // ✨ Phase 4: 레짐별 슬리피지 배수 적용
    slippage *= regimeConfig.slippageMultiplier

    // ✨ Corporate Skill: 슬리피지/수수료 감소
    if (corporateEffects) {
      slippage *= 1 - corporateEffects.slippageReduction
      fee *= 1 - corporateEffects.commissionDiscount
    }

    // Adjacency bonus: 추가 슬리피지 감소 (기존 로직 유지)
    if (adjacencyBonus > 0) {
      const slippageReduction = 1 - adjacencyBonus
      const slippageDirection = proposal.direction === 'buy' ? 1 : -1
      executedPrice = currentPrice * (1 + slippage * slippageReduction * slippageDirection)
    }
  } else {
    // No trader fallback: 기존 로직 유지
    const tradingSkill = 0
    const baseSlippage = TRADE_AI_CONFIG.BASE_SLIPPAGE * (1 - tradingSkill / 100)
    slippage = baseSlippage * (1 - adjacencyBonus)

    // ✨ Corporate Skill: no-trader 경로에도 슬리피지 감소 적용
    if (corporateEffects) {
      slippage *= 1 - corporateEffects.slippageReduction
    }

    const slippageDirection = proposal.direction === 'buy' ? 1 : -1
    executedPrice = currentPrice * (1 + slippage * slippageDirection)

    const baseFee = executedPrice * proposal.quantity * 0.001 // 0.1% base fee
    fee = baseFee * TRADE_AI_CONFIG.NO_TRADER_FEE_MULTIPLIER

    // ✨ Corporate Skill: no-trader 경로에도 수수료 감소 적용
    if (corporateEffects) {
      fee *= 1 - corporateEffects.commissionDiscount
    }
  }

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
        appliedBadgeEffects: appliedBadgeEffects.length > 0 ? appliedBadgeEffects : undefined,
      }
    }
  }

  // ✨ Phase 8: gambler trait — 포지션 크기 +30%
  if (trader?.traits?.includes('gambler') && proposal.direction === 'buy') {
    proposal.quantity = Math.floor(proposal.quantity * 1.3)
  }

  // ✨ Phase 4: 대형 주문 부분체결
  let partialFillRemaining: number | undefined
  if (totalAssetValue && proposal.direction === 'buy') {
    const orderValue = executedPrice * proposal.quantity
    if (orderValue > totalAssetValue * regimeConfig.largeOrderThreshold) {
      const tradingSkill = trader?.skills?.trading ?? 0
      const fillRate = Math.min(1.0, 0.5 + tradingSkill / 200)
      const filledQuantity = Math.max(1, Math.floor(proposal.quantity * fillRate))
      if (filledQuantity < proposal.quantity) {
        partialFillRemaining = proposal.quantity - filledQuantity
        // Mutate proposal quantity for this execution
        proposal.quantity = filledQuantity
      }
    }
  }

  return {
    success: true,
    executedPrice,
    slippage,
    fee,
    appliedBadgeEffects: appliedBadgeEffects.length > 0 ? appliedBadgeEffects : undefined,
    partialFillRemaining,
  }
}

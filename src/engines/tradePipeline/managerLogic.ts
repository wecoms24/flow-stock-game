/* ── Manager Logic: Risk Assessment Pipeline (Pure Functions) ── */

import type { Employee, PortfolioPosition } from '../../types'
import type { TradeProposal } from '../../types/trade'
import type { PlayerProfile } from '../../types/personalization'
import { TRADE_AI_CONFIG } from '../../config/tradeAIConfig'
import { SKILL_BALANCE } from '../../config/skillBalance'
import { calculatePositionSize } from '../riskManagementEngine' // ✨ 신규 엔진 통합
import { getPassiveModifiers } from '../../systems/skillSystem' // ✨ RPG Skill Tree

/**
 * Evaluate risk for a trade proposal.
 *
 * ✨ Enhanced with badge system:
 * - Badge effects (kelly_criterion, risk_manager, etc.)
 * - Position sizing validation via riskManagementEngine
 *
 * Manager personality modifiers:
 * - social: -10 approval threshold (more lenient)
 * - risk_averse: +15 threshold (more strict)
 * - perfectionist: +5 confidence weight
 * - tech_savvy: +10% accuracy (fewer mistakes)
 *
 * Personalization modifiers (v3.1):
 * - riskTolerance < 0.3: +7 threshold (more conservative)
 * - riskTolerance > 0.7: -5 threshold (more aggressive)
 *
 * No manager fallback: auto-approve with 30% mistake rate
 * Insufficient funds for buy: auto-reject
 */
export function evaluateRisk(
  proposal: TradeProposal,
  manager: Employee | null,
  playerCash: number,
  portfolio: Record<string, PortfolioPosition>,
  playerProfile?: PlayerProfile,
  personalizationEnabled?: boolean,
  totalAssetValue?: number, // ✨ 신규: 총 자산 (리스크 계산용)
): { approved: boolean; reason?: string; isMistake?: boolean; approvalBias?: number } {
  // Insufficient funds check for buy orders
  if (proposal.direction === 'buy') {
    const estimatedCost = proposal.targetPrice * proposal.quantity * 1.02 // 2% buffer for slippage
    if (estimatedCost > playerCash) {
      return { approved: false, reason: 'insufficient_funds' }
    }
  }

  // Sell validation: check if we have enough shares
  if (proposal.direction === 'sell') {
    const position = portfolio[proposal.companyId]
    if (!position || position.shares < proposal.quantity) {
      return { approved: false, reason: 'insufficient_shares' }
    }
  }

  // No manager fallback: auto-approve with mistake rate
  if (!manager) {
    const isMistake = Math.random() < TRADE_AI_CONFIG.NO_MANAGER_MISTAKE_RATE
    return { approved: true, isMistake }
  }

  // Manager evaluation
  const managerSkill = manager.skills?.research ?? 30
  const traits = manager.traits ?? []

  // ✨ Badge-enhanced position sizing check
  if (manager && totalAssetValue) {
    const recommendedSize = calculatePositionSize(
      manager,
      {
        companyId: proposal.companyId,
        action: proposal.direction === 'buy' ? 'buy' : 'sell',
        confidence: proposal.confidence,
        isNoise: false,
      },
      {
        totalValue: totalAssetValue,
        cash: playerCash,
        positions: Object.values(portfolio).map((p) => ({
          companyId: p.companyId,
          shares: p.shares,
          avgBuyPrice: p.avgBuyPrice,
        })),
      }
    )

    const proposedValue = proposal.quantity * proposal.targetPrice
    const recommendedValue = recommendedSize

    // ✨ RPG Skill Tree: Apply positionSize passive modifiers
    let maxPositionMultiplier = 1.5 // 기본값
    const positionSizeModifiers = getPassiveModifiers(manager, 'positionSize')
    for (const mod of positionSizeModifiers) {
      if (mod.operation === 'add') {
        maxPositionMultiplier += mod.modifier
      } else if (mod.operation === 'multiply') {
        maxPositionMultiplier *= mod.modifier // modifier 1.15 = 15% 증가
      }
    }

    // 제안된 포지션이 권장 크기의 배율 이상이면 거부 (과도한 리스크)
    if (proposedValue > recommendedValue * maxPositionMultiplier) {
      return { approved: false, reason: 'position_size_too_large' }
    }
  }

  // Base approval threshold
  let threshold = 60

  // Trait modifiers
  if (traits.includes('social')) threshold -= 10
  if (traits.includes('risk_averse')) threshold += 15
  if (traits.includes('perfectionist')) threshold += 5

  // Manager stress affects judgment
  const managerStress = manager.stress ?? 0
  if (managerStress > 70) threshold += 10 // stressed managers are more cautious

  // Confidence-weighted evaluation
  const effectiveConfidence = proposal.confidence + (managerSkill - 50) * 0.3

  // Portfolio concentration check: reject if >30% in one stock (including proposed buy)
  if (proposal.direction === 'buy') {
    const position = portfolio[proposal.companyId]
    const totalShares = (position?.shares ?? 0) + proposal.quantity
    if (totalShares * proposal.targetPrice > playerCash * 0.3) {
      threshold += 15 // more cautious with concentrated positions
    }
  }

  // ✨ RPG Skill Tree: Apply riskReduction passive modifiers
  const riskReductionModifiers = getPassiveModifiers(manager, 'riskReduction')
  for (const mod of riskReductionModifiers) {
    if (mod.operation === 'add') {
      // modifier 0.1 = 10% 리스크 감소 → threshold -10 (승인 쉬워짐, 0-100 scale)
      threshold -= mod.modifier * SKILL_BALANCE.THRESHOLD_SCALE_MULTIPLIER
    } else if (mod.operation === 'multiply') {
      threshold *= mod.modifier
    }
  }

  // Personalization: Apply approval bias based on player's risk tolerance
  let approvalBias = 0
  if (personalizationEnabled && playerProfile) {
    if (playerProfile.riskTolerance < 0.3) {
      approvalBias = +7 // Conservative: raise threshold (harder to approve)
    } else if (playerProfile.riskTolerance > 0.7) {
      approvalBias = -5 // Aggressive: lower threshold (easier to approve)
    }
    threshold += approvalBias
  }

  const approved = effectiveConfidence >= threshold

  // Mistake calculation: lower-skill managers make more mistakes
  const mistakeBase = Math.max(0, (50 - managerSkill) / 100) * 0.15
  const techSavvyReduction = traits.includes('tech_savvy') ? 0.1 : 0
  const mistakeRate = Math.max(0, mistakeBase - techSavvyReduction)
  const isMistake = Math.random() < mistakeRate

  return {
    approved,
    reason: approved ? undefined : 'risk_too_high',
    isMistake,
    approvalBias: personalizationEnabled ? approvalBias : undefined,
  }
}

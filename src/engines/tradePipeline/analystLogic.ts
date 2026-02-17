/* ── Analyst Logic: Signal Detection Pipeline (Pure Functions) ── */

import type { Company, Employee, MarketEvent } from '../../types'
import type { TradeProposal } from '../../types/trade'
import { calculateRSI, calculateMA } from '../../utils/technicalIndicators'
import { TRADE_AI_CONFIG } from '../../config/tradeAIConfig'
import { SKILL_BALANCE } from '../../config/skillBalance'
import { generateTradeSignals } from '../signalGenerationEngine' // ✨ 신규 엔진 통합
import { getPassiveModifiers } from '../../systems/skillSystem' // ✨ RPG Skill Tree

/**
 * Analyze a stock and return confidence/direction signal.
 *
 * ✨ Enhanced with badge system:
 * - Base confidence from technical analysis (RSI, MA)
 * - Badge bonus from signalGenerationEngine
 * - Trait and condition adjustments
 *
 * Confidence = (analysisSkill * 0.5) + (traitBonus * 0.3) + (conditionFactor * 0.2)
 * Insight: 5% chance → +20 confidence bonus
 */
export function analyzeStock(
  company: Company,
  priceHistory: number[],
  analyst: Employee,
  adjacencyBonus: number = 0,
  marketEvents: MarketEvent[] = [], // ✨ 신규: 이벤트 정보
): { confidence: number; direction: 'buy' | 'sell'; isInsight: boolean } | null {
  if (priceHistory.length < 15) return null

  const rsi = calculateRSI(priceHistory, 14)
  const ma20 = calculateMA(priceHistory, 20)
  const currentPrice = company.price

  // Determine direction from technical signals
  let direction: 'buy' | 'sell' | null = null
  let technicalSignal = 0

  if (rsi < 40 && currentPrice < ma20) {
    direction = 'buy'
    technicalSignal = (40 - rsi) / 40 // 0~1, stronger when more oversold
  } else if (rsi > 60 && currentPrice > ma20) {
    direction = 'sell'
    technicalSignal = (rsi - 60) / 40
  } else if (rsi < 35) {
    direction = 'buy'
    technicalSignal = (35 - rsi) / 35
  } else if (rsi > 65) {
    direction = 'sell'
    technicalSignal = (rsi - 65) / 35
  }

  if (!direction) return null

  // Calculate confidence components
  const analysisSkill = analyst.skills?.analysis ?? 30
  const skillFactor = (analysisSkill / 100) * 50 // max 50

  // Trait bonus
  let traitBonus = 0
  const traits = analyst.traits ?? []
  if (traits.includes('perfectionist')) traitBonus += 5
  if (traits.includes('tech_savvy')) traitBonus += 3
  if (traits.includes('sensitive')) traitBonus += 2 // sensitive analysts pick up subtle signals
  if (traits.includes('risk_averse')) traitBonus -= 3
  const traitFactor = Math.max(0, Math.min(30, traitBonus + technicalSignal * 20))

  // Condition factor (inverse of stress)
  const stress = analyst.stress ?? 0
  const stamina = analyst.stamina ?? 50
  const conditionRaw = ((100 - stress) / 100) * 0.5 + (stamina / analyst.maxStamina) * 0.5
  const conditionFactor = conditionRaw * 20 // max 20

  let confidence = skillFactor + traitFactor + conditionFactor

  // ✨ Badge bonus from signal generation engine
  const signalEnhancement = generateTradeSignals(analyst, [company], marketEvents)
  const signalMatch = signalEnhancement.find((s) => s.companyId === company.id)
  if (signalMatch && !signalMatch.isNoise) {
    // 신호 생성 엔진의 신뢰도를 추가 보너스로 활용 (최대 +20)
    const badgeBonus = (signalMatch.confidence / 100) * 20
    confidence += badgeBonus
  }

  // ✨ RPG Skill Tree: Apply signalAccuracy passive modifiers
  const signalAccuracyModifiers = getPassiveModifiers(analyst, 'signalAccuracy')
  for (const mod of signalAccuracyModifiers) {
    if (mod.operation === 'add') {
      // modifier 0.1 = 10% → +10 confidence points (0-100 scale)
      confidence += mod.modifier * SKILL_BALANCE.CONFIDENCE_SCALE_MULTIPLIER
    } else if (mod.operation === 'multiply') {
      confidence *= mod.modifier
    }
  }

  // Insight ability: 5% chance → +20 confidence
  const isInsight = Math.random() < TRADE_AI_CONFIG.INSIGHT_CHANCE
  if (isInsight) {
    confidence += TRADE_AI_CONFIG.INSIGHT_CONFIDENCE_BONUS
  }

  // Adjacency bonus: lower effective threshold (bonus 0~0.3 → threshold reduction 0~21)
  const effectiveThreshold = TRADE_AI_CONFIG.CONFIDENCE_THRESHOLD - (adjacencyBonus * 70)

  confidence = Math.max(0, Math.min(100, Math.round(confidence)))

  if (confidence < effectiveThreshold) return null

  return { confidence, direction, isInsight }
}

/**
 * Generate a TradeProposal from analyst's signal.
 * Prevents duplicate proposals: same analyst + same stock with PENDING status.
 */
export function generateProposal(
  analyst: Employee,
  company: Company,
  analysis: { confidence: number; direction: 'buy' | 'sell'; isInsight: boolean },
  currentTick: number,
  existingProposals: TradeProposal[],
): TradeProposal | null {
  // Duplicate prevention: same analyst, same company, still PENDING
  const hasDuplicate = existingProposals.some(
    (p) =>
      p.createdByEmployeeId === analyst.id &&
      p.companyId === company.id &&
      p.status === 'PENDING',
  )
  if (hasDuplicate) return null

  // Calculate quantity scaled by stock price (target investment: 1M ~ 5M won based on confidence)
  const confidenceRatio = Math.min(1, Math.max(0, (analysis.confidence - 70) / 30))
  const targetInvestment = 1_000_000 + confidenceRatio * 4_000_000
  const baseQuantity = Math.max(1, Math.floor(targetInvestment / company.price))

  return {
    id: `proposal-${currentTick}-${analyst.id}-${company.ticker}`,
    companyId: company.id,
    ticker: company.ticker,
    direction: analysis.direction,
    quantity: baseQuantity,
    targetPrice: company.price,
    confidence: analysis.confidence,
    status: 'PENDING',
    createdByEmployeeId: analyst.id,
    reviewedByEmployeeId: null,
    executedByEmployeeId: null,
    createdAt: currentTick,
    reviewedAt: null,
    executedAt: null,
    executedPrice: null,
    slippage: null,
    isMistake: false,
    rejectReason: null,
  }
}

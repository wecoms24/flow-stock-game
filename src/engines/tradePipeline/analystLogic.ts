/* ── Analyst Logic: Signal Detection Pipeline (Pure Functions) ── */

import type { Company, Employee, MarketEvent, PortfolioPosition } from '../../types'
import type { TradeProposal } from '../../types/trade'
import type { AggregatedCorporateEffects } from '../corporateSkillEngine'
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
  corporateEffects?: AggregatedCorporateEffects | null, // ✨ 회사 스킬 효과
): { confidence: number; direction: 'buy' | 'sell'; isInsight: boolean } | null {
  if (priceHistory.length < 15) return null

  const rsi = calculateRSI(priceHistory, 14)
  const ma20 = calculateMA(priceHistory, 20)
  const currentPrice = company.price

  // Determine direction from technical signals
  let direction: 'buy' | 'sell' | null = null
  let technicalSignal = 0

  // ✨ 보수적 완화: RSI 40/60 → 50/50 (더 빈번한 거래 신호)
  if (rsi < 50 && currentPrice < ma20) {
    direction = 'buy'
    technicalSignal = (50 - rsi) / 50 // 0~1, stronger when more oversold
  } else if (rsi > 50 && currentPrice > ma20) {
    direction = 'sell'
    technicalSignal = (rsi - 50) / 50
  } else if (rsi < 40) {
    direction = 'buy'
    technicalSignal = (40 - rsi) / 40
  } else if (rsi > 60) {
    direction = 'sell'
    technicalSignal = (rsi - 60) / 40
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

  // ✨ Corporate Skill: signalAccuracyBonus 적용
  // signalAccuracyBonus 0.05 = 5% → +5 confidence points
  if (corporateEffects && corporateEffects.signalAccuracyBonus > 0) {
    confidence += corporateEffects.signalAccuracyBonus * 100
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
  playerCash: number, // ✨ 현금 비율 기반 투자 계산용
  corporateEffects?: AggregatedCorporateEffects | null, // ✨ 회사 스킬 효과
): TradeProposal | null {
  // Duplicate prevention: same analyst, same company, still PENDING
  const hasDuplicate = existingProposals.some(
    (p) =>
      p.createdByEmployeeId === analyst.id &&
      p.companyId === company.id &&
      p.status === 'PENDING',
  )
  if (hasDuplicate) return null

  // Calculate quantity based on cash ratio (max 1% of current cash per trade)
  // ✨ 현금 비율 기반 투자: 절대 금액 대신 현금의 일정 비율 사용
  // ✨ 투자 비율 조정: 0.3-1% → 1-3% (더 현실적인 포트폴리오 구성)
  // - confidence 70~100 → cash의 1~3% 투자 (중도 수준)
  // - 예: cash 500M, confidence 85 → 10M 투자 (단일 종목 적정 비율)
  // - 예: cash 100M, confidence 85 → 2M 투자 (적정 수준)
  const confidenceRatio = Math.min(1, Math.max(0, (analysis.confidence - 70) / 30))
  let cashRatio = 0.01 + confidenceRatio * 0.02 // 1.0% ~ 3.0%

  // ✨ Corporate Skill: riskReductionBonus → 투자 비율 축소 (리스크 감소)
  if (corporateEffects && corporateEffects.riskReductionBonus > 0) {
    cashRatio *= (1 - corporateEffects.riskReductionBonus) // 예: 0.1 → 10% 축소
  }

  // ✨ Corporate Skill: maxSinglePositionPercent → 단일 종목 최대 비중 제한
  if (corporateEffects?.maxSinglePositionPercent != null && analysis.direction === 'buy') {
    const maxInvestment = playerCash * corporateEffects.maxSinglePositionPercent
    const currentTarget = playerCash * cashRatio
    if (currentTarget > maxInvestment) {
      cashRatio = corporateEffects.maxSinglePositionPercent
    }
  }

  if (company.price <= 0) return null
  const targetInvestment = playerCash * cashRatio
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

/**
 * Check portfolio positions for Stop Loss / Take Profit triggers.
 * Returns sell proposals for positions that meet exit criteria.
 *
 * ✨ AI Enhancement: Automatic profit taking and loss cutting
 * - Monitors all portfolio positions
 * - Generates sell proposals when stopLoss or takeProfit thresholds are met
 * - Confidence based on how far past the threshold (max 90 for urgency)
 */
export function checkPortfolioExits(
  analyst: Employee,
  portfolio: Record<string, PortfolioPosition>,
  companies: Company[],
  currentTick: number,
  existingProposals: TradeProposal[],
  corporateEffects?: AggregatedCorporateEffects | null,
): TradeProposal[] {
  const config = analyst.stopLossTakeProfit

  // ✨ 회사 스킬의 conditional 효과가 있으면 직원 설정 없이도 작동
  const hasCorpStopLoss = corporateEffects?.stopLossThreshold != null
  const hasCorpTakeProfit = corporateEffects?.takeProfitThreshold != null
  const hasEmployeeConfig = config?.enabled === true

  if (!hasEmployeeConfig && !hasCorpStopLoss && !hasCorpTakeProfit) return []

  const proposals: TradeProposal[] = []

  for (const [companyId, position] of Object.entries(portfolio)) {
    const company = companies.find((c) => c.id === companyId)
    if (!company || company.status === 'acquired') continue

    // Calculate profit/loss percentage
    if (position.avgBuyPrice <= 0) continue
    const pnlPercent = ((company.price - position.avgBuyPrice) / position.avgBuyPrice) * 100

    let shouldSell = false
    let urgency = 0

    // ✨ 회사 스킬 stopLoss 우선 적용 (더 좁은 것이 우선)
    // corporateEffects.stopLossThreshold는 비율 (예: -0.03 = -3%)
    const corpStopLoss = corporateEffects?.stopLossThreshold != null
      ? corporateEffects.stopLossThreshold * 100 // -0.03 → -3
      : null
    const empStopLoss = hasEmployeeConfig && config!.stopLossPercent !== null
      ? config!.stopLossPercent
      : null
    // 더 좁은 (큰 값 = 덜 부정적) 손절을 사용
    const effectiveStopLoss = corpStopLoss != null && empStopLoss != null
      ? Math.max(corpStopLoss, empStopLoss)
      : corpStopLoss ?? empStopLoss

    const corpTakeProfit = corporateEffects?.takeProfitThreshold != null
      ? corporateEffects.takeProfitThreshold * 100 // 0.10 → 10
      : null
    const empTakeProfit = hasEmployeeConfig && config!.takeProfitPercent !== null
      ? config!.takeProfitPercent
      : null
    // 더 높은 익절 목표 사용
    const effectiveTakeProfit = corpTakeProfit != null && empTakeProfit != null
      ? Math.max(corpTakeProfit, empTakeProfit)
      : corpTakeProfit ?? empTakeProfit

    // Check stop loss
    if (effectiveStopLoss !== null && pnlPercent <= effectiveStopLoss) {
      shouldSell = true
      urgency = Math.min(90, 70 + Math.abs(pnlPercent - effectiveStopLoss) * 2)
    }

    // Check take profit
    if (effectiveTakeProfit !== null && pnlPercent >= effectiveTakeProfit) {
      shouldSell = true
      urgency = Math.min(90, 70 + (pnlPercent - effectiveTakeProfit) * 2)
    }

    if (!shouldSell) continue

    // Check for duplicate proposals
    const hasDuplicate = existingProposals.some(
      (p) =>
        p.createdByEmployeeId === analyst.id &&
        p.companyId === companyId &&
        p.status === 'PENDING' &&
        p.direction === 'sell',
    )
    if (hasDuplicate) continue

    // Generate sell proposal for entire position
    proposals.push({
      id: `proposal-${currentTick}-${analyst.id}-${company.ticker}-exit`,
      companyId: company.id,
      ticker: company.ticker,
      direction: 'sell',
      quantity: position.shares,
      targetPrice: company.price,
      confidence: Math.round(urgency),
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
    })
  }

  return proposals
}

/* ── Analyst Logic: Signal Detection Pipeline (Pure Functions) ── */

import type { Company, Employee, MarketEvent, MarketRegime, PortfolioPosition } from '../../types'
import type { TradeProposal } from '../../types/trade'
import type { AggregatedCorporateEffects } from '../corporateSkillEngine'
import { calculateRSI, calculateMA, calculateMACD, calculateBollingerBands } from '../../utils/technicalIndicators'
import { aggregateBadgeEffects } from '../../utils/badgeConverter'
import { TRADE_AI_CONFIG, INDICATOR_WEIGHTS, COMPOSITE_SIGNAL_THRESHOLD } from '../../config/tradeAIConfig'
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
  marketEvents: MarketEvent[] = [],
  corporateEffects?: AggregatedCorporateEffects | null,
  regime?: MarketRegime,
): { confidence: number; direction: 'buy' | 'sell'; isInsight: boolean; appliedBadgeEffects: string[] } | null {
  if (priceHistory.length < 15) return null

  const currentRegime = regime ?? 'CALM'
  const weights = INDICATOR_WEIGHTS[currentRegime]

  const rsi = calculateRSI(priceHistory, 14)
  const ma20 = calculateMA(priceHistory, 20)
  const currentPrice = company.price
  const macd = calculateMACD(priceHistory)
  const bb = calculateBollingerBands(priceHistory)

  // ✨ Phase 3: 4개 지표 복합 스코어 (각 -1 ~ +1 정규화)
  // RSI signal: <50 = buy(+), >50 = sell(-)
  const rsiSignal = (50 - rsi) / 50

  // MA signal: price below MA = buy(+), above = sell(-)
  const maSignal = ma20 > 0 ? (ma20 - currentPrice) / ma20 : 0

  // MACD signal: histogram positive = buy(+), negative = sell(-)
  const macdSignal = macd ? Math.max(-1, Math.min(1, macd.histogram / (Math.abs(macd.signal) || 1))) : 0

  // BB signal: %B < 0.2 = buy(+), %B > 0.8 = sell(-)
  const bbSignal = bb ? (0.5 - bb.percentB) * 2 : 0

  // Weighted composite score
  const compositeScore =
    rsiSignal * weights.rsi +
    maSignal * weights.ma +
    macdSignal * weights.macd +
    bbSignal * weights.bb

  // Determine direction from composite score
  let direction: 'buy' | 'sell' | null = null
  let technicalSignal = 0

  if (compositeScore > COMPOSITE_SIGNAL_THRESHOLD) {
    direction = 'buy'
    technicalSignal = Math.min(1, compositeScore)
  } else if (compositeScore < -COMPOSITE_SIGNAL_THRESHOLD) {
    direction = 'sell'
    technicalSignal = Math.min(1, Math.abs(compositeScore))
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
  if (traits.includes('sensitive')) traitBonus += 2
  if (traits.includes('risk_averse')) traitBonus -= 3
  // ✨ Phase 6: 신규 trait 조건 분기
  if (traits.includes('contrarian_mind')) {
    traitBonus += currentRegime === 'CRISIS' ? 8 : currentRegime === 'VOLATILE' ? 3 : -2
  }
  if (traits.includes('gambler')) traitBonus += 4 // 과감한 분석
  if (traits.includes('lucky') && Math.random() < 0.1) traitBonus += 10 // 10% 확률 행운 보너스
  if (traits.includes('mentor')) traitBonus += 2
  const traitFactor = Math.max(0, Math.min(30, traitBonus + technicalSignal * 20))

  // Condition factor (inverse of stress)
  const stress = analyst.stress ?? 0
  const stamina = analyst.stamina ?? 50
  const conditionRaw = ((100 - stress) / 100) * 0.5 + (stamina / analyst.maxStamina) * 0.5
  const conditionFactor = conditionRaw * 20 // max 20

  let confidence = skillFactor + traitFactor + conditionFactor

  // ✨ 적용된 뱃지 효과 기록
  const appliedBadgeEffects: string[] = []

  // ✨ Badge bonus from signal generation engine
  const signalEnhancement = generateTradeSignals(analyst, [company], marketEvents)
  const signalMatch = signalEnhancement.find((s) => s.companyId === company.id)
  if (signalMatch && !signalMatch.isNoise) {
    // 신호 생성 엔진의 신뢰도를 추가 보너스로 활용 (최대 +20)
    const badgeBonus = (signalMatch.confidence / 100) * 20
    confidence += badgeBonus
  }

  // ✨ 뱃지 집계 효과 기록 (signalAccuracy는 signalGenerationEngine에서 이미 적용됨)
  const badgeEffects = aggregateBadgeEffects(analyst.badges)
  if (badgeEffects.signalAccuracy > 0) {
    appliedBadgeEffects.push(`signalAccuracy +${(badgeEffects.signalAccuracy * 100).toFixed(0)}%`)
  }
  if (badgeEffects.riskReduction > 0) {
    appliedBadgeEffects.push(`riskReduction -${(badgeEffects.riskReduction * 100).toFixed(0)}%`)
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

  // v6 밸런스: 위기 레짐 시 기회 보너스 (CRISIS = Opportunity)
  if (currentRegime === 'CRISIS') {
    confidence += TRADE_AI_CONFIG.CRISIS_CONFIDENCE_BONUS
  }

  // Adjacency bonus: lower effective threshold (bonus 0~0.3 → threshold reduction 0~21)
  const effectiveThreshold = TRADE_AI_CONFIG.CONFIDENCE_THRESHOLD - (adjacencyBonus * 70)

  confidence = Math.max(0, Math.min(100, Math.round(confidence)))

  if (confidence < effectiveThreshold) return null

  return { confidence, direction, isInsight, appliedBadgeEffects }
}

/**
 * Generate a TradeProposal from analyst's signal.
 * Prevents duplicate proposals: same analyst + same stock with PENDING status.
 */
export function generateProposal(
  analyst: Employee,
  company: Company,
  analysis: { confidence: number; direction: 'buy' | 'sell'; isInsight: boolean; appliedBadgeEffects?: string[] },
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
  let cashRatio = 0.03 + confidenceRatio * 0.05 // v7.4: 3.0% ~ 8.0% (직원 수익성 > 급여 보장)

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
    appliedBadgeEffects: analysis.appliedBadgeEffects?.length
      ? [...analysis.appliedBadgeEffects]
      : undefined,
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

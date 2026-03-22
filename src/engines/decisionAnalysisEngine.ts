/**
 * Decision Analysis Engine
 *
 * 엔딩 회고 시 플레이어의 의사결정 패턴을 분석하는 순수 함수들
 */

import type { Company } from '../types'
import type { RealizedTrade, MonthlySummary } from '../types/cashFlow'
import type {
  DecisionAnalysis,
  SectorAnalysis,
  TimingAnalysis,
  RiskBehavior,
} from '../types/endgame'

const CRISIS_PERIODS = [
  { startYear: 1997, startMonth: 10, endYear: 1998, endMonth: 12, name: 'IMF 외환위기' },
  { startYear: 2000, startMonth: 1, endYear: 2001, endMonth: 6, name: '닷컴 버블' },
  { startYear: 2008, startMonth: 6, endYear: 2009, endMonth: 6, name: '글로벌 금융위기' },
  { startYear: 2020, startMonth: 2, endYear: 2020, endMonth: 6, name: '코로나 팬데믹' },
]

function isInCrisis(year: number, month: number): boolean {
  return CRISIS_PERIODS.some(
    (c) =>
      (year > c.startYear || (year === c.startYear && month >= c.startMonth)) &&
      (year < c.endYear || (year === c.endYear && month <= c.endMonth)),
  )
}

export function analyzeSectorConcentration(
  trades: RealizedTrade[],
  companies: Company[],
): SectorAnalysis[] {
  const companyMap = new Map(companies.map((c) => [c.id, c]))
  const sectorMap = new Map<
    string,
    { count: number; pnl: number; wins: number; holdTicks: number }
  >()

  for (const trade of trades) {
    const company = companyMap.get(trade.companyId)
    const sector = company?.sector ?? 'unknown'
    const existing = sectorMap.get(sector) ?? { count: 0, pnl: 0, wins: 0, holdTicks: 0 }
    existing.count++
    existing.pnl += trade.pnl
    if (trade.pnl > 0) existing.wins++
    existing.holdTicks += trade.tick ?? 0
    sectorMap.set(sector, existing)
  }

  const totalTrades = trades.length || 1
  return Array.from(sectorMap.entries())
    .map(([sector, data]) => ({
      sector,
      tradeCount: data.count,
      totalPnl: data.pnl,
      winRate: data.count > 0 ? data.wins / data.count : 0,
      avgHoldTicks: data.count > 0 ? data.holdTicks / data.count : 0,
      concentration: data.count / totalTrades,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
}

export function analyzeTimingPatterns(
  trades: RealizedTrade[],
  _summaries: MonthlySummary[],
): TimingAnalysis {
  let panicSellCount = 0
  let crisisPnl = 0

  const crisisTrades = trades.filter((t) => isInCrisis(t.timestamp.year, t.timestamp.month))

  for (const trade of crisisTrades) {
    crisisPnl += trade.pnl
    if (trade.pnl < 0 && (trade.tick ?? 0) < 200) {
      panicSellCount++
    }
  }

  // buyLowRate: 위기 때 거래한 비율
  const buyLowRate = trades.length > 0 ? crisisTrades.length / trades.length : 0

  // sellHighRate: 수익 실현 비율
  const profitTrades = trades.filter((t) => t.pnl > 0)
  const sellHighRate = trades.length > 0 ? profitTrades.length / trades.length : 0

  // 위기 기간 중 패닉 매도하지 않은 거래 수
  const crisisNonPanicCount = Math.max(0, crisisTrades.length - panicSellCount)

  const totalCrisisInvested = crisisTrades.reduce(
    (sum, t) => sum + t.shares * t.buyPrice,
    0,
  )
  const crisisROI = totalCrisisInvested > 0 ? (crisisPnl / totalCrisisInvested) * 100 : 0

  return { buyLowRate, sellHighRate, panicSellCount, panicHoldCount: crisisNonPanicCount, crisisROI }
}

export function classifyRiskBehavior(
  timing: TimingAnalysis,
  sectorBreakdown: SectorAnalysis[],
): RiskBehavior {
  const evidence: string[] = []
  let label = '균형 투자가'
  let riskScore = 50

  const topSector = sectorBreakdown[0]
  const sectorCount = sectorBreakdown.filter((s) => s.tradeCount > 0).length

  // 위기 홀더
  if (timing.panicHoldCount > timing.panicSellCount * 2 && timing.crisisROI > 0) {
    label = '위기 홀더'
    evidence.push(`위기 상황에서 ${timing.panicHoldCount}건 보유 유지`)
    evidence.push(`위기 기간 ROI ${timing.crisisROI.toFixed(1)}%`)
    riskScore = 70
  }
  // 패닉 셀러
  else if (timing.panicSellCount > 10) {
    label = '패닉 셀러'
    evidence.push(`위기 시 ${timing.panicSellCount}건 급매도`)
    riskScore = 30
  }
  // 섹터 집중가
  else if (topSector && topSector.concentration > 0.5) {
    label = '섹터 집중가'
    evidence.push(`${topSector.sector} 섹터 비중 ${(topSector.concentration * 100).toFixed(0)}%`)
    riskScore = 65
  }
  // 분산 투자가
  else if (sectorCount >= 5) {
    label = '분산 투자가'
    evidence.push(`${sectorCount}개 섹터에 분산 투자`)
    riskScore = 45
  }
  // 단타 전사
  else if (
    sectorBreakdown.length > 0 &&
    sectorBreakdown.every((s) => s.avgHoldTicks < 300)
  ) {
    label = '단타 전사'
    evidence.push('평균 보유 기간이 매우 짧음')
    riskScore = 75
  }
  // 장기 투자가
  else if (
    sectorBreakdown.length > 0 &&
    sectorBreakdown.every((s) => s.avgHoldTicks > 1500)
  ) {
    label = '장기 투자가'
    evidence.push('평균 보유 기간이 매우 김')
    riskScore = 40
  }

  if (evidence.length === 0) {
    evidence.push('다양한 전략을 균형 있게 사용')
  }

  return { label, evidence, riskScore }
}

export function generatePersonalInsight(
  timing: TimingAnalysis,
  risk: RiskBehavior,
  sectors: SectorAnalysis[],
): string {
  const topSector = sectors[0]
  const sectorLabel = topSector?.sector ?? '다양한 분야'

  if (risk.label === '위기 홀더') {
    return `당신은 시장이 흔들릴 때 오히려 기회를 잡는 투자자입니다. 위기 기간 ROI ${timing.crisisROI.toFixed(1)}%는 강한 멘탈의 증거입니다.`
  }
  if (risk.label === '패닉 셀러') {
    return `위기 순간의 급매도가 잦았습니다. 다음에는 위기를 기회로 활용해보세요 — 역사적으로 위기 후 반등은 항상 있었습니다.`
  }
  if (risk.label === '섹터 집중가') {
    return `${sectorLabel} 섹터에 대한 깊은 이해와 확신이 돋보입니다. 집중 투자는 높은 수익을 가져오지만 리스크도 큽니다.`
  }
  if (risk.label === '분산 투자가') {
    return `여러 섹터에 골고루 투자하는 안정적인 전략을 구사했습니다. 리스크 관리의 정석입니다.`
  }
  if (risk.label === '단타 전사') {
    return `빠른 매매 회전으로 수익을 추구했습니다. 승률 ${(timing.sellHighRate * 100).toFixed(0)}%는 당신의 시장 감각을 보여줍니다.`
  }
  if (risk.label === '장기 투자가') {
    return `인내심을 갖고 장기 보유하는 전략을 선호했습니다. 시간이 당신의 가장 큰 무기였습니다.`
  }
  return `균형 잡힌 투자 스타일로 ${sectorLabel} 섹터를 중심으로 꾸준히 투자했습니다.`
}

export function generateDecisionAnalysis(
  trades: RealizedTrade[],
  companies: Company[],
  summaries: MonthlySummary[],
): DecisionAnalysis {
  const sectorBreakdown = analyzeSectorConcentration(trades, companies)
  const timing = analyzeTimingPatterns(trades, summaries)
  const riskBehavior = classifyRiskBehavior(timing, sectorBreakdown)
  const personalInsight = generatePersonalInsight(timing, riskBehavior, sectorBreakdown)

  return { sectorBreakdown, timing, riskBehavior, personalInsight }
}

/**
 * P0: 파산 원인 분석 + 코칭 팁 생성
 */
export function generateBankruptcyCoaching(
  trades: RealizedTrade[],
  totalEmployees: number,
  playMonths: number,
  _initialCash: number,
  _finalAssets: number,
): { cause: string; tips: string[] } {
  const tips: string[] = []
  let cause = ''

  // 원인 1: 매매를 거의 안 함
  if (trades.length < 5) {
    cause = '매매 부족 — 주식 투자 없이 직원 급여만 소진'
    tips.push('첫 달에 자본의 30~50%로 다양한 섹터의 주식을 매수하세요.')
    tips.push('AI 트레이드 파이프라인(애널리스트+트레이더+매니저)을 활용하면 자동 매매가 가능합니다.')
  }

  // 원인 2: 직원 급여 부담
  if (totalEmployees > 0 && trades.length < totalEmployees * 10) {
    if (!cause) cause = '직원 급여 대비 매매 수익 부족'
    tips.push('직원 급여가 매월 고정 지출됩니다. 매매 수익이 급여를 초과해야 생존합니다.')
    tips.push('런웨이(잔여 개월)가 6개월 미만이면 직원 해고를 고려하세요.')
  }

  // 원인 3: 손실 매매가 많음
  const lossTrades = trades.filter((t) => t.pnl < 0)
  if (trades.length >= 5 && lossTrades.length > trades.length * 0.6) {
    if (!cause) cause = '손실 매매 과다 — 승률이 40% 미만'
    tips.push('손절매를 설정하세요. 스킬 도감에서 "손절매 정책"을 구매하면 자동으로 -5%에서 손절합니다.')
    tips.push('하락 추세인 종목을 오래 보유하지 마세요. 추세를 확인 후 매매하세요.')
  }

  // 원인 4: 너무 짧은 플레이
  if (playMonths < 24) {
    tips.push('초반 1~2년은 투자 기반을 다지는 시기입니다. 조급하게 큰 수익을 노리지 마세요.')
  }

  // 원인 5: 집중 투자 실패
  if (trades.length >= 10) {
    const sectorCounts = new Map<string, number>()
    trades.forEach((t) => {
      const key = t.companyId
      sectorCounts.set(key, (sectorCounts.get(key) ?? 0) + 1)
    })
    if (sectorCounts.size <= 2) {
      tips.push('1~2개 종목에만 집중하지 마세요. 5개 이상 섹터에 분산 투자하면 리스크가 줄어듭니다.')
    }
  }

  // 기본 팁 (항상 포함)
  tips.push('역사적 위기(1997 IMF, 2008 금융위기, 2020 코로나)는 저점 매수의 기회입니다.')

  if (!cause) cause = '시장 변동성과 고정 비용의 이중 부담'

  return { cause, tips }
}

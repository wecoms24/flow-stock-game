/**
 * Endgame Recap Engine
 *
 * 게임 종료 시 30년 회고 데이터를 기존 상태로부터 집계하는 순수 함수들
 */

import type { Company, Competitor, GameConfig, GameTime, PlayerState } from '../types'
import type { EmployeeBio } from '../types/employeeBio'
import type { MonthlySummary, RealizedTrade } from '../types/cashFlow'
import type {
  EndgameRecap,
  InvestmentStyle,
  KeyTimelineEvent,
  StarEmployee,
  CompetitorResult,
  TurningPoint,
} from '../types/endgame'
import { generateDecisionAnalysis } from './decisionAnalysisEngine'
import { getFinalQuote } from '../data/taunts'
import type { TradingStyle } from '../types'
import { generateTestimonial } from '../data/employeeTestimonials'

const STYLE_ICONS: Record<string, string> = {
  aggressive: '🦈',
  conservative: '🐢',
  'trend-follower': '🏄',
  contrarian: '🐻',
}

/**
 * 메인 회고 데이터 생성 함수
 */
export function generateEndgameRecap(state: {
  player: PlayerState
  config: GameConfig
  time: GameTime
  competitors: Competitor[]
  companies: Company[]
  employeeBios: Record<string, EmployeeBio>
  realizedTrades: RealizedTrade[]
  monthlyCashFlowSummaries: MonthlySummary[]
}): EndgameRecap {
  const {
    player,
    config,
    time,
    competitors,
    companies,
    employeeBios,
    realizedTrades,
    monthlyCashFlowSummaries,
  } = state

  const totalROI =
    config.initialCash > 0
      ? ((player.totalAssetValue - config.initialCash) / config.initialCash) * 100
      : 0

  const playYears = time.year - config.startYear

  // Investment style analysis
  const investmentStyle = determineInvestmentStyle(realizedTrades)

  // Timeline events
  const keyEvents = extractKeyTimelineEvents(monthlyCashFlowSummaries, config)

  // Best/worst year
  const yearPerformance = calculateYearlyPerformance(monthlyCashFlowSummaries)
  const bestYear = yearPerformance.length > 0
    ? yearPerformance.reduce((a, b) => (b.roi > a.roi ? b : a))
    : null
  const worstYear = yearPerformance.length > 0
    ? yearPerformance.reduce((a, b) => (b.roi < a.roi ? b : a))
    : null

  // Star employees
  const starEmployees = selectStarEmployees(player, employeeBios)

  // Longest tenure
  const allBios = Object.values(employeeBios)
  const longestBio = allBios.length > 0
    ? allBios.reduce((a, b) => (b.monthsEmployed > a.monthsEmployed ? b : a))
    : null
  const longestTenureEmployee = longestBio
    ? {
        name: player.employees.find((e) => e.id === longestBio.employeeId)?.name ?? '알 수 없음',
        months: longestBio.monthsEmployed,
      }
    : null

  // Competitor results
  const playerROI = totalROI
  const allEntities = [
    { name: '나', roi: playerROI, isPlayer: true },
    ...competitors.map((c) => ({ name: c.name, roi: c.roi, isPlayer: false })),
  ].sort((a, b) => b.roi - a.roi)

  const playerRank = allEntities.findIndex((e) => e.isPlayer) + 1

  const competitorResults: CompetitorResult[] = competitors.map((c) => {
    const rank = allEntities.findIndex((e) => e.name === c.name) + 1
    const playerWon = playerROI > c.roi
    return {
      id: c.id,
      name: c.name,
      style: c.style,
      roi: c.roi,
      rank,
      headToHeadWins: c.headToHeadWins ?? 0,
      headToHeadLosses: c.headToHeadLosses ?? 0,
      finalQuote: getFinalQuote(c.style as TradingStyle, playerWon),
      styleIcon: STYLE_ICONS[c.style] ?? '💼',
    }
  }).sort((a, b) => a.rank - b.rank)

  // Decision Analysis
  const decisionAnalysis = generateDecisionAnalysis(
    realizedTrades,
    companies,
    monthlyCashFlowSummaries,
  )

  // One-line story
  const oneLineStory = generateOneLineStory(realizedTrades, totalROI, playYears, config.startYear)

  // Turning points
  const turningPoints = extractTurningPoints(monthlyCashFlowSummaries, player, realizedTrades, competitors, companies)

  // Asset curve (totalAssetValue if available, otherwise closingCash)
  const assetCurve = monthlyCashFlowSummaries.map((s) => ({
    year: s.year,
    month: s.month,
    cash: s.totalAssetValue ?? s.closingCash,
  }))

  // Headlines
  const headlines = generateHeadlines(
    totalROI,
    playerRank,
    playYears,
    player.totalAssetValue,
    investmentStyle,
    starEmployees[0]?.name,
  )

  return {
    finalAssets: player.totalAssetValue,
    totalROI,
    investmentStyle,
    playYears,
    startYear: config.startYear,
    endYear: time.year,
    keyEvents,
    bestYear,
    worstYear,
    totalTradesExecuted: realizedTrades.length,
    starEmployees,
    totalEmployeesEverHired: allBios.length,
    currentEmployeeCount: player.employees.length,
    longestTenureEmployee,
    playerRank,
    competitorResults,
    headlines,
    decisionAnalysis,
    oneLineStory,
    turningPoints,
    assetCurve,
  }
}

/**
 * 투자 스타일 분석
 */
function determineInvestmentStyle(trades: RealizedTrade[]): InvestmentStyle {
  if (trades.length === 0) return 'balanced'

  const avgHoldTicks = trades.reduce((sum, t) => sum + (t.tick ?? 0), 0) / trades.length
  const avgTradeSize = trades.reduce((sum, t) => sum + t.shares * t.buyPrice, 0) / trades.length
  const winRate = trades.filter((t) => t.pnl > 0).length / trades.length

  // Short holds + high frequency = aggressive
  if (avgHoldTicks < 500 && trades.length > 100) return 'aggressive'
  // Long holds + high win rate = conservative
  if (avgHoldTicks > 2000 && winRate > 0.6) return 'conservative'
  // Small trades + consistent = dividend-like
  if (avgTradeSize < 5_000_000 && winRate > 0.5) return 'dividend'
  return 'balanced'
}

/**
 * 월별 요약에서 핵심 이벤트 추출
 */
function extractKeyTimelineEvents(
  summaries: MonthlySummary[],
  config: GameConfig,
): KeyTimelineEvent[] {
  const events: KeyTimelineEvent[] = []

  // 역사적 이정표 (고정 이벤트)
  const milestoneEvents: Array<{ year: number; month: number; title: string; icon: string; impact: 'positive' | 'negative' | 'neutral' }> = [
    { year: 1997, month: 11, title: 'IMF 외환위기', icon: '🔥', impact: 'negative' },
    { year: 2000, month: 3, title: '닷컴 버블 붕괴', icon: '💥', impact: 'negative' },
    { year: 2008, month: 9, title: '글로벌 금융위기', icon: '📉', impact: 'negative' },
    { year: 2020, month: 3, title: '코로나 팬데믹', icon: '🦠', impact: 'negative' },
    { year: 2020, month: 6, title: '동학개미운동', icon: '🐜', impact: 'positive' },
    { year: 2021, month: 1, title: '밈 주식 열풍', icon: '🚀', impact: 'positive' },
  ]

  for (const me of milestoneEvents) {
    if (me.year >= config.startYear && me.year <= config.startYear + 30) {
      events.push({
        year: me.year,
        month: me.month,
        title: me.title,
        description: `${me.year}년 ${me.month}월 — ${me.title}`,
        icon: me.icon,
        impact: me.impact,
      })
    }
  }

  // 월별 요약에서 큰 변동 추출
  for (const summary of summaries) {
    const netChange = summary.closingCash - summary.openingCash
    const monthROI = summary.openingCash > 0
      ? (netChange / summary.openingCash) * 100
      : 0

    if (monthROI > 50) {
      events.push({
        year: summary.year,
        month: summary.month,
        title: '대박 수익!',
        description: `${summary.year}년 ${summary.month}월 — 큰 수익을 올렸습니다`,
        icon: '💰',
        impact: 'positive',
      })
    } else if (monthROI < -30) {
      events.push({
        year: summary.year,
        month: summary.month,
        title: '큰 손실 발생',
        description: `${summary.year}년 ${summary.month}월 — 큰 손실이 발생했습니다`,
        icon: '📉',
        impact: 'negative',
      })
    }
  }

  return events.sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
}

/**
 * 연도별 성과 계산
 */
function calculateYearlyPerformance(
  summaries: MonthlySummary[],
): Array<{ year: number; roi: number }> {
  const yearMap = new Map<number, { openingCash: number; closingCash: number }>()

  for (const s of summaries) {
    const existing = yearMap.get(s.year)
    if (!existing) {
      yearMap.set(s.year, { openingCash: s.openingCash, closingCash: s.closingCash })
    } else {
      existing.closingCash = s.closingCash
    }
  }

  return Array.from(yearMap.entries()).map(([year, data]) => ({
    year,
    roi: data.openingCash > 0 ? ((data.closingCash - data.openingCash) / data.openingCash) * 100 : 0,
  }))
}

/**
 * 스타 직원 선정 (기여도 상위 6명)
 */
function selectStarEmployees(
  player: PlayerState,
  bios: Record<string, EmployeeBio>,
): StarEmployee[] {
  const allEmployees = player.employees

  const results: StarEmployee[] = []

  for (const emp of allEmployees) {
    const bio = bios[emp.id]
    if (!bio) continue

    const pnl = bio.totalPnlContribution ?? 0
    const milestoneCount = (bio.unlockedMilestones ?? []).length
    const testimonial = generateTestimonial(emp.role, bio.monthsEmployed, bio.currentEmotion, bio.personality, milestoneCount, pnl)

    results.push({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      monthsEmployed: bio.monthsEmployed,
      totalPnlContribution: pnl,
      bestTradeTicker: bio.bestTradeTicker ?? '',
      bestTradeProfit: bio.bestTradeProfit ?? 0,
      finalLevel: emp.level ?? 1,
      testimonial,
      milestoneCount: (bio.unlockedMilestones ?? []).length,
    })
  }

  return results
    .sort((a, b) => b.totalPnlContribution - a.totalPnlContribution)
    .slice(0, 6)
}

/**
 * 한 줄 스토리 생성
 */
function generateOneLineStory(
  trades: RealizedTrade[],
  totalROI: number,
  playYears: number,
  startYear: number,
): string {
  if (trades.length === 0) {
    return `${startYear}년부터 ${playYears}년간, 시장을 지켜보기만 한 관찰자의 기록.`
  }

  const bestTrade = trades.reduce(
    (best, t) => (t.pnl > best.pnl ? t : best),
    trades[0],
  )

  const eventMap: Record<number, string> = {
    1997: 'IMF 외환위기',
    1998: 'IMF 구조조정',
    2000: '닷컴 버블',
    2001: 'IT 버블 붕괴',
    2008: '글로벌 금융위기',
    2009: '금융위기 회복',
    2020: '코로나 팬데믹',
    2021: '동학개미 시대',
  }

  const eventLabel = eventMap[bestTrade.timestamp.year] ?? `${bestTrade.timestamp.year}년`

  if (totalROI > 500) {
    return `${eventLabel}의 파도를 타고 ${bestTrade.ticker}에서 전설을 쓴 ${playYears}년의 여정.`
  }
  if (totalROI > 100) {
    return `${eventLabel}, ${bestTrade.ticker}의 대박과 함께 성장한 투자자의 이야기.`
  }
  if (totalROI > 0) {
    return `${playYears}년간 시장의 파도 속에서 살아남은 생존기 — ${eventLabel}이 전환점이었다.`
  }
  return `${eventLabel}의 교훈을 안고 ${playYears}년을 버텨낸 투자자의 기록.`
}

/**
 * 전환점 추출
 */
function extractTurningPoints(
  summaries: MonthlySummary[],
  player: PlayerState,
  trades: RealizedTrade[],
  competitors: Competitor[],
  companies: Company[],
): TurningPoint[] {
  const points: TurningPoint[] = []

  // 첫 현금 10억 달성
  for (const s of summaries) {
    if (s.closingCash >= 1_000_000_000) {
      points.push({
        year: s.year,
        month: s.month,
        type: 'first_billion',
        label: '첫 10억 달성',
        value: s.closingCash,
      })
      break
    }
  }

  // 플라이휠 모멘트 (6개월 연속 자산 성장)
  let consecutiveGrowth = 0
  for (let i = 1; i < summaries.length; i++) {
    if (summaries[i].closingCash > summaries[i - 1].closingCash) {
      consecutiveGrowth++
      if (consecutiveGrowth === 6) {
        points.push({
          year: summaries[i].year,
          month: summaries[i].month,
          type: 'flywheel',
          label: '플라이휠 점화 (6개월 연속 성장)',
        })
        break
      }
    } else {
      consecutiveGrowth = 0
    }
  }

  // 첫 마스터 직원
  const masterEmployee = player.employees.find((e) => (e.level ?? 1) >= 30)
  if (masterEmployee) {
    points.push({
      year: 0,
      month: 0,
      type: 'first_master',
      label: `마스터 직원 탄생: ${masterEmployee.name}`,
    })
  }

  // ✨ 1위 달성 (rank_1) — 모든 경쟁자를 한 번이라도 이긴 적이 있을 때
  if (competitors.length > 0) {
    const beatenAllRivals = competitors.every((c) => (c.headToHeadLosses ?? 0) > 0)
    if (beatenAllRivals) {
      const lastSummary = summaries[summaries.length - 1]
      if (lastSummary) {
        points.push({
          year: lastSummary.year,
          month: lastSummary.month,
          type: 'rank_1',
          label: '모든 라이벌을 넘어선 순간이 있었다',
        })
      }
    }
  }

  // ✨ 고슴도치 전략 (hedgehog) — 거래의 60% 이상이 같은 섹터
  if (trades.length >= 10) {
    const companyMap = new Map(companies.map((c) => [c.id, c]))
    const sectorCounts: Record<string, number> = {}
    for (const t of trades) {
      const sector = companyMap.get(t.companyId)?.sector ?? 'unknown'
      sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1
    }
    const maxSector = Object.entries(sectorCounts).reduce(
      (best, [sector, count]) => (count > best.count ? { sector, count } : best),
      { sector: '', count: 0 },
    )
    if (maxSector.count / trades.length >= 0.6) {
      const SECTOR_KO: Record<string, string> = {
        tech: 'IT', finance: '금융', energy: '에너지', healthcare: '헬스케어',
        consumer: '소비재', industrial: '산업재', telecom: '통신',
        materials: '소재', utilities: '유틸리티', realestate: '부동산',
      }
      const sectorLabel = SECTOR_KO[maxSector.sector] ?? maxSector.sector
      points.push({
        year: 0,
        month: 0,
        type: 'hedgehog',
        label: `고슴도치 전략: ${sectorLabel} 섹터 집중 투자 (${Math.round(maxSector.count / trades.length * 100)}%)`,
      })
    }
  }

  return points.sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
}


/**
 * 신문 헤드라인 생성
 */
function generateHeadlines(
  totalROI: number,
  playerRank: number,
  playYears: number,
  totalAssets: number,
  style: InvestmentStyle,
  topEmployeeName?: string,
): string[] {
  const headlines: string[] = []
  const assetsText = totalAssets >= 100_000_000_000
    ? `${(totalAssets / 100_000_000_000).toFixed(0)}천억`
    : totalAssets >= 100_000_000
      ? `${(totalAssets / 100_000_000).toFixed(0)}억`
      : `${(totalAssets / 10_000).toFixed(0)}만`

  // Headline 1: Main achievement
  if (playerRank === 1) {
    headlines.push(`"${playYears}년의 여정, 투자 전설 탄생" — 최종 자산 ${assetsText}원`)
  } else if (totalROI > 500) {
    headlines.push(`"개미에서 큰손으로: ${playYears}년 수익률 ${totalROI.toFixed(0)}%의 비밀"`)
  } else if (totalROI > 100) {
    headlines.push(`"${playYears}년 꾸준한 투자, ${assetsText}원 자산 구축"`)
  } else if (totalROI > 0) {
    headlines.push(`"험난한 시장을 버텨낸 투자자: ${playYears}년간의 생존기"`)
  } else {
    headlines.push(`"${playYears}년의 교훈: 시장은 결코 쉽지 않았다"`)
  }

  // Headline 2: Style-based
  const styleTexts: Record<InvestmentStyle, string> = {
    aggressive: '공격적 투자로 시장을 주무르다',
    balanced: '균형 잡힌 포트폴리오의 힘을 증명',
    conservative: '안전 투자의 정석, 꾸준함이 답이었다',
    dividend: '배당과 소액 투자로 자산을 키우다',
  }
  headlines.push(`"${styleTexts[style]}"`)

  // Headline 3: Employee or market story
  if (topEmployeeName) {
    headlines.push(`"최고의 파트너 ${topEmployeeName}, 회사를 이끈 숨은 공신"`)
  } else {
    headlines.push(`"IMF, 금융위기, 팬데믹... 모든 위기를 건넌 투자 여정"`)
  }

  return headlines
}

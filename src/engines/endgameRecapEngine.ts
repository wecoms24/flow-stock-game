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
} from '../types/endgame'
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
    const testimonial = generateTestimonial(emp.role, bio.monthsEmployed, bio.currentEmotion, bio.personality)

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

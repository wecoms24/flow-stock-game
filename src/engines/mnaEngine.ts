import type { Company, Sector } from '../types'
import { MNA_CONFIG } from '../config/mnaConfig'

/* ── M&A Deal Types ── */

export interface MnaDeal {
  acquirerId: string
  targetId: string
  premium: number // 0.2-0.4
  layoffRate: number // 0.1-0.6
  dealPrice: number // target current price * (1 + premium)
  estimatedHeadcountRetained: number
  estimatedHeadcountLaidOff: number
}

export interface MnaEvaluationResult {
  deal: MnaDeal | null
  newLastMnaQuarter: number
}

/* ── M&A Opportunity Evaluation ── */

/**
 * M&A 기회 평가 - 분기별 호출
 * @returns M&A 딜 및 업데이트된 lastMnaQuarter
 */
export function evaluateMnaOpportunity(
  companies: Company[],
  currentQuarter: number,
  lastMnaQuarter: number,
): MnaEvaluationResult {
  // 쿨다운 체크
  const quartersSinceLastDeal = currentQuarter - lastMnaQuarter
  if (quartersSinceLastDeal < MNA_CONFIG.MIN_YEARS_BETWEEN_DEALS * 4) {
    return { deal: null, newLastMnaQuarter: lastMnaQuarter }
  }

  // 활성 회사 필터
  const active = companies.filter((c) => c.status === 'active')
  if (active.length < MNA_CONFIG.MIN_COMPANIES_FOR_MNA) {
    return { deal: null, newLastMnaQuarter: lastMnaQuarter }
  }

  // 확률 체크
  if (Math.random() > MNA_CONFIG.MNA_PROB_PER_QUARTER) {
    return { deal: null, newLastMnaQuarter: lastMnaQuarter }
  }

  // 인수자 후보: 시가총액 상위 40%
  const sorted = [...active].sort((a, b) => b.marketCap - a.marketCap)
  const acquirerCandidates = sorted.slice(0, Math.ceil(sorted.length * 0.4))

  // 타깃 후보: 시가총액 하위 50% + 가격 하락
  const targetCandidates = sorted
    .slice(Math.floor(sorted.length * 0.5))
    .filter((c) => {
      const priceDropRatio = 1 - c.price / c.basePrice
      return priceDropRatio >= MNA_CONFIG.TARGET_MIN_PRICE_DROP
    })

  if (acquirerCandidates.length === 0 || targetCandidates.length === 0) {
    return { deal: null, newLastMnaQuarter: lastMnaQuarter }
  }

  // 랜덤 선택
  const acquirer = acquirerCandidates[Math.floor(Math.random() * acquirerCandidates.length)]
  const target = targetCandidates[Math.floor(Math.random() * targetCandidates.length)]

  if (acquirer.id === target.id) {
    return { deal: null, newLastMnaQuarter: lastMnaQuarter }
  }

  // 딜 파라미터 생성
  const premium =
    MNA_CONFIG.PREMIUM_RANGE[0] +
    Math.random() * (MNA_CONFIG.PREMIUM_RANGE[1] - MNA_CONFIG.PREMIUM_RANGE[0])
  const layoffRate = target.layoffRateOnAcquisition ?? 0.3
  const dealPrice = target.price * (1 + premium)

  const headcountRetained = Math.round((target.headcount ?? 0) * (1 - layoffRate))
  const headcountLaidOff = (target.headcount ?? 0) - headcountRetained

  const deal: MnaDeal = {
    acquirerId: acquirer.id,
    targetId: target.id,
    premium,
    layoffRate,
    dealPrice,
    estimatedHeadcountRetained: headcountRetained,
    estimatedHeadcountLaidOff: headcountLaidOff,
  }

  return {
    deal,
    newLastMnaQuarter: currentQuarter,
  }
}

/* ── IPO Company Generation ── */

const COMPANY_NAME_PREFIXES = [
  'Neo',
  'Quantum',
  'Cyber',
  'Stellar',
  'Apex',
  'Fusion',
  'Nova',
  'Omega',
  'Prime',
  'Vertex',
  'Zenith',
  'Alpha',
]

const COMPANY_NAME_SUFFIXES = [
  'Tech',
  'Corp',
  'Industries',
  'Systems',
  'Solutions',
  'Dynamics',
  'Innovations',
  'Labs',
  'Ventures',
  'Holdings',
  'Group',
]

/**
 * 신규 IPO 회사 생성
 */
export function generateNewCompany(oldCompany: Company): Company {
  const prefix = COMPANY_NAME_PREFIXES[Math.floor(Math.random() * COMPANY_NAME_PREFIXES.length)]
  const suffix = COMPANY_NAME_SUFFIXES[Math.floor(Math.random() * COMPANY_NAME_SUFFIXES.length)]
  const name = `${prefix} ${suffix}`

  // 티커는 이름 약어 + 랜덤 숫자
  const ticker = `${prefix.slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`

  // 기존 회사 섹터 유지
  const sector = oldCompany.sector

  // 가격/변동성은 섹터 기본값 + 랜덤
  const basePrice = 10000 + Math.random() * 40000
  const volatility = 0.15 + Math.random() * 0.15
  const drift = -0.02 + Math.random() * 0.08
  const marketCap = basePrice * 1_000_000

  // headcount 계산
  const baseHeadcount: Record<Sector, number> = {
    tech: 5000,
    finance: 3000,
    energy: 4000,
    healthcare: 6000,
    consumer: 2000,
    industrial: 7000,
    telecom: 4500,
    materials: 3500,
    utilities: 2500,
    realestate: 1500,
  }
  const scale = Math.log10(marketCap / 1_000_000) * 0.5 + 0.5
  const headcount = Math.round(baseHeadcount[sector] * scale)

  // 섹터별 이벤트 감응도 (기존 데이터 참고)
  const sectorSensitivity: Record<Sector, Record<string, number>> = {
    tech: { policy: 0.8, global: 1.2, boom: 1.5, crash: 1.3, innovation: 1.8, regulation: 1.2 },
    finance: { policy: 1.5, global: 1.4, boom: 1.2, crash: 1.5, regulation: 1.6, macro: 1.3 },
    energy: { policy: 1.3, global: 1.5, boom: 0.9, crash: 1.2, regulation: 1.4, macro: 1.1 },
    healthcare: { policy: 1.2, global: 0.8, boom: 0.7, crash: 0.8, innovation: 1.5, regulation: 1.7 },
    consumer: { policy: 0.9, global: 1.0, boom: 1.1, crash: 1.0, social: 1.4, macro: 0.8 },
    industrial: { policy: 1.1, global: 1.2, boom: 1.0, crash: 1.1, regulation: 1.0, macro: 1.2 },
    telecom: { policy: 1.3, global: 0.9, boom: 0.8, crash: 0.9, innovation: 1.3, regulation: 1.5 },
    materials: { policy: 0.9, global: 1.3, boom: 1.1, crash: 1.2, macro: 1.4, regulation: 0.8 },
    utilities: { policy: 1.4, global: 0.6, boom: 0.5, crash: 0.6, regulation: 1.8, macro: 0.7 },
    realestate: { policy: 1.6, global: 1.0, boom: 1.3, crash: 1.4, regulation: 1.5, macro: 1.5 },
  }

  return {
    id: `${sector}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    ticker,
    sector,
    price: basePrice,
    previousPrice: basePrice,
    basePrice,
    sessionOpenPrice: basePrice,
    priceHistory: [basePrice],
    volatility,
    drift,
    marketCap,
    description: `${name}은(는) 최근 상장한 신규 기업입니다.`,
    eventSensitivity: sectorSensitivity[sector],
    regimeVolatilities: {
      CALM: volatility * 0.5,
      VOLATILE: volatility,
      CRISIS: volatility * 2.0,
    },
    financials: {
      revenue: 1000 + Math.random() * 9000,
      netIncome: Math.random() > 0.2 ? 100 + Math.random() * 900 : -(Math.random() * 200),
      debtRatio: 1.5 * (0.8 + Math.random() * 0.4),
      growthRate: 0.05 * (0.5 + Math.random() * 1.5),
      eps: Math.random() * 10000,
    },
    institutionFlow: {
      netBuyVolume: 0,
      topBuyers: [],
      topSellers: [],
      institutionalOwnership: 0.3 + Math.random() * 0.4,
    },
    status: 'active',
    parentCompanyId: null,
    acquiredAtTick: null,
    headcount,
    layoffRateOnAcquisition: 0.2 + Math.random() * 0.4,
    mnaHistory: [],
    viTriggered: false,
    viCooldown: 0,
    viRecentPrices: [],
  }
}

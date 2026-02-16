import type { Institution, Company } from '../types'
import {
  INSTITUTION_CONFIG,
  INSTITUTION_PROFILES,
  FUNDAMENTAL_THRESHOLDS,
  SECTOR_FUNDAMENTAL_WEIGHTS,
  INSTITUTION_TRADING_COOLDOWN,
} from '../config/institutionConfig'

/* ── 기관 투자자 생성 및 관리 ── */

// 100개 기관 생성 (게임 시작 시 1회 실행)
export function generateInstitutions(): Institution[] {
  const nameTemplates = [
    'Goldman',
    'Morgan',
    'BlackRock',
    'Vanguard',
    'Fidelity',
    'Renaissance',
    'Bridgewater',
    'Citadel',
    'AQR',
    'Two Sigma',
  ]

  const institutions: Institution[] = []
  let idCounter = 0

  // TYPE_DISTRIBUTION에 따라 생성
  const dist = INSTITUTION_CONFIG.TYPE_DISTRIBUTION
  const types: Array<{ type: Institution['type']; count: number }> = [
    { type: 'HedgeFund', count: dist.HedgeFund },
    { type: 'Pension', count: dist.Pension },
    { type: 'Bank', count: dist.Bank },
    { type: 'Algorithm', count: dist.Algorithm },
  ]

  types.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const institution: Institution = {
        id: `inst_${idCounter}`,
        name: `${nameTemplates[idCounter % nameTemplates.length]} ${Math.floor(idCounter / nameTemplates.length) + 1} ${type}`,
        type,
        riskAppetite: Math.random(),
        capital:
          INSTITUTION_CONFIG.AUM_MIN +
          Math.random() * (INSTITUTION_CONFIG.AUM_MAX - INSTITUTION_CONFIG.AUM_MIN),
      }

      // Algorithm 타입에는 전략 할당
      if (type === 'Algorithm') {
        const strategies: Array<'momentum' | 'meanReversion' | 'volatility'> = [
          'momentum',
          'meanReversion',
          'volatility',
        ]
        institution.algoStrategy = strategies[idCounter % strategies.length]
      }

      institutions.push(institution)
      idCounter++
    }
  })

  return institutions
}

/* ── 펀더멘털 점수 계산 (0-100점) ── */
/**
 * 섹터별 가중치를 적용한 펀더멘털 점수 계산
 *
 * 기본 점수:
 * - 수익성: 0-30점 (기준 가중치 0.3)
 * - 부채: -20~+20점 (기준 가중치 0.2)
 * - 성장: 0-25점 (기준 가중치 0.25)
 * - 밸류: 0-25점 (기준 가중치 0.25)
 *
 * 섹터별 가중치 적용:
 * - Tech: growth 50% (0.5/0.25 = 2.0배)
 * - Finance: profitability 40%, debt 30%
 * - Utilities: debt 40%
 */
export function calculateFundamentalScore(company: Company): number {
  const { revenue, netIncome, debtRatio, growthRate, eps } = company.financials
  const { price, sector } = company

  // 섹터별 가중치 (기본값: 균등 가중)
  const weights = SECTOR_FUNDAMENTAL_WEIGHTS[sector] ?? {
    profitability: 0.3,
    debt: 0.2,
    growth: 0.25,
    valuation: 0.25,
  }

  // 1. 수익성 점수 (0-30점 → 가중치 적용)
  let profitabilityScore = 0
  const roe = revenue > 0 ? netIncome / revenue : -1
  if (roe >= FUNDAMENTAL_THRESHOLDS.ROE_EXCELLENT) {
    profitabilityScore = 30
  } else if (roe >= FUNDAMENTAL_THRESHOLDS.ROE_GOOD) {
    profitabilityScore = 20
  } else if (roe >= FUNDAMENTAL_THRESHOLDS.ROE_FAIR) {
    profitabilityScore = 10
  } else if (roe >= FUNDAMENTAL_THRESHOLDS.ROE_POOR) {
    profitabilityScore = 5
  }
  // 가중치 적용 (기준 0.3)
  const weightedProfitability = profitabilityScore * (weights.profitability / 0.3)

  // 2. 부채 관리 점수 (-20 ~ +20점 → 가중치 적용)
  let debtScore = 0
  if (debtRatio <= FUNDAMENTAL_THRESHOLDS.DEBT_EXCELLENT) {
    debtScore = 20
  } else if (debtRatio <= FUNDAMENTAL_THRESHOLDS.DEBT_GOOD) {
    debtScore = 10
  } else if (debtRatio <= FUNDAMENTAL_THRESHOLDS.DEBT_FAIR) {
    debtScore = 0
  } else if (debtRatio <= FUNDAMENTAL_THRESHOLDS.DEBT_POOR) {
    debtScore = -10
  } else {
    debtScore = -20
  }
  // 가중치 적용 (기준 0.2)
  const weightedDebt = debtScore * (weights.debt / 0.2)

  // 3. 성장성 점수 (0-25점 → 가중치 적용)
  let growthScore = 0
  if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_EXCELLENT) {
    growthScore = 25
  } else if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_GOOD) {
    growthScore = 15
  } else if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_FAIR) {
    growthScore = 10
  } else if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_POOR) {
    growthScore = 5
  }
  // 가중치 적용 (기준 0.25)
  const weightedGrowth = growthScore * (weights.growth / 0.25)

  // 4. 밸류에이션 점수 (0-25점 → 가중치 적용)
  let valuationScore = 0
  const per = eps > 0 ? price / eps : 999
  if (per <= FUNDAMENTAL_THRESHOLDS.PER_UNDERVALUED) {
    valuationScore = 25
  } else if (per <= FUNDAMENTAL_THRESHOLDS.PER_FAIR) {
    valuationScore = 15
  } else if (per <= FUNDAMENTAL_THRESHOLDS.PER_NEUTRAL) {
    valuationScore = 10
  } else if (per <= FUNDAMENTAL_THRESHOLDS.PER_OVERVALUED) {
    valuationScore = 5
  }
  // 가중치 적용 (기준 0.25)
  const weightedValuation = valuationScore * (weights.valuation / 0.25)

  // 최종 점수 합산
  const totalScore = weightedProfitability + weightedDebt + weightedGrowth + weightedValuation

  return Math.max(0, Math.min(100, totalScore))
}

/* ── 기관 패닉 셀 체크 ── */
export function checkInstitutionalPanicSell(
  company: Company,
  marketSentiment: number,
): boolean {
  const { debtRatio, netIncome } = company.financials

  // 3가지 조건 동시 충족 시 패닉 셀 트리거
  const isDebtCrisis = debtRatio > INSTITUTION_CONFIG.PANIC_DEBT_THRESHOLD
  const isLossShock = netIncome < INSTITUTION_CONFIG.PANIC_LOSS_THRESHOLD
  const isBearMarket = marketSentiment < INSTITUTION_CONFIG.PANIC_MARKET_THRESHOLD

  return isDebtCrisis && isLossShock && isBearMarket
}

/* ── 기관 매매 시뮬레이션 ── */
export function simulateInstitutionalTrading(
  company: Company,
  institutions: Institution[],
  marketSentiment: number, // 0.8 ~ 1.2 (시장 전체 분위기)
  currentTick?: number, // 현재 게임 틱 (쿨다운 체크용)
): { netVol: number; buyers: string[]; sellers: string[]; updatedInstitutions: Institution[] } {
  let netVolume = 0
  const buyerList: Array<{ name: string; volume: number }> = []
  const sellerList: Array<{ name: string; volume: number }> = []

  // 기관 쿨다운 추적용 복사본 생성
  const updatedInstitutions = institutions.map((inst) => ({
    ...inst,
    tradeCooldowns: { ...(inst.tradeCooldowns ?? {}) },
  }))

  // 성능 최적화: 랜덤하게 5~8개 기관만 이 종목 평가
  const activeCount =
    INSTITUTION_CONFIG.ACTIVE_PER_COMPANY_MIN +
    Math.floor(
      Math.random() *
        (INSTITUTION_CONFIG.ACTIVE_PER_COMPANY_MAX - INSTITUTION_CONFIG.ACTIVE_PER_COMPANY_MIN + 1),
    )
  const activeInstitutions = [...updatedInstitutions].sort(() => 0.5 - Math.random()).slice(0, activeCount)

  // 패닉 셀 체크
  const isPanicSell = checkInstitutionalPanicSell(company, marketSentiment)

  // 펀더멘털 점수 계산 (0-100점)
  const fundamentalScore = calculateFundamentalScore(company)

  activeInstitutions.forEach((inst) => {
    const profile = INSTITUTION_PROFILES[inst.type]

    // 0. 쿨다운 체크 (currentTick이 제공된 경우에만)
    if (currentTick !== undefined) {
      const cooldownExpiry = inst.tradeCooldowns?.[company.id]
      if (cooldownExpiry !== undefined && currentTick < cooldownExpiry) {
        return // 쿨다운 중이므로 이 종목 거래 스킵
      }
    }

    // 1. 패닉 셀 처리 (Pension/Bank만 해당) - 점진적 심각도 기반
    if (isPanicSell && profile.panicSellProne) {
      // 패닉 심각도 계산 (0.0 ~ 1.0)
      const debtStress = Math.max(0, Math.min(1, (company.financials.debtRatio - 2.5) / 2.5))
      const lossStress = Math.max(
        0,
        Math.min(1, Math.abs(company.financials.netIncome) / 1000_000_000),
      ) // 1000억 기준
      const marketStress = Math.max(0, Math.min(1, (0.9 - marketSentiment) / 0.2))
      const panicSeverity = (debtStress + lossStress + marketStress) / 3

      // 허딩 효과: 다른 기관들도 패닉 중인지 확인
      const panicSellerCount = activeInstitutions.filter((i) => {
        const iProfile = INSTITUTION_PROFILES[i.type]
        return iProfile.panicSellProne && checkInstitutionalPanicSell(company, marketSentiment)
      }).length

      // 허딩으로 확률 증폭
      const herdingMultiplier = 1 + panicSellerCount * 0.15
      const adjustedPanicProb = INSTITUTION_CONFIG.PANIC_PROBABILITY * herdingMultiplier

      if (Math.random() < adjustedPanicProb) {
        // 심각도에 따라 1% ~ 20% 매도
        const basePanic = 0.01
        const maxPanic = 0.2
        const panicMultiplier = basePanic + panicSeverity * (maxPanic - basePanic)
        const panicVolume = Math.floor(inst.capital * panicMultiplier)

        netVolume -= panicVolume
        sellerList.push({ name: inst.name, volume: panicVolume })
        // 쿨다운 설정 (패닉 셀 후)
        if (currentTick !== undefined) {
          const cooldownTicks = INSTITUTION_TRADING_COOLDOWN[inst.type]
          inst.tradeCooldowns![company.id] = currentTick + cooldownTicks
        }
        return // 패닉 셀 후 다른 로직 스킵
      }
    }

    // 2. 펀더멘털 점수 기반 평가
    let score = fundamentalScore / 100 // 0-1 정규화

    // 3. 기관 타입별 필터링
    const { debtRatio, growthRate, netIncome } = company.financials
    const revenue = company.financials.revenue

    // 부채비율 체크
    if (debtRatio > profile.maxDebtRatio) {
      score -= 0.5 // 투자 제외 경향
    }

    // 성장률 체크
    if (growthRate < profile.minGrowth) {
      score -= 0.3
    }

    // 수익성 체크
    const roe = revenue > 0 ? netIncome / revenue : -1
    if (roe < profile.minProfitability) {
      score -= 0.4
    }

    // 섹터 선호도
    if (profile.preferredSectors.length > 0) {
      if (profile.preferredSectors.includes(company.sector)) {
        score += 0.2
      } else {
        score -= 0.1
      }
    }

    // 4. 시장 분위기 반영
    score += (marketSentiment - 1.0) * 1.5

    // 5. 위험 선호도 반영 (HedgeFund만 변동성 선호)
    if (inst.type === 'HedgeFund' && company.volatility > 0.3) {
      score += inst.riskAppetite * 0.5
    }

    // 6. 알고리즘 트레이딩은 전략 기반
    if (inst.type === 'Algorithm' && inst.algoStrategy) {
      score = executeAlgoStrategy(inst.algoStrategy, company)
    } else if (inst.type === 'Algorithm') {
      score = (Math.random() - 0.5) * 2 // 전략 없으면 랜덤
    }

    // 7. 매매 결정
    const decision = score + (Math.random() - 0.5) * 0.3 // 노이즈 추가
    const volumeRatio =
      INSTITUTION_CONFIG.CAPITAL_ALLOCATION_MIN +
      Math.random() *
        (INSTITUTION_CONFIG.CAPITAL_ALLOCATION_MAX - INSTITUTION_CONFIG.CAPITAL_ALLOCATION_MIN)
    const volume = Math.floor(inst.capital * volumeRatio)

    if (decision > 0.5) {
      netVolume += volume
      buyerList.push({ name: inst.name, volume })
      // 쿨다운 설정 (매수 후)
      if (currentTick !== undefined) {
        const cooldownTicks = INSTITUTION_TRADING_COOLDOWN[inst.type]
        inst.tradeCooldowns![company.id] = currentTick + cooldownTicks
      }
    } else if (decision < -0.5) {
      netVolume -= volume
      sellerList.push({ name: inst.name, volume })
      // 쿨다운 설정 (매도 후)
      if (currentTick !== undefined) {
        const cooldownTicks = INSTITUTION_TRADING_COOLDOWN[inst.type]
        inst.tradeCooldowns![company.id] = currentTick + cooldownTicks
      }
    }
  })

  // 거래량 상위 3개 기관만 반환
  const buyers = buyerList
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)
    .map((x) => x.name)

  const sellers = sellerList
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)
    .map((x) => x.name)

  return { netVol: netVolume, buyers, sellers, updatedInstitutions }
}

/* ── 알고리즘 트레이딩 전략 ── */
function executeAlgoStrategy(
  strategy: 'momentum' | 'meanReversion' | 'volatility',
  company: Company,
): number {
  switch (strategy) {
    case 'momentum': {
      // 모멘텀: 20일 이동평균 돌파 시 매수, 이탈 시 매도
      if (company.priceHistory.length < 20) return 0
      const ma20 =
        company.priceHistory.slice(-20).reduce((sum, p) => sum + p, 0) / 20
      return company.price > ma20 ? 0.7 : -0.7
    }

    case 'meanReversion': {
      // 평균회귀: 표준편차 벗어나면 역방향 매매
      if (company.priceHistory.length < 20) return 0
      const recent = company.priceHistory.slice(-20)
      const mean = recent.reduce((sum, p) => sum + p, 0) / recent.length
      const variance =
        recent.reduce((sum, p) => sum + (p - mean) ** 2, 0) / recent.length
      const stdDev = Math.sqrt(variance)

      if (company.price < mean - stdDev) return 0.8 // 저평가 매수
      if (company.price > mean + stdDev) return -0.8 // 고평가 매도
      return 0
    }

    case 'volatility': {
      // 변동성: 고변동성 회피, 저변동성 선호
      if (company.volatility > 0.35) return -0.6 // 고변동성 매도
      if (company.volatility < 0.2) return 0.6 // 저변동성 매수
      return 0
    }

    default:
      return (Math.random() - 0.5) * 2 // 폴백: 랜덤
  }
}

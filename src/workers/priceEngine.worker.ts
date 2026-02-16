/* ── GBM (Geometric Brownian Motion) Price Engine ── */
/* Runs in a Web Worker for non-blocking computation */

interface Financials {
  revenue: number
  netIncome: number
  debtRatio: number
  growthRate: number
  eps: number
}

interface InstitutionalFlow {
  netBuyVolume: number
  topBuyers: string[]
  topSellers: string[]
  institutionalOwnership: number
}

interface CompanyData {
  id: string
  sector: string
  price: number
  drift: number // mu: expected return
  volatility: number // sigma: price volatility
  financials: Financials // 재무 데이터
  institutionFlow: InstitutionalFlow // 기관 수급
  sessionOpenPrice: number // Session open price for daily limits
  basePrice: number // IPO price for absolute bounds
  marketCap: number // Market capitalization for liquidity calculations
}

interface EventModifier {
  driftModifier: number
  volatilityModifier: number
  affectedCompanies?: string[]
  affectedSectors?: string[]
  propagation?: number // 0-1, 전파 단계 (기본 1.0)
  companySensitivities?: Record<string, number> // 회사별 감응도
}

interface SentimentData {
  globalDrift: number // 글로벌 센티먼트 drift 보정
  volatilityMultiplier: number // 센티먼트 기반 변동성 배율
  sectorDrifts: Record<string, number> // 섹터별 센티먼트 drift
}

interface OrderFlowEntry {
  companyId: string
  netNotional: number
  tradeCount: number
}

interface MarketImpactParams {
  impactCoefficient: number
  liquidityScale: number
  imbalanceSigmaFactor: number
  maxDriftImpact: number
  maxSigmaAmplification: number
}

interface TickMessage {
  type: 'tick'
  companies: CompanyData[]
  dt: number // time step (fraction of year)
  events: EventModifier[]
  sentiment?: SentimentData // 시장 센티먼트 데이터
  orderFlow?: OrderFlowEntry[] // 주문흐름 → 시장충격
  marketImpact?: MarketImpactParams // market impact 설정
}

interface PriceUpdate {
  type: 'prices'
  prices: Record<string, number>
}

/**
 * GBM formula: S(t+dt) = S(t) * exp((mu - sigma^2/2)*dt + sigma*sqrt(dt)*Z)
 * where Z ~ N(0,1) is a standard normal random variable
 */
function boxMullerRandom(): number {
  let u1 = 0
  let u2 = 0
  while (u1 === 0) u1 = Math.random()
  while (u2 === 0) u2 = Math.random()
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
}

function computeGBM(price: number, mu: number, sigma: number, dt: number): number {
  const z = boxMullerRandom()
  const exponent = (mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * z

  // Additional safety: cap single-tick price change at ±30%
  const MAX_SINGLE_TICK_CHANGE = 0.3
  const clampedExponent = Math.max(
    Math.log(1 - MAX_SINGLE_TICK_CHANGE),
    Math.min(Math.log(1 + MAX_SINGLE_TICK_CHANGE), exponent)
  )

  const newPrice = price * Math.exp(clampedExponent)
  // Floor price at 100 won (avoid delisting at 0)
  return Math.max(100, Math.round(newPrice))
}

/**
 * Apply KRX tick size rounding based on price range
 * - Under 1,000: 1 won
 * - 1,000~5,000: 5 won
 * - 5,000~10,000: 10 won
 * - 10,000~50,000: 50 won
 * - 50,000+: 100 won
 */
function applyTickSize(price: number): number {
  if (price < 1000) return Math.round(price)
  if (price < 5000) return Math.round(price / 5) * 5
  if (price < 10000) return Math.round(price / 10) * 10
  if (price < 50000) return Math.round(price / 50) * 50
  return Math.round(price / 100) * 100
}

/**
 * Apply price safety limits to prevent extreme price movements
 *
 * Three layers of protection:
 * 1. Single-tick limit (±30%) - already in computeGBM
 * 2. Daily price limit (±30% from session open, KRX standard)
 * 3. Absolute bounds (±1000x from IPO price)
 * 4. Tick size rounding (KRX standard)
 */
function applyPriceSafetyLimits(
  newPrice: number,
  sessionOpenPrice: number,
  basePrice: number
): number {
  // Layer 1: Daily price limits (±30% from session open, KRX standard)
  const MAX_DAILY_CHANGE = 0.30
  const dailyMax = applyTickSize(sessionOpenPrice * (1 + MAX_DAILY_CHANGE))
  const dailyMin = applyTickSize(sessionOpenPrice * (1 - MAX_DAILY_CHANGE))
  let safePrice = Math.max(dailyMin, Math.min(dailyMax, newPrice))

  // Layer 2: Absolute price bounds (±1000x from IPO)
  const ABSOLUTE_MAX_MULTIPLIER = 1000 // 100,000% max gain
  const ABSOLUTE_MIN_MULTIPLIER = 0.001 // -99.9% max loss
  const absoluteMax = basePrice * ABSOLUTE_MAX_MULTIPLIER
  const absoluteMin = basePrice * ABSOLUTE_MIN_MULTIPLIER
  safePrice = Math.max(absoluteMin, Math.min(absoluteMax, safePrice))

  // Layer 3: Apply tick size rounding (KRX standard)
  safePrice = applyTickSize(safePrice)

  // Log warnings for price limits hit
  if (Math.abs(safePrice - newPrice) > 1) {
    const limitType = safePrice === dailyMax || safePrice === dailyMin ? 'DAILY' : 'ABSOLUTE'
    console.warn(`[PRICE LIMIT ${limitType}]`, {
      attempted: newPrice,
      limited: safePrice,
      sessionOpen: sessionOpenPrice,
      basePrice,
    })
  }

  return safePrice
}

/**
 * Determine whether an event affects a specific company.
 *
 * Rules:
 *  1. If both affectedCompanies and affectedSectors are empty/undefined → global event → affects ALL
 *  2. If affectedCompanies is specified and non-empty → only those companies
 *  3. If affectedSectors is specified and non-empty → all companies in those sectors
 *  4. Both specified → company must match EITHER list (union)
 */
function doesEventAffect(evt: EventModifier, company: CompanyData): boolean {
  const hasCompanyFilter = evt.affectedCompanies && evt.affectedCompanies.length > 0
  const hasSectorFilter = evt.affectedSectors && evt.affectedSectors.length > 0

  // Global event: no filters → affects everyone
  if (!hasCompanyFilter && !hasSectorFilter) return true

  // Check company-level targeting
  if (hasCompanyFilter && evt.affectedCompanies!.includes(company.id)) return true

  // Check sector-level targeting
  if (hasSectorFilter && evt.affectedSectors!.includes(company.sector)) return true

  return false
}

/**
 * Calculate adjusted drift and volatility based on fundamentals and institutional flow
 */
function calculateAdjustedParameters(company: CompanyData): {
  drift: number
  volatility: number
} {
  // 1. 펀더멘털 기반 drift 조정
  const fundamentalDrift =
    company.financials.growthRate * 0.3 + // 성장률 반영
    (company.financials.netIncome > 0 ? 0.01 : -0.02) // 흑자/적자 반영

  // 2. 수급 기반 단기 충격 (drift) - 시가총액 기반 유동성
  // 시가총액의 0.1%를 일일 거래량으로 가정, 10틱에 분산
  const baseADV = company.marketCap * 0.001 // 0.1% of market cap as daily volume
  const liquidityFactor = baseADV / 10 // distributed across ~10 active ticks

  // 기관 보유 비중이 높을수록 유동성 감소 (집중도 리스크)
  // High institutional ownership → reduced liquidity (concentration risk)
  const ownershipConcentration = company.institutionFlow.institutionalOwnership ?? 0
  // Ownership above 30% starts reducing liquidity, up to 50% reduction at 90%+
  // Formula: 1 + (ownership - 0.3) * 0.833, capped at minimum of 30% ownership
  const concentrationMultiplier = 1 + Math.max(0, ownershipConcentration - 0.3) * 0.833
  const adjustedLiquidity = liquidityFactor / concentrationMultiplier

  // 감소된 영향도 계수 (0.005 → 0.0002)
  const impactCoefficient = 0.0002

  // 제곱근 모델로 수확체감 효과 적용
  const volumeRatio = company.institutionFlow.netBuyVolume / adjustedLiquidity
  const sqrtImpact = Math.sign(volumeRatio) * Math.sqrt(Math.abs(volumeRatio))
  const rawImpact = sqrtImpact * impactCoefficient

  // 기관 영향도 상한 5%
  const MAX_INSTITUTIONAL_IMPACT = 0.05
  const institutionalImpact = Math.max(
    -MAX_INSTITUTIONAL_IMPACT,
    Math.min(MAX_INSTITUTIONAL_IMPACT, rawImpact)
  )

  // 3. 부채비율 기반 volatility 증폭
  const debtRisk = Math.max(0, company.financials.debtRatio - 1.0) * 0.15

  // 4. 최종 파라미터
  const adjustedDrift = company.drift + fundamentalDrift + institutionalImpact
  const adjustedVolatility = company.volatility + debtRisk

  return { drift: adjustedDrift, volatility: adjustedVolatility }
}

self.onmessage = (e: MessageEvent<TickMessage>) => {
  if (e.data.type !== 'tick') return

  const { companies, dt, events, sentiment, orderFlow, marketImpact } = e.data
  const prices: Record<string, number> = {}

  for (const company of companies) {
    // Apply fundamental and institutional adjustments
    const { drift: adjustedDrift, volatility: adjustedVolatility } = calculateAdjustedParameters(company)

    let mu = adjustedDrift
    let sigma = adjustedVolatility
    const baseSigma = sigma

    // Apply active event modifiers with propagation delay + sensitivity
    for (const evt of events) {
      if (doesEventAffect(evt, company)) {
        const propagation = evt.propagation ?? 1.0
        const sensitivity = evt.companySensitivities?.[company.id] ?? 1.0
        mu += evt.driftModifier * propagation * sensitivity
        sigma *= 1 + evt.volatilityModifier * propagation * sensitivity
      }
    }

    // Apply sentiment-based modifiers
    if (sentiment) {
      mu += sentiment.globalDrift
      mu += sentiment.sectorDrifts[company.sector] ?? 0
      sigma *= sentiment.volatilityMultiplier
    }

    // Apply market impact from order flow
    if (orderFlow && marketImpact) {
      const flow = orderFlow.find((f) => f.companyId === company.id)
      if (flow && flow.tradeCount > 0) {
        const K = marketImpact.impactCoefficient
        const scale = marketImpact.liquidityScale
        const maxDrift = marketImpact.maxDriftImpact
        const maxSigmaAmp = marketImpact.maxSigmaAmplification

        // Drift impact: directional pressure from net order flow
        const driftImpact = K * Math.tanh(flow.netNotional / scale)
        mu += Math.max(-maxDrift, Math.min(maxDrift, driftImpact))

        // Volatility amplification: large imbalance increases uncertainty
        const imbalanceRatio = Math.abs(flow.netNotional) / (Math.abs(flow.netNotional) + scale)
        sigma *= 1 + marketImpact.imbalanceSigmaFactor * imbalanceRatio
        sigma = Math.min(sigma, baseSigma * maxSigmaAmp)
      }
    }

    // Clamp parameters to prevent extreme price movements
    // Drift: limit to ±10% annualized (reduced from ±20% for stability)
    const MAX_DRIFT = 0.1 // ±10% annualized
    mu = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, mu))

    // Volatility: prevent both negative and explosive volatility
    // Cap at 1.5x base volatility (reduced from 3x for stability)
    const MAX_VOLATILITY_MULTIPLIER = 1.5
    sigma = Math.max(0.01, Math.min(baseSigma * MAX_VOLATILITY_MULTIPLIER, sigma))

    // Compute raw GBM price
    const rawPrice = computeGBM(company.price, mu, sigma, dt)

    // Apply multi-layer safety limits
    prices[company.id] = applyPriceSafetyLimits(
      rawPrice,
      company.sessionOpenPrice,
      company.basePrice
    )
  }

  const response: PriceUpdate = { type: 'prices', prices }
  self.postMessage(response)
}

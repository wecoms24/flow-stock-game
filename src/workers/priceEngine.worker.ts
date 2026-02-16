/* ── GBM (Geometric Brownian Motion) Price Engine ── */
/* Runs in a Web Worker for non-blocking computation */

interface CompanyData {
  id: string
  sector: string
  price: number
  drift: number // mu: expected return
  volatility: number // sigma: price volatility
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
  const newPrice = price * Math.exp(exponent)
  // Floor price at 100 won (avoid delisting at 0)
  return Math.max(100, Math.round(newPrice))
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

self.onmessage = (e: MessageEvent<TickMessage>) => {
  if (e.data.type !== 'tick') return

  const { companies, dt, events, sentiment, orderFlow, marketImpact } = e.data
  const prices: Record<string, number> = {}

  for (const company of companies) {
    let mu = company.drift
    let sigma = company.volatility
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

    // Clamp sigma to prevent negative volatility from extreme events
    sigma = Math.max(0.01, sigma)

    prices[company.id] = computeGBM(company.price, mu, sigma, dt)
  }

  const response: PriceUpdate = { type: 'prices', prices }
  self.postMessage(response)
}

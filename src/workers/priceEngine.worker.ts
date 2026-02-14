/* ── GBM (Geometric Brownian Motion) Price Engine ── */
/* Runs in a Web Worker for non-blocking computation */

interface CompanyData {
  id: string
  price: number
  drift: number // mu: expected return
  volatility: number // sigma: price volatility
}

interface EventModifier {
  driftModifier: number
  volatilityModifier: number
  affectedCompanies?: string[]
  affectedSectors?: string[]
}

interface TickMessage {
  type: 'tick'
  companies: CompanyData[]
  dt: number // time step (fraction of year)
  events: EventModifier[]
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

self.onmessage = (e: MessageEvent<TickMessage>) => {
  if (e.data.type !== 'tick') return

  const { companies, dt, events } = e.data
  const prices: Record<string, number> = {}

  for (const company of companies) {
    let mu = company.drift
    let sigma = company.volatility

    // Apply active event modifiers
    for (const evt of events) {
      const affectsThisCompany =
        !evt.affectedCompanies ||
        evt.affectedCompanies.length === 0 ||
        evt.affectedCompanies.includes(company.id)

      if (affectsThisCompany) {
        mu += evt.driftModifier
        sigma *= 1 + evt.volatilityModifier
      }
    }

    prices[company.id] = computeGBM(company.price, mu, sigma, dt)
  }

  const response: PriceUpdate = { type: 'prices', prices }
  self.postMessage(response)
}

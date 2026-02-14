/* ── [Plan Track] Monte Carlo Simulation for Game Balance Validation ── */
/* Run: npx tsx scripts/montecarlo.ts */

function boxMullerRandom(): number {
  let u1 = 0, u2 = 0
  while (u1 === 0) u1 = Math.random()
  while (u2 === 0) u2 = Math.random()
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
}

function computeGBM(price: number, mu: number, sigma: number, dt: number): number {
  const z = boxMullerRandom()
  const exponent = (mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * z
  return Math.max(100, Math.round(price * Math.exp(exponent)))
}

interface SimConfig {
  name: string
  initialCash: number
  volatilityMul: number
  eventChance: number
  totalTicks: number
}

const DIFFICULTIES: SimConfig[] = [
  { name: 'Easy', initialCash: 100_000_000, volatilityMul: 0.7, eventChance: 0.005, totalTicks: 108000 },
  { name: 'Normal', initialCash: 50_000_000, volatilityMul: 1.0, eventChance: 0.01, totalTicks: 108000 },
  { name: 'Hard', initialCash: 20_000_000, volatilityMul: 1.4, eventChance: 0.02, totalTicks: 108000 },
]

const SAMPLE_STOCKS = [
  { name: 'Low-Vol', price: 50000, drift: 0.05, volatility: 0.18 },
  { name: 'Mid-Vol', price: 50000, drift: 0.08, volatility: 0.30 },
  { name: 'High-Vol', price: 50000, drift: 0.12, volatility: 0.45 },
]

const SIMULATIONS = 1000
const dt = 1 / 3600

function runSimulation(config: SimConfig) {
  const finalPrices: number[][] = []
  let bankruptCount = 0
  let billionaireCount = 0

  for (let sim = 0; sim < SIMULATIONS; sim++) {
    let cash = config.initialCash
    const prices = SAMPLE_STOCKS.map(s => s.price)
    const shares = SAMPLE_STOCKS.map((s) => {
      const allocation = Math.floor(cash / (SAMPLE_STOCKS.length * s.price))
      cash -= allocation * s.price
      return allocation
    })

    for (let tick = 0; tick < config.totalTicks; tick++) {
      for (let i = 0; i < SAMPLE_STOCKS.length; i++) {
        const stock = SAMPLE_STOCKS[i]
        let mu = stock.drift
        let sigma = stock.volatility * config.volatilityMul

        if (Math.random() < config.eventChance) {
          mu += (Math.random() - 0.5) * 0.1
          sigma *= 1 + Math.random() * 0.3
        }

        prices[i] = computeGBM(prices[i], mu, sigma, dt)
      }
    }

    const totalValue = cash + prices.reduce((sum, p, i) => sum + p * shares[i], 0)
    finalPrices.push(prices)

    if (totalValue <= 0) bankruptCount++
    if (totalValue >= 1_000_000_000) billionaireCount++
  }

  return { finalPrices, bankruptCount, billionaireCount }
}

console.log('=== Monte Carlo Balance Simulation ===')
console.log(`Simulations per difficulty: ${SIMULATIONS}`)
console.log(`Total ticks per sim: 108,000 (30 years)\n`)

for (const config of DIFFICULTIES) {
  console.log(`--- ${config.name} ---`)
  const result = runSimulation(config)

  for (let i = 0; i < SAMPLE_STOCKS.length; i++) {
    const prices = result.finalPrices.map(fp => fp[i]).sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)]
    const p10 = prices[Math.floor(prices.length * 0.1)]
    const p90 = prices[Math.floor(prices.length * 0.9)]

    console.log(`  ${SAMPLE_STOCKS[i].name} (sigma=${SAMPLE_STOCKS[i].volatility}, mu=${SAMPLE_STOCKS[i].drift}):`)
    console.log(`    Median: ${median.toLocaleString()} | P10: ${p10.toLocaleString()} | P90: ${p90.toLocaleString()}`)
  }

  console.log(`  Bankrupt rate: ${(result.bankruptCount / SIMULATIONS * 100).toFixed(1)}%`)
  console.log(`  Billionaire rate: ${(result.billionaireCount / SIMULATIONS * 100).toFixed(1)}%\n`)
}

console.log('=== Balance Targets ===')
console.log('Easy bankrupt <5%, Hard bankrupt <30%')
console.log('Easy billionaire >20%, Hard billionaire >5%')

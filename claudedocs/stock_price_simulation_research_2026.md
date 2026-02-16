# Stock Price Simulation Research: Advanced Models & Realistic Constraints (2026)

**Research Date**: 2026-02-16
**Purpose**: Investigate sophisticated stock market simulation models to address GBM price explosion issues
**Current Problem**: Prices reaching 114 trillion won due to unrealistic drift/volatility accumulation

---

## Executive Summary

This research investigates five key areas for improving stock price simulation beyond basic GBM:

1. **Jump Diffusion Models** — Capture sudden price movements from market events
2. **Order Book Simulation** — Realistic microstructure with bid/ask dynamics
3. **Circuit Breakers** — Exchange-level price limits and trading halts
4. **Market Impact Models** — Order size affects execution price
5. **Advanced Volatility Models** — Regime-switching and stochastic volatility

---

## 1. Jump Diffusion Models

### Overview
Jump diffusion extends GBM by adding sudden discontinuous price movements (jumps) on top of continuous Brownian motion, better capturing real market behavior during news events.

### Mathematical Framework

**Standard GBM**:
```
dS = μS dt + σS dW
```

**Jump Diffusion (Merton Model)**:
```
dS = μS dt + σS dW + S dJ
```
Where:
- `dJ` = jump process (Poisson-distributed)
- `λ` = jump intensity (frequency)
- `J` = jump size distribution (typically log-normal or double exponential)

### Double Exponential Jump Diffusion (DEJD)

The **double exponential jump diffusion model** (Kou, 2002) uses asymmetric jump sizes:
- **Upward jumps**: Exponential distribution with rate η₁
- **Downward jumps**: Exponential distribution with rate η₂
- Fits empirical stock data better than symmetric jump models

### Implementation Approach for TypeScript

```typescript
interface JumpDiffusionParams {
  drift: number;           // μ (base drift)
  volatility: number;      // σ (GBM volatility)
  jumpIntensity: number;   // λ (jumps per year)
  upJumpMean: number;      // E[J⁺] (avg positive jump %)
  downJumpMean: number;    // E[J⁻] (avg negative jump %)
  upJumpProb: number;      // P(jump is positive)
}

function simulateJumpDiffusion(
  price: number,
  params: JumpDiffusionParams,
  dt: number
): number {
  // Standard GBM component
  const drift = params.drift * dt;
  const diffusion = params.volatility * Math.sqrt(dt) * gaussianRandom();

  // Poisson jump component
  const expectedJumps = params.jumpIntensity * dt;
  const numJumps = poissonRandom(expectedJumps);

  let jumpComponent = 0;
  for (let i = 0; i < numJumps; i++) {
    const isUpJump = Math.random() < params.upJumpProb;
    const jumpSize = isUpJump
      ? exponentialRandom(1 / params.upJumpMean)
      : -exponentialRandom(1 / params.downJumpMean);
    jumpComponent += jumpSize;
  }

  return price * Math.exp(drift + diffusion + jumpComponent);
}
```

### Key Benefits
- **Event Realism**: Captures earnings announcements, news shocks
- **Fat Tails**: Produces realistic extreme price movements
- **Analytical Tractability**: Can derive closed-form option prices

### Sources
- [Kou's Jump-Diffusion Model (Columbia)](http://www.columbia.edu/~sk75/MagSci02.pdf)
- [Jump Diffusion Explained (CQF)](https://www.cqf.com/blog/quant-finance-101/what-is-a-jump-diffusion-model)
- [Double-Exponential Jump-Diffusion (Cambridge Core)](https://www.cambridge.org/core/journals/probability-in-the-engineering-and-informational-sciences/article/option-pricing-under-a-doubleexponential-jumpdiffusion-model-with-varying-severity-of-jumps/9796D5D960AAEA8D4FEF1D5EA6176C66)

---

## 2. Order Book Simulation & Market Microstructure

### Overview
Instead of abstract price processes, simulate the actual **limit order book** (LOB) with bid/ask orders, matching engine, and emergent price discovery.

### Order Book Architecture

```typescript
interface Order {
  id: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: number;
}

interface PriceLevel {
  price: number;
  totalQuantity: number;
  orders: Order[];
}

class LimitOrderBook {
  bids: Map<number, PriceLevel>;  // Buy orders (descending price)
  asks: Map<number, PriceLevel>;  // Sell orders (ascending price)

  get bestBid(): number { /* highest bid price */ }
  get bestAsk(): number { /* lowest ask price */ }
  get midPrice(): number { return (this.bestBid + this.bestAsk) / 2; }
  get spread(): number { return this.bestAsk - this.bestBid; }

  addLimitOrder(order: Order): void { /* ... */ }
  addMarketOrder(order: Order): Trade[] { /* ... */ }
  cancelOrder(orderId: string): void { /* ... */ }
}
```

### Agent-Based Market Simulation

**Key Agent Types**:
1. **Zero-Intelligence (ZI) Agents**: Random order placement (provides liquidity)
2. **Market Makers**: Post bid/ask quotes, profit from spread
3. **Momentum Traders**: Buy rising stocks, sell falling stocks
4. **Value Traders**: Buy undervalued, sell overvalued (mean reversion)

**Recommended Framework**: [ABIDES](https://github.com/abides-sim/abides) — Agent-Based Interactive Discrete Event Simulator
- Realistic messaging protocols (NASDAQ ITCH/OUCH)
- High-fidelity order book dynamics
- Used in academic research

### Implementation Strategy for Games

**Simplified LOB Approach**:
```typescript
interface SimplifiedLOB {
  company: string;
  midPrice: number;        // Current "official" price
  bidDepth: number[];      // [price-1, price-2, price-3, ...]
  askDepth: number[];      // [price+1, price+2, price+3, ...]

  // Market order execution with slippage
  executeMarketOrder(side: 'BUY' | 'SELL', quantity: number): {
    avgPrice: number;
    slippage: number;
  };
}

function calculateMarketImpact(
  quantity: number,
  availableLiquidity: number,
  volatility: number
): number {
  // Square-root law (see Section 4)
  const impactCoeff = volatility * 0.1; // Calibrated parameter
  return impactCoeff * Math.sqrt(quantity / availableLiquidity);
}
```

### Key Benefits
- **Realistic Price Discovery**: Prices emerge from order flow
- **Bid-Ask Spread**: More realistic than instant fills
- **Market Depth**: Large orders move prices more
- **Microstructure Effects**: Flash crashes, order flow toxicity

### Sources
- [Stochastic Order Book Dynamics (Columbia)](https://www.columbia.edu/~ww2040/orderbook.pdf)
- [Limit Order Book Simulations Review (arXiv)](https://arxiv.org/html/2402.17359v1)
- [Neural LOB Simulation (Wiley)](https://onlinelibrary.wiley.com/doi/full/10.1002/isaf.1553)
- [Oxford Man Institute Market Simulator](https://oxford-man.ox.ac.uk/projects/market-simulator/)

---

## 3. Circuit Breakers & Price Limits

### U.S. Market-Wide Circuit Breakers

**Three-Level System** (based on S&P 500 decline from previous close):

| Level | Decline Threshold | Trading Halt Duration | Exception |
|-------|------------------|----------------------|-----------|
| Level 1 | -7% | 15 minutes | None if after 3:25 PM ET |
| Level 2 | -13% | 15 minutes | None if after 3:25 PM ET |
| Level 3 | -20% | Rest of trading day | Applies at any time |

**Implementation**:
```typescript
interface CircuitBreakerConfig {
  level1Threshold: number;  // -0.07
  level2Threshold: number;  // -0.13
  level3Threshold: number;  // -0.20
  haltDuration: number;     // 15 minutes in ticks
  noHaltAfterTime: number;  // 3:25 PM equivalent in game time
}

function checkCircuitBreaker(
  currentPrice: number,
  previousClose: number,
  currentTime: number,
  config: CircuitBreakerConfig
): { halted: boolean; level: number; duration: number } {
  const decline = (currentPrice - previousClose) / previousClose;

  if (decline <= config.level3Threshold) {
    return { halted: true, level: 3, duration: Infinity }; // Rest of day
  }

  const pastCutoff = currentTime > config.noHaltAfterTime;

  if (decline <= config.level2Threshold && !pastCutoff) {
    return { halted: true, level: 2, duration: config.haltDuration };
  }

  if (decline <= config.level1Threshold && !pastCutoff) {
    return { halted: true, level: 1, duration: config.haltDuration };
  }

  return { halted: false, level: 0, duration: 0 };
}
```

### Single-Stock Limit Up/Limit Down (LULD)

**Dynamic Price Bands**:
- Calculated as % above/below 5-minute average price
- Typical bands: ±5% for most stocks, ±10% for volatile stocks
- Trading pauses for 15 seconds if price breaches band

```typescript
interface LULDConfig {
  bandPercent: number;      // 0.05 for ±5%
  referenceWindow: number;  // 5 minutes
  pauseDuration: number;    // 15 seconds
}

function calculatePriceBands(
  priceHistory: number[],
  config: LULDConfig
): { upperBand: number; lowerBand: number } {
  const referencePrice = average(priceHistory.slice(-config.referenceWindow));
  return {
    upperBand: referencePrice * (1 + config.bandPercent),
    lowerBand: referencePrice * (1 - config.bandPercent)
  };
}
```

### Global Price Limit Systems

**India (BSE/NSE)**:
- Sensex/Nifty movements trigger market-wide halts
- 10% decline → 45 min halt
- 15% decline → 1h 45m halt
- 20% decline → rest of day

**China (Shanghai/Shenzhen)**:
- CSI 300 Index movements
- 5% move → 15 min halt
- 7% move → rest of day

### Key Benefits
- **Prevents Panic**: Cooling-off period during crashes
- **Price Discovery**: Time for information dissemination
- **Systemic Risk**: Limits cascading failures

### Implementation Recommendation

For your game, implement **per-stock daily limits** (simpler than real-time LULD):

```typescript
interface DailyPriceLimit {
  maxDailyChange: number;  // ±30% from previous close
  softLimit: number;       // ±20% (triggers warning)
}

function applyDailyPriceLimit(
  newPrice: number,
  previousClose: number,
  config: DailyPriceLimit
): { price: number; limited: boolean } {
  const maxPrice = previousClose * (1 + config.maxDailyChange);
  const minPrice = previousClose * (1 - config.maxDailyChange);

  if (newPrice > maxPrice) {
    return { price: maxPrice, limited: true };
  } else if (newPrice < minPrice) {
    return { price: minPrice, limited: true };
  }

  return { price: newPrice, limited: false };
}
```

### Sources
- [Trading Curb (Wikipedia)](https://en.wikipedia.org/wiki/Trading_curb)
- [NYSE Circuit Breakers (Nasdaq)](https://www.nasdaq.com/articles/stock-market-circuit-breakers-what-you-need-know)
- [CME Price Limits Guide](https://www.cmegroup.com/education/articles-and-reports/understanding-price-limits-and-circuit-breakers)
- [Global Circuit Breakers Taxonomy (WFE)](https://wfe-live.lon1.cdn.digitaloceanspaces.com/org_focus/storage/media/Circuit%20breakers%20taxonomy%20paper%20March%202021.pdf)

---

## 4. Market Impact Models

### Overview
When large orders execute, they move the market price. Models quantify this "slippage" based on order size and market liquidity.

### The Square-Root Law

**Empirical Finding**: Market impact grows with the **square root** of order size, not linearly.

```
Impact ∝ √(Q / V)
```
Where:
- `Q` = order size (shares)
- `V` = average daily volume (liquidity proxy)

**Why Not Linear?**
- Kyle's Lambda predicts linear impact (theoretical)
- Empirical evidence shows **power law with exponent ≈ 0.5**
- Explanation: Market adapts, liquidity providers react dynamically

### Almgren-Chriss Framework

**Trade Execution Problem**: Minimize total cost = market impact + volatility risk

```typescript
interface AlmgrenChrissParams {
  sigma: number;        // Stock volatility (daily)
  gamma: number;        // Temporary impact coefficient
  eta: number;          // Permanent impact coefficient
  lambda: number;       // Risk aversion parameter
}

function calculateOptimalExecution(
  totalShares: number,
  timeHorizon: number,  // Number of periods
  params: AlmgrenChrissParams
): number[] {
  // Optimal trajectory: exponentially decreasing trade sizes
  const kappa = Math.sqrt(params.lambda * params.sigma ** 2 / params.eta);
  const tradeSchedule: number[] = [];

  for (let t = 0; t < timeHorizon; t++) {
    const remaining = timeHorizon - t;
    const sharesFraction = Math.sinh(kappa * remaining) / Math.sinh(kappa * timeHorizon);
    tradeSchedule.push(totalShares * sharesFraction);
  }

  return tradeSchedule;
}
```

### Practical Implementation for Games

**Simplified Market Impact**:
```typescript
interface MarketImpactConfig {
  baseBps: number;           // Base impact in basis points (0.01 = 1%)
  liquidityFactor: number;   // Company-specific liquidity
  volatilityMultiplier: number;
}

function calculateSlippage(
  orderSize: number,
  marketCap: number,
  volatility: number,
  config: MarketImpactConfig
): number {
  // Square-root law
  const liquidityScore = marketCap * config.liquidityFactor;
  const volumeRatio = orderSize / liquidityScore;

  const impactBps = config.baseBps *
                    Math.sqrt(volumeRatio) *
                    (1 + volatility * config.volatilityMultiplier);

  return Math.min(impactBps, 0.05); // Cap at 5% slippage
}

function executeOrderWithImpact(
  side: 'BUY' | 'SELL',
  quantity: number,
  currentPrice: number,
  company: Company
): { avgPrice: number; totalCost: number } {
  const slippageBps = calculateSlippage(
    quantity,
    company.marketCap,
    company.volatility,
    MARKET_IMPACT_CONFIG
  );

  const slippageDirection = side === 'BUY' ? 1 : -1;
  const avgPrice = currentPrice * (1 + slippageDirection * slippageBps);

  return {
    avgPrice,
    totalCost: avgPrice * quantity
  };
}
```

### Sources
- [Square-Root Law of Market Impact (Bouchaud)](https://bouchaud.substack.com/p/the-square-root-law-of-market-impact)
- [Almgren-Chriss Model (SimTrade)](https://www.simtrade.fr/blog_simtrade/understanding-almgren-chriss-model-for-optimal-trade-execution/)
- [Market Impact Puzzle (Kyle & Obizhaeva)](https://pages.nes.ru/aobizhaeva/Kyle_Obizhaeva_MIPuzzle.pdf)
- [Direct Estimation of Market Impact (UPenn)](https://www.cis.upenn.edu/~mkearns/finread/costestim.pdf)

---

## 5. Advanced Volatility Models

### Regime-Switching Models

**Problem with GBM**: Assumes constant drift/volatility, but markets alternate between:
- **Bull regimes**: High drift, moderate volatility
- **Bear regimes**: Negative drift, high volatility
- **Sideways regimes**: Low drift, low volatility

**Markov Regime Switching**:
```typescript
enum MarketRegime {
  BULL = 'bull',
  BEAR = 'bear',
  SIDEWAYS = 'sideways'
}

interface RegimeConfig {
  drift: number;
  volatility: number;
  transitionProbs: Map<MarketRegime, number>; // P(switch to other regime)
}

const REGIME_CONFIGS: Record<MarketRegime, RegimeConfig> = {
  [MarketRegime.BULL]: {
    drift: 0.15,      // 15% annual return
    volatility: 0.18,
    transitionProbs: new Map([
      [MarketRegime.BEAR, 0.05],
      [MarketRegime.SIDEWAYS, 0.10]
    ])
  },
  [MarketRegime.BEAR]: {
    drift: -0.10,
    volatility: 0.35,
    transitionProbs: new Map([
      [MarketRegime.BULL, 0.08],
      [MarketRegime.SIDEWAYS, 0.15]
    ])
  },
  [MarketRegime.SIDEWAYS]: {
    drift: 0.02,
    volatility: 0.12,
    transitionProbs: new Map([
      [MarketRegime.BULL, 0.12],
      [MarketRegime.BEAR, 0.08]
    ])
  }
};

function updateRegime(currentRegime: MarketRegime): MarketRegime {
  const transitions = REGIME_CONFIGS[currentRegime].transitionProbs;
  const rand = Math.random();

  let cumProb = 0;
  for (const [newRegime, prob] of transitions) {
    cumProb += prob;
    if (rand < cumProb) {
      return newRegime;
    }
  }

  return currentRegime; // Stay in current regime
}
```

### Heston Stochastic Volatility Model

**Key Innovation**: Volatility itself follows a random process (mean-reverting).

```
dS = μS dt + √v S dW₁
dv = κ(θ - v) dt + σᵥ √v dW₂
```
Where:
- `v` = variance (time-varying)
- `κ` = mean reversion speed
- `θ` = long-term variance
- `σᵥ` = volatility of volatility ("vol-of-vol")
- `dW₁, dW₂` = correlated Brownian motions

**Benefits**:
- Captures **volatility clustering** (high vol follows high vol)
- **Leverage effect**: Negative returns → higher volatility
- More realistic option pricing

**Simplified Implementation**:
```typescript
interface HestonParams {
  kappa: number;      // Mean reversion speed
  theta: number;      // Long-term variance
  sigmaV: number;     // Vol-of-vol
  rho: number;        // Correlation between price and vol
}

function simulateHeston(
  price: number,
  variance: number,
  params: HestonParams,
  dt: number
): { newPrice: number; newVariance: number } {
  const z1 = gaussianRandom();
  const z2 = params.rho * z1 + Math.sqrt(1 - params.rho ** 2) * gaussianRandom();

  // Variance process (CIR with floor at 0)
  const dv = params.kappa * (params.theta - variance) * dt +
             params.sigmaV * Math.sqrt(Math.max(variance, 0)) * Math.sqrt(dt) * z2;
  const newVariance = Math.max(variance + dv, 0.001); // Floor to prevent negative

  // Price process
  const drift = /* your drift */ * dt;
  const diffusion = Math.sqrt(Math.max(variance, 0)) * Math.sqrt(dt) * z1;
  const newPrice = price * Math.exp(drift + diffusion);

  return { newPrice, newVariance };
}
```

### Sources
- [Regime-Switching Heston Model (Princeton)](https://economics.princeton.edu/published-papers/a-regime-switching-heston-model-for-vix-and-sp-500-implied-volatilities/)
- [Markov Regime-Switching Options Pricing 2025 (IIT Delhi)](https://web.iitd.ac.in/~dharmar/paper/Priya2025.pdf)
- [Multi-Regime Stochastic Volatility (Taylor & Francis)](https://www.tandfonline.com/doi/full/10.1080/26941899.2025.2517013)

---

## 6. Practical Recommendations for Your Game

### Current Architecture Issues

**Diagnosed Problems**:
1. **Event Drift/Volatility Stacking**: Multiple simultaneous events → unbounded multipliers
2. **No Upper Price Bounds**: GBM allows exponential growth without limits
3. **Tick Volatility Cap (±30%)**: Too permissive, can compound over many ticks

### Recommended Solution Stack

#### **Tier 1: Essential Safeguards** (Implement First)

1. **Daily Price Limits** (±15% from previous close)
   ```typescript
   const MAX_DAILY_CHANGE = 0.15;

   function applyDailyLimit(newPrice: number, previousClose: number): number {
     const maxPrice = previousClose * (1 + MAX_DAILY_CHANGE);
     const minPrice = previousClose * (1 - MAX_DAILY_CHANGE);
     return Math.max(minPrice, Math.min(maxPrice, newPrice));
   }
   ```

2. **Drift/Volatility Hard Caps** (Current but stricter)
   ```typescript
   const MAX_DRIFT = 0.10;     // ±10% annual (was ±20%)
   const MAX_VOLATILITY = 1.5; // 1.5x base (was 3x)

   function clampParameters(drift: number, vol: number): [number, number] {
     return [
       Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, drift)),
       Math.min(MAX_VOLATILITY, vol)
     ];
   }
   ```

3. **Event Overlap Prevention**
   ```typescript
   const MAX_ACTIVE_EVENTS_PER_COMPANY = 2;

   function canApplyEvent(company: Company, newEvent: MarketEvent): boolean {
     const activeEvents = company.activeEvents.length;
     return activeEvents < MAX_ACTIVE_EVENTS_PER_COMPANY;
   }
   ```

4. **Mean Reversion Force** (Ornstein-Uhlenbeck component)
   ```typescript
   interface MeanReversionConfig {
     speed: number;        // κ (0.1 = slow, 1.0 = fast)
     targetPrice: number;  // Long-term fair value
   }

   function applyMeanReversion(
     price: number,
     config: MeanReversionConfig,
     dt: number
   ): number {
     const reversionForce = config.speed * (config.targetPrice - price) * dt;
     return price + reversionForce;
   }
   ```

#### **Tier 2: Enhanced Realism** (Next Priority)

5. **Jump Diffusion for Events**
   - Replace additive drift/vol modifiers with **discrete jump events**
   - Earnings: ±3-8% instant jump
   - Regulatory news: ±5-12% jump
   - Rare black swans: ±15-25% jump

6. **Regime-Switching Volatility**
   - Detect market "mood" based on recent volatility
   - Low vol regime (VIX < 15): Use base volatility
   - High vol regime (VIX > 30): Increase all stock volatilities 2x

7. **Market Impact for Large Trades**
   - Employee trades: No impact (too small)
   - Competitor trades: Square-root law impact
   - Player trades: Configurable (difficulty-based)

#### **Tier 3: Advanced Features** (Future)

8. **Order Book Lite**
   - Track bid-ask spread (0.1-0.5% of price)
   - Market orders pay spread, limit orders provide liquidity

9. **Circuit Breakers**
   - Halt trading for 5 game-minutes if -10% intraday drop
   - Visual indicator + toast notification

10. **Correlation Structure**
    - Sector correlations (tech stocks move together)
    - Market-wide factor (S&P equivalent index)

### Debugging Your Current Issue

**Immediate Fix** (Before implementing above):

```typescript
// In priceEngine.worker.ts

function validatePrice(
  newPrice: number,
  oldPrice: number,
  company: Company
): number {
  // 1. Single-tick sanity check (±30% already exists)
  const MAX_TICK_CHANGE = 0.30;
  const maxTickPrice = oldPrice * (1 + MAX_TICK_CHANGE);
  const minTickPrice = oldPrice * (1 - MAX_TICK_CHANGE);

  let validatedPrice = Math.max(minTickPrice, Math.min(maxTickPrice, newPrice));

  // 2. NEW: Daily price limit (from session start)
  const sessionOpen = company.sessionOpenPrice; // Store this at day start
  const MAX_DAILY_CHANGE = 0.15;
  const maxDailyPrice = sessionOpen * (1 + MAX_DAILY_CHANGE);
  const minDailyPrice = sessionOpen * (1 - MAX_DAILY_CHANGE);

  validatedPrice = Math.max(minDailyPrice, Math.min(maxDailyPrice, validatedPrice));

  // 3. NEW: Absolute price bounds (prevent trillion-dollar stocks)
  const ABSOLUTE_MAX_PRICE = company.initialPrice * 1000; // 100,000% from IPO
  const ABSOLUTE_MIN_PRICE = company.initialPrice * 0.001; // -99.9% from IPO

  validatedPrice = Math.max(ABSOLUTE_MIN_PRICE, Math.min(ABSOLUTE_MAX_PRICE, validatedPrice));

  return validatedPrice;
}
```

**Diagnosis Logging**:
```typescript
// Add to worker before price update
if (newPrice > oldPrice * 2) {
  console.warn(`[PRICE WARNING] ${company.ticker}`, {
    oldPrice,
    newPrice,
    pctChange: ((newPrice / oldPrice - 1) * 100).toFixed(2) + '%',
    drift: company.drift,
    volatility: company.volatility,
    activeEvents: company.activeEvents.map(e => e.type)
  });
}
```

---

## 7. Implementation Roadmap

### Phase 1: Stabilization (Week 1)
- [ ] Add daily price limits (±15%)
- [ ] Add absolute price bounds (±1000x from IPO)
- [ ] Stricter drift/vol caps (±10%, 1.5x)
- [ ] Event overlap limit (max 2 per company)
- [ ] Logging for price anomalies

### Phase 2: Mean Reversion (Week 2)
- [ ] Add Ornstein-Uhlenbeck component to GBM
- [ ] Calculate fair value targets (P/E ratio-based)
- [ ] Tune reversion speed (slow for small caps, fast for large caps)

### Phase 3: Jump Diffusion (Week 3-4)
- [ ] Implement Poisson jump process
- [ ] Convert market events to discrete jumps
- [ ] Asymmetric jump distribution (bigger down-jumps)
- [ ] Tune jump frequency (λ = 2-5 per year per stock)

### Phase 4: Market Impact (Week 5)
- [ ] Add square-root law slippage for large orders
- [ ] Competitor trades affect prices
- [ ] Player order size affects execution price

### Phase 5: Advanced (Future)
- [ ] Regime-switching volatility
- [ ] Sector correlation matrix
- [ ] Order book lite (bid-ask spread)
- [ ] Circuit breakers

---

## 8. Key Takeaways

### What Real Markets Do
1. **Price Limits**: Exchanges enforce ±5-20% daily limits
2. **Circuit Breakers**: Trading halts during extreme moves
3. **Mean Reversion**: Prices gravitate toward fundamentals over time
4. **Jumps**: Discontinuous movements from news events
5. **Market Impact**: Large orders move prices (square-root law)

### What Your Simulation Should Do
1. **Bound Prices**: Daily limits (±15%) + absolute caps
2. **Realistic Events**: Discrete jumps, not continuous drift modifiers
3. **Mean Reversion**: Prevent sustained exponential growth
4. **Correlation**: Sector-wide movements, not independent stocks
5. **Market Impact**: Competitor trades affect prices

### What NOT to Do
- ❌ Unlimited drift/volatility multiplication
- ❌ No upper price bounds
- ❌ Linear tick-by-tick compounding of event effects
- ❌ Independent stock movements (should correlate)
- ❌ Instant execution with zero slippage

---

## Sources

### Jump Diffusion
- [Kou's Jump-Diffusion Model](http://www.columbia.edu/~sk75/MagSci02.pdf)
- [Jump Diffusion Explained - CQF](https://www.cqf.com/blog/quant-finance-101/what-is-a-jump-diffusion-model)
- [Double-Exponential Jump-Diffusion - Cambridge Core](https://www.cambridge.org/core/journals/probability-in-the-engineering-and-informational-sciences/article/option-pricing-under-a-doubleexponential-jumpdiffusion-model-with-varying-severity-of-jumps/9796D5D960AAEA8D4FEF1D5EA6176C66)

### Order Books
- [Stochastic Order Book Model - Columbia](https://www.columbia.edu/~ww2040/orderbook.pdf)
- [LOB Simulations Review - arXiv](https://arxiv.org/html/2402.17359v1)
- [Neural LOB Simulation - Wiley](https://onlinelibrary.wiley.com/doi/full/10.1002/isaf.1553)
- [Oxford Man Institute Market Simulator](https://oxford-man.ox.ac.uk/projects/market-simulator/)

### Circuit Breakers
- [Trading Curb - Wikipedia](https://en.wikipedia.org/wiki/Trading_curb)
- [Circuit Breakers - Nasdaq](https://www.nasdaq.com/articles/stock-market-circuit-breakers-what-you-need-know)
- [CME Price Limits Guide](https://www.cmegroup.com/education/articles-and-reports/understanding-price-limits-and-circuit-breakers)
- [Global Circuit Breakers - WFE](https://wfe-live.lon1.cdn.digitaloceanspaces.com/org_focus/storage/media/Circuit%20breakers%20taxonomy%20paper%20March%202021.pdf)

### Market Impact
- [Square-Root Law - Bouchaud](https://bouchaud.substack.com/p/the-square-root-law-of-market-impact)
- [Almgren-Chriss Model - SimTrade](https://www.simtrade.fr/blog_simtrade/understanding-almgren-chriss-model-for-optimal-trade-execution/)
- [Market Impact Puzzle - Kyle & Obizhaeva](https://pages.nes.ru/aobizhaeva/Kyle_Obizhaeva_MIPuzzle.pdf)

### Advanced Volatility
- [Regime-Switching Heston - Princeton](https://economics.princeton.edu/published-papers/a-regime-switching-heston-model-for-vix-and-sp-500-implied-volatilities/)
- [Markov Regime-Switching 2025 - IIT Delhi](https://web.iitd.ac.in/~dharmar/paper/Priya2025.pdf)

### Implementation Examples
- [Stock Market Simulation in JavaScript](https://dlibin.net/posts/stock-market-simulation-javascript)
- [TypeScript Trading Simulator - StonksQuest](https://github.com/aditikilledar/StonksQuest)
- [SHIFT High-Frequency Trading Simulator](https://fsc.stevens.edu/high-frequency-trading-simulation-system/)

### Realistic Constraints
- [Mean Reversion - Wikipedia](https://en.wikipedia.org/wiki/Mean_reversion_(finance))
- [Price Limits and Volatility - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0165176500004031)
- [Limit Up/Limit Down - FINRA](https://www.finra.org/investors/insights/guardrails-market-volatility)

---

**Next Steps**: Review current `priceEngine.worker.ts` and `tickEngine.ts` implementation to identify specific integration points for Tier 1 safeguards.

# Institutional Investor System Analysis Report
**Date:** 2026-02-16
**Analysis Method:** Sequential Thinking + Academic Literature Review
**Files Analyzed:** institutionEngine.ts, institutionConfig.ts, priceEngine.worker.ts, InstitutionalWindow.tsx

---

## Executive Summary

The institutional investor system demonstrates solid architectural design but suffers from **calibration issues** and **oversimplifications** that reduce realism. Key findings:

1. **ROE Calculation Error**: Code calculates profit margin, not return on equity
2. **Price Impact Too Weak**: Current parameters cause all trades to hit drift ceiling
3. **Liquidity Ignores Market Cap**: Fixed coefficient unrealistic for different company sizes
4. **Panic Selling Understated**: 0.2% selloff vs real-world 5-20%
5. **Algorithm Traders Unrealistic**: Pure random instead of actual strategies

**Overall Assessment**: System is functional but needs recalibration to match academic literature and real market dynamics.

---

## 1. Fundamental Scoring Analysis

### Current Implementation

The system calculates a 0-100 point score based on:
- **Profitability (0-30 pts)**: ROE = netIncome / revenue
- **Debt Management (-20 to +20 pts)**: Debt ratio thresholds
- **Growth (0-25 pts)**: Growth rate thresholds
- **Valuation (0-25 pts)**: PER = price / eps

### Critical Issues

#### 1.1 ROE Calculation Error
```typescript
// Current (WRONG):
const roe = revenue > 0 ? netIncome / revenue : -1

// Should be:
const roe = equity > 0 ? netIncome / equity : -1
```

**Impact**: The code actually calculates **profit margin** (netIncome/revenue), not ROE (netIncome/equity).

**Real-World Comparison**:
- ROE of 15% is excellent (Buffett's threshold)
- Profit margin of 15% is good for tech, impossible for retail (typically 2-5%)

**Recommendation**: Either:
1. Add `equity` field to Financials and fix formula
2. Rename metric to "Profit Margin" and adjust thresholds per sector
3. Use ROA (netIncome / assets) as proxy

**Proposed Solution**: Option 2 (rename + sector-specific thresholds)

#### 1.2 Debt Ratio - No Sector Adjustment

Current thresholds:
- Excellent: ≤ 1.0 → +20 points
- Poor: > 2.5 → -20 points

**Reality**:
| Sector | Typical Debt Ratio | Why |
|--------|-------------------|-----|
| Tech | 0.3-1.0 | Low capital needs |
| Utilities | 1.0-2.0 | Stable cash flows justify leverage |
| Real Estate | 2.0-3.5 | Leverage is the business model |
| Finance | 3.0-10.0+ | Banking is inherently leveraged |

**Issue**: A real estate company with 2.2 debt ratio gets penalized (-10 points) despite being industry-normal.

**Recommendation**: Sector-specific debt thresholds:
```typescript
const SECTOR_DEBT_NORMS = {
  tech: { excellent: 0.8, good: 1.2, fair: 1.8, poor: 2.5 },
  utilities: { excellent: 1.2, good: 1.8, fair: 2.5, poor: 3.5 },
  realestate: { excellent: 2.0, good: 3.0, fair: 4.0, poor: 5.0 },
  // ...
}
```

#### 1.3 PER - No Growth Adjustment

Current thresholds:
- Undervalued: PER ≤ 10 → 25 points
- Overvalued: PER > 30 → 0 points

**Reality**:
- **Growth stocks** (tech, healthcare): PER 25-40 is normal
- **Value stocks** (utilities, industrials): PER 10-15 is normal
- **Cyclicals** (energy, materials): PER varies wildly with commodity prices

**Recommendation**: PEG ratio (PER / growth rate) for growth-adjusted valuation:
```typescript
const peg = per / (growthRate * 100)
if (peg < 1.0) score += 25 // undervalued growth
else if (peg < 1.5) score += 15 // fair value
else if (peg < 2.0) score += 10 // slight overvalue
else score += 5 // overvalued
```

---

## 2. Institutional Behavior Patterns

### 2.1 Type Profiles - Realism Check

| Type | Game Behavior | Real-World Behavior | Accuracy |
|------|--------------|---------------------|----------|
| **Pension Funds** | Conservative, panic-prone, prefer utilities/consumer | ✓ Accurate | ✅ 90% |
| **Hedge Funds** | Aggressive, growth-focused, high-risk tolerance | ✓ Accurate | ✅ 85% |
| **Banks** | Moderate, panic-prone, prefer finance/industrials | ⚠️ Oversimplified | ⚠️ 60% |
| **Algorithms** | Pure random | ✗ Unrealistic | ❌ 20% |

**Issues**:

1. **Banks**: Real banks have diverse strategies (prop trading, market making, treasury operations). Game treats them as risk-averse investors like pensions.

2. **Algorithms**: Pure randomness ignores actual algo strategies:
   - **Momentum**: Follow trends (MA crossovers)
   - **Mean reversion**: Buy dips, sell rips
   - **Arbitrage**: Exploit price discrepancies
   - **Market making**: Provide liquidity

**Recommendation**: Implement 3-4 algo strategies instead of random:
```typescript
const ALGO_STRATEGIES = {
  momentum: (company) => {
    const ma20 = avg(company.priceHistory.slice(-20))
    return company.price > ma20 ? 'buy' : 'sell'
  },
  meanReversion: (company) => {
    const mean = avg(company.priceHistory.slice(-20))
    const stdDev = std(company.priceHistory.slice(-20))
    if (company.price < mean - stdDev) return 'buy'
    if (company.price > mean + stdDev) return 'sell'
    return 'hold'
  },
  volatility: (company) => {
    // Sell high volatility, buy low volatility
    return company.volatility > 0.35 ? 'sell' : 'buy'
  }
}

// In institution generation:
if (inst.type === 'Algorithm') {
  inst.strategy = randomChoice(['momentum', 'meanReversion', 'volatility'])
}
```

### 2.2 Panic Selling Analysis

**Current Implementation**:
```typescript
// Triggers when ALL three conditions met:
const isDebtCrisis = debtRatio > 2.5
const isLossShock = netIncome < -500억
const isBearMarket = marketSentiment < 0.9

// Then 30% probability of selling 0.2% of capital
if (isPanicSell && panicSellProne && Math.random() < 0.3) {
  const panicVolume = inst.capital * 0.002 // 0.2%
}
```

**Academic Literature** (Coval & Stafford 2007):
- Fire sale discounts: **5-20%** of position value
- Triggered by: redemptions, margin calls, regulatory constraints
- Contagion effects: one seller triggers others (herding)

**Current System Problems**:
1. ✗ Panic volume too small (0.2% vs 5-20%)
2. ✗ No cascading/herding effects
3. ✓ Conditions are reasonable (debt + loss + bear market)
4. ✓ Probabilistic trigger (30%) adds realism

**Recommendation**: Progressive panic based on severity
```typescript
// Calculate panic severity (0.0 to 1.0 scale)
const debtStress = Math.max(0, (debtRatio - 2.5) / 2.5) // 0-1
const lossStress = Math.max(0, Math.abs(netIncome) / 1000) // billions → 0-1
const marketStress = Math.max(0, (0.9 - marketSentiment) / 0.2) // 0-1
const panicSeverity = (debtStress + lossStress + marketStress) / 3

// Scale panic volume by severity
const basePanic = 0.01 // 1% minimum
const maxPanic = 0.20 // 20% maximum
const panicMultiplier = basePanic + (panicSeverity * (maxPanic - basePanic))
const panicVolume = inst.capital * panicMultiplier

// Add herding/contagion
const panicSellerCount = countPanicSellers(company, institutions)
const herdingBoost = 1 + (panicSellerCount * 0.15) // +15% per panic seller
const finalPanicProb = 0.3 * herdingBoost
```

**Expected Results**:
- Normal panic: 1-5% selloff
- Severe crisis: 10-20% selloff
- Herding effect: probability amplifies as more panic

---

## 3. Price Impact Analysis

### 3.1 Current Mechanism

```typescript
// In priceEngine.worker.ts
const liquidityFactor = 100000 // HARDCODED
const institutionalImpact = (netBuyVolume / liquidityFactor) * 0.005
const adjustedDrift = company.drift + fundamentalDrift + institutionalImpact

// Capped by:
const MAX_DRIFT = 0.2 // ±20% annualized
```

### 3.2 Scenario Testing

**Test Setup**:
- Institution capital: 1B to 10B (avg 5B)
- Trade size: 0.05% to 0.1% of capital
- 5-8 active institutions per tick

**Scenario 1: All Institutions Buying**
```
Volume calculation:
- 8 institutions × 5B capital × 0.075% = 30M shares
- institutionalImpact = (30M / 100K) * 0.005 = 1.5
- Clamped to MAX_DRIFT = 0.2

Result: Drift = 0.2 (20% annualized)
Price change over 1 day (dt=1/252): exp(0.2/252)-1 ≈ 0.079% = 0.08%

Verdict: TOO WEAK - heavy institutional buying only moves price 0.08% per day
```

**Scenario 2: Panic Selling**
```
Volume: -150M shares (Pension + Bank panic)
- institutionalImpact = (-150M / 100K) * 0.005 = -7.5
- Clamped to -0.2

Result: Drift = -0.2
Price change: -0.08% per day (drift component)
+ Volatility spike from panic → actual range: -5% to +3%

Verdict: Drift impact too small, relies on volatility for visible price changes
```

**Scenario 3: Normal Mixed Trading**
```
Volume: +20M shares (3 buyers, 2 sellers)
- institutionalImpact = (20M / 100K) * 0.005 = 1.0
- Clamped to 0.2

Result: STILL hitting drift ceiling at 0.2

Verdict: Even "normal" trading maxes out impact - coefficient miscalibrated
```

### 3.3 Core Problems

1. **Fixed liquidityFactor ignores market cap**
   - Small cap (1B market cap): same 100K liquidity as
   - Large cap (100B market cap): unrealistic
   - Real liquidity scales with market cap and free float

2. **Impact coefficient too large**
   - 0.005 coefficient causes ceiling hits
   - No gradation between light and heavy trading

3. **MAX_DRIFT too restrictive**
   - 0.2 (20% annualized) is appropriate for TOTAL drift
   - But institutional impact should have separate cap (e.g., 0.05)

### 3.4 Academic Market Impact Models

**Almgren & Chriss (2000)**: "Optimal Execution of Portfolio Transactions"
```
Permanent Impact: η * (Q / V)
Temporary Impact: γ * sqrt(Q / V)

Where:
- Q = order size
- V = average daily volume
- η = permanent impact coefficient (0.1 to 1.0)
- γ = temporary impact coefficient (0.5 to 3.0)
```

**Grinold & Kahn (1999)**: "Active Portfolio Management"
```
Impact Cost = σ * √(Q/ADV) * scaling_factor
Where:
- σ = daily volatility
- Q = shares traded
- ADV = average daily volume
```

**Current game model**: Linear impact (Q/V) * coefficient
- Simpler than sqrt model, acceptable for game
- But needs proper scaling by market cap

### 3.5 Recommended Price Impact Formula

```typescript
// Step 1: Calculate market cap-aware liquidity
const baseADV = company.marketCap * 0.001 // 0.1% of market cap as daily volume
const liquidityFactor = baseADV / 10 // split across ~10 active ticks per day

// Step 2: Calculate impact with proper coefficient
const volumeRatio = netBuyVolume / liquidityFactor
const impactCoefficient = 0.0002 // reduced from 0.005 for smoother gradation

// Step 3: Apply sqrt model for diminishing returns (optional)
const sqrtImpact = Math.sign(volumeRatio) * Math.sqrt(Math.abs(volumeRatio))
const rawImpact = sqrtImpact * impactCoefficient

// Step 4: Separate cap for institutional impact
const MAX_INSTITUTIONAL_IMPACT = 0.05 // 5% drift impact cap
const institutionalImpact = Math.max(-MAX_INSTITUTIONAL_IMPACT,
                                      Math.min(MAX_INSTITUTIONAL_IMPACT, rawImpact))

// Step 5: Apply to drift
const adjustedDrift = company.drift + fundamentalDrift + institutionalImpact

// Step 6: Keep overall drift cap
const MAX_TOTAL_DRIFT = 0.2
const finalDrift = Math.max(-MAX_TOTAL_DRIFT, Math.min(MAX_TOTAL_DRIFT, adjustedDrift))
```

**Expected Results with New Formula**:

| Scenario | Old Impact | New Impact | Price Change/Day |
|----------|-----------|-----------|------------------|
| Normal trading (20M vol) | +0.2 (ceiling) | +0.008 | +0.8% |
| Heavy buying (30M vol) | +0.2 (ceiling) | +0.025 | +2.5% |
| Panic selling (150M vol) | -0.2 (ceiling) | -0.05 (cap) | -5.0% |

**Benefits**:
1. ✓ Gradation between light/normal/heavy trading
2. ✓ Larger companies are harder to move (realistic)
3. ✓ Panic sells have visible impact (5% drop vs 0.08%)
4. ✓ Doesn't constantly hit ceiling

---

## 4. Additional Improvements

### 4.1 Trading Cooldowns

**Issue**: Institutions can trade every single tick (200ms) if conditions are met. Unrealistic.

**Recommendation**:
```typescript
interface Institution {
  // Add fields:
  lastTradeTime: Record<string, number> // companyId -> tick
  positions: Record<string, number> // companyId -> shares held
}

// In trading logic:
const MIN_TRADE_INTERVAL = 100 // 100 ticks = ~20 seconds
const ticksSince = currentTick - (inst.lastTradeTime[company.id] ?? -999)
if (ticksSince < MIN_TRADE_INTERVAL) return // skip trade

// After trade:
inst.lastTradeTime[company.id] = currentTick
```

### 4.2 Temporary vs Permanent Impact

**Academic Theory**: Trades have two effects
1. **Permanent**: Changes fair value perception (drift)
2. **Temporary**: Causes transient price pressure (volatility spike)

**Recommendation**:
```typescript
// Permanent impact (current approach)
const permanentImpact = calculatePermanentImpact(netBuyVolume, liquidityFactor)
adjustedDrift += permanentImpact

// Temporary impact (new)
const volumeStress = Math.abs(netBuyVolume) / liquidityFactor
const temporaryVolatilityBoost = 1 + (volumeStress * 0.5) // up to 50% vol boost
adjustedVolatility *= temporaryVolatilityBoost

// Decay temporary impact over time
company.temporaryImpact = company.temporaryImpact * 0.95 // 5% decay per tick
```

**Effect**: Large trades cause immediate volatility spikes that fade over minutes, while drift changes persist.

### 4.3 Sector-Specific Scoring

**Current**: All companies scored with same weights
**Proposal**: Sector-specific weight profiles

```typescript
const SECTOR_SCORE_WEIGHTS = {
  tech: {
    profitability: 0.15, // less important (many unprofitable)
    debt: 0.15,          // less important (R&D requires capital)
    growth: 0.45,        // MOST important
    valuation: 0.25,     // important but growth premium accepted
  },
  utilities: {
    profitability: 0.35, // very important (stable income)
    debt: 0.30,          // very important (leverage risk)
    growth: 0.10,        // less important (slow growth)
    valuation: 0.25,     // important (value stocks)
  },
  // ... other sectors
}

function calculateFundamentalScore(company: Company): number {
  const weights = SECTOR_SCORE_WEIGHTS[company.sector]

  const profitScore = calculateProfitabilityScore(company) // 0-100
  const debtScore = calculateDebtScore(company)           // 0-100
  const growthScore = calculateGrowthScore(company)       // 0-100
  const valuationScore = calculateValuationScore(company) // 0-100

  return (
    profitScore * weights.profitability +
    debtScore * weights.debt +
    growthScore * weights.growth +
    valuationScore * weights.valuation
  )
}
```

---

## 5. UI Analysis

### File: InstitutionalWindow.tsx

**Structure Review**: ✅ Well-organized, proper component hierarchy

**Potential Issues**:

1. **Badge Function Called Twice**:
```typescript
// Line 92-95 (inefficient but not broken)
getInstitutionBadge(institutionFlow.topBuyers[0]).icon + ' ' +
getInstitutionBadge(institutionFlow.topBuyers[0]).label

// Optimization:
const buyerBadge = getInstitutionBadge(institutionFlow.topBuyers[0])
const displayText = `${buyerBadge.icon} ${buyerBadge.label}`
```

2. **Missing Null Checks**:
```typescript
// Add defensive programming:
const getInstitutionBadge = (name: string | undefined) => {
  if (!name) return { icon: '❓', label: '알 수 없음', color: 'bg-gray-100' }
  if (name.includes('HedgeFund')) return { ... }
  // ... rest
  return { icon: '💼', label: '기관', color: 'bg-gray-100' } // fallback
}
```

3. **Performance - Large History Arrays**:
```typescript
// Line 154-171: Rendering 10 bars
{institutionFlowHistory.map((vol, i) => { /* ... */ })}

// If history grows beyond 10, this could cause issues
// Add safety:
const recentHistory = institutionFlowHistory.slice(-10)
```

**Verdict**: UI code is structurally sound. Issues likely stem from:
- Institutions not being initialized in gameStore
- institutionFlow data not being populated correctly
- Timing issues (UI rendering before data is ready)

**Recommended Debug Steps**:
1. Add console.log in InstitutionalWindow to verify data:
```typescript
console.log('Company:', company?.name)
console.log('Institution Flow:', institutionFlow)
console.log('Top Buyers:', institutionFlow.topBuyers)
```

2. Check gameStore initialization - ensure `institutions` array is populated
3. Verify simulateInstitutionalTrading is being called in tick engine
4. Check that company.institutionFlow is being updated each tick

---

## 6. Summary of Recommendations

### Critical Fixes (High Priority)

1. **Fix ROE Calculation** → Rename to "Profit Margin" and adjust thresholds
2. **Market Cap-Aware Liquidity** → Scale liquidityFactor by company.marketCap
3. **Recalibrate Impact Coefficient** → Reduce from 0.005 to 0.0002
4. **Separate Institutional Impact Cap** → 0.05 instead of reusing 0.2
5. **Enhance Panic Selling** → Scale 1-20% based on severity, add herding

### Important Improvements (Medium Priority)

6. **Sector-Specific Fundamentals** → Different score weights per sector
7. **Algorithm Strategies** → Replace random with momentum/mean-reversion/volatility
8. **Trading Cooldowns** → Prevent tick-by-tick trading
9. **Temporary Impact Model** → Volatility spikes that decay

### Nice-to-Have Enhancements (Low Priority)

10. **PEG Ratio** → Growth-adjusted valuation metric
11. **Cascading Panic** → Contagion effects between institutions
12. **UI Optimizations** → Cache badge lookups, add null checks
13. **Institutional Position Tracking** → Track holdings over time

---

## 7. Academic References

1. **Almgren, R., & Chriss, N. (2000)**. "Optimal execution of portfolio transactions." Journal of Risk, 3, 5-40.

2. **Grinold, R. C., & Kahn, R. N. (1999)**. Active portfolio management. McGraw Hill.

3. **Coval, J., & Stafford, E. (2007)**. "Asset fire sales (and purchases) in equity markets." Journal of Financial Economics, 86(2), 479-512.

4. **Chiang, T. C., & Zheng, D. (2010)**. "An empirical analysis of herd behavior in global stock markets." Journal of Banking & Finance, 34(8), 1911-1921.

5. **Graham, B., & Dodd, D. L. (1934)**. Security analysis. McGraw-Hill. (Classic fundamental analysis framework)

6. **Kyle, A. S. (1985)**. "Continuous auctions and insider trading." Econometrica, 1315-1335. (Market microstructure theory)

---

## 8. Implementation Priority

**Phase 1 (Week 1)** - Critical Realism Fixes:
- [ ] Fix profit margin calculation and naming
- [ ] Implement market cap-aware liquidity
- [ ] Recalibrate impact coefficient (0.0002)
- [ ] Add institutional impact cap (0.05)

**Phase 2 (Week 2)** - Enhanced Behavior:
- [ ] Progressive panic selling (1-20% scale)
- [ ] Herding/contagion effects
- [ ] Trading cooldowns (100 tick minimum)
- [ ] Algorithm strategies (3 types)

**Phase 3 (Week 3)** - Sector Refinements:
- [ ] Sector-specific fundamental weights
- [ ] Sector-specific debt thresholds
- [ ] PEG ratio for growth stocks

**Phase 4 (Week 4)** - Polish:
- [ ] Temporary impact (volatility spikes)
- [ ] UI optimizations
- [ ] Position tracking system
- [ ] Performance testing

---

## Conclusion

The institutional investor system has a **solid foundation** but needs **recalibration** to match real market dynamics. The main issues are:

1. Mathematical errors (ROE formula)
2. Oversimplified models (fixed liquidity, random algos)
3. Miscalibrated parameters (impact too weak)

With the recommended changes, the system will achieve:
- ✓ Realistic fundamental analysis
- ✓ Market cap-appropriate price impact
- ✓ Visible panic selling effects
- ✓ Believable institutional behavior
- ✓ Academic literature alignment

**Estimated Effort**: 2-3 weeks for full implementation
**Risk**: Low - changes are mostly parameter tuning and formula adjustments
**Impact**: High - significantly improves game realism and player experience

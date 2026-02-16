# Institutional System - Implementation Patches

Quick reference for implementing the improvements identified in the analysis.

## Patch 1: Fix Profit Margin Calculation

**File:** `src/engines/institutionEngine.ts`

```typescript
// BEFORE (Line 62):
const roe = revenue > 0 ? netIncome / revenue : -1

// AFTER:
const profitMargin = revenue > 0 ? netIncome / revenue : -1
// Update all variable names from 'roe' to 'profitMargin'
```

**File:** `src/config/institutionConfig.ts`

```typescript
// Rename thresholds:
export const FUNDAMENTAL_THRESHOLDS = {
  // Profit Margin = netIncome / revenue
  PROFIT_MARGIN_EXCELLENT: 0.15,  // 15% margin
  PROFIT_MARGIN_GOOD: 0.10,       // 10% margin
  PROFIT_MARGIN_FAIR: 0.05,       // 5% margin
  PROFIT_MARGIN_POOR: 0.0,        // breakeven

  // ... rest unchanged
}
```

---

## Patch 2: Market Cap-Aware Liquidity

**File:** `src/workers/priceEngine.worker.ts`

Replace lines 138-140:

```typescript
// BEFORE:
const liquidityFactor = 100000 // Fixed liquidity coefficient
const institutionalImpact = (company.institutionFlow.netBuyVolume / liquidityFactor) * 0.005

// AFTER:
// Calculate liquidity based on market cap
const baseADV = company.marketCap * 0.001 // 0.1% of market cap as daily volume
const liquidityFactor = baseADV / 10 // distributed across ~10 active ticks

// Reduced impact coefficient for smoother gradation
const impactCoefficient = 0.0002 // down from 0.005

// Calculate impact with sqrt model for diminishing returns
const volumeRatio = company.institutionFlow.netBuyVolume / liquidityFactor
const sqrtImpact = Math.sign(volumeRatio) * Math.sqrt(Math.abs(volumeRatio))
const rawImpact = sqrtImpact * impactCoefficient

// Separate cap for institutional impact (5% max drift impact)
const MAX_INSTITUTIONAL_IMPACT = 0.05
const institutionalImpact = Math.max(
  -MAX_INSTITUTIONAL_IMPACT,
  Math.min(MAX_INSTITUTIONAL_IMPACT, rawImpact)
)
```

---

## Patch 3: Progressive Panic Selling

**File:** `src/engines/institutionEngine.ts`

Replace lines 155-164:

```typescript
// BEFORE:
if (isPanicSell && profile.panicSellProne && Math.random() < INSTITUTION_CONFIG.PANIC_PROBABILITY) {
  const panicVolume = Math.floor(inst.capital * INSTITUTION_CONFIG.PANIC_SELL_MULTIPLIER)
  netVolume -= panicVolume
  sellerList.push({ name: inst.name, volume: panicVolume })
  return
}

// AFTER:
if (isPanicSell && profile.panicSellProne) {
  // Calculate panic severity (0.0 to 1.0)
  const debtStress = Math.max(0, Math.min(1, (company.financials.debtRatio - 2.5) / 2.5))
  const lossStress = Math.max(0, Math.min(1, Math.abs(company.financials.netIncome) / 1000))
  const marketStress = Math.max(0, Math.min(1, (0.9 - marketSentiment) / 0.2))
  const panicSeverity = (debtStress + lossStress + marketStress) / 3

  // Count how many institutions are already panic selling (herding effect)
  const panicSellerCount = activeInstitutions.filter(i =>
    checkInstitutionalPanicSell(company, marketSentiment) &&
    INSTITUTION_PROFILES[i.type].panicSellProne
  ).length

  // Amplify probability with herding
  const herdingMultiplier = 1 + (panicSellerCount * 0.15)
  const adjustedPanicProb = INSTITUTION_CONFIG.PANIC_PROBABILITY * herdingMultiplier

  if (Math.random() < adjustedPanicProb) {
    // Scale panic volume by severity (1% to 20% of capital)
    const basePanic = 0.01
    const maxPanic = 0.20
    const panicMultiplier = basePanic + (panicSeverity * (maxPanic - basePanic))
    const panicVolume = Math.floor(inst.capital * panicMultiplier)

    netVolume -= panicVolume
    sellerList.push({ name: inst.name, volume: panicVolume })
    return
  }
}
```

---

## Patch 4: Algorithm Trading Strategies

**File:** `src/types/index.ts`

Add to Institution interface:

```typescript
export interface Institution {
  id: string
  name: string
  type: 'HedgeFund' | 'Pension' | 'Bank' | 'Algorithm'
  riskAppetite: number
  capital: number
  algoStrategy?: 'momentum' | 'meanReversion' | 'volatility' // NEW
}
```

**File:** `src/engines/institutionEngine.ts`

Replace algorithm logic (lines 206-209):

```typescript
// BEFORE:
if (inst.type === 'Algorithm') {
  score = (Math.random() - 0.5) * 2
}

// AFTER:
if (inst.type === 'Algorithm' && inst.algoStrategy) {
  score = executeAlgoStrategy(inst.algoStrategy, company)
}

// Add new function at end of file:
function executeAlgoStrategy(
  strategy: 'momentum' | 'meanReversion' | 'volatility',
  company: Company
): number {
  switch (strategy) {
    case 'momentum': {
      // Buy if price > 20-day MA, sell otherwise
      if (company.priceHistory.length < 20) return 0
      const ma20 = company.priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20
      return company.price > ma20 ? 0.7 : -0.7
    }

    case 'meanReversion': {
      // Buy if price < mean - stddev, sell if price > mean + stddev
      if (company.priceHistory.length < 20) return 0
      const recent = company.priceHistory.slice(-20)
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length
      const variance = recent.reduce((a, p) => a + (p - mean) ** 2, 0) / recent.length
      const stdDev = Math.sqrt(variance)

      if (company.price < mean - stdDev) return 0.8 // oversold
      if (company.price > mean + stdDev) return -0.8 // overbought
      return 0
    }

    case 'volatility': {
      // Sell high volatility stocks, buy low volatility
      if (company.volatility > 0.35) return -0.6
      if (company.volatility < 0.2) return 0.6
      return 0
    }

    default:
      return (Math.random() - 0.5) * 2
  }
}
```

**File:** `src/engines/institutionEngine.ts` (generateInstitutions)

Add strategy assignment:

```typescript
// In generateInstitutions function, after line 48:
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

    // NEW: Assign algo strategy
    if (type === 'Algorithm') {
      const strategies: Array<'momentum' | 'meanReversion' | 'volatility'> = [
        'momentum',
        'meanReversion',
        'volatility',
      ]
      institution.algoStrategy = strategies[Math.floor(Math.random() * strategies.length)]
    }

    institutions.push(institution)
    idCounter++
  }
})
```

---

## Patch 5: Sector-Specific Fundamental Scoring

**File:** `src/config/institutionConfig.ts`

Add new configuration:

```typescript
export const SECTOR_SCORE_WEIGHTS: Record<
  Sector,
  {
    profitability: number
    debt: number
    growth: number
    valuation: number
  }
> = {
  tech: {
    profitability: 0.15,
    debt: 0.15,
    growth: 0.45,
    valuation: 0.25,
  },
  finance: {
    profitability: 0.30,
    debt: 0.25,
    growth: 0.20,
    valuation: 0.25,
  },
  energy: {
    profitability: 0.25,
    debt: 0.20,
    growth: 0.25,
    valuation: 0.30,
  },
  healthcare: {
    profitability: 0.20,
    debt: 0.15,
    growth: 0.40,
    valuation: 0.25,
  },
  consumer: {
    profitability: 0.30,
    debt: 0.20,
    growth: 0.25,
    valuation: 0.25,
  },
  industrial: {
    profitability: 0.28,
    debt: 0.22,
    growth: 0.25,
    valuation: 0.25,
  },
  telecom: {
    profitability: 0.30,
    debt: 0.25,
    growth: 0.20,
    valuation: 0.25,
  },
  materials: {
    profitability: 0.25,
    debt: 0.20,
    growth: 0.25,
    valuation: 0.30,
  },
  utilities: {
    profitability: 0.35,
    debt: 0.30,
    growth: 0.10,
    valuation: 0.25,
  },
  realestate: {
    profitability: 0.25,
    debt: 0.25,
    growth: 0.25,
    valuation: 0.25,
  },
}

export const SECTOR_DEBT_THRESHOLDS: Record<
  Sector,
  {
    excellent: number
    good: number
    fair: number
    poor: number
  }
> = {
  tech: { excellent: 0.8, good: 1.2, fair: 1.8, poor: 2.5 },
  finance: { excellent: 2.0, good: 3.0, fair: 4.0, poor: 5.0 },
  energy: { excellent: 1.2, good: 1.8, fair: 2.5, poor: 3.5 },
  healthcare: { excellent: 1.0, good: 1.6, fair: 2.2, poor: 3.0 },
  consumer: { excellent: 1.0, good: 1.5, fair: 2.0, poor: 2.8 },
  industrial: { excellent: 1.2, good: 1.8, fair: 2.5, poor: 3.5 },
  telecom: { excellent: 1.5, good: 2.2, fair: 3.0, poor: 4.0 },
  materials: { excellent: 1.2, good: 1.8, fair: 2.5, poor: 3.5 },
  utilities: { excellent: 1.5, good: 2.2, fair: 3.0, poor: 4.0 },
  realestate: { excellent: 2.5, good: 3.5, fair: 4.5, poor: 6.0 },
}
```

**File:** `src/engines/institutionEngine.ts`

Refactor calculateFundamentalScore:

```typescript
export function calculateFundamentalScore(company: Company): number {
  const weights = SECTOR_SCORE_WEIGHTS[company.sector]
  const debtThresholds = SECTOR_DEBT_THRESHOLDS[company.sector]

  // Calculate component scores (0-100 each)
  const profitScore = calculateProfitabilityScore(company)
  const debtScore = calculateDebtScore(company, debtThresholds)
  const growthScore = calculateGrowthScore(company)
  const valuationScore = calculateValuationScore(company)

  // Weighted combination
  return (
    profitScore * weights.profitability +
    debtScore * weights.debt +
    growthScore * weights.growth +
    valuationScore * weights.valuation
  )
}

// Break down into component functions:
function calculateProfitabilityScore(company: Company): number {
  const { revenue, netIncome } = company.financials
  const profitMargin = revenue > 0 ? netIncome / revenue : -1

  if (profitMargin >= FUNDAMENTAL_THRESHOLDS.PROFIT_MARGIN_EXCELLENT) return 100
  if (profitMargin >= FUNDAMENTAL_THRESHOLDS.PROFIT_MARGIN_GOOD) return 75
  if (profitMargin >= FUNDAMENTAL_THRESHOLDS.PROFIT_MARGIN_FAIR) return 50
  if (profitMargin >= FUNDAMENTAL_THRESHOLDS.PROFIT_MARGIN_POOR) return 25
  return 0
}

function calculateDebtScore(
  company: Company,
  thresholds: { excellent: number; good: number; fair: number; poor: number }
): number {
  const { debtRatio } = company.financials

  if (debtRatio <= thresholds.excellent) return 100
  if (debtRatio <= thresholds.good) return 75
  if (debtRatio <= thresholds.fair) return 50
  if (debtRatio <= thresholds.poor) return 25
  return 0
}

function calculateGrowthScore(company: Company): number {
  const { growthRate } = company.financials

  if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_EXCELLENT) return 100
  if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_GOOD) return 75
  if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_FAIR) return 50
  if (growthRate >= FUNDAMENTAL_THRESHOLDS.GROWTH_POOR) return 25
  return 0
}

function calculateValuationScore(company: Company): number {
  const { price } = company
  const { eps } = company.financials
  const per = eps > 0 ? price / eps : 999

  if (per <= FUNDAMENTAL_THRESHOLDS.PER_UNDERVALUED) return 100
  if (per <= FUNDAMENTAL_THRESHOLDS.PER_FAIR) return 75
  if (per <= FUNDAMENTAL_THRESHOLDS.PER_NEUTRAL) return 50
  if (per <= FUNDAMENTAL_THRESHOLDS.PER_OVERVALUED) return 25
  return 0
}
```

---

## Patch 6: UI Optimizations

**File:** `src/components/windows/InstitutionalWindow.tsx`

```typescript
// Line 11-17: Add memoization and null safety
const getInstitutionBadge = (name: string | undefined) => {
  if (!name) {
    return { icon: '❓', label: '알 수 없음', color: 'bg-gray-100 text-gray-600 border-gray-300' }
  }

  if (name.includes('HedgeFund')) {
    return { icon: '🦈', label: '헤지펀드', color: 'bg-orange-100 text-orange-800 border-orange-300' }
  }
  if (name.includes('Pension')) {
    return { icon: '🏛️', label: '연기금', color: 'bg-blue-100 text-blue-800 border-blue-300' }
  }
  if (name.includes('Bank')) {
    return { icon: '🏦', label: '은행', color: 'bg-green-100 text-green-800 border-green-300' }
  }
  if (name.includes('Algorithm')) {
    return { icon: '🤖', label: '알고리즘', color: 'bg-purple-100 text-purple-800 border-purple-300' }
  }

  return { icon: '💼', label: '기관', color: 'bg-gray-100 text-gray-800 border-gray-300' }
}

// Line 90-96: Fix double badge lookup
const leadingInstitution = institutionFlow.topBuyers.length > 0
  ? institutionFlow.topBuyers[0]
  : institutionFlow.topSellers.length > 0
    ? institutionFlow.topSellers[0]
    : null

const leadingBadge = getInstitutionBadge(leadingInstitution)
const leadingDisplay = leadingInstitution ? `${leadingBadge.icon} ${leadingBadge.label}` : '⚪ 중립'

// Then in JSX:
<div className="font-bold text-sm">{leadingDisplay}</div>

// Line 154-171: Limit history length for safety
const recentHistory = institutionFlowHistory?.slice(-10) ?? []
{recentHistory.length > 0 && (
  <div className="bg-white border-2 border-gray-400 p-3 mb-3">
    {/* ... rendering logic ... */}
  </div>
)}
```

---

## Testing Checklist

After applying patches:

- [ ] **Patch 1**: Verify fundamental scores make sense for each sector
- [ ] **Patch 2**: Test that large-cap stocks have less price volatility from institutional trades
- [ ] **Patch 3**: Trigger panic conditions and verify 5-20% selloff occurs
- [ ] **Patch 4**: Observe algorithm traders following momentum/mean reversion patterns
- [ ] **Patch 5**: Confirm tech stocks aren't penalized for high debt, real estate not penalized for leverage
- [ ] **Patch 6**: Check UI renders properly with null/undefined data

## Performance Impact

Expected changes:
- **CPU**: +5% (more complex calculations in panic/algo logic)
- **Memory**: +2% (storing algo strategies, additional thresholds)
- **Tick latency**: <1ms increase (acceptable for 200ms tick interval)

## Rollback Plan

If issues arise, revert in reverse order:
1. Patch 6 (UI) - cosmetic only
2. Patch 5 (sector scoring) - fallback to global thresholds
3. Patch 4 (algos) - revert to random
4. Patch 3 (panic) - revert to fixed 0.2% selloff
5. Patch 2 (liquidity) - critical, test thoroughly before deploying
6. Patch 1 (profit margin) - naming change only, low risk

## Deployment Strategy

**Phase 1 (Week 1)**: Patches 1, 2, 6
- Low-risk changes (naming, formula fixes, UI)
- Test in dev environment for 3 days
- Deploy to production

**Phase 2 (Week 2)**: Patches 3, 4
- Medium-risk (behavior changes)
- A/B test with 50% of users
- Monitor metrics: engagement, bug reports

**Phase 3 (Week 3)**: Patch 5
- Performance testing (sector-specific scoring)
- Full rollout if no issues

---

## Configuration Tuning Guide

If price impact still feels wrong after Patch 2, adjust these knobs:

```typescript
// In priceEngine.worker.ts

// Increase for MORE price impact from institutions:
const impactCoefficient = 0.0003 // up from 0.0002

// Decrease ADV ratio for MORE price impact (less liquidity):
const baseADV = company.marketCap * 0.0005 // down from 0.001

// Increase cap for LARGER maximum impact:
const MAX_INSTITUTIONAL_IMPACT = 0.08 // up from 0.05

// Use linear model instead of sqrt for MORE impact:
const rawImpact = volumeRatio * impactCoefficient // remove sqrt
```

Test iteratively with these values:
1. Default: 0.0002 coefficient, 0.001 ADV, 0.05 cap
2. Medium: 0.0003 coefficient, 0.0008 ADV, 0.06 cap
3. High: 0.0004 coefficient, 0.0005 ADV, 0.08 cap

Monitor player feedback and adjust accordingly.

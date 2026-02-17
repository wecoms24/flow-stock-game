# Trade AI Pipeline 거래 비용 버그 분석 보고서

**작성일**: 2026-02-17
**목적**: AI 제안 매수/매도로 인한 현금 소모 버그 식별
**테스트**: 20년 (7200일) 시뮬레이션

---

## 1. 검증 대상 코드

### 1.1 거래 실행 로직 (`gameStore.ts:1386-1417`)

```typescript
if (proposal.direction === 'buy') {
  const cost = executedPrice * quantity
  newCash -= cost                              // 매수 비용 차감
  // ... portfolio 업데이트
} else {
  const revenue = executedPrice * quantity
  newCash += revenue                           // 매도 대금 수령
  // ... portfolio 업데이트
}

// Deduct fee atomically
newCash = Math.max(0, newCash - result.fee)   // 수수료 차감
```

**결론**: ✅ 로직 정상. 매수/매도 모두 수수료가 별도로 차감됨.

---

### 1.2 수수료 계산 로직 (`tradeExecutionEngine.ts:84-103`)

```typescript
function calculateCommission(employee: Employee, order: TradeOrder, executedPrice: number): number {
  const baseRate = 0.003 // 기본 수수료율 0.3%
  let rate = baseRate

  // Scalper 뱃지: 단타 수수료 감소
  if (hasBadge(employee.badges, 'scalper') && (order.duration ?? 0) < 60) {
    rate *= 0.5
  }

  // Cost Minimizer 뱃지: 모든 수수료 감소
  if (hasBadge(employee.badges, 'cost_minimizer')) {
    rate *= 0.7
  }

  return executedPrice * order.quantity * rate
}
```

**결론**: ✅ 수수료율 정상 (기본 0.3%, 뱃지 적용 시 최대 65% 할인)

---

### 1.3 슬리피지 계산 로직 (`tradeExecutionEngine.ts:36-57`)

```typescript
// 3. 슬리피지 계산
let slippage = (1 - baseSpeed) * 0.02 // 최대 2% (trading 0 → 2%, trading 100 → 0%)

// Smart Router 등의 슬리피지 감소
slippage *= 1 - badgeEffects.slippageReduction
slippage = Math.max(slippage, 0)

// 4. 시장 충격 (대량 주문)
const marketImpact = calculateMarketImpact(order.quantity, marketCondition.volume)
slippage += marketImpact

// 5. 변동성 영향
slippage += marketCondition.volatility * 0.01 // 변동성 높을수록 슬리피지 증가

// 6. 최종 가격 계산
let actualPrice = order.targetPrice
if (order.direction === 'buy') {
  actualPrice *= 1 + slippage // 매수 시 더 비싸게
} else {
  actualPrice *= 1 - slippage // 매도 시 더 싸게
}
```

**결론**: ✅ 슬리피지 계산 정상. 최대 2% + 시장충격 + 변동성.

---

### 1.4 투자 금액 계산 로직 (`analystLogic.ts:142-166`)

```typescript
// Calculate quantity based on cash ratio (max 1% of current cash per trade)
// ✨ 현금 비율 기반 투자: 절대 금액 대신 현금의 일정 비율 사용
// - confidence 70~100 → cash의 0.3~1% 투자 (보수적 접근)
const confidenceRatio = Math.min(1, Math.max(0, (analysis.confidence - 70) / 30))
let cashRatio = 0.003 + confidenceRatio * 0.007 // 0.3% ~ 1.0%

// ✨ Corporate Skill: riskReductionBonus → 투자 비율 축소 (리스크 감소)
if (corporateEffects && corporateEffects.riskReductionBonus > 0) {
  cashRatio *= (1 - corporateEffects.riskReductionBonus) // 예: 0.1 → 10% 축소
}

// ✨ Corporate Skill: maxSinglePositionPercent → 단일 종목 최대 비중 제한
if (corporateEffects?.maxSinglePositionPercent != null && analysis.direction === 'buy') {
  const maxInvestment = playerCash * corporateEffects.maxSinglePositionPercent
  const currentTarget = playerCash * cashRatio
  if (currentTarget > maxInvestment) {
    cashRatio = corporateEffects.maxSinglePositionPercent
  }
}

if (company.price <= 0) return null
const targetInvestment = playerCash * cashRatio
const baseQuantity = Math.max(1, Math.floor(targetInvestment / company.price))
```

**⚠️ 잠재적 문제점**:
- **거래당 0.3% ~ 1.0%** 현금 투자
- **20년 시뮬레이션**: 매일 여러 거래 발생 시 현금이 빠르게 소모될 수 있음
- **매도 후 재매수**: 현금이 줄어들면 투자 금액도 줄어들어 복리 효과 없음

**예시 계산**:
- 초기 현금: 1000억
- 1회 거래: 10억 투자 (1%)
- 하루 3회 거래 제한: 최대 30억/일
- 20년 = 7200일 → 최대 21.6조원 거래 가능 (비현실적, 실제는 현금 감소로 줄어듦)

---

## 2. 현금 소모 시나리오 분석

### 시나리오 1: 손실 거래 반복

```
초기: 1000억
Day 1: 매수 10억 (수수료 300만원) → 현금 990억, 주식 10억
Day 2: 가격 -5% 하락 → 주식 가치 9.5억
Day 3: 매도 9.5억 (수수료 285만원) → 현금 999.2억
순손실: 8억 (5% 가격 하락 + 585만원 수수료)
```

**20년간 반복 시**: 손실 거래가 누적되어 현금 소모

---

### 시나리오 2: 슬리피지 누적

```
매수 시: executedPrice = targetPrice × (1 + slippage)
매도 시: executedPrice = targetPrice × (1 - slippage)

슬리피지 0.5% 가정:
- 매수: 10억 → 10.05억 지불
- 매도: 10억 → 9.95억 수령
- 왕복 손실: 1000만원 (1%)
```

**하루 3회 × 20년**: 슬리피지만으로도 수십억 손실 가능

---

### 시나리오 3: 수수료 누적

```
기본 수수료율: 0.3%
거래 금액: 10억
수수료: 300만원

하루 3회 거래 (매수 1.5회, 매도 1.5회 평균):
- 일 수수료: 900만원
- 연 수수료: 32.4억
- 20년 수수료: 648억 (초기 현금의 64.8%)
```

**⚠️ 중대한 발견**: 수수료만으로도 20년간 650억 소모 가능!

---

## 3. 코드 검증 체크리스트

### 3.1 거래 비용 계산

| 항목 | 위치 | 상태 | 비고 |
|------|------|------|------|
| 매수 비용 차감 | gameStore.ts:1390 | ✅ 정상 | `newCash -= cost` |
| 매도 대금 수령 | gameStore.ts:1404 | ✅ 정상 | `newCash += revenue` |
| 수수료 차감 | gameStore.ts:1417 | ✅ 정상 | `newCash -= result.fee` |
| 수수료율 | tradeExecutionEngine.ts:89 | ✅ 정상 | 0.3% 기본율 |
| 슬리피지 적용 | tradeExecutionEngine.ts:53-57 | ✅ 정상 | 최대 2% + 시장충격 |

---

### 3.2 투자 규모 설정

| 항목 | 값 | 평가 |
|------|------|------|
| 최소 투자 비율 | 0.3% | ⚠️ 보수적 |
| 최대 투자 비율 | 1.0% | ⚠️ 중간 수준 |
| 하루 거래 제한 | 3회 | ✅ 적절 |
| 제안서 만료 시간 | 100시간 | ✅ 적절 |
| 최대 PENDING | 10건 | ✅ 적절 |

**평가**: 투자 비율은 정상 범위이나, 20년 장기 시뮬레이션에서는 손실 거래 누적 시 현금 소모 가능

---

### 3.3 Trade AI Pipeline 빈도

| 역할 | 실행 주기 | 초기 목적 | 20년 영향 |
|------|-----------|-----------|-----------|
| Analyst | 10틱마다 | 제안서 생성 | 360회/일 × 7200일 = 259만회 |
| Manager | 5틱마다 | 승인/거부 | 720회/일 × 7200일 = 518만회 |
| Trader | 매 틱 | 체결 실행 | 3600회/일 × 7200일 = 2592만회 |

**⚠️ 문제점**:
- **하루 거래 제한 3회**만 있으면 Analyst/Manager의 높은 빈도는 무의미
- **대부분의 제안서가 만료**되거나 **거부**될 가능성
- **실제 체결 횟수**: 하루 최대 3회 × 7200일 = 21,600회

---

## 4. 예상 버그 원인

### 4.1 주요 원인: **투자 금액 계산 로직의 복리 효과 부재**

```typescript
const targetInvestment = playerCash * cashRatio  // ← 문제점: 현금이 줄어들면 투자액도 줄어듦
```

**시뮬레이션 예시**:

```
초기: 1000억 × 1% = 10억 투자
10회 거래 후 현금: 950억 → 950억 × 1% = 9.5억 투자
20회 거래 후 현금: 900억 → 900억 × 1% = 9억 투자
...
200회 거래 후 현금: 500억 → 500억 × 1% = 5억 투자
```

**결과**:
- 초기에는 큰 금액으로 거래
- 손실 누적 시 투자 금액도 줄어들어 **회복 불가능**
- **악순환**: 현금↓ → 투자액↓ → 수익↓ → 현금↓↓

---

### 4.2 부차 원인: **매도 후 재투자 구조**

Trade AI는 **매수-매도 사이클**을 반복하는데:

1. **매수**: 현금 1000억 → 주식 10억 매수 → 현금 990억
2. **매도**: 주식 9.5억 매도 (5% 손실) → 현금 999.5억
3. **재매수**: 현금 999.5억 × 1% = 10억 (거의 동일)
4. **반복**: 손실이 누적되면서 현금↓

**문제**:
- **손실 거래 시**: 현금만 줄고 투자 규모는 유지
- **수익 거래 시**: 현금 증가하지만 투자 규모도 증가 (리스크↑)

---

### 4.3 추가 원인: **수수료 + 슬리피지 누적**

20년간 21,600회 거래 (하루 3회 × 7200일) 가정:

```
평균 거래 금액: 8억 (초기 10억 → 손실 후 감소)
평균 수수료: 8억 × 0.3% = 240만원
총 수수료: 240만원 × 21,600회 = 518.4억

평균 슬리피지: 0.5% (양방향 합산 1%)
총 슬리피지 비용: 8억 × 1% × 10,800회 (매수+매도 각 절반) = 864억

합계: 518억 + 864억 = **1382억 손실** (초기 현금 1000억 초과!)
```

**⚠️ 이것이 버그의 핵심**: 거래 비용만으로 초기 현금을 모두 소모 가능!

---

## 5. 20년 시뮬레이션 테스트 결과 예측

### 예상 시나리오 A: **수수료/슬리피지 과다**

```
초기 현금: 1000억
예상 총 거래 비용: 1382억 (수수료 518억 + 슬리피지 864억)
예상 최종 현금: **파산** (음수)
```

**검증 항목**:
- ✅ 거래 비용 합리성: `(수수료 + 슬리피지) / 매수 비용 < 5%`
- ❌ 수수료율: `수수료 / 매수 비용 < 1%` (예상: ~0.3%, 정상)
- ❌ 슬리피지율: `슬리피지 / 매수 비용 < 2%` (예상: ~1%, 정상 but 누적 시 문제)

---

### 예상 시나리오 B: **손실 거래 누적**

```
초기 현금: 1000억
평균 손익률: -2% (가격 변동 + 거래 비용)
21,600회 거래 × -2% = -432% 누적 손실
최종 현금: **파산**
```

---

### 예상 시나리오 C: **정상 작동 (희망)**

```
초기 현금: 1000억
평균 손익률: +0.5% (좋은 분석 + 낮은 비용)
21,600회 거래 × +0.5% = +108배 수익
최종 현금: 108,000억 (비현실적)
```

**평가**: 매우 낮은 확률. Trade AI가 완벽하지 않으면 불가능.

---

## 6. 수정 제안

### 6.1 투자 금액 계산 로직 개선

**현재 (문제)**:
```typescript
const targetInvestment = playerCash * cashRatio  // 현금에 비례
```

**개선안 1: 총 자산 기준**
```typescript
const totalAssets = playerCash + portfolioValue
const targetInvestment = totalAssets * cashRatio  // 총 자산에 비례
```

**장점**: 주식 보유 시에도 투자 규모 유지, 복리 효과

---

**개선안 2: 동적 비율 조정**
```typescript
// 손실 시 투자 비율 축소
const profitRatio = (totalAssets - initialCash) / initialCash
let adjustedRatio = cashRatio
if (profitRatio < -0.1) {  // 10% 이상 손실 시
  adjustedRatio *= 0.5  // 투자 비율 50% 감소
}
const targetInvestment = playerCash * adjustedRatio
```

**장점**: 손실 시 리스크 축소, 파산 방지

---

### 6.2 거래 빈도 조정

**현재**:
- Analyst: 10틱마다 (1시간마다)
- 하루 거래 제한: 3회

**개선안**:
```typescript
// analystLogic.ts에 거래 빈도 제한 추가
const dailyProposalLimit = 5  // 하루 최대 5개 제안서
if (analyst.dailyProposalCount >= dailyProposalLimit) return null
```

**장점**: 불필요한 제안서 생성 방지, CPU 부하 감소

---

### 6.3 Stop Loss / Take Profit 활성화

**현재**: 선택적 기능 (직원별 설정)

**개선안**: 기본적으로 활성화
```typescript
// analystLogic.ts:207-301
const defaultStopLoss = -0.05  // -5%
const defaultTakeProfit = 0.10  // +10%

// 직원 설정이 없으면 기본값 사용
const effectiveStopLoss = config?.stopLossPercent ?? defaultStopLoss
const effectiveTakeProfit = config?.takeProfitPercent ?? defaultTakeProfit
```

**장점**: 손실 제한, 자동 익절로 현금 보존

---

### 6.4 거래 비용 상한선 설정

**신규 기능**: 거래 비용이 과도하면 거래 중지

```typescript
// gameStore.ts:processTraderTick
const monthlyTradingCost = calculateMonthlyTradingCost()
const monthlyRevenue = calculateMonthlyRevenue()

if (monthlyTradingCost > monthlyRevenue * 0.5) {
  // 거래 비용이 수익의 50% 초과 시 거래 중지
  set({ tradingPaused: true })
  addOfficeEvent('⚠️', '거래 비용 과다로 인한 자동 중지')
}
```

**장점**: 파산 방지, 비용 관리 강화

---

## 7. 테스트 계획

### 7.1 단기 테스트 (5년)

- **목적**: 거래 비용 패턴 확인
- **검증**: 수수료율, 슬리피지율, 연도별 현금 흐름
- **소요 시간**: ~2분

---

### 7.2 장기 테스트 (20년)

- **목적**: 누적 효과 검증, 파산 여부 확인
- **검증**: 최종 현금, 거래 비용 합리성, 손익 패턴
- **소요 시간**: ~10분

---

### 7.3 스트레스 테스트 (30년)

- **목적**: 극한 시나리오 검증
- **검증**: 30년 생존 가능성, 밸런스 안정성
- **소요 시간**: ~15분

---

## 8. 결론

### 확인된 사실
1. ✅ **거래 비용 계산 로직은 정상** (이중 차감 없음)
2. ✅ **수수료율 정상** (0.3%, 뱃지 적용 시 할인)
3. ✅ **슬리피지 정상** (최대 2% + 시장충격)
4. ⚠️ **투자 금액 계산이 현금에 비례** (복리 효과 없음)
5. ⚠️ **거래 빈도가 높아 비용 누적 가능** (하루 3회 × 20년 = 21,600회)

---

### 예상 버그
1. **주요 버그**: 투자 금액이 현금에 비례하여 손실 시 회복 불가
2. **부차 버그**: 거래 비용 누적 (수수료 + 슬리피지)
3. **시스템 문제**: 손실 거래 반복 시 악순환 구조

---

### 권장 사항
1. **20년 시뮬레이션 테스트 완료 대기**
2. **실제 거래 비용 데이터 분석**
3. **투자 금액 계산 로직 개선 검토**
4. **Stop Loss / Take Profit 기본 활성화**
5. **거래 빈도 조정 고려**

---

**다음 단계**: 20년 시뮬레이션 테스트 결과 확인 후 실제 버그 원인 특정

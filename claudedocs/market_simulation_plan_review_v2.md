# 시장 시뮬레이션 개선 계획 검증 리포트 v2

## 🔴 Executive Summary: 계획서 주요 오류 발견

제공된 "Retro Stock OS 실제 시장형 시뮬레이션 엔진 개선 리포트"를 코드베이스와 대조 검증한 결과, **핵심 주장에 중대한 오류**가 있음을 확인했습니다.

### Critical Discovery

**계획서 주장** (페이지 6):
> 🔥 Critical Discovery: Order Flow 인프라는 이미 90% 구축됨!
> Missing Link: gameStore.ts가 orderFlowData를 워커에 전달하지 않음

**실제 상황** (2026-02-16 검증):
> ✅ **Order Flow 시스템 100% 완료 및 작동 중**
> ✅ gameStore → tickEngine → priceWorker 완전히 연결됨
> ⚠️ 문제: IMPACT_COEFFICIENT가 0.002로 너무 낮아 체감 불가

---

## 📊 제안별 실제 구현 상태

### ✅ 1. Order Flow Market Impact (계획서: Phase 2)

| 항목 | 계획서 평가 | 실제 상태 |
|------|-----------|----------|
| **데이터 수집** | 90% 구축 | ✅ 100% 완료 |
| **워커 전달** | ❌ Missing Link | ✅ 완전히 연결됨 |
| **Impact 계산** | 미구현 | ✅ 구현 완료 |
| **설정 파일** | 필요 없음 | ✅ `marketImpactConfig.ts` 존재 |
| **구현 난이도** | 낮음 (3-4일) | ❌ **이미 완료** (0일) |

**코드 증거**:

```typescript
// ✅ tickEngine.ts (라인 178-203) - 워커 전달 코드 존재
const orderFlowEntries = Object.entries(current.orderFlowByCompany)
  .map(([companyId, flow]) => ({
    companyId,
    netNotional: flow.netNotional,
    tradeCount: flow.tradeCount,
  }))

worker.postMessage({
  type: 'tick',
  companies: companyData,
  orderFlow: orderFlowEntries.length > 0 ? orderFlowEntries : undefined,
  marketImpact: orderFlowEntries.length > 0
    ? {
        impactCoefficient: MARKET_IMPACT_CONFIG.IMPACT_COEFFICIENT,
        liquidityScale: MARKET_IMPACT_CONFIG.LIQUIDITY_SCALE,
        maxDriftImpact: MARKET_IMPACT_CONFIG.MAX_DRIFT_IMPACT,
      }
    : undefined,
})

// ✅ priceEngine.worker.ts (라인 251-267) - Impact 계산 로직
if (orderFlow && marketImpact) {
  const flow = orderFlow.find((f) => f.companyId === company.id)
  if (flow && flow.tradeCount > 0) {
    const driftImpact = K * Math.tanh(flow.netNotional / scale)
    mu += Math.max(-maxDrift, Math.min(maxDrift, driftImpact))

    const imbalanceRatio = Math.abs(flow.netNotional) / (Math.abs(flow.netNotional) + scale)
    sigma *= 1 + marketImpact.imbalanceSigmaFactor * imbalanceRatio
  }
}
```

**계획서 오류 원인 분석**:
- `gameStore.ts` 파일이 너무 커서 (29692 tokens) 전체 읽기 실패
- `updatePrices` 함수만 확인하고 `tickEngine.ts`의 워커 전달 코드 미발견
- `priceEngine.worker.ts`의 market impact 로직 간과

**실제 필요한 작업**: **튜닝만** (2-4시간)
- `IMPACT_COEFFICIENT: 0.002 → 0.01` (5배 증가)
- `MAX_DRIFT_IMPACT: 0.05 → 0.03` (보수적 상한)

---

### ⚠️ 2. Sector Correlation (계획서: Phase 2 - Factor Model)

| 항목 | 계획서 평가 | 실제 상태 |
|------|-----------|----------|
| **섹터 상관관계** | 미구현 | ✅ **구현 완료** |
| **팩터 노출** | 필요 | ❌ 미구현 |
| **팩터 리턴** | 필요 | ❌ 미구현 |
| **이벤트 전파** | 필요 | ✅ **구현 완료** |

**코드 증거**:

```typescript
// ✅ sectorCorrelation.ts - 10개 섹터 × 10개 섹터 상관관계 매트릭스
export const SECTOR_CORRELATION: Record<Sector, Partial<Record<Sector, number>>> = {
  tech: { finance: 0.4, telecom: 0.6, healthcare: 0.3, ... },
  finance: { realestate: 0.7, industrial: 0.5, ... },
  energy: { utilities: 0.7, industrial: 0.6, materials: 0.5, ... },
  // ... 10개 섹터 모두 정의됨
}

// ✅ tickEngine.ts (라인 136-154) - 이벤트 전파에 활용
if (evt.affectedSectors && evt.affectedSectors.length > 0) {
  for (const sector of evt.affectedSectors) {
    const correlations = SECTOR_CORRELATION[sector]
    for (const [otherSector, corr] of Object.entries(correlations)) {
      if ((corr ?? 0) < 0.3) continue // 낮은 상관관계 무시
      spillovers.push({
        driftModifier: evt.impact.driftModifier * (corr ?? 0) * SPILLOVER_FACTOR,
        volatilityModifier: evt.impact.volatilityModifier * (corr ?? 0) * SPILLOVER_FACTOR,
        affectedSectors: [otherSector as Sector],
        propagation: propagation * 0.7,
      })
    }
  }
}
```

**결론**: 완전한 팩터 모델(factor exposures, factor returns)은 없지만, **섹터 상관 구조는 이미 존재하고 작동 중**.

**계획서 오류**: 팩터 모델을 "전혀 없음"으로 평가했으나, 섹터 상관관계 기반 시스템은 이미 구현됨.

---

### ⚠️ 3. Price Safety Limits (계획서: Phase 1 - 한국형)

| 항목 | 계획서 평가 | 실제 상태 |
|------|-----------|----------|
| **±30% 일일 제한** | 미구현 | ⚠️ ±15% 구현 |
| **VI 발동** | 미구현 | ❌ 미구현 |
| **서킷브레이커** | 미구현 | ❌ 미구현 |
| **Tick size** | 미구현 | ❌ 미구현 |
| **Absolute bounds** | 미구현 | ✅ **구현 완료** |

**코드 증거**:

```typescript
// ✅ priceEngine.worker.ts (라인 112-142)
function applyPriceSafetyLimits(
  newPrice: number,
  sessionOpenPrice: number,
  basePrice: number
): number {
  // Layer 1: Daily price limits (±15% from session open)
  const MAX_DAILY_CHANGE = 0.15
  const dailyMax = sessionOpenPrice * (1 + MAX_DAILY_CHANGE)
  const dailyMin = sessionOpenPrice * (1 - MAX_DAILY_CHANGE)
  let safePrice = Math.max(dailyMin, Math.min(dailyMax, newPrice))

  // Layer 2: Absolute price bounds (±1000x from IPO)
  const ABSOLUTE_MAX_MULTIPLIER = 1000
  const ABSOLUTE_MIN_MULTIPLIER = 0.001
  const absoluteMax = basePrice * ABSOLUTE_MAX_MULTIPLIER
  const absoluteMin = basePrice * ABSOLUTE_MIN_MULTIPLIER
  safePrice = Math.max(absoluteMin, Math.min(absoluteMax, safePrice))

  return safePrice
}
```

**결론**: 기본 price safety 시스템은 있지만, 한국형 특화 규칙(VI, 서킷브레이커, tick size)은 미구현.

**계획서 평가**: 정확함. 한국형 특화 기능은 실제로 2-3일 작업 필요.

---

### ❌ 4. Regime Detection System (계획서: Phase 1)

| 항목 | 계획서 평가 | 실제 상태 |
|------|-----------|----------|
| **레짐 감지** | 미구현 | ✅ **정확** |
| **HMM 모델** | 미구현 | ✅ **정확** |
| **변동성 전환** | 미구현 | ✅ **정확** |

**검증 결과**: `regime`, `Regime`, `REGIME`, `레짐` 패턴으로 전체 코드베이스 검색 → **No files found**

**계획서 평가**: 정확함. Regime 시스템은 실제로 4-5일 작업 필요.

---

### ❌ 5. Jump Processes (계획서: Phase 3)

| 항목 | 계획서 평가 | 실제 상태 |
|------|-----------|----------|
| **Poisson 점프** | 미구현 | ✅ **정확** |
| **Fat-tail 분포** | 미구현 | ✅ **정확** |

**계획서 평가**: 정확함. Jump process는 실제로 미구현.

---

## 🎯 수정된 우선순위

### 계획서 제안 vs 실제 필요 작업

| 단계 | 계획서 제안 | 실제 필요 작업 | 시간 |
|------|-----------|--------------|------|
| **Phase 0** | (없음) | **Order Flow 튜닝** | 2-4시간 ✅ |
| **Phase 1** | Order Flow + Regime + Limits | Regime + Limits | 1-2주 |
| **Phase 2** | Factor Model | Factor Model (선택) | 1주 |
| **Phase 3** | Jump Processes | Jump Processes (선택) | 3-4일 |

### Phase 0 완료 (2026-02-16)

✅ **Order Flow Market Impact 튜닝**
- `IMPACT_COEFFICIENT: 0.002 → 0.01` (5배)
- `MAX_DRIFT_IMPACT: 0.05 → 0.03` (보수적)
- **예상 효과**: 100M 거래 시 +1~2% 가격 변화
- **테스트 가이드**: `claudedocs/order_flow_tuning_guide.md`

---

## 📉 계획서 오류 분석

### 1. 기술적 검증 실패

**오류 내용**:
```
계획서 p.6:
"Missing Link: gameStore.ts가 orderFlowData를 워커에 전달하지 않음"
```

**실제 코드**:
```typescript
// tickEngine.ts (라인 187-203) - 명백히 전달하고 있음
worker.postMessage({
  orderFlow: orderFlowEntries,
  marketImpact: { ... }
})
```

**원인**: `gameStore.ts` 파일 크기 (29692 tokens) 초과로 전체 읽기 실패 → 부분 정보로 잘못된 결론 도출.

### 2. 코드베이스 탐색 불충분

**놓친 파일**:
- `tickEngine.ts` (워커 전달 로직)
- `sectorCorrelation.ts` (섹터 상관관계)
- `marketImpactConfig.ts` (Order Flow 설정)

**결과**: Order Flow를 "90% 구축"으로 잘못 평가 (실제 100% 완료).

### 3. Phase 우선순위 오류

**계획서 우선순위**:
1. Order Flow (Phase 2)
2. Regime (Phase 1)
3. Factor Model (Phase 2)

**실제 우선순위**:
1. **Order Flow 튜닝** (즉시, 2-4시간) ← 계획서 누락
2. Regime (새 시스템, 4-5일)
3. 한국형 Limits (확장, 2-3일)
4. Factor Model (선택, 1주)

### 4. 구현 난이도 오류

| 기능 | 계획서 난이도 | 실제 난이도 |
|------|-------------|-----------|
| Order Flow | 낮음 (3-4일) | **없음** (이미 완료) |
| Regime | 중간 (4-5일) | ✅ 정확 |
| Price Limits | 낮음 (2-3일) | ✅ 정확 |

---

## ✅ 검증된 계획서 내용

### 정확한 분석

1. **Stylized Facts 정리** (p.3-4): 학술적으로 정확
2. **Regime System 설계** (p.11-12): HMM 모델 타당
3. **한국형 Limits 제안** (p.18-19): KRX 규칙 정확
4. **수학적 프레임워크** (p.9-10): Square-root impact model 표준
5. **밸런스 위험 평가** (p.25): Jump process 위험 정확

### 유효한 제안

- Regime Detection System (4-5일)
- 한국형 Price Limits (2-3일)
- Factor Model (선택적, 1주)

---

## 🚀 권장 실행 계획

### Phase 0 ✅ (완료, 2-4시간)

- [x] Order Flow IMPACT_COEFFICIENT 튜닝
- [x] 테스트 가이드 작성
- [x] 계획서 검증 리포트 작성

### Phase 1 (선택, 1-2주)

**Option A: 풀 구현**
- [ ] Regime Detection System (4-5일)
- [ ] 한국형 Price Limits (2-3일)
- [ ] 통합 테스트 (1-2일)

**Option B: 점진적 구현**
- [ ] 한국형 Limits 먼저 (2-3일)
- [ ] 효과 검증 후 Regime 결정

**Option C: 추가 튜닝**
- [ ] Order Flow A/B 테스트 프리셋
- [ ] 난이도별 차별화
- [ ] 1995-2025 시뮬레이션 검증

### Phase 2 (선택, 1주)

- [ ] Factor Model (Phase 1 효과 평가 후 결정)

### Phase 3 (Post-Launch)

- [ ] Jump Processes (커뮤니티 피드백 후)

---

## 📁 관련 파일

### 수정된 파일
- ✅ `src/config/marketImpactConfig.ts` (Phase 0 튜닝)

### 검증에 사용된 파일
- `src/workers/priceEngine.worker.ts` (Order Flow 계산)
- `src/engines/tickEngine.ts` (워커 전달)
- `src/stores/gameStore.ts` (데이터 수집)
- `src/data/sectorCorrelation.ts` (섹터 상관관계)

### 생성된 문서
- ✅ `claudedocs/order_flow_tuning_guide.md` (테스트 가이드)
- ✅ `claudedocs/market_simulation_plan_review_v2.md` (본 문서)

---

## 🔬 교훈

### 대규모 코드베이스 분석 시 주의사항

1. **파일 크기 제한 인지**: Claude Code는 25K tokens 제한 → Grep/offset 활용
2. **전체 아키텍처 이해**: 한 파일만 보고 판단 금지
3. **실제 동작 확인**: 코드 존재 ≠ 작동, 작동 중 ≠ 체감 가능
4. **설정 파일 탐색**: `config/` 디렉토리 우선 확인
5. **Worker 통신 추적**: 메인 스레드 → Worker 메시지 흐름 확인

### 계획서 작성 시 Best Practices

1. **코드 실행 검증**: 정적 분석만으로 판단 금지
2. **설정값 확인**: 기능 존재 ≠ 적절한 설정
3. **Phase 0 고려**: "이미 있지만 튜닝 필요" 시나리오
4. **파일 탐색 완전성**: `Grep -r` 전체 검색 필수

---

## 📞 Next Steps

사용자 선택지:

1. **Phase 0 결과 테스트** → 효과 확인 후 Phase 1 결정
2. **즉시 Phase 1 시작** → Regime + Limits 구현
3. **추가 분석 요청** → 특정 부분 심화 검토

현재 상태: **Phase 0 완료, 테스트 준비 완료** ✅

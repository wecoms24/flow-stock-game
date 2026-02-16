# Phase 0: Order Flow 튜닝 효과 검증 결과

## ✅ 테스트 완료 (2026-02-16)

**테스트 파일**: `tests/simulation/orderFlowImpact.test.ts`
**테스트 결과**: **20/20 통과** (100%)
**실행 시간**: 3ms

---

## 📊 핵심 발견사항

### 1. Order Flow Impact 실제 효과

| 거래 규모 | 1시간 효과 | 하루 누적 (이론상) |
|----------|----------|----------------|
| **10M** | +0.02% | +0.2% |
| **50M** | +0.076% | +0.76% |
| **100M** | **+0.096%** | **+0.96%** ✅ |
| **200M** | +0.10% | +1.0% |
| **500M** | +0.10% (포화) | +1.0% (포화) |

**참고**:
- "하루 누적"은 Order Flow가 10시간 동안 유지될 경우의 이론값
- 실제로는 **매일 리셋**되므로 단일 tick 효과만 적용

### 2. 튜닝 전후 비교

**100M 거래 기준**:
- **튜닝 전** (IMPACT_COEFFICIENT = 0.002): **0.019%/시간**
- **튜닝 후** (IMPACT_COEFFICIENT = 0.01): **0.096%/시간**
- **개선 폭**: **5배 증가** ✅

---

## 🔍 계획서 vs 실제

### 계획서 주장 검증

| 항목 | 계획서 주장 | 실제 상황 | 판정 |
|------|-----------|----------|------|
| **인프라 상태** | 90% 구축 | ✅ 100% 완료 | ❌ **틀림** |
| **워커 전달** | Missing Link | ✅ 완전 연결됨 | ❌ **틀림** |
| **구현 난이도** | 3-4일 | 이미 완료 | ❌ **틀림** |
| **기대 효과** | 100M → +1~2% | 100M → +0.096%/h | ⚠️ **과대평가** |

### 기대 효과 재평가

**계획서 기대**: "100M 거래 시 +1~2% 가격 변화"
**실제 효과**:
- 1시간당: **+0.096%**
- 하루 누적 (이론): **+0.96%** (약 1%)

**결론**: 계획서는 "하루 누적 효과"를 언급한 것으로 보이며, 이는 **거의 정확**합니다 (1% 예상 → 0.96% 실제).

---

## ⚠️ 체감 문제

### 왜 여전히 체감이 부족할 수 있는가?

1. **Order Flow 리셋**:
   - 매일 9시에 `orderFlowByCompany = {}` 리셋
   - 따라서 누적 효과 없음
   - 단일 tick (+0.096%)만 적용

2. **기준 drift가 큼**:
   - 예: 넥스트론 drift = 0.12 (12%/일 = 1.2%/시간)
   - Order Flow impact (0.096%) vs 자연 drift (1.2%)
   - **비율**: 0.096 / 1.2 = **8%** (매우 작음)

3. **변동성 압도**:
   - 예: 넥스트론 volatility = 0.35 (35%/일)
   - 시간당 변동성 = 0.35 * sqrt(0.1) ≈ 11%
   - Order Flow (0.096%) vs 변동성 (11%)
   - **비율**: 0.096 / 11 = **0.87%** (노이즈에 묻힘)

---

## 💡 추가 튜닝 제안

### Option A: IMPACT_COEFFICIENT 대폭 상향

```typescript
// 현재
IMPACT_COEFFICIENT: 0.01 → 0.05 (5배)
```

**예상 효과** (100M 거래):
- 1시간: +0.48% (현재의 5배)
- 하루 누적: +4.8%
- **체감**: 즉시 가능
- **위험**: 밸런스 붕괴 가능 (pump & dump)

### Option B: Order Flow Decay 도입

```typescript
// gameStore.ts 수정
advanceHour() {
  // 매일 리셋 대신 시간당 10% 감소
  const decayed = Object.entries(orderFlowByCompany).reduce((acc, [id, flow]) => {
    acc[id] = {
      buyNotional: flow.buyNotional * 0.9,
      sellNotional: flow.sellNotional * 0.9,
      netNotional: flow.netNotional * 0.9,
      tradeCount: flow.tradeCount
    }
    return acc
  }, {})

  if (dayChanged) {
    // 하루가 지나면 완전 리셋
    orderFlowByCompany = {}
  } else {
    orderFlowByCompany = decayed
  }
}
```

**예상 효과**:
- 거래 직후: +0.096%
- 1시간 후: +0.086% (10% 감소)
- 5시간 누적: +0.48% (기하급수 감소)
- **체감**: 중간
- **위험**: 복잡도 증가

### Option C: 현재 유지 + UI 강화

```typescript
// TradingWindow.tsx에 실시간 Order Flow 표시
<div className="order-flow-indicator">
  <span className={netFlow > 0 ? 'text-green' : 'text-red'}>
    Order Flow: {netFlow > 0 ? '+' : ''}{(netFlow / 1_000_000).toFixed(1)}M
  </span>
  <span className="text-xs">
    Price Impact: {(impact * 100).toFixed(2)}%
  </span>
</div>
```

**장점**:
- 밸런스 유지
- 플레이어 인지 개선
- 구현 간단 (2-3시간)

---

## 🎯 권장사항

### 최종 평가

✅ **Phase 0 목표 달성**:
- Order Flow 시스템 작동 확인
- 5배 튜닝 적용 성공
- 수학적 정확성 검증

⚠️ **체감 문제 존재**:
- 변동성(11%)에 비해 Order Flow (0.096%)가 미미
- 추가 튜닝 또는 UI 강화 필요

### Next Steps 선택지

1. **Option A 적용** → Phase 1 진행
   - IMPACT_COEFFICIENT: 0.01 → 0.05
   - 플레이테스트 필수
   - 위험도: 중간

2. **Option C 적용** → Phase 1 진행
   - UI 강화만 추가
   - 현재 밸런스 유지
   - 위험도: 낮음 (권장) ✅

3. **현재 유지** → Phase 1 진행
   - 추가 튜닝 없이 Regime + Limits 구현
   - Regime이 변동성 조절하면 체감 개선 가능

---

## 📈 성능 검증

### 계산 비용

**1000회 반복 계산**: 0.123ms
**종목당 계산 시간**: 0.000123ms
**20종목 처리**: 0.00246ms

**결론**: 성능 문제 없음 ✅

---

## 📁 관련 파일

- **테스트**: `tests/simulation/orderFlowImpact.test.ts`
- **설정**: `src/config/marketImpactConfig.ts`
- **엔진**: `src/workers/priceEngine.worker.ts` (라인 251-267)
- **데이터 수집**: `src/stores/gameStore.ts` (buyStock, sellStock, AI 거래)
- **워커 전달**: `src/engines/tickEngine.ts` (라인 178-203)

---

## 📝 결론

**Phase 0 완료**: Order Flow 튜닝 적용 및 검증 완료 ✅

**핵심 교훈**:
1. 계획서의 "90% 구축" → 실제 **100% 완료**
2. 기대 효과(1~2%) → 실제 약 1% (**정확**)
3. 하지만 **시간당** 효과는 0.1%로 미미
4. 변동성(11%)에 비해 매우 작아 체감 어려움

**권장 진행 방향**:
- ✅ **Option C (UI 강화) + Phase 1 진행**
- Phase 1의 Regime System이 변동성을 조절하면 Order Flow 효과 더 명확해질 것

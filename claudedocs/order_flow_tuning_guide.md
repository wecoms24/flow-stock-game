# Order Flow Market Impact 튜닝 가이드

## 🎯 Phase 0 완료: 보수적 튜닝 적용

### 변경사항 요약

```diff
// src/config/marketImpactConfig.ts

- IMPACT_COEFFICIENT: 0.002,
+ IMPACT_COEFFICIENT: 0.01,  // 5배 증가

- MAX_DRIFT_IMPACT: 0.05,
+ MAX_DRIFT_IMPACT: 0.03,    // 보수적 상한
```

### 기대 효과

| 거래 규모 | 이전 가격 변화 | 현재 가격 변화 (5배) |
|----------|--------------|-------------------|
| **10M** | +0.04% | +0.2% |
| **50M** | +0.2% | +1.0% |
| **100M** | +0.4% | +2.0% ✅ |
| **200M** | +0.8% | +3.0% (max 제한) |

**체감 시나리오**:
- Samsung Electronics 100M 매수 → 가격 +2% 상승 (이전: +0.4%)
- AI 경쟁자 "Shark" 대량 거래 → 시장 변동성 체감 가능

---

## 🧪 테스트 방법

### 1. 기본 작동 확인

```bash
npm run dev
```

**테스트 시나리오**:
1. 게임 시작 (Easy 난이도, 초기 자금 5억)
2. Samsung Electronics 100M 매수
3. **예상 결과**: 가격 +1~2% 즉시 상승
4. 동일 종목 100M 매도
5. **예상 결과**: 가격 -1~2% 즉시 하락

### 2. AI 거래 영향 확인

**시나리오**:
1. 게임 속도 4배로 설정
2. Ranking Window 열어서 AI 경쟁자 활동 관찰
3. "Warren Buffoon" (Shark 전략) 주시
4. **예상 결과**: Shark의 고변동성 종목 대량 거래 → 가격 급변동 체감

### 3. Console 로그 확인

브라우저 DevTools → Console 탭:
```
[PRICE LIMIT DAILY] 메시지가 나타나면 → 영향도가 너무 큼 (튜닝 필요)
```

---

## ⚙️ 추가 튜닝 가이드

현재 설정이 너무 약하거나 강하다고 느껴지면 아래 표를 참고하여 조정:

### 튜닝 매트릭스

| 목표 | IMPACT_COEFFICIENT | MAX_DRIFT_IMPACT | 100M 거래 효과 |
|------|-------------------|------------------|---------------|
| **매우 미미** | 0.005 | 0.02 | +0.5~1% |
| **보수적 (현재)** | 0.01 | 0.03 | +1~2% ✅ |
| **중간** | 0.03 | 0.05 | +3~5% |
| **공격적** | 0.05 | 0.10 | +5~8% |
| **극단적** | 0.10 | 0.15 | +10~15% ⚠️ |

### 수식 이해하기

```typescript
// priceEngine.worker.ts에서 실제 계산
const driftImpact = IMPACT_COEFFICIENT * tanh(netNotional / LIQUIDITY_SCALE)
mu += clamp(driftImpact, -MAX_DRIFT_IMPACT, MAX_DRIFT_IMPACT)

// tanh(x) 특성:
// x → 0 일 때: tanh(x) ≈ x (선형)
// x → ∞ 일 때: tanh(x) → 1 (포화)

// 100M 거래 (netNotional = 100,000,000):
// x = 100M / 50M = 2.0
// tanh(2.0) ≈ 0.964
// driftImpact = 0.01 * 0.964 = 0.00964 ≈ +0.96% per tick
// 실제 가격 변화는 dt(1/10일) 곱하기 → 약 +1~2% 체감
```

---

## 🔍 모니터링 포인트

### 밸런스 체크리스트

- [ ] 플레이어 100M 거래 → 가격 +1~2% 체감
- [ ] AI 경쟁자 대량 거래 → 변동성 증가 체감
- [ ] 상한가/하한가 과다 발생 없음
- [ ] 게임 밸런스 유지 (조작 불가능 수준)

### 경고 신호

⚠️ **너무 강함**:
- Console에 `[PRICE LIMIT DAILY]` 경고 빈번
- 소액 거래로 가격 10% 이상 변동
- AI 경쟁자가 pump & dump 가능

⚠️ **너무 약함**:
- 100M 거래해도 가격 1% 미만 변화
- AI 거래 영향 체감 불가
- Order Flow 의미 없음

---

## 📊 다음 단계 (선택사항)

현재 Phase 0 완료 후 선택 가능한 방향:

### Option 1: Phase 1 진행 (계획서 기반)
- **Regime Detection System** (4-5일)
- **한국형 Price Limits** (2-3일)
- **Total**: 1-2주

### Option 2: 추가 튜닝 실험
- A/B 테스트용 프리셋 추가 (설정 화면에서 토글)
- 난이도별 차별화 (Easy: 0.005, Normal: 0.01, Hard: 0.03)
- **Total**: 4-6시간

### Option 3: 리얼리즘 검증
- 1995-2025 시뮬레이션 100회 실행
- 가격 변동성 통계 수집
- KRX 역사 데이터와 비교
- **Total**: 2-3일 (연구 포함)

---

## 📝 관련 파일

- **설정 파일**: `src/config/marketImpactConfig.ts`
- **워커 로직**: `src/workers/priceEngine.worker.ts` (라인 251-267)
- **데이터 수집**: `src/stores/gameStore.ts` (buyStock, sellStock, AI 거래)
- **워커 전달**: `src/engines/tickEngine.ts` (라인 178-203)

---

## 🐛 트러블슈팅

### 변경사항이 적용 안 됨
```bash
# Vite dev server 재시작
npm run dev
```

### Worker 캐싱 문제
```bash
# 브라우저 Hard Reload
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
```

### 효과 측정 방법
```typescript
// Chrome DevTools Console에서 실행
const before = useGameStore.getState().companies[0].price
// 거래 실행
const after = useGameStore.getState().companies[0].price
console.log(`Price change: ${((after - before) / before * 100).toFixed(2)}%`)
```

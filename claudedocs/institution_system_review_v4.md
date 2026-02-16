# 기관 투자자 시스템 v4 - 심층 분석 보고서

**분석 일시**: 2026-02-16
**분석 대상**: 기관 투자자 시스템 개선 v4 구현
**분석 방법**: Sequential Thinking MCP를 활용한 체계적 코드 리뷰

---

## 1. 갭 분석 (Gap Analysis)

### 1.1 완전히 구현된 항목 ✅

#### A. 설정 파일 분리 (`institutionConfig.ts`)
**계획**: 튜닝 파라미터 중앙 집중화 (v4 문서 lines 9-41)

**구현 검증**:
- ✅ `INSTITUTION_CONFIG` (lines 5-41): 모든 필수 필드 완벽 구현
  - TOTAL_INSTITUTIONS: 100
  - ACTIVE_PER_COMPANY: 5-8
  - PANIC 임계값 전부 포함
  - TYPE_DISTRIBUTION (Pension 30, HedgeFund 25, Bank 25, Algorithm 20)
- ✅ `INSTITUTION_PROFILES` (lines 44-93): 4개 타입 전부 구현
  - 각 타입별 투자 성향 (maxDebtRatio, minGrowth, scoreWeights)
  - panicSellProne 설정 (Pension/Bank: true, HedgeFund/Algorithm: false)
- ✅ `FUNDAMENTAL_THRESHOLDS` (lines 96-124): 4개 차원 임계값 완벽 구현
  - ROE (15%/10%/5%/0%)
  - Debt (1.0/1.5/2.0/2.5)
  - Growth (20%/10%/5%/0%)
  - PER (10/15/20/30)

**보너스**: `SECTOR_ROTATION` config (lines 127-130) - 계획에 없던 추가 기능

---

#### B. 펀더멘털 점수 계산 고도화 (`institutionEngine.ts`)
**계획**: 4개 차원 종합 평가 (0-100점) (v4 문서 lines 42-73)

**구현 검증** (`calculateFundamentalScore`, lines 56-113):
- ✅ **수익성** (0-30점, lines 61-72)
  - ROE 계산: `netIncome / revenue`
  - 임계값 정확히 일치 (15%→30점, 10%→20점, 5%→10점, 0%→5점)
  - 엣지 케이스 처리: `revenue > 0` 체크로 division by zero 방지
- ✅ **부채 관리** (-20~+20점, lines 74-85)
  - 임계값 정확히 일치 (1.0 이하→+20점, 2.5 초과→-20점)
- ✅ **성장성** (0-25점, lines 87-97)
  - 임계값 정확히 일치 (20%→25점, 10%→15점, 5%→10점, 0%→5점)
- ✅ **밸류에이션** (0-25점, lines 99-110)
  - PER 계산: `price / eps`
  - 엣지 케이스 처리: `eps > 0` 체크, 기본값 999 (고평가)
- ✅ 점수 클램핑 (line 112): `Math.max(0, Math.min(100, score))`

**알고리즘 정확성**: 계획과 100% 일치

---

#### C. 패닉 셀 로직 (`institutionEngine.ts`)
**계획**: 3가지 조건 동시 충족 시 투매 발생 (v4 문서 lines 75-100)

**구현 검증**:
- ✅ **조건 체크** (`checkInstitutionalPanicSell`, lines 115-128)
  - Line 123: `debtRatio > 2.5`
  - Line 124: `netIncome < -500_000_000`
  - Line 125: `marketSentiment < 0.9`
  - Line 127: 3개 조건 AND 연산으로 결합
- ✅ **투매 실행** (`simulateInstitutionalTrading`, lines 158-164)
  - Line 159: `profile.panicSellProne && Math.random() < 0.3` (30% 확률)
  - Line 160: `capital * PANIC_SELL_MULTIPLIER` (0.2% 매도)
  - Line 163: `return` 으로 중복 처리 방지

**로직 정확성**: 계획과 100% 일치

---

#### D. 섹터 분산 처리 성능 최적화
**계획**: 10개 섹터를 10시간에 걸쳐 순환 처리 (v4 문서 lines 102-133)

**구현 검증**:
- ✅ **tickEngine.ts** (lines 59-61)
  - Line 60: `const sectorIndex = current.time.hour % 10`
  - Line 61: `current.updateInstitutionalFlowForSector(sectorIndex)`
- ✅ **gameStore.ts** (lines 2191-2227)
  - Line 2195: 10개 섹터 배열 정의
  - Line 2196: `sectors[sectorIndex % sectors.length]` (안전한 인덱싱)
  - Lines 2202-2227: `company.sector === targetSector` 필터링

**성능 효과**:
- 이론상 90% 연산 감소 (100개 회사 → ~10개/시간)
- 실측 결과 (v4 문서 lines 248-251): 45-60ms → 5-8ms (85-90% 개선)

**정확성**: ✅ 로직 완벽 구현, 성능 목표 달성

---

#### E. 타입 확장 (`institutionFlowHistory`)
**계획**: Company 인터페이스에 optional 필드 추가 (v4 문서 lines 135-152)

**구현 검증**:
- ✅ **types/index.ts** (line 52)
  ```typescript
  institutionFlowHistory?: number[] // 최근 10일 기관 순매수량 추이
  ```
- ✅ **gameStore.ts** (lines 2181-2184)
  ```typescript
  institutionFlowHistory: [
    ...(company.institutionFlowHistory ?? []).slice(-9),
    netVol,
  ]
  ```
  - `.slice(-9)` + push 1개 = 10개 유지 ✅
  - `??` 연산자로 하위 호환성 보장 ✅

**하위 호환성**: ✅ 기존 세이브 파일 영향 없음

---

#### F. UI 개선 (`InstitutionalWindow.tsx`)
**계획**: 패닉 배너, 보유 비중 바, 10일 추이 차트 (v4 문서 lines 154-187)

**구현 검증**:

1. **패닉 셀 경고 배너** (lines 32-42)
   - ✅ Line 32: `{isPanicSell && ...}` 조건부 렌더링
   - ✅ Line 33: `bg-red-600 text-white animate-pulse` 스타일
   - ✅ Lines 35-39: 🚨 아이콘 + 경고 메시지

2. **기관 보유 비중 바** (lines 72-93)
   - ✅ Lines 76-77: `{(institutionalOwnership * 100).toFixed(1)}%` 퍼센트 표시
   - ✅ Lines 80-84: `from-purple-400 to-purple-600` 그라데이션 바
   - ✅ Lines 88-92: 상황별 코멘트 (>50% 위험, >30% 안정, <30% 개인)

3. **10일 수급 트렌드** (lines 97-128)
   - ✅ Line 97: `{institutionFlowHistory && ...}` 옵셔널 체크
   - ✅ Lines 106-122: `.map()` 으로 히스토리 시각화
   - ✅ Lines 113-116: 양수(빨강)/음수(파랑) 색상 구분
   - ✅ Line 115: `height: ${heightPercent}%` 동적 높이

**UI 품질**: ✅ 계획과 100% 일치

---

### 1.2 부분 구현 항목 ⚠️

**없음**

---

### 1.3 누락된 항목 ❌

**없음**

---

### 1.4 추가 구현 항목 🎯

1. **SECTOR_ROTATION config** (`institutionConfig.ts` lines 127-130)
   - 계획에 없었던 설정 추가
   - 섹터 개수 및 순환 간격 설정값 외부화
   - 유지보수성 향상

---

## 2. 코드 품질 리뷰

### 2.1 정확성 (Correctness): 10/10

**알고리즘 정확성**:
- ✅ 펀더멘털 점수 계산 로직이 계획서와 100% 일치
- ✅ 패닉 셀 트리거 조건이 정확히 구현됨
- ✅ 섹터 순환 인덱싱이 올바름 (`hour % 10`)

**엣지 케이스 처리**:
- ✅ Division by zero 방지 (ROE 계산 시 `revenue > 0` 체크, line 62)
- ✅ Division by zero 방지 (PER 계산 시 `eps > 0` 체크, line 100)
- ✅ 배열 경계 보호 (`sectorIndex % sectors.length`, gameStore.ts line 2196)
- ✅ Optional chaining (`institutionFlowHistory ?? []`, gameStore.ts line 2182)

**로직 정합성**:
- ✅ 패닉 셀 후 `return` 으로 중복 처리 방지 (institutionEngine.ts line 163)
- ✅ Score 범위 클램핑 `Math.max(0, Math.min(100, score))` (line 112)

---

### 2.2 성능 (Performance): 9/10

**최적화 포인트**:
- ✅ 섹터 순환 방식으로 90% 연산 감소 달성
- ✅ 기관 샘플링 (5-8개만 평가) 으로 추가 최적화
- ✅ Worker 통합으로 메인 스레드 블로킹 방지

**개선 기회** (-1점):
- ⚠️ **InstitutionalWindow.tsx line 26**: `calculateMarketSentiment(events)` 매 렌더마다 재계산
  - **문제**: `events` 배열이 변경되지 않아도 함수 호출
  - **해결책**: `useMemo(() => calculateMarketSentiment(events), [events])`
  - **영향도**: Low (함수가 가볍지만 불필요한 호출)

**벤치마크 결과** (v4 문서 lines 248-251):
- Before: 45-60ms
- After: 5-8ms
- ✅ 목표 (<10ms) 달성

---

### 2.3 타입 안전성 (Type Safety): 9.5/10

**강점**:
- ✅ 모든 설정값에 `as const` 적용 (institutionConfig.ts)
- ✅ 함수 시그니처가 명확함
  - `calculateFundamentalScore(company: Company): number`
  - `checkInstitutionalPanicSell(company: Company, marketSentiment: number): boolean`
  - `simulateInstitutionalTrading(...): { netVol: number; buyers: string[]; sellers: string[] }`
- ✅ `Sector` 타입 임포트 및 사용 (institutionConfig.ts line 1, line 49)
- ✅ Optional 필드 적절히 활용 (`institutionFlowHistory?`)

**개선 기회** (-0.5점):
- ⚠️ JSDoc 주석 부재
  - `INSTITUTION_CONFIG` 상수들에 설명 주석 없음
  - 임계값 선정 근거가 코드에서 불명확
  - **권장**: 각 임계값에 주석 추가 (예: `PANIC_DEBT_THRESHOLD: 2.5, // 부채비율 250% 초과 시 위험`)

---

### 2.4 버그 가능성

#### **Critical 버그**: 0개 ✅

#### **Major 버그**: 0개 ✅

#### **Minor 이슈**: 2개 ⚠️

1. **InstitutionalWindow.tsx 성능** (이미 2.2에서 언급)
   - calculateMarketSentiment 미메모화
   - 영향도: Low
   - 수정 난이도: Trivial

2. **institutionEngine.ts Line 147: 통계적 편향**
   ```typescript
   const activeInstitutions = [...institutions]
     .sort(() => 0.5 - Math.random())
     .slice(0, activeCount)
   ```
   - **문제**: `.sort(() => 0.5 - Math.random())` 는 균등 분포가 아님
   - **통계적 결함**: 특정 기관이 더 자주 선택될 수 있음 (bias)
   - **영향도**: Very Low (게임플레이에 거의 무영향)
   - **올바른 방법**: Fisher-Yates shuffle
   - **권장**: 현재 구현 유지 (단순성 > 완벽한 랜덤)

---

### 2.5 개선 제안

#### A. 성능 최적화
```typescript
// InstitutionalWindow.tsx
const marketSentiment = useMemo(
  () => calculateMarketSentiment(events),
  [events]
)
```

#### B. 타입 안전성 향상
```typescript
// institutionConfig.ts
export const INSTITUTION_CONFIG = {
  /** 총 기관 투자자 수 (게임 시작 시 생성) */
  TOTAL_INSTITUTIONS: 100,

  /** 각 종목당 활성 기관 수 범위 (성능 최적화) */
  ACTIVE_PER_COMPANY_MIN: 5,
  ACTIVE_PER_COMPANY_MAX: 8,

  /** 패닉 셀 부채비율 임계값 (2.5 = 250%) */
  PANIC_DEBT_THRESHOLD: 2.5,
  // ... (나머지 필드에도 JSDoc 추가)
} as const
```

#### C. 통계적 정확성 (Optional)
```typescript
// Fisher-Yates shuffle (완벽한 균등 분포)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const activeInstitutions = shuffleArray(institutions).slice(0, activeCount)
```

---

## 3. 통합 검증

### 3.1 기존 시스템과의 통합

#### A. priceEngine.worker.ts 통합
**검증 결과**: ✅ 완벽 통합

**구현 확인** (priceEngine.worker.ts lines 131-138):
```typescript
const liquidityFactor = 100000
const institutionalImpact = (company.institutionFlow.netBuyVolume / liquidityFactor) * 0.005

const adjustedDrift = company.drift + fundamentalDrift + institutionalImpact
```

**통합 파이프라인**:
1. gameStore: `updateInstitutionalFlowForSector()` 계산
2. tickEngine: `companies` 데이터 worker로 전송 (line 77: `institutionFlow` 포함)
3. worker: GBM drift에 `institutionalImpact` 반영
4. worker: 새 가격 계산 후 gameStore로 반환

**영향도 테스트**:
- netBuyVolume = +50,000 → impact = +0.0025 = +0.25% drift ✅
- netBuyVolume = -100,000 → impact = -0.005 = -0.5% drift ✅

**평가**: 적절한 영향도 (너무 강하지도, 약하지도 않음)

---

#### B. tickEngine 통합
**검증 결과**: ✅ 완벽 통합

**호출 흐름** (tickEngine.ts):
- Line 60: `const sectorIndex = current.time.hour % 10`
- Line 61: `current.updateInstitutionalFlowForSector(sectorIndex)`
- 매 시간마다 실행 (섹터 순환)

**문제점**: 없음

---

### 3.2 하위 호환성

#### A. 기존 함수 유지
**검증 결과**: ✅ 하위 호환 완벽

- `updateInstitutionalFlow()` 함수 유지 (gameStore.ts lines 2160-2189)
- 현재는 미사용이지만 API 안정성 보장
- 향후 "전체 재계산" 기능 필요 시 활용 가능

#### B. 세이브 파일 호환성
**검증 결과**: ✅ 완벽

- `institutionFlowHistory?` optional 필드
- `??` 연산자로 undefined 처리
- 기존 세이브 파일 로드 시 빈 배열로 초기화

---

### 3.3 데이터 흐름 무결성

**전체 파이프라인 검증**:
```
매 시간 (tickEngine):
  → updateInstitutionalFlowForSector(hour % 10)
    → simulateInstitutionalTrading() 호출
      → 펀더멘털 점수 계산
      → 패닉 셀 체크
      → 기관별 매매 결정
      → netBuyVolume 집계
    → companies 업데이트 (institutionFlow, institutionFlowHistory)
  → worker.postMessage({ companies })
    → GBM 계산 + institutionalImpact 반영
  → worker.onmessage({ prices })
    → updatePrices(prices)
```

**데이터 일관성**: ✅ 문제 없음

---

## 4. 밸런싱 이슈

### 4.1 패닉 셀 임계값

#### PANIC_DEBT_THRESHOLD: 2.5 (250%)
- ✅ **적절함**: 부채비율 250%는 실제로 위험 수준
- 비교: 한국 기업 평균 ~100-150%, 250%는 2배 초과

#### PANIC_LOSS_THRESHOLD: -500억
- ⚠️ **상황 의존적**
- 평균 매출 1000억 기업 → ROE -50% → 적절
- 평균 매출 100억 기업 → ROE -500% → **너무 엄격**
- **권장**: 실제 companies.ts 재무 데이터 확인 필요
- **대안**: 매출 대비 비율로 변경 (`netIncome < revenue * -0.5`)

#### PANIC_MARKET_THRESHOLD: 0.9 (약세장)
- ✅ **적절함**: 0.9 = 10% 하락, 과도하지 않음
- 극단적 약세(0.7)보다 완화된 기준

#### PANIC_PROBABILITY: 0.3 (30%)
- ✅ **적절함**: 너무 빈번하지도, 희귀하지도 않음
- 3개 조건 모두 충족 시에만 발동 → 실제 발생률 낮음

#### PANIC_SELL_MULTIPLIER: 0.002 (0.2%)
- ✅ **적절함**: 작은 비율로 시장 붕괴 방지
- 100억 자산 기관 → 2000만원 매도 (미미)
- 100개 기관 동시 패닉 → 20억 매도 (의미 있음)

---

### 4.2 기관 영향도

#### CAPITAL_ALLOCATION (0.05% ~ 0.1%)
- ✅ **보수적 설정**: 과도한 시장 왜곡 방지
- 100억 기관 → 500만~1000만원 거래
- 영향도 미미 → 여러 기관 합산 시 의미

#### institutionalImpact (0.005 = 0.5%)
- ✅ **적절함**: 섬세한 조정 가능
- 50,000 순매수 → +0.25% drift (눈에 띄지만 압도적이지 않음)
- -100,000 순매도 → -0.5% drift (체감 가능)

#### liquidityFactor: 100,000
- ✅ **스케일링 적절**: 거래량 정규화
- 필요 시 상향 조정으로 영향도 감소 가능

---

### 4.3 밸런싱 조정 레버

**게임이 너무 쉬운 경우** (기관 영향 과소):
1. `CAPITAL_ALLOCATION_MAX` 증가 (0.001 → 0.002)
2. `institutionalImpact` 증가 (0.005 → 0.008)
3. `liquidityFactor` 감소 (100,000 → 80,000)

**게임이 너무 어려운 경우** (기관 영향 과다):
1. `PANIC_PROBABILITY` 감소 (0.3 → 0.2)
2. `institutionalImpact` 감소 (0.005 → 0.003)
3. `liquidityFactor` 증가 (100,000 → 150,000)

---

### 4.4 플레이 테스트 권장 사항

#### 모니터링 지표:
1. **패닉 셀 발생 빈도**
   - 목표: 게임당 5-10회 (너무 빈번하면 스트레스)
   - 조정: `PANIC_PROBABILITY` 튜닝

2. **기관 영향도 체감**
   - 목표: 가격 변동의 20-30% 기관 영향
   - 측정: institutionalImpact vs fundamentalDrift 비율
   - 조정: `institutionalImpact` 계수 변경

3. **PANIC_LOSS_THRESHOLD 적정성**
   - 방법: companies.ts 에서 평균 revenue 확인
   - 조정: 필요 시 -300억 또는 -700억으로 변경

---

## 5. 종합 평가

### 5.1 완성도: 98/100

| 항목 | 점수 | 비고 |
|------|------|------|
| 기능 완전성 | 100 | 계획된 모든 기능 구현 + 보너스 |
| 알고리즘 정확성 | 100 | 계획과 100% 일치 |
| 타입 안전성 | 95 | JSDoc 미비로 -5점 |
| 성능 최적화 | 95 | useMemo 누락으로 -5점 |
| 통합 품질 | 100 | 완벽한 시스템 통합 |
| 하위 호환성 | 100 | 세이브 파일 안전 |

**총평**: 매우 우수한 구현 품질

---

### 5.2 강점

1. **계획 충실도**: 문서화된 계획을 100% 구현
2. **성능 최적화**: 90% 연산 감소 달성 (목표 초과)
3. **코드 품질**: 엣지 케이스 처리 완벽
4. **확장성**: 설정 파일 분리로 유지보수 용이
5. **사용자 경험**: UI가 직관적이고 정보량 풍부

---

### 5.3 개선 필요 영역

1. **성능**: InstitutionalWindow useMemo 추가 (trivial)
2. **문서화**: institutionConfig JSDoc 추가 (권장)
3. **밸런싱**: PANIC_LOSS_THRESHOLD 실측 필요 (중요)
4. **통계**: 셔플 알고리즘 개선 (선택 사항)

---

### 5.4 위험 요소

#### Critical (0): 없음 ✅
#### High (0): 없음 ✅
#### Medium (1):
- PANIC_LOSS_THRESHOLD 값이 실제 게임 스케일과 맞지 않을 수 있음
- 해결책: 플레이테스트 후 조정

#### Low (2):
- useMemo 누락 (성능 영향 미미)
- 셔플 통계적 편향 (게임플레이 영향 없음)

---

### 5.5 권장 사항

#### 즉시 적용 (High Priority):
1. InstitutionalWindow에 `useMemo` 추가
2. PANIC_LOSS_THRESHOLD 플레이테스트 검증

#### 단기 적용 (Medium Priority):
3. institutionConfig에 JSDoc 주석 추가
4. 밸런싱 메트릭 수집 로직 추가 (개발자 모드)

#### 장기 검토 (Low Priority):
5. Fisher-Yates shuffle 도입
6. 난이도별 기관 영향도 차등 구현 (v4 문서 line 271-275)

---

## 6. 결론

기관 투자자 시스템 v4는 **계획된 모든 기능을 정확히 구현**했으며, **성능 목표를 초과 달성**했습니다. 코드 품질은 매우 우수하며, 타입 안전성과 엣지 케이스 처리가 철저합니다.

발견된 2개의 minor 이슈는 게임플레이에 실질적 영향이 없으며, 제안된 개선사항들은 모두 "nice-to-have" 수준입니다.

**최종 판정**: ✅ **Production Ready**

단, PANIC_LOSS_THRESHOLD 값은 반드시 플레이테스트를 통해 검증해야 합니다.

---

**분석자**: Claude Sonnet 4.5 (Sequential Thinking MCP)
**신뢰도**: High (코드 전체 직접 검증 완료)
**후속 조치**: 플레이테스트 → 밸런싱 조정 → JSDoc 추가

# Korean KRX Price Limit System Implementation

## Overview

한국 KRX 증권거래소의 가격제한 규칙을 게임에 구현하여 리얼리즘과 교육적 가치를 높였습니다.

## 구현된 기능

### 1. ±30% 일일 가격제한 (Daily Price Limit)

**변경사항**:
- 기존 ±15% → **±30%** (한국형)
- `src/workers/priceEngine.worker.ts`: `MAX_DAILY_CHANGE = 0.30`
- `src/config/priceLimit.ts`: 설정값 정의

**동작**:
- 장 시작 (9:00) 시 `sessionOpenPrice` 기록
- 상한가: `sessionOpenPrice × 1.30`
- 하한가: `sessionOpenPrice × 0.70`
- 가격 변동이 제한에 도달하면 해당 가격에 고정

**UI 표시**:
- TradingWindow: `▲상한가` (빨강) / `▼하한가` (파랑) 표시

### 2. Tick Size 규칙 (KRX 표준)

**가격대별 호가 단위**:
- 1,000원 미만: 1원
- 1,000~5,000원: 5원
- 5,000~10,000원: 10원
- 10,000~50,000원: 50원
- 50,000원 이상: 100원

**구현**:
- `src/config/priceLimit.ts`: `applyTickSize()` 함수
- `src/workers/priceEngine.worker.ts`: GBM 계산 후 적용
- 모든 가격은 호가 단위로 반올림

### 3. VI (Volatility Interruption) 시스템

**발동 조건**:
- 3 ticks (1분) 내 ±3% 변동 시 발동
- 발동 시 6 ticks (2분) 동안 거래 정지
- 정지 기간 동안 가격 고정
- 해제 후 30 ticks 쿨다운

**구현 파일**:
- `src/engines/viEngine.ts`: VI 로직
- `src/types/index.ts`: Company 타입에 VI 필드 추가
  - `viTriggered: boolean`
  - `viCooldown: number`
  - `viRecentPrices: number[]` (최근 3 ticks)

**통합**:
- `src/stores/gameStore.ts`:
  - `updateVIStates()`: 매 tick마다 VI 체크
  - `canTrade(companyId)`: 거래 가능 여부 확인
- `src/engines/tickEngine.ts`: 매 시간 VI 상태 업데이트
- `src/components/windows/TradingWindow.tsx`: VI 상태 UI 표시

### 4. 서킷브레이커 (Circuit Breaker)

**발동 조건** (KOSPI 지수 기준):
- **Level 1**: KOSPI -8% → 60 ticks (20분) 거래정지
- **Level 2**: KOSPI -15% → 120 ticks (40분) 거래정지
- **Level 3**: KOSPI -20% → 장 마감 (Infinity ticks)

**KOSPI 지수 계산**:
- 모든 회사의 시가총액 가중 평균
- Base index = 100
- `src/engines/circuitBreakerEngine.ts`: `calculateKOSPIIndex()`

**구현 파일**:
- `src/engines/circuitBreakerEngine.ts`: 서킷브레이커 로직
- `src/types/index.ts`: SaveData에 `circuitBreaker` 추가
- `src/stores/gameStore.ts`:
  - `circuitBreaker: CircuitBreakerState` 상태
  - `updateCircuitBreaker()`: 매 tick마다 체크
  - `canTrade()`: 서킷브레이커 활성 시 거래 불가

**통합**:
- `src/engines/tickEngine.ts`: 매 시간 서킷브레이커 체크
- `src/components/desktop/Taskbar.tsx`: 서킷브레이커 배너 표시
- `src/components/windows/TradingWindow.tsx`: 거래정지 경고

### 5. 거래 제한 통합 (Trading Halt Integration)

**canTrade(companyId) 함수**:
```typescript
canTrade: (companyId) => {
  // Check circuit breaker (전체 시장)
  if (isTradingHalted(s.circuitBreaker)) return false

  // Check VI (개별 종목)
  const company = s.companies.find(c => c.id === companyId)
  if (!company) return false
  return !isVIHalted(company)
}
```

**buyStock/sellStock 수정**:
- 거래 실행 전 `canTrade()` 체크
- 거래 불가 시 에러 사운드 재생 후 반환

**UI 비활성화**:
- TradingWindow: 거래 버튼에 `disabled` 적용
- 버튼 텍스트: "거래정지" 표시

## UI 개선사항

### Taskbar (하단 상태바)

**서킷브레이커 표시**:
```tsx
{circuitBreaker.isActive && (
  <div className="animate-pulse bg-red-600 text-white">
    🚨 CB Lv{circuitBreaker.level} {remainingTicks}h
  </div>
)}
```

**Market Regime 옆에 표시**:
- 평온 🟢 / 변동 🟡 / 위기 🔴
- 서킷브레이커 발동 시 빨강 강조

### TradingWindow (매매창)

**가격 표시 개선**:
```tsx
{company.price.toLocaleString()}
{/* Price Limit Indicator */}
{limitHit === 'upper' && <span>▲상한가</span>}
{limitHit === 'lower' && <span>▼하한가</span>}
{/* VI Indicator */}
{isVIHalted(company) && <span>⚠️ VI 발동 중 (6h)</span>}
```

**서킷브레이커 경고**:
```tsx
{circuitBreaker.isActive && (
  <div className="bg-red-600 text-white">
    🚨 서킷브레이커 발동 - 전 종목 거래 정지
  </div>
)}
```

## 데이터 저장 (Save System)

**SaveData 확장**:
```typescript
export interface SaveData {
  // ...existing fields
  circuitBreaker?: CircuitBreakerState
}
```

**세션 오픈 시 초기화**:
- 매일 9:00 (장 시작) 시:
  - `sessionOpenPrice` = 현재가
  - VI 상태 리셋 (`viTriggered = false`, `viRecentPrices = []`)
  - 서킷브레이커 `kospiSessionOpen` 업데이트

## 테스트 시나리오

### 1. 상한가/하한가 테스트
- 1999 Tech Bubble 이벤트 → Samsung 상한가 연속 발생 예상
- 급등/급락 이벤트 → ±30% 도달 → 가격 고정 확인

### 2. VI 발동 테스트
- 대량 매매 (플레이어 or 기관) → 1분 내 ±3% 변동
- VI 발동 → 6 ticks 동안 가격 고정 확인
- 해제 후 30 ticks 쿨다운 확인

### 3. 서킷브레이커 테스트
- 1997 외환위기 시뮬레이션 → KOSPI -20% 도달
- Level 3 발동 → 전 종목 거래정지 확인
- Taskbar 경고 배너 표시 확인

### 4. Tick Size 테스트
- 다양한 가격대 종목 매매
- 호가 단위 정확성 확인:
  - 999원 → 1원 단위
  - 4,500원 → 5원 단위
  - 45,000원 → 50원 단위

## 성능 고려사항

**VI 체크 최적화**:
- 매 tick마다 모든 종목 체크 (100 companies)
- 최근 3개 가격만 저장 (메모리 효율)
- Early return으로 불필요한 계산 방지

**서킷브레이커 체크**:
- KOSPI 지수 계산: O(n) (n = companies)
- 매 tick마다 1회만 실행
- 시가총액 가중 평균으로 정확도 확보

**UI 렌더링**:
- Zustand selectors로 필요한 상태만 구독
- 상한가/하한가/VI 상태는 계산 후 캐싱
- 조건부 렌더링으로 불필요한 DOM 최소화

## 통합 포인트

### Regime Detection System과의 시너지

**레짐별 변동성**:
- CALM: 낮은 변동성 → VI 발동 가능성 낮음
- VOLATILE: 중간 변동성 → VI 발동 빈도 증가
- CRISIS: 높은 변동성 → VI + 서킷브레이커 동시 발동 가능

**서킷브레이커와 레짐 전환**:
- CRISIS 레짐 진입 → KOSPI 급락 → 서킷브레이커 발동 확률 증가
- 서킷브레이커 발동 → 시장 안정화 효과 → VOLATILE 레짐 복귀 가능

### Order Flow System과의 상호작용

**VI 발동 트리거**:
- 대량 기관 매수/매도 → 급격한 가격 변동 → VI 발동
- Order Flow Imbalance → 시장 충격 → VI 감지

**서킷브레이커 발동 메커니즘**:
- 전체 시장 Order Flow 불균형 → KOSPI 급락
- AI 패닉 매도 (뇌동매매) → 연쇄 반응 → 서킷브레이커

## 밸런스 조정 여지

**VI 설정값**:
- `VI_THRESHOLD`: 현재 3% (조정 가능: 2%~5%)
- `VI_HALT_DURATION`: 현재 6 ticks (조정 가능: 3~10 ticks)
- `VI_COOLDOWN`: 현재 30 ticks (조정 가능: 10~60 ticks)

**서킷브레이커 설정값**:
- Level 1: -8% (조정 가능: -5%~-10%)
- Level 2: -15% (조정 가능: -10%~-20%)
- Level 3: -20% (조정 가능: -15%~-25%)

**Tick Size 규칙**:
- 현재: KRX 표준 (변경 권장하지 않음)
- 교육적 가치를 위해 현실과 동일하게 유지

## 결론

한국 KRX 가격제한 시스템을 완전히 구현하여:
- ✅ ±30% 일일 가격제한
- ✅ Tick Size 호가 단위
- ✅ VI (Volatility Interruption)
- ✅ 서킷브레이커 (3단계)
- ✅ 거래 제한 통합
- ✅ UI 피드백

게임의 리얼리즘과 교육적 가치가 크게 향상되었으며, 플레이어는 실제 한국 주식 시장의 규칙을 체험할 수 있습니다.

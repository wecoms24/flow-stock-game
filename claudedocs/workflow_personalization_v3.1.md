# v3.1 AI 하이퍼-퍼스널라이제이션 구현 워크플로우

본 문서는 workflow_v3.md의 실행 계획을 현재 Retro Stock OS 코드베이스에 맞게 조정한 구현 가능한 워크플로우입니다.

## 📋 개요

### 목표
플레이어 행동 기반 프로필 산출 및 UI/파이프라인/라이벌 개인화를 통해 **피로도 감소 + 몰입 강화** 달성

### 범위 (v3.1)
- ✅ 행동 로그 수집 (상한 1000개 유지)
- ✅ PlayerProfile 산출 (일/월 경계에서만 계산)
- ✅ PersonalizationPolicy 적용 (UI, 파이프라인, 라이벌)
- ✅ 개인화 ON/OFF 토글 (회귀 방지)

### 비범위
- ❌ LLM 대화형 비서
- ❌ 틱마다 모델 추론 (성능 리스크)
- ❌ 완전 적응형 치트 AI

---

## 🏗️ 아키텍처 및 통합 포인트

### 파일 구조
```
src/
├── types/
│   ├── index.ts                    # 기존 타입
│   └── personalization.ts          # 🆕 PlayerEvent, PlayerProfile, PersonalizationPolicy
├── stores/
│   └── gameStore.ts                # 🔧 personalization 상태 추가
├── systems/
│   └── personalization/
│       └── profile.ts              # 🆕 computeProfileFromEvents()
├── engines/
│   ├── tickEngine.ts               # 🔧 day/month 경계 연결
│   └── tradePipeline/
│       └── managerLogic.ts         # 🔧 evaluateRisk에 approvalBias 적용
└── components/
    └── windows/
        ├── SettingsWindow.tsx      # 🔧 personalizationEnabled 토글
        └── RankingWindow.tsx        # 🔧 기본 탭 개인화
```

### 통합 포인트

#### 1. 스토어 확장 (src/stores/gameStore.ts)
```typescript
interface GameStore {
  // 🆕 Personalization State
  playerEventLog: PlayerEvent[]
  playerProfile: PlayerProfile
  personalizationEnabled: boolean

  // 🆕 Actions
  logPlayerEvent: (kind: string, meta: Record<string, any>) => void
  updateProfileOnDayEnd: () => void
  updateProfileOnMonthEnd: () => void
  setPersonalizationEnabled: (enabled: boolean) => void
}
```

#### 2. 엔진 연결 (src/engines/tickEngine.ts)
```typescript
// advanceHour 내 (line 877 이후)
const dayChanged = day !== oldDay
if (dayChanged && personalizationEnabled) {
  current.updateProfileOnDayEnd()
}

// processMonthly 끝 (line 932 이후)
if (personalizationEnabled) {
  current.updateProfileOnMonthEnd()
}
```

#### 3. 파이프라인 바이어스 (src/engines/tradePipeline/managerLogic.ts)
```typescript
export function evaluateRisk(proposal, profile) {
  let threshold = BASE_THRESHOLD

  if (personalizationEnabled) {
    const bias = profile.riskTolerance < 0.3 ? +7
                : profile.riskTolerance > 0.7 ? -5
                : 0
    threshold += bias
  }

  // ... 기존 로직
}
```

---

## 📅 2주 스프린트 실행 계획

### Sprint 1 (Week 1): Foundation + Profile

#### Phase 1: 타입 및 스토어 확장 (Day 1-2)

**P0-1: 타입 정의** (0.5d)

**Subtasks:**
- [ ] `src/types/personalization.ts` 파일 생성
- [ ] `PlayerEvent` 타입 정의
  ```typescript
  export interface PlayerEvent {
    kind: 'TRADE' | 'SETTINGS' | 'WINDOW_FOCUS'
    timestamp: number
    day: number // 게임 내 일 수
    metadata: Record<string, any>
  }
  ```
- [ ] `PlayerProfile` 타입 정의
  ```typescript
  export interface PlayerProfile {
    version: number
    riskTolerance: number // 0.0-1.0 (위험 선호도)
    playPace: number // 0.0-1.0 (플레이 속도)
    attention: number // 0.0-1.0 (집중도)
    learningStage: 'beginner' | 'intermediate' | 'advanced'
    lastUpdatedDay: number
  }
  ```
- [ ] `PersonalizationPolicy` 타입 정의
  ```typescript
  export interface PersonalizationPolicy {
    approvalBias: number // evaluateRisk 임계치 조정
    defaultTab: string // RankingWindow 기본 탭
    tauntFilter: 'show' | 'collapse' | 'hide'
  }
  ```
- [ ] `defaultProfile()` 함수 작성
- [ ] `MAX_EVENT_LOG_SIZE = 1000` 상수 정의

**Acceptance Criteria:**
- [ ] `npm run build` 타입 에러 0
- [ ] 기존 테스트 컴파일/실행에 영향 없음

---

**P0-2: 스토어 확장** (1.0d)

**Subtasks:**
- [ ] `src/stores/gameStore.ts` 수정
- [ ] `GameStore` 인터페이스에 personalization 상태 추가
  - `playerEventLog: PlayerEvent[]`
  - `playerProfile: PlayerProfile`
  - `personalizationEnabled: boolean`
- [ ] 초기 상태 설정
  ```typescript
  playerEventLog: [],
  playerProfile: defaultProfile(),
  personalizationEnabled: false,
  ```
- [ ] `logPlayerEvent(kind, meta)` 액션 구현
  - 상한 1000개 유지 (초과 시 FIFO drop)
  - timestamp, day 자동 기록
- [ ] `setPersonalizationEnabled(enabled)` 액션 구현
- [ ] `SaveData` 타입에 personalization 필드 추가 (선택적)
  ```typescript
  export interface SaveData {
    // ... 기존 필드
    playerEventLog?: PlayerEvent[]
    playerProfile?: PlayerProfile
    personalizationEnabled?: boolean
  }
  ```

**Acceptance Criteria:**
- [ ] 로그가 상한 1000개를 넘지 않음
- [ ] `personalizationEnabled` 토글이 동작함
- [ ] 기존 세이브 로드 시 에러 없음 (backward compatibility)

---

#### Phase 2: 프로필 산출 및 연결 (Day 3-4)

**P1-1: 프로필 산출 함수** (1.0d)

**Subtasks:**
- [ ] `src/systems/personalization/` 디렉토리 생성
- [ ] `profile.ts` 파일 생성
- [ ] `computeProfileFromEvents(events: PlayerEvent[], currentDay: number): PlayerProfile` 구현
  - **riskTolerance** 계산 (최근 14일 TRADE 이벤트 기반)
    - 높은 volatility 종목 거래 빈도
    - 큰 포지션 사이즈 비율
  - **playPace** 계산 (최근 7일 SETTINGS 변경 빈도)
    - speed 변경 횟수
    - pause 토글 빈도
  - **attention** 계산 (최근 30일 WINDOW_FOCUS 다양성)
    - 다양한 탭 방문 여부
    - 집중도 패턴 분석
  - **learningStage** 계산 (플레이 일 수 기준)
    - 0-30일: beginner
    - 31-180일: intermediate
    - 181+: advanced
- [ ] 순수 함수로 구현 (동일 입력 → 동일 출력)

**Acceptance Criteria:**
- [ ] 동일 입력이면 동일 출력 (순수성)
- [ ] 계산 복잡도 O(N), N=최근 이벤트 수
- [ ] N은 상한 1000으로 제한됨

---

**P1-2: 엔진 연결** (1.0d)

**Subtasks:**
- [ ] `src/stores/gameStore.ts` - `advanceHour` 수정
  - line 877 이후에 dayChanged 조건 추가
  ```typescript
  if (dayChanged && s.personalizationEnabled) {
    // updateProfileOnDayEnd() 호출 (아래에서 구현)
  }
  ```
- [ ] `updateProfileOnDayEnd()` 액션 구현
  ```typescript
  updateProfileOnDayEnd: () => set((s) => {
    if (!s.personalizationEnabled) return {}
    if (s.playerProfile.lastUpdatedDay === s.time.day) return {} // 중복 방지

    const newProfile = computeProfileFromEvents(s.playerEventLog, s.time.day)
    return { playerProfile: { ...newProfile, lastUpdatedDay: s.time.day } }
  })
  ```
- [ ] `src/stores/gameStore.ts` - `processMonthly` 수정
  - line 932 이후에 `updateProfileOnMonthEnd()` 호출 추가
- [ ] `updateProfileOnMonthEnd()` 액션 구현 (현재는 day-end와 동일)
  ```typescript
  updateProfileOnMonthEnd: () => {
    const state = get()
    state.updateProfileOnDayEnd() // 월말에도 프로필 갱신
  }
  ```

**Acceptance Criteria:**
- [ ] `time.isPaused === true`일 때 프로필 업데이트가 실행되지 않음
- [ ] day 경계에서만 `lastUpdatedDay`가 증가함
- [ ] 중복 실행 방지 확인 (동일 day에 2번 호출되지 않음)

---

#### Phase 3: 이벤트 로깅 (Day 5)

**P0-3: 행동 로그 수집** (1.0d)

**Subtasks:**
- [ ] `src/stores/gameStore.ts` - `buyStock` 수정
  - 성공 시 TRADE 로그 기록
  ```typescript
  logPlayerEvent('TRADE', {
    action: 'buy',
    companyId,
    ticker: company.ticker,
    qty: shares,
    price: company.price,
  })
  ```
- [ ] `src/stores/gameStore.ts` - `sellStock` 수정
  - 성공 시 TRADE 로그 기록
  ```typescript
  logPlayerEvent('TRADE', {
    action: 'sell',
    companyId,
    ticker: company.ticker,
    qty: shares,
    price: company.price,
    pnl: (company.price - position.avgBuyPrice) * shares,
  })
  ```
- [ ] `src/stores/gameStore.ts` - `togglePause` 수정
  - SETTINGS 로그 기록
  ```typescript
  logPlayerEvent('SETTINGS', { isPaused: !s.time.isPaused })
  ```
- [ ] `src/stores/gameStore.ts` - `setSpeed` 수정
  - SETTINGS 로그 기록
  ```typescript
  logPlayerEvent('SETTINGS', { speed })
  ```
- [ ] (선택적) `src/components/windows/RankingWindow.tsx` - 탭 변경 시
  - WINDOW_FOCUS 로그 기록
  ```typescript
  logPlayerEvent('WINDOW_FOCUS', { tabId })
  ```

**Acceptance Criteria:**
- [ ] 로그가 상한 1000개를 넘지 않음
- [ ] `personalizationEnabled = false`여도 로그는 기록됨 (프로필 계산만 스킵)

---

### Sprint 2 (Week 2): Policy Apply + UX + Rival

#### Phase 4: UI 개인화 (Day 6-7)

**P2-1: SettingsWindow 수정** (0.5d)

**Subtasks:**
- [ ] `src/components/windows/SettingsWindow.tsx` 수정
- [ ] personalizationEnabled 체크박스 추가
  ```tsx
  <label>
    <input
      type="checkbox"
      checked={personalizationEnabled}
      onChange={(e) => setPersonalizationEnabled(e.target.checked)}
    />
    개인화 기능 사용
  </label>
  ```
- [ ] `setPersonalizationEnabled` 액션 연결
- [ ] (선택적) 프로필 디버그 뷰 추가
  ```tsx
  {personalizationEnabled && (
    <div className="profile-debug">
      <p>위험 선호도: {(playerProfile.riskTolerance * 100).toFixed(0)}%</p>
      <p>플레이 속도: {(playerProfile.playPace * 100).toFixed(0)}%</p>
      <p>집중도: {(playerProfile.attention * 100).toFixed(0)}%</p>
      <p>학습 단계: {playerProfile.learningStage}</p>
    </div>
  )}
  ```

**Acceptance Criteria:**
- [ ] 토글 OFF 시 적용 정책이 중립값으로 리셋됨
- [ ] 사운드 설정 등 기존 UX 훼손 없음

---

**P2-2: RankingWindow 수정** (0.5d)

**Subtasks:**
- [ ] `src/components/windows/RankingWindow.tsx` 수정
- [ ] `playerProfile.attention` 기반 기본 탭 선택
  ```typescript
  const defaultTab = useMemo(() => {
    if (!personalizationEnabled) return '거래'
    if (playerProfile.attention > 0.7) return '상세'
    if (playerProfile.attention < 0.3) return '순위'
    return '거래'
  }, [personalizationEnabled, playerProfile.attention])
  ```
- [ ] 기존 `needsCompanies` 최적화 유지
  - 디테일 탭에서만 companies subscribe

**Acceptance Criteria:**
- [ ] 탭이 자동 선택되되, 사용자가 바꾸면 즉시 반영됨
- [ ] 리렌더 폭증 없음 (React DevTools Profiler로 확인)

---

**P2-3: Taunt 표시 정책** (0.5d, 선택적)

**Subtasks:**
- [ ] `src/components/windows/RankingWindow.tsx` - taunt 필터링
- [ ] `playerProfile.riskTolerance < 0.3` → taunt 기본 접힘
  ```typescript
  const [tauntCollapsed, setTauntCollapsed] = useState(() => {
    return personalizationEnabled && playerProfile.riskTolerance < 0.3
  })
  ```
- [ ] taunt 데이터는 그대로 누적 (상한 20개 유지)

**Acceptance Criteria:**
- [ ] taunt 데이터(`taunts`)는 그대로 누적됨
- [ ] UI만 다르게 보임 (접힌 상태)

---

#### Phase 5: 파이프라인 바이어스 (Day 8)

**P3-1: evaluateRisk 바이어스 적용** (1.0d)

**Subtasks:**
- [ ] `src/engines/tradePipeline/managerLogic.ts` 수정
- [ ] `evaluateRisk` 함수에 approvalBias 적용
  ```typescript
  export function evaluateRisk(
    proposal: TradeProposal,
    playerProfile: PlayerProfile,
    personalizationEnabled: boolean
  ): { approved: boolean; reason: string } {
    let threshold = TRADE_AI_CONFIG.CONFIDENCE_THRESHOLD // 70

    if (personalizationEnabled) {
      const bias = playerProfile.riskTolerance < 0.3 ? +7  // 보수적
                  : playerProfile.riskTolerance > 0.7 ? -5  // 공격적
                  : 0
      threshold += bias

      if (bias !== 0) {
        // officeEvents에 근거 로그 남김
        useGameStore.getState().officeEvents.push({
          timestamp: Date.now(),
          type: 'personalization',
          emoji: '🎯',
          message: `개인화 정책으로 승인 임계치 ${bias > 0 ? '+' : ''}${bias} 적용`,
          employeeIds: [],
        })
      }
    }

    // 기존 로직 (자금 부족, 수량 부족 등)
    // ...

    if (proposal.confidence < threshold) {
      return { approved: false, reason: '신뢰도 부족' }
    }

    return { approved: true, reason: 'OK' }
  }
  ```
- [ ] `processManagerTick`에서 `evaluateRisk` 호출 시 playerProfile, personalizationEnabled 전달

**Acceptance Criteria:**
- [ ] `personalizationEnabled = false` 시 `bias = 0`
- [ ] 자금 부족/수량 부족 같은 기존 거절 사유 로직 변경 없음
- [ ] officeEvents에 근거 메시지가 기록됨

---

#### Phase 6: Mirror Rival (Day 9)

**P4-1: Mirror Rival 지정 및 파라미터 주입** (1.0d)

**Subtasks:**
- [ ] `src/types/index.ts` - `Competitor` 타입 확장
  ```typescript
  export interface Competitor {
    // ... 기존 필드
    isMirrorRival?: boolean
  }
  ```
- [ ] `src/engines/competitorEngine.ts` - `generateCompetitors` 수정
  - 생성 시 1명을 Mirror로 지정 (랜덤 선택)
  ```typescript
  const competitors = /* ... */
  if (competitors.length > 0) {
    const mirrorIndex = Math.floor(Math.random() * competitors.length)
    competitors[mirrorIndex].isMirrorRival = true
  }
  ```
- [ ] `src/engines/competitorEngine.ts` - `processAITrading` 수정
  - Mirror Rival일 경우 파라미터 조정
  ```typescript
  if (comp.isMirrorRival && personalizationEnabled) {
    const positionMultiplier = playerProfile.riskTolerance // 0.0-1.0
    const frequencyMultiplier = playerProfile.playPace // 0.0-1.0
    const panicSensitivity = 1.0 - playerProfile.riskTolerance // 역비례

    // 파라미터 주입 (전략 타입은 유지)
    // ...
  }
  ```

**Acceptance Criteria:**
- [ ] 기존 competitor 벤치/테스트 통과 (패닉셀 쿨다운, priceHistory 길이 1일 때 무행동 등)
- [ ] Mirror Rival이 플레이어와 유사한 패턴으로 거래함 (수동 검증)

---

#### Phase 7: 테스트 및 검증 (Day 10)

**T-1: profile 업데이트 타이밍**

**테스트 시나리오:**
- Given: `advanceHour()` 30번 실행 (3일 진행)
- Expect:
  - `updateProfileOnDayEnd()`가 3번만 호출됨
  - `playerProfile.lastUpdatedDay`가 3번 증가함
  - `time.isPaused === true`일 때는 업데이트 없음

**구현:**
```typescript
test('profile updates only on day boundaries', () => {
  const store = useGameStore.getState()
  store.setPersonalizationEnabled(true)

  const initialDay = store.time.day
  for (let i = 0; i < 30; i++) {
    store.advanceHour()
  }

  expect(store.playerProfile.lastUpdatedDay).toBe(initialDay + 3)
})
```

---

**T-2: 로그 상한**

**테스트 시나리오:**
- Given: 1500개 이벤트 기록
- Expect: `playerEventLog.length === 1000` (상한 유지)

**구현:**
```typescript
test('event log maintains cap at 1000', () => {
  const store = useGameStore.getState()

  for (let i = 0; i < 1500; i++) {
    store.logPlayerEvent('TRADE', { action: 'buy' })
  }

  expect(store.playerEventLog.length).toBe(1000)
})
```

---

**T-3: OFF 동작 동일**

**테스트 시나리오:**
- Given: 동일 시나리오에서 `personalizationEnabled = false`
- Expect:
  - `evaluateRisk` 결과가 바이어스 없이 동일함
  - RankingWindow 기본 탭이 중립값('거래')임
  - taunt 표시가 기본 동작임

**구현:**
```typescript
test('OFF mode behaves identically to baseline', () => {
  const store = useGameStore.getState()
  store.setPersonalizationEnabled(false)

  // evaluateRisk 호출
  const result = evaluateRisk(proposal, store.playerProfile, false)
  expect(result.approved).toBe(baselineResult.approved)

  // RankingWindow 기본 탭
  // (UI 컴포넌트 테스트로 별도 구현)
})
```

---

**T-4: 경쟁자 회귀**

**테스트 시나리오:**
- Given: 기존 competitorEngine 테스트 시나리오
- Expect: 패닉셀 쿨다운, 행동 분포 테스트 그대로 통과

**구현:**
```typescript
test('competitor engine regression tests pass', () => {
  // 기존 테스트 재실행
  // tests/integration/competitorEngine.test.ts
})
```

---

## ⚠️ 위험 요소 및 회귀 방지

### 1. 성능 리스크
**위험:** playerEventLog 무제한 증가 → 메모리 누수
**완화:** MAX_EVENT_LOG_SIZE = 1000 강제, FIFO drop

**위험:** day/month마다 프로필 계산 → CPU 부하
**완화:** O(N) 복잡도 유지, N ≤ 1000 상한

### 2. 회귀 리스크
**위험:** 기존 advanceHour/processMonthly 로직 변경 → 기존 기능 손상
**완화:** personalizationEnabled 플래그로 조건부 실행

**위험:** evaluateRisk 바이어스 → 트레이드 파이프라인 동작 변경
**완화:** 플래그 OFF 시 bias = 0, 기존 테스트 통과 확인

### 3. 타입 안전성
**위험:** 선택적 속성 추가 → SaveData 호환성
**완화:** 모든 personalization 필드를 선택적(`?`)으로 정의

### 4. 테스트 복잡도
**위험:** day/month 경계 테스트 → 시간 조작 필요
**완화:** 단위 테스트 + 통합 테스트 분리, advanceHour 30번 실행 패턴 사용

---

## 📊 의존성 그래프

```
P0-1 (타입 정의)
  ↓
P0-2 (스토어 확장) ← P1-1 (프로필 산출 함수)
  ↓
P1-2 (엔진 연결) ← P0-3 (이벤트 로깅)
  ↓
┌────────────────┬────────────────┬─────────────────┐
│                │                │                 │
P2-1           P2-2            P2-3             P3-1
(Settings)     (Ranking)       (Taunt)          (evaluateRisk)
│                │                │                 │
└────────────────┴────────────────┴─────────────────┘
  ↓
P4-1 (Mirror Rival)
  ↓
T-1, T-2, T-3, T-4 (테스트)
```

---

## 🔄 병렬 실행 전략 (2인 가정)

### Week 1
| Day | Dev A | Dev B |
|-----|-------|-------|
| 1 | P0-1 → P0-2 시작 | 대기 |
| 2 | P0-2 완료 | P1-1 완료 |
| 3 | P1-2 시작 | P0-3 시작 |
| 4 | P1-2 완료 | P0-3 완료 |
| 5 | 통합 테스트 (Sprint 1 완료) | 통합 테스트 |

### Week 2
| Day | Dev A | Dev B |
|-----|-------|-------|
| 6 | P2-1, P2-2 | P3-1 |
| 7 | P2-3 (선택적) | P4-1 |
| 8 | 통합 및 T-1, T-2 | 통합 및 T-1, T-2 |
| 9 | T-3, T-4 | 버그 수정 |
| 10 | 최종 검증 및 릴리즈 준비 | 최종 검증 |

---

## ✅ 완료 조건 (DoD)

- [ ] 모든 P* 티켓의 AC 통과
- [ ] T-1, T-2, T-3, T-4 테스트 통과
- [ ] `npm run build` 에러 없음
- [ ] `npm run lint` 에러 없음
- [ ] 기존 테스트 회귀 없음 (tests/ 전체 통과)
- [ ] personalizationEnabled OFF 시 기존 동작과 동일
- [ ] 세이브/로드 backward compatibility 확인
- [ ] 성능 벤치 (프로필 계산 < 10ms, 로그 추가 < 1ms)

---

## 📝 구현 시 참고 사항

### Critical Path
P0-1 → P0-2 → P1-1/P1-2 → P3-1 (파이프라인 바이어스가 핵심 가치)

### Nice to Have
- P2-3 (Taunt 필터)
- P4-1 (Mirror Rival)

### 기존 코드 패턴 재사용
- `advanceHour`의 `dayChanged` 로직 (line 877)
- `processMonthly`의 `lastProcessedMonth` 체크 (line 906)
- officeEvents 메시지 기록 패턴
- SaveData 선택적 필드 패턴

### 주의사항
- 모든 personalization 로직은 `personalizationEnabled` 플래그로 감싸기
- 기존 함수 시그니처 최대한 유지 (내부 로직만 조정)
- 타입스크립트 strict mode 유지
- 기존 테스트 깨지지 않도록 점진적 통합

---

**문서 버전:** v3.1
**최종 수정일:** 2026-02-16
**기반 문서:** claudedocs/workflow_v3.md
**프로젝트:** Retro Stock OS (flow-stock-game)

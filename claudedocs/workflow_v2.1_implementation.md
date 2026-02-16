# Implementation Workflow: Retro Stock OS v2.1

> **Generated**: 2026-02-15
> **Source**: `merged_code-v2.txt` (Store Contracts & Test Suites) + v2.1 Implementation Spec
> **Target**: Store Slice Pattern, 100-Company Expansion, Financial Report System, Test Suite Compliance

---

## Gap Analysis Summary

### Current State vs. v2.1 Target

| 영역 | Current (v1) | Target (v2.1) | Gap Level |
|------|-------------|---------------|-----------|
| **Store 구조** | 단일 gameStore.ts (2,320 LOC) | Slice Pattern (7개 슬라이스) | 🔴 Major |
| **회사 수** | 20개 (5 sectors) | 100개 (10 sectors, 10/sector) | 🔴 Major |
| **달력 시스템** | 3600 ticks = 1 day | 10 ticks = 1 day (v2.1 spec) | 🟡 Conflict |
| **재무 보고서** | 없음 | LedgerEntry + QuarterReport | 🔴 New Feature |
| **Trading Slippage** | 기본 1% (tradeAIConfig) | Volume-based 0.01%~1.0% | 🟡 Enhancement |
| **테스트 인프라** | 26 test files 존재 | helpers.ts + 통합테스트 계약 | 🟡 Alignment |
| **타입 시스템** | Employee (optional fields) | Stricter contracts (v2 schema) | 🟡 Migration |

### Critical Conflicts to Resolve

1. **Tick-to-Day Ratio**: 현재 3600 ticks/day vs. v2.1 spec의 10 ticks/day
   - **권장**: 현재 시스템(3600) 유지. v2.1 spec의 "10 ticks = 1 day"는 테스트용 간소화 예시로 해석
   - **근거**: 기존 tickEngine, competitorEngine, tradePipeline 모두 3600 기반으로 구현됨

2. **Company Count**: 20 → 100 확장은 data/companies.ts 대규모 수정 필요
   - 10개 섹터 × 10개 회사 = 100개 정의
   - priceEngine.worker.ts 성능 검증 필요 (100개 GBM 동시 계산)

3. **Store Interface 불일치**: merged_code-v2.txt의 `GameState` 타입과 현재 `GameStore` 인터페이스 차이
   - v2 contracts: `salary`, `salaryPerMonth`, `monthlyBonus` 등 필드명 차이
   - v2 helpers: `GameState` 타입 사용 vs. 현재 `GameStore` 사용

---

## Implementation Phases

### Phase 0: Foundation & Test Infrastructure
**목표**: 테스트 헬퍼와 타입 계약 정립
**예상 소요**: 작업 단위 3개
**의존성**: 없음

#### Task 0.1: Test Helper 설정
- [ ] `tests/integration/helpers.ts` 파일이 현재 타입과 호환되도록 업데이트
- [ ] `createTestStore()` — 현재 `GameStore` 인터페이스와 일치시킴
- [ ] `createTestEmployee()` — `Employee` 타입의 optional vs required 필드 정리
- [ ] `createTestCompany()` — `Company` 타입 (sector를 소문자 enum으로)
- [ ] `createTestCompetitor()` — `Competitor` 타입 일치

**주의**: v2 contracts의 `GameState`와 현재 코드의 `GameStore`를 통합해야 함. 외부 인터페이스로 `GameState`를 도입하고 `GameStore`가 이를 extend하는 구조 권장.

#### Task 0.2: Vitest 설정 검증
- [ ] `vitest.config.ts` — `@/` 경로 alias 설정 확인
- [ ] `tsconfig.json` — paths 매핑 확인
- [ ] Unit test 스위트 (data/*) 실행 → 현재 통과 여부 파악
- [ ] Integration test 스위트 — 어떤 테스트가 fail하는지 목록화

#### Task 0.3: 타입 계약 통합
- [ ] `src/types/finance.ts` 생성 — `LedgerEntry`, `QuarterReport` 타입 정의
- [ ] `src/types/index.ts` — 누락된 exported types 추가 (v2 contracts 기준)
- [ ] Employee 타입 필드명 표준화:
  - `salary` → `salaryPerMonth` (또는 반대)
  - `skills` object shape 확인 (`{analysis, trading, research}`)
  - optional → required 마이그레이션 결정

---

### Phase 1: Data Layer Expansion (100 Companies)
**목표**: 20개 → 100개 회사 데이터 확장
**예상 소요**: 작업 단위 4개
**의존성**: Phase 0.3 (타입 정의)

#### Task 1.1: 섹터 확장 (5 → 10)
- [ ] `src/types/index.ts` — `Sector` 타입에 5개 추가: `industrial`, `telecom`, `materials`, `utilities`, `realestate`
  - 현재: `tech | finance | energy | healthcare | consumer` + 이미 추가됨
  - **확인**: 현재 이미 10개 섹터가 정의되어 있음 → 회사 데이터만 확장 필요

#### Task 1.2: 회사 데이터 확장 (20 → 100)
- [ ] `src/data/companies.ts` — 80개 회사 추가 (10개 섹터 × 10개)
- [ ] 각 회사별 고유 ID, ticker, name (한글), price, drift, volatility 설정
- [ ] 섹터별 특성 반영:
  - `tech`: 높은 volatility (0.3+), 높은 drift
  - `utilities`: 낮은 volatility (0.15-0.25), 안정적 drift
  - `finance`: 중간 volatility, 이벤트 민감도 높음
- [ ] `eventSensitivity` 필드 추가 (섹터별 기본값)
- [ ] `description` 필드 추가 (한글)

**데이터 설계 기준**:
```
ID format: {sector}-{nn} (예: tech-01, finance-05)
Ticker: 3-4글자 대문자 영문
Name: 한글 기업명
Price range: 1,000 ~ 500,000원
```

#### Task 1.3: 섹터 상관관계 업데이트
- [ ] `src/data/sectorCorrelation.ts` — 10×10 매트릭스로 확장
- [ ] 새 섹터 간 상관관계 정의 (industrial ↔ materials 높음, etc.)

#### Task 1.4: Web Worker 성능 검증
- [ ] `src/workers/priceEngine.worker.ts` — 100개 동시 GBM 계산 벤치마크
- [ ] 필요시 배치 처리 (50개씩 2배치)
- [ ] `PERFORMANCE_CONFIG` 조정 필요 여부 판단

**검증 기준**: Unit test `companies.test.ts` — "정확히 100개의 회사가 정의되어 있다" 통과

---

### Phase 2: Store Slice Pattern 리팩토링
**목표**: 2,320 LOC 단일 스토어 → 7개 슬라이스 분리
**예상 소요**: 작업 단위 8개
**의존성**: Phase 0 (타입), Phase 1 (100 companies)

> **핵심 원칙**: 외부 API (useGameStore, action signatures) 변경 없이 내부 구조만 리팩토링.
> 모든 컴포넌트의 `useGameStore((s) => s.xxx)` 패턴이 동일하게 작동해야 함.

#### Task 2.1: Slice Architecture 설계
- [ ] `src/stores/slices/` 디렉토리 생성
- [ ] Slice 간 의존성 맵 정의:
  ```
  lifecycleSlice → [timeSlice, tradingSlice, employeeSlice, windowSlice]
  timeSlice → [tradingSlice (processMonthly)]
  tradingSlice → [financeSlice (ledger entry)]
  employeeSlice → [officeSlice (grid cleanup)]
  officeSlice → [employeeSlice (buff application)]
  financeSlice → [windowSlice (report window)]
  windowSlice → (독립)
  ```

#### Task 2.2: `windowSlice.ts` 분리 (독립, 의존성 없음)
- [ ] Window 관련 상태: `windows`, `nextZIndex`, `windowIdCounter`
- [ ] Actions: `openWindow`, `closeWindow`, `minimizeWindow`, `toggleMaximizeWindow`, `focusWindow`, `moveWindow`, `resizeWindow`, `updateWindowProps`, `applyWindowLayout`
- [ ] `isFlashing`, `triggerFlash`, `unreadNewsCount` 포함
- [ ] 예상 LOC: ~200

#### Task 2.3: `timeSlice.ts` 분리
- [ ] Time 관련 상태: `time`, `lastProcessedMonth`
- [ ] Actions: `advanceTick`, `processMonthly`, `setSpeed`, `togglePause`
- [ ] `advanceTick` 내부의 processMonthly 호출 → `get()` 통해 다른 슬라이스 접근
- [ ] 예상 LOC: ~150

#### Task 2.4: `tradingSlice.ts` 분리
- [ ] Trading 관련 상태: (player.cash, player.portfolio 접근)
- [ ] Actions: `buyStock`, `sellStock`, `updatePrices`, `addEvent`, `addNews`, `markNewsRead`
- [ ] **v2.1 Enhancement**: Volume-based slippage 계산 추가
  ```typescript
  const volumeImpact = Math.min(0.01, shares * 0.0001)
  const executionPrice = company.price * (1 + volumeImpact)
  ```
- [ ] Market 상태: `companies`, `events`, `news`
- [ ] 예상 LOC: ~300

#### Task 2.5: `employeeSlice.ts` 분리
- [ ] Employee 관련 상태: (player.employees 접근)
- [ ] Actions: `hireEmployee`, `fireEmployee`, `gainXP`, `praiseEmployee`, `scoldEmployee`, `dismissLevelUp`
- [ ] Trade AI Pipeline actions: `addProposal`, `updateProposalStatus`, `expireOldProposals`, `processAnalystTick`, `processManagerTick`, `processTraderTick`
- [ ] `pendingLevelUp`, `proposals` 상태
- [ ] `employeeBehaviors`, `officeEvents` 상태
- [ ] 예상 LOC: ~500

#### Task 2.6: `officeSlice.ts` 분리
- [ ] Office 관련 상태: (player.officeGrid 접근)
- [ ] Actions: `initializeOfficeGrid`, `placeFurniture`, `removeFurniture`, `assignEmployeeSeat`, `unassignEmployeeSeat`, `recalculateGridBuffs`, `processEmployeeTick`, `upgradeOffice`
- [ ] 예상 LOC: ~300

#### Task 2.7: `financeSlice.ts` 생성 (NEW)
- [ ] **New State**: `ledger: LedgerEntry[]`, `quarterReports: QuarterReport[]`, `quarterStats`
- [ ] **New Actions**:
  - `addLedgerEntry(entry: LedgerEntry)` — 매 거래/급여/구매 시 호출
  - `generateQuarterlyReport()` — 분기 마감 시 실행
- [ ] **Report Generation Logic**:
  1. `time.isPaused = true`
  2. `LedgerEntry` 분기별 집계
  3. Net Income 기반 직원 만족도/스트레스 조정
  4. `openWindow('FINANCIAL_REPORT', reportData)` 호출
- [ ] 예상 LOC: ~200

#### Task 2.8: `lifecycleSlice.ts` 분리
- [ ] Lifecycle 상태: `config`, `difficultyConfig`, `isGameStarted`, `isGameOver`, `endingResult`
- [ ] Actions: `startGame`, `loadSavedGame`, `autoSave`, `checkEnding`
- [ ] Competitor 상태: `competitors`, `competitorCount`, `competitorActions`, `taunts`
- [ ] Competitor Actions: `initializeCompetitors`, `processCompetitorTick`, `executeBatchActions`, `updateCompetitorAssets`, `calculateRankings`, `addTaunt`
- [ ] 예상 LOC: ~400

#### Task 2.9: `gameStore.ts` 리팩토링 (Entry Point)
- [ ] `create()` 호출에서 모든 슬라이스 합성
- [ ] Zustand `StateCreator` 패턴 적용:
  ```typescript
  export const useGameStore = create<GameStore>()(
    (...a) => ({
      ...createLifecycleSlice(...a),
      ...createTimeSlice(...a),
      ...createTradingSlice(...a),
      ...createEmployeeSlice(...a),
      ...createOfficeSlice(...a),
      ...createFinanceSlice(...a),
      ...createWindowSlice(...a),
    })
  )
  ```
- [ ] Middleware 추가 (devtools, optional logger)
- [ ] 기존 import 경로 호환성 유지 (`useGameStore` export 위치 동일)
- [ ] 예상 LOC: ~100

**검증 기준**: `npm run build` 성공 + 기존 모든 컴포넌트 정상 작동

---

### Phase 3: Engine Logic Alignment
**목표**: 엔진 레이어가 새 스토어/데이터와 정합성 유지
**예상 소요**: 작업 단위 5개
**의존성**: Phase 2 (Store Slices)

#### Task 3.1: Competitor Engine 업데이트
- [ ] `competitorEngine.ts` — 100개 회사 대응
- [ ] 전략별 종목 필터링 로직 업데이트 (sector 기반)
- [ ] Tick Distribution 재조정 (100 companies 부하)
- [ ] Price history cap 검증 (50 → 유지 또는 축소)

#### Task 3.2: Office System Export 정리
- [ ] `calculateEmployeeBuffs` — 테스트 계약에 맞게 export
- [ ] `updateOfficeSystem` — 슬라이스 호출 인터페이스 맞춤
- [ ] 성격(trait) 효과 시스템 — `TRAIT_DEFINITIONS` 키 기반 동작 검증

#### Task 3.3: Trade Pipeline 통합
- [ ] `analystLogic.ts` — 100개 회사 스캔 최적화 (assignedSectors 기반 필터링)
- [ ] `managerLogic.ts` — Risk 평가 로직이 새 데이터와 호환 확인
- [ ] `traderLogic.ts` — Volume-based slippage 적용
- [ ] `adjacencyBonus.ts` — 변경 불필요 (좌표 기반)

#### Task 3.4: News & Event Engine 확장
- [ ] `newsEngine.ts` — 10개 섹터 대응, 100개 회사 뉴스 생성
- [ ] `events.ts` — EVENT_TEMPLATES 검증 (v2 test: 50개, type별 분포)
- [ ] `sentimentEngine.ts` — 섹터별 감성 집계 확장

#### Task 3.5: Financial Report Engine 연동
- [ ] `tickEngine.ts`에 분기 체크 추가:
  ```typescript
  if (month % 3 === 0 && day === 30) {
    get().generateQuarterlyReport()
  }
  ```
- [ ] Trading/Salary/Office 액션에서 `addLedgerEntry()` 호출 주입
- [ ] 분기 보고서 윈도우 트리거 확인

---

### Phase 4: UI Component Alignment
**목표**: 새 기능/데이터에 맞는 UI 업데이트
**예상 소요**: 작업 단위 4개
**의존성**: Phase 2 (Store), Phase 3 (Engines)

#### Task 4.1: Financial Report Window (NEW)
- [ ] `src/components/windows/FinancialReportWindow.tsx` 생성
- [ ] QuarterReport 데이터 시각화:
  - 수입/지출 막대 차트
  - Top Gainer/Loser 표시
  - Net Income 표시 (수익: 초록, 손실: 빨강)
- [ ] WindowFrame 기반, retro 스타일링
- [ ] WindowManager.tsx에 렌더링 케이스 추가
- [ ] WindowType union에 'financial_report' 추가

#### Task 4.2: Trading Window 업데이트
- [ ] 100개 회사 목록 대응 — 섹터별 필터링/탭 UI
- [ ] Slippage 예상 비용 표시
- [ ] 검색 기능 (ticker/name)

#### Task 4.3: Chart Window 업데이트
- [ ] 100개 회사 대응 — 드롭다운 선택자 업데이트
- [ ] 섹터별 그룹핑

#### Task 4.4: Taskbar 업데이트
- [ ] 재무 보고서 버튼 추가
- [ ] 분기 알림 표시 (새 보고서 생성 시)

---

### Phase 5: Test Suite Compliance
**목표**: merged_code-v2.txt의 모든 테스트 스위트 통과
**예상 소요**: 작업 단위 6개
**의존성**: Phase 0~4 전체

#### Task 5.1: Unit Tests — Data Layer
- [ ] `tests/unit/data/companies.test.ts` — 100개 회사, 10 섹터, id/ticker 규칙
- [ ] `tests/unit/data/events.test.ts` — 50개 이벤트, type별 분포, drift/volatility 범위
- [ ] `tests/unit/data/chatter.test.ts` — 템플릿 구조, 카테고리, 쿨다운
- [ ] `tests/unit/data/employees.test.ts` — 이름 생성, 성격, 스킬 초기화
- [ ] `tests/unit/data/traits.test.ts` — 10개 성격, 희귀도 분포, 효과 범위
- [ ] `tests/unit/data/furniture.test.ts` — 10개 가구, 비용, 버프
- [ ] `tests/unit/data/taunts.test.ts` — 5개 카테고리, 다양성

#### Task 5.2: Integration Tests — Store
- [ ] `tests/integration/store/trading.test.ts` — buyStock/sellStock 계약
- [ ] `tests/integration/store/time.test.ts` — advanceTick/processMonthly
- [ ] `tests/integration/store/employees.test.ts` — hire/fire/train
- [ ] `tests/integration/store/office.test.ts` — grid/furniture/buff
- [ ] `tests/integration/store/competitors.test.ts` — AI 초기화/트레이딩

#### Task 5.3: Integration Tests — Engines
- [ ] `tests/integration/engines/officeSystem.test.ts` — calculateEmployeeBuffs 계약
- [ ] `tests/integration/engines/competitorEngine.test.ts` — AI 전략 실행
- [ ] `tests/integration/engines/hrAutomation.test.ts` — HR 자동화
- [ ] `tests/integration/engines/tickEngine.test.ts` — 게임 루프

#### Task 5.4: E2E Tests — Gameplay
- [ ] `tests/e2e/gameplay/trading.test.ts` — 매수/매도 전체 흐름
- [ ] `tests/e2e/gameplay/employees.test.ts` — 직원 라이프사이클
- [ ] `tests/e2e/gameplay/competitors.test.ts` — AI 경쟁
- [ ] `tests/e2e/gameplay/office.test.ts` — 사무실 관리
- [ ] `tests/e2e/gameplay/events.test.ts` — 이벤트 시스템
- [ ] `tests/e2e/gameplay/fullGame.test.ts` — 전체 게임 흐름

#### Task 5.5: Regression Tests
- [ ] `tests/e2e/regression/performance.test.ts` — 성능 벤치마크
- [ ] `tests/e2e/regression/saveLoad.test.ts` — 저장/로드 호환성

#### Task 5.6: Financial Report Tests (NEW)
- [ ] `tests/integration/store/finance.test.ts` — LedgerEntry/QuarterReport 생성
- [ ] `tests/e2e/gameplay/finance.test.ts` — 분기 보고서 전체 흐름

---

### Phase 6: Integration & Validation
**목표**: 전체 시스템 통합 검증
**예상 소요**: 작업 단위 3개
**의존성**: Phase 5

#### Task 6.1: Build & Lint 검증
- [ ] `npm run build` — TypeScript 컴파일 에러 0
- [ ] `npm run lint` — ESLint 경고 최소화
- [ ] Bundle size 비교 (v1 vs. v2.1)

#### Task 6.2: 전체 테스트 스위트 실행
- [ ] `npx vitest run` — 모든 테스트 통과
- [ ] 테스트 커버리지 리포트 생성
- [ ] 실패 테스트 0개 확인

#### Task 6.3: 수동 QA 체크리스트
- [ ] 게임 시작 → 100개 종목 표시 확인
- [ ] 매수/매도 → slippage 적용 확인
- [ ] 3개월 진행 → 분기 보고서 자동 생성 확인
- [ ] 직원 고용 → 사무실 배치 → 버프 적용 확인
- [ ] AI 경쟁자 트레이딩 정상 작동
- [ ] 저장/로드 → 데이터 무결성 확인
- [ ] 5배속 → UI 프레임 드롭 없음 확인

---

## Execution Order & Dependencies

```
Phase 0 ─── Foundation & Test Infra
  │
  ├── Phase 1 ─── Data Layer (100 Companies)
  │     │
  │     └── Phase 2 ─── Store Slice Refactoring ◄── CRITICAL PATH
  │           │
  │           ├── Phase 3 ─── Engine Alignment
  │           │     │
  │           │     └── Phase 4 ─── UI Updates
  │           │           │
  │           │           └── Phase 5 ─── Test Compliance
  │           │                 │
  │           │                 └── Phase 6 ─── Integration
  │           │
  │           └── Phase 5 (일부 Unit Tests는 Phase 1 후 바로 가능)
  │
  └── Phase 5.1 (Unit Tests) ── Phase 1 완료 후 즉시 실행 가능
```

## Parallelization Opportunities

| 병렬 가능 작업 그룹 | 작업들 |
|------------------|--------|
| **Group A** (Phase 0) | Task 0.1 + 0.2 + 0.3 동시 |
| **Group B** (Phase 1) | Task 1.1 + 1.2 동시 (1.3은 1.1 후) |
| **Group C** (Phase 2) | Task 2.2 (window) + 2.3 (time) + 2.7 (finance) 동시 (독립 슬라이스) |
| **Group D** (Phase 3) | Task 3.1 + 3.2 + 3.4 동시 |
| **Group E** (Phase 4) | Task 4.1 + 4.2 + 4.3 동시 |
| **Group F** (Phase 5) | Task 5.1 + 5.2 + 5.3 동시 |

## Risk Assessment

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|-----------|
| Store 리팩토링 시 기존 기능 파손 | 🔴 High | 중간 | Phase 2 각 단계마다 `npm run build` + 기존 테스트 |
| 100 companies 성능 저하 | 🟡 Medium | 낮음 | Web Worker 배치 처리 + 벤치마크 (Task 1.4) |
| Test helper 타입 불일치 | 🟡 Medium | 높음 | Phase 0에서 타입 계약 우선 통합 |
| Tick-to-Day ratio 충돌 | 🟡 Medium | 낮음 | 현재 값(3600) 유지, 테스트 헬퍼에서 추상화 |
| 저장 데이터 마이그레이션 | 🟢 Low | 중간 | SaveSystem에 version 필드 + nullish coalescing |

## Checkpoints

| Checkpoint | 조건 | Phase |
|-----------|------|-------|
| CP-0 | 타입 정의 완료, Vitest 실행 가능 | Phase 0 |
| CP-1 | 100개 회사 데이터 + Unit Tests 통과 | Phase 1 |
| CP-2 | Store Slice 분리 + `npm run build` 성공 | Phase 2 |
| CP-3 | Engine 통합 + Integration Tests 통과 | Phase 3 |
| CP-4 | UI 업데이트 + Financial Report Window 동작 | Phase 4 |
| CP-5 | 전체 테스트 스위트 통과 | Phase 5 |
| CP-6 | 수동 QA 완료 | Phase 6 |

---

## Next Step

이 워크플로우 계획이 승인되면 `/sc:implement`를 사용하여 Phase 0부터 순차적으로 실행합니다.

**권장 실행 순서**: `Phase 0 → Phase 1 → Phase 5.1(Unit Tests) → Phase 2 → Phase 3 → Phase 4 → Phase 5(나머지) → Phase 6`

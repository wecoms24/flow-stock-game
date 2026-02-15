# Tasks: Employee Interaction-based Trade AI Pipeline

**Input**: Design documents from `/specs/001-employee-trade-ai/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/store-actions.md, research.md

**Tests**: 테스트 태스크 미포함 (현재 자동화 테스트 프레임워크 미존재, 수동 검증)

**Organization**: User Story 기준으로 그룹화. US1+US2는 동일 Priority(P1)이며 상호 의존적이므로 같은 Phase에 배치.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일 대상이며 의존성 없이 병렬 실행 가능
- **[Story]**: 해당 User Story (US1~US5)
- 모든 파일 경로는 `src/` 기준

---

## Phase 1: Setup (타입 정의 및 설정)

**Purpose**: 파이프라인의 기반이 되는 타입, 설정값, 공유 유틸리티 정의

- [x] T001 Create TradeProposal and ProposalStatus types in src/types/trade.ts
- [x] T002 [P] Create pipeline configuration constants in src/config/tradeAIConfig.ts
- [x] T003 [P] Extract calculateRSI and calculateMA from src/engines/competitorEngine.ts to src/utils/technicalIndicators.ts
- [x] T004 [P] Add assignedSectors optional field to Employee interface in src/types/index.ts

---

## Phase 2: Foundational (스토어 및 저장 시스템)

**Purpose**: 모든 User Story가 의존하는 proposals 상태, CRUD 액션, 세이브 시스템 확장

**CRITICAL**: 이 Phase가 완료되어야 User Story 구현 가능

- [x] T005 Add proposals state and CRUD actions (addProposal, updateProposalStatus, expireOldProposals) to src/stores/gameStore.ts
- [x] T006 [P] Extend SaveData type with optional proposals field and update save/load in src/systems/saveSystem.ts
- [x] T007 [P] Update src/engines/competitorEngine.ts to import calculateRSI and calculateMA from src/utils/technicalIndicators.ts

**Checkpoint**: Foundation 완료 - proposals 상태가 스토어에 존재하고, 세이브/로드 가능하며, RSI/MA가 공유 유틸로 분리됨

---

## Phase 3: User Story 1 + 2 - Analyst 신호 포착 & Manager 리스크 평가 (Priority: P1)

**Goal**: Analyst가 종목을 분석하여 TradeProposal을 생성하고, Manager가 리스크 평가 후 승인/반려하는 핵심 파이프라인 구현

**Independent Test**: Analyst 1명 + Manager 1명 배치 후, 제안서가 PENDING -> APPROVED/REJECTED로 전환되는지 확인. Trader 없이도 분석-승인 흐름이 독립 동작.

### Implementation

- [x] T008 [P] [US1] Implement analyzeStock() and generateProposal() with Insight ability (5% chance, +20 confidence per FR-018) and per-analyst duplicate proposal prevention (same stock max 1 PENDING) in src/engines/tradePipeline/analystLogic.ts
- [x] T009 [P] [US2] Implement evaluateRisk() and reviewProposal() with personality trait modifiers (social -10 threshold, risk_averse +15, perfectionist +5 confidence, tech_savvy +10% accuracy per R-009) in src/engines/tradePipeline/managerLogic.ts
- [x] T010 [P] [US1] Add Analyst sector random assignment (1-2 sectors) on hire in src/data/employees.ts
- [x] T011 [US1] Add processAnalystTick action calling analystLogic with stress-100 skip check to src/stores/gameStore.ts
- [x] T012 [US2] Add processManagerTick action calling managerLogic with rejection stress (+8 to Analyst), auto-approve fallback (30% mistake rate when no Manager), and insufficient-funds auto-reject to src/stores/gameStore.ts
- [x] T013 [US1][US2] Wire Analyst tick (tick % 10 === 0), Manager tick (tick % 5 === 2), and expireOldProposals (tick % 10 === 5) into src/engines/tickEngine.ts
- [x] T014 [US1][US2] Handle employee termination mid-pipeline: expire orphaned PENDING/APPROVED proposals or reassign to another same-role employee in src/stores/gameStore.ts (fireEmployee/processResignation actions)

**Checkpoint**: Analyst가 담당 섹터를 분석하여 제안서를 생성하고, Manager가 승인/반려함. Manager 부재 시 자동 승인(실수 30%) 동작 확인. 해고 시 제안서 정리 동작 확인.

---

## Phase 4: User Story 3 - Trader 주문 체결 (Priority: P2)

**Goal**: APPROVED 제안서를 Trader가 체결하여 플레이어 포트폴리오에 실제 매수/매도 반영

**Independent Test**: APPROVED 상태 제안서가 존재할 때 Trader 배치 시 EXECUTED로 전환되고, player.cash와 player.portfolio가 변경되는지 확인.

### Implementation

- [x] T015 [US3] Implement executeProposal() pure function with slippage calculation (BASE_SLIPPAGE * (1 - tradingSkill/100)) in src/engines/tradePipeline/traderLogic.ts
- [x] T016 [US3] Add processTraderTick action calling traderLogic and buyStock/sellStock with success satisfaction (+5 to all involved) and failure stress (+15 to all involved), plus no-Trader fallback (2x fee) and stress-100 skip check to src/stores/gameStore.ts
- [x] T017 [US3] Wire Trader tick (every tick, only when APPROVED exists) into src/engines/tickEngine.ts

**Checkpoint**: 전체 파이프라인(Analyst -> Manager -> Trader) 동작. 제안서 생성부터 체결까지 완료. Trader 부재 시 수수료 2배 폴백 동작 확인.

---

## Phase 5: User Story 4 - 사무실 인접 배치 보너스 (Priority: P3)

**Goal**: Analyst-Manager-Trader 인접 배치 시 파이프라인 처리 속도에 보너스 적용

**Independent Test**: 동일 직원 구성에서 인접 배치 vs 분산 배치 시 제안서->체결 소요 틱 수 비교 (인접 시 30%+ 단축).

### Implementation

- [x] T018 [US4] Implement calculateAdjacencyBonus() using getAdjacentEmployees() in src/engines/tradePipeline/adjacencyBonus.ts
- [x] T019 [US4] Integrate adjacency bonus into processAnalystTick, processManagerTick, processTraderTick in src/stores/gameStore.ts

**Checkpoint**: 인접 배치된 팀의 체결 속도가 비인접 대비 30% 이상 빠름. 거리에 비례하여 보너스 변동.

---

## Phase 6: User Story 5 - 시각적 피드백 (Priority: P3)

**Goal**: 파이프라인 각 단계에서 말풍선 표시 및 중요 거래 토스트 알림

**Independent Test**: 파이프라인 동작 상태에서 사무실 창을 열고 각 단계별 말풍선 출현 및 토스트 알림 표시 확인.

### Implementation

- [x] T020 [P] [US5] Add pipeline speech bubble templates (proposal_created, proposal_approved, proposal_rejected, trade_executed, trade_failed) to src/data/chatter.ts
- [x] T021 [P] [US5] Add pipeline trade toast notifications for significant trades (>5% of total assets) to src/components/ui/OfficeToast.tsx
- [x] T022 [US5] Trigger chatter messages from processAnalystTick, processManagerTick, processTraderTick in src/stores/gameStore.ts

**Checkpoint**: 매 게임 내 1일 최소 3개 이상 파이프라인 관련 말풍선 표시. 중요 거래 시 토스트 알림 표시.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 빌드 검증, 밸런싱 확인, 전체 파이프라인 통합 검증, 문서 업데이트

- [x] T023 Run npm run build and verify zero TypeScript errors
- [x] T024 [P] Run npm run lint and verify zero errors
- [x] T025 Validate full pipeline walkthrough per specs/001-employee-trade-ai/quickstart.md including balance verification (positive returns with skill-50 Analyst over 1 game-year)
- [x] T026 Performance check: verify 57+ fps with 10 employees at 4x speed in browser DevTools
- [x] T027 Update CLAUDE.md Architecture section with Trade AI Pipeline documentation (engine layer, tick intervals, proposal lifecycle, new file paths)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - 즉시 시작 가능
- **Foundational (Phase 2)**: Phase 1 완료 후 시작 - **모든 User Story를 블로킹**
- **US1+US2 (Phase 3)**: Phase 2 완료 후 시작
- **US3 (Phase 4)**: Phase 3 완료 후 시작 (APPROVED 제안서 필요)
- **US4 (Phase 5)**: Phase 4 완료 후 시작 (전체 파이프라인 동작 필요)
- **US5 (Phase 6)**: Phase 3 완료 후 시작 가능 (Phase 4/5와 병렬 가능)
- **Polish (Phase 7)**: Phase 4, 5, 6 모두 완료 후 시작

### User Story Dependencies

```
Phase 1 (Setup)
    │
Phase 2 (Foundational) ── BLOCKS ALL ──
    │                                    \
Phase 3 (US1+US2, P1) ──────────────── Phase 6 (US5, P3) [병렬 가능]
    │
Phase 4 (US3, P2)
    │
Phase 5 (US4, P3)
    │
Phase 7 (Polish)
```

### Within Each Phase

- [P] 마크 태스크는 서로 다른 파일 대상이므로 병렬 실행 가능
- 동일 파일(gameStore.ts, tickEngine.ts) 수정 태스크는 순차 실행
- 순수 함수 모듈(analystLogic, managerLogic, traderLogic)이 먼저, 스토어 액션이 그 다음, tickEngine 와이어링이 마지막

### Parallel Opportunities

```bash
# Phase 1: 4개 태스크 중 3개 병렬
T001 (trade.ts) → T002, T003, T004 동시 실행

# Phase 2: 3개 태스크 중 2개 병렬
T005 (gameStore) → T006, T007 동시 실행

# Phase 3: 순수 함수 3개 병렬 → 스토어 액션 순차 → tickEngine → termination handling
T008, T009, T010 동시 실행 → T011 → T012 → T013 → T014

# Phase 6: 말풍선 + 토스트 병렬
T020, T021 동시 실행 → T022
```

---

## Implementation Strategy

### MVP First (Phase 1-3만)

1. Phase 1: Setup (타입, 설정, 유틸 추출)
2. Phase 2: Foundational (스토어, 세이브)
3. Phase 3: US1+US2 (Analyst 분석 + Manager 승인/반려)
4. **STOP**: Analyst-Manager 파이프라인만으로도 "직원이 분석하고 결재하는" 핵심 경험 제공
5. 검증 후 Phase 4 진행

### Incremental Delivery

1. Phase 1+2 → Foundation
2. Phase 3 → Analyst + Manager 동작 (MVP)
3. Phase 4 → Trader 체결 추가 (포트폴리오 실제 변경)
4. Phase 5 → 인접 배치 전략 추가
5. Phase 6 → 시각적 몰입감 추가
6. Phase 7 → 빌드/성능/문서 검증

---

## Task Summary

| Phase | Task Count | Parallel | 주요 파일 |
|-------|-----------|----------|----------|
| 1. Setup | 4 | 3 | trade.ts, tradeAIConfig.ts, technicalIndicators.ts, index.ts |
| 2. Foundational | 3 | 2 | gameStore.ts, saveSystem.ts, competitorEngine.ts |
| 3. US1+US2 (P1) | 7 | 3 | analystLogic.ts, managerLogic.ts, employees.ts, gameStore.ts, tickEngine.ts |
| 4. US3 (P2) | 3 | 0 | traderLogic.ts, gameStore.ts, tickEngine.ts |
| 5. US4 (P3) | 2 | 0 | adjacencyBonus.ts, gameStore.ts |
| 6. US5 (P3) | 3 | 2 | chatter.ts, OfficeToast.tsx, gameStore.ts |
| 7. Polish | 5 | 1 | 빌드/린트/검증/CLAUDE.md |
| **Total** | **27** | **11** | |

## Notes

- [P] 태스크 = 다른 파일 대상, 의존성 없음
- [Story] 레이블 = 해당 User Story와의 추적성 보장
- gameStore.ts 수정 태스크가 Phase 2, 3, 4, 5, 6에 걸쳐 분산됨 — 충돌 방지를 위해 반드시 순차 실행
- tickEngine.ts 수정도 Phase 3, 4에 걸침 — 순차 실행 필수
- 각 Checkpoint에서 수동 검증 후 다음 Phase 진행 권장
- 스트레스 100 직원은 해당 틱에서 파이프라인 처리를 스킵함 (T011, T012, T016에서 처리)

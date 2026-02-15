# Implementation Plan: Employee Interaction-based Trade AI Pipeline

**Branch**: `001-employee-trade-ai` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-employee-trade-ai/spec.md`

## Summary

직원 역할(Analyst/Manager/Trader) 간 유기적 상호작용을 통해 자동 매매 의사결정이 이루어지는 AI 트레이딩 파이프라인을 구현한다. 기존 Zustand 단일 스토어 + 틱 엔진 아키텍처 위에 역할별 로직 모듈과 TradeProposal 상태를 추가하며, 사무실 인접 배치에 따른 성능 보너스와 시각적 피드백(말풍선/토스트)을 연동한다.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode)
**Primary Dependencies**: React 19, Zustand 5, Vite 7, TailwindCSS v4
**Storage**: Dexie (IndexedDB) - 기존 세이브 시스템 확장
**Testing**: 수동 테스트 (현재 자동화 테스트 미존재, Constitution 확인)
**Target Platform**: Web (SPA, 모던 브라우저)
**Project Type**: Single SPA
**Performance Goals**: 60 FPS 유지, 파이프라인 처리가 프레임 레이트에 5% 미만 영향
**Constraints**: 직원 10명 기준 57fps 이상 유지, 제안서 큐 최대 10개
**Scale/Scope**: 20개 종목, 5개 섹터, 직원 최대 ~20명

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Centralized State Management | PASS | `proposals` 배열을 Zustand 단일 스토어에 추가. Store action을 통해서만 상태 변경. 컴포넌트에서 selector 사용. |
| II. Performance-First Architecture | PASS | 파이프라인 로직은 메인 스레드에서 실행하되, 역할별 틱 분산(10/5/1틱)으로 프레임 드랍 방지. GBM 계산은 기존 Worker 유지. |
| III. Type Safety | PASS | `TradeProposal`, `ProposalStatus` 인터페이스를 `src/types/trade.ts`에 정의. strict mode 유지. |
| IV. Component Organization | PASS | 엔진 로직은 `src/engines/tradePipeline/`에 배치. UI 변경은 기존 `components/windows/OfficeWindow.tsx` 및 `components/ui/OfficeToast.tsx` 활용. 새 윈도우 타입 불필요. |
| V. Code Style Consistency | PASS | Prettier/ESLint 설정 준수. camelCase 파일명 (analystLogic.ts). |

**Constitution Check Post-Design**: PASS - 모든 원칙 준수 확인.

## Project Structure

### Documentation (this feature)

```text
specs/001-employee-trade-ai/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── store-actions.md # Store action contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types/
│   ├── index.ts                     # Employee.assignedSectors 필드 추가
│   └── trade.ts                     # [NEW] TradeProposal, ProposalStatus 타입
├── config/
│   ├── aiConfig.ts                  # 기존 유지
│   └── tradeAIConfig.ts             # [NEW] 파이프라인 설정 상수
├── utils/
│   └── technicalIndicators.ts       # [NEW] RSI/MA 공통 유틸 (competitorEngine에서 추출)
├── engines/
│   ├── tickEngine.ts                # [MODIFY] 파이프라인 틱 처리 호출 추가
│   ├── competitorEngine.ts          # [MODIFY] RSI/MA를 utils에서 import
│   ├── officeSystem.ts              # 기존 유지 (getAdjacentEmployees 재사용)
│   └── tradePipeline/               # [NEW] 파이프라인 엔진 디렉토리
│       ├── analystLogic.ts          # Analyst 분석 및 제안서 생성
│       ├── managerLogic.ts          # Manager 리스크 평가 및 승인/반려
│       ├── traderLogic.ts           # Trader 체결 실행
│       └── adjacencyBonus.ts        # 인접 배치 보너스 계산
├── stores/
│   └── gameStore.ts                 # [MODIFY] proposals 상태 + 파이프라인 actions
├── data/
│   ├── chatter.ts                   # [MODIFY] 파이프라인 말풍선 템플릿 추가
│   └── employees.ts                 # [MODIFY] Analyst 고용 시 섹터 할당 로직
└── components/
    └── ui/
        └── OfficeToast.tsx          # [MODIFY] 파이프라인 거래 알림 추가
```

**Structure Decision**: 기존 프로젝트의 `src/engines/` 패턴을 따라 `tradePipeline/` 서브디렉토리를 생성. 이는 `competitorEngine.ts` (단일 파일)과 달리 역할별 로직이 3개 파일로 분리되어 디렉토리가 적절. 기존 `officeSystem.ts`, `employeeBehavior.ts` 등과 동일 레벨에 위치.

## Complexity Tracking

Constitution 위반 사항 없음. 추가 정당화 불필요.

## Implementation Phases

### Phase 1: 타입 정의 및 설정 (Foundation)

**목표**: 데이터 구조와 설정값 정의

**산출물**:
1. `src/types/trade.ts` - TradeProposal, ProposalStatus 인터페이스
2. `src/config/tradeAIConfig.ts` - 파이프라인 설정 상수
3. `src/types/index.ts` 수정 - Employee에 `assignedSectors` 필드 추가
4. `src/utils/technicalIndicators.ts` - RSI/MA 유틸 추출

**의존성**: 없음 (독립 실행 가능)

---

### Phase 2: 파이프라인 엔진 핵심 로직 (Core)

**목표**: 역할별 순수 함수 구현

**산출물**:
1. `src/engines/tradePipeline/analystLogic.ts` - `analyzeStock()`, `generateProposal()`
2. `src/engines/tradePipeline/managerLogic.ts` - `evaluateRisk()`, `reviewProposal()`
3. `src/engines/tradePipeline/traderLogic.ts` - `executeProposal()`
4. `src/engines/tradePipeline/adjacencyBonus.ts` - `calculateAdjacencyBonus()`

**의존성**: Phase 1 완료

**핵심 알고리즘**:
- Analyst Confidence: `(analysisSkill * 0.5) + (traitBonus * 0.3) + (conditionFactor * 0.2)`
- Manager Risk: `(proposerReliability + cashMarginRatio) > riskScore`
- Trader Slippage: `BASE_SLIPPAGE * (1 - tradingSkill / 100)`

---

### Phase 3: 스토어 통합 (Integration)

**목표**: Zustand 스토어에 파이프라인 상태 및 액션 추가

**산출물**:
1. `gameStore.ts` 수정:
   - `proposals: TradeProposal[]` 상태 추가
   - `addProposal()`, `updateProposalStatus()`, `expireOldProposals()` 액션
   - `processAnalystTick()`, `processManagerTick()`, `processTraderTick()` 액션
2. SaveData 타입 확장 (`proposals?: TradeProposal[]`)
3. `saveSystem.ts` 수정 (proposals 저장/로드)

**의존성**: Phase 2 완료

---

### Phase 4: 틱 엔진 연동 (Wiring)

**목표**: tickEngine에서 파이프라인 틱 처리 호출

**산출물**:
1. `tickEngine.ts` 수정:
   - Employee tick 처리 직후에 파이프라인 호출 추가
   - `tick % 10 === 0`: `processAnalystTick()`
   - `tick % 5 === 2`: `processManagerTick()` (Analyst와 겹치지 않도록 오프셋)
   - 매틱: `processTraderTick()` (APPROVED 있을 때만)
   - 매 10틱: `expireOldProposals()`
2. `competitorEngine.ts` 수정 - RSI/MA를 utils에서 import

**의존성**: Phase 3 완료

---

### Phase 5: 시각적 피드백 및 UI (Polish)

**목표**: 말풍선, 토스트 알림, 직원 섹터 할당

**산출물**:
1. `chatter.ts` 수정 - 파이프라인 단계별 말풍선 템플릿 추가:
   - `proposal_created`: "발견! [종목] 매수 추천합니다!"
   - `proposal_approved`: "승인. 진행시켜."
   - `proposal_rejected`: "리스크가 높아서 반려."
   - `trade_executed`: "체결 완료! 나이스!"
   - `trade_failed`: "체결 실패... 잔고가..."
2. `OfficeToast.tsx` 수정 - 중요 거래 알림 추가
3. `employees.ts` 수정 - Analyst 고용 시 섹터 랜덤 할당

**의존성**: Phase 4 완료 (파이프라인 동작 후 UI 연동)

---

### Phase 6: 밸런싱 및 검증 (Verification)

**목표**: 게임 밸런스 테스트 및 성능 검증

**검증 항목**:
1. `npm run build` 에러 없이 통과
2. `npm run lint` 경고 없이 통과
3. 게임 내 파이프라인 동작 확인 (모든 User Story)
4. 4x 속도에서 프레임 드랍 확인 (Performance DevTools)
5. 세이브/로드 후 파이프라인 연속성 확인
6. 밸런싱: Analyst 스킬 50 기준 수익률 양(+) 여부

**의존성**: Phase 5 완료

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
| ---- | ----------- | ------ | ---------- |
| 파이프라인 처리가 프레임 드랍 유발 | Medium | High | 역할별 틱 분산 + APPROVED 존재 시에만 Trader 실행 |
| 제안서 큐 오버플로우 | Low | Medium | MAX_PENDING_PROPOSALS 제한 + 자동 만료 |
| 기존 세이브 데이터 호환성 깨짐 | Low | High | 옵셔널 필드 사용, nullish coalescing 초기화 |
| 자동 매매 수익률이 너무 높거나 낮음 | High | Medium | config 상수 조정으로 핫픽스 가능, Phase 6에서 튜닝 |
| competitorEngine RSI/MA 추출 시 기존 동작 변경 | Low | Medium | 함수 시그니처 동일 유지, import 경로만 변경 |

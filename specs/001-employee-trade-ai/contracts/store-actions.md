# Store Actions Contract: Trade AI Pipeline

**Feature Branch**: `001-employee-trade-ai`
**Date**: 2026-02-15

이 프로젝트는 SPA + Zustand 아키텍처이므로 REST API 대신 Store Action 계약을 정의합니다.

---

## Store Actions (gameStore.ts)

### addProposal

TradeProposal을 스토어에 추가.

```typescript
addProposal: (proposal: TradeProposal) => void
```

**Pre-conditions**:
- `proposal.status === 'PENDING'`
- `proposal.id`가 기존 proposals에 존재하지 않음
- `proposals.filter(p => p.status === 'PENDING').length < MAX_PENDING_PROPOSALS`

**Post-conditions**:
- `proposals` 배열에 새 제안서 추가
- MAX_PENDING_PROPOSALS 초과 시 가장 오래된 PENDING을 EXPIRED로 전환 후 추가

**Side effects**: 없음

---

### updateProposalStatus

제안서 상태를 전환.

```typescript
updateProposalStatus: (
  id: string,
  status: ProposalStatus,
  updates?: Partial<TradeProposal>
) => void
```

**Pre-conditions**:
- `id`에 해당하는 제안서가 존재
- 상태 전이 규칙 준수:
  - `PENDING` → `APPROVED | REJECTED | EXPIRED`
  - `APPROVED` → `EXECUTED | FAILED`
  - 그 외 전이 금지

**Post-conditions**:
- 해당 제안서의 status 업데이트
- updates 필드가 있으면 병합 (reviewedByEmployeeId, executedPrice 등)

**Side effects**: 없음 (스트레스/만족도 조정은 호출측에서 처리)

---

### expireOldProposals

만료 시간이 지난 PENDING 제안서를 EXPIRED로 전환.

```typescript
expireOldProposals: (currentTick: number) => void
```

**Pre-conditions**:
- `currentTick` > 0

**Post-conditions**:
- `createdAt + PROPOSAL_EXPIRE_TICKS < currentTick`인 PENDING 제안서가 EXPIRED로 전환

**Side effects**: 없음

---

### processAnalystTick

Analyst 역할 직원의 분석 파이프라인 실행.

```typescript
processAnalystTick: () => void
```

**Pre-conditions**:
- 게임이 진행 중 (`isGameStarted && !isGameOver && !time.isPaused`)
- Analyst 역할 직원이 1명 이상 배치됨 (`seatIndex !== null`)

**Post-conditions**:
- 배치된 각 Analyst에 대해:
  - 담당 섹터 종목의 RSI/MA 분석
  - Confidence 점수 계산
  - 임계값 이상이면 TradeProposal 생성 → `addProposal()` 호출
  - Insight 발동 시 Confidence 보너스 적용

**Side effects**:
- Analyst의 행동 상태(chatter)에 분석 관련 메시지 추가 가능

---

### processManagerTick

Manager 역할 직원의 검토 파이프라인 실행.

```typescript
processManagerTick: () => void
```

**Pre-conditions**:
- PENDING 제안서가 1개 이상 존재

**Post-conditions**:
- Manager 존재 시: 리스크 평가 후 APPROVED 또는 REJECTED
- Manager 부재 시: 자동 승인 (실수 확률 30%)
- 잔고 부족 매수 제안서: 자동 REJECTED

**Side effects**:
- REJECTED 시 Analyst 스트레스 +8
- Manager의 행동 상태(chatter)에 결재 관련 메시지 추가 가능

---

### processTraderTick

Trader 역할 직원의 체결 파이프라인 실행.

```typescript
processTraderTick: () => void
```

**Pre-conditions**:
- APPROVED 제안서가 1개 이상 존재

**Post-conditions**:
- Trader 존재 시: 슬리피지 적용하여 buyStock/sellStock 실행 → EXECUTED
- Trader 부재 시: 수수료 2배 적용하여 다른 역할이 대신 체결
- 체결 실패 시: FAILED 상태 전환

**Side effects**:
- EXECUTED: 관련 직원 만족도 +5
- FAILED: 관련 직원 스트레스 +15
- player.cash, player.portfolio 변경
- Trader의 행동 상태(chatter)에 체결 관련 메시지 추가 가능

---

## Engine Functions (순수 함수)

### analyzeStock

종목 분석 및 Confidence 점수 계산 (pure function).

```typescript
// src/engines/tradePipeline/analystLogic.ts
function analyzeStock(
  company: Company,
  priceHistory: number[],
  analyst: Employee,
): { confidence: number; direction: 'buy' | 'sell'; isInsight: boolean } | null
```

---

### evaluateRisk

제안서 리스크 평가 (pure function).

```typescript
// src/engines/tradePipeline/managerLogic.ts
function evaluateRisk(
  proposal: TradeProposal,
  manager: Employee | null,
  playerCash: number,
  portfolio: Record<string, PortfolioPosition>,
): { approved: boolean; reason?: string; isMistake?: boolean }
```

---

### executeProposal

제안서 체결 실행 (pure function, 결과만 반환).

```typescript
// src/engines/tradePipeline/traderLogic.ts
function executeProposal(
  proposal: TradeProposal,
  trader: Employee | null,
  currentPrice: number,
  playerCash: number,
): { success: boolean; executedPrice: number; slippage: number; fee: number; reason?: string }
```

---

### calculateAdjacencyBonus

인접 배치 보너스 계산 (pure function).

```typescript
// src/engines/tradePipeline/adjacencyBonus.ts
function calculateAdjacencyBonus(
  sourceEmployee: Employee,
  targetRole: EmployeeRole,
  allEmployees: Employee[],
  officeGrid: OfficeGrid,
): number // 0.0 (보너스 없음) ~ 0.3 (최대 보너스)
```

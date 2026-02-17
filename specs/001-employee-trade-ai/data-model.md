# Data Model: Employee Interaction-based Trade AI Pipeline

**Feature Branch**: `001-employee-trade-ai`
**Date**: 2026-02-15

## Entity Definitions

### TradeProposal

매매 제안서. Analyst가 생성하고 Manager가 검토하며 Trader가 체결하는 파이프라인의 핵심 엔티티.

| Field             | Type                | Description                              | Constraints                    |
| ----------------- | ------------------- | ---------------------------------------- | ------------------------------ |
| id                | string              | 고유 식별자                              | UUID v4, 불변                  |
| companyId         | string              | 대상 종목 ID                             | companies 배열의 유효 ID       |
| ticker            | string              | 종목 티커 심볼                           | 표시용 캐시                    |
| direction         | 'buy' \| 'sell'     | 매매 방향                                | 필수                           |
| quantity          | number              | 추천 수량                                | 양의 정수                      |
| targetPrice       | number              | 제안 시점 가격                           | 양수                           |
| confidence        | number              | 신뢰도 점수                              | 0-100                          |
| status            | ProposalStatus      | 현재 상태                                | 상태 전이 규칙 참조            |
| createdByEmployeeId | string            | 생성자 (Analyst) ID                      | employees 배열의 유효 ID       |
| reviewedByEmployeeId | string \| null   | 검토자 (Manager) ID                      | 승인/반려 시 설정              |
| executedByEmployeeId | string \| null   | 체결자 (Trader) ID                       | 체결 시 설정                   |
| createdAt         | number              | 생성 시점 (절대 틱)                      | 불변                           |
| reviewedAt        | number \| null      | 검토 시점 (절대 틱)                      | 승인/반려 시 설정              |
| executedAt        | number \| null      | 체결 시점 (절대 틱)                      | 체결/실패 시 설정              |
| executedPrice     | number \| null      | 실제 체결 가격                           | 슬리피지 적용 후 가격          |
| slippage          | number \| null      | 적용된 슬리피지 비율                     | 0-0.01 (0%-1%)                 |
| isMistake         | boolean             | Manager 부재 시 실수 여부                | 자동승인 시에만 true 가능      |
| rejectReason      | string \| null      | 반려 사유                                | REJECTED 시에만               |

### ProposalStatus (Enum)

```
PENDING → APPROVED → EXECUTED
                  → FAILED
        → REJECTED
        → EXPIRED
```

| Value    | Description             | 전이 조건                                           |
| -------- | ----------------------- | --------------------------------------------------- |
| PENDING  | 생성됨, 검토 대기       | Analyst가 생성                                      |
| APPROVED | Manager가 승인          | Manager 검토 통과 또는 자동 승인                    |
| REJECTED | Manager가 반려          | 리스크 점수 초과 또는 잔고 부족                     |
| EXECUTED | Trader가 체결 성공      | 매수/매도 성공                                      |
| FAILED   | 체결 실패               | 잔고 부족, 가격 급변 등                             |
| EXPIRED  | 시간 만료               | PENDING 상태로 100틱 초과 또는 큐 오버플로우        |

### PipelineConfig

파이프라인 동작 설정. `src/config/tradeAIConfig.ts`에 정의.

| Field                    | Type   | Default | Description                          |
| ------------------------ | ------ | ------- | ------------------------------------ |
| ANALYST_HOUR_INTERVAL    | number | 10      | Analyst 분석 주기 (시간)             |
| MANAGER_HOUR_INTERVAL    | number | 5       | Manager 검토 주기 (시간)             |
| TRADER_HOUR_INTERVAL     | number | 1       | Trader 체결 주기 (시간)              |
| CONFIDENCE_THRESHOLD     | number | 70      | 제안서 생성 최소 Confidence          |
| MAX_PENDING_PROPOSALS    | number | 10      | 최대 PENDING 제안서 수               |
| PROPOSAL_EXPIRE_HOURS    | number | 100     | PENDING 자동 만료 시간 수            |
| BASE_SLIPPAGE            | number | 0.01    | 기본 슬리피지 비율 (1%)              |
| NO_MANAGER_MISTAKE_RATE  | number | 0.30    | Manager 부재 시 실수 확률            |
| NO_TRADER_FEE_MULTIPLIER | number | 2.0     | Trader 부재 시 수수료 배율           |
| ADJACENCY_SPEED_BONUS    | number | 0.30    | 인접 배치 시 속도 보너스 (30%)       |
| INSIGHT_CHANCE           | number | 0.05    | Analyst Insight 발동 확률 (5%)       |
| INSIGHT_CONFIDENCE_BONUS | number | 20      | Insight 발동 시 Confidence 보너스    |
| SUCCESS_SATISFACTION_GAIN | number | 5      | 체결 성공 시 만족도 증가             |
| FAILURE_STRESS_GAIN      | number | 15      | 체결 실패 시 스트레스 증가           |
| REJECTION_STRESS_GAIN    | number | 8       | 반려 시 Analyst 스트레스 증가        |

### Employee 확장 필드

기존 `Employee` 인터페이스에 옵셔널 필드 추가:

| Field            | Type       | Description                    |
| ---------------- | ---------- | ------------------------------ |
| assignedSectors  | Sector[]   | Analyst 담당 섹터 (1-2개)      |

### TradeResult (파생 데이터)

체결 결과 요약. TradeProposal의 EXECUTED 상태에서 파생.

| Field      | Type   | Description                    |
| ---------- | ------ | ------------------------------ |
| proposalId | string | 원본 제안서 ID                 |
| pnl        | number | 손익 (매도 시, 매수 시 0)      |
| totalCost  | number | 총 비용 (가격 * 수량 + 수수료) |
| fee        | number | 수수료                         |

## Relationships

```
Employee (analyst) --creates--> TradeProposal
Employee (manager) --reviews--> TradeProposal
Employee (trader)  --executes-> TradeProposal
TradeProposal      --affects--> PlayerState.portfolio
TradeProposal      --affects--> PlayerState.cash
TradeProposal      --affects--> Employee.stress
TradeProposal      --affects--> Employee.satisfaction
OfficeGrid         --modifies-> Pipeline speed (adjacency bonus)
```

## State Integration

### Zustand Store 추가 필드

```
GameStore {
  // 기존 필드...

  // 신규: Trade AI Pipeline
  proposals: TradeProposal[]

  // 신규 Actions
  addProposal: (proposal: TradeProposal) => void
  updateProposalStatus: (id: string, status: ProposalStatus, updates?: Partial<TradeProposal>) => void
  expireOldProposals: (currentTick: number) => void
  processAnalystTick: () => void
  processManagerTick: () => void
  processTraderTick: () => void
}
```

### SaveData 확장

```
SaveData {
  // 기존 필드...
  proposals?: TradeProposal[]  // 옵셔널 (하위 호환)
}
```

## Phase 2 Extensions (Post-Spec Systems)

Implementation exceeded original spec scope. The following systems were added during Phase 2 development and integrate with the trade pipeline through `AggregatedCorporateEffects` parameter injection.

### Enhanced Function Signatures

Original spec defined 3-4 parameter functions. Actual implementation uses 6-7 parameters due to system integration:

| Function | Spec Params | Actual Params | Added |
|----------|-------------|---------------|-------|
| `analyzeStock` | 4 (company, history, analyst, adjacency) | 6 | +marketEvents, +corporateEffects |
| `generateProposal` | 5 | 7 | +playerCash, +corporateEffects |
| `evaluateProposal` | 4 | 7 | +playerCash, +portfolio, +corporateEffects |
| `executeProposal` | 5 | 7 | +volatility, +corporateEffects |

### AggregatedCorporateEffects (Integration Interface)

Computed by `corporateSkillEngine.aggregateCorporateEffects()`, passed to all pipeline functions:

| Field | Type | Range | Pipeline Impact |
|-------|------|-------|-----------------|
| signalAccuracyBonus | number | 0-0.5 | +confidence in analyzeStock |
| slippageReduction | number | 0-0.8 | ×(1-value) on slippage in executeProposal |
| commissionDiscount | number | 0-0.5 | ×(1-value) on fee in executeProposal |
| riskReductionBonus | number | 0+ | ×(1-value) on cashRatio in generateProposal |
| maxPendingProposals | number | 0+ | Added to MAX_PENDING_PROPOSALS limit |
| stopLossThreshold | number? | -0.03~-0.10 | Auto-sell trigger in checkPortfolioExits |
| takeProfitThreshold | number? | 0.05~0.20 | Auto-sell trigger in checkPortfolioExits |
| maxSinglePositionPercent | number? | 0.05~0.30 | Position size cap in generateProposal |

### Additional Systems (Not in Original Spec)

1. **Corporate Skill Engine** (`corporateSkillEngine.ts`): 12 company-level skills with global/conditional effects
2. **Training Engine** (`trainingEngine.ts`): Education programs connecting corporate skills → employee RPG abilities
3. **Signal Generation Engine** (`signalGenerationEngine.ts`): Badge-enhanced signals with noise filtering
4. **RPG Skill System** (`skillSystem.ts`): 30-node passive skill tree (Analysis/Trading/Research)
5. **Trade Execution Engine** (`tradeExecutionEngine.ts`): Badge-aware order execution with market impact
6. **Stop Loss/Take Profit** (`analystLogic.checkPortfolioExits`): Automatic exit triggers
7. **Badge System** (`badgeConverter.ts`): Employee badges → trade modifier effects

## Validation Rules

1. **TradeProposal.quantity**: 반드시 양의 정수. `Math.floor(calculatedQuantity)` 적용.
2. **TradeProposal.confidence**: 0-100 범위 클램프. `Math.min(100, Math.max(0, score))`.
3. **상태 전이**: PENDING에서만 APPROVED/REJECTED/EXPIRED 가능. APPROVED에서만 EXECUTED/FAILED 가능. 역방향 전이 금지.
4. **중복 방지**: 동일 종목에 대한 PENDING 제안서는 Analyst당 최대 1개.
5. **잔고 검증**: APPROVED → EXECUTED 전환 시 `player.cash >= executedPrice * quantity` 재검증.

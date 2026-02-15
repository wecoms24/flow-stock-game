# Feature Specification: Employee Interaction-based Trade AI Pipeline

**Feature Branch**: `001-employee-trade-ai`
**Created**: 2026-02-15
**Status**: Draft
**Input**: 직원 간 유기적 상호작용(Analyst -> Manager -> Trader)을 통해 의사결정이 이루어지는 AI 트레이딩 시스템

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyst가 매매 제안서를 생성한다 (Priority: P1)

플레이어가 Analyst 역할의 직원을 고용하고 사무실에 배치하면, 해당 Analyst는 자동으로 담당 섹터의 종목을 분석하여 매수/매도 제안서(TradeProposal)를 생성한다. 제안서에는 종목, 방향(매수/매도), 수량, 신뢰도 점수가 포함된다. 플레이어는 사무실 창에서 Analyst가 "발견! NXTG 매수 추천합니다!" 같은 말풍선을 띄우는 것을 볼 수 있다.

**Why this priority**: 전체 파이프라인의 시작점이며, 제안서가 없으면 이후 단계(승인/체결)가 동작하지 않는다. 이 단계만 구현해도 "직원이 분석 중" 이라는 시각적 몰입감을 제공할 수 있다.

**Independent Test**: Analyst 1명만 배치한 상태에서 일정 시간 경과 후 TradeProposal이 생성되는지 확인. 매니저/트레이더 없이도 제안서 자체는 독립적으로 생성됨.

**Acceptance Scenarios**:

1. **Given** Analyst가 사무실에 배치된 상태, **When** 10틱이 경과하면, **Then** 담당 섹터에서 RSI/MA 기반 분석을 수행하고 신뢰도 임계값(70점) 이상이면 TradeProposal을 생성한다
2. **Given** Analyst의 스트레스가 70 이상인 상태, **When** 분석 주기가 도래하면, **Then** 분석 정확도(Confidence)에 컨디션 패널티가 적용된다
3. **Given** Analyst가 미배치(seatIndex가 null) 상태, **When** 분석 주기가 도래하면, **Then** 제안서를 생성하지 않는다

---

### User Story 2 - Manager가 제안서를 승인/반려한다 (Priority: P1)

Manager 역할의 직원은 Analyst가 올린 PENDING 상태의 제안서를 받아 리스크를 평가한다. 현재 자금 여유분, 제안자 신뢰도, 포트폴리오 집중도를 고려하여 승인(APPROVED) 또는 반려(REJECTED)한다. 반려 시 해당 Analyst의 스트레스가 소폭 증가한다.

**Why this priority**: Analyst와 함께 P1인 이유는, 승인 단계 없이 바로 체결하면 단순 자동매매와 차이가 없기 때문. 이 두 단계가 있어야 "조직적 의사결정" 경험이 성립한다.

**Independent Test**: Analyst + Manager 2명 배치 후, 제안서가 PENDING -> APPROVED 또는 REJECTED로 상태 전환되는지 확인.

**Acceptance Scenarios**:

1. **Given** PENDING 상태 제안서가 존재하고 Manager가 배치된 상태, **When** Manager 처리 주기(5틱)가 도래하면, **Then** 자금여유분과 리스크 점수를 비교하여 APPROVED 또는 REJECTED로 전환한다
2. **Given** Manager가 없는 상태, **When** PENDING 제안서가 존재하면, **Then** 시스템이 자동 승인하되 실수 확률이 30% 증가한다 (의도하지 않은 종목/수량 오류 가능)
3. **Given** 현재 잔고가 제안서 매수 금액보다 부족한 상태, **When** Manager가 검토하면, **Then** 자동 반려(REJECTED) 처리한다
4. **Given** Manager가 'social' 성격 특성을 가진 상태, **When** 제안서를 검토하면, **Then** 승인 임계값이 낮아져 승인율이 높아진다

---

### User Story 3 - Trader가 승인된 주문을 체결한다 (Priority: P2)

Trader 역할의 직원은 APPROVED 상태의 제안서를 큐에서 가져와 실제 매수/매도를 실행한다. 체결 시 Trader의 Trading 스킬에 비례하여 슬리피지(가격 미끄러짐)가 감소한다. 체결 결과는 플레이어의 포트폴리오에 반영되고, 성공 시 관련 직원들의 만족도가 소폭 상승한다.

**Why this priority**: P1(분석+승인)이 갖춰져야 동작하므로 P2. 다만, Trader 없이도 Manager가 대신 체결할 수 있는 폴백이 존재하므로 독립 테스트 가능.

**Independent Test**: APPROVED 상태의 제안서를 수동 생성한 뒤, Trader 배치 시 체결되는지 확인. 포트폴리오 변화와 잔고 변화를 검증.

**Acceptance Scenarios**:

1. **Given** APPROVED 제안서와 배치된 Trader가 있는 상태, **When** Trader 처리 주기(1틱)가 도래하면, **Then** 주문을 체결하고 제안서를 EXECUTED로 전환한다
2. **Given** Trader가 없는 상태, **When** APPROVED 제안서가 존재하면, **Then** Manager 또는 Analyst가 대신 체결하되 수수료가 2배 적용된다
3. **Given** 체결 도중 잔고 부족이 발생하면, **When** 매수를 시도하면, **Then** 제안서를 FAILED로 전환하고 관련 직원의 스트레스가 급증한다
4. **Given** Trading 스킬이 80 이상인 Trader, **When** 주문을 체결하면, **Then** 슬리피지가 최소화된다 (스킬 80 기준 슬리피지 0.2% 이하)

---

### User Story 4 - 사무실 배치가 파이프라인 효율에 영향을 준다 (Priority: P3)

플레이어가 Analyst, Manager, Trader를 인접한 좌석에 배치하면, 제안서 전달 속도와 승인 정확도에 보너스가 적용된다. 반대로 멀리 떨어져 있으면 처리 지연이 발생한다. 이를 통해 사무실 배치가 단순 장식이 아닌 전략적 요소가 된다.

**Why this priority**: 핵심 파이프라인(P1/P2) 없이는 의미 없는 부가 기능이므로 P3. 하지만 게임의 전략적 깊이를 더하는 핵심 차별화 요소.

**Independent Test**: 동일 직원 구성에서 인접 배치 vs 분산 배치 시 체결 속도/정확도 차이를 비교.

**Acceptance Scenarios**:

1. **Given** Analyst와 Manager가 인접 좌석에 배치된 상태, **When** 제안서가 생성되면, **Then** Manager의 검토 대기 시간이 기본 대비 30% 단축된다
2. **Given** Analyst, Manager, Trader가 모두 인접 배치된 상태, **When** 전체 파이프라인이 동작하면, **Then** 제안서 -> 체결까지의 총 소요 틱이 기본 대비 40% 단축된다
3. **Given** Manager와 Trader가 5칸 이상 떨어진 상태, **When** 승인된 제안서를 전달하면, **Then** 처리 지연이 발생하고 거리에 비례하여 추가 대기 틱이 필요하다

---

### User Story 5 - 파이프라인 활동이 시각적 피드백으로 전달된다 (Priority: P3)

제안서 생성, 승인, 체결 등 각 단계에서 관련 직원이 상황에 맞는 말풍선을 표시한다. 중요 거래 성사 시 우측 하단에 토스트 알림이 표시된다. 플레이어는 사무실 창에서 직원들이 유기적으로 일하는 모습을 시각적으로 확인할 수 있다.

**Why this priority**: 핵심 로직(P1/P2)과 독립적인 UI 레이어이므로 P3. 없어도 기능은 동작하지만, 몰입감의 핵심이므로 빠지면 안 됨.

**Independent Test**: 파이프라인이 동작하는 상태에서 각 단계별 말풍선 출현 여부 및 토스트 알림 표시 확인.

**Acceptance Scenarios**:

1. **Given** Analyst가 제안서를 생성하면, **When** 사무실 창이 열려있으면, **Then** 해당 Analyst 위에 "발견! [종목명] 매수 추천합니다!" 말풍선이 표시된다
2. **Given** Manager가 제안서를 승인하면, **When** 사무실 창이 열려있으면, **Then** 해당 Manager 위에 "승인. 진행시켜." 말풍선이 표시된다
3. **Given** 거래 금액이 총 자산의 5% 이상인 거래가 체결되면, **When** 체결이 완료되면, **Then** 우측 하단에 토스트 알림("NXTG 1000주 매수 체결!")이 표시된다

---

### Edge Cases

- 모든 직원이 스트레스 100으로 스트레스 아웃 상태인 경우: 파이프라인이 일시 정지되고 "직원들이 지쳐 거래를 중단했습니다" 알림이 표시된다
- Analyst가 여러 명이고 동시에 같은 종목을 추천하는 경우: 가장 높은 Confidence 점수의 제안서만 유지하고 나머지는 중복으로 자동 폐기한다
- 제안서가 너무 많이 쌓인 경우 (10개 초과): 가장 오래된 PENDING 제안서부터 자동 만료(EXPIRED) 처리한다
- 게임 속도가 4배속인 상태에서의 처리: 틱 주기(Analyst 10틱, Manager 5틱, Trader 1틱)는 게임 속도와 무관하게 틱 기준으로 동작하므로 4배속에서도 동일한 파이프라인 순서를 보장한다
- 직원이 파이프라인 중간에 해고/퇴사하는 경우: 해당 직원이 담당하던 PENDING/APPROVED 제안서는 다음 처리 주기에 다른 동일 역할 직원에게 재배정된다. 동일 역할 직원이 없으면 폴백 규칙이 적용된다
- 세이브/로드 시 제안서 상태 보존: 활성 제안서(PENDING, APPROVED)는 세이브 데이터에 포함되어 로드 후에도 파이프라인이 이어서 동작한다

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 Analyst 역할 직원이 사무실에 배치된 상태에서 10틱마다 담당 섹터 종목의 RSI/MA 기술적 지표를 분석하여 매매 방향(buy/sell)을 결정하고, Analyst 능력 기반 Confidence 점수가 임계값 이상이면 TradeProposal을 생성할 수 있어야 한다. RSI/MA는 매매 방향 결정에 사용되며, Confidence는 Analyst의 역량 점수로서 별도 계산된다
- **FR-002**: TradeProposal은 종목ID, 방향(매수/매도), 추천 수량, 신뢰도 점수(Confidence), 생성자 ID, 상태(PENDING/APPROVED/REJECTED/EXECUTED/FAILED), 생성 시각을 포함해야 한다
- **FR-003**: Analyst의 신뢰도 점수는 `(스킬레벨 * 0.5) + (성격보정 * 0.3) + (컨디션 * 0.2)` 공식으로 계산되어야 하며, 임계값(70) 이상일 때만 제안서가 생성되어야 한다
- **FR-004**: Manager 역할 직원은 5틱마다 PENDING 제안서를 검토하여 APPROVED 또는 REJECTED로 상태를 전환해야 한다
- **FR-005**: Manager의 승인 판단은 `(제안자 신뢰도 + 현재 자금 여유 비율) > 리스크 점수` 조건을 따라야 한다
- **FR-006**: Manager가 없을 때 PENDING 제안서는 시스템이 자동 승인하되, 실수 확률이 30% 증가해야 한다 (잘못된 종목/수량이 체결될 수 있음)
- **FR-007**: Trader 역할 직원은 1틱마다 APPROVED 제안서를 큐에서 가져와 플레이어 포트폴리오에 실제 매수/매도를 실행해야 한다
- **FR-008**: Trader의 Trading 스킬에 비례하여 슬리피지가 감소해야 한다 (기본 슬리피지 1%, 스킬 100 기준 0%)
- **FR-009**: Trader가 없을 때 다른 역할 직원이 대신 체결하되 수수료가 2배 적용되어야 한다
- **FR-010**: 현재 잔고가 부족한 매수 제안서는 Manager 단계에서 자동 반려되어야 한다
- **FR-011**: 제안서 상태 변경(생성/승인/반려/체결/실패) 시 관련 직원의 스트레스와 만족도가 조정되어야 한다 (실패 시 스트레스 +15, 성공 시 만족도 +5)
- **FR-012**: 파이프라인 처리 주기는 직원 수에 관계없이 역할별 고정 간격(Analyst: 10틱, Manager: 5틱, Trader: 1틱)을 유지하여 프레임 드랍을 방지해야 한다
- **FR-013**: Manager의 성격 특성('social', 'risk_averse' 등)이 승인 판단에 영향을 주어야 한다 (social: 승인 임계값 -10, risk_averse: 승인 임계값 +15)
- **FR-014**: 사무실 내 인접 배치된 역할 간(Analyst-Manager, Manager-Trader) 파이프라인 처리 속도에 보너스가 적용되어야 한다
- **FR-015**: 제안서 생성/승인/체결 시점에 해당 직원의 말풍선이 표시되어야 한다
- **FR-016**: 중요 거래(총 자산의 5% 이상) 체결 시 토스트 알림이 표시되어야 한다
- **FR-017**: 활성 제안서(PENDING, APPROVED)는 세이브 데이터에 포함되어 게임 로드 후에도 파이프라인이 이어서 동작해야 한다
- **FR-018**: Analyst는 5% 확률로 급등 예상 종목을 발견하는 특수 능력(Insight)을 보유해야 한다. 이 경우 Confidence 점수에 +20 보너스가 적용된다

### Key Entities

- **TradeProposal**: 직원이 생성한 매매 제안서. 종목ID, 방향(매수/매도), 수량, 신뢰도 점수, 생성자 직원ID, 검토자 직원ID, 체결자 직원ID, 상태, 생성/처리 시각, 슬리피지, 실수 여부를 포함한다
- **ProposalStatus**: 제안서의 생명주기 상태. PENDING(생성됨) -> APPROVED(승인됨)/REJECTED(반려됨) -> EXECUTED(체결됨)/FAILED(실패함). EXPIRED(만료됨)도 포함
- **PipelineConfig**: 역할별 처리 주기, 인접 보너스 계수, 임계값 등 파이프라인 동작 설정값. 난이도별 조정 가능
- **TradeResult**: 체결 결과 정보. 실제 체결 가격, 슬리피지, 수수료, 손익을 포함한다

## Assumptions

- Analyst의 "담당 섹터"는 기존 게임의 5개 주요 섹터(tech, finance, energy, healthcare, consumer)를 기준으로 하며, 랜덤 또는 Analyst의 스킬 분포에 따라 1-2개 섹터가 할당된다
- 기술적 지표(RSI, MA)는 기존 priceHistory 데이터(최대 50개 데이터 포인트)를 기반으로 계산한다
- "실수 확률 30% 증가"의 구체적 구현은 승인된 제안서의 방향(매수/매도) 또는 수량이 원래 제안과 달라지는 형태로 표현된다
- 슬리피지는 현재 가격 대비 비율로 적용된다 (1% 슬리피지 = 매수 시 1% 비싸게, 매도 시 1% 싸게 체결)
- HR Manager의 기존 자동 상담 기능은 파이프라인 실패(FAILED/REJECTED)로 인한 스트레스에도 동일하게 적용된다
- 제안서 최대 동시 보유량은 10개이며, 초과 시 가장 오래된 PENDING부터 만료된다
- 기존 직원 고용/해고 UI와 시스템은 변경하지 않으며, 새 파이프라인은 기존 직원 시스템 위에 추가된다

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analyst가 배치된 상태에서 게임 내 1일(3600틱) 동안 최소 1개 이상의 TradeProposal이 생성된다
- **SC-002**: Analyst + Manager 구성에서 PENDING 제안서의 80% 이상이 게임 내 30분(약 50틱) 이내에 APPROVED 또는 REJECTED로 전환된다
- **SC-003**: 전체 파이프라인(Analyst + Manager + Trader)이 동작할 때, 제안서 생성부터 체결까지 평균 20틱 이내에 완료된다
- **SC-004**: 인접 배치 보너스가 적용된 팀의 체결 속도가 비인접 팀 대비 30% 이상 빠르다
- **SC-005**: 파이프라인 처리가 프레임 레이트에 미치는 영향이 5% 미만이다 (직원 10명 기준, 60fps 기준 57fps 이상 유지)
- **SC-006**: 파이프라인을 통한 자동 거래의 수익률이 랜덤 거래 대비 양(+)의 수익을 보인다 (Analyst 스킬 50 이상, Manager 스킬 50 이상 기준)
- **SC-007**: 각 파이프라인 단계에서 관련 직원의 말풍선이 2초 이내에 표시된다
- **SC-008**: 플레이어가 "직원이 살아서 일하는 느낌"을 받을 수 있도록, 사무실 창에서 매 게임 내 1일 최소 3개 이상의 파이프라인 관련 말풍선이 표시된다

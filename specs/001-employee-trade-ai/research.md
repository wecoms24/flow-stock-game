# Research: Employee Interaction-based Trade AI Pipeline

**Feature Branch**: `001-employee-trade-ai`
**Date**: 2026-02-15

## Research Summary

기존 코드베이스를 심층 분석하여 모든 Technical Context 미확정 사항을 해소함.

---

## R-001: TradeProposal 상태 관리 위치

**Decision**: Zustand 스토어(`gameStore.ts`)에 `proposals: TradeProposal[]` 추가

**Rationale**: Constitution Principle I (Centralized State Management)에 따라 모든 공유 상태는 Zustand 단일 스토어를 통해야 함. 기존 `competitors`, `events`, `taunts` 배열이 동일 패턴을 사용 중.

**Alternatives considered**:
- 별도 Zustand 스토어 생성 → Constitution 위반 (단일 스토어 원칙)
- React Context → 이미 Zustand 기반 아키텍처에 불일치
- Web Worker 내부 상태 → UI 렌더링과 동기화 복잡도 증가

---

## R-002: 기술적 지표(RSI/MA) 계산 재사용

**Decision**: 기존 `competitorEngine.ts`의 `calculateRSI()`, `calculateMA()` 함수를 별도 유틸리티(`src/utils/technicalIndicators.ts`)로 추출하여 재사용

**Rationale**: 현재 `competitorEngine.ts:6-28`에 이미 구현된 RSI/MA 함수가 존재. DRY 원칙에 따라 추출 후 analystLogic과 competitorEngine 양쪽에서 import.

**Alternatives considered**:
- analystLogic에 별도 구현 → 코드 중복
- competitorEngine에서 직접 import → 순환 의존성 위험

---

## R-003: 파이프라인 처리 주기와 기존 틱 엔진 통합

**Decision**: 기존 `tickEngine.ts`의 Employee tick 처리 블록 직후에 TradeProposal 파이프라인 호출 추가. 역할별 독립 함수로 분리.

**Rationale**: 기존 패턴 분석:
- Employee tick: `empTickInterval` 기반 분산 (10/20/30틱)
- AI competitor: 5틱마다 처리
- 신규 파이프라인도 동일 패턴 적용: Analyst 10틱, Manager 5틱, Trader 매틱

**Alternatives considered**:
- 별도 setInterval → tickEngine과 시간 동기화 문제
- Web Worker 내 처리 → 스토어 접근 불가 (Worker는 priceEngine 전용)

---

## R-004: 인접 배치 보너스 계산

**Decision**: 기존 `officeSystem.ts`의 `getAdjacentEmployees()` 함수를 활용하여 파이프라인 관련 역할 인접 여부를 체크

**Rationale**: `officeSystem.ts:158-188`에 이미 Manhattan distance 기반 인접 직원 탐색이 구현됨. 이를 확장하여 Analyst-Manager, Manager-Trader 인접 시 처리 속도 보너스 계수를 반환하는 함수 추가.

**Alternatives considered**:
- 별도 거리 계산 로직 → 기존 코드와 중복
- 글로벌 보너스 (배치 무관) → 사무실 배치 전략의 의미 소실

---

## R-005: Analyst 섹터 할당 방식

**Decision**: Analyst 고용 시 랜덤으로 1-2개 섹터 할당. Employee 인터페이스에 `assignedSectors?: Sector[]` 필드 추가.

**Rationale**: 기존 게임에 5개 주요 섹터(tech, finance, energy, healthcare, consumer)가 있으며, 20개 종목이 분포. Analyst당 4-8개 종목을 담당하는 것이 밸런스상 적절.

**Alternatives considered**:
- 모든 종목 스캔 → 제안서 과다 생성, 성능 이슈
- 플레이어가 직접 할당 → 추가 UI 필요, 이 피처 범위 초과
- 스킬 기반 자동 할당 → 복잡도 대비 효과 미미

---

## R-006: 슬리피지 구현 방식

**Decision**: 매수 시 `price * (1 + slippageRate)`, 매도 시 `price * (1 - slippageRate)`로 적용. `slippageRate = 0.01 * (1 - tradingSkill / 100)`.

**Rationale**: 기존 `competitorEngine.ts`에는 슬리피지 개념이 없으나, 플레이어 매매(`buyStock`/`sellStock`)도 슬리피지 미적용 상태. 파이프라인 매매에만 적용하여 Trader 역할의 가치를 부여.

**Alternatives considered**:
- 고정 수수료 방식 → Trader 스킬 성장의 인센티브 부족
- 호가 스프레드 시뮬레이션 → 과도한 복잡도

---

## R-007: 제안서 최대 보유량과 만료 정책

**Decision**: 최대 10개 PENDING 제안서. 초과 시 가장 오래된 것부터 EXPIRED 처리. PENDING 상태 100틱 초과 시 자동 만료.

**Rationale**: 성능(매틱 순회 비용)과 게임플레이(의사결정 축적 방지) 균형. 100틱 만료는 게임 내 약 30초(1x 속도 기준)에 해당.

**Alternatives considered**:
- 무제한 → 메모리 및 성능 이슈
- 3개 제한 → Analyst 여러 명 고용 시 의미 감소

---

## R-008: SaveData 호환성

**Decision**: `SaveData` 인터페이스에 `proposals?: TradeProposal[]` 옵셔널 필드 추가. 로드 시 없으면 빈 배열로 초기화.

**Rationale**: Constitution에 명시된 "Breaking changes to SaveData type MUST include migration strategy" 준수. 옵셔널 필드로 하위 호환성 보장.

**Alternatives considered**:
- 버전 번호 증가 + 마이그레이션 → 옵셔널로 충분한 경우 과도
- proposals 미저장 → 로드 후 파이프라인 리셋 문제

---

## R-009: 성격 특성(Trait)과 파이프라인 연동

**Decision**: 기존 10개 trait 중 파이프라인에 영향을 주는 trait 매핑:
- `social`: Manager 승인 임계값 -10
- `risk_averse`: Manager 승인 임계값 +15
- `perfectionist`: Analyst Confidence +5, 분석 주기 1.5배
- `ambitious`: 성공 시 만족도 보너스 2배
- `tech_savvy`: RSI/MA 분석 정확도 +10%

**Rationale**: 기존 `TRAIT_DEFINITIONS`(`src/data/traits.ts`)과 `EmployeeTrait` 타입을 변경 없이 활용. 파이프라인 로직 내에서 trait 체크만 추가.

**Alternatives considered**:
- 새 trait 추가 → 기존 시스템과의 간섭 위험
- 모든 trait 연동 → 밸런싱 복잡도 급증

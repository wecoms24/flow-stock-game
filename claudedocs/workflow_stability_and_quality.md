# Workflow: 안정성 및 품질 개선 구현 계획

> 생성일: 2026-02-15
> 상태: PLAN (구현 전)
> 실행: `/sc:implement` 으로 단계별 실행

---

## 개요

현재 코드 기반 교차검증 결과를 바탕으로, **실제 확인된 이슈**만을 대상으로 한 구현 워크플로우.
갭 분석 원본의 7개 항목 중 코드 검증을 통해 5개 확인, 1개 부정확, 1개 부분 정확으로 판별됨.

### 검증 결과 요약

| # | 항목 | 검증 결과 | 심각도 |
|---|------|-----------|--------|
| 1 | seatIndex 하드코딩 10 버그 | **확인됨** - gameStore.ts:2018-2019, 2046-2047 | 🔴 Critical |
| 2 | afterEffect 시스템 | **이미 구현됨** - tickEngine.ts:194-228 | 🟢 완료 |
| 3 | eventSensitivity 데이터 | **이미 구현됨** - companies.ts + SECTOR_SENSITIVITY | 🟢 완료 |
| 4 | Date.now() 혼용 | **확인됨** - gameStore 11곳, tickEngine 3곳, 기타 7곳 | 🟡 Medium |
| 5 | 매직 넘버 산재 | **확인됨** - officeSystem.ts 10+곳, gameStore 다수 | 🟡 Medium |
| 6 | 죽은 코드 | **부정확** - if(time)/else는 방어 로직으로 유효 | ❌ 해당없음 |
| 7 | 그리드 크기 설정 | **부분 정확** - 10x10 고정, 레벨별 확장 미연결 | 🟡 Medium |

---

## Phase 1: 버그 수정 및 안정성 (우선순위 🔴)

### Task 1.1: seatIndex 좌표 변환 하드코딩 제거

**문제**: `gameStore.ts`에서 seatIndex → (x, y) 변환 시 `/10`, `%10` 하드코딩
**영향**: 오피스 레벨 확장(15x15, 20x20) 시 잘못된 셀 참조로 직원 배치 깨짐

**파일**: `src/stores/gameStore.ts`
**위치**:
- Line 2018-2019: `assignEmployeeSeat` 내 oldSeat 역변환
- Line 2046-2047: `unassignEmployeeSeat` 내 좌석 역변환

**현재 코드**:
```typescript
const oldY = Math.floor(employee.seatIndex / 10)
const oldX = employee.seatIndex % 10
```

**수정 방향**:
```typescript
const gridW = s.player.officeGrid.size.width
const oldY = Math.floor(employee.seatIndex / gridW)
const oldX = employee.seatIndex % gridW
```

**참고**: `officeSystem.ts:164, 230`에서는 이미 올바르게 `grid.size.width` 사용 중

**검증 방법**:
- 기존 테스트 통과 확인
- 수동: 10x10 이외 그리드에서 직원 배치/해제 테스트

**예상 소요**: 10분
**위험도**: 낮음 (단순 상수 → 변수 교체)

---

### Task 1.2: 오피스 그리드 크기와 레벨 연결

**문제**: `gameStore.ts:2240`에서 그리드 크기가 `{ width: 10, height: 10 }`으로 하드코딩
**영향**: `officeLevel`이 올라가도 사무실 크기가 변하지 않음

**파일**: `src/stores/gameStore.ts`
**위치**: Line 2240 부근 (initializeOffice 또는 관련 로직)

**수정 방향**:
```typescript
const OFFICE_SIZES: Record<number, { width: number; height: number }> = {
  1: { width: 10, height: 10 },
  2: { width: 15, height: 15 },
  3: { width: 20, height: 20 },
}
const size = OFFICE_SIZES[officeLevel] ?? OFFICE_SIZES[1]
```

**의존성**: Task 1.1 완료 필수 (하드코딩 제거 선행)

**검증 방법**:
- 레벨 1/2/3 각각에서 그리드 생성 확인
- 좌석 할당/해제가 정확한 좌표로 동작하는지 확인

**예상 소요**: 30분
**위험도**: 중간 (그리드 확장 시 기존 세이브 데이터 호환성 고려 필요)

---

## Phase 2: 밸런스 상수 중앙화 (우선순위 🟡)

### Task 2.1: officeSystem.ts 매직 넘버 추출

**문제**: 직원 FSM/성장/버프 계수가 코드 곳곳에 하드코딩

**대상 파일**: `src/engines/officeSystem.ts`
**확인된 매직 넘버**:
| 위치 | 값 | 의미 |
|------|----|------|
| Line 255 | `0.03` | 스트레스 축적률 |
| Line 263 | `0.005` | 스킬 성장률 |
| Line 279 | `0.3` | 부기술 스필오버 비율 |
| Line 327 | `0.03` | 스트레스 축적률 (중복) |
| Line 328 | `0.005` | 스킬 성장률 (중복) |
| Line 343 | `0.3` | 부기술 스필오버 (중복) |
| Line 351 | `0.05` | IDLE 스태미나 회복량 |
| Line 351 | `0.02` | IDLE 스트레스 감소량 |
| Line 356 | `30` | 만족도 기준 스트레스 |
| Line 360 | `0.005` | 만족도 패널티 계수 |

**수정 방향**:
1. `src/config/balanceConfig.ts` 신규 생성
2. 섹션별 상수 그룹화:

```typescript
export const BALANCE = {
  employee: {
    stressAccumulationRate: 0.03,
    skillGrowthRate: 0.005,
    skillSpilloverRatio: 0.3,
    idleStaminaRecovery: 0.05,
    idleStressReduction: 0.02,
    satisfactionStressBaseline: 30,
    satisfactionPenaltyRate: 0.005,
  },
  // ... 기타 영역
} as const
```

3. `officeSystem.ts`에서 import 후 교체

**의존성**: 없음 (독립 실행 가능)

**검증 방법**:
- 기존 테스트 전체 통과
- 값 자체는 변경 없음 (리팩터링만)

**예상 소요**: 1시간
**위험도**: 낮음 (값 변경 없는 순수 리팩터링)

---

### Task 2.2: gameStore.ts 밸런스 상수 추출

**문제**: 고용 비용, 가구 가격, 이벤트 확률, XP 보상 등이 gameStore 내부에 산재

**수정 방향**:
1. Task 2.1에서 만든 `balanceConfig.ts`에 추가 섹션 확장
2. 난이도별 프리셋 구조 도입:

```typescript
export const DIFFICULTY_PRESETS = {
  easy: { ...BALANCE, employee: { ...BALANCE.employee, skillGrowthRate: 0.008 } },
  normal: BALANCE,
  hard: { ...BALANCE, employee: { ...BALANCE.employee, skillGrowthRate: 0.003 } },
} as const
```

**의존성**: Task 2.1 완료 후

**검증 방법**:
- 기존 테스트 전체 통과
- easy/normal/hard 프리셋 접근 가능 확인

**예상 소요**: 2시간
**위험도**: 낮음

---

## Phase 3: 타임스탬프 통일 (우선순위 🟡)

### Task 3.1: Date.now() 사용처 분류 및 정리

**문제**: 게임 시간과 실제 시간이 혼용되어 세이브/로드/리플레이 시 혼란 가능

**확인된 Date.now() 사용처** (총 21곳):

| 파일 | 횟수 | 용도 |
|------|------|------|
| `gameStore.ts` | 11 | ID 생성, timestamp |
| `tickEngine.ts` | 3 | taunt/notification timestamp |
| `newsEngine.ts` | 4 | event/news ID 생성 |
| `hrAutomation.ts` | 2 | HR event ID 생성 |
| `officeSystem.ts` | 1 | absoluteTick fallback |

**수정 전략**:
1. **ID 생성용** (무해): 유지 가능 — 고유성만 보장하면 됨
2. **timestamp/순서 비교용** (문제): 게임 시간(absoluteTick)으로 교체
3. **UI 표시용**: 게임 시간 → 포매팅 유틸리티로 변환

**단계**:
- 3.1a: 유틸리티 함수 `getAbsoluteTick(time: GameTime): number` 생성
- 3.1b: timestamp 비교/만료 로직에서 Date.now() → absoluteTick 교체
- 3.1c: ID 생성은 현행 유지 (영향 없음)

**의존성**: 없음

**검증 방법**:
- 기존 테스트 통과
- 세이브 → 로드 후 이벤트 순서 정상 확인

**예상 소요**: 1.5시간
**위험도**: 중간 (타임스탬프 변경은 세이브 데이터 호환성에 영향)

---

## Phase 4: UX 개선 (우선순위 🟢)

### Task 4.1: 오피스 줌/셀 크기 옵션

**현재 상태**: `IsometricOffice.tsx:122`에서 `GRID_SIZE = 6`으로 고정 렌더링

**수정 방향**:
1. 줌 레벨 상태 추가 (50% / 100% / 150%)
2. CSS transform: scale() 기반 줌 적용
3. 줌 컨트롤 UI (버튼 또는 슬라이더)

**의존성**: Phase 1 완료 권장 (그리드 크기 동적화 선행)

**예상 소요**: 1시간
**위험도**: 낮음

---

### Task 4.2: 직원 상호작용 시각화 (SVG 연결선)

**현재 상태**: 상호작용은 officeEvents + 말풍선으로만 표현

**수정 방향**:
1. 활성 상호작용에서 참여 직원 좌표 추출
2. SVG overlay로 셀 간 연결선 그리기
3. 상호작용 타입별 색상 구분 (협업=파랑, 갈등=빨강, 수다=초록)

**의존성**: Task 4.1과 병렬 가능

**예상 소요**: 2시간
**위험도**: 낮음 (순수 UI 추가)

---

## Phase 5: 차트 시각화 보강 (우선순위 🟢)

### Task 5.1: 이벤트 밴드 렌더링

**현재 상태**: `eventMarkers` 계산은 있으나, 마커 점 형태만 표시

**수정 방향**:
1. Chart.js 커스텀 플러그인으로 이벤트 기간 반투명 밴드 렌더링
2. afterEffect 구간은 점선 + 낮은 투명도로 구분
3. 호버 시 이벤트 이름/영향도 툴팁

**의존성**: afterEffect는 이미 구현되어 있으므로 바로 진행 가능

**예상 소요**: 2시간
**위험도**: 낮음

---

## 실행 순서 및 의존성 맵

```
Phase 1 (버그/안정성) ─── 🔴 최우선
  ├── Task 1.1: seatIndex 하드코딩 제거 [10분]
  └── Task 1.2: 그리드 크기-레벨 연결 [30분] ← depends on 1.1

Phase 2 (밸런스 중앙화) ─── 🟡 병렬 가능
  ├── Task 2.1: officeSystem 매직넘버 추출 [1시간]
  └── Task 2.2: gameStore 상수 추출 + 난이도 프리셋 [2시간] ← depends on 2.1

Phase 3 (타임스탬프) ─── 🟡 병렬 가능
  └── Task 3.1: Date.now() 정리 [1.5시간]

Phase 4 (오피스 UX) ─── 🟢 Phase 1 이후
  ├── Task 4.1: 줌/셀 크기 [1시간]
  └── Task 4.2: 상호작용 연결선 [2시간] ← parallel with 4.1

Phase 5 (차트) ─── 🟢 독립
  └── Task 5.1: 이벤트 밴드 렌더링 [2시간]
```

### 병렬 실행 전략

```
시간축 →
─────────────────────────────────────────────
[Phase 1: 1.1 → 1.2]  (40분)
                        [Phase 2: 2.1 → 2.2]  (3시간)
[Phase 3: 3.1]          (1.5시간)
                        [Phase 4: 4.1 | 4.2]  (2시간, 병렬)
                                               [Phase 5: 5.1]  (2시간)
─────────────────────────────────────────────
총 예상: ~5-6시간 (병렬 실행 시)
```

---

## 취소/변경된 항목 (원본 분석 대비)

| 원본 항목 | 상태 | 사유 |
|-----------|------|------|
| afterEffect 시스템 구현 | **불필요** | tickEngine.ts:194-228에 이미 완전 구현됨 |
| eventSensitivity 데이터 채우기 | **불필요** | SECTOR_SENSITIVITY 맵이 이미 10개 섹터 전체 적용 |
| 죽은 코드 제거 | **불필요** | if(time)/else는 방어 로직으로 유효한 코드 |

---

## 체크포인트 및 검증 게이트

### Gate 1: Phase 1 완료 후
- [ ] `npm run build` 성공
- [ ] 기존 오피스 관련 테스트 전체 통과
- [ ] 10x10 그리드에서 직원 배치/해제 정상 동작

### Gate 2: Phase 2 완료 후
- [ ] `npm run build` 성공
- [ ] balanceConfig.ts에서 모든 상수 import 확인
- [ ] 기존 테스트 전체 통과 (값 변경 없음)

### Gate 3: Phase 3 완료 후
- [ ] `npm run build` 성공
- [ ] 세이브/로드 후 이벤트 순서 정상

### Gate 4: Phase 4-5 완료 후
- [ ] `npm run build` 성공
- [ ] 줌 50/100/150% 전환 시 레이아웃 정상
- [ ] 차트에서 이벤트 밴드 시각적 확인

---

## 다음 단계

이 워크플로우 완료 후 고려할 추가 작업:
- 난이도별 프리셋을 게임 시작 화면에서 선택 가능하게 UI 연결
- 레벨업 시 오피스 확장 애니메이션 + 기존 직원 좌석 보존 로직
- 차트 센티먼트 오버레이 (공포-탐욕 지수 곡선)

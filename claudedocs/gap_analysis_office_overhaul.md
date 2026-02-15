# Gap Analysis: Office Overhaul Workflow vs Implementation

> 분석일: 2026-02-15
> 대상: `claudedocs/workflow_office_overhaul.md` (5 Sprint, 22 Task)
> 방법: 소스 코드 Grep/Read 기반 존재 여부 + 기능 범위 비교

---

## 전체 요약

| Sprint | 계획 Task | 완료 | 부분 | 미구현 | 완성도 |
|--------|----------|------|------|--------|--------|
| Sprint 1: 뉴스 확장 | 5 | 5 | 0 | 0 | **100%** |
| Sprint 2: 주가-뉴스 연동 | 6 | 3 | 1 | 2 | **58%** |
| Sprint 3: 직원 AI | 4 | 3 | 1 | 0 | **88%** |
| Sprint 4: 시각화 + 히스토리 | 8 | 3 | 1 | 4 | **44%** |
| Sprint 5: 통합 + 밸런싱 | 4 | 2 | 1 | 1 | **63%** |
| **전체** | **27** | **16** | **4** | **7** | **67%** |

---

## Sprint 1: 뉴스 시스템 대폭 확장 (100%)

### Task 1.1: 역사적 이벤트 데이터베이스 ✅ 완료
- **파일**: `src/data/historicalEvents.ts` (375줄)
- **구현**: 1995-2025 역사적 이벤트 다수 포함, chainEvents 지원
- **주요 이벤트**: IMF, 닷컴 버블, 9/11, 리먼, 코로나, ChatGPT 등

### Task 1.2: 절차적 뉴스 생성 엔진 ✅ 완료
- **파일**: `src/engines/newsEngine.ts`
- **구현**: `generateProceduralEvent()` 함수 존재

### Task 1.3: 뉴스 연쇄 시스템 ✅ 완료
- **파일**: `src/engines/newsEngine.ts`
- **구현**: `PendingChainEvent`, `registerChainEvents()`, `checkChainEvents()` 구현

### Task 1.4: 타입 확장 ✅ 완료
- **파일**: `src/types/index.ts`
- **구현**: `EventSource`, `EventCategory` 확장, `chainParentId`, `historicalYear` 추가

### Task 1.5: tickEngine 통합 ✅ 완료
- **파일**: `src/engines/tickEngine.ts`
- **구현**: `processNewsEngine(current.time)` 호출 통합

---

## Sprint 2: 주가-뉴스 연동 시뮬레이션 강화 (58%)

### Task 2.1: 회사별 이벤트 감응도 ❌ 미구현
- **계획**: Company에 `eventSensitivity: Record<string, number>` 추가
- **현황**: `src/data/companies.ts`에 해당 속성 없음
- **영향**: 모든 회사가 동일 섹터 이벤트에 균일하게 반응
- **심각도**: 🟡 중간 (게임플레이 다양성 감소)

### Task 2.2: 가격 전파 지연 시스템 🟡 부분 구현
- **완료**: `getEventPropagation()` 함수 존재 (0-10틱: 50%, 10-50틱: 50→100%)
- **미구현**: **여진 시스템** (afterEffect) - 이벤트 종료 후 10% 잔여효과 50틱
- **영향**: 이벤트 종료 시 가격이 급격히 정상화 (실제 시장과 다름)
- **심각도**: 🟡 중간 (시뮬레이션 리얼리즘 저하)

### Task 2.3: 시장 센티먼트 엔진 ✅ 완료
- **파일**: `src/engines/sentimentEngine.ts`
- **구현**: global/sector sentiment, fearGreedIndex, mean reversion, isActive 최적화

### Task 2.4: 섹터 상관관계 매트릭스 ✅ 완료
- **파일**: `src/data/sectorCorrelation.ts`
- **구현**: SECTOR_CORRELATION, tickEngine에서 spillover 전파

### Task 2.5: 이벤트 임팩트 실시간 추적 ✅ 완료
- **파일**: `src/engines/tickEngine.ts`
- **구현**: priceImpactSnapshot 매 틱 업데이트, currentChange/peakChange 추적

### Task 2.6: ChartWindow 개선 ❌ 미구현
- **계획**: 이벤트 밴드 (반투명 배경), 센티먼트 오버레이, 여진 구간 점선
- **현황**: ChartWindow에 해당 시각 요소 없음
- **영향**: 이벤트-가격 연동을 시각적으로 확인 불가
- **심각도**: 🟡 중간 (UX 정보 부족, 게임성 핵심은 아님)

---

## Sprint 3: 직원 AI 로직 개선 (88%)

### Task 3.1: 행동 상태 머신 (FSM) 🟡 부분 구현
- **파일**: `src/engines/employeeBehavior.ts`
- **완료**: 8개 상태 (WORKING, IDLE, BREAK, SOCIALIZING, COFFEE, MEETING, STRESSED_OUT, COUNSELING)
- **미구현**: `ARGUING` 상태 (갈등 시 별도 행동 상태)
- **영향**: 갈등 상호작용은 발생하나 별도 행동 상태로 분리되지 않음
- **심각도**: 🟢 낮음 (conflict interaction이 이미 존재하므로 기능 손실 미미)

### Task 3.2: 직원 상호작용 시스템 ✅ 완료
- **파일**: `src/engines/employeeInteraction.ts`
- **구현**: 7개 상호작용 타입 전부 구현 (collaboration, mentoring, smalltalk, conflict, coffee_invite, competition, help_request)
- **쿨다운 + 정리**: cleanupInteractionCooldowns 구현

### Task 3.3: 대화 시스템 개선 ✅ 완료
- **파일**: `src/data/chatter.ts`
- **구현**: `DialoguePair` 인터페이스, `selectContextualDialogue()` 함수

### Task 3.4: officeSystem 통합 ✅ 완료
- **파일**: `src/engines/officeSystem.ts`
- **구현**: employeeBehavior + employeeInteraction + chatter 통합

---

## Sprint 4: 사무실 시각화 + 히스토리 (44%)

### Task 4.1: 이모지 캐릭터 시스템 ✅ 완료
- **파일**: `src/data/employeeEmoji.ts`
- **구현**: ROLE_EMOJI, BEHAVIOR_EMOJI 매핑

### Task 4.2: OfficeWindow 리디자인 🟡 부분 구현
- **완료**: 이모지 캐릭터 셀 렌더링, 히스토리 버튼
- **미구현**:
  - 셀 크기 64px 전환 (현재 40px 유지)
  - 줌 레벨 (50%, 100%, 150%)
  - 상호작용 연결선 시각화 (SVG path)
- **심각도**: 🟡 중간 (UX 개선 사항, 핵심 기능은 아님)

### Task 4.3: 행동 애니메이션 (EmployeeSprite.tsx) ❌ 미구현
- **계획**: Motion 라이브러리로 행동별 애니메이션 (진동, 호흡, 떨림, 고개 끄덕)
- **현황**: `src/components/office/EmployeeSprite.tsx` 파일 미생성
- **영향**: 직원 행동이 시각적으로 구분되지 않음 (이모지만 변경)
- **심각도**: 🟡 중간 (시각적 풍부함 감소)

### Task 4.4: 사무실 이벤트 로그 시스템 ✅ 완료 (변형)
- **계획**: `src/engines/officeEventLogger.ts` 별도 파일
- **실제**: officeSystem.ts에 통합 구현, OfficeEvent 타입은 types 또는 store에서 정의
- **기능**: officeEvents 배열이 store에 존재, FIFO 관리

### Task 4.5: OfficeHistoryWindow ✅ 완료
- **파일**: `src/components/windows/OfficeHistoryWindow.tsx`
- **구현**: WindowManager에 등록, 렌더링 확인

### Task 4.6: 알림 토스트 시스템 (OfficeToast.tsx) ❌ 미구현
- **계획**: 화면 우하단 토스트 알림 (최대 3개, 3초 자동 사라짐)
- **현황**: `src/components/office/OfficeToast.tsx` 파일 미생성
- **영향**: 사무실 이벤트 발생 시 즉시 피드백 없음 (히스토리에서만 확인)
- **심각도**: 🟡 중간 (사용자 피드백 루프 약화)

### Task 4.7: 직원 상세 팝업 (EmployeeDetail.tsx) ❌ 미구현
- **계획**: 직원 클릭 시 상세 모달 (프로필, 스탯 바, 스킬, 성장 그래프, 최근 활동)
- **현황**: `src/components/office/EmployeeDetail.tsx` 파일 미생성
- **영향**: 직원 상세 정보 확인 불가 (그리드에서 간략 정보만)
- **심각도**: 🟡 중간 (직원 관리 UX 핵심 요소)

### Task 4.8: WindowManager + Taskbar 등록 ✅ 완료
- **구현**: office_history WindowType, Taskbar 버튼, WindowManager 등록, PixelIcon

---

## Sprint 5: 통합 + 밸런싱 + 최적화 (63%)

### Task 5.1: 전체 통합 테스트 ❌ 미수행
- **계획**: 30분+ 연속 플레이, 엣지 케이스 테스트
- **현황**: 자동화 테스트는 존재하나 실제 플레이 테스트 미수행
- **심각도**: 🟡 중간

### Task 5.2: 퍼포먼스 최적화 🟡 부분 구현
- **완료**:
  - sentimentEngine isActive 최적화 (비활성 시 스킵)
  - 직원 AI 틱 분산 (인원별 동적 interval)
  - 이벤트 로그 100개 제한
- **미구현**:
  - react-window 가상 리스트 (FIFO 제한으로 대체)
  - 64px 그리드 애니메이션 최적화 (그리드 변경 자체가 미구현)
  - offscreen 직원 애니메이션 비활성화
- **심각도**: 🟢 낮음 (FIFO 제한이 실용적 대안)

### Task 5.3: 밸런싱 ✅ 완료
- **구현**: STRESSED_OUT/COUNSELING 효과 밸런싱 완료
- 센티먼트 감쇠, 전파지연 속도 등 기존 값 유지

### Task 5.4: 세이브 호환성 ✅ 완료
- **구현**: loadSavedGame에서 nullish coalescing 마이그레이션
- stress, satisfaction, skills, traits, level, xp, mood 기본값 폴백

---

## 우선순위별 미구현 항목 정리

### 🔴 높은 우선순위 (게임 경험 핵심)

| # | 항목 | Sprint | 예상 작업량 | 이유 |
|---|------|--------|-----------|------|
| 1 | **EmployeeDetail.tsx** (직원 상세 팝업) | 4.7 | 중 | 직원 관리의 핵심 UX, 정보 접근성 |
| 2 | **OfficeToast.tsx** (알림 토스트) | 4.6 | 소 | 사무실 이벤트의 실시간 피드백 |

### 🟡 중간 우선순위 (게임 풍부함)

| # | 항목 | Sprint | 예상 작업량 | 이유 |
|---|------|--------|-----------|------|
| 3 | **eventSensitivity** (회사별 감응도) | 2.1 | 소 | 가격 반응 다양성 |
| 4 | **여진 시스템** (afterEffect) | 2.2 | 소 | 시뮬레이션 리얼리즘 |
| 5 | **ChartWindow 이벤트 밴드** | 2.6 | 중 | 주가-뉴스 연동 시각화 |
| 6 | **EmployeeSprite.tsx** (행동 애니메이션) | 4.3 | 중 | 시각적 풍부함 |
| 7 | **OfficeWindow 64px + 줌** | 4.2 | 중 | 그리드 가독성 |

### 🟢 낮은 우선순위 (Nice-to-have)

| # | 항목 | Sprint | 예상 작업량 | 이유 |
|---|------|--------|-----------|------|
| 8 | **ARGUING** FSM 상태 | 3.1 | 극소 | conflict interaction이 이미 대체 |
| 9 | **react-window** 가상 리스트 | 5.2 | 소 | 100개 FIFO가 실용적 대안 |
| 10 | **30분 플레이 테스트** | 5.1 | 중 | QA 범주 (자동화 테스트 존재) |

---

## 구현 완료 하이라이트

### 잘 구현된 시스템
1. **뉴스 시스템 (Sprint 1)**: 역사적 이벤트 + 절차적 생성 + 연쇄 시스템 완벽 구현
2. **센티먼트 엔진**: global/sector 센티먼트 + mean reversion + isActive 최적화
3. **섹터 상관관계**: SECTOR_CORRELATION 매트릭스 + spillover 전파
4. **직원 상호작용**: 7가지 상호작용 + 쿨다운 + 정리 로직
5. **행동 FSM**: 8개 상태 + trait 보정 + 시간대 보정 + 가중 랜덤
6. **세이브 마이그레이션**: nullish coalescing 기반 하위 호환

### 계획 대비 변형 구현
- **officeEventLogger**: 별도 파일 대신 officeSystem.ts에 통합 (합리적 결정)
- **이벤트 로그 가상 리스트**: react-window 대신 100개 FIFO 제한 (실용적 대안)
- **ARGUING 상태**: 별도 FSM 상태 대신 conflict interaction으로 처리 (기능 보존)

---

## 권장 다음 작업

미구현 항목을 우선순위 순으로 구현하되, 의존 관계를 고려:

```
Phase A (UX 핵심):
  EmployeeDetail.tsx → OfficeToast.tsx
  (직원 상세 → 토스트 알림)

Phase B (시뮬레이션 강화):
  eventSensitivity → 여진(afterEffect)
  (독립적, 병렬 가능)

Phase C (시각화 강화):
  ChartWindow 이벤트 밴드 + 센티먼트 오버레이
  EmployeeSprite.tsx + OfficeWindow 64px/줌
  (Phase A, B 완료 후)
```

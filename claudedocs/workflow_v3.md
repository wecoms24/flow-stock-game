# v3 AI 하이퍼-퍼스널라이제이션 실행 계획 (최종)

본 실행 계획은 v3 코드베이스에서 이미 존재하는 `officeEvents` 히스토리/필터 UI, 경쟁자 랭킹/거래피드/상세 탭 구조, 도발(taunts) 피드, 직원 상세/성장 로그, 그리고 `evaluateRisk` 기반 매매 승인 파이프라인을 **변형 최소**로 활용해 개인화를 얹는 방식으로 설계했습니다.[1]
또한 v3의 Tick/Day/Month 경계 테스트(예: day 변화, 월 경계에서 `processMonthly` 호출, `advanceNTicks` 기반 검증)가 이미 준비돼 있으므로, 개인화 연산을 “틱마다”가 아니라 “일/월 경계”로 제한하는 것이 성능·회귀 측면에서 가장 안전합니다.[1]

***

## 1) 목표, 범위, 비범위

### 목표
- 플레이어 행동을 기반으로 프로필을 산출하고, UI/파이프라인/라이벌의 **표시·임계치·강도**를 맞춰 “피로도 감소 + 몰입 강화”를 달성합니다.[2][3]
- 개인화 ON/OFF 토글이 가능하고, OFF일 때는 기존 v3 동작과 동일해야 합니다(회귀 방지).[1]

### 1차 범위 (v3.1)
- 행동 로그 수집(저비용, 상한 유지) + PlayerProfile 산출(일/월 경계) + 정책(PersonalizationPolicy) 적용.
- UI 개인화: RankingWindow 기본 탭/도발 표시 방식/알림 강도 조절.
- 파이프라인 개인화: `evaluateRisk` 승인 임계치에 바이어스 적용 + 근거 로그 남김.[1]
- 라이벌 개인화: “Mirror Rival 1명” 파라미터 미세 조정(전략 타입은 유지).[1]

### 비범위 (v3.1에서 제외)
- 완전한 LLM 대화형 비서, 장기 기억 기반 스토리 생성, 플레이어를 이기는 수준의 적응형 치트 AI.
- 틱 루프마다 모델 추론/대규모 통계 계산(성능 리스크).

***

## 2) 아키텍처 및 산출물(Deliverables)

v3에 추가/변경될 산출물은 아래로 고정합니다(파일 경로는 제안이며 리팩터링 가능).

### 코드/데이터 산출물
1. `src/types/personalization.ts`
- `PlayerEvent`, `PlayerProfile`, `PersonalizationPolicy` 타입 정의.

2. `src/stores/slices/personalizationSlice.ts` (신규)
- 상태: `playerEventLog`, `playerProfile`, `personalization`
- 액션: `logPlayerEvent`, `updateProfileOnDayEnd`, `updateProfileOnMonthEnd`, `applyPersonalizationPolicy`, `setPersonalizationEnabled`

3. `src/systems/personalization/profile.ts` (신규)
- 프로필 산출 함수(순수 함수): `computeProfileFromEvents(...)`

4. UI 변경
- `src/components/windows/SettingsWindow.tsx`: Personalization ON/OFF + 디버그(프로필 간단 보기)[1]
- `src/components/windows/RankingWindow.tsx`: 기본 탭 개인화 + taunt 표시 정책 적용(예: 기본 접힘)[1]
- (선택) `OfficeHistoryWindow.tsx`: “오늘의 요약 3줄” 카드(스팸 방지 조건 포함)[1]
- (선택) `EmployeeDetailWindow.tsx`: “추천 1개 행동” (설명 가능한 수준만)[1]

5. 엔진/루프 연결
- 시간 경계에서 업데이트: day change 시 `updateProfileOnDayEnd()`, 월 처리 `processMonthly` 이후 `updateProfileOnMonthEnd()` 호출(혹은 그에 준하는 위치).[1]

***

## 3) 2주 스프린트 실행 계획 (티켓 수준 세부화)

인력 가정은 1명 단독(2주) 또는 2명 병렬(1.5주) 모두 가능하게 구성했습니다.  
티켓 포맷은 “Task / Subtasks / Acceptance Criteria / Est.”로 고정합니다(기존 Workflow 문서 스타일을 따름).[4]

### Sprint 1 (Week 1): Foundation + Profile
#### Track A (Core / Store / Types)
**P0-1: 타입/상태 추가**
- Task: `personalization.ts` 타입 정의, 스토어 상태 필드 추가(기본값 포함).
- Subtasks:
    - `PlayerProfile.version`과 기본값 함수 `defaultProfile()` 작성(마이그레이션 대비).
    - `playerEventLog` 상한(예: 1000) 상수화.
- AC:
    - `npm run build` 타입 에러 0.
    - 기존 테스트 컴파일/실행에 영향 없음.
- Est: 0.5d

**P0-2: 행동 로그 수집 API**
- Task: `logPlayerEvent(kind, meta)` 구현 + 상한 유지(초과 시 앞에서 drop).
- Subtasks:
    - `buyStock/sellStock` 성공 시 TRADE 로그 기록(메타: ticker, qty, price, pnl if known).
    - `togglePause/setSpeed` SETTINGS 로그 기록(메타: speed/isPaused).
    - RankingWindow 탭 변경 시 WINDOW_FOCUS 로그(메타: tabId).
- AC:
    - 로그가 상한을 넘지 않음.
    - 개인화 OFF여도 로그는 기록(프로필은 계산 안 할 수 있음).
- Est: 1.0d

#### Track B (Profile Compute)
**P1-1: 프로필 산출 순수 함수**
- Task: `computeProfileFromEvents(events, currentState) -> PlayerProfile` 구현(일 단위).
- Subtasks:
    - `riskTolerance`, `playPace`, `attention`, `learningStage` 4가지만 1차 산출.
    - “최근 14일/30일” 윈도우를 day 기준으로 계산(이벤트에 day 인덱스 포함 권장).
- AC:
    - 동일 입력이면 동일 출력(순수성).
    - 계산 복잡도 O(N) (N=최근 이벤트 수)이고 N은 상한으로 제한됨.
- Est: 1.0d

**P1-2: Day/Month 경계 연결**
- Task: day change 시 `updateProfileOnDayEnd()`가 1회만 실행되도록 연결.[1]
- Subtasks:
    - v3 시간 진행 테스트를 참고해 “일 경계” 감지 로직을 `advanceHour` 혹은 동일한 루프에 삽입.[1]
    - `processMonthly` 이후 month-end 업데이트 연결(중복 실행 방지).[1]
- AC:
    - `time.isPaused === true`이면 업데이트가 실행되지 않거나(정책에 따라) 중복 실행되지 않음.[1]
    - day 경계에서만 `lastUpdatedDay`가 증가.
- Est: 1.0d

### Sprint 2 (Week 2): Policy Apply + UX + Rival
#### Track A (UI Personalization)
**P2-1: SettingsWindow 토글 + 디버그**
- Task: Personalization ON/OFF, 간단한 프로필 요약 표시(옵션).
- AC:
    - 토글 OFF 시 적용 정책이 “중립값”으로 리셋.
    - 사운드 설정 등 기존 UX 훼손 없음.[1]
- Est: 0.5d

**P2-2: RankingWindow 기본 탭 개인화**
- Task: `attention` 기반으로 RankingWindow의 초기 탭 선택.
- Subtasks:
    - 기존 `needsCompanies` 최적화를 깨지 않도록, 탭 기본값만 변경하고 구독 조건은 유지.[1]
- AC:
    - 탭이 자동 선택되되, 사용자가 바꾸면 즉시 반영.
    - 리렌더 폭증 없음(프로파일링/간단 측정).
- Est: 0.5d

**P2-3: Taunt 표시 정책**
- Task: 보수/스트레스 민감 유저에게 taunt 기본 접힘 또는 필터(표시 방식만).
- AC:
    - taunt 데이터(`taunts`)는 그대로 누적/상한 유지.[1]
    - UI만 다르게 보임.
- Est: 0.5d

#### Track B (Pipeline Bias)
**P3-1: evaluateRisk 바이어스 적용**
- Task: `evaluateRisk`에 `approvalBias` 적용(정책 기반) + 근거 officeEvents 기록.
- Subtasks:
    - 승인 threshold 조정: 예) riskTolerance 낮음 => +7, 높음 => -5 (초기값).
    - 기록 메시지: “개인화 정책으로 승인 임계치 +7 적용” 1줄.[1]
- AC:
    - 개인화 OFF 시 bias=0.
    - 자금 부족/수량 부족 같은 기존 거절 사유 로직은 변경하지 않음.[1]
- Est: 1.0d

#### Track C (Mirror Rival)
**P4-1: Mirror Rival 지정 및 파라미터 주입**
- Task: 경쟁자 중 1명을 Mirror로 지정하고, `processAITrading` 입력/전처리에 정책 파라미터를 주입.[1]
- Subtasks:
    - 지정 규칙: 생성 시 1명 랜덤 또는 “플레이어 바로 아래 순위” 등(단순 규칙).
    - 조정 파라미터: 포지션 사이즈 계수, 거래 빈도 계수, 패닉 민감도 계수(전략 타입은 유지).[1]
- AC:
    - 기존 competitor 벤치/테스트(패닉셀 쿨다운, priceHistory 길이 1일 때 Surfer/Bear 무행동 등)를 깨지 않음.[1]
- Est: 1.0d

***

## 4) QA/성능/릴리즈 게이트 (DoD)

v3는 TickEngine/CompetitorEngine/HRAutomation에 대해 통합 테스트 및 성능 벤치가 이미 존재하므로, 개인화는 그 패턴을 그대로 따라 “경계 이벤트에서만 계산”을 검증합니다.[1]
또한 v3는 `competitorActions` 상한(최근 100), `taunts` 상한(최근 20), priceHistory 상한(50) 등 “상한 기반 성능 설계”가 명확하므로, 개인화 로그도 동일한 상한 규칙을 강제합니다.[1]

### 필수 테스트 티켓
**T-1: profile 업데이트 타이밍**
- Given: `advanceNTicks`로 day를 여러 번 넘김
- Expect: day 경계에서만 profile 업데이트, pause 상태에서는 시간 변화 없음.[1]

**T-2: 로그 상한**
- Given: 1500개 이벤트 기록
- Expect: `playerEventLog.length === MAX(1000)` 유지.

**T-3: OFF 동작 동일**
- Given: 동일 시나리오에서 personalization OFF
- Expect: `evaluateRisk` 결과/RankingWindow 기본 탭/taunt 표시가 중립 정책으로 동작.

**T-4: 경쟁자 회귀**
- Given: 기존 competitorEngine 테스트 시나리오
- Expect: panic sell/쿨다운/행동 분포 테스트 그대로 통과.[1]

### 성능 게이트
- 개인화 계산은 day/month 경계에서만 수행(O(N), N<=상한)하므로, 틱당 비용 증가가 없어야 합니다.[1]
- RankingWindow의 `needsCompanies` 구독 최적화(디테일 탭에서만 companies subscribe)를 유지해야 합니다.[1]

***

## 5) 일정(캘린더)과 담당 분장

### 단독 개발(권장 10영업일)
- Day 1: P0-1, P0-2(일부)
- Day 2: P0-2 완료
- Day 3: P1-1
- Day 4: P1-2 + T-1 초안
- Day 5: 버그픽스/리팩터링 + T-2
- Day 6: P2-1, P2-2
- Day 7: P2-3 + UI 회귀 점검
- Day 8: P3-1 + T-3
- Day 9: P4-1 + T-4
- Day 10: 전체 통합, 성능 점검, 릴리즈 노트

### 2인 병렬(권장 7~8영업일)
- Dev A(Core): P0-1 → P0-2 → P1-2 → P3-1 → 테스트(T-1~T-3)
- Dev B(UX/AI): P1-1 → P2-1/2/3 → P4-1 → 테스트(T-4)
- Day 7~8: 통합/리그레션/밸런스 조정

***

원하시면, 위 계획을 그대로 “GitHub 이슈/PR 템플릿” 형태(각 Task별 체크박스 + AC + 테스트 항목 + 리뷰 포인트)로 변환해서 팀이 바로 실행할 수 있게 정리해드릴까요?

출처
[1] merged_code-v3.txt https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_b7d31ff7-43c9-47c2-8398-6334e1f322ab/68a5428e-0c72-4024-9090-bd789e77bae5/merged_code-v3.txt
[2] Game UX Design 2026: The Ultimate Player Experience Guide https://www.boundev.com/blog/game-ux-design-guide-2026
[3] 7 UX/UI Trends That Will Change the Game in 2026 https://www.aistechnolabs.com/blog/7-ux-ui-game-trends-2025
[4] workflow_investment_battle.md https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_b7d31ff7-43c9-47c2-8398-6334e1f322ab/a0638101-045c-46e4-897d-fcd29e84fa60/workflow_investment_battle.md

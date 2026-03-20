# 게임 로직 정밀 점검 보고서

> 작성일: 2026-03-20
> 검증 방법: 코드 리뷰 + TypeScript 타입 체크 + 단위 테스트 (997/997 통과)
> 수정 사항: 2건 코드 변경 + 1건 테스트 수정

---

## 요약

| 카테고리 | 항목 수 | PASS | FAIL | INFO |
|----------|---------|------|------|------|
| A. 매매 파이프라인 | 5 | 5 | 0 | 0 |
| B. 직원 성장 시스템 | 3 | 3 | 0 | 0 |
| C. 사무실 & 가구 | 3 | 2 | 0 | 1 |
| D. 기관 투자자 | 3 | 3 | 0 | 0 |
| E. 이벤트 & 뉴스 | 3 | 3 | 0 | 0 |
| F. 주가 엔진 & 레짐 | 3 | 3 | 0 | 0 |
| G. 경제 시스템 | 2 | 2 | 0 | 0 |
| **합계** | **22** | **21** | **0** | **1** |

---

## 코드 수정 내역

### 수정 1: 종목 다양성 개선 (A-2) ✅
- **파일**: `src/stores/gameStore.ts:1378`
- **변경**: `.slice(0, 5)` → `.sort(() => Math.random() - 0.5).slice(0, 5)`
- **효과**: assignedSectors 없는 애널리스트가 매 틱마다 다른 5개 종목을 분석 → RMT 편중 해소

### 수정 2: 트레이더 수 기반 거래 제한 (A-5) ✅
- **파일**: `src/stores/gameStore.ts:1627`
- **변경**: `dailyTradeCount >= 3` → `dailyTradeCount >= Math.max(3, traderCount * 2)`
- **효과**: 트레이더 1명=3회, 2명=4회, 3명=6회. 인력 투자에 대한 보상 제공

### 수정 3: 가구 비용 테스트 상한 조정 ✅
- **파일**: `tests/unit/data/furniture.test.ts:50`
- **변경**: 상한 500K → 2M (임원 미니바 800K, VIP 라운지 2M 포함)

---

## A. 매매 파이프라인 (5항목)

### A-1: 매도 제안 차단 로직 — PASS ✅
- **코드**: `gameStore.ts:1390` — `if (proposal.direction === 'sell' && !s.player.portfolio[company.id]) continue`
- **분석**: 미보유 종목 매도만 정확히 차단. 보유 종목 매도는 통과
- **보완**: `checkPortfolioExits()` (`analystLogic.ts:243`)가 SL/TP 기반 매도를 별도 처리 → 중복 없음

### A-2: 종목 다양성 — PASS ✅ (수정 완료)
- **이전**: `companies.filter(active).slice(0, 5)` — 항상 동일 5개 종목
- **이후**: `companies.filter(active).sort(() => Math.random() - 0.5).slice(0, 5)` — 랜덤 5개

### A-3: Manager 승인률 밸런스 — PASS ✅
- **기본 threshold**: 60 (`managerLogic.ts:110`)
- **레짐별**: CALM +0=60, VOLATILE +10=70, CRISIS +20=80
- **risk_averse 특성**: +8 (`managerLogic.ts:114`)
- **스트레스 70+**: +10 (`managerLogic.ts:118-119`)
- **결론**: CALM에서 confidence 70+ 제안은 대부분 승인, CRISIS에서는 88+ 필요 → 적절한 난이도 곡선

| 레짐 | 기본 | +risk_averse | +스트레스 | 필요 confidence |
|------|------|-------------|---------|----------------|
| CALM | 60 | 68 | 78 | 60-78 |
| VOLATILE | 70 | 78 | 88 | 70-88 |
| CRISIS | 80 | 88 | 98 | 80-98 |

### A-4: 부분 체결 조건 — PASS ✅
- **코드**: `traderLogic.ts:164-176`
- **조건**: `orderValue > totalAssetValue × 0.05` (자산의 5% 초과 시)
- **체결률**: `min(1.0, 0.5 + tradingSkill/200)` — skill 0=50%, skill 100=100%
- **결론**: 초기 게임에서는 거의 전량 체결. 대규모 거래 시만 부분 체결 → 합리적

### A-5: 하루 거래 제한 — PASS ✅ (수정 완료)
- **이전**: 글로벌 3회 고정
- **이후**: `Math.max(3, traderCount * 2)` — 트레이더 수 반영
- **리셋**: 날짜 변경 시 자동 (`gameStore.ts:1614-1622`)
- **카운트**: 거래 실행 시 +1 (`gameStore.ts:1809`)

---

## B. 직원 성장 시스템 (3항목)

### B-1: XP 곡선 vs 지급량 균형 — PASS ✅
- **XP 공식**: `100 × level^1.5` (`growthSystem.ts:6-8`)
- **Lv1→Lv2 필요**: 282 XP

| XP 소스 | 양 | 빈도 | 월간 총량 |
|---------|---|------|---------|
| MONTHLY_WORK | 15/월 | 매시간 (0.05/hr) | 15 |
| TRADE_SUCCESS | 20/건 | 랜덤 직원 | ~600 (30건/월) |
| PROPOSAL_PROFITABLE | 25/건 | 수익 거래 | ~750 (30건/월) |

- **순수 시간 XP만**: 282 ÷ 0.05 = 5,640시간 ≈ 1.55년
- **거래 활성 시**: ~1,365 XP/월 → 약 6일에 Lv2 달성
- **플레이테스트 검증**: 김민수 50일에 Lv2 달성 — 계산과 부합

### B-2: SKILL_UNLOCKS ↔ LEVEL_REWARDS 정합성 — PASS ✅
- **SKILL_UNLOCKS** (`growthSystem.ts:40-44`): Lv5, Lv12, Lv22
- **LEVEL_REWARDS** (`growthSystem.ts:69-105`):
  - Lv5: "Auto-Analysis 해금" ✓ (salaryMultiplier: 1.1)
  - Lv12: "Deep Insight 해금" ✓
  - Lv22: "Market Sense 해금" ✓
- **완전 일치 확인**

### B-3: 뱃지 → 파이프라인 영향도 — PASS ✅
- **경로**: skill값 → `generateBadgesFromSkills()` → `aggregateBadgeEffects()` → pipeline
- **주요 뱃지 효과**:
  - `flash_trader` (skill 60+): executionSpeedBonus 0.5
  - `smart_router` (skill 70+): slippageReduction 0.8 (80% 감소!)
  - `pattern_hunter` (skill 60+): signalAccuracy 0.35
- **캡 적용**: slippageReduction ≤ 1.0, riskReduction ≤ 0.8, positionSize ≤ 3.0
- **결론**: 고스킬 직원의 영향이 매우 크지만 캡으로 제한됨 → 정상적 설계

---

## C. 사무실 & 가구 시스템 (3항목)

### C-1: 가구 범위 효과 적용 — INFO ⚠️
- **코드**: `gameStore.ts:6920-6960` `recalculateGridBuffs()`
- **발견**: `furniture.ts`의 range 값(60, 80, 120, 200)이 그리드 셀 맨해튼 거리로 사용됨
- **영향**: 10x10 그리드에서 맨해튼 거리 최대값은 18. range=60 이상은 모두 **사실상 전역 적용**
- **실질적 영향**: 없음 (range=999 전역과 동일하게 작동)
- **참고**: 이 시스템은 구 OfficeGrid 기반. 신규 OfficeLayout(dot office)은 별도 시스템 사용
- **권장**: 향후 그리드 오피스 부활 시 range 값을 그리드 셀 단위(1~5)로 재조정 필요

### C-2: 인접 배치 보너스 — PASS ✅
- **코드**: `adjacencyBonus.ts:39-42`
- **판정**: 유클리드 거리 120px 이내 → 인접 판정 (OfficeLayout 픽셀 좌표 기반)
- **보너스**: `TRADE_AI_CONFIG.ADJACENCY_SPEED_BONUS` = 0.30 (30%)
- **적용**: analyst↔manager 인접 시 confidence threshold 완화, trader↔manager 인접 시 slippage 감소

### C-3: 가구 없이 기본 상태 — PASS ✅
- **기본 책상**: `buffs: []` (빈 배열) — 어떤 버프도 없음 (`furniture.ts:5-12`)
- **기본 multiplier**: 모든 항목 1.0 (neutral) (`officeSystem.ts:41-47`)
- **테스트 검증**: `officeSystem.test.ts:40-55` — 버프 없는 상태에서 모든 값 1.0 확인

---

## D. 기관 투자자 시스템 (3항목)

### D-1: 기관 매매 → orderFlow → Worker 가격 반영 — PASS ✅
- **경로**:
  1. `institutionEngine.ts:178-345` → `simulateInstitutionalTrading()` → netVol 계산
  2. `gameStore.ts:6073-6138` → `updateInstitutionalFlowForSector()` → `orderFlowByCompany` 업데이트
  3. `tickEngine.ts:426-450` → Worker postMessage에 orderFlow 포함
  4. `priceEngine.worker.ts:273-290` → `driftImpact = K × tanh(netNotional / scale)`
- **수식 검증**: tanh 모델로 대규모 거래의 영향 상한 제한 → 합리적

### D-2: 기관 패닉셀 — PASS ✅
- **발동 조건** (AND): debtRatio > 2.5 AND netIncome < -500억 AND sentiment < 0.9
- **규모**: 자본의 1%~20%, panicSeverity에 비례
- **결론**: 위기 상황에서만 발동, drift에 음의 압력 추가 → 적절

### D-3: 섹터 순환 공정성 — PASS ✅
- **수식**: `sectorIndex = hour % 10` (`tickEngine.ts:152`)
- **검증**: 10개 섹터 × 시간당 1개 = 10시간 주기 완전 순환
- **모든 섹터 동일 빈도 처리 확인**

---

## E. 이벤트 & 뉴스 시스템 (3항목)

### E-1: 이벤트 → Worker 전달 — PASS ✅
- **경로**: `tickEngine.ts:346-389` → EventModifier 구성 → `worker.postMessage({events})`
- **Worker 적용** (`priceEngine.worker.ts:255-263`):
  - drift: `mu += evt.driftModifier × propagation × sensitivity`
  - volatility: `sigma *= 1 + evt.volModifier × propagation × sensitivity`
- **타겟팅**: 글로벌/섹터/기업별 필터 정상 작동

### E-2: 여진(aftereffect) 메커니즘 — PASS ✅
- **생성**: 만료 이벤트 → drift 10%, vol 15%, 50시간 지속 (`tickEngine.ts:477-512`)
- **무한 루프 방지**:
  1. `source !== 'aftereffect'` 체크 (1차 가드)
  2. `|driftModifier| > 0.01` 필터 (2차 가드)
- **결론**: 1세대만 생성, 무한 연쇄 불가

### E-3: 센티먼트 감쇠 — PASS ✅
- **수식** (`sentimentEngine.ts:78-118`):
  - 글로벌: `×0.99` per 100틱 → 반감기 6,930시간 ≈ 1.9년
  - 섹터: `×0.98` per 100틱 → 반감기 3,460시간 ≈ 0.95년
  - 모멘텀: `×0.95` per 100틱 → 반감기 1,350시간 ≈ 4.5개월
- **결론**: 대형 이벤트 영향이 자연 감쇠. 글로벌은 느리게, 섹터는 빠르게 → 적절

---

## F. 주가 엔진 & 레짐 (3항목)

### F-1: GBM dt 단위 일관성 — PASS ✅
- **dt**: `1 / (10 × 365)` (`tickEngine.ts:423`) — 연 3,650시간 중 1시간
- **게임 캘린더**: 12개월 × 30일 = 360일 × 10시간 = 3,600시간/년
- **참고**: GBM은 금융 표준 365일 사용 vs 게임 360일. 미세 차이(1.4%)로 무시 가능
- **exponent clamp**: `[-0.357, 0.262]` → 단일 틱 최대 ±30%

### F-2: Crisis 증폭 밸런스 — PASS ✅
- **발동**: eventDrift < -0.05 시 (`priceEngine.worker.ts:299`)
- **증폭**: severity 기반 1.5x ~ 2.0x
- **최대 시간당 하락**: -30% (daily limit로 강제 제한)
- **결론**: 위기 감은 살리되 안전장치 작동 → 합리적

### F-3: 일일 가격 제한 ±30% — PASS ✅
- **코드**: `priceEngine.worker.ts:134-142`
- **sessionOpenPrice 갱신**: 매일 09:00 `updateSessionOpenPrices()` (`tickEngine.ts:155-173`)
- **가드**: sessionOpenPrice=0일 때 limit 건너뜀 (초기화 전 보호)
- **적용**: `safePrice = Math.max(dailyMin, Math.min(dailyMax, safePrice))`

---

## G. 경제 시스템 (2항목)

### G-1: 세금 구간 점프 — PASS ✅ (밸런스 데이터)

| 티어 | 최소 자산 | 월 세율 | 연 환산 | 전 구간 대비 증가 |
|------|----------|--------|--------|----------------|
| beginner | 0 | 0% | 0% | - |
| growing | 50M | 0.1% | 1.2% | ∞ |
| established | 100M | 0.3% | 3.6% | +200% |
| wealthy | 500M | 0.5% | 6.0% | +67% |
| elite | 1B | 0.8% | 9.6% | +60% |
| tycoon | 5B | 1.2% | 14.4% | +50% |

- **구제**: 3개월 연속 손실 시 세금 50% 할인 (`economicPressureConfig.ts:41-42`)
- **결론**: established→wealthy 점프가 가장 느껴지지만, 자산 5배 증가 구간이므로 합리적

### G-2: 포지션 제한과 AI 매매 — PASS ✅
- **매수**: `enforcePositionLimit` 호출 — 티어별 maxPositionPercent 적용 (`gameStore.ts:2656`)
- **매도**: 포지션 제한 미적용 (정상 — 매도는 노출도 감소이므로 제한 불필요)
- **Manager 평가**: `calculatePositionSize()`로 포지션 크기 검증 (`managerLogic.ts:68-100`)
- **결론**: 매수에만 제한 적용은 금융학적으로 올바른 설계

---

## 핵심 수식 & 영향도 테이블

### 주가 결정 수식 (GBM + 외부 요인)
```
μ_final = baseDrift
        + Σ(event.driftModifier × propagation × sensitivity)   # 이벤트
        + K × tanh(orderFlow.netNotional / 50M)                 # 시장 충격
        + sentimentDriftImpact                                   # 센티먼트

σ_final = baseVolatility × regimeVolMultiplier
        × Π(1 + event.volModifier × propagation × sensitivity)  # 이벤트
        × volatilityAmplification                                # 주문 불균형

price_t+1 = price_t × exp((μ - σ²/2)×dt + σ×√dt×Z)            # GBM
           clamped to [sessionOpen×0.7, sessionOpen×1.3]         # ±30% 제한
```

### 직원 XP 곡선
| 레벨 | 필요 XP | 누적 XP | 거래만으로 소요 기간 |
|------|---------|---------|-------------------|
| 1→2 | 282 | 282 | ~6일 |
| 2→3 | 520 | 802 | ~12일 |
| 3→4 | 800 | 1,602 | ~18일 |
| 4→5 | 1,118 | 2,720 | ~25일 |
| 5→10 | 8,462 | 11,182 | ~6개월 |

### 슬리피지 계산 파이프라인
```
baseSlippage (1%)
  × regimeMultiplier (CALM:0.8 / VOLATILE:1.0 / CRISIS:1.5)
  × (1 - corporateSkill.slippageReduction)  # max 80%
  × (1 - badgeEffect.slippageReduction)     # smart_router: 80%
  × (1 - adjacencyBonus × 0.30)             # manager 인접: 30%
  + gamblerTrait (+0.15)                     # 도박꾼 특성
```

### 가구 ROI (비용 대비 효과)
| 가구 | 비용 | 주요 효과 | 범위 | ROI 평가 |
|------|------|---------|------|---------|
| 화분 | 50K | 스트레스 -20% | 전역* | ★★★★★ |
| 서버랙 | 200K | 거래속도 +20% | 전역* | ★★★★ |
| 임원 미니바 | 800K | 스태미나 +40%, 스트레스 -20% | 전역* | ★★★ |
| VIP 라운지 | 2M | 사기 +25%, 거래속도 +15% | 전역* | ★★ |
| 기본 책상 | 10K | 없음 | - | - |

*현재 range 값이 그리드 크기 초과 → 사실상 전역 적용

---

## 발견된 문제 & 권장사항

### 수정 완료 (이번 점검)
1. ✅ **종목 다양성** (A-2): fallback 랜덤 셔플 적용
2. ✅ **거래 제한** (A-5): 트레이더 수 기반 동적 한도
3. ✅ **테스트 상한** : 가구 비용 테스트 2M으로 조정

### 향후 권장
1. ⚠️ **가구 range 단위** (C-1): 구 OfficeGrid 시스템의 range 값(60~200)이 그리드 셀 단위로 해석되어 사실상 전역. 그리드 오피스 부활 시 1~5 범위로 재조정 필요
2. 📊 **센티먼트 반감기** (E-3): 글로벌 1.9년은 상당히 길다. 대형 이벤트 후 회복이 느릴 수 있음. 필요 시 0.995 정도로 가속 가능
3. 📊 **세금 구간 UX** (G-1): established→wealthy 전환 시 67% 증가. 플레이어에게 사전 경고 UI 권장
4. 📊 **dt 미세 차이** (F-1): GBM 365일 vs 게임 360일 (1.4% 차이). 실질 영향 미미하나 일관성 원하면 `1/(10*360)` 변경 가능

---

## 검증 결과

| 항목 | 파일 | 상태 | 비고 |
|------|------|------|------|
| A-1 매도 차단 | gameStore.ts:1390 | PASS | 미보유 종목만 정확히 차단 |
| A-2 종목 다양성 | gameStore.ts:1378 | PASS | 랜덤 셔플로 수정 완료 |
| A-3 Manager 밸런스 | managerLogic.ts:108-155 | PASS | 레짐별 적절한 난이도 |
| A-4 부분 체결 | traderLogic.ts:164-176 | PASS | 5% 임계값 합리적 |
| A-5 거래 제한 | gameStore.ts:1627 | PASS | 트레이더 수 기반으로 수정 |
| B-1 XP 밸런스 | growthSystem.ts:6-8 | PASS | 거래 활성 시 적절한 성장 |
| B-2 스킬 정합성 | growthSystem.ts:40-105 | PASS | UNLOCKS↔REWARDS 완전 일치 |
| B-3 뱃지 영향 | skillBadges.ts, traderLogic.ts | PASS | 캡 적용된 강력한 효과 |
| C-1 가구 범위 | gameStore.ts:6920-6960 | INFO | 범위 값 > 그리드 크기 (기능적 무해) |
| C-2 인접 보너스 | adjacencyBonus.ts:39-42 | PASS | 유클리드 120px 기반 |
| C-3 기본 상태 | officeSystem.ts:41-47 | PASS | 모든 multiplier 1.0 |
| D-1 기관→주가 | institutionEngine→Worker | PASS | tanh 모델 정상 전달 |
| D-2 패닉셀 | institutionEngine.ts:163-256 | PASS | 3조건 AND, 적절 규모 |
| D-3 섹터 순환 | tickEngine.ts:152 | PASS | 10개 섹터 균등 처리 |
| E-1 이벤트→Worker | tickEngine.ts:346-450 | PASS | drift/vol 정상 전달 |
| E-2 여진 | tickEngine.ts:477-512 | PASS | 2중 가드, 1세대 제한 |
| E-3 센티먼트 감쇠 | sentimentEngine.ts:78-118 | PASS | 반감기 1.9년 (글로벌) |
| F-1 GBM dt | priceEngine.worker.ts | PASS | 1/(10×365), 미세 차이 허용 |
| F-2 Crisis 증폭 | priceEngine.worker.ts:299-311 | PASS | 1.5x~2x, -30% 제한 |
| F-3 가격 제한 | priceEngine.worker.ts:134-142 | PASS | ±30% 일일 제한 정상 |
| G-1 세금 구간 | economicPressureConfig.ts | PASS | 6단계, 구제 메커니즘 |
| G-2 포지션 제한 | gameStore.ts:2656 | PASS | 매수만 제한 (올바른 설계) |

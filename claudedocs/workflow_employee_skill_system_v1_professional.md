# 직원 스킬 시스템 구현 워크플로우 (캐주얼 뱃지 버전)

**생성일**: 2026-02-16 (수정: 2026-02-16)
**목적**: 숫자 중심 스킬 → 이모지 뱃지 시스템으로 전환 (게이머 친화적)
**복잡도**: 중간 (새 엔진 3개, UI 중심 개선, 기존 수치 시스템 보존)
**예상 소요**: 3-4일
**핵심 개선**: "analysis 67점" → "★★★★☆ 📊 차트 읽기" (즉시 이해 가능)

---

## 📋 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [Phase 1: 타입 시스템 확장](#phase-1-타입-시스템-확장)
3. [Phase 2: 데이터 레이어 구축](#phase-2-데이터-레이어-구축)
4. [Phase 3: 엔진 레이어 구현](#phase-3-엔진-레이어-구현)
5. [Phase 4: 시스템 통합](#phase-4-시스템-통합)
6. [Phase 5: UI 컴포넌트](#phase-5-ui-컴포넌트)
7. [Phase 6: 검증 및 밸런싱](#phase-6-검증-및-밸런싱)
8. [의존성 그래프](#의존성-그래프)
9. [검증 체크리스트](#검증-체크리스트)

---

## 아키텍처 개요

### 현재 시스템 상태 (기존)

```typescript
// src/types/index.ts - 기존 구조
interface EmployeeSkills {
  analysis: number   // 0-100
  trading: number    // 0-100
  research: number   // 0-100
}

interface Employee {
  // ... 기본 필드
  skills?: EmployeeSkills
  level?: number
  xp?: number
  traits?: EmployeeTrait[]
  // Trade AI Pipeline 연동
  assignedSectors?: AssignedSector[]
}
```

**기존 Trade AI Pipeline** (이미 구현됨):
- `analystLogic.ts`: 섹터 스캔 → proposal 생성
- `managerLogic.ts`: 리스크 평가 → approve/reject
- `traderLogic.ts`: 주문 실행 → slippage 계산
- `adjacencyBonus.ts`: 인접 보너스 계산

### 목표 시스템 (캐주얼 뱃지)

```typescript
// 기존 수치 시스템 유지 (내부 로직용)
interface EmployeeSkills {
  analysis: number   // 0-100 (그대로 유지)
  trading: number
  research: number
}

// 신규: 뱃지 UI 레이어
interface SkillBadge {
  id: string
  name: string           // "차트 읽기", "빠른 손"
  emoji: string          // 📊, ⚡
  level: 1 | 2 | 3 | 4 | 5   // ★ 등급
  category: 'analysis' | 'trading' | 'research'
  description: string    // "주가 그래프를 보고 패턴을 찾아요"
  playerMessage: string  // "매수 신호 정확도 +20%"
}

interface Employee {
  skills: EmployeeSkills  // 기존 유지
  badges?: SkillBadge[]   // 신규: UI 표시용
}
```

**신규 엔진 3개** (매매 로직 연동):
1. `signalGenerationEngine.ts` - 뱃지 레벨 기반 신호 품질
2. `tradeExecutionEngine.ts` - 뱃지 레벨 기반 실행 속도/슬리피지
3. `riskManagementEngine.ts` - 뱃지 레벨 기반 포지션 사이징

**교육 시스템**: 간소화 (선택적 구현)

---

## Phase 1: 타입 시스템 확장

**목표**: 뱃지 시스템의 타입 정의 (기존 EmployeeSkills는 그대로 유지)

### Task 1.1: 뱃지 타입 정의 ✅

**파일**: `src/types/skills.ts` (신규)

**작업 내용**:
```typescript
// 1. SkillBadge 타입 (UI 표시용)
export interface SkillBadge {
  id: string
  name: string           // "차트 읽기"
  emoji: string          // "📊"
  level: 1 | 2 | 3 | 4 | 5   // ★ 등급 (별 개수)
  category: 'analysis' | 'trading' | 'research'
  description: string    // "주가 그래프를 보고 패턴을 찾아요"
  playerMessage: string  // "매수 신호 정확도 +20%"

  // 내부 로직용 (플레이어는 안 봄)
  _technical?: {
    signalAccuracy?: number      // 0-1 (신호 품질)
    executionSpeedBonus?: number // 0-1 (실행 속도 향상)
    slippageReduction?: number   // 0-1 (슬리피지 감소)
    riskReduction?: number       // 0-1 (리스크 감소)
    positionSizeMultiplier?: number  // 포지션 크기 배율
  }
}

// 2. 기존 Employee 타입에 badges 추가 (src/types/index.ts 수정)
export interface Employee {
  // ... 기존 필드들
  skills?: EmployeeSkills  // 기존 유지 (내부 로직용)
  badges?: SkillBadge[]    // 신규 추가 (UI 표시용)
}

// 3. 뱃지 레벨 변환 함수 타입
export type SkillToBadgeLevelFn = (skillValue: number) => 1 | 2 | 3 | 4 | 5
```

**검증 포인트**:
- [ ] TypeScript 컴파일 에러 없음
- [ ] 기존 Employee 타입과 하위 호환성 유지 (badges는 선택적)
- [ ] SkillBadge._technical이 엔진에서 처리 가능한 타입만 포함
- [ ] level은 1-5만 허용 (타입 안전성)

**의존성**: 없음 (최우선 작업)

---

### Task 1.2: 회사 스킬 타입 간소화 ✅

**파일**: `src/types/skills.ts` (확장)

**작업 내용**:
```typescript
// 회사 스킬 (선택적 구현, 우선순위 낮음)
export interface CorporateSkill {
  id: string
  name: string
  description: string
  category: 'policy' | 'tool'
  unlocked: boolean
  unlockCost: number

  // 간소화: 복잡한 효과 대신 플레이어 메시지만
  playerMessage: string  // "모든 거래에 손절매 -3% 자동 적용"

  // 내부 로직용
  _effect?: {
    type: 'stopLoss' | 'takeProfit' | 'maxPosition'
    value: number
  }
}
```

**검증 포인트**:
- [ ] 전문 용어 제거됨 (globalEffects, SkillTreeNode 등)
- [ ] 플레이어 친화적 설명만 포함
- [ ] 구현 우선순위 낮음 (Phase 4 이후로 미룰 수 있음)

**의존성**: Task 1.1 완료

---

### Task 1.2: 회사 스킬 타입 정의 ✅

**파일**: `src/types/skills.ts` (확장)

**작업 내용**:
```typescript
// 1. CorporateSkill 타입
export interface CorporateSkill {
  id: string
  name: string
  description: string
  category: 'policy' | 'tool' | 'infrastructure' | 'strategy'

  // 해금 조건
  unlocked: boolean
  unlockCost: {
    cash: number
    researchPoints?: number  // 향후 확장 가능
  }
  prerequisiteSkills?: string[]  // 선행 스킬 ID

  // 효과 (전사 적용)
  globalEffects: CorporateSkillEffect[]

  // 교육 가능 여부
  canTeach: boolean
  trainingDuration: number  // 틱 단위
  trainingCost: number
}

// 2. CorporateSkillEffect 타입
export interface CorporateSkillEffect {
  type: 'stopLossPolicy' | 'takeProfitPolicy' | 'maxPositionSize' | 'toolUnlock'
  parameters: Record<string, number | boolean | string>
  // 예: { threshold: -0.03 } (손절매 -3%)
}

// 3. 스킬 트리 노드 (UI용)
export interface SkillTreeNode {
  skillId: string
  position: { x: number; y: number }
  tier: number  // 1-5
  children: string[]  // 자식 노드 ID
}
```

**검증 포인트**:
- [ ] 정책형 스킬(policy)과 도구형 스킬(tool)이 명확히 구분됨
- [ ] globalEffects가 실제 엔진에서 적용 가능한 형태
- [ ] 스킬 트리 순환 의존성 없음

**의존성**: Task 1.1 완료

---

### Task 1.3: GameStore 스테이트 확장 🔄

**파일**: `src/stores/gameStore.ts` (수정)

**작업 내용**:
```typescript
// GameStore 인터페이스에 추가
interface GameStore {
  // ... 기존 필드들

  // 신규: 뱃지 생성 액션
  generateEmployeeBadges: (employeeId: string) => void

  // 선택적: 회사 스킬 (우선순위 낮음, Phase 4 이후)
  corporateSkills?: CorporateSkill[]
  unlockCorporateSkill?: (skillId: string) => void
}
```

**검증 포인트**:
- [ ] 기존 상태 관리 패턴과 일관성 유지
- [ ] Zustand immer 패턴 준수
- [ ] generateEmployeeBadges가 skills 수치 → badges 배열로 변환

**의존성**: Task 1.1, 1.2 완료

**참고**: 교육 시스템은 캐주얼 버전에서 제거됨 (복잡도 감소)

---

## Phase 2: 데이터 레이어 구축

**목표**: 30개 캐주얼 뱃지 정의 + 스킬 변환 함수

### Task 2.1: 뱃지 카탈로그 작성 📝

**파일**: `src/data/skillBadges.ts` (신규)

**작업 내용**:
1. **Trading 범주 10개 스킬 정의**
   - Flash Trader, Smart Order Router, Market Maker, Scalper 등
   - 각 스킬마다 PassiveAbility 객체 생성
   - tier, effects, unlockCondition 설정

2. **Analysis 범주 10개 스킬 정의**
   - Chart Pattern Master, Fibonacci Wizard, RSI Specialist 등

3. **Research 범주 10개 스킬 정의**
   - Earnings Whisperer, News Sentiment Reader, Macro Economist 등

4. **Risk 범주 10개 스킬 정의**
   - Kelly Criterion, Trailing Stop Master, Hedger 등

5. **Psychology 범주 10개 스킬 정의**
   - Contrarian, Diamond Hands, YOLO Trader 등

**데이터 예시**:
```typescript
export const EMPLOYEE_SKILLS: Record<string, PassiveAbility> = {
  flash_trader: {
    id: 'flash_trader',
    name: 'Flash Trader',
    description: '주문 실행 속도 +50%',
    tier: 2,
    category: 'trading',
    effects: [
      {
        type: 'executionSpeed',
        modifier: 0.5,  // 50% 감소
      }
    ],
    unlockCondition: {
      type: 'level',
      value: 10
    }
  },

  chart_pattern_master: {
    id: 'chart_pattern_master',
    name: 'Chart Pattern Master',
    description: '헤드앤숄더, 삼각수렴 자동 탐지 (+30% 신뢰도)',
    tier: 3,
    category: 'analysis',
    effects: [
      {
        type: 'signalAccuracy',
        modifier: 0.3,
        condition: {
          marketCondition: 'trending'
        }
      }
    ],
    unlockCondition: {
      type: 'training',
      value: 1  // training program ID
    }
  },

  // ... 48개 더 정의
}
```

**검증 포인트**:
- [ ] 50개 스킬 모두 정의 완료
- [ ] 각 범주별로 10개씩 균등 분배
- [ ] tier 1-5가 난이도/효과에 비례
- [ ] 밸런스 초안 작성 (엑셀/스프레드시트)

**의존성**: Task 1.1 완료

---

### Task 2.2: 회사 스킬 카탈로그 작성 📝

**파일**: `src/data/corporateSkills.ts` (신규)

**작업 내용**:
1. **정책형 스킬 5개 정의**
   - 손절매 정책 (-3% 자동 손절)
   - 익절 정책 (+10% 자동 익절)
   - 포지션 제한 (최대 30% per 종목)
   - 레버리지 정책
   - 다각화 정책

2. **도구형 스킬 5개 정의**
   - 알고리즘 매매 봇
   - 리스크 분석 대시보드
   - 실시간 뉴스 피드
   - 기술적 지표 라이브러리
   - 백테스팅 엔진

3. **인프라형 스킬 5개 정의**
   - 고속 거래 서버
   - 데이터 저장소 확장
   - 보안 인증 시스템
   - 클라우드 컴퓨팅
   - API 통합 플랫폼

**데이터 예시**:
```typescript
export const CORPORATE_SKILLS: Record<string, CorporateSkill> = {
  stop_loss_policy: {
    id: 'stop_loss_policy',
    name: '손절매 정책 (-3% 자동 손절)',
    description: '모든 포지션에 -3% 손절가 자동 설정',
    category: 'policy',
    unlocked: false,
    unlockCost: {
      cash: 10_000_000,  // 1천만원
    },
    prerequisiteSkills: [],
    globalEffects: [
      {
        type: 'stopLossPolicy',
        parameters: {
          threshold: -0.03,
          mandatory: true
        }
      }
    ],
    canTeach: true,
    trainingDuration: 50_400,  // 2주
    trainingCost: 300_000
  },

  // ... 14개 더 정의
}
```

**검증 포인트**:
- [ ] 15개 스킬 정의 완료
- [ ] unlockCost가 게임 경제 밸런스에 맞음
- [ ] prerequisiteSkills 순환 참조 없음
- [ ] 스킬 트리 구조 시각화 (다이어그램)

**의존성**: Task 1.2 완료

---

### Task 2.3: 교육 이벤트 데이터 작성 📝

**파일**: `src/data/trainingEvents.ts` (신규)

**작업 내용**:
1. **퀴즈 이벤트 10개 작성**
   - 손절매 룰 퀴즈
   - 기술적 분석 퀴즈
   - 리스크 관리 퀴즈
   - 등등

2. **시뮬레이션 이벤트 10개 작성**
   - 폭락 시나리오
   - 급등 시나리오
   - 횡보장 시나리오
   - 등등

3. **토론 이벤트 5개 작성**
   - 기술적 vs 기본적 분석
   - 단타 vs 장기투자
   - 등등

**데이터 예시**:
```typescript
export const TRAINING_QUIZZES: TrainingCheckpoint[] = [
  {
    id: 'quiz_stop_loss_basic',
    atProgress: 25,
    type: 'quiz',
    question: '손절매 -3% 룰을 적용할 때, 100만원 투자 시 손실 한도는?',
    options: ['2만원', '3만원', '5만원'],
    correctAnswer: 1,  // 3만원
    reward: {
      xpBonus: 500,
      skillBonus: 2  // research +2
    },
    penalty: {
      stressIncrease: 5,
      progressLoss: 10
    }
  },
  // ... 더 정의
]

export const TRAINING_SIMULATIONS: TrainingCheckpoint[] = [
  {
    id: 'sim_flash_crash',
    atProgress: 50,
    type: 'simulation',
    scenario: '갑자기 -5% 폭락 상황. 현재 손실 -4%. 손절할 것인가?',
    choices: [
      {
        label: '즉시 손절',
        result: {
          correct: true,
          reason: '회사 정책(-3%) 준수, 추가 손실 방지',
          xpGain: 1000
        }
      },
      {
        label: '홀딩 지속',
        result: {
          correct: false,
          reason: '-3% 룰 위반, 추가 손실 -8% 발생',
          xpGain: 0
        }
      }
    ],
    reward: {
      xpBonus: 1000,
      skillBonus: 5  // trading +5
    },
    penalty: {
      stressIncrease: 10,
      progressLoss: 15
    }
  },
  // ... 더 정의
]
```

**검증 포인트**:
- [ ] 퀴즈 정답이 명확함
- [ ] 시뮬레이션 선택지가 균형있음
- [ ] 보상/패널티 밸런스 적절
- [ ] 교육 단계별(25%, 50%, 75%) 난이도 상승

**의존성**: Task 1.3 완료

---

## Phase 3: 엔진 레이어 구현

**목표**: 직원 스킬이 실제 매매 로직에 직접 영향을 주는 5개 엔진 구현

### Task 3.1: 신호 생성 엔진 구현 🔧

**파일**: `src/engines/signalGenerationEngine.ts` (신규)

**작업 내용**:
1. **기본 신호 생성 함수**
   ```typescript
   export function generateTradeSignals(
     employee: Employee,
     companies: Company[],
     marketEvents: MarketEvent[]
   ): TradeSignal[] {
     const signals: TradeSignal[] = []

     // 1. 기본 분석 정확도 계산 (analysis 스탯)
     const baseAccuracy = (employee.skills?.analysis ?? 50) / 100

     // 2. 패시브 스킬 적용
     const accuracyBonus = calculatePassiveBonus(employee, 'signalAccuracy')
     const finalAccuracy = baseAccuracy * (1 + accuracyBonus)

     // 3. 회사별 신호 생성
     for (const company of companies) {
       // 잡음 필터링
       const signalToNoise = finalAccuracy * 2
       const isRealSignal = Math.random() < signalToNoise / 2

       if (!isRealSignal) {
         // 잘못된 신호 생성 (낮은 스킬 = 손해 가능성)
         signals.push(generateNoiseSignal(company))
         continue
       }

       // 실제 분석
       let confidence = finalAccuracy * 100

       // 특화 스킬 적용
       if (hasSpecialization(employee, 'chart_pattern_master')) {
         if (detectPattern(company, 'technical')) {
           confidence += 30
         }
       }

       // 패시브: Contrarian - 극단 센티먼트 역발상
       if (hasPassive(employee, 'contrarian')) {
         const sentiment = calculateMarketSentiment(marketEvents)
         if (sentiment.fearGreedIndex > 80 || sentiment.fearGreedIndex < 20) {
           signals.push(generateContrarianSignal(company, sentiment))
         }
       }

       signals.push({
         companyId: company.id,
         action: calculateAction(company),
         confidence: Math.min(100, confidence),
         isNoise: false
       })
     }

     return signals
   }
   ```

2. **헬퍼 함수 구현**
   - `calculatePassiveBonus()`: 패시브 효과 집계
   - `hasSpecialization()`: 특화 스킬 보유 확인
   - `hasPassive()`: 패시브 보유 확인
   - `detectPattern()`: 차트 패턴 감지
   - `generateNoiseSignal()`: 잡음 신호 생성
   - `generateContrarianSignal()`: 역발상 신호 생성

**검증 포인트**:
- [ ] analysis 스탯 0 → 잡음 50%, 100 → 잡음 0%
- [ ] 패시브 스킬 효과가 실제 적용됨
- [ ] 극단 센티먼트 시 Contrarian 스킬 작동
- [ ] 신호 신뢰도가 0-100 범위 내

**의존성**: Task 1.1, 2.1 완료

---

### Task 3.2: 매매 실행 엔진 구현 🔧

**파일**: `src/engines/tradeExecutionEngine.ts` (신규)

**작업 내용**:
1. **실행 속도 및 슬리피지 계산**
   ```typescript
   export function executeEmployeeTrade(
     employee: Employee,
     order: TradeOrder,
     marketCondition: MarketState
   ): TradeResult {
     // 1. 기본 실행 속도 (trading 스탯)
     const baseSpeed = (employee.skills?.trading ?? 50) / 100
     let executionDelay = (1 - baseSpeed) * 50  // 0-50틱

     // 2. 패시브: Flash Trader - 지연 50% 감소
     if (hasPassive(employee, 'flash_trader')) {
       executionDelay *= 0.5
     }

     // 3. 슬리피지 계산
     let slippage = (1 - baseSpeed) * 0.02  // 최대 2%

     // 4. 패시브: Smart Order Router - 슬리피지 무효화
     if (hasPassive(employee, 'smart_router')) {
       slippage = 0
     }

     // 5. 시장 충격 (대량 주문)
     const marketImpact = calculateMarketImpact(order.quantity, marketCondition.volume)
     slippage += marketImpact

     // 6. 최종 가격 계산
     const actualPrice = order.targetPrice * (1 + slippage)

     return {
       executedPrice: actualPrice,
       delay: executionDelay,
       commission: calculateCommission(employee, order),
       slippage
     }
   }
   ```

2. **수수료 계산 함수**
   ```typescript
   function calculateCommission(employee: Employee, order: TradeOrder): number {
     let baseCommission = order.targetPrice * order.quantity * 0.003  // 0.3%

     // Scalper 패시브: 단타 시 수수료 -50%
     if (hasPassive(employee, 'scalper') && order.duration < 60) {
       baseCommission *= 0.5
     }

     return baseCommission
   }
   ```

**검증 포인트**:
- [ ] trading 스탯 0 → 지연 50틱, 100 → 지연 0틱
- [ ] Flash Trader 패시브 → 지연 절반
- [ ] Smart Order Router → 슬리피지 0%
- [ ] 대량 주문 시 시장 충격 반영

**의존성**: Task 3.1 완료

---

### Task 3.3: 리스크 관리 엔진 구현 🔧

**파일**: `src/engines/riskManagementEngine.ts` (신규)

**작업 내용**:
1. **포지션 사이징 함수**
   ```typescript
   export function calculatePositionSize(
     employee: Employee,
     signal: TradeSignal,
     portfolio: Portfolio
   ): number {
     // 1. 기본 리스크 한도 (research 스탯)
     const riskAwareness = (employee.skills?.research ?? 50) / 100
     let maxRiskPerTrade = 0.05 * (1 - riskAwareness * 0.5)  // 2.5%-5%

     let positionSize = portfolio.totalValue * maxRiskPerTrade

     // 2. 회사 정책 적용 (maxPositionSize)
     const corporateLimit = getCorporatePolicy('maxPositionSize')
     if (corporateLimit) {
       positionSize = Math.min(positionSize, portfolio.totalValue * corporateLimit)
     }

     // 3. Kelly Criterion 특화 스킬
     if (hasSpecialization(employee, 'kelly_criterion')) {
       const winRate = signal.confidence / 100
       const kellyFraction = (winRate * 2) - 1
       positionSize *= Math.max(0.1, kellyFraction)
     }

     // 4. Risk Averse 패시브: 연속 손실 시 축소
     if (hasPassive(employee, 'risk_averse')) {
       const recentLosses = countRecentLosses(employee, 10)
       if (recentLosses > 3) {
         positionSize *= 0.5
       }
     }

     // 5. YOLO Trader 패시브: 고신뢰도 올인
     if (hasPassive(employee, 'yolo_trader') && signal.confidence > 90) {
       positionSize *= 3
     }

     return Math.floor(positionSize)
   }
   ```

2. **헬퍼 함수**
   - `getCorporatePolicy()`: 회사 정책 조회
   - `countRecentLosses()`: 최근 N거래 손실 횟수

**검증 포인트**:
- [ ] research 스탯 0 → 5% 리스크, 100 → 2.5% 리스크
- [ ] 회사 정책이 개인 판단보다 우선
- [ ] Kelly Criterion이 신뢰도에 비례하여 조정
- [ ] YOLO Trader가 실제로 3배 베팅

**의존성**: Task 3.2 완료

---

### Task 3.4: 손절/익절 엔진 구현 🔧

**파일**: `src/engines/stopLossEngine.ts` (신규)

**작업 내용**:
1. **손절가 체크 함수**
   ```typescript
   export function checkStopLoss(
     employee: Employee,
     position: Position,
     currentPrice: number,
     corporateSkills: CorporateSkill[]
   ): StopLossDecision {
     // 1. 회사 정책 우선
     const stopLossPolicy = corporateSkills.find(s => s.id === 'stop_loss_policy')
     if (stopLossPolicy && stopLossPolicy.unlocked) {
       const threshold = stopLossPolicy.globalEffects[0].parameters.threshold as number
       const loss = (currentPrice - position.entryPrice) / position.entryPrice

       if (loss < threshold) {
         return {
           shouldSell: true,
           reason: '회사 정책 준수 (자동 손절)',
           price: currentPrice
         }
       }
     }

     // 2. Diamond Hands 패시브: 손절 안 함
     if (hasPassive(employee, 'diamond_hands')) {
       return {
         shouldSell: false,
         reason: 'Diamond Hands - 절대 팔지 않음',
         price: currentPrice
       }
     }

     // 3. Trailing Stop Master 패시브
     if (hasPassive(employee, 'trailing_stop')) {
       const riskTolerance = (employee.skills?.research ?? 50) / 100
       const peakPrice = position.peakPrice || position.entryPrice
       const trailingPercent = 0.05 * (1 - riskTolerance)  // 2.5%-5%

       if (currentPrice < peakPrice * (1 - trailingPercent)) {
         return {
           shouldSell: true,
           reason: 'Trailing Stop 발동',
           price: currentPrice
         }
       }
     }

     return {
       shouldSell: false,
       reason: '정상 홀딩',
       price: currentPrice
     }
   }
   ```

2. **익절가 체크 함수**
   ```typescript
   export function checkTakeProfit(
     employee: Employee,
     position: Position,
     currentPrice: number,
     corporateSkills: CorporateSkill[]
   ): TakeProfitDecision {
     // 회사 정책 우선
     const takeProfitPolicy = corporateSkills.find(s => s.id === 'take_profit_policy')
     if (takeProfitPolicy && takeProfitPolicy.unlocked) {
       const threshold = takeProfitPolicy.globalEffects[0].parameters.threshold as number
       const profit = (currentPrice - position.entryPrice) / position.entryPrice

       if (profit > threshold) {
         return {
           shouldSell: true,
           reason: '회사 정책 준수 (자동 익절)',
           price: currentPrice
         }
       }
     }

     // Paper Hands 패시브: -1% 손실에 즉시 손절
     if (hasPassive(employee, 'paper_hands')) {
       const loss = (currentPrice - position.entryPrice) / position.entryPrice
       if (loss < -0.01) {
         return {
           shouldSell: true,
           reason: 'Paper Hands - 즉시 손절',
           price: currentPrice
         }
       }
     }

     return {
       shouldSell: false,
       reason: '정상 홀딩',
       price: currentPrice
     }
   }
   ```

**검증 포인트**:
- [ ] 회사 정책이 개인 패시브보다 우선
- [ ] Diamond Hands가 손절 완전 방지
- [ ] Trailing Stop이 동적으로 조정됨
- [ ] Paper Hands가 -1%에서 즉시 매도

**의존성**: Task 3.3 완료

---

### Task 3.5: 교육 진행 엔진 구현 🔧

**파일**: `src/engines/trainingEngine.ts` (신규)

**작업 내용**:
1. **교육 진행 틱 함수**
   ```typescript
   export function processTrainingTick(state: GameStore) {
     const activePrograms = state.trainingPrograms.filter(p => p.status === 'active')

     for (const program of activePrograms) {
       // 1. 진행률 업데이트
       program.currentTick++
       program.progress = (program.currentTick / program.durationTicks) * 100

       // 2. 체크포인트 도달 확인
       const nextCheckpoint = program.checkpoints.find(
         cp => cp.atProgress <= program.progress && !program.completedCheckpoints.includes(cp.id)
       )

       if (nextCheckpoint) {
         // 체크포인트 이벤트 발동
         triggerCheckpointEvent(state, program, nextCheckpoint)
       }

       // 3. 완료 확인
       if (program.currentTick >= program.durationTicks) {
         completeTraining(state, program)
       }
     }
   }
   ```

2. **체크포인트 이벤트 처리**
   ```typescript
   function triggerCheckpointEvent(
     state: GameStore,
     program: TrainingProgram,
     checkpoint: TrainingCheckpoint
   ) {
     if (checkpoint.type === 'quiz') {
       // UI 모달 표시 요청 (Toast 이벤트 발행)
       state.addPlayerEvent({
         type: 'training_quiz',
         timestamp: state.currentTick,
         data: {
           programId: program.id,
           checkpointId: checkpoint.id,
           question: checkpoint.question!,
           options: checkpoint.options!
         }
       })
     } else if (checkpoint.type === 'simulation') {
       // 시뮬레이션 UI 표시
       state.addPlayerEvent({
         type: 'training_simulation',
         timestamp: state.currentTick,
         data: {
           programId: program.id,
           checkpointId: checkpoint.id,
           scenario: checkpoint.scenario!,
           choices: checkpoint.choices!
         }
       })
     } else if (checkpoint.type === 'discussion') {
       // 토론 이벤트 (자동 처리 or UI)
       handleDiscussion(state, program, checkpoint)
     }
   }
   ```

3. **교육 완료 처리**
   ```typescript
   function completeTraining(state: GameStore, program: TrainingProgram) {
     program.status = 'completed'

     // 수강생들에게 스킬 부여
     for (const traineeId of program.trainees) {
       const employee = state.player.employees.find(e => e.id === traineeId)
       if (!employee) continue

       // 회사 스킬 학습
       const corporateSkill = state.corporateSkills.find(s => s.id === program.targetSkill)
       if (!corporateSkill) continue

       // 특화 스킬 습득
       if (!employee.skills) employee.skills = { analysis: 50, trading: 50, research: 50 }
       if (!employee.skills.specializations) employee.skills.specializations = []

       employee.skills.specializations.push({
         id: corporateSkill.id,
         category: mapSkillToCategory(corporateSkill.category),
         masteryLevel: 10,  // 초기 숙련도
         corporateSkillRequired: corporateSkill.id,
         xpGained: 0,
         xpForNextLevel: 1000
       })

       // XP 부여
       const totalXP = program.checkpoints
         .filter(cp => program.completedCheckpoints.includes(cp.id))
         .reduce((sum, cp) => sum + cp.reward.xpBonus, 0)

       state.addXpToEmployee(employee.id, totalXP)
     }

     // 완료 토스트
     state.addPlayerEvent({
       type: 'training_completed',
       timestamp: state.currentTick,
       data: {
         programId: program.id,
         skill: program.targetSkill
       }
     })
   }
   ```

**검증 포인트**:
- [ ] 체크포인트가 정확한 progress%에서 발동
- [ ] 퀴즈 정답 체크 로직 정확
- [ ] 교육 완료 시 특화 스킬 정상 부여
- [ ] XP 집계 및 레벨업 처리

**의존성**: Task 1.3, 2.3 완료

---

## Phase 4: 시스템 통합

**목표**: 신규 엔진을 기존 Trade Pipeline 및 틱 엔진에 통합

### Task 4.1: Trade Pipeline 통합 🔗

**파일**: `src/engines/tradePipeline/analystLogic.ts` (수정)

**작업 내용**:
1. **기존 `analyzeStock()` 함수 확장**
   ```typescript
   // BEFORE (기존)
   function analyzeStock(analyst: Employee, company: Company, events: MarketEvent[]): number {
     const baseConfidence = analyst.skills?.analysis ?? 50
     // ... 기존 로직
   }

   // AFTER (신규 엔진 통합)
   import { generateTradeSignals } from '../signalGenerationEngine'

   function analyzeStock(analyst: Employee, company: Company, events: MarketEvent[]): number {
     // 신규 엔진 사용
     const signals = generateTradeSignals(analyst, [company], events)
     const signal = signals[0]

     // 기존 로직과 병합
     if (signal.isNoise) {
       return Math.random() * 40  // 낮은 신뢰도
     }

     return signal.confidence
   }
   ```

2. **`generateProposal()` 함수에서 신호 활용**
   ```typescript
   export function generateProposal(analyst: Employee, companies: Company[], events: MarketEvent[]): TradeProposal | null {
     const signals = generateTradeSignals(analyst, companies, events)
     const validSignals = signals.filter(s => !s.isNoise && s.confidence > TRADE_AI_CONFIG.CONFIDENCE_THRESHOLD)

     if (validSignals.length === 0) return null

     // 가장 신뢰도 높은 신호 선택
     const bestSignal = validSignals.sort((a, b) => b.confidence - a.confidence)[0]
     const company = companies.find(c => c.id === bestSignal.companyId)!

     return {
       id: generateId(),
       companyId: company.id,
       ticker: company.ticker,
       direction: bestSignal.action as 'buy' | 'sell',
       quantity: 100,  // 임시, Task 4.2에서 사이징 적용
       targetPrice: company.price,
       confidence: bestSignal.confidence,
       status: 'PENDING',
       createdByEmployeeId: analyst.id,
       reviewedByEmployeeId: null,
       executedByEmployeeId: null,
       createdAt: useGameStore.getState().currentTick,
       reviewedAt: null,
       executedAt: null,
       executedPrice: null,
       slippage: null,
       isMistake: false,
       rejectReason: null
     }
   }
   ```

**검증 포인트**:
- [ ] 기존 analyst 로직과 신규 엔진이 충돌 없이 동작
- [ ] 잡음 신호는 proposal로 변환 안 됨
- [ ] 신뢰도 threshold 체크 정상 작동

**의존성**: Task 3.1 완료

---

### Task 4.2: Trader 로직 통합 🔗

**파일**: `src/engines/tradePipeline/traderLogic.ts` (수정)

**작업 내용**:
1. **`executeProposal()` 함수에서 실행 엔진 사용**
   ```typescript
   // BEFORE (기존)
   export function executeProposal(trader: Employee, proposal: TradeProposal, state: GameStore): TradeResult {
     // 기존 슬리피지 계산
     const baseSlippage = TRADE_AI_CONFIG.BASE_SLIPPAGE
     // ...
   }

   // AFTER (신규 엔진 통합)
   import { executeEmployeeTrade } from '../tradeExecutionEngine'

   export function executeProposal(trader: Employee, proposal: TradeProposal, state: GameStore): TradeResult {
     const company = state.companies.find(c => c.id === proposal.companyId)!

     // 신규 실행 엔진 사용
     const executionResult = executeEmployeeTrade(
       trader,
       {
         targetPrice: proposal.targetPrice,
         quantity: proposal.quantity,
         direction: proposal.direction
       },
       {
         volume: company.priceHistory.length,  // 임시 volume
         volatility: company.volatility
       }
     )

     // 실제 거래 처리
     const totalCost = executionResult.executedPrice * proposal.quantity
     const fee = executionResult.commission

     if (proposal.direction === 'buy') {
       if (state.player.cash < totalCost + fee) {
         return {
           proposalId: proposal.id,
           pnl: 0,
           totalCost: 0,
           fee: 0
         }
       }

       state.player.cash -= totalCost + fee
       state.addToPortfolio(proposal.companyId, proposal.quantity, executionResult.executedPrice)
     } else {
       // sell 로직
       // ...
     }

     // Proposal 업데이트
     proposal.status = 'EXECUTED'
     proposal.executedPrice = executionResult.executedPrice
     proposal.slippage = executionResult.slippage
     proposal.executedAt = state.currentTick
     proposal.executedByEmployeeId = trader.id

     return {
       proposalId: proposal.id,
       pnl: 0,  // 매수 시는 0, 매도 시 계산
       totalCost,
       fee
     }
   }
   ```

**검증 포인트**:
- [ ] 슬리피지가 trader의 trading 스탯에 따라 변화
- [ ] Flash Trader 패시브 적용 확인
- [ ] 수수료가 정확히 계산됨

**의존성**: Task 3.2, 4.1 완료

---

### Task 4.3: Manager 로직 통합 🔗

**파일**: `src/engines/tradePipeline/managerLogic.ts` (수정)

**작업 내용**:
1. **`evaluateRisk()` 함수에서 리스크 엔진 사용**
   ```typescript
   // BEFORE (기존)
   export function evaluateRisk(manager: Employee, proposal: TradeProposal, state: GameStore): boolean {
     const baseRisk = calculateRisk(proposal)
     // ...
   }

   // AFTER (신규 엔진 통합)
   import { calculatePositionSize } from '../riskManagementEngine'

   export function evaluateRisk(manager: Employee, proposal: TradeProposal, state: GameStore): boolean {
     // 적정 포지션 사이즈 계산
     const recommendedSize = calculatePositionSize(
       manager,
       {
         companyId: proposal.companyId,
         action: proposal.direction,
         confidence: proposal.confidence,
         isNoise: false
       },
       {
         totalValue: state.player.totalAssetValue,
         cash: state.player.cash,
         positions: Object.values(state.player.portfolio)
       }
     )

     // 제안된 수량과 비교
     const proposedValue = proposal.quantity * proposal.targetPrice
     const recommendedValue = recommendedSize * proposal.targetPrice

     // 너무 큰 포지션이면 거부
     if (proposedValue > recommendedValue * 1.5) {
       proposal.status = 'REJECTED'
       proposal.rejectReason = '과도한 포지션 사이즈'
       return false
     }

     // 승인
     proposal.status = 'APPROVED'
     proposal.reviewedByEmployeeId = manager.id
     proposal.reviewedAt = state.currentTick

     // 포지션 크기 조정
     proposal.quantity = Math.floor(recommendedSize / proposal.targetPrice)

     return true
   }
   ```

**검증 포인트**:
- [ ] Manager의 research 스탯이 리스크 한도에 반영
- [ ] 회사 정책(maxPositionSize)이 적용됨
- [ ] Kelly Criterion 특화 스킬 작동 확인

**의존성**: Task 3.3, 4.2 완료

---

### Task 4.4: 틱 엔진 통합 🔗

**파일**: `src/engines/tickEngine.ts` (수정)

**작업 내용**:
1. **교육 프로그램 틱 처리 추가**
   ```typescript
   // tickEngine.ts의 tick() 함수 내부

   export function startTickLoop() {
     // ... 기존 코드

     const tick = () => {
       // ... 기존 틱 로직

       // ✨ 교육 프로그램 진행 (매 틱)
       current.processTrainingTick()

       // ✨ 손절/익절 자동화 (매 틱)
       current.processAutoStopLoss()

       // ... 나머지 기존 로직
     }
   }
   ```

2. **GameStore에 액션 추가**
   ```typescript
   // src/stores/gameStore.ts

   interface GameStore {
     // ... 기존 필드

     // 신규 액션
     processTrainingTick: () => void
     processAutoStopLoss: () => void
   }

   // 구현
   const useGameStore = create<GameStore>((set, get) => ({
     // ...

     processTrainingTick: () => {
       const state = get()
       processTrainingTick(state)  // trainingEngine.ts 함수 호출
     },

     processAutoStopLoss: () => {
       const state = get()
       const positions = Object.values(state.player.portfolio)

       for (const position of positions) {
         const company = state.companies.find(c => c.id === position.companyId)!

         // 각 포지션마다 손절/익절 체크
         // 담당 직원 찾기 (임시로 첫 trader 사용)
         const trader = state.player.employees.find(e => e.role === 'trader')
         if (!trader) continue

         const stopLossDecision = checkStopLoss(trader, position, company.price, state.corporateSkills)
         if (stopLossDecision.shouldSell) {
           // 자동 매도 처리
           state.sellPosition(position.companyId, position.shares)

           // 토스트 알림
           state.addPlayerEvent({
             type: 'auto_stop_loss',
             timestamp: state.currentTick,
             data: {
               company: company.name,
               reason: stopLossDecision.reason,
               price: stopLossDecision.price
             }
           })
         }
       }
     }
   }))
   ```

**검증 포인트**:
- [ ] 교육 프로그램이 매 틱마다 진행됨
- [ ] 체크포인트가 정확한 시점에 발동
- [ ] 손절/익절이 자동으로 실행됨
- [ ] 성능 영향 최소화 (1000 포지션 처리 < 10ms)

**의존성**: Task 3.4, 3.5, 4.1-4.3 완료

---

### Task 4.5: HR 자동화 확장 🔗

**파일**: `src/engines/hrAutomation.ts` (수정)

**작업 내용**:
1. **자동 교육 프로그램 개설 기능 추가**
   ```typescript
   // 기존 processHRAutomation() 함수 확장

   export function processHRAutomation(state: GameStore, hrManager: Employee) {
     // ... 기존 스트레스 관리, 채용 로직

     // ✨ 신규: 자동 스킬 교육
     if (state.time.day === 1 && state.time.hour === 9) {  // 매월 1일
       autoSkillTraining(state, hrManager)
     }
   }

   function autoSkillTraining(state: GameStore, hrManager: Employee) {
     // 1. 해금된 회사 스킬 중 우선순위 계산
     const unlockedSkills = state.corporateSkills.filter(s => s.unlocked && s.canTeach)
     if (unlockedSkills.length === 0) return

     const skillPriorities = unlockedSkills.map(skill => {
       // 해당 스킬이 낮은 직원 수 계산
       const employeesNeedingSkill = state.player.employees.filter(emp => {
         const hasSpecialization = emp.skills?.specializations?.some(spec => spec.id === skill.id)
         return !hasSpecialization
       }).length

       return {
         skill,
         priority: employeesNeedingSkill  // 필요한 직원이 많을수록 우선순위 높음
       }
     })

     skillPriorities.sort((a, b) => b.priority - a.priority)
     const topSkill = skillPriorities[0].skill

     // 2. 해당 스킬이 없는 직원 3명 선발
     const trainees = state.player.employees
       .filter(e => !e.isHRManager && e.level! >= topSkill.minEmployeeLevel)
       .filter(e => !e.skills?.specializations?.some(spec => spec.id === topSkill.id))
       .slice(0, 3)

     if (trainees.length === 0) return

     // 3. 교육 프로그램 생성
     const program: TrainingProgram = {
       id: generateId(),
       targetSkill: topSkill.id,
       instructorId: hrManager.id,
       trainees: trainees.map(e => e.id),
       maxSeats: 3,
       status: 'scheduled',
       startTick: state.currentTick + 100,  // 100틱 후 시작
       currentTick: 0,
       durationTicks: topSkill.trainingDuration,
       progress: 0,
       costCash: topSkill.trainingCost,
       costPerEmployee: topSkill.trainingCost / 3,
       requiredFacilities: ['whiteboard'],  // 임시
       minEmployeeLevel: topSkill.minEmployeeLevel || 1,
       checkpoints: generateCheckpoints(topSkill.id),  // trainingEvents.ts에서 가져오기
       completedCheckpoints: []
     }

     // 4. 예산 확인 및 생성
     if (state.player.cash >= program.costCash) {
       state.player.cash -= program.costCash
       state.trainingPrograms.push(program)

       // HR 리포트 생성
       hrManager.hrReports?.push({
         id: generateId(),
         employeeId: hrManager.id,
         issue: 'skill_gap',
         severity: 'low',
         recommendation: `${topSkill.name} 교육 프로그램 자동 개설 (수강생: ${trainees.map(e => e.name).join(', ')})`,
         timestamp: state.currentTick
       })
     }
   }
   ```

**검증 포인트**:
- [ ] 매월 1일에 자동 교육 개설
- [ ] 우선순위 계산 로직 정확
- [ ] 예산 부족 시 생성 안 됨
- [ ] HR 리포트 정상 생성

**의존성**: Task 3.5, 4.4 완료

---

## Phase 5: UI 컴포넌트

**목표**: 스킬 시스템 UI 3개 창 구현

### Task 5.1: 스킬 도감 창 구현 🎨

**파일**: `src/components/windows/SkillLibraryWindow.tsx` (신규)

**작업 내용**:
1. **컴포넌트 구조**
   ```tsx
   import { useGameStore } from '../../stores/gameStore'
   import { EMPLOYEE_SKILLS } from '../../data/employeeSkills'
   import { WindowFrame } from '../ui/WindowFrame'

   export function SkillLibraryWindow({ windowId }: { windowId: string }) {
     const [selectedCategory, setSelectedCategory] = useState<'all' | 'trading' | 'analysis' | 'research' | 'risk' | 'psychology'>('all')

     const skills = Object.values(EMPLOYEE_SKILLS).filter(skill =>
       selectedCategory === 'all' || skill.category === selectedCategory
     )

     return (
       <WindowFrame windowId={windowId} title="직원 스킬 도감">
         <div className="flex h-full">
           {/* 카테고리 탭 */}
           <div className="w-32 border-r border-gray-400">
             <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
           </div>

           {/* 스킬 리스트 */}
           <div className="flex-1 overflow-y-auto p-2">
             {skills.map(skill => (
               <SkillCard key={skill.id} skill={skill} />
             ))}
           </div>
         </div>
       </WindowFrame>
     )
   }

   function SkillCard({ skill }: { skill: PassiveAbility }) {
     return (
       <div className="mb-2 border border-gray-400 bg-gray-100 p-2">
         <div className="flex items-center justify-between">
           <span className="font-bold">{skill.name}</span>
           <span className="text-xs text-gray-600">Tier {skill.tier}</span>
         </div>
         <p className="text-sm text-gray-700">{skill.description}</p>

         {/* 효과 상세 */}
         <div className="mt-1 text-xs">
           {skill.effects.map((effect, idx) => (
             <div key={idx} className="text-gray-600">
               • {formatEffect(effect)}
             </div>
           ))}
         </div>

         {/* 해금 조건 */}
         <div className="mt-1 text-xs text-blue-600">
           해금: {formatUnlockCondition(skill.unlockCondition)}
         </div>
       </div>
     )
   }
   ```

2. **헬퍼 함수**
   - `formatEffect()`: PassiveEffect를 읽기 쉬운 텍스트로 변환
   - `formatUnlockCondition()`: 해금 조건 텍스트 생성

**검증 포인트**:
- [ ] 50개 스킬이 모두 표시됨
- [ ] 카테고리 필터링 정상 작동
- [ ] tier별 색상 구분
- [ ] 해금 조건이 명확히 표시

**의존성**: Task 2.1 완료

---

### Task 5.2: 교육 센터 창 구현 🎨

**파일**: `src/components/windows/TrainingCenterWindow.tsx` (신규)

**작업 내용**:
1. **컴포넌트 구조**
   ```tsx
   export function TrainingCenterWindow({ windowId }: { windowId: string }) {
     const corporateSkills = useGameStore(s => s.corporateSkills)
     const trainingPrograms = useGameStore(s => s.trainingPrograms)
     const employees = useGameStore(s => s.player.employees)
     const startTraining = useGameStore(s => s.startTrainingProgram)

     const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
     const [selectedTrainees, setSelectedTrainees] = useState<string[]>([])

     const unlockedSkills = corporateSkills.filter(s => s.unlocked && s.canTeach)
     const activePrograms = trainingPrograms.filter(p => p.status === 'active')

     return (
       <WindowFrame windowId={windowId} title="교육 센터">
         <div className="flex h-full">
           {/* 좌측: 교육 가능한 스킬 */}
           <div className="w-1/2 border-r border-gray-400 p-2">
             <h3 className="font-bold">교육 가능한 회사 스킬</h3>
             <div className="space-y-1">
               {unlockedSkills.map(skill => (
                 <SkillButton
                   key={skill.id}
                   skill={skill}
                   selected={selectedSkill === skill.id}
                   onClick={() => setSelectedSkill(skill.id)}
                 />
               ))}
             </div>

             {/* 수강생 선택 */}
             {selectedSkill && (
               <div className="mt-4">
                 <h4 className="font-bold">수강생 선택 (최대 3명)</h4>
                 <EmployeeSelector
                   employees={employees}
                   selected={selectedTrainees}
                   onSelect={setSelectedTrainees}
                   maxSeats={3}
                 />

                 <button
                   className="mt-2 bg-blue-500 px-4 py-2 text-white"
                   onClick={() => handleStartTraining(selectedSkill, selectedTrainees, startTraining)}
                 >
                   교육 시작 (비용: 30만원)
                 </button>
               </div>
             )}
           </div>

           {/* 우측: 진행 중인 교육 */}
           <div className="w-1/2 p-2">
             <h3 className="font-bold">진행 중인 교육</h3>
             <div className="space-y-2">
               {activePrograms.map(program => (
                 <ProgramCard key={program.id} program={program} />
               ))}
             </div>
           </div>
         </div>
       </WindowFrame>
     )
   }

   function ProgramCard({ program }: { program: TrainingProgram }) {
     return (
       <div className="border border-gray-400 bg-gray-100 p-2">
         <div className="font-bold">{program.targetSkill}</div>
         <div className="text-sm">진행률: {program.progress.toFixed(1)}%</div>
         <div className="h-2 bg-gray-300">
           <div
             className="h-full bg-blue-500"
             style={{ width: `${program.progress}%` }}
           />
         </div>
         <div className="mt-1 text-xs text-gray-600">
           수강생: {program.trainees.length}명
         </div>
       </div>
     )
   }
   ```

**검증 포인트**:
- [ ] 해금된 스킬만 표시됨
- [ ] 수강생 선택 최대 3명 제한
- [ ] 교육 시작 시 비용 차감
- [ ] 진행 중인 교육 실시간 업데이트

**의존성**: Task 2.2, 4.4 완료

---

### Task 5.3: 직원 상세 정보 창 확장 🎨

**파일**: `src/components/windows/EmployeeDetailWindow.tsx` (수정)

**작업 내용**:
1. **스킬 탭 추가**
   ```tsx
   // 기존 창에 탭 추가
   export function EmployeeDetailWindow({ windowId, employeeId }: Props) {
     const employee = useGameStore(s => s.player.employees.find(e => e.id === employeeId))
     const [activeTab, setActiveTab] = useState<'info' | 'skills' | 'growth'>('info')

     if (!employee) return null

     return (
       <WindowFrame windowId={windowId} title={`직원 정보: ${employee.name}`}>
         {/* 탭 버튼 */}
         <div className="flex border-b border-gray-400">
           <TabButton label="기본 정보" active={activeTab === 'info'} onClick={() => setActiveTab('info')} />
           <TabButton label="스킬" active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} />
           <TabButton label="성장" active={activeTab === 'growth'} onClick={() => setActiveTab('growth')} />
         </div>

         {/* 탭 컨텐츠 */}
         <div className="flex-1 overflow-y-auto p-2">
           {activeTab === 'info' && <InfoTab employee={employee} />}
           {activeTab === 'skills' && <SkillsTab employee={employee} />}
           {activeTab === 'growth' && <GrowthTab employee={employee} />}
         </div>
       </WindowFrame>
     )
   }

   function SkillsTab({ employee }: { employee: Employee }) {
     const skills = employee.skills || { analysis: 50, trading: 50, research: 50 }

     return (
       <div>
         {/* 기본 스탯 */}
         <section className="mb-4">
           <h3 className="font-bold">기본 스탯</h3>
           <StatBar label="분석 (Analysis)" value={skills.analysis} />
           <StatBar label="매매 (Trading)" value={skills.trading} />
           <StatBar label="리서치 (Research)" value={skills.research} />
         </section>

         {/* 패시브 스킬 */}
         <section className="mb-4">
           <h3 className="font-bold">패시브 스킬</h3>
           {skills.passives && skills.passives.length > 0 ? (
             <div className="space-y-1">
               {skills.passives.map(passive => (
                 <PassiveSkillCard key={passive.id} passive={passive} />
               ))}
             </div>
           ) : (
             <p className="text-sm text-gray-600">보유한 패시브 스킬 없음</p>
           )}
         </section>

         {/* 특화 스킬 */}
         <section>
           <h3 className="font-bold">특화 스킬</h3>
           {skills.specializations && skills.specializations.length > 0 ? (
             <div className="space-y-1">
               {skills.specializations.map(spec => (
                 <SpecializationCard key={spec.id} specialization={spec} />
               ))}
             </div>
           ) : (
             <p className="text-sm text-gray-600">습득한 특화 스킬 없음</p>
           )}
         </section>
       </div>
     )
   }
   ```

**검증 포인트**:
- [ ] 기존 탭과 스타일 일관성
- [ ] 스킬 정보가 정확히 표시됨
- [ ] 패시브 효과 툴팁 작동
- [ ] 특화 스킬 숙련도 진행 바 표시

**의존성**: Task 5.1, 5.2 완료

---

## Phase 6: 검증 및 밸런싱

**목표**: 전체 시스템 통합 테스트 및 밸런스 조정

### Task 6.1: 단위 테스트 작성 ✅

**파일**: `src/engines/__tests__/` (신규)

**작업 내용**:
1. **신호 생성 엔진 테스트**
   ```typescript
   // signalGenerationEngine.test.ts
   describe('Signal Generation Engine', () => {
     test('낮은 analysis 스탯 → 잡음 신호 증가', () => {
       const lowSkillEmployee = createMockEmployee({ analysis: 10 })
       const signals = generateTradeSignals(lowSkillEmployee, mockCompanies, [])
       const noiseRate = signals.filter(s => s.isNoise).length / signals.length
       expect(noiseRate).toBeGreaterThan(0.4)
     })

     test('Chart Pattern Master 특화 → 신뢰도 +30%', () => {
       const employee = createMockEmployee({
         analysis: 70,
         specializations: [{ id: 'chart_pattern_master', masteryLevel: 50 }]
       })
       const signals = generateTradeSignals(employee, mockCompanies, [])
       const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
       expect(avgConfidence).toBeGreaterThan(80)
     })
   })
   ```

2. **실행 엔진 테스트**
   ```typescript
   // tradeExecutionEngine.test.ts
   describe('Trade Execution Engine', () => {
     test('Flash Trader 패시브 → 실행 지연 50% 감소', () => {
       const flashTrader = createMockEmployee({
         trading: 50,
         passives: [EMPLOYEE_SKILLS.flash_trader]
       })
       const result = executeEmployeeTrade(flashTrader, mockOrder, mockMarket)
       expect(result.delay).toBe(12.5)  // (1 - 0.5) * 50 * 0.5
     })

     test('Smart Order Router → 슬리피지 0%', () => {
       const smartEmployee = createMockEmployee({
         passives: [EMPLOYEE_SKILLS.smart_router]
       })
       const result = executeEmployeeTrade(smartEmployee, mockOrder, mockMarket)
       expect(result.slippage).toBe(0)
     })
   })
   ```

3. **리스크 관리 테스트**
4. **손절/익절 테스트**
5. **교육 엔진 테스트**

**검증 포인트**:
- [ ] 모든 엔진 함수 커버리지 > 80%
- [ ] 엣지 케이스 처리 확인
- [ ] 밸런스 경계값 테스트

**의존성**: Phase 3 완료

---

### Task 6.2: 통합 테스트 시나리오 🧪

**파일**: `src/__tests__/integration/` (신규)

**작업 내용**:
1. **시나리오 1: 신입 직원 → 숙련 트레이더**
   - 초기 스킬 0-30 → 레벨업 → 패시브 해금 → 교육 수료 → 스킬 70+
   - 신호 품질, 실행 속도, 리스크 관리 개선 확인

2. **시나리오 2: 회사 스킬 해금 → 전사 적용**
   - 손절매 정책 해금 → 모든 포지션에 자동 손절 적용 확인
   - 교육 프로그램 개설 → 직원들이 특화 스킬 습득

3. **시나리오 3: 교육 프로그램 풀 사이클**
   - 교육 시작 → 25% 퀴즈 → 50% 시뮬레이션 → 75% 토론 → 완료
   - 체크포인트 성공/실패에 따른 XP/스트레스 변화

4. **시나리오 4: 패시브 스킬 조합**
   - Flash Trader + Smart Router 조합 → 최고 실행 품질
   - Diamond Hands + YOLO Trader 조합 → 고위험 고보상

**검증 포인트**:
- [ ] 엔드투엔드 흐름이 끊김없이 작동
- [ ] 밸런스가 게임플레이 측면에서 합리적
- [ ] 성능 이슈 없음 (1000 직원 처리)

**의존성**: Task 6.1 완료

---

### Task 6.3: 밸런스 튜닝 ⚖️

**파일**: `src/config/skillBalance.ts` (신규)

**작업 내용**:
1. **밸런스 파라미터 중앙화**
   ```typescript
   export const SKILL_BALANCE = {
     // 기본 스탯 영향도
     ANALYSIS_NOISE_FACTOR: 2.0,  // analysis 0 → 잡음 50%, 100 → 잡음 0%
     TRADING_DELAY_FACTOR: 50,    // trading 0 → 지연 50틱, 100 → 지연 0틱
     TRADING_SLIPPAGE_FACTOR: 0.02,  // trading 0 → 슬리피지 2%, 100 → 0%
     RESEARCH_RISK_FACTOR: 0.025,  // research 0 → 리스크 5%, 100 → 2.5%

     // 패시브 스킬 배율
     FLASH_TRADER_SPEED_BONUS: 0.5,  // 실행 지연 50% 감소
     SMART_ROUTER_SLIPPAGE_REDUCTION: 1.0,  // 슬리피지 100% 제거
     CHART_PATTERN_CONFIDENCE_BONUS: 30,  // 신뢰도 +30
     KELLY_CRITERION_POSITION_MULTIPLIER: 1.5,  // 포지션 크기 최대 1.5배
     YOLO_TRADER_POSITION_MULTIPLIER: 3,  // 고신뢰도 시 3배

     // 교육 프로그램
     TRAINING_BASE_COST: 300_000,
     TRAINING_DURATION_TICKS: 50_400,  // 2주
     QUIZ_PASS_XP: 500,
     SIMULATION_PASS_XP: 1000,
     DISCUSSION_PASS_XP: 800,

     // 회사 스킬 비용
     CORPORATE_SKILL_COSTS: {
       stop_loss_policy: 10_000_000,
       take_profit_policy: 15_000_000,
       algo_trading_bot: 50_000_000,
     }
   }
   ```

2. **플레이테스트 기반 조정**
   - 스킬 효과가 너무 강하면 감소, 약하면 증가
   - 교육 비용 vs 효과 균형
   - 패시브 스킬 해금 난이도 조정

3. **밸런스 문서 작성**
   - `claudedocs/balance_report.md` 생성
   - 각 스킬별 예상 ROI 계산
   - 추천 빌드 경로 제시

**검증 포인트**:
- [ ] 초반 직원이 너무 약하지 않음
- [ ] 숙련 직원이 너무 강하지 않음
- [ ] 교육 투자 대비 효과 합리적
- [ ] 회사 스킬 해금 타이밍 적절

**의존성**: Task 6.2 완료

---

## 의존성 그래프

```
Phase 1 (타입)
├─ Task 1.1: 직원 스킬 타입 ──┐
├─ Task 1.2: 회사 스킬 타입 ──┤
├─ Task 1.3: 교육 타입 ────────┤
└─ Task 1.4: GameStore 확장 ───┘
              ↓
Phase 2 (데이터)
├─ Task 2.1: 직원 스킬 카탈로그 ──┐
├─ Task 2.2: 회사 스킬 카탈로그 ──┤
└─ Task 2.3: 교육 이벤트 ─────────┘
              ↓
Phase 3 (엔진)
├─ Task 3.1: 신호 생성 엔진 ──┐
├─ Task 3.2: 매매 실행 엔진 ──┤ (순차 의존)
├─ Task 3.3: 리스크 관리 엔진 ┤
├─ Task 3.4: 손절/익절 엔진 ──┤
└─ Task 3.5: 교육 진행 엔진 ──┘
              ↓
Phase 4 (통합)
├─ Task 4.1: Analyst 통합 ──┐
├─ Task 4.2: Trader 통합 ───┤
├─ Task 4.3: Manager 통합 ──┤ (순차 의존)
├─ Task 4.4: 틱 엔진 통합 ──┤
└─ Task 4.5: HR 자동화 ─────┘
              ↓
Phase 5 (UI)
├─ Task 5.1: 스킬 도감 창 ──┐
├─ Task 5.2: 교육 센터 창 ──┤ (병렬 가능)
└─ Task 5.3: 직원 상세 창 ─┘
              ↓
Phase 6 (검증)
├─ Task 6.1: 단위 테스트 ──┐
├─ Task 6.2: 통합 테스트 ──┤ (순차 의존)
└─ Task 6.3: 밸런스 튜닝 ──┘
```

---

## 검증 체크리스트

### Phase 1: 타입 시스템 ✅
- [ ] TypeScript 컴파일 에러 0개
- [ ] 기존 코드와 하위 호환성 유지
- [ ] 모든 타입에 JSDoc 주석
- [ ] 순환 참조 없음

### Phase 2: 데이터 레이어 ✅
- [ ] 50개 직원 스킬 정의 완료
- [ ] 15개 회사 스킬 정의 완료
- [ ] 25개 교육 이벤트 정의 완료
- [ ] 밸런스 스프레드시트 작성

### Phase 3: 엔진 레이어 ✅
- [ ] 신호 생성 엔진 테스트 통과
- [ ] 매매 실행 엔진 테스트 통과
- [ ] 리스크 관리 엔진 테스트 통과
- [ ] 손절/익절 엔진 테스트 통과
- [ ] 교육 진행 엔진 테스트 통과

### Phase 4: 시스템 통합 ✅
- [ ] Analyst 파이프라인 정상 작동
- [ ] Manager 파이프라인 정상 작동
- [ ] Trader 파이프라인 정상 작동
- [ ] 틱 엔진 성능 영향 < 5%
- [ ] HR 자동화 정상 작동

### Phase 5: UI 컴포넌트 ✅
- [ ] 스킬 도감 창 렌더링 정상
- [ ] 교육 센터 창 인터랙션 정상
- [ ] 직원 상세 창 스킬 탭 정상
- [ ] 반응형 레이아웃 정상

### Phase 6: 검증 및 밸런싱 ✅
- [ ] 단위 테스트 커버리지 > 80%
- [ ] 통합 테스트 4개 시나리오 통과
- [ ] 밸런스 문서 작성 완료
- [ ] 플레이테스트 3회 이상

---

## 예상 일정

| Phase | 작업량 | 예상 소요 | 병렬화 가능 |
|-------|--------|----------|------------|
| Phase 1 | 4 tasks | 0.5일 | 부분적 |
| Phase 2 | 3 tasks | 1.5일 | 완전 병렬 |
| Phase 3 | 5 tasks | 2일 | 부분적 |
| Phase 4 | 5 tasks | 1.5일 | 순차 필수 |
| Phase 5 | 3 tasks | 1일 | 완전 병렬 |
| Phase 6 | 3 tasks | 1일 | 순차 필수 |
| **총계** | **23 tasks** | **7.5일** | - |

**권장 순서**:
1. Phase 1 → 2 병렬 진행 (2일)
2. Phase 3 → 4 순차 진행 (3.5일)
3. Phase 5 → 6 순차 진행 (2일)

---

## 위험 요소 및 완화 전략

### 위험 1: 기존 Trade Pipeline과 충돌
**완화**: Task 4.1-4.3에서 기존 함수를 점진적으로 확장, 급격한 교체 금지

### 위험 2: 밸런스 붕괴 (너무 강한 스킬)
**완화**: Task 6.3에서 플레이테스트 기반 튜닝, SKILL_BALANCE 파라미터 중앙화

### 위험 3: 성능 저하 (복잡한 계산)
**완화**: Task 4.4에서 성능 프로파일링, 필요 시 계산 캐싱

### 위험 4: UI 복잡도 증가
**완화**: Task 5.1-5.3에서 기존 디자인 패턴 준수, 과도한 정보 표시 지양

---

## 다음 단계

이 워크플로우 문서를 승인받은 후:

1. **`/sc:implement` 명령어로 실제 구현 시작**
2. **Phase별로 PR 분리 (6개 PR)**
3. **각 Phase 완료 시 검증 체크리스트 확인**
4. **Phase 6 완료 후 최종 밸런스 리포트 작성**

---

**문서 버전**: 1.0
**마지막 업데이트**: 2026-02-16
**작성자**: Claude Code Workflow Generator

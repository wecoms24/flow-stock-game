# 🏢 Living Office & Smart Architect Implementation Workflow

**프로젝트**: Retro Stock OS - 오피스 시스템 통합 혁신
**목표**: 살아있는 픽셀 아트 + AI 자동 배치 시스템 구현
**기간**: 4주 (2026-02-16 ~ 2026-03-15)
**전략**: Systematic (단계별 점진적 구현)

---

## 📋 Executive Summary

### 핵심 기능 (Core Features)
1. **Living Pixel Art System**: 32x32px 동적 스프라이트, 감정 오라, 상태별 애니메이션
2. **Smart AI Architect**: 직원/가구 최적 배치 알고리즘, 제안/승인 워크플로우
3. **Visual Progression**: 오피스 레벨별 배경 진화 (창고 → 펜트하우스)
4. **Juicy Feedback**: 말풍선, 파티클 이펙트, 시너지 연결선, 음향 효과

### 기술 스택 통합
- **Frontend**: React 19 + TypeScript 5.9 (기존 유지)
- **Animation**: requestAnimationFrame + CSS transforms
- **State**: Zustand 5 (기존 store 확장)
- **Graphics**: Canvas API (스프라이트) + SVG (파티클/연결선)
- **AI Logic**: 신규 시스템 (`src/systems/aiArchitect.ts`)

### 성공 지표
- ✅ 60fps 애니메이션 유지 (100명 직원 환경)
- ✅ AI 배치 제안 정확도 ≥85%
- ✅ 플레이어 만족도 증가 (수동 배치 피로도 감소)
- ✅ 시각적 피드백 지연 <100ms

---

## 🗓️ Phase Breakdown (4 Weeks)

### Week 1: Visual Foundation (시각적 기초)
**목표**: 동적 스프라이트 시스템 구축 및 기본 애니메이션 적용

**핵심 작업**:
1. 스프라이트 애니메이션 엔진 설계
2. 픽셀 아트 에셋 제작 (또는 플레이스홀더)
3. 감정 오라 렌더링 시스템
4. 오피스 배경 진화 로직

**의존성**: 없음 (신규 시스템)

---

### Week 2: AI Logic Implementation (AI 두뇌 구현)
**목표**: 스마트 배치 알고리즘 개발

**핵심 작업**:
1. 시너지 평가 엔진 (`evaluateSynergy()`)
2. 최적 배치 탐색 알고리즘 (`findOptimalLayout()`)
3. 가구 ROI 계산 시스템
4. 직원 특성(Trait) 기반 배치 로직

**의존성**: Week 1 완료 (스프라이트 위치 데이터 필요)

---

### Week 3: Integration & Interaction (통합 및 피드백)
**목표**: AI와 시각 시스템 통합, UX 완성

**핵심 작업**:
1. 제안/승인 UI (Blueprint 모드)
2. 말풍선 시스템 연동
3. 파티클 이펙트 & 사운드
4. 시너지 연결선 시각화

**의존성**: Week 1 + Week 2 완료

---

### Week 4: Polish & Performance (밸런싱 및 최적화)
**목표**: 성능 최적화, 게임 밸런스 조정, 튜토리얼

**핵심 작업**:
1. 렌더링 최적화 (Culling, Batching)
2. AI 밸런스 조정 (90% 효율 목표)
3. 튜토리얼 시스템
4. 버그 수정 및 엣지 케이스 처리

**의존성**: Week 1~3 완료

---

## 📦 Detailed Task Breakdown

### WEEK 1: Visual Foundation

#### Task 1.1: Sprite Animation Engine Setup
**파일**: `src/systems/spriteAnimator.ts` (신규)

**구현 내용**:
```typescript
interface SpriteFrame {
  x: number; y: number; width: number; height: number;
}

interface AnimationState {
  name: 'WORKING' | 'TRADING' | 'BREAK' | 'PANIC' | 'IDLE';
  frames: SpriteFrame[];
  frameRate: number; // fps
  loop: boolean;
}

class SpriteAnimator {
  private animations: Map<string, AnimationState>;
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;

  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, x: number, y: number): void;
  setAnimation(state: AnimationState['name']): void;
}
```

**체크포인트**:
- [ ] `SpriteAnimator` 클래스 구현 완료
- [ ] 상태 전환 로직 동작 확인 (IDLE → WORKING → BREAK)
- [ ] 60fps 유지 (requestAnimationFrame)

**예상 시간**: 2일

---

#### Task 1.2: Pixel Art Asset Integration
**파일**: `src/assets/sprites/` (신규 디렉토리)

**에셋 명세**:
- `employee_base.png`: 32x32px, 5개 상태 × 4 프레임 = 20 프레임
- `emotions.png`: 감정 오라 스프라이트 (16x16px, 3가지 색상)
- `furniture_sprites.png`: 가구 스프라이트 시트

**체크포인트**:
- [ ] 플레이스홀더 스프라이트 생성 (개발용 단색 박스)
- [ ] 스프라이트 시트 로더 구현 (`loadSpriteSheet()`)
- [ ] 캐싱 시스템 (성능 최적화)

**예상 시간**: 3일 (외주 아티스트 협업 시 병렬 진행 가능)

---

#### Task 1.3: Emotion Aura System
**파일**: `src/systems/emotionRenderer.ts` (신규)

**구현 내용**:
```typescript
type EmotionType = 'happy' | 'stressed' | 'focused';

interface EmotionAura {
  type: EmotionType;
  intensity: number; // 0-1
  color: string; // CSS color
  radius: number; // pixels
}

function renderAura(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  aura: EmotionAura
): void {
  // Radial gradient glow effect
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, aura.radius);
  gradient.addColorStop(0, `${aura.color}80`); // 50% alpha
  gradient.addColorStop(1, `${aura.color}00`); // transparent

  ctx.fillStyle = gradient;
  ctx.fillRect(x - aura.radius, y - aura.radius, aura.radius * 2, aura.radius * 2);
}
```

**체크포인트**:
- [ ] 감정별 색상 매핑 (초록/빨강/파랑)
- [ ] 강도 기반 radius 계산 (stress 0-100 → radius 10-30px)
- [ ] 실시간 업데이트 (직원 상태 변화 감지)

**예상 시간**: 1일

---

#### Task 1.4: Office Background Evolution System
**파일**:
- `src/components/windows/OfficeWindow.tsx` (수정)
- `src/data/officeBackgrounds.ts` (신규)

**구현 내용**:
```typescript
interface OfficeBackground {
  level: number;
  theme: 'garage' | 'startup' | 'corporate' | 'tower';
  backgroundImage: string; // CSS gradient or image path
  ambientEffects: {
    particles?: 'dust' | 'snow' | 'sparks';
    lighting?: 'dim' | 'bright' | 'neon';
    animation?: 'flickering' | 'cityscape';
  };
}

const OFFICE_BACKGROUNDS: Record<number, OfficeBackground> = {
  1: { level: 1, theme: 'garage', backgroundImage: 'linear-gradient(180deg, #2a2a2a, #1a1a1a)', ... },
  5: { level: 5, theme: 'startup', backgroundImage: 'url(/assets/bg_startup.png)', ... },
  10: { level: 10, theme: 'tower', backgroundImage: 'url(/assets/bg_tower.gif)', ... },
};
```

**체크포인트**:
- [ ] 레벨별 배경 데이터 정의
- [ ] CSS 기반 배경 전환 애니메이션 (fade-in 500ms)
- [ ] 움직이는 야경 효과 (CSS animation 또는 canvas parallax)

**예상 시간**: 2일

---

### WEEK 2: AI Logic Implementation

#### Task 2.1: Synergy Evaluation Engine
**파일**: `src/systems/aiArchitect.ts` (신규)

**구현 내용**:
```typescript
interface SynergyScore {
  value: number; // 0-100
  reason: string;
  contributors: { employeeId: string; bonus: number }[];
}

function calculateSynergy(
  employee: Employee,
  position: number,
  grid: OfficeGrid,
  allEmployees: Employee[]
): SynergyScore {
  let score = 50; // base score
  const contributors: SynergyScore['contributors'] = [];

  // 1. Role Synergy (직종 간 시너지)
  const adjacentEmployees = getAdjacentEmployees(position, grid, allEmployees);
  adjacentEmployees.forEach(adj => {
    const bonus = ROLE_SYNERGY_MATRIX[employee.role][adj.role] || 0;
    if (bonus > 0) {
      score += bonus;
      contributors.push({ employeeId: adj.id, bonus });
    }
  });

  // 2. Trait Matching (특성 기반)
  if (employee.traits.includes('introvert')) {
    const isCornerSeat = isCorner(position, grid);
    if (isCornerSeat) {
      score += 15;
      contributors.push({ employeeId: 'trait_bonus', bonus: 15 });
    }
  }

  // 3. Furniture Proximity (가구 효과)
  const nearbyFurniture = getFurnitureInRange(position, grid, 3);
  nearbyFurniture.forEach(furn => {
    const buff = FURNITURE_BUFFS[furn.type];
    if (buff && buff.affectsRole?.includes(employee.role)) {
      score += buff.value;
    }
  });

  return { value: Math.min(score, 100), reason: '...', contributors };
}
```

**체크포인트**:
- [ ] `ROLE_SYNERGY_MATRIX` 정의 (Analyst↔Manager: +20, Manager↔Trader: +25 등)
- [ ] Trait별 선호 위치 로직 구현
- [ ] 가구 범위 계산 (Manhattan distance)

**예상 시간**: 3일

---

#### Task 2.2: Optimal Layout Search Algorithm
**파일**: `src/systems/aiArchitect.ts` (추가)

**구현 내용**:
```typescript
interface LayoutProposal {
  score: number; // 전체 효율 점수 (0-100)
  moves: EmployeeMove[];
  purchases: FurniturePurchase[];
  estimatedCost: number;
}

interface EmployeeMove {
  employeeId: string;
  from: number; to: number;
  reason: string;
  scoreImprovement: number;
}

function generateOptimalLayout(state: GameState): LayoutProposal {
  const { employees, officeGrid, cash } = state.player;
  const proposal: LayoutProposal = {
    score: 0, moves: [], purchases: [], estimatedCost: 0
  };

  // 1. 현재 배치 점수 계산
  const currentScore = employees.reduce((sum, emp) =>
    sum + calculateSynergy(emp, emp.seatIndex, officeGrid, employees).value, 0
  ) / employees.length;

  // 2. 각 직원에 대해 최적 위치 탐색 (Greedy Algorithm)
  employees.forEach(emp => {
    const emptySeats = getEmptySeats(officeGrid);
    const scores = emptySeats.map(seat => ({
      seat,
      score: calculateSynergy(emp, seat, officeGrid, employees).value
    }));

    const bestSeat = scores.sort((a, b) => b.score - a.score)[0];
    const currentEmpScore = calculateSynergy(emp, emp.seatIndex, officeGrid, employees).value;

    // 20% 이상 개선 시에만 제안
    if (bestSeat.score > currentEmpScore * 1.2) {
      proposal.moves.push({
        employeeId: emp.id,
        from: emp.seatIndex, to: bestSeat.seat,
        reason: `시너지 ${currentEmpScore.toFixed(0)} → ${bestSeat.score.toFixed(0)}`,
        scoreImprovement: bestSeat.score - currentEmpScore
      });
    }
  });

  // 3. 가구 구매 제안 (ROI 기반)
  proposal.purchases = suggestFurniturePurchases(state, cash * 0.1); // 예산 10%

  proposal.score = calculateProposalScore(proposal, employees, officeGrid);
  proposal.estimatedCost = proposal.purchases.reduce((sum, p) => sum + p.cost, 0);

  return proposal;
}
```

**체크포인트**:
- [ ] Greedy 알고리즘 구현 (O(n × m), n=직원수, m=빈자리수)
- [ ] 가구 ROI 계산 (비용 대비 효율 증가)
- [ ] 예산 제약 처리 (현금 부족 시 대안 제시)

**예상 시간**: 4일

---

#### Task 2.3: Furniture ROI Calculator
**파일**: `src/systems/furnitureRoi.ts` (신규)

**구현 내용**:
```typescript
interface FurnitureROI {
  type: FurnitureType;
  cost: number;
  benefit: number; // 예상 시간당 수익 증가
  paybackPeriod: number; // 회수 기간 (시간)
  priority: number; // 0-100
}

function calculateFurnitureROI(
  furniture: FurnitureType,
  employees: Employee[],
  cash: number
): FurnitureROI | null {
  const config = FURNITURE_CATALOG[furniture];
  if (!config || config.cost > cash) return null;

  // 혜택 받을 직원 수 계산
  const beneficiaries = employees.filter(emp =>
    config.buffs.some(buff => buff.affectsRole?.includes(emp.role))
  );

  // 예상 수익 증가
  const avgProductivity = beneficiaries.reduce((sum, e) => sum + e.skills.analysis, 0) / beneficiaries.length;
  const benefitPerHour = beneficiaries.length * avgProductivity * config.buffs[0].multiplier * 10; // 임의 계수

  return {
    type: furniture,
    cost: config.cost,
    benefit: benefitPerHour,
    paybackPeriod: config.cost / benefitPerHour,
    priority: Math.min(100, benefitPerHour / config.cost * 1000)
  };
}

function suggestFurniturePurchases(state: GameState, budget: number): FurniturePurchase[] {
  const allFurniture = Object.keys(FURNITURE_CATALOG) as FurnitureType[];
  const rois = allFurniture
    .map(f => calculateFurnitureROI(f, state.player.employees, budget))
    .filter(r => r !== null)
    .sort((a, b) => b.priority - a.priority);

  const purchases: FurniturePurchase[] = [];
  let spent = 0;

  for (const roi of rois) {
    if (spent + roi.cost <= budget) {
      const position = findBestSpotForFurniture(roi.type, state.player.officeGrid);
      if (position) {
        purchases.push({
          type: roi.type, x: position.x, y: position.y,
          cost: roi.cost,
          reason: `${roi.paybackPeriod.toFixed(1)}시간 내 회수 예상`
        });
        spent += roi.cost;
      }
    }
  }

  return purchases;
}
```

**체크포인트**:
- [ ] ROI 계산 공식 검증 (실제 게임 데이터로 테스트)
- [ ] 우선순위 정렬 알고리즘
- [ ] 빈 공간 탐색 (`findBestSpotForFurniture`)

**예상 시간**: 2일

---

### WEEK 3: Integration & Interaction

#### Task 3.1: Proposal/Approval UI (Blueprint Mode)
**파일**:
- `src/components/windows/AIProposalWindow.tsx` (신규)
- `src/components/office/BlueprintOverlay.tsx` (신규)

**UI 구조**:
```tsx
function AIProposalWindow({ proposal, onApprove, onReject }: Props) {
  return (
    <WindowFrame title="🤖 AI 아키텍트의 제안" windowId="ai_proposal">
      <div className="flex flex-col gap-4 p-4">
        {/* 요약 정보 */}
        <div className="bg-blue-900/20 p-3 rounded">
          <h3>예상 효과</h3>
          <p>생산성: {proposal.score.toFixed(0)}% → {(proposal.score * 1.15).toFixed(0)}%</p>
          <p>비용: ${proposal.estimatedCost.toLocaleString()}</p>
        </div>

        {/* 직원 이동 목록 */}
        <div>
          <h4>직원 재배치 ({proposal.moves.length}명)</h4>
          {proposal.moves.map(move => (
            <div key={move.employeeId} className="flex items-center gap-2">
              <EmployeeAvatar id={move.employeeId} />
              <span>{move.from} ➔ {move.to}</span>
              <span className="text-green-400">+{move.scoreImprovement.toFixed(0)}</span>
              <span className="text-gray-400 text-sm">{move.reason}</span>
            </div>
          ))}
        </div>

        {/* 가구 구매 목록 */}
        <div>
          <h4>가구 구매 ({proposal.purchases.length}개)</h4>
          {proposal.purchases.map((p, i) => (
            <div key={i}>
              <FurnitureIcon type={p.type} />
              <span>{p.type}</span>
              <span>${p.cost.toLocaleString()}</span>
              <span className="text-sm">{p.reason}</span>
            </div>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button onClick={onApprove} className="btn-primary">
            ✅ 승인 및 실행
          </button>
          <button onClick={onReject} className="btn-secondary">
            ❌ 거절
          </button>
        </div>
      </div>
    </WindowFrame>
  );
}
```

**Blueprint Overlay**:
```tsx
function BlueprintOverlay({ proposal }: { proposal: LayoutProposal }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 이동 경로 표시 */}
      {proposal.moves.map(move => (
        <div key={move.employeeId}>
          <GhostEmployee
            position={move.to}
            opacity={0.5}
            arrow={{ from: move.from, to: move.to }}
          />
        </div>
      ))}

      {/* 가구 미리보기 */}
      {proposal.purchases.map((p, i) => (
        <GhostFurniture key={i} x={p.x} y={p.y} type={p.type} opacity={0.6} />
      ))}
    </div>
  );
}
```

**체크포인트**:
- [ ] 제안 창 UI 완성
- [ ] 반투명 유령 아이콘 렌더링
- [ ] 승인 시 자동 실행 (Zustand action 연동)

**예상 시간**: 3일

---

#### Task 3.2: Speech Bubble System Integration
**파일**:
- `src/data/chatter.ts` (수정)
- `src/components/office/SpeechBubble.tsx` (신규)

**추가 메시지 템플릿**:
```typescript
// AI 배치 관련 메시지 추가
const AI_PLACEMENT_MESSAGES = {
  MOVED_CLOSER: [
    "{name}: 여기가 훨씬 편한데? 😊",
    "{name}: 자리 바꿔서 좋네요!",
  ],
  FURNITURE_PLACED: [
    "{name}: 커피머신이다!! ☕",
    "{name}: 휴게실 생겼다! 최고!",
  ],
  SYNERGY_BOOST: [
    "{name}: {partner}랑 같이 일하니까 효율 좋네요!",
  ],
};
```

**체크포인트**:
- [ ] AI 배치 이벤트에 말풍선 트리거 추가
- [ ] 쿨다운 시스템 통합 (중복 메시지 방지)
- [ ] 애니메이션 (fade-in → 3초 유지 → fade-out)

**예상 시간**: 1일

---

#### Task 3.3: Particle Effects & Sound
**파일**:
- `src/systems/particleSystem.ts` (신규)
- `src/systems/soundManager.ts` (수정)

**파티클 이펙트**:
```typescript
interface Particle {
  x: number; y: number;
  vx: number; vy: number; // velocity
  life: number; // 0-1
  color: string;
  size: number;
}

class ParticleSystem {
  private particles: Particle[] = [];

  emit(type: 'money' | 'sparkle' | 'heart', x: number, y: number): void {
    const count = type === 'money' ? 10 : 5;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3,
        life: 1,
        color: type === 'money' ? '#FFD700' : '#FF69B4',
        size: Math.random() * 4 + 2
      });
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 0.1; // gravity
      p.life -= deltaTime * 0.5;
      return p.life > 0;
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }
}
```

**사운드 추가**:
```typescript
// src/systems/soundManager.ts에 추가
export const AI_SOUNDS = {
  PROPOSAL_OPEN: { freq: 600, duration: 0.1, type: 'sine' as const },
  APPROVE: { freq: 800, duration: 0.15, type: 'square' as const },
  FURNITURE_PLACE: { freq: 500, duration: 0.2, type: 'triangle' as const },
};
```

**체크포인트**:
- [ ] 파티클 시스템 구현 (60fps 유지)
- [ ] 거래 성공 시 돈 아이콘 파티클 (💸)
- [ ] 가구 설치 시 반짝임 효과
- [ ] 사운드 재생 트리거 연동

**예상 시간**: 2일

---

#### Task 3.4: Synergy Connection Lines
**파일**: `src/components/office/SynergyLines.tsx` (신규)

**구현 내용**:
```tsx
function SynergyLines({ selectedEmployee, employees, grid }: Props) {
  if (!selectedEmployee) return null;

  const synergies = calculateSynergy(
    selectedEmployee,
    selectedEmployee.seatIndex,
    grid,
    employees
  );

  return (
    <svg className="absolute inset-0 pointer-events-none">
      {synergies.contributors.map(contrib => {
        const partner = employees.find(e => e.id === contrib.employeeId);
        if (!partner) return null;

        const from = gridIndexToPosition(selectedEmployee.seatIndex);
        const to = gridIndexToPosition(partner.seatIndex);

        return (
          <g key={contrib.employeeId}>
            {/* 연결선 */}
            <line
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={contrib.bonus > 0 ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
              strokeDasharray="4 2"
              opacity={0.7}
            />

            {/* 보너스 레이블 */}
            <text
              x={(from.x + to.x) / 2}
              y={(from.y + to.y) / 2}
              fill="white"
              fontSize={12}
              textAnchor="middle"
            >
              +{contrib.bonus}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

**체크포인트**:
- [ ] 직원 선택 시 연결선 표시
- [ ] 양방향 시너지 표시 (A↔B 모두 표시)
- [ ] 애니메이션 (선이 천천히 나타남)

**예상 시간**: 1일

---

### WEEK 4: Polish & Performance

#### Task 4.1: Rendering Optimization
**파일**:
- `src/systems/spriteAnimator.ts` (수정)
- `src/components/windows/OfficeWindow.tsx` (수정)

**최적화 기법**:
1. **Culling**: 화면 밖 직원은 렌더링 스킹
2. **Batching**: 같은 스프라이트는 한 번에 그리기
3. **Lazy Update**: 애니메이션 프레임은 200ms마다만 변경
4. **Canvas Layering**: 정적 배경 / 동적 직원 / UI 레이어 분리

```typescript
class OptimizedOfficeRenderer {
  private staticLayer: HTMLCanvasElement;
  private dynamicLayer: HTMLCanvasElement;
  private uiLayer: HTMLCanvasElement;

  constructor() {
    // 3개 캔버스 생성 (z-index로 레이어링)
    this.staticLayer = document.createElement('canvas');
    this.dynamicLayer = document.createElement('canvas');
    this.uiLayer = document.createElement('canvas');
  }

  renderStatic(): void {
    // 배경, 가구 (한 번만 그림)
    const ctx = this.staticLayer.getContext('2d')!;
    drawBackground(ctx);
    drawFurniture(ctx);
  }

  renderDynamic(employees: Employee[]): void {
    const ctx = this.dynamicLayer.getContext('2d')!;
    ctx.clearRect(0, 0, this.dynamicLayer.width, this.dynamicLayer.height);

    // Viewport culling
    const visibleEmployees = employees.filter(emp =>
      isInViewport(emp.seatIndex)
    );

    visibleEmployees.forEach(emp => {
      renderEmployee(ctx, emp);
      renderAura(ctx, emp);
    });
  }

  renderUI(selectedEmployee: Employee | null): void {
    const ctx = this.uiLayer.getContext('2d')!;
    ctx.clearRect(0, 0, this.uiLayer.width, this.uiLayer.height);

    if (selectedEmployee) {
      renderSelectionHighlight(ctx, selectedEmployee);
      renderSynergyLines(ctx, selectedEmployee);
    }
  }
}
```

**체크포인트**:
- [ ] 100명 직원 환경에서 60fps 유지
- [ ] Chrome DevTools Performance 프로파일링
- [ ] 메모리 누수 확인 (장시간 실행 테스트)

**예상 시간**: 3일

---

#### Task 4.2: AI Balance Tuning
**파일**: `src/config/aiArchitectConfig.ts` (신규)

**밸런스 파라미터**:
```typescript
export const AI_ARCHITECT_CONFIG = {
  // AI 제안 빈도
  AUTO_SUGGEST_INTERVAL: 3600 * 10, // 10일마다 자동 제안

  // 최소 개선 임계값 (이하면 제안 안 함)
  MIN_IMPROVEMENT_THRESHOLD: 0.15, // 15% 이상 개선 시에만

  // 가구 구매 예산 비율
  FURNITURE_BUDGET_RATIO: 0.10, // 현금의 10%

  // 직원 재배치 제한
  MAX_MOVES_PER_PROPOSAL: 5, // 한 번에 최대 5명만 이동

  // AI 정확도 (의도적 불완전성)
  ACCURACY: 0.90, // 90% 확률로 최적해 제시

  // 제안 쿨다운
  PROPOSAL_COOLDOWN: 3600, // 1일 쿨다운
};
```

**플레이테스트 시나리오**:
- 시나리오 1: 신입 5명 고용 → AI 제안 확인 → 수동 수정 가능성 테스트
- 시나리오 2: 스트레스 70% 상황 → 가구 구매 제안 적절성
- 시나리오 3: 자금 부족 상황 → 우선순위 제안 검증

**체크포인트**:
- [ ] 밸런스 파라미터 5회 이상 조정
- [ ] 플레이테스터 피드백 수집 (5명 이상)
- [ ] AI가 너무 완벽하지 않도록 조정 (플레이어 개입 여지 확보)

**예상 시간**: 2일

---

#### Task 4.3: Tutorial System
**파일**: `src/components/tutorial/AIArchitectTutorial.tsx` (신규)

**튜토리얼 단계**:
1. **소개**: "안녕하세요! AI 비서입니다. 오피스 배치를 도와드릴게요."
2. **첫 제안**: 직원 3명 고용 시 자동으로 제안 팝업
3. **승인 체험**: 제안 승인 버튼 강조 (툴팁 표시)
4. **수동 수정**: "직접 수정하고 싶으시면 여기를 눌러보세요" (편집 모드 버튼)
5. **완료**: "이제 자유롭게 사용하세요! 필요할 때마다 제안을 드릴게요."

**구현**:
```tsx
function AIArchitectTutorial() {
  const [step, setStep] = useState(0);
  const { completedTutorials } = useGameStore();

  if (completedTutorials.includes('ai_architect')) return null;

  const STEPS = [
    {
      title: "AI 아키텍트 소개",
      message: "안녕하세요! 저는 오피스 배치를 최적화하는 AI 비서입니다.",
      target: null,
    },
    {
      title: "첫 제안 확인",
      message: "지금 직원 배치를 개선할 수 있어요. '자동 최적화' 버튼을 눌러보세요.",
      target: "#ai-optimize-button",
    },
    // ... 더 많은 단계
  ];

  return (
    <TutorialOverlay
      step={STEPS[step]}
      onNext={() => setStep(step + 1)}
      onSkip={() => markTutorialComplete('ai_architect')}
    />
  );
}
```

**체크포인트**:
- [ ] 5단계 튜토리얼 완성
- [ ] 건너뛰기 옵션 제공
- [ ] 재방문 방지 (localStorage에 완료 상태 저장)

**예상 시간**: 2일

---

#### Task 4.4: Bug Fixing & Edge Cases
**테스트 체크리스트**:
- [ ] 직원 0명일 때 AI 제안 크래시 방지
- [ ] 빈 자리 없을 때 재배치 제안 안 함
- [ ] 자금 부족 시 가구 구매 제안 안 함
- [ ] 동시 여러 제안 열림 방지 (모달 lock)
- [ ] 제안 승인 중 게임 일시정지 (트랜잭션 보장)
- [ ] 직원 해고 시 제안 무효화 처리
- [ ] 레벨업 시 배경 변경 애니메이션 버그 확인
- [ ] 모바일/태블릿 해상도 테스트 (선택 사항)

**예상 시간**: 2일

---

## 🔗 Dependency Graph

```
Week 1 (Visual)
├── Task 1.1 → Task 1.3 (애니메이터 → 감정 오라)
├── Task 1.2 (에셋) [병렬 가능]
└── Task 1.4 (배경) [병렬 가능]

Week 2 (AI Logic)
├── Task 2.1 → Task 2.2 (시너지 평가 → 최적 배치)
└── Task 2.3 (가구 ROI) [병렬 가능]

Week 3 (Integration)
├── Task 3.1 (제안 UI) [Week 1 + Week 2 완료 필요]
├── Task 3.2 (말풍선) [Week 1 완료 필요]
├── Task 3.3 (파티클) [Week 1 완료 필요]
└── Task 3.4 (연결선) [Week 2 완료 필요]

Week 4 (Polish)
├── Task 4.1 (최적화) [Week 3 완료 필요]
├── Task 4.2 (밸런싱) [Week 3 완료 필요]
├── Task 4.3 (튜토리얼) [Week 3 완료 필요]
└── Task 4.4 (버그 수정) [모든 작업 완료 필요]
```

**병렬 실행 가능 작업**:
- Week 1: Task 1.2 (에셋) + Task 1.4 (배경)
- Week 2: Task 2.3 (가구 ROI) 단독 진행 가능
- Week 3: Task 3.2 (말풍선) + Task 3.3 (파티클) 동시 진행

---

## 📊 Quality Gates (검증 체크포인트)

### Week 1 Checkpoint
- [ ] 스프라이트 애니메이션 60fps 유지
- [ ] 5가지 상태 전환 정상 동작 (WORKING/TRADING/BREAK/PANIC/IDLE)
- [ ] 감정 오라 렌더링 확인 (3가지 색상)
- [ ] 배경 진화 레벨 3개 이상 구현

### Week 2 Checkpoint
- [ ] 시너지 계산 정확도 검증 (수동 계산과 비교)
- [ ] AI 제안 생성 속도 <500ms
- [ ] 가구 ROI 우선순위 정렬 정확성

### Week 3 Checkpoint
- [ ] 제안 UI 사용성 테스트 (5명 이상)
- [ ] 승인 후 자동 실행 정상 동작
- [ ] 파티클 이펙트 성능 영향 <5% (fps 기준)

### Week 4 Checkpoint
- [ ] 100명 직원 환경에서 60fps 유지
- [ ] AI 밸런스 만족도 ≥80% (플레이테스터 설문)
- [ ] 튜토리얼 완수율 ≥90%
- [ ] 크리티컬 버그 0개

---

## 🚀 Implementation Strategy

### 개발 우선순위
1. **High Priority**: Week 1 (시각적 기초) - 즉각적인 사용자 가치
2. **High Priority**: Week 2 (AI 로직) - 핵심 차별화 기능
3. **Medium Priority**: Week 3 (통합) - 사용자 경험 완성
4. **Medium Priority**: Week 4 (폴리싱) - 품질 보증

### 리스크 관리
| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|-----------|
| 픽셀 아트 에셋 지연 | 중 | 중 | 플레이스홀더 사용, 외주 병렬 진행 |
| AI 알고리즘 성능 이슈 | 중 | 고 | Greedy → Simulated Annealing 대비 |
| 애니메이션 프레임 드롭 | 중 | 중 | Canvas Layering, Culling 조기 적용 |
| 밸런스 조정 시간 초과 | 저 | 중 | Week 4를 Week 3과 병렬 시작 |

### 코드 리뷰 체크포인트
- Week 1 종료 시: 스프라이트 시스템 아키텍처 리뷰
- Week 2 종료 시: AI 알고리즘 로직 리뷰
- Week 3 종료 시: 전체 통합 코드 리뷰
- Week 4 종료 시: 최종 품질 검증

---

## 📁 File Structure (예상)

```
src/
├── systems/
│   ├── spriteAnimator.ts          (Task 1.1)
│   ├── emotionRenderer.ts         (Task 1.3)
│   ├── aiArchitect.ts             (Task 2.1, 2.2)
│   ├── furnitureRoi.ts            (Task 2.3)
│   └── particleSystem.ts          (Task 3.3)
├── components/
│   ├── windows/
│   │   ├── OfficeWindow.tsx       (수정)
│   │   └── AIProposalWindow.tsx   (Task 3.1)
│   ├── office/
│   │   ├── BlueprintOverlay.tsx   (Task 3.1)
│   │   ├── SpeechBubble.tsx       (Task 3.2)
│   │   └── SynergyLines.tsx       (Task 3.4)
│   └── tutorial/
│       └── AIArchitectTutorial.tsx (Task 4.3)
├── data/
│   ├── officeBackgrounds.ts       (Task 1.4)
│   └── chatter.ts                 (수정 - Task 3.2)
├── config/
│   └── aiArchitectConfig.ts       (Task 4.2)
└── assets/
    └── sprites/                   (Task 1.2)
        ├── employee_base.png
        ├── emotions.png
        └── furniture_sprites.png
```

---

## 🎯 Success Criteria

### 기능 완성도
- ✅ 5가지 직원 애니메이션 상태 구현
- ✅ AI 배치 제안 시스템 정상 동작
- ✅ 제안/승인 워크플로우 완성
- ✅ 3단계 이상 배경 진화
- ✅ 파티클 이펙트 & 사운드 통합

### 성능 기준
- ✅ 60fps 유지 (100명 직원)
- ✅ AI 제안 생성 <500ms
- ✅ 메모리 사용량 증가 <50MB (기존 대비)

### 사용자 경험
- ✅ 튜토리얼 완주율 ≥90%
- ✅ AI 제안 수용률 ≥70%
- ✅ 플레이테스터 만족도 ≥4.0/5.0

---

## 🔄 Post-Implementation

### 우선순위 개선 사항 (추후 Sprint)
1. **모바일 지원**: 터치 제스처, 반응형 레이아웃
2. **고급 AI 모드**: Genetic Algorithm 기반 전역 최적화
3. **커스텀 배치 저장**: 플레이어가 만든 레이아웃 템플릿 저장/로드
4. **멀티플레이어**: 친구 오피스 방문 및 배치 비교

### 유지보수 계획
- **월별 밸런스 패치**: AI 정확도, 가구 가격 조정
- **분기별 콘텐츠 업데이트**: 신규 가구 타입, 특성 추가
- **성능 모니터링**: Sentry 또는 LogRocket 통합

---

## 📝 Notes

- 이 워크플로우는 **구현 계획**입니다. 실제 코드 작성은 `/sc:implement`로 실행하세요.
- 각 Task는 독립적으로 검증 가능하도록 설계되었습니다.
- 병렬 작업 가능 시 팀원 간 작업 분배를 고려하세요.
- 예상 시간은 1인 개발 기준이며, 팀 규모에 따라 조정 가능합니다.

---

**생성 일시**: 2026-02-16
**워크플로우 버전**: v1.0
**예상 완료일**: 2026-03-15

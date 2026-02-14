# 기능 개선 구현 워크플로우

**생성일**: 2026-02-14
**전략**: Systematic Implementation
**예상 기간**: 5-7일 (병렬 작업 가능 시 3-4일)

---

## 📋 개선 사항 요약

1. **뉴스-주가 차트 연동 시뮬레이션** - 이벤트 마커 + 영향 분석
2. **매매 창 UX 개선** - 가격 변동 중 안정적인 선택 보장
3. **차트 필터 시스템 강화** - 섹터/가격/검색 필터 추가
4. **직원 AI 인터랙션** - 상세 정보 패널 + 실시간 작업 로그
5. **[공통] 창 크기 조절** - 리사이즈 핸들 구현

---

## 🎯 전체 구현 단계

### Phase 1: 공통 인프라 구축 (2일)
**목표**: 모든 기능 개선의 기반이 되는 공통 시스템 구축

#### Task 1.1: 창 크기 조절 시스템 구현 ⭐️ **[우선순위: HIGH]**
**담당**: Frontend Architecture
**예상 시간**: 1일
**영향 범위**: 모든 창 컴포넌트

**구현 세부사항**:
- **파일 수정**: `src/components/windows/WindowFrame.tsx`
- **새 기능**:
  - 리사이즈 핸들 추가 (8방향: 상하좌우 + 대각선 4개)
  - 최소/최대 크기 제약 조건 설정
  - 리사이즈 중 미리보기 오버레이
  - 창 타입별 기본 크기 및 최소 크기 정의

**구현 단계**:
```typescript
// 1. WindowFrame.tsx에 리사이즈 핸들 추가
interface ResizeHandle {
  position: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  cursor: string
}

// 2. useResizable 커스텀 훅 생성
const useResizable = (windowId: string, minWidth: number, minHeight: number) => {
  const [isResizing, setIsResizing] = useState(false)
  const handleMouseDown = (handle: ResizeHandle) => { /* ... */ }
  return { isResizing, handleMouseDown, resizeHandles }
}

// 3. gameStore에 창 타입별 크기 제약 추가
const WINDOW_SIZE_CONSTRAINTS: Record<WindowType, {
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
}> = {
  chart: { minWidth: 400, minHeight: 300 },
  trading: { minWidth: 320, minHeight: 280 },
  // ...
}
```

**검증 기준**:
- [ ] 모든 방향으로 드래그 가능
- [ ] 최소 크기 이하로 축소 불가
- [ ] 화면 밖으로 리사이즈 방지
- [ ] 리사이즈 중 컨텐츠 레이아웃 유지

**의존성**: 없음 (독립 작업)

---

#### Task 1.2: 이벤트 추적 시스템 개선
**담당**: State Management + Worker Integration
**예상 시간**: 0.5일
**영향 범위**: `gameStore.ts`, `tickEngine.ts`

**구현 세부사항**:
- **확장할 타입**: `MarketEvent`, `NewsItem`
- **새로운 필드**:
  ```typescript
  interface MarketEvent {
    // 기존 필드...
    startTimestamp: GameTime        // 이벤트 시작 시점
    priceImpactSnapshot: Record<string, {
      preBefore: number             // 이벤트 발생 전 가격
      peakChange: number            // 최대 변화량
      currentChange: number         // 현재 변화량
    }>
  }

  interface NewsItem {
    // 기존 필드...
    relatedCompanies?: string[]     // 영향받은 기업 ID 목록
    impactSummary?: string          // 자동 생성된 영향 요약
  }
  ```

**구현 단계**:
1. `tickEngine.ts` - `generateRandomEvent()` 수정:
   - 이벤트 생성 시 현재 가격 스냅샷 저장
   - `affectedSectors`에 속한 모든 기업 목록 추출
2. `gameStore.ts` - `updatePrices()` 수정:
   - 활성 이벤트에 대해 가격 변화 추적
   - `peakChange` 업데이트 로직 추가
3. 이벤트 종료 시 최종 영향 통계 계산

**검증 기준**:
- [ ] 이벤트 시작 시 초기 가격 저장
- [ ] 가격 업데이트마다 변화량 추적
- [ ] 이벤트 종료 후 통계 접근 가능

**의존성**: 없음

---

### Phase 2: 개별 기능 구현 (3-4일, 병렬 가능)

#### Task 2.1: 뉴스-주가 차트 연동 시뮬레이션 📊
**담당**: Chart Visualization
**예상 시간**: 1.5일
**영향 범위**: `ChartWindow.tsx`, 새 컴포넌트 생성

**구현 세부사항**:

**2.1.1 이벤트 마커 오버레이 컴포넌트**
- **새 파일**: `src/components/windows/EventMarkerPlugin.tsx`
```typescript
// Chart.js 플러그인 방식으로 이벤트 마커 렌더링
const EventMarkerPlugin = {
  id: 'eventMarker',
  afterDatasetsDraw: (chart: ChartJS, args: any, options: any) => {
    const ctx = chart.ctx
    const events = options.events || []

    events.forEach(event => {
      // 이벤트 발생 시점에 수직선 + 아이콘 표시
      const x = chart.scales.x.getPixelForValue(event.tickIndex)
      ctx.strokeStyle = event.severity === 'critical' ? 'red' : 'orange'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, chart.chartArea.top)
      ctx.lineTo(x, chart.chartArea.bottom)
      ctx.stroke()

      // 호버 시 툴팁 표시 로직
    })
  }
}
```

**2.1.2 ChartWindow 확장**
- **수정 파일**: `src/components/windows/ChartWindow.tsx`
- **새 기능**:
  - 이벤트 마커 토글 버튼
  - 이벤트 필터 (진행중/종료/전체)
  - 마커 클릭 시 이벤트 상세 정보 표시

```typescript
// 현재 선택된 기업에 영향을 준 이벤트만 필터링
const relevantEvents = useMemo(() => {
  return events.filter(evt =>
    !evt.affectedSectors ||
    evt.affectedSectors.includes(selectedCompany.sector) ||
    evt.affectedCompanies?.includes(selectedCompany.id)
  )
}, [events, selectedCompany])

// 차트 데이터와 이벤트 시점 매핑
const eventMarkers = relevantEvents.map(evt => ({
  tickIndex: calculateTickIndex(evt.startTimestamp, priceHistory),
  title: evt.title,
  severity: evt.impact.severity,
  priceChange: evt.priceImpactSnapshot[selectedCompany.id]?.currentChange
}))
```

**2.1.3 이벤트 영향 분석 패널**
- **새 컴포넌트**: `src/components/windows/EventImpactPanel.tsx`
- **기능**:
  - 선택한 이벤트의 영향받은 기업 목록
  - 기업별 가격 변화율 그래프 (before → peak → current)
  - 예상 vs 실제 영향 비교 (drift/volatility modifier 기반)

**검증 기준**:
- [ ] 차트에서 이벤트 발생 시점 시각적으로 확인 가능
- [ ] 마커 클릭 시 이벤트 상세 정보 표시
- [ ] 이벤트 전후 가격 변화 정량적으로 표시
- [ ] 여러 이벤트가 겹칠 때도 명확하게 구분

**의존성**: Task 1.2 완료 필요

---

#### Task 2.2: 매매 창 UX 개선 (가격 안정화) 🛒
**담당**: UI/UX Optimization
**예상 시간**: 0.5일
**영향 범위**: `TradingWindow.tsx`

**구현 세부사항**:

**2.2.1 가격 업데이트 Debounce**
```typescript
// TradingWindow.tsx 수정
import { useDeferredValue } from 'react'

export function TradingWindow() {
  // 실시간 가격은 계속 업데이트되지만,
  // 드롭다운 표시용 가격은 지연 적용
  const companies = useGameStore(s => s.companies)
  const deferredCompanies = useDeferredValue(companies)

  // 또는 커스텀 훅 사용
  const stableCompanies = useStableCompanies(companies, 500) // 500ms 안정화
}

// hooks/useStableCompanies.ts
export function useStableCompanies(companies: Company[], delay: number) {
  const [stable, setStable] = useState(companies)

  useEffect(() => {
    const timer = setTimeout(() => setStable(companies), delay)
    return () => clearTimeout(timer)
  }, [companies, delay])

  return stable
}
```

**2.2.2 드롭다운 개선**
- **선택 모드 활성화 시 가격 고정**:
  ```typescript
  const [isSelecting, setIsSelecting] = useState(false)

  // 드롭다운 열릴 때 현재 가격 스냅샷 저장
  const handleDropdownOpen = () => {
    setIsSelecting(true)
    setPriceSnapshot(companies.map(c => ({ id: c.id, price: c.price })))
  }

  // 선택 완료 후 최신 가격으로 업데이트
  const handleCompanySelect = (id: string) => {
    setSelectedId(id)
    setIsSelecting(false)
    // 이제 실시간 가격 표시
  }
  ```

**2.2.3 대체 UI - 검색 가능한 콤보박스**
- **새 컴포넌트**: `src/components/ui/CompanySearchCombobox.tsx`
- **기능**:
  - 티커/이름으로 검색 필터링
  - 키보드 네비게이션 (↑↓ 방향키)
  - 가격 변동률 색상 표시

**검증 기준**:
- [ ] 드롭다운 선택 중 가격 변경 시 선택 방해 없음
- [ ] 선택 완료 후 최신 가격으로 자동 업데이트
- [ ] 티커/이름 검색 기능 정상 작동
- [ ] 모바일/키보드 접근성 유지

**의존성**: 없음 (독립 작업)

---

#### Task 2.3: 차트 필터 시스템 강화 🔍
**담당**: Search & Filter UX
**예상 시간**: 1일
**영향 범위**: `ChartWindow.tsx`, 새 컴포넌트

**구현 세부사항**:

**2.3.1 고급 필터 패널 컴포넌트**
- **새 파일**: `src/components/windows/ChartFilterPanel.tsx`
```typescript
interface ChartFilters {
  sectors: Sector[]              // 섹터 다중 선택
  priceRange: [number, number]   // 가격 범위
  changePercent: {               // 등락률 필터
    min: number
    max: number
  }
  sortBy: 'name' | 'price' | 'change' | 'volume'
  searchTerm: string             // 티커/이름 검색
}

export function ChartFilterPanel({
  filters,
  onFilterChange
}: {
  filters: ChartFilters
  onFilterChange: (filters: ChartFilters) => void
}) {
  return (
    <div className="win-inset bg-white p-2 space-y-2">
      {/* 검색 입력 */}
      <input
        type="text"
        placeholder="종목 검색 (티커/이름)"
        value={filters.searchTerm}
        onChange={e => onFilterChange({
          ...filters,
          searchTerm: e.target.value
        })}
      />

      {/* 섹터 체크박스 그룹 */}
      <fieldset>
        <legend>섹터</legend>
        {SECTORS.map(sector => (
          <label key={sector}>
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={/* ... */}
            />
            {SECTOR_LABELS[sector]}
          </label>
        ))}
      </fieldset>

      {/* 가격 범위 슬라이더 */}
      <div>
        <label>가격 범위</label>
        <RangeSlider
          min={0}
          max={maxPrice}
          value={filters.priceRange}
          onChange={/* ... */}
        />
        <span>{filters.priceRange[0]} - {filters.priceRange[1]}원</span>
      </div>

      {/* 등락률 필터 */}
      <div>
        <label>등락률</label>
        <select value={filters.changePercent.preset}>
          <option value="all">전체</option>
          <option value="up5">+5% 이상</option>
          <option value="down5">-5% 이하</option>
          <option value="stable">±2% 이내</option>
        </select>
      </div>

      {/* 정렬 */}
      <select value={filters.sortBy}>
        <option value="name">이름순</option>
        <option value="price">가격순</option>
        <option value="change">등락률순</option>
      </select>
    </div>
  )
}
```

**2.3.2 ChartWindow 통합**
```typescript
// ChartWindow.tsx 수정
const [filters, setFilters] = useState<ChartFilters>(DEFAULT_FILTERS)
const [showFilters, setShowFilters] = useState(false)

// 필터링된 기업 목록
const filteredCompanies = useMemo(() => {
  return companies.filter(c => {
    // 검색어 필터
    if (filters.searchTerm &&
        !c.name.includes(filters.searchTerm) &&
        !c.ticker.includes(filters.searchTerm.toUpperCase())) {
      return false
    }

    // 섹터 필터
    if (filters.sectors.length > 0 &&
        !filters.sectors.includes(c.sector)) {
      return false
    }

    // 가격 범위 필터
    if (c.price < filters.priceRange[0] ||
        c.price > filters.priceRange[1]) {
      return false
    }

    // 등락률 필터
    const changePercent = ((c.price - c.previousPrice) / c.previousPrice) * 100
    if (changePercent < filters.changePercent.min ||
        changePercent > filters.changePercent.max) {
      return false
    }

    return true
  }).sort((a, b) => {
    // 정렬 로직
    switch (filters.sortBy) {
      case 'price': return b.price - a.price
      case 'change': return getChangePercent(b) - getChangePercent(a)
      default: return a.name.localeCompare(b.name)
    }
  })
}, [companies, filters])
```

**2.3.3 필터 프리셋 저장**
- **기능**: 사용자 정의 필터 조합을 프리셋으로 저장
- **저장 위치**: localStorage 또는 gameStore
```typescript
interface FilterPreset {
  id: string
  name: string
  filters: ChartFilters
}

// 프리셋 관리
const saveFilterPreset = (name: string, filters: ChartFilters) => {
  const preset: FilterPreset = {
    id: `preset-${Date.now()}`,
    name,
    filters
  }
  localStorage.setItem(`filter-preset-${preset.id}`, JSON.stringify(preset))
}
```

**검증 기준**:
- [ ] 모든 필터가 정확하게 작동
- [ ] 필터 조합 시 교집합 정상 적용
- [ ] 검색어 입력 시 즉시 반영 (debounce 200ms)
- [ ] 필터 초기화 버튼 작동
- [ ] 프리셋 저장/불러오기 정상 작동

**의존성**: 없음 (독립 작업)

---

#### Task 2.4: 직원 AI 인터랙션 강화 🤖
**담당**: Employee System Enhancement
**예상 시간**: 1.5일
**영향 범위**: `OfficeWindow.tsx`, 새 컴포넌트, `gameStore.ts`

**구현 세부사항**:

**2.4.1 직원 활동 로그 시스템**
- **gameStore.ts 확장**:
```typescript
interface Employee {
  // 기존 필드...
  activityLog: EmployeeActivity[]
  currentTask?: EmployeeTask
  productivity: number  // 0-100, 보너스 효과 반영
}

interface EmployeeActivity {
  id: string
  timestamp: GameTime
  type: 'analysis' | 'trade' | 'research' | 'rest'
  description: string
  result?: string       // "발견: 삼성전자 매수 기회" 등
  impactMetrics?: {
    profitContribution?: number
    riskReduction?: number
  }
}

interface EmployeeTask {
  type: 'analyzing' | 'trading' | 'monitoring'
  target?: string       // 회사 ID
  progress: number      // 0-100
  startedAt: GameTime
}
```

- **자동 활동 생성 로직**:
```typescript
// tickEngine.ts 또는 새로운 employeeEngine.ts
function generateEmployeeActivities(employees: Employee[], companies: Company[]) {
  employees.forEach(emp => {
    // 역할에 따라 다른 활동 확률
    const activityChance = EMPLOYEE_ROLE_CONFIG[emp.role].activityFrequency

    if (Math.random() < activityChance) {
      const activity = generateActivityForRole(emp.role, companies)
      store.addEmployeeActivity(emp.id, activity)
    }
  })
}

function generateActivityForRole(role: EmployeeRole, companies: Company[]): EmployeeActivity {
  switch (role) {
    case 'analyst':
      // 고평가/저평가 종목 분석
      const undervalued = findUndervaluedStock(companies)
      return {
        type: 'analysis',
        description: `${undervalued.name} 저평가 분석 완료`,
        result: `현재가 대비 ${undervalued.potentialUpside}% 상승 여력`
      }

    case 'trader':
      // 거래 타이밍 분석
      return {
        type: 'trade',
        description: `단기 매매 기회 포착`,
        result: `변동성 활용 전략 제시`
      }

    case 'manager':
      // 포트폴리오 리밸런싱 제안
      return {
        type: 'research',
        description: `포트폴리오 리스크 평가`,
        result: `분산 투자 개선안 제시`
      }

    // ...
  }
}
```

**2.4.2 직원 상세 패널 컴포넌트**
- **새 파일**: `src/components/windows/EmployeeDetailPanel.tsx`
```typescript
export function EmployeeDetailPanel({ employee }: { employee: Employee }) {
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'stats'>('info')

  return (
    <div className="employee-detail-panel win-outset bg-win-face p-2">
      {/* 탭 헤더 */}
      <div className="tabs flex gap-1 mb-2">
        <RetroButton
          size="sm"
          variant={activeTab === 'info' ? 'primary' : 'default'}
          onClick={() => setActiveTab('info')}
        >
          기본 정보
        </RetroButton>
        <RetroButton
          size="sm"
          variant={activeTab === 'activity' ? 'primary' : 'default'}
          onClick={() => setActiveTab('activity')}
        >
          활동 로그
        </RetroButton>
        <RetroButton
          size="sm"
          variant={activeTab === 'stats' ? 'primary' : 'default'}
          onClick={() => setActiveTab('stats')}
        >
          통계
        </RetroButton>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'info' && (
        <div className="space-y-2">
          <div>
            <strong>{employee.name}</strong>
            <span className="text-retro-gray ml-2">
              {EMPLOYEE_ROLE_CONFIG[employee.role].title}
            </span>
          </div>

          {/* 현재 작업 */}
          {employee.currentTask && (
            <div className="win-inset bg-white p-1">
              <div className="text-xs text-retro-gray">현재 작업</div>
              <div>{TASK_LABELS[employee.currentTask.type]}</div>
              <ProgressBar value={employee.currentTask.progress} />
            </div>
          )}

          {/* 보너스 효과 시각화 */}
          <div className="win-inset bg-white p-1 space-y-1">
            <div className="text-xs font-bold">능력치</div>
            {Object.entries(employee.bonus).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span>{BONUS_LABELS[key]}</span>
                <span className="text-stock-up">
                  {value > 0 ? '+' : ''}{(value * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {employee.activityLog.slice(-20).reverse().map(activity => (
            <div key={activity.id} className="win-inset bg-white p-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-retro-gray">
                  {formatTimestamp(activity.timestamp)}
                </span>
                <span className={`px-1 ${ACTIVITY_TYPE_COLORS[activity.type]}`}>
                  {ACTIVITY_TYPE_LABELS[activity.type]}
                </span>
              </div>
              <div>{activity.description}</div>
              {activity.result && (
                <div className="text-retro-gray mt-0.5">
                  → {activity.result}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-2">
          <div className="win-inset bg-white p-1">
            <div className="text-xs font-bold mb-1">생산성 지표</div>
            <ProgressBar
              value={employee.productivity}
              label={`${employee.productivity}%`}
              color={employee.productivity > 70 ? 'green' : 'yellow'}
            />
          </div>

          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="win-inset bg-white p-1">
              <div className="text-retro-gray">총 활동</div>
              <div className="font-bold">{employee.activityLog.length}건</div>
            </div>
            <div className="win-inset bg-white p-1">
              <div className="text-retro-gray">근무 기간</div>
              <div className="font-bold">
                {calculateTenure(employee.hiredMonth)}개월
              </div>
            </div>
          </div>

          {/* 활동 타입별 분포 차트 */}
          <ActivityPieChart activities={employee.activityLog} />
        </div>
      )}
    </div>
  )
}
```

**2.4.3 OfficeWindow 통합**
```typescript
// OfficeWindow.tsx 수정
const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

return (
  <div className="flex gap-2">
    {/* 왼쪽: 직원 목록 */}
    <div className="flex-1 space-y-1">
      {player.employees.map(emp => (
        <div
          key={emp.id}
          className={`employee-card cursor-pointer ${
            selectedEmployee?.id === emp.id ? 'win-pressed' : 'win-outset'
          }`}
          onClick={() => setSelectedEmployee(emp)}
        >
          {/* 기존 직원 카드 UI */}

          {/* 현재 작업 표시 추가 */}
          {emp.currentTask && (
            <div className="text-[10px] text-retro-gray truncate">
              {TASK_LABELS[emp.currentTask.type]}...
            </div>
          )}
        </div>
      ))}
    </div>

    {/* 오른쪽: 선택된 직원 상세 패널 */}
    {selectedEmployee && (
      <div className="w-64">
        <EmployeeDetailPanel employee={selectedEmployee} />
      </div>
    )}
  </div>
)
```

**2.4.4 실시간 작업 시뮬레이션**
- **새 파일**: `src/engines/employeeEngine.ts`
```typescript
// 틱마다 직원 작업 진행률 업데이트
export function updateEmployeeTasks(employees: Employee[]) {
  return employees.map(emp => {
    if (!emp.currentTask) {
      // 새 작업 할당 (확률 기반)
      if (Math.random() < 0.05) {
        return {
          ...emp,
          currentTask: generateNewTask(emp.role)
        }
      }
      return emp
    }

    // 작업 진행
    const progressIncrement = calculateProgressSpeed(emp)
    const newProgress = emp.currentTask.progress + progressIncrement

    if (newProgress >= 100) {
      // 작업 완료 → 활동 로그 추가
      const activity = convertTaskToActivity(emp.currentTask)
      return {
        ...emp,
        currentTask: undefined,
        activityLog: [...emp.activityLog, activity],
        productivity: Math.min(100, emp.productivity + 1)
      }
    }

    return {
      ...emp,
      currentTask: {
        ...emp.currentTask,
        progress: newProgress
      }
    }
  })
}

// tickEngine.ts에 통합
function tick() {
  // ...기존 틱 로직

  // 직원 작업 업데이트
  const updatedEmployees = updateEmployeeTasks(state.player.employees)
  useGameStore.setState(s => ({
    player: {
      ...s.player,
      employees: updatedEmployees
    }
  }))
}
```

**검증 기준**:
- [ ] 직원 클릭 시 상세 패널 표시
- [ ] 활동 로그가 실시간으로 쌓임
- [ ] 현재 작업이 진행률과 함께 표시
- [ ] 보너스 효과가 명확하게 시각화
- [ ] 역할별로 다른 활동 타입 생성

**의존성**: Task 1.1 (창 크기 조절 - 상세 패널 레이아웃 고려)

---

### Phase 3: 통합 및 테스트 (1-2일)

#### Task 3.1: 전체 기능 통합 테스트
**담당**: QA + Integration
**예상 시간**: 1일

**테스트 시나리오**:

1. **창 크기 조절 + 차트 필터**
   - 차트 창 크기 조절 시 필터 패널 레이아웃 유지
   - 최소 크기에서도 필터 UI 사용 가능

2. **이벤트 마커 + 필터**
   - 섹터 필터 적용 시 해당 섹터 이벤트만 마커 표시
   - 이벤트 마커 클릭 시 상세 패널이 창 밖으로 나가지 않음

3. **매매 창 + 차트 연동**
   - 매매 창에서 기업 선택 시 차트 창 자동 업데이트
   - 가격 안정화 상태에서도 차트는 실시간 반영

4. **직원 패널 + 이벤트**
   - 중대 이벤트 발생 시 직원들이 관련 분석 활동 생성
   - 직원 상세 패널 내 활동 로그에 이벤트 연관 표시

**성능 테스트**:
- [ ] 모든 창 동시 열림 시 60fps 유지
- [ ] 이벤트 마커 50개 이상 표시 시 렌더링 지연 없음
- [ ] 필터 적용 시 100ms 이내 반영
- [ ] 직원 20명 이상 시 활동 로그 업데이트 부하 없음

**회귀 테스트**:
- [ ] 기존 게임 저장 파일 로드 정상 작동
- [ ] 엔딩 시나리오 트리거 정상
- [ ] 자동 저장 정상 작동

---

#### Task 3.2: 사용자 경험 개선 및 폴리싱
**담당**: UX Polish
**예상 시간**: 0.5일

**개선 항목**:

1. **애니메이션 추가**
   - 창 리사이즈 시 부드러운 전환 (transition: width 200ms, height 200ms)
   - 이벤트 마커 호버 시 스케일 확대 효과
   - 직원 작업 진행률 바 애니메이션
   - 필터 적용 시 페이드 인/아웃

2. **키보드 단축키**
   - `F` - 차트 필터 패널 토글
   - `E` - 이벤트 마커 표시 토글
   - `Alt + 숫자` - 직원 빠른 선택
   - `Ctrl + F` - 기업 검색 포커스

3. **접근성**
   - 모든 인터랙티브 요소에 aria-label 추가
   - 키보드로만 모든 기능 사용 가능
   - 스크린 리더 지원

4. **에러 처리**
   - 이벤트 데이터 없을 때 대체 UI
   - 직원 활동 로그 로딩 실패 시 재시도 버튼
   - 필터 적용 결과 0건 시 안내 메시지

**검증 기준**:
- [ ] 모든 애니메이션 부드럽게 작동
- [ ] 키보드 단축키 정상 작동
- [ ] 스크린 리더로 주요 기능 접근 가능
- [ ] 에러 상황에서도 게임 중단 없음

---

## 📊 구현 우선순위 및 병렬화 전략

### 우선순위 순서
1. **Task 1.1** (창 크기 조절) - 모든 다른 작업의 기반
2. **Task 2.2** (매매 창 UX) - 빠른 개선, 사용자 체감 큼
3. **Task 1.2** (이벤트 추적) - Task 2.1의 전제조건
4. **Task 2.1, 2.3, 2.4** (병렬 가능)
5. **Task 3.1, 3.2** (통합 및 폴리싱)

### 병렬 작업 가능 조합
- **Track A**: Task 1.1 → Task 2.1 (이벤트 시각화)
- **Track B**: Task 2.2 (매매 창) → Task 2.3 (차트 필터)
- **Track C**: Task 1.2 → Task 2.4 (직원 시스템)

**예상 일정 (병렬 작업 시)**:
- Day 1: Task 1.1 (창 크기 조절)
- Day 2: Task 2.2 (매매 창) + Task 1.2 (이벤트 추적) 시작
- Day 3: Task 2.3 (차트 필터) + Task 2.1 (이벤트 시각화) 병렬
- Day 4: Task 2.4 (직원 시스템)
- Day 5: Task 3.1 (통합 테스트) + Task 3.2 (폴리싱) 시작

---

## 🔧 기술 스택 및 도구

### 새로 추가될 라이브러리 (선택적)
```json
{
  "devDependencies": {
    "@types/lodash.debounce": "^4.0.9",    // Debounce 타입
    "lodash.debounce": "^4.0.8"            // 가격 안정화용
  },
  "dependencies": {
    "react-range": "^1.8.14"               // 가격 범위 슬라이더
  }
}
```

### 코드 품질 도구
- ESLint - 기존 설정 유지
- Prettier - 기존 설정 유지
- TypeScript strict mode - 모든 신규 코드 타입 안전성 보장

---

## 📝 문서화 요구사항

각 Task 완료 시 다음 문서 업데이트:

1. **CLAUDE.md** 업데이트
   - 새로운 컴포넌트 설명 추가
   - 상태 관리 변경사항 반영

2. **컴포넌트 주석**
   - 모든 새 컴포넌트에 JSDoc 주석
   - Props 인터페이스 설명 추가

3. **타입 정의**
   - `src/types/index.ts`에 새 타입 추가 시 주석 필수

---

## ✅ 최종 검증 체크리스트

### 기능 완성도
- [ ] 1. 뉴스-주가 차트 연동: 이벤트 마커 + 영향 분석 완료
- [ ] 2. 매매 창 UX: 가격 변동 중 안정적 선택 가능
- [ ] 3. 차트 필터: 섹터/가격/검색 모두 작동
- [ ] 4. 직원 AI: 상세 패널 + 실시간 로그 표시
- [ ] 5. 창 크기 조절: 8방향 리사이즈 가능

### 성능
- [ ] 60fps 유지 (모든 창 동시 열림 시)
- [ ] 메모리 누수 없음 (10분 이상 플레이)
- [ ] 이벤트 50개 이상 처리 무리 없음

### 호환성
- [ ] 기존 세이브 파일 로드 정상
- [ ] 모든 난이도에서 작동
- [ ] 브라우저 (Chrome, Firefox, Safari) 호환

### 사용자 경험
- [ ] 모든 기능 직관적으로 접근 가능
- [ ] 에러 상황 graceful handling
- [ ] 키보드 네비게이션 지원

---

## 🚀 배포 전 최종 단계

1. **빌드 테스트**
   ```bash
   npm run build
   npm run preview
   ```

2. **프로덕션 성능 프로파일링**
   - Chrome DevTools Performance 탭으로 병목 확인
   - React DevTools Profiler로 불필요한 리렌더 검사

3. **번들 크기 확인**
   ```bash
   npx vite-bundle-visualizer
   ```
   - 새 기능으로 인한 번들 증가 < 50KB 목표

---

## 📌 다음 단계 (이 워크플로우 이후)

구현 완료 후 다음 명령으로 실제 구현 시작:

```bash
/sc:implement claudedocs/workflow_feature_improvements.md
```

또는 개별 Task 선택 구현:

```bash
/sc:implement claudedocs/workflow_feature_improvements.md --task 1.1
```

---

**워크플로우 생성 완료** ✅

이 문서는 **계획 단계 산출물**이며, 실제 코드 수정은 포함하지 않습니다.
구현 시작 시 위 명령어를 사용하거나 수동으로 각 Task를 진행하세요.
# 📋 통합 개발 계획서 - Retro Stock OS

**작성일**: 2026-02-14 17:36 KST  
**작성자**: 풀스택 개발팀  
**승인**: 프로젝트 총괄 실장  
**총 예상 기간**: Sprint 2~4 (3~4주)

---

## 🎯 Executive Summary

### 개발 목표
1. **기본 POC 완성** (48시간): GBM 엔진 + 차트 + 트레이딩
2. **UX/기능 개선** (5~7일): 워크플로우 문서 기반 5가지 개선
3. **재미 요소 추가** (2~3주): 경쟁 분석 기반 3가지 핵심 기능

### 예상 성과
- 평균 플레이 시간: 20분 → 60분 (3배 ↑)
- 재방문율: 10% → 40% (4배 ↑)
- 소셜 공유: 유저당 0.2회 목표

---

## 📅 전체 로드맵 (4 Sprints)

| Sprint | 기간 | 목표 | 주요 작업 | 담당 |
|--------|------|------|----------|------|
| **Sprint 1** | Day 1-2 | POC 완성 | GBM Engine, Chart, Trading | 전체 팀 |
| **Sprint 2** | Week 1 | UX 개선 | 워크플로우 5개 Task | Frontend + Backend |
| **Sprint 3** | Week 2 | 재미 요소 #1-2 | 주간 챌린지 + 인사이드 | Game Designer + Dev |
| **Sprint 4** | Week 3 | 재미 요소 #3 + 폴리싱 | M&A + 통합 테스트 | Full Team |

---

## 🔴 Sprint 1: POC 완성 (48시간)

### Day 1 (오늘/내일)

#### Ticket #P0-1: GameStore + 트레이딩 연결
**담당**: Frontend Lead  
**시간**: 4시간

**구현**:
```typescript
// src/stores/gameStore.ts 생성
interface GameStore {
  companies: Company[]
  player: PlayerState
  gameTime: GameTime
  windows: WindowState[]

  // 액션
  buyStock: (id: string, shares: number) => void
  sellStock: (id: string, shares: number) => void
  advanceTick: () => void
}

// TradingWindow.tsx 연결
const { companies, player, buyStock } = useGameStore()
```

**AC**:
- [ ] 매수 → 현금 차감 + 포트폴리오 증가
- [ ] Taskbar 동작 확인

---

#### Ticket #P0-2: ChartWindow + 더미 데이터
**담당**: Visualization  
**시간**: 6시간

**구현**:
```typescript
// ChartWindow.tsx 생성
import { Line } from 'react-chartjs-2'

const chartData = {
  labels: Array(100).fill(0).map((_, i) => i),
  datasets: [{
    data: generateDummyPrices(100),
  }]
}
```

**AC**:
- [ ] Chart 버튼 → 차트 윈도우
- [ ] 3개 회사 캔들 표시

---

### Day 2

#### Ticket #P0-3: WebWorker GBM 엔진
**담당**: Backend/Engine  
**시간**: 8시간

**구현**:
```typescript
// priceEngine.worker.ts
class GBMEngine {
  updatePrice(company: Company): number {
    const drift = 0.001
    const volatility = company.volatility
    const dW = this.randomNormal()
    return company.price * Math.exp(drift - volatility**2/2 + volatility * dW)
  }
}

// App.tsx에서 Worker 초기화
const worker = new Worker(new URL('./workers/priceEngine.worker.ts', import.meta.url))
```

**AC**:
- [ ] 실시간 주가 움직임 (200ms)
- [ ] 동일 시드 → 동일 결과

---

## 🟡 Sprint 2: UX/기능 개선 (Week 1)

### Phase 1: 공통 인프라 (Day 1-2)

#### Task #2-1: 창 크기 조절 시스템
**출처**: workflow_feature_improvements.md Task 1.1  
**담당**: Frontend Architecture  
**시간**: 1일

**구현**:
```typescript
// WindowFrame.tsx에 리사이즈 핸들
const useResizable = (windowId, minWidth, minHeight) => {
  const [isResizing, setIsResizing] = useState(false)
  const handleMouseDown = (direction: 'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw') => {
    // 8방향 리사이즈 로직
  }
  return { isResizing, handleMouseDown }
}
```

**AC**:
- [ ] 8방향 드래그 가능
- [ ] 최소 크기 제약
- [ ] 화면 밖 방지

---

#### Task #2-2: 이벤트 추적 시스템
**출처**: workflow_feature_improvements.md Task 1.2  
**시간**: 0.5일

**구현**:
```typescript
interface MarketEvent {
  startTimestamp: GameTime
  priceImpactSnapshot: Record<string, {
    priceBefore: number
    peakChange: number
    currentChange: number
  }>
}
```

**AC**:
- [ ] 이벤트 발생 시 가격 스냅샷
- [ ] 변화량 추적

---

### Phase 2: 개별 기능 (Day 3-5, 병렬)

#### Task #2-3: 뉴스-주가 차트 연동
**출처**: workflow_feature_improvements.md Task 2.1  
**시간**: 1.5일

**구현**:
```typescript
// EventMarkerPlugin.tsx (Chart.js 플러그인)
const EventMarkerPlugin = {
  id: 'eventMarker',
  afterDatasetsDraw: (chart, args, options) => {
    // 이벤트 시점에 수직선 + 아이콘
  }
}
```

**AC**:
- [ ] 차트에 이벤트 마커
- [ ] 클릭 시 상세 정보
- [ ] 전후 가격 변화 표시

---

#### Task #2-4: 매매 창 UX 개선
**출처**: workflow_feature_improvements.md Task 2.2  
**시간**: 0.5일

**구현**:
```typescript
// 가격 안정화
const stableCompanies = useStableCompanies(companies, 500) // 500ms debounce

// 드롭다운 열릴 때 가격 고정
const handleDropdownOpen = () => {
  setPriceSnapshot(companies)
}
```

**AC**:
- [ ] 선택 중 가격 변경 방해 없음
- [ ] 선택 후 최신 가격 반영

---

#### Task #2-5: 차트 필터 시스템
**출처**: workflow_feature_improvements.md Task 2.3  
**시간**: 1일

**구현**:
```typescript
// ChartFilterPanel.tsx
interface ChartFilters {
  sectors: Sector[]
  priceRange: [number, number]
  changePercent: { min: number; max: number }
  sortBy: 'name' | 'price' | 'change'
  searchTerm: string
}

const filteredCompanies = useMemo(() => {
  return companies.filter(/* 필터 로직 */).sort(/* 정렬 */)
}, [companies, filters])
```

**AC**:
- [ ] 섹터/가격/검색 필터 동작
- [ ] 필터 조합 정상
- [ ] 프리셋 저장/불러오기

---

#### Task #2-6: 직원 AI 인터랙션
**출처**: workflow_feature_improvements.md Task 2.4  
**시간**: 1.5일

**구현**:
```typescript
// EmployeeDetailPanel.tsx
interface EmployeeActivity {
  timestamp: GameTime
  type: 'analysis' | 'trade' | 'research' | 'rest'
  description: string
  result?: string
}

// 자동 활동 생성
function generateEmployeeActivities(employees, companies) {
  employees.forEach(emp => {
    if (Math.random() < ACTIVITY_CHANCE[emp.role]) {
      const activity = generateActivityForRole(emp.role)
      store.addEmployeeActivity(emp.id, activity)
    }
  })
}
```

**AC**:
- [ ] 직원 클릭 → 상세 패널
- [ ] 활동 로그 실시간
- [ ] 현재 작업 진행률 표시

---

### Phase 3: 통합 테스트 (Day 6-7)

#### Task #2-7: 통합 및 폴리싱
**시간**: 1일

**테스트 시나리오**:
1. 창 크기 조절 + 차트 필터 동시 사용
2. 이벤트 마커 + 필터 연동
3. 매매 창 + 차트 자동 연동
4. 직원 패널 + 이벤트 연관 활동

**애니메이션 추가**:
- 창 리사이즈 부드러운 전환
- 이벤트 마커 호버 효과
- 필터 적용 페이드

**AC**:
- [ ] 60fps 유지
- [ ] 모든 시나리오 정상
- [ ] 키보드 단축키 동작

---

## 🟢 Sprint 3: 재미 요소 #1-2 (Week 2)

### Feature #1: 주간 랭킹 챌린지

#### Task #3-1: 챌린지 시스템 구축
**담당**: Frontend + Backend  
**시간**: 3일

**구현**:
```typescript
// challenges.ts - 템플릿 5종
export const CHALLENGE_TEMPLATES: WeeklyChallengeTemplate[] = [
  {
    id: 'tech-boom',
    name: '반도체 붐 라이더',
    type: 'sector',
    targetSector: 'IT',
    condition: (player) => calculateSectorROI(player, 'IT'),
    reward: 100_000_000,
  },
  // ... 총 5개
]

// ChallengeWindow.tsx
export function ChallengeWindow() {
  const { activeChallenge } = useGameStore()
  return (
    <WindowFrame title="Weekly Challenge 🏆">
      <div className="challenge-timer">
        ⏰ {formatTimeLeft(activeChallenge.endTick)}
      </div>
      <ProgressBar current={activeChallenge.playerScore} target={100} />
      <div className="leaderboard">
        {activeChallenge.topScores.map((entry, i) => (
          <div>#{i+1} {entry.name} - {entry.score}%</div>
        ))}
      </div>
    </WindowFrame>
  )
}

// challengeSystem.ts
export class ChallengeSystem {
  checkAndStartChallenge(time: GameTime, store: GameStore) {
    if (time.tick % (7 * 3600 * 24) === 0) {
      const template = this.pickRandomTemplate()
      store.startWeeklyChallenge(template)
    }
  }
}
```

**AC**:
- [ ] 7일마다 자동 시작
- [ ] 실시간 점수 갱신
- [ ] TOP 10 보상 지급
- [ ] 로컬 랭킹 표시

---

### Feature #2: 인사이드 트레이딩 이벤트

#### Task #3-2: 인사이드 이벤트 시스템
**담당**: Game Designer + Frontend  
**시간**: 5일

**구현**:
```typescript
// insiderEvents.ts - 이벤트 10종
export const INSIDER_EVENTS: InsiderEvent[] = [
  {
    id: 'golf-exec',
    trigger: 'employee',
    title: '직원 A: "삼성전자 임원과 골프..."',
    description: '비용 500만원, HBM 정보 획득 가능',
    choices: [
      {
        label: '골프 치러 간다',
        cost: 5_000_000,
        successRate: 0.7,
        rewards: {
          onSuccess: {
            infoReveal: { companyId: 'samsung', futureTrend: 'up' }
          },
          onFailure: {
            cashChange: -5_000_000,
            stressChange: 10
          }
        }
      },
      { label: '정중히 거절', cost: 0, successRate: 1.0 }
    ],
    cooldown: 3600 * 24 * 30
  },
  // ... 총 10개
]

// InsiderEventModal.tsx
export function InsiderEventModal({ event }) {
  const handleChoice = (choice) => {
    const roll = Math.random()
    const isSuccess = roll < choice.successRate
    const outcome = isSuccess ? choice.rewards.onSuccess : choice.rewards.onFailure
    executeInsiderChoice(choice, outcome)
    setResult(isSuccess ? 'success' : 'failure')
  }

  return (
    <div className="insider-modal">
      <h3>{event.title}</h3>
      {event.choices.map(c => (
        <RetroButton onClick={() => handleChoice(c)}>
          {c.label} (-{c.cost.toLocaleString()})
          <small>성공률: {c.successRate * 100}%</small>
        </RetroButton>
      ))}
    </div>
  )
}

// insiderSystem.ts
export class InsiderSystem {
  checkTrigger(time, store) {
    if (time.tick % 100 === 0 && Math.random() < 0.1) {
      const event = this.pickRandomEvent()
      store.showInsiderEvent(event)
    }
  }

  applyInfoReveal(reveal, store) {
    const company = store.companies.find(c => c.id === reveal.companyId)
    company.futureDrift = reveal.futureTrend === 'up' ? 0.005 : -0.005
    company.driftExpiry = store.time.tick + 3600 * 24 * 90 // 3개월
  }
}
```

**AC**:
- [ ] 10% 확률로 이벤트 발생
- [ ] 선택지별 확률 정상 작동
- [ ] 정보 획득 시 주가 영향 반영
- [ ] 쿨다운 정상 작동

---

## 🟠 Sprint 4: 재미 요소 #3 + 폴리싱 (Week 3)

### Feature #3: M&A 미니게임

#### Task #4-1: M&A 시스템 구현
**담당**: Full Team  
**시간**: 7일

**구현**:
```typescript
// ma.ts
export interface MABid {
  bidder: 'player' | 'competitor'
  target: string
  offerPrice: number
  stage: 'proposal' | 'negotiation' | 'voting' | 'complete' | 'rejected'
}

// MAWindow.tsx
export function MAWindow({ bid }) {
  if (bid.stage === 'proposal') {
    return (
      <WindowFrame title="⚠️ M&A 제안">
        <p>{bid.bidder}가 인수 시도!</p>
        <RetroButton onClick={() => acceptBid(bid)}>
          수락 (자산 15% 양도)
        </RetroButton>
        <RetroButton onClick={() => setStage('negotiation')}>
          협상 테이블로
        </RetroButton>
        <RetroButton variant="danger" onClick={() => setStage('defense')}>
          방어 전략 선택
        </RetroButton>
      </WindowFrame>
    )
  }

  if (bid.stage === 'negotiation') {
    return <NegotiationTable bid={bid} />
  }

  if (bid.stage === 'defense') {
    return <DefenseOptions bid={bid} />
  }
}

// maSystem.ts
export class MASystem {
  checkMAOpportunity(store) {
    const topCompetitor = store.competitors.sort((a,b) => b.totalAssets - a.totalAssets)[0]
    if (topCompetitor.totalAssets > store.player.totalAssets * 0.8) {
      if (Math.random() < 0.1) {
        const bid = {
          bidder: topCompetitor.id,
          target: 'player',
          offerPrice: store.player.totalAssets * 0.15,
          stage: 'proposal'
        }
        store.startMABid(bid)
      }
    }
  }

  negotiateRound(bid, playerOffer) {
    const aiThreshold = bid.offerPrice * 0.9
    if (playerOffer >= aiThreshold) return 'accept'
    if (playerOffer < aiThreshold * 0.7) return 'reject'
    bid.offerPrice = playerOffer * 1.1
    return 'counter'
  }
}
```

**AC**:
- [ ] 경쟁사 80% 도달 시 10% 확률 트리거
- [ ] 3가지 선택지 정상 작동
- [ ] 협상 3라운드 AI 동작
- [ ] 방어 전략 확률 정상

---

### Task #4-2: 최종 통합 & QA
**시간**: 3일

**테스트 매트릭스**:

| 기능 조합 | 테스트 시나리오 | AC |
|----------|----------------|-----|
| 챌린지 + 인사이드 | 인사이드 정보로 챌린지 달성 | ✓ |
| M&A + 직원 | M&A 방어 시 직원 스트레스 반영 | ✓ |
| 차트 필터 + 이벤트 | 필터 적용 후 이벤트 마커 정상 | ✓ |
| 전체 재미 요소 | 동시 작동 시 성능 60fps | ✓ |

**밸런싱 튜닝**:
- 챌린지 보상: 평균 수익률 대비 20% 이내
- 인사이드 정보: 성공 시 ROI 15~25%
- M&A 방어 비용: 총 자산 5~10%

---

## 📊 리소스 & 예산

| Sprint | 인력 | 기간 | Man-Day | 비용 (₩) |
|--------|------|------|---------|----------|
| Sprint 1 (POC) | 3명 | 2일 | 6 MD | ₩2,190,000 |
| Sprint 2 (UX 개선) | 2명 | 5일 | 10 MD | ₩3,650,000 |
| Sprint 3 (재미 #1-2) | 3명 | 5일 | 15 MD | ₩5,475,000 |
| Sprint 4 (재미 #3) | 4명 | 7일 | 28 MD | ₩10,220,000 |
| **총계** | - | **19일** | **59 MD** | **₩21,535,000** |

---

## 🎯 성공 지표 (KPI)

### Phase별 목표

**Sprint 1 완료 시**:
- [ ] GBM 엔진 실시간 차트 움직임
- [ ] Trading → Portfolio → Chart 연계

**Sprint 2 완료 시**:
- [ ] 모든 창 리사이즈 가능
- [ ] 이벤트 마커 차트 표시
- [ ] 직원 활동 로그 실시간

**Sprint 3 완료 시**:
- [ ] 챌린지 참여율 80%
- [ ] 인사이드 이벤트 완료율 70%
- [ ] 평균 플레이 시간 2배 ↑

**Sprint 4 완료 시**:
- [ ] M&A 이벤트 완료율 90%
- [ ] 재방문율 4배 ↑
- [ ] 소셜 공유 유저당 0.2회

---

## ⚠️ 리스크 관리

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 밸런싱 실패 (보상 과다) | 中 | 高 | 2주 베타 테스트 + 조정 가능 상수 테이블 |
| M&A UI 복잡도 (유저 혼란) | 高 | 中 | 튜토리얼 + 툴팁 강화 |
| 개발 일정 지연 | 中 | 中 | Feature #3 최악 시 Phase 2로 연기 |
| 성능 저하 (재미 요소 추가) | 低 | 高 | 매 Sprint 성능 프로파일링 필수 |

---

## 📌 승인 & 다음 단계

### 실장님 승인 요청

✅ **Sprint 1-2 즉시 승인** (POC + UX 개선)  
⏸️ **Sprint 3-4 조건부 승인** (Sprint 2 성과 확인 후)

### 승인 서명란

```
[ ] 전체 승인 (Sprint 1-4 진행)
[ ] 조건부 승인 (Sprint 1-2만 우선)
[ ] 재검토 요청

서명: _____________  날짜: 2026-02-14
```

### 승인 시 즉시 실행

```bash
# 월요일 오전 10시 Sprint 1 킥오프
git checkout -b sprint-1/poc-completion
npm install
npm run dev

# Jira 티켓 자동 생성
node scripts/generate-jira-tickets.js --sprint 1
```

---

**이 통합 계획서를 기반으로 월요일 스프린트 미팅 진행 부탁드립니다!** 🚀

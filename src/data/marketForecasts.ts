import type { GameTime, MarketEvent, Employee } from '../types'
import type { RegimeState } from '../types'

interface ForecastContext {
  time: GameTime
  regime: RegimeState
  events: MarketEvent[]
  employees: Employee[]
}

interface Forecast {
  headline: string
  body: string
}

const REGIME_FORECASTS = {
  CALM_STABLE: [
    '시장이 안정세를 유지하고 있습니다. 차분한 분석이 가능한 시기입니다.',
    '평온한 장세가 이어지고 있습니다. 포트폴리오 재점검의 기회입니다.',
    '변동성이 낮은 상태입니다. 신중한 매수 타이밍을 노려볼 만합니다.',
    '조용한 시장일수록 다음 파도를 준비해야 합니다.',
    '안정장에서의 매수는 위험이 낮습니다. 저평가 종목을 찾아보세요.',
  ],
  VOLATILE_WARNING: [
    '변동성이 확대되고 있습니다. 급등락에 대비하세요.',
    '시장 불확실성이 커지고 있습니다. 리스크 관리에 집중하세요.',
    '변동성 장세가 지속되고 있습니다. 손절 라인을 재확인하세요.',
    '흔들리는 시장입니다. 포지션 크기를 줄이는 것도 전략입니다.',
    '등락이 심합니다. 섣부른 매매보다 관망이 나을 수 있습니다.',
  ],
  CRISIS_ONGOING: [
    '위기 상황이 지속되고 있습니다. 현금 비중 점검이 필요합니다.',
    '시장 패닉이 계속됩니다. 무리한 매매보다 생존이 우선입니다.',
    '위기의 끝이 보이지 않습니다. 하지만 역사적으로 위기 뒤엔 항상 기회가 왔습니다.',
    '공포가 극에 달했습니다. 현금을 사수하세요.',
    '패닉 매도의 유혹을 견뎌야 합니다. 바닥은 공포 속에 만들어집니다.',
  ],
}

const EVENT_FORECASTS = [
  '{title}의 영향이 계속될 전망입니다. 관련 섹터 동향을 주시하세요.',
  '{title} 이벤트가 진행 중입니다. 시장 반응을 관찰하세요.',
  '현재 {title}의 파급 효과가 지속되고 있습니다.',
  '{title}에 대한 시장의 반응이 주목됩니다. 관련주 변동에 유의하세요.',
  '전문가들은 {title}의 영향이 당분간 이어질 것으로 보고 있습니다.',
  '{title} 관련 뉴스에 시장이 민감하게 반응하고 있습니다.',
]

const EMPLOYEE_FORECASTS = [
  '팀의 스트레스 수준이 높습니다. 직원 관리에 신경 쓰세요.',
  '일부 직원이 지쳐 보입니다. 업무 배치를 재고해보세요.',
  '직원 컨디션이 좋지 않습니다. 번아웃을 예방하세요.',
  '팀의 피로도가 누적되고 있습니다. 휴식이 필요한 시점입니다.',
]

const HISTORICAL_HINTS: Record<string, string[]> = {
  '1997': [
    '노련한 트레이더들이 이 시기를 기억합니다... 외환 시장을 주시하세요.',
    '아시아 경제의 취약점이 드러나고 있습니다. 현금 비중을 높이세요.',
    '대기업 부도 소식이 심상치 않습니다. 금융주를 점검하세요.',
  ],
  '1998': [
    '과거 이맘때 큰 변동이 있었습니다. 역사는 반복될까요?',
    '위기 이후 회복의 기회를 노리는 투자자가 승리합니다.',
    '구조조정의 고통 뒤에 새로운 기회가 열리고 있습니다.',
  ],
  '2000': [
    '밀레니엄의 열기 속에서, 현명한 투자자는 거품을 경계합니다.',
    'IT 기업들의 밸류에이션이 역사적 수준입니다. 실적을 확인하세요.',
    '닷컴 열풍... 과연 이것이 지속 가능할까요?',
  ],
  '2001': [
    '기술주 열풍 이후의 시기입니다. 실적을 확인하세요.',
    '버블 붕괴 후 진짜 가치 있는 기업이 드러납니다.',
  ],
  '2007': [
    '부동산과 금융의 과열... 역사에서 배운 교훈을 되새겨보세요.',
    '신용 시장에 경고 신호가 켜지고 있습니다.',
    '모든 것이 좋아 보일 때가 가장 위험한 순간입니다.',
  ],
  '2008': [
    '역사적으로 이 시기는 투자자들에게 큰 시험이었습니다.',
    '금융 시스템의 근간이 흔들리고 있습니다. 현금이 왕입니다.',
    '공포 속에서 매수할 용기가 있는 자만이 다음 불장을 탈 수 있습니다.',
  ],
  '2020': [
    '전례 없는 일이 벌어질 수 있습니다. 현금을 확보해두세요.',
    '팬데믹은 세상을 바꿉니다. 언택트 관련주를 주목하세요.',
    '극단적 공포 뒤에는 극단적 반등이 올 수 있습니다.',
  ],
  '2022': [
    '금리 인상 사이클이 시작되면 성장주가 타격을 받습니다.',
    '인플레이션 시대에는 실물 자산과 에너지가 강합니다.',
  ],
}

const GENERIC_FORECASTS = [
  '내일의 시장은 어떤 기회를 가져올까요? 준비된 자에게 행운이 옵니다.',
  '장 마감 후 전략을 점검하세요. 내일의 기회를 위해.',
  '오늘 하루를 돌아보며, 내일의 전략을 세워보세요.',
  '시장은 예측 불가능하지만, 준비된 투자자는 다릅니다.',
  '섹터 로테이션을 관찰하세요. 자금의 흐름을 읽는 것이 핵심입니다.',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateMarketForecast(ctx: ForecastContext): Forecast | null {
  const candidates: Forecast[] = []

  // 1. 레짐 기반 전망 (항상 후보에 추가)
  if (ctx.regime.current === 'CRISIS') {
    candidates.push({
      headline: '[전망] 위기 경고 지속',
      body: pickRandom(REGIME_FORECASTS.CRISIS_ONGOING),
    })
  } else if (ctx.regime.current === 'VOLATILE') {
    candidates.push({
      headline: '[전망] 변동성 주의보',
      body: pickRandom(REGIME_FORECASTS.VOLATILE_WARNING),
    })
  } else {
    candidates.push({
      headline: '[전망] 시장 동향',
      body: pickRandom(REGIME_FORECASTS.CALM_STABLE),
    })
  }

  // 2. 이벤트 기반 전망 (활성 이벤트 랜덤 선택)
  const activeEvents = ctx.events.filter(
    (e) => e.remainingTicks > 30 && e.impact.severity !== 'low',
  )
  if (activeEvents.length > 0) {
    const event = pickRandom(activeEvents)
    candidates.push({
      headline: `[전망] ${event.title}`,
      body: pickRandom(EVENT_FORECASTS).replace('{title}', event.title),
    })
  }

  // 3. 역사적 힌트 (해당 연도에 매칭)
  const yearStr = String(ctx.time.year)
  if (HISTORICAL_HINTS[yearStr]) {
    candidates.push({
      headline: '[전망] 역사의 교훈',
      body: pickRandom(HISTORICAL_HINTS[yearStr]),
    })
  }

  // 4. 직원 스트레스 경고
  const stressedCount = ctx.employees.filter((e) => (e.stress ?? 0) > 70).length
  if (stressedCount >= 2) {
    candidates.push({
      headline: '[전망] 팀 컨디션 경고',
      body: pickRandom(EMPLOYEE_FORECASTS),
    })
  }

  // 5. 일반 전망 (후보가 레짐뿐일 때)
  if (candidates.length <= 1) {
    candidates.push({
      headline: '[전망] 장 마감',
      body: pickRandom(GENERIC_FORECASTS),
    })
  }

  // 전체 후보 중 랜덤 선택 (매일 다른 유형이 나오도록)
  return pickRandom(candidates)
}

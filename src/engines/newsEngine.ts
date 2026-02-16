import type { MarketEvent, GameTime, Sector, NewsSentiment, EventSource } from '../types'
import { useGameStore } from '../stores/gameStore'
import { EVENT_TEMPLATES, pickWeightedEvent, type EventTemplate } from '../data/events'
import {
  CHAIN_EVENT_TEMPLATES,
  getHistoricalEventsForYear,
  type HistoricalEvent,
} from '../data/historicalEvents'

/* ── News Engine: 절차적 뉴스 생성 + 연쇄 시스템 + 역사적 이벤트 ── */

// 발동된 역사적 이벤트 추적 (중복 방지)
const triggeredHistoricalEvents = new Set<string>()

// 대기 중인 연쇄 이벤트
interface PendingChainEvent {
  parentEventId: string
  template: EventTemplate
  triggerTick: number // 이 틱이 되면 발동
  source: EventSource
}

const pendingChainEvents: PendingChainEvent[] = []

/* ── 절차적 뉴스 생성 템플릿 ── */

interface ProceduralTemplate {
  patterns: string[] // "[company]이(가) [action]"
  actions: string[]
  results: string[]
  type: 'sector' | 'company' | 'boom' | 'crash' | 'policy' | 'global'
  sectorFilter?: Sector[]
  impactRange: {
    driftMin: number
    driftMax: number
    volMin: number
    volMax: number
  }
  severities: Array<'low' | 'medium' | 'high'>
  durationRange: [number, number]
}

const PROCEDURAL_TEMPLATES: ProceduralTemplate[] = [
  // 실적 발표
  {
    patterns: [
      '[sector] 섹터 [quarter]분기 실적 [result]',
      '[sector] 업종 [result], 시장 [reaction]',
    ],
    actions: [
      '호실적 발표',
      '어닝 서프라이즈',
      '실적 부진',
      '시장 예상 하회',
      '사상 최대 실적',
      '적자 전환',
    ],
    results: [
      '투자 심리 개선',
      '매수세 유입',
      '투자자 실망',
      '주가 급등',
      '매도세 확대',
      '시장 관망세',
    ],
    type: 'sector',
    impactRange: { driftMin: -0.06, driftMax: 0.08, volMin: 0.05, volMax: 0.2 },
    severities: ['low', 'medium', 'high'],
    durationRange: [60, 150],
  },
  // 기술 혁신
  {
    patterns: [
      '[sector] 분야 [action], [result]',
      '차세대 [action] 상용화 임박, [result]',
    ],
    actions: [
      '양자컴퓨팅 돌파',
      '자율주행 Level 4 달성',
      '핵융합 발전 성공',
      '초전도체 발견',
      '6G 표준화 합의',
      'AI 에이전트 확산',
      '바이오 유전자 치료 승인',
      '로봇 물류 전면 도입',
    ],
    results: [
      '관련주 급등',
      '투자 자금 유입',
      '시장 기대감 상승',
      '글로벌 경쟁 가속화',
      '업계 지각변동 예고',
    ],
    type: 'sector',
    impactRange: { driftMin: 0.03, driftMax: 0.1, volMin: 0.1, volMax: 0.3 },
    severities: ['medium', 'high'],
    durationRange: [100, 200],
  },
  // 기업 스캔들
  {
    patterns: [
      '[sector] 대기업 [action] 적발',
      '금감원, [sector] 업체 [action] 조사 착수',
    ],
    actions: [
      '분식회계',
      '내부자거래',
      '환경오염 은폐',
      '소비자 기만',
      '횡령',
      '세금 탈루',
      '담합',
      '안전기준 위반',
    ],
    results: [
      '투자자 신뢰 하락',
      '관련주 급락',
      '업계 전반 조사 확대 우려',
      '경영진 퇴진 압력',
    ],
    type: 'company',
    impactRange: { driftMin: -0.08, driftMax: -0.02, volMin: 0.15, volMax: 0.35 },
    severities: ['medium', 'high'],
    durationRange: [60, 120],
  },
  // 거시경제 지표
  {
    patterns: [
      '[indicator] [direction], [result]',
      '통계청 발표: [indicator] [direction]',
    ],
    actions: [
      'GDP 성장률',
      '실업률',
      '소비자물가지수(CPI)',
      '생산자물가지수(PPI)',
      '수출입 지표',
      '경상수지',
      '가계부채',
      '기업 투자',
    ],
    results: [
      '시장 긍정 반응',
      '경기 둔화 우려',
      '인플레 우려 확산',
      '경기 회복 신호',
      '스태그플레이션 우려',
      '소비 회복 기대',
    ],
    type: 'global',
    impactRange: { driftMin: -0.04, driftMax: 0.05, volMin: 0.05, volMax: 0.15 },
    severities: ['low', 'medium'],
    durationRange: [80, 160],
  },
  // 계절성 이벤트
  {
    patterns: [
      '[season] [action], [result]',
      '연례 [action], 시장 [reaction]',
    ],
    actions: [
      '연말 산타랠리',
      '4분기 윈도드레싱',
      '새해 첫 거래일 효과',
      '5월 매도 시즌',
      '여름 에너지 수요 급증',
      '추석 앞 소비 증가',
      '블랙프라이데이 효과',
      '신학기 소비재 수요',
    ],
    results: [
      '매수세 유입',
      '주가 상승',
      '투자 심리 개선',
      '거래량 감소',
      '변동성 축소',
    ],
    type: 'boom',
    impactRange: { driftMin: -0.02, driftMax: 0.05, volMin: -0.05, volMax: 0.1 },
    severities: ['low', 'medium'],
    durationRange: [40, 100],
  },
  // 규제 변화
  {
    patterns: [
      '정부, [sector] [action] 발표',
      '[sector] 분야 [action], [result]',
    ],
    actions: [
      '규제 완화',
      '규제 강화',
      '세제 혜택 확대',
      '인허가 간소화',
      '배출 기준 강화',
      '외국인 투자 한도 조정',
      '독점 규제 강화',
      '보조금 확대',
    ],
    results: [
      '수혜주 급등',
      '관련업계 반발',
      '투자 활성화 기대',
      '비용 부담 증가 우려',
      '업계 재편 전망',
    ],
    type: 'policy',
    impactRange: { driftMin: -0.05, driftMax: 0.06, volMin: 0.05, volMax: 0.2 },
    severities: ['low', 'medium', 'high'],
    durationRange: [80, 180],
  },
]

/* ── 섹터 이름 매핑 ── */
const SECTOR_NAMES: Record<Sector, string> = {
  tech: '기술',
  finance: '금융',
  energy: '에너지',
  healthcare: '헬스케어',
  consumer: '소비재',
  industrial: '산업재',
  telecom: '통신',
  materials: '소재',
  utilities: '유틸리티',
  realestate: '부동산',
}

const ALL_SECTORS: Sector[] = [
  'tech',
  'finance',
  'energy',
  'healthcare',
  'consumer',
  'industrial',
  'telecom',
  'materials',
  'utilities',
  'realestate',
]

/* ── 유틸리티 함수 ── */

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1))
}

/* ── 절차적 뉴스 생성 ── */

function generateProceduralEvent(): EventTemplate & { source: EventSource } {
  const template = pickRandom(PROCEDURAL_TEMPLATES)
  const pattern = pickRandom(template.patterns)
  const action = pickRandom(template.actions)
  const result = pickRandom(template.results)

  // 랜덤 섹터 선택
  const sector = template.sectorFilter
    ? pickRandom(template.sectorFilter)
    : pickRandom(ALL_SECTORS)
  const sectorName = SECTOR_NAMES[sector]

  // 패턴 변수 치환
  const title = pattern
    .replace('[sector]', sectorName)
    .replace('[action]', action)
    .replace('[result]', result)
    .replace('[quarter]', String(randomInt(1, 4)))
    .replace('[indicator]', action)
    .replace('[direction]', Math.random() > 0.5 ? '개선' : '악화')
    .replace('[season]', action)
    .replace('[reaction]', result)

  const description = `${sectorName} 섹터: ${action}. ${result}.`

  const drift = randomInRange(template.impactRange.driftMin, template.impactRange.driftMax)
  const vol = randomInRange(template.impactRange.volMin, template.impactRange.volMax)
  const severity = pickRandom(template.severities)
  const duration = randomInt(template.durationRange[0], template.durationRange[1])

  return {
    title,
    description,
    type: template.type,
    impact: {
      driftModifier: Math.round(drift * 1000) / 1000,
      volatilityModifier: Math.round(vol * 1000) / 1000,
      severity,
    },
    duration,
    weight: severity === 'high' ? 2 : severity === 'medium' ? 3 : 5,
    affectedSectors: [sector],
    source: 'procedural',
  }
}

/* ── 역사적 이벤트 체크 ── */

export function checkHistoricalEvents(time: GameTime): void {
  const store = useGameStore.getState()
  const yearEvents = getHistoricalEventsForYear(time.year)

  for (const hEvent of yearEvents) {
    const eventKey = `${hEvent.year}-${hEvent.title}`
    if (triggeredHistoricalEvents.has(eventKey)) continue

    // 월 체크 (지정된 월이면 해당 월에만, 미지정이면 랜덤 월)
    const targetMonth = hEvent.month ?? randomInt(1, 12)

    // ±1개월 오프셋으로 매 플레이마다 약간 다르게
    const offset = randomInt(-1, 1)
    const triggerMonth = Math.max(1, Math.min(12, targetMonth + offset))

    if (time.month === triggerMonth && time.day <= 5 && time.hour === 9) {
      triggeredHistoricalEvents.add(eventKey)
      createEventFromHistorical(hEvent, store)
    }
  }
}

function createEventFromHistorical(
  hEvent: HistoricalEvent,
  store: ReturnType<typeof useGameStore.getState>,
) {
  const affectedCompanyIds = store.companies
    .filter((c) => {
      if (hEvent.affectedSectors) return hEvent.affectedSectors.includes(c.sector)
      return true
    })
    .map((c) => c.id)

  const priceSnapshot: Record<
    string,
    { priceBefore: number; peakChange: number; currentChange: number }
  > = {}
  affectedCompanyIds.forEach((id) => {
    const company = store.companies.find((c) => c.id === id)
    if (company) {
      priceSnapshot[id] = { priceBefore: company.price, peakChange: 0, currentChange: 0 }
    }
  })

  const event: MarketEvent = {
    id: `evt-hist-${hEvent.year}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: hEvent.title,
    description: hEvent.description,
    type: hEvent.type,
    impact: { ...hEvent.impact },
    duration: hEvent.duration,
    remainingTicks: hEvent.duration,
    affectedSectors: hEvent.affectedSectors,
    affectedCompanies: affectedCompanyIds,
    startTimestamp: { ...store.time },
    priceImpactSnapshot: priceSnapshot,
    source: 'historical',
    historicalYear: hEvent.year,
  }

  const isBreaking =
    hEvent.impact.severity === 'high' || hEvent.impact.severity === 'critical'
  const sentiment: NewsSentiment =
    hEvent.impact.driftModifier > 0.01
      ? 'positive'
      : hEvent.impact.driftModifier < -0.01
        ? 'negative'
        : 'neutral'

  store.addEvent(event)
  store.addNews({
    id: `news-hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: { ...store.time },
    headline: `[역사] ${hEvent.title}`,
    body: hEvent.description,
    eventId: event.id,
    isBreaking,
    sentiment,
    relatedCompanies: affectedCompanyIds,
    impactSummary:
      affectedCompanyIds.length > 0
        ? `${affectedCompanyIds.length}개 기업 영향 예상`
        : '전체 시장 영향',
  })

  if (isBreaking) {
    store.triggerFlash()
  }

  // 연쇄 이벤트 등록
  if (hEvent.chainEvents) {
    registerChainEvents(event.id, hEvent.chainEvents, store.time)
  }
}

/* ── 연쇄 이벤트 시스템 ── */

function registerChainEvents(
  parentEventId: string,
  chains: NonNullable<HistoricalEvent['chainEvents']>,
  currentTime: GameTime,
) {
  const currentTick = gameTimeToAbsoluteTick(currentTime)

  for (const chain of chains) {
    if (Math.random() > chain.probability) continue
    if (chain.templateIndex >= CHAIN_EVENT_TEMPLATES.length) continue

    const template = CHAIN_EVENT_TEMPLATES[chain.templateIndex]
    const delay = randomInt(chain.delayTicks[0], chain.delayTicks[1])

    pendingChainEvents.push({
      parentEventId,
      template,
      triggerTick: currentTick + delay,
      source: 'chained',
    })
  }
}

export function checkChainEvents(time: GameTime): void {
  const currentTick = gameTimeToAbsoluteTick(time)
  const store = useGameStore.getState()

  // 발동할 이벤트 찾기
  const toTrigger = pendingChainEvents.filter((p) => currentTick >= p.triggerTick)

  for (const pending of toTrigger) {
    createEventFromTemplate(pending.template, store, 'chained', pending.parentEventId)
  }

  // 발동된 이벤트 제거
  if (toTrigger.length > 0) {
    const triggerSet = new Set(toTrigger)
    const remaining = pendingChainEvents.filter((p) => !triggerSet.has(p))
    pendingChainEvents.length = 0
    pendingChainEvents.push(...remaining)
  }
}

function gameTimeToAbsoluteTick(time: GameTime): number {
  return (
    (time.year - 1995) * 360 * 10 +
    (time.month - 1) * 30 * 10 +
    (time.day - 1) * 10 +
    (time.hour - 9)
  )
}

/* ── 통합 이벤트 생성 함수 ── */

function createEventFromTemplate(
  template: EventTemplate,
  store: ReturnType<typeof useGameStore.getState>,
  source: EventSource,
  chainParentId?: string,
) {
  const affectedCompanyIds = store.companies
    .filter((c) => {
      if (template.affectedSectors) return template.affectedSectors.includes(c.sector)
      return true
    })
    .map((c) => c.id)

  const priceSnapshot: Record<
    string,
    { priceBefore: number; peakChange: number; currentChange: number }
  > = {}
  affectedCompanyIds.forEach((id) => {
    const company = store.companies.find((c) => c.id === id)
    if (company) {
      priceSnapshot[id] = { priceBefore: company.price, peakChange: 0, currentChange: 0 }
    }
  })

  const event: MarketEvent = {
    id: `evt-${source}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: template.title,
    description: template.description,
    type: template.type,
    impact: { ...template.impact },
    duration: template.duration,
    remainingTicks: template.duration,
    affectedSectors: template.affectedSectors as Sector[] | undefined,
    affectedCompanies: affectedCompanyIds,
    startTimestamp: { ...store.time },
    priceImpactSnapshot: priceSnapshot,
    source,
    chainParentId,
  }

  const isBreaking =
    template.impact.severity === 'high' || template.impact.severity === 'critical'
  const sentiment: NewsSentiment =
    template.impact.driftModifier > 0.01
      ? 'positive'
      : template.impact.driftModifier < -0.01
        ? 'negative'
        : 'neutral'

  const prefix = source === 'chained' ? '[연쇄] ' : ''

  store.addEvent(event)
  store.addNews({
    id: `news-${source}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: { ...store.time },
    headline: `${prefix}${template.title}`,
    body: template.description,
    eventId: event.id,
    isBreaking,
    sentiment,
    relatedCompanies: affectedCompanyIds,
    impactSummary:
      affectedCompanyIds.length > 0
        ? `${affectedCompanyIds.length}개 기업 영향 예상`
        : '전체 시장 영향',
  })

  if (isBreaking) {
    store.triggerFlash()
  }
}

/* ── 메인 엔진: 랜덤 이벤트 생성 (기존 + 절차적 혼합) ── */

export function generateRandomEvent(): void {
  const store = useGameStore.getState()

  // 70% 기존 템플릿, 30% 절차적 생성
  if (Math.random() < 0.7) {
    const template = pickWeightedEvent(EVENT_TEMPLATES)
    createEventFromTemplate(template, store, 'random')
  } else {
    const procTemplate = generateProceduralEvent()
    createEventFromTemplate(procTemplate, store, 'procedural')
  }
}

/* ── 틱마다 호출되는 메인 프로세서 ── */

export function processNewsEngine(time: GameTime): void {
  // 1. 역사적 이벤트 체크 (매일 초반에만)
  if (time.hour === 9) {
    checkHistoricalEvents(time)
  }

  // 2. 연쇄 이벤트 체크
  if (pendingChainEvents.length > 0) {
    checkChainEvents(time)
  }
}

/* ── 리셋 (새 게임 시작 시) ── */

export function resetNewsEngine(): void {
  triggeredHistoricalEvents.clear()
  pendingChainEvents.length = 0
}

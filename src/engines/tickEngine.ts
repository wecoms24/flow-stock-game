import { useGameStore } from '../stores/gameStore'
import type { MarketEvent, Sector } from '../types'

/* ── Tick Engine: 1-tick time control system ── */

let worker: Worker | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

const BASE_TICK_MS = 500 // 1x speed = 500ms per tick

export function initTickEngine() {
  worker = new Worker(new URL('../workers/priceEngine.worker.ts', import.meta.url), {
    type: 'module',
  })

  worker.onmessage = (e) => {
    if (e.data.type === 'prices') {
      useGameStore.getState().updatePrices(e.data.prices)
    }
  }
}

export function startTickLoop() {
  if (intervalId) return

  const tick = () => {
    const state = useGameStore.getState()
    if (state.time.isPaused || !state.isGameStarted || !worker) return

    // Advance game time
    state.advanceTick()

    // Send companies data to worker for GBM price calculation
    const companyData = state.companies.map((c) => ({
      id: c.id,
      price: c.price,
      drift: c.drift,
      volatility: c.volatility,
    }))

    const eventModifiers = state.events
      .filter((evt) => evt.remainingTicks > 0)
      .map((evt) => ({
        driftModifier: evt.impact.driftModifier,
        volatilityModifier: evt.impact.volatilityModifier,
        affectedCompanies: evt.affectedCompanies,
        affectedSectors: evt.affectedSectors,
      }))

    // dt = 1 tick = 1/300 of a month (30 days * 10 ticks)
    // = 1/3600 of a year
    const dt = 1 / 3600

    worker.postMessage({
      type: 'tick',
      companies: companyData,
      dt,
      events: eventModifiers,
    })

    // Decay events
    useGameStore.setState((s) => ({
      events: s.events
        .map((evt) => ({ ...evt, remainingTicks: evt.remainingTicks - 1 }))
        .filter((evt) => evt.remainingTicks > 0),
    }))

    // Random event generation (1% chance per tick)
    if (Math.random() < 0.01) {
      generateRandomEvent()
    }
  }

  // Set up interval based on speed
  const updateInterval = () => {
    const speed = useGameStore.getState().time.speed
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(tick, BASE_TICK_MS / speed)
  }

  updateInterval()

  // Subscribe to speed changes
  useGameStore.subscribe((state, prevState) => {
    if (state.time.speed !== prevState.time.speed) {
      updateInterval()
    }
  })
}

export function stopTickLoop() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function destroyTickEngine() {
  stopTickLoop()
  worker?.terminate()
  worker = null
}

/* ── Random Event Generator ── */
function generateRandomEvent() {
  const store = useGameStore.getState()
  const eventTemplates = [
    {
      title: '연준, 금리 인하 발표',
      description: '연방준비제도가 기준금리를 0.25%p 인하했습니다.',
      type: 'policy' as const,
      impact: { driftModifier: 0.05, volatilityModifier: 0.1, severity: 'medium' as const },
      duration: 100,
    },
    {
      title: '기술주 폭등 조짐',
      description: '반도체 수요 급증으로 기술 섹터가 활기를 띠고 있습니다.',
      type: 'sector' as const,
      impact: { driftModifier: 0.08, volatilityModifier: 0.2, severity: 'high' as const },
      duration: 150,
      affectedSectors: ['tech'] as const,
    },
    {
      title: '글로벌 경기 침체 우려',
      description: '주요 경제지표가 하락세를 보이며 시장 불안감이 확산됩니다.',
      type: 'global' as const,
      impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' as const },
      duration: 200,
    },
    {
      title: '부동산 시장 과열',
      description: '부동산 가격이 급등하며 관련 주가도 영향을 받고 있습니다.',
      type: 'sector' as const,
      impact: { driftModifier: 0.04, volatilityModifier: 0.15, severity: 'medium' as const },
      duration: 120,
      affectedSectors: ['realestate'] as const,
    },
    {
      title: '유가 급등',
      description: '중동 지역 긴장으로 국제 유가가 급등했습니다.',
      type: 'global' as const,
      impact: { driftModifier: -0.03, volatilityModifier: 0.25, severity: 'medium' as const },
      duration: 80,
      affectedSectors: ['energy'] as const,
    },
  ]

  const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)]
  const event: MarketEvent = {
    id: `evt-${Date.now()}`,
    title: template.title,
    description: template.description,
    type: template.type,
    impact: template.impact,
    duration: template.duration,
    remainingTicks: template.duration,
    affectedCompanies: undefined,
    affectedSectors: (template as { affectedSectors?: Sector[] }).affectedSectors,
  }

  const severity = template.impact.severity as string

  store.addEvent(event)
  store.addNews({
    id: `news-${Date.now()}`,
    timestamp: { ...store.time },
    headline: template.title,
    body: template.description,
    eventId: event.id,
    isBreaking: severity === 'high' || severity === 'critical',
  })

  if (severity === 'high' || severity === 'critical') {
    store.triggerFlash()
  }
}

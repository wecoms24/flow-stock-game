import { useGameStore } from '../stores/gameStore'
import { EVENT_TEMPLATES, pickWeightedEvent } from '../data/events'
import type { MarketEvent, NewsSentiment, Sector } from '../types'

/* ── Tick Engine: 1-tick time control system ── */

let worker: Worker | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let unsubscribeSpeed: (() => void) | null = null
let autoSaveCounter = 0

const BASE_TICK_MS = 200
const AUTO_SAVE_INTERVAL = 300 // Auto-save every 300 ticks (~2.5 min at 1x)

export function initTickEngine() {
  if (worker) return

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

    // Monthly processing (salary, stamina) on day 1
    const currentState = useGameStore.getState()
    if (currentState.time.day === 1 && currentState.time.tick === 0) {
      currentState.processMonthly()
    }

    // Send companies data to worker for GBM price calculation
    const volatilityMul = state.difficultyConfig.volatilityMultiplier
    const companyData = state.companies.map((c) => ({
      id: c.id,
      sector: c.sector,
      price: c.price,
      drift: c.drift,
      volatility: c.volatility * volatilityMul,
    }))

    const eventModifiers = state.events
      .filter((evt) => evt.remainingTicks > 0)
      .map((evt) => ({
        driftModifier: evt.impact.driftModifier,
        volatilityModifier: evt.impact.volatilityModifier,
        affectedCompanies: evt.affectedCompanies,
        affectedSectors: evt.affectedSectors,
      }))

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

    // Random event generation using difficulty-specific chance
    const eventChance = state.difficultyConfig.eventChance
    if (Math.random() < eventChance) {
      generateRandomEvent()
    }

    // Auto-save periodically
    autoSaveCounter++
    if (autoSaveCounter >= AUTO_SAVE_INTERVAL) {
      autoSaveCounter = 0
      state.autoSave()
    }
  }

  const updateInterval = () => {
    const speed = useGameStore.getState().time.speed
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(tick, BASE_TICK_MS / speed)
  }

  updateInterval()

  unsubscribeSpeed = useGameStore.subscribe((state, prevState) => {
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

  if (unsubscribeSpeed) {
    unsubscribeSpeed()
    unsubscribeSpeed = null
  }

  worker?.terminate()
  worker = null
}

/* ── Random Event Generator ── */
function generateRandomEvent() {
  const store = useGameStore.getState()
  const template = pickWeightedEvent(EVENT_TEMPLATES)

  const event: MarketEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: template.title,
    description: template.description,
    type: template.type,
    impact: { ...template.impact },
    duration: template.duration,
    remainingTicks: template.duration,
    affectedSectors: template.affectedSectors as Sector[] | undefined,
    affectedCompanies: undefined,
  }

  const isBreaking =
    template.impact.severity === 'high' || template.impact.severity === 'critical'

  // Derive sentiment from drift direction
  const sentiment: NewsSentiment =
    template.impact.driftModifier > 0.01 ? 'positive'
    : template.impact.driftModifier < -0.01 ? 'negative'
    : 'neutral'

  store.addEvent(event)
  store.addNews({
    id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: { ...store.time },
    headline: template.title,
    body: template.description,
    eventId: event.id,
    isBreaking,
    sentiment,
  })

  if (isBreaking) {
    store.triggerFlash()
  }
}

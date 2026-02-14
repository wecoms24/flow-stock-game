import { useGameStore } from '../stores/gameStore'
import { EVENT_TEMPLATES } from '../data/events'
import type { MarketEvent, Sector } from '../types'

/* ── Tick Engine: 1-tick time control system ── */

let worker: Worker | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let unsubscribeSpeed: (() => void) | null = null

const BASE_TICK_MS = 500 // 1x speed = 500ms per tick
const EVENT_CHANCE_PER_TICK = 0.01 // 1% chance per tick

export function initTickEngine() {
  if (worker) return // guard against double-init

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
    // Worker needs sector info to apply sector-scoped events
    const companyData = state.companies.map((c) => ({
      id: c.id,
      sector: c.sector,
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

    // Random event generation from the full 50-event pool
    if (Math.random() < EVENT_CHANCE_PER_TICK) {
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

  // Subscribe to speed changes (store the unsubscribe handle!)
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

  // Clean up Zustand subscription to prevent memory leak
  if (unsubscribeSpeed) {
    unsubscribeSpeed()
    unsubscribeSpeed = null
  }

  worker?.terminate()
  worker = null
}

/* ── Random Event Generator using full 50-event pool from events.ts ── */
function generateRandomEvent() {
  const store = useGameStore.getState()
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]

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

  store.addEvent(event)
  store.addNews({
    id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: { ...store.time },
    headline: template.title,
    body: template.description,
    eventId: event.id,
    isBreaking,
  })

  if (isBreaking) {
    store.triggerFlash()
  }
}

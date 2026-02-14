import { useGameStore } from '../stores/gameStore'
import { EVENT_TEMPLATES, pickWeightedEvent } from '../data/events'
import type { MarketEvent, NewsSentiment, Sector } from '../types'

/* ── Tick Engine: 1-tick time control system ── */

let worker: Worker | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let unsubscribeSpeed: (() => void) | null = null
let autoSaveCounter = 0
let previousRankings: Record<string, number> = {} // Track previous rankings for change detection

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

    // Employee System Processing (every 10 ticks)
    if (currentState.time.tick % 10 === 0 && state.player.employees.length > 0) {
      state.processEmployeeTick()
    }

    // AI Competitor Processing (every 5 ticks)
    if (state.competitorCount > 0) {
      // Update competitor assets every tick for accurate ROI
      state.updateCompetitorAssets()

      // Process AI trading every 5 ticks
      if (currentState.time.tick % 5 === 0) {
        state.processCompetitorTick()
      }

      // Update rankings every 10 ticks
      if (currentState.time.tick % 10 === 0) {
        const rankings = state.calculateRankings()
        checkRankChanges(rankings)
      }
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

  // Identify affected companies
  const affectedCompanyIds = store.companies
    .filter((c) => {
      if (template.affectedSectors) {
        return template.affectedSectors.includes(c.sector)
      }
      return true // Global events affect all companies
    })
    .map((c) => c.id)

  // Create price snapshot for affected companies
  const priceSnapshot: Record<
    string,
    { priceBefore: number; peakChange: number; currentChange: number }
  > = {}

  affectedCompanyIds.forEach((id) => {
    const company = store.companies.find((c) => c.id === id)
    if (company) {
      priceSnapshot[id] = {
        priceBefore: company.price,
        peakChange: 0,
        currentChange: 0,
      }
    }
  })

  const event: MarketEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
  }

  const isBreaking = template.impact.severity === 'high' || template.impact.severity === 'critical'

  // Derive sentiment from drift direction
  const sentiment: NewsSentiment =
    template.impact.driftModifier > 0.01
      ? 'positive'
      : template.impact.driftModifier < -0.01
        ? 'negative'
        : 'neutral'

  // Generate impact summary
  const impactSummary =
    affectedCompanyIds.length > 0
      ? `${affectedCompanyIds.length}개 기업 영향 예상`
      : '전체 시장 영향'

  store.addEvent(event)
  store.addNews({
    id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: { ...store.time },
    headline: template.title,
    body: template.description,
    eventId: event.id,
    isBreaking,
    sentiment,
    relatedCompanies: affectedCompanyIds,
    impactSummary,
  })

  if (isBreaking) {
    store.triggerFlash()
  }
}

/* ── Rank Change Detection ── */
function checkRankChanges(rankings: Array<{ name: string; rank: number; isPlayer: boolean }>) {
  const store = useGameStore.getState()

  rankings.forEach((entry) => {
    const prevRank = previousRankings[entry.name]

    if (prevRank && prevRank !== entry.rank) {
      // Rank changed - trigger notification
      if (entry.isPlayer) {
        // Player rank changed - dispatch event for UI
        window.dispatchEvent(
          new CustomEvent('rankChange', {
            detail: { oldRank: prevRank, newRank: entry.rank },
          }),
        )
      } else {
        // AI competitor rank changed
        if (entry.rank === 1 && prevRank !== 1) {
          // Became champion
          store.addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "나야말로 전설! 🏆👑"`,
            type: 'champion',
            timestamp: Date.now(),
          })
        } else if (entry.rank < prevRank) {
          // Rank up
          store.addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "올라간다! 올라가! 🚀"`,
            type: 'rank_up',
            timestamp: Date.now(),
          })
        }

        // Check if overtook player
        const playerEntry = rankings.find((r) => r.isPlayer)
        const prevPlayerRank = previousRankings['You']

        if (
          playerEntry &&
          prevPlayerRank &&
          entry.rank < playerEntry.rank &&
          prevRank > prevPlayerRank
        ) {
          store.addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "어? 내가 플레이어 넘었네? 😏"`,
            type: 'overtake_player',
            timestamp: Date.now(),
          })
        }
      }
    }
  })

  // Update tracking
  previousRankings = rankings.reduce(
    (acc, entry) => {
      acc[entry.name] = entry.rank
      return acc
    },
    {} as Record<string, number>,
  )
}

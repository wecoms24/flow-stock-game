import { useGameStore } from '../stores/gameStore'
import {
  generateRandomEvent,
  processNewsEngine,
  resetNewsEngine,
} from './newsEngine'
import {
  onEventOccurred,
  tickSentiment,
  getSentimentDriftModifier,
  getSectorSentimentDrift,
  getSentimentVolatilityMultiplier,
  isSentimentActive,
  resetSentiment,
} from './sentimentEngine'
import { SECTOR_CORRELATION, SPILLOVER_FACTOR } from '../data/sectorCorrelation'
import type { Sector } from '../types'
import { getBusinessHourIndex, getAbsoluteTimestamp } from '../config/timeConfig'
import { MARKET_IMPACT_CONFIG } from '../config/marketImpactConfig'

/* ── Tick Engine: 1-hour time control system ── */

let worker: Worker | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let unsubscribeSpeed: (() => void) | null = null
let autoSaveCounter = 0
let previousRankings: Record<string, number> = {} // Track previous rankings for change detection

const BASE_HOUR_MS = 200
const AUTO_SAVE_INTERVAL = 300 // Auto-save every 300 hours (~2.5 min at 1x)

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
    state.advanceHour()

    // Re-read state after time advancement
    const current = useGameStore.getState()

    // Monthly processing (salary, stamina) on day 1 at market open
    if (current.time.day === 1 && current.time.hour === 9) {
      current.processMonthly()
    }

    // Send companies data to worker for GBM price calculation
    const volatilityMul = current.difficultyConfig.volatilityMultiplier
    const companyData = current.companies.map((c) => ({
      id: c.id,
      sector: c.sector,
      price: c.price,
      drift: c.drift,
      volatility: c.volatility * volatilityMul,
    }))

    // Build event modifiers with propagation delay + eventSensitivity
    const eventModifiers = current.events
      .filter((evt) => evt.remainingTicks > 0)
      .flatMap((evt) => {
        const elapsed = evt.duration - evt.remainingTicks
        const propagation = getEventPropagation(elapsed)

        // 회사별 감응도 적용 (이벤트 타입 기반)
        const eventType = evt.type // 'boom' | 'crash' | 'sector' | 'company' | 'policy' | 'global'
        const companySensitivities: Record<string, number> = {}

        // 영향받는 섹터의 모든 회사에 감응도 적용
        if (evt.affectedSectors) {
          for (const comp of current.companies) {
            if (evt.affectedSectors.includes(comp.sector) && comp.eventSensitivity?.[eventType]) {
              companySensitivities[comp.id] = comp.eventSensitivity[eventType]
            }
          }
        }
        // 직접 지정된 회사에도 감응도 적용
        if (evt.affectedCompanies) {
          for (const compId of evt.affectedCompanies) {
            const comp = current.companies.find((c) => c.id === compId)
            if (comp?.eventSensitivity?.[eventType]) {
              companySensitivities[compId] = comp.eventSensitivity[eventType]
            }
          }
        }
        // 글로벌 이벤트: 모든 회사에 감응도 적용
        if (!evt.affectedSectors && !evt.affectedCompanies) {
          for (const comp of current.companies) {
            if (comp.eventSensitivity?.[eventType]) {
              companySensitivities[comp.id] = comp.eventSensitivity[eventType]
            }
          }
        }

        // 주 이벤트
        const main = {
          driftModifier: evt.impact.driftModifier,
          volatilityModifier: evt.impact.volatilityModifier,
          affectedCompanies: evt.affectedCompanies,
          affectedSectors: evt.affectedSectors,
          propagation,
          companySensitivities, // 회사별 감응도 전달
        }

        // 섹터 상관관계를 통한 전파 이벤트
        const spillovers: typeof main[] = []
        if (evt.affectedSectors && evt.affectedSectors.length > 0) {
          for (const sector of evt.affectedSectors) {
            const correlations = SECTOR_CORRELATION[sector]
            if (!correlations) continue
            for (const [otherSector, corr] of Object.entries(correlations)) {
              if ((corr ?? 0) < 0.3) continue
              if (evt.affectedSectors.includes(otherSector as Sector)) continue
              spillovers.push({
                driftModifier: evt.impact.driftModifier * (corr ?? 0) * SPILLOVER_FACTOR,
                volatilityModifier: evt.impact.volatilityModifier * (corr ?? 0) * SPILLOVER_FACTOR,
                affectedSectors: [otherSector as Sector],
                affectedCompanies: undefined,
                propagation: propagation * 0.7, // 전파된 이벤트는 더 느리게
                companySensitivities: {},
              })
            }
          }
        }

        return [main, ...spillovers]
      })

    // Build sentiment data for worker (skip if inactive for performance)
    let sentimentData: { globalDrift: number; volatilityMultiplier: number; sectorDrifts: Record<string, number> } | null = null
    if (isSentimentActive()) {
      const sectorDrifts: Record<string, number> = {}
      const allSectors: Sector[] = [
        'tech', 'finance', 'energy', 'healthcare', 'consumer',
        'industrial', 'telecom', 'materials', 'utilities', 'realestate',
      ]
      allSectors.forEach((s) => { sectorDrifts[s] = getSectorSentimentDrift(s) })

      sentimentData = {
        globalDrift: getSentimentDriftModifier(),
        volatilityMultiplier: getSentimentVolatilityMultiplier(),
        sectorDrifts,
      }
    }

    const dt = 1 / 10 // 하루 10시간, 1시간 = 1/10일

    // Build order flow data for market impact
    const orderFlowEntries = Object.entries(current.orderFlowByCompany)
      .filter(([, flow]) => flow.tradeCount > 0)
      .map(([companyId, flow]) => ({
        companyId,
        netNotional: flow.netNotional,
        tradeCount: flow.tradeCount,
      }))

    worker.postMessage({
      type: 'tick',
      companies: companyData,
      dt,
      events: eventModifiers,
      sentiment: sentimentData,
      orderFlow: orderFlowEntries.length > 0 ? orderFlowEntries : undefined,
      marketImpact: orderFlowEntries.length > 0
        ? {
            impactCoefficient: MARKET_IMPACT_CONFIG.IMPACT_COEFFICIENT,
            liquidityScale: MARKET_IMPACT_CONFIG.LIQUIDITY_SCALE,
            imbalanceSigmaFactor: MARKET_IMPACT_CONFIG.IMBALANCE_SIGMA_FACTOR,
            maxDriftImpact: MARKET_IMPACT_CONFIG.MAX_DRIFT_IMPACT,
            maxSigmaAmplification: MARKET_IMPACT_CONFIG.MAX_SIGMA_AMPLIFICATION,
          }
        : undefined,
    })

    // Tick sentiment engine (natural decay)
    tickSentiment()

    // Update event impact snapshots
    useGameStore.setState((s) => ({
      events: s.events.map((evt) => {
        if (!evt.priceImpactSnapshot || !evt.affectedCompanies) return evt
        const snapshot = { ...evt.priceImpactSnapshot }
        for (const companyId of evt.affectedCompanies) {
          const company = s.companies.find((c) => c.id === companyId)
          const snap = snapshot[companyId]
          if (company && snap) {
            const change = (company.price - snap.priceBefore) / snap.priceBefore
            snapshot[companyId] = {
              ...snap,
              currentChange: change,
              peakChange: Math.max(snap.peakChange, Math.abs(change)),
            }
          }
        }
        return { ...evt, priceImpactSnapshot: snapshot }
      }),
    }))

    // Decay events + afterEffect (여진) 생성
    useGameStore.setState((s) => {
      const afterEffects: typeof s.events = []
      const decayed = s.events
        .map((evt) => ({ ...evt, remainingTicks: evt.remainingTicks - 1 }))

      // 만료되는 이벤트에서 여진 생성 (이미 여진인 이벤트는 제외)
      decayed.forEach((evt) => {
        if (
          evt.remainingTicks <= 0 &&
          !evt.source?.startsWith('aftereffect') &&
          evt.source !== 'aftereffect' &&
          Math.abs(evt.impact.driftModifier) > 0.01 // 영향이 미미한 이벤트 제외
        ) {
          afterEffects.push({
            ...evt,
            id: `${evt.id}-after`,
            title: `[여진] ${evt.title}`,
            description: `${evt.title}의 잔여 효과`,
            remainingTicks: 50,
            duration: 50,
            impact: {
              driftModifier: evt.impact.driftModifier * 0.1,
              volatilityModifier: evt.impact.volatilityModifier * 0.15,
              severity: 'low',
            },
            source: 'aftereffect' as const,
            chainParentId: evt.id,
          })
        }
      })

      return {
        events: [...decayed.filter((evt) => evt.remainingTicks > 0), ...afterEffects],
      }
    })

    // News engine: historical events + chain events
    processNewsEngine(current.time)

    // Random event generation — normalize by speed so real-time frequency stays constant
    const eventChance = current.difficultyConfig.eventChance / current.time.speed
    if (Math.random() < eventChance) {
      generateRandomEvent()
    }

    // Update sentiment for newly added events
    const latestState = useGameStore.getState()
    latestState.events
      .filter((evt) => evt.duration === evt.remainingTicks) // 이번 시간에 생성된 이벤트
      .forEach((evt) => onEventOccurred(evt))

    // Employee System Processing (hourIndex 기반)
    const hourIndex = getBusinessHourIndex(current.time.hour)
    const empCount = current.player.employees.length
    const empHourInterval = empCount <= 5 ? 10 : empCount <= 15 ? 20 : 30
    if (hourIndex % empHourInterval === 0 && empCount > 0) {
      current.processEmployeeTick()
    }

    // Trade AI Pipeline (Analyst → Manager → Trader)
    if (empCount > 0) {
      // Analyst: hourIndex % 10 === 0 (매일 9시)
      if (hourIndex % 10 === 0) {
        current.processAnalystTick()
      }
      // Manager: hourIndex % 5 === 2 (11시, 16시)
      if (hourIndex % 5 === 2) {
        current.processManagerTick()
      }
      // Expire old proposals: hourIndex % 10 === 5 (14시)
      if (hourIndex % 10 === 5) {
        const absoluteTimestamp = getAbsoluteTimestamp(current.time, current.config.startYear)
        current.expireOldProposals(absoluteTimestamp)
      }
      // Trader: every hour when APPROVED proposals exist
      current.processTraderTick()
    }

    // AI Competitor Processing (every 5 hours)
    if (current.competitorCount > 0) {
      // Update competitor assets every hour for accurate ROI
      current.updateCompetitorAssets()

      // Process AI trading every 5 hours
      if (hourIndex % 5 === 0) {
        current.processCompetitorTick()
      }

      // Update rankings every 10 hours
      if (hourIndex % 10 === 0) {
        const rankings = current.calculateRankings()
        checkRankChanges(rankings)
      }
    }

    // Auto-save periodically
    autoSaveCounter++
    if (autoSaveCounter >= AUTO_SAVE_INTERVAL) {
      autoSaveCounter = 0
      current.autoSave()
    }
  }

  const updateInterval = () => {
    const speed = useGameStore.getState().time.speed
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(tick, BASE_HOUR_MS / speed)
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
  previousRankings = {}
  autoSaveCounter = 0
  resetNewsEngine()
  resetSentiment()

  if (unsubscribeSpeed) {
    unsubscribeSpeed()
    unsubscribeSpeed = null
  }

  worker?.terminate()
  worker = null
}

/* ── Event Propagation Delay ── */
/**
 * 이벤트 경과 시간에 따른 전파 계수
 * 0-10시간: 0→50% (빠른 반영)
 * 10-50시간: 50→100% (점진 반영)
 * 50+시간: 100% (풀 이펙트)
 */
function getEventPropagation(elapsed: number): number {
  if (elapsed < 10) return 0.5 * (elapsed / 10)
  if (elapsed < 50) return 0.5 + 0.5 * ((elapsed - 10) / 40)
  return 1.0
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

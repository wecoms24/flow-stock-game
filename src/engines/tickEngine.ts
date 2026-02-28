import { useGameStore } from '../stores/gameStore'
import { historicalDataService } from '../services/historicalDataService'
import { HYBRID_MODE_CONFIG } from '../config/hybridModeConfig'
import {
  generateRandomEvent,
  processNewsEngine,
  resetNewsEngine,
  createMnaNews,
} from './newsEngine'
import {
  onEventOccurred,
  tickSentiment,
  getSentimentDriftModifier,
  getSectorSentimentDrift,
  getSentimentVolatilityMultiplier,
  isSentimentActive,
  resetSentiment,
  onMnaOccurred,
} from './sentimentEngine'
import { evaluateMnaOpportunity, generateNewCompany } from './mnaEngine'
import { SECTOR_CORRELATION, SPILLOVER_FACTOR } from '../data/sectorCorrelation'
import type { Sector, MarketEvent } from '../types'
import { getRandomTaunt } from '../data/taunts'
import { getBusinessHourIndex, getAbsoluteTimestamp } from '../config/timeConfig'
import { MARKET_IMPACT_CONFIG } from '../config/marketImpactConfig'
import { autoSelectCards } from './cardDrawEngine'
import { REALTIME_TICK_INTERVAL } from '../config/kisConfig'
import { kisWebSocket } from '../services/kisWebSocketService'
import { startPriceAggregator, stopPriceAggregator } from '../services/kisPriceAggregator'
import {
  startSubscriptionManager,
  stopSubscriptionManager,
} from '../services/kisSubscriptionManager'

/* ── Tick Engine: 1-hour time control system ── */

let worker: Worker | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let unsubscribeSpeed: (() => void) | null = null
let autoSaveCounter = 0
let previousRankings: Record<string, number> = {} // Track previous rankings for change detection

const BASE_HOUR_MS = 1000 // 1 second = 1 hour at 1x speed
const AUTO_SAVE_INTERVAL = 300 // Auto-save every 300 hours (~5 min at 1x)

export function initTickEngine() {
  const state = useGameStore.getState()

  // 실시간 모드: Worker 대신 KIS WebSocket 사용
  if (state.config.gameMode === 'realtime') {
    initRealtimeServices()
    return
  }

  if (worker) return

  worker = new Worker(new URL('../workers/priceEngine.worker.ts', import.meta.url), {
    type: 'module',
  })

  worker.onmessage = (e) => {
    if (e.data.type === 'prices') {
      const store = useGameStore.getState()
      store.updatePrices(e.data.prices)
      store.processAutoSell()
      store.processLimitOrders()
    }
  }
}

/** 실시간 모드 서비스 초기화 */
function initRealtimeServices() {
  const state = useGameStore.getState()
  const creds = state.config.kisCredentials
  if (!creds) {
    console.error('[TickEngine] 실시간 모드이지만 KIS 자격증명이 없습니다')
    return
  }

  // WebSocket 연결 상태를 store에 반영
  kisWebSocket.onStatus((status, message) => {
    const statusMap = {
      connected: 'connected' as const,
      disconnected: 'disconnected' as const,
      reconnecting: 'reconnecting' as const,
      error: 'error' as const,
    }
    useGameStore.getState().updateRealtimeStatus({
      status: statusMap[status],
      errorMessage: message,
    })
  })

  // WebSocket 연결
  kisWebSocket.connect(creds)

  // 가격 집계기 시작
  startPriceAggregator()

  // 구독 관리자 시작
  startSubscriptionManager()
}

/** 실시간 모드 서비스 정리 */
function destroyRealtimeServices() {
  stopSubscriptionManager()
  stopPriceAggregator()
  kisWebSocket.disconnect()
}

export function startTickLoop() {
  if (intervalId) return

  const isRealtime = useGameStore.getState().config.gameMode === 'realtime'

  const tick = () => {
    const state = useGameStore.getState()
    if (state.time.isPaused || !state.isGameStarted) return
    // 실시간 모드에서는 worker 없이 동작
    if (!isRealtime && !worker) return

    // Advance game time
    state.advanceHour()

    // Hourly processing: salary/tax/stamina/mood/XP (distributed per-hour)
    useGameStore.getState().processHourly()

    // Re-read state after time advancement
    const current = useGameStore.getState()

    // Detect and update market regime (HMM-based)
    current.detectAndUpdateRegime()

    // Update circuit breaker every hour
    current.updateCircuitBreaker()

    // Update VI states every hour
    current.updateVIStates()

    // Update institutional flow every hour (섹터 순환 방식)
    const sectorIndex = current.time.hour % 10
    current.updateInstitutionalFlowForSector(sectorIndex)

    // Update session open prices at market open (9:00) every day
    if (current.time.hour === 9) {
      // KOSPI 모드: 실제 시가 주입
      if (current.config.gameMode === 'kospi' && historicalDataService.isReady) {
        const historicalOpens: Record<string, number> = {}
        for (const c of current.companies) {
          if (!c.historicalTicker || c.status === 'delisted') continue
          const open = historicalDataService.getOpen(
            c.historicalTicker,
            current.time.year,
            current.time.month,
            current.time.day,
          )
          if (open != null) historicalOpens[c.id] = open
        }
        current.updateSessionOpenPrices(historicalOpens)
      } else {
        current.updateSessionOpenPrices()
      }
    }

    // Monthly processing (salary, stamina) on day 1 at market open
    if (current.time.day === 1 && current.time.hour === 9) {
      current.processMonthly()

      // KOSPI 모드: IPO 체크 (매월 1일)
      if (current.config.gameMode === 'kospi' && historicalDataService.isReady) {
        for (const c of current.companies) {
          if (c.status !== 'delisted' || !c.historicalTicker) continue
          if (historicalDataService.isStockAvailable(c.historicalTicker, current.time.year)) {
            const ipoPrice = historicalDataService.getIPOPrice(c.historicalTicker)
            if (ipoPrice != null && ipoPrice > 0) {
              useGameStore.getState().executeKospiIPO(c.id, ipoPrice)
            }
          }
        }
      }
    }

    // M&A Processing: 분기 종료 체크 (3, 6, 9, 12월 말일 18시)
    if ([3, 6, 9, 12].includes(current.time.month) && current.time.day === 30 && current.time.hour === 18) {
      // Process scheduled IPOs first
      current.processScheduledIPOs()

      // Then evaluate M&A opportunities
      const currentQuarter = Math.floor((current.time.month - 1) / 3) + 1 + (current.time.year - current.config.startYear) * 4
      const result = evaluateMnaOpportunity(current.companies, currentQuarter, current.lastMnaQuarter)

      // Update lastMnaQuarter in store
      useGameStore.setState({ lastMnaQuarter: result.newLastMnaQuarter })

      if (result.deal) {
        const deal = result.deal
        const acquirer = current.companies.find((c) => c.id === deal.acquirerId)
        const target = current.companies.find((c) => c.id === deal.targetId)

        if (acquirer && target) {
          console.log(`[M&A] ${acquirer.name} acquires ${target.name} at ${deal.dealPrice.toFixed(0)} (${(deal.premium*100).toFixed(0)}% premium)`)

          // Execute acquisition
          current.executeAcquisition(deal.acquirerId, deal.targetId, deal)

          // Schedule IPO for the target slot
          const targetIndex = current.companies.findIndex((c) => c.id === deal.targetId)
          if (targetIndex >= 0) {
            const delayTicks = 180 + Math.random() * 180 // 180-360 hours
            const newCompany = generateNewCompany(target)
            current.scheduleIPO(targetIndex, delayTicks, newCompany)
          }

          // Create M&A news
          const news = createMnaNews(deal, acquirer, target, current.time)
          useGameStore.setState((s) => ({
            news: [news, ...s.news],
            unreadNewsCount: s.unreadNewsCount + 1,
          }))

          // Update sentiment
          onMnaOccurred(target.sector, deal.layoffRate > 0.4)
        }
      }
    }

    // 실시간 모드: Worker GBM 건너뜀 (가격은 WebSocket에서 직접 수신)
    if (isRealtime) {
      // 실시간 모드에서도 자동매매 처리
      useGameStore.getState().processAutoSell()
      useGameStore.getState().processLimitOrders()
    }

    // Send companies data to worker for GBM price calculation (비실시간 모드만)
    if (!isRealtime) {
    const volatilityMul = current.difficultyConfig.volatilityMultiplier
    const currentRegime = current.marketRegime.current
    const isKospiMode = current.config.gameMode === 'kospi' && historicalDataService.isReady
    const companyData = current.companies
      .filter((c) => c.status !== 'acquired' && c.status !== 'delisted')
      .map((c) => {
      // Apply regime-based volatility if defined, otherwise use base volatility
      const regimeVol = c.regimeVolatilities?.[currentRegime] ?? c.volatility

      // KOSPI 하이브리드 모드: 실제 종가 방향으로 correctionDrift 계산
      let correctionDrift: number | undefined
      if (isKospiMode && c.historicalTicker && c.price > 0) {
        const targetClose = historicalDataService.getClose(
          c.historicalTicker,
          current.time.year,
          current.time.month,
          current.time.day,
        )
        if (targetClose != null && targetClose > 0) {
          const strength = computeCorrectionStrength(current.events)
          const rawCorrection = Math.log(targetClose / c.price) * strength
          correctionDrift = Math.max(
            -HYBRID_MODE_CONFIG.MAX_CORRECTION_DRIFT,
            Math.min(HYBRID_MODE_CONFIG.MAX_CORRECTION_DRIFT, rawCorrection),
          )
        }
      }

      return {
        id: c.id,
        sector: c.sector,
        price: c.price,
        drift: c.drift,
        volatility: regimeVol * volatilityMul,
        financials: c.financials,
        institutionFlow: c.institutionFlow,
        sessionOpenPrice: c.sessionOpenPrice,
        basePrice: c.basePrice,
        marketCap: c.marketCap,
        correctionDrift,
      }
    })

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

    // Monthly Card effects → event modifiers
    const cardModifiers = current.monthlyCards.activeCards
      .filter((ac) => ac.remainingTicks > 0)
      .flatMap((ac) =>
        ac.card.effects.map((eff) => ({
          driftModifier: eff.driftModifier,
          volatilityModifier: eff.volatilityModifier,
          affectedCompanies: eff.targetCompanyId ? [eff.targetCompanyId] : undefined,
          affectedSectors: eff.targetSector ? [eff.targetSector as Sector] : undefined,
          propagation: 1.0,
          companySensitivities: {} as Record<string, number>,
        })),
      )
    eventModifiers.push(...cardModifiers)

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

    const dt = 1 / (10 * 365) // 1 tick = 1 hour = 1/(10*365) year (연간 비율로 전달)

    // Build order flow data for market impact
    const orderFlowEntries = Object.entries(current.orderFlowByCompany)
      .filter(([, flow]) => flow.tradeCount > 0)
      .map(([companyId, flow]) => ({
        companyId,
        netNotional: flow.netNotional,
        tradeCount: flow.tradeCount,
      }))

    worker!.postMessage({
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
    } // end of !isRealtime block

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

    // Monthly Card System: 효과 만료 + 타임아웃 자동 선택
    {
      const cardState = useGameStore.getState().monthlyCards
      // 활성 카드 효과 만료 (매 틱)
      if (cardState.activeCards.length > 0) {
        useGameStore.getState().expireCards()
      }
      // 선택 타임아웃: 자동 선택 (10시간 후)
      if (cardState.isDrawn && !cardState.isSelectionComplete && cardState.selectionDeadlineTick > 0) {
        const absTime = getAbsoluteTimestamp(current.time, current.config.startYear)
        if (absTime >= cardState.selectionDeadlineTick) {
          const autoIds = autoSelectCards(cardState.availableCards)
          autoIds.forEach((id) => useGameStore.getState().selectCard(id))
          useGameStore.getState().applyCardEffects()
        }
      }
    }

    // Event Chain: 주간 진행 (매주 월요일 = day 1, 8, 15, 22, 29에 해당하는 날의 9시)
    if ([1, 8, 15, 22, 29].includes(current.time.day) && current.time.hour === 10) {
      const chainState = useGameStore.getState().eventChains
      if (chainState.chains.some((c) => c.status === 'active')) {
        useGameStore.getState().advanceChain()
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
    if (intervalId) clearInterval(intervalId)
    if (isRealtime) {
      // 실시간 모드: 60초 간격 (1실분 = 1게임시간)
      intervalId = setInterval(tick, REALTIME_TICK_INTERVAL)
    } else {
      const speed = useGameStore.getState().time.speed
      intervalId = setInterval(tick, BASE_HOUR_MS / speed)
    }
  }

  updateInterval()

  // 실시간 모드에서는 속도 변경 구독 불필요
  if (!isRealtime) {
    unsubscribeSpeed = useGameStore.subscribe((state, prevState) => {
      if (state.time.speed !== prevState.time.speed) {
        updateInterval()
      }
    })
  }
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

  // 실시간 서비스 정리
  destroyRealtimeServices()

  worker?.terminate()
  worker = null
}

/* ── KOSPI Hybrid: Correction Strength ── */
/**
 * 활성 이벤트의 드리프트 절대값 합산으로 위기 여부 판정.
 * 위기 시 → 강한 보정 (실제 가격에 가깝게)
 * 평시 → 느슨한 보정 (GBM 변동성 유지)
 */
function computeCorrectionStrength(events: MarketEvent[]): number {
  const totalDriftImpact = events
    .filter((e) => e.remainingTicks > 0)
    .reduce((sum, e) => sum + Math.abs(e.impact.driftModifier), 0)

  return totalDriftImpact >= HYBRID_MODE_CONFIG.MAJOR_EVENT_DRIFT_THRESHOLD
    ? HYBRID_MODE_CONFIG.CRISIS_CORRECTION_STRENGTH
    : HYBRID_MODE_CONFIG.NORMAL_CORRECTION_STRENGTH
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
        const competitor = store.competitors.find((c) => c.name === entry.name)
        const style = competitor?.style

        if (entry.rank === 1 && prevRank !== 1) {
          // Became champion
          const msg = getRandomTaunt('champion', store.time.hour, style)
          store.addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "${msg}"`,
            type: 'champion',
            timestamp: Date.now(),
          })
        } else if (entry.rank < prevRank) {
          // Rank up
          const msg = getRandomTaunt('rank_up', store.time.hour, style)
          store.addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "${msg}"`,
            type: 'rank_up',
            timestamp: Date.now(),
          })
        } else if (entry.rank > prevRank) {
          // ✨ Core Values: Rank down (was missing!)
          const msg = getRandomTaunt('rank_down', store.time.hour, style)
          store.addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "${msg}"`,
            type: 'rank_down',
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
          const msg = getRandomTaunt('overtake', store.time.hour, style)
          store.addTaunt({
            competitorId: entry.name,
            competitorName: entry.name,
            message: `${entry.name}: "${msg}"`,
            type: 'overtake_player',
            timestamp: Date.now(),
          })
        }

        // ✨ Core Values: Rivalry tracking
        if (competitor) {
          const playerEntry2 = rankings.find((r) => r.isPlayer)
          if (playerEntry2) {
            store.updateRivalryTracking(entry.name, entry.rank < playerEntry2.rank)
          }
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

/* ── Market Sentiment Calculation ── */
/**
 * Calculate market sentiment based on active events
 * Returns a value between 0.7 and 1.3
 * 1.0 = neutral, >1.0 = bullish, <1.0 = bearish
 */
export function calculateMarketSentiment(events: MarketEvent[]): number {
  let sentiment = 1.0

  events.forEach((evt) => {
    if (evt.type === 'boom' || (evt.type === 'global' && evt.impact.driftModifier > 0)) {
      sentiment += 0.1
    } else if (evt.type === 'crash') {
      sentiment -= 0.2
    }
  })

  return Math.max(0.7, Math.min(1.3, sentiment)) // 0.7 ~ 1.3 범위
}

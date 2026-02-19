/**
 * 한투 실시간 가격 집계기
 * WebSocket 메시지 → 1초 배치 버퍼링 → gameStore.updatePrices() 호출 + DB 저장
 */

import { KIS_PRICE_BATCH_INTERVAL } from '../config/kisConfig'
import { useGameStore } from '../stores/gameStore'
import type { KISPriceData } from '../types/realtime'
import { savePriceBatch } from './kisPriceRepository'
import { kisWebSocket } from './kisWebSocketService'

/** ticker → companyId 매핑 캐시 */
let tickerToCompanyId: Map<string, string> | null = null

function getTickerMap(): Map<string, string> {
  if (tickerToCompanyId) return tickerToCompanyId

  const companies = useGameStore.getState().companies
  tickerToCompanyId = new Map()
  for (const c of companies) {
    if (c.historicalTicker) {
      tickerToCompanyId.set(c.historicalTicker, c.id)
    }
  }
  return tickerToCompanyId
}

/** 배치 버퍼 */
let priceBuffer = new Map<string, KISPriceData>() // ticker → 최신 데이터 (같은 ticker는 최신만 유지)
let flushTimer: ReturnType<typeof setInterval> | null = null
let unsubscribePrice: (() => void) | null = null

function handlePriceData(data: KISPriceData): void {
  priceBuffer.set(data.stockCode, data)
}

function flushBatch(): void {
  if (priceBuffer.size === 0) return

  const batch = priceBuffer
  priceBuffer = new Map()

  const map = getTickerMap()
  const priceUpdates: Record<string, number> = {}

  for (const [ticker, data] of batch) {
    const companyId = map.get(ticker)
    if (companyId) {
      priceUpdates[companyId] = data.price
    }
  }

  // Store 가격 업데이트
  if (Object.keys(priceUpdates).length > 0) {
    useGameStore.getState().updatePrices(priceUpdates)
    useGameStore.getState().updateRealtimeStatus({
      lastPriceUpdate: Date.now(),
      subscribedCount: kisWebSocket.getSubscribedCount(),
    })
  }

  // DB 저장 (비동기, 실패해도 게임은 계속)
  const batchArray = Array.from(batch.values())
  savePriceBatch(batchArray).catch(() => {
    // DB 저장 실패는 무시 (콘솔 로그만)
  })
}

/** 집계기 시작 */
export function startPriceAggregator(): void {
  tickerToCompanyId = null // 매핑 캐시 초기화
  unsubscribePrice = kisWebSocket.onPrice(handlePriceData)
  flushTimer = setInterval(flushBatch, KIS_PRICE_BATCH_INTERVAL)
}

/** 집계기 정지 */
export function stopPriceAggregator(): void {
  if (unsubscribePrice) {
    unsubscribePrice()
    unsubscribePrice = null
  }
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  // 남은 버퍼 flush
  flushBatch()
  tickerToCompanyId = null
}

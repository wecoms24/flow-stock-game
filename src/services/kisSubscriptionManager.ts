/**
 * 한투 WebSocket 구독 관리자
 * 우선순위 기반 최대 40종목 구독 관리
 */

import { KIS_MAX_SUBSCRIPTIONS } from '../config/kisConfig'
import { useGameStore } from '../stores/gameStore'
import { kisWebSocket } from './kisWebSocketService'

let throttleTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribeStore: (() => void) | null = null
const THROTTLE_MS = 5000

/**
 * 우선순위 기반 구독 대상 종목코드 계산
 * 1. 플레이어 보유 종목 (최우선)
 * 2. 열린 차트/트레이딩 윈도우 종목
 * 3. AI 경쟁자 보유 종목
 * 4. 시가총액 상위 종목 (나머지 슬롯)
 */
function computeSubscriptionList(): string[] {
  const state = useGameStore.getState()
  const companies = state.companies.filter((c) => c.status !== 'acquired')
  const tickerMap = new Map<string, string>() // companyId → historicalTicker

  for (const c of companies) {
    if (c.historicalTicker) {
      tickerMap.set(c.id, c.historicalTicker)
    }
  }

  const result: string[] = []
  const added = new Set<string>()

  const addTicker = (ticker: string) => {
    if (!added.has(ticker) && result.length < KIS_MAX_SUBSCRIPTIONS) {
      result.push(ticker)
      added.add(ticker)
    }
  }

  // 1. 플레이어 보유 종목
  for (const pos of Object.values(state.player.portfolio)) {
    if (pos.shares > 0) {
      const ticker = tickerMap.get(pos.companyId)
      if (ticker) addTicker(ticker)
    }
  }

  // 2. 열린 차트/트레이딩 윈도우 종목
  for (const w of state.windows) {
    if ((w.type === 'chart' || w.type === 'trading') && w.props?.companyId) {
      const ticker = tickerMap.get(w.props.companyId as string)
      if (ticker) addTicker(ticker)
    }
  }

  // 3. AI 경쟁자 보유 종목
  for (const comp of state.competitors) {
    for (const pos of Object.values(comp.portfolio)) {
      if (pos.shares > 0) {
        const ticker = tickerMap.get(pos.companyId)
        if (ticker) addTicker(ticker)
      }
    }
  }

  // 4. 시가총액 상위 (나머지 슬롯 채우기)
  const byMarketCap = [...companies].sort(
    (a, b) => (b.marketCap ?? b.price * 1_000_000) - (a.marketCap ?? a.price * 1_000_000),
  )
  for (const c of byMarketCap) {
    if (c.historicalTicker) addTicker(c.historicalTicker)
    if (result.length >= KIS_MAX_SUBSCRIPTIONS) break
  }

  return result
}

/** 현재 구독과 목표 구독 비교 후 diff 적용 */
function syncSubscriptions(): void {
  const desired = computeSubscriptionList()
  const desiredSet = new Set(desired)

  // 현재 구독 중인데 목표에 없는 것 → 해제
  // (kisWebSocket 내부 subscribedCodes 직접 접근 불가하므로 전체 재구독 방식)
  // 간단히: unsubscribe all → subscribe desired
  // 하지만 대량 해제/등록은 비효율적이므로, diff 방식 사용

  // KISWebSocketService에서 subscribedCodes를 외부에서 읽을 수 없으므로
  // 별도로 현재 목록을 추적
  const currentSet = currentSubscriptions

  // 해제 대상
  for (const code of currentSet) {
    if (!desiredSet.has(code)) {
      kisWebSocket.unsubscribe(code)
      currentSet.delete(code)
    }
  }

  // 등록 대상
  for (const code of desired) {
    if (!currentSet.has(code)) {
      kisWebSocket.subscribe(code)
      currentSet.add(code)
    }
  }
}

const currentSubscriptions = new Set<string>()

function scheduleSync(): void {
  if (throttleTimer) return
  throttleTimer = setTimeout(() => {
    throttleTimer = null
    syncSubscriptions()
  }, THROTTLE_MS)
}

/** 구독 관리자 시작 — store 변경 감지 */
export function startSubscriptionManager(): void {
  // 초기 구독
  syncSubscriptions()

  // store 변경 시 throttle로 구독 갱신
  unsubscribeStore = useGameStore.subscribe(() => {
    scheduleSync()
  })
}

/** 구독 관리자 정지 */
export function stopSubscriptionManager(): void {
  if (unsubscribeStore) {
    unsubscribeStore()
    unsubscribeStore = null
  }
  if (throttleTimer) {
    clearTimeout(throttleTimer)
    throttleTimer = null
  }
  currentSubscriptions.clear()
}

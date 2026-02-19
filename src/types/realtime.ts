/**
 * 한국투자증권 실시간 시세 관련 타입 정의
 */

export interface RealtimeConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  subscribedCount: number
  lastPriceUpdate: number
  errorMessage?: string
  marketOpen: boolean
}

export interface KISPriceData {
  stockCode: string // '005930'
  price: number // 현재가
  change: number // 전일대비
  changeRate: number // 전일대비율
  openPrice: number // 시가
  highPrice: number // 최고가
  lowPrice: number // 최저가
  askPrice: number // 매도호가1
  bidPrice: number // 매수호가1
  volume: number // 체결거래량
  accVolume: number // 누적거래량
  accAmount: number // 누적거래대금
  executionTime: string // HHMMSS
}

export const REALTIME_CONNECTION_INITIAL: RealtimeConnectionState = {
  status: 'disconnected',
  subscribedCount: 0,
  lastPriceUpdate: 0,
  marketOpen: false,
}

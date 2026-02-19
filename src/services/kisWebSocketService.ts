/**
 * 한국투자증권 WebSocket 서비스
 * H0STCNT0 실시간 체결가 수신
 */

import {
  H0STCNT0_FIELDS,
  KIS_RECONNECT_BACKOFF,
  KIS_TR_ID,
  KIS_WS_URL,
} from '../config/kisConfig'
import type { KISCredentials } from '../types'
import type { KISPriceData } from '../types/realtime'
import { getApprovalKey } from './kisAuthService'

type PriceHandler = (data: KISPriceData) => void
type StatusHandler = (status: 'connected' | 'disconnected' | 'reconnecting' | 'error', message?: string) => void

export class KISWebSocketService {
  private ws: WebSocket | null = null
  private credentials: KISCredentials | null = null
  private approvalKey: string | null = null
  private subscribedCodes = new Set<string>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay: number = KIS_RECONNECT_BACKOFF.INITIAL
  private intentionalClose = false
  private priceHandlers: PriceHandler[] = []
  private statusHandlers: StatusHandler[] = []

  onPrice(handler: PriceHandler): () => void {
    this.priceHandlers.push(handler)
    return () => {
      this.priceHandlers = this.priceHandlers.filter((h) => h !== handler)
    }
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler)
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler)
    }
  }

  private emitPrice(data: KISPriceData): void {
    for (const h of this.priceHandlers) h(data)
  }

  private emitStatus(status: 'connected' | 'disconnected' | 'reconnecting' | 'error', message?: string): void {
    for (const h of this.statusHandlers) h(status, message)
  }

  async connect(credentials: KISCredentials): Promise<void> {
    this.credentials = credentials
    this.intentionalClose = false

    try {
      this.approvalKey = await getApprovalKey(credentials)
    } catch (err) {
      this.emitStatus('error', `승인키 발급 실패: ${err}`)
      return
    }

    const url = credentials.isDemo ? KIS_WS_URL.DEMO : KIS_WS_URL.REAL
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectDelay = KIS_RECONNECT_BACKOFF.INITIAL
      this.emitStatus('connected')
      // 기존 구독 복원
      for (const code of this.subscribedCodes) {
        this.sendSubscribe(code)
      }
    }

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data as string)
    }

    this.ws.onerror = () => {
      this.emitStatus('error', 'WebSocket 오류 발생')
    }

    this.ws.onclose = () => {
      if (!this.intentionalClose) {
        this.emitStatus('reconnecting')
        this.scheduleReconnect()
      } else {
        this.emitStatus('disconnected')
      }
    }
  }

  disconnect(): void {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.subscribedCodes.clear()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.emitStatus('disconnected')
  }

  subscribe(stockCode: string): void {
    this.subscribedCodes.add(stockCode)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(stockCode)
    }
  }

  unsubscribe(stockCode: string): void {
    this.subscribedCodes.delete(stockCode)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscribe(stockCode)
    }
  }

  getSubscribedCount(): number {
    return this.subscribedCodes.size
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private sendSubscribe(stockCode: string): void {
    if (!this.ws || !this.approvalKey) return
    this.ws.send(
      JSON.stringify({
        header: {
          approval_key: this.approvalKey,
          custtype: 'P',
          tr_type: '1', // 등록
          'content-type': 'utf-8',
        },
        body: {
          input: {
            tr_id: KIS_TR_ID.STOCK_EXECUTION,
            tr_key: stockCode,
          },
        },
      }),
    )
  }

  private sendUnsubscribe(stockCode: string): void {
    if (!this.ws || !this.approvalKey) return
    this.ws.send(
      JSON.stringify({
        header: {
          approval_key: this.approvalKey,
          custtype: 'P',
          tr_type: '2', // 해제
          'content-type': 'utf-8',
        },
        body: {
          input: {
            tr_id: KIS_TR_ID.STOCK_EXECUTION,
            tr_key: stockCode,
          },
        },
      }),
    )
  }

  private handleMessage(raw: string): void {
    // PINGPONG 하트비트 처리 — 수신 데이터 그대로 echo
    if (raw === 'PINGPONG' || raw.startsWith('PINGPONG')) {
      this.ws?.send(raw)
      return
    }

    // JSON 응답 (구독 확인 등)
    if (raw.startsWith('{')) {
      // 구독 확인 응답은 무시 (로그만)
      return
    }

    // H0STCNT0 데이터: 헤더|body 형식
    // 암호화 여부에 따라 포맷이 다름. 기본적으로 비암호화 사용.
    // 포맷: 0|H0STCNT0|count|data
    const parts = raw.split('|')
    if (parts.length < 4) return

    const trId = parts[1]
    if (trId !== KIS_TR_ID.STOCK_EXECUTION) return

    const count = parseInt(parts[2], 10)
    const dataStr = parts[3]

    // 여러 건이 ^로 구분될 수 있음
    const records = dataStr.split('^')

    // H0STCNT0 필드 수
    const FIELD_COUNT = 46

    for (let i = 0; i < count; i++) {
      const offset = i * FIELD_COUNT
      if (offset + FIELD_COUNT > records.length) break

      const fields = records.slice(offset, offset + FIELD_COUNT)
      const priceData = this.parseFields(fields)
      if (priceData) {
        this.emitPrice(priceData)
      }
    }
  }

  private parseFields(fields: string[]): KISPriceData | null {
    try {
      const F = H0STCNT0_FIELDS
      return {
        stockCode: fields[F.STOCK_CODE],
        executionTime: fields[F.EXECUTION_TIME],
        price: Math.abs(parseFloat(fields[F.CURRENT_PRICE])),
        change: parseFloat(fields[F.CHANGE]),
        changeRate: parseFloat(fields[F.CHANGE_RATE]),
        openPrice: parseFloat(fields[F.OPEN_PRICE]),
        highPrice: parseFloat(fields[F.HIGH_PRICE]),
        lowPrice: parseFloat(fields[F.LOW_PRICE]),
        askPrice: parseFloat(fields[F.ASK_PRICE_1]),
        bidPrice: parseFloat(fields[F.BID_PRICE_1]),
        volume: parseInt(fields[F.VOLUME], 10),
        accVolume: parseInt(fields[F.ACC_VOLUME], 10),
        accAmount: parseFloat(fields[F.ACC_AMOUNT]),
      }
    } catch {
      return null
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(
        this.reconnectDelay * KIS_RECONNECT_BACKOFF.MULTIPLIER,
        KIS_RECONNECT_BACKOFF.MAX,
      )
      if (this.credentials) {
        this.connect(this.credentials)
      }
    }, this.reconnectDelay)
  }
}

/** 싱글턴 인스턴스 */
export const kisWebSocket = new KISWebSocketService()

/**
 * 한국투자증권 OpenAPI 설정
 * https://apiportal.koreainvestment.com
 */

/** WebSocket 접속 URL */
export const KIS_WS_URL = {
  REAL: 'ws://ops.koreainvestment.com:21000',
  DEMO: 'ws://ops.koreainvestment.com:31000',
} as const

/** REST API URL (Vite 프록시 경유) */
export const KIS_REST_BASE = '/kis-api'

/** 실시간 체결가 TR ID */
export const KIS_TR_ID = {
  /** 실시간 국내주식 체결가 */
  STOCK_EXECUTION: 'H0STCNT0',
} as const

/** WebSocket 구독 제한 */
export const KIS_MAX_SUBSCRIPTIONS = 40

/** 가격 배치 flush 간격 (ms) */
export const KIS_PRICE_BATCH_INTERVAL = 1000

/** 재연결 백오프 (ms) */
export const KIS_RECONNECT_BACKOFF = {
  INITIAL: 1000,
  MULTIPLIER: 2,
  MAX: 30000,
} as const

/**
 * H0STCNT0 메시지 필드 인덱스 (^ 구분자 기준)
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-real2#L_714c2dc0-56d7-415f-b528-1659ef26b368
 */
export const H0STCNT0_FIELDS = {
  STOCK_CODE: 0, // 유가증권 단축 종목코드
  EXECUTION_TIME: 1, // 주식 체결 시간 (HHMMSS)
  CURRENT_PRICE: 2, // 주식 현재가
  CHANGE_SIGN: 3, // 전일 대비 부호 (1상한,2상승,3보합,4하한,5하락)
  CHANGE: 4, // 전일 대비
  CHANGE_RATE: 5, // 전일 대비율
  WEIGHTED_AVG_PRICE: 6, // 가중 평균 주식 가격
  OPEN_PRICE: 7, // 주식 시가
  HIGH_PRICE: 8, // 주식 최고가
  LOW_PRICE: 9, // 주식 최저가
  ASK_PRICE_1: 10, // 매도호가1
  BID_PRICE_1: 11, // 매수호가1
  ACC_VOLUME: 12, // 누적 거래량
  ACC_AMOUNT: 13, // 누적 거래 대금
  VOLUME: 14, // 체결 거래량 (단주)
} as const

/** 실시간 모드 tick 간격 (ms) — 1실분 = 1게임시간 */
export const REALTIME_TICK_INTERVAL = 60_000

/** 자격증명 localStorage 키 */
export const KIS_CREDENTIALS_STORAGE_KEY = 'kis_credentials'

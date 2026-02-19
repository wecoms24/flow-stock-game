/**
 * 한투 실시간 가격 데이터 DB 저장/조회
 * realtime_prices 테이블 사용
 */

import { getDBSafe } from '../systems/sqlite'
import type { KISPriceData } from '../types/realtime'

export interface StoredPrice {
  ticker: string
  price: number
  openPrice: number | null
  highPrice: number | null
  lowPrice: number | null
  bidPrice: number | null
  askPrice: number | null
  volume: number | null
  accVolume: number | null
  accAmount: number | null
  changeRate: number | null
  receivedAt: number
}

export interface OHLCCandle {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

/** 배치 INSERT (트랜잭션) */
export async function savePriceBatch(prices: KISPriceData[]): Promise<void> {
  const db = getDBSafe()
  if (!db || prices.length === 0) return

  const now = Date.now()

  await db.run('BEGIN TRANSACTION;')
  try {
    for (const p of prices) {
      await db.run(
        `INSERT INTO realtime_prices
          (ticker, price, open_price, high_price, low_price, bid_price, ask_price,
           volume, acc_volume, acc_amount, change_rate, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          p.stockCode,
          p.price,
          p.openPrice,
          p.highPrice,
          p.lowPrice,
          p.bidPrice,
          p.askPrice,
          p.volume,
          p.accVolume,
          p.accAmount,
          p.changeRate,
          now,
        ],
      )
    }
    await db.run('COMMIT;')
  } catch (err) {
    await db.run('ROLLBACK;')
    console.error('[kisPriceRepository] savePriceBatch failed:', err)
  }
}

/** 기간별 가격 조회 */
export async function getPriceHistory(
  ticker: string,
  fromTs: number,
  toTs: number,
): Promise<StoredPrice[]> {
  const db = getDBSafe()
  if (!db) return []

  const rows = await db.run(
    `SELECT ticker, price, open_price, high_price, low_price,
            bid_price, ask_price, volume, acc_volume, acc_amount,
            change_rate, received_at
     FROM realtime_prices
     WHERE ticker = ? AND received_at BETWEEN ? AND ?
     ORDER BY received_at ASC;`,
    [ticker, fromTs, toTs],
  )

  return rows.map(mapRow)
}

/** 최신 가격 조회 (종목코드 배열) */
export async function getLatestPrices(
  tickers: string[],
): Promise<Map<string, StoredPrice>> {
  const db = getDBSafe()
  const result = new Map<string, StoredPrice>()
  if (!db || tickers.length === 0) return result

  for (const ticker of tickers) {
    const rows = await db.run(
      `SELECT ticker, price, open_price, high_price, low_price,
              bid_price, ask_price, volume, acc_volume, acc_amount,
              change_rate, received_at
       FROM realtime_prices
       WHERE ticker = ?
       ORDER BY received_at DESC
       LIMIT 1;`,
      [ticker],
    )
    if (rows.length > 0) {
      result.set(ticker, mapRow(rows[0]))
    }
  }

  return result
}

/** 캔들 데이터 (분봉/시간봉) */
export async function getOHLCCandles(
  ticker: string,
  intervalMs: number,
  count: number,
): Promise<OHLCCandle[]> {
  const db = getDBSafe()
  if (!db) return []

  // 최근 데이터부터 count * intervalMs 범위 조회
  const toTs = Date.now()
  const fromTs = toTs - count * intervalMs

  const rows = await db.run(
    `SELECT price, volume, received_at
     FROM realtime_prices
     WHERE ticker = ? AND received_at BETWEEN ? AND ?
     ORDER BY received_at ASC;`,
    [ticker, fromTs, toTs],
  )

  if (rows.length === 0) return []

  // interval로 그룹핑
  const candles: OHLCCandle[] = []
  let currentBucket = Math.floor((rows[0] as { received_at: number }).received_at / intervalMs) * intervalMs
  let open = 0
  let high = -Infinity
  let low = Infinity
  let close = 0
  let vol = 0

  for (const row of rows) {
    const r = row as { price: number; volume: number; received_at: number }
    const bucket = Math.floor(r.received_at / intervalMs) * intervalMs

    if (bucket !== currentBucket) {
      if (open > 0) {
        candles.push({ open, high, low, close, volume: vol, timestamp: currentBucket })
      }
      currentBucket = bucket
      open = r.price
      high = r.price
      low = r.price
      close = r.price
      vol = r.volume || 0
    } else {
      if (open === 0) open = r.price
      high = Math.max(high, r.price)
      low = Math.min(low, r.price)
      close = r.price
      vol += r.volume || 0
    }
  }

  // 마지막 캔들
  if (open > 0) {
    candles.push({ open, high, low, close, volume: vol, timestamp: currentBucket })
  }

  return candles.slice(-count)
}

/** 오래된 데이터 정리 (기본 90일) */
export async function cleanupOldData(daysToKeep = 90): Promise<number> {
  const db = getDBSafe()
  if (!db) return 0

  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
  await db.run('DELETE FROM realtime_prices WHERE received_at < ?;', [cutoff])

  const result = await db.run('SELECT changes() as cnt;')
  return (result[0] as { cnt: number })?.cnt ?? 0
}

/** 저장 통계 */
export async function getStorageStats(): Promise<{ totalRows: number; oldestTs: number | null; newestTs: number | null }> {
  const db = getDBSafe()
  if (!db) return { totalRows: 0, oldestTs: null, newestTs: null }

  const rows = await db.run(
    'SELECT COUNT(*) as cnt, MIN(received_at) as oldest, MAX(received_at) as newest FROM realtime_prices;',
  )
  const r = rows[0] as { cnt: number; oldest: number | null; newest: number | null }
  return {
    totalRows: r?.cnt ?? 0,
    oldestTs: r?.oldest ?? null,
    newestTs: r?.newest ?? null,
  }
}

function mapRow(row: Record<string, unknown>): StoredPrice {
  return {
    ticker: row.ticker as string,
    price: row.price as number,
    openPrice: row.open_price as number | null,
    highPrice: row.high_price as number | null,
    lowPrice: row.low_price as number | null,
    bidPrice: row.bid_price as number | null,
    askPrice: row.ask_price as number | null,
    volume: row.volume as number | null,
    accVolume: row.acc_volume as number | null,
    accAmount: row.acc_amount as number | null,
    changeRate: row.change_rate as number | null,
    receivedAt: row.received_at as number,
  }
}

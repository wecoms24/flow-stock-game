/**
 * Historical Data Service
 * =======================
 * 브라우저에서 KOSPI 역사적 데이터 DB(SQLite)를 로드하고 조회하는 서비스.
 * sql.js를 사용하여 정적 DB 파일을 메모리에 로드 후 동기 쿼리 수행.
 *
 * 게임 세이브용 @subframe7536/sqlite-wasm과는 완전히 분리된 읽기전용 인스턴스.
 */

import initSqlJs, { type Database } from 'sql.js'
// sql-wasm.wasm은 public/에 위치 — vite-plugin-wasm 변환 없이 /sql-wasm.wasm 으로 정적 서빙

export interface DailyPrice {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockStats {
  companyId: string
  nameKr: string
  sector: string
  annualDrift: number
  annualVolatility: number
  basePrice: number
  ipoDate: string | null
}

class HistoricalDataService {
  private db: Database | null = null
  private initialized = false

  // 캐시: 월별 거래일 수
  private tradingDayCountCache: Map<string, number> = new Map()
  // 캐시: 종목 메타데이터
  private metadataCache: Map<string, StockStats> = new Map()

  /** DB 초기화 여부 */
  get isReady(): boolean {
    return this.initialized && this.db !== null
  }

  /**
   * KOSPI 역사 DB를 fetch하여 메모리에 로드
   * @param onProgress 진행률 콜백 (0-100)
   */
  async initialize(onProgress?: (pct: number) => void): Promise<void> {
    if (this.initialized) return

    onProgress?.(0)

    // 1) sql.js WASM 초기화
    // public/sql-wasm.wasm → Vite가 변환 없이 /sql-wasm.wasm 으로 정적 서빙
    // (vite-plugin-wasm은 src/ import만 처리, public/ 파일은 그대로 통과)
    const SQL = await initSqlJs({
      locateFile: (file: string) => (file === 'sql-wasm.wasm' ? '/sql-wasm.wasm' : file),
    })
    onProgress?.(20)

    // 2) DB 파일 fetch
    const response = await fetch('/kospi-historical.db')
    if (!response.ok) {
      throw new Error(`KOSPI DB 로드 실패: ${response.status} ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0

    // 3) 진행률 추적하며 다운로드
    let receivedBytes = 0
    const chunks: Uint8Array[] = []
    const reader = response.body?.getReader()

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        receivedBytes += value.length
        if (totalBytes > 0) {
          const fetchProgress = 20 + (receivedBytes / totalBytes) * 60 // 20-80%
          onProgress?.(Math.min(80, Math.round(fetchProgress)))
        }
      }
    }

    // 4) Uint8Array 합치기
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
    const buffer = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }
    onProgress?.(85)

    // 5) sql.js DB 인스턴스 생성
    this.db = new SQL.Database(buffer)
    onProgress?.(90)

    // 6) 메타데이터 캐시 프리로드
    this.preloadMetadata()
    onProgress?.(100)

    this.initialized = true
    console.log('[HistoricalDataService] 초기화 완료')
  }

  /** 메타데이터 전체 캐시 */
  private preloadMetadata(): void {
    if (!this.db) return
    const stmt = this.db.prepare(
      'SELECT ticker, company_id, name_kr, sector, ipo_date, annual_drift, annual_volatility, base_price FROM stock_metadata'
    )
    while (stmt.step()) {
      const row = stmt.getAsObject() as {
        ticker: string
        company_id: string
        name_kr: string
        sector: string
        ipo_date: string | null
        annual_drift: number
        annual_volatility: number
        base_price: number
      }
      this.metadataCache.set(row.ticker, {
        companyId: row.company_id,
        nameKr: row.name_kr,
        sector: row.sector,
        annualDrift: row.annual_drift,
        annualVolatility: row.annual_volatility,
        basePrice: row.base_price,
        ipoDate: row.ipo_date,
      })
    }
    stmt.free()
  }

  /**
   * 종목 메타데이터 조회
   */
  getStockStats(ticker: string): StockStats | null {
    return this.metadataCache.get(ticker) ?? null
  }

  /**
   * 모든 종목 메타데이터 반환
   */
  getAllStocks(): Map<string, StockStats> {
    return this.metadataCache
  }

  /**
   * 해당 월의 실제 거래일 수 조회
   */
  getTradingDayCount(ticker: string, year: number, month: number): number {
    const key = `${ticker}-${year}-${month}`
    const cached = this.tradingDayCountCache.get(key)
    if (cached !== undefined) return cached

    if (!this.db) return 22 // 기본값

    const stmt = this.db.prepare(
      'SELECT trading_day_count FROM monthly_stats WHERE ticker = ? AND year = ? AND month = ?'
    )
    stmt.bind([ticker, year, month])

    let count = 22
    if (stmt.step()) {
      const row = stmt.getAsObject() as { trading_day_count: number }
      count = row.trading_day_count
    }
    stmt.free()

    this.tradingDayCountCache.set(key, count)
    return count
  }

  /**
   * 게임일(1-30) → 실제 거래일 인덱스 비례 매핑
   * 게임은 30일/월, 실제는 ~22거래일/월
   */
  gameDayToSeq(ticker: string, year: number, month: number, gameDay: number): number {
    const tradingDays = this.getTradingDayCount(ticker, year, month)
    if (tradingDays <= 0) return 1

    // 게임 30일 ↔ 실제 거래일 비례 매핑
    const ratio = tradingDays / 30
    const seq = Math.max(1, Math.min(tradingDays, Math.round(gameDay * ratio)))
    return seq
  }

  /**
   * 일별 가격 데이터 조회
   */
  getDailyPrice(ticker: string, year: number, month: number, daySeq: number): DailyPrice | null {
    if (!this.db) return null

    const stmt = this.db.prepare(
      'SELECT open, high, low, close, volume FROM daily_prices WHERE ticker = ? AND year = ? AND month = ? AND day_seq = ?'
    )
    stmt.bind([ticker, year, month, daySeq])

    let result: DailyPrice | null = null
    if (stmt.step()) {
      const row = stmt.getAsObject() as {
        open: number
        high: number
        low: number
        close: number
        volume: number
      }
      result = {
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      }
    }
    stmt.free()
    return result
  }

  /**
   * 게임일 기준 종가 조회
   */
  getClose(ticker: string, year: number, month: number, gameDay: number): number | null {
    const seq = this.gameDayToSeq(ticker, year, month, gameDay)
    const price = this.getDailyPrice(ticker, year, month, seq)
    return price?.close ?? null
  }

  /**
   * 게임일 기준 시가 조회
   */
  getOpen(ticker: string, year: number, month: number, gameDay: number): number | null {
    const seq = this.gameDayToSeq(ticker, year, month, gameDay)
    const price = this.getDailyPrice(ticker, year, month, seq)
    return price?.open ?? null
  }

  /**
   * 해당 연도에 종목이 거래 가능한지 확인 (IPO 이후)
   */
  isStockAvailable(ticker: string, year: number): boolean {
    const stats = this.metadataCache.get(ticker)
    if (!stats) return false

    // IPO 날짜가 없으면 1995 이전 상장 = 항상 거래 가능
    if (!stats.ipoDate) return true

    const ipoYear = parseInt(stats.ipoDate.substring(0, 4), 10)
    return year >= ipoYear
  }

  /**
   * 해당 연도에 IPO되는 종목인지 확인
   */
  isIPOYear(ticker: string, year: number): boolean {
    const stats = this.metadataCache.get(ticker)
    if (!stats?.ipoDate) return false

    const ipoYear = parseInt(stats.ipoDate.substring(0, 4), 10)
    return ipoYear === year
  }

  /**
   * IPO 시점의 가격 조회
   */
  getIPOPrice(ticker: string): number | null {
    const stats = this.metadataCache.get(ticker)
    if (!stats) return null

    if (!stats.ipoDate) {
      return stats.basePrice // 1995 이전 상장 = basePrice 사용
    }

    if (!this.db) return stats.basePrice

    // IPO 날짜의 종가 조회
    const stmt = this.db.prepare(
      'SELECT close FROM daily_prices WHERE ticker = ? AND date >= ? ORDER BY date ASC LIMIT 1'
    )
    stmt.bind([ticker, stats.ipoDate])

    let price: number | null = null
    if (stmt.step()) {
      const row = stmt.getAsObject() as { close: number }
      price = row.close
    }
    stmt.free()

    return price ?? stats.basePrice
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.db?.close()
    this.db = null
    this.initialized = false
    this.tradingDayCountCache.clear()
    this.metadataCache.clear()
  }
}

/** 싱글톤 인스턴스 */
export const historicalDataService = new HistoricalDataService()

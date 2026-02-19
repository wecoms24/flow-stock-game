# KOSPI 실제 데이터 연동 리서치 보고서

> 작성일: 2026-02-19
> 목표: 실제 KOSPI 주식 데이터를 게임에 연동, 별도 DB에 누적, 1995년~현재 역사적 데이터 기반 게임 플레이

---

## 1. Executive Summary

실제 KOSPI 데이터를 게임에 연동하는 것은 **충분히 실현 가능**하다.

- **데이터**: [marcap 데이터셋](https://github.com/FinanceData/marcap)이 1995-05-02~현재까지 전 종목 일별 OHLCV를 무료로 제공 (매일 자동 업데이트)
- **저장**: SQLite DB 파일로 빌드 타임에 생성, 브라우저에서 sql.js로 읽기전용 로드
- **통합**: 기존 GBM Worker를 바이패스하거나 보정하여 실제 가격 데이터 재생
- **추정 규모**: 20~50 종목 × 30년 = 15~40MB SQLite DB

---

## 2. 데이터 소스 비교

### 2.1 marcap 데이터셋 (최적 추천)

| 항목 | 내용 |
|------|------|
| 제공자 | [FinanceData/marcap](https://github.com/FinanceData/marcap) |
| 기간 | **1995-05-02 ~ 현재** (매일 자동 업데이트) |
| 규모 | **1,000만건+**, 1.8GB (비압축) |
| 형식 | 년도별 CSV.gz 파일 |
| 비용 | **무료** (오픈소스) |
| 컬럼 (18개) | Code, Name, Open, High, Low, Close, Volume, Amount, MarketCap, Shares, Market, Rank 등 |
| 라이센스 | MIT |

**장점**:
- 1995년부터 모든 KRX 상장 종목 포함
- 매일 자동 업데이트 (git pull만 하면 최신)
- Python 유틸 함수 제공 (`marcap_data()`)
- OHLCV + 시가총액 + 순위까지 포함

### 2.2 기타 소스 비교

| 소스 | 1995년~ | 무료 | 개별종목 | API | 비고 |
|------|---------|------|----------|-----|------|
| [marcap](https://github.com/FinanceData/marcap) | O | O | O | Python | **최적** |
| [pykrx](https://github.com/sharebook-kr/pykrx) | △ (2000년~) | O | O | Python | KRX 스크래핑, 과도한 요청시 IP 차단 |
| [FinanceDataReader](https://github.com/FinanceData/FinanceDataReader) | △ (종목별 상이) | O | O | Python | 여러 소스 통합 크롤러 |
| [KRX 정보데이터시스템](https://data.krx.co.kr) | O | O | O | 웹 | 수동 다운로드, API 제한 |
| [KRX Open API](http://openapi.krx.co.kr) | X (실시간) | O | O | REST | 실시간/당일 데이터 중심 |
| [공공데이터포털](https://www.data.go.kr/data/15094808/openapi.do) | X | O | O | REST | 최근 데이터 중심 |
| [Yahoo Finance](https://finance.yahoo.com/quote/005930.KS/history/) | △ | O | O | JS npm | CORS 제한, 한국 종목 불완전 |
| [Investing.com](https://kr.investing.com/indices/kospi-historical-data) | O | O | △ | 웹 | 지수만, API 없음 |

### 2.3 실시간/최신 데이터 (선택적 확장)

| 소스 | 용도 | 비용 |
|------|------|------|
| [KRX Open API](http://openapi.krx.co.kr) | 당일 실시간 시세 | 무료 (가입 필요) |
| [코스콤 Open API](https://koscom.gitbook.io/open-api) | 실시간 지수/종목 | 유료 |
| pykrx 일일 스크래핑 | 전일 종가 업데이트 | 무료 |

---

## 3. 현재 게임 가격 엔진 구조

### 3.1 현재 파이프라인

```
tickEngine.ts (매 게임 시간)
  → worker.postMessage(TickMessage)
    → priceEngine.worker.ts
      → calculateAdjustedParameters() (펀더멘털 보정)
      → Event modifiers (이벤트 영향)
      → Sentiment modifiers (센티먼트)
      → Market impact (tanh 주문흐름)
      → GBM: S(t+dt) = S(t) * exp((μ-σ²/2)dt + σ√dt·Z)
      → Price limits (±30%, VI, 틱사이즈)
    → postMessage({ type: 'prices', prices: Record<string, number> })
  → store.updatePrices(prices)
    → priceHistory 업데이트 (max 300)
    → 시가총액 재계산
    → 포트폴리오 재평가
```

### 3.2 핵심 통합 포인트

| 포인트 | 파일 | 설명 |
|--------|------|------|
| `updatePrices()` | `gameStore.ts:2090` | **단일 진입점** — `Record<string, number>` 받으면 됨 |
| `Worker postMessage` | `tickEngine.ts:272` | 바이패스 가능 (실제 가격 직접 주입) |
| `Company.sessionOpenPrice` | 매일 9시 리셋 | 실제 시가로 설정 가능 |
| `Company.drift/volatility` | 각 Company | 실제 통계로 대체 가능 |
| `Company.basePrice` | IPO 기준가 | 실제 상장 초기 가격 |

### 3.3 Company 타입 (주요 필드)

```typescript
interface Company {
  id: string              // 종목코드로 매핑 ('005930')
  name: string            // '삼성전자'
  ticker: string          // '005930'
  sector: Sector          // 10개 섹터 중 하나
  price: number           // 현재가
  previousPrice: number
  basePrice: number       // 기준가 (IPO 가격)
  sessionOpenPrice: number // 당일 시가
  priceHistory: number[]  // max 300
  volatility: number      // GBM σ
  drift: number           // GBM μ
  marketCap: number
  financials: Financials
  // ...
}
```

---

## 4. 제안 아키텍처

### 4.1 전체 시스템 구성도

```
┌──────────────────────────────────────────────────────────────────┐
│  Phase 1: 데이터 수집 파이프라인 (빌드 타임, Python)             │
│                                                                  │
│  marcap 레포 (git pull)                                         │
│       │                                                          │
│       ▼                                                          │
│  scripts/build_kospi_db.py                                       │
│   ├─ CSV.gz 파싱                                                │
│   ├─ 종목 필터 (시총 상위 20~50 + 게임 매칭)                     │
│   ├─ 섹터 분류 (GICS → 게임 10섹터 매핑)                        │
│   ├─ 통계 계산 (연간 drift, volatility, 이동평균)               │
│   └─ SQLite DB 생성 → public/data/kospi_historical.db           │
│                        (~15-40MB)                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Phase 2: 브라우저 데이터 로딩                                   │
│                                                                  │
│  게임 시작 → "실제 KOSPI 모드" 선택                              │
│       │                                                          │
│       ▼                                                          │
│  HistoricalDataService (새 모듈)                                 │
│   ├─ fetch('/data/kospi_historical.db')                          │
│   ├─ sql.js WASM 로 읽기전용 DB 열기                            │
│   ├─ 캐싱: IndexedDB에 DB 파일 저장 (재방문시 빠른 로딩)        │
│   └─ API: getPrice(code, date), getCompanies(year), etc.        │
│                                                                  │
│  ※ 기존 게임 저장 DB (@subframe7536/sqlite-wasm)와 완전 분리    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Phase 3: 게임 엔진 통합                                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ RealStockMode (3가지 모드)                               │    │
│  │                                                          │    │
│  │ A. 역사적 리플레이                                       │    │
│  │    - 게임 시간에 맞춰 실제 일별 종가 재생               │    │
│  │    - GBM 비활성화, Worker 바이패스                       │    │
│  │    - 장중 가격: 시가~종가 보간 + 노이즈                 │    │
│  │                                                          │    │
│  │ B. 실제 기반 시뮬레이션                                  │    │
│  │    - 실제 연간 drift/volatility로 GBM 파라미터 보정     │    │
│  │    - 이벤트 시스템과 연동                                │    │
│  │    - 매번 다른 결과 (현실적 범위 내)                     │    │
│  │                                                          │    │
│  │ C. 하이브리드 (추천)                                     │    │
│  │    - 대형 이벤트 기간: 실제 변동폭 반영                 │    │
│  │    - 평시: 실제 통계 기반 GBM                           │    │
│  │    - historicalEvents.ts와 연동                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  기존 Company 매핑:                                              │
│   가상 20개 종목 → 실제 KOSPI 대표 종목 20개                    │
│   또는 가상 회사 유지 + 가격 패턴만 실제 데이터 반영             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Phase 4: 데이터 갱신 (선택적)                                   │
│                                                                  │
│  Option A: 수동 업데이트                                         │
│   - 관리자가 주기적으로 Python 스크립트 실행                     │
│   - DB 파일 교체 후 재배포                                       │
│                                                                  │
│  Option B: 자동 업데이트 (서버리스)                               │
│   - GitHub Actions: marcap pull → DB 빌드 → CDN 업로드          │
│   - 매일 자동 실행 (cron)                                       │
│                                                                  │
│  Option C: 런타임 업데이트 API                                   │
│   - Cloudflare Worker / Vercel Function                          │
│   - 클라이언트에서 최신 데이터만 delta 다운로드                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 DB 스키마 설계

```sql
-- 종목 마스터
CREATE TABLE stocks (
  code TEXT PRIMARY KEY,          -- '005930'
  name TEXT NOT NULL,             -- '삼성전자'
  sector TEXT NOT NULL,           -- 게임 섹터로 매핑 ('tech', 'finance', ...)
  market TEXT NOT NULL,           -- 'KOSPI', 'KOSDAQ'
  listed_date TEXT,               -- '1975-06-11'
  delisted_date TEXT,             -- NULL if active
  game_company_id TEXT            -- 기존 가상 회사와 매핑 (선택)
);

-- 일별 OHLCV (핵심 테이블)
CREATE TABLE daily_prices (
  code TEXT NOT NULL,
  date TEXT NOT NULL,             -- 'YYYY-MM-DD'
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume INTEGER NOT NULL,
  market_cap REAL,                -- 시가총액 (백만원)
  change_pct REAL,                -- 전일대비 등락률
  PRIMARY KEY (code, date)
);

-- 연간 통계 (GBM 파라미터 보정용)
CREATE TABLE yearly_stats (
  code TEXT NOT NULL,
  year INTEGER NOT NULL,
  avg_drift REAL,                 -- 연간 평균 수익률
  avg_volatility REAL,            -- 연간 변동성 (std)
  max_drawdown REAL,              -- 최대 낙폭
  avg_volume REAL,                -- 평균 거래량
  year_high REAL,                 -- 연중 고가
  year_low REAL,                  -- 연중 저가
  PRIMARY KEY (code, year)
);

-- KOSPI 지수
CREATE TABLE kospi_index (
  date TEXT PRIMARY KEY,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER
);

-- 대형 경제 이벤트 (하이브리드 모드용)
CREATE TABLE major_events (
  id INTEGER PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  event_name TEXT NOT NULL,       -- 'IMF 위기', '닷컴 버블', '2008 금융위기'
  event_type TEXT NOT NULL,       -- 'crisis', 'bubble', 'recovery'
  kospi_change_pct REAL,          -- 이벤트 기간 KOSPI 변동률
  affected_sectors TEXT           -- JSON: ['finance', 'industrial']
);

-- 인덱스
CREATE INDEX idx_daily_date ON daily_prices(date);
CREATE INDEX idx_daily_code ON daily_prices(code);
CREATE INDEX idx_yearly_code ON yearly_stats(code);
```

### 4.3 데이터 양 추정

| 항목 | 수량 | 비고 |
|------|------|------|
| 거래일 (30년) | ~7,500일 | 연 250 거래일 |
| 20 종목 선택 시 | **150,000 레코드** | daily_prices |
| 50 종목 선택 시 | **375,000 레코드** | daily_prices |
| KOSPI 지수 | ~7,500 레코드 | kospi_index |
| 연간 통계 | ~600~1,500 레코드 | yearly_stats |
| DB 파일 크기 | **~15-40MB** | 종목 수에 따라 |
| gz 압축 시 | **~5-15MB** | CDN 전송 최적화 |

---

## 5. 데이터 수집 스크립트 설계

### 5.1 Python 스크립트 (scripts/build_kospi_db.py)

```python
"""
KOSPI Historical Data → SQLite DB Builder
사용법: python scripts/build_kospi_db.py [--stocks 20] [--output public/data/kospi.db]
"""

import sqlite3
import pandas as pd
from marcap import marcap_data  # marcap 라이브러리

# 게임 섹터 매핑 (GICS → 게임 10섹터)
SECTOR_MAP = {
    '전기전자': 'tech',
    '반도체': 'tech',
    '은행': 'finance',
    '증권': 'finance',
    '보험': 'finance',
    '정유': 'energy',
    '전력': 'utilities',
    '의약품': 'healthcare',
    '음식료': 'consumer',
    '유통': 'consumer',
    '건설': 'industrial',
    '기계': 'industrial',
    '통신': 'telecom',
    '철강': 'materials',
    '화학': 'materials',
    '부동산': 'realestate',
    # ... 세부 매핑
}

# 대표 종목 20선 (게임용)
TARGET_STOCKS = {
    '005930': ('삼성전자', 'tech'),
    '000660': ('SK하이닉스', 'tech'),
    '035420': ('NAVER', 'tech'),
    '035720': ('카카오', 'tech'),
    '005380': ('현대차', 'industrial'),
    '051910': ('LG화학', 'materials'),
    '006400': ('삼성SDI', 'tech'),
    '105560': ('KB금융', 'finance'),
    '055550': ('신한지주', 'finance'),
    '003550': ('LG', 'industrial'),
    '017670': ('SK텔레콤', 'telecom'),
    '030200': ('KT', 'telecom'),
    '032830': ('삼성생명', 'finance'),
    '034730': ('SK', 'energy'),
    '015760': ('한국전력', 'utilities'),
    '012330': ('현대모비스', 'industrial'),
    '066570': ('LG전자', 'tech'),
    '096770': ('SK이노베이션', 'energy'),
    '004020': ('현대제철', 'materials'),
    '028260': ('삼성물산', 'realestate'),
}

def build_database(output_path, num_stocks=20):
    conn = sqlite3.connect(output_path)

    # 1. 종목 마스터 생성
    create_tables(conn)

    # 2. 년도별 데이터 수집
    for year in range(1995, 2027):
        df = marcap_data(f'{year}-01-01', f'{year}-12-31')
        # 대상 종목 필터
        df_filtered = df[df['Code'].isin(TARGET_STOCKS.keys())]
        # daily_prices 테이블에 삽입
        insert_daily_prices(conn, df_filtered)

    # 3. 연간 통계 계산
    calculate_yearly_stats(conn)

    # 4. KOSPI 지수 데이터 (FinanceDataReader 활용)
    import FinanceDataReader as fdr
    kospi = fdr.DataReader('KS11', '1995')
    insert_kospi_index(conn, kospi)

    conn.close()
```

### 5.2 자동화 (GitHub Actions)

```yaml
# .github/workflows/update-kospi-data.yml
name: Update KOSPI Data
on:
  schedule:
    - cron: '0 20 * * 1-5'  # 평일 KST 05:00 (장 마감 후)
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install marcap FinanceDataReader pykrx
      - run: python scripts/build_kospi_db.py --output public/data/kospi.db
      - run: gzip -k public/data/kospi.db
      - uses: actions/upload-artifact@v4
        with:
          name: kospi-db
          path: public/data/kospi.db.gz
```

---

## 6. 브라우저 데이터 서비스 설계

### 6.1 HistoricalDataService

```typescript
// src/services/historicalDataService.ts

import initSqlJs, { Database } from 'sql.js'

export class HistoricalDataService {
  private db: Database | null = null

  /** DB 파일 로드 (첫 로딩시 ~15-40MB fetch, 이후 IndexedDB 캐시) */
  async initialize(): Promise<void> {
    // 1. IndexedDB 캐시 확인
    const cached = await this.loadFromCache()
    if (cached) {
      const SQL = await initSqlJs({ locateFile: f => `/sql.js/${f}` })
      this.db = new SQL.Database(new Uint8Array(cached))
      return
    }

    // 2. 서버에서 fetch
    const response = await fetch('/data/kospi_historical.db')
    const buffer = await response.arrayBuffer()

    // 3. sql.js로 열기
    const SQL = await initSqlJs({ locateFile: f => `/sql.js/${f}` })
    this.db = new SQL.Database(new Uint8Array(buffer))

    // 4. IndexedDB에 캐시
    await this.saveToCache(buffer)
  }

  /** 특정 날짜의 종가 조회 */
  getPrice(code: string, date: string): number | null {
    const result = this.db!.exec(
      'SELECT close FROM daily_prices WHERE code = ? AND date = ?',
      [code, date]
    )
    return result.length > 0 ? result[0].values[0][0] as number : null
  }

  /** 특정 기간의 OHLCV 조회 */
  getOHLCV(code: string, startDate: string, endDate: string): DailyPrice[] {
    const result = this.db!.exec(
      `SELECT date, open, high, low, close, volume
       FROM daily_prices
       WHERE code = ? AND date BETWEEN ? AND ?
       ORDER BY date`,
      [code, startDate, endDate]
    )
    // ... 변환 로직
  }

  /** 특정 연도에 상장된 종목 목록 */
  getActiveStocks(year: number): StockInfo[] {
    const result = this.db!.exec(
      `SELECT code, name, sector FROM stocks
       WHERE listed_date <= ? AND (delisted_date IS NULL OR delisted_date >= ?)`,
      [`${year}-12-31`, `${year}-01-01`]
    )
    // ... 변환 로직
  }

  /** 연간 통계 (GBM 보정용) */
  getYearlyStats(code: string, year: number): YearlyStats | null {
    const result = this.db!.exec(
      'SELECT * FROM yearly_stats WHERE code = ? AND year = ?',
      [code, year]
    )
    // ... 변환 로직
  }

  /** 일별 수익률 계산 */
  getDailyReturn(code: string, date: string): number | null {
    const result = this.db!.exec(
      `SELECT change_pct FROM daily_prices WHERE code = ? AND date = ?`,
      [code, date]
    )
    return result.length > 0 ? result[0].values[0][0] as number : null
  }
}
```

### 6.2 게임 엔진 통합 (Mode A: 역사적 리플레이)

```typescript
// src/engines/realStockEngine.ts

export function processRealStockTick(
  historicalService: HistoricalDataService,
  gameTime: GameTime,
  companies: Company[]
): Record<string, number> {
  const gameDate = formatGameDate(gameTime) // 'YYYY-MM-DD'
  const prices: Record<string, number> = {}

  for (const company of companies) {
    const realCode = company.ticker // 실제 종목코드
    const ohlcv = historicalService.getOHLCV(realCode, gameDate, gameDate)

    if (ohlcv.length > 0) {
      const data = ohlcv[0]
      const { hour } = gameTime

      // 장중 가격 보간 (시가 → 종가)
      // 9시=시가, 13시=고가or저가, 18시=종가
      const progress = (hour - 9) / 9 // 0.0 ~ 1.0
      const interpolated = interpolateIntraday(
        data.open, data.high, data.low, data.close, progress
      )

      // 약간의 노이즈 추가 (리플레이 마다 미세한 차이)
      const noise = 1 + (Math.random() - 0.5) * 0.002 // ±0.1%
      prices[company.id] = Math.round(interpolated * noise)
    }
  }

  return prices
}

/** 시가/고가/저가/종가를 이용한 장중 가격 보간 */
function interpolateIntraday(
  open: number, high: number, low: number, close: number,
  progress: number // 0.0 (시가) ~ 1.0 (종가)
): number {
  // 삼각형 보간: open → high/low → close
  if (progress < 0.4) {
    // 시가 → 고가/저가 구간
    const t = progress / 0.4
    const target = close > open ? high : low // 상승일이면 먼저 고가 터치
    return open + (target - open) * t
  } else {
    // 고가/저가 → 종가 구간
    const t = (progress - 0.4) / 0.6
    const from = close > open ? high : low
    return from + (close - from) * t
  }
}
```

---

## 7. 종목 매핑 전략

### 7.1 Option A: 실제 종목으로 완전 교체

기존 가상 20개 → 실제 KOSPI 대표 20개로 교체:

| 가상 회사 (현재) | 실제 종목 제안 | 섹터 |
|-----------------|---------------|------|
| 가상 tech 1 | 삼성전자 (005930) | tech |
| 가상 tech 2 | SK하이닉스 (000660) | tech |
| 가상 finance 1 | KB금융 (105560) | finance |
| 가상 finance 2 | 신한지주 (055550) | finance |
| 가상 energy 1 | SK (034730) | energy |
| 가상 energy 2 | SK이노베이션 (096770) | energy |
| ... | ... | ... |

**장점**: 완전한 현실감, 실제 종목으로 거래
**단점**: 기존 게임 밸런스 조정 필요, 법적 검토 필요

### 7.2 Option B: 가상 회사 유지 + 가격 패턴만 실제

- 가상 회사 이름/설명 유지
- 가격 변동 패턴만 실제 종목의 일별 수익률 반영
- `drift` = 실제 연간 수익률, `volatility` = 실제 연간 변동성

**장점**: 기존 게임 시스템과 호환, 법적 이슈 회피
**단점**: "실제 주식" 느낌 약화

### 7.3 Option C: 하이브리드 (추천)

- 게임 모드 선택: "가상 주식" vs "실제 KOSPI"
- 실제 모드: 종목명, 로고, 재무제표 모두 실제 데이터
- 가상 모드: 기존 시스템 유지

---

## 8. 기술적 고려사항

### 8.1 의존성 추가

```json
// package.json
{
  "dependencies": {
    "sql.js": "^1.10.0"  // 읽기전용 SQLite (기존 @subframe7536/sqlite-wasm과 별도)
  },
  "devDependencies": {
    // Python 스크립트는 npm 의존성 아님
  }
}
```

**sql.js vs 기존 @subframe7536/sqlite-wasm 역할 분리**:
- `@subframe7536/sqlite-wasm`: 게임 세이브 DB (읽기/쓰기, IDB 영속)
- `sql.js`: 역사적 데이터 DB (읽기전용, 정적 파일 fetch)

### 8.2 COOP/COEP 헤더

이미 `vite.config.ts`에서 COOP/COEP 헤더 설정되어 있음 → sql.js WASM도 자동 지원됨.

### 8.3 번들 크기 영향

| 추가 항목 | 크기 | 비고 |
|-----------|------|------|
| sql.js WASM | ~1.5MB | 기존 WASM과 별도 |
| kospi DB 파일 | ~15-40MB | 런타임 fetch (번들 아님) |
| HistoricalDataService | ~5KB | 새 모듈 |
| RealStockEngine | ~10KB | 새 엔진 |

### 8.4 메모리 사용량

- sql.js DB 인메모리: ~30-60MB (DB 크기의 1.5~2배)
- 충분히 수용 가능 (현재 게임 ~50-100MB 사용 추정)
- 필요시 쿼리별로 닫기/열기 패턴 적용 가능

### 8.5 초기 로딩 시간

| 단계 | 예상 시간 | 최적화 |
|------|-----------|--------|
| DB fetch (15MB) | 1-3초 (4G) | gzip 압축, CDN |
| sql.js WASM 초기화 | ~200ms | 캐시 |
| DB open | ~100ms | - |
| IndexedDB 캐시 저장 | ~300ms | 백그라운드 |
| **총계** | **~2-4초** | 프로그레스바 표시 |

재방문시 IndexedDB 캐시에서 로드: **~300ms**

---

## 9. 구현 로드맵

### Phase 1: 데이터 파이프라인 (1-2일)
- [ ] `scripts/build_kospi_db.py` Python 스크립트 작성
- [ ] marcap 데이터 파싱 + SQLite DB 생성
- [ ] 대표 종목 20개 선정 + 섹터 매핑
- [ ] 연간 통계 (drift/volatility) 사전 계산
- [ ] KOSPI 지수 데이터 포함

### Phase 2: 브라우저 데이터 서비스 (1-2일)
- [ ] sql.js 패키지 추가 + Vite 설정
- [ ] `HistoricalDataService` 구현
- [ ] IndexedDB 캐시 레이어
- [ ] 로딩 프로그레스 UI

### Phase 3: 게임 엔진 통합 (2-3일)
- [ ] `RealStockEngine` 구현 (Mode A: 리플레이)
- [ ] Company 매핑 시스템 (실제 종목 ↔ 게임 Company)
- [ ] tickEngine.ts 분기 처리 (가상 vs 실제 모드)
- [ ] 가격 보간 알고리즘 (장중 시뮬레이션)
- [ ] 기존 이벤트 시스템과 연동

### Phase 4: UI + 설정 (1-2일)
- [ ] 게임 시작 화면에 모드 선택 추가
- [ ] 차트 윈도우에 실제 OHLCV 표시
- [ ] 종목 정보 표시 (실제 회사명, 재무)

### Phase 5: 자동화 + 최적화 (1일)
- [ ] GitHub Actions 자동 업데이트 설정
- [ ] DB 압축 최적화 (gzip)
- [ ] 성능 프로파일링 + 메모리 최적화

**총 예상: 6-10일**

---

## 10. 법적/라이센스 고려사항

| 항목 | 상태 | 비고 |
|------|------|------|
| marcap 데이터 | MIT License | 자유롭게 사용 가능 |
| KRX 데이터 | 공공데이터 | 비상업적 사용시 제한 없음 |
| 종목명/로고 사용 | 주의 필요 | 게임 내 면책 조항 추가 권장 |
| 투자 조언 면책 | 필수 | "이 게임은 실제 투자 조언이 아닙니다" |

---

## 11. Sources

- [FinanceData/marcap](https://github.com/FinanceData/marcap) - 1995~현재 한국 주식 시가총액 데이터셋 (매일 자동 업데이트)
- [pykrx](https://github.com/sharebook-kr/pykrx) - KRX 주식 정보 스크래핑 Python 라이브러리
- [FinanceDataReader](https://github.com/FinanceData/FinanceDataReader) - 금융 데이터 크롤러
- [KRX 정보데이터시스템](https://data.krx.co.kr) - 한국거래소 공식 데이터
- [KRX Open API](http://openapi.krx.co.kr) - 한국거래소 공식 REST API
- [공공데이터포털 - 주식시세정보](https://www.data.go.kr/data/15094808/openapi.do)
- [sql.js](https://github.com/sql-js/sql.js/) - JavaScript SQLite WASM 구현
- [yahoo-finance2 npm](https://www.npmjs.com/package/yahoo-finance2) - Yahoo Finance Node.js API
- [Chrome SQLite WASM 가이드](https://developer.chrome.com/blog/sqlite-wasm-in-the-browser-backed-by-the-origin-private-file-system)
- [Investing.com KOSPI 데이터](https://kr.investing.com/indices/kospi-historical-data)

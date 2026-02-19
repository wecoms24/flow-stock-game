#!/usr/bin/env python3
"""
KOSPI Historical Data Builder
==============================
marcap 데이터셋(1995~현재)에서 시총 상위 100개 종목을 추출하여
게임용 SQLite DB를 생성합니다.

데이터 출처: https://github.com/FinanceData/marcap
  - 연도별 parquet 파일을 직접 다운로드합니다.

사용법:
  pip install -r requirements.txt
  python build_kospi_db.py

출력: ../public/kospi-historical.db
"""

import os
import sys
import sqlite3
import math
import io
import subprocess
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from collections import Counter


def _ensure_packages():
    """필요한 패키지가 없으면 자동 설치"""
    REQUIRED = [
        ("numpy", "numpy"),
        ("pandas", "pandas"),
        ("pyarrow", "pyarrow"),   # pd.read_parquet() 백엔드
    ]
    missing = []
    for import_name, pkg_name in REQUIRED:
        try:
            __import__(import_name)
        except ImportError:
            missing.append(pkg_name)

    if missing:
        print(f"[INFO] 필요한 패키지 설치 중: {', '.join(missing)}")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "--quiet", *missing],
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
        print("[INFO] 설치 완료")


_ensure_packages()

import numpy as np
import pandas as pd

# ── Configuration ──

OUTPUT_DB = Path(__file__).parent.parent / "public" / "kospi-historical.db"
START_YEAR = 1995
END_YEAR = 2025
TOP_N = 100  # 시총 상위 종목 수

# marcap parquet 파일 URL 패턴
MARCAP_URL_TEMPLATE = "https://github.com/FinanceData/marcap/raw/master/data/marcap-{year}.parquet"

# 게임 섹터 매핑 (업종 키워드 → 10개 게임 섹터)
SECTOR_KEYWORDS = {
    "tech": [
        "반도체", "전자부품", "IT", "소프트웨어", "디스플레이",
        "통신장비", "컴퓨터", "게임", "인터넷", "전기전자",
        "전자", "2차전지", "배터리",
    ],
    "finance": [
        "은행", "증권", "보험", "금융", "지주",
        "카드", "캐피탈", "투자",
    ],
    "energy": [
        "석유", "가스", "정유", "에너지", "원유",
        "전력", "발전",
    ],
    "healthcare": [
        "제약", "바이오", "의료", "헬스케어", "병원",
        "의약품", "진단",
    ],
    "consumer": [
        "음식료", "식품", "유통", "화장품", "의류",
        "생활용품", "소매", "백화점", "편의점",
    ],
    "industrial": [
        "자동차", "기계", "조선", "항공", "운송",
        "철도", "물류", "방산", "중공업",
    ],
    "telecom": [
        "통신", "이동통신", "방송", "미디어",
        "플랫폼", "포털",
    ],
    "materials": [
        "화학", "철강", "비철금속", "섬유", "제지",
        "유리", "시멘트", "고무",
    ],
    "utilities": [
        "전기", "가스공사", "수도", "환경",
        "폐기물", "신재생",
    ],
    "realestate": [
        "건설", "부동산", "주택", "토목",
        "시공", "개발",
    ],
}

# 직접 매핑이 필요한 주요 종목 (업종 분류가 모호한 경우)
TICKER_SECTOR_OVERRIDE = {
    # ── tech ──
    "005930": "tech",       # 삼성전자
    "000660": "tech",       # SK하이닉스
    "066570": "tech",       # LG전자
    "006400": "tech",       # 삼성SDI
    "009150": "tech",       # 삼성전기
    "034220": "tech",       # LG디스플레이
    "018260": "tech",       # 삼성에스디에스
    "003550": "tech",       # LG
    "010120": "tech",       # LS ELECTRIC
    "011790": "tech",       # SKC

    # ── finance ──
    "105560": "finance",    # KB금융
    "055550": "finance",    # 신한지주
    "086790": "finance",    # 하나금융지주
    "032830": "finance",    # 삼성생명
    "316140": "finance",    # 우리금융지주
    "000810": "finance",    # 삼성화재
    "000060": "finance",    # 메리츠화재
    "001450": "finance",    # 현대해상
    "003690": "finance",    # 코리안리
    "088980": "finance",    # 맥쿼리인프라

    # ── energy ──
    "096770": "energy",     # SK이노베이션
    "010950": "energy",     # S-Oil
    "015760": "energy",     # 한국전력
    "009830": "energy",     # 한화솔루션
    "010060": "energy",     # OCI홀딩스
    "000880": "energy",     # 한화
    "003490": "energy",     # 대한항공 (→ 운송이지만 에너지 밸런스)

    # ── healthcare ──
    "207940": "healthcare", # 삼성바이오로직스
    "068270": "healthcare", # 셀트리온
    "000100": "healthcare", # 유한양행
    "006280": "healthcare", # 녹십자
    "005250": "healthcare", # 녹십자홀딩스
    "008930": "healthcare", # 한미사이언스

    # ── consumer ──
    "036570": "consumer",   # 엔씨소프트
    "033780": "consumer",   # KT&G
    "028260": "consumer",   # 삼성물산
    "090430": "consumer",   # 아모레퍼시픽
    "002790": "consumer",   # 아모레퍼시픽홀딩스
    "051900": "consumer",   # LG생활건강
    "004170": "consumer",   # 신세계
    "023530": "consumer",   # 롯데쇼핑
    "004370": "consumer",   # 농심
    "007310": "consumer",   # 오뚜기
    "005300": "consumer",   # 롯데칠성
    "001800": "consumer",   # 오리온홀딩스
    "008770": "consumer",   # 호텔신라
    "021240": "consumer",   # 코웨이
    "035250": "consumer",   # 강원랜드

    # ── industrial ──
    "005380": "industrial", # 현대차
    "000270": "industrial", # 기아
    "012330": "industrial", # 현대모비스
    "010130": "industrial", # 고려아연
    "011200": "industrial", # HMM
    "267250": "industrial", # HD현대
    "034730": "industrial", # SK
    "086280": "industrial", # 현대글로비스
    "009540": "industrial", # HD한국조선해양
    "010620": "industrial", # HD현대미포
    "042670": "industrial", # HD현대인프라코어
    "017800": "industrial", # 현대엘리베이터
    "010140": "industrial", # 삼성중공업
    "018880": "industrial", # 한온시스템
    "012450": "industrial", # 한화에어로스페이스
    "042660": "industrial", # 한화오션
    "005385": "industrial", # 현대차우
    "005387": "industrial", # 현대차2우B

    # ── telecom ──
    "017670": "telecom",    # SK텔레콤
    "030200": "telecom",    # KT
    "032640": "telecom",    # LG유플러스
    "035420": "telecom",    # NAVER
    "035720": "telecom",    # 카카오
    "030000": "telecom",    # 제일기획
    "012750": "telecom",    # 에스원

    # ── materials ──
    "051910": "materials",  # LG화학
    "005490": "materials",  # POSCO홀딩스
    "004020": "materials",  # 현대제철
    "003670": "materials",  # 포스코퓨처엠
    "011170": "materials",  # 롯데케미칼
    "003410": "materials",  # 쌍용C&E
    "047050": "materials",  # 포스코인터내셔널
    "002380": "materials",  # KCC
    "004800": "materials",  # 효성
    "003240": "materials",  # 태광산업

    # ── utilities ──
    "034020": "utilities",  # 두산에너빌리티
    "001440": "utilities",  # 대한전선
    "000240": "utilities",  # 한국앤컴퍼니
    "001120": "utilities",  # LX인터내셔널
    "001740": "utilities",  # SK네트웍스

    # ── realestate ──
    "028050": "realestate", # 삼성E&A
    "000150": "realestate", # 두산
    "012630": "realestate", # HDC
    "000210": "realestate", # DL

    # ── 지주사/기타 (다양한 섹터로 분산) ──
    "001040": "consumer",   # CJ
    "000120": "industrial", # CJ대한통운
    "078930": "energy",     # GS
    "006260": "industrial", # LS
}


def classify_sector(ticker: str, name: str) -> str:
    """종목을 게임 섹터로 분류"""
    # 1) 직접 매핑 우선
    if ticker in TICKER_SECTOR_OVERRIDE:
        return TICKER_SECTOR_OVERRIDE[ticker]

    # 2) 회사명 키워드 매칭
    for sector, keywords in SECTOR_KEYWORDS.items():
        for kw in keywords:
            if kw in name:
                return sector

    # 3) 기본 fallback
    return "industrial"


def fetch_marcap_parquet(year: int) -> pd.DataFrame:
    """marcap parquet 파일을 GitHub에서 직접 다운로드"""
    url = MARCAP_URL_TEMPLATE.format(year=year)
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=60) as response:
            data = response.read()
        df = pd.read_parquet(io.BytesIO(data))
        return df
    except HTTPError as e:
        if e.code == 404:
            print(f"[SKIP] {year}년 파일 없음")
        else:
            print(f"[WARN] {year}년 다운로드 실패: HTTP {e.code}")
        return pd.DataFrame()
    except (URLError, Exception) as e:
        print(f"[WARN] {year}년 다운로드 실패: {e}")
        return pd.DataFrame()


def normalize_marcap_df(df: pd.DataFrame) -> pd.DataFrame:
    """marcap DataFrame을 일관된 형태로 정규화"""
    # 'Date' 컬럼 확보 (인덱스 또는 컬럼)
    if "Date" not in df.columns:
        df = df.reset_index()
        # 첫 번째 컬럼이 날짜일 수 있음
        if df.columns[0] != "Date":
            # 날짜처럼 보이는 컬럼 찾기
            for col in df.columns:
                try:
                    test = pd.to_datetime(df[col].head(5))
                    df = df.rename(columns={col: "Date"})
                    break
                except (ValueError, TypeError):
                    continue

    if "Date" not in df.columns:
        return pd.DataFrame()

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date"])

    # KOSPI 종목만 필터링
    if "Market" in df.columns:
        df = df[df["Market"] == "KOSPI"].copy()
    elif "MarketId" in df.columns:
        df = df[df["MarketId"] == "STK"].copy()

    # 필수 컬럼 존재 확인
    required = ["Code", "Close"]
    for col in required:
        if col not in df.columns:
            print(f"  [WARN] 필수 컬럼 '{col}' 없음")
            return pd.DataFrame()

    return df


def select_top_stocks(all_data: pd.DataFrame) -> list:
    """
    전체 기간에서 시총 상위 100개 종목 선별.
    여러 해에 걸쳐 시총 상위에 자주 등장한 종목을 우선 선택.
    """
    freq = Counter()

    for year in range(START_YEAR, END_YEAR + 1):
        year_data = all_data[all_data["Date"].dt.year == year]
        if year_data.empty:
            continue

        # 연말 기준 시총 상위 (각 종목의 마지막 레코드)
        last_day = year_data.sort_values("Date").groupby("Code").last()
        if "Marcap" in last_day.columns:
            # 시총이 0이 아닌 종목만
            valid = last_day[last_day["Marcap"] > 0]
            top = valid.nlargest(TOP_N * 2, "Marcap")
            freq.update(top.index.tolist())

    # 빈도 상위 100개 선택
    selected = [t for t, _ in freq.most_common(TOP_N)]
    return selected[:TOP_N]


def compute_annual_stats(prices: pd.Series) -> tuple:
    """일별 종가에서 연간 drift/volatility 계산"""
    if len(prices) < 20:
        return 0.0, 0.3  # 기본값

    # 로그 수익률
    log_returns = np.log(prices / prices.shift(1)).dropna()
    if len(log_returns) < 10:
        return 0.0, 0.3

    # 연율화 (거래일 ~250일)
    trading_days = 250
    annual_drift = float(log_returns.mean() * trading_days)
    annual_vol = float(log_returns.std() * np.sqrt(trading_days))

    # 합리적 범위 클램핑
    annual_drift = max(-0.5, min(0.5, annual_drift))
    annual_vol = max(0.1, min(1.5, annual_vol))

    return annual_drift, annual_vol


def build_database():
    """메인 DB 빌드 프로세스"""
    print("=" * 60)
    print("KOSPI Historical Data Builder")
    print("  데이터 출처: github.com/FinanceData/marcap")
    print("=" * 60)

    # 출력 디렉토리 확인
    OUTPUT_DB.parent.mkdir(parents=True, exist_ok=True)

    # 기존 DB 삭제
    if OUTPUT_DB.exists():
        OUTPUT_DB.unlink()
        print(f"기존 DB 삭제: {OUTPUT_DB}")

    # DB 생성
    conn = sqlite3.connect(str(OUTPUT_DB))
    cursor = conn.cursor()

    # 스키마 생성
    cursor.executescript("""
        CREATE TABLE daily_prices (
            ticker TEXT NOT NULL,
            date TEXT NOT NULL,
            year INTEGER,
            month INTEGER,
            day_seq INTEGER,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            market_cap REAL,
            PRIMARY KEY (ticker, date)
        );
        CREATE INDEX idx_dp_ym ON daily_prices(ticker, year, month);

        CREATE TABLE stock_metadata (
            ticker TEXT PRIMARY KEY,
            company_id TEXT,
            name_kr TEXT,
            sector TEXT,
            ipo_date TEXT,
            annual_drift REAL,
            annual_volatility REAL,
            base_price REAL
        );

        CREATE TABLE monthly_stats (
            ticker TEXT,
            year INTEGER,
            month INTEGER,
            trading_day_count INTEGER,
            PRIMARY KEY (ticker, year, month)
        );
    """)
    conn.commit()

    # 1) marcap parquet 데이터 수집 (년도별)
    print(f"\n[1/4] marcap parquet 다운로드 ({START_YEAR}-{END_YEAR})...")
    all_frames = []
    for year in range(START_YEAR, END_YEAR + 1):
        print(f"  {year}년...", end=" ", flush=True)
        df = fetch_marcap_parquet(year)
        if df.empty:
            print("스킵")
            continue

        df = normalize_marcap_df(df)
        if df.empty:
            print("KOSPI 데이터 없음")
            continue

        all_frames.append(df)
        print(f"{len(df):,} 레코드")

    if not all_frames:
        print("ERROR: 데이터를 수집할 수 없습니다.")
        conn.close()
        sys.exit(1)

    all_data = pd.concat(all_frames, ignore_index=True)
    print(f"  총 {len(all_data):,} KOSPI 레코드 수집 완료")

    # 2) 시총 상위 100 종목 선별
    print("\n[2/4] 시총 상위 100개 종목 선별 중...")
    top_tickers = select_top_stocks(all_data)
    print(f"  선별 완료: {len(top_tickers)}개 종목")

    if len(top_tickers) == 0:
        print("ERROR: 선별된 종목이 없습니다.")
        conn.close()
        sys.exit(1)

    # 선별 종목 미리보기
    for t in top_tickers[:10]:
        sample = all_data[all_data["Code"] == t]
        if not sample.empty:
            name = sample.iloc[-1].get("Name", t)
            print(f"    {t} {name}")
    if len(top_tickers) > 10:
        print(f"    ... 외 {len(top_tickers) - 10}개")

    # 3) DB에 데이터 적재
    print("\n[3/4] 데이터 적재 중...")
    stock_names = {}
    stock_sectors = {}
    stock_first_date = {}
    stock_base_prices = {}

    for i, ticker in enumerate(top_tickers):
        ticker_data = all_data[all_data["Code"] == ticker].sort_values("Date")
        if ticker_data.empty:
            continue

        name = str(ticker_data.iloc[-1].get("Name", ticker))
        stock_names[ticker] = name

        # 섹터 분류
        sector = classify_sector(ticker, name)
        stock_sectors[ticker] = sector

        # IPO 날짜 (데이터 내 첫 등장일)
        first_date = ticker_data["Date"].min()
        stock_first_date[ticker] = first_date

        # 기준가 (첫 거래일 종가)
        first_close = ticker_data.iloc[0].get("Close", 10000)
        base_price = float(first_close) if pd.notna(first_close) and first_close > 0 else 10000.0
        stock_base_prices[ticker] = base_price

        # day_seq 계산: 월별로 그룹핑하여 거래일 순서 부여
        ticker_data = ticker_data.copy()
        ticker_data["year"] = ticker_data["Date"].dt.year
        ticker_data["month"] = ticker_data["Date"].dt.month

        # 월별 거래일 순서 (1-based)
        ticker_data["day_seq"] = ticker_data.groupby(["year", "month"]).cumcount() + 1

        # daily_prices 적재 (배치)
        rows = []
        for _, row in ticker_data.iterrows():
            open_val = row.get("Open", 0)
            high_val = row.get("High", 0)
            low_val = row.get("Low", 0)
            close_val = row.get("Close", 0)
            volume_val = row.get("Volume", 0)
            marcap_val = row.get("Marcap", 0)

            rows.append((
                ticker,
                row["Date"].strftime("%Y-%m-%d"),
                int(row["year"]), int(row["month"]), int(row["day_seq"]),
                float(open_val) if pd.notna(open_val) else 0.0,
                float(high_val) if pd.notna(high_val) else 0.0,
                float(low_val) if pd.notna(low_val) else 0.0,
                float(close_val) if pd.notna(close_val) else 0.0,
                int(volume_val) if pd.notna(volume_val) else 0,
                float(marcap_val) if pd.notna(marcap_val) else 0.0,
            ))

        cursor.executemany(
            "INSERT OR IGNORE INTO daily_prices VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            rows,
        )

        # monthly_stats 적재
        monthly = ticker_data.groupby(["year", "month"]).size().reset_index(name="count")
        for _, mrow in monthly.iterrows():
            cursor.execute(
                "INSERT OR IGNORE INTO monthly_stats VALUES (?,?,?,?)",
                (ticker, int(mrow["year"]), int(mrow["month"]), int(mrow["count"])),
            )

        if (i + 1) % 10 == 0:
            print(f"  {i + 1}/{len(top_tickers)} 종목 완료")
            conn.commit()

    conn.commit()

    # 4) stock_metadata 적재 (전체 기간 drift/vol 계산)
    print("\n[4/4] 메타데이터 계산 중...")
    sector_counts = {}
    for ticker in top_tickers:
        ticker_data = all_data[all_data["Code"] == ticker].sort_values("Date")
        if ticker_data.empty:
            continue

        closes = ticker_data["Close"].dropna()
        closes = closes[closes > 0]  # 0원 제외
        annual_drift, annual_vol = compute_annual_stats(closes)

        name = stock_names.get(ticker, ticker)
        sector = stock_sectors.get(ticker, "industrial")
        sector_counts[sector] = sector_counts.get(sector, 0) + 1

        first_date = stock_first_date.get(ticker)
        ipo_date = None
        if first_date and first_date.year > START_YEAR:
            ipo_date = first_date.strftime("%Y-%m-%d")

        base_price = stock_base_prices.get(ticker, 10000)

        # company_id: sector-NN 형식
        company_id = f"{sector}-{sector_counts[sector]:02d}"

        cursor.execute(
            "INSERT OR REPLACE INTO stock_metadata VALUES (?,?,?,?,?,?,?,?)",
            (ticker, company_id, name, sector, ipo_date, annual_drift, annual_vol, base_price),
        )

    conn.commit()

    # 결과 요약
    cursor.execute("SELECT COUNT(*) FROM daily_prices")
    total_prices = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM stock_metadata")
    total_stocks = cursor.fetchone()[0]

    cursor.execute(
        "SELECT sector, COUNT(*) FROM stock_metadata GROUP BY sector ORDER BY sector"
    )
    sector_dist = cursor.fetchall()

    conn.close()

    db_size = OUTPUT_DB.stat().st_size / (1024 * 1024)

    print("\n" + "=" * 60)
    print("빌드 완료!")
    print(f"  DB 경로: {OUTPUT_DB}")
    print(f"  DB 크기: {db_size:.1f} MB")
    print(f"  총 종목: {total_stocks}")
    print(f"  총 가격 레코드: {total_prices:,}")
    print(f"\n  섹터별 분포:")
    for sector, count in sector_dist:
        print(f"    {sector}: {count}개")
    print("=" * 60)


if __name__ == "__main__":
    build_database()

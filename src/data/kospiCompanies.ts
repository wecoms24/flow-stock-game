/* eslint-disable */
/**
 * KOSPI 실제 종목 데이터 (DB 기반 자동 생성)
 * 총 100개 종목, 10개 섹터
 * 생성 스크립트: scripts/build_kospi_db.py
 */

import type { Company } from '../types'

function makeKospiCompany(
  id: string,
  name: string,
  ticker: string,
  historicalTicker: string,
  sector: Company['sector'],
  price: number,
  volatility: number,
  drift: number,
  description: string,
): Company {
  return {
    id,
    name,
    ticker,
    historicalTicker,
    sector,
    price,
    previousPrice: price,
    basePrice: price,
    sessionOpenPrice: price,
    volatility,
    drift,
    marketCap: price * 1_000_000,
    description,
    status: 'active',
    priceHistory: [price],
    financials: { revenue: 1000, netIncome: 100, debtRatio: 0.5, growthRate: 0.05, eps: 1000 },
    institutionFlow: { netBuyVolume: 0, topBuyers: [], topSellers: [], institutionalOwnership: 0.3 },
    institutionFlowHistory: [],
    accumulatedInstitutionalShares: 0,
    headcount: 1000,
    layoffRateOnAcquisition: 0.2,
    mnaHistory: [],
    viTriggered: false,
    viCooldown: 0,
    viRecentPrices: [],
    regimeVolatilities: { CALM: volatility * 0.7, VOLATILE: volatility, CRISIS: volatility * 1.5 },
    eventSensitivity: { interest_rate: 1.0, oil_price: 1.0, exchange_rate: 1.0, regulation: 1.0, global_event: 1.0 },
  }
}

export const KOSPI_COMPANIES: Company[] = [
  // ── IT/전자 (10개) ──
  makeKospiCompany('tech-01', '삼성전자', 'SEC', '005930', 'tech', 273000, 0.851, -0.033, '세계 최대 반도체·스마트폰 제조사'),
  makeKospiCompany('tech-02', '삼성전기', 'SEMCO', '009150', 'tech', 63000, 0.405, 0.055, 'MLCC·카메라모듈·기판 전자부품 제조'),
  makeKospiCompany('tech-03', '삼성SDI', 'SDI', '006400', 'tech', 39900, 0.412, 0.076, '배터리·에너지 솔루션 전문 기업'),
  makeKospiCompany('tech-04', 'SK하이닉스', 'SKH', '000660', 'tech', 13850, 0.851, 0.153, 'DRAM·NAND 메모리 반도체 글로벌 2위'),
  makeKospiCompany('tech-05', '삼성전자우', 'SEC2', '005935', 'tech', 116500, 0.857, -0.011, '삼성전자 우선주'),
  makeKospiCompany('tech-06', 'LG', 'LG', '003550', 'tech', 20450, 0.444, 0.054, 'LG그룹 지주회사'),
  makeKospiCompany('tech-07', 'SKC', 'SKC', '011790', 'tech', 4720, 0.505, 0.123, '화학소재·반도체 소재 전문'),
  makeKospiCompany('tech-08', 'LS ELECTRIC', 'LSE', '010120', 'tech', 1800, 0.557, 0.220, '전력기기·자동화 솔루션 기업'),
  makeKospiCompany('tech-09', 'LG전자', 'LGE', '066570', 'tech', 64400, 0.375, 0.015, '가전·TV·전장 부품 글로벌 기업'),
  makeKospiCompany('tech-10', 'LG디스플레이', 'LGD', '034220', 'tech', 32750, 0.394, -0.048, 'OLED·LCD 디스플레이 글로벌 기업'),

  // ── 금융 (14개) ──
  makeKospiCompany('finance-01', '삼성증권', 'SSC', '016360', 'finance', 18400, 0.388, 0.056, '증권·자산관리 전문'),
  makeKospiCompany('finance-02', '삼성화재', 'SFI', '000810', 'finance', 23800, 0.357, 0.120, '국내 최대 손해보험사'),
  makeKospiCompany('finance-03', '미래에셋증권', 'MAS', '006800', 'finance', 4255, 0.475, 0.067, '증권·자산운용·투자'),
  makeKospiCompany('finance-04', 'NH투자증권', 'NHI', '005940', 'finance', 8450, 0.447, 0.036, '종합 증권·투자은행'),
  makeKospiCompany('finance-05', '신한지주', 'SHG', '055550', 'finance', 11350, 0.346, 0.080, '신한은행 중심 금융 그룹'),
  makeKospiCompany('finance-06', '롯데지주', 'LTH', '004990', 'finance', 139000, 0.604, -0.066, '롯데그룹 지주회사'),
  makeKospiCompany('finance-07', '현대해상', 'HMI', '001450', 'finance', 7100, 0.630, 0.058, '손해보험·장기보험 전문'),
  makeKospiCompany('finance-08', 'DB손해보험', 'DBI', '005830', 'finance', 1770, 0.460, 0.171, '자동차·장기보험 전문'),
  makeKospiCompany('finance-09', '코리안리', 'KRE', '003690', 'finance', 6490, 0.595, 0.023, '재보험 전문 기업'),
  makeKospiCompany('finance-10', '메리츠화재', 'MFI', '000060', 'finance', 5650, 0.648, 0.098, '손해보험 전문 기업'),
  makeKospiCompany('finance-11', '기업은행', 'IBK', '024110', 'finance', 6700, 0.330, 0.052, '중소기업 전문 은행'),
  makeKospiCompany('finance-12', '한국금융지주', 'KIS', '071050', 'finance', 6380, 0.424, 0.146, '한국투자증권 지주'),
  makeKospiCompany('finance-13', '하나금융지주', 'HFG', '086790', 'finance', 50000, 0.382, 0.032, '하나은행 중심 금융 그룹'),
  makeKospiCompany('finance-14', '맥쿼리인프라', 'MIF', '088980', 'finance', 7400, 0.149, 0.021, '인프라 투자 전문 펀드'),

  // ── 에너지 (10개) ──
  makeKospiCompany('energy-01', '한국전력', 'KEP', '015760', 'energy', 28250, 0.315, 0.020, '전력 생산·송배전 공기업'),
  makeKospiCompany('energy-02', 'S-Oil', 'SOL', '010950', 'energy', 18100, 0.409, 0.060, '정유·석유화학 전문'),
  makeKospiCompany('energy-03', '한국가스공사', 'KGS', '036460', 'energy', 22700, 0.367, 0.022, '천연가스 수입·공급 공기업'),
  makeKospiCompany('energy-04', '대한항공', 'KAL', '003490', 'energy', 6690, 0.430, 0.048, '국내 최대 항공사'),
  makeKospiCompany('energy-05', '한화솔루션', 'HWS', '009830', 'energy', 3210, 0.534, 0.084, '태양광·화학·첨단소재'),
  makeKospiCompany('energy-06', '한화', 'HWC', '000880', 'energy', 3100, 0.468, 0.130, '한화그룹 지주회사'),
  makeKospiCompany('energy-07', 'OCI홀딩스', 'OCI', '010060', 'energy', 4595, 0.508, 0.128, '태양광 폴리실리콘·화학'),
  makeKospiCompany('energy-08', '금호석유화학', 'KPC', '011780', 'energy', 2700, 0.516, 0.151, '합성고무·합성수지'),
  makeKospiCompany('energy-09', 'GS', 'GS', '078930', 'energy', 24850, 0.348, 0.039, 'GS그룹 지주회사'),
  makeKospiCompany('energy-10', 'SK가스', 'SKG', '018670', 'energy', 8140, 0.312, 0.131, 'LPG 수입·판매'),

  // ── 헬스케어 (5개) ──
  makeKospiCompany('healthcare-01', '유한양행', 'YHC', '000100', 'healthcare', 27000, 0.466, 0.056, '종합 제약·헬스케어'),
  makeKospiCompany('healthcare-02', '대웅제약', 'DWP', '069620', 'healthcare', 15500, 0.437, 0.105, '전문의약품·원료의약'),
  makeKospiCompany('healthcare-03', '녹십자', 'GCC', '006280', 'healthcare', 5200, 0.559, 0.135, '혈액제제·백신 전문 제약'),
  makeKospiCompany('healthcare-04', '한미사이언스', 'HMS', '008930', 'healthcare', 8800, 0.618, 0.056, '제약 R&D 중심 지주사'),
  makeKospiCompany('healthcare-05', '녹십자홀딩스', 'GCH', '005250', 'healthcare', 39000, 0.601, -0.035, '녹십자그룹 지주회사'),

  // ── 소비재 (16개) ──
  makeKospiCompany('consumer-01', 'KT&G', 'KTG', '033780', 'consumer', 19950, 0.268, 0.078, '담배·인삼 제조 기업'),
  makeKospiCompany('consumer-02', 'CJ', 'CJ', '001040', 'consumer', 41200, 0.407, 0.057, 'CJ그룹 지주회사'),
  makeKospiCompany('consumer-03', '신세계', 'SSG', '004170', 'consumer', 29750, 0.415, 0.084, '백화점·면세점 유통 기업'),
  makeKospiCompany('consumer-04', '농심', 'NNG', '004370', 'consumer', 41050, 0.328, 0.093, '라면·스낵 식품 기업'),
  makeKospiCompany('consumer-05', '아모레퍼시픽홀딩스', 'APH', '002790', 'consumer', 20000, 0.647, 0.012, '아모레퍼시픽그룹 지주'),
  makeKospiCompany('consumer-06', 'LG생활건강', 'LGH', '051900', 'consumer', 13650, 0.375, 0.121, '생활용품·화장품·음료'),
  makeKospiCompany('consumer-07', '호텔신라', 'SLA', '008770', 'consumer', 4730, 0.405, 0.089, '호텔·면세점 운영'),
  makeKospiCompany('consumer-08', '코웨이', 'CWY', '021240', 'consumer', 2960, 0.411, 0.140, '정수기·공기청정기 렌탈'),
  makeKospiCompany('consumer-09', '롯데칠성', 'LCS', '005300', 'consumer', 74000, 0.588, 0.025, '음료·주류 제조 기업'),
  makeKospiCompany('consumer-10', '현대백화점', 'HDS', '069960', 'consumer', 28600, 0.371, 0.050, '백화점·아울렛 유통'),
  makeKospiCompany('consumer-11', '강원랜드', 'KWL', '035250', 'consumer', 131000, 0.575, -0.088, '국내 유일 내국인 카지노'),
  makeKospiCompany('consumer-12', '엔씨소프트', 'NCS', '036570', 'consumer', 134000, 0.520, 0.018, 'MMORPG 게임 개발사'),
  makeKospiCompany('consumer-13', '오뚜기', 'OTG', '007310', 'consumer', 15200, 0.353, 0.128, '식품·조미료 전문 기업'),
  makeKospiCompany('consumer-14', '오리온홀딩스', 'ORH', '001800', 'consumer', 24200, 0.744, -0.006, '제과·엔터테인먼트 지주'),
  makeKospiCompany('consumer-15', '롯데쇼핑', 'LTS', '023530', 'consumer', 407000, 0.344, -0.088, '백화점·마트·홈쇼핑'),
  makeKospiCompany('consumer-16', '아모레퍼시픽', 'APC', '090430', 'consumer', 385000, 0.654, -0.061, '국내 최대 화장품 기업'),

  // ── 산업재 (18개) ──
  makeKospiCompany('industrial-01', '기아', 'KIA', '000270', 'industrial', 5800, 0.398, 0.121, '글로벌 자동차 제조사'),
  makeKospiCompany('industrial-02', '현대차', 'HMC', '005380', 'industrial', 10000, 0.391, 0.134, '국내 최대 자동차 제조사'),
  makeKospiCompany('industrial-03', 'HD한국조선해양', 'HKS', '009540', 'industrial', 17400, 0.449, 0.125, '조선·해양플랜트'),
  makeKospiCompany('industrial-04', '삼성중공업', 'SHI', '010140', 'industrial', 3750, 0.449, 0.074, '조선·해양플랜트 건조'),
  makeKospiCompany('industrial-05', '현대모비스', 'MOB', '012330', 'industrial', 3100, 0.385, 0.190, '자동차 부품·모듈 전문'),
  makeKospiCompany('industrial-06', 'LS', 'LS', '006260', 'industrial', 15100, 0.428, 0.102, 'LS그룹 지주회사'),
  makeKospiCompany('industrial-07', '한화에어로스페이스', 'HAS', '012450', 'industrial', 5850, 0.475, 0.201, '항공엔진·방산·우주'),
  makeKospiCompany('industrial-08', 'HMM', 'HMM', '011200', 'industrial', 3800, 0.711, 0.067, '컨테이너 해운 전문'),
  makeKospiCompany('industrial-09', '고려아연', 'KZN', '010130', 'industrial', 10550, 0.466, 0.191, '비철금속 제련 세계 1위'),
  makeKospiCompany('industrial-10', '한온시스템', 'HAN', '018880', 'industrial', 32000, 0.722, -0.094, '자동차 공조·열관리'),
  makeKospiCompany('industrial-11', '한화오션', 'HWO', '042660', 'industrial', 4025, 0.720, 0.136, '조선·특수선 건조'),
  makeKospiCompany('industrial-12', '현대차2우B', 'HM2', '005387', 'industrial', 2875, 0.380, 0.170, '현대차 제2우선주'),
  makeKospiCompany('industrial-13', 'HD현대인프라코어', 'HDI', '042670', 'industrial', 1700, 0.526, 0.085, '건설기계·엔진 제조'),
  makeKospiCompany('industrial-14', '현대차우', 'HMP', '005385', 'industrial', 3020, 0.377, 0.167, '현대차 우선주'),
  makeKospiCompany('industrial-15', 'HD현대미포', 'HMP', '010620', 'industrial', 4390, 0.498, 0.156, '중형 선박 건조 전문'),
  makeKospiCompany('industrial-16', '현대엘리베이터', 'HEL', '017800', 'industrial', 7000, 0.558, 0.100, '엘리베이터·에스컬레이터'),
  makeKospiCompany('industrial-17', 'CJ대한통운', 'CJL', '000120', 'industrial', 3930, 0.588, 0.126, '택배·물류 전문 기업'),
  makeKospiCompany('industrial-18', '현대글로비스', 'GLV', '086280', 'industrial', 48950, 0.442, 0.066, '자동차 물류·유통'),

  // ── 통신/미디어 (4개) ──
  makeKospiCompany('telecom-01', 'SK텔레콤', 'SKT', '017670', 'telecom', 337000, 0.441, -0.073, '이동통신·AI·미디어'),
  makeKospiCompany('telecom-02', 'KT', 'KT', '030200', 'telecom', 73000, 0.257, -0.013, '유무선 통신·미디어·인터넷'),
  makeKospiCompany('telecom-03', '에스원', 'S1', '012750', 'telecom', 12300, 0.331, 0.070, '보안·빌딩관리 서비스'),
  makeKospiCompany('telecom-04', '제일기획', 'CKH', '030000', 'telecom', 115500, 0.747, -0.068, '광고·마케팅 전문 기업'),

  // ── 소재/화학 (11개) ──
  makeKospiCompany('materials-01', 'POSCO홀딩스', 'PKX', '005490', 'materials', 80000, 0.357, 0.053, '철강·2차전지 소재 지주'),
  makeKospiCompany('materials-02', 'KCC', 'KCC', '002380', 'materials', 40100, 0.421, 0.093, '도료·건축자재·실리콘'),
  makeKospiCompany('materials-03', '현대제철', 'HYS', '004020', 'materials', 2720, 0.435, 0.096, '철강·H형강·봉형강'),
  makeKospiCompany('materials-04', '롯데케미칼', 'LTC', '011170', 'materials', 7650, 0.484, 0.088, '석유화학·첨단소재'),
  makeKospiCompany('materials-05', '롯데정밀화학', 'LFC', '004000', 'materials', 12300, 0.400, 0.051, '정밀화학·그린소재'),
  makeKospiCompany('materials-06', 'LG화학', 'LGC', '051910', 'materials', 13000, 0.430, 0.133, '석유화학·배터리 소재'),
  makeKospiCompany('materials-07', '포스코인터내셔널', 'PCI', '047050', 'materials', 3410, 0.527, 0.109, '무역·에너지 개발'),
  makeKospiCompany('materials-08', '효성', 'HSG', '004800', 'materials', 7640, 0.474, 0.107, '섬유·중공업·화학 복합기업'),
  makeKospiCompany('materials-09', '태광산업', 'TKI', '003240', 'materials', 229000, 0.393, 0.048, '섬유·석유화학·레저'),
  makeKospiCompany('materials-10', '쌍용C&E', 'SCE', '003410', 'materials', 1375, 0.736, 0.068, '시멘트·레미콘'),
  makeKospiCompany('materials-11', 'LG화학우', 'LCP', '051915', 'materials', 5600, 0.396, 0.139, 'LG화학 우선주'),

  // ── 유틸리티 (5개) ──
  makeKospiCompany('utilities-01', '두산에너빌리티', 'DEB', '034020', 'utilities', 5010, 0.511, 0.109, '발전설비·원자력·가스터빈'),
  makeKospiCompany('utilities-02', '한국앤컴퍼니', 'HKC', '000240', 'utilities', 2070, 0.450, 0.100, '타이어·방산 지주회사'),
  makeKospiCompany('utilities-03', 'SK네트웍스', 'SKN', '001740', 'utilities', 13000, 0.693, -0.042, '렌탈·유통·에너지'),
  makeKospiCompany('utilities-04', 'LX인터내셔널', 'LXI', '001120', 'utilities', 3100, 0.430, 0.093, '무역·자원개발 전문'),
  makeKospiCompany('utilities-05', '대한전선', 'DHC', '001440', 'utilities', 8200, 0.870, 0.041, '전력케이블·통신케이블'),

  // ── 건설/부동산 (7개) ──
  makeKospiCompany('realestate-01', '현대건설', 'HDC', '000720', 'realestate', 2815, 0.760, 0.127, '건설·토목·플랜트'),
  makeKospiCompany('realestate-02', 'GS건설', 'GSE', '006360', 'realestate', 5050, 0.467, 0.054, '건설·주택사업'),
  makeKospiCompany('realestate-03', '두산', 'DSN', '000150', 'realestate', 17700, 0.518, 0.150, '두산그룹 지주회사'),
  makeKospiCompany('realestate-04', '대우건설', 'DWE', '047040', 'realestate', 3005, 0.456, 0.010, '건설·토목·플랜트'),
  makeKospiCompany('realestate-05', 'DL', 'DL', '000210', 'realestate', 4500, 0.477, 0.084, 'DL그룹 지주회사'),
  makeKospiCompany('realestate-06', '삼성E&A', 'SEA', '028050', 'realestate', 3250, 0.467, 0.079, '플랜트 엔지니어링·건설'),
  makeKospiCompany('realestate-07', 'HDC', 'HDH', '012630', 'realestate', 4330, 0.478, 0.058, 'HDC현대산업개발 지주'),
]

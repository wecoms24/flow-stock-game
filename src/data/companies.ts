import type { Company, Sector, Financials, InstitutionalFlow } from '../types'

/* ── 섹터별 이벤트 감응도 기본값 ── */
// 이벤트 타입별 감응도 (1.0 = 기본, >1.0 = 민감, <1.0 = 둔감)
const SECTOR_SENSITIVITY: Record<Sector, Record<string, number>> = {
  tech: { policy: 0.8, global: 1.2, boom: 1.5, crash: 1.3, innovation: 1.8, regulation: 1.2 },
  finance: { policy: 1.5, global: 1.4, boom: 1.2, crash: 1.5, regulation: 1.6, macro: 1.3 },
  energy: { policy: 1.3, global: 1.5, boom: 0.9, crash: 1.2, regulation: 1.4, macro: 1.1 },
  healthcare: { policy: 1.2, global: 0.8, boom: 0.7, crash: 0.8, innovation: 1.5, regulation: 1.7 },
  consumer: { policy: 0.9, global: 1.0, boom: 1.1, crash: 1.0, social: 1.4, macro: 0.8 },
  industrial: { policy: 1.1, global: 1.2, boom: 1.0, crash: 1.1, regulation: 1.0, macro: 1.2 },
  telecom: { policy: 1.3, global: 0.9, boom: 0.8, crash: 0.9, innovation: 1.3, regulation: 1.5 },
  materials: { policy: 0.9, global: 1.3, boom: 1.1, crash: 1.2, macro: 1.4, regulation: 0.8 },
  utilities: { policy: 1.4, global: 0.6, boom: 0.5, crash: 0.6, regulation: 1.8, macro: 0.7 },
  realestate: { policy: 1.6, global: 1.0, boom: 1.3, crash: 1.4, regulation: 1.5, macro: 1.5 },
}

/* ── 섹터별 재무 특성 템플릿 ── */
const SECTOR_FINANCIALS: Record<Sector, Partial<Financials>> = {
  tech: {
    growthRate: 0.15, // 고성장
    debtRatio: 1.8, // 고부채 (투자 활발)
  },
  finance: {
    growthRate: 0.05, // 안정 성장
    debtRatio: 1.2, // 중간 부채
  },
  energy: {
    growthRate: 0.02, // 저성장
    debtRatio: 1.5, // 중간 부채
  },
  healthcare: {
    growthRate: 0.12, // 중고성장
    debtRatio: 1.6, // 중고부채 (R&D 투자)
  },
  consumer: {
    growthRate: 0.06, // 중간 성장
    debtRatio: 1.3, // 중간 부채
  },
  industrial: {
    growthRate: 0.04, // 저중성장
    debtRatio: 1.4, // 중간 부채
  },
  telecom: {
    growthRate: 0.03, // 저성장
    debtRatio: 1.7, // 중고부채 (인프라 투자)
  },
  materials: {
    growthRate: 0.03, // 저성장
    debtRatio: 1.5, // 중간 부채
  },
  utilities: {
    growthRate: 0.02, // 저성장
    debtRatio: 1.1, // 저부채 (안정적)
  },
  realestate: {
    growthRate: 0.05, // 중간 성장
    debtRatio: 2.2, // 고부채 (레버리지 활용)
  },
}

/* ── 100 Virtual Companies: 10 sectors x 10 companies ── */

function makeCompany(
  id: string,
  name: string,
  ticker: string,
  sector: Sector,
  price: number,
  volatility: number,
  drift: number,
  description: string,
): Company {
  const marketCap = price * 1_000_000
  const headcount = calculateHeadcountBySector(sector, marketCap)
  const layoffRate = 0.2 + Math.random() * 0.4 // 20-60%

  return {
    id,
    name,
    ticker,
    sector,
    price,
    previousPrice: price,
    basePrice: price, // Initial/reference price for GBM (IPO price)
    sessionOpenPrice: price, // Initial session open price
    priceHistory: [price],
    volatility,
    drift,
    marketCap,
    description,
    eventSensitivity: SECTOR_SENSITIVITY[sector],
    // Regime-based volatilities
    regimeVolatilities: {
      CALM: volatility * 0.5, // 평시: 기존의 50%
      VOLATILE: volatility, // 고변동: 기존 값 유지
      CRISIS: volatility * 2.0, // 위기: 기존의 2배
    },
    // Default values - will be overridden by initializeCompanyFinancials
    financials: {
      revenue: 0,
      netIncome: 0,
      debtRatio: 0,
      growthRate: 0,
      eps: 0,
    },
    institutionFlow: {
      netBuyVolume: 0,
      topBuyers: [],
      topSellers: [],
      institutionalOwnership: 0,
    },
    institutionFlowHistory: [], // 최근 10일 수급 추이 (초기값: 빈 배열)
    // M&A 시스템 필드
    status: 'active',
    parentCompanyId: null,
    acquiredAtTick: null,
    headcount,
    layoffRateOnAcquisition: layoffRate,
    mnaHistory: [],
  }
}

/** Calculate initial headcount based on sector and marketCap */
function calculateHeadcountBySector(sector: Sector, marketCap: number): number {
  const baseHeadcount: Record<Sector, number> = {
    tech: 5000,
    finance: 3000,
    energy: 4000,
    healthcare: 6000,
    consumer: 2000,
    industrial: 7000,
    telecom: 4500,
    materials: 3500,
    utilities: 2500,
    realestate: 1500,
  }

  // 시가총액 기반 스케일링 (간단한 로그 스케일)
  const scale = Math.log10(marketCap / 1_000_000) * 0.5 + 0.5
  return Math.round(baseHeadcount[sector] * scale)
}

export { SECTOR_SENSITIVITY, SECTOR_FINANCIALS }

export const COMPANIES: Company[] = [
  // ── Tech (10) ──
  makeCompany(
    'tech-01',
    '넥스트론',
    'NXT',
    'tech',
    85000,
    0.35,
    0.12,
    '차세대 반도체 설계 전문기업',
  ),
  makeCompany('tech-02', '디지코어', 'DGC', 'tech', 42000, 0.3, 0.1, 'AI 프로세서 팹리스'),
  makeCompany('tech-03', '클라우드빔', 'CLB', 'tech', 120000, 0.28, 0.09, '클라우드 인프라 솔루션'),
  makeCompany('tech-04', '퓨처웨어', 'FTW', 'tech', 33000, 0.4, 0.08, 'IoT 디바이스 스타트업'),
  makeCompany('tech-05', '사이버링크', 'CYL', 'tech', 56000, 0.32, 0.11, '사이버보안 플랫폼'),
  makeCompany('tech-06', '메가픽셀', 'MGP', 'tech', 78000, 0.25, 0.07, '디스플레이 패널 제조'),
  makeCompany('tech-07', '콴텀비트', 'QBT', 'tech', 15000, 0.5, 0.15, '양자컴퓨팅 R&D'),
  makeCompany('tech-08', '데이터스톰', 'DTS', 'tech', 95000, 0.22, 0.06, '빅데이터 분석 플랫폼'),
  makeCompany('tech-09', '로보틱스원', 'RB1', 'tech', 61000, 0.38, 0.13, '산업용 로봇 제조'),
  makeCompany('tech-10', '앱스토리', 'APS', 'tech', 28000, 0.33, 0.09, '모바일 앱 개발사'),

  // ── Finance (10) ──
  makeCompany('fin-01', '한성은행', 'HSB', 'finance', 52000, 0.18, 0.05, '시중은행 1위'),
  makeCompany('fin-02', '글로벌증권', 'GLS', 'finance', 38000, 0.25, 0.07, '온라인 증권사'),
  makeCompany('fin-03', '퍼스트캐피탈', 'FCP', 'finance', 44000, 0.2, 0.06, '벤처캐피탈'),
  makeCompany('fin-04', '세이프보험', 'SFI', 'finance', 67000, 0.15, 0.04, '종합보험사'),
  makeCompany('fin-05', '디지털페이', 'DGP', 'finance', 31000, 0.35, 0.1, '핀테크 결제 플랫폼'),
  makeCompany('fin-06', '에셋매니저', 'ASM', 'finance', 89000, 0.2, 0.06, '자산운용사'),
  makeCompany('fin-07', '트러스트론', 'TRS', 'finance', 25000, 0.22, 0.05, '신탁전문 금융사'),
  makeCompany('fin-08', '크레딧링크', 'CRL', 'finance', 19000, 0.3, 0.08, '소액대출 플랫폼'),
  makeCompany('fin-09', '인슈어텍', 'IST', 'finance', 41000, 0.28, 0.09, 'AI 보험 플랫폼'),
  makeCompany('fin-10', '골드리저브', 'GDR', 'finance', 73000, 0.16, 0.04, '금 및 귀금속 투자'),

  // ── Energy (10) ──
  makeCompany('eng-01', '선라이즈에너지', 'SRE', 'energy', 48000, 0.3, 0.08, '태양광 패널 제조'),
  makeCompany('eng-02', '윈드파워텍', 'WPT', 'energy', 35000, 0.28, 0.07, '해상 풍력발전'),
  makeCompany('eng-03', '페트로넥스', 'PTN', 'energy', 92000, 0.25, 0.05, '석유 정제 대기업'),
  makeCompany('eng-04', '그린하이드로', 'GHD', 'energy', 22000, 0.4, 0.12, '수소연료전지 개발'),
  makeCompany('eng-05', '뉴클리어원', 'NC1', 'energy', 110000, 0.2, 0.04, '원자력 발전소 운영'),
  makeCompany('eng-06', '배터리맥스', 'BTM', 'energy', 65000, 0.35, 0.11, 'EV 배터리 제조'),
  makeCompany('eng-07', '가스유니온', 'GSU', 'energy', 57000, 0.22, 0.05, 'LNG 수입/유통'),
  makeCompany('eng-08', '에코차저', 'ECG', 'energy', 18000, 0.42, 0.13, 'EV 충전 인프라'),
  makeCompany('eng-09', '열병합텍', 'HPT', 'energy', 40000, 0.18, 0.04, '열병합 발전'),
  makeCompany('eng-10', '카본제로', 'CZ0', 'energy', 27000, 0.38, 0.1, '탄소포집 기술'),

  // ── Healthcare (10) ──
  makeCompany('hc-01', '바이오젠텍', 'BGT', 'healthcare', 72000, 0.35, 0.1, '항암제 신약 개발'),
  makeCompany('hc-02', '메디코어', 'MDC', 'healthcare', 54000, 0.25, 0.07, '의료기기 제조'),
  makeCompany('hc-03', '진랩사이언스', 'GNL', 'healthcare', 38000, 0.4, 0.12, '유전체 분석'),
  makeCompany('hc-04', '헬스플러스', 'HPL', 'healthcare', 29000, 0.22, 0.06, '디지털 헬스케어'),
  makeCompany('hc-05', '뉴로사이언', 'NRS', 'healthcare', 85000, 0.45, 0.14, '뇌과학 신약 R&D'),
  makeCompany('hc-06', '파마로직', 'PML', 'healthcare', 46000, 0.3, 0.08, '제네릭 의약품'),
  makeCompany('hc-07', '셀큐어', 'CLQ', 'healthcare', 125000, 0.38, 0.11, '세포치료제'),
  makeCompany('hc-08', '덴탈프로', 'DNP', 'healthcare', 33000, 0.2, 0.05, '치과 장비'),
  makeCompany('hc-09', '백신텍', 'VCT', 'healthcare', 61000, 0.32, 0.09, '백신 개발'),
  makeCompany('hc-10', '오가노이드', 'OGN', 'healthcare', 17000, 0.5, 0.16, '장기 모사체 연구'),

  // ── Consumer (10) ──
  makeCompany('con-01', '맛나푸드', 'MNF', 'consumer', 43000, 0.18, 0.05, '종합식품 대기업'),
  makeCompany('con-02', '패션코드', 'FSC', 'consumer', 28000, 0.25, 0.07, 'SPA 패션 브랜드'),
  makeCompany('con-03', '홈마트', 'HMT', 'consumer', 67000, 0.15, 0.04, '대형 유통마트'),
  makeCompany('con-04', '게임월드', 'GMW', 'consumer', 55000, 0.35, 0.1, '게임 퍼블리셔'),
  makeCompany('con-05', '뷰티랩', 'BTL', 'consumer', 36000, 0.28, 0.08, 'K-뷰티 화장품'),
  makeCompany('con-06', '펫프렌즈', 'PTF', 'consumer', 24000, 0.3, 0.09, '반려동물 용품'),
  makeCompany('con-07', '라이프스타일', 'LFS', 'consumer', 81000, 0.2, 0.06, '프리미엄 가전'),
  makeCompany('con-08', '드링크웰', 'DKW', 'consumer', 19000, 0.22, 0.05, '음료 제조사'),
  makeCompany('con-09', '에듀넥스트', 'EDN', 'consumer', 47000, 0.26, 0.07, '에듀테크 플랫폼'),
  makeCompany('con-10', '트래블존', 'TVZ', 'consumer', 32000, 0.32, 0.08, '온라인 여행사'),

  // ── Industrial (10) ──
  makeCompany('ind-01', '스틸웍스', 'STW', 'industrial', 88000, 0.22, 0.05, '특수강 제조'),
  makeCompany('ind-02', '빌더스텍', 'BDT', 'industrial', 51000, 0.25, 0.06, '건설 종합 시공'),
  makeCompany('ind-03', '항공다이나믹', 'ARD', 'industrial', 130000, 0.28, 0.07, '항공기 부품'),
  makeCompany('ind-04', '오토모빌렉스', 'ATM', 'industrial', 74000, 0.24, 0.06, '자동차 제조'),
  makeCompany('ind-05', '쉽야드코리아', 'SYK', 'industrial', 42000, 0.3, 0.07, '조선업'),
  makeCompany('ind-06', '로지스틱프로', 'LGP', 'industrial', 36000, 0.2, 0.05, '물류 솔루션'),
  makeCompany('ind-07', '케미컬원', 'CM1', 'industrial', 59000, 0.26, 0.06, '정밀화학'),
  makeCompany('ind-08', '파워머신', 'PWM', 'industrial', 28000, 0.22, 0.05, '산업용 기계'),
  makeCompany('ind-09', '드론마스터', 'DRM', 'industrial', 21000, 0.4, 0.12, '상업용 드론'),
  makeCompany('ind-10', '3D프린트랩', 'TDP', 'industrial', 16000, 0.45, 0.14, '3D 프린팅 제조'),

  // ── Telecom (10) ──
  makeCompany('tel-01', '스카이넷통신', 'SKN', 'telecom', 62000, 0.18, 0.04, '이동통신 1위'),
  makeCompany('tel-02', '메가밴드', 'MGB', 'telecom', 48000, 0.2, 0.05, '초고속 인터넷'),
  makeCompany('tel-03', '새틀라이트원', 'ST1', 'telecom', 35000, 0.35, 0.1, '위성통신'),
  makeCompany('tel-04', '파이버옵틱스', 'FBO', 'telecom', 27000, 0.22, 0.06, '광케이블 제조'),
  makeCompany('tel-05', '5G이노베이션', 'FGI', 'telecom', 44000, 0.3, 0.09, '5G 장비'),
  makeCompany('tel-06', '미디어스트림', 'MDS', 'telecom', 53000, 0.25, 0.07, 'OTT 플랫폼'),
  makeCompany('tel-07', '콜센터프로', 'CCP', 'telecom', 19000, 0.15, 0.03, 'AI 고객센터'),
  makeCompany('tel-08', 'IoT커넥트', 'IOC', 'telecom', 31000, 0.32, 0.08, 'IoT 통신모듈'),
  makeCompany('tel-09', '데이터센터론', 'DCR', 'telecom', 76000, 0.24, 0.06, 'IDC 운영'),
  makeCompany('tel-10', '넷시큐리티', 'NTS', 'telecom', 40000, 0.28, 0.08, '네트워크 보안'),

  // ── Materials (10) ──
  makeCompany('mat-01', '레어메탈스', 'RMT', 'materials', 58000, 0.3, 0.08, '희토류 채굴'),
  makeCompany('mat-02', '그린텍스타일', 'GTS', 'materials', 22000, 0.2, 0.05, '친환경 섬유'),
  makeCompany('mat-03', '나노소재연구소', 'NNM', 'materials', 34000, 0.38, 0.11, '나노소재 개발'),
  makeCompany('mat-04', '포레스트우드', 'FRW', 'materials', 18000, 0.16, 0.04, '목재/펄프'),
  makeCompany('mat-05', '실리콘밸리소재', 'SVM', 'materials', 47000, 0.28, 0.07, '반도체 소재'),
  makeCompany('mat-06', '시멘트웍스', 'CMW', 'materials', 39000, 0.18, 0.04, '시멘트 제조'),
  makeCompany('mat-07', '플라스틱텍', 'PLT', 'materials', 26000, 0.22, 0.05, '엔지니어링 플라스틱'),
  makeCompany('mat-08', '유리공방', 'GLC', 'materials', 31000, 0.2, 0.05, '특수유리'),
  makeCompany('mat-09', '알루미늄코어', 'ALC', 'materials', 52000, 0.25, 0.06, '알루미늄 가공'),
  makeCompany('mat-10', '바이오소재랩', 'BSL', 'materials', 15000, 0.42, 0.13, '생분해성 소재'),

  // ── Utilities (10) ──
  makeCompany('utl-01', '한빛전력', 'HBE', 'utilities', 45000, 0.12, 0.03, '전력 공급'),
  makeCompany('utl-02', '클린워터', 'CLW', 'utilities', 38000, 0.14, 0.03, '수처리/상하수도'),
  makeCompany('utl-03', '도시가스원', 'DG1', 'utilities', 52000, 0.15, 0.04, '도시가스 공급'),
  makeCompany('utl-04', '스마트그리드', 'SMG', 'utilities', 29000, 0.25, 0.07, '지능형 전력망'),
  makeCompany('utl-05', '에너지저장', 'ESS', 'utilities', 35000, 0.3, 0.08, 'ESS 솔루션'),
  makeCompany('utl-06', '환경솔루션', 'ENV', 'utilities', 23000, 0.2, 0.05, '환경관리'),
  makeCompany('utl-07', '폐기물처리텍', 'WMT', 'utilities', 31000, 0.18, 0.04, '폐기물 처리'),
  makeCompany('utl-08', '재활용넥스트', 'RCN', 'utilities', 17000, 0.22, 0.06, '자원 재활용'),
  makeCompany('utl-09', '지열에너지', 'GTE', 'utilities', 21000, 0.28, 0.07, '지열 발전'),
  makeCompany('utl-10', '인프라빌드', 'IFB', 'utilities', 42000, 0.16, 0.04, '인프라 관리'),

  // ── Real Estate (10) ──
  makeCompany('re-01', '메트로타워', 'MTW', 'realestate', 68000, 0.22, 0.06, '오피스빌딩 리츠'),
  makeCompany('re-02', '그린빌리지', 'GRV', 'realestate', 43000, 0.25, 0.07, '주거단지 개발'),
  makeCompany('re-03', '쇼핑몰프로', 'SMP', 'realestate', 37000, 0.28, 0.06, '상업시설 운영'),
  makeCompany('re-04', '물류창고텍', 'WHS', 'realestate', 51000, 0.2, 0.05, '물류센터 리츠'),
  makeCompany('re-05', '호텔앤리조트', 'HNR', 'realestate', 29000, 0.3, 0.07, '호텔 체인'),
  makeCompany('re-06', '스마트시티랩', 'SCL', 'realestate', 24000, 0.35, 0.1, '스마트시티 개발'),
  makeCompany('re-07', '공간디자인', 'SPD', 'realestate', 18000, 0.22, 0.05, '인테리어/설계'),
  makeCompany('re-08', '랜드마크개발', 'LMD', 'realestate', 82000, 0.24, 0.06, '랜드마크 개발'),
  makeCompany('re-09', '주차솔루션', 'PKS', 'realestate', 15000, 0.18, 0.04, '주차 인프라'),
  makeCompany('re-10', '공유오피스넷', 'CON', 'realestate', 33000, 0.32, 0.08, '공유오피스 운영'),
]

/* ── Company 재무 데이터 초기화 함수 ── */
export function initializeCompanyFinancials(company: Company): Company {
  const template = SECTOR_FINANCIALS[company.sector] || {}

  // 재무 데이터 생성
  const financials: Financials = {
    revenue: 1000 + Math.random() * 9000, // 1000억 ~ 1조
    netIncome:
      Math.random() > 0.2
        ? 100 + Math.random() * 900 // 80% 확률로 흑자
        : -(Math.random() * 200), // 20% 확률로 적자
    debtRatio: (template.debtRatio ?? 1.5) * (0.8 + Math.random() * 0.4), // ±20% 변동
    growthRate: (template.growthRate ?? 0.05) * (0.5 + Math.random() * 1.5), // ±50% 변동
    eps: Math.random() * 10000,
  }

  // 기관 수급 초기화
  const institutionFlow: InstitutionalFlow = {
    netBuyVolume: 0,
    topBuyers: [],
    topSellers: [],
    institutionalOwnership: 0.3 + Math.random() * 0.4, // 30% ~ 70%
  }

  return {
    ...company,
    financials,
    institutionFlow,
    // Initialize VI (Volatility Interruption) fields
    viTriggered: false,
    viCooldown: 0,
    viRecentPrices: [],
  }
}

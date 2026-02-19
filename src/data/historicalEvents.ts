import type { Sector } from '../types'
import type { EventTemplate } from './events'

/* ── Historical Events Database (1995-2025) ── */

export interface HistoricalEvent {
  year: number
  month?: number
  title: string
  description: string
  type: 'boom' | 'crash' | 'sector' | 'company' | 'policy' | 'global'
  impact: {
    driftModifier: number
    volatilityModifier: number
    severity: 'low' | 'medium' | 'high' | 'critical'
  }
  duration: number
  weight: number
  affectedSectors?: Sector[]
  chainEvents?: {
    templateIndex: number
    probability: number
    delayTicks: [number, number]
  }[]
}

/* ── Chain Event Templates (후속 이벤트) ── */
export const CHAIN_EVENT_TEMPLATES: EventTemplate[] = [
  {
    title: '후속 패닉 매도 확산',
    description: '시장 불안 심리가 확산되며 추가 매도세가 이어집니다.',
    type: 'crash',
    impact: { driftModifier: -0.05, volatilityModifier: 0.3, severity: 'high' },
    duration: 80,
    weight: 2,
  },
  {
    title: '기술적 반등 시작',
    description: '과매도 구간에서 저가 매수세가 유입됩니다.',
    type: 'boom',
    impact: { driftModifier: 0.04, volatilityModifier: 0.15, severity: 'medium' },
    duration: 60,
    weight: 3,
  },
  {
    title: '정부 긴급 대책 발표',
    description: '시장 안정을 위한 정부의 긴급 조치가 발표됩니다.',
    type: 'policy',
    impact: { driftModifier: 0.03, volatilityModifier: -0.1, severity: 'medium' },
    duration: 100,
    weight: 3,
  },
  {
    title: '연쇄 기업 부도 위기',
    description: '위기가 확산되며 연쇄 부도 우려가 커집니다.',
    type: 'crash',
    impact: { driftModifier: -0.08, volatilityModifier: 0.4, severity: 'critical' },
    duration: 120,
    weight: 1,
  },
  {
    title: '외국인 투자 이탈',
    description: '외국인 투자자들이 대규모 순매도로 전환합니다.',
    type: 'crash',
    impact: { driftModifier: -0.06, volatilityModifier: 0.25, severity: 'high' },
    duration: 90,
    weight: 2,
  },
  {
    title: '규제 당국 조사 착수',
    description: '금융당국이 관련 기업에 대한 조사를 시작합니다.',
    type: 'policy',
    impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'medium' },
    duration: 70,
    weight: 3,
  },
  {
    title: '섹터 수혜 확산',
    description: '긍정적 파급효과가 관련 산업으로 확산됩니다.',
    type: 'sector',
    impact: { driftModifier: 0.04, volatilityModifier: 0.1, severity: 'medium' },
    duration: 100,
    weight: 3,
  },
  {
    title: '글로벌 투자 자금 유입',
    description: '국제 투자자금이 유입되며 시장이 활기를 띱니다.',
    type: 'boom',
    impact: { driftModifier: 0.05, volatilityModifier: 0.08, severity: 'medium' },
    duration: 120,
    weight: 3,
  },
  {
    title: '실물경제 침체 우려',
    description: '금융 위기가 실물경제로 전이될 조짐입니다.',
    type: 'global',
    impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' },
    duration: 150,
    weight: 2,
  },
  {
    title: '중앙은행 긴급 금리 인하',
    description: '중앙은행이 긴급 금리 인하를 단행합니다.',
    type: 'policy',
    impact: { driftModifier: 0.06, volatilityModifier: 0.15, severity: 'high' },
    duration: 100,
    weight: 2,
  },
  {
    title: '경쟁사 반사이익',
    description: '문제 기업의 경쟁사들이 반사이익을 누립니다.',
    type: 'sector',
    impact: { driftModifier: 0.03, volatilityModifier: 0.1, severity: 'low' },
    duration: 80,
    weight: 5,
  },
  {
    title: '부동산 가격 하락 시작',
    description: '금융 불안이 부동산 시장으로 전이됩니다.',
    type: 'sector',
    impact: { driftModifier: -0.05, volatilityModifier: 0.2, severity: 'high' },
    duration: 130,
    weight: 2,
    affectedSectors: ['realestate'],
  },
  {
    title: '공급망 재편 수혜',
    description: '글로벌 공급망 재편으로 새로운 수혜 기업이 부상합니다.',
    type: 'sector',
    impact: { driftModifier: 0.04, volatilityModifier: 0.12, severity: 'medium' },
    duration: 110,
    weight: 3,
  },
  {
    title: '환율 급등',
    description: '불안 심리로 원화가 급락하며 환율이 급등합니다.',
    type: 'global',
    impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'medium' },
    duration: 80,
    weight: 3,
  },
  {
    title: '기관 투자자 저가 매수',
    description: '국민연금 등 기관이 대규모 매수에 나섭니다.',
    type: 'boom',
    impact: { driftModifier: 0.04, volatilityModifier: -0.05, severity: 'medium' },
    duration: 90,
    weight: 3,
  },
  {
    title: '소비 심리 급랭',
    description: '경제 불안으로 소비 심리가 급격히 위축됩니다.',
    type: 'sector',
    impact: { driftModifier: -0.03, volatilityModifier: 0.12, severity: 'medium' },
    duration: 100,
    weight: 3,
    affectedSectors: ['consumer'],
  },
  {
    title: '에너지 가격 급변',
    description: '지정학적 요인으로 에너지 가격이 급변합니다.',
    type: 'sector',
    impact: { driftModifier: 0.05, volatilityModifier: 0.25, severity: 'high' },
    duration: 90,
    weight: 2,
    affectedSectors: ['energy'],
  },
  {
    title: '기술 혁신 후속 투자',
    description: '기술 혁신에 대한 후속 투자가 이어집니다.',
    type: 'sector',
    impact: { driftModifier: 0.05, volatilityModifier: 0.1, severity: 'medium' },
    duration: 120,
    weight: 3,
    affectedSectors: ['tech'],
  },
  {
    title: '구조조정 발표',
    description: '위기 기업들이 대규모 구조조정을 발표합니다.',
    type: 'company',
    impact: { driftModifier: -0.02, volatilityModifier: 0.15, severity: 'medium' },
    duration: 80,
    weight: 3,
  },
  {
    title: 'V자 반등',
    description: '급락 후 강한 반등세가 나타납니다.',
    type: 'boom',
    impact: { driftModifier: 0.08, volatilityModifier: 0.2, severity: 'high' },
    duration: 50,
    weight: 2,
  },
]

/* ── Historical Events: 1995-2025 ── */
export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  // ═══ 1995 ═══
  { year: 1995, month: 1, title: '멕시코 페소 위기 여파', description: '멕시코 통화 위기가 신흥국 시장 전반에 불안을 확산시킵니다.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.15, severity: 'medium' }, duration: 100, weight: 3 },
  { year: 1995, month: 3, title: '엔고 현상, 수출주 타격', description: '엔화 강세로 한국 수출 기업 경쟁력이 악화됩니다.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.1, severity: 'low' }, duration: 80, weight: 5, affectedSectors: ['industrial', 'consumer'] },
  { year: 1995, month: 5, title: '인터넷 상용화 시작', description: '국내 인터넷 서비스가 본격 시작되며 IT 기대감이 형성됩니다.', type: 'sector', impact: { driftModifier: 0.04, volatilityModifier: 0.1, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['tech', 'telecom'] },
  { year: 1995, month: 7, title: '삼풍백화점 붕괴 참사', description: '대형 참사로 건설·부동산주가 큰 타격을 받습니다.', type: 'company', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['realestate', 'industrial'] },
  { year: 1995, month: 9, title: 'Windows 95 출시 열풍', description: 'PC 보급 확대로 IT 산업 성장 기대감이 높아집니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.08, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['tech'] },
  { year: 1995, month: 11, title: '금융실명제 안착', description: '금융실명제가 정착되며 시장 투명성이 높아집니다.', type: 'policy', impact: { driftModifier: 0.02, volatilityModifier: -0.05, severity: 'low' }, duration: 90, weight: 5, affectedSectors: ['finance'] },

  // ═══ 1996 ═══
  { year: 1996, month: 1, title: 'OECD 가입 기대감', description: '한국의 OECD 가입이 가시화되며 외국인 투자 기대감이 높아집니다.', type: 'policy', impact: { driftModifier: 0.04, volatilityModifier: 0.08, severity: 'medium' }, duration: 150, weight: 3 },
  { year: 1996, month: 4, title: '반도체 가격 급락', description: 'D램 가격이 반토막 나며 반도체 업종이 크게 하락합니다.', type: 'sector', impact: { driftModifier: -0.06, volatilityModifier: 0.25, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['tech', 'materials'] },
  { year: 1996, month: 6, title: '한보그룹 부실 징조', description: '한보그룹의 차입 경영이 문제시되기 시작합니다.', type: 'company', impact: { driftModifier: -0.02, volatilityModifier: 0.12, severity: 'medium' }, duration: 80, weight: 3, affectedSectors: ['finance', 'industrial'] },
  { year: 1996, month: 8, title: '닷컴 붐 초기', description: '인터넷 관련 벤처 붐이 시작되며 IT주 급등합니다.', type: 'boom', impact: { driftModifier: 0.06, volatilityModifier: 0.15, severity: 'medium' }, duration: 140, weight: 3, affectedSectors: ['tech'] },
  { year: 1996, month: 10, title: '자동차 수출 호조', description: '현대·기아차 수출이 사상 최대를 기록합니다.', type: 'sector', impact: { driftModifier: 0.03, volatilityModifier: 0.05, severity: 'low' }, duration: 80, weight: 5, affectedSectors: ['industrial'] },
  { year: 1996, month: 12, title: 'OECD 정식 가입', description: '한국이 OECD에 정식 가입하며 선진국 진입 기대감이 최고조.', type: 'policy', impact: { driftModifier: 0.05, volatilityModifier: 0.05, severity: 'high' }, duration: 100, weight: 2 },

  // ═══ 1997 ═══
  { year: 1997, month: 1, title: '한보그룹 부도', description: '한보철강이 부도처리되며 금융 불안이 시작됩니다.', type: 'crash', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['finance', 'industrial'], chainEvents: [{ templateIndex: 3, probability: 0.6, delayTicks: [50, 100] }] },
  { year: 1997, month: 3, title: '삼미·진로 등 대기업 연쇄 부도', description: '대기업 연쇄 부도로 금융권 부실이 심화됩니다.', type: 'crash', impact: { driftModifier: -0.08, volatilityModifier: 0.35, severity: 'critical' }, duration: 120, weight: 1, affectedSectors: ['finance'] },
  { year: 1997, month: 7, title: '태국 바트화 폭락, 아시아 위기 시작', description: '태국 바트화 폭락으로 아시아 금융위기가 시작됩니다.', type: 'global', impact: { driftModifier: -0.1, volatilityModifier: 0.5, severity: 'critical' }, duration: 200, weight: 1, chainEvents: [{ templateIndex: 4, probability: 0.8, delayTicks: [30, 80] }, { templateIndex: 13, probability: 0.7, delayTicks: [20, 60] }] },
  { year: 1997, month: 10, title: '외환보유고 급감', description: '원화 방어에 실패하며 외환보유고가 위험 수준으로 감소합니다.', type: 'global', impact: { driftModifier: -0.08, volatilityModifier: 0.4, severity: 'critical' }, duration: 80, weight: 1 },
  { year: 1997, month: 11, title: 'IMF 구제금융 신청', description: '한국이 IMF에 구제금융을 신청합니다. 국가 신용도 폭락.', type: 'crash', impact: { driftModifier: -0.15, volatilityModifier: 0.6, severity: 'critical' }, duration: 250, weight: 1, chainEvents: [{ templateIndex: 0, probability: 0.9, delayTicks: [10, 30] }, { templateIndex: 8, probability: 0.8, delayTicks: [50, 100] }, { templateIndex: 9, probability: 0.6, delayTicks: [100, 200] }] },
  { year: 1997, month: 12, title: '환율 2000원 돌파', description: '원/달러 환율이 2000원을 넘어서며 공포가 확산됩니다.', type: 'crash', impact: { driftModifier: -0.12, volatilityModifier: 0.5, severity: 'critical' }, duration: 80, weight: 1 },

  // ═══ 1998 ═══
  { year: 1998, month: 1, title: '금 모으기 운동', description: '국민적 금 모으기 운동으로 외환 위기 극복 의지를 다집니다.', type: 'global', impact: { driftModifier: 0.02, volatilityModifier: -0.05, severity: 'low' }, duration: 60, weight: 5 },
  { year: 1998, month: 3, title: '구조조정 본격화', description: '5대 그룹 빅딜, 기업 구조조정이 본격화됩니다.', type: 'policy', impact: { driftModifier: -0.03, volatilityModifier: 0.15, severity: 'medium' }, duration: 150, weight: 3, affectedSectors: ['industrial', 'finance'] },
  { year: 1998, month: 5, title: '러시아 모라토리엄', description: '러시아가 디폴트를 선언하며 글로벌 불안이 재확산됩니다.', type: 'global', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 100, weight: 2 },
  { year: 1998, month: 8, title: 'LTCM 파산 위기', description: '롱텀캐피탈 매니지먼트 파산 위기로 글로벌 금융 시스템 불안.', type: 'crash', impact: { driftModifier: -0.07, volatilityModifier: 0.35, severity: 'critical' }, duration: 80, weight: 1, affectedSectors: ['finance'] },
  { year: 1998, month: 10, title: '외환위기 회복 조짐', description: '환율이 안정되기 시작하며 회복 기대감이 형성됩니다.', type: 'boom', impact: { driftModifier: 0.06, volatilityModifier: 0.15, severity: 'medium' }, duration: 120, weight: 3, chainEvents: [{ templateIndex: 1, probability: 0.6, delayTicks: [40, 80] }] },
  { year: 1998, month: 12, title: '대우그룹 위기 시작', description: '대우그룹의 유동성 위기가 가시화됩니다.', type: 'company', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['industrial', 'finance'] },

  // ═══ 1999 ═══
  { year: 1999, month: 1, title: '경기 회복 본격화', description: 'IMF 위기 이후 경기가 빠르게 회복됩니다.', type: 'boom', impact: { driftModifier: 0.08, volatilityModifier: 0.1, severity: 'high' }, duration: 180, weight: 2 },
  { year: 1999, month: 3, title: '벤처 투자 붐', description: '코스닥 시장에 벤처 투자 열풍이 불며 급등합니다.', type: 'boom', impact: { driftModifier: 0.1, volatilityModifier: 0.25, severity: 'high' }, duration: 200, weight: 2, affectedSectors: ['tech'] },
  { year: 1999, month: 6, title: '인터넷 비즈니스 폭발', description: '인터넷 기업 IPO 러시로 기술주가 폭등합니다.', type: 'sector', impact: { driftModifier: 0.08, volatilityModifier: 0.2, severity: 'high' }, duration: 150, weight: 2, affectedSectors: ['tech', 'telecom'] },
  { year: 1999, month: 7, title: '대우그룹 해체', description: '대우그룹이 공식 해체되며 시장에 충격을 줍니다.', type: 'crash', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['finance', 'industrial'] },
  { year: 1999, month: 10, title: 'Y2K 공포', description: 'Y2K 밀레니엄 버그에 대한 불안감이 확산됩니다.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.12, severity: 'medium' }, duration: 80, weight: 3, affectedSectors: ['tech'] },
  { year: 1999, month: 12, title: '밀레니엄 랠리', description: '새천년을 앞두고 강한 매수세가 유입됩니다.', type: 'boom', impact: { driftModifier: 0.06, volatilityModifier: 0.05, severity: 'medium' }, duration: 60, weight: 3 },

  // ═══ 2000 ═══
  { year: 2000, month: 1, title: '닷컴 버블 절정', description: '인터넷 기업 주가가 사상 최고치를 경신합니다.', type: 'boom', impact: { driftModifier: 0.1, volatilityModifier: 0.3, severity: 'high' }, duration: 60, weight: 2, affectedSectors: ['tech'] },
  { year: 2000, month: 3, title: '나스닥 폭락, 닷컴 버블 붕괴', description: '나스닥이 폭락하며 전세계 IT 버블이 꺼집니다.', type: 'crash', impact: { driftModifier: -0.12, volatilityModifier: 0.5, severity: 'critical' }, duration: 250, weight: 1, affectedSectors: ['tech', 'telecom'], chainEvents: [{ templateIndex: 0, probability: 0.8, delayTicks: [30, 60] }, { templateIndex: 18, probability: 0.7, delayTicks: [80, 150] }] },
  { year: 2000, month: 5, title: '코스닥 대폭락', description: '코스닥 지수가 반토막 나며 개인투자자 큰 손실.', type: 'crash', impact: { driftModifier: -0.1, volatilityModifier: 0.45, severity: 'critical' }, duration: 180, weight: 1, affectedSectors: ['tech'] },
  { year: 2000, month: 7, title: '현대그룹 유동성 위기', description: '현대그룹 유동성 위기로 재벌 구조개혁 압박이 강화됩니다.', type: 'company', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['industrial'] },
  { year: 2000, month: 9, title: '유가 급등, 에너지 위기', description: '국제유가가 30달러를 돌파하며 에너지 가격이 급등합니다.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.15, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['energy'] },
  { year: 2000, month: 11, title: 'IT 구조조정 본격화', description: '닷컴 기업 대량 폐업과 IT 인력 구조조정이 시작됩니다.', type: 'sector', impact: { driftModifier: -0.03, volatilityModifier: 0.12, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['tech'] },

  // ═══ 2001 ═══
  { year: 2001, month: 1, title: '미 연준 긴급 금리 인하', description: '경기 침체 우려에 연준이 금리를 긴급 인하합니다.', type: 'policy', impact: { driftModifier: 0.04, volatilityModifier: 0.1, severity: 'medium' }, duration: 100, weight: 3 },
  { year: 2001, month: 3, title: 'IT 버블 후유증 지속', description: '기술주 하락세가 이어지며 시장 전반이 위축됩니다.', type: 'sector', impact: { driftModifier: -0.04, volatilityModifier: 0.15, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['tech'] },
  { year: 2001, month: 9, title: '9/11 테러 공격', description: '미국 동시다발 테러로 전세계 금융시장이 패닉에 빠집니다.', type: 'crash', impact: { driftModifier: -0.12, volatilityModifier: 0.6, severity: 'critical' }, duration: 100, weight: 1, chainEvents: [{ templateIndex: 0, probability: 0.9, delayTicks: [5, 20] }, { templateIndex: 2, probability: 0.7, delayTicks: [10, 30] }, { templateIndex: 19, probability: 0.5, delayTicks: [30, 60] }] },
  { year: 2001, month: 10, title: '아프간 전쟁 개시', description: '미군의 아프간 침공으로 지정학적 불안이 지속됩니다.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['energy'] },
  { year: 2001, month: 11, title: '엔론 스캔들', description: '미국 에너지 대기업 엔론의 대규모 분식회계가 적발됩니다.', type: 'company', impact: { driftModifier: -0.04, volatilityModifier: 0.25, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['energy', 'finance'] },
  { year: 2001, month: 12, title: '연말 반등 시도', description: '악재 소화 후 저가 매수세가 유입되기 시작합니다.', type: 'boom', impact: { driftModifier: 0.03, volatilityModifier: 0.08, severity: 'low' }, duration: 60, weight: 5 },

  // ═══ 2002-2003 ═══
  { year: 2002, month: 1, title: '월드컴 회계부정', description: '월드컴 대규모 회계부정 사건으로 기업 신뢰도가 추락합니다.', type: 'company', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['telecom', 'finance'] },
  { year: 2002, month: 5, title: '한일 월드컵 특수', description: '월드컵 개최로 소비재·관광 관련주가 상승합니다.', type: 'sector', impact: { driftModifier: 0.03, volatilityModifier: 0.05, severity: 'low' }, duration: 60, weight: 5, affectedSectors: ['consumer'] },
  { year: 2002, month: 9, title: '카드 대란 시작', description: '신용카드 연체율이 급증하며 금융 위기 우려가 커집니다.', type: 'crash', impact: { driftModifier: -0.06, volatilityModifier: 0.25, severity: 'high' }, duration: 150, weight: 2, affectedSectors: ['finance', 'consumer'] },
  { year: 2003, month: 2, title: 'SARS 공포', description: 'SARS 바이러스가 아시아에 확산되며 경제 활동이 위축됩니다.', type: 'global', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['consumer', 'healthcare'] },
  { year: 2003, month: 3, title: '이라크 전쟁 개시', description: '미군의 이라크 침공으로 유가가 급등하고 시장이 불안합니다.', type: 'global', impact: { driftModifier: -0.05, volatilityModifier: 0.3, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['energy'], chainEvents: [{ templateIndex: 16, probability: 0.8, delayTicks: [20, 50] }] },
  { year: 2003, month: 6, title: 'SK글로벌 분식회계', description: 'SK글로벌 대규모 분식회계 적발로 시장 충격.', type: 'company', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 80, weight: 2 },
  { year: 2003, month: 9, title: '경기 회복 신호', description: '글로벌 경기 회복세가 뚜렷해지며 시장이 반등합니다.', type: 'boom', impact: { driftModifier: 0.05, volatilityModifier: -0.05, severity: 'medium' }, duration: 150, weight: 3 },

  // ═══ 2004-2006 ═══
  { year: 2004, month: 3, title: '대통령 탄핵 정국', description: '대통령 탄핵으로 정치적 불확실성이 높아집니다.', type: 'policy', impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'medium' }, duration: 80, weight: 3 },
  { year: 2004, month: 8, title: '유가 50달러 돌파', description: '국제유가가 사상 첫 50달러를 돌파합니다.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.15, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['energy'] },
  { year: 2004, month: 11, title: 'BRICs 투자 붐', description: '브릭스 국가 투자 열풍으로 신흥국 자금이 유입됩니다.', type: 'boom', impact: { driftModifier: 0.05, volatilityModifier: 0.1, severity: 'medium' }, duration: 150, weight: 3, affectedSectors: ['materials', 'industrial'] },
  { year: 2005, month: 3, title: '부동산 투기 과열', description: '강남 아파트 가격이 폭등하며 부동산 버블 우려가 커집니다.', type: 'sector', impact: { driftModifier: 0.04, volatilityModifier: 0.15, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['realestate'] },
  { year: 2005, month: 7, title: '런던 테러', description: '런던 지하철 폭탄 테러로 글로벌 불안감이 고조됩니다.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.12, severity: 'medium' }, duration: 50, weight: 3 },
  { year: 2005, month: 10, title: '중국 성장 가속', description: '중국 GDP 10% 성장으로 원자재·수출주 수혜.', type: 'global', impact: { driftModifier: 0.04, volatilityModifier: 0.08, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['materials', 'industrial'] },
  { year: 2006, month: 5, title: '글로벌 증시 조정', description: '신흥국 과열 우려로 글로벌 증시가 동시 조정됩니다.', type: 'crash', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 60, weight: 2 },
  { year: 2006, month: 8, title: '주택 가격 하락 조짐', description: '미국 주택 가격이 하락하기 시작합니다.', type: 'sector', impact: { driftModifier: -0.02, volatilityModifier: 0.1, severity: 'low' }, duration: 80, weight: 5, affectedSectors: ['realestate', 'finance'] },
  { year: 2006, month: 11, title: '코스피 1500 돌파', description: '한국 주식시장이 역사적 고점을 경신합니다.', type: 'boom', impact: { driftModifier: 0.05, volatilityModifier: 0.05, severity: 'medium' }, duration: 80, weight: 3 },

  // ═══ 2007-2008 (글로벌 금융위기) ═══
  { year: 2007, month: 2, title: '서브프라임 부실 경고', description: '미국 비우량 주택담보대출 연체율이 급증합니다.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.15, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['finance', 'realestate'] },
  { year: 2007, month: 7, title: '베어스턴스 헤지펀드 파산', description: '서브프라임 관련 헤지펀드 2개가 파산합니다.', type: 'crash', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['finance'] },
  { year: 2007, month: 10, title: '코스피 2000 돌파', description: '한국 증시가 사상 첫 2000선을 돌파합니다.', type: 'boom', impact: { driftModifier: 0.06, volatilityModifier: 0.1, severity: 'high' }, duration: 60, weight: 2 },
  { year: 2007, month: 12, title: '글로벌 신용경색 시작', description: '은행 간 대출이 얼어붙으며 신용경색이 시작됩니다.', type: 'global', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['finance'] },
  { year: 2008, month: 3, title: '베어스턴스 인수 합병', description: 'JP모건이 베어스턴스를 헐값에 인수하며 공포가 확산됩니다.', type: 'crash', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['finance'] },
  { year: 2008, month: 7, title: '유가 147달러 사상 최고', description: '국제유가가 사상 최고치를 기록하며 인플레 우려 극대화.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'high' }, duration: 60, weight: 2, affectedSectors: ['energy'] },
  { year: 2008, month: 9, title: '리먼 브라더스 파산', description: '리먼 브라더스가 파산하며 글로벌 금융 시스템이 마비됩니다.', type: 'crash', impact: { driftModifier: -0.15, volatilityModifier: 0.7, severity: 'critical' }, duration: 300, weight: 1, chainEvents: [{ templateIndex: 0, probability: 0.95, delayTicks: [5, 15] }, { templateIndex: 3, probability: 0.8, delayTicks: [20, 50] }, { templateIndex: 8, probability: 0.9, delayTicks: [30, 80] }, { templateIndex: 9, probability: 0.7, delayTicks: [40, 100] }] },
  { year: 2008, month: 10, title: '글로벌 주식시장 대폭락', description: '전세계 증시가 동반 폭락, 코스피 40% 이상 하락.', type: 'crash', impact: { driftModifier: -0.12, volatilityModifier: 0.6, severity: 'critical' }, duration: 80, weight: 1 },
  { year: 2008, month: 11, title: 'G20 긴급 정상회의', description: '주요국이 공조하여 금융 안정 대책을 발표합니다.', type: 'policy', impact: { driftModifier: 0.04, volatilityModifier: -0.1, severity: 'medium' }, duration: 100, weight: 3 },

  // ═══ 2009-2011 ═══
  { year: 2009, month: 3, title: '미 연준 양적완화 시작', description: '대규모 양적완화로 유동성이 풍부해집니다.', type: 'policy', impact: { driftModifier: 0.08, volatilityModifier: 0.15, severity: 'high' }, duration: 200, weight: 2, chainEvents: [{ templateIndex: 7, probability: 0.7, delayTicks: [50, 100] }] },
  { year: 2009, month: 6, title: 'V자 회복 시작', description: '글로벌 경기가 빠르게 회복되며 증시가 급반등합니다.', type: 'boom', impact: { driftModifier: 0.08, volatilityModifier: 0.1, severity: 'high' }, duration: 180, weight: 2 },
  { year: 2010, month: 4, title: '유럽 재정위기 (그리스)', description: '그리스 국가 부도 위기로 유럽 전체가 흔들립니다.', type: 'global', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 150, weight: 2, affectedSectors: ['finance'] },
  { year: 2010, month: 5, title: '플래시 크래시', description: '다우지수가 몇 분 만에 1000포인트 폭락합니다.', type: 'crash', impact: { driftModifier: -0.05, volatilityModifier: 0.5, severity: 'high' }, duration: 20, weight: 2 },
  { year: 2010, month: 11, title: '한국 G20 의장국', description: '한국이 G20 의장국으로서 위상이 높아집니다.', type: 'policy', impact: { driftModifier: 0.03, volatilityModifier: 0.05, severity: 'low' }, duration: 80, weight: 5 },
  { year: 2011, month: 3, title: '동일본 대지진·후쿠시마', description: '일본 대지진과 원전 사고로 글로벌 공급망이 마비됩니다.', type: 'global', impact: { driftModifier: -0.05, volatilityModifier: 0.3, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['energy', 'industrial'] },
  { year: 2011, month: 8, title: '미국 신용등급 강등', description: 'S&P가 미국 신용등급을 AAA에서 강등합니다.', type: 'global', impact: { driftModifier: -0.06, volatilityModifier: 0.25, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['finance'] },
  { year: 2011, month: 10, title: '유럽 재정위기 심화', description: '이탈리아·스페인으로 위기가 확산됩니다.', type: 'global', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['finance'] },

  // ═══ 2012-2014 ═══
  { year: 2012, month: 7, title: '"Whatever it takes" 발언', description: 'ECB 드라기 총재의 발언으로 유로존 위기가 진정됩니다.', type: 'boom', impact: { driftModifier: 0.05, volatilityModifier: -0.1, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['finance'] },
  { year: 2012, month: 9, title: 'QE3 시작', description: '미 연준이 3차 양적완화를 시작합니다.', type: 'policy', impact: { driftModifier: 0.05, volatilityModifier: 0.08, severity: 'medium' }, duration: 150, weight: 3 },
  { year: 2013, month: 5, title: '테이퍼 탠트럼', description: '양적완화 축소 시사에 신흥국 시장이 급락합니다.', type: 'crash', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 80, weight: 2, chainEvents: [{ templateIndex: 4, probability: 0.6, delayTicks: [20, 50] }, { templateIndex: 13, probability: 0.5, delayTicks: [10, 30] }] },
  { year: 2013, month: 9, title: '아베노믹스 효과', description: '일본 경기부양책으로 아시아 시장이 반등합니다.', type: 'boom', impact: { driftModifier: 0.04, volatilityModifier: 0.08, severity: 'medium' }, duration: 100, weight: 3 },
  { year: 2014, month: 3, title: '크림반도 위기', description: '러시아의 크림반도 합병으로 지정학적 긴장이 고조됩니다.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.18, severity: 'medium' }, duration: 80, weight: 3, affectedSectors: ['energy'] },
  { year: 2014, month: 6, title: '유가 하락세 시작', description: '셰일 혁명으로 유가가 하락하기 시작합니다.', type: 'sector', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'medium' }, duration: 150, weight: 3, affectedSectors: ['energy'] },
  { year: 2014, month: 10, title: 'Ebola 공포', description: '에볼라 바이러스 확산 우려로 바이오주가 급등합니다.', type: 'global', impact: { driftModifier: 0.03, volatilityModifier: 0.15, severity: 'medium' }, duration: 60, weight: 3, affectedSectors: ['healthcare'] },

  // ═══ 2015-2016 ═══
  { year: 2015, month: 6, title: '중국 증시 대폭락', description: '중국 상하이 종합지수가 40% 이상 폭락합니다.', type: 'crash', impact: { driftModifier: -0.08, volatilityModifier: 0.4, severity: 'critical' }, duration: 120, weight: 1, chainEvents: [{ templateIndex: 4, probability: 0.7, delayTicks: [20, 50] }, { templateIndex: 13, probability: 0.6, delayTicks: [10, 30] }] },
  { year: 2015, month: 8, title: '위안화 절하 충격', description: '중국이 위안화를 갑자기 절하하며 글로벌 패닉.', type: 'global', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 80, weight: 2 },
  { year: 2015, month: 12, title: '미국 첫 금리 인상', description: '9년 만에 미국이 금리를 인상합니다.', type: 'policy', impact: { driftModifier: -0.02, volatilityModifier: 0.12, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['finance'] },
  { year: 2016, month: 1, title: '유가 30달러 붕괴', description: '국제유가가 30달러 아래로 추락합니다.', type: 'sector', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['energy'] },
  { year: 2016, month: 6, title: '브렉시트 국민투표', description: '영국의 EU 탈퇴 투표 결과에 글로벌 시장이 충격.', type: 'global', impact: { driftModifier: -0.06, volatilityModifier: 0.35, severity: 'high' }, duration: 60, weight: 2, chainEvents: [{ templateIndex: 1, probability: 0.6, delayTicks: [20, 40] }] },
  { year: 2016, month: 11, title: '트럼프 대통령 당선', description: '예상을 깨고 트럼프가 당선되며 시장이 급변합니다.', type: 'global', impact: { driftModifier: 0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['industrial', 'finance'] },
  { year: 2016, month: 12, title: '트럼프 랠리', description: '감세·인프라 투자 기대로 시장이 급등합니다.', type: 'boom', impact: { driftModifier: 0.06, volatilityModifier: 0.1, severity: 'medium' }, duration: 100, weight: 3 },

  // ═══ 2017-2018 ═══
  { year: 2017, month: 1, title: '4차 산업혁명 테마', description: 'AI, IoT, 빅데이터 관련 테마주가 급등합니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.12, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['tech'] },
  { year: 2017, month: 9, title: '북한 핵위기 고조', description: '북한 ICBM 발사로 한반도 긴장이 극도로 고조됩니다.', type: 'global', impact: { driftModifier: -0.04, volatilityModifier: 0.25, severity: 'high' }, duration: 60, weight: 2 },
  { year: 2017, month: 12, title: '비트코인 2만달러 돌파', description: '암호화폐 광풍으로 비트코인이 2만달러를 돌파합니다.', type: 'boom', impact: { driftModifier: 0.04, volatilityModifier: 0.2, severity: 'medium' }, duration: 60, weight: 3, affectedSectors: ['tech', 'finance'] },
  { year: 2018, month: 2, title: '변동성 쇼크 (VIX 폭등)', description: 'VIX가 하루 만에 3배 급등하며 글로벌 매도세.', type: 'crash', impact: { driftModifier: -0.06, volatilityModifier: 0.4, severity: 'high' }, duration: 40, weight: 2 },
  { year: 2018, month: 3, title: '미중 무역전쟁 시작', description: '트럼프가 중국산 제품에 대규모 관세를 부과합니다.', type: 'global', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 200, weight: 2, affectedSectors: ['tech', 'industrial'], chainEvents: [{ templateIndex: 12, probability: 0.5, delayTicks: [80, 150] }] },
  { year: 2018, month: 10, title: '기술주 대폭락', description: 'FAANG 중심 기술주가 일제히 급락합니다.', type: 'crash', impact: { driftModifier: -0.08, volatilityModifier: 0.35, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['tech'] },
  { year: 2018, month: 12, title: '크리스마스 이브 폭락', description: '미 증시가 크리스마스 이브에 대폭락합니다.', type: 'crash', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 30, weight: 2, chainEvents: [{ templateIndex: 1, probability: 0.7, delayTicks: [10, 20] }] },

  // ═══ 2019-2020 ═══
  { year: 2019, month: 1, title: '연준 금리 인상 중단', description: '연준이 금리 인상 중단을 시사하며 시장이 급반등합니다.', type: 'policy', impact: { driftModifier: 0.05, volatilityModifier: -0.1, severity: 'medium' }, duration: 120, weight: 3 },
  { year: 2019, month: 5, title: '미중 무역전쟁 격화', description: '미중 관세 전쟁이 재격화되며 글로벌 공급망 불안.', type: 'global', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['tech', 'industrial'] },
  { year: 2019, month: 8, title: '일본 수출규제 (한일 갈등)', description: '일본이 반도체 소재 수출을 규제하며 한국 기업에 타격.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['tech', 'materials'] },
  { year: 2019, month: 10, title: '미중 1단계 합의 기대', description: '미중 무역 1단계 합의 기대감으로 시장이 상승합니다.', type: 'boom', impact: { driftModifier: 0.04, volatilityModifier: -0.05, severity: 'medium' }, duration: 80, weight: 3 },
  { year: 2020, month: 1, title: '코로나19 발생', description: '중국 우한에서 신종 코로나 바이러스가 발생합니다.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.15, severity: 'medium' }, duration: 80, weight: 3, affectedSectors: ['healthcare', 'consumer'] },
  { year: 2020, month: 3, title: '코로나 팬데믹 선언, 시장 대폭락', description: 'WHO가 팬데믹을 선언하며 글로벌 증시가 사상 최악의 폭락.', type: 'crash', impact: { driftModifier: -0.15, volatilityModifier: 0.7, severity: 'critical' }, duration: 60, weight: 1, chainEvents: [{ templateIndex: 9, probability: 0.9, delayTicks: [5, 15] }, { templateIndex: 2, probability: 0.8, delayTicks: [10, 25] }, { templateIndex: 19, probability: 0.7, delayTicks: [20, 40] }] },
  { year: 2020, month: 4, title: '무제한 양적완화', description: '연준이 무제한 양적완화를 선언합니다. 유동성 대홍수.', type: 'policy', impact: { driftModifier: 0.1, volatilityModifier: 0.2, severity: 'critical' }, duration: 200, weight: 1, chainEvents: [{ templateIndex: 7, probability: 0.8, delayTicks: [30, 60] }] },
  { year: 2020, month: 6, title: '언택트 붐', description: '비대면 서비스 수요 폭발로 기술주가 급등합니다.', type: 'sector', impact: { driftModifier: 0.08, volatilityModifier: 0.15, severity: 'high' }, duration: 180, weight: 2, affectedSectors: ['tech', 'telecom'] },
  { year: 2020, month: 8, title: '바이오 백신 기대', description: '코로나 백신 개발 성공 기대로 바이오주가 급등합니다.', type: 'sector', impact: { driftModifier: 0.06, volatilityModifier: 0.2, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['healthcare'] },
  { year: 2020, month: 11, title: '백신 승인, 리오프닝 기대', description: '코로나 백신이 긴급 승인되며 경제 정상화 기대감.', type: 'boom', impact: { driftModifier: 0.07, volatilityModifier: 0.1, severity: 'high' }, duration: 120, weight: 2 },

  // ═══ 2021 ═══
  { year: 2021, month: 1, title: 'GameStop 밈주식 열풍', description: '개인투자자들의 밈주식 열풍이 월가를 뒤흔듭니다.', type: 'boom', impact: { driftModifier: 0.04, volatilityModifier: 0.3, severity: 'high' }, duration: 40, weight: 2, affectedSectors: ['finance'] },
  { year: 2021, month: 3, title: '아케고스 캐피탈 폭발', description: '아케고스 캐피탈 마진콜로 대형 투자은행들이 손실.', type: 'crash', impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'medium' }, duration: 40, weight: 3, affectedSectors: ['finance'] },
  { year: 2021, month: 5, title: '인플레이션 공포 시작', description: '물가 상승률이 예상을 크게 상회하며 인플레 우려.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.15, severity: 'medium' }, duration: 100, weight: 3 },
  { year: 2021, month: 7, title: '반도체 슈퍼사이클', description: '글로벌 반도체 부족으로 반도체주가 초강세를 보입니다.', type: 'sector', impact: { driftModifier: 0.08, volatilityModifier: 0.15, severity: 'high' }, duration: 180, weight: 2, affectedSectors: ['tech', 'materials'] },
  { year: 2021, month: 9, title: '에버그란데 위기', description: '중국 헝다그룹 파산 위기로 글로벌 시장 불안.', type: 'global', impact: { driftModifier: -0.04, volatilityModifier: 0.25, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['realestate', 'finance'] },
  { year: 2021, month: 11, title: 'NFT·메타버스 열풍', description: 'NFT와 메타버스 관련주가 급등합니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.2, severity: 'medium' }, duration: 80, weight: 3, affectedSectors: ['tech'] },

  // ═══ 2022 ═══
  { year: 2022, month: 1, title: '긴축 공포', description: '연준의 공격적 긴축 시사로 성장주가 급락합니다.', type: 'policy', impact: { driftModifier: -0.06, volatilityModifier: 0.25, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['tech'] },
  { year: 2022, month: 2, title: '러시아-우크라이나 전쟁', description: '러시아가 우크라이나를 침공하며 글로벌 충격.', type: 'global', impact: { driftModifier: -0.08, volatilityModifier: 0.4, severity: 'critical' }, duration: 200, weight: 1, affectedSectors: ['energy', 'materials'], chainEvents: [{ templateIndex: 16, probability: 0.9, delayTicks: [10, 30] }, { templateIndex: 15, probability: 0.6, delayTicks: [30, 60] }] },
  { year: 2022, month: 5, title: '루나·테라 폭락', description: '루나·테라 코인이 99.99% 폭락하며 암호화폐 시장 붕괴.', type: 'crash', impact: { driftModifier: -0.04, volatilityModifier: 0.3, severity: 'high' }, duration: 60, weight: 2, affectedSectors: ['tech', 'finance'] },
  { year: 2022, month: 6, title: '미국 CPI 9.1% 충격', description: '40년 만의 최고 인플레이션에 시장이 공포에 빠집니다.', type: 'global', impact: { driftModifier: -0.05, volatilityModifier: 0.2, severity: 'high' }, duration: 80, weight: 2 },
  { year: 2022, month: 9, title: '빅스텝 연속 인상', description: '연준이 0.75%p 금리를 연속 인상합니다.', type: 'policy', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['finance', 'realestate'] },
  { year: 2022, month: 11, title: 'FTX 파산', description: '세계 2위 암호화폐 거래소 FTX가 파산합니다.', type: 'crash', impact: { driftModifier: -0.03, volatilityModifier: 0.25, severity: 'high' }, duration: 60, weight: 2, affectedSectors: ['tech', 'finance'] },

  // ═══ 2023 ═══
  { year: 2023, month: 1, title: 'ChatGPT 혁명', description: 'ChatGPT 열풍으로 AI 관련주가 폭등합니다.', type: 'sector', impact: { driftModifier: 0.08, volatilityModifier: 0.2, severity: 'high' }, duration: 200, weight: 2, affectedSectors: ['tech'], chainEvents: [{ templateIndex: 17, probability: 0.8, delayTicks: [50, 100] }, { templateIndex: 7, probability: 0.6, delayTicks: [80, 150] }] },
  { year: 2023, month: 3, title: '실리콘밸리은행(SVB) 파산', description: 'SVB 파산으로 미국 은행 위기 우려가 확산됩니다.', type: 'crash', impact: { driftModifier: -0.06, volatilityModifier: 0.35, severity: 'high' }, duration: 60, weight: 2, affectedSectors: ['finance'] },
  { year: 2023, month: 5, title: 'AI 반도체 수요 폭발', description: 'AI 학습용 GPU 수요가 폭발하며 반도체주 초강세.', type: 'sector', impact: { driftModifier: 0.1, volatilityModifier: 0.2, severity: 'high' }, duration: 180, weight: 2, affectedSectors: ['tech', 'materials'] },
  { year: 2023, month: 7, title: '미국 신용등급 강등', description: '피치가 미국 신용등급을 강등합니다.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.12, severity: 'medium' }, duration: 40, weight: 3 },
  { year: 2023, month: 10, title: '이스라엘-하마스 전쟁', description: '중동 분쟁 발발로 유가 상승, 지정학적 불안 확대.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.2, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['energy'] },
  { year: 2023, month: 12, title: '연준 금리 인하 시사', description: '연준이 2024년 금리 인하를 시사하며 시장이 급등합니다.', type: 'policy', impact: { driftModifier: 0.06, volatilityModifier: 0.08, severity: 'high' }, duration: 80, weight: 2 },

  // ═══ 2024-2025 ═══
  { year: 2024, month: 1, title: '일본 닛케이 사상 최고치', description: '34년 만에 일본 증시가 사상 최고치를 경신합니다.', type: 'boom', impact: { driftModifier: 0.03, volatilityModifier: 0.08, severity: 'medium' }, duration: 80, weight: 3 },
  { year: 2024, month: 3, title: 'AI 버블 우려', description: 'AI 관련주의 과도한 밸류에이션에 대한 경고.', type: 'sector', impact: { driftModifier: -0.04, volatilityModifier: 0.2, severity: 'medium' }, duration: 80, weight: 3, affectedSectors: ['tech'] },
  { year: 2024, month: 7, title: '반도체 수출 규제 확대', description: '미중 반도체 전쟁이 심화되며 수출 규제가 확대됩니다.', type: 'policy', impact: { driftModifier: -0.03, volatilityModifier: 0.18, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['tech', 'materials'] },
  { year: 2024, month: 8, title: '일본 엔 캐리 청산 쇼크', description: '엔화 급등으로 글로벌 캐리 트레이드가 대거 청산됩니다.', type: 'crash', impact: { driftModifier: -0.07, volatilityModifier: 0.4, severity: 'high' }, duration: 40, weight: 2 },
  { year: 2024, month: 9, title: '연준 금리 인하 시작', description: '연준이 4년 만에 금리 인하를 시작합니다.', type: 'policy', impact: { driftModifier: 0.05, volatilityModifier: 0.1, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['finance', 'realestate'] },
  { year: 2024, month: 11, title: '트럼프 재당선', description: '트럼프 재당선으로 관세·감세 정책 기대와 불안 교차.', type: 'global', impact: { driftModifier: 0.04, volatilityModifier: 0.2, severity: 'high' }, duration: 80, weight: 2 },
  { year: 2025, month: 1, title: 'AI 에이전트 시대', description: 'AI 에이전트가 본격 상용화되며 기술주 폭등.', type: 'sector', impact: { driftModifier: 0.08, volatilityModifier: 0.2, severity: 'high' }, duration: 150, weight: 2, affectedSectors: ['tech'] },
  { year: 2025, month: 3, title: '글로벌 관세 전쟁 심화', description: '미국의 보편 관세 부과로 글로벌 무역 불안 확대.', type: 'global', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['industrial', 'consumer'] },
  { year: 2025, month: 5, title: '양자컴퓨팅 상용화 발표', description: '양자 우위 달성으로 차세대 컴퓨팅 시대 개막 기대.', type: 'sector', impact: { driftModifier: 0.06, volatilityModifier: 0.18, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['tech'] },
  { year: 2025, month: 8, title: '글로벌 AI 규제 합의', description: '주요국이 AI 규제 프레임워크에 합의합니다.', type: 'policy', impact: { driftModifier: -0.02, volatilityModifier: 0.12, severity: 'medium' }, duration: 80, weight: 3, affectedSectors: ['tech'] },
  { year: 2025, month: 10, title: '우주산업 상업화 가속', description: '민간 우주산업이 본격화되며 관련 산업주가 급등합니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.15, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['industrial', 'tech'] },
  { year: 2025, month: 12, title: '30년 게임 종료', description: '1995년부터 시작된 30년간의 투자 여정이 마무리됩니다.', type: 'global', impact: { driftModifier: 0.02, volatilityModifier: -0.05, severity: 'low' }, duration: 30, weight: 5 },

  // ═══ 2026 [픽션 미래] ═══
  { year: 2026, month: 2, title: 'AGI 달성 발표', description: '한 AI 연구소가 범용인공지능(AGI) 달성을 공식 발표하며 기술주 전체가 급등합니다.', type: 'sector', impact: { driftModifier: 0.12, volatilityModifier: 0.4, severity: 'critical' }, duration: 200, weight: 1, affectedSectors: ['tech'], chainEvents: [{ templateIndex: 17, probability: 0.9, delayTicks: [30, 80] }, { templateIndex: 6, probability: 0.7, delayTicks: [60, 120] }] },
  { year: 2026, month: 4, title: 'AI 일자리 대체 충격', description: 'AI 자동화로 화이트칼라 일자리 15%가 사라지며 소비주와 금융주가 동반 하락합니다.', type: 'global', impact: { driftModifier: -0.06, volatilityModifier: 0.3, severity: 'high' }, duration: 150, weight: 2, affectedSectors: ['consumer', 'finance'] },
  { year: 2026, month: 7, title: '탄소세 전면 도입', description: '주요국이 탄소세를 전면 시행하며 에너지 전환이 가속화됩니다.', type: 'policy', impact: { driftModifier: 0.03, volatilityModifier: 0.15, severity: 'medium' }, duration: 180, weight: 2, affectedSectors: ['energy', 'industrial'] },
  { year: 2026, month: 10, title: '가상화폐 법정화폐 채택', description: '두 번째 국가가 비트코인을 법정화폐로 채택, 암호화폐 시장이 다시 급등합니다.', type: 'boom', impact: { driftModifier: 0.04, volatilityModifier: 0.25, severity: 'high' }, duration: 80, weight: 2, affectedSectors: ['finance', 'tech'] },

  // ═══ 2027 [픽션 미래] ═══
  { year: 2027, month: 1, title: '뇌-컴퓨터 인터페이스 상용화', description: 'BCI 기기가 소비자 시장에 출시되며 헬스케어·기술주가 동반 급등합니다.', type: 'sector', impact: { driftModifier: 0.08, volatilityModifier: 0.2, severity: 'high' }, duration: 180, weight: 2, affectedSectors: ['tech', 'healthcare'] },
  { year: 2027, month: 3, title: '글로벌 AI 거버넌스 조약', description: '주요 강국이 AI 개발·배포에 관한 국제 조약을 체결합니다.', type: 'policy', impact: { driftModifier: -0.03, volatilityModifier: 0.12, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['tech'] },
  { year: 2027, month: 6, title: '우주 광업 첫 수익 창출', description: '민간 우주 기업이 소행성 채굴로 처음으로 흑자를 기록하며 우주산업주가 폭등합니다.', type: 'sector', impact: { driftModifier: 0.07, volatilityModifier: 0.18, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['industrial', 'tech'] },
  { year: 2027, month: 9, title: '팬데믹 2.0 경보', description: '신종 바이러스 발생으로 보건당국이 경보를 발령합니다.', type: 'global', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['healthcare', 'consumer'], chainEvents: [{ templateIndex: 2, probability: 0.7, delayTicks: [20, 50] }] },

  // ═══ 2028 [픽션 미래] ═══
  { year: 2028, month: 2, title: '핵융합 발전소 상업 운전', description: '세계 최초 핵융합 발전소가 상업 운전을 시작하며 에너지주 판도가 뒤바뀝니다.', type: 'sector', impact: { driftModifier: 0.1, volatilityModifier: 0.3, severity: 'critical' }, duration: 200, weight: 1, affectedSectors: ['energy'], chainEvents: [{ templateIndex: 6, probability: 0.8, delayTicks: [40, 100] }] },
  { year: 2028, month: 5, title: '완전 자율주행 도시 출현', description: '첫 완전 자율주행 도시가 운영을 시작하며 교통·도시 인프라주가 급등합니다.', type: 'boom', impact: { driftModifier: 0.06, volatilityModifier: 0.18, severity: 'high' }, duration: 150, weight: 2, affectedSectors: ['industrial', 'tech'] },
  { year: 2028, month: 8, title: '생체 인증 금융 표준 채택', description: '글로벌 금융기관이 생체 인증을 표준으로 채택하며 핀테크·보안주가 강세입니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.1, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['finance', 'tech'] },
  { year: 2028, month: 11, title: '미래 경제 대전환', description: 'AI·에너지·바이오의 융합으로 산업 생산성이 급격히 향상됩니다.', type: 'boom', impact: { driftModifier: 0.07, volatilityModifier: -0.05, severity: 'high' }, duration: 200, weight: 2 },
]

/* ── Helper ── */
export function getHistoricalEventsForYear(year: number): HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter((e) => e.year === year)
}

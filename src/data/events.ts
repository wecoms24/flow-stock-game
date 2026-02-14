import type { Sector } from '../types'

/* ── 50 Market Event Scenarios ── */

export interface EventTemplate {
  title: string
  description: string
  type: 'boom' | 'crash' | 'sector' | 'company' | 'policy' | 'global'
  impact: {
    driftModifier: number
    volatilityModifier: number
    severity: 'low' | 'medium' | 'high' | 'critical'
  }
  duration: number
  weight: number // Higher weight = more likely (low:5, medium:3, high:2, critical:1)
  affectedSectors?: Sector[]
}

/** Weighted random selection from event templates */
export function pickWeightedEvent(templates: EventTemplate[]): EventTemplate {
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0)
  let roll = Math.random() * totalWeight
  for (const t of templates) {
    roll -= t.weight
    if (roll <= 0) return t
  }
  return templates[templates.length - 1]
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  // ── Policy Events (10) ──
  { title: '중앙은행 금리 인상', description: '기준금리가 0.5%p 인상되었습니다. 시장 전반에 냉각 효과가 예상됩니다.', type: 'policy', impact: { driftModifier: -0.04, volatilityModifier: 0.15, severity: 'medium' }, duration: 150, weight: 3 },
  { title: '양적완화 정책 발표', description: '대규모 양적완화가 시행됩니다. 유동성이 풍부해집니다.', type: 'policy', impact: { driftModifier: 0.06, volatilityModifier: 0.10, severity: 'high' }, duration: 200, weight: 2 },
  { title: '법인세 인하 법안 통과', description: '법인세율이 3%p 인하되어 기업 이익이 증가할 전망입니다.', type: 'policy', impact: { driftModifier: 0.03, volatilityModifier: 0.05, severity: 'medium' }, duration: 180, weight: 3 },
  { title: '환경규제 강화', description: '탄소배출 규제가 강화됩니다. 에너지/산업주에 타격.', type: 'policy', impact: { driftModifier: -0.03, volatilityModifier: 0.12, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['energy', 'industrial'] },
  { title: '부동산 대출 규제', description: '주택담보대출 규제가 강화됩니다.', type: 'policy', impact: { driftModifier: -0.05, volatilityModifier: 0.15, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['realestate', 'finance'] },
  { title: '디지털 뉴딜 정책', description: '정부가 IT 인프라 투자를 대폭 확대합니다.', type: 'policy', impact: { driftModifier: 0.05, volatilityModifier: 0.08, severity: 'medium' }, duration: 160, weight: 3, affectedSectors: ['tech', 'telecom'] },
  { title: '의료보험 개혁', description: '의료보험 제도가 개편되어 헬스케어 산업에 영향.', type: 'policy', impact: { driftModifier: 0.02, volatilityModifier: 0.10, severity: 'low' }, duration: 130, weight: 5, affectedSectors: ['healthcare'] },
  { title: '공매도 금지 조치', description: '6개월간 공매도가 전면 금지됩니다.', type: 'policy', impact: { driftModifier: 0.04, volatilityModifier: -0.10, severity: 'high' }, duration: 180, weight: 2 },
  { title: '암호화폐 규제 발표', description: '암호화폐 거래에 대한 규제가 강화됩니다.', type: 'policy', impact: { driftModifier: 0.02, volatilityModifier: 0.08, severity: 'low' }, duration: 80, weight: 5, affectedSectors: ['tech', 'finance'] },
  { title: '최저임금 대폭 인상', description: '최저임금이 15% 인상되어 소비주에 영향.', type: 'policy', impact: { driftModifier: -0.02, volatilityModifier: 0.10, severity: 'medium' }, duration: 140, weight: 3, affectedSectors: ['consumer', 'industrial'] },

  // ── Global Events (10) ──
  { title: '글로벌 팬데믹 발생', description: '신종 바이러스가 전세계로 확산됩니다. 시장 패닉.', type: 'global', impact: { driftModifier: -0.10, volatilityModifier: 0.50, severity: 'critical' }, duration: 300, weight: 1 },
  { title: '미중 무역전쟁 심화', description: '양국 간 관세가 대폭 인상됩니다.', type: 'global', impact: { driftModifier: -0.05, volatilityModifier: 0.25, severity: 'high' }, duration: 200, weight: 2 },
  { title: '유럽 재정위기', description: '유럽 주요국 국채 금리가 급등합니다.', type: 'global', impact: { driftModifier: -0.04, volatilityModifier: 0.20, severity: 'high' }, duration: 180, weight: 2 },
  { title: '신흥국 경제 호황', description: '신흥국 수요 증가로 수출 기업에 호재.', type: 'global', impact: { driftModifier: 0.04, volatilityModifier: 0.10, severity: 'medium' }, duration: 150, weight: 3, affectedSectors: ['industrial', 'materials'] },
  { title: '국제유가 폭락', description: 'OPEC 감산 합의 실패로 유가가 급락합니다.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.30, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['energy'] },
  { title: '엔저 현상 심화', description: '엔화 약세로 수출 경쟁력 약화 우려.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.12, severity: 'medium' }, duration: 100, weight: 3 },
  { title: '글로벌 공급망 정상화', description: '물류 병목이 해소되며 기업 실적 개선 기대.', type: 'global', impact: { driftModifier: 0.03, volatilityModifier: -0.05, severity: 'medium' }, duration: 140, weight: 3 },
  { title: '중동 지정학적 긴장', description: '중동 지역 분쟁으로 원유 공급 불안.', type: 'global', impact: { driftModifier: -0.03, volatilityModifier: 0.20, severity: 'high' }, duration: 100, weight: 2, affectedSectors: ['energy'] },
  { title: '금값 사상 최고치', description: '안전자산 선호로 금값이 폭등합니다.', type: 'global', impact: { driftModifier: -0.02, volatilityModifier: 0.15, severity: 'medium' }, duration: 90, weight: 3, affectedSectors: ['materials', 'finance'] },
  { title: '글로벌 경기 회복세', description: '주요국 경제지표가 일제히 개선됩니다.', type: 'global', impact: { driftModifier: 0.05, volatilityModifier: -0.08, severity: 'medium' }, duration: 200, weight: 3 },

  // ── Sector Events (15) ──
  { title: 'AI 혁명, 기술주 폭등', description: '생성형 AI 열풍으로 기술주가 급등합니다.', type: 'sector', impact: { driftModifier: 0.10, volatilityModifier: 0.20, severity: 'high' }, duration: 180, weight: 2, affectedSectors: ['tech'] },
  { title: '반도체 슈퍼사이클', description: '반도체 수요가 폭발적으로 증가합니다.', type: 'sector', impact: { driftModifier: 0.08, volatilityModifier: 0.15, severity: 'high' }, duration: 200, weight: 2, affectedSectors: ['tech', 'materials'] },
  { title: '바이오텍 신약 승인 러시', description: '다수의 신약이 동시에 FDA 승인을 받습니다.', type: 'sector', impact: { driftModifier: 0.07, volatilityModifier: 0.18, severity: 'high' }, duration: 120, weight: 2, affectedSectors: ['healthcare'] },
  { title: '전기차 보급 가속화', description: 'EV 판매량이 전년 대비 200% 증가.', type: 'sector', impact: { driftModifier: 0.06, volatilityModifier: 0.15, severity: 'medium' }, duration: 160, weight: 3, affectedSectors: ['industrial', 'energy'] },
  { title: '5G 전국 상용화', description: '5G 네트워크가 전국으로 확대됩니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.10, severity: 'medium' }, duration: 140, weight: 3, affectedSectors: ['telecom', 'tech'] },
  { title: '부동산 버블 경고', description: '부동산 시장 과열에 대한 경고가 발령됩니다.', type: 'sector', impact: { driftModifier: -0.06, volatilityModifier: 0.25, severity: 'high' }, duration: 150, weight: 2, affectedSectors: ['realestate'] },
  { title: '은행 수익성 악화', description: '이자수익 감소로 은행주 전반이 하락.', type: 'sector', impact: { driftModifier: -0.04, volatilityModifier: 0.12, severity: 'medium' }, duration: 100, weight: 3, affectedSectors: ['finance'] },
  { title: '원자재 가격 급등', description: '공급 부족으로 원자재 가격이 치솟습니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.20, severity: 'medium' }, duration: 130, weight: 3, affectedSectors: ['materials', 'energy'] },
  { title: '소비 심리 위축', description: '소비자 신뢰지수가 역대 최저 수준.', type: 'sector', impact: { driftModifier: -0.04, volatilityModifier: 0.12, severity: 'medium' }, duration: 110, weight: 3, affectedSectors: ['consumer'] },
  { title: '물류 혁신 붐', description: '자율주행 물류 시스템 도입 확대.', type: 'sector', impact: { driftModifier: 0.04, volatilityModifier: 0.10, severity: 'medium' }, duration: 120, weight: 3, affectedSectors: ['industrial', 'tech'] },
  { title: '친환경 에너지 투자 붐', description: 'ESG 투자 트렌드로 재생에너지 관련주 급등.', type: 'sector', impact: { driftModifier: 0.06, volatilityModifier: 0.15, severity: 'medium' }, duration: 150, weight: 3, affectedSectors: ['energy', 'utilities'] },
  { title: '통신요금 인하 압박', description: '정부의 통신요금 인하 요구로 수익성 압박.', type: 'sector', impact: { driftModifier: -0.03, volatilityModifier: 0.08, severity: 'low' }, duration: 90, weight: 5, affectedSectors: ['telecom'] },
  { title: '건설 경기 활성화', description: '대규모 인프라 프로젝트가 발주됩니다.', type: 'sector', impact: { driftModifier: 0.05, volatilityModifier: 0.12, severity: 'medium' }, duration: 160, weight: 3, affectedSectors: ['industrial', 'realestate', 'materials'] },
  { title: '유틸리티 요금 인상', description: '전기/가스 요금이 일제히 인상됩니다.', type: 'sector', impact: { driftModifier: 0.03, volatilityModifier: 0.05, severity: 'low' }, duration: 80, weight: 5, affectedSectors: ['utilities'] },
  { title: '메타버스 열풍', description: '메타버스 플랫폼이 대중화되며 관련주 급등.', type: 'sector', impact: { driftModifier: 0.07, volatilityModifier: 0.22, severity: 'high' }, duration: 140, weight: 2, affectedSectors: ['tech', 'telecom', 'consumer'] },

  // ── Boom/Crash Events (10) ──
  { title: '블랙 먼데이', description: '시장 전체가 패닉 셀링에 빠집니다. 대폭락!', type: 'crash', impact: { driftModifier: -0.15, volatilityModifier: 0.60, severity: 'critical' }, duration: 50, weight: 1 },
  { title: '닷컴 버블 붕괴', description: '기술주 거품이 꺼지며 대량 매도세.', type: 'crash', impact: { driftModifier: -0.12, volatilityModifier: 0.50, severity: 'critical' }, duration: 200, weight: 1, affectedSectors: ['tech'] },
  { title: '서킷브레이커 발동', description: '급격한 하락으로 거래가 일시 중단됩니다.', type: 'crash', impact: { driftModifier: -0.08, volatilityModifier: 0.40, severity: 'critical' }, duration: 30, weight: 1 },
  { title: '산타랠리', description: '연말 시장에 강한 매수세가 유입됩니다.', type: 'boom', impact: { driftModifier: 0.06, volatilityModifier: -0.05, severity: 'medium' }, duration: 60, weight: 3 },
  { title: 'IPO 열풍', description: '대형 IPO 연이어 성공, 투자 심리 회복.', type: 'boom', impact: { driftModifier: 0.05, volatilityModifier: 0.10, severity: 'medium' }, duration: 100, weight: 3 },
  { title: '외국인 매수 폭탄', description: '외국인 투자자들의 대규모 순매수세.', type: 'boom', impact: { driftModifier: 0.08, volatilityModifier: 0.08, severity: 'high' }, duration: 120, weight: 2 },
  { title: '코리아 디스카운트 해소', description: '한국 시장 저평가 해소로 리밸류에이션 기대.', type: 'boom', impact: { driftModifier: 0.07, volatilityModifier: 0.05, severity: 'high' }, duration: 200, weight: 2 },
  { title: '서브프라임 위기', description: '비우량 대출 부실화로 금융 시스템 위기.', type: 'crash', impact: { driftModifier: -0.10, volatilityModifier: 0.45, severity: 'critical' }, duration: 250, weight: 1, affectedSectors: ['finance', 'realestate'] },
  { title: '기관 매수 신호', description: '국민연금 등 기관의 대규모 매수 시작.', type: 'boom', impact: { driftModifier: 0.04, volatilityModifier: -0.05, severity: 'medium' }, duration: 150, weight: 3 },
  { title: '플래시 크래시', description: '알고리즘 오작동으로 순간 폭락 후 반등.', type: 'crash', impact: { driftModifier: -0.05, volatilityModifier: 0.70, severity: 'high' }, duration: 20, weight: 2 },

  // ── Company Events (5) ──
  { title: '대기업 분식회계 적발', description: '주요 기업의 분식회계가 적발되어 시장 신뢰 하락.', type: 'company', impact: { driftModifier: -0.06, volatilityModifier: 0.30, severity: 'high' }, duration: 80, weight: 2 },
  { title: '대형 M&A 발표', description: '업계 1, 2위 기업의 합병이 발표됩니다.', type: 'company', impact: { driftModifier: 0.04, volatilityModifier: 0.20, severity: 'medium' }, duration: 100, weight: 3 },
  { title: 'CEO 돌연 사임', description: '대기업 CEO가 갑작스럽게 사임합니다.', type: 'company', impact: { driftModifier: -0.03, volatilityModifier: 0.25, severity: 'medium' }, duration: 60, weight: 3 },
  { title: '어닝 서프라이즈', description: '주요 기업 실적이 기대치를 크게 상회합니다.', type: 'company', impact: { driftModifier: 0.05, volatilityModifier: 0.10, severity: 'medium' }, duration: 70, weight: 3 },
  { title: '대규모 자사주 매입', description: '대기업들이 동시에 자사주 매입을 발표.', type: 'company', impact: { driftModifier: 0.03, volatilityModifier: -0.05, severity: 'low' }, duration: 90, weight: 5 },
]

/**
 * Event Chain Templates
 *
 * 10+ 체인 템플릿 (3-4주, 분기 조건)
 */

import type { EventChain } from '../types/eventChain'

export const EVENT_CHAIN_TEMPLATES: EventChain[] = [
  {
    id: 'chain_tech_bubble',
    title: '기술주 버블',
    description: 'AI 열풍이 과열되고 있다. 3주 후 결과가 결정된다.',
    icon: '🫧',
    category: 'sector',
    weight: 12,
    branchAtWeek: 1,
    weeks: [
      { week: 1, title: 'AI 열풍 시작', description: '기술주 일제히 상승', driftModifier: 0.03, volatilityModifier: 0.01, affectedSectors: ['tech'] },
      { week: 2, title: '투자 과열', description: '밸류에이션 우려 확산', driftModifier: 0.02, volatilityModifier: 0.025, affectedSectors: ['tech'] },
      { week: 3, title: '조정 또는 랠리?', description: '시장 갈림길에 서다', driftModifier: 0, volatilityModifier: 0.03, affectedSectors: ['tech'] },
    ],
    branches: [
      { condition: 'sell_affected', label: '차익 실현', nextWeeks: [{ week: 4, title: '버블 붕괴', description: '기술주 급락', driftModifier: -0.05, volatilityModifier: 0.04, affectedSectors: ['tech'] }], outcomeDescription: '조기 매도로 손실 회피' },
      { condition: 'buy_affected', label: '추가 매수', nextWeeks: [{ week: 4, title: '추가 랠리', description: '버블이 더 커졌다', driftModifier: 0.04, volatilityModifier: 0.02, affectedSectors: ['tech'] }], outcomeDescription: '매수 결정이 단기 이익을 가져왔다' },
      { condition: 'hold', label: '관망', nextWeeks: [{ week: 4, title: '횡보', description: '불확실성 지속', driftModifier: -0.01, volatilityModifier: 0.03, affectedSectors: ['tech'] }], outcomeDescription: '관망 전략으로 중립적 결과' },
    ],
  },
  {
    id: 'chain_oil_crisis',
    title: '에너지 위기',
    description: '중동 지정학적 긴장이 고조되고 있다.',
    icon: '🛢️',
    category: 'sector',
    weight: 10,
    branchAtWeek: 2,
    weeks: [
      { week: 1, title: '지정학적 긴장', description: '유가 상승 시작', driftModifier: 0.02, volatilityModifier: 0.015, affectedSectors: ['energy'] },
      { week: 2, title: '공급 불안', description: 'OPEC 감산 발표', driftModifier: 0.03, volatilityModifier: 0.02, affectedSectors: ['energy'] },
      { week: 3, title: '위기 심화', description: '에너지 가격 폭등', driftModifier: 0.04, volatilityModifier: 0.03, affectedSectors: ['energy'] },
    ],
    branches: [
      { condition: 'buy_affected', label: '에너지주 매수', nextWeeks: [{ week: 4, title: '평화 협상', description: '긴장 완화, 유가 하락', driftModifier: -0.03, volatilityModifier: 0.02, affectedSectors: ['energy'] }], outcomeDescription: '고점 매수로 손실' },
      { condition: 'sell_affected', label: '에너지주 매도', nextWeeks: [{ week: 4, title: '위기 지속', description: '유가 추가 상승', driftModifier: 0.03, volatilityModifier: 0.02, affectedSectors: ['energy'] }], outcomeDescription: '조기 매도로 추가 상승분 놓침' },
    ],
  },
  {
    id: 'chain_bank_stress',
    title: '은행 스트레스 테스트',
    description: '주요 은행의 재무 건전성에 우려가 제기됐다.',
    icon: '🏦',
    category: 'sector',
    weight: 8,
    branchAtWeek: 1,
    weeks: [
      { week: 1, title: '건전성 우려', description: '금융주 하락', driftModifier: -0.02, volatilityModifier: 0.02, affectedSectors: ['finance'] },
      { week: 2, title: '스트레스 테스트', description: '결과 발표 대기', driftModifier: -0.01, volatilityModifier: 0.03, affectedSectors: ['finance'] },
      { week: 3, title: '결과 발표', description: '시장 반응 결정', driftModifier: 0, volatilityModifier: 0.04, affectedSectors: ['finance'] },
    ],
    branches: [
      { condition: 'buy_affected', label: '저가 매수', nextWeeks: [{ week: 4, title: '통과!', description: '금융주 급반등', driftModifier: 0.04, volatilityModifier: -0.01, affectedSectors: ['finance'] }], outcomeDescription: '역발상 매수 성공!' },
      { condition: 'sell_affected', label: '손절매', nextWeeks: [{ week: 4, title: '추가 하락', description: '일부 은행 부실 확인', driftModifier: -0.03, volatilityModifier: 0.03, affectedSectors: ['finance'] }], outcomeDescription: '선제적 손절로 추가 손실 방어' },
    ],
  },
  {
    id: 'chain_pandemic_wave',
    title: '팬데믹 2차 파동',
    description: '새로운 변이 바이러스가 확산되고 있다.',
    icon: '🦠',
    category: 'global',
    weight: 6,
    branchAtWeek: 2,
    triggerCondition: { minYear: 2000 },
    weeks: [
      { week: 1, title: '변이 출현', description: '의료주 관심 증가', driftModifier: 0.02, volatilityModifier: 0.02, affectedSectors: ['healthcare'] },
      { week: 2, title: '확산 가속', description: '전 섹터 불안', driftModifier: -0.02, volatilityModifier: 0.03 },
      { week: 3, title: '정부 대응', description: '정책 발표 대기', driftModifier: -0.01, volatilityModifier: 0.025 },
    ],
    branches: [
      { condition: 'buy_affected', label: '의료주 매수', nextWeeks: [{ week: 4, title: '백신 개발', description: '의료주 급등, 시장 회복', driftModifier: 0.03, volatilityModifier: -0.01, affectedSectors: ['healthcare'] }], outcomeDescription: '의료주 투자 성공' },
      { condition: 'sell_affected', label: '전량 매도', nextWeeks: [{ week: 4, title: '장기 침체', description: '봉쇄 연장, 경기 침체', driftModifier: -0.03, volatilityModifier: 0.02 }], outcomeDescription: '현금 확보로 침체 방어' },
    ],
  },
  {
    id: 'chain_consumer_shift',
    title: '소비 트렌드 변화',
    description: '소비자 행동 패턴이 급변하고 있다.',
    icon: '🛍️',
    category: 'sector',
    weight: 14,
    branchAtWeek: 1,
    weeks: [
      { week: 1, title: '온라인 전환', description: '이커머스 급성장', driftModifier: 0.02, volatilityModifier: 0.01, affectedSectors: ['consumer'] },
      { week: 2, title: '오프라인 타격', description: '전통 소매 위기', driftModifier: -0.01, volatilityModifier: 0.02, affectedSectors: ['consumer'] },
      { week: 3, title: '적응 or 도태', description: '기업별 명암 갈림', driftModifier: 0, volatilityModifier: 0.025, affectedSectors: ['consumer'] },
    ],
    branches: [
      { condition: 'buy_affected', label: '소비주 매수', nextWeeks: [{ week: 4, title: '반등', description: '적응한 기업들 급성장', driftModifier: 0.03, volatilityModifier: -0.005, affectedSectors: ['consumer'] }], outcomeDescription: '소비 반등으로 이익' },
      { condition: 'hold', label: '관망', nextWeeks: [{ week: 4, title: '분화', description: '승자와 패자 명확히 갈림', driftModifier: 0.01, volatilityModifier: 0.02, affectedSectors: ['consumer'] }], outcomeDescription: '중립적 결과' },
    ],
  },
  {
    id: 'chain_rate_cycle',
    title: '금리 사이클',
    description: '중앙은행의 금리 정책 방향이 바뀔 수 있다.',
    icon: '📊',
    category: 'macro',
    weight: 10,
    branchAtWeek: 2,
    weeks: [
      { week: 1, title: '경기 지표 발표', description: '시장 전망 엇갈림', driftModifier: 0, volatilityModifier: 0.02 },
      { week: 2, title: '중앙은행 회의', description: '정책 결정 대기', driftModifier: -0.005, volatilityModifier: 0.025 },
      { week: 3, title: '금리 결정', description: '방향이 정해진다', driftModifier: 0, volatilityModifier: 0.03 },
    ],
    branches: [
      { condition: 'buy_affected', label: '주식 매수', nextWeeks: [{ week: 4, title: '금리 인하!', description: '시장 급등', driftModifier: 0.035, volatilityModifier: -0.01 }], outcomeDescription: '금리 인하로 시장 상승' },
      { condition: 'sell_affected', label: '현금 확보', nextWeeks: [{ week: 4, title: '금리 인상', description: '시장 하락', driftModifier: -0.03, volatilityModifier: 0.02 }], outcomeDescription: '금리 인상으로 현금 보유 유리' },
      { condition: 'hold', label: '관망', nextWeeks: [{ week: 4, title: '동결', description: '시장 영향 제한적', driftModifier: 0.005, volatilityModifier: 0.01 }], outcomeDescription: '변화 없이 마무리' },
    ],
  },
  {
    id: 'chain_trade_war',
    title: '무역 분쟁',
    description: '주요국 간 관세 전쟁이 고조되고 있다.',
    icon: '⚔️',
    category: 'global',
    weight: 8,
    branchAtWeek: 2,
    weeks: [
      { week: 1, title: '관세 부과', description: '수출주 타격', driftModifier: -0.015, volatilityModifier: 0.02 },
      { week: 2, title: '보복 관세', description: '글로벌 무역 위축', driftModifier: -0.02, volatilityModifier: 0.025 },
      { week: 3, title: '협상 개시', description: '해결 기대감 부상', driftModifier: 0.01, volatilityModifier: 0.02 },
    ],
    branches: [
      { condition: 'buy_affected', label: '저가 매수', nextWeeks: [{ week: 4, title: '합의 도달', description: '관세 철회, 시장 반등', driftModifier: 0.04, volatilityModifier: -0.01 }], outcomeDescription: '합의로 큰 반등' },
      { condition: 'sell_affected', label: '리스크 회피', nextWeeks: [{ week: 4, title: '결렬', description: '추가 관세 부과', driftModifier: -0.03, volatilityModifier: 0.03 }], outcomeDescription: '결렬로 추가 하락 방어' },
    ],
  },
  {
    id: 'chain_ipo_rush',
    title: 'IPO 러시',
    description: '대형 기업들의 상장이 줄줄이 예고됐다.',
    icon: '🎪',
    category: 'macro',
    weight: 12,
    branchAtWeek: 1,
    weeks: [
      { week: 1, title: 'IPO 예고', description: '투자 자금 이동', driftModifier: 0.01, volatilityModifier: 0.015 },
      { week: 2, title: '1차 상장', description: '시장 자금 분산', driftModifier: -0.01, volatilityModifier: 0.02 },
      { week: 3, title: '결과 확인', description: 'IPO 성공/실패 결정', driftModifier: 0, volatilityModifier: 0.025 },
    ],
    branches: [
      { condition: 'buy_affected', label: '기존주 매수', nextWeeks: [{ week: 4, title: 'IPO 실패', description: '자금 기존 시장으로 복귀', driftModifier: 0.025, volatilityModifier: -0.005 }], outcomeDescription: 'IPO 실패로 기존주 반등' },
      { condition: 'sell_affected', label: '현금 확보', nextWeeks: [{ week: 4, title: 'IPO 대성공', description: '기존 시장 자금 유출', driftModifier: -0.02, volatilityModifier: 0.015 }], outcomeDescription: 'IPO 성공으로 기존주 약세' },
    ],
  },
  {
    id: 'chain_green_revolution',
    title: '그린 혁명',
    description: 'ESG 규제가 강화되며 에너지 전환이 가속된다.',
    icon: '🌱',
    category: 'sector',
    weight: 10,
    branchAtWeek: 2,
    triggerCondition: { minYear: 2005 },
    weeks: [
      { week: 1, title: 'ESG 규제 발표', description: '전통 에너지 하락, 신재생 상승', driftModifier: 0.02, volatilityModifier: 0.015, affectedSectors: ['energy'] },
      { week: 2, title: '기업 대응', description: '전환 비용 부담', driftModifier: -0.01, volatilityModifier: 0.02, affectedSectors: ['energy'] },
      { week: 3, title: '보조금 발표', description: '정부 지원 결정', driftModifier: 0.015, volatilityModifier: 0.01, affectedSectors: ['energy'] },
    ],
    branches: [
      { condition: 'buy_affected', label: '에너지 전환 투자', nextWeeks: [{ week: 4, title: '그린 붐', description: '신재생 에너지 급등', driftModifier: 0.035, volatilityModifier: -0.005, affectedSectors: ['energy'] }], outcomeDescription: '에너지 전환 투자 성공' },
      { condition: 'sell_affected', label: '전통 에너지 매도', nextWeeks: [{ week: 4, title: '느린 전환', description: '규제 완화로 전통 에너지 반등', driftModifier: 0.02, volatilityModifier: 0.01, affectedSectors: ['energy'] }], outcomeDescription: '전통 에너지 반등 놓침' },
    ],
  },
  {
    id: 'chain_crypto_contagion',
    title: '가상자산 전이',
    description: '가상자산 시장 붕괴가 전통 금융으로 전이될 수 있다.',
    icon: '₿',
    category: 'global',
    weight: 8,
    branchAtWeek: 1,
    triggerCondition: { minYear: 2010 },
    weeks: [
      { week: 1, title: '가상자산 폭락', description: '금융 불안 확산', driftModifier: -0.015, volatilityModifier: 0.025, affectedSectors: ['finance'] },
      { week: 2, title: '전이 우려', description: '전통 금융 영향 평가', driftModifier: -0.01, volatilityModifier: 0.02, affectedSectors: ['finance'] },
      { week: 3, title: '규제 대응', description: '정부 개입 여부 결정', driftModifier: 0, volatilityModifier: 0.03, affectedSectors: ['finance'] },
    ],
    branches: [
      { condition: 'buy_affected', label: '금융주 매수', nextWeeks: [{ week: 4, title: '격리 성공', description: '전이 차단, 금융주 회복', driftModifier: 0.03, volatilityModifier: -0.01, affectedSectors: ['finance'] }], outcomeDescription: '전이 차단으로 금융주 반등' },
      { condition: 'sell_affected', label: '금융주 매도', nextWeeks: [{ week: 4, title: '전이 발생', description: '금융 시스템 리스크 현실화', driftModifier: -0.035, volatilityModifier: 0.035, affectedSectors: ['finance'] }], outcomeDescription: '선제 매도로 손실 방어' },
    ],
  },
]

/**
 * News Card Templates
 *
 * 50+ 카드 템플릿 (5섹터, 4희귀도)
 */

import type { NewsCardTemplate } from '../types/newsCard'

export const NEWS_CARD_TEMPLATES: NewsCardTemplate[] = [
  // ── Tech Sector ──
  { id: 'tech_ai_boom', title: 'AI 혁명', description: 'AI 기술 투자 급증으로 기술주 상승세', rarity: 'rare', icon: '🤖', sector: 'tech', effects: [{ targetSector: 'tech', driftModifier: 0.03, volatilityModifier: 0.01, duration: 720 }], weight: 8, isForced: false, minYear: 2022 },
  { id: 'tech_chip_shortage', title: '반도체 부족', description: '글로벌 반도체 공급난', rarity: 'uncommon', icon: '💾', sector: 'tech', effects: [{ targetSector: 'tech', driftModifier: -0.02, volatilityModifier: 0.02, duration: 540 }], weight: 15, isForced: false },
  { id: 'tech_ipo_wave', title: 'IT IPO 러시', description: '기술 기업 상장 붐', rarity: 'common', icon: '📱', sector: 'tech', effects: [{ targetSector: 'tech', driftModifier: 0.015, volatilityModifier: 0.01, duration: 360 }], weight: 20, isForced: false },
  { id: 'tech_cyber_attack', title: '대규모 해킹', description: '기술 기업 보안 사고 발생', rarity: 'uncommon', icon: '🔓', sector: 'tech', effects: [{ targetSector: 'tech', driftModifier: -0.025, volatilityModifier: 0.03, duration: 360 }], weight: 12, isForced: false },
  { id: 'tech_regulation', title: 'IT 규제 강화', description: '빅테크 규제법 통과', rarity: 'uncommon', icon: '⚖️', sector: 'tech', effects: [{ targetSector: 'tech', driftModifier: -0.015, volatilityModifier: 0.015, duration: 540 }], weight: 14, isForced: false },

  // ── Finance Sector ──
  { id: 'fin_rate_cut', title: '금리 인하', description: '중앙은행 기준금리 인하 결정', rarity: 'rare', icon: '📉', sector: 'finance', effects: [{ targetSector: 'finance', driftModifier: 0.025, volatilityModifier: -0.01, duration: 720 }], weight: 10, isForced: false },
  { id: 'fin_rate_hike', title: '금리 인상', description: '인플레이션 대응 금리 인상', rarity: 'uncommon', icon: '📈', sector: 'finance', effects: [{ targetSector: 'finance', driftModifier: -0.02, volatilityModifier: 0.02, duration: 720 }], weight: 15, isForced: false },
  { id: 'fin_bank_crisis', title: '은행 위기', description: '주요 은행 유동성 문제 발생', rarity: 'legendary', icon: '🏦', sector: 'finance', effects: [{ targetSector: 'finance', driftModifier: -0.05, volatilityModifier: 0.04, duration: 540 }], weight: 3, isForced: false },
  { id: 'fin_fintech_boom', title: '핀테크 혁신', description: '디지털 금융 서비스 확산', rarity: 'common', icon: '💳', sector: 'finance', effects: [{ targetSector: 'finance', driftModifier: 0.015, volatilityModifier: 0.01, duration: 360 }], weight: 20, isForced: false },
  { id: 'fin_deregulation', title: '금융 규제 완화', description: '정부 금융 규제 완화 정책', rarity: 'uncommon', icon: '🔓', sector: 'finance', effects: [{ targetSector: 'finance', driftModifier: 0.02, volatilityModifier: 0.005, duration: 540 }], weight: 12, isForced: false },

  // ── Energy Sector ──
  { id: 'energy_oil_spike', title: '유가 급등', description: '중동 갈등으로 유가 폭등', rarity: 'uncommon', icon: '🛢️', sector: 'energy', effects: [{ targetSector: 'energy', driftModifier: 0.03, volatilityModifier: 0.025, duration: 540 }], weight: 14, isForced: false },
  { id: 'energy_green', title: '친환경 전환', description: '재생에너지 투자 확대', rarity: 'common', icon: '🌱', sector: 'energy', effects: [{ targetSector: 'energy', driftModifier: 0.02, volatilityModifier: 0.01, duration: 720 }], weight: 18, isForced: false, minYear: 2005 },
  { id: 'energy_oil_crash', title: '유가 폭락', description: '글로벌 수요 감소로 유가 급락', rarity: 'rare', icon: '📉', sector: 'energy', effects: [{ targetSector: 'energy', driftModifier: -0.04, volatilityModifier: 0.03, duration: 540 }], weight: 8, isForced: false },
  { id: 'energy_nuclear', title: '원전 부활', description: '원자력 에너지 재추진', rarity: 'uncommon', icon: '⚛️', sector: 'energy', effects: [{ targetSector: 'energy', driftModifier: 0.02, volatilityModifier: 0.015, duration: 540 }], weight: 12, isForced: false },
  { id: 'energy_carbon_tax', title: '탄소세 도입', description: '탄소 배출에 대한 세금 부과', rarity: 'common', icon: '🏭', sector: 'energy', effects: [{ targetSector: 'energy', driftModifier: -0.015, volatilityModifier: 0.01, duration: 540 }], weight: 16, isForced: false },

  // ── Healthcare Sector ──
  { id: 'health_pandemic', title: '팬데믹 위기', description: '신종 감염병 세계적 확산', rarity: 'legendary', icon: '🦠', sector: 'healthcare', effects: [{ targetSector: 'healthcare', driftModifier: 0.04, volatilityModifier: 0.05, duration: 720 }], weight: 3, isForced: true, minYear: 2019 },
  { id: 'health_drug_approve', title: '신약 승인', description: '혁신 신약 FDA 승인', rarity: 'uncommon', icon: '💊', sector: 'healthcare', effects: [{ targetSector: 'healthcare', driftModifier: 0.025, volatilityModifier: 0.01, duration: 540 }], weight: 15, isForced: false },
  { id: 'health_aging', title: '고령화 가속', description: '실버 의료 수요 증가', rarity: 'common', icon: '👴', sector: 'healthcare', effects: [{ targetSector: 'healthcare', driftModifier: 0.015, volatilityModifier: 0.005, duration: 720 }], weight: 18, isForced: false },
  { id: 'health_scandal', title: '제약 스캔들', description: '대형 제약사 임상시험 조작 발각', rarity: 'rare', icon: '😱', sector: 'healthcare', effects: [{ targetSector: 'healthcare', driftModifier: -0.035, volatilityModifier: 0.03, duration: 540 }], weight: 7, isForced: false },
  { id: 'health_biotech', title: '바이오텍 붐', description: '유전자 치료 기술 돌파', rarity: 'uncommon', icon: '🧬', sector: 'healthcare', effects: [{ targetSector: 'healthcare', driftModifier: 0.02, volatilityModifier: 0.015, duration: 540 }], weight: 14, isForced: false },

  // ── Consumer Sector ──
  { id: 'consumer_boom', title: '소비 호황', description: '소비자 신뢰지수 사상 최고', rarity: 'uncommon', icon: '🛍️', sector: 'consumer', effects: [{ targetSector: 'consumer', driftModifier: 0.025, volatilityModifier: -0.005, duration: 540 }], weight: 14, isForced: false },
  { id: 'consumer_ecommerce', title: '이커머스 혁명', description: '온라인 쇼핑 폭발적 성장', rarity: 'common', icon: '📦', sector: 'consumer', effects: [{ targetSector: 'consumer', driftModifier: 0.02, volatilityModifier: 0.01, duration: 540 }], weight: 20, isForced: false },
  { id: 'consumer_recession', title: '소비 침체', description: '가계부채 증가로 소비 위축', rarity: 'rare', icon: '😰', sector: 'consumer', effects: [{ targetSector: 'consumer', driftModifier: -0.03, volatilityModifier: 0.02, duration: 720 }], weight: 8, isForced: false },
  { id: 'consumer_luxury', title: '명품 열풍', description: '럭셔리 브랜드 실적 호조', rarity: 'uncommon', icon: '👜', sector: 'consumer', effects: [{ targetSector: 'consumer', driftModifier: 0.015, volatilityModifier: 0.005, duration: 360 }], weight: 16, isForced: false },
  { id: 'consumer_food_crisis', title: '식량 위기', description: '글로벌 곡물 가격 폭등', rarity: 'rare', icon: '🌾', sector: 'consumer', effects: [{ targetSector: 'consumer', driftModifier: -0.025, volatilityModifier: 0.025, duration: 540 }], weight: 7, isForced: false },

  // ── Global / Multi-sector ──
  { id: 'global_bull', title: '글로벌 상승장', description: '세계 경제 동반 호황', rarity: 'rare', icon: '🌍', effects: [{ driftModifier: 0.02, volatilityModifier: -0.01, duration: 720 }], weight: 6, isForced: false },
  { id: 'global_bear', title: '글로벌 하락장', description: '세계 경제 동반 침체', rarity: 'rare', icon: '🐻', effects: [{ driftModifier: -0.025, volatilityModifier: 0.03, duration: 720 }], weight: 6, isForced: false },
  { id: 'global_trade_war', title: '무역 전쟁', description: '주요국 관세 전쟁 격화', rarity: 'uncommon', icon: '⚔️', effects: [{ driftModifier: -0.015, volatilityModifier: 0.025, duration: 540 }], weight: 10, isForced: false },
  { id: 'global_peace', title: '글로벌 평화', description: '국제 긴장 완화, 투자 심리 호전', rarity: 'uncommon', icon: '🕊️', effects: [{ driftModifier: 0.015, volatilityModifier: -0.01, duration: 540 }], weight: 12, isForced: false },
  { id: 'global_inflation', title: '인플레이션 폭발', description: '글로벌 물가 급등', rarity: 'uncommon', icon: '💸', effects: [{ driftModifier: -0.02, volatilityModifier: 0.02, duration: 720 }], weight: 10, isForced: false },

  // ── Special / Forced ──
  { id: 'special_black_monday', title: '블랙 먼데이', description: '역사적 주가 대폭락', rarity: 'legendary', icon: '⚫', effects: [{ driftModifier: -0.06, volatilityModifier: 0.06, duration: 360 }], weight: 2, isForced: true, maxYear: 2010 },
  { id: 'special_golden_age', title: '황금기', description: '전 산업 호황기 진입', rarity: 'legendary', icon: '✨', effects: [{ driftModifier: 0.04, volatilityModifier: -0.02, duration: 720 }], weight: 2, isForced: true },
  { id: 'special_tax_reform', title: '세제 개혁', description: '자본소득세율 변경', rarity: 'common', icon: '📋', effects: [{ driftModifier: -0.01, volatilityModifier: 0.01, duration: 360 }], weight: 15, isForced: false },
  { id: 'special_election', title: '대선', description: '대통령 선거 시즌, 정책 불확실성 증가', rarity: 'common', icon: '🗳️', effects: [{ driftModifier: 0, volatilityModifier: 0.02, duration: 540 }], weight: 18, isForced: false },
  { id: 'special_stimulus', title: '경기 부양책', description: '대규모 경기 부양 패키지 발표', rarity: 'uncommon', icon: '💉', effects: [{ driftModifier: 0.025, volatilityModifier: 0.015, duration: 540 }], weight: 10, isForced: false },

  // ── Additional Variety ──
  { id: 'tech_metaverse', title: '메타버스 열풍', description: '가상현실 관련 기업 주목', rarity: 'common', icon: '🥽', sector: 'tech', effects: [{ targetSector: 'tech', driftModifier: 0.02, volatilityModifier: 0.015, duration: 360 }], weight: 16, isForced: false, minYear: 2021 },
  { id: 'tech_quantum', title: '양자 컴퓨팅 돌파', description: '양자 우위 달성 발표', rarity: 'rare', icon: '⚛️', sector: 'tech', effects: [{ targetSector: 'tech', driftModifier: 0.035, volatilityModifier: 0.02, duration: 540 }], weight: 5, isForced: false, minYear: 2023 },
  { id: 'fin_crypto_crash', title: '암호화폐 폭락', description: '가상자산 시장 대폭락', rarity: 'uncommon', icon: '₿', sector: 'finance', effects: [{ targetSector: 'finance', driftModifier: -0.02, volatilityModifier: 0.03, duration: 360 }], weight: 12, isForced: false, minYear: 2017 },
  { id: 'energy_disaster', title: '에너지 대란', description: '주요 에너지 공급망 붕괴', rarity: 'rare', icon: '⚡', sector: 'energy', effects: [{ targetSector: 'energy', driftModifier: -0.035, volatilityModifier: 0.04, duration: 360 }], weight: 6, isForced: false },
  { id: 'health_insurance', title: '의료보험 개혁', description: '국민 건강보험 제도 개편', rarity: 'common', icon: '🏥', sector: 'healthcare', effects: [{ targetSector: 'healthcare', driftModifier: 0.01, volatilityModifier: 0.01, duration: 540 }], weight: 18, isForced: false },
  { id: 'consumer_travel', title: '여행 붐', description: '여행 수요 폭발, 관련주 상승', rarity: 'common', icon: '✈️', sector: 'consumer', effects: [{ targetSector: 'consumer', driftModifier: 0.02, volatilityModifier: 0.005, duration: 360 }], weight: 18, isForced: false },
  { id: 'global_currency', title: '환율 변동', description: '주요 통화 환율 급변', rarity: 'common', icon: '💱', effects: [{ driftModifier: -0.01, volatilityModifier: 0.015, duration: 360 }], weight: 20, isForced: false },
  { id: 'global_climate', title: '기후 위기 선언', description: 'UN 기후 비상 선언, ESG 투자 확대', rarity: 'uncommon', icon: '🌡️', effects: [{ targetSector: 'energy', driftModifier: 0.02, volatilityModifier: 0.01, duration: 720 }], weight: 10, isForced: false },
  { id: 'special_ipo_giant', title: '대형 IPO', description: '초대형 기업 상장 이벤트', rarity: 'uncommon', icon: '🎪', effects: [{ driftModifier: 0.01, volatilityModifier: 0.02, duration: 360 }], weight: 12, isForced: false },
  { id: 'special_dividend', title: '배당 시즌', description: '대규모 배당금 지급 시즌', rarity: 'common', icon: '💰', effects: [{ driftModifier: 0.01, volatilityModifier: -0.005, duration: 360 }], weight: 20, isForced: false },
]

import type { Employee, NewsSentiment } from '../types'
import { getTimeOfDay, type TimeOfDay } from '../config/timeConfig'

/* ── Employee Chat Bubble System ── */

export interface ChatterTemplate {
  id: string
  category: 'market' | 'stress' | 'satisfaction' | 'trait' | 'random' | 'pipeline'
  condition: (employee: Employee) => boolean
  messages: string[]
  priority: number
  cooldownTicks: number
}

/* ── 양방향 대화 시스템 ── */

export interface DialoguePair {
  trigger: string
  responses: string[]
  mood: 'positive' | 'negative' | 'neutral'
}

export interface ContextualDialogueOptions {
  recentSentiment?: NewsSentiment
  marketTrend?: 'up' | 'down' | 'flat'
  employeeStress?: number
  recentLevelUp?: boolean
}

/* ── 컨텍스트 인식 대화 ── */

const MARKET_POSITIVE_DIALOGUES = [
  '오늘 시장 좋다!',
  '내 분석이 맞았잖아',
  '기술주 가즈아!',
  '상승장 왔다!',
  '이익 실현해야 하나?',
]

const MARKET_NEGATIVE_DIALOGUES = [
  '시장 무섭다...',
  '손절해야 하나',
  '이번엔 좀 심하네',
  '바닥은 언제야...',
  '현금 비중 늘려야겠다',
]

const LEVEL_UP_DIALOGUES = [
  '드디어 승진!',
  '노력한 보람이 있네',
  '다음 목표를 향해!',
  '성장하고 있어!',
]

/**
 * 컨텍스트 기반 대화 선택
 * 시장 상황, 개인 상태를 반영한 자연스러운 대사
 */
export function selectContextualDialogue(
  _employee: Employee,
  context: ContextualDialogueOptions,
): string | null {
  // 시장 상황 반영 (우선순위 높음)
  if (context.recentSentiment === 'positive' && Math.random() < 0.3) {
    return pickRandom(MARKET_POSITIVE_DIALOGUES)
  }
  if (context.recentSentiment === 'negative' && Math.random() < 0.35) {
    return pickRandom(MARKET_NEGATIVE_DIALOGUES)
  }

  // 승진 직후
  if (context.recentLevelUp && Math.random() < 0.5) {
    return pickRandom(LEVEL_UP_DIALOGUES)
  }

  return null // 기존 시스템으로 폴백
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const CHATTER_TEMPLATES: ChatterTemplate[] = [
  // 스트레스 관련
  {
    id: 'high_stress',
    category: 'stress',
    condition: (emp) => (emp.stress ?? 0) > 70,
    messages: [
      '너무 힘들다...',
      '쉬고 싶어요...',
      '머리가 깨질 것 같아요',
      '이러다 탈모 올 것 같은데...',
      '야근은 이제 그만...',
    ],
    priority: 8,
    cooldownTicks: 1800,
  },

  {
    id: 'medium_stress',
    category: 'stress',
    condition: (emp) => (emp.stress ?? 0) > 50 && (emp.stress ?? 0) <= 70,
    messages: [
      '좀 바쁘네요...',
      '커피 한 잔 해야겠다',
      '점심시간이 빨리 오면 좋겠다',
      '오늘 좀 길게 느껴지네',
    ],
    priority: 4,
    cooldownTicks: 3600,
  },

  // 만족도 관련
  {
    id: 'low_satisfaction',
    category: 'satisfaction',
    condition: (emp) => (emp.satisfaction ?? 100) < 40,
    messages: [
      '이직 알아봐야 하나...',
      '이 회사 미래가 있나?',
      '월급이 적어도 너무 적어...',
      '야근 수당이라도 주면 좋겠는데...',
    ],
    priority: 9,
    cooldownTicks: 1800,
  },

  {
    id: 'high_satisfaction',
    category: 'satisfaction',
    condition: (emp) => (emp.satisfaction ?? 80) > 85,
    messages: [
      '이 회사 분위기 좋은 것 같아요',
      '여기서 오래 다니고 싶네요',
      '실장님 덕분에 재미있게 일해요!',
      '복지가 좋아서 만족스러워요',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 성격 태그 관련
  {
    id: 'caffeine_needs',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('caffeine_addict') === true,
    messages: [
      '커피... 커피가 필요해...',
      '에스프레소 더블샷 주세요!',
      '카페인 없이는 못 살아',
      '오늘 벌써 5잔째...',
    ],
    priority: 5,
    cooldownTicks: 3600,
  },

  {
    id: 'introvert_crowd',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('introvert') === true,
    messages: [
      '조용한 곳에서 일하고 싶다...',
      '혼자 집중하면 더 잘 되는데',
      '사람 많은 건 좀...',
      '헤드셋 끼고 싶다...',
    ],
    priority: 4,
    cooldownTicks: 5400,
  },

  {
    id: 'ambitious_drive',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('ambitious') === true,
    messages: [
      '더 큰 목표가 필요해!',
      '실장님, 저 프로젝트 더 맡겠습니다!',
      '올해 안에 팀장 되고 싶다',
      '주말에도 공부할게요!',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  {
    id: 'workaholic_overtime',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('workaholic') === true,
    messages: [
      '퇴근? 아직 할 일이 남았는데요',
      '야근이 아니라 열정입니다',
      '일이 곧 취미',
      '주말에도 출근해도 되죠?',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  {
    id: 'social_chat',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('social') === true,
    messages: [
      '오늘 회식 어때요?',
      '다들 점심 뭐 먹을 거예요?',
      '주말에 같이 등산 갈래요?',
      '새로 온 신입이 재미있어요!',
    ],
    priority: 2,
    cooldownTicks: 3600,
  },

  // 직무별 캐주얼 대화
  {
    id: 'analyst_casual',
    category: 'random',
    condition: (emp) => emp.role === 'analyst' && Math.random() < 0.02,
    messages: [
      'RSI가 과매수 구간인데... 조심해야겠어',
      'MACD 골든크로스 나왔다!',
      '이 종목 볼린저밴드 하단 터치했어요',
      '섹터 로테이션 신호 잡혔어요',
      '어제 리포트 피드백 아직 안 왔네...',
      '차트 보면 볼수록 재밌어요',
    ],
    priority: 2,
    cooldownTicks: 3600,
  },
  {
    id: 'trader_casual',
    category: 'random',
    condition: (emp) => emp.role === 'trader' && Math.random() < 0.02,
    messages: [
      '호가창 움직임이 심상치 않아',
      '체결 속도가 좀 느린데?',
      '슬리피지 최소화해야지...',
      '오늘 거래량 좀 많네요',
      '주문 넣을 타이밍 보는 중...',
      '손절은 빠르게, 익절은 천천히!',
    ],
    priority: 2,
    cooldownTicks: 3600,
  },
  {
    id: 'manager_casual',
    category: 'random',
    condition: (emp) => emp.role === 'manager' && Math.random() < 0.02,
    messages: [
      '포트폴리오 리밸런싱 시점인 것 같아요',
      '리스크 관리가 제일 중요해',
      '팀 성과 보고서 정리 중...',
      '이번 달 목표 수익률 달성 가능할까?',
      '신입 교육 스케줄 잡아야 하는데...',
      '오늘 승인 건수가 좀 많네요',
    ],
    priority: 2,
    cooldownTicks: 3600,
  },

  // ── 성격별 시장 상황 반응 (trait + market context) ──

  // 워커홀릭: 시장 상황 반응
  {
    id: 'workaholic_market_up',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('workaholic') === true && Math.random() < 0.03,
    messages: [
      '상승장이니까 더 분석해야지! 야근 각이다',
      '이런 장에서 쉬면 안 돼요. 기회를 잡아야죠!',
      '호황일수록 더 일해야 합니다. 뒤처지면 안 돼요!',
      '이 기세면 주말에도 나와야겠어요',
      '장이 좋을 때 포트폴리오 점검을 더 자주 해야죠',
    ],
    priority: 4,
    cooldownTicks: 5400,
  },
  {
    id: 'workaholic_dedication',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('workaholic') === true && Math.random() < 0.02,
    messages: [
      '새벽까지 분석한 보고서, 드디어 완성!',
      '집에서도 차트 보고 있었어요... 습관이에요',
      '휴가? 시장이 쉬지 않는데 제가 어떻게 쉬어요',
      '오늘도 마지막 퇴근이네요. 뿌듯합니다!',
      '일요일에 회사 오니까 조용해서 좋네요',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 사교적: 시장 상황 반응
  {
    id: 'social_market_chat',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('social') === true && Math.random() < 0.03,
    messages: [
      '다들 오늘 시장 어떻게 봐요? 같이 이야기해요!',
      '옆 팀이랑 시장 전망 토론했는데 재밌었어요',
      '오늘 장 끝나고 다 같이 한잔하실래요?',
      '새로 온 신입한테 시장 현황 설명해줬어요',
      '점심시간에 투자 스터디 할 사람 모집 중이에요!',
    ],
    priority: 3,
    cooldownTicks: 3600,
  },
  {
    id: 'social_team_spirit',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('social') === true && Math.random() < 0.02,
    messages: [
      '팀 회식 장소 제가 알아볼게요!',
      '생일인 동료한테 케이크 주문했어요',
      '옆자리 분이랑 커피 내기해서 졌어요... 아메리카노 사야겠네요',
      '다음 주 팀 워크숍 어디로 갈까요?',
      '점심 맛집 리스트 업데이트했어요. 공유할게요!',
    ],
    priority: 2,
    cooldownTicks: 5400,
  },

  // 내향적: 시장 상황 반응
  {
    id: 'introvert_market_analysis',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('introvert') === true && Math.random() < 0.03,
    messages: [
      '혼자 조용히 차트 분석하는 게 제일 편해요',
      '오늘은 좀 조용했으면... 집중하고 싶은데',
      '소음 차단 이어폰 새로 샀어요. 업무 효율 올라갈 것 같아요',
      '점심은 혼밥이 편해요. 생각 정리할 시간이 필요하거든요',
      '회의가 너무 많으면 정작 분석할 시간이 없어요...',
    ],
    priority: 4,
    cooldownTicks: 5400,
  },
  {
    id: 'introvert_deep_thought',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('introvert') === true && Math.random() < 0.02,
    messages: [
      '이 패턴... 혼자 더 깊이 파봐야겠어요',
      '사무실이 조용한 날은 생산성이 2배에요',
      '메일로 보고서 보내놨어요. 대면 보고보다 정확하니까요',
      '혼자 생각하다 좋은 인사이트 찾았어요!',
      '집중 모드 들어갈게요. 한 2시간만 말 걸지 말아주세요',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 야심가: 시장 상황 반응
  {
    id: 'ambitious_market_opportunity',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('ambitious') === true && Math.random() < 0.03,
    messages: [
      '이번 기회를 잡으면 승진에 한 발짝 더!',
      '다른 팀보다 성과 더 내야 해요. 집중!',
      '실장님, 더 큰 프로젝트 맡겨주세요!',
      '올해 안에 반드시 최고의 성과를 내겠습니다!',
      '경쟁사 애널리스트보다 더 정확한 예측을 해야 해요',
    ],
    priority: 4,
    cooldownTicks: 5400,
  },
  {
    id: 'ambitious_career_drive',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('ambitious') === true && Math.random() < 0.02,
    messages: [
      '주말에 CFA 공부했어요. 합격할 때까지!',
      '이번 분기 목표, 120% 달성이 목표입니다',
      '5년 뒤엔 이 팀을 이끌고 있을 거예요',
      '벤치마킹 보고서 준비해왔어요. 한번 보실래요?',
      '다음 승진 심사, 반드시 통과하겠습니다!',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 완벽주의자: 시장 상황 반응
  {
    id: 'perfectionist_market_detail',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('perfectionist') === true && Math.random() < 0.03,
    messages: [
      '이 데이터 소수점 셋째 자리까지 맞는 건지 확인해야 해요',
      '보고서 오타 발견... 다시 써야겠어요',
      '다른 팀 분석은 너무 대충인 것 같은데...',
      '이 차트의 이동평균선 기간 설정이 최적인지 재검증 중이에요',
      '98% 정확도로는 부족해요. 99.9%를 목표로!',
    ],
    priority: 4,
    cooldownTicks: 5400,
  },
  {
    id: 'perfectionist_quality',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('perfectionist') === true && Math.random() < 0.02,
    messages: [
      '어제 보고서 3번 수정했어요. 이제 만족스러워요',
      '이 분석 모델, 백테스트 한 번 더 돌려볼게요',
      '차트 색상 배합이 가독성에 영향을 주거든요...',
      '실장님, 이 숫자 한번만 더 확인해주실래요?',
      '완벽하지 않으면 제출 안 합니다. 그게 제 원칙이에요',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 기술 능숙: 시장 상황 반응
  {
    id: 'tech_savvy_tools',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('tech_savvy') === true && Math.random() < 0.03,
    messages: [
      '새 분석 스크립트 짜봤는데 시간이 반으로 줄었어요!',
      'API 연동해서 실시간 데이터 받는 거 완성했습니다',
      '이 반복 작업, 자동화하면 5분이면 끝나요',
      '파이썬으로 백테스트 돌려봤는데 결과가 흥미로워요',
      'ChatGPT한테 코드 리뷰 시켰더니 버그 찾았어요!',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 위험 회피: 시장 상황 반응
  {
    id: 'risk_averse_market_caution',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('risk_averse') === true && Math.random() < 0.03,
    messages: [
      '지금 시장... 좀 불안한데 현금 비중 늘려야 하지 않을까요?',
      '손절 라인 다시 확인해야 해요. 안전이 최우선!',
      '이번 포지션 사이즈가 너무 큰 것 같아요...',
      '분산투자가 답이에요. 한 종목에 몰빵은 위험해요',
      'VIX 지수 확인하셨어요? 변동성 주의해야 할 것 같아요',
    ],
    priority: 4,
    cooldownTicks: 5400,
  },

  // 야행성: 시간대별 반응
  {
    id: 'nocturnal_morning_struggle',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('nocturnal') === true && Math.random() < 0.03,
    messages: [
      '아침 9시... 아직 뇌가 안 깨어났어요...',
      '새벽에 미국장 보느라 졸려요... 커피 더 주세요',
      '오전 회의는 제 뇌에 잔인한 형벌이에요',
      '오후가 되면 진짜 제 실력을 보여드리겠습니다',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 예민함: 환경 반응
  {
    id: 'sensitive_environment',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('sensitive') === true && Math.random() < 0.03,
    messages: [
      '오늘 사무실이 좀 시끄러운 것 같아요...',
      '에어컨 온도 좀 올려주실 수 있나요? 추워요...',
      '옆 자리에서 전화 소리가... 집중이 안 돼요',
      '조명이 너무 밝은 것 같은데 저만 그런가요?',
      '시장 분위기가 뭔가 이상해요... 느낌이 안 좋아요',
    ],
    priority: 4,
    cooldownTicks: 5400,
  },

  // 카페인 중독: 추가 커피 관련
  {
    id: 'caffeine_intensity',
    category: 'trait',
    condition: (emp) => emp.traits?.includes('caffeine_addict') === true && Math.random() < 0.02,
    messages: [
      '오늘 아직 3잔밖에 안 마셨는데... 부족해요',
      '이 근처 카페 라떼 맛집 발견했어요!',
      '디카페인? 그건 커피가 아니에요!',
      '커피 마시면서 차트 보는 게 인생 최대의 행복이에요',
      '사무실 커피머신이 고장나면 저 퇴사해요 진짜',
    ],
    priority: 3,
    cooldownTicks: 5400,
  },

  // 랜덤
  {
    id: 'random_chat',
    category: 'random',
    condition: () => Math.random() < 0.025,
    messages: [
      '점심 뭐 먹지?',
      '오늘 날씨 좋네요',
      '주말에 뭐 하세요?',
      '이번 분기 목표 달성할 수 있을까요?',
      '주식 공부 더 해야겠어요',
      '실장님 오늘 기분 좋아 보여요',
      '월급날이 빨리 왔으면...',
      '신메뉴 나왔다는데 같이 가요!',
    ],
    priority: 1,
    cooldownTicks: 3600,
  },

  // ✨ Core Values: 마일스톤 관련
  {
    id: 'milestone_skill',
    category: 'random',
    condition: () => false, // 이벤트 기반: triggerChatter()로만 트리거
    messages: [
      '스킬이 올라갔어! 더 잘할 수 있어!',
      '실력이 늘고 있어요!',
      '요즘 자신감이 붙네요!',
      '드디어 목표 달성!',
    ],
    priority: 7,
    cooldownTicks: 7200,
  },
  {
    id: 'milestone_tenure',
    category: 'random',
    condition: () => false, // 이벤트 기반: triggerChatter()로만 트리거
    messages: [
      '벌써 이렇게 됐네요... 감회가 새롭습니다',
      '이 회사와 함께 성장했어요!',
      '여기서 일한 시간이 벌써...',
      '회사에 정이 많이 들었어요',
    ],
    priority: 7,
    cooldownTicks: 7200,
  },
  {
    id: 'milestone_trade',
    category: 'random',
    condition: () => false, // 이벤트 기반: triggerChatter()로만 트리거
    messages: [
      '거래 실력이 늘었어요!',
      '이번 거래 대박! 기분 좋다!',
      '트레이딩이 재미있어지고 있어요!',
      '손익 관리가 점점 나아지네요',
    ],
    priority: 7,
    cooldownTicks: 7200,
  },
  {
    id: 'milestone_contribution',
    category: 'random',
    condition: () => false, // 이벤트 기반: triggerChatter()로만 트리거
    messages: [
      '회사 수익에 기여하고 있다니 뿌듯해요!',
      '내가 이만큼 벌었다니... 대단하지 않나요?',
      '실장님, 보너스는요? 😏',
      '회사의 성장에 일조하고 있어요!',
    ],
    priority: 7,
    cooldownTicks: 7200,
  },

  // M&A 시장 관련 (일반 시장 대화)
  {
    id: 'mna_market',
    category: 'market',
    condition: () => Math.random() < 0.05, // 5% 확률로 발생
    messages: [
      '요즘 M&A 소식이 많네요... 우리 회사는 괜찮겠죠?',
      '대규모 구조조정 뉴스를 보니 불안하네요.',
      '인수합병 시장이 활발해지는 건 호재일까요?',
      '저 회사도 인수되는구나... 직원들은 어떻게 될까...',
      '우리도 큰 회사에 인수되면 좋겠어요',
      '합병 소식 들었어요? 시장이 들썩이네요',
    ],
    priority: 2,
    cooldownTicks: 7200, // 12시간
  },

  // AI 배치 시스템 관련 (Task 3.2: Week 3 Integration)
  {
    id: 'ai_moved_closer',
    category: 'random',
    condition: () => false, // 이벤트 기반: triggerChatter()로만 트리거
    messages: [
      '여기가 훨씬 편한데? 😊',
      '자리 바꿔서 좋네요!',
      '이 자리 마음에 들어요',
      '일하기 훨씬 편하네!',
    ],
    priority: 5,
    cooldownTicks: 7200,
  },
  {
    id: 'ai_furniture_placed',
    category: 'random',
    condition: () => false, // 이벤트 기반: triggerChatter()로만 트리거
    messages: [
      '새 가구다! 좋아요!',
      '이제 좀 살 것 같아요',
      '회사가 신경 써주네요!',
      '사무실이 점점 좋아지네요!',
    ],
    priority: 5,
    cooldownTicks: 7200,
  },
  {
    id: 'ai_synergy_boost',
    category: 'random',
    condition: () => false, // 이벤트 기반: triggerChatter()로만 트리거
    messages: [
      '{partner}랑 같이 일하니까 효율 좋네요!',
      '팀워크가 훨씬 좋아진 것 같아요',
      '이 자리에서 일하니 더 잘되네!',
    ],
    priority: 5,
    cooldownTicks: 7200,
  },
]

/* ── 이벤트 기반 트리거 큐 ── */

const pendingTriggeredMessages = new Map<string, string>()

/**
 * 특정 직원에게 이벤트 기반 말풍선을 예약
 * @param employeeId 대상 직원 ID
 * @param templateId 트리거할 템플릿 ID (e.g. 'ai_moved_closer')
 * @param vars 템플릿 변수 치환 (e.g. { partner: '김철수' })
 */
export function triggerChatter(
  employeeId: string,
  templateId: string,
  vars?: Record<string, string>,
): void {
  const template = CHATTER_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return
  let msg = template.messages[Math.floor(Math.random() * template.messages.length)]
  if (vars) {
    for (const [key, val] of Object.entries(vars)) {
      msg = msg.replaceAll(`{${key}}`, val)
    }
  }
  // {partner} 폴백
  msg = msg.replaceAll('{partner}', '동료')
  pendingTriggeredMessages.set(employeeId, msg)
}

/**
 * 예약된 이벤트 기반 말풍선 소비 (있으면 반환 후 제거)
 */
export function consumeTriggeredChatter(employeeId: string): string | null {
  const msg = pendingTriggeredMessages.get(employeeId)
  if (msg) {
    pendingTriggeredMessages.delete(employeeId)
    return msg
  }
  return null
}

/* ── Chatter Selection ── */

const lastChatterTick: Record<string, number> = {}

/**
 * 직원별 말풍선 대사 선택
 * @returns 선택된 메시지 또는 null
 */
export function selectChatter(
  employee: Employee,
  currentTick: number,
  nearbyEmployees?: Employee[],
): string | null {
  const key = employee.id

  // 최소 간격 체크 (300틱 = ~1분)
  if (lastChatterTick[key] && currentTick - lastChatterTick[key] < 300) {
    return null
  }

  // 조건 맞는 대사 필터링
  const candidates = CHATTER_TEMPLATES
    .filter((t) => {
      // 쿨다운 체크
      const templateKey = `${key}_${t.id}`
      if (lastChatterTick[templateKey] && currentTick - lastChatterTick[templateKey] < t.cooldownTicks) {
        return false
      }
      return t.condition(employee)
    })
    .sort((a, b) => b.priority - a.priority)

  if (candidates.length === 0) return null

  // 최우선 순위 대사에서 랜덤 선택
  const template = candidates[0]
  let message = template.messages[Math.floor(Math.random() * template.messages.length)]

  // {partner} 템플릿 변수 치환
  if (message.includes('{partner}') && nearbyEmployees && nearbyEmployees.length > 0) {
    const partner = nearbyEmployees[Math.floor(Math.random() * nearbyEmployees.length)]
    message = message.replace('{partner}', partner.name)
  } else if (message.includes('{partner}')) {
    message = message.replace('{partner}', '동료')
  }

  // 쿨다운 기록
  lastChatterTick[key] = currentTick
  lastChatterTick[`${key}_${template.id}`] = currentTick

  return message
}

/**
 * 특정 직원의 쿨다운 정리 (해고/퇴사 시 호출)
 */
export function cleanupChatterCooldown(employeeId: string): void {
  Object.keys(lastChatterTick).forEach((key) => {
    if (key === employeeId || key.startsWith(`${employeeId}_`)) {
      delete lastChatterTick[key]
    }
  })
}

/**
 * 쿨다운 리셋 (게임 재시작 시)
 */
export function resetChatterCooldowns(): void {
  Object.keys(lastChatterTick).forEach((key) => {
    delete lastChatterTick[key]
  })
  pendingTriggeredMessages.clear()
}

/* ── Pipeline Speech Bubble Templates ── */

const PIPELINE_MESSAGES: Record<string, Record<TimeOfDay, readonly string[]>> = {
  proposal_created: {
    morning: [
      '오전 시황 분석 완료! {ticker} 매수 추천!',
      '{ticker} 신호 포착! 제안서 작성 중...',
      'RSI 분석 완료, {ticker} {direction} 가능!',
    ],
    lunch: [
      '점심 먹기 전에... {ticker} 괜찮아 보여요',
      '{ticker} 차트 패턴 감지! 보고서 올립니다',
    ],
    afternoon: [
      '{ticker} 분석 결과 나왔습니다',
      '{ticker} 분석 끝! 컨피던스 {confidence}%',
      'RSI 분석 완료, {ticker} {direction} 가능!',
    ],
    closing: [
      '마감 전 급히! {ticker} 지금이에요!',
      '{ticker} 마감 전 마지막 기회!',
    ],
  },
  proposal_approved: {
    morning: ['승인. {ticker} 오전 중 진행시켜.', '{ticker} 제안서 검토 완료, 통과!'],
    lunch: ['점심 후에 {ticker} 진행해', '리스크 확인, {ticker} 승인합니다'],
    afternoon: ['좋은 분석이야. {ticker} 실행해', '{ticker} 승인. 오후장 노려봐'],
    closing: ['{ticker} 급히 승인! 마감 전에 처리해', '승인. {ticker} 서둘러'],
  },
  proposal_rejected: {
    morning: ['{ticker} 반려. 오전에는 관망하자', '이건 좀... {ticker} 다시 분석해봐'],
    lunch: ['{ticker} 거래 보류. 시기상조야', '포지션이 너무 커. {ticker} 반려'],
    afternoon: ['{ticker} 반려. 리스크가 너무 높아', '{ticker} 다시 봐봐. 좀 아쉽긴 한데'],
    closing: ['{ticker} 마감 전에는 위험해. 반려', '{ticker} 반려. 내일 다시 보자'],
  },
  trade_executed: {
    morning: ['{ticker} 체결 완료! 좋은 시작이야', '{ticker} {direction} 성공!'],
    lunch: ['체결! {ticker} 점심값 벌었다', '{ticker} 주문 완료!'],
    afternoon: ['{ticker} 체결 완료! 나이스!', '체결! {ticker} 좋은 가격이야'],
    closing: ['{ticker} 마감 전 체결 성공!', '{ticker} 주문 완료, 슬리피지 최소화!'],
  },
  trade_failed: {
    morning: ['{ticker} 체결 실패... 잔고 부족', '아... {ticker} 아침부터 안 풀리네'],
    lunch: ['아... {ticker} 주문 실패했어', '{ticker} 안 됐어... 다음 기회를'],
    afternoon: ['{ticker} 체결 실패... 잔고 부족', '{ticker} 안 됐어...'],
    closing: ['{ticker} 마감 전 실패... 아쉽다', '아... {ticker} 주문 실패했어'],
  },
}

export type PipelineMessageType = keyof typeof PIPELINE_MESSAGES

/**
 * Pipeline 단계에 맞는 말풍선 메시지 생성
 * @param hour 현재 영업시간 (9-18) — 시간대별 메시지 분기
 */
export function getPipelineMessage(
  type: PipelineMessageType,
  params: { ticker?: string; direction?: string; confidence?: number; hour?: number },
): string {
  const timeOfDay = getTimeOfDay(params.hour ?? 12)
  const messageGroup = PIPELINE_MESSAGES[type]
  const templates = messageGroup?.[timeOfDay] ?? messageGroup?.afternoon ?? ['...']
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template
    .replace('{ticker}', params.ticker ?? '???')
    .replace('{direction}', params.direction === 'buy' ? '매수' : '매도')
    .replace('{confidence}', String(params.confidence ?? 0))
}

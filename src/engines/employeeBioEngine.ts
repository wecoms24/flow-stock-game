/**
 * Employee Bio Engine
 *
 * 바이오 생성, 감정 추론, 목표 진행, 이벤트 관리
 * 성격 특성(trait) 기반으로 다양한 배경/성격/목표를 생성
 */

import type { EmployeeBio, EmotionalState, LifeEvent } from '../types/employeeBio'
import type { Employee, EmployeeTrait } from '../types'
import { generateGoalsForEmployee } from '../data/personalGoals'

/* ── 기본 성격 설명 풀 ── */
const PERSONALITIES = [
  '꼼꼼하고 내성적인 완벽주의자',
  '활발하고 사교적인 팀플레이어',
  '침착하고 논리적인 분석가',
  '열정적이고 도전적인 리더',
  '신중하고 보수적인 안전주의자',
  '창의적이고 직관적인 자유로운 영혼',
  '성실하고 책임감 강한 모범생',
  '야심차고 경쟁적인 승부사',
  '느긋하고 낙천적인 분위기 메이커',
  '예리하고 날카로운 비평가',
]

/* ── 성격 특성(trait) 기반 성격 설명 ── */
const TRAIT_PERSONALITIES: Partial<Record<EmployeeTrait, string[]>> = {
  workaholic: [
    '일에 대한 열정이 넘치는 헌신적 일꾼',
    '업무가 곧 인생의 의미인 프로페셔널',
    '퇴근 시간이 없는 불타는 업무 중독자',
    '야근을 즐기는 열정적 자기 관리형',
    '효율보다 노력을 믿는 끈기의 아이콘',
  ],
  perfectionist: [
    '한 치의 오차도 용납하지 않는 분석의 장인',
    '디테일에 목숨 거는 정밀 검토의 달인',
    '결과물에 대한 자부심이 강한 품질 추구자',
    '실수 제로를 향해 달리는 완벽주의 전사',
    '보고서 한 줄에도 영혼을 담는 집착형 인재',
  ],
  social: [
    '점심 약속이 주 5회인 인맥 부자',
    '팀 분위기를 살리는 타고난 무드 메이커',
    '동료와의 시너지로 성과를 만드는 협업 전문가',
    '사내 네트워크의 중심에 서는 소셜 리더',
    '커피 타임을 업무의 일부로 만드는 관계 중심형',
  ],
  introvert: [
    '조용한 공간에서 빛나는 깊은 사색가',
    '혼자만의 시간에 최고의 아이디어를 떠올리는 몽상가',
    '소음을 차단하면 생산성이 200%가 되는 집중형',
    '말보다 결과로 증명하는 과묵한 실력자',
    '헤드폰이 업무의 핵심 도구인 혼자 일하기 장인',
  ],
  ambitious: [
    '승진 레이스의 선두 주자를 꿈꾸는 야심가',
    '매달 자기 평가를 하는 목표 지향적 전략가',
    '항상 다음 단계를 준비하는 커리어 설계자',
    '경쟁에서 이기는 것이 존재 이유인 승부사',
    '실장님 자리를 노리고 있는 조용한 야망의 소유자',
  ],
  tech_savvy: [
    '엑셀 매크로부터 파이썬까지 다루는 기술형 인재',
    'HTS 커스터마이징의 달인',
    '데이터 분석 자동화에 진심인 테크 덕후',
    '새로운 트레이딩 툴이 나오면 가장 먼저 테스트하는 얼리어답터',
    '코딩으로 업무 효율을 극대화하는 스마트 워커',
  ],
  sensitive: [
    '공감 능력이 뛰어난 감성적 분석가',
    '시장의 미세한 변화를 직감으로 포착하는 센서형',
    '동료의 감정까지 읽어내는 세심한 관찰자',
    '환경에 크게 영향받지만 그만큼 깊이 있는 통찰을 제공하는 감각파',
    '소리와 조명에 예민하지만 창의적 아이디어가 풍부한 섬세파',
  ],
  nocturnal: [
    '오후가 되어야 엔진이 걸리는 늦은 시동형',
    '마감 직전에 불꽃 집중력을 발휘하는 야간형',
    '새벽 시장 분석이 하루의 시작인 올빼미',
    '아침 회의에서는 졸려도 오후 장 분석은 칼같은 역전형',
  ],
  caffeine_addict: [
    '커피 한 잔에 하루를 시작하고 커피 한 잔에 마감하는 카페인 전사',
    '사무실 커피머신의 VIP 고객',
    '카페인 혈중 농도가 업무 효율과 정비례하는 커피 매니아',
    '머그컵이 책상에서 떠나지 않는 카페인 의존형',
  ],
  risk_averse: [
    '안전 마진을 최우선으로 두는 보수적 투자자',
    '손절 라인을 철저히 지키는 원칙주의자',
    '리스크 관리가 곧 수익이라 믿는 신중파',
    '변동성이 큰 장에서는 현금 보유를 선호하는 방어형',
  ],
}

/* ── 기본 배경 스토리 풀 ── */
const BACKSTORIES = [
  '대학에서 경제학을 전공하고 주식 투자 동아리에서 활동했다.',
  '이전 직장에서 스타트업 경험을 쌓고 새로운 도전을 위해 왔다.',
  '수학 올림피아드 출신으로 숫자에 강한 자신감을 가지고 있다.',
  '경영대학원을 졸업하고 금융 업계에 첫 발을 디뎠다.',
  '가업을 이어받기 위해 실전 경험을 쌓으러 왔다.',
  '이공계 출신이지만 금융에 매력을 느껴 전향했다.',
  '해외 유학 후 글로벌 시각으로 시장을 분석한다.',
  '증권사 인턴 경험이 있어 업무 적응이 빠르다.',
  '독학으로 투자를 배워 실전 경험이 풍부하다.',
  '커뮤니케이션 전공으로 팀 내 조율 역할을 자처한다.',
]

/* ── 교육/전공 배경 ── */
const EDUCATION_BACKGROUNDS = [
  '서울대 경영학과 출신으로 이론과 실전을 겸비했다.',
  'KAIST 산업공학 석사, 퀀트 모델링에 강점이 있다.',
  '해외 MBA 출신으로 글로벌 금융 트렌드에 밝다.',
  '연세대 경제학 전공, 거시경제 분석의 기초가 탄탄하다.',
  '고려대 통계학과, 데이터 기반 의사결정에 자신 있다.',
  '지방 국립대 회계학 출신이지만 CPA 자격증으로 실력을 증명했다.',
  '전문대 금융과 졸업 후 현장 경험으로 성장한 실전형이다.',
  '문과 출신이지만 독학으로 프로그래밍을 배워 분석 도구를 직접 만든다.',
  '예술대 출신이라는 독특한 이력이 창의적 시장 해석에 도움을 준다.',
  '군 장교 출신으로 위기 상황에서의 판단력이 뛰어나다.',
]

/* ── 취미/생활 배경 ── */
const HOBBY_BACKGROUNDS = [
  '주말이면 등산을 즐기며 체력 관리에 신경 쓴다.',
  '바둑 4단으로 전략적 사고가 일상화되어 있다.',
  '마라톤 풀코스를 완주한 끈기의 소유자다.',
  '주식 방송 유튜버로도 활동하며 콘텐츠 제작에 관심이 있다.',
  '밴드 활동을 하며 스트레스를 해소한다.',
  '독서 모임에서 매달 경제 서적을 분석하는 것이 취미다.',
  '요리가 취미로 팀 회식 때 솜씨를 발휘한다.',
  '게임 대회 입상 경력이 있어 순간 판단력이 빠르다.',
  '사진작가 활동도 하며 시각적 패턴 인식에 강하다.',
  '명상과 요가로 멘탈 관리를 철저히 한다.',
  '보드게임 동호회에서 확률 계산 능력을 키웠다.',
  '축구 동호회 주장으로 리더십을 발휘한다.',
]

/* ── 가족/인생 배경 ── */
const FAMILY_BACKGROUNDS = [
  '부모님이 자영업을 하셔서 어릴 때부터 돈에 대한 감각이 있다.',
  '집안이 넉넉하지 않아 장학금으로 대학을 졸업한 자수성가형이다.',
  '증권사 집안 출신으로 시장 이야기를 자연스럽게 접하며 자랐다.',
  '신혼이라 가정과 업무 사이 균형을 잡으려 노력 중이다.',
  '1남 2녀의 장남으로 책임감이 강하다.',
  '어린 시절 해외에서 살았던 경험이 글로벌 시야에 도움을 준다.',
  '부모님의 투자 실패를 보고 리스크 관리의 중요성을 체감했다.',
  '대가족 출신으로 의견 조율과 중재에 능하다.',
  '부모님이 교수여서 학구적인 분위기에서 자랐다.',
  '지방에서 상경해 홀로 서울 생활을 하며 독립심이 강하다.',
]

/* ── 커리어 포부 배경 ── */
const CAREER_ASPIRATION_BACKGROUNDS = [
  '장기적으로 자기만의 헤지펀드를 설립하는 것이 꿈이다.',
  '파이어족을 목표로 저축과 투자에 철저하다.',
  '금융 교육 사업을 시작하는 것이 목표다.',
  '해외 투자은행으로의 이직을 준비하고 있다.',
  '핀테크 스타트업 창업을 꿈꾸며 기술을 연마 중이다.',
  '베스트 애널리스트 상 수상이 커리어 최대 목표다.',
  '시장의 파수꾼이 되어 건전한 투자 문화를 이끌고 싶다.',
  '퇴직 후 증권 학원을 열어 후배 양성에 기여하고 싶다.',
  '투자 관련 책을 출간하는 것이 버킷리스트에 있다.',
  '블록체인과 가상자산 시장의 미래에 큰 관심을 두고 있다.',
]

/* ── 성격 기반 배경 매핑 ── */
const TRAIT_BACKSTORIES: Partial<Record<EmployeeTrait, string[]>> = {
  workaholic: [
    '전 직장에서 3년 연속 야근왕 타이틀을 거머쥔 전설적인 이력의 소유자다.',
    '대학 시절부터 도서관 폐관 시간에 쫓겨나곤 했던 공부 중독자 출신이다.',
    '취미가 "일"이라고 진지하게 말하는 유일한 직원이다.',
  ],
  perfectionist: [
    '보고서의 폰트 크기 0.5pt 차이도 발견해내는 놀라운 눈을 가졌다.',
    '이전 직장에서 오류 발견율 1위로 품질관리팀에서 러브콜을 받았었다.',
    '엑셀 소수점 반올림 방식에 대해 1시간 토론할 수 있는 디테일 장인이다.',
  ],
  social: [
    '입사 첫 주에 전 직원의 이름과 취미를 파악한 네트워킹의 신이다.',
    '회사 동호회를 3개나 만들고 단체 카톡방 관리까지 하는 인싸 중의 인싸다.',
    '면접 때 면접관과 친구가 되어버린 전설적인 사교력의 소유자다.',
  ],
  introvert: [
    '혼자 야근할 때 가장 높은 집중력을 보이는 고독한 천재형이다.',
    '팀 회식보다 홀로 차트를 분석하는 것이 더 즐거운 조용한 분석가다.',
    '메신저보다 이메일을 선호하는 문서 커뮤니케이션의 달인이다.',
  ],
  ambitious: [
    '5년 뒤 커리어 플랜을 엑셀로 정리해 놓은 체계적인 야심가다.',
    '전 직장에서 최연소 팀장 기록을 보유한 스피드 승진의 아이콘이다.',
    '매주 자기계발서를 한 권씩 읽는 자기 투자의 달인이다.',
  ],
  tech_savvy: [
    '자체 트레이딩 봇을 만들어 본 경험이 있는 기술 덕후다.',
    '사내 IT 문제가 생기면 IT팀보다 먼저 해결하는 비공식 기술 지원 담당이다.',
    '대학 시절 프로그래밍 대회 입상 경력이 있는 코딩 능력자다.',
  ],
  sensitive: [
    '사무실 온도가 1도만 바뀌어도 업무 효율에 영향을 받는 환경 감수성의 소유자다.',
    '동료의 미세한 표정 변화로 시장 불안감을 예측한 적이 있는 감정 분석가다.',
  ],
  risk_averse: [
    '전 직장에서 리스크 관리팀 최우수 직원상을 받은 이력이 있다.',
    '개인 자산의 70%를 국채와 예금에 넣어두는 철저한 안전 투자자다.',
  ],
  nocturnal: [
    '미국 시장 마감을 실시간으로 체크하다 보니 자연스럽게 야행성이 되었다.',
    '새벽 4시 프리마켓 분석이 일상인 글로벌 시장 추적자다.',
  ],
  caffeine_addict: [
    '한 달 커피 소비량이 사무실 전체의 30%를 차지하는 커피 괴물이다.',
    '바리스타 자격증을 보유하고 있어 사내 카페 담당을 자처한다.',
  ],
}

/* ── 역할 기반 배경 ── */
const ROLE_BACKSTORIES: Record<string, string[]> = {
  analyst: [
    '리서치 센터에서 2년간 산업 분석 보조 업무를 했다.',
    '대학원에서 계량경제학 논문으로 학위를 받았다.',
    '증권사 리서치팀 인턴 출신으로 보고서 작성이 능숙하다.',
  ],
  trader: [
    '모의투자 대회에서 수익률 1위를 기록한 실전파다.',
    '선물/옵션 시장에서 개인 트레이딩 경험 3년차다.',
    'HTS 단축키를 모두 외우고 있는 시스템 매매의 달인이다.',
  ],
  manager: [
    '전 직장에서 5명 규모의 팀을 이끌었던 리더십 경험이 있다.',
    'PMP 자격증 보유자로 프로젝트 관리에 능하다.',
    '인사팀 경험이 있어 팀원 관리와 동기 부여에 강점이 있다.',
  ],
  intern: [
    '대학 재학 중 첫 사회 경험으로 이곳에 왔다.',
    '금융학과 3학년, 졸업 전에 현장 경험을 쌓고 싶어 지원했다.',
    '경제 동아리에서 모의투자를 주도한 경험이 전부인 신선한 신입이다.',
  ],
}

/* ── 다양한 생활 이벤트 템플릿 ── */
const DIVERSE_LIFE_EVENT_TEMPLATES: Array<{
  type: LifeEvent['type']
  title: string
  description: string
  emotionalImpact: EmotionalState
  stressChange?: number
  satisfactionChange?: number
  traitAffinity?: EmployeeTrait[] // 특정 trait이 있으면 발생 확률 증가
}> = [
  {
    type: 'anniversary',
    title: '결혼기념일',
    description: '오늘은 결혼기념일이라 기분이 좋다.',
    emotionalImpact: 'happy',
    stressChange: -10,
    satisfactionChange: 5,
  },
  {
    type: 'anniversary',
    title: '자녀 입학식',
    description: '아이의 입학식에 다녀왔다. 뿌듯하다.',
    emotionalImpact: 'proud',
    stressChange: -5,
    satisfactionChange: 8,
  },
  {
    type: 'counseled',
    title: '자격증 합격',
    description: '오랫동안 준비한 자격증 시험에 합격했다!',
    emotionalImpact: 'excited',
    stressChange: -15,
    satisfactionChange: 15,
    traitAffinity: ['ambitious', 'perfectionist'],
  },
  {
    type: 'counseled',
    title: '건강 검진 이상 없음',
    description: '건강 검진 결과가 양호해서 안심이다.',
    emotionalImpact: 'content',
    stressChange: -8,
    satisfactionChange: 3,
  },
  {
    type: 'skill_learned',
    title: '새 프로그래밍 언어 습득',
    description: 'Python 기초를 마스터해 분석 도구를 만들 수 있게 되었다.',
    emotionalImpact: 'proud',
    stressChange: -5,
    satisfactionChange: 10,
    traitAffinity: ['tech_savvy'],
  },
  {
    type: 'skill_learned',
    title: '해외 컨퍼런스 참석',
    description: '해외 금융 컨퍼런스에서 최신 트렌드를 배워왔다.',
    emotionalImpact: 'excited',
    stressChange: -3,
    satisfactionChange: 12,
    traitAffinity: ['ambitious', 'social'],
  },
  {
    type: 'anniversary',
    title: '집들이',
    description: '드디어 내 집 마련에 성공! 동료들을 초대했다.',
    emotionalImpact: 'happy',
    stressChange: -20,
    satisfactionChange: 20,
  },
  {
    type: 'counseled',
    title: '취미 활동 시작',
    description: '새로운 취미를 시작해 리프레시하고 있다.',
    emotionalImpact: 'content',
    stressChange: -10,
    satisfactionChange: 5,
    traitAffinity: ['social'],
  },
  {
    type: 'anniversary',
    title: '반려동물 입양',
    description: '귀여운 반려동물을 입양했다. 출퇴근이 더 기다려진다.',
    emotionalImpact: 'happy',
    stressChange: -12,
    satisfactionChange: 8,
  },
  {
    type: 'counseled',
    title: '투자 실패 교훈',
    description: '개인 투자에서 손실을 봤지만 귀중한 교훈을 얻었다.',
    emotionalImpact: 'anxious',
    stressChange: 10,
    satisfactionChange: -5,
    traitAffinity: ['risk_averse'],
  },
  {
    type: 'skill_learned',
    title: '사내 스터디 그룹 결성',
    description: '동료들과 함께 금융 스터디 그룹을 만들었다.',
    emotionalImpact: 'excited',
    stressChange: -3,
    satisfactionChange: 8,
    traitAffinity: ['social', 'ambitious'],
  },
  {
    type: 'counseled',
    title: '번아웃 징후 감지',
    description: '최근 피로감이 심해져 자기 관리의 필요성을 느꼈다.',
    emotionalImpact: 'anxious',
    stressChange: 15,
    satisfactionChange: -8,
    traitAffinity: ['workaholic', 'perfectionist'],
  },
  {
    type: 'anniversary',
    title: '부모님 환갑잔치',
    description: '부모님 환갑을 축하하며 가족의 소중함을 다시 느꼈다.',
    emotionalImpact: 'happy',
    stressChange: -5,
    satisfactionChange: 5,
  },
  {
    type: 'skill_learned',
    title: '사내 발표 성공',
    description: '전체 회의에서 프레젠테이션을 성공적으로 마쳤다.',
    emotionalImpact: 'proud',
    stressChange: -10,
    satisfactionChange: 12,
    traitAffinity: ['ambitious'],
  },
  {
    type: 'counseled',
    title: '운동 루틴 확립',
    description: '꾸준한 운동으로 체력과 집중력이 좋아졌다.',
    emotionalImpact: 'content',
    stressChange: -8,
    satisfactionChange: 5,
  },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 성격 특성 기반 성격 설명 선택 */
function selectPersonality(traits?: EmployeeTrait[]): string {
  // 특성이 있으면 50% 확률로 특성 기반 성격 반환
  if (traits && traits.length > 0 && Math.random() < 0.5) {
    const trait = traits[Math.floor(Math.random() * traits.length)]
    const traitPersonalities = TRAIT_PERSONALITIES[trait]
    if (traitPersonalities && traitPersonalities.length > 0) {
      return pickRandom(traitPersonalities)
    }
  }
  return pickRandom(PERSONALITIES)
}

/** 다층 배경 스토리 조합 생성 */
function generateBackstory(employee: Employee): string {
  const parts: string[] = []

  // 1. 교육/기본 배경 (항상 포함)
  if (Math.random() < 0.5) {
    parts.push(pickRandom(EDUCATION_BACKGROUNDS))
  } else {
    parts.push(pickRandom(BACKSTORIES))
  }

  // 2. 역할 기반 배경 (60% 확률)
  const roleStories = ROLE_BACKSTORIES[employee.role]
  if (roleStories && Math.random() < 0.6) {
    parts.push(pickRandom(roleStories))
  }

  // 3. 성격 특성 기반 배경 (40% 확률, 특성이 있을 때)
  if (employee.traits && employee.traits.length > 0 && Math.random() < 0.4) {
    const trait = employee.traits[Math.floor(Math.random() * employee.traits.length)]
    const traitStories = TRAIT_BACKSTORIES[trait]
    if (traitStories && traitStories.length > 0) {
      parts.push(pickRandom(traitStories))
    }
  }

  // 4. 취미 또는 가족 또는 커리어 포부 (30% 확률로 하나 추가)
  if (Math.random() < 0.3) {
    const extraPools = [HOBBY_BACKGROUNDS, FAMILY_BACKGROUNDS, CAREER_ASPIRATION_BACKGROUNDS]
    parts.push(pickRandom(pickRandom(extraPools)))
  }

  return parts.join(' ')
}

/** 새 직원 바이오 생성 */
export function createBio(employee: Employee, currentTick: number): EmployeeBio {
  const personality = selectPersonality(employee.traits)
  const backstory = generateBackstory(employee)
  const goals = generateGoalsForEmployee(employee.role, employee.level ?? 1)

  const hiredEvent: LifeEvent = {
    id: `evt_hired_${employee.id}`,
    type: 'hired',
    title: '입사',
    description: `${employee.name}이(가) ${employee.role}로 입사했습니다.`,
    occurredAtTick: currentTick,
    emotionalImpact: 'excited',
  }

  return {
    employeeId: employee.id,
    personality,
    backstory,
    currentEmotion: 'excited',
    emotionHistory: [{ emotion: 'excited', tick: currentTick }],
    goals,
    lifeEvents: [hiredEvent],
    totalTradesParticipated: 0,
    totalSuccessfulTrades: 0,
    monthsEmployed: 0,
    counselingCount: 0,
    lastCounseledTick: 0,
    totalPnlContribution: 0,
    bestTradeProfit: 0,
    bestTradeTicker: '',
    worstTradeProfit: 0,
    worstTradeTicker: '',
    unlockedMilestones: [],
  }
}

/**
 * 다양한 생활 이벤트 생성 (월별 처리에서 호출)
 * 성격 특성과 현재 상태를 기반으로 적절한 이벤트를 확률적으로 생성
 */
export function generateLifeEvent(
  employee: Employee,
  _bio: EmployeeBio,
  currentTick: number,
): LifeEvent | null {
  // 기본 발생 확률 15%
  if (Math.random() > 0.15) return null

  // 특성 친화도 기반 필터링
  const traits = employee.traits ?? []
  const candidates = DIVERSE_LIFE_EVENT_TEMPLATES.filter((template) => {
    // 특성 친화도가 없으면 범용 이벤트
    if (!template.traitAffinity) return true
    // 특성 친화도가 있으면 해당 특성이 있을 때 가중치 부여
    const hasAffinity = template.traitAffinity.some((t) => traits.includes(t))
    return hasAffinity ? true : Math.random() < 0.3
  })

  if (candidates.length === 0) return null

  const selected = pickRandom(candidates)

  return {
    id: `evt_life_${employee.id}_${currentTick}`,
    type: selected.type,
    title: selected.title,
    description: selected.description,
    occurredAtTick: currentTick,
    emotionalImpact: selected.emotionalImpact,
  }
}

/**
 * 생활 이벤트의 스트레스/만족도 변화량 조회
 */
export function getLifeEventImpact(
  eventTitle: string,
): { stressChange: number; satisfactionChange: number } | null {
  const template = DIVERSE_LIFE_EVENT_TEMPLATES.find((t) => t.title === eventTitle)
  if (!template) return null
  return {
    stressChange: template.stressChange ?? 0,
    satisfactionChange: template.satisfactionChange ?? 0,
  }
}

/** 스트레스/만족도 기반 감정 추론 */
export function inferEmotion(employee: Employee): EmotionalState {
  const stress = employee.stress ?? 0
  const satisfaction = employee.satisfaction ?? 50
  const stamina = employee.stamina ?? 50

  if (stamina <= 0 || stress >= 90) return 'burned_out'
  if (stress >= 70) return 'stressed'
  if (stress >= 50 && satisfaction < 40) return 'anxious'
  if (satisfaction >= 80 && stress < 30) return 'happy'
  if (satisfaction >= 60) return 'content'
  if (satisfaction >= 40) return 'neutral'
  return 'anxious'
}

/** 목표 진행도 업데이트 */
export function updateGoals(
  bio: EmployeeBio,
  employee: Employee,
  currentTick: number,
): { updatedBio: EmployeeBio; completedGoalTitles: string[] } {
  const completedGoalTitles: string[] = []

  const updatedGoals = bio.goals.map((goal) => {
    if (goal.isCompleted) return goal

    let currentValue = goal.currentValue
    switch (goal.type) {
      case 'level_up':
        currentValue = employee.level ?? 1
        break
      case 'tenure':
        currentValue = bio.monthsEmployed
        break
      case 'trade_success':
        currentValue = bio.totalSuccessfulTrades
        break
      case 'salary_milestone':
        currentValue = (employee.salary ?? 0) * bio.monthsEmployed
        break
      case 'skill_mastery': {
        const skills = employee.skills ?? { analysis: 0, trading: 0, research: 0 }
        currentValue = Math.max(skills.analysis, skills.trading, skills.research)
        break
      }
    }

    const isCompleted = currentValue >= goal.targetValue
    if (isCompleted && !goal.isCompleted) {
      completedGoalTitles.push(goal.title)
    }

    return {
      ...goal,
      currentValue,
      isCompleted,
      completedAt: isCompleted && !goal.isCompleted ? currentTick : goal.completedAt,
    }
  })

  return {
    updatedBio: { ...bio, goals: updatedGoals },
    completedGoalTitles,
  }
}

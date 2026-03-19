import type { Employee } from '../types'

/* ── Employee Interaction System ── */
/* 인접 직원 간 자동 발생 상호작용
 * - 조건 기반 상호작용 발생 (역할, trait, 상태)
 * - 양방향 대사 (발화 + 반응)
 * - 쿨다운으로 스팸 방지
 * - officeSystem에서 매 10틱 호출
 */

export interface Interaction {
  type: InteractionType
  initiatorId: string
  targetId: string
  initiatorName: string
  targetName: string
  effects: {
    initiator: StatEffect
    target: StatEffect
  }
  dialogue: [string, string] // [발화자 대사, 상대방 반응]
  emoji: string
}

export type InteractionType =
  | 'collaboration'
  | 'mentoring'
  | 'smalltalk'
  | 'conflict'
  | 'coffee_invite'
  | 'competition'
  | 'help_request'
  | 'market_debate'
  | 'team_celebration'
  | 'gossip'
  | 'teaching_moment'
  | 'stress_support'
  | 'signal_sharing'
  | 'one_on_one'

export interface StatEffect {
  stressDelta: number
  satisfactionDelta: number
  skillDelta: number
  staminaDelta: number
}

/* ── 상호작용 규칙 테이블 ── */

interface InteractionRule {
  type: InteractionType
  chance: number // 10틱당 발생 확률 (0-1)
  condition: (initiator: Employee, target: Employee) => boolean
  effects: { initiator: StatEffect; target: StatEffect }
  dialogues: Array<[string, string]> // [발화, 반응] 쌍들
  emoji: string
}

const INTERACTION_RULES: InteractionRule[] = [
  {
    type: 'collaboration',
    chance: 0.08,
    condition: (a, b) => a.role === b.role,
    effects: {
      initiator: { stressDelta: -1, satisfactionDelta: 2, skillDelta: 0.1, staminaDelta: 0 },
      target: { stressDelta: -1, satisfactionDelta: 2, skillDelta: 0.1, staminaDelta: 0 },
    },
    dialogues: [
      ['이 데이터 같이 분석해볼래?', '좋아, 어디 보자'],
      ['이 패턴 봤어?', '헐 진짜네'],
      ['같이 리포트 작성하자', '그래, 나눠서 하자'],
      ['이거 검토 좀 해줄래?', '응, 잠깐 볼게'],
      ['이 모델 같이 개선해보자', '오 좋은 아이디어다'],
      ['크로스체크 한번 해볼까?', '그래, 서로 검증하자'],
      ['이번 분석 피드백 좀 줘', '음, 여기 이 부분이...'],
      ['같이 시뮬레이션 돌려볼까?', '좋아, 파라미터 셋팅하자'],
    ],
    emoji: '🤝',
  },
  {
    type: 'mentoring',
    chance: 0.10,
    condition: (a, b) => {
      const aLevel = a.level ?? 1
      const bLevel = b.level ?? 1
      return aLevel >= 10 && bLevel < 10
    },
    effects: {
      initiator: { stressDelta: 0, satisfactionDelta: 3, skillDelta: 0, staminaDelta: -1 },
      target: { stressDelta: -2, satisfactionDelta: 2, skillDelta: 0.3, staminaDelta: 0 },
    },
    dialogues: [
      ['이건 이렇게 하는 거야', '아 그렇군요! 감사합니다'],
      ['팁 하나 알려줄까?', '네! 알려주세요!'],
      ['이 실수 조심해', '아 맞다, 감사해요'],
      ['이 시장은 이렇게 읽어', '오... 대단하세요'],
      ['내가 신입 때도 이런 실수 했어', '그랬군요, 안심이 돼요'],
      ['이 차트 해석하는 요령이 있어', '와, 이렇게 보는 거였군요'],
      ['포지션 관리는 이게 핵심이야', '메모해둘게요!'],
      ['리스크 관리 노하우 전수해줄게', '꼭 배우고 싶었어요'],
    ],
    emoji: '📚',
  },
  {
    type: 'smalltalk',
    chance: 0.12,
    condition: (a) => a.traits?.includes('social') === true,
    effects: {
      initiator: { stressDelta: -3, satisfactionDelta: 1, skillDelta: 0, staminaDelta: 1 },
      target: { stressDelta: -3, satisfactionDelta: 1, skillDelta: 0, staminaDelta: 1 },
    },
    dialogues: [
      ['오늘 점심 뭐 먹을까?', '김치찌개 어때?'],
      ['주말에 뭐 했어?', '넷플릭스 봤지 뭐~'],
      ['요즘 맛집 알아?', '앗 나도 찾고 있었는데!'],
      ['퇴근하고 한잔할래?', '오 좋아!'],
      ['날씨 좋다~', '봄이 왔나 봐'],
      ['새로 오픈한 카페 가봤어?', '아직! 같이 갈래?'],
      ['어제 경기 봤어?', '대박이었지!'],
      ['올해 휴가 어디 갈 거야?', '아직 고민 중이야~'],
    ],
    emoji: '💬',
  },
  {
    type: 'conflict',
    chance: 0.06,
    condition: (a, b) =>
      a.traits?.includes('introvert') === true &&
      b.traits?.includes('social') === true,
    effects: {
      initiator: { stressDelta: 5, satisfactionDelta: -2, skillDelta: 0, staminaDelta: -2 },
      target: { stressDelta: 2, satisfactionDelta: -2, skillDelta: 0, staminaDelta: 0 },
    },
    dialogues: [
      ['좀 조용히 해줄래...', '에? 뭐가 시끄러워?'],
      ['집중 좀 하게 해줘', '아 미안미안~'],
      ['(한숨)...', '왜 그래? 무슨 일 있어?'],
      ['통화 소리 좀 줄여줘...', '아 몰랐어, 미안!'],
      ['여기서 회의하지 마...', '알겠어, 다른 데서 할게'],
      ['좀 덜 떠들 수 없어?', '그래 조심할게~'],
    ],
    emoji: '😤',
  },
  {
    type: 'coffee_invite',
    chance: 0.08,
    condition: (a) => a.traits?.includes('caffeine_addict') === true,
    effects: {
      initiator: { stressDelta: -2, satisfactionDelta: 1, skillDelta: 0, staminaDelta: 5 },
      target: { stressDelta: -2, satisfactionDelta: 1, skillDelta: 0, staminaDelta: 5 },
    },
    dialogues: [
      ['커피 한 잔 할래?', '오 좋지!'],
      ['아메리카노 사줄게', '역시 넌 천사야'],
      ['커피머신 가자!', '가자가자~'],
      ['오늘 원두 바꿨대, 한잔 할래?', '당연하지!'],
      ['카페인 충전 시간이야~', '나도 졸리던 참이었어'],
      ['드립커피 내릴 건데 같이?', '오 럭셔리한데?'],
      ['아이스 아메 갈 사람?', '나나나!'],
      ['커피 안 마시면 일이 안 돼', '동감 100%'],
    ],
    emoji: '☕',
  },
  {
    type: 'competition',
    chance: 0.07,
    condition: (a, b) =>
      a.traits?.includes('ambitious') === true &&
      b.traits?.includes('ambitious') === true,
    effects: {
      initiator: { stressDelta: 3, satisfactionDelta: 0, skillDelta: 0.2, staminaDelta: -1 },
      target: { stressDelta: 3, satisfactionDelta: 0, skillDelta: 0.2, staminaDelta: -1 },
    },
    dialogues: [
      ['이번 달 실적 내가 이길 거야', '흥, 두고 보자'],
      ['내 포트폴리오 수익률 봤어?', '나도 만만치 않아'],
      ['올해 MVP는 나야', '꿈 깨!'],
      ['내 분석이 더 정확했잖아', '이번엔 그랬지만...'],
      ['승진 후보 1순위가 누구겠어?', '당연히 나지'],
      ['이번 분기 수익률 1등 누구?', '아직 안 끝났거든!'],
    ],
    emoji: '🔥',
  },
  {
    type: 'help_request',
    chance: 0.15,
    condition: (a, b) =>
      (a.stress ?? 0) > 60 && (b.role === 'manager' || b.role === 'hr_manager'),
    effects: {
      initiator: { stressDelta: -10, satisfactionDelta: 5, skillDelta: 0, staminaDelta: 2 },
      target: { stressDelta: 2, satisfactionDelta: 2, skillDelta: 0, staminaDelta: -2 },
    },
    dialogues: [
      ['요즘 너무 힘들어요...', '괜찮아, 같이 해결하자'],
      ['상담 좀 받을 수 있을까요?', '그럼, 이리 와봐'],
      ['스트레스가 너무 심해요', '잠깐 쉬고 얘기하자'],
      ['업무량이 너무 많아요...', '조정해볼게, 걱정 마'],
      ['자신감이 많이 떨어졌어요', '넌 잘하고 있어, 믿어'],
      ['퇴사를 고민하고 있어요...', '한번 얘기해보자, 방법이 있을 거야'],
      ['번아웃이 온 것 같아요', '일단 오늘은 좀 쉬어'],
      ['야근이 계속되니 힘들어요', '업무 분배 다시 해볼게'],
    ],
    emoji: '🫂',
  },

  /* ── 새로운 상호작용 타입 ── */

  {
    type: 'market_debate',
    chance: 0.10,
    condition: (a, b) => a.role === 'analyst' && b.role === 'analyst',
    effects: {
      initiator: { stressDelta: 1, satisfactionDelta: 2, skillDelta: 0.2, staminaDelta: -1 },
      target: { stressDelta: 1, satisfactionDelta: 2, skillDelta: 0.2, staminaDelta: -1 },
    },
    dialogues: [
      ['코스피 3000 간다고 봐', '글쎄, 아직 이르지 않아?'],
      ['반도체 섹터 바닥이야', '나는 아직 더 빠진다고 봐'],
      ['금리 인하하면 성장주지', '아니야, 가치주가 먼저 반등해'],
      ['이 종목 과매도 아니야?', 'RSI만 보면 안 돼, 펀더멘탈을 봐'],
      ['AI 버블 아니야 이거?', '버블은 맞는데 아직 초기라고 봐'],
      ['환율이 변수야', '맞아, 외국인 자금 흐름 봐야 해'],
      ['이번 실적 시즌 기대돼?', '기대 반 우려 반이야'],
      ['기술적 분석 vs 기본적 분석?', '둘 다 봐야지, 하나만은 위험해'],
    ],
    emoji: '📊',
  },
  {
    type: 'team_celebration',
    chance: 0.05,
    condition: (a, b) => {
      // 둘 다 만족도가 높으면 축하할 이유가 있다고 판단
      const aSat = a.satisfaction ?? 50
      const bSat = b.satisfaction ?? 50
      return aSat > 70 && bSat > 70
    },
    effects: {
      initiator: { stressDelta: -5, satisfactionDelta: 3, skillDelta: 0, staminaDelta: 2 },
      target: { stressDelta: -5, satisfactionDelta: 3, skillDelta: 0, staminaDelta: 2 },
    },
    dialogues: [
      ['이번 거래 대박이었어!', '우리 팀 최고!'],
      ['목표 수익률 달성!', '오예! 파이팅!'],
      ['하이파이브!', '짝!'],
      ['이번 분기 성과 대단해!', '모두 고생했어!'],
      ['우리 팀 실적 1등이래!', '진짜?! 대박!'],
      ['보너스 나온다!', '드디어!'],
      ['오늘 회식이다!', '좋아! 삼겹살 가자!'],
      ['프로젝트 성공적 마무리!', '다 함께 노력한 덕분이야'],
    ],
    emoji: '🎊',
  },
  {
    type: 'gossip',
    chance: 0.08,
    condition: (a) => a.traits?.includes('social') === true,
    effects: {
      initiator: { stressDelta: -2, satisfactionDelta: 1, skillDelta: 0, staminaDelta: 0 },
      target: { stressDelta: -1, satisfactionDelta: 1, skillDelta: 0, staminaDelta: 0 },
    },
    dialogues: [
      ['옆 팀 리더 이직한대', '헐 진짜? 어디로?'],
      ['대표님 오늘 기분 좋아 보여', '뭔가 좋은 소식 있나 봐'],
      ['신입 봤어? 엄청 열심히 하더라', '그러게, 대단해'],
      ['그 종목 추천한 애널 결국 맞았네', '역시 감이 좋아'],
      ['인사이동 소문 들었어?', '뭐?! 자세히 말해봐'],
      ['새 프로젝트 시작한다는데', '오 무슨 프로젝트?'],
      ['오늘 임원 회의가 길었대', '무슨 얘기 했을까...'],
      ['그 펀드매니저 이번에 대박 쳤대', '부럽다...'],
    ],
    emoji: '🤫',
  },
  {
    type: 'teaching_moment',
    chance: 0.12,
    condition: (a, b) => {
      const aLevel = a.level ?? 1
      const bLevel = b.level ?? 1
      return aLevel - bLevel > 5
    },
    effects: {
      initiator: { stressDelta: -1, satisfactionDelta: 4, skillDelta: 0.05, staminaDelta: -1 },
      target: { stressDelta: -2, satisfactionDelta: 3, skillDelta: 0.4, staminaDelta: 0 },
    },
    dialogues: [
      ['이 캔들 패턴 아는 거 있어?', '모닝스타... 인가요?'],
      ['볼린저 밴드 쓰는 법 알려줄게', '오 꼭 배우고 싶었어요!'],
      ['리스크 헤지 실전 케이스야', '이런 방법이 있었군요'],
      ['이건 나만의 분석 노하우인데', '비밀 알려주시는 건가요?'],
      ['실전에서는 이론이 다 통하진 않아', '경험이 중요하군요...'],
      ['포트폴리오 분산의 핵심이 뭔지 알아?', '상관계수... 인가요?'],
      ['시장이 급변할 때 대응법 알려줄게', '네! 듣고 있어요!'],
      ['손절은 이렇게 하는 거야', '감사합니다, 기억할게요'],
    ],
    emoji: '🎓',
  },
  {
    type: 'stress_support',
    chance: 0.15,
    condition: (_a, b) => (b.stress ?? 0) > 70,
    effects: {
      initiator: { stressDelta: -1, satisfactionDelta: 3, skillDelta: 0, staminaDelta: -1 },
      target: { stressDelta: -8, satisfactionDelta: 4, skillDelta: 0, staminaDelta: 2 },
    },
    dialogues: [
      ['힘들어 보여, 괜찮아?', '...고마워, 좀 나아졌어'],
      ['초콜릿 먹을래?', '앗, 고마워...'],
      ['산책 같이 갈래?', '그래, 바람 좀 쐬자'],
      ['너무 무리하지 마', '그래야 하는데...'],
      ['오늘 일찍 가, 내가 마무리할게', '진짜? 너무 고마워...'],
      ['힘들면 얘기해, 들어줄게', '...응, 고마워'],
      ['같이 커피 마시면서 잠깐 쉬자', '그러자, 잠깐만 쉬고 올게'],
      ['밤새 일한 거야? 건강 챙겨', '괜찮아, 이것만 끝내면...'],
    ],
    emoji: '💛',
  },

  /* ── 역할별 특수 상호작용 ── */

  {
    type: 'signal_sharing',
    chance: 0.09,
    condition: (a, b) =>
      (a.role === 'analyst' && b.role === 'trader') ||
      (a.role === 'trader' && b.role === 'analyst'),
    effects: {
      initiator: { stressDelta: -1, satisfactionDelta: 2, skillDelta: 0.15, staminaDelta: 0 },
      target: { stressDelta: -1, satisfactionDelta: 2, skillDelta: 0.15, staminaDelta: 0 },
    },
    dialogues: [
      ['이 종목 시그널 나왔어, 확인해봐', '오 고마워, 바로 볼게'],
      ['MACD 골든크로스 떴어', '알겠어, 진입 타이밍 잡을게'],
      ['이 섹터 과매도 시그널이야', '물량 준비해둘게'],
      ['거래량 터졌어, 주의해', '확인! 포지션 조정할게'],
      ['실적 서프라이즈 나올 것 같아', '매수 준비 해둘까?'],
      ['이 종목 분석 끝났어, 매수 추천', '고마워, 호가창 확인해볼게'],
      ['외국인 매도세가 심해, 조심해', '알았어, 손절라인 점검할게'],
      ['기술적 지지선이 무너졌어', '빠르게 포지션 정리해야겠다'],
    ],
    emoji: '📡',
  },
  {
    type: 'one_on_one',
    chance: 0.10,
    condition: (a, b) =>
      (a.role === 'manager' || a.role === 'hr_manager') &&
      b.role !== 'manager' && b.role !== 'hr_manager' && b.role !== 'ceo',
    effects: {
      initiator: { stressDelta: 1, satisfactionDelta: 2, skillDelta: 0, staminaDelta: -1 },
      target: { stressDelta: -3, satisfactionDelta: 3, skillDelta: 0.1, staminaDelta: 0 },
    },
    dialogues: [
      ['잠깐 면담 할까?', '네, 좋습니다'],
      ['요즘 업무는 어때?', '열심히 하고 있습니다'],
      ['성장 목표 얘기해보자', '네, 사실 고민이 있었어요'],
      ['이번 달 성과 같이 리뷰하자', '네, 준비해왔습니다'],
      ['커리어 방향 얘기해볼까?', '사실 여쭤보고 싶었어요'],
      ['어려운 점 있으면 말해', '솔직히 하나 있긴 해요...'],
      ['잘하고 있어, 계속 이렇게', '감사합니다, 더 노력할게요'],
      ['피드백 좀 줄게', '네, 말씀해주세요'],
    ],
    emoji: '👔',
  },
]

/* ── 역할 조합별 협업 보너스 ── */

function getRoleInteractionBonus(a: Employee, b: Employee): number {
  // analyst+analyst: 협업 시너지
  if (a.role === 'analyst' && b.role === 'analyst') return 0.05
  // analyst+trader: 시그널 공유 시너지
  if (
    (a.role === 'analyst' && b.role === 'trader') ||
    (a.role === 'trader' && b.role === 'analyst')
  ) return 0.03
  // manager+anyone: 면담 시너지
  if (a.role === 'manager' || a.role === 'hr_manager') return 0.02
  return 0
}

/* ── 쿨다운 관리 ── */

// 키: "initiatorId-targetId" → 마지막 상호작용 시간 (절대 틱)
const interactionCooldowns: Map<string, number> = new Map()
const COOLDOWN_HOURS = 50

function getCooldownKey(a: string, b: string): string {
  // 순서 무관 — 항상 작은 ID가 앞
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function isOnCooldown(a: string, b: string, currentTick: number): boolean {
  const key = getCooldownKey(a, b)
  const lastTick = interactionCooldowns.get(key)
  if (lastTick === undefined) return false
  return currentTick - lastTick < COOLDOWN_HOURS
}

function setCooldown(a: string, b: string, currentTick: number): void {
  interactionCooldowns.set(getCooldownKey(a, b), currentTick)
}

/* ── 메인 상호작용 체크 ── */

/**
 * 배치된 직원과 인접 직원 간 상호작용 체크
 * @param employee 대상 직원
 * @param neighbors 인접 직원 목록
 * @param currentTick 현재 절대 틱 (쿨다운용)
 * @returns 발생한 상호작용 목록 (0~N개)
 */
export function checkInteractions(
  employee: Employee,
  neighbors: Employee[],
  currentTick: number,
): Interaction[] {
  const results: Interaction[] = []

  for (const neighbor of neighbors) {
    if (isOnCooldown(employee.id, neighbor.id, currentTick)) continue

    // 역할 조합 보너스로 상호작용 확률 증가
    const roleBonus = getRoleInteractionBonus(employee, neighbor)

    for (const rule of INTERACTION_RULES) {
      const adjustedChance = rule.chance + roleBonus
      if (Math.random() > adjustedChance) continue
      if (!rule.condition(employee, neighbor)) continue

      const dialogue = rule.dialogues[Math.floor(Math.random() * rule.dialogues.length)]

      results.push({
        type: rule.type,
        initiatorId: employee.id,
        targetId: neighbor.id,
        initiatorName: employee.name,
        targetName: neighbor.name,
        effects: { ...rule.effects },
        dialogue,
        emoji: rule.emoji,
      })

      setCooldown(employee.id, neighbor.id, currentTick)
      break // 한 쌍당 한 번만
    }
  }

  return results
}

/* ── 직원 퇴사/해고 시 쿨다운 정리 ── */

export function cleanupInteractionCooldowns(employeeId: string): void {
  for (const key of interactionCooldowns.keys()) {
    if (key.includes(employeeId)) {
      interactionCooldowns.delete(key)
    }
  }
}

/* ── 리셋 ── */

export function resetInteractions(): void {
  interactionCooldowns.clear()
}

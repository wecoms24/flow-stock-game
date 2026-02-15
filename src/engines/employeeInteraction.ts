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
    ],
    emoji: '🫂',
  },
]

/* ── 쿨다운 관리 ── */

// 키: "initiatorId-targetId" → 마지막 상호작용 시간 (절대 틱)
const interactionCooldowns: Map<string, number> = new Map()
const COOLDOWN_TICKS = 100

function getCooldownKey(a: string, b: string): string {
  // 순서 무관 — 항상 작은 ID가 앞
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function isOnCooldown(a: string, b: string, currentTick: number): boolean {
  const key = getCooldownKey(a, b)
  const lastTick = interactionCooldowns.get(key)
  if (lastTick === undefined) return false
  return currentTick - lastTick < COOLDOWN_TICKS
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

    for (const rule of INTERACTION_RULES) {
      if (Math.random() > rule.chance) continue
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

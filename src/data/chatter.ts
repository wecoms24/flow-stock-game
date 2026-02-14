import type { Employee } from '../types'

/* ── Employee Chat Bubble System ── */

export interface ChatterTemplate {
  id: string
  category: 'market' | 'stress' | 'satisfaction' | 'trait' | 'random'
  condition: (employee: Employee) => boolean
  messages: string[]
  priority: number
  cooldownTicks: number
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

  // 랜덤
  {
    id: 'random_chat',
    category: 'random',
    condition: () => Math.random() < 0.008,
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
]

/* ── Chatter Selection ── */

const lastChatterTick: Record<string, number> = {}

/**
 * 직원별 말풍선 대사 선택
 * @returns 선택된 메시지 또는 null
 */
export function selectChatter(
  employee: Employee,
  currentTick: number,
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
  const message = template.messages[Math.floor(Math.random() * template.messages.length)]

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
}

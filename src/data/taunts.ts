export const PANIC_SELL_TAUNTS = [
  '손절이다! 더 떨어지기 전에!! 😱',
  '아... 이거 잘못 샀다... 😰',
  '제발 더 이상 떨어지지 마! 🙏',
  '물타기는 절대 안 해! 나가! 💸',
  '뉴스 보니까 망할 것 같은데... 📰💀',
]

export const RANK_UP_TAUNTS = [
  '올라간다! 올라가! 🚀',
  '이 정도면 프로 아니냐? 😎',
  '수익률 미쳤다 ㅋㅋㅋ 💰',
  '너희들 좀 따라와봐 🏃',
  '1등 가즈아! 🔥',
]

export const RANK_DOWN_TAUNTS = [
  '잠깐만... 왜 떨어져? 😨',
  '실수했나... 다시 생각해보자 🤔',
  '이게 왜 안 오르지? 📉',
  '운이 없었을 뿐이야... 🎲',
  '전략 수정이 필요해 📝',
]

export const OVERTAKE_PLAYER_TAUNTS = [
  '어? 내가 플레이어 넘었네? 😏',
  '이제부터가 진짜야! ⚡',
  '계속 이 자리 지킬게 💪',
  '뒤에서 잘 봐줘~ 👋',
  '추월 완료! 빠잉~ 🏎️',
]

export const CHAMPION_TAUNTS = [
  '나야말로 전설! 🏆👑',
  '1등의 자리는 외롭지 않아 😎',
  '이게 바로 실력이지 💎',
  '감히 누가 날 이기겠어? 🔥',
  '챔피언 등극! 🎉🎊',
]

/** 시간대별 대사 접두어 (선택적으로 붙음) */
const TIME_PREFIXES: Record<string, string[]> = {
  morning: ['오전에 벌써 ', '아침부터 '],
  lunch: ['점심시간인데 '],
  afternoon: ['오후장에서 '],
  closing: ['마감 직전에 ', '장 마감 전에 '],
}

function getTimePrefix(hour?: number): string {
  if (hour == null || Math.random() > 0.4) return '' // 60%는 기본 대사
  const key = hour <= 11 ? 'morning' : hour <= 12 ? 'lunch' : hour <= 16 ? 'afternoon' : 'closing'
  const prefixes = TIME_PREFIXES[key]
  return prefixes[Math.floor(Math.random() * prefixes.length)]
}

export function getRandomTaunt(
  type: 'panic' | 'rank_up' | 'rank_down' | 'overtake' | 'champion',
  hour?: number,
): string {
  const taunts = {
    panic: PANIC_SELL_TAUNTS,
    rank_up: RANK_UP_TAUNTS,
    rank_down: RANK_DOWN_TAUNTS,
    overtake: OVERTAKE_PLAYER_TAUNTS,
    champion: CHAMPION_TAUNTS,
  }

  const pool = taunts[type]
  const base = pool[Math.floor(Math.random() * pool.length)]
  const prefix = getTimePrefix(hour)
  return prefix ? `${prefix}${base}` : base
}

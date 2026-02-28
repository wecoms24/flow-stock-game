import type { TradingStyle } from '../types'

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

/** ✨ Core Values: 스타일별 도발 (라이벌 개성 강화) */
export type TauntType = 'panic' | 'rank_up' | 'rank_down' | 'overtake' | 'champion' | 'trade_brag'

export const STYLE_TAUNTS: Record<TradingStyle, Partial<Record<TauntType, string[]>>> = {
  aggressive: {
    rank_up: [
      '이 속도면 전부 먹는다 🦈',
      '공격이 최선의 방어! 🔥',
      '느린 놈은 죽어 ⚡',
      '내 수익률 봤어? 미쳤지? 💰',
    ],
    rank_down: [
      '잠깐 숨 고르는 거야 💢',
      '이건 전략적 후퇴야! 🎯',
      '다음 공격 준비 중... 🦈',
      '아직 안 끝났어 🔥',
    ],
    overtake: [
      '결국 내가 이기지 😏',
      '느려 터진 네가 나를 이겨? 🦈',
      '이게 진짜 투자야 ⚡',
      '자리 내놔. 여긴 내 자리야 💪',
    ],
    champion: [
      '나야말로 투자의 왕 👑🦈',
      '정상은 내 자리야 🏆',
      '모두 내 발밑이다 🔥',
    ],
    panic: [
      '하... 이건 쏜다! 전부! 😱',
      '말도 안 돼... 다 팔아! 💸',
      '이거 완전 물렸잖아... 🦈💀',
    ],
    trade_brag: [
      '{ticker} 대량 매수 완료 🦈',
      '{ticker}? 당연히 샀지 ⚡',
      '{sector} 섹터 올인! 이게 투자야 💰',
    ],
  },
  conservative: {
    rank_up: [
      '느리지만 꾸준하지 🐢',
      '시간이 답이다 📈',
      '인내는 쓰고 열매는 달다 🍎',
      '안전한 투자가 최고야 🛡️',
    ],
    rank_down: [
      '장기전에서는 내가 이긴다 📈',
      '일시적인 거야. 초조해하지 마 🐢',
      '배당이 있으니까 괜찮아 💰',
      '느려도 확실하게 🛡️',
    ],
    overtake: [
      '결국 시간이 증명하지 🐢',
      '급할 것 없어... 꾸준함의 승리 📈',
      '느려서 미안하지 않아 🛡️',
    ],
    champion: [
      '느림보가 1등이다! 🐢🏆',
      '꾸준함이 전설을 만든다 📈',
      '30년을 버텨낸 자가 웃는다 🛡️',
    ],
    panic: [
      '이건... 예상 밖이네 😰',
      '리스크 관리를 했어야 했는데... 🐢',
      '장기투자자도 이건 무섭다 😨',
    ],
    trade_brag: [
      '{ticker} 배당주 조용히 담았어 🐢',
      '{sector} 안전 자산 확보 완료 🛡️',
    ],
  },
  'trend-follower': {
    rank_up: [
      '파도가 왔어! 타자! 🏄',
      '트렌드는 친구야! 📊',
      '모멘텀 최고! 🌊',
      '올라타! 기회는 지금이야 🚀',
    ],
    rank_down: [
      '파도가 빠졌나... 다음 파도를 기다리자 🏄',
      '트렌드 전환인가? 🤔',
      '추세 반전... 적응해야지 📉',
      '다음 사이클은 내가 잡는다 🌊',
    ],
    overtake: [
      '파도 타고 왔어, 친구! 🏄',
      '트렌드를 읽으면 이기는 거야 📊',
      '나를 따라오려면 파도를 타! 🌊',
    ],
    champion: [
      '서핑 챔피언! 🏄🏆',
      '가장 큰 파도를 탄 자가 이긴다 🌊',
      '트렌드의 왕! 📊👑',
    ],
    panic: [
      '파도가 뒤집혔어! 😱',
      '이건 역파도... 빠져나가자 🌊💀',
      '트렌드 완전 반전! 매도! 🏄💸',
    ],
    trade_brag: [
      '{ticker} 상승 트렌드 포착! 🏄',
      '{sector} 모멘텀 최고야! 올라타! 🌊',
    ],
  },
  contrarian: {
    rank_up: [
      '역시 역발상이지 🐻',
      '남들이 팔 때 사는 거야 🔄',
      '공포가 기회다 📉➡️📈',
      '모두가 틀렸을 때 내가 맞아 😏',
    ],
    rank_down: [
      '아직 타이밍이 아닌 것뿐 🐻',
      '곰 시장이 올 때까지 기다린다 📉',
      '시장은 항상 과잉반응하니까 🤷',
      '역발상은 인내가 필요해 ⏳',
    ],
    overtake: [
      '결국 시장은 내 편이었어 🐻',
      '모두가 웃을 때 나만 울었지만... 이제 내 차례 😏',
      '역발상의 승리 🔄',
    ],
    champion: [
      '곰의 시대다! 🐻🏆',
      '모두가 틀렸고 나만 맞았다 👑',
      '역발상으로 정상에 섰다 🔄',
    ],
    panic: [
      '곰 시장이다. 모두 죽는다 🐻💀',
      '이건 나도 못 버틴다... 😨',
      '하락장인 줄 알았는데 폭락이야 📉',
    ],
    trade_brag: [
      '{ticker} RSI 과매도... 역발상 매수 🐻',
      '{sector}? 다들 팔 때가 기회야 🔄',
    ],
  },
}

/** ✨ Core Values: 엔딩 최종 대사 (라이벌별) */
export const FINAL_QUOTES: Record<TradingStyle, { win: string[]; lose: string[] }> = {
  aggressive: {
    win: [
      '결국 공격이 최선의 방어였다 🦈',
      '속도와 결단력이 승리의 열쇠지 ⚡',
      '이기는 건 언제나 짜릿해! 🏆',
    ],
    lose: [
      '다음엔 반드시 이긴다... 🔥',
      '인정하기 싫지만... 대단하군 😤',
      '나를 이기다니... 오래 기억하겠어 🦈',
    ],
  },
  conservative: {
    win: [
      '느리지만 확실하게. 이것이 정도야 🐢',
      '30년의 인내가 보상받았다 📈',
      '시간은 결국 내 편이었어 🛡️',
    ],
    lose: [
      '당신의 방법도 통하는군... 인정해 🐢',
      '꾸준히 했지만 이번엔 부족했어 📊',
      '다음에는 30년 더 꾸준히 하겠어 😌',
    ],
  },
  'trend-follower': {
    win: [
      '가장 큰 파도를 탄 건 나야! 🏄🏆',
      '트렌드를 읽는 자가 세상을 읽는다 📊',
      '모멘텀의 승리! 기분 좋다! 🌊',
    ],
    lose: [
      '다음 파도는 내가 잡는다! 🏄',
      '이번 사이클은 네 거였어, 친구 🌊',
      '함께 즐거웠어! 다음에 또 대결하자 😄',
    ],
  },
  contrarian: {
    win: [
      '모두가 틀렸고, 나만 맞았다 🐻👑',
      '역발상이야말로 진정한 투자 철학 🔄',
      '곰도 웃을 수 있다는 걸 증명했어 😏',
    ],
    lose: [
      '이 게임은 운이다. 우리는 모두 졌다 🐻',
      '시장은 비합리적으로 오래 갈 수 있으니까... 📉',
      '다음 곰시장에서 보자 😤',
    ],
  },
}

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

/**
 * 랜덤 도발 메시지 선택
 * @param style 옵션: AI 트레이딩 스타일 (제공 시 스타일별 대사 우선)
 */
export function getRandomTaunt(
  type: 'panic' | 'rank_up' | 'rank_down' | 'overtake' | 'champion',
  hour?: number,
  style?: TradingStyle,
): string {
  // 스타일별 대사가 있으면 70% 확률로 사용
  if (style && Math.random() < 0.7) {
    const styleTaunts = STYLE_TAUNTS[style]?.[type]
    if (styleTaunts && styleTaunts.length > 0) {
      const base = styleTaunts[Math.floor(Math.random() * styleTaunts.length)]
      const prefix = getTimePrefix(hour)
      return prefix ? `${prefix}${base}` : base
    }
  }

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

/**
 * ✨ Core Values: 맥락적 거래 도발 메시지
 * AI가 거래 후 종목/섹터를 언급하는 대사
 */
export function getContextualTradeTaunt(
  style: TradingStyle,
  context: { ticker?: string; sector?: string },
): string | null {
  const templates = STYLE_TAUNTS[style]?.trade_brag
  if (!templates || templates.length === 0) return null

  let msg = templates[Math.floor(Math.random() * templates.length)]
  msg = msg.replace('{ticker}', context.ticker ?? '???')
  msg = msg.replace('{sector}', context.sector ?? '시장')
  return msg
}

/**
 * ✨ Core Values: 엔딩용 최종 대사 선택
 */
export function getFinalQuote(style: TradingStyle, playerWon: boolean): string {
  const quotes = FINAL_QUOTES[style]
  const pool = playerWon ? quotes.lose : quotes.win
  return pool[Math.floor(Math.random() * pool.length)]
}

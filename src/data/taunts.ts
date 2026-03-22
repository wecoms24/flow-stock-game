import type { TradingStyle, PlayerTauntResponse } from '../types'

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
  '어? 내가 {company} 넘었네? 😏',
  '이제부터가 진짜야! ⚡',
  '계속 이 자리 지킬게 💪',
  '{company}는 뒤에서 잘 봐줘~ 👋',
  '추월 완료! 빠잉~ 🏎️',
]

export const CHAMPION_TAUNTS = [
  '나야말로 전설! 🏆👑',
  '1등의 자리는 외롭지 않아 😎',
  '이게 바로 실력이지 💎',
  '감히 누가 날 이기겠어? 🔥',
  '챔피언 등극! 🎉🎊',
]

/** ✨ Core Values: 패배 인정 도발 (3연패 시 특수 대사) */
export const RIVAL_DEFEATED_TAUNTS = [
  '또 졌어... 인정할 수밖에 없군 😤',
  '3번이나 밀리다니... 대단해 👏',
  '이번엔 확실히 졌다. 다음엔 안 져! 🔥',
  '패배 인정! 하지만 끝까지 간다 💪',
  '연패 중... 전략을 바꿔야겠어 📝',
]

/** ✨ Core Values: 스타일별 도발 (라이벌 개성 강화) */
export type TauntType = 'panic' | 'rank_up' | 'rank_down' | 'overtake' | 'champion' | 'trade_brag' | 'big_trade' | 'rival_defeated' | 'player_reaction'

export const STYLE_TAUNTS: Record<TradingStyle, Partial<Record<TauntType, string[]>>> = {
  aggressive: {
    rank_up: [
      '이 속도면 전부 먹는다 🦈',
      '공격이 최선의 방어! 🔥',
      '느린 놈은 죽어 ⚡',
      '내 수익률 봤어? 미쳤지? 💰',
      '한발 늦으면 끝이야. 나는 이미 탔어 🦈💨',
      '주저하는 놈은 수익도 못 건져 🔥',
      '시장은 빠른 놈이 먹는 거야 ⚡💰',
    ],
    rank_down: [
      '잠깐 숨 고르는 거야 💢',
      '이건 전략적 후퇴야! 🎯',
      '다음 공격 준비 중... 🦈',
      '아직 안 끝났어 🔥',
      '한 번 물린 건 인정해. 근데 끝은 아냐 🦈',
      '이 정도로 날 꺾을 수 있을 것 같아? 💢',
    ],
    overtake: [
      '결국 내가 이기지 😏',
      '느려 터진 네가 나를 이겨? 🦈',
      '이게 진짜 투자야 ⚡',
      '자리 내놔. 여긴 내 자리야 💪',
      '추월은 예고 없이 오는 거야 🦈💨',
      '네 뒤통수가 잘 보여 😏',
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
    big_trade: [
      '🦈 {ticker} {amount} 베팅! 이게 진짜 큰 손이야',
      '⚡ {ticker}에 올인 수준으로 갔다! 나를 따라올 수 있겠어?',
      '💰 {ticker} 대규모 포지션 구축 완료. 두고 봐',
    ],
    rival_defeated: [
      '3연패라고? 잠깐 숨 고르는 거야! 🦈🔥',
      '인정한다... 하지만 상어는 포기하지 않아 🦈',
      '패배 인정! 더 세게 공격할 준비 중 ⚡',
    ],
    player_reaction: [
      '나도 {ticker} 갖고 있는데? 어디 한번 붙어보자 🦈',
      '{ticker} 매수? 느려. 난 이미 탔어 ⚡',
      '내 영역에 들어왔군? 각오해 🔥',
      '큰 판을 벌이는군! 배짱은 인정 💪',
      '{ticker} 포기? 더 살 수 있겠네 😏',
    ],
  },
  conservative: {
    rank_up: [
      '느리지만 꾸준하지 🐢',
      '시간이 답이다 📈',
      '인내는 쓰고 열매는 달다 🍎',
      '안전한 투자가 최고야 🛡️',
      '복리의 마법을 아는 자만이 웃는다 🐢📈',
      '하루 1%씩이면 1년 후엔... 😌',
      '느린 게 아니라 신중한 거야 🛡️💎',
    ],
    rank_down: [
      '장기전에서는 내가 이긴다 📈',
      '일시적인 거야. 초조해하지 마 🐢',
      '배당이 있으니까 괜찮아 💰',
      '느려도 확실하게 🛡️',
      '나무를 심은 사람은 기다릴 줄 알아야 해 🌳',
      '단기 등락에 흔들리면 지는 거야 🐢',
    ],
    overtake: [
      '결국 시간이 증명하지 🐢',
      '급할 것 없어... 꾸준함의 승리 📈',
      '느려서 미안하지 않아 🛡️',
      '거북이가 토끼를 이기는 건 당연한 일 🐢🏆',
      '안정적으로 쌓아온 결과야 📊',
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
    big_trade: [
      '🐢 {ticker} {amount} 규모로 조용히 담았어. 장기 투자야',
      '🛡️ {ticker} {amount} 대량 매집 완료. 느리지만 확실하지',
    ],
    rival_defeated: [
      '3번 졌지만... 장기전은 아직이야 🐢',
      '인내심으로 버틸게. 인정은 한다 📈',
      '느려도 끝까지 간다. 기다려봐 🛡️',
    ],
    player_reaction: [
      '{ticker}? 좋은 종목이지. 나도 오래 들고 있어 🐢',
      '급하게 사지 마. 장기적으로 봐야지 📈',
      '내 영역이긴 한데... 같이 가자 🛡️',
      '성급한 매매는 독이야. 천천히 해 🐢',
      '{ticker} 손절? 아까운데... 🤔',
    ],
  },
  'trend-follower': {
    rank_up: [
      '파도가 왔어! 타자! 🏄',
      '트렌드는 친구야! 📊',
      '모멘텀 최고! 🌊',
      '올라타! 기회는 지금이야 🚀',
      '이동평균선이 골든크로스! 안 타면 바보 🏄✨',
      '거래량이 말해주잖아. 올라간다! 📊🔥',
      '추세 추종의 정석을 보여주지 🌊',
    ],
    rank_down: [
      '파도가 빠졌나... 다음 파도를 기다리자 🏄',
      '트렌드 전환인가? 🤔',
      '추세 반전... 적응해야지 📉',
      '다음 사이클은 내가 잡는다 🌊',
      '파도 사이 잠잠한 구간일 뿐이야 🏄',
      '데드크로스도 기회의 신호야 📉🔄',
    ],
    overtake: [
      '파도 타고 왔어, 친구! 🏄',
      '트렌드를 읽으면 이기는 거야 📊',
      '나를 따라오려면 파도를 타! 🌊',
      '추세의 힘을 믿어! 서핑 타임! 🏄💨',
      '이 모멘텀은 아무도 못 막아 🌊⚡',
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
    big_trade: [
      '🏄 {ticker} {amount} 규모 서핑 시작! 이 파도는 크다',
      '🌊 {ticker} {amount} 대량 매수! 트렌드가 말해주고 있어',
    ],
    rival_defeated: [
      '파도를 잘못 탔나... 3연패 인정 🏄',
      '다음 파도에서 반드시 역전한다! 🌊',
      '트렌드를 놓쳤어... 하지만 끝이 아냐 📊',
    ],
    player_reaction: [
      '{ticker} 매수? 트렌드 따라가는 거야? 🏄',
      '모멘텀이 살아있네. 같이 파도 타자 🌊',
      '내가 먼저 탄 종목인데! 뒤따라오는구나 📊',
      '매도? 파도가 아직 안 끝났는데 🏄‍♂️',
      '좋은 타이밍이야! 흐름을 읽었네 🌊',
    ],
  },
  contrarian: {
    rank_up: [
      '역시 역발상이지 🐻',
      '남들이 팔 때 사는 거야 🔄',
      '공포가 기회다 📉➡️📈',
      '모두가 틀렸을 때 내가 맞아 😏',
      '과매도 구간에서 줍줍한 보람이 있네 🐻💰',
      'RSI 30 밑에서 산 건 나뿐이었지 🔄📈',
      '시장이 공포에 떨 때가 진짜 기회야 😏',
    ],
    rank_down: [
      '아직 타이밍이 아닌 것뿐 🐻',
      '곰 시장이 올 때까지 기다린다 📉',
      '시장은 항상 과잉반응하니까 🤷',
      '역발상은 인내가 필요해 ⏳',
      '지금은 시장이 비이성적이야. 곧 돌아온다 🐻',
      '모두가 흥분할 때 냉정함이 무기지 🔄',
    ],
    overtake: [
      '결국 시장은 내 편이었어 🐻',
      '모두가 웃을 때 나만 울었지만... 이제 내 차례 😏',
      '역발상의 승리 🔄',
      '군중과 반대로 간 보상이 왔어 🐻🏆',
      '다들 팔았을 때 산 주식이 빛나는 순간 🔄✨',
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
    big_trade: [
      '🐻 {ticker} {amount} 역발상 매수! 다들 팔 때가 기회지',
      '🔄 {ticker} {amount} 대량 매집. 모두가 공포에 떨 때 사는 거야',
    ],
    rival_defeated: [
      '역발상도 3번 틀리면... 인정해야지 🐻',
      '시장이 내 편이 아니었나... 다음엔 보자 🔄',
      '곰도 울 때가 있는 법이야 😤',
    ],
    player_reaction: [
      '다들 살 때 {ticker} 매수? 나라면 반대로 갈 텐데 🐻',
      '{ticker}? 과열 아닌가? 조심해 🔄',
      '남들이 다 파는 종목이라... 오히려 좋아! 😏',
      '손절 잘했어. 하지만 내겐 기회야 🐻',
      '내 영역에서 역발상 매매? 재밌는 녀석이군 🔄',
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
  type: 'panic' | 'rank_up' | 'rank_down' | 'overtake' | 'champion' | 'rival_defeated',
  hour?: number,
  style?: TradingStyle,
  playerCompanyName?: string,
): string {
  // 스타일별 대사가 있으면 70% 확률로 사용
  if (style && Math.random() < 0.7) {
    const styleTaunts = STYLE_TAUNTS[style]?.[type]
    if (styleTaunts && styleTaunts.length > 0) {
      const base = styleTaunts[Math.floor(Math.random() * styleTaunts.length)]
      const prefix = getTimePrefix(hour)
      const raw = prefix ? `${prefix}${base}` : base
      return raw.replace(/\{company\}/g, playerCompanyName ?? '플레이어')
    }
  }

  const taunts = {
    panic: PANIC_SELL_TAUNTS,
    rank_up: RANK_UP_TAUNTS,
    rank_down: RANK_DOWN_TAUNTS,
    overtake: OVERTAKE_PLAYER_TAUNTS,
    champion: CHAMPION_TAUNTS,
    rival_defeated: RIVAL_DEFEATED_TAUNTS,
  }

  const pool = taunts[type]
  const base = pool[Math.floor(Math.random() * pool.length)]
  const prefix = getTimePrefix(hour)
  const raw = prefix ? `${prefix}${base}` : base
  return raw.replace(/\{company\}/g, playerCompanyName ?? '플레이어')
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
 * ✨ Core Values: 대량 거래 알림 메시지
 */
export function getBigTradeTaunt(
  style: TradingStyle,
  context: { ticker: string; amount: string },
): string {
  const templates = STYLE_TAUNTS[style]?.big_trade
  if (!templates || templates.length === 0) return `${context.ticker} 대량 거래!`

  let msg = templates[Math.floor(Math.random() * templates.length)]
  msg = msg.replace('{ticker}', context.ticker)
  msg = msg.replace('{amount}', context.amount)
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

/* ── Player Taunt Response System ── */

/** 플레이어 응답 버튼 라벨 */
export const PLAYER_RESPONSE_LABELS: Record<PlayerTauntResponse, string> = {
  confident: '자신감 💪',
  dismissive: '무시 😒',
  humble: '겸손 🙏',
}

/** 플레이어 응답 메시지 템플릿 */
export const PLAYER_RESPONSE_TEMPLATES: Record<PlayerTauntResponse, string[]> = {
  confident: [
    '두고 봐라! 끝에 웃는 자가 진짜 승자야! 🔥',
    '그 정도로는 부족해. 내 실력을 보여주지! 💪',
    '재밌네? 결과로 말해줄게! ⚡',
    '아직 시작도 안 했어. 기다려봐! 😎',
  ],
  dismissive: [
    '...알겠어. 🙄',
    '그래, 그래... 바쁘니까. 😒',
    '들었어. 다음은? 🤷',
    '...좋은 하루 보내. 👋',
  ],
  humble: [
    '좋은 조언이네요. 배우겠습니다! 🙏',
    '대단하시네요... 저도 더 노력할게요! 📝',
    '인정합니다. 많이 배워야죠! 😊',
    '감사합니다. 참고하겠습니다! 🙇',
  ],
}

/**
 * 플레이어 응답 메시지 선택
 */
export function getPlayerResponseMessage(response: PlayerTauntResponse): string {
  const templates = PLAYER_RESPONSE_TEMPLATES[response]
  return templates[Math.floor(Math.random() * templates.length)]
}

/** 플레이어 응답에 따른 효과 지속 시간 (hours) */
export const PLAYER_RESPONSE_EFFECT_DURATION: Record<PlayerTauntResponse, number> = {
  confident: 50,
  dismissive: 0,
  humble: 100,
}

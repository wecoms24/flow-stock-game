/**
 * Employee Testimonials
 *
 * 엔딩 회고 시 직원 증언 메시지 생성
 * 역할, 근속 기간, 감정 상태, 성격에 따라 다른 메시지
 */

import type { EmotionalState } from '../types/employeeBio'

const ROLE_TESTIMONIALS: Record<string, string[]> = {
  analyst: [
    'CEO님의 리서치 방향이 항상 옳았어요. 덕분에 좋은 종목을 많이 발견했습니다.',
    '이 회사에서 시장 분석의 기초를 배웠어요. 감사합니다.',
    '차트와 숫자 속에서 진짜 가치를 찾는 법을 배웠어요.',
    '리서치 보고서 쓰면서 보낸 시간이 가장 보람있었어요.',
  ],
  trader: [
    'CEO님이 없었다면 난 그냥 개미였을 거예요. 믿어줘서 고마워요.',
    '매수 타이밍을 잡는 감각, 여기서 배웠습니다.',
    '수없이 많은 거래를 했지만 후회는 없어요.',
    '손절의 아픔도, 대박의 기쁨도... 모두 소중한 경험이었어요.',
  ],
  manager: [
    '팀을 이끌면서 성장할 수 있었어요. 기회를 주셔서 감사합니다.',
    '리스크 관리의 중요성을 뼈저리게 배웠습니다.',
    '좋은 팀원들과 함께할 수 있어서 행운이었어요.',
    '제안서 검토하면서 보낸 밤들... 힘들었지만 보람있었어요.',
  ],
}

const TENURE_TEMPLATES: Record<string, string[]> = {
  short: [ // < 36 months
    '짧은 시간이었지만 많이 배웠어요.',
    '더 오래 함께하고 싶었는데... 좋은 추억이에요.',
  ],
  medium: [ // 36-120 months
    '{years}년 동안 함께해서 정말 좋았습니다.',
    '이 회사와 함께 성장했어요. {years}년이 순식간이었네요.',
  ],
  long: [ // > 120 months
    'CEO님과 함께한 {years}년, 매일이 도전이었지만 후회 없어요.',
    '{years}년... 인생의 절반을 이 회사에 바쳤는데, 자랑스러워요.',
    '이 회사의 역사가 곧 제 역사입니다. {years}년을 함께했으니까요.',
  ],
}

const EMOTION_SUFFIXES: Record<EmotionalState, string[]> = {
  happy: ['앞으로도 좋은 일만 가득하길! 😊', '정말 행복한 시간이었어요 💛'],
  content: ['만족스러운 여정이었습니다 🙂', '좋은 기억으로 남겠습니다 ✨'],
  neutral: ['좋은 경험이었습니다.', '감사합니다.'],
  anxious: ['걱정이 많았지만... 결국 잘 됐네요 😅', '불안했지만 버텨냈어요'],
  stressed: ['힘든 날도 많았지만... 결국 여기까지 왔네요', '스트레스가 많았지만 성장했어요'],
  burned_out: ['솔직히 힘들었어요. 하지만 의미 있었습니다.', '번아웃이 왔지만... 그래도 보람있었어요'],
  excited: ['다음 도전이 기대돼요! 🔥', '흥분되는 나날들이었어요!'],
  proud: ['이 회사의 일원이었다는 게 자랑스러워요 😎', '함께 이룬 성과가 자랑스럽습니다'],
}

/**
 * 직원 증언 메시지 생성
 */
export function generateTestimonial(
  role: string,
  monthsEmployed: number,
  emotion: EmotionalState,
  _personality: string,
): string {
  const years = Math.floor(monthsEmployed / 12)

  // Role-specific message
  const roleMessages = ROLE_TESTIMONIALS[role] ?? ROLE_TESTIMONIALS.trader
  const roleMsg = roleMessages[Math.floor(Math.random() * roleMessages.length)]

  // Tenure-based message
  const tenureKey = monthsEmployed < 36 ? 'short' : monthsEmployed < 120 ? 'medium' : 'long'
  const tenureMessages = TENURE_TEMPLATES[tenureKey]
  let tenureMsg = tenureMessages[Math.floor(Math.random() * tenureMessages.length)]
  tenureMsg = tenureMsg.replace('{years}', String(years))

  // Emotion suffix
  const suffixes = EMOTION_SUFFIXES[emotion] ?? EMOTION_SUFFIXES.neutral
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

  return `${roleMsg} ${tenureMsg} ${suffix}`
}

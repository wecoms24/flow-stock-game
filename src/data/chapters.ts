import type { Chapter } from '../types/chapter'

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '창업기',
    yearRange: [1995, 1999],
    description:
      '1995년, 당신은 작은 투자운용사를 설립했습니다. IMF 외환위기의 폭풍이 다가오고 있지만, 이 위기를 기회로 바꿀 수 있을까요?',
    objectives: [
      {
        id: 'ch1_survive',
        label: '파산하지 않기',
        description: '1999년까지 현금 잔고를 양수로 유지',
      },
      {
        id: 'ch1_employees',
        label: '직원 2명 유지',
        description: '직원 수를 2명 이상 유지',
        targetValue: 2,
      },
    ],
    unlockedFeatures: ['주식 매매', '직원 채용', '사무실 관리'],
  },
  {
    id: 2,
    name: '닷컴 시대',
    yearRange: [2000, 2004],
    description:
      '새 천년이 밝았지만, 닷컴 버블이 터지기 시작합니다. IT 주식의 급락 속에서 당신의 투자 전략이 시험대에 오릅니다.',
    objectives: [
      {
        id: 'ch2_networth',
        label: '순자산 5억 달성',
        description: '총 자산(현금 + 포트폴리오)이 5억 원을 돌파',
        targetValue: 500_000_000,
      },
      {
        id: 'ch2_profit',
        label: '연간 수익 달성',
        description: '한 해 동안 총 자산이 증가하는 해를 만들기',
      },
    ],
    unlockedFeatures: ['AI 트레이드 파이프라인', '기업 스킬'],
  },
  {
    id: 3,
    name: '성장기',
    yearRange: [2005, 2009],
    description:
      '글로벌 경제가 성장하지만, 2008년 서브프라임 모기지 위기가 세계를 뒤흔듭니다. 직원들과 함께 이 폭풍을 헤쳐나가세요.',
    objectives: [
      {
        id: 'ch3_employees',
        label: '직원 5명 확보',
        description: '팀을 5명 이상으로 성장',
        targetValue: 5,
      },
      {
        id: 'ch3_positive',
        label: '수익률 양수 유지',
        description: '챕터 종료 시 총 자산이 챕터 시작 시보다 높게 유지',
      },
    ],
    unlockedFeatures: ['교육 시스템', '이벤트 체인'],
  },
  {
    id: 4,
    name: '회복기',
    yearRange: [2010, 2014],
    description:
      '위기 이후 시장이 서서히 회복됩니다. 유럽 재정위기의 여파 속에서 경쟁자들을 앞서나갈 때입니다.',
    objectives: [
      {
        id: 'ch4_ranking',
        label: '경쟁자 1명 이상 앞서기',
        description: '자산 순위에서 AI 경쟁자 최소 1명보다 높은 순위 달성',
      },
      {
        id: 'ch4_office',
        label: '사무실 확장',
        description: '사무실 레벨 2 이상 달성',
        targetValue: 2,
      },
    ],
    unlockedFeatures: ['M&A 시스템', '월간 카드'],
  },
  {
    id: 5,
    name: '골드러시',
    yearRange: [2015, 2019],
    description:
      '4차 산업혁명과 함께 테크 주식이 폭발적으로 성장합니다. 이 황금기를 최대한 활용하세요!',
    objectives: [
      {
        id: 'ch5_networth_half',
        label: '목표 자산 50% 달성',
        description: '최종 목표 자산의 절반을 달성',
      },
      {
        id: 'ch5_skills',
        label: '기업 스킬 3개 해금',
        description: '기업 지식자산을 3개 이상 해금',
        targetValue: 3,
      },
    ],
    unlockedFeatures: ['경제 압박 시스템'],
  },
  {
    id: 6,
    name: '엔딩',
    yearRange: [2020, 2025],
    description:
      '코로나 팬데믹과 동학개미 운동... 마지막 5년입니다. 최종 엔딩 조건을 향해 모든 것을 쏟아부으세요!',
    objectives: [
      {
        id: 'ch6_ending',
        label: '최종 엔딩 조건 달성',
        description: '게임 종료 시 긍정적 엔딩 달성',
      },
      {
        id: 'ch6_top_rank',
        label: '순위 1위 도전',
        description: '자산 순위 1위 달성',
      },
    ],
  },
]

/** 연도로 해당 챕터 찾기 */
export function getChapterByYear(year: number): Chapter | undefined {
  return CHAPTERS.find((ch) => year >= ch.yearRange[0] && year <= ch.yearRange[1])
}

/** 연도로 챕터 번호 반환 */
export function getChapterNumber(year: number): number {
  const ch = getChapterByYear(year)
  return ch?.id ?? 1
}

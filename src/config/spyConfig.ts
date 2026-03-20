export const SPY_CONFIG = {
  TIERS: {
    basic: {
      cost: 500000,           // 50만
      duration: 48,           // 48시간 (약 5일)
      failRate: 0.10,         // 10% 실패
      lawsuitRate: 0.05,      // 실패 시 소송 확률 50%
      lawsuitPenaltyRate: 0.05, // 자산 5% 배상
      intelDuration: 720,     // 정보 유효기간 720시간 (3개월)
      revealPortfolio: true,
      revealTrades: false,
      revealStrategy: false,
      revealAssets: false,
    },
    advanced: {
      cost: 2000000,          // 200만
      duration: 96,           // 96시간 (약 10일)
      failRate: 0.25,
      lawsuitRate: 0.10,
      lawsuitPenaltyRate: 0.10,
      intelDuration: 480,
      revealPortfolio: true,
      revealTrades: true,
      revealStrategy: false,
      revealAssets: true,
    },
    deep: {
      cost: 5000000,          // 500만
      duration: 168,          // 168시간 (약 17일)
      failRate: 0.40,
      lawsuitRate: 0.15,
      lawsuitPenaltyRate: 0.15,
      intelDuration: 240,
      revealPortfolio: true,
      revealTrades: true,
      revealStrategy: true,
      revealAssets: true,
    },
  },
  COOLDOWN_PER_TARGET: 360,   // 같은 대상 재정탐 쿨다운 360시간
  MAX_CONCURRENT_MISSIONS: 2, // 동시 진행 최대 2개
  PROCESS_INTERVAL: 10,       // 10시간마다 미션 진행 처리
} as const

# Quickstart: Employee Interaction-based Trade AI Pipeline

**Feature Branch**: `001-employee-trade-ai`
**Date**: 2026-02-15

## Prerequisites

- Node.js 18+
- npm 9+
- 프로젝트 클론 및 `npm install` 완료

## Setup

```bash
git checkout 001-employee-trade-ai
npm install
npm run dev
```

## Feature Overview

직원 역할(Analyst/Manager/Trader)이 자동으로 매매 의사결정 파이프라인을 수행합니다:

```
Analyst (10틱) → TradeProposal(PENDING)
Manager (5틱)  → APPROVED / REJECTED
Trader  (1틱)  → EXECUTED / FAILED
```

## Quick Test

1. 게임 시작 (아무 난이도)
2. 사무실 창 열기
3. 직원 고용: Analyst 1명, Manager 1명, Trader 1명
4. 직원을 사무실 그리드에 인접하게 배치
5. 게임 속도 4x로 설정
6. 사무실 창에서 말풍선 관찰:
   - Analyst: "발견! [종목] 매수 추천합니다!"
   - Manager: "승인. 진행시켜."
   - Trader: "체결 완료! 나이스!"
7. 포트폴리오 창에서 자동 매매 결과 확인

## Key Files

```
src/
├── types/
│   └── trade.ts                    # TradeProposal, ProposalStatus 타입
├── config/
│   └── tradeAIConfig.ts            # 파이프라인 설정값
├── utils/
│   └── technicalIndicators.ts      # RSI/MA 공통 유틸
├── engines/
│   └── tradePipeline/
│       ├── analystLogic.ts         # Analyst 분석 로직
│       ├── managerLogic.ts         # Manager 리스크 평가
│       ├── traderLogic.ts          # Trader 체결 로직
│       └── adjacencyBonus.ts       # 인접 배치 보너스
├── stores/
│   └── gameStore.ts                # proposals 상태 + 파이프라인 actions 추가
└── data/
    └── chatter.ts                  # 파이프라인 말풍선 템플릿 추가
```

## Verification Checklist

- [ ] `npm run build` 에러 없이 통과
- [ ] `npm run lint` 경고 없이 통과
- [ ] Analyst 배치 후 TradeProposal 생성 확인
- [ ] Manager 배치 후 승인/반려 동작 확인
- [ ] Trader 배치 후 체결 동작 확인
- [ ] Manager 없이 자동 승인 동작 확인
- [ ] 사무실 말풍선 표시 확인
- [ ] 세이브/로드 후 파이프라인 이어서 동작 확인
- [ ] 4x 속도에서 프레임 드랍 없음 확인

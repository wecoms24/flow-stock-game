export type IntegrationPhase = 'restructuring' | 'integration' | 'synergy' | 'complete'

export interface AcquiredCompanyState {
  companyId: string           // 인수된 회사 ID
  acquirerId: string          // 인수자 회사 ID
  dealPrice: number           // 인수 가격 (주당)
  playerShares: number        // 플레이어 보유 주식 수 (인수 시점)
  integrationProgress: number // 0~100
  phase: IntegrationPhase
  monthlyDividendYield: number // 분기 배당 수익률
  totalDividendsReceived: number
  events: AcquisitionEvent[]
  startTick: number
}

export interface AcquisitionEvent {
  id: string
  type: 'layoff' | 'incentive' | 'marketing' | 'scandal' | 'innovation' | 'merger_bonus'
  title: string
  description: string
  effect: {
    integrationDelta?: number   // 통합 진행도 변화
    dividendYieldDelta?: number // 배당 수익률 변화
    acquirerDriftDelta?: number // 인수자 주가 drift 변화
  }
  occurredAt: number  // tick
}

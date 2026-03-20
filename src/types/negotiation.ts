export interface RhythmNote {
  lane: 0 | 1 | 2 | 3 // 4레인 (← ↑ ↓ →)
  time: number // 노트 도착 시각 (ms, 게임 시작부터)
  hit?: 'perfect' | 'good' | 'miss'
}

export interface NegotiationState {
  employeeId: string
  employeeName: string
  currentSalary: number
  demandedRaise: number // 요구 인상률 (0.05 = 5%)
  phase: 'intro' | 'rhythm' | 'result'
  rhythmNotes: RhythmNote[]
  score: number // 0~100
  startTime: number // rhythm game start timestamp (performance.now)
  result?: 'full' | 'partial' | 'rejected'
  finalRaise?: number // 최종 인상률
}

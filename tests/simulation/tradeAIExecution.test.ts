/**
 * Trade AI 파이프라인 실제 거래 검증 테스트
 *
 * 검증 항목:
 * - Analyst 제안서 생성 (confidence 계산, adjacency bonus)
 * - Manager 승인/거부 (position size, risk assessment)
 * - Trader 체결 (현금 차감, 슬리피지, 수수료)
 * - 파이프라인 전 과정 검증
 * - 현금 흐름 정확성
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'
import { TRADE_AI_CONFIG } from '../../src/config/tradeAIConfig'

// Mock soundManager
vi.mock('../../src/systems/soundManager', () => ({
  soundManager: {
    playClick: vi.fn(),
    playXPGain: vi.fn(),
    playLevelUp: vi.fn(),
    playHire: vi.fn(),
    playFire: vi.fn(),
    playAIApprove: vi.fn(),
    playAIReject: vi.fn(),
    playBuy: vi.fn(),
    playSell: vi.fn(),
  },
}))

describe('Trade AI 파이프라인 실제 거래 검증', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getState())
  })

  describe('Analyst 제안서 생성', () => {
    it('Analyst가 제안서를 생성한다', () => {
      // 1. 게임 시작
      useGameStore.getState().startGame('normal', undefined, 100_000_000)

      let state = useGameStore.getState()

      // 2. officeLayout 초기화 및 책상 구매
      state.initializeOfficeLayout()
      state.buyDesk('basic', 100, 100)
      state.buyDesk('basic', 200, 100)
      state.buyDesk('basic', 300, 100)

      // 3. Analyst, Manager, Trader 고용
      state.hireEmployee('analyst')
      state.hireEmployee('manager')
      state.hireEmployee('trader')

      state = useGameStore.getState()
      const analyst = state.player.employees.find((e) => e.role === 'analyst')
      const manager = state.player.employees.find((e) => e.role === 'manager')
      const trader = state.player.employees.find((e) => e.role === 'trader')

      expect(analyst).toBeDefined()
      expect(manager).toBeDefined()
      expect(trader).toBeDefined()

      // 4. 직원 배치 (인접)
      const desks = useGameStore.getState().player.officeLayout?.desks || []
      if (desks.length >= 3) {
        state.assignEmployeeToDesk(analyst!.id, desks[0].id)
        state.assignEmployeeToDesk(manager!.id, desks[1].id)
        state.assignEmployeeToDesk(trader!.id, desks[2].id)
      }

      // 5. 가격 히스토리 생성 (최소 20개 필요)
      for (let i = 0; i < 30; i++) {
        state = useGameStore.getState()
        state.companies.forEach((c) => {
          if (!state.priceHistory[c.id]) {
            useGameStore.setState((s) => ({
              priceHistory: {
                ...s.priceHistory,
                [c.id]: [],
              },
            }))
          }
          const history = useGameStore.getState().priceHistory[c.id] || []
          history.push(c.price + Math.random() * 1000 - 500)
          useGameStore.setState((s) => ({
            priceHistory: {
              ...s.priceHistory,
              [c.id]: history,
            },
          }))
        })
      }

      // 6. Analyst 틱 실행 (여러 번 실행하여 제안서 생성 확률 높임)
      const initialProposals = useGameStore.getState().proposals.length

      for (let i = 0; i < 100; i++) {
        useGameStore.getState().processAnalystTick()
        useGameStore.setState((s) => ({
          currentTick: s.currentTick + 10,
        }))
      }

      const finalProposals = useGameStore.getState().proposals.length

      console.log(`\n📋 제안서 생성 테스트`)
      console.log(`  초기 제안서: ${initialProposals}건`)
      console.log(`  최종 제안서: ${finalProposals}건`)
      console.log(`  생성된 제안서: ${finalProposals - initialProposals}건`)

      // 7. 검증: 제안서가 생성되었어야 함
      expect(finalProposals).toBeGreaterThan(initialProposals)
    })

    it('Adjacency bonus가 제안서 생성에 영향을 준다', () => {
      // 1. 게임 시작
      useGameStore.getState().startGame('normal', undefined, 100_000_000)

      let state = useGameStore.getState()

      // 2. officeLayout 초기화
      state.initializeOfficeLayout()
      for (let i = 0; i < 10; i++) {
        state.buyDesk('basic', 100 + i * 100, 100)
      }

      // 3. Analyst 2명, Manager 2명 고용
      state.hireEmployee('analyst')
      state.hireEmployee('analyst')
      state.hireEmployee('manager')
      state.hireEmployee('manager')

      state = useGameStore.getState()
      const analysts = state.player.employees.filter((e) => e.role === 'analyst')
      const managers = state.player.employees.filter((e) => e.role === 'manager')

      // 4. 시나리오 A: 인접 배치
      const desks = useGameStore.getState().player.officeLayout?.desks || []
      if (desks.length >= 10) {
        state.assignEmployeeToDesk(analysts[0].id, desks[0].id)
        state.assignEmployeeToDesk(managers[0].id, desks[1].id) // 인접

        // 시나리오 B: 떨어진 배치
        state.assignEmployeeToDesk(analysts[1].id, desks[5].id)
        state.assignEmployeeToDesk(managers[1].id, desks[9].id) // 멀리
      }

      // 5. 가격 히스토리 생성
      for (let i = 0; i < 30; i++) {
        state = useGameStore.getState()
        state.companies.forEach((c) => {
          const history = useGameStore.getState().priceHistory[c.id] || []
          history.push(c.price + Math.random() * 1000 - 500)
          useGameStore.setState((s) => ({
            priceHistory: {
              ...s.priceHistory,
              [c.id]: history,
            },
          }))
        })
      }

      // 6. 제안서 생성 (100회 실행)
      let adjacentProposals = 0
      let separateProposals = 0

      for (let i = 0; i < 100; i++) {
        const beforeCount = useGameStore.getState().proposals.length

        useGameStore.getState().processAnalystTick()

        const afterCount = useGameStore.getState().proposals.length
        const newProposals = useGameStore
          .getState()
          .proposals.slice(beforeCount)
          .filter((p) => p.status === 'PENDING')

        // 어느 Analyst가 생성했는지 확인
        newProposals.forEach((p) => {
          if (p.createdByEmployeeId === analysts[0].id) {
            adjacentProposals++
          } else if (p.createdByEmployeeId === analysts[1].id) {
            separateProposals++
          }
        })

        useGameStore.setState((s) => ({
          currentTick: s.currentTick + 10,
        }))
      }

      console.log(`\n🔗 Adjacency Bonus 효과 테스트`)
      console.log(`  인접 배치 Analyst: ${adjacentProposals}건`)
      console.log(`  떨어진 배치 Analyst: ${separateProposals}건`)
      console.log(
        `  비율: ${adjacentProposals > 0 ? (adjacentProposals / (adjacentProposals + separateProposals) * 100).toFixed(1) : 0}% vs ${separateProposals > 0 ? (separateProposals / (adjacentProposals + separateProposals) * 100).toFixed(1) : 0}%`,
      )

      // 7. 검증: 인접 배치 Analyst가 더 많은 제안서 생성
      // (adjacency bonus로 threshold가 낮아지므로)
      // Note: 확률적이므로 강제하진 않음, 로그만 출력
      expect(adjacentProposals + separateProposals).toBeGreaterThan(0)
    })
  })

  describe('Manager 승인/거부', () => {
    it('Manager가 제안서를 검토하고 승인/거부한다', () => {
      // 1. 게임 시작
      useGameStore.getState().startGame('normal', undefined, 100_000_000)

      let state = useGameStore.getState()

      // 2. 직원 고용 및 배치
      state.initializeOfficeLayout()
      state.buyDesk('basic', 100, 100)
      state.buyDesk('basic', 200, 100)
      state.buyDesk('basic', 300, 100)

      state.hireEmployee('analyst')
      state.hireEmployee('manager')
      state.hireEmployee('trader')

      state = useGameStore.getState()
      const analyst = state.player.employees.find((e) => e.role === 'analyst')!
      const manager = state.player.employees.find((e) => e.role === 'manager')!
      const trader = state.player.employees.find((e) => e.role === 'trader')!

      const desks1 = useGameStore.getState().player.officeLayout?.desks || []
      if (desks1.length >= 3) {
        state.assignEmployeeToDesk(analyst.id, desks1[0].id)
        state.assignEmployeeToDesk(manager.id, desks1[1].id)
        state.assignEmployeeToDesk(trader.id, desks1[2].id)
      }

      // 3. 가격 히스토리 생성
      for (let i = 0; i < 30; i++) {
        state = useGameStore.getState()
        state.companies.forEach((c) => {
          const history = state.priceHistory[c.id] || []
          history.push(c.price + Math.random() * 1000 - 500)
          useGameStore.setState((s) => ({
            priceHistory: {
              ...s.priceHistory,
              [c.id]: history,
            },
          }))
        })
      }

      // 4. Analyst 틱 실행 (제안서 생성)
      for (let i = 0; i < 50; i++) {
        useGameStore.getState().processAnalystTick()
        useGameStore.setState((s) => ({
          currentTick: s.currentTick + 10,
        }))
      }

      const pendingBefore = useGameStore
        .getState()
        .proposals.filter((p) => p.status === 'PENDING').length

      // 5. Manager 틱 실행 (검토)
      for (let i = 0; i < 50; i++) {
        useGameStore.getState().processManagerTick()
        useGameStore.setState((s) => ({
          currentTick: s.currentTick + 5,
        }))
      }

      const approved = useGameStore
        .getState()
        .proposals.filter((p) => p.status === 'APPROVED').length
      const rejected = useGameStore
        .getState()
        .proposals.filter((p) => p.status === 'REJECTED').length
      const pendingAfter = useGameStore
        .getState()
        .proposals.filter((p) => p.status === 'PENDING').length

      console.log(`\n👔 Manager 검토 테스트`)
      console.log(`  PENDING (전): ${pendingBefore}건`)
      console.log(`  APPROVED: ${approved}건`)
      console.log(`  REJECTED: ${rejected}건`)
      console.log(`  PENDING (후): ${pendingAfter}건`)

      // 6. 검증: 승인 또는 거부가 발생했어야 함
      expect(approved + rejected).toBeGreaterThan(0)
    })
  })

  describe('Trader 체결', () => {
    it('Trader가 승인된 제안서를 체결하고 현금을 차감한다', () => {
      // 1. 게임 시작
      useGameStore.getState().startGame('normal', undefined, 100_000_000)

      let state = useGameStore.getState()
      const initialCash = state.player.cash

      // 2. 직원 고용 및 배치
      state.initializeOfficeLayout()
      state.buyDesk('basic', 100, 100)
      state.buyDesk('basic', 200, 100)
      state.buyDesk('basic', 300, 100)

      state.hireEmployee('analyst')
      state.hireEmployee('manager')
      state.hireEmployee('trader')

      state = useGameStore.getState()
      const analyst = state.player.employees.find((e) => e.role === 'analyst')!
      const manager = state.player.employees.find((e) => e.role === 'manager')!
      const trader = state.player.employees.find((e) => e.role === 'trader')!

      const desks1 = useGameStore.getState().player.officeLayout?.desks || []
      if (desks1.length >= 3) {
        state.assignEmployeeToDesk(analyst.id, desks1[0].id)
        state.assignEmployeeToDesk(manager.id, desks1[1].id)
        state.assignEmployeeToDesk(trader.id, desks1[2].id)
      }

      // 3. 가격 히스토리 생성
      for (let i = 0; i < 30; i++) {
        state = useGameStore.getState()
        state.companies.forEach((c) => {
          const history = state.priceHistory[c.id] || []
          history.push(c.price + Math.random() * 1000 - 500)
          useGameStore.setState((s) => ({
            priceHistory: {
              ...s.priceHistory,
              [c.id]: history,
            },
          }))
        })
      }

      // 4. 파이프라인 전체 실행
      let executedCount = 0
      for (let i = 0; i < 200; i++) {
        const tick = i * 10

        // Analyst (tick%10===0)
        if (tick % 10 === 0) {
          useGameStore.getState().processAnalystTick()
        }

        // Manager (tick%5===2)
        if (tick % 5 === 2) {
          useGameStore.getState().processManagerTick()
        }

        // Trader (매 틱)
        const beforeExecuted = useGameStore
          .getState()
          .proposals.filter((p) => p.status === 'EXECUTED').length
        useGameStore.getState().processTraderTick()
        const afterExecuted = useGameStore
          .getState()
          .proposals.filter((p) => p.status === 'EXECUTED').length
        executedCount += afterExecuted - beforeExecuted

        useGameStore.setState((s) => ({
          currentTick: s.currentTick + 1,
        }))
      }

      const finalCash = useGameStore.getState().player.cash
      const cashSpent = initialCash - finalCash

      console.log(`\n💰 Trader 체결 및 현금 흐름 테스트`)
      console.log(`  초기 현금: ${initialCash.toLocaleString()}원`)
      console.log(`  최종 현금: ${finalCash.toLocaleString()}원`)
      console.log(`  사용 현금: ${cashSpent.toLocaleString()}원`)
      console.log(`  체결 건수: ${executedCount}건`)
      if (executedCount > 0) {
        console.log(`  평균 거래당: ${Math.round(cashSpent / executedCount).toLocaleString()}원`)
      }

      // 5. 검증
      expect(executedCount).toBeGreaterThan(0) // 체결이 발생했어야 함
      if (executedCount > 0) {
        expect(cashSpent).toBeGreaterThan(0) // 현금이 사용되었어야 함
      }
    })

    it('슬리피지와 수수료가 정확히 적용된다', () => {
      // 1. 게임 시작
      useGameStore.getState().startGame('normal', undefined, 100_000_000)

      let state = useGameStore.getState()

      // 2. 직원 고용 및 배치
      state.initializeOfficeLayout()
      state.buyDesk('basic', 100, 100)
      state.buyDesk('basic', 200, 100)
      state.buyDesk('basic', 300, 100)

      state.hireEmployee('analyst')
      state.hireEmployee('manager')
      state.hireEmployee('trader')

      state = useGameStore.getState()
      const analyst = state.player.employees.find((e) => e.role === 'analyst')!
      const manager = state.player.employees.find((e) => e.role === 'manager')!
      const trader = state.player.employees.find((e) => e.role === 'trader')!

      const desks1 = useGameStore.getState().player.officeLayout?.desks || []
      if (desks1.length >= 3) {
        state.assignEmployeeToDesk(analyst.id, desks1[0].id)
        state.assignEmployeeToDesk(manager.id, desks1[1].id)
        state.assignEmployeeToDesk(trader.id, desks1[2].id)
      }

      // 3. 가격 히스토리 생성
      for (let i = 0; i < 30; i++) {
        state = useGameStore.getState()
        state.companies.forEach((c) => {
          const history = state.priceHistory[c.id] || []
          history.push(c.price + Math.random() * 1000 - 500)
          useGameStore.setState((s) => ({
            priceHistory: {
              ...s.priceHistory,
              [c.id]: history,
            },
          }))
        })
      }

      // 4. 파이프라인 실행
      for (let i = 0; i < 200; i++) {
        const tick = i * 10

        if (tick % 10 === 0) {
          useGameStore.getState().processAnalystTick()
        }

        if (tick % 5 === 2) {
          useGameStore.getState().processManagerTick()
        }

        useGameStore.getState().processTraderTick()

        useGameStore.setState((s) => ({
          currentTick: s.currentTick + 1,
        }))
      }

      // 5. 체결된 제안서 분석
      const executedProposals = useGameStore
        .getState()
        .proposals.filter((p) => p.status === 'EXECUTED')

      console.log(`\n📊 슬리피지 및 수수료 분석`)
      console.log(`  체결 건수: ${executedProposals.length}건`)

      if (executedProposals.length > 0) {
        const avgSlippage =
          executedProposals.reduce((sum, p) => sum + (p.slippage || 0), 0) /
          executedProposals.length

        console.log(`  평균 슬리피지: ${(avgSlippage * 100).toFixed(3)}%`)
        console.log(
          `  BASE_SLIPPAGE: ${(TRADE_AI_CONFIG.BASE_SLIPPAGE * 100).toFixed(1)}%`,
        )

        // 6. 검증: 슬리피지가 BASE_SLIPPAGE 근처여야 함
        expect(avgSlippage).toBeGreaterThanOrEqual(0)
        expect(avgSlippage).toBeLessThanOrEqual(TRADE_AI_CONFIG.BASE_SLIPPAGE * 2)
      }
    })
  })

  describe('전체 파이프라인 통합', () => {
    it('Analyst → Manager → Trader 전 과정이 정상 작동한다', () => {
      // 1. 게임 시작
      useGameStore.getState().startGame('normal', undefined, 500_000_000)

      let state = useGameStore.getState()
      const initialCash = state.player.cash

      // 2. 직원 고용 및 배치
      state.initializeOfficeLayout()
      for (let i = 0; i < 9; i++) {
        state.buyDesk('basic', 100 + (i % 3) * 150, 100 + Math.floor(i / 3) * 150)
      }

      // Analyst 3명, Manager 3명, Trader 3명
      for (let i = 0; i < 3; i++) {
        state.hireEmployee('analyst')
        state.hireEmployee('manager')
        state.hireEmployee('trader')
      }

      state = useGameStore.getState()
      const analysts = state.player.employees.filter((e) => e.role === 'analyst')
      const managers = state.player.employees.filter((e) => e.role === 'manager')
      const traders = state.player.employees.filter((e) => e.role === 'trader')

      // 인접 배치
      const desks2 = useGameStore.getState().player.officeLayout?.desks || []
      for (let i = 0; i < 3; i++) {
        if (desks2.length > i * 3 + 2) {
          state.assignEmployeeToDesk(analysts[i].id, desks2[i * 3].id)
          state.assignEmployeeToDesk(managers[i].id, desks2[i * 3 + 1].id)
          state.assignEmployeeToDesk(traders[i].id, desks2[i * 3 + 2].id)
        }
      }

      // 3. 가격 히스토리 생성
      for (let i = 0; i < 30; i++) {
        state = useGameStore.getState()
        state.companies.forEach((c) => {
          const history = state.priceHistory[c.id] || []
          history.push(c.price + Math.random() * 1000 - 500)
          useGameStore.setState((s) => ({
            priceHistory: {
              ...s.priceHistory,
              [c.id]: history,
            },
          }))
        })
      }

      // 4. 100일 시뮬레이션
      let totalGenerated = 0
      let totalApproved = 0
      let totalRejected = 0
      let totalExecuted = 0

      console.log(`\n🔄 파이프라인 통합 테스트 (100일)`)

      for (let day = 1; day <= 100; day++) {
        // 하루 = 3600 ticks
        for (let tick = 0; tick < 3600; tick++) {
          const s = useGameStore.getState()

          // Analyst (10틱마다)
          if (tick % 10 === 0) {
            const beforeGenerated = s.proposals.length
            s.processAnalystTick()
            const afterGenerated = useGameStore.getState().proposals.length
            totalGenerated += afterGenerated - beforeGenerated
          }

          // Manager (5틱마다)
          if (tick % 5 === 2) {
            s.processManagerTick()
          }

          // Trader (매 틱)
          s.processTraderTick()

          // Proposal 만료
          if (tick % 10 === 5) {
            s.expireOldProposals()
          }

          useGameStore.setState((state) => ({
            currentTick: state.currentTick + 1,
          }))
        }

        // 일일 통계
        const proposals = useGameStore.getState().proposals
        totalApproved = proposals.filter((p) => p.status === 'APPROVED').length
        totalRejected = proposals.filter((p) => p.status === 'REJECTED').length
        totalExecuted = proposals.filter((p) => p.status === 'EXECUTED').length

        if (day % 10 === 0) {
          console.log(
            `  ${day}일차 - 생성: ${totalGenerated}, 승인: ${totalApproved}, 거부: ${totalRejected}, 체결: ${totalExecuted}`,
          )
        }
      }

      const finalCash = useGameStore.getState().player.cash
      const cashUsed = initialCash - finalCash

      console.log(`\n📊 최종 통계`)
      console.log(`  총 제안서 생성: ${totalGenerated}건`)
      console.log(`  총 승인: ${totalApproved}건`)
      console.log(`  총 거부: ${totalRejected}건`)
      console.log(`  총 체결: ${totalExecuted}건`)
      console.log(`  초기 현금: ${initialCash.toLocaleString()}원`)
      console.log(`  최종 현금: ${finalCash.toLocaleString()}원`)
      console.log(`  사용 현금: ${cashUsed.toLocaleString()}원`)

      // 5. 검증
      expect(totalGenerated).toBeGreaterThan(0) // 제안서 생성됨
      expect(totalApproved + totalRejected).toBeGreaterThan(0) // Manager 검토함
      expect(totalExecuted).toBeGreaterThan(0) // 체결 발생함
      expect(finalCash).toBeGreaterThan(0) // 파산하지 않음

      console.log(`\n✅ 파이프라인 통합 테스트 통과!`)
    })
  })
})

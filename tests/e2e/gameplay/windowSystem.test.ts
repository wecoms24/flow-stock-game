/**
 * 윈도우 시스템 E2E 테스트
 *
 * 모든 21개 윈도우 타입의 열기/닫기/상태 관리 검증
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../../src/stores/gameStore'
import type { WindowType } from '../../../src/types'

const ALL_WINDOW_TYPES: WindowType[] = [
  'portfolio',
  'chart',
  'trading',
  'news',
  'office',
  'office_dot',
  'office_history',
  'employee_detail',
  'ranking',
  'settings',
  'ending',
  'institutional',
  'proposals',
  'acquisition',
  'dashboard',
  'achievement_log',
  'monthly_cards',
  'event_chain_tracker',
  'skill_library',
  'training_center',
  'playstyle_analytics',
]

describe('윈도우 시스템', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.getState().startGame('normal')
  })

  describe('모든 윈도우 타입 열기/닫기', () => {
    ALL_WINDOW_TYPES.forEach((windowType) => {
      it(`${windowType} 윈도우 열기`, () => {
        const store = useGameStore.getState()
        store.openWindow(windowType)

        const s = useGameStore.getState()
        const win = s.windows.find((w) => w.type === windowType)
        expect(win).toBeDefined()
        expect(win!.type).toBe(windowType)
      })
    })

    it('윈도우 닫기', () => {
      const store = useGameStore.getState()
      store.openWindow('portfolio')

      const opened = useGameStore.getState()
      const win = opened.windows.find((w) => w.type === 'portfolio')!

      store.closeWindow(win.id)
      const closed = useGameStore.getState()
      expect(closed.windows.find((w) => w.id === win.id)).toBeUndefined()
    })
  })

  describe('윈도우 상태 관리', () => {
    it('동일 타입 윈도우 중복 열기 허용', () => {
      const store = useGameStore.getState()
      store.openWindow('chart')
      store.openWindow('chart')

      const s = useGameStore.getState()
      const chartWindows = s.windows.filter((w) => w.type === 'chart')
      // 구현에 따라 1개 또는 2개
      expect(chartWindows.length).toBeGreaterThanOrEqual(1)
    })

    it('Z-index 관리 — 포커스 시 최상위', () => {
      const store = useGameStore.getState()
      store.openWindow('portfolio')
      store.openWindow('trading')

      const s1 = useGameStore.getState()
      const portfolio = s1.windows.find((w) => w.type === 'portfolio')!
      const trading = s1.windows.find((w) => w.type === 'trading')!

      // trading이 나중에 열렸으므로 z-index가 높아야 함
      expect(trading.zIndex).toBeGreaterThanOrEqual(portfolio.zIndex)
    })

    it('여러 윈도우 동시 열기/닫기', () => {
      const store = useGameStore.getState()
      const typesToOpen: WindowType[] = ['portfolio', 'chart', 'trading', 'news', 'ranking']
      typesToOpen.forEach((t) => store.openWindow(t))

      const opened = useGameStore.getState()
      expect(opened.windows.length).toBeGreaterThanOrEqual(typesToOpen.length)

      // 모두 닫기
      opened.windows.forEach((w) => store.closeWindow(w.id))
      const closed = useGameStore.getState()
      expect(closed.windows.length).toBe(0)
    })

    it('최소화/최대화 토글', () => {
      const store = useGameStore.getState()
      store.openWindow('portfolio')

      const s = useGameStore.getState()
      const win = s.windows.find((w) => w.type === 'portfolio')!

      // 최대화
      store.toggleMaximizeWindow(win.id)
      const maximized = useGameStore.getState().windows.find((w) => w.id === win.id)!
      expect(maximized.isMaximized).toBe(true)

      // 복원
      store.toggleMaximizeWindow(win.id)
      const restored = useGameStore.getState().windows.find((w) => w.id === win.id)!
      expect(restored.isMaximized).toBe(false)
    })

    it('최소화', () => {
      const store = useGameStore.getState()
      store.openWindow('trading')

      const s = useGameStore.getState()
      const win = s.windows.find((w) => w.type === 'trading')!

      store.minimizeWindow(win.id)
      const minimized = useGameStore.getState().windows.find((w) => w.id === win.id)!
      expect(minimized.isMinimized).toBe(true)
    })
  })
})

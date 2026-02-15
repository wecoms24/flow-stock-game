import { describe, it, bench, beforeEach } from 'vitest'
import { createTestStore, advanceNTicks } from '../integration/helpers'

/**
 * 성능 벤치마크: 틱 엔진
 *
 * 게임 루프의 핵심인 틱 엔진의 성능을 측정합니다.
 * 벤치마크 결과는 성능 회귀를 감지하는 데 사용됩니다.
 *
 * 목표:
 * - 단일 틱: <5ms
 * - 1000틱: <5000ms
 * - 속도별 비교 가능
 */

describe('성능 벤치마크: 틱 엔진 (Tick Engine)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('단일 틱 성능', () => {
    bench('1틱 처리', () => {
      advanceNTicks(store, 1)
    })

    bench('10틱 처리', () => {
      advanceNTicks(store, 10)
    })

    bench('100틱 처리', () => {
      advanceNTicks(store, 100)
    })
  })

  describe('연속 틱 성능', () => {
    bench('1000틱 연속 처리', () => {
      advanceNTicks(store, 1000)
    })

    bench('5000틱 연속 처리', () => {
      advanceNTicks(store, 5000)
    })
  })

  describe('속도별 비교', () => {
    bench('속도 1x - 100틱', () => {
      advanceNTicks(store, 100)
    })

    bench('속도 2x - 200틱 (시간상 100틱)', () => {
      store.setState({ gameSpeed: 2 })
      advanceNTicks(store, 200)
    })

    bench('속도 4x - 400틱 (시간상 100틱)', () => {
      store.setState({ gameSpeed: 4 })
      advanceNTicks(store, 400)
    })
  })

  describe('경쟁자 포함 성능', () => {
    bench('경쟁자 없이 100틱', () => {
      advanceNTicks(store, 100)
    })

    bench('경쟁자 3명 + 100틱', () => {
      store.initializeCompetitors(3, 50_000_000)
      advanceNTicks(store, 100)
    })

    bench('경쟁자 5명 + 100틱', () => {
      store.initializeCompetitors(5, 50_000_000)
      advanceNTicks(store, 100)
    })

    bench('경쟁자 10명 + 100틱', () => {
      store.initializeCompetitors(10, 50_000_000)
      advanceNTicks(store, 100)
    })
  })
})

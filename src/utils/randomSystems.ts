/**
 * Phase 11: 랜덤성 품질 개선 유틸리티
 *
 * - ShuffleBag: 클러스터링 방지 가중 랜덤
 * - PerlinNoise1D: 매끄러운 유기적 변화
 */

/**
 * Shuffle Bag: 가중 랜덤 아이템을 "골고루" 뽑는 패턴
 *
 * 순수 Math.random()은 같은 아이템이 연속 나올 수 있어
 * 인지적으로 "불공평"하게 느껴진다.
 * Shuffle Bag는 모든 아이템을 최소 1회 뽑은 후 리필하여
 * 분포가 더 균일하게 느껴지도록 한다.
 */
export class ShuffleBag<T> {
  private items: T[] = []
  private bag: T[] = []

  constructor(entries: Array<{ item: T; weight: number }>) {
    for (const { item, weight } of entries) {
      const count = Math.max(1, Math.round(weight))
      for (let i = 0; i < count; i++) {
        this.items.push(item)
      }
    }
    this.refill()
  }

  private refill(): void {
    this.bag = [...this.items]
    // Fisher-Yates shuffle
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
  }

  next(): T {
    if (this.bag.length === 0) {
      this.refill()
    }
    return this.bag.pop()!
  }

  peek(): T | undefined {
    return this.bag[this.bag.length - 1]
  }

  get remaining(): number {
    return this.bag.length
  }
}

/**
 * 1D Perlin Noise (단순화 버전)
 *
 * Math.random() 대체하여 매끄러운 트렌드 + 미세 변화를 생성.
 * 직원 기분(30일 주기), 시장 심리(7일 주기) 등에 적용.
 *
 * @param t - 시간 값 (정수 또는 실수)
 * @param frequency - 주파수 (기본 1.0, 작을수록 느린 변화)
 * @param amplitude - 진폭 (기본 1.0)
 * @returns -amplitude ~ +amplitude 범위의 부드러운 노이즈
 */
export function perlinNoise1D(t: number, frequency: number = 1.0, amplitude: number = 1.0): number {
  const x = t * frequency
  const x0 = Math.floor(x)
  const x1 = x0 + 1
  const frac = x - x0

  // Smoothstep interpolation (3t^2 - 2t^3)
  const smooth = frac * frac * (3 - 2 * frac)

  // Hash-based gradient generation (deterministic)
  const g0 = pseudoGradient(x0)
  const g1 = pseudoGradient(x1)

  // Dot products
  const d0 = g0 * frac
  const d1 = g1 * (frac - 1)

  // Interpolate
  const value = d0 + smooth * (d1 - d0)

  return value * amplitude
}

/**
 * 의사 난수 그래디언트 생성 (해시 기반, 결정론적)
 */
function pseudoGradient(x: number): number {
  // Simple hash based on prime multiplication
  const n = x * 374761393 + 1103515245
  const hash = ((n >> 13) ^ n) * 1376312589
  // Normalize to -1..1
  return ((hash & 0x7fffffff) / 0x3fffffff - 1)
}

/**
 * 여러 옥타브의 Perlin noise를 합성 (Fractal Brownian Motion)
 * 더 자연스럽고 복잡한 패턴 생성
 */
export function fbm1D(
  t: number,
  octaves: number = 3,
  frequency: number = 1.0,
  amplitude: number = 1.0,
  lacunarity: number = 2.0,
  persistence: number = 0.5,
): number {
  let value = 0
  let freq = frequency
  let amp = amplitude
  let maxAmp = 0

  for (let i = 0; i < octaves; i++) {
    value += perlinNoise1D(t, freq, amp)
    maxAmp += amp
    freq *= lacunarity
    amp *= persistence
  }

  return maxAmp > 0 ? value / maxAmp * amplitude : 0
}

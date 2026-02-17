/**
 * Performance Monitor
 *
 * FPS 및 렌더링 성능 모니터링 (개발 모드 전용)
 */

export class PerformanceMonitor {
  private frameCount: number = 0
  private lastTime: number = 0
  private fps: number = 0
  private fpsHistory: number[] = []
  private maxHistorySize: number = 60

  /**
   * 프레임 카운트 업데이트
   */
  update(currentTime: number): void {
    this.frameCount++

    if (currentTime - this.lastTime >= 1000) {
      // 1초마다 FPS 계산
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      this.fpsHistory.push(this.fps)

      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift()
      }

      this.frameCount = 0
      this.lastTime = currentTime
    }
  }

  /**
   * 현재 FPS 조회
   */
  getCurrentFPS(): number {
    return this.fps
  }

  /**
   * 평균 FPS 조회
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.fpsHistory.length)
  }

  /**
   * 최소 FPS 조회
   */
  getMinFPS(): number {
    if (this.fpsHistory.length === 0) return 0
    return Math.min(...this.fpsHistory)
  }

  /**
   * 성능 통계 조회
   */
  getStats(): {
    current: number
    average: number
    min: number
    isHealthy: boolean
  } {
    const avg = this.getAverageFPS()
    return {
      current: this.fps,
      average: avg,
      min: this.getMinFPS(),
      isHealthy: avg >= 55, // 55fps 이상이면 건강
    }
  }

  /**
   * 리셋
   */
  reset(): void {
    this.frameCount = 0
    this.lastTime = 0
    this.fps = 0
    this.fpsHistory = []
  }
}

// 싱글톤 인스턴스
export const performanceMonitor = new PerformanceMonitor()

/**
 * 개발 모드에서만 성능 정보 출력
 */
export function logPerformance(): void {
  if (import.meta.env.DEV) {
    const stats = performanceMonitor.getStats()
    console.log(
      `[Performance] FPS: ${stats.current} | Avg: ${stats.average} | Min: ${stats.min} | ${
        stats.isHealthy ? '✅ Healthy' : '⚠️ Low FPS'
      }`
    )
  }
}

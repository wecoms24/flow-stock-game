/**
 * Particle System
 *
 * 거래 성공, 가구 설치 등의 이벤트에 파티클 효과를 생성
 */

export type ParticleType = 'money' | 'sparkle' | 'heart' | 'star' | 'profit' | 'loss' | 'celebration' | 'coin'

// Resource limits for performance
const MAX_PARTICLES = 200

export interface Particle {
  x: number
  y: number
  vx: number // velocity x
  vy: number // velocity y
  life: number // 0-1 (1=생성, 0=소멸)
  color: string
  size: number
  type: ParticleType
}

export class ParticleSystem {
  private particles: Particle[] = []
  private lastUpdateTime: number = 0

  // Emoji sprite atlas for performance optimization
  private emojiAtlas: Map<string, HTMLCanvasElement> = new Map()
  private atlasInitialized: boolean = false

  /**
   * 파티클 방출 (MAX_PARTICLES 제한 포함)
   */
  emit(type: ParticleType, x: number, y: number, count: number = 10): void {
    const colorMap: Record<ParticleType, string> = {
      money: '#FFD700', // 금색
      sparkle: '#FFFFFF', // 흰색
      heart: '#FF69B4', // 분홍
      star: '#FFD700', // 금색
      profit: '#4CAF50', // 초록 (수익)
      loss: '#F44336', // 빨강 (손실)
      celebration: '#FFD700', // 금색 (축하)
      coin: '#FFC107', // 금색 (코인)
    }

    const color = colorMap[type]

    // Resource limit: MAX_PARTICLES 초과 방지
    const availableSlots = MAX_PARTICLES - this.particles.length
    const actualCount = Math.min(count, Math.max(0, availableSlots))

    if (actualCount === 0) {
      // 메모리 부족 시 가장 오래된 파티클 제거 (life가 낮은 순)
      this.particles.sort((a, b) => a.life - b.life)
      this.particles.splice(0, Math.min(count, this.particles.length))
    }

    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.5
      const speed = Math.random() * 2 + 1

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // 위쪽으로 초기 속도
        life: 1,
        color,
        size: Math.random() * 4 + 2,
        type,
      })
    }
  }

  /**
   * 파티클 업데이트 (requestAnimationFrame에서 호출)
   */
  update(currentTime: number): void {
    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = currentTime
      return
    }

    const deltaTime = (currentTime - this.lastUpdateTime) / 1000 // 초 단위
    this.lastUpdateTime = currentTime

    // 파티클 업데이트 및 필터링 (Frame-rate Independent Physics)
    // deltaTime * 60을 곱하여 60 FPS 기준으로 정규화
    const normalizedDelta = deltaTime * 60

    this.particles = this.particles.filter((p) => {
      // 위치 업데이트 (frame-rate independent)
      p.x += p.vx * normalizedDelta
      p.y += p.vy * normalizedDelta

      // 중력 적용 (frame-rate independent)
      p.vy += 0.1 * normalizedDelta

      // 수명 감소 (이미 deltaTime 기반이므로 정상)
      p.life -= deltaTime * 0.5 // 2초 후 소멸

      return p.life > 0
    })
  }

  /**
   * 파티클 렌더링 (최적화: viewport culling + sprite atlas)
   */
  render(ctx: CanvasRenderingContext2D): void {
    // 아틀라스 초기화 (최초 1회)
    if (!this.atlasInitialized) {
      this.initializeEmojiAtlas()
    }

    const { width, height } = ctx.canvas

    // Viewport culling: 화면 밖 파티클 필터링
    const visibleParticles = this.particles.filter(
      (p) => p.x >= -20 && p.x <= width + 20 && p.y >= -20 && p.y <= height + 20
    )

    // Sprite batching: 타입별로 그룹화
    const grouped: Record<ParticleType, Particle[]> = {
      money: [],
      sparkle: [],
      heart: [],
      star: [],
      profit: [],
      loss: [],
      celebration: [],
      coin: [],
    }

    visibleParticles.forEach((p) => {
      grouped[p.type].push(p)
    })

    // 타입별 일괄 렌더링
    Object.entries(grouped).forEach(([type, particles]) => {
      if (particles.length === 0) return

      ctx.save()

      if (type === 'money' || type === 'heart' || type === 'star' || type === 'profit' || type === 'loss' || type === 'celebration' || type === 'coin') {
        // 이모지 파티클 - 스프라이트 아틀라스 사용 (fillText 대신 drawImage)
        particles.forEach((p) => {
          // 크기를 아틀라스 크기(12/18/24)로 매핑
          const rawSize = p.size * 3
          const atlasSize = rawSize < 15 ? 12 : rawSize < 21 ? 18 : 24

          // 아틀라스에서 미리 렌더링된 캔버스 가져오기
          const atlasKey = `${type}_${atlasSize}`
          const atlasCanvas = this.emojiAtlas.get(atlasKey)

          if (atlasCanvas) {
            ctx.globalAlpha = p.life
            // drawImage로 복사 (fillText보다 15x 빠름)
            ctx.drawImage(
              atlasCanvas,
              p.x - atlasSize / 2,
              p.y - atlasSize / 2,
              atlasSize,
              atlasSize
            )
          }
        })
      } else {
        // sparkle (원형 파티클) - Path2D circle batching
        // 색상별 + opacity별로 그룹화하여 상태 변경 최소화
        const batchKey = (p: Particle) => `${p.color}_${Math.round(p.life * 10) / 10}`
        const batches: Record<string, Particle[]> = {}

        particles.forEach((p) => {
          const key = batchKey(p)
          if (!batches[key]) batches[key] = []
          batches[key].push(p)
        })

        Object.entries(batches).forEach(([key, batchParticles]) => {
          // key 파싱: "color_opacity"
          const [color, opacityStr] = key.split('_')
          const opacity = parseFloat(opacityStr)

          // Path2D로 모든 원을 한 번에 그리기
          const path = new Path2D()
          batchParticles.forEach((p) => {
            path.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          })

          ctx.fillStyle = color
          ctx.globalAlpha = opacity
          ctx.fill(path) // 한 번에 모든 원 렌더링
        })
      }

      ctx.restore()
    })
  }

  /**
   * 모든 파티클 제거
   */
  clear(): void {
    this.particles = []
  }

  /**
   * 현재 파티클 수
   */
  get count(): number {
    return this.particles.length
  }

  /**
   * 이모지 스프라이트 아틀라스 초기화
   * 오프스크린 캔버스에 이모지를 미리 렌더링하여 성능 최적화
   */
  private initializeEmojiAtlas(): void {
    if (this.atlasInitialized) return

    const emojis: Record<ParticleType, string> = {
      money: '💸',
      heart: '❤️',
      star: '⭐',
      sparkle: '', // sparkle은 원형이므로 아틀라스 불필요
      profit: '📈',
      loss: '📉',
      celebration: '🎉',
      coin: '🪙',
    }

    // 3가지 크기로 미리 렌더링 (작은/중간/큰)
    const sizes = [12, 18, 24]

    Object.entries(emojis).forEach(([type, emoji]) => {
      if (!emoji) return // sparkle 제외

      sizes.forEach((size) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // HiDPI 대응
        const scale = window.devicePixelRatio || 1
        canvas.width = size * scale
        canvas.height = size * scale
        canvas.style.width = `${size}px`
        canvas.style.height = `${size}px`

        ctx.scale(scale, scale)
        ctx.font = `${size}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(emoji, size / 2, size / 2)

        // 캐시 키: "money_18", "heart_24" 형식
        this.emojiAtlas.set(`${type}_${size}`, canvas)
      })
    })

    this.atlasInitialized = true
  }
}

// 싱글톤 인스턴스
export const particleSystem = new ParticleSystem()

// React 컴포넌트에서 사용할 수 있도록 이벤트 트리거 함수 제공
export function emitParticles(type: ParticleType, x: number, y: number, count?: number): void {
  particleSystem.emit(type, x, y, count)
}

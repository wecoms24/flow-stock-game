/**
 * Emotion Aura Rendering System
 *
 * 직원의 감정 상태를 시각적으로 표현하는 오라(Glow) 렌더링 시스템
 * Canvas Radial Gradient를 사용하여 부드러운 발광 효과 생성
 */

export type EmotionType = 'happy' | 'stressed' | 'focused'

export interface EmotionAura {
  type: EmotionType
  intensity: number // 0-1 (0: 매우 약함, 1: 매우 강함)
  pulseSpeed?: number // 맥동 속도 (선택 사항)
}

/**
 * 감정 타입별 색상 정의
 */
const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#22c55e', // 초록 (긍정적)
  stressed: '#ef4444', // 빨강 (부정적)
  focused: '#3b82f6', // 파랑 (집중)
}

/**
 * 감정 타입별 기본 반경 (pixels)
 */
const BASE_RADIUS: Record<EmotionType, number> = {
  happy: 20,
  stressed: 24, // 스트레스는 더 넓게 퍼짐
  focused: 16, // 집중은 더 좁게
}

/**
 * 직원 상태에서 감정 타입 결정
 * @param employee 직원 정보
 * @returns EmotionAura
 */
export function getEmotionFromEmployee(employee: {
  stress: number
  satisfaction: number
  stamina: number
}): EmotionAura {
  const { stress, satisfaction, stamina } = employee

  // 우선순위: 스트레스 > 만족도 > 스태미나
  if (stress >= 70) {
    return {
      type: 'stressed',
      intensity: Math.min(stress / 100, 1),
      pulseSpeed: 2, // 빠른 맥동
    }
  }

  if (satisfaction >= 70 && stamina >= 50) {
    return {
      type: 'happy',
      intensity: Math.min(satisfaction / 100, 1),
      pulseSpeed: 0.5, // 느린 맥동
    }
  }

  // 기본: 집중 상태
  return {
    type: 'focused',
    intensity: 0.5,
    pulseSpeed: 1, // 중간 속도
  }
}

/**
 * 감정 오라를 Canvas에 렌더링
 * @param ctx Canvas 2D 렌더링 컨텍스트
 * @param x 중심 x 좌표
 * @param y 중심 y 좌표
 * @param aura 감정 오라 정보
 * @param time 현재 시간 (맥동 효과용, 선택 사항)
 */
export function renderEmotionAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  aura: EmotionAura,
  time?: number,
): void {
  const color = EMOTION_COLORS[aura.type]
  let radius = BASE_RADIUS[aura.type] * aura.intensity

  // 맥동 효과 (시간 기반)
  if (time !== undefined && aura.pulseSpeed) {
    const pulse = Math.sin(time * 0.001 * aura.pulseSpeed) * 0.2 + 1 // 0.8 ~ 1.2
    radius *= pulse
  }

  // Radial gradient 생성
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)

  // 내부 (밝음)
  gradient.addColorStop(0, `${color}${Math.floor(aura.intensity * 128 + 64).toString(16).padStart(2, '0')}`) // alpha 0.25-0.75

  // 중간
  gradient.addColorStop(0.5, `${color}${Math.floor(aura.intensity * 64).toString(16).padStart(2, '0')}`) // alpha 0-0.25

  // 외부 (투명)
  gradient.addColorStop(1, `${color}00`)

  // 렌더링
  ctx.save()
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * 여러 직원의 감정 오라를 일괄 렌더링
 * @param ctx Canvas 2D 렌더링 컨텍스트
 * @param employees 직원 목록
 * @param getPosition 직원 ID로 화면 좌표를 구하는 함수
 * @param time 현재 시간
 */
export function renderAllEmotionAuras(
  ctx: CanvasRenderingContext2D,
  employees: Array<{
    id: string
    stress: number
    satisfaction: number
    stamina: number
  }>,
  getPosition: (id: string) => { x: number; y: number } | null,
  time: number,
): void {
  employees.forEach((emp) => {
    const pos = getPosition(emp.id)
    if (!pos) return

    const aura = getEmotionFromEmployee(emp)
    renderEmotionAura(ctx, pos.x, pos.y, aura, time)
  })
}

/**
 * 감정 오라 렌더러 클래스 (상태 관리)
 */
export class EmotionAuraRenderer {
  private enabled: boolean = true
  private globalIntensity: number = 1.0 // 전역 강도 배율
  private lastRenderTime: number = 0

  /**
   * 오라 렌더링 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * 전역 강도 설정 (0-1)
   */
  setGlobalIntensity(intensity: number): void {
    this.globalIntensity = Math.max(0, Math.min(1, intensity))
  }

  /**
   * 단일 오라 렌더링
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    aura: EmotionAura,
    time?: number,
  ): void {
    if (!this.enabled) return

    // 전역 강도 적용
    const adjustedAura: EmotionAura = {
      ...aura,
      intensity: aura.intensity * this.globalIntensity,
    }

    renderEmotionAura(ctx, x, y, adjustedAura, time)
    this.lastRenderTime = performance.now()
  }

  /**
   * 일괄 렌더링
   */
  renderAll(
    ctx: CanvasRenderingContext2D,
    employees: Array<{
      id: string
      stress: number
      satisfaction: number
      stamina: number
    }>,
    getPosition: (id: string) => { x: number; y: number } | null,
  ): void {
    if (!this.enabled) return

    const time = performance.now()
    renderAllEmotionAuras(ctx, employees, getPosition, time)
    this.lastRenderTime = time
  }

  /**
   * 마지막 렌더링 시간 조회 (성능 모니터링용)
   */
  getLastRenderTime(): number {
    return this.lastRenderTime
  }
}

/**
 * 감정 오라 프리셋 (빠른 생성용)
 */
export const EMOTION_PRESETS: Record<string, EmotionAura> = {
  VERY_HAPPY: { type: 'happy', intensity: 1.0, pulseSpeed: 0.5 },
  HAPPY: { type: 'happy', intensity: 0.7, pulseSpeed: 0.5 },
  SLIGHTLY_HAPPY: { type: 'happy', intensity: 0.4, pulseSpeed: 0.3 },

  VERY_STRESSED: { type: 'stressed', intensity: 1.0, pulseSpeed: 3 },
  STRESSED: { type: 'stressed', intensity: 0.7, pulseSpeed: 2 },
  SLIGHTLY_STRESSED: { type: 'stressed', intensity: 0.4, pulseSpeed: 1.5 },

  VERY_FOCUSED: { type: 'focused', intensity: 1.0, pulseSpeed: 1 },
  FOCUSED: { type: 'focused', intensity: 0.7, pulseSpeed: 1 },
  SLIGHTLY_FOCUSED: { type: 'focused', intensity: 0.4, pulseSpeed: 0.8 },
}

/**
 * 감정 오라 블렌딩 (여러 감정이 섞였을 때)
 * @param auras 감정 오라 배열
 * @returns 혼합된 감정 오라
 */
export function blendEmotionAuras(auras: EmotionAura[]): EmotionAura {
  if (auras.length === 0) {
    return { type: 'focused', intensity: 0.5 }
  }

  if (auras.length === 1) {
    return auras[0]
  }

  // 가중 평균으로 혼합 (intensity 기반)
  const totalIntensity = auras.reduce((sum, a) => sum + a.intensity, 0)

  // 가장 강한 감정 타입 선택
  const dominant = auras.reduce((max, a) => (a.intensity > max.intensity ? a : max))

  return {
    type: dominant.type,
    intensity: totalIntensity / auras.length,
    pulseSpeed: dominant.pulseSpeed,
  }
}

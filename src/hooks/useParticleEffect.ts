/**
 * useParticleEffect
 *
 * particleSystem.emit() React 래퍼
 */

import { useCallback } from 'react'
import { emitParticles, type ParticleType } from '../systems/particleSystem'

export function useParticleEffect() {
  const emit = useCallback((type: ParticleType, x: number, y: number, count?: number) => {
    emitParticles(type, x, y, count)
  }, [])

  return { emit }
}

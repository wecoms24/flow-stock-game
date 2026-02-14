import { useGameStore } from '../../stores/gameStore'

export function CRTOverlay() {
  const isFlashing = useGameStore((s) => s.isFlashing)

  return (
    <>
      {/* CRT scanline + vignette */}
      <div className="crt-overlay" />

      {/* Breaking news flash */}
      {isFlashing && <div className="flash-effect" />}
    </>
  )
}

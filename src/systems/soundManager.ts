/* ── Sound Manager ── */

// Simple 8-bit sounds using Web Audio API oscillators
// Zero network overhead — all sounds generated on-the-fly

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = soundManager.volume
    masterGain.connect(audioCtx.destination)
  }
  return audioCtx
}

function getMasterGain(): GainNode {
  getAudioContext()
  return masterGain!
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.15,
) {
  if (!soundManager.enabled) return

  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.value = frequency
  gain.gain.value = volume
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  osc.connect(gain)
  gain.connect(getMasterGain())
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playSequence(notes: Array<{ freq: number; dur: number }>, type: OscillatorType = 'square') {
  if (!soundManager.enabled) return

  const ctx = getAudioContext()
  let time = ctx.currentTime

  notes.forEach(({ freq, dur }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = 0.12
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

    osc.connect(gain)
    gain.connect(getMasterGain())
    osc.start(time)
    osc.stop(time + dur)

    time += dur * 0.9
  })
}

export const soundManager = {
  enabled: true,
  volume: 0.5,

  toggle() {
    this.enabled = !this.enabled
  },

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (masterGain) {
      masterGain.gain.value = this.volume
    }
  },

  // 8-bit level up fanfare: C5-E5-G5-C6
  playLevelUp() {
    playSequence([
      { freq: 523, dur: 0.12 },
      { freq: 659, dur: 0.12 },
      { freq: 784, dur: 0.12 },
      { freq: 1047, dur: 0.25 },
    ])
  },

  // XP gain: short coin-like blip
  playXPGain() {
    playTone(880, 0.08, 'square', 0.08)
    setTimeout(() => playTone(1100, 0.06, 'square', 0.06), 50)
  },

  // Praise: warm ascending
  playPraise() {
    playSequence([
      { freq: 440, dur: 0.08 },
      { freq: 554, dur: 0.08 },
      { freq: 659, dur: 0.15 },
    ])
  },

  // Scold: descending warning
  playScold() {
    playSequence(
      [
        { freq: 440, dur: 0.1 },
        { freq: 330, dur: 0.15 },
      ],
      'sawtooth',
    )
  },

  // Badge unlock: triumphant
  playBadgeUnlock() {
    playSequence([
      { freq: 523, dur: 0.1 },
      { freq: 659, dur: 0.1 },
      { freq: 784, dur: 0.1 },
      { freq: 1047, dur: 0.15 },
      { freq: 1319, dur: 0.3 },
    ])
  },

  // Button click
  playClick() {
    playTone(600, 0.03, 'square', 0.05)
  },
}

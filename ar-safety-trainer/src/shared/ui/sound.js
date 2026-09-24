// Short synthesized sound cues via Web Audio API oscillators — no audio
// files to source or license. A persisted mute flag follows the same
// localStorage-flat-key pattern as i18n.js's language and app/shell.js's text
// size (a standalone UI preference, not app data). These are separate from
// — and sequenced not to fight — the "Listen" voice-narration feature in
// speech.js: these are short, discrete cues at moments (answer reveal,
// cert issuance) a user isn't usually mid-narration for.

let audioCtx = null
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

let muted = localStorage.getItem('soundMuted') === '1'
export function isMuted() {
  return muted
}
export function toggleMuted() {
  muted = !muted
  localStorage.setItem('soundMuted', muted ? '1' : '0')
  return muted
}

export function tone(freq, duration, type = 'sine', gainPeak = 0.15, delay = 0) {
  if (muted || typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return
  try {
    const ctx = getCtx()
    // Browsers can start/leave a context "suspended" until a user gesture;
    // these calls are always gesture-triggered (a tap) but may run a few
    // microtasks removed from it (e.g. after an awaited cert-generation
    // step), so resume defensively rather than assume it's already running.
    if (ctx.state === 'suspended') ctx.resume()
    const startAt = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, startAt)
    gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.02)
  } catch {
    // Non-critical — never let a sound cue break the UI flow it's attached to.
  }
}

export function playCorrect() {
  tone(880, 0.15)
  tone(1175, 0.15, 'sine', 0.15, 0.09)
}

export function playIncorrect() {
  tone(220, 0.25, 'sawtooth', 0.1)
}

export function playCertChime() {
  tone(660, 0.12, 'sine', 0.12, 0)
  tone(880, 0.12, 'sine', 0.12, 0.1)
  tone(1320, 0.25, 'sine', 0.12, 0.2)
}

// Real, on-device hand tracking for the CPR camera assist — MediaPipe's
// WASM HandLandmarker runs entirely in the browser; no video frame is
// ever uploaded anywhere. Used for exactly one honest purpose: turn the
// palm's actual detected vertical motion into a genuine compressions-per-
// minute number and a relative (not absolute-cm) depth bar. This module
// never attempts to identify an injury from the camera — see the safety
// boundary documented in ../data/emergencyGuides.js.
//
// Peak/trough detection uses a simple hysteresis-based extremum detector:
// a reversal only counts once the palm has moved back past a minimum
// threshold, so small tracking jitter isn't mistaken for a compression.
// The reported rate always comes from real detected cycles — if there
// aren't enough of them yet, the caller gets `rate: null` rather than a
// fabricated number.

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const TASKS_VISION_VERSION = '1.0.1'
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const HYSTERESIS = 0.015 // normalized landmark-y units — tuned loosely, not a calibrated measurement
const WINDOW_MS = 4000
const MIN_CYCLES_FOR_RATE = 2
const RATE_MIN = 20
const RATE_MAX = 220

export function isHandTrackingSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof WebAssembly !== 'undefined'
}

let landmarkerPromise = null
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((fileset) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      })
    )
  }
  return landmarkerPromise
}

// videoEl: an already-playing <video> element (caller owns the camera
// stream/permissions). onUpdate({ rate: number|null, amplitude: 0..1,
// lowConfidence: boolean }) fires on every processed frame. Returns a
// controller with stop(), or null if the model/runtime can't be loaded
// (caller should fall back to the text-only guide, per the honesty
// pattern established in speech.js/voiceCommand.js).
export async function startHandTracking(videoEl, onUpdate) {
  if (!isHandTrackingSupported()) return null

  let landmarker
  try {
    landmarker = await getLandmarker()
  } catch {
    return null
  }

  let stopped = false
  let rafId = null
  const positions = [] // { t, y }
  const extremes = [] // { t, y, type: 'min' | 'max' }
  let direction = null // 'up' | 'down'
  let lastConfirmed = null
  let candidate = null

  function processSample(t, y) {
    positions.push({ t, y })
    while (positions.length && t - positions[0].t > WINDOW_MS) positions.shift()

    if (!lastConfirmed) {
      lastConfirmed = { t, y }
      candidate = { t, y }
      return
    }
    if (!direction) {
      if (Math.abs(y - lastConfirmed.y) > HYSTERESIS) {
        direction = y > lastConfirmed.y ? 'down' : 'up'
        candidate = { t, y }
      }
      return
    }
    const extending = direction === 'down' ? y >= candidate.y : y <= candidate.y
    if (extending) {
      candidate = { t, y }
      return
    }
    const reversal = direction === 'down' ? candidate.y - y : y - candidate.y
    if (reversal > HYSTERESIS) {
      extremes.push({ t: candidate.t, y: candidate.y, type: direction === 'down' ? 'min' : 'max' })
      while (extremes.length > 16) extremes.shift()
      lastConfirmed = candidate
      direction = direction === 'down' ? 'up' : 'down'
      candidate = { t, y }
    }
  }

  function computeRate() {
    const mins = extremes.filter((e) => e.type === 'min')
    if (mins.length < MIN_CYCLES_FOR_RATE + 1) return null
    const recent = mins.slice(-6)
    const spanMs = recent[recent.length - 1].t - recent[0].t
    const cycles = recent.length - 1
    if (spanMs <= 0 || cycles < MIN_CYCLES_FOR_RATE) return null
    const rate = Math.round((cycles / spanMs) * 60000)
    if (rate < RATE_MIN || rate > RATE_MAX) return null
    return rate
  }

  function computeAmplitude() {
    if (positions.length < 2) return 0
    const ys = positions.map((p) => p.y)
    const span = Math.max(...ys) - Math.min(...ys)
    // Empirical scale so a typical compression's hand travel reads near
    // the top of the bar — relative feedback only, never claimed as cm.
    return Math.max(0, Math.min(1, span * 8))
  }

  function loop() {
    if (stopped) return
    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      const now = performance.now()
      let result
      try {
        result = landmarker.detectForVideo(videoEl, now)
      } catch {
        result = null
      }
      const hand = result?.landmarks?.[0]
      if (hand && hand[9]) {
        processSample(now, hand[9].y) // landmark 9 = middle-finger MCP, a stable palm-center point
        onUpdate({ rate: computeRate(), amplitude: computeAmplitude(), lowConfidence: false })
      } else {
        onUpdate({ rate: null, amplitude: 0, lowConfidence: true })
      }
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)

  return {
    stop() {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
    },
  }
}

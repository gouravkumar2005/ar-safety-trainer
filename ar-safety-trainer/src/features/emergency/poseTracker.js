// Real, on-device body-landmark tracking — MediaPipe's WASM PoseLandmarker
// runs entirely in the browser, no frame ever leaves the device. Used for
// exactly one purpose: draw a marker on an already-identified limb (arm
// for bleeding, leg for fracture — the guide screen already knows which
// guide is open) so a worker can see roughly where on their own body to
// apply pressure/a splint while looking at the camera view.
//
// This is positioning only. It NEVER attempts to detect or infer what
// injury occurred, how severe it is, or whether one is present at all —
// it only locates general limb landmarks (wrist/elbow, ankle/knee) once
// the injury type is already known from what the person said or chose.
// See the safety boundary documented in emergency/emergencyGuides.js.

import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { MEDIAPIPE_WASM_DIR, POSE_LANDMARKER_MODEL } from '../../platform/mlAssets.js'


// Indices into PoseLandmarker's 33-point output.
const LANDMARKS = {
  arm: [
    { idx: 15, label: 'wrist' },
    { idx: 13, label: 'elbow' },
    { idx: 16, label: 'wrist' },
    { idx: 14, label: 'elbow' },
  ],
  leg: [
    { idx: 27, label: 'ankle' },
    { idx: 25, label: 'knee' },
    { idx: 28, label: 'ankle' },
    { idx: 26, label: 'knee' },
  ],
}

export function isPoseTrackingSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof WebAssembly !== 'undefined'
}

let landmarkerPromise = null
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_DIR).then((fileset) =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_LANDMARKER_MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    )
  }
  return landmarkerPromise
}

// videoEl: a playing <video>. canvasEl: sized/positioned to overlay it
// (caller's job — this only draws into it). zone: 'arm' | 'leg', picked
// by the guide already open (bleeding -> arm-ish limbs, fracture -> leg
// or arm depending on the guide; caller decides, this just draws points).
// Returns a controller with stop(), or null if unavailable.
export async function startPoseOverlay(videoEl, canvasEl, zone) {
  if (!isPoseTrackingSupported()) return null

  let landmarker
  try {
    landmarker = await getLandmarker()
  } catch {
    return null
  }

  const ctx = canvasEl.getContext('2d')
  let stopped = false
  let rafId = null
  const points = LANDMARKS[zone] || LANDMARKS.arm

  function loop() {
    if (stopped) return
    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      canvasEl.width = videoEl.videoWidth
      canvasEl.height = videoEl.videoHeight
      const now = performance.now()
      let result
      try {
        result = landmarker.detectForVideo(videoEl, now)
      } catch {
        result = null
      }
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
      const pose = result?.landmarks?.[0]
      if (pose) {
        for (const { idx, label } of points) {
          const p = pose[idx]
          if (!p || (p.visibility != null && p.visibility < 0.4)) continue
          const x = p.x * canvasEl.width
          const y = p.y * canvasEl.height
          ctx.beginPath()
          ctx.arc(x, y, 14, 0, Math.PI * 2)
          ctx.strokeStyle = '#ffb020'
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.fillStyle = 'rgba(255,176,32,0.85)'
          ctx.font = '12px sans-serif'
          ctx.fillText(label, x + 18, y + 4)
        }
      }
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)

  return {
    stop() {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    },
  }
}

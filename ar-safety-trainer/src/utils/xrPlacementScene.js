// Shared placement/render core for the two interactive AR sims
// (ppeEquipSim.js / machineryOpsSim.js). One real, working tier
// everywhere ("passthrough": live camera behind a fixed 3D overlay,
// same pattern already shipped in cprCameraAssist.js), with real WebXR
// world-anchored placement layered on top wherever the browser actually
// supports it (Android Chrome/Chromium today — Safari/iOS has never
// shipped WebXR, desktop has no camera-anchored AR). Both tiers run the
// exact same scene/content; only how `anchorGroup` gets placed differs,
// and callers are told which tier is active (`backend`) so the app can
// say so honestly rather than silently swap behaviour.
//
// Returns null only when NEITHER tier can start at all (no camera, no
// WebGL) — callers fall back to the existing tour.js walk for that
// module rather than show a broken screen.

import * as THREE from 'three'

export function isWebxrArSupported() {
  if (typeof navigator === 'undefined' || !navigator.xr) return Promise.resolve(false)
  return navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
}

function projectToScreen(worldPos, camera, referenceEl) {
  const v = worldPos.clone().project(camera)
  const rect = referenceEl.getBoundingClientRect()
  return {
    x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
    inFront: v.z < 1,
  }
}

function buildSceneBasics() {
  const scene = new THREE.Scene()
  const anchorGroup = new THREE.Group()
  scene.add(anchorGroup)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.4))
  const dir = new THREE.DirectionalLight(0xffffff, 0.9)
  dir.position.set(1, 2, 1)
  scene.add(dir)
  return { scene, anchorGroup }
}

async function startWebxrBackend({ scene, anchorGroup, canvas, domOverlayRoot, frameCallbacks }) {
  if (!domOverlayRoot) return null
  let session
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: domOverlayRoot },
    })
  } catch {
    return null // e.g. permission denied, or device lied about isSessionSupported
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.xr.enabled = true
  await renderer.xr.setSession(session)

  const camera = new THREE.PerspectiveCamera()
  const referenceSpace = await session.requestReferenceSpace('local')
  const viewerSpace = await session.requestReferenceSpace('viewer')
  const hitTestSource = await session.requestHitTestSource({ space: viewerSpace })

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.08, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffb020 })
  )
  reticle.visible = false
  reticle.matrixAutoUpdate = false
  scene.add(reticle)

  let placed = false
  let resolvePlacement
  const placementPromise = new Promise((res) => { resolvePlacement = res })

  const onSelect = () => {
    if (placed || !reticle.visible) return
    anchorGroup.position.setFromMatrixPosition(reticle.matrix)
    anchorGroup.quaternion.setFromRotationMatrix(reticle.matrix)
    placed = true
    reticle.visible = false
    resolvePlacement()
  }
  session.addEventListener('select', onSelect)

  let stopped = false
  renderer.setAnimationLoop((_time, frame) => {
    if (stopped) return
    if (frame && !placed) {
      const pose = frame.getViewerPose(referenceSpace)
      if (pose) {
        const hits = frame.getHitTestResults(hitTestSource)
        if (hits.length > 0) {
          reticle.visible = true
          reticle.matrix.fromArray(hits[0].getPose(referenceSpace).transform.matrix)
        } else {
          reticle.visible = false
        }
      }
    }
    renderer.render(scene, camera)
    frameCallbacks.forEach((cb) => cb())
  })

  return {
    backend: 'webxr',
    requestPlacement: () => placementPromise,
    project: (worldPos) => projectToScreen(worldPos, camera, canvas),
    stop() {
      stopped = true
      renderer.setAnimationLoop(null)
      session.removeEventListener('select', onSelect)
      session.end().catch(() => {})
    },
  }
}

async function startPassthroughBackend({ scene, canvas, video, frameCallbacks }) {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  } catch {
    return null // camera denied/unavailable — genuinely nothing to show
  }
  video.srcObject = stream
  await video.play().catch(() => {})

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 50)
  camera.position.set(0, 1.4, 1.9)
  camera.lookAt(0, 1.0, 0)

  function resize() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  let stopped = false
  let rafId = null
  function loop() {
    if (stopped) return
    renderer.render(scene, camera)
    frameCallbacks.forEach((cb) => cb())
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)

  return {
    backend: 'passthrough',
    // No real-world tracking here — anchorGroup just sits at a fixed
    // offset in front of the virtual camera. Resolves immediately;
    // there's no reticle/tap step for this tier.
    requestPlacement: () => Promise.resolve(),
    project: (worldPos) => projectToScreen(worldPos, camera, canvas),
    stop() {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}

// canvas: a transparent WebGL <canvas>. video: a <video> element placed
// behind that canvas in the DOM (used only by the passthrough tier — in
// a real WebXR session the browser composites the camera feed itself,
// no <video> needed). domOverlayRoot: the DOM element holding this
// screen's own UI (chip tray, captions) — required for the WebXR tier's
// dom-overlay feature; taps that land on real elements inside it are
// consumed as normal DOM interaction and never trigger AR placement,
// so drag/tap UI works identically on both tiers.
export async function startPlacementScene({ canvas, video, domOverlayRoot }) {
  const { scene, anchorGroup } = buildSceneBasics()
  const frameCallbacks = []
  const onFrame = (cb) => frameCallbacks.push(cb)

  const webxrOk = await isWebxrArSupported()
  let backend = webxrOk ? await startWebxrBackend({ scene, anchorGroup, canvas, domOverlayRoot, frameCallbacks }) : null
  if (!backend) backend = await startPassthroughBackend({ scene, canvas, video, frameCallbacks })
  if (!backend) return null // truly nothing available

  return { scene, anchorGroup, onFrame, ...backend }
}

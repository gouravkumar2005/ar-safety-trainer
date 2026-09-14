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
      // `anchors` is required, not optional, on purpose: a hit-test
      // position alone is just a one-time snapshot that visibly drifts
      // as the device's own tracking keeps refining itself after
      // placement — real-device testing confirmed exactly this ("bhaag
      // ja raha hai"). Anchors are what the platform re-resolves every
      // frame to correct for that, which is the actual fix below. A
      // device that can't grant `anchors` simply never gets this tier —
      // requestSession rejects, caught below, and startPlacementScene
      // already falls through to the passthrough tier, which cannot
      // drift at all since it does no real-world tracking. Guaranteed-
      // stable beats "real but sometimes wanders off".
      requiredFeatures: ['hit-test', 'anchors'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: domOverlayRoot },
    })
  } catch {
    return null // e.g. permission denied, or anchors genuinely unsupported here
  }

  // Everything from here on (creating the renderer on the shared
  // canvas, handing the session to it, requesting reference
  // spaces/hit-test) is a real, fallible negotiation with the device —
  // any one of these can legitimately throw on a real phone even after
  // `requestSession` itself succeeded (this got more likely once
  // `anchors` became a required feature above). Previously none of
  // this was guarded, so a failure here threw all the way out of
  // startPlacementScene() uncaught, which left the screen fully black
  // with nothing ever falling back to the passthrough tier — the bug
  // reported from real-device testing. Wrap the whole thing and, on any
  // failure, properly release whatever was half-built (the WebGL
  // context claimed on the canvas, the open XR session) before
  // returning null, so startPlacementScene() can cleanly try the
  // passthrough tier on a genuinely fresh canvas.
  let renderer = null
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    // See the matching comment in startPassthroughBackend — same
    // opaque-black-clear issue applies here too. The XR compositor
    // normally owns the real camera passthrough directly, but this
    // keeps our own canvas honestly transparent regardless (e.g. during
    // any moment rendering happens outside an active XR frame).
    renderer.setClearColor(0x000000, 0)
    renderer.xr.enabled = true
    await renderer.xr.setSession(session)

    const camera = new THREE.PerspectiveCamera()
    const referenceSpace = await session.requestReferenceSpace('local')
    const viewerSpace = await session.requestReferenceSpace('viewer')
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace })

    return startWebxrLoop({ scene, anchorGroup, canvas, renderer, session, camera, referenceSpace, hitTestSource, frameCallbacks })
  } catch {
    try { renderer?.dispose() } catch { /* non-critical */ }
    try { renderer?.forceContextLoss() } catch { /* non-critical */ }
    try { await session.end() } catch { /* non-critical — session may already be ending/ended */ }
    return null
  }
}

function startWebxrLoop({ scene, anchorGroup, canvas, renderer, session, camera, referenceSpace, hitTestSource, frameCallbacks }) {
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.08, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffb020 })
  )
  reticle.visible = false
  reticle.matrixAutoUpdate = false
  scene.add(reticle)

  let placed = false
  let anchor = null
  let lastHitTransform = null // the most recent hit-test XRRigidTransform, captured for use at the moment of a tap
  let resolvePlacement
  const placementPromise = new Promise((res) => { resolvePlacement = res })

  // XRInputSourceEvent carries its own `.frame`, valid for exactly this
  // event — that's what createAnchor() needs (anchor creation must
  // happen against a specific frame's data).
  const onSelect = (event) => {
    if (placed || !reticle.visible || !lastHitTransform) return
    placed = true // set immediately: a second tap while createAnchor() is still pending must not race
    reticle.visible = false
    const frame = event.frame
    const fallbackToSnapshot = () => {
      // Anchor creation failed despite the feature being granted —
      // fall back to a one-shot snapshot rather than leave the user
      // stuck with nothing placed; not the common path.
      anchorGroup.position.setFromMatrixPosition(reticle.matrix)
      anchorGroup.quaternion.setFromRotationMatrix(reticle.matrix)
      resolvePlacement()
    }
    if (frame?.createAnchor) {
      frame.createAnchor(lastHitTransform, referenceSpace).then((a) => {
        anchor = a
        resolvePlacement()
      }, fallbackToSnapshot)
    } else {
      fallbackToSnapshot()
    }
  }
  session.addEventListener('select', onSelect)

  // Deletes the current anchor and reopens placement — the mannequin/
  // coal/miner are parented under `anchorGroup` and never re-added, so
  // the next tap just re-anchors everything already in the scene. This
  // is the user-facing escape hatch if a placement ever still looks
  // off: one tap fixes it instead of leaving/re-entering the screen.
  function recenter() {
    if (anchor?.delete) { try { anchor.delete() } catch { /* non-critical */ } }
    anchor = null
    placed = false
    lastHitTransform = null
    reticle.visible = false
  }

  let stopped = false
  renderer.setAnimationLoop((_time, frame) => {
    if (stopped) return
    // A transient per-frame API hiccup (frame.getPose/createAnchor
    // throwing on some edge-case tracking state) should skip this one
    // frame's placement update, never break the loop or leave the
    // canvas stuck — same reasoning as the setup-time try/catch above.
    try {
      if (frame) {
        if (!placed) {
          const pose = frame.getViewerPose(referenceSpace)
          if (pose) {
            const hits = frame.getHitTestResults(hitTestSource)
            if (hits.length > 0) {
              const hitPose = hits[0].getPose(referenceSpace)
              lastHitTransform = hitPose.transform
              reticle.visible = true
              reticle.matrix.fromArray(hitPose.transform.matrix)
            } else {
              reticle.visible = false
            }
          }
        } else if (anchor) {
          // The actual fix: re-resolve the anchor's pose every frame
          // instead of trusting a frozen snapshot, so anchorGroup
          // tracks the platform's own drift corrections. If a pose is
          // briefly unavailable (momentary tracking loss), skip this
          // frame's update and stay at the last good transform rather
          // than snapping anywhere.
          const anchorPose = frame.getPose(anchor.anchorSpace, referenceSpace)
          if (anchorPose) {
            anchorGroup.matrix.fromArray(anchorPose.transform.matrix)
            anchorGroup.matrix.decompose(anchorGroup.position, anchorGroup.quaternion, anchorGroup.scale)
          }
        }
      }
    } catch {
      // Skip this frame's placement update only — rendering below still
      // proceeds so the view never goes black over a single bad frame.
    }
    renderer.render(scene, camera)
    frameCallbacks.forEach((cb) => cb())
  })

  return {
    backend: 'webxr',
    requestPlacement: () => placementPromise,
    project: (worldPos) => projectToScreen(worldPos, camera, canvas),
    recenter,
    stop() {
      stopped = true
      renderer.setAnimationLoop(null)
      session.removeEventListener('select', onSelect)
      if (anchor?.delete) { try { anchor.delete() } catch { /* non-critical */ } }
      try { hitTestSource.cancel() } catch { /* non-critical */ }
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

  // Same defense-in-depth as the WebXR backend above: renderer/camera
  // setup is unlikely to fail here (no device negotiation involved),
  // but "whatever it takes" means not leaving that assumption
  // unguarded — a failure here should release the camera stream and
  // report unavailable, never leave a half-built black screen behind.
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    // The actual "screen is fully black" bug: `alpha: true` above only
    // makes the canvas's WebGL context *capable* of transparency — it
    // does NOT change the renderer's own clear color, which defaults to
    // opaque black (alpha 1). Every render() call was clearing to solid
    // black first, then drawing a sparse scene on top — the canvas
    // stayed almost entirely opaque black, completely hiding the
    // <video> element positioned behind it. This is what actually needs
    // setting to make the canvas genuinely transparent where nothing is
    // drawn, letting the camera feed show through.
    renderer.setClearColor(0x000000, 0)
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
      try {
        renderer.render(scene, camera)
        frameCallbacks.forEach((cb) => cb())
      } catch {
        // Skip this frame only — never let one bad frame kill the loop.
      }
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
      // Nothing to recenter here — anchorGroup is a fixed offset from
      // the camera, not real-world tracked, so there's nothing that
      // can drift in the first place. Present for API symmetry with
      // the WebXR backend so callers can invoke it unconditionally.
      recenter() {},
      stop() {
        stopped = true
        if (rafId) cancelAnimationFrame(rafId)
        window.removeEventListener('resize', resize)
        stream.getTracks().forEach((t) => t.stop())
      },
    }
  } catch {
    stream.getTracks().forEach((t) => t.stop())
    return null
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

  // Both backend starters already guard their own fallible steps (see
  // their own try/catches above) and are documented to resolve to null
  // rather than reject on failure — these two extra catches are a last
  // line of defense against that contract ever being violated by some
  // future/unforeseen throw, so a bug in one tier can never take down
  // the other or leave this function's own promise rejected (every
  // caller only handles a resolved `scene`, never a rejection).
  const webxrOk = await isWebxrArSupported()
  let backend = webxrOk
    ? await startWebxrBackend({ scene, anchorGroup, canvas, domOverlayRoot, frameCallbacks }).catch(() => null)
    : null
  if (!backend) backend = await startPassthroughBackend({ scene, canvas, video, frameCallbacks }).catch(() => null)
  if (!backend) return null // truly nothing available

  return { scene, anchorGroup, onFrame, ...backend }
}

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getModule } from '../data/modules.js'
import { getMachineryItem } from '../data/machineryItems.js'
import { t, pick, getLang } from '../utils/i18n.js'
import { speak, stopSpeaking } from '../utils/speech.js'
import { startPlacementScene } from '../utils/xrPlacementScene.js'
import { buildCoalPile } from '../utils/proceduralModels.js'
import { burstConfetti } from '../utils/confetti.js'

// Interactive drag-to-operate AR sim, replacing the plain swipe-through
// tour for Machinery Safety. Same shared placement core as
// ppeEquipSim.js (see that file's header + the plan for the full
// design). This is an explicit tabletop DIORAMA scale, not the 1:1
// real-world scale arViewer.js's normal AR placement uses for this same
// continuous-miner model — a 9m machine has no business filling a
// tabletop AR scene, so this screen uses its own much smaller scale
// constants below, independent of modules.js's `scale: 9`.
//
// Two drag phases, reusing the module's own already-written, accurate
// hotspot/hazard copy verbatim — no new machinery content authored:
//   1. drag the miner chip onto the coal face -> it "cuts" while the 5
//      existing hotspots narrate in sequence.
//   2. drag the conveyor-belt chip onto the cut coal -> it carries the
//      coal off, narrating the belt's existing hazard copy.

const DROP_THRESHOLD_PX = 60
const DIORAMA_MINER_SCALE = 0.9 // target ~0.9m long, a tabletop model — see header note
const DIORAMA_BELT_SCALE = 0.7
const COAL_FACE_OFFSET = { x: 0, y: 0.05, z: -0.35 }
const DROP_OFF_OFFSET = { x: 0.35, y: 0.05, z: 0.1 }
const EXIT_OFFSET = { x: 0.9, y: 0.05, z: 0.25 }
const AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS = 600
const AUTO_ADVANCE_FALLBACK_MS = 5500

export function renderMachineryOpsSim(main, navigate) {
  const mod = getModule('machinery-safety')
  const beltItem = getMachineryItem('conveyor-belt')

  main.innerHTML = `
    <div id="sim-root" style="position:relative;width:100%;height:calc(100dvh - 140px);min-height:420px;border-radius:14px;overflow:hidden;background:#000;">
      <video id="sim-video" autoplay playsinline muted style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;"></video>
      <canvas id="sim-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
      <div id="sim-overlay" style="position:absolute;inset:0;pointer-events:none;">
        <button class="btn btn-ghost" id="sim-back" style="position:absolute;top:10px;left:10px;pointer-events:auto;">&larr; ${t('backToModules')}</button>
        <span class="badge badge-active" id="sim-backend-badge" style="position:absolute;top:10px;right:10px;"></span>
        <button class="btn" id="sim-recenter" hidden style="position:absolute;top:46px;right:10px;pointer-events:auto;">${t('arSimRecenterBtn')}</button>
        <div id="sim-marker" class="hotspot-btn" style="position:fixed;display:none;pointer-events:none;transform:translate(-50%,-50%);"></div>
        <p class="hint" id="sim-hint" style="position:absolute;left:0;right:0;bottom:96px;text-align:center;color:#fff;text-shadow:0 1px 3px #000;margin:0;padding:0 12px;"></p>
        <div id="sim-caption" class="sheet" style="position:absolute;left:8px;right:8px;bottom:8px;display:none;pointer-events:auto;"></div>
        <div id="sim-tray" style="position:absolute;left:0;right:0;bottom:8px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:0 8px;pointer-events:auto;"></div>
      </div>
    </div>
    <p class="hint" id="sim-illustrative-note" style="margin-top:8px;"></p>
    <button class="btn btn-ghost btn-block" id="sim-use-tour" style="margin-top:8px;">${t('arSimUseSimpleTourBtn')}</button>
  `

  const root = main.querySelector('#sim-root')
  const video = main.querySelector('#sim-video')
  const canvas = main.querySelector('#sim-canvas')
  const overlay = main.querySelector('#sim-overlay')
  const backBtn = main.querySelector('#sim-back')
  const backendBadge = main.querySelector('#sim-backend-badge')
  const recenterBtn = main.querySelector('#sim-recenter')
  const marker = main.querySelector('#sim-marker')
  const hintEl = main.querySelector('#sim-hint')
  const captionEl = main.querySelector('#sim-caption')
  const trayEl = main.querySelector('#sim-tray')

  main.querySelector('#sim-illustrative-note').textContent = t('arSimIllustrativeNote')

  let leftScreen = false
  function cleanupAndLeave(toHash) {
    if (leftScreen) return
    leftScreen = true
    stopSpeaking()
    clearTimeout(advanceTimer)
    scenePromise.then((scene) => scene?.stop())
    navigate(toHash)
  }
  backBtn.addEventListener('click', () => cleanupAndLeave(`#/module/${mod.id}`))
  main.querySelector('#sim-use-tour').addEventListener('click', () => cleanupAndLeave(`#/module/${mod.id}/tour`))

  const observer = new MutationObserver(() => {
    if (!main.contains(root) && !leftScreen) {
      leftScreen = true
      stopSpeaking()
      clearTimeout(advanceTimer)
      scenePromise.then((scene) => scene?.stop())
      observer.disconnect()
    }
  })
  observer.observe(main, { childList: true, subtree: true })

  let advanceTimer = null
  // phase: 'cut' (drag miner to coal face) -> narrating hotspots ->
  // 'transport' (drag belt to the cut-coal pile) -> narrating belt -> done
  let phase = 'cut'
  let hotspotIndex = 0
  let anchorGroup = null
  let coalPile = null
  let minerObj = null
  const loader = new GLTFLoader()
  // Kicked off once the scene starts (see below) instead of fetching +
  // parsing each .glb lazily at the exact moment of its drop — removes
  // a hitch right at the most interaction-heavy instant.
  let minerPreload = null
  let beltPreload = null

  function targetWorldPos(_scene, offset) {
    return anchorGroup.localToWorld(new THREE.Vector3(offset.x, offset.y, offset.z))
  }

  const scenePromise = startPlacementScene({ canvas, video, domOverlayRoot: overlay }).then((scene) => {
    if (leftScreen) {
      scene?.stop()
      return null
    }
    if (!scene) {
      cleanupAndLeave(`#/module/${mod.id}/tour`)
      return null
    }
    if (scene.backend === 'passthrough') video.style.display = 'block'
    backendBadge.textContent = scene.backend === 'webxr' ? t('arSimBackendWebxr') : t('arSimBackendPassthrough')
    if (scene.backend === 'webxr') {
      hintEl.textContent = t('arSimTapToPlaceHint')
      recenterBtn.hidden = false
      recenterBtn.addEventListener('click', () => {
        scene.recenter()
        hintEl.textContent = t('arSimTapToPlaceHint')
      })
    }

    minerPreload = loader.loadAsync(mod.model).catch(() => null)
    beltPreload = loader.loadAsync(beltItem.model).catch(() => null)

    scene.requestPlacement().then(() => {
      if (leftScreen) return
      anchorGroup = scene.anchorGroup
      coalPile = buildCoalPile(0.3)
      coalPile.position.set(COAL_FACE_OFFSET.x, COAL_FACE_OFFSET.y, COAL_FACE_OFFSET.z)
      anchorGroup.add(coalPile)
      startCutPhase(scene)
    })

    scene.onFrame(() => {
      if (!anchorGroup) return
      let targetLocal = null
      if (phase === 'cut') targetLocal = COAL_FACE_OFFSET
      else if (phase === 'transport') targetLocal = DROP_OFF_OFFSET
      if (!targetLocal) {
        marker.style.display = 'none'
        return
      }
      const worldPos = targetWorldPos(scene, targetLocal)
      const projected = scene.project(worldPos)
      if (projected.inFront) {
        marker.style.display = 'block'
        marker.style.left = `${projected.x}px`
        marker.style.top = `${projected.y}px`
        marker.dataset.x = projected.x
        marker.dataset.y = projected.y
      } else {
        marker.style.display = 'none'
      }
    })

    return scene
  })

  function renderChip(emoji, label, onDrag) {
    trayEl.innerHTML = ''
    const chip = document.createElement('div')
    chip.className = 'btn ops-chip'
    chip.style.touchAction = 'none'
    chip.dataset.active = 'true'
    chip.innerHTML = `<div style="font-size:1.4rem;">${emoji}</div><div style="font-size:0.65rem;">${label}</div>`
    attachDrag(chip, onDrag)
    trayEl.appendChild(chip)
  }

  function attachDrag(chip, onDrop) {
    let dragging = false
    let originRect = null
    chip.addEventListener('pointerdown', (e) => {
      dragging = true
      originRect = chip.getBoundingClientRect()
      chip.setPointerCapture(e.pointerId)
      chip.style.position = 'fixed'
      chip.style.zIndex = '50'
      moveTo(e.clientX, e.clientY)
    })
    chip.addEventListener('pointermove', (e) => {
      if (!dragging) return
      moveTo(e.clientX, e.clientY)
    })
    chip.addEventListener('pointerup', (e) => {
      if (!dragging) return
      dragging = false
      const mx = Number(marker.dataset.x)
      const my = Number(marker.dataset.y)
      const dist = Math.hypot(e.clientX - mx, e.clientY - my)
      if (marker.style.display !== 'none' && dist < DROP_THRESHOLD_PX) {
        onDrop()
      } else {
        chip.style.position = ''
        chip.style.left = ''
        chip.style.top = ''
        chip.style.zIndex = ''
      }
    })
    function moveTo(x, y) {
      chip.style.left = `${x - originRect.width / 2}px`
      chip.style.top = `${y - originRect.height / 2}px`
    }
  }

  function startCutPhase(scene) {
    trayEl.innerHTML = ''
    captionEl.style.display = 'none'
    hintEl.textContent = t('machSimDragMinerHint')
    renderChip('🚜', pick({ en: 'Continuous Miner', hi: 'कंटीन्यूअस माइनर' }), () => onMinerDropped(scene))
  }

  function onMinerDropped(scene) {
    stopSpeaking()
    clearTimeout(advanceTimer)
    trayEl.innerHTML = ''
    hintEl.textContent = ''

    ;(minerPreload ?? loader.loadAsync(mod.model).catch(() => null)).then((gltf) => {
      if (leftScreen || !anchorGroup || !gltf) return
      minerObj = gltf.scene
      minerObj.scale.set(DIORAMA_MINER_SCALE, DIORAMA_MINER_SCALE, DIORAMA_MINER_SCALE)
      minerObj.position.set(COAL_FACE_OFFSET.x, COAL_FACE_OFFSET.y, COAL_FACE_OFFSET.z + 0.25)
      anchorGroup.add(minerObj)
    })
    // Non-critical either way — narration below still proceeds even if
    // the visual attach failed.

    burstConfetti(main)
    navigator.vibrate?.(20)
    hotspotIndex = 0
    phase = 'cutting-narration'
    narrateNextHotspot()
  }

  function narrateNextHotspot() {
    const hotspots = mod.hotspots || []
    if (hotspotIndex >= hotspots.length) {
      finishCutting()
      return
    }
    const hs = hotspots[hotspotIndex]
    captionEl.style.display = 'block'
    captionEl.innerHTML = `<h4>${t('machSimCuttingLabel')} ${pick(hs.label)}</h4><p>${pick(hs.info)}</p>`
    const myIndex = hotspotIndex
    speak(`${pick(hs.label)}. ${pick(hs.info)}`, getLang(), () => {
      if (leftScreen || myIndex !== hotspotIndex) return
      advanceTimer = setTimeout(() => { hotspotIndex += 1; narrateNextHotspot() }, AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS)
    }).then((started) => {
      if (leftScreen || myIndex !== hotspotIndex) return
      if (!started) advanceTimer = setTimeout(() => { hotspotIndex += 1; narrateNextHotspot() }, AUTO_ADVANCE_FALLBACK_MS)
    })
  }

  function finishCutting() {
    captionEl.style.display = 'none'
    if (coalPile) coalPile.position.set(DROP_OFF_OFFSET.x, DROP_OFF_OFFSET.y, DROP_OFF_OFFSET.z)
    phase = 'transport'
    scenePromise.then((scene) => startTransportPhase(scene))
  }

  function startTransportPhase(scene) {
    hintEl.textContent = t('machSimDragBeltHint')
    renderChip('📦', pick(beltItem.title), () => onBeltDropped(scene))
  }

  function onBeltDropped(scene) {
    stopSpeaking()
    clearTimeout(advanceTimer)
    trayEl.innerHTML = ''
    hintEl.textContent = ''
    phase = 'transporting'

    ;(beltPreload ?? loader.loadAsync(beltItem.model).catch(() => null)).then((gltf) => {
      if (leftScreen || !anchorGroup || !gltf) return
      const belt = gltf.scene
      belt.scale.set(DIORAMA_BELT_SCALE, DIORAMA_BELT_SCALE, DIORAMA_BELT_SCALE)
      belt.position.set(DROP_OFF_OFFSET.x, 0, DROP_OFF_OFFSET.z)
      anchorGroup.add(belt)
    })

    captionEl.style.display = 'block'
    captionEl.innerHTML = `<h4>${t('machSimTransportingLabel')} ${pick(beltItem.title)}</h4><p>${pick(beltItem.info)}</p>`
    burstConfetti(main)
    navigator.vibrate?.(20)

    animateCoalExit()

    speak(`${pick(beltItem.title)}. ${pick(beltItem.info)}`, getLang(), () => {
      if (leftScreen) return
      advanceTimer = setTimeout(renderComplete, AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS)
    }).then((started) => {
      if (leftScreen) return
      if (!started) advanceTimer = setTimeout(renderComplete, AUTO_ADVANCE_FALLBACK_MS)
    })
  }

  function animateCoalExit() {
    if (!coalPile) return
    const start = { ...DROP_OFF_OFFSET }
    const end = EXIT_OFFSET
    const durationMs = 1600
    const startTime = performance.now()
    function tick() {
      if (leftScreen || !coalPile) return
      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / durationMs)
      coalPile.position.set(
        start.x + (end.x - start.x) * progress,
        start.y,
        start.z + (end.z - start.z) * progress
      )
      coalPile.scale.setScalar(1 - progress * 0.6)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  function renderComplete() {
    stopSpeaking()
    scenePromise.then((scene) => scene?.stop())
    main.innerHTML = `
      <div class="result-box result-valid" id="ops-sim-complete">
        <h4>${t('tourCompleteTitleMachinery')}</h4>
        <p>${t('tourCompleteBodyMachinery')}</p>
      </div>
      <div class="stack" style="margin-top:16px;">
        <button class="btn btn-accent btn-block" id="sim-quiz-btn">${t('takeQuiz')}</button>
        <button class="btn btn-block" id="sim-done-btn">${t('backToModules')}</button>
      </div>
    `
    main.querySelector('#sim-quiz-btn').addEventListener('click', () => navigate(`#/module/${mod.id}/quiz`))
    main.querySelector('#sim-done-btn').addEventListener('click', () => navigate('#/'))
    burstConfetti(main)
  }
}

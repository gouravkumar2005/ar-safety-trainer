import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getModule } from '../../content/modules.js'
import { getMachineryItem } from '../../content/machineryItems.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { startPlacementScene } from '../../shared/three/xrPlacementScene.js'
import { buildCoalPile } from '../../shared/three/proceduralModels.js'
import { burstConfetti } from '../../shared/ui/confetti.js'
import { icon, ITEM_ICONS } from '../../shared/ui/icon.js'

// Interactive drag-to-operate AR sim, replacing the plain swipe-through
// tour for Machinery Safety. Same shared placement core as
// ppeEquipSim.js (see that file's header + the plan for the full
// design). This is an explicit tabletop DIORAMA scale, not the 1:1
// real-world scale training/arViewerScreen.js's normal AR placement uses for this same
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
    <div id="sim-root" class="sim-stage">
      <video id="sim-video" class="sim-fill sim-video" autoplay playsinline muted></video>
      <canvas id="sim-canvas" class="sim-fill"></canvas>
      <div id="sim-overlay" class="sim-fill sim-overlay">
        <button class="back-btn sim-back" id="sim-back">${icon('arrow-left', { size: 22 })} ${t('back')}</button>
        <span class="badge badge-active sim-badge" id="sim-backend-badge"></span>
        <button class="icon-btn sim-recenter" id="sim-recenter" hidden aria-label="${t('arSimRecenterBtn')}" title="${t('arSimRecenterBtn')}">${icon('map-pin', { size: 22 })}</button>
        <div id="sim-marker" class="hotspot-btn sim-marker"></div>
        <p id="sim-hint" class="sim-hint"></p>
        <div id="sim-caption" class="sheet sim-caption"></div>
        <div id="sim-tray" class="sim-tray"></div>
      </div>
    </div>
    <p class="note" id="sim-illustrative-note"></p>
    <button class="btn btn-block mt-8" id="sim-use-tour">${icon('list-checks', { size: 20 })} ${t('arSimUseSimpleTourBtn')}</button>
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

  const scenePromise = startPlacementScene({ canvas, video, domOverlayRoot: overlay }).catch(() => null).then((scene) => {
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

  function renderChip(iconName, label, onDrag) {
    trayEl.innerHTML = ''
    const chip = document.createElement('div')
    chip.className = 'btn ops-chip'
    chip.style.touchAction = 'none'
    chip.dataset.active = 'true'
    chip.innerHTML = `${icon(iconName, { size: 26 })}<span class="chip-label">${label}</span>`
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
    renderChip('pickaxe', pick({ en: 'Continuous Miner', hi: 'कंटीन्यूअस माइनर' }), () => onMinerDropped(scene))
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
    captionEl.innerHTML = `<h4>${icon('pickaxe', { size: 20 })} ${t('machSimCuttingLabel')} ${pick(hs.label)}</h4><p>${pick(hs.info)}</p>`
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
    renderChip(ITEM_ICONS['conveyor-belt'], pick(beltItem.title), () => onBeltDropped(scene))
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
    captionEl.innerHTML = `<h4>${icon(ITEM_ICONS['conveyor-belt'], { size: 20 })} ${t('machSimTransportingLabel')} ${pick(beltItem.title)}</h4><p>${pick(beltItem.info)}</p>`
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
      <div class="big-status is-good" id="ops-sim-complete">
        <span class="big-icon">${icon('trophy', { size: 48 })}</span>
        <strong>${t('tourCompleteTitleMachinery')}</strong>
        <p>${t('tourCompleteBodyMachinery')}</p>
      </div>
      <div class="stack mt-16">
        <button class="btn btn-primary btn-block" id="sim-quiz-btn">${icon('clipboard-check', { size: 22 })} ${t('takeQuiz')}</button>
        <button class="btn btn-block" id="sim-done-btn">${icon('house', { size: 22 })} ${t('backToModules')}</button>
      </div>
    `
    main.querySelector('#sim-quiz-btn').addEventListener('click', () => navigate(`#/module/${mod.id}/quiz`))
    main.querySelector('#sim-done-btn').addEventListener('click', () => navigate('#/'))
    burstConfetti(main)
  }
}

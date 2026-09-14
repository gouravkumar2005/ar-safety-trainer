import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getModule } from '../data/modules.js'
import { ppeItems } from '../data/ppeItems.js'
import { t, pick, getLang } from '../utils/i18n.js'
import { speak, stopSpeaking } from '../utils/speech.js'
import { startPlacementScene } from '../utils/xrPlacementScene.js'
import { buildMannequin } from '../utils/proceduralModels.js'
import { burstConfetti } from '../utils/confetti.js'

// Interactive drag-to-equip AR sim, replacing the plain swipe-through
// tour for PPE Compliance. See the plan
// (C:\Users\goura\.claude\plans\...) for the full design — short
// version: a stylized procedural mannequin (proceduralModels.js) stands
// in front of the camera, real WebXR world-anchored placement on
// devices that support it (Android Chrome) and a fixed camera-preview
// fallback everywhere else (xrPlacementScene.js), and the 5 real PPE
// item models drag from a tray onto the figure. Equipping an item
// narrates the real injury risk of skipping it (ppeItems.js's new
// `consequence` field).

const DROP_THRESHOLD_PX = 60
const CHIP_EMOJI = {
  'ppe-helmet': '⛑️',
  'ppe-scsr': '🫁',
  'ppe-vest': '🦺',
  'ppe-boots': '🥾',
  'ppe-gas-detector': '📟',
}
const AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS = 600
const AUTO_ADVANCE_FALLBACK_MS = 5500

export function renderPpeEquipSim(main, navigate) {
  const mod = getModule('ppe-compliance')

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

  // Same class of hazard cprCameraAssist.js already solved: the camera/
  // render loop is a hardware resource, not a DOM node — a later route
  // (or this same screen re-rendering on a language toggle) needs to
  // stop it even if the user never clicks Back.
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
  let currentIndex = 0
  let mannequinGroup = null
  const loader = new GLTFLoader()
  const modelPreloads = new Map() // item id -> Promise<gltf|null>, kicked off once the scene is ready

  const scenePromise = startPlacementScene({ canvas, video, domOverlayRoot: overlay }).then((scene) => {
    if (leftScreen) {
      scene?.stop()
      return null
    }
    if (!scene) {
      // Neither WebXR nor the camera could start at all — fall back to
      // the existing plain walkthrough rather than a broken screen.
      cleanupAndLeave(`#/module/${mod.id}/tour`)
      return null
    }
    if (scene.backend === 'passthrough') video.style.display = 'block'
    backendBadge.textContent = scene.backend === 'webxr' ? t('arSimBackendWebxr') : t('arSimBackendPassthrough')

    if (scene.backend === 'webxr') {
      hintEl.textContent = t('arSimTapToPlaceHint')
      // Only meaningful on the WebXR tier — the passthrough tier has
      // nothing that can drift, so nothing to recenter (recenter() is
      // still a safe no-op there if this were ever shown by mistake).
      recenterBtn.hidden = false
      recenterBtn.addEventListener('click', () => {
        scene.recenter()
        hintEl.textContent = t('arSimTapToPlaceHint')
      })
    }

    // Kick off loading every item .glb in parallel as soon as the scene
    // exists, rather than fetching+parsing one lazily at the exact
    // moment of each drop — removes a network/parse hitch right at the
    // most interaction-heavy instant. Cached by item id; equipItem()
    // below awaits the cached promise instead of starting a fresh load.
    ppeItems.forEach((item) => {
      modelPreloads.set(item.id, loader.loadAsync(item.model).catch(() => null))
    })

    scene.requestPlacement().then(() => {
      if (leftScreen) return
      mannequinGroup = buildMannequin()
      scene.anchorGroup.add(mannequinGroup)
      startStep(scene)
    })

    scene.onFrame(() => {
      if (!mannequinGroup || currentIndex >= ppeItems.length) return
      const item = ppeItems[currentIndex]
      const anchor = mannequinGroup.userData.anchors[item.id]
      if (!anchor) return
      const worldPos = mannequinGroup.localToWorld(anchor.clone())
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

  function renderTray() {
    trayEl.innerHTML = ''
    ppeItems.forEach((item, i) => {
      const chip = document.createElement('div')
      chip.className = 'btn ppe-chip'
      chip.style.touchAction = 'none'
      chip.style.opacity = i === currentIndex ? '1' : i < currentIndex ? '0.35' : '0.6'
      chip.style.cursor = i === currentIndex ? 'grab' : 'default'
      chip.dataset.active = i === currentIndex ? 'true' : 'false'
      chip.innerHTML = `<div style="font-size:1.4rem;">${i < currentIndex ? '✅' : CHIP_EMOJI[item.id] || '🔧'}</div><div style="font-size:0.65rem;">${pick(item.title)}</div>`
      if (i === currentIndex) attachDrag(chip, item)
      trayEl.appendChild(chip)
    })
  }

  function attachDrag(chip, item) {
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
        equipItem(item)
      } else {
        chip.style.position = ''
        chip.style.left = ''
        chip.style.top = ''
        chip.style.zIndex = ''
      }
    })

    function moveTo(x, y) {
      const w = originRect.width
      const h = originRect.height
      chip.style.left = `${x - w / 2}px`
      chip.style.top = `${y - h / 2}px`
    }
  }

  function startStep(scene) {
    if (currentIndex >= ppeItems.length) {
      renderComplete()
      return
    }
    renderTray()
    const item = ppeItems[currentIndex]
    hintEl.textContent = t('arSimDragHint', { item: pick(item.title) })
    captionEl.style.display = 'none'
  }

  function equipItem(item) {
    stopSpeaking()
    clearTimeout(advanceTimer)
    scenePromise.then((scene) => {
      if (!scene || !mannequinGroup) return
      // Prefer the preload kicked off when the scene started (almost
      // always already resolved by the time the user has dragged this
      // far) — falls back to a fresh load only if preloading hasn't
      // finished yet or was somehow skipped.
      const preload = modelPreloads.get(item.id) ?? loader.loadAsync(item.model).catch(() => null)
      preload.then((gltf) => {
        if (leftScreen || !gltf) return
        const obj = gltf.scene
        const s = item.scale ?? 1
        obj.scale.set(s, s, s)
        const anchor = mannequinGroup.userData.anchors[item.id]
        if (anchor) obj.position.copy(anchor)
        mannequinGroup.add(obj)
      })
      // Non-critical either way — the marker/narration above already
      // confirms the item as "equipped" for training purposes even if
      // the visual attach failed (e.g. a dropped network fetch).
    })

    hintEl.textContent = ''
    captionEl.style.display = 'block'
    captionEl.innerHTML = `
      <h4>${pick(item.title)} — ${t('arSimEquippedLabel')}</h4>
      <p>${pick(item.consequence)}</p>
    `
    burstConfetti(main)
    navigator.vibrate?.(20)

    const myIndex = currentIndex
    speak(`${pick(item.title)}. ${pick(item.consequence)}`, getLang(), () => {
      if (leftScreen || myIndex !== currentIndex) return
      advanceTimer = setTimeout(() => advanceStep(myIndex), AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS)
    }).then((started) => {
      if (leftScreen || myIndex !== currentIndex) return
      if (!started) {
        advanceTimer = setTimeout(() => advanceStep(myIndex), AUTO_ADVANCE_FALLBACK_MS)
      }
    })
  }

  function advanceStep(expectedIndex) {
    if (expectedIndex !== currentIndex) return
    currentIndex += 1
    scenePromise.then((scene) => startStep(scene))
  }

  function renderComplete() {
    stopSpeaking()
    scenePromise.then((scene) => scene?.stop())
    main.innerHTML = `
      <div class="result-box result-valid" id="ppe-sim-complete">
        <h4>${t('tourCompleteTitlePpe')}</h4>
        <p>${t('tourCompleteBodyPpe')}</p>
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

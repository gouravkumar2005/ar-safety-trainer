import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getModule } from '../../content/modules.js'
import { ppeItems } from '../../content/ppeItems.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { startPlacementScene } from '../../shared/three/xrPlacementScene.js'
import { buildMannequin } from '../../shared/three/proceduralModels.js'
import { burstConfetti } from '../../shared/ui/confetti.js'
import { icon, ITEM_ICONS } from '../../shared/ui/icon.js'

// Interactive drag-to-equip AR sim, replacing the plain swipe-through
// tour for PPE Compliance. See the plan
// (C:\Users\goura\.claude\plans\...) for the full design — short
// version: a stylized procedural mannequin (proceduralModels.js) stands
// in front of the camera, real WebXR world-anchored placement on
// devices that support it (Android Chrome) and a fixed camera-preview
// fallback everywhere else (xrPlacementScene.js), and the 5 real PPE
// item models drag from a tray onto the figure. Equipping an item
// narrates the real injury risk of skipping it (content/ppeItems.js's new
// `consequence` field).

const DROP_THRESHOLD_PX = 60

export function renderPpeEquipSim(main, navigate) {
  const mod = getModule('ppe-compliance')

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

  // Same class of hazard emergency/cprCameraScreen.js already solved: the camera/
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

  const scenePromise = startPlacementScene({ canvas, video, domOverlayRoot: overlay }).catch(() => null).then((scene) => {
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
      chip.className = `btn ppe-chip ${i < currentIndex ? 'is-done' : ''}`
      chip.style.touchAction = 'none'
      chip.style.opacity = i === currentIndex ? '1' : i < currentIndex ? '0.35' : '0.6'
      chip.style.cursor = i === currentIndex ? 'grab' : 'default'
      chip.dataset.active = i === currentIndex ? 'true' : 'false'
      chip.innerHTML = `${icon(i < currentIndex ? 'circle-check' : ITEM_ICONS[item.id] || 'box', { size: 26 })}<span class="chip-label">${pick(item.title)}</span>`
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
      <h4>${icon('circle-check', { size: 20, cls: 'status-good' })} ${pick(item.title)} — ${t('arSimEquippedLabel')}</h4>
      <p>${pick(item.consequence)}</p>
    `
    burstConfetti(main)
    navigator.vibrate?.(20)

    const myIndex = currentIndex
    speak(`${pick(item.title)}. ${pick(item.consequence)}`, getLang())

    // The worker moves on when ready: a Next button, never a timer.
    const upNext = ppeItems[myIndex + 1]
    const nextBtn = document.createElement('button')
    nextBtn.className = 'btn btn-primary btn-block mt-8'
    nextBtn.innerHTML = upNext
      ? `${t('nextItem')} ${icon(ITEM_ICONS[upNext.id] || 'box', { size: 20 })} ${icon('chevron-right', { size: 20 })}`
      : `${icon('check', { size: 20 })} ${t('tourFinishBtn')}`
    nextBtn.addEventListener('click', () => {
      stopSpeaking()
      advanceStep(myIndex)
    })
    captionEl.appendChild(nextBtn)
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
      <div class="big-status is-good" id="ppe-sim-complete">
        <span class="big-icon">${icon('trophy', { size: 48 })}</span>
        <strong>${t('tourCompleteTitlePpe')}</strong>
        <p>${t('tourCompleteBodyPpe')}</p>
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

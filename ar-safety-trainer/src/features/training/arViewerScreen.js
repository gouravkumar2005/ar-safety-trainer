import { getModule } from '../../content/modules.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { icon, MODULE_ICONS } from '../../shared/ui/icon.js'

// <model-viewer> handles the actual AR session (WebXR on Chrome, Scene
// Viewer intent on Android, Quick Look on iOS with a usdz) — we just place
// hotspot buttons as children with data-position/data-normal and listen
// for clicks. See README "Tuning hotspots" for how to reposition these
// once you're looking at your own model instead of the demo one.

export function renderArViewer(main, navigate, params) {
  const mod = getModule(params.id)
  if (!mod || !mod.model) {
    main.innerHTML = `<p>${t('comingSoon')}</p>`
    return
  }

  // See modules.js's note on this module: the .glb exports were
  // normalized to a 1m bounding box, invisible here (model-viewer
  // auto-frames regardless of scale) but very wrong in real AR — `scale`
  // corrects it there. Hotspot cameraTarget math below needs the same
  // factor, since hotspot data-position values are authored in the
  // model's local (unscaled) space but cameraTarget expects world space.
  const s = mod.scale ?? 1

  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>
    <div class="page-head">
      <span class="head-icon">${icon(MODULE_ICONS[mod.domain] || 'box', { size: 30 })}</span>
      <div>
        <h2>${pick(mod.title)}</h2>
        <span class="offline-pill mt-8">${icon('wifi-off', { size: 14 })} ${t('offlineShort')}</span>
      </div>
    </div>

    <div class="viewer-wrap">
      <model-viewer
        id="mv"
        src="${mod.model}"
        alt="${pick(mod.title)}"
        scale="${s} ${s} ${s}"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
        exposure="1"
        auto-rotate
        auto-rotate-delay="1500"
        interaction-prompt="when-focused"
        ar
        ar-modes="scene-viewer webxr quick-look"
      >
        <button slot="ar-button" class="btn btn-accent ar-btn">${icon('scan', { size: 20 })} ${t('viewInAR')}</button>
      </model-viewer>
    </div>
    <div class="hint-icons">
      <span>${icon('rotate-3d', { size: 16 })} ${t('hintRotate')}</span>
      <span>${icon('move-3d', { size: 16 })} ${t('hintZoom')}</span>
      ${mod.hotspots?.length ? `<span>${icon('hand', { size: 16 })} ${t('hintTapDots')}</span>` : ''}
    </div>

    <div class="tile-grid mt-16">
      <button class="tile is-saffron" id="tour-btn">
        <span class="tile-icon">${icon('gamepad-2', { size: 28 })}</span>
        <span class="tile-label">${t('tourBtn')}</span>
      </button>
      ${mod.hasItemGallery ? `
      <button class="tile" id="gallery-btn">
        <span class="tile-icon">${icon('images', { size: 28 })}</span>
        <span class="tile-label">${t('ppeGalleryBtn')}</span>
      </button>` : ''}
    </div>
    <button class="btn btn-primary btn-block mt-16" id="quiz-btn">${icon('clipboard-check', { size: 22 })} ${t('takeQuiz')}</button>

    <div id="sheet-root"></div>
  `

  main.querySelector('#back').addEventListener('click', () => {
    stopSpeaking()
    navigate('#/')
  })
  main.querySelector('#quiz-btn').addEventListener('click', () => {
    stopSpeaking()
    navigate(`#/module/${mod.id}/quiz`)
  })
  main.querySelector('#gallery-btn')?.addEventListener('click', () => {
    stopSpeaking()
    navigate(`#/module/${mod.id}/gallery`)
  })
  main.querySelector('#tour-btn')?.addEventListener('click', () => {
    stopSpeaking()
    // ppe-compliance and machinery-safety have a richer interactive
    // drag-to-equip/drag-to-operate AR sim instead of the plain
    // swipe-through walk — see ppeEquipSim.js / machineryOpsSim.js. Every
    // other module still gets the generic training/tourScreen.js walk (and these two
    // fall back to it themselves if the AR sim's placement scene can't
    // start on this device — see xrPlacementScene.js).
    if (mod.id === 'ppe-compliance') navigate(`#/module/${mod.id}/equip`)
    else if (mod.id === 'machinery-safety') navigate(`#/module/${mod.id}/ops`)
    else navigate(`#/module/${mod.id}/tour`)
  })

  const mv = main.querySelector('#mv')
  const sheetRoot = main.querySelector('#sheet-root')

  mod.hotspots.forEach((hs) => {
    const btn = document.createElement('button')
    btn.className = 'hotspot-btn'
    btn.slot = `hotspot-${hs.id}`
    btn.dataset.position = hs.position
    btn.dataset.normal = hs.normal
    btn.setAttribute('aria-label', pick(hs.label))
    btn.addEventListener('click', () => {
      navigator.vibrate?.(15)
      // Camera glides to face this hotspot — model-viewer smoothly
      // interpolates camera-target on its own whenever it changes, no
      // custom animation loop needed. Non-critical: never let a camera
      // API hiccup block the info sheet from opening.
      try {
        const [x, y, z] = hs.position.split(' ').map(Number)
        mv.cameraTarget = `${x * s}m ${y * s}m ${z * s}m`
      } catch {
        // ignore — sheet still opens below regardless
      }
      showHotspotSheet(sheetRoot, hs, mv)
    })
    mv.appendChild(btn)
  })
}

function showHotspotSheet(root, hotspot, mv) {
  stopSpeaking()
  root.innerHTML = `
    <div class="sheet" id="sheet">
      <h4>${icon('info', { size: 20 })} ${pick(hotspot.label)}</h4>
      <p>${pick(hotspot.info)}</p>
      <div class="btn-row">
        <button class="btn" id="sheet-listen">${icon('volume-2', { size: 20 })} ${t('listenBtn')}</button>
        <button class="btn btn-primary" id="sheet-close">${icon('check', { size: 20 })} OK</button>
      </div>
      <p class="hint" id="sheet-voice-note" hidden>${t('voiceUnavailableNote')}</p>
    </div>
  `
  root.querySelector('#sheet-close').addEventListener('click', () => {
    stopSpeaking()
    try { mv.cameraTarget = 'auto auto auto' } catch { /* non-critical */ }
    root.innerHTML = ''
  })
  root.querySelector('#sheet-listen').addEventListener('click', async () => {
    const ok = await speak(`${pick(hotspot.label)}. ${pick(hotspot.info)}`, getLang())
    root.querySelector('#sheet-voice-note').hidden = ok
  })
}

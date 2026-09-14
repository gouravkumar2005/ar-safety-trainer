import { getModule } from '../data/modules.js'
import { getItemGallery } from '../data/itemGalleries.js'
import { t, pick, getLang } from '../utils/i18n.js'
import { speak, stopSpeaking } from '../utils/speech.js'
import { burstConfetti } from '../utils/confetti.js'

// Guided, swipeable, auto-narrated walkthrough. Two modes, chosen by what
// the module actually has (no new content authored for this — it reuses
// exactly what already exists):
//
// - Item-sequence (modules with hasItemGallery, e.g. PPE Compliance):
//   each step swaps in that item's own model, same data itemGallery.js/
//   itemViewer.js already use.
// - Hotspot-sequence (any other module with hotspots, e.g. Machinery
//   Safety): the module's own model loads once and stays — each step
//   glides the camera to that hotspot's position instead of swapping
//   models, the same cameraTarget math arViewer.js already uses. This is
//   "how the machine works, step by step."
//
// Advances on swipe (Pointer Events — one path for touch and mouse),
// explicit Prev/Next buttons, or automatically once narration for the
// current step finishes speaking (speech.js's onEnd) — never on a fixed
// timer that could cut a sentence short. If no voice exists for the
// current language, falls back to a fixed dwell instead of waiting on
// narration that will never happen.

const AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS = 600
const AUTO_ADVANCE_FALLBACK_MS = 5000

export function renderTour(main, navigate, params) {
  const mod = getModule(params.id)
  if (!mod) {
    navigate('#/')
    return
  }

  // Deliberately NOT the same flag as hasItemGallery — a module can have
  // an item gallery (e.g. machinery-safety's forklift/conveyor) while its
  // guided tour still walks its hotspots, not that gallery. See
  // modules.js's comment on tourItemMode.
  const itemMode = !!mod.tourItemMode
  const steps = itemMode
    ? getItemGallery(mod.id).map((item) => ({ title: item.title, info: item.info, model: item.model, scale: item.scale }))
    : (mod.hotspots || []).map((hs) => ({ title: hs.label, info: hs.info, position: hs.position }))

  if (steps.length === 0) {
    navigate(`#/module/${mod.id}`)
    return
  }

  let index = 0
  let advanceTimer = null

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${pick(mod.title)}</button>
    <div class="progress-dots" aria-hidden="true" style="margin-top:14px;" id="tour-dots"></div>
    <div id="tour-swipe-zone">
      <div class="viewer-wrap" style="margin-top:10px;" id="tour-viewer"></div>
      <p class="hint">${t('tourSwipeHint')}</p>
      <div class="module-card" id="tour-text" style="margin-top:12px;"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button class="btn" id="tour-prev" style="flex:1;">${t('tourPrev')}</button>
      <button class="btn btn-primary" id="tour-next" style="flex:1;">${t('next')}</button>
    </div>
  `

  main.querySelector('#back').addEventListener('click', () => {
    stopSpeaking()
    clearTimeout(advanceTimer)
    navigate(`#/module/${mod.id}`)
  })

  const viewerRoot = main.querySelector('#tour-viewer')
  const dotsRoot = main.querySelector('#tour-dots')
  const textRoot = main.querySelector('#tour-text')
  const prevBtn = main.querySelector('#tour-prev')
  const nextBtn = main.querySelector('#tour-next')

  // Hotspot mode: one model-viewer, created once, reused across steps —
  // only its cameraTarget changes. Item mode creates a fresh one per step
  // inside renderStep() instead, since the model itself changes.
  let mv = null
  if (!itemMode) {
    const s = mod.scale ?? 1
    viewerRoot.innerHTML = `
      <model-viewer
        id="mv" src="${mod.model}" alt="${pick(mod.title)}" scale="${s} ${s} ${s}"
        camera-controls touch-action="pan-y" shadow-intensity="1" exposure="1"
        auto-rotate auto-rotate-delay="1500"
        ar ar-modes="webxr scene-viewer quick-look"
      ></model-viewer>
    `
    mv = viewerRoot.querySelector('#mv')
  }

  function renderDots() {
    dotsRoot.innerHTML = steps.map((_, i) => `<span class="${i < index ? 'done' : i === index ? 'current' : ''}"></span>`).join('')
  }

  // stopSpeaking()/cancel() fires the *previous* utterance's 'error' event
  // (speech.js treats that the same as 'end', so onEnd always eventually
  // fires even on failure) — which means every manual Next/Prev/swipe
  // cancels the outgoing step's speech and, as a side effect, triggers
  // *that outgoing step's* onEnd a moment later. Without a guard, that
  // stale callback would schedule an extra goNext() shortly after the
  // user already manually navigated, silently skipping a step. Each
  // renderStep() call gets a token; callbacks from a step the user has
  // since left check it and no-op instead of firing.
  let renderId = 0

  function renderStep() {
    const myRenderId = ++renderId
    stopSpeaking()
    clearTimeout(advanceTimer)
    const step = steps[index]
    renderDots()

    if (itemMode) {
      const s = step.scale ?? 1
      viewerRoot.innerHTML = `
        <model-viewer
          src="${step.model}" alt="${pick(step.title)}" scale="${s} ${s} ${s}"
          camera-controls touch-action="pan-y" shadow-intensity="1" exposure="1"
          auto-rotate auto-rotate-delay="1500"
          ar ar-modes="webxr scene-viewer quick-look"
        ></model-viewer>
      `
    } else if (mv) {
      try {
        const s = mod.scale ?? 1
        const [x, y, z] = step.position.split(' ').map(Number)
        mv.cameraTarget = `${x * s}m ${y * s}m ${z * s}m`
      } catch {
        // non-critical — step still shows its text/narration regardless
      }
    }

    textRoot.innerHTML = `
      <h3 class="card-h3" style="font-size:1rem;margin:0 0 8px;">${pick(step.title)}</h3>
      <p style="margin:0;line-height:1.5;">${pick(step.info)}</p>
    `

    prevBtn.disabled = index === 0
    nextBtn.textContent = index === steps.length - 1 ? t('tourFinishBtn') : t('next')

    speak(`${pick(step.title)}. ${pick(step.info)}`, getLang(), () => {
      if (myRenderId !== renderId) return // stale — user already moved on
      advanceTimer = setTimeout(() => {
        if (myRenderId === renderId) goNext()
      }, AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS)
    }).then((started) => {
      if (myRenderId !== renderId) return
      if (!started) {
        advanceTimer = setTimeout(() => {
          if (myRenderId === renderId) goNext()
        }, AUTO_ADVANCE_FALLBACK_MS)
      }
    })
  }

  function goNext() {
    clearTimeout(advanceTimer)
    if (index < steps.length - 1) {
      index += 1
      renderStep()
    } else {
      renderComplete()
    }
  }

  function goPrev() {
    clearTimeout(advanceTimer)
    if (index > 0) {
      index -= 1
      renderStep()
    }
  }

  nextBtn.addEventListener('click', goNext)
  prevBtn.addEventListener('click', goPrev)

  // Swipe — attached to a child of main (not main itself) so it's
  // automatically cleaned up whenever this or any later screen replaces
  // main's content; every other screen in this app follows the same rule.
  const swipeZone = main.querySelector('#tour-swipe-zone')
  let startX = null
  swipeZone.addEventListener('pointerdown', (e) => { startX = e.clientX })
  swipeZone.addEventListener('pointerup', (e) => {
    if (startX === null) return
    const dx = e.clientX - startX
    startX = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) goNext()
    else goPrev()
  })

  function renderComplete() {
    stopSpeaking()
    const titleKey = itemMode ? 'tourCompleteTitlePpe' : 'tourCompleteTitleMachinery'
    const bodyKey = itemMode ? 'tourCompleteBodyPpe' : 'tourCompleteBodyMachinery'
    const s = mod.scale ?? 1
    main.innerHTML = `
      <div class="result-box result-valid" id="tour-complete">
        <h4>${t(titleKey)}</h4>
        <p>${t(bodyKey)}</p>
      </div>
      ${itemMode ? `
        <div class="viewer-wrap" style="margin-top:14px;">
          <model-viewer src="${mod.model}" alt="${pick(mod.title)}" scale="${s} ${s} ${s}" camera-controls auto-rotate ar ar-modes="webxr scene-viewer quick-look"></model-viewer>
        </div>
      ` : ''}
      <div class="stack" style="margin-top:16px;">
        <button class="btn btn-accent btn-block" id="tour-quiz-btn">${t('takeQuiz')}</button>
        <button class="btn btn-block" id="tour-done-btn">${t('backToModules')}</button>
      </div>
    `
    main.querySelector('#tour-quiz-btn').addEventListener('click', () => navigate(`#/module/${mod.id}/quiz`))
    main.querySelector('#tour-done-btn').addEventListener('click', () => navigate('#/'))
    burstConfetti(main)
  }

  renderStep()
}

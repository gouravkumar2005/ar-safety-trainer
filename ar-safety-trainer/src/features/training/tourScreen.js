import { getModule } from '../../content/modules.js'
import { getItemGallery } from '../../content/itemGalleries.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { burstConfetti } from '../../shared/ui/confetti.js'
import { icon } from '../../shared/ui/icon.js'

// Guided, swipeable, auto-narrated walkthrough. Two modes, chosen by what
// the module actually has (no new content authored for this — it reuses
// exactly what already exists):
//
// - Item-sequence (modules with hasItemGallery, e.g. PPE Compliance):
//   each step swaps in that item's own model, same data itemGallery/galleryScreen.js/
//   itemGallery/itemViewerScreen.js already use.
// - Hotspot-sequence (any other module with hotspots, e.g. Machinery
//   Safety): the module's own model loads once and stays — each step
//   glides the camera to that hotspot's position instead of swapping
//   models, the same cameraTarget math training/arViewerScreen.js already uses. This is
//   "how the machine works, step by step."
//
// Advances on swipe (Pointer Events — one path for touch and mouse),
// explicit Prev/Next buttons, or automatically once narration for the
// current step finishes speaking (speech.js's onEnd) — never on a fixed
// timer that could cut a sentence short. If no voice exists for the
// current language, falls back to a fixed dwell instead of waiting on
// narration that will never happen.


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
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${pick(mod.shortTitle || mod.title)}</button>
    <div class="progress-dots mt-8" aria-hidden="true" id="tour-dots"></div>
    <div id="tour-swipe-zone">
      <!-- Arrow buttons sit on the viewer's edges; dragging the model only
           rotates it and never changes the step. -->
      <div class="viewer-wrap">
        <div id="tour-viewer"></div>
        <button class="viewer-nav is-prev" id="tour-arrow-prev" aria-label="${t('tourPrev')}" title="${t('tourPrev')}">${icon('chevron-left', { size: 30, stroke: 2.5 })}</button>
        <button class="viewer-nav is-next" id="tour-arrow-next" aria-label="${t('next')}" title="${t('next')}">${icon('chevron-right', { size: 30, stroke: 2.5 })}</button>
      </div>
      <div class="hint-icons">
        <span>${icon('chevron-right', { size: 16 })} ${t('hintTapArrows')}</span>
        <span>${icon('volume-2', { size: 16 })} ${t('hintAutoVoice')}</span>
      </div>
      <div class="module-card tour-card mt-12" id="tour-text"></div>
    </div>
    <div class="btn-row mt-12">
      <button class="btn" id="tour-prev">${icon('arrow-left', { size: 20 })} ${t('tourPrev')}</button>
      <button class="btn btn-primary" id="tour-next"></button>
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
  const arrowPrev = main.querySelector('#tour-arrow-prev')
  const arrowNext = main.querySelector('#tour-arrow-next')

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
    ++renderId
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
      <h3><span class="badge badge-info">${index + 1}/${steps.length}</span> ${pick(step.title)}</h3>
      <p>${pick(step.info)}</p>
    `

    prevBtn.disabled = index === 0
    arrowPrev.disabled = index === 0
    nextBtn.innerHTML = index === steps.length - 1
      ? `${icon('check', { size: 20 })} ${t('tourFinishBtn')}`
      : `${t('next')} ${icon('chevron-right', { size: 20 })}`

    // Narrate the step, but never move on by itself: the worker decides
    // when to go next (arrow / Next button).
    speak(`${pick(step.title)}. ${pick(step.info)}`, getLang())
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
  arrowNext.addEventListener('click', goNext)
  arrowPrev.addEventListener('click', goPrev)


  function renderComplete() {
    stopSpeaking()
    const titleKey = itemMode ? 'tourCompleteTitlePpe' : 'tourCompleteTitleMachinery'
    const bodyKey = itemMode ? 'tourCompleteBodyPpe' : 'tourCompleteBodyMachinery'
    const s = mod.scale ?? 1
    main.innerHTML = `
      <div class="big-status is-good" id="tour-complete">
        <span class="big-icon">${icon('trophy', { size: 48 })}</span>
        <strong>${t(titleKey)}</strong>
        <p>${t(bodyKey)}</p>
      </div>
      ${itemMode ? `
        <div class="viewer-wrap mt-12">
          <model-viewer src="${mod.model}" alt="${pick(mod.title)}" scale="${s} ${s} ${s}" camera-controls auto-rotate ar ar-modes="webxr scene-viewer quick-look"></model-viewer>
        </div>
      ` : ''}
      <div class="stack mt-16">
        <button class="btn btn-primary btn-block" id="tour-quiz-btn">${icon('clipboard-check', { size: 22 })} ${t('takeQuiz')}</button>
        <button class="btn btn-block" id="tour-done-btn">${icon('house', { size: 22 })} ${t('backToModules')}</button>
      </div>
    `
    main.querySelector('#tour-quiz-btn').addEventListener('click', () => navigate(`#/module/${mod.id}/quiz`))
    main.querySelector('#tour-done-btn').addEventListener('click', () => navigate('#/'))
    burstConfetti(main)
  }

  renderStep()
}

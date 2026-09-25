import { EMERGENCY_RESPONSE_MODULE_ID } from '../../content/modules.js'
import { findGuideById } from './emergencyGuides.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { burstConfetti } from '../../shared/ui/confetti.js'
import { startPoseOverlay, isPoseTrackingSupported } from './poseTracker.js'
import { icon } from '../../shared/ui/icon.js'
import { GUIDE_ICONS } from './hubScreen.js'

// Narrated, swipeable step sequence for one emergency guide — same
// interaction pattern as training/tourScreen.js (progress dots, Pointer Events swipe,
// auto-advance once narration for the current step finishes), simplified
// since there's no model-viewer or item/hotspot data here, just bilingual
// step text. No quiz/gate/certificate afterwards: this is a reference
// tool for a live emergency, not a graded module.
//
// Two optional per-step additions, both honest about what they do (see
// the safety boundary in emergency/emergencyGuides.js):
//   - step.cameraAssist: a button into the real hand-motion CPR rate
//     screen (emergency/cprCameraScreen.js) — CPR guide's compression step only.
//   - step.poseAssist: an inline "show me on camera" toggle drawing a
//     position-only marker (poseTracker.js) on the limb this guide
//     already concerns — never a diagnosis.

const AUTO_ADVANCE_PAUSE_AFTER_SPEECH_MS = 600
const AUTO_ADVANCE_FALLBACK_MS = 5000

const POSE_ZONE_BY_GUIDE = { bleeding: 'arm', fracture: 'leg' }

export function renderEmergencyGuide(main, navigate, params) {
  const guide = findGuideById(params.guideId)
  if (!guide) {
    main.innerHTML = `
      <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('emergencyBackToHub')}</button>
      <div class="result-box result-warn">${icon('circle-alert', { size: 22 })}<p>${t('emergencyGuideNotFound')}</p></div>
    `
    main.querySelector('#back').addEventListener('click', () => navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}`))
    return
  }

  const steps = guide.steps
  let index = 0
  let advanceTimer = null
  let poseController = null

  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('emergencyBackToHub')}</button>
    <div class="page-head">
      <span class="head-icon is-red">${icon(GUIDE_ICONS[guide.id] || 'hand-heart', { size: 30 })}</span>
      <div><h2>${pick(guide.title)}</h2><p id="eg-step-of"></p></div>
    </div>
    <div class="progress-dots" aria-hidden="true" id="eg-dots"></div>
    <div id="eg-swipe-zone">
      <div class="module-card tour-card" id="eg-text"></div>
      <div id="eg-extras" class="mt-12"></div>
      <div class="hint-icons">
        <span>${icon('hand', { size: 16 })} ${t('tourSwipeHint')}</span>
        <span>${icon('volume-2', { size: 16 })} ${t('hintAutoVoice')}</span>
      </div>
    </div>
    <div class="btn-row mt-12">
      <button class="btn" id="eg-prev">${icon('arrow-left', { size: 20 })} ${t('tourPrev')}</button>
      <button class="btn btn-primary" id="eg-next"></button>
    </div>
  `

  function stopPoseOverlay() {
    if (poseController) {
      poseController.stop()
      poseController = null
    }
  }

  main.querySelector('#back').addEventListener('click', () => {
    stopSpeaking()
    stopPoseOverlay()
    clearTimeout(advanceTimer)
    navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}`)
  })

  const dotsRoot = main.querySelector('#eg-dots')
  const stepOfRoot = main.querySelector('#eg-step-of')
  const textRoot = main.querySelector('#eg-text')
  const extrasRoot = main.querySelector('#eg-extras')
  const prevBtn = main.querySelector('#eg-prev')
  const nextBtn = main.querySelector('#eg-next')

  function renderDots() {
    dotsRoot.innerHTML = steps.map((_, i) => `<span class="${i < index ? 'done' : i === index ? 'current' : ''}"></span>`).join('')
  }

  // Same staleness guard training/tourScreen.js uses — stopSpeaking()'s 'error' event on
  // the outgoing utterance would otherwise schedule a stray extra advance
  // after the user has already manually moved on.
  let renderId = 0

  function renderStep() {
    const myRenderId = ++renderId
    stopSpeaking()
    stopPoseOverlay()
    clearTimeout(advanceTimer)
    const step = steps[index]
    renderDots()
    stepOfRoot.textContent = t('emergencyStepOf', { n: index + 1, total: steps.length })

    textRoot.innerHTML = `
      <h3><span class="badge badge-bad">${index + 1}</span> ${pick(step.title)}</h3>
      <p>${pick(step.info)}</p>
    `

    extrasRoot.innerHTML = ''
    if (step.cameraAssist) {
      const btn = document.createElement('button')
      btn.className = 'btn btn-accent btn-block'
      btn.innerHTML = `${icon('camera', { size: 22 })} ${t('emergencyCameraAssistBtn')}`
      btn.addEventListener('click', () => {
        stopSpeaking()
        clearTimeout(advanceTimer)
        navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}/camera/cpr`)
      })
      extrasRoot.appendChild(btn)
    } else if (step.poseAssist) {
      renderPoseAssistToggle(step)
    }

    prevBtn.disabled = index === 0
    nextBtn.innerHTML = index === steps.length - 1
      ? `${icon('check', { size: 20 })} ${t('tourFinishBtn')}`
      : `${t('next')} ${icon('chevron-right', { size: 20 })}`

    speak(`${pick(step.title)}. ${pick(step.info)}`, getLang(), () => {
      if (myRenderId !== renderId) return
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

  function renderPoseAssistToggle(step) {
    const wrap = document.createElement('div')
    wrap.className = 'module-card'
    const zone = POSE_ZONE_BY_GUIDE[guide.id] || 'arm'

    if (!isPoseTrackingSupported()) return // silently omit — core guide works fully without it

    wrap.innerHTML = `
      <button class="btn btn-block" id="pose-toggle-btn">${icon('camera', { size: 22 })} ${t('emergencyPoseAssistBtn')}</button>
      <p class="hint">${t('emergencyPoseAssistNote')}</p>
      <div id="pose-video-area" class="mt-8"></div>
    `
    extrasRoot.appendChild(wrap)

    const toggleBtn = wrap.querySelector('#pose-toggle-btn')
    const videoArea = wrap.querySelector('#pose-video-area')
    let localStream = null

    toggleBtn.addEventListener('click', async () => {
      if (poseController) {
        stopPoseOverlay()
        if (localStream) {
          localStream.getTracks().forEach((tr) => tr.stop())
          localStream = null
        }
        videoArea.innerHTML = ''
        return
      }
      videoArea.innerHTML = `
        <div class="viewer-wrap" style="border-radius:14px;overflow:hidden;background:#000;position:relative;">
          <video id="pose-video" autoplay playsinline muted style="width:100%;display:block;transform:scaleX(-1);"></video>
          <canvas id="pose-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;transform:scaleX(-1);"></canvas>
        </div>
      `
      const video = videoArea.querySelector('#pose-video')
      const canvas = videoArea.querySelector('#pose-canvas')
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      } catch {
        videoArea.innerHTML = `<p class="hint">${t('emergencyCameraPermissionDenied')}</p>`
        return
      }
      video.srcObject = localStream
      await video.play().catch(() => {})
      poseController = await startPoseOverlay(video, canvas, zone)
      if (!poseController) {
        videoArea.innerHTML = `<p class="hint">${t('emergencyCameraPermissionDenied')}</p>`
        localStream.getTracks().forEach((tr) => tr.stop())
        localStream = null
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

  const swipeZone = main.querySelector('#eg-swipe-zone')
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
    stopPoseOverlay()
    main.innerHTML = `
      <div class="big-status is-good" id="eg-complete">
        <span class="big-icon">${icon('hand-heart', { size: 48 })}</span>
        <strong>${pick(guide.title)}</strong>
        <p>${t('emergencyCompleteBody')}</p>
      </div>
      <div class="stack mt-16">
        <a class="btn btn-sos btn-block" href="tel:108">${icon('phone', { size: 22 })} ${t('callAmbulance')}</a>
        <button class="btn btn-block" id="eg-done-btn">${icon('siren', { size: 22 })} ${t('emergencyBackToHub')}</button>
      </div>
    `
    main.querySelector('#eg-done-btn').addEventListener('click', () => navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}`))
    burstConfetti(main)
  }

  renderStep()
}

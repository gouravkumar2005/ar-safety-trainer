import { EMERGENCY_RESPONSE_MODULE_ID } from '../../content/modules.js'
import { t } from '../../core/i18n/index.js'
import { startHandTracking, isHandTrackingSupported } from './handTracker.js'
import { tone } from '../../shared/ui/sound.js'

// Live camera + real hand-motion-derived CPR rate. Everything shown here
// comes from actually detected motion (see handTracker.js) — there is no
// canned animation standing in for it, and the module degrades cleanly
// (text note, no crash) if the camera or the on-device model can't load.
// A steady reference beep at 110/min (the middle of the 100-120 target
// band) is independent of the detected rate — it's a pacing aid, not a
// judgment on the user's actual rhythm.

const REFERENCE_BPM = 110

export function renderCprCameraAssist(main, navigate) {
  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('emergencyBackToHub')}</button>
    <h2 class="h2-title" style="margin:12px 0 4px;">${t('emergencyCameraAssistHeading')}</h2>
    <p class="subtitle-dim" style="margin:0 0 14px;">${t('emergencyCameraAssistNote')}</p>

    <div id="camera-area"></div>
  `

  main.querySelector('#back').addEventListener('click', () => {
    cleanup()
    navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}/guide/cpr`)
  })

  const area = main.querySelector('#camera-area')

  let stream = null
  let handController = null
  let beepTimer = null

  function cleanup() {
    if (beepTimer) clearInterval(beepTimer)
    if (handController) handController.stop()
    if (stream) stream.getTracks().forEach((track) => track.stop())
  }

  if (!isHandTrackingSupported()) {
    area.innerHTML = `<div class="result-box result-warn"><p>${t('emergencyCameraPermissionDenied')}</p></div>`
    return
  }

  area.innerHTML = `
    <div class="viewer-wrap" style="border-radius:14px;overflow:hidden;background:#000;position:relative;">
      <video id="cpr-video" autoplay playsinline muted style="width:100%;display:block;transform:scaleX(-1);"></video>
    </div>
    <div class="module-card" style="margin-top:14px;text-align:center;">
      <p class="hint" style="margin:0 0 4px;">${t('emergencyCameraTargetBand')}</p>
      <div id="rate-display" style="font-size:2.2rem;font-weight:700;">—</div>
      <p class="hint" id="rate-unit" style="margin:2px 0 10px;">${t('emergencyCameraRateUnit')}</p>
      <div style="height:10px;border-radius:6px;background:var(--border);overflow:hidden;">
        <div id="amplitude-bar" style="height:100%;width:0%;background:var(--accent-2);transition:width 0.1s linear;"></div>
      </div>
      <p class="hint" id="confidence-note" style="margin-top:10px;min-height:1em;"></p>
    </div>
  `

  const video = area.querySelector('#cpr-video')
  const rateDisplay = area.querySelector('#rate-display')
  const amplitudeBar = area.querySelector('#amplitude-bar')
  const confidenceNote = area.querySelector('#confidence-note')

  // The camera stream and its rAF detection loop are hardware resources,
  // not DOM nodes — replacing main's innerHTML (any later route, or even
  // this same screen re-rendering on a language toggle) won't stop them
  // on its own. Watch for this screen's own <video> leaving `main` and
  // stop everything the moment that happens, covering every way the user
  // can leave (back button, hash change, or a same-screen re-render).
  const observer = new MutationObserver(() => {
    if (!main.contains(video)) {
      cleanup()
      observer.disconnect()
    }
  })
  observer.observe(main, { childList: true, subtree: true })

  navigator.mediaDevices
    ?.getUserMedia({ video: { facingMode: 'environment' } })
    .then(async (mediaStream) => {
      stream = mediaStream
      video.srcObject = stream
      await video.play().catch(() => {})

      handController = await startHandTracking(video, ({ rate, amplitude, lowConfidence }) => {
        rateDisplay.textContent = rate != null ? String(rate) : '—'
        amplitudeBar.style.width = `${Math.round(amplitude * 100)}%`
        confidenceNote.textContent = lowConfidence ? t('emergencyCameraLowConfidence') : ''
      })

      if (!handController) {
        area.innerHTML = `<div class="result-box result-warn"><p>${t('emergencyCameraPermissionDenied')}</p></div>`
        return
      }

      // Steady reference metronome — a pacing aid, independent of the
      // detected rate above (never adjusted to match it).
      const intervalMs = 60000 / REFERENCE_BPM
      beepTimer = setInterval(() => tone(880, 0.06, 'sine', 0.1), intervalMs)
    })
    .catch(() => {
      area.innerHTML = `<div class="result-box result-warn"><p>${t('emergencyCameraPermissionDenied')}</p></div>`
    })
}

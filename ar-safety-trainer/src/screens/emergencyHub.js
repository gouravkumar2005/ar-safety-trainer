import { EMERGENCY_RESPONSE_MODULE_ID, getModule } from '../data/modules.js'
import { EMERGENCY_GUIDES, matchGuideFromTranscript } from '../data/emergencyGuides.js'
import { t, pick, getLang } from '../utils/i18n.js'
import { isVoiceCommandSupported, listenOnce } from '../utils/voiceCommand.js'

// Entry point for Emergency Response. Two ways in, both equally real —
// neither is a "fake" fallback dressed up:
//   1. Mic: say what happened, keyword-matched (never guessed) against
//      each guide's keyword list (data/emergencyGuides.js). No match ->
//      an honest "didn't catch that" message, not a wrong guide.
//   2. Manual grid: always available, works with zero camera/mic
//      permissions — the same .module-card pattern used everywhere else.
//
// This module has no gate, no quiz, no .glb — it's a reference/assist
// tool for a live emergency, not a graded training module.

export function renderEmergencyHub(main, navigate) {
  const mod = getModule(EMERGENCY_RESPONSE_MODULE_ID)

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
    <h2 class="h2-title" style="margin:12px 0 4px;">${pick(mod.title)}</h2>
    <p class="subtitle-dim" style="margin:0 0 18px;">${t('emergencySubheading')}</p>

    <div class="module-card" id="mic-card" style="text-align:center;cursor:pointer;">
      <button class="btn btn-accent btn-block" id="mic-btn">${t('emergencyMicBtn')}</button>
      <p class="hint" id="mic-status" style="margin-top:8px;min-height:1em;"></p>
    </div>

    <h3 class="card-h3" style="margin:20px 0 10px;">${t('emergencyGridHeading')}</h3>
    <div id="guide-list"></div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))

  const micBtn = main.querySelector('#mic-btn')
  const micStatus = main.querySelector('#mic-status')

  if (!isVoiceCommandSupported()) {
    micStatus.textContent = t('emergencyMicUnsupported')
    micBtn.disabled = true
  }

  micBtn.addEventListener('click', async () => {
    if (micBtn.disabled) return
    micBtn.disabled = true
    micStatus.textContent = t('emergencyMicListening')
    const transcript = await listenOnce(getLang())
    const guide = matchGuideFromTranscript(transcript)
    micBtn.disabled = false
    if (guide) {
      micStatus.textContent = ''
      navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}/guide/${guide.id}`)
    } else {
      micStatus.textContent = t('emergencyMicNoMatch')
    }
  })

  const list = main.querySelector('#guide-list')
  EMERGENCY_GUIDES.forEach((guide) => {
    const card = document.createElement('div')
    card.className = 'module-card'
    card.style.cursor = 'pointer'
    card.innerHTML = `<h3>${pick(guide.title)}</h3><p>${pick(guide.summary)}</p>`
    card.addEventListener('click', () => navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}/guide/${guide.id}`))
    list.appendChild(card)
  })
}

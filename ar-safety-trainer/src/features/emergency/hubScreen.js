import { EMERGENCY_RESPONSE_MODULE_ID, getModule } from '../../content/modules.js'
import { EMERGENCY_GUIDES, matchGuideFromTranscript } from './emergencyGuides.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { isVoiceCommandSupported, listenOnce } from '../../platform/voiceInput.js'
import { icon } from '../../shared/ui/icon.js'

// One picture per first-aid guide (ids from emergencyGuides.js).
export const GUIDE_ICONS = {
  bleeding: 'droplet',
  fracture: 'bone',
  burn: 'flame',
  choking: 'wind',
  cpr: 'heart-pulse',
}

// Entry point for Emergency Response. Two ways in, both equally real —
// neither is a "fake" fallback dressed up:
//   1. Mic: say what happened, keyword-matched (never guessed) against
//      each guide's keyword list (emergency/emergencyGuides.js). No match ->
//      an honest "didn't catch that" message, not a wrong guide.
//   2. Manual grid: always available, works with zero camera/mic
//      permissions — the same .module-card pattern used everywhere else.
//
// This module has no gate, no quiz, no .glb — it's a reference/assist
// tool for a live emergency, not a graded training module.

export function renderEmergencyHub(main, navigate) {
  const mod = getModule(EMERGENCY_RESPONSE_MODULE_ID)

  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>
    <div class="page-head">
      <span class="head-icon is-red">${icon('siren', { size: 30 })}</span>
      <div><h2>${pick(mod.shortTitle || mod.title)}</h2><p>${t('emergencySubheadingShort')}</p></div>
    </div>

    <button class="btn btn-sos btn-block" id="mic-btn">${icon('mic', { size: 26 })} ${t('emergencyMicBtn')}</button>
    <p class="hint" id="mic-status" aria-live="polite" style="min-height:1em;"></p>

    <h3 class="section-title">${t('emergencyGridHeading')}</h3>
    <div class="tile-grid" id="guide-list"></div>

    <a class="btn btn-block mt-16" href="tel:108">${icon('phone', { size: 22 })} ${t('callAmbulance')}</a>
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
    const tile = document.createElement('button')
    tile.className = 'tile is-red'
    tile.setAttribute('aria-label', `${pick(guide.title)}. ${pick(guide.summary)}`)
    tile.innerHTML = `
      <span class="tile-icon">${icon(GUIDE_ICONS[guide.id] || 'hand-heart', { size: 32 })}</span>
      <span class="tile-label">${pick(guide.title)}</span>
    `
    tile.addEventListener('click', () => navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}/guide/${guide.id}`))
    list.appendChild(tile)
  })
}

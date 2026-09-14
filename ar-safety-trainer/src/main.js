import '@google/model-viewer'
import './style.css'
import { t, toggleLang, getLang } from './utils/i18n.js'
import { getResult } from './utils/state.js'
import { PPE_GATE_MODULE_ID, EMERGENCY_RESPONSE_MODULE_ID } from './data/modules.js'
import { renderHome } from './screens/home.js'
import { renderArViewer } from './screens/arViewer.js'
import { renderQuiz } from './screens/quiz.js'
import { renderResult } from './screens/result.js'
import { renderCertificate } from './screens/certificate.js'
import { renderVerify } from './screens/verify.js'
import { renderAdmin } from './screens/admin.js'
import { renderGrievance } from './screens/grievance.js'
import { renderItemGallery } from './screens/itemGallery.js'
import { renderItemViewer } from './screens/itemViewer.js'
import { renderTour } from './screens/tour.js'
import { renderEmergencyHub } from './screens/emergencyHub.js'
import { renderEmergencyGuide } from './screens/emergencyGuide.js'
import { renderCprCameraAssist } from './screens/cprCameraAssist.js'
import { isMuted, toggleMuted } from './utils/sound.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <strong id="brand-name"></strong>
      <span id="brand-tagline"></span>
    </div>
    <div class="stack" style="flex-direction:row;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
      <button class="btn" id="text-size-btn" title="Text size">Aa</button>
      <button class="btn" id="sound-btn" title="Sound"></button>
      <button class="btn" id="verify-nav-btn"></button>
      <button class="btn" id="lang-btn"></button>
    </div>
  </header>
  <main id="main"></main>
`

const main = app.querySelector('#main')

// Text-size control: cycles base -> lg -> xl -> base, persisted the same
// way i18n.js persists language (a flat localStorage key, not the bigger
// state.js blob — this is a standalone UI preference, not app data). Every
// font-size in style.css is in rem, so one <html> class scales all of them.
const TEXT_SIZES = ['', 'text-lg', 'text-xl']
let textSizeIndex = Math.max(0, TEXT_SIZES.indexOf(localStorage.getItem('textSize') || ''))
applyTextSize()

function applyTextSize() {
  document.documentElement.classList.remove('text-lg', 'text-xl')
  const cls = TEXT_SIZES[textSizeIndex]
  if (cls) document.documentElement.classList.add(cls)
}

function paintChrome() {
  document.documentElement.lang = getLang()
  app.querySelector('#brand-name').textContent = t('appName')
  app.querySelector('#brand-tagline').textContent = t('tagline')
  app.querySelector('#lang-btn').textContent = t('langToggle')
  app.querySelector('#verify-nav-btn').textContent = t('verify')
  app.querySelector('#text-size-btn').setAttribute('aria-label', t('textSizeBtn'))
  paintSoundBtn()
}

function paintSoundBtn() {
  const btn = app.querySelector('#sound-btn')
  btn.textContent = isMuted() ? '🔇' : '🔊'
  btn.setAttribute('aria-label', t('soundToggleBtn'))
}

app.querySelector('#lang-btn').addEventListener('click', () => {
  toggleLang()
  paintChrome()
  route()
})
app.querySelector('#verify-nav-btn').addEventListener('click', () => navigate('#/verify'))
app.querySelector('#text-size-btn').addEventListener('click', () => {
  textSizeIndex = (textSizeIndex + 1) % TEXT_SIZES.length
  localStorage.setItem('textSize', TEXT_SIZES[textSizeIndex])
  applyTextSize()
})
app.querySelector('#sound-btn').addEventListener('click', () => {
  toggleMuted()
  paintSoundBtn()
})

// --- tiny hash router ---------------------------------------------------
// #/                                -> module list
// #/module/:id                      -> AR viewer for that module
// #/module/:id/quiz                 -> assessment
// #/module/:id/result               -> score + pass/fail
// #/module/:id/certificate          -> QR certificate generation
// #/module/:id/gallery              -> per-item gallery list (if mod.hasItemGallery)
// #/module/:id/gallery/:itemId      -> one gallery item's dedicated viewer
// #/module/emergency-response       -> voice/manual first-aid hub (no .glb, see below)
// #/module/emergency-response/guide/:guideId  -> narrated first-aid steps
// #/module/emergency-response/camera/cpr      -> real hand-motion CPR rate assist
// #/verify                          -> paste/check a certificate's ledger signature
// #/admin                           -> compliance dashboard (export/import a device's data)
//
// Policy gate: every module except PPE_GATE_MODULE_ID redirects to it until
// it's been passed once (see data/modules.js's comment on that constant).
// The PPE module card itself stays visible/revisitable on the home screen
// regardless — home.js never consults this gate, only module sub-routes do.
//
// Set to true to re-enable the mandatory PPE induction gate — temporarily
// switched off so every module/topic is freely reachable for a live
// presentation, without needing to pass PPE first on whatever device is
// demoing. Flip back to true once the presentation is done.
const PPE_GATE_ENABLED = false

function navigate(hash) {
  window.location.hash = hash
}

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const parts = hash.split('/').filter(Boolean)
  if (parts[0] === 'module' && parts[1]) {
    return { screen: parts[2] || 'ar', params: { id: parts[1], itemId: parts[3] } }
  }
  if (parts[0] === 'verify') return { screen: 'verify', params: {} }
  if (parts[0] === 'admin') return { screen: 'admin', params: {} }
  if (parts[0] === 'grievance') return { screen: 'grievance', params: {} }
  return { screen: 'home', params: {} }
}

function route() {
  const { screen, params } = parseHash()

  // A redirect (no visible frame of its own) shouldn't get wrapped in a
  // transition — that would animate nothing and just add latency before
  // the real destination renders.
  if (PPE_GATE_ENABLED && params.id && params.id !== PPE_GATE_MODULE_ID) {
    const ppeResult = getResult(PPE_GATE_MODULE_ID)
    if (!ppeResult?.passed) {
      navigate(`#/module/${PPE_GATE_MODULE_ID}`)
      return
    }
  }

  function renderScreen() {
    window.scrollTo(0, 0)
    switch (screen) {
      case 'quiz':
        renderQuiz(main, navigate, params)
        break
      case 'result':
        renderResult(main, navigate, params)
        break
      case 'certificate':
        renderCertificate(main, navigate, params)
        break
      case 'ar':
        // emergency-response has no .glb — see EMERGENCY_RESPONSE_MODULE_ID's
        // comment in data/modules.js. Its "default" screen is the hub, not
        // an AR viewer.
        if (params.id === EMERGENCY_RESPONSE_MODULE_ID) {
          renderEmergencyHub(main, navigate)
        } else {
          renderArViewer(main, navigate, params)
        }
        break
      case 'guide':
        renderEmergencyGuide(main, navigate, params)
        break
      case 'camera':
        renderCprCameraAssist(main, navigate)
        break
      case 'gallery':
        params.itemId ? renderItemViewer(main, navigate, params) : renderItemGallery(main, navigate, params)
        break
      case 'tour':
        renderTour(main, navigate, params)
        break
      case 'verify':
        renderVerify(main, navigate)
        break
      case 'admin':
        renderAdmin(main, navigate)
        break
      case 'grievance':
        renderGrievance(main, navigate)
        break
      default:
        renderHome(main, navigate)
    }
  }

  // Progressive enhancement — document.startViewTransition simply doesn't
  // exist on unsupported browsers, so they just get the old instant swap,
  // never a broken half-state.
  if (document.startViewTransition) {
    document.startViewTransition(renderScreen)
  } else {
    renderScreen()
  }
}

window.addEventListener('hashchange', route)
paintChrome()
route()

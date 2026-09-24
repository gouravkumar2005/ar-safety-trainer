// The persistent app chrome: top bar with brand, 🚨 emergency shortcut,
// text size, sound, verify and language buttons. Returns the <main>
// element that screens render into.

import { t, toggleLang, getLang } from '../core/i18n/index.js'
import { isMuted, toggleMuted } from '../shared/ui/sound.js'
import { EMERGENCY_RESPONSE_MODULE_ID } from '../content/modules.js'
import { navigate, render } from './router.js'

// Text-size control: cycles base -> lg -> xl -> base, persisted the same
// way i18n persists language (a flat localStorage key, not the bigger
// state.js blob — this is a standalone UI preference, not app data). Every
// font-size in the stylesheets is in rem, so one <html> class scales all.
const TEXT_SIZES = ['', 'text-lg', 'text-xl']

export function mountShell(app) {
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <strong id="brand-name"></strong>
        <span id="brand-tagline"></span>
      </div>
      <div class="stack" style="flex-direction:row;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
        <button class="btn btn-sos" id="emergency-nav-btn" title="Emergency">🚨</button>
        <button class="btn" id="text-size-btn" title="Text size">Aa</button>
        <button class="btn" id="sound-btn" title="Sound"></button>
        <button class="btn" id="verify-nav-btn"></button>
        <button class="btn" id="lang-btn"></button>
      </div>
    </header>
    <main id="main"></main>
  `
  const $ = (sel) => app.querySelector(sel)

  let textSizeIndex = Math.max(0, TEXT_SIZES.indexOf(localStorage.getItem('textSize') || ''))
  const applyTextSize = () => {
    document.documentElement.classList.remove('text-lg', 'text-xl')
    const cls = TEXT_SIZES[textSizeIndex]
    if (cls) document.documentElement.classList.add(cls)
  }

  const paintSoundBtn = () => {
    $('#sound-btn').textContent = isMuted() ? '🔇' : '🔊'
    $('#sound-btn').setAttribute('aria-label', t('soundToggleBtn'))
  }

  const paint = () => {
    document.documentElement.lang = getLang()
    $('#brand-name').textContent = t('appName')
    $('#brand-tagline').textContent = t('tagline')
    $('#lang-btn').textContent = t('langToggle')
    $('#verify-nav-btn').textContent = t('verify')
    $('#text-size-btn').setAttribute('aria-label', t('textSizeBtn'))
    $('#emergency-nav-btn').setAttribute('aria-label', t('emergencyQuickAccessBtn'))
    paintSoundBtn()
  }

  $('#lang-btn').addEventListener('click', () => {
    toggleLang()
    paint()
    render() // re-render the current screen in the new language
  })
  $('#verify-nav-btn').addEventListener('click', () => navigate('#/verify'))
  // Always reachable in one tap, from any screen — the whole point is not
  // making someone hunt through the home screen's module list mid-accident.
  $('#emergency-nav-btn').addEventListener('click', () => navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}`))
  $('#text-size-btn').addEventListener('click', () => {
    textSizeIndex = (textSizeIndex + 1) % TEXT_SIZES.length
    localStorage.setItem('textSize', TEXT_SIZES[textSizeIndex])
    applyTextSize()
  })
  $('#sound-btn').addEventListener('click', () => {
    toggleMuted()
    paintSoundBtn()
  })

  applyTextSize()
  paint()
  return $('#main')
}

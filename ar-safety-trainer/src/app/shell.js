// The persistent app chrome, laid out like a Government of India service
// app: a navy accessibility bar (government name, text size, sound,
// language), then a white header (emblem mark + app name, verify, profile,
// red emergency button) with a tricolour rule under it. Every control is
// an icon with an aria-label, so the header needs no words to read.
// Returns the <main> element that screens render into.

import { t, toggleLang, getLang } from '../core/i18n/index.js'
import { isMuted, toggleMuted } from '../shared/ui/sound.js'
import { icon } from '../shared/ui/icon.js'
import { EMERGENCY_RESPONSE_MODULE_ID } from '../content/modules.js'
import { isLoggedIn, onSessionChange } from '../core/session.js'
import { navigate, render } from './router.js'

// Text-size control: cycles base -> lg -> xl -> base, persisted the same
// way i18n persists language (a flat localStorage key). Every font-size in
// the stylesheets is in rem, so one <html> class scales all.
const TEXT_SIZES = ['', 'text-lg', 'text-xl']

export function mountShell(app) {
  app.innerHTML = `
    <div class="gov-bar">
      <span class="gov-name" id="gov-name"></span>
      <div class="gov-tools">
        <button class="icon-btn" id="text-size-btn">${icon('a-large-small', { size: 22 })}</button>
        <button class="icon-btn" id="sound-btn"></button>
        <button class="icon-btn lang-btn" id="lang-btn">${icon('languages', { size: 18 })}<span id="lang-label"></span></button>
      </div>
    </div>
    <div class="app-header">
      <header class="topbar">
        <a class="brand" href="#/" id="brand-home">
          <span class="brand-mark">${icon('landmark', { size: 24 })}</span>
          <span class="brand-text">
            <strong id="brand-name"></strong>
            <span id="brand-tagline"></span>
          </span>
        </a>
        <div class="topbar-actions">
          <button class="icon-btn" id="verify-nav-btn">${icon('scan-qr-code', { size: 22 })}</button>
          <button class="icon-btn" id="profile-btn">${icon('circle-user', { size: 24 })}</button>
          <button class="icon-btn icon-btn-sos" id="emergency-nav-btn">${icon('siren', { size: 24 })}</button>
        </div>
      </header>
      <div class="tricolour" aria-hidden="true"></div>
    </div>
    <main id="main"></main>
  `
  const $ = (sel) => app.querySelector(sel)

  let textSizeIndex = Math.max(0, TEXT_SIZES.indexOf(localStorage.getItem('textSize') || ''))
  const applyTextSize = () => {
    document.documentElement.classList.remove('text-lg', 'text-xl')
    const cls = TEXT_SIZES[textSizeIndex]
    if (cls) document.documentElement.classList.add(cls)
  }

  const label = (el, text) => {
    el.setAttribute('aria-label', text)
    el.title = text
  }

  const paintSoundBtn = () => {
    $('#sound-btn').innerHTML = icon(isMuted() ? 'volume-x' : 'volume-2', { size: 22 })
    label($('#sound-btn'), t('soundToggleBtn'))
  }

  const paint = () => {
    document.documentElement.lang = getLang()
    $('#gov-name').textContent = t('govName')
    $('#brand-name').textContent = t('appName')
    $('#brand-tagline').textContent = t('tagline')
    $('#lang-label').textContent = t('langToggle')
    label($('#lang-btn'), t('langToggle'))
    label($('#verify-nav-btn'), t('verify'))
    label($('#text-size-btn'), t('textSizeBtn'))
    label($('#emergency-nav-btn'), t('emergencyQuickAccessBtn'))
    label($('#profile-btn'), t('profileNavBtn'))
    $('#profile-btn').hidden = !isLoggedIn()
    paintSoundBtn()
  }

  $('#lang-btn').addEventListener('click', () => {
    toggleLang()
    paint()
    render() // re-render the current screen in the new language
  })
  $('#verify-nav-btn').addEventListener('click', () => navigate('#/verify'))
  $('#profile-btn').addEventListener('click', () => navigate('#/profile'))
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

  // Log in/out, or a language change from the profile: repaint the bar.
  onSessionChange(paint)

  applyTextSize()
  paint()
  return $('#main')
}

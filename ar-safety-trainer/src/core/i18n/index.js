// Minimal i18n. Two languages are filled in for real (en, hi). The PS also
// requires Santali — that's added as a locked option because machine
// translation for Santali (esp. in Ol Chiki script) is unreliable enough
// that shipping guessed strings would do more harm than good. Get real
// Santali copy from a native speaker/translator, add a strings.sat.js next
// to these and register it in STRINGS below.

import { en } from './strings.en.js'
import { hi } from './strings.hi.js'

export const STRINGS = { en, hi }

// Language registry — mirrors modules.js's own status field naming.
// 'active' languages have real, human-translated copy in STRINGS above.
// 'locked' entries are a name-only scaffold: showing that a language
// exists is not the same claim as translating into it, so these stay
// honest without inventing content in languages we can't verify
// (esp. Santali in Ol Chiki script, and Mundari/Ho/Kurukh, none of which
// have a native-speaker/translator reviewing them yet).
export const LANGUAGES = [
  { code: 'en', name: 'English', status: 'active' },
  { code: 'hi', name: 'हिंदी', status: 'active' },
  { code: 'sat', name: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)', status: 'locked' },
  { code: 'mnd', name: 'Mundari', status: 'locked' },
  { code: 'hoc', name: 'Ho', status: 'locked' },
  { code: 'kru', name: 'Kurukh', status: 'locked' },
]

let currentLang = localStorage.getItem('lang') || 'en'

export function t(key, vars) {
  const str = STRINGS[currentLang]?.[key] ?? STRINGS.en[key] ?? key
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '')
}

export function getLang() {
  return currentLang
}

export function toggleLang() {
  setLang(currentLang === 'en' ? 'hi' : 'en')
}

// Used to apply a user's preferred language when they log in.
export function setLang(code) {
  if (!STRINGS[code]) return
  currentLang = code
  localStorage.setItem('lang', currentLang)
}

// Whether a translation key exists (for optional, more specific messages).
export function hasString(key) {
  return key in STRINGS.en
}

export function pick(field) {
  // field is a {en, hi} object from modules.js
  return field?.[currentLang] ?? field?.en ?? ''
}

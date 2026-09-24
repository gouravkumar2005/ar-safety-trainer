// Voice narration (text-to-speech). Exists because the PS's own background
// note (young, first-time recruits with no prior industrial exposure) means
// literacy can't be assumed; this is core usability for that audience, not
// just an accessibility add-on for a smaller group.
//
// Browser: the built-in SpeechSynthesis API — no dependency, no backend,
// works fully offline. Android app: the phone's own TTS engine via
// @capacitor-community/text-to-speech (WebView's SpeechSynthesis is missing
// or voiceless on many devices).
//
// Both paths follow the same rule: if no voice exists for the requested
// language, speak() returns false rather than reading the text in the wrong
// language's accent/pronunciation — a clear gap is safer than misleading
// audio for a low-literacy listener.

import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { isNativeApp } from './index.js'

// If a platform never reports that speech finished, onEnd still fires after
// this long, so a guided tour can never hang forever on a single step.
const ON_END_SAFETY_MS = 20000

// langCode is exactly what i18n's getLang() returns ('en' | 'hi').
function toLocale(langCode) {
  return `${langCode}-IN`
}

// Calls `onEnd` exactly once: on the first of `done()` or the safety timer.
function onceWithTimeout(onEnd) {
  if (!onEnd) return () => {}
  let fired = false
  const fire = () => {
    if (fired) return
    fired = true
    clearTimeout(timer)
    onEnd()
  }
  const timer = setTimeout(fire, ON_END_SAFETY_MS)
  return fire
}

// Speaks `text` in `langCode`. Cancels any in-flight utterance first — a
// new "Listen" tap always interrupts rather than queuing behind the last
// one. Resolves true if speech actually started, false if no voice exists
// for that language (caller should show voiceUnavailableNote).
//
// `onEnd` (optional) fires once when this utterance finishes, is cancelled
// or fails — used by the tour to auto-advance only once narration genuinely
// completes. Only called when speak() returned true.
export function speak(text, langCode, onEnd) {
  return isNativeApp() ? speakNative(text, langCode, onEnd) : speakWeb(text, langCode, onEnd)
}

export function stopSpeaking() {
  if (isNativeApp()) TextToSpeech.stop().catch(() => {})
  else if (isWebSpeechSupported()) speechSynthesis.cancel()
}

// --- Android app: native TTS engine ---------------------------------------

async function speakNative(text, langCode, onEnd) {
  const lang = toLocale(langCode)
  try {
    const { supported } = await TextToSpeech.isLanguageSupported({ lang })
    if (!supported) return false
    await TextToSpeech.stop()
  } catch {
    return false
  }
  // speak() resolves when the utterance finishes (or is stopped), so it
  // isn't awaited here — the caller only needs to know that it started.
  const done = onceWithTimeout(onEnd)
  TextToSpeech.speak({ text, lang, rate: 1.0, queueStrategy: 0 }).then(done, done)
  return true
}

// --- Browser: SpeechSynthesis ---------------------------------------------

function isWebSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let cachedVoicesPromise = null

// getVoices() returns [] until the async 'voiceschanged' event fires on
// many browsers/first call — this waits for it, with a timeout fallback
// for browsers that never fire it at all.
function getVoicesAsync() {
  if (cachedVoicesPromise) return cachedVoicesPromise

  cachedVoicesPromise = new Promise((resolve) => {
    const existing = speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    const onChange = () => {
      speechSynthesis.removeEventListener('voiceschanged', onChange)
      resolve(speechSynthesis.getVoices())
    }
    speechSynthesis.addEventListener('voiceschanged', onChange)
    setTimeout(() => {
      speechSynthesis.removeEventListener('voiceschanged', onChange)
      resolve(speechSynthesis.getVoices())
    }, 1000)
  })
  return cachedVoicesPromise
}

// Prefers an -IN region variant (e.g. 'hi-IN') if present, else any voice
// whose lang starts with the code. Returns null if genuinely none found —
// callers must NOT fall back to a different language's voice.
function pickVoiceForLang(voices, langCode) {
  const regional = voices.find((v) => v.lang?.toLowerCase() === toLocale(langCode).toLowerCase())
  if (regional) return regional
  return voices.find((v) => v.lang?.toLowerCase().startsWith(langCode)) || null
}

async function speakWeb(text, langCode, onEnd) {
  if (!isWebSpeechSupported()) return false
  const voice = pickVoiceForLang(await getVoicesAsync(), langCode)
  if (!voice) return false

  try {
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    if (onEnd) {
      const done = onceWithTimeout(onEnd)
      utterance.addEventListener('end', done, { once: true })
      utterance.addEventListener('error', done, { once: true })
    }
    speechSynthesis.speak(utterance)
    return true
  } catch {
    // Defensive: if the platform rejects this voice/utterance for any
    // reason (seen in the wild: stale voice objects after a device's
    // voice list changes underneath us), fail into the same "unavailable"
    // path the caller already handles, instead of throwing past an async
    // boundary where nothing would catch it.
    return false
  }
}

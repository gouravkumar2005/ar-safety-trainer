// Voice INPUT — the counterpart to speech.js. Used by the Emergency
// Response hub's mic button.
//
// Browser: the Web Speech API's SpeechRecognition. Android app: the phone's
// native speech recognizer via @capacitor-community/speech-recognition
// (WebView doesn't expose SpeechRecognition at all).
//
// Same honest-failure rule on both paths: on anything unsupported, denied,
// silent or errored, resolve to null rather than fabricate a transcript.
// Callers must treat null as "fall back to the manual grid", never a guess.

import { SpeechRecognition as NativeRecognizer } from '@capacitor-community/speech-recognition'
import { isNativeApp } from './index.js'

// Give up if the platform never reports a result or an error.
const LISTEN_TIMEOUT_MS = 12000

// langCode: 'en' or 'hi' -> the BCP-47 tag the recognizers expect.
function toLocale(langCode) {
  return langCode === 'hi' ? 'hi-IN' : 'en-IN'
}

// Whether showing a mic button makes sense at all. In the app the plugin
// is always present; whether the device actually has a recognizer is only
// known asynchronously, so listenOnce() resolves null if it doesn't.
export function isVoiceCommandSupported() {
  return isNativeApp() || !!getWebRecognitionCtor()
}

// Listens for a single utterance and resolves with the recognized text,
// or null if unsupported, denied, errored, or nothing was understood.
export function listenOnce(langCode) {
  const listen = isNativeApp() ? listenNative(langCode) : listenWeb(langCode)
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), LISTEN_TIMEOUT_MS))
  return Promise.race([listen, timeout])
}

// --- Android app: native recognizer ---------------------------------------

async function listenNative(langCode) {
  try {
    const { available } = await NativeRecognizer.available()
    if (!available) return null

    let { speechRecognition } = await NativeRecognizer.checkPermissions()
    if (speechRecognition !== 'granted') {
      ;({ speechRecognition } = await NativeRecognizer.requestPermissions())
    }
    if (speechRecognition !== 'granted') return null

    const { matches } = await NativeRecognizer.start({
      language: toLocale(langCode),
      maxResults: 1,
      partialResults: false,
      popup: true, // Android's own "Speak now" dialog — clear feedback that it's listening
    })
    return matches?.[0] || null
  } catch {
    return null
  }
}

// --- Browser: Web Speech API ----------------------------------------------

function getWebRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function listenWeb(langCode) {
  const Ctor = getWebRecognitionCtor()
  if (!Ctor) return Promise.resolve(null)

  return new Promise((resolve) => {
    let recognition
    try {
      recognition = new Ctor()
    } catch {
      resolve(null)
      return
    }

    recognition.lang = toLocale(langCode)
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    // A promise only settles once, so whichever of these fires first wins
    // (onend also fires after a successful onresult — that's a no-op).
    recognition.onresult = (event) => resolve(event.results?.[0]?.[0]?.transcript || null)
    recognition.onerror = () => resolve(null)
    recognition.onend = () => resolve(null)

    try {
      recognition.start()
    } catch {
      resolve(null)
    }
  })
}

// Voice narration via the browser's built-in SpeechSynthesis API — no
// dependency, no backend, works fully offline. Exists because the PS's own
// background note (young, first-time recruits with no prior industrial
// exposure) means literacy can't be assumed; this is core usability for
// that audience, not just an accessibility add-on for a smaller group.

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let cachedVoicesPromise = null

// getVoices() returns [] until the async 'voiceschanged' event fires on
// many browsers/first call — this waits for it, with a timeout fallback
// for embedded WebViews that never fire it at all.
export function getVoicesAsync() {
  if (!isSpeechSupported()) return Promise.resolve([])
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

// langCode is exactly what i18n.js's getLang() returns ('en' | 'hi').
// Prefers an -IN region variant (e.g. 'hi-IN') if present, else any voice
// whose lang starts with the code. Returns null if genuinely none found —
// callers must NOT fall back to a different language's voice (see speak()).
export function pickVoiceForLang(voices, langCode) {
  const regional = voices.find((v) => v.lang?.toLowerCase() === `${langCode}-in`)
  if (regional) return regional
  return voices.find((v) => v.lang?.toLowerCase().startsWith(langCode)) || null
}

export async function hasVoiceForLang(langCode) {
  const voices = await getVoicesAsync()
  return !!pickVoiceForLang(voices, langCode)
}

// Speaks `text` in `langCode`. Cancels any in-flight utterance first — a
// new "Listen" tap always interrupts rather than queuing behind the last
// one. Resolves true if speech actually started, false if no voice exists
// for that language (caller should show voiceUnavailableNote, never
// silently substitute a different language's voice — mispronounced audio
// actively misleads a low-literacy listener; a clear "not available" note
// doesn't).
//
// `onEnd` (optional) fires once when this utterance finishes — used by
// tour.js to auto-advance only once narration genuinely completes, never
// mid-sentence. Only called when speech actually starts (return value is
// true); if speak() returns false, there's nothing to wait for. Capped at
// 20s in case a browser never fires the underlying 'end' event, so a tour
// can never hang forever on a single step.
export async function speak(text, langCode, onEnd) {
  if (!isSpeechSupported()) return false
  const voices = await getVoicesAsync()
  const voice = pickVoiceForLang(voices, langCode)
  if (!voice) return false

  try {
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    if (onEnd) {
      let fired = false
      const fireOnce = () => {
        if (fired) return
        fired = true
        clearTimeout(safetyTimer)
        onEnd()
      }
      const safetyTimer = setTimeout(fireOnce, 20000)
      utterance.addEventListener('end', fireOnce, { once: true })
      utterance.addEventListener('error', fireOnce, { once: true })
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

export function stopSpeaking() {
  if (isSpeechSupported()) speechSynthesis.cancel()
}

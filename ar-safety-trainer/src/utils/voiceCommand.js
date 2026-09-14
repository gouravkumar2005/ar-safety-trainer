// Voice INPUT — the counterpart to speech.js's SpeechSynthesis output.
// Wraps the Web Speech API's SpeechRecognition. Same honest-failure
// pattern as speech.js: on anything unsupported/denied/silent, resolve to
// null rather than fabricate a transcript. Callers (emergencyHub.js) must
// treat null as "fall back to the manual grid", never as a guess.

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function isVoiceCommandSupported() {
  return !!getRecognitionCtor()
}

// Listens for a single utterance and resolves with the recognized text,
// or null if unsupported, denied, errored, or nothing was understood.
// langCode: 'en' or 'hi' (mapped to BCP-47 tags the API expects).
export function listenOnce(langCode) {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return Promise.resolve(null)

  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    let recognition
    try {
      recognition = new Ctor()
    } catch {
      finish(null)
      return
    }

    recognition.lang = langCode === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || null
      finish(transcript)
    }
    recognition.onerror = () => finish(null)
    recognition.onend = () => finish(null) // no-op if already settled via onresult

    // Safety timer in case the browser never fires end/error for some
    // reason (mirrors speech.js's 20s guard against a hung callback).
    const safetyTimer = setTimeout(() => finish(null), 12000)
    const clearAndFinish = (fn) => (arg) => {
      clearTimeout(safetyTimer)
      fn(arg)
    }
    recognition.onresult = clearAndFinish(recognition.onresult)
    recognition.onerror = clearAndFinish(recognition.onerror)
    recognition.onend = clearAndFinish(recognition.onend)

    try {
      recognition.start()
    } catch {
      clearTimeout(safetyTimer)
      finish(null)
    }
  })
}

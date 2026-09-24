// Escapes text before it goes into an innerHTML template. Required for
// anything a user typed (names, organisations...) — otherwise a name like
// "<img onerror=...>" would run as code for whoever views it (e.g. an
// admin browsing the account list).
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch])
}

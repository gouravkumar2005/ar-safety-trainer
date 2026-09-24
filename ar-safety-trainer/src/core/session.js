// Who is logged in on this device. The session (token + the user's
// profile) is kept in localStorage, so a worker who logged in above ground
// can keep training underground with no signal. The server remains the
// authority: api.js clears the session as soon as the server rejects it.

const KEY = 'ar-safety-trainer:session:v1'
const listeners = new Set()

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY))
    return parsed?.token && parsed?.user ? parsed : null
  } catch {
    return null
  }
}

let session = load()

function persistAndNotify() {
  if (session) localStorage.setItem(KEY, JSON.stringify(session))
  else localStorage.removeItem(KEY)
  for (const fn of listeners) fn(session?.user ?? null)
}

export function getToken() {
  return session?.token ?? null
}

export function getCurrentUser() {
  return session?.user ?? null
}

export function isLoggedIn() {
  return !!session
}

export function hasRole(...roles) {
  return roles.includes(session?.user?.role)
}

export function startSession(token, user) {
  session = { token, user }
  persistAndNotify()
}

// After a profile edit or a refresh from the server.
export function updateCurrentUser(user) {
  if (!session) return
  session = { ...session, user }
  persistAndNotify()
}

export function endSession() {
  session = null
  persistAndNotify()
}

// The screen someone was trying to open when they were sent to log in,
// so they land back there afterwards.
const RETURN_KEY = 'ar-safety-trainer:returnPath'

export function rememberReturnPath(hash) {
  try { sessionStorage.setItem(RETURN_KEY, hash) } catch { /* storage unavailable */ }
}

export function takeReturnPath() {
  let hash = null
  try {
    hash = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
  } catch { /* storage unavailable */ }
  return hash || '#/'
}

// fn(user | null) runs whenever someone logs in, out, or edits their profile.
export function onSessionChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

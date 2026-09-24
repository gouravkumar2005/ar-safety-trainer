// Every accounts-server call the account screens make. Login, register and
// profile saves also update the local session (core/session.js), so the
// rest of the app sees the change immediately.

import { apiRequest } from '../../core/api.js'
import { startSession, updateCurrentUser, endSession } from '../../core/session.js'
import { setLang } from '../../core/i18n/index.js'

function beginSession({ token, user }) {
  setLang(user.preferredLang)
  startSession(token, user)
}

export function getRegistrationOptions() {
  return apiRequest('GET', '/auth/options') // { roles, districts }
}

// Resolves { pendingApproval: true } for Supervisor/Admin sign-ups, which
// can't log in until an admin approves them; workers are logged straight in.
export async function register(details) {
  const result = await apiRequest('POST', '/auth/register', details)
  if (result.token) beginSession(result)
  return { pendingApproval: !!result.pendingApproval, user: result.user }
}

export async function login(identifier, password) {
  beginSession(await apiRequest('POST', '/auth/login', { identifier, password }))
}

export async function logout() {
  // Log out locally even if the server can't be reached (e.g. underground).
  try {
    await apiRequest('POST', '/auth/logout')
  } catch {
    /* the session simply expires on the server later */
  }
  endSession()
}

// Refreshes the cached profile from the server. Silently keeps the cached
// copy when offline; an invalid session is ended by apiRequest itself.
export async function refreshProfile() {
  try {
    const { user } = await apiRequest('GET', '/me')
    updateCurrentUser(user)
  } catch {
    /* offline, or logged out — nothing else to do */
  }
}

export async function updateProfile(changes) {
  const { user } = await apiRequest('PATCH', '/me', changes)
  setLang(user.preferredLang)
  updateCurrentUser(user)
  return user
}

export function changePassword(currentPassword, newPassword) {
  return apiRequest('POST', '/me/password', { currentPassword, newPassword })
}

export async function listUsers(status) {
  const { users } = await apiRequest('GET', `/admin/users${status ? `?status=${status}` : ''}`)
  return users
}

export async function setUserStatus(userId, status) {
  const { user } = await apiRequest('PATCH', `/admin/users/${userId}`, { status })
  return user
}

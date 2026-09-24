// Talks to the accounts server (../../server). Every call goes through
// apiRequest(), which adds the login token, parses JSON, and turns every
// failure into an ApiError with a `code` the screens can translate:
//   'network'        server unreachable (offline, wrong URL)
//   'validation'     bad input; `fields` says which ones ({ phone: 'taken' })
//   anything else    the server's error code ('invalid_credentials', ...)

import { API_BASE_URL } from '../config.js'
import { getToken, endSession } from './session.js'

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message || code)
    this.status = status
    this.code = code
    this.fields = fields || {}
  }
}

export async function apiRequest(method, path, body) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network')
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (res.ok) return data

  // The server no longer accepts this login (expired, logged out elsewhere,
  // account disabled) — drop it here too, which sends the user to login.
  if (res.status === 401 && token) endSession()
  throw new ApiError(res.status, data?.error || 'server_error', data?.message, data?.fields)
}

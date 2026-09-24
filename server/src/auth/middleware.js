// Express middleware that protects routes.
//   requireAuth       -> 401 unless the request carries a valid session token
//   requireRole(...)  -> 403 unless the logged-in user has one of the roles

import { HttpError } from '../errors.js'

function bearerToken(req) {
  const header = req.get('authorization') || ''
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' && token ? token : null
}

export function createAuthMiddleware({ sessions, users }) {
  async function requireAuth(req, res, next) {
    const token = bearerToken(req)
    const userId = token && (await sessions.userIdFor(token))
    const user = userId && (await users.findById(userId))
    // A disabled/rejected account loses access immediately, even with a
    // session that hasn't expired yet.
    if (!user || user.status !== 'active') {
      next(new HttpError(401, 'unauthenticated', 'Please log in again'))
      return
    }
    req.user = user
    req.sessionToken = token
    next()
  }

  const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      next(new HttpError(403, 'forbidden', 'You do not have access to this'))
      return
    }
    next()
  }

  return { requireAuth, requireRole }
}

// Login sessions. The app gets a random token and sends it back as
// "Authorization: Bearer <token>". Only the token's SHA-256 hash is stored,
// and a session can be revoked (logout, password change, account disabled)
// just by deleting its row.

import { createHash, randomBytes } from 'node:crypto'

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export function createSessionStore(db, { ttlMs }) {
  const insert = db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
  const find = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
  const remove = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
  const removeForUser = db.prepare('DELETE FROM sessions WHERE user_id = ?')
  const removeOthersForUser = db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
  const removeExpired = db.prepare('DELETE FROM sessions WHERE expires_at < ?')

  return {
    // Returns { token, expiresAt }. The token itself is never stored.
    create(userId) {
      const token = randomBytes(32).toString('base64url')
      const now = new Date()
      const expiresAt = new Date(now.getTime() + ttlMs).toISOString()
      insert.run(hashToken(token), userId, now.toISOString(), expiresAt)
      return { token, expiresAt }
    },

    // The user id for a valid, unexpired token, or null.
    userIdFor(token) {
      const row = find.get(hashToken(token))
      if (!row) return null
      if (row.expires_at < new Date().toISOString()) {
        remove.run(hashToken(token))
        return null
      }
      return row.user_id
    },

    revoke(token) {
      remove.run(hashToken(token))
    },

    revokeAllForUser(userId) {
      removeForUser.run(userId)
    },

    revokeOthersForUser(userId, keepToken) {
      removeOthersForUser.run(userId, hashToken(keepToken))
    },

    purgeExpired() {
      removeExpired.run(new Date().toISOString())
    },
  }
}

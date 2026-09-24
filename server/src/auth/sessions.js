// Login sessions. The app gets a random token and sends it back as
// "Authorization: Bearer <token>". Only the token's SHA-256 hash is stored,
// and a session can be revoked (logout, password change, account disabled)
// just by deleting its row.

import { createHash, randomBytes } from 'node:crypto'

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export function createSessionStore(db, { ttlMs }) {
  return {
    // Returns { token, expiresAt }. The token itself is never stored.
    async create(userId) {
      const token = randomBytes(32).toString('base64url')
      const expiresAt = new Date(Date.now() + ttlMs).toISOString()
      await db.query(
        'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [hashToken(token), userId, expiresAt],
      )
      return { token, expiresAt }
    },

    // The user id for a valid, unexpired token, or null.
    async userIdFor(token) {
      const [row] = await db.query(
        'SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()',
        [hashToken(token)],
      )
      return row?.user_id ?? null
    },

    async revoke(token) {
      await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
    },

    async revokeAllForUser(userId) {
      await db.query('DELETE FROM sessions WHERE user_id = $1', [userId])
    },

    async revokeOthersForUser(userId, keepToken) {
      await db.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [userId, hashToken(keepToken)])
    },

    async purgeExpired() {
      await db.query('DELETE FROM sessions WHERE expires_at <= now()')
    },
  }
}

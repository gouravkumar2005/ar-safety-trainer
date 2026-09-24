// Password hashing with scrypt (built into Node): slow and memory-hard, so a
// stolen database can't be brute-forced cheaply. Stored format:
//   scrypt$<salt hex>$<hash hex>

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)
  // Constant-time compare, so response timing doesn't leak how close a guess was.
  return timingSafeEqual(actual, expected)
}

// A real hash of a random password, used so that a login attempt for an
// unknown work ID takes as long as one for a real account (otherwise the
// response time would reveal which work IDs exist).
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'))

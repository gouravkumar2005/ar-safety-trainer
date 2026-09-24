// Registration, login and logout.
//
//   GET  /api/auth/options    roles + districts for the registration form
//   POST /api/auth/register   create an account
//   POST /api/auth/login      work ID or phone + password -> session token
//   POST /api/auth/logout     end this session
//
// Workers are active as soon as they register. Supervisor and Admin
// accounts start as 'pending' until an existing admin approves them, so
// nobody can grant themselves elevated access by picking a role.

import { Router } from 'express'
import { HttpError } from '../errors.js'
import { hashPassword, verifyPassword, DUMMY_HASH } from '../auth/passwords.js'
import { toPublicUser } from '../users/userRepo.js'
import {
  DISTRICTS, ROLES, validateRegistration, normalizePhone, normalizeWorkId,
} from '../users/validation.js'

// Why a correct password still can't log in, per account status.
const BLOCKED_STATUS = {
  pending: 'Your account is waiting for an administrator to approve it',
  rejected: 'Your registration was not approved',
  disabled: 'Your account has been disabled',
}

export function authRoutes({ users, sessions, limiter, requireAuth }) {
  const router = Router()

  router.get('/options', (req, res) => {
    res.json({ roles: ROLES, districts: DISTRICTS })
  })

  router.post('/register', async (req, res) => {
    const { value, errors } = validateRegistration(req.body)
    if (errors) throw new HttpError(400, 'validation', 'Please correct the highlighted fields', errors)

    const taken = {}
    if (users.findByWorkId(value.workId)) taken.workId = 'taken'
    if (users.findByPhone(value.phone)) taken.phone = 'taken'
    if (Object.keys(taken).length) throw new HttpError(409, 'validation', 'Already registered', taken)

    const status = value.role === 'worker' ? 'active' : 'pending'
    const user = users.create(value, await hashPassword(value.password), status)

    if (status === 'active') {
      res.status(201).json({ user: toPublicUser(user), ...sessions.create(user.id) })
    } else {
      res.status(201).json({ user: toPublicUser(user), pendingApproval: true })
    }
  })

  router.post('/login', async (req, res) => {
    const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!identifier || !password) {
      throw new HttpError(400, 'validation', 'Enter your work ID or phone and password', {
        ...(identifier ? {} : { identifier: 'required' }),
        ...(password ? {} : { password: 'required' }),
      })
    }

    const limiterKeys = [`id:${identifier.toUpperCase()}`, `ip:${req.ip}`]
    if (limiter.isBlocked(limiterKeys)) {
      throw new HttpError(429, 'too_many_attempts', 'Too many failed attempts. Try again in 15 minutes')
    }

    const user = users.findByWorkId(normalizeWorkId(identifier)) || users.findByPhone(normalizePhone(identifier))
    // Always run one hash comparison, so an unknown work ID takes as long as
    // a wrong password and the timing doesn't reveal which accounts exist.
    const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)
    if (!user || !passwordOk) {
      limiter.recordFailure(limiterKeys)
      throw new HttpError(401, 'invalid_credentials', 'Wrong work ID/phone or password')
    }
    limiter.reset(limiterKeys)

    if (user.status !== 'active') {
      throw new HttpError(403, `account_${user.status}`, BLOCKED_STATUS[user.status])
    }
    res.json({ user: toPublicUser(user), ...sessions.create(user.id) })
  })

  router.post('/logout', requireAuth, (req, res) => {
    sessions.revoke(req.sessionToken)
    res.status(204).end()
  })

  return router
}

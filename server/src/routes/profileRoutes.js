// The logged-in user's own profile.
//
//   GET   /api/me            current profile
//   PATCH /api/me            update name, phone, organisation, district,
//                            designation, UAN, preferred language
//   POST  /api/me/password   change password (logs out other devices)
//
// Role and work ID can't be changed here: the work ID is the account's
// identity on certificates, and roles are granted by an admin.

import { Router } from 'express'
import { HttpError } from '../errors.js'
import { hashPassword, verifyPassword } from '../auth/passwords.js'
import { toPublicUser } from '../users/userRepo.js'
import { validateProfileUpdate, checkPassword } from '../users/validation.js'

export function profileRoutes({ users, sessions, requireAuth }) {
  const router = Router()
  router.use(requireAuth)

  router.get('/', (req, res) => {
    res.json({ user: toPublicUser(req.user) })
  })

  router.patch('/', async (req, res) => {
    const { value, errors } = validateProfileUpdate(req.body)
    if (errors) throw new HttpError(400, 'validation', 'Please correct the highlighted fields', errors)

    if (value.phone && value.phone !== req.user.phone && (await users.findByPhone(value.phone))) {
      throw new HttpError(409, 'validation', 'Already registered', { phone: 'taken' })
    }
    res.json({ user: toPublicUser(await users.updateProfile(req.user.id, value)) })
  })

  router.post('/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {}
    if (!(await verifyPassword(String(currentPassword ?? ''), req.user.password_hash))) {
      throw new HttpError(400, 'validation', 'Current password is wrong', { currentPassword: 'wrong' })
    }
    const problem = checkPassword(newPassword)
    if (problem) throw new HttpError(400, 'validation', 'Choose a stronger password', { newPassword: problem })

    await users.updatePassword(req.user.id, await hashPassword(newPassword))
    // Someone who knew the old password may still be logged in elsewhere.
    await sessions.revokeOthersForUser(req.user.id, req.sessionToken)
    res.status(204).end()
  })

  return router
}

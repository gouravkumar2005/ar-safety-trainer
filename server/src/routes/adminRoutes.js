// Account management, for admins only.
//
//   GET   /api/admin/users?status=pending&role=worker   list accounts
//   PATCH /api/admin/users/:id   { status: 'active' | 'rejected' | 'disabled' }
//
// 'active' approves a pending Supervisor/Admin or re-enables an account.
// Anything else also ends every session that account has.

import { Router } from 'express'
import { HttpError } from '../errors.js'
import { toPublicUser } from '../users/userRepo.js'
import { ROLES } from '../users/validation.js'

const STATUSES = ['active', 'pending', 'rejected', 'disabled']
const SETTABLE_STATUSES = ['active', 'rejected', 'disabled']

export function adminRoutes({ users, sessions, requireAuth, requireRole }) {
  const router = Router()
  router.use(requireAuth, requireRole('admin'))

  router.get('/users', async (req, res) => {
    const status = STATUSES.includes(req.query.status) ? req.query.status : undefined
    const role = ROLES.includes(req.query.role) ? req.query.role : undefined
    res.json({ users: (await users.list({ status, role })).map(toPublicUser) })
  })

  router.patch('/users/:id', async (req, res) => {
    const status = req.body?.status
    if (!SETTABLE_STATUSES.includes(status)) {
      throw new HttpError(400, 'validation', 'Unknown status', { status: 'invalid' })
    }
    const id = Number(req.params.id)
    const target = Number.isInteger(id) ? await users.findById(id) : null
    if (!target) throw new HttpError(404, 'not_found', 'No such user')
    // Stops an admin locking themselves (and possibly everyone) out.
    if (target.id === req.user.id) {
      throw new HttpError(400, 'cannot_change_self', 'You cannot change your own account status')
    }

    const updated = await users.updateStatus(target.id, status, req.user.id)
    if (status !== 'active') await sessions.revokeAllForUser(target.id)
    res.json({ user: toPublicUser(updated) })
  })

  return router
}

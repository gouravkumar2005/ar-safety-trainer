// Builds the Express app. Kept separate from index.js (which only starts
// listening) so the tests can create an app with an in-memory database.

import express from 'express'
import cors from 'cors'
import { openDb } from './db.js'
import { errorHandler, HttpError } from './errors.js'
import { createUserRepo } from './users/userRepo.js'
import { createSessionStore } from './auth/sessions.js'
import { createLoginLimiter } from './auth/loginLimiter.js'
import { createAuthMiddleware } from './auth/middleware.js'
import { authRoutes } from './routes/authRoutes.js'
import { profileRoutes } from './routes/profileRoutes.js'
import { adminRoutes } from './routes/adminRoutes.js'

export function createApp(config) {
  const db = openDb(config.dbPath)
  const users = createUserRepo(db)
  const sessions = createSessionStore(db, { ttlMs: config.sessionTtlMs })
  const limiter = createLoginLimiter({ maxFailures: config.loginMaxFailures, windowMs: config.loginWindowMs })
  const { requireAuth, requireRole } = createAuthMiddleware({ sessions, users })
  const deps = { users, sessions, limiter, requireAuth, requireRole }

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy ?? false)
  app.use(cors({ origin: config.corsOrigins }))
  app.use(express.json({ limit: '20kb' }))

  app.get('/api/health', (req, res) => res.json({ ok: true }))
  app.use('/api/auth', authRoutes(deps))
  app.use('/api/me', profileRoutes(deps))
  app.use('/api/admin', adminRoutes(deps))
  app.use('/api', (req, res, next) => next(new HttpError(404, 'not_found', 'No such endpoint')))
  app.use(errorHandler)

  return { app, db, users, sessions, limiter }
}

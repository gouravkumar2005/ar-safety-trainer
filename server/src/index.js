// Starts the API server:  npm start
import { config } from './config.js'
import { createApp } from './app.js'

const HOUR_MS = 60 * 60 * 1000

const { app, sessions, limiter } = await createApp(config)

// Housekeeping: drop expired sessions and stale login-failure counters.
setInterval(() => {
  sessions.purgeExpired().catch((err) => console.error('Session cleanup failed:', err))
  limiter.sweep()
}, HOUR_MS).unref()

app.listen(config.port, () => {
  const where = config.databaseUrl ? 'Postgres (DATABASE_URL)' : `built-in Postgres in ${config.dataDir}`
  console.log(`AR Safety Trainer API listening on http://localhost:${config.port} — data: ${where}`)
})

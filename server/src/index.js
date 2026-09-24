// Starts the API server:  npm start
import { config } from './config.js'
import { createApp } from './app.js'

const HOUR_MS = 60 * 60 * 1000

const { app, sessions, limiter } = createApp(config)

// Housekeeping: drop expired sessions and stale login-failure counters.
setInterval(() => {
  sessions.purgeExpired()
  limiter.sweep()
}, HOUR_MS).unref()

app.listen(config.port, () => {
  console.log(`AR Safety Trainer API listening on http://localhost:${config.port}`)
})

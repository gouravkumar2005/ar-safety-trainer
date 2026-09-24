// Server settings, all overridable with environment variables (see .env.example).

const DAY_MS = 24 * 60 * 60 * 1000

export const config = {
  port: Number(process.env.PORT) || 8787,

  // SQLite file. ':memory:' is used by the tests.
  dbPath: process.env.DB_PATH || 'data/ar-safety-trainer.db',

  // Web origins allowed to call the API from a browser. The Android app's
  // WebView runs on https://localhost (Capacitor), so that's always allowed.
  corsOrigins: (process.env.CORS_ORIGINS || 'https://localhost:5173,https://localhost:4173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .concat('https://localhost', 'capacitor://localhost'),

  // Workers train underground with no signal for long stretches, so a
  // session stays valid for a while rather than expiring mid-shift.
  sessionTtlMs: Number(process.env.SESSION_TTL_DAYS || 30) * DAY_MS,

  // Set to 1 when running behind one reverse proxy / load balancer, so the
  // login limiter sees each client's real IP instead of the proxy's.
  trustProxy: Number(process.env.TRUST_PROXY) || false,

  // Brute-force protection: after this many failed logins for the same
  // account/IP, further attempts are refused until the window passes.
  loginMaxFailures: 5,
  loginWindowMs: 15 * 60 * 1000,
}

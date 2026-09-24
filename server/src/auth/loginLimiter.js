// Slows down password guessing: counts failed logins per key (account and
// IP address separately) and blocks further attempts once `maxFailures` is
// reached within `windowMs`. In memory, so it resets when the server
// restarts — fine for a single server instance.

export function createLoginLimiter({ maxFailures, windowMs }) {
  const failures = new Map() // key -> { count, firstAt }

  const current = (key) => {
    const entry = failures.get(key)
    if (entry && Date.now() - entry.firstAt > windowMs) {
      failures.delete(key)
      return null
    }
    return entry
  }

  return {
    isBlocked(keys) {
      return keys.some((key) => (current(key)?.count ?? 0) >= maxFailures)
    },

    recordFailure(keys) {
      for (const key of keys) {
        const entry = current(key)
        if (entry) entry.count += 1
        else failures.set(key, { count: 1, firstAt: Date.now() })
      }
    },

    reset(keys) {
      for (const key of keys) failures.delete(key)
    },

    // Drops expired entries so the map can't grow without bound.
    sweep() {
      for (const key of failures.keys()) current(key)
    },
  }
}

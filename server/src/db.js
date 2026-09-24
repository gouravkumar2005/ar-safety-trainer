// The database: PostgreSQL, reached in one of two ways.
//   - DATABASE_URL set (production, e.g. a free Neon database):
//     a normal connection pool via `pg`.
//   - Not set (local development, tests): PGlite, a real Postgres engine
//     running inside Node. Nothing to install; data is kept in DATA_DIR
//     (or only in memory, for the tests).
// Both give the rest of the server the same tiny interface:
//   await db.query(sql, params) -> array of rows
//   await db.close()

import pg from 'pg'
import { PGlite } from '@electric-sql/pglite'
import { mkdirSync } from 'node:fs'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id         TEXT NOT NULL UNIQUE,          -- stored upper-case
    phone           TEXT NOT NULL UNIQUE,          -- 10 digits, no +91
    full_name       TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('worker', 'supervisor', 'admin')),
    status          TEXT NOT NULL CHECK (status IN ('active', 'pending', 'rejected', 'disabled')),
    organisation    TEXT NOT NULL,                 -- employer / mine / plant
    district        TEXT NOT NULL,
    designation     TEXT NOT NULL DEFAULT '',
    uan             TEXT NOT NULL DEFAULT '',      -- e-Shram UAN, self-reported
    preferred_lang  TEXT NOT NULL DEFAULT 'en',
    password_hash   TEXT NOT NULL,
    consent_at      TIMESTAMPTZ NOT NULL,          -- when the data-use consent was given
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by     INTEGER REFERENCES users(id)   -- admin who approved/rejected
  );

  -- Only a hash of each token is stored, so a leaked database can't be
  -- used to log in as anyone.
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
`

function connectPostgres(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 })
  return {
    query: async (sql, params) => (await pool.query(sql, params)).rows,
    exec: (sql) => pool.query(sql),
    close: () => pool.end(),
  }
}

function connectPglite(dataDir) {
  if (dataDir) mkdirSync(dataDir, { recursive: true })
  const lite = new PGlite(dataDir || undefined) // no dir = in memory
  return {
    query: async (sql, params) => (await lite.query(sql, params)).rows,
    exec: (sql) => lite.exec(sql),
    close: () => lite.close(),
  }
}

// { databaseUrl } for Postgres, else { dataDir } (or neither: in memory).
export async function openDb({ databaseUrl, dataDir }) {
  const db = databaseUrl ? connectPostgres(databaseUrl) : connectPglite(dataDir)
  await db.exec(SCHEMA)
  return db
}

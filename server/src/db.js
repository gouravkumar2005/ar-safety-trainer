// Opens the SQLite database and creates the tables if they don't exist.
// Uses Node's built-in node:sqlite, so there's no native module to compile.

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
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
    consent_at      TEXT NOT NULL,                 -- when the data-use consent was given
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    reviewed_by     INTEGER REFERENCES users(id)   -- admin who approved/rejected
  );

  -- Only a hash of each token is stored, so a leaked database can't be
  -- used to log in as anyone.
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
`

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
  db.exec(SCHEMA)
  return db
}

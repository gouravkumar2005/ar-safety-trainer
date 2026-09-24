// All SQL for the users table lives here. Rows come out of the database in
// snake_case; toPublicUser() turns one into the camelCase shape the API
// returns — and is the single place that guarantees password_hash never
// leaves the server.

export function toPublicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    workId: row.work_id,
    phone: row.phone,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    organisation: row.organisation,
    district: row.district,
    designation: row.designation,
    uan: row.uan,
    preferredLang: row.preferred_lang,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// camelCase field -> column, for the fields a profile update may change.
const PROFILE_COLUMNS = {
  fullName: 'full_name',
  phone: 'phone',
  organisation: 'organisation',
  district: 'district',
  designation: 'designation',
  uan: 'uan',
  preferredLang: 'preferred_lang',
}

export function createUserRepo(db) {
  const byId = db.prepare('SELECT * FROM users WHERE id = ?')
  const byWorkId = db.prepare('SELECT * FROM users WHERE work_id = ?')
  const byPhone = db.prepare('SELECT * FROM users WHERE phone = ?')
  const insert = db.prepare(`
    INSERT INTO users (work_id, phone, full_name, role, status, organisation, district,
                       designation, uan, preferred_lang, password_hash, consent_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const setPassword = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
  const setStatus = db.prepare('UPDATE users SET status = ?, reviewed_by = ?, updated_at = ? WHERE id = ?')

  return {
    findById: (id) => byId.get(id),
    findByWorkId: (workId) => byWorkId.get(workId),
    findByPhone: (phone) => byPhone.get(phone),

    create(user, passwordHash, status) {
      const now = new Date().toISOString()
      const { lastInsertRowid } = insert.run(
        user.workId, user.phone, user.fullName, user.role, status, user.organisation,
        user.district, user.designation, user.uan, user.preferredLang, passwordHash, now, now, now,
      )
      return byId.get(lastInsertRowid)
    },

    updateProfile(id, changes) {
      const entries = Object.entries(changes).filter(([key]) => PROFILE_COLUMNS[key])
      if (entries.length === 0) return byId.get(id)
      const sets = entries.map(([key]) => `${PROFILE_COLUMNS[key]} = ?`).join(', ')
      db.prepare(`UPDATE users SET ${sets}, updated_at = ? WHERE id = ?`)
        .run(...entries.map(([, v]) => v), new Date().toISOString(), id)
      return byId.get(id)
    },

    updatePassword(id, passwordHash) {
      setPassword.run(passwordHash, new Date().toISOString(), id)
    },

    updateStatus(id, status, reviewedBy) {
      setStatus.run(status, reviewedBy, new Date().toISOString(), id)
      return byId.get(id)
    },

    // Admin list, newest first; optional exact filters on status / role.
    list({ status, role } = {}) {
      const where = []
      const args = []
      if (status) { where.push('status = ?'); args.push(status) }
      if (role) { where.push('role = ?'); args.push(role) }
      const sql = `SELECT * FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id DESC`
      return db.prepare(sql).all(...args)
    },
  }
}

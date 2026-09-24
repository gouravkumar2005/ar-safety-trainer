// All SQL for the users table lives here. Rows come out of the database in
// snake_case; toPublicUser() turns one into the camelCase shape the API
// returns — and is the single place that guarantees password_hash never
// leaves the server.

const iso = (value) => (value instanceof Date ? value.toISOString() : value)

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
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
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
  const one = async (sql, params) => (await db.query(sql, params))[0]

  return {
    findById: (id) => one('SELECT * FROM users WHERE id = $1', [id]),
    findByWorkId: (workId) => one('SELECT * FROM users WHERE work_id = $1', [workId]),
    findByPhone: (phone) => one('SELECT * FROM users WHERE phone = $1', [phone]),

    create(user, passwordHash, status) {
      return one(
        `INSERT INTO users (work_id, phone, full_name, role, status, organisation, district,
                            designation, uan, preferred_lang, password_hash, consent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
         RETURNING *`,
        [user.workId, user.phone, user.fullName, user.role, status, user.organisation,
          user.district, user.designation, user.uan, user.preferredLang, passwordHash],
      )
    },

    updateProfile(id, changes) {
      const entries = Object.entries(changes).filter(([key]) => PROFILE_COLUMNS[key])
      if (entries.length === 0) return one('SELECT * FROM users WHERE id = $1', [id])
      // Column names come from the fixed PROFILE_COLUMNS map, never from
      // the request, so building the SET list here is safe.
      const sets = entries.map(([key], i) => `${PROFILE_COLUMNS[key]} = $${i + 2}`).join(', ')
      return one(
        `UPDATE users SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
        [id, ...entries.map(([, value]) => value)],
      )
    },

    async updatePassword(id, passwordHash) {
      await db.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [id, passwordHash])
    },

    updateStatus(id, status, reviewedBy) {
      return one(
        'UPDATE users SET status = $2, reviewed_by = $3, updated_at = now() WHERE id = $1 RETURNING *',
        [id, status, reviewedBy],
      )
    },

    // Admin list, newest first; optional exact filters on status / role.
    list({ status, role } = {}) {
      const where = []
      const params = []
      if (status) { params.push(status); where.push(`status = $${params.length}`) }
      if (role) { params.push(role); where.push(`role = $${params.length}`) }
      return db.query(
        `SELECT * FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id DESC`,
        params,
      )
    },
  }
}

// End-to-end tests for the accounts API, against an in-memory Postgres
// (PGlite) — the same SQL that runs on the production database.
// Run: npm test   (or TEST_DATABASE_URL=postgres://... npm test for a real server)

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { hashPassword } from '../src/auth/passwords.js'

let server
let base
let ctx

before(async () => {
  ctx = await createApp({
    databaseUrl: process.env.TEST_DATABASE_URL || '', // set to test against a real Postgres
    dataDir: '',
    corsOrigins: [],
    sessionTtlMs: 60_000,
    loginMaxFailures: 3,
    loginWindowMs: 60_000,
  })
  server = ctx.app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}/api`
})

after(async () => {
  server.close()
  await ctx.db.close()
})

async function call(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

const worker = {
  role: 'worker',
  fullName: 'Sunita Murmu',
  workId: 'jh-mine-00214',
  phone: '+91 98765 43210',
  organisation: 'CCL Piparwar',
  district: 'Ranchi',
  designation: 'Shotfirer',
  uan: '1234 5678 9012',
  preferredLang: 'hi',
  password: 'safety2026',
  consent: true,
}

async function createActiveAdmin(workId, phone) {
  const admin = await ctx.users.create(
    { ...worker, role: 'admin', workId, phone, fullName: 'Admin' },
    await hashPassword('admin-pass-1'),
    'active',
  )
  const login = await call('POST', '/auth/login', { identifier: workId, password: 'admin-pass-1' })
  return { id: admin.id, token: login.body.token }
}

test('registration options list roles and all 24 districts', async () => {
  const { status, body } = await call('GET', '/auth/options')
  assert.equal(status, 200)
  assert.deepEqual(body.roles, ['worker', 'supervisor', 'admin'])
  assert.equal(body.districts.length, 24)
})

test('invalid registration reports each bad field', async () => {
  const { status, body } = await call('POST', '/auth/register', {
    role: 'boss', workId: 'x', phone: '12345', password: 'short', district: 'Mumbai',
  })
  assert.equal(status, 400)
  assert.equal(body.error, 'validation')
  assert.deepEqual(body.fields, {
    role: 'invalid', workId: 'invalid', phone: 'invalid', password: 'too_short',
    fullName: 'required', organisation: 'required', district: 'invalid', consent: 'required',
  })
})

test('password needs letters and digits', async () => {
  const { body } = await call('POST', '/auth/register', { ...worker, password: 'onlyletters' })
  assert.equal(body.fields.password, 'weak')
})

let workerToken

test('a worker registers, is active immediately and gets a session', async () => {
  const { status, body } = await call('POST', '/auth/register', worker)
  assert.equal(status, 201)
  assert.ok(body.token)
  assert.equal(body.user.status, 'active')
  assert.equal(body.user.workId, 'JH-MINE-00214') // normalised
  assert.equal(body.user.phone, '9876543210')
  assert.equal(body.user.uan, '123456789012')
  assert.equal(body.user.password_hash, undefined)
  assert.equal(body.user.passwordHash, undefined)
  workerToken = body.token
})

test('duplicate work ID and phone are rejected', async () => {
  const { status, body } = await call('POST', '/auth/register', worker)
  assert.equal(status, 409)
  assert.deepEqual(body.fields, { workId: 'taken', phone: 'taken' })
})

test('login works with work ID (any case) or phone', async () => {
  const byId = await call('POST', '/auth/login', { identifier: 'Jh-Mine-00214', password: 'safety2026' })
  assert.equal(byId.status, 200)
  assert.ok(byId.body.token)
  const byPhone = await call('POST', '/auth/login', { identifier: '09876543210', password: 'safety2026' })
  assert.equal(byPhone.status, 200)
})

test('wrong password and unknown account give the same error', async () => {
  const wrong = await call('POST', '/auth/login', { identifier: 'JH-MINE-00214', password: 'nope12345' })
  const unknown = await call('POST', '/auth/login', { identifier: 'NOBODY-1', password: 'nope12345' })
  assert.equal(wrong.status, 401)
  assert.equal(unknown.status, 401)
  assert.equal(wrong.body.error, unknown.body.error)
})

test('repeated failures are rate limited', async () => {
  const attempt = () => call('POST', '/auth/login', { identifier: 'LIMIT-TEST', password: 'bad-pass-1' })
  await attempt(); await attempt(); await attempt()
  const blocked = await attempt()
  assert.equal(blocked.status, 429)
  assert.equal(blocked.body.error, 'too_many_attempts')
  ctx.limiter.reset(['id:LIMIT-TEST', 'ip:::1', 'ip:::ffff:127.0.0.1', 'ip:127.0.0.1'])
})

test('profile: read, update, and phone uniqueness', async () => {
  const me = await call('GET', '/me', null, workerToken)
  assert.equal(me.body.user.fullName, 'Sunita Murmu')

  const updated = await call('PATCH', '/me', { designation: 'Senior Shotfirer', district: 'Dhanbad' }, workerToken)
  assert.equal(updated.status, 200)
  assert.equal(updated.body.user.designation, 'Senior Shotfirer')
  assert.equal(updated.body.user.district, 'Dhanbad')

  const bad = await call('PATCH', '/me', { district: 'Nowhere', role: 'admin' }, workerToken)
  assert.equal(bad.status, 400)
  assert.deepEqual(bad.body.fields, { district: 'invalid' })

  await call('POST', '/auth/register', { ...worker, workId: 'OTHER-001', phone: '9123456780' })
  const clash = await call('PATCH', '/me', { phone: '9123456780' }, workerToken)
  assert.equal(clash.status, 409)
})

test('role and work ID cannot be changed through the profile', async () => {
  await call('PATCH', '/me', { role: 'admin', workId: 'HACKED-1' }, workerToken)
  const me = await call('GET', '/me', null, workerToken)
  assert.equal(me.body.user.role, 'worker')
  assert.equal(me.body.user.workId, 'JH-MINE-00214')
})

test('changing password logs out other sessions and needs the old one', async () => {
  const other = await call('POST', '/auth/login', { identifier: 'JH-MINE-00214', password: 'safety2026' })

  const wrongOld = await call('POST', '/me/password', { currentPassword: 'x', newPassword: 'newpass123' }, workerToken)
  assert.deepEqual(wrongOld.body.fields, { currentPassword: 'wrong' })

  const ok = await call('POST', '/me/password', { currentPassword: 'safety2026', newPassword: 'newpass123' }, workerToken)
  assert.equal(ok.status, 204)
  assert.equal((await call('GET', '/me', null, other.body.token)).status, 401)
  assert.equal((await call('GET', '/me', null, workerToken)).status, 200)

  const relog = await call('POST', '/auth/login', { identifier: 'JH-MINE-00214', password: 'newpass123' })
  assert.equal(relog.status, 200)
})

test('logout ends the session', async () => {
  const login = await call('POST', '/auth/login', { identifier: 'JH-MINE-00214', password: 'newpass123' })
  assert.equal((await call('POST', '/auth/logout', null, login.body.token)).status, 204)
  assert.equal((await call('GET', '/me', null, login.body.token)).status, 401)
})

test('supervisor sign-up waits for admin approval', async () => {
  const reg = await call('POST', '/auth/register', {
    ...worker, role: 'supervisor', workId: 'SUP-001', phone: '9000000001',
  })
  assert.equal(reg.status, 201)
  assert.equal(reg.body.pendingApproval, true)
  assert.equal(reg.body.token, undefined)

  const login = await call('POST', '/auth/login', { identifier: 'SUP-001', password: 'safety2026' })
  assert.equal(login.status, 403)
  assert.equal(login.body.error, 'account_pending')

  const admin = await createActiveAdmin('ADMIN-001', '9000000099')
  const pending = await call('GET', '/admin/users?status=pending', null, admin.token)
  assert.deepEqual(pending.body.users.map((u) => u.workId), ['SUP-001'])

  const approved = await call('PATCH', `/admin/users/${reg.body.user.id}`, { status: 'active' }, admin.token)
  assert.equal(approved.body.user.status, 'active')
  const after = await call('POST', '/auth/login', { identifier: 'SUP-001', password: 'safety2026' })
  assert.equal(after.status, 200)
})

test('admin endpoints are admin-only', async () => {
  const sup = await call('POST', '/auth/login', { identifier: 'SUP-001', password: 'safety2026' })
  assert.equal((await call('GET', '/admin/users', null, sup.body.token)).status, 403)
  assert.equal((await call('GET', '/admin/users')).status, 401)
})

test('disabling an account ends its sessions; admins cannot change themselves', async () => {
  const admin = await createActiveAdmin('ADMIN-002', '9000000098')
  const sup = await call('POST', '/auth/login', { identifier: 'SUP-001', password: 'safety2026' })
  const supId = sup.body.user.id

  await call('PATCH', `/admin/users/${supId}`, { status: 'disabled' }, admin.token)
  assert.equal((await call('GET', '/me', null, sup.body.token)).status, 401)
  const relog = await call('POST', '/auth/login', { identifier: 'SUP-001', password: 'safety2026' })
  assert.equal(relog.body.error, 'account_disabled')

  const self = await call('PATCH', `/admin/users/${admin.id}`, { status: 'disabled' }, admin.token)
  assert.equal(self.body.error, 'cannot_change_self')
})

test('malformed JSON gets a clean 400', async () => {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope',
  })
  assert.equal(res.status, 400)
})

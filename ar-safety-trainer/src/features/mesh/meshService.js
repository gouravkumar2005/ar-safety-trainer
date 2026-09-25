// Runs the offline phone-to-phone network for the logged-in user:
// connects core/meshSync.js (routing) to platform/mesh.js (Bluetooth radio)
// and core/ledger.js (the records to deliver).
//
//   Admin / supervisor phone -> collector: receives everyone's records.
//   Worker phone             -> sends its own records, and carries other
//                               workers' records towards the admin.
//
// Starts by itself in the Android app after login (unless turned off on the
// Offline Network screen). Does nothing on the website.

import { MeshNode, ROLE_ADMIN, ROLE_NODE } from '../../core/meshSync.js'
import * as box from '../../core/meshCrypto.js'
import * as ledger from '../../core/ledger.js'
import { getCurrentUser, hasRole, onSessionChange } from '../../core/session.js'
import { isMeshSupported, meshRadio } from '../../platform/mesh.js'

const TICK_MS = 3000
const ENABLED_KEY = 'mesh:enabled'

const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full: keep running from memory */
    }
  },
}

let node = null
let timer = null
let handles = []
let busy = false
let lastError = ''
const listeners = new Set()

export function onMeshStatus(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  const status = getMeshStatus()
  for (const fn of listeners) fn(status)
}

export function getMeshStatus() {
  return {
    supported: isMeshSupported(),
    enabled: isMeshEnabled(),
    running: !!node,
    error: lastError,
    ...(node ? node.status() : {}),
  }
}

export function isMeshEnabled() {
  return storage.get(ENABLED_KEY) !== false
}

export async function setMeshEnabled(on) {
  storage.set(ENABLED_KEY, on)
  if (on) await startMesh()
  else await stopMesh()
}

function nodeId() {
  let id = storage.get('mesh:nodeId')
  if (!id) {
    id = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    storage.set('mesh:nodeId', id)
  }
  return id
}

async function adminKeys() {
  let keys = storage.get('mesh:adminKeys')
  if (!keys) {
    keys = await box.createAdminKeyPair()
    storage.set('mesh:adminKeys', keys)
  }
  return keys
}

export async function startMesh() {
  const user = getCurrentUser()
  if (!isMeshSupported() || !isMeshEnabled() || !user || node || busy) return
  busy = true
  try {
    const role = hasRole('admin', 'supervisor') ? ROLE_ADMIN : ROLE_NODE
    const id = nodeId()
    const firstName = user.fullName.split(/\s+/)[0]
    node = new MeshNode({
      nodeId: id,
      name: firstName,
      role,
      storage,
      box,
      adminKeys: role === ROLE_ADMIN ? await adminKeys() : null,
      transport: { send: meshRadio.send, broadcast: meshRadio.broadcast },
      getOwnRecords: async () => {
        const { entries, publicKeyJwk } = await ledger.exportAll()
        return { worker: { name: user.fullName, workId: user.workId }, publicKeyJwk, entries }
      },
    })
    node.onChange(emit)
    handles = await Promise.all([
      meshRadio.on('peerConnected', (e) => node?.peerConnected(e.endpointId, e.name)),
      meshRadio.on('peerLost', (e) => node?.peerLost(e.endpointId)),
      meshRadio.on('message', (e) => node?.receive(e.endpointId, e.data)),
      meshRadio.on('error', (e) => {
        lastError = e.message
        emit()
      }),
    ])
    // The name other phones see while connecting.
    await meshRadio.start(`${firstName}-${id.slice(0, 4)}`)
    timer = setInterval(() => node?.tick().catch(() => {}), TICK_MS)
    lastError = ''
  } catch (err) {
    lastError = err?.message || String(err)
    await teardown()
  } finally {
    busy = false
    emit()
  }
}

async function teardown() {
  clearInterval(timer)
  timer = null
  for (const h of handles) h?.remove?.()
  handles = []
  node = null
  await meshRadio.stop().catch(() => {})
}

export async function stopMesh() {
  await teardown()
  emit()
}

// Start after login, stop on logout, restart when a different person logs in
// (their role decides collector vs worker).
export function initMesh() {
  if (!isMeshSupported()) return
  const who = (u) => (u ? `${u.id}:${u.role}` : '')
  let current = who(getCurrentUser())
  startMesh()
  // Profile refreshes also fire this; only react when the person or role changes.
  onSessionChange(async (user) => {
    if (who(user) === current) return
    current = who(user)
    await stopMesh()
    if (user) startMesh()
  })
}

// Offline phone-to-phone network ("mesh") that carries workers' training
// records to the admin with no internet. The radio part (Bluetooth / Wi-Fi
// Direct via Google Nearby Connections) lives in the Android plugin; this
// file is only the routing, so it can be tested without phones.
//
// How a record finds the admin — "gradient" routing:
//   1. The admin phone says every few seconds: BEACON { hops: 0 }.
//   2. Every other phone keeps the hop count each neighbour reports and
//      announces its own: (smallest neighbour hops) + 1.
//   3. A record is always handed to the neighbour with the smallest hop
//      count, so it follows the shortest known path to the admin.
//   4. No path yet? The phone keeps the record (store-and-forward) and sends
//      it as soon as any path appears.
//   5. The admin sends an ACK back the same way; each phone on the path
//      then drops its copy, and the worker's phone marks it delivered.
//
// Records are sealed for the admin (core/meshCrypto.js) so relays can't read
// them, and each one is still the worker's signed ledger entry, so the
// admin can tell if anyone changed it on the way (core/ledger.js).

const BEACON_EVERY_MS = 4000
const NEIGHBOUR_EXPIRES_MS = 15000
const RETRY_AFTER_MS = 12000
const MAX_HOPS = 10
const SEEN_LIMIT = 2000

export const ROLE_ADMIN = 'admin'
export const ROLE_NODE = 'node'

export class MeshNode {
  /**
   * @param {object} deps
   * @param {string} deps.nodeId       stable id of this phone
   * @param {string} deps.name         shown to others (e.g. worker's name)
   * @param {'admin'|'node'} deps.role
   * @param {{send(endpointId, text): Promise, broadcast(text): Promise}} deps.transport
   * @param {() => Promise<{worker, publicKeyJwk, entries}>} [deps.getOwnRecords]  worker phones
   * @param {{get(key), set(key, value)}} deps.storage   JSON storage (localStorage wrapper)
   * @param {object} deps.box   { sealForAdmin, openAsAdmin, keyId } from meshCrypto.js
   * @param {{publicJwk, privateJwk}} [deps.adminKeys]   admin phones only
   * @param {() => number} [deps.now]
   */
  constructor({ nodeId, name, role, transport, getOwnRecords, storage, box, adminKeys = null, now = () => Date.now() }) {
    Object.assign(this, { nodeId, name, role, transport, getOwnRecords, storage, box, adminKeys, now })
    this.neighbours = new Map() // endpointId -> { name, nodeId, hops, adminKey, seenAt }
    this.seen = new Set() // DATA ids already handled
    this.acked = new Set() // DATA ids whose ACK passed through here
    this.reverse = new Map() // DATA id -> endpointId it came from (ACK path)
    this.outbox = new Map(Object.entries(storage.get('mesh:outbox') || {})) // id -> { msg, sentAt }
    this.ownDelivered = new Set(storage.get('mesh:delivered') || []) // own ledger seqs the admin has
    this.inbox = storage.get('mesh:inbox') || {} // admin: origin nodeId -> worker record
    this.lastBeaconAt = 0
    this.listeners = new Set()
  }

  // ---- status for the UI --------------------------------------------------

  onChange(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit() {
    for (const fn of this.listeners) fn(this.status())
  }

  hopsToAdmin() {
    if (this.role === ROLE_ADMIN) return 0
    let best = Infinity
    for (const n of this.neighbours.values()) best = Math.min(best, n.hops + 1)
    return best
  }

  // The admin key this phone currently routes towards (from the nearest neighbour).
  currentAdminKey() {
    if (this.role === ROLE_ADMIN) return this.adminKeys?.publicJwk ?? null
    let best = null
    for (const n of this.neighbours.values()) {
      if (n.adminKey && Number.isFinite(n.hops) && (!best || n.hops < best.hops)) best = n
    }
    return best?.adminKey ?? null
  }

  status() {
    const own = [...this.outbox.values()].filter((o) => o.msg.origin === this.nodeId).length
    return {
      role: this.role,
      name: this.name,
      hopsToAdmin: this.hopsToAdmin(),
      neighbours: [...this.neighbours.entries()].map(([endpointId, n]) => ({ endpointId, ...n })),
      waiting: own,
      relaying: this.outbox.size - own,
      delivered: this.ownDelivered.size,
      inbox: this.inbox,
    }
  }

  // ---- radio events --------------------------------------------------------

  peerConnected(endpointId, name) {
    this.neighbours.set(endpointId, { name, nodeId: null, hops: Infinity, adminKey: null, seenAt: this.now() })
    this.sendBeacon(endpointId)
    this.emit()
  }

  peerLost(endpointId) {
    const before = this.hopsToAdmin()
    this.neighbours.delete(endpointId)
    this.announceIfChanged(before)
    this.emit()
  }

  // When this phone's distance to the admin changes, tell neighbours at
  // once instead of waiting for the next timed beacon, so routes update fast.
  announceIfChanged(before) {
    if (this.hopsToAdmin() !== before) this.sendBeacon()
  }

  async receive(endpointId, text) {
    let msg
    try {
      msg = JSON.parse(text)
    } catch {
      return
    }
    if (msg.type === 'BEACON') {
      const before = this.hopsToAdmin()
      this.onBeacon(endpointId, msg)
      this.announceIfChanged(before)
    }
    else if (msg.type === 'DATA') await this.onData(endpointId, msg)
    else if (msg.type === 'ACK') this.onAck(msg)
    this.emit()
  }

  // ---- periodic work -------------------------------------------------------

  async tick() {
    const now = this.now()
    for (const n of this.neighbours.values()) {
      // A neighbour that stopped sending beacons no longer offers a route.
      if (now - n.seenAt > NEIGHBOUR_EXPIRES_MS) n.hops = Infinity
    }
    if (now - this.lastBeaconAt >= BEACON_EVERY_MS) this.sendBeacon()
    if (this.role === ROLE_NODE) await this.queueOwnRecords()
    await this.flush()
    this.emit()
  }

  sendBeacon(endpointId = null) {
    this.lastBeaconAt = this.now()
    const hops = this.hopsToAdmin()
    const beacon = JSON.stringify({
      type: 'BEACON',
      from: this.nodeId,
      name: this.name,
      hops: Number.isFinite(hops) ? hops : null,
      adminKey: this.currentAdminKey(),
    })
    return (endpointId ? this.transport.send(endpointId, beacon) : this.transport.broadcast(beacon)).catch(() => {})
  }

  onBeacon(endpointId, msg) {
    const n = this.neighbours.get(endpointId) || { name: msg.name }
    this.neighbours.set(endpointId, {
      ...n,
      name: msg.name || n.name,
      nodeId: msg.from,
      hops: msg.hops === null || msg.hops === undefined ? Infinity : msg.hops,
      adminKey: msg.adminKey || null,
      seenAt: this.now(),
    })
  }

  // Worker phone: turn every ledger entry the admin doesn't have yet into a
  // sealed DATA message. Needs a known admin key (i.e. a route) first.
  async queueOwnRecords() {
    const adminKey = this.currentAdminKey()
    if (!adminKey || !this.getOwnRecords) return
    const kid = await this.box.keyId(adminKey)
    const { worker, publicKeyJwk, entries } = await this.getOwnRecords()
    for (const entry of entries) {
      const id = `${this.nodeId}:${entry.seq}`
      if (this.ownDelivered.has(entry.seq)) continue
      const queued = this.outbox.get(id)
      if (queued && queued.msg.box.kid === kid) continue // already sealed for this admin
      const box = await this.box.sealForAdmin(adminKey, JSON.stringify({ worker, publicKeyJwk, entry }))
      this.outbox.set(id, { msg: { type: 'DATA', id, origin: this.nodeId, seq: entry.seq, ttl: MAX_HOPS, path: [this.name], box }, sentAt: 0 })
    }
    this.save()
  }

  // Hand every waiting message to the neighbour closest to the admin.
  async flush() {
    const myHops = this.hopsToAdmin()
    if (!Number.isFinite(myHops) || this.role === ROLE_ADMIN) return
    const next = [...this.neighbours.entries()].find(([, n]) => n.hops + 1 === myHops)
    if (!next) return
    const [endpointId] = next
    const now = this.now()
    for (const item of this.outbox.values()) {
      // sentAt 0 = never sent (or last send failed): send now.
      if (item.sentAt && now - item.sentAt < RETRY_AFTER_MS) continue
      item.sentAt = now
      await this.transport.send(endpointId, JSON.stringify(item.msg)).catch(() => {
        item.sentAt = 0 // try again next tick
      })
    }
  }

  async onData(endpointId, msg) {
    this.reverse.set(msg.id, endpointId)
    if (this.role === ROLE_ADMIN) {
      if (!this.seen.has(msg.id)) {
        const ok = await this.acceptAtAdmin(msg)
        if (!ok) return // not for this admin / unreadable: no ACK, sender keeps it
        this.remember(msg.id)
      }
      // Always ACK, even duplicates: the first ACK may have been lost.
      this.transport.send(endpointId, JSON.stringify({ type: 'ACK', id: msg.id, to: msg.origin })).catch(() => {})
      return
    }
    if (this.acked.has(msg.id)) {
      // Delivered already; the sender just missed the ACK.
      this.transport.send(endpointId, JSON.stringify({ type: 'ACK', id: msg.id, to: msg.origin })).catch(() => {})
      return
    }
    if (this.seen.has(msg.id) || msg.ttl <= 1 || msg.origin === this.nodeId) return
    this.remember(msg.id)
    this.outbox.set(msg.id, { msg: { ...msg, ttl: msg.ttl - 1, path: [...msg.path, this.name] }, sentAt: 0 })
    this.save()
    await this.flush()
  }

  async acceptAtAdmin(msg) {
    let record
    try {
      if (msg.box.kid !== (await this.box.keyId(this.adminKeys.publicJwk))) return false
      record = JSON.parse(await this.box.openAsAdmin(this.adminKeys.privateJwk, msg.box))
    } catch {
      return false
    }
    const w = (this.inbox[msg.origin] ||= { worker: record.worker, publicKeyJwk: record.publicKeyJwk, entries: {}, path: [], lastSeen: 0 })
    w.worker = record.worker
    w.publicKeyJwk = record.publicKeyJwk
    w.entries[record.entry.seq] = record.entry
    w.path = [...msg.path, this.name]
    w.lastSeen = this.now()
    this.save()
    return true
  }

  onAck(msg) {
    this.acked.add(msg.id)
    this.outbox.delete(msg.id)
    if (msg.to === this.nodeId) {
      const seq = Number(msg.id.split(':').pop())
      this.ownDelivered.add(seq)
    } else {
      const back = this.reverse.get(msg.id)
      if (back) this.transport.send(back, JSON.stringify(msg)).catch(() => {})
    }
    this.save()
  }

  remember(id) {
    this.seen.add(id)
    if (this.seen.size > SEEN_LIMIT) this.seen.delete(this.seen.values().next().value)
  }

  save() {
    this.storage.set('mesh:outbox', Object.fromEntries(this.outbox))
    this.storage.set('mesh:delivered', [...this.ownDelivered])
    if (this.role === ROLE_ADMIN) this.storage.set('mesh:inbox', this.inbox)
  }
}

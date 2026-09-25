// Routing tests for core/meshSync.js with simulated phones (no radios).
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MeshNode, ROLE_ADMIN, ROLE_NODE } from '../src/core/meshSync.js'
import * as box from '../src/core/meshCrypto.js'

// A fake "air": which phones can hear each other.
function makeNetwork() {
  const nodes = new Map()
  const links = new Set()
  const key = (a, b) => [a, b].sort().join('|')
  let clock = 0
  const net = {
    now: () => clock,
    advance: (ms) => { clock += ms },
    linked: (a, b) => links.has(key(a, b)),
    link(a, b) {
      links.add(key(a, b))
      nodes.get(a).peerConnected(b, b)
      nodes.get(b).peerConnected(a, a)
    },
    // Signal lost, but the phones haven't noticed the disconnect yet.
    cutAir(a, b) {
      links.delete(key(a, b))
    },
    unlink(a, b) {
      links.delete(key(a, b))
      nodes.get(a).peerLost(b)
      nodes.get(b).peerLost(a)
    },
    async add(id, role, entries = []) {
      const storage = new Map()
      const adminKeys = role === ROLE_ADMIN ? await box.createAdminKeyPair() : null
      const transport = {
        send: async (to, text) => {
          if (!net.linked(id, to)) throw new Error('not connected')
          await nodes.get(to).receive(id, text)
        },
        broadcast: async (text) => {
          for (const other of nodes.keys()) if (other !== id && net.linked(id, other)) await nodes.get(other).receive(id, text)
        },
      }
      const node = new MeshNode({
        nodeId: id,
        name: id,
        role,
        transport,
        storage: { get: (k) => storage.get(k), set: (k, v) => storage.set(k, JSON.parse(JSON.stringify(v))) },
        box,
        adminKeys,
        now: net.now,
        getOwnRecords: async () => ({ worker: { name: `Worker ${id}`, workId: `JH-${id}` }, publicKeyJwk: { kty: 'EC' }, entries }),
      })
      nodes.set(id, node)
      return node
    },
    async run(rounds = 8) {
      for (let i = 0; i < rounds; i++) {
        for (const n of nodes.values()) await n.tick()
        net.advance(5000)
      }
    },
  }
  return net
}

const entry = (seq, secret = 'score 4/5') => ({ seq, type: 'QUIZ_COMPLETED', payload: { note: secret }, hash: `h${seq}`, signature: 's', prevHash: 'p', timestamp: 't' })

test('a record hops A -> B -> Admin when A cannot reach the admin directly', async () => {
  const net = makeNetwork()
  const a = await net.add('A', ROLE_NODE, [entry(0), entry(1)])
  await net.add('B', ROLE_NODE)
  const admin = await net.add('ADMIN', ROLE_ADMIN)
  net.link('A', 'B')
  net.link('B', 'ADMIN')
  await net.run()

  assert.equal(a.hopsToAdmin(), 2)
  const got = admin.inbox.A
  assert.ok(got, 'admin received A')
  assert.deepEqual(Object.keys(got.entries).sort(), ['0', '1'])
  assert.deepEqual(got.path, ['A', 'B', 'ADMIN'])
  assert.equal(got.worker.workId, 'JH-A')
  assert.equal(a.status().delivered, 2, 'A got both ACKs')
  assert.equal(a.status().waiting, 0)
})

test('the shortest path is chosen when there are two ways', async () => {
  const net = makeNetwork()
  await net.add('A', ROLE_NODE, [entry(0)])
  for (const id of ['B', 'D', 'E']) await net.add(id, ROLE_NODE)
  const admin = await net.add('ADMIN', ROLE_ADMIN)
  // Short way: A-B-ADMIN. Long way: A-D-E-ADMIN.
  net.link('A', 'B'); net.link('B', 'ADMIN')
  net.link('A', 'D'); net.link('D', 'E'); net.link('E', 'ADMIN')
  await net.run()
  assert.deepEqual(admin.inbox.A.path, ['A', 'B', 'ADMIN'])
})

test('with no route the record waits, then goes once a path appears', async () => {
  const net = makeNetwork()
  const a = await net.add('A', ROLE_NODE, [entry(0)])
  await net.add('B', ROLE_NODE)
  const admin = await net.add('ADMIN', ROLE_ADMIN)
  net.link('A', 'B')
  await net.run()
  assert.equal(admin.inbox.A, undefined)
  assert.equal(a.hopsToAdmin(), Infinity)

  net.link('B', 'ADMIN')
  await net.run()
  assert.ok(admin.inbox.A)
  assert.equal(a.status().delivered, 1)
})

test('if the route breaks mid-way, another path is used', async () => {
  const net = makeNetwork()
  await net.add('A', ROLE_NODE, [entry(0)])
  await net.add('B', ROLE_NODE)
  await net.add('D', ROLE_NODE)
  const admin = await net.add('ADMIN', ROLE_ADMIN)
  net.link('A', 'B')
  net.link('A', 'D')
  net.link('D', 'ADMIN')
  net.unlink('A', 'D') // the only working route disappears
  await net.run(3)
  net.link('B', 'ADMIN') // a new one shows up
  await net.run()
  assert.deepEqual(admin.inbox.A.path, ['A', 'B', 'ADMIN'])
})

test('relay phones cannot read what they carry', async () => {
  const net = makeNetwork()
  await net.add('A', ROLE_NODE, [entry(0, 'TOP-SECRET-SCORE')])
  const b = await net.add('B', ROLE_NODE)
  await net.add('ADMIN', ROLE_ADMIN)
  net.link('A', 'B')
  net.link('B', 'ADMIN')
  // B's radio link to the admin drops before A's record arrives, so B has to hold it.
  net.cutAir('B', 'ADMIN')
  await net.run(1)
  assert.ok(b.outbox.size >= 1, 'B is carrying the record from A')
  const carried = JSON.stringify(b.storage.get('mesh:outbox') || {}) + JSON.stringify([...b.outbox.values()])
  assert.ok(!carried.includes('TOP-SECRET-SCORE'))
})

test('duplicates are stored once and every copy is acknowledged', async () => {
  const net = makeNetwork()
  const a = await net.add('A', ROLE_NODE, [entry(0)])
  const admin = await net.add('ADMIN', ROLE_ADMIN)
  net.link('A', 'ADMIN')
  await net.run()
  const msg = { type: 'DATA', id: 'A:0', origin: 'A', seq: 0, ttl: 5, path: ['A'], box: {} }
  await admin.receive('A', JSON.stringify(msg)) // replayed copy
  assert.equal(Object.keys(admin.inbox.A.entries).length, 1)
  assert.equal(a.status().delivered, 1)
})

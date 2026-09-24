// Local, hash-chained, append-only certificate/audit ledger.
//
// WHAT THIS IS: a single-device tamper-evident log. Each entry commits to
// the hash of the entry before it (like a simplified blockchain), so
// editing any past entry is detectable unless every entry after it is
// also rewritten to match. That's a real, useful integrity property.
//
// WHAT THIS IS NOT: a distributed/consensus blockchain. There is no
// network of independent nodes agreeing on this ledger's state — it lives
// in this one browser's IndexedDB. Someone with full control of this exact
// device/profile can still rewrite its entire local chain from scratch.
// Closing that specific gap needs an external, independently-checkable
// anchor (e.g. a public blockchain testnet) — deliberately out of scope
// for now (see README backlog); the team chose "fully offline" so this
// never depends on a live network at demo time.
//
// Replaces the old certificate.js DEMO_SECRET/HMAC scheme: instead of one
// shared secret sitting in the JS bundle (readable by anyone via devtools,
// forgeable from any device), each device generates its own ECDSA keypair
// on first run and signs with a private key that never leaves it.

const DB_NAME = 'ar-safety-trainer-ledger'
const DB_VERSION = 1
const GENESIS_HASH = '0'.repeat(64) // fixed constant, entry seq 0's prevHash

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'seq' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys', { keyPath: 'name' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// --- canonical serialization ---------------------------------------------
// Sorts object keys recursively before JSON.stringify so hashing never
// depends on incidental key-insertion order (a real source of "valid data,
// verification fails anyway" bugs if skipped).
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeysDeep(value[key])
        return acc
      }, {})
  }
  return value
}

function canonicalJson(value) {
  return JSON.stringify(sortKeysDeep(value))
}

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return bufToHex(buf)
}

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  return bytes.buffer
}

// Hashes exactly the fields that get signed — shared by append() and
// verifyChain() so there is one hashing implementation, not two that could
// drift apart. Extra fields on `entry` (hash, signature, certId, ...) are
// ignored, so callers can pass a full stored/QR-decoded object as-is.
export async function hashEntry({ seq, timestamp, type, payload, prevHash }) {
  return sha256Hex(canonicalJson({ seq, timestamp, type, payload, prevHash }))
}

export async function verifySignature(hash, signatureHex, publicKeyJwk) {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    hexToBuf(signatureHex),
    new TextEncoder().encode(hash)
  )
}

// --- device keypair --------------------------------------------------------
// NOTE: there's a small unhandled race if two tabs both call this for the
// very first time before any keypair exists (both could generate one, the
// second write wins). Not worth a Web Locks mutex for a single-user,
// effectively-single-tab hackathon prototype — flagged here rather than
// silently ignored.
async function getOrCreateDeviceKeyPair(db) {
  const existing = await reqToPromise(db.transaction(['keys'], 'readonly').objectStore('keys').get('device'))
  if (existing) return existing

  // Per the WebCrypto spec, generateKey() always forces the *public* key's
  // extractable flag to true regardless of what's passed here — only the
  // private key actually respects `false`. That's exactly what we want:
  // the public key needs to travel (verifier screen, admin import) while
  // the private key provably never leaves this device.
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const record = { name: 'device', privateKey: keyPair.privateKey, publicKey: keyPair.publicKey, publicKeyJwk }
  await reqToPromise(db.transaction(['keys'], 'readwrite').objectStore('keys').put(record))
  return record
}

export async function getPublicKeyJwk() {
  const db = await openDb()
  const record = await getOrCreateDeviceKeyPair(db)
  return record.publicKeyJwk
}

// --- append ----------------------------------------------------------------

export async function append(type, payload) {
  const db = await openDb()
  const keys = await getOrCreateDeviceKeyPair(db)

  const t = db.transaction(['entries', 'meta'], 'readwrite')
  const entriesStore = t.objectStore('entries')
  const metaStore = t.objectStore('meta')

  const headSeqRow = await reqToPromise(metaStore.get('headSeq'))
  const headHashRow = await reqToPromise(metaStore.get('headHash'))
  const seq = headSeqRow ? headSeqRow.value + 1 : 0
  const prevHash = headHashRow ? headHashRow.value : GENESIS_HASH
  const timestamp = new Date().toISOString()

  const unsigned = { seq, timestamp, type, payload, prevHash }
  const hash = await hashEntry(unsigned)
  const signatureBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.privateKey,
    new TextEncoder().encode(hash)
  )
  const entry = { ...unsigned, hash, signature: bufToHex(signatureBuf) }

  entriesStore.put(entry)
  metaStore.put({ key: 'headSeq', value: seq })
  metaStore.put({ key: 'headHash', value: hash })

  await new Promise((resolve, reject) => {
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })

  return entry
}

// --- read / verify -----------------------------------------------------

export async function getAllEntries() {
  const db = await openDb()
  const store = db.transaction(['entries'], 'readonly').objectStore('entries')
  const entries = await reqToPromise(store.getAll())
  return entries.sort((a, b) => a.seq - b.seq)
}

export async function getEntry(seq) {
  const db = await openDb()
  const store = db.transaction(['entries'], 'readonly').objectStore('entries')
  return reqToPromise(store.get(seq))
}

// Pure function: verifies any entries array (this device's own, or one
// imported from an export file) by recomputing hash/prevHash links and
// (if a public key is given) each signature. Used both by verify() below
// and by the admin dashboard's import screen — one verification
// implementation, not two.
export async function verifyChain(entries, publicKeyJwk) {
  if (!entries || entries.length === 0) return { valid: true, brokenAtSeq: null, totalEntries: 0 }

  let expectedPrevHash = GENESIS_HASH
  for (const entry of entries) {
    const { seq, prevHash, hash, signature } = entry
    if (prevHash !== expectedPrevHash) return { valid: false, brokenAtSeq: seq, totalEntries: entries.length }

    const recomputedHash = await hashEntry(entry)
    if (recomputedHash !== hash) return { valid: false, brokenAtSeq: seq, totalEntries: entries.length }

    if (publicKeyJwk) {
      const ok = await verifySignature(hash, signature, publicKeyJwk)
      if (!ok) return { valid: false, brokenAtSeq: seq, totalEntries: entries.length }
    }

    expectedPrevHash = hash
  }

  return { valid: true, brokenAtSeq: null, totalEntries: entries.length }
}

export async function verify() {
  const entries = await getAllEntries()
  const publicKeyJwk = await getPublicKeyJwk()
  return verifyChain(entries, publicKeyJwk)
}

export async function exportAll() {
  const entries = await getAllEntries()
  const publicKeyJwk = await getPublicKeyJwk()
  return { entries, publicKeyJwk, exportedAt: new Date().toISOString() }
}

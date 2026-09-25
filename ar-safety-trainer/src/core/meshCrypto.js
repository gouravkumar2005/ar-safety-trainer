// Encryption for the offline phone-to-phone network (core/meshSync.js).
//
// Worker results travel through other workers' phones on the way to the
// admin. Those relay phones must pass the data on but must not be able to
// read it. So each message is sealed for the admin's public key:
//
//   sender:  new one-time ECDH key + admin's public key -> shared AES key
//            -> AES-GCM encrypt
//   admin:   own private key + sender's one-time public key -> same AES key
//            -> decrypt
//
// This is privacy only. Tamper-evidence comes from the ledger itself: every
// entry inside is signed on the worker's own phone (core/ledger.js), and the
// admin re-checks that signature after decrypting.
//
// Uses only Web Crypto, so it runs in the app's WebView and in Node (tests).

const ECDH = { name: 'ECDH', namedCurve: 'P-256' }
const subtle = () => globalThis.crypto.subtle

const toB64 = (buf) => {
  let s = ''
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
  return btoa(s)
}
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

// Admin keypair, as JWKs so it can be kept in localStorage.
export async function createAdminKeyPair() {
  const pair = await subtle().generateKey(ECDH, true, ['deriveKey'])
  return {
    publicJwk: await subtle().exportKey('jwk', pair.publicKey),
    privateJwk: await subtle().exportKey('jwk', pair.privateKey),
  }
}

// Short id for a public key, so phones can tell which admin a message is for.
export async function keyId(publicJwk) {
  const digest = await subtle().digest('SHA-256', new TextEncoder().encode(`${publicJwk.x}.${publicJwk.y}`))
  return [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function aesKey(privateKey, publicKey, usage) {
  return subtle().deriveKey({ name: 'ECDH', public: publicKey }, privateKey, { name: 'AES-GCM', length: 256 }, false, [usage])
}

export async function sealForAdmin(adminPublicJwk, text) {
  const adminKey = await subtle().importKey('jwk', adminPublicJwk, ECDH, false, [])
  const oneTime = await subtle().generateKey(ECDH, true, ['deriveKey'])
  const key = await aesKey(oneTime.privateKey, adminKey, 'encrypt')
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  return {
    kid: await keyId(adminPublicJwk),
    epk: await subtle().exportKey('jwk', oneTime.publicKey),
    iv: toB64(iv),
    ct: toB64(ct),
  }
}

export async function openAsAdmin(adminPrivateJwk, box) {
  const privateKey = await subtle().importKey('jwk', adminPrivateJwk, ECDH, false, ['deriveKey'])
  const senderKey = await subtle().importKey('jwk', box.epk, ECDH, false, [])
  const key = await aesKey(privateKey, senderKey, 'decrypt')
  const pt = await subtle().decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.ct))
  return new TextDecoder().decode(pt)
}

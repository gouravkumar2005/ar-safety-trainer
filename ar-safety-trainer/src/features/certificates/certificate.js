import QRCode from 'qrcode'
import * as ledger from '../../core/ledger.js'

// --- Certificate generation -------------------------------------------
//
// Certificates are issued as entries in the local hash-chain ledger
// (core/ledger.js) — signed with this device's own private key, which
// never leaves it, and linked to every result/certificate issued before it
// on this device. This replaced an earlier prototype that signed with a
// shared secret embedded in the JS bundle (readable via devtools, forgeable
// from any device) — read core/ledger.js's header comment for exactly what this
// scheme does and does not prove; it's single-device tamper-evidence, not
// a distributed blockchain.
//
// `certId` is a derived display label (`${moduleId}-${workerId}-${seq}`),
// NOT part of the signed data — it can't be, since it depends on `seq`,
// which only exists after the ledger entry is written. Verification never
// trusts `certId` itself; it's cosmetic.

// `uan` (e-Shram Universal Account Number) and `nsqf` (indicative NSQF
// level/competency, from the module's own `nsqf` field in modules.js) are
// both snapshotted into the signed ledger entry at issuance time, same as
// score/total — so edits to modules.js later never retroactively change
// what an already-issued certificate claims. Neither implies a real
// government check happened; see certUanNote / nsqfDisclaimerNote in
// i18n.js, surfaced right next to these fields wherever the cert is shown.
export async function buildCertificatePayload({ workerName, workerId, uan, moduleId, score, total, nsqf }) {
  const entry = await ledger.append('CERT_ISSUED', { workerName, workerId, uan: uan || null, moduleId, score, total, nsqf: nsqf || null })
  const certId = `${moduleId}-${workerId}-${entry.seq}`.replace(/[^a-zA-Z0-9-]/g, '')
  return { certId, ...entry }
}

export async function certificateToQrDataUrl(cert) {
  return QRCode.toDataURL(JSON.stringify(cert), { margin: 1, width: 260 })
}

// Standalone check: works from just the QR contents + this device's known
// public key. Confirms the payload hasn't been edited since it was signed,
// and really was signed by this device's key. Does NOT confirm this
// entry's position in an unbroken chain — see verifyOnChain.
export async function verifyStandalone(cert) {
  const recomputedHash = await ledger.hashEntry(cert)
  if (recomputedHash !== cert.hash) return false
  const publicKeyJwk = await ledger.getPublicKeyJwk()
  return ledger.verifySignature(cert.hash, cert.signature, publicKeyJwk)
}

// Full-chain check: only meaningful on the device that issued the
// certificate (or a ledger export from it) — confirms nothing before or
// after this entry was deleted, reordered, or backdated on this device.
export async function verifyOnChain(cert) {
  const entries = await ledger.getAllEntries()
  const match = entries.find((e) => e.seq === cert.seq)
  if (!match) return { onThisDevice: false }
  const publicKeyJwk = await ledger.getPublicKeyJwk()
  const result = await ledger.verifyChain(entries, publicKeyJwk)
  return { onThisDevice: true, ...result }
}

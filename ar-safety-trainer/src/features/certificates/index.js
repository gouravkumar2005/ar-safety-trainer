// Certificates feature: issue a ledger-signed QR certificate after a pass,
// and verify a pasted certificate.
import './certificates.css'
import { renderCertificate } from './certificateScreen.js'
import { renderVerify } from './verifyScreen.js'

export const routes = [
  { path: '/module/:id/certificate', render: renderCertificate },
  { path: '/verify', render: renderVerify, public: true }, // e.g. an inspector checking a worker's QR
]

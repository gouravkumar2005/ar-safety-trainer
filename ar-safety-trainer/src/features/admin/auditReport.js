import { t, pick } from '../../core/i18n/index.js'
import { getModule } from '../../content/modules.js'
import { sha256Hex } from '../../core/ledger.js'

// Turns a bundle + its verifyChain() result into a human-readable report —
// same underlying ledger data as everywhere else in the app, just
// presented as something a compliance officer could hand to an auditor
// or attach to an RTI response, instead of raw JSON. No new data model,
// no new ledger entry type — a presentation layer only.

function entryLine(entry) {
  const time = new Date(entry.timestamp).toLocaleString()
  if (entry.type === 'QUIZ_COMPLETED') {
    const mod = getModule(entry.payload.moduleId)
    return t('auditEntryQuiz', {
      seq: entry.seq,
      time,
      module: mod ? pick(mod.title) : entry.payload.moduleId,
      score: entry.payload.score,
      total: entry.payload.total,
      status: entry.payload.passed ? t('auditStatusPass') : t('auditStatusFail'),
    })
  }
  if (entry.type === 'CERT_ISSUED') {
    const mod = getModule(entry.payload.moduleId)
    return t('auditEntryCert', {
      seq: entry.seq,
      time,
      module: mod ? pick(mod.title) : entry.payload.moduleId,
      name: entry.payload.workerName,
      id: entry.payload.workerId,
      score: entry.payload.score,
      total: entry.payload.total,
    })
  }
  if (entry.type === 'GRIEVANCE_SUBMITTED') {
    const mod = entry.payload.moduleId ? getModule(entry.payload.moduleId) : null
    return t('auditEntryGrievance', {
      seq: entry.seq,
      time,
      category: entry.payload.category,
      moduleSuffix: mod ? ` (${pick(mod.title)})` : '',
    })
  }
  return t('auditEntryUnknown', { seq: entry.seq, time, type: entry.type })
}

export async function buildAuditReportText(bundle, verifyResult) {
  const fingerprint = (await sha256Hex(JSON.stringify(bundle.publicKeyJwk))).slice(0, 16)
  const worker = bundle.worker || {}

  const lines = [
    t('auditReportTitle'),
    `${t('auditReportGeneratedOn')}: ${new Date().toLocaleString()}`,
    `${t('auditReportDeviceFingerprint')}: ${fingerprint}`,
    '',
    `${t('auditReportWorker')}: ${worker.name || '—'} (${worker.id || '—'})${worker.uan ? ` — UAN ${worker.uan}` : ''}`,
    '',
    `${t('auditReportIntegrity')}: ${
      verifyResult.valid
        ? t('auditReportIntegrityPass', { n: verifyResult.totalEntries })
        : t('auditReportIntegrityFail', { n: verifyResult.brokenAtSeq })
    }`,
    '',
    `${t('auditReportEntries')}:`,
    ...bundle.entries.map((e) => `  ${entryLine(e)}`),
    '',
    t('auditReportScopeNote'),
  ]

  return lines.join('\n')
}

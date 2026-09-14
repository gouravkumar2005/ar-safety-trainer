import { t, pick } from '../utils/i18n.js'
import { state } from '../utils/state.js'
import { getModule } from '../data/modules.js'
import * as ledger from '../utils/ledger.js'
import * as aggregate from '../utils/aggregate.js'
import { buildAuditReportText } from '../utils/auditReport.js'

// Compliance dashboard MVP — export/import, not live multi-device sync.
// There's no backend in this build (the team chose "fully offline" this
// round), so a real admin dashboard that shows every worker's live status
// across every kiosk device isn't honestly buildable yet. What IS honest
// and useful: a trainee device exports its own data as one file; an admin,
// on any device, imports that file and reviews it — including an actual
// integrity check against the same hash-chain verification used everywhere
// else in the app (src/utils/ledger.js's verifyChain, not a re-implementation).
// The aggregate (MIS) section below extends this to *multiple* imported
// files at once, still with no backend and no live sync.

async function parseExportBundle(file) {
  const data = JSON.parse(await file.text())
  if (!Array.isArray(data.entries)) throw new Error('missing entries')
  return data
}

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function renderAdmin(main, navigate) {
  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
    <h2 class="h2-title" style="margin:12px 0 2px;">${t('adminHeading')}</h2>
    <p class="subtitle-dim" style="margin:0 0 16px;">${t('adminSubheading')}</p>

    <div class="module-card">
      <h3 class="card-h3">${t('adminExportBtn')}</h3>
      <p>${t('adminExportHint')}</p>
      <button class="btn btn-accent" id="export-btn" style="margin-top:6px;width:fit-content;">${t('adminExportBtn')}</button>
    </div>

    <div class="module-card">
      <h3 id="import-label" class="card-h3">${t('adminImportLabel')}</h3>
      <input type="file" id="import-input" accept="application/json" aria-labelledby="import-label" />
    </div>

    <div id="review-root"><p class="hint">${t('adminNoData')}</p></div>

    <hr style="border-color:var(--border);margin:22px 0;" />

    <div class="module-card">
      <h3 id="aggregate-import-label" class="card-h3">${t('adminAggregateHeading')}</h3>
      <p>${t('adminAggregateImportLabel')}</p>
      <input type="file" id="aggregate-input" accept="application/json" multiple aria-labelledby="aggregate-import-label" />
    </div>

    <div id="aggregate-root"></div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  main.querySelector('#export-btn').addEventListener('click', doExport)
  main.querySelector('#import-input').addEventListener('change', (e) => {
    const file = e.target.files?.[0]
    if (file) doImport(file)
  })
  main.querySelector('#aggregate-input').addEventListener('change', (e) => {
    const files = [...(e.target.files || [])]
    if (files.length) doAggregate(files)
  })

  async function doExport() {
    const btn = main.querySelector('#export-btn')
    const original = btn.textContent
    btn.disabled = true
    try {
      const ledgerExport = await ledger.exportAll()
      const bundle = {
        ...ledgerExport,
        worker: state.worker,
        results: state.results,
      }
      const idPart = (state.worker.id || 'worker').replace(/[^a-zA-Z0-9-]/g, '_')
      downloadText(JSON.stringify(bundle, null, 2), `ar-safety-trainer-export-${idPart}.json`, 'application/json')
    } finally {
      btn.disabled = false
      btn.textContent = original
    }
  }

  async function doImport(file) {
    const reviewRoot = main.querySelector('#review-root')
    reviewRoot.innerHTML = `<p class="hint">…</p>`
    let data
    try {
      data = await parseExportBundle(file)
    } catch {
      reviewRoot.innerHTML = `<div class="result-box result-tampered"><p>${t('adminImportError')}</p></div>`
      return
    }
    renderReview(reviewRoot, data)
  }

  async function renderReview(root, data) {
    const worker = data.worker || {}
    const results = data.results || {}
    const certs = data.entries.filter((e) => e.type === 'CERT_ISSUED')
    const grievances = data.entries.filter((e) => e.type === 'GRIEVANCE_SUBMITTED')

    const resultRows = Object.entries(results)
      .map(([moduleId, r]) => {
        const mod = getModule(moduleId)
        const label = mod ? pick(mod.title) : moduleId
        const badge = r.passed
          ? `<span class="badge badge-active">${t('pass')}</span>`
          : `<span class="badge badge-bad">${t('fail')}</span>`
        return `<div class="kv-row"><span class="k">${label}</span><span class="v">${r.score}/${r.total} ${badge}</span></div>`
      })
      .join('') || `<p class="hint">—</p>`

    const certRows = certs
      .map((c) => {
        const mod = getModule(c.payload?.moduleId)
        const label = mod ? pick(mod.title) : c.payload?.moduleId
        return `<div class="kv-row"><span class="k">#${c.seq} · ${label}</span><span class="v">${c.payload?.score}/${c.payload?.total}</span></div>`
      })
      .join('') || `<p class="hint">—</p>`

    const grievanceRows = grievances
      .map((g) => {
        const mod = g.payload?.moduleId ? getModule(g.payload.moduleId) : null
        const modLabel = mod ? ` · ${pick(mod.title)}` : ''
        return `<div class="kv-row"><span class="k">GRV-${g.seq}${modLabel}</span><span class="v">${g.payload?.category}</span></div>`
      })
      .join('') || `<p class="hint">${t('adminNoGrievances')}</p>`

    root.innerHTML = `
      <div class="module-card">
        <h3 class="card-h3">${t('adminWorker')}</h3>
        <div class="kv-row"><span class="k">${t('workerName')}</span><span class="v">${worker.name || '—'}</span></div>
        <div class="kv-row"><span class="k">${t('workerId')}</span><span class="v">${worker.id || '—'}</span></div>
        ${worker.uan ? `<div class="kv-row"><span class="k">${t('certUanLabel')}</span><span class="v">${worker.uan}</span></div>` : ''}
      </div>

      <div class="module-card">
        <h3 class="card-h3">${t('adminModuleResults')}</h3>
        ${resultRows}
      </div>

      <div class="module-card">
        <h3 class="card-h3">${t('adminCertificates')}</h3>
        ${certRows}
      </div>

      <div class="module-card">
        <h3 class="card-h3">${t('adminGrievancesHeading')}</h3>
        ${grievanceRows}
      </div>

      <div class="stack" style="flex-direction:row;">
        <button class="btn btn-primary" style="flex:1;" id="verify-ledger-btn">${t('adminVerifyBtn')}</button>
        <button class="btn" style="flex:1;" id="audit-report-btn">${t('adminAuditReportBtn')}</button>
      </div>
      <div id="integrity-root"></div>
    `

    let lastVerifyResult = null

    root.querySelector('#verify-ledger-btn').addEventListener('click', async () => {
      const integrityRoot = root.querySelector('#integrity-root')
      integrityRoot.innerHTML = `<p class="hint">…</p>`
      lastVerifyResult = await ledger.verifyChain(data.entries, data.publicKeyJwk)
      integrityRoot.innerHTML = lastVerifyResult.valid
        ? `<div class="result-box result-valid"><h4>✅</h4><p>${t('adminIntegrityValid', { n: lastVerifyResult.totalEntries })}</p></div>`
        : `<div class="result-box result-tampered"><h4>❌</h4><p>${t('adminIntegrityBroken', { n: lastVerifyResult.brokenAtSeq })}</p></div>`
    })

    root.querySelector('#audit-report-btn').addEventListener('click', async () => {
      if (!lastVerifyResult) lastVerifyResult = await ledger.verifyChain(data.entries, data.publicKeyJwk)
      const reportText = await buildAuditReportText(data, lastVerifyResult)
      const idPart = (worker.id || 'worker').replace(/[^a-zA-Z0-9-]/g, '_')
      downloadText(reportText, `audit-report-${idPart}.txt`, 'text/plain')
    })
  }

  async function doAggregate(files) {
    const aggregateRoot = main.querySelector('#aggregate-root')
    aggregateRoot.innerHTML = `<p class="hint">…</p>`

    const parsed = []
    let parseErrors = 0
    for (const file of files) {
      try {
        parsed.push(await parseExportBundle(file))
      } catch {
        parseErrors += 1
      }
    }

    const { trusted, excluded } = await aggregate.partitionBundles(parsed)
    const passRates = aggregate.computeModulePassRates(trusted)
    const missed = aggregate.computeMostMissedQuestions(trusted)
    const coverage = aggregate.computeWorkerCoverage(trusted)

    const passRateRows = passRates
      .map((r) => {
        const mod = getModule(r.moduleId)
        const label = mod ? pick(mod.title) : r.moduleId
        return `<div class="kv-row"><span class="k">${label}</span><span class="v">${t('adminPassRateFormat', { passes: r.passes, attempts: r.attempts, rate: r.rate })}</span></div>`
      })
      .join('') || `<p class="hint">—</p>`

    const missedRows = missed
      .map((m) => `<div class="kv-row"><span class="k">${t('adminMissedFormat', { count: m.count, question: pick(m.question) })}</span></div>`)
      .join('') || `<p class="hint">—</p>`

    const excludedCount = excluded.length + parseErrors
    const excludedNote = excludedCount > 0
      ? `<p class="hint" style="color:var(--bad);">${t('adminExcludedFilesNote', { n: excludedCount })}</p>`
      : ''

    aggregateRoot.innerHTML = `
      <div class="module-card">
        <h3 class="card-h3">${t('adminCoverageHeading')}</h3>
        <p>${t('adminCoverageFormat', { n: coverage.count })}</p>
      </div>
      <div class="module-card">
        <h3 class="card-h3">${t('adminPassRateHeading')}</h3>
        ${passRateRows}
      </div>
      <div class="module-card">
        <h3 class="card-h3">${t('adminMostMissedHeading')}</h3>
        ${missedRows}
      </div>
      ${excludedNote}
    `
  }
}

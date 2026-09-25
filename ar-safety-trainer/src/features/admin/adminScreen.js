import { t, pick } from '../../core/i18n/index.js'
import { state, getAllResults } from '../../core/state.js'
import { getModule } from '../../content/modules.js'
import * as ledger from '../../core/ledger.js'
import * as aggregate from './aggregate.js'
import { buildAuditReportText } from './auditReport.js'
import { saveTextFile } from '../../platform/files.js'
import { icon, MODULE_ICONS } from '../../shared/ui/icon.js'
import { escapeHtml } from '../../shared/ui/html.js'

// Module label + icon for result rows.
function moduleCell(moduleId) {
  const mod = getModule(moduleId)
  const label = mod ? pick(mod.shortTitle || mod.title) : escapeHtml(moduleId)
  return `${icon(MODULE_ICONS[mod?.domain] || 'box', { size: 18 })} ${label}`
}

// Compliance dashboard MVP — export/import, not live multi-device sync.
// There's no backend in this build (the team chose "fully offline" this
// round), so a real admin dashboard that shows every worker's live status
// across every kiosk device isn't honestly buildable yet. What IS honest
// and useful: a trainee device exports its own data as one file; an admin,
// on any device, imports that file and reviews it — including an actual
// integrity check against the same hash-chain verification used everywhere
// else in the app (core/ledger.js's verifyChain, not a re-implementation).
// The aggregate (MIS) section below extends this to *multiple* imported
// files at once, still with no backend and no live sync.

async function parseExportBundle(file) {
  const data = JSON.parse(await file.text())
  if (!Array.isArray(data.entries)) throw new Error('missing entries')
  return data
}

export function renderAdmin(main, navigate) {
  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>
    <div class="page-head">
      <span class="head-icon">${icon('chart-column', { size: 30 })}</span>
      <div><h2>${t('adminHeading')}</h2><p>${icon('wifi-off', { size: 14 })} ${t('adminSubheadingShort')}</p></div>
    </div>

    <!-- File inputs are wrapped in picture tiles; the input itself stays
         keyboard-focusable (sr-only), the tile shows the focus ring. -->
    <div class="tile-grid">
      <button class="tile is-saffron" id="export-btn">
        <span class="tile-icon">${icon('download', { size: 28 })}</span>
        <span class="tile-label">${t('adminExportBtn')}</span>
      </button>
      <label class="tile">
        <input type="file" id="import-input" accept="application/json" class="sr-only" />
        <span class="tile-icon">${icon('upload', { size: 28 })}</span>
        <span class="tile-label">${t('adminImportLabel')}</span>
      </label>
      <button class="tile is-wide" id="mesh-live-btn">
        <span class="tile-icon">${icon('bluetooth', { size: 26 })}</span>
        <span class="tile-label">${t('meshLiveTile')}</span>
      </button>
      <label class="tile is-green is-wide">
        <input type="file" id="aggregate-input" accept="application/json" multiple class="sr-only" />
        <span class="tile-icon">${icon('users', { size: 26 })}</span>
        <span class="tile-label">${t('adminAggregateImportLabel')}</span>
      </label>
    </div>

    <div id="review-root"></div>
    <div id="aggregate-root"></div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  main.querySelector('#mesh-live-btn').addEventListener('click', () => navigate('#/mesh'))
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
    const original = btn.innerHTML
    btn.disabled = true
    try {
      const ledgerExport = await ledger.exportAll()
      const bundle = {
        ...ledgerExport,
        worker: state.worker,
        results: getAllResults(),
      }
      const idPart = (state.worker.id || 'worker').replace(/[^a-zA-Z0-9-]/g, '_')
      await saveTextFile(JSON.stringify(bundle, null, 2), `ar-safety-trainer-export-${idPart}.json`, 'application/json')
    } finally {
      btn.disabled = false
      btn.innerHTML = original
    }
  }

  async function doImport(file) {
    const reviewRoot = main.querySelector('#review-root')
    reviewRoot.innerHTML = `<p class="hint">…</p>`
    let data
    try {
      data = await parseExportBundle(file)
    } catch {
      reviewRoot.innerHTML = `<div class="result-box result-tampered">${icon('circle-alert', { size: 22 })}<p>${t('adminImportError')}</p></div>`
      return
    }
    renderReview(reviewRoot, data)
  }

  async function renderReview(root, data) {
    const worker = data.worker || {}
    const results = data.results || {}
    const certs = data.entries.filter((e) => e.type === 'CERT_ISSUED')
    const grievances = data.entries.filter((e) => e.type === 'GRIEVANCE_SUBMITTED')

    const resultList = Object.entries(results)
    const passed = resultList.filter(([, r]) => r.passed).length

    const resultRows = resultList
      .map(([moduleId, r]) => {
        const status = r.passed
          ? icon('circle-check', { size: 20, cls: 'status-good', label: t('pass') })
          : icon('circle-x', { size: 20, cls: 'status-bad', label: t('fail') })
        return `<div class="kv-row"><span class="k">${moduleCell(moduleId)}</span><span class="v">${Number(r.score)}/${Number(r.total)} ${status}</span></div>`
      })
      .join('') || `<p class="hint">—</p>`

    const certRows = certs
      .map((c) => `<div class="kv-row"><span class="k">${moduleCell(c.payload?.moduleId)}</span><span class="v">${icon('award', { size: 16, cls: 'status-good' })} #${Number(c.seq)}</span></div>`)
      .join('') || `<p class="hint">—</p>`

    const grievanceRows = grievances
      .map((g) => `<div class="kv-row"><span class="k">${icon('message-square-warning', { size: 18 })} GRV-${Number(g.seq)}</span><span class="v">${escapeHtml(g.payload?.category)}</span></div>`)
      .join('') || `<p class="hint">${t('adminNoGrievances')}</p>`

    // Worker fields come from an imported file, so they are escaped.
    root.innerHTML = `
      <h3 class="section-title">${t('adminWorker')}</h3>
      <div class="module-card">
        <div class="profile-head" style="margin:0;">
          <span class="head-icon">${icon('user-round', { size: 28 })}</span>
          <div>
            <h3>${escapeHtml(worker.name || '—')}</h3>
            <p>${icon('id-card', { size: 14 })} ${escapeHtml(worker.id || '—')}${worker.uan ? ` · UAN ${escapeHtml(worker.uan)}` : ''}</p>
          </div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat is-good">${icon('circle-check', { size: 26 })}<div><strong>${passed}</strong><span>${t('statPassed')}</span></div></div>
        <div class="stat is-bad">${icon('circle-x', { size: 26 })}<div><strong>${resultList.length - passed}</strong><span>${t('statFailed')}</span></div></div>
        <div class="stat">${icon('award', { size: 26 })}<div><strong>${certs.length}</strong><span>${t('adminCertificates')}</span></div></div>
        <div class="stat is-saffron">${icon('message-square-warning', { size: 26 })}<div><strong>${grievances.length}</strong><span>${t('adminGrievancesHeading')}</span></div></div>
      </div>

      <div class="module-card">
        <h3>${icon('clipboard-check', { size: 20 })} ${t('adminModuleResults')}</h3>
        ${resultRows}
      </div>
      <div class="module-card">
        <h3>${icon('award', { size: 20 })} ${t('adminCertificates')}</h3>
        ${certRows}
      </div>
      <div class="module-card">
        <h3>${icon('message-square-warning', { size: 20 })} ${t('adminGrievancesHeading')}</h3>
        ${grievanceRows}
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="verify-ledger-btn">${icon('shield-check', { size: 20 })} ${t('adminVerifyBtn')}</button>
        <button class="btn" id="audit-report-btn">${icon('file-text', { size: 20 })} ${t('adminAuditReportBtn')}</button>
      </div>
      <div id="integrity-root" aria-live="polite"></div>
    `

    let lastVerifyResult = null

    root.querySelector('#verify-ledger-btn').addEventListener('click', async () => {
      const integrityRoot = root.querySelector('#integrity-root')
      integrityRoot.innerHTML = `<p class="hint">…</p>`
      lastVerifyResult = await ledger.verifyChain(data.entries, data.publicKeyJwk)
      integrityRoot.innerHTML = lastVerifyResult.valid
        ? `<div class="result-box result-valid">${icon('shield-check', { size: 26 })}<div><h4>${t('verifyResultValid')}</h4><p>${t('adminIntegrityValid', { n: lastVerifyResult.totalEntries })}</p></div></div>`
        : `<div class="result-box result-tampered">${icon('shield-alert', { size: 26 })}<div><h4>${t('verifyResultTampered')}</h4><p>${t('adminIntegrityBroken', { n: lastVerifyResult.brokenAtSeq })}</p></div></div>`
    })

    root.querySelector('#audit-report-btn').addEventListener('click', async () => {
      if (!lastVerifyResult) lastVerifyResult = await ledger.verifyChain(data.entries, data.publicKeyJwk)
      const reportText = await buildAuditReportText(data, lastVerifyResult)
      const idPart = (worker.id || 'worker').replace(/[^a-zA-Z0-9-]/g, '_')
      await saveTextFile(reportText, `audit-report-${idPart}.txt`, 'text/plain')
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
      .map((r) => `
        <div class="kv-row" style="display:block;">
          <div class="row-between"><span class="k">${moduleCell(r.moduleId)}</span><span class="v">${Number(r.rate)}%</span></div>
          <div class="bar" role="img" aria-label="${t('adminPassRateFormat', { passes: r.passes, attempts: r.attempts, rate: r.rate })}"><span style="width:${Number(r.rate)}%"></span></div>
          <div class="text-xs-dim mt-8">${r.passes}/${r.attempts}</div>
        </div>`)
      .join('') || `<p class="hint">—</p>`

    const missedRows = missed
      .map((m) => `<div class="kv-row"><span class="k">${icon('triangle-alert', { size: 18, cls: 'status-bad' })} ${pick(m.question)}</span><span class="v"><span class="badge badge-bad">${m.count}×</span></span></div>`)
      .join('') || `<p class="hint">—</p>`

    const avgRate = passRates.length
      ? Math.round(passRates.reduce((sum, r) => sum + Number(r.rate), 0) / passRates.length)
      : 0
    const excludedCount = excluded.length + parseErrors

    aggregateRoot.innerHTML = `
      <h3 class="section-title">${t('adminAggregateHeading')}</h3>
      <div class="stat-grid">
        <div class="stat">${icon('users', { size: 26 })}<div><strong>${coverage.count}</strong><span>${t('statWorkers')}</span></div></div>
        <div class="stat is-good">${icon('percent', { size: 26 })}<div><strong>${avgRate}%</strong><span>${t('statPassRate')}</span></div></div>
      </div>
      <div class="module-card">
        <h3>${icon('chart-column', { size: 20 })} ${t('adminPassRateHeading')}</h3>
        ${passRateRows}
      </div>
      <div class="module-card">
        <h3>${icon('triangle-alert', { size: 20 })} ${t('adminMostMissedHeading')}</h3>
        ${missedRows}
      </div>
      ${excludedCount > 0 ? `<div class="result-box result-tampered">${icon('shield-alert', { size: 22 })}<p>${t('adminExcludedFilesNote', { n: excludedCount })}</p></div>` : ''}
    `
  }
}

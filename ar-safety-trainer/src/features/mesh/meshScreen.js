// "Offline Network" screen. Worker phone: how many phones are nearby, how
// far the admin is, how many records are waiting / delivered. Admin phone:
// every worker whose records arrived over the mesh, the path they took, and
// whether they are genuine (signature check from core/ledger.js).

import { t, pick } from '../../core/i18n/index.js'
import { getModule } from '../../content/modules.js'
import * as ledger from '../../core/ledger.js'
import { escapeHtml } from '../../shared/ui/html.js'
import { icon, MODULE_ICONS } from '../../shared/ui/icon.js'
import { getMeshStatus, onMeshStatus, setMeshEnabled } from './meshService.js'

// Integrity results, cached per worker + entry count, so the check isn't
// redone on every 3-second refresh.
const integrityCache = new Map()

async function checkWorker(origin, rec) {
  const entries = Object.values(rec.entries).sort((a, b) => a.seq - b.seq)
  const cacheKey = `${origin}:${entries.length}`
  if (integrityCache.has(cacheKey)) return integrityCache.get(cacheKey)
  let result
  try {
    // Every entry must carry the worker phone's own valid signature...
    let allSigned = true
    for (const e of entries) {
      const hashOk = (await ledger.hashEntry(e)) === e.hash
      const sigOk = hashOk && (await ledger.verifySignature(e.hash, e.signature, rec.publicKeyJwk))
      if (!sigOk) allSigned = false
    }
    // ...and once every entry from #0 has arrived, the whole chain is checked too.
    const complete = entries.length > 0 && entries.every((e, i) => e.seq === i)
    if (!allSigned) result = 'tampered'
    else if (!complete) result = 'partial'
    else result = (await ledger.verifyChain(entries, rec.publicKeyJwk)).valid ? 'valid' : 'tampered'
  } catch {
    result = 'tampered'
  }
  integrityCache.set(cacheKey, result)
  return result
}

const INTEGRITY = {
  valid: { cls: 'badge-active', icon: 'shield-check', key: 'verifyResultValid' },
  tampered: { cls: 'badge-bad', icon: 'shield-alert', key: 'verifyResultTampered' },
  partial: { cls: 'badge-warn', icon: 'hourglass', key: 'meshReceiving' },
}

function pathChips(path) {
  return path
    .map((name, i) => `<span class="badge ${i === path.length - 1 ? 'badge-active' : 'badge-info'}">${icon(i === 0 ? 'smartphone' : i === path.length - 1 ? 'radio' : 'bluetooth', { size: 12 })} ${escapeHtml(name)}</span>`)
    .join(icon('arrow-right', { size: 14, cls: 'status-dim' }))
}

function workerCard(origin, rec, integrity) {
  const entries = Object.values(rec.entries)
  const latestQuiz = {}
  for (const e of entries.sort((a, b) => a.seq - b.seq)) {
    if (e.type === 'QUIZ_COMPLETED') latestQuiz[e.payload.moduleId] = e.payload
  }
  const certs = entries.filter((e) => e.type === 'CERT_ISSUED').length
  const look = INTEGRITY[integrity] || INTEGRITY.partial
  const quizRows = Object.entries(latestQuiz)
    .map(([moduleId, q]) => {
      const mod = getModule(moduleId)
      return `<div class="kv-row"><span class="k">${icon(MODULE_ICONS[mod?.domain] || 'box', { size: 18 })} ${mod ? pick(mod.shortTitle || mod.title) : escapeHtml(moduleId)}</span>
        <span class="v">${Number(q.score)}/${Number(q.total)} ${icon(q.passed ? 'circle-check' : 'circle-x', { size: 20, cls: q.passed ? 'status-good' : 'status-bad', label: q.passed ? t('pass') : t('fail') })}</span></div>`
    })
    .join('')
  return `
    <div class="module-card">
      <div class="row-between">
        <h3>${icon('user-round', { size: 20 })} ${escapeHtml(rec.worker?.name || '—')}</h3>
        <span class="badge ${look.cls}">${icon(look.icon, { size: 14 })} ${t(look.key)}</span>
      </div>
      <p>${icon('id-card', { size: 14 })} ${escapeHtml(rec.worker?.workId || '—')} · ${icon('clock', { size: 14 })} ${new Date(rec.lastSeen).toLocaleTimeString()}</p>
      <div class="row" style="flex-wrap:wrap;gap:4px;">${pathChips(rec.path || [])}</div>
      ${quizRows}
      ${certs ? `<span class="badge badge-active">${icon('award', { size: 14 })} ${certs} ${t('adminCertificates')}</span>` : ''}
    </div>`
}

export function renderMesh(main, navigate) {
  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>
    <div class="page-head">
      <span class="head-icon">${icon('bluetooth', { size: 30 })}</span>
      <div><h2>${t('meshTitle')}</h2><p>${icon('wifi-off', { size: 14 })} ${t('meshSubtitle')}</p></div>
    </div>
    <div id="mesh-live" aria-live="polite"></div>
  `
  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  const live = main.querySelector('#mesh-live')

  let unsubscribe = () => {}
  let drawing = false

  async function draw(s) {
    // The router detaches this screen when the user leaves it.
    if (!live.isConnected) {
      unsubscribe()
      return
    }
    if (drawing) return
    drawing = true
    try {
      live.innerHTML = await markup(s)
      live.querySelector('#mesh-toggle')?.addEventListener('click', async (e) => {
        e.currentTarget.disabled = true
        await setMeshEnabled(!s.running)
      })
    } finally {
      drawing = false
    }
  }

  async function markup(s) {
    if (!s.supported) {
      return `
        <div class="big-status is-warn">
          <span class="big-icon">${icon('smartphone', { size: 48 })}</span>
          <strong>${t('meshWebOnlyTitle')}</strong>
          <p>${t('meshWebOnlyBody')}</p>
        </div>`
    }
    const isAdmin = s.role === 'admin'
    const toggle = s.running
      ? `<button class="btn btn-danger-outline btn-block" id="mesh-toggle">${icon('bluetooth-off', { size: 22 })} ${t('meshTurnOff')}</button>`
      : `<button class="btn btn-primary btn-block" id="mesh-toggle">${icon('bluetooth', { size: 22 })} ${t('meshTurnOn')}</button>`
    if (!s.running) {
      return `
        ${s.error ? `<div class="result-box result-tampered">${icon('circle-alert', { size: 22 })}<p>${escapeHtml(s.error)}</p></div>` : ''}
        <div class="big-status is-warn"><span class="big-icon">${icon('bluetooth-off', { size: 48 })}</span><strong>${t('meshOff')}</strong></div>
        ${toggle}`
    }

    const hops = s.hopsToAdmin
    const neighbours = (s.neighbours || [])
      .map((n) => {
        const label = n.hops === 0 ? t('meshAdmin') : Number.isFinite(n.hops) ? t('meshHopsN', { n: n.hops }) : t('meshNoRoute')
        return `<div class="kv-row"><span class="k">${icon('bluetooth-connected', { size: 18 })} ${escapeHtml(n.name || '—')}</span><span class="v"><span class="badge ${n.hops === 0 ? 'badge-active' : Number.isFinite(n.hops) ? 'badge-info' : 'badge-locked'}">${label}</span></span></div>`
      })
      .join('') || `<p class="hint" style="text-align:left;">${icon('info', { size: 14 })} ${t('meshNoPeers')}</p>`

    const stats = isAdmin
      ? `
        <div class="stat">${icon('users', { size: 26 })}<div><strong>${s.neighbours.length}</strong><span>${t('meshNearby')}</span></div></div>
        <div class="stat is-good">${icon('download', { size: 26 })}<div><strong>${Object.keys(s.inbox || {}).length}</strong><span>${t('meshReceived')}</span></div></div>`
      : `
        <div class="stat">${icon('users', { size: 26 })}<div><strong>${s.neighbours.length}</strong><span>${t('meshNearby')}</span></div></div>
        <div class="stat ${Number.isFinite(hops) ? 'is-good' : 'is-bad'}">${icon('route', { size: 26 })}<div><strong>${Number.isFinite(hops) ? hops : '—'}</strong><span>${t('meshHops')}</span></div></div>
        <div class="stat is-saffron">${icon('upload', { size: 26 })}<div><strong>${s.waiting}</strong><span>${t('meshWaiting')}</span></div></div>
        <div class="stat is-good">${icon('circle-check', { size: 26 })}<div><strong>${s.delivered}</strong><span>${t('meshDelivered')}</span></div></div>
        ${s.relaying ? `<div class="stat">${icon('share-2', { size: 26 })}<div><strong>${s.relaying}</strong><span>${t('meshRelaying')}</span></div></div>` : ''}`

    let inbox = ''
    if (isAdmin) {
      const origins = Object.entries(s.inbox || {}).sort((a, b) => b[1].lastSeen - a[1].lastSeen)
      const cards = []
      for (const [origin, rec] of origins) cards.push(workerCard(origin, rec, await checkWorker(origin, rec)))
      inbox = `
        <h3 class="section-title">${t('meshInboxTitle')}</h3>
        ${cards.join('') || `<p class="hint">${t('meshInboxEmpty')}</p>`}`
    }

    return `
      <div class="row-between mt-8" style="margin-bottom:12px;">
        <span class="badge ${isAdmin ? 'badge-active' : 'badge-info'}">${icon(isAdmin ? 'radio' : 'smartphone', { size: 14 })} ${isAdmin ? t('meshRoleAdmin') : t('meshRoleNode')}</span>
        <span class="offline-pill">${icon('bluetooth', { size: 14 })} ON</span>
      </div>
      <div class="stat-grid">${stats}</div>
      <h3 class="section-title">${t('meshNearby')}</h3>
      <div class="module-card">${neighbours}</div>
      ${inbox}
      ${toggle}`
  }

  unsubscribe = onMeshStatus(draw)
  draw(getMeshStatus())
}

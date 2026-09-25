// Home: picture-first. A 4-step journey (Register → AR Training → Test →
// Certificate) with one big "next step" button, then the training modules
// as an icon tile grid. Words are kept to one or two per tile; the
// details live inside each module (and are read aloud there).

import { modules, PPE_GATE_MODULE_ID, EMERGENCY_RESPONSE_MODULE_ID } from '../../content/modules.js'
import { t, pick } from '../../core/i18n/index.js'
import { getAllResults, getResult } from '../../core/state.js'
import { isLoggedIn, hasRole } from '../../core/session.js'
import { ACCOUNTS_ENABLED } from '../../config.js'
import { icon, MODULE_ICONS } from '../../shared/ui/icon.js'

export function renderHome(main, navigate) {
  const results = Object.entries(getAllResults())
  const registered = !ACCOUNTS_ENABLED || isLoggedIn()
  const trained = results.length > 0
  const passedEntry = results.find(([, r]) => r.passed)
  const tested = !!passedEntry

  // Journey steps: done / current / upcoming.
  const steps = [
    { key: 'journeyRegister', icon: 'smartphone', done: registered },
    { key: 'journeyTrain', icon: 'box', done: trained },
    { key: 'journeyTest', icon: 'clipboard-check', done: tested },
    { key: 'journeyCertificate', icon: 'award', done: false },
  ]
  const currentIndex = steps.findIndex((s) => !s.done)

  // The one big button: whatever the worker should do next.
  const next = tested
    ? { label: t('getCertificate'), icon: 'award', go: `#/module/${passedEntry[0]}/certificate`, cls: 'btn-good' }
    : trained
      ? { label: t('takeQuiz'), icon: 'clipboard-check', go: `#/module/${results[0][0]}/quiz`, cls: 'btn-primary' }
      : { label: t('startTraining'), icon: 'circle-play', go: `#/module/${PPE_GATE_MODULE_ID}`, cls: 'btn-primary' }

  main.innerHTML = `
    <ol class="stepper" aria-label="${t('journeyLabel')}">
      ${steps.map((s, i) => `
        <li class="${s.done ? 'is-done' : i === currentIndex ? 'is-current' : ''}" ${i === currentIndex ? 'aria-current="step"' : ''}>
          <span class="step-dot">
            ${icon(s.icon, { size: 22 })}
            ${s.done ? `<span class="step-tick">${icon('check', { size: 12, stroke: 3 })}</span>` : ''}
          </span>
          ${t(s.key)}
        </li>`).join('')}
    </ol>

    <button class="btn ${next.cls} btn-block" id="next-btn">${icon(next.icon, { size: 24 })} ${next.label}</button>

    <h2 class="section-title">${t('modules')}</h2>
    <div class="tile-grid" id="module-list"></div>

    <h2 class="section-title">${t('moreServices')}</h2>
    <div class="tile-grid" id="more-list"></div>

    <footer class="gov-footer">
      <div class="tricolour-dots" aria-hidden="true">
        <span style="background:var(--saffron)"></span><span style="background:#d5dbe5"></span><span style="background:var(--india-green)"></span>
      </div>
      <div>${t('govName')} · SIH26041</div>
      <div class="offline-pill mt-8">${icon('wifi-off', { size: 14 })} ${t('offlineShort')}</div>
    </footer>
  `

  main.querySelector('#next-btn').addEventListener('click', () => navigate(next.go))

  const list = main.querySelector('#module-list')
  modules.forEach((m) => {
    const locked = m.status === 'locked'
    const result = getResult(m.id)
    const isEmergency = m.id === EMERGENCY_RESPONSE_MODULE_ID
    const status = locked
      ? icon('lock', { size: 18, cls: 'status-dim', label: t('comingSoon') })
      : result
        ? result.passed
          ? icon('circle-check', { size: 22, cls: 'status-good', label: t('pass') })
          : icon('circle-x', { size: 22, cls: 'status-bad', label: t('fail') })
        : ''

    const tile = document.createElement('button')
    tile.className = `tile ${locked ? 'is-locked' : ''} ${isEmergency ? 'is-red' : ''}`
    tile.disabled = locked
    tile.setAttribute('aria-label', `${pick(m.title)}${locked ? ` — ${t('comingSoon')}` : ''}`)
    tile.innerHTML = `
      <span class="tile-status">${status}</span>
      <span class="tile-icon">${icon(MODULE_ICONS[m.domain] || 'box', { size: 32 })}</span>
      <span class="tile-label">${pick(m.shortTitle || m.title)}</span>
    `
    if (!locked) tile.addEventListener('click', () => navigate(`#/module/${m.id}`))
    list.appendChild(tile)
  })

  const more = main.querySelector('#more-list')
  const extra = [
    { label: t('verify'), icon: 'scan-qr-code', go: '#/verify', cls: 'is-green' },
    { label: t('grievanceNavLink'), icon: 'message-square-warning', go: '#/grievance', cls: 'is-saffron' },
  ]
  if (hasRole('supervisor', 'admin')) extra.push({ label: t('complianceDashboardBtn'), icon: 'chart-column', go: '#/admin', cls: 'is-wide' })
  extra.forEach((x) => {
    const tile = document.createElement('button')
    tile.className = `tile ${x.cls}`
    tile.innerHTML = `<span class="tile-icon">${icon(x.icon, { size: 28 })}</span><span class="tile-label">${x.label}</span>`
    tile.addEventListener('click', () => navigate(x.go))
    more.appendChild(tile)
  })
}

import { modules } from '../../content/modules.js'
import { t, pick } from '../../core/i18n/index.js'
import { getResult } from '../../core/state.js'

export function renderHome(main, navigate) {
  main.innerHTML = `
    <h2 class="h2-title" style="margin:4px 0 4px;">${t('modules')}</h2>
    <p class="subtitle-dim" style="margin:0 0 18px;">${t('hotspotsHint')}</p>
    <div id="module-list"></div>
  `

  const list = main.querySelector('#module-list')

  modules.forEach((m) => {
    const result = getResult(m.id)
    const card = document.createElement('div')
    card.className = `module-card ${m.status === 'locked' ? 'locked' : ''}`
    card.innerHTML = `
      <span class="badge ${m.status === 'locked' ? 'badge-locked' : 'badge-active'}">
        ${m.status === 'locked' ? t('comingSoon') : (result ? (result.passed ? t('pass') : t('fail')) : t('startTraining'))}
      </span>
      <h3>${pick(m.title)}</h3>
      <p>${pick(m.summary)}</p>
    `
    if (m.status !== 'locked') {
      card.style.cursor = 'pointer'
      card.addEventListener('click', () => navigate(`#/module/${m.id}`))
    }
    list.appendChild(card)
  })

  const grievanceLink = document.createElement('button')
  grievanceLink.className = 'btn btn-block'
  grievanceLink.style.marginTop = '8px'
  grievanceLink.textContent = t('grievanceNavLink')
  grievanceLink.addEventListener('click', () => navigate('#/grievance'))
  main.appendChild(grievanceLink)
}

// Admin only: review accounts. Supervisor/Admin sign-ups wait here as
// "pending" until approved; any account can be disabled or re-enabled.

import { t } from '../../core/i18n/index.js'
import { getCurrentUser } from '../../core/session.js'
import { escapeHtml } from '../../shared/ui/html.js'
import { listUsers, setUserStatus } from './accountApi.js'
import { apiErrorText } from './formFields.js'

const FILTERS = ['pending', 'active', 'disabled', 'rejected', '']

// Which buttons each account status offers: [targetStatus, labelKey].
const ACTIONS = {
  pending: [['active', 'approveBtn'], ['rejected', 'rejectBtn']],
  active: [['disabled', 'disableBtn']],
  disabled: [['active', 'enableBtn']],
  rejected: [['active', 'approveBtn']],
}

export function renderUsers(main, navigate) {
  let filter = 'pending'

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToProfile')}</button>
    <h2 class="h2-title" style="margin:12px 0 12px;">${t('usersTitle')}</h2>
    <div class="user-filters" role="tablist">
      ${FILTERS.map((f) => `
        <button class="btn" role="tab" data-filter="${f}">${t(f ? `status_${f}` : 'usersFilterAll')}</button>
      `).join('')}
    </div>
    <p class="form-alert" id="users-alert" role="alert"></p>
    <div id="user-list" aria-live="polite"></div>
  `

  const listEl = main.querySelector('#user-list')
  const alertBox = main.querySelector('#users-alert')

  main.querySelector('#back').addEventListener('click', () => navigate('#/profile'))
  main.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter
      load()
    })
  })

  async function load() {
    main.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.dataset.filter === filter))
    })
    alertBox.textContent = ''
    listEl.innerHTML = `<p class="hint">${t('pleaseWait')}</p>`
    try {
      renderList(await listUsers(filter))
    } catch (err) {
      listEl.innerHTML = ''
      alertBox.textContent = apiErrorText(err)
    }
  }

  function renderList(users) {
    if (users.length === 0) {
      listEl.innerHTML = `<p class="hint">${t('usersEmpty')}</p>`
      return
    }
    const me = getCurrentUser()
    listEl.innerHTML = users.map((u) => `
      <div class="module-card user-card">
        <span class="badge ${u.status === 'active' ? 'badge-active' : u.status === 'pending' ? 'badge-warn' : 'badge-locked'}">
          ${t(`status_${u.status}`)}
        </span>
        <h3>${escapeHtml(u.fullName)} ${u.id === me.id ? `<small>${t('youLabel')}</small>` : ''}</h3>
        <p>${t(`role_${u.role}`)} · ${escapeHtml(u.workId)}</p>
        <p>${escapeHtml(u.organisation)}, ${escapeHtml(u.district)} · ${escapeHtml(u.phone)}</p>
        ${u.id === me.id ? '' : `
          <div class="user-actions">
            ${(ACTIONS[u.status] || []).map(([status, label]) => `
              <button class="btn ${status === 'active' ? 'btn-primary' : ''}" data-user="${u.id}" data-status="${status}">${t(label)}</button>
            `).join('')}
          </div>
        `}
      </div>
    `).join('')

    listEl.querySelectorAll('[data-user]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true
        try {
          await setUserStatus(Number(btn.dataset.user), btn.dataset.status)
          await load()
        } catch (err) {
          btn.disabled = false
          alertBox.textContent = apiErrorText(err)
        }
      })
    })
  }

  load()
}

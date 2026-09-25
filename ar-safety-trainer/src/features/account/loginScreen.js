// Login: work ID or mobile number + password.

import { t } from '../../core/i18n/index.js'
import { takeReturnPath } from '../../core/session.js'
import { EMERGENCY_RESPONSE_MODULE_ID } from '../../content/modules.js'
import { login } from './accountApi.js'
import { inputField, readForm, showFieldErrors, apiErrorText, whileBusy } from './formFields.js'
import { icon } from '../../shared/ui/icon.js'
import { DEMO_LOGINS_ENABLED, DEMO_LOGINS } from '../../config.js'

const ROLE_ICONS = { worker: 'hard-hat', supervisor: 'users', admin: 'user-cog' }

export function renderLogin(main, navigate) {
  main.innerHTML = `
    <div class="account-card mt-8">
      <div class="page-head" style="margin-top:0;">
        <span class="head-icon">${icon('log-in', { size: 28 })}</span>
        <div><h2>${t('loginTitle')}</h2><p>${t('loginSubtitle')}</p></div>
      </div>

      ${DEMO_LOGINS_ENABLED ? `
        <p class="field-hint" style="margin:0 0 8px;font-weight:700;">${icon('key-round', { size: 14 })} ${t('demoLoginLabel')}</p>
        <div class="role-grid" style="margin-bottom:16px;">
          ${DEMO_LOGINS.map((d, i) => `
            <button type="button" class="tile" data-demo="${i}" style="min-height:92px;padding:10px 4px;gap:6px;">
              <span class="tile-icon" style="width:44px;height:44px;">${icon(ROLE_ICONS[d.role], { size: 22 })}</span>
              <span class="tile-label" style="font-size:0.8125rem;">${t(`role_${d.role}`).split(' / ')[0]}</span>
            </button>`).join('')}
        </div>` : ''}

      <form id="login-form" novalidate>
        <p class="form-alert" id="form-alert" role="alert"></p>
        ${inputField({ name: 'identifier', label: t('loginIdentifierLabel'), iconName: 'id-card', placeholder: 'JH-MINE-00214', attrs: 'autocomplete="username" autocapitalize="characters"' })}
        ${inputField({ name: 'password', label: t('passwordLabel'), type: 'password', iconName: 'key-round', attrs: 'autocomplete="current-password"' })}
        <label class="field-check" style="margin:-4px 0 16px;">
          <input type="checkbox" id="show-password" /> <span>${icon('eye', { size: 18 })} ${t('showPassword')}</span>
        </label>
        <button class="btn btn-primary btn-block" type="submit" id="login-btn">${icon('log-in', { size: 22 })} ${t('loginBtn')}</button>
      </form>

      <button class="btn btn-block mt-12" id="to-register">${icon('user-plus', { size: 22 })} ${t('registerLink')}</button>
    </div>

    <button class="account-emergency" id="to-emergency">
      ${icon('siren', { size: 30 })}
      <span>${t('loginEmergencyNote')}</span>
    </button>
  `

  const form = main.querySelector('#login-form')
  const alertBox = main.querySelector('#form-alert')

  main.querySelector('#show-password').addEventListener('change', (e) => {
    form.elements.password.type = e.target.checked ? 'text' : 'password'
  })
  // Demo tiles: fill the form, then log straight in.
  main.querySelectorAll('[data-demo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const demo = DEMO_LOGINS[Number(btn.dataset.demo)]
      form.elements.identifier.value = demo.workId
      form.elements.password.value = demo.password
      form.requestSubmit()
    })
  })
  main.querySelector('#to-register').addEventListener('click', () => navigate('#/register'))
  main.querySelector('#to-emergency').addEventListener('click', () => navigate(`#/module/${EMERGENCY_RESPONSE_MODULE_ID}`))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    alertBox.textContent = ''
    const { identifier, password } = readForm(form)

    const missing = {}
    if (!identifier.trim()) missing.identifier = 'required'
    if (!password) missing.password = 'required'
    showFieldErrors(form, missing)
    if (Object.keys(missing).length) return

    try {
      await whileBusy(main.querySelector('#login-btn'), t('pleaseWait'), () => login(identifier, password))
      navigate(takeReturnPath())
    } catch (err) {
      if (err.code === 'validation') showFieldErrors(form, err.fields)
      else alertBox.textContent = apiErrorText(err)
    }
  })
}

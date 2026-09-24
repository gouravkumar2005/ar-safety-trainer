// Login: work ID or mobile number + password.

import { t } from '../../core/i18n/index.js'
import { takeReturnPath } from '../../core/session.js'
import { EMERGENCY_RESPONSE_MODULE_ID } from '../../content/modules.js'
import { login } from './accountApi.js'
import { inputField, readForm, showFieldErrors, apiErrorText, whileBusy } from './formFields.js'

export function renderLogin(main, navigate) {
  main.innerHTML = `
    <div class="account-card">
      <h2 class="h2-title" style="margin:0 0 4px;">${t('loginTitle')}</h2>
      <p class="subtitle-dim" style="margin:0 0 18px;">${t('loginSubtitle')}</p>

      <form id="login-form" novalidate>
        <p class="form-alert" id="form-alert" role="alert"></p>
        ${inputField({ name: 'identifier', label: t('loginIdentifierLabel'), attrs: 'autocomplete="username" autocapitalize="characters"' })}
        ${inputField({ name: 'password', label: t('passwordLabel'), type: 'password', attrs: 'autocomplete="current-password"' })}
        <label class="field-check" style="margin:-4px 0 16px;">
          <input type="checkbox" id="show-password" /> <span>${t('showPassword')}</span>
        </label>
        <button class="btn btn-primary btn-block" type="submit" id="login-btn">${t('loginBtn')}</button>
      </form>

      <p class="account-switch">${t('loginNoAccount')}
        <button class="btn btn-ghost" id="to-register">${t('registerLink')}</button>
      </p>
    </div>

    <button class="note account-emergency" id="to-emergency">${t('loginEmergencyNote')}</button>
  `

  const form = main.querySelector('#login-form')
  const alertBox = main.querySelector('#form-alert')

  main.querySelector('#show-password').addEventListener('change', (e) => {
    form.elements.password.type = e.target.checked ? 'text' : 'password'
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

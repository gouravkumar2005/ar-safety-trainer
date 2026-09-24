// Registration: role, identity (name, work ID, mobile), workplace
// (employer, district, designation), optional e-Shram UAN, language,
// password, and consent. The server re-validates everything; the checks
// here are only for quick feedback.

import { t, getLang } from '../../core/i18n/index.js'
import { takeReturnPath } from '../../core/session.js'
import { getRegistrationOptions, register } from './accountApi.js'
import {
  inputField, selectField, checkboxField, readForm, showFieldErrors, apiErrorText, whileBusy, LANGUAGE_OPTIONS,
} from './formFields.js'

export function renderRegister(main, navigate) {
  main.innerHTML = `<p class="hint">${t('pleaseWait')}</p>`

  getRegistrationOptions()
    .then((options) => renderForm(main, navigate, options))
    .catch((err) => {
      main.innerHTML = `
        <p class="form-alert" role="alert">${apiErrorText(err)}</p>
        <button class="btn btn-block" id="retry">${t('retryBtn')}</button>
      `
      main.querySelector('#retry').addEventListener('click', () => renderRegister(main, navigate))
    })
}

function roleChoices(roles) {
  return `
    <fieldset class="field role-choices">
      <legend>${t('roleLabel')}</legend>
      ${roles.map((role, i) => `
        <label class="role-choice">
          <input type="radio" name="role" value="${role}" ${i === 0 ? 'checked' : ''} />
          <span>
            <strong>${t(`role_${role}`)}</strong>
            <small>${t(`role_${role}_desc`)}</small>
          </span>
        </label>
      `).join('')}
      <p class="field-error" id="acc-role-error" role="alert"></p>
    </fieldset>
  `
}

function renderForm(main, navigate, { roles, districts }) {
  main.innerHTML = `
    <div class="account-card">
      <h2 class="h2-title" style="margin:0 0 4px;">${t('registerTitle')}</h2>
      <p class="subtitle-dim" style="margin:0 0 18px;">${t('registerSubtitle')}</p>

      <form id="register-form" novalidate>
        <p class="form-alert" id="form-alert" role="alert"></p>

        ${roleChoices(roles)}
        <p class="note" id="approval-note" hidden>${t('roleApprovalNote')}</p>

        <h3 class="account-section">${t('sectionIdentity')}</h3>
        ${inputField({ name: 'fullName', label: t('fullNameLabel'), attrs: 'autocomplete="name"' })}
        ${inputField({ name: 'workId', label: t('workIdLabel'), hint: t('workIdHint'), attrs: 'autocapitalize="characters"' })}
        ${inputField({ name: 'phone', label: t('phoneLabel'), type: 'tel', hint: t('phoneHint'), attrs: 'autocomplete="tel" inputmode="numeric"' })}

        <h3 class="account-section">${t('sectionWorkplace')}</h3>
        ${inputField({ name: 'organisation', label: t('organisationLabel'), hint: t('organisationHint') })}
        ${selectField({
          name: 'district',
          label: t('districtLabel'),
          placeholder: t('districtPlaceholder'),
          options: districts.map((d) => ({ value: d, label: d })),
        })}
        ${inputField({ name: 'designation', label: t('designationLabel') })}
        ${inputField({ name: 'uan', label: t('workerUan'), hint: t('uanFieldHint'), attrs: 'inputmode="numeric"' })}
        ${selectField({ name: 'preferredLang', label: t('preferredLangLabel'), options: LANGUAGE_OPTIONS, value: getLang() })}

        <h3 class="account-section">${t('sectionPassword')}</h3>
        ${inputField({ name: 'password', label: t('passwordLabel'), type: 'password', hint: t('passwordHint'), attrs: 'autocomplete="new-password"' })}
        ${inputField({ name: 'confirmPassword', label: t('confirmPasswordLabel'), type: 'password', attrs: 'autocomplete="new-password"' })}

        ${checkboxField({ name: 'consent', label: t('consentLabel') })}

        <button class="btn btn-primary btn-block" type="submit" id="register-btn">${t('registerBtn')}</button>
      </form>

      <p class="account-switch">${t('haveAccount')}
        <button class="btn btn-ghost" id="to-login">${t('loginLink')}</button>
      </p>
    </div>
  `

  const form = main.querySelector('#register-form')
  const alertBox = main.querySelector('#form-alert')

  // Explain up front that elevated roles need approval.
  const approvalNote = main.querySelector('#approval-note')
  form.addEventListener('change', (e) => {
    if (e.target.name === 'role') approvalNote.hidden = e.target.value === 'worker'
  })
  main.querySelector('#to-login').addEventListener('click', () => navigate('#/login'))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    alertBox.textContent = ''
    const { confirmPassword, ...details } = readForm(form)

    // Client-only check: the server never sees the confirmation field.
    const localErrors = {}
    if (confirmPassword !== details.password) localErrors.confirmPassword = 'mismatch'
    if (!details.consent) localErrors.consent = 'required'
    showFieldErrors(form, localErrors)
    if (Object.keys(localErrors).length) return

    try {
      const result = await whileBusy(main.querySelector('#register-btn'), t('pleaseWait'), () => register(details))
      if (result.pendingApproval) renderPending(main, navigate, details.role)
      else navigate(takeReturnPath())
    } catch (err) {
      if (err.code === 'validation') showFieldErrors(form, err.fields)
      else alertBox.textContent = apiErrorText(err)
    }
  })
}

function renderPending(main, navigate, role) {
  main.innerHTML = `
    <div class="result-box result-warn" style="margin-top:8px;">
      <h4>${t('registerPendingTitle')}</h4>
      <p>${t('registerPendingBody', { role: t(`role_${role}`) })}</p>
    </div>
    <button class="btn btn-block" style="margin-top:16px;" id="to-login">${t('backToLogin')}</button>
  `
  main.querySelector('#to-login').addEventListener('click', () => navigate('#/login'))
}

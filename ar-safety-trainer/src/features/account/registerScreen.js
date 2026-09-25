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
import { icon } from '../../shared/ui/icon.js'

// One picture per role on the role picker.
const ROLE_ICONS = { worker: 'hard-hat', supervisor: 'users', admin: 'user-cog' }

export function renderRegister(main, navigate) {
  main.innerHTML = `<p class="hint">${t('pleaseWait')}</p>`

  getRegistrationOptions()
    .then((options) => renderForm(main, navigate, options))
    .catch((err) => {
      main.innerHTML = `
        <div class="big-status is-warn">
          <span class="big-icon">${icon('wifi-off', { size: 48 })}</span>
          <p role="alert">${apiErrorText(err)}</p>
        </div>
        <button class="btn btn-primary btn-block" id="retry">${icon('rotate-ccw', { size: 22 })} ${t('retryBtn')}</button>
      `
      main.querySelector('#retry').addEventListener('click', () => renderRegister(main, navigate))
    })
}

function roleChoices(roles) {
  return `
    <fieldset class="field role-choices">
      <legend>${t('roleLabel')}</legend>
      <div class="role-grid">
      ${roles.map((role, i) => `
        <label class="role-choice" title="${t(`role_${role}_desc`)}">
          <input type="radio" name="role" value="${role}" ${i === 0 ? 'checked' : ''} aria-describedby="role-desc-${role}" />
          <span class="role-icon">${icon(ROLE_ICONS[role] || 'user-round', { size: 26 })}</span>
          <strong>${t(`role_${role}`)}</strong>
          <span class="sr-only" id="role-desc-${role}">${t(`role_${role}_desc`)}</span>
        </label>
      `).join('')}
      </div>
      <p class="field-error" id="acc-role-error" role="alert"></p>
    </fieldset>
  `
}

function renderForm(main, navigate, { roles, districts }) {
  main.innerHTML = `
    <div class="account-card mt-8">
      <div class="page-head" style="margin-top:0;">
        <span class="head-icon">${icon('user-plus', { size: 28 })}</span>
        <div><h2>${t('registerTitle')}</h2><p>${t('registerSubtitle')}</p></div>
      </div>

      <form id="register-form" novalidate>
        <p class="form-alert" id="form-alert" role="alert"></p>

        ${roleChoices(roles)}
        <p class="note" id="approval-note" hidden>${icon('hourglass', { size: 16 })} ${t('roleApprovalNote')}</p>

        <h3 class="account-section">${icon('user-round', { size: 20 })} ${t('sectionIdentity')}</h3>
        ${inputField({ name: 'fullName', label: t('fullNameLabel'), iconName: 'user-round', attrs: 'autocomplete="name"' })}
        ${inputField({ name: 'workId', label: t('workIdLabel'), iconName: 'id-card', placeholder: 'JH-MINE-00214', attrs: 'autocapitalize="characters"' })}
        ${inputField({ name: 'phone', label: t('phoneLabel'), type: 'tel', iconName: 'phone', placeholder: '98XXXXXXXX', attrs: 'autocomplete="tel" inputmode="numeric"' })}

        <h3 class="account-section">${icon('factory', { size: 20 })} ${t('sectionWorkplace')}</h3>
        ${inputField({ name: 'organisation', label: t('organisationLabel'), iconName: 'factory', placeholder: 'CCL Piparwar' })}
        ${selectField({
          name: 'district',
          label: t('districtLabel'),
          placeholder: t('districtPlaceholder'),
          iconName: 'map-pin',
          options: districts.map((d) => ({ value: d, label: d })),
        })}
        ${inputField({ name: 'designation', label: t('designationLabel'), iconName: 'hard-hat' })}
        ${inputField({ name: 'uan', label: t('workerUan'), iconName: 'badge-check', placeholder: '12 digits', attrs: 'inputmode="numeric"' })}
        ${selectField({ name: 'preferredLang', label: t('preferredLangLabel'), iconName: 'languages', options: LANGUAGE_OPTIONS, value: getLang() })}

        <h3 class="account-section">${icon('key-round', { size: 20 })} ${t('sectionPassword')}</h3>
        ${inputField({ name: 'password', label: t('passwordLabel'), type: 'password', iconName: 'key-round', hint: t('passwordHint'), attrs: 'autocomplete="new-password"' })}
        ${inputField({ name: 'confirmPassword', label: t('confirmPasswordLabel'), type: 'password', iconName: 'key-round', attrs: 'autocomplete="new-password"' })}

        ${checkboxField({ name: 'consent', label: t('consentLabel') })}

        <button class="btn btn-primary btn-block" type="submit" id="register-btn">${icon('user-plus', { size: 22 })} ${t('registerBtn')}</button>
      </form>

      <button class="btn btn-block mt-12" id="to-login">${icon('log-in', { size: 22 })} ${t('haveAccount')} ${t('loginLink')}</button>
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
    <div class="big-status is-warn">
      <span class="big-icon">${icon('hourglass', { size: 48 })}</span>
      <strong>${t('registerPendingTitle')}</strong>
      <p>${t('registerPendingBody', { role: t(`role_${role}`) })}</p>
    </div>
    <button class="btn btn-primary btn-block mt-16" id="to-login">${icon('log-in', { size: 22 })} ${t('backToLogin')}</button>
  `
  main.querySelector('#to-login').addEventListener('click', () => navigate('#/login'))
}

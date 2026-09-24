// "My profile": see and edit your details, change password, log out.
// Supervisors/admins also get links to their tools here.
//
// Shows the cached profile straight away (works offline), then refreshes
// it from the server in the background.

import { t, getLang } from '../../core/i18n/index.js'
import { getCurrentUser, hasRole } from '../../core/session.js'
import { escapeHtml } from '../../shared/ui/html.js'
import { getRegistrationOptions, updateProfile, changePassword, logout, refreshProfile } from './accountApi.js'
import {
  inputField, selectField, readForm, showFieldErrors, apiErrorText, whileBusy, LANGUAGE_OPTIONS,
} from './formFields.js'

export function renderProfile(main, navigate) {
  const user = getCurrentUser()
  const isOffline = !navigator.onLine

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>

    <div class="account-card" style="margin-top:12px;">
      <div class="profile-head">
        <div class="profile-avatar" aria-hidden="true">${escapeHtml(initials(user.fullName))}</div>
        <div>
          <h2 class="h2-title" style="margin:0;">${escapeHtml(user.fullName)}</h2>
          <p class="subtitle-dim" style="margin:2px 0 0;">${t(`role_${user.role}`)}</p>
        </div>
      </div>
      <div class="kv-row"><span class="k">${t('workIdLabel')}</span><span class="v">${escapeHtml(user.workId)}</span></div>
      <p class="field-hint">${t('workIdLockedNote')}</p>
    </div>

    ${isOffline ? `<p class="note">${t('profileOfflineNote')}</p>` : ''}

    ${hasRole('supervisor', 'admin') ? `
      <div class="account-card">
        <h3 class="account-section" style="margin-top:0;">${t('adminToolsTitle')}</h3>
        <div class="stack">
          <button class="btn" id="to-dashboard">${t('complianceDashboardBtn')}</button>
          ${hasRole('admin') ? `<button class="btn" id="to-users">${t('manageUsersBtn')}</button>` : ''}
        </div>
      </div>
    ` : ''}

    <div class="account-card">
      <h3 class="account-section" style="margin-top:0;">${t('editProfileTitle')}</h3>
      <form id="profile-form" novalidate>
        <p class="form-alert" id="profile-alert" role="alert"></p>
        ${inputField({ name: 'fullName', label: t('fullNameLabel'), value: user.fullName })}
        ${inputField({ name: 'phone', label: t('phoneLabel'), type: 'tel', value: user.phone, attrs: 'inputmode="numeric"' })}
        ${inputField({ name: 'organisation', label: t('organisationLabel'), value: user.organisation })}
        <div id="district-slot">
          ${selectField({ name: 'district', label: t('districtLabel'), options: [{ value: user.district, label: user.district }], value: user.district })}
        </div>
        ${inputField({ name: 'designation', label: t('designationLabel'), value: user.designation })}
        ${inputField({ name: 'uan', label: t('workerUan'), value: user.uan, hint: t('uanFieldHint'), attrs: 'inputmode="numeric"' })}
        ${selectField({ name: 'preferredLang', label: t('preferredLangLabel'), options: LANGUAGE_OPTIONS, value: user.preferredLang })}
        <button class="btn btn-primary btn-block" type="submit" id="save-btn" ${isOffline ? 'disabled' : ''}>${t('saveChangesBtn')}</button>
      </form>
    </div>

    <div class="account-card">
      <h3 class="account-section" style="margin-top:0;">${t('changePasswordTitle')}</h3>
      <form id="password-form" novalidate>
        <p class="form-alert" id="password-alert" role="alert"></p>
        ${inputField({ name: 'currentPassword', label: t('currentPasswordLabel'), type: 'password', attrs: 'autocomplete="current-password"' })}
        ${inputField({ name: 'newPassword', label: t('newPasswordLabel'), type: 'password', hint: t('passwordHint'), attrs: 'autocomplete="new-password"' })}
        ${inputField({ name: 'confirmPassword', label: t('confirmPasswordLabel'), type: 'password', attrs: 'autocomplete="new-password"' })}
        <button class="btn btn-block" type="submit" id="password-btn" ${isOffline ? 'disabled' : ''}>${t('changePasswordBtn')}</button>
      </form>
    </div>

    <button class="btn btn-block account-logout" id="logout-btn">${t('logoutBtn')}</button>
  `

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  main.querySelector('#to-dashboard')?.addEventListener('click', () => navigate('#/admin'))
  main.querySelector('#to-users')?.addEventListener('click', () => navigate('#/users'))
  main.querySelector('#logout-btn').addEventListener('click', async (e) => {
    await whileBusy(e.currentTarget, t('pleaseWait'), logout)
    // The router notices the logout and shows the login screen.
  })

  wireProfileForm(main, navigate)
  wirePasswordForm(main)

  if (!isOffline) {
    fillDistrictOptions(main, user.district)
    refreshProfile()
  }
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// The full district list comes from the server; until it arrives (or when
// offline) the select just shows the user's current district.
async function fillDistrictOptions(main, current) {
  try {
    const { districts } = await getRegistrationOptions()
    main.querySelector('#district-slot').innerHTML = selectField({
      name: 'district',
      label: t('districtLabel'),
      options: districts.map((d) => ({ value: d, label: d })),
      value: current,
    })
  } catch {
    /* keep the single-option select */
  }
}

function wireProfileForm(main, navigate) {
  const form = main.querySelector('#profile-form')
  const alertBox = main.querySelector('#profile-alert')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    alertBox.textContent = ''
    alertBox.classList.remove('form-alert-ok')
    showFieldErrors(form, {})
    const langBefore = getLang()
    try {
      await whileBusy(main.querySelector('#save-btn'), t('pleaseWait'), () => updateProfile(readForm(form)))
      if (getLang() !== langBefore) {
        // Language changed: redraw this screen in the new language.
        renderProfile(main, navigate)
        return
      }
      alertBox.textContent = t('profileSaved')
      alertBox.classList.add('form-alert-ok')
    } catch (err) {
      if (err.code === 'validation') showFieldErrors(form, err.fields)
      else alertBox.textContent = apiErrorText(err)
    }
  })
}

function wirePasswordForm(main) {
  const form = main.querySelector('#password-form')
  const alertBox = main.querySelector('#password-alert')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    alertBox.textContent = ''
    alertBox.classList.remove('form-alert-ok')
    const { currentPassword, newPassword, confirmPassword } = readForm(form)

    const localErrors = {}
    if (!currentPassword) localErrors.currentPassword = 'required'
    if (newPassword !== confirmPassword) localErrors.confirmPassword = 'mismatch'
    showFieldErrors(form, localErrors)
    if (Object.keys(localErrors).length) return

    try {
      await whileBusy(main.querySelector('#password-btn'), t('pleaseWait'), () => changePassword(currentPassword, newPassword))
      form.reset()
      alertBox.textContent = t('passwordChanged')
      alertBox.classList.add('form-alert-ok')
    } catch (err) {
      if (err.code === 'validation') showFieldErrors(form, err.fields)
      else alertBox.textContent = apiErrorText(err)
    }
  })
}

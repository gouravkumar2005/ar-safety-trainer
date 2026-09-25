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
import { icon } from '../../shared/ui/icon.js'

export function renderProfile(main, navigate) {
  const user = getCurrentUser()
  const isOffline = !navigator.onLine

  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>

    <div class="account-card mt-8">
      <div class="profile-head">
        <div class="profile-avatar" aria-hidden="true">${escapeHtml(initials(user.fullName))}</div>
        <div>
          <h2>${escapeHtml(user.fullName)}</h2>
          <span class="badge badge-info mt-8">${icon('id-card', { size: 14 })} ${t(`role_${user.role}`)}</span>
        </div>
      </div>
      <div class="kv-row">
        <span class="k">${icon('id-card', { size: 18 })} ${t('workIdLabel')}</span>
        <span class="v">${escapeHtml(user.workId)} ${icon('lock', { size: 16, cls: 'status-dim', label: t('workIdLockedNote') })}</span>
      </div>
    </div>

    ${isOffline ? `<p class="note">${icon('wifi-off', { size: 16 })} ${t('profileOfflineNote')}</p>` : ''}

    ${hasRole('supervisor', 'admin') ? `
      <h3 class="section-title">${t('adminToolsTitle')}</h3>
      <div class="tile-grid">
        <button class="tile" id="to-dashboard">
          <span class="tile-icon">${icon('chart-column', { size: 28 })}</span>
          <span class="tile-label">${t('complianceDashboardBtn')}</span>
        </button>
        ${hasRole('admin') ? `
        <button class="tile is-saffron" id="to-users">
          <span class="tile-icon">${icon('user-cog', { size: 28 })}</span>
          <span class="tile-label">${t('manageUsersBtn')}</span>
        </button>` : ''}
      </div>
    ` : ''}

    <details class="account-card mt-16" id="edit-card">
      <summary class="account-section" style="margin:0;cursor:pointer;">${icon('pencil', { size: 20 })} ${t('editProfileTitle')}</summary>
      <form id="profile-form" novalidate class="mt-16">
        <p class="form-alert" id="profile-alert" role="alert"></p>
        ${inputField({ name: 'fullName', label: t('fullNameLabel'), iconName: 'user-round', value: user.fullName })}
        ${inputField({ name: 'phone', label: t('phoneLabel'), type: 'tel', iconName: 'phone', value: user.phone, attrs: 'inputmode="numeric"' })}
        ${inputField({ name: 'organisation', label: t('organisationLabel'), iconName: 'factory', value: user.organisation })}
        <div id="district-slot">
          ${selectField({ name: 'district', label: t('districtLabel'), iconName: 'map-pin', options: [{ value: user.district, label: user.district }], value: user.district })}
        </div>
        ${inputField({ name: 'designation', label: t('designationLabel'), iconName: 'hard-hat', value: user.designation })}
        ${inputField({ name: 'uan', label: t('workerUan'), iconName: 'badge-check', value: user.uan, attrs: 'inputmode="numeric"' })}
        ${selectField({ name: 'preferredLang', label: t('preferredLangLabel'), iconName: 'languages', options: LANGUAGE_OPTIONS, value: user.preferredLang })}
        <button class="btn btn-primary btn-block" type="submit" id="save-btn" ${isOffline ? 'disabled' : ''}>${icon('save', { size: 22 })} ${t('saveChangesBtn')}</button>
      </form>
    </details>

    <details class="account-card">
      <summary class="account-section" style="margin:0;cursor:pointer;">${icon('key-round', { size: 20 })} ${t('changePasswordTitle')}</summary>
      <form id="password-form" novalidate class="mt-16">
        <p class="form-alert" id="password-alert" role="alert"></p>
        ${inputField({ name: 'currentPassword', label: t('currentPasswordLabel'), type: 'password', iconName: 'key-round', attrs: 'autocomplete="current-password"' })}
        ${inputField({ name: 'newPassword', label: t('newPasswordLabel'), type: 'password', iconName: 'key-round', hint: t('passwordHint'), attrs: 'autocomplete="new-password"' })}
        ${inputField({ name: 'confirmPassword', label: t('confirmPasswordLabel'), type: 'password', iconName: 'key-round', attrs: 'autocomplete="new-password"' })}
        <button class="btn btn-block" type="submit" id="password-btn" ${isOffline ? 'disabled' : ''}>${icon('key-round', { size: 22 })} ${t('changePasswordBtn')}</button>
      </form>
    </details>

    <button class="btn btn-block account-logout" id="logout-btn">${icon('log-out', { size: 22 })} ${t('logoutBtn')}</button>
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
      iconName: 'map-pin',
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

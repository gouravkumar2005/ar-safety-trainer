// Small helpers shared by the account forms: render a labelled field with a
// slot for its error, read a form's values, and show the server's
// per-field error codes as translated messages.
//
// Each input's `name` is the API field name (fullName, phone, ...), so the
// server's { fields: { phone: 'taken' } } maps straight onto the form.

import { t, hasString } from '../../core/i18n/index.js'
import { escapeHtml } from '../../shared/ui/html.js'

// Language names are shown in their own script, whatever the UI language.
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
]

export function inputField({ name, label, type = 'text', value = '', hint = '', attrs = '' }) {
  const id = `acc-${name}`
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" name="${name}" type="${type}" value="${escapeHtml(value)}"
        aria-describedby="${id}-error${hint ? ` ${id}-hint` : ''}" ${attrs} />
      ${hint ? `<p class="field-hint" id="${id}-hint">${hint}</p>` : ''}
      <p class="field-error" id="${id}-error" role="alert"></p>
    </div>
  `
}

// options: [{ value, label }]
export function selectField({ name, label, options, value = '', placeholder = '' }) {
  const id = `acc-${name}`
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <select id="${id}" name="${name}" aria-describedby="${id}-error">
        ${placeholder ? `<option value="" disabled ${value ? '' : 'selected'}>${placeholder}</option>` : ''}
        ${options.map((o) => `
          <option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>
        `).join('')}
      </select>
      <p class="field-error" id="${id}-error" role="alert"></p>
    </div>
  `
}

export function checkboxField({ name, label }) {
  const id = `acc-${name}`
  return `
    <div class="field">
      <label class="field-check" for="${id}">
        <input id="${id}" name="${name}" type="checkbox" aria-describedby="${id}-error" />
        <span>${label}</span>
      </label>
      <p class="field-error" id="${id}-error" role="alert"></p>
    </div>
  `
}

// { fieldName: value } for every named input; checkboxes become booleans,
// and a radio group gives the value of its checked option.
export function readForm(form) {
  const values = {}
  for (const el of form.elements) {
    if (!el.name) continue
    if (el.type === 'radio') {
      if (el.checked) values[el.name] = el.value
    } else {
      values[el.name] = el.type === 'checkbox' ? el.checked : el.value
    }
  }
  return values
}

// "phone" + "taken" -> "This mobile number is already registered".
// Uses a field-specific message when one exists, else a generic one.
export function fieldErrorText(field, code) {
  if (hasString(`err_${field}_${code}`)) return t(`err_${field}_${code}`)
  if (hasString(`err_${code}`)) return t(`err_${code}`)
  return t('err_invalid')
}

// Shows `errors` ({ field: code }) on the form and focuses the first bad
// field. Fields not in `errors` are cleared.
export function showFieldErrors(form, errors = {}) {
  let first = null
  for (const el of form.elements) {
    if (!el.name) continue
    const code = errors[el.name]
    const slot = form.querySelector(`#acc-${el.name}-error`)
    el.setAttribute('aria-invalid', code ? 'true' : 'false')
    if (slot) slot.textContent = code ? fieldErrorText(el.name, code) : ''
    if (code && !first) first = el
  }
  first?.focus()
}

// A whole-form message for an ApiError (network down, wrong password...).
export function apiErrorText(err) {
  return hasString(`api_${err.code}`) ? t(`api_${err.code}`) : t('api_generic')
}

// Disables the submit button and shows a busy label while `task` runs.
export async function whileBusy(button, busyLabel, task) {
  const label = button.textContent
  button.disabled = true
  button.textContent = busyLabel
  try {
    return await task()
  } finally {
    button.disabled = false
    button.textContent = label
  }
}

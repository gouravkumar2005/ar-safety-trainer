import { t, pick } from '../../core/i18n/index.js'
import { modules } from '../../content/modules.js'
import { grievanceCategories } from './grievanceCategories.js'
import { state } from '../../core/state.js'
import * as ledger from '../../core/ledger.js'
import { escapeHtml } from '../../shared/ui/html.js'
import { icon } from '../../shared/ui/icon.js'

// One picture per category (values from grievanceCategories.js).
const CATEGORY_ICONS = {
  hazard: 'triangle-alert',
  'training-content': 'file-text',
  'harassment-or-conduct': 'shield-alert',
  other: 'message-square-warning',
}

// CPGRAMS-style "report a concern" channel — identity fields are all
// optional by design (forcing a name/ID on a hazard report risks
// suppressing honest reporting). Stored as a ledger entry
// (GRIEVANCE_SUBMITTED) alongside CERT_ISSUED/QUIZ_COMPLETED — same
// tamper-evident, append-only mechanism, not a second storage system.

export function renderGrievance(main, navigate) {
  const activeModules = modules.filter((m) => m.status !== 'locked')

  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>
    <div class="page-head">
      <span class="head-icon is-saffron">${icon('message-square-warning', { size: 30 })}</span>
      <div><h2>${t('grievanceHeading')}</h2><p>${icon('shield-check', { size: 14 })} ${t('grievanceAnonShort')}</p></div>
    </div>

    <!-- Category as picture tiles (radio group) instead of a dropdown. -->
    <fieldset class="field role-choices" style="margin-bottom:14px;">
      <legend>${t('grievanceCategoryLabel')}</legend>
      <div class="tile-grid">
        ${grievanceCategories.map((c, i) => `
          <label class="tile ${i === 0 ? 'is-selected' : ''}" style="min-height:112px;">
            <input type="radio" name="grv-category" value="${c.value}" class="sr-only" ${i === 0 ? 'checked' : ''} />
            <span class="tile-icon" style="width:52px;height:52px;">${icon(CATEGORY_ICONS[c.value] || 'message-square-warning', { size: 26 })}</span>
            <span class="tile-label" style="font-size:0.8125rem;">${pick(c.label)}</span>
          </label>`).join('')}
      </div>
    </fieldset>

    <div class="field">
      <label for="grv-desc">${t('grievanceDescLabel')}</label>
      <textarea id="grv-desc" class="ta" style="font-family:inherit;"></textarea>
    </div>

    <details class="module-card">
      <summary class="row" style="cursor:pointer;font-weight:700;">${icon('user-round', { size: 20 })} ${t('grievanceOptionalDetails')}</summary>
      <div class="mt-12">
        <div class="field">
          <label for="grv-module">${t('grievanceModuleLabel')}</label>
          <div class="input-icon">${icon('box', { size: 20 })}<select id="grv-module">
            <option value="">${t('grievanceModuleNone')}</option>
            ${activeModules.map((m) => `<option value="${m.id}">${pick(m.shortTitle || m.title)}</option>`).join('')}
          </select></div>
        </div>
        <div class="field">
          <label for="grv-name">${t('workerName')}</label>
          <div class="input-icon">${icon('user-round', { size: 20 })}<input id="grv-name" type="text" value="${escapeHtml(state.worker.name)}" /></div>
        </div>
        <div class="field">
          <label for="grv-id">${t('workerId')}</label>
          <div class="input-icon">${icon('id-card', { size: 20 })}<input id="grv-id" type="text" value="${escapeHtml(state.worker.id)}" /></div>
        </div>
        <div class="field" style="margin-bottom:0;">
          <label for="grv-contact">${t('grievanceContactLabel')}</label>
          <div class="input-icon">${icon('phone', { size: 20 })}<input id="grv-contact" type="text" /></div>
        </div>
      </div>
    </details>

    <button class="btn btn-accent btn-block mt-8" id="submit-btn">${icon('upload', { size: 22 })} ${t('grievanceSubmitBtn')}</button>
    <div id="confirm-root"></div>
  `

  // Highlight the chosen category tile.
  main.querySelectorAll('input[name="grv-category"]').forEach((input) => {
    input.addEventListener('change', () => {
      main.querySelectorAll('input[name="grv-category"]').forEach((i) => i.closest('.tile').classList.toggle('is-selected', i.checked))
    })
  })

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  main.querySelector('#submit-btn').addEventListener('click', async () => {
    const btn = main.querySelector('#submit-btn')
    btn.disabled = true
    const entry = await ledger.append('GRIEVANCE_SUBMITTED', {
      category: main.querySelector('input[name="grv-category"]:checked')?.value || 'other',
      moduleId: main.querySelector('#grv-module').value || null,
      description: main.querySelector('#grv-desc').value.trim(),
      workerName: main.querySelector('#grv-name').value.trim(),
      workerId: main.querySelector('#grv-id').value.trim(),
      contact: main.querySelector('#grv-contact').value.trim(),
    })
    renderConfirmation(entry.seq)
  })

  function renderConfirmation(seq) {
    main.innerHTML = `
      <div class="big-status is-good">
        <span class="big-icon">${icon('circle-check', { size: 52 })}</span>
        <strong>${t('grievanceSubmittedTitle')}</strong>
        <span class="badge badge-info" style="font-size:1rem;">${icon('file-text', { size: 16 })} GRV-${seq}</span>
        <p>${t('grievanceSubmittedDetail')}</p>
      </div>
      <button class="btn btn-primary btn-block mt-16" id="done-btn">${icon('house', { size: 22 })} ${t('backToModules')}</button>
    `
    main.querySelector('#done-btn').addEventListener('click', () => navigate('#/'))
  }
}

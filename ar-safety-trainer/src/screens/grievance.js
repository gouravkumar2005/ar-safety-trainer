import { t, pick } from '../utils/i18n.js'
import { modules } from '../data/modules.js'
import { grievanceCategories } from '../data/grievanceCategories.js'
import { state } from '../utils/state.js'
import * as ledger from '../utils/ledger.js'

// CPGRAMS-style "report a concern" channel — identity fields are all
// optional by design (forcing a name/ID on a hazard report risks
// suppressing honest reporting). Stored as a ledger entry
// (GRIEVANCE_SUBMITTED) alongside CERT_ISSUED/QUIZ_COMPLETED — same
// tamper-evident, append-only mechanism, not a second storage system.

export function renderGrievance(main, navigate) {
  const activeModules = modules.filter((m) => m.status !== 'locked')

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
    <h2 class="h2-title" style="margin:12px 0 2px;">${t('grievanceHeading')}</h2>
    <p class="subtitle-dim" style="margin:0 0 16px;">${t('grievanceSubheading')}</p>

    <div class="field">
      <label for="grv-category">${t('grievanceCategoryLabel')}</label>
      <select id="grv-category" class="ta" style="min-height:auto;padding:12px 14px;">
        ${grievanceCategories.map((c) => `<option value="${c.value}">${pick(c.label)}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label for="grv-module">${t('grievanceModuleLabel')}</label>
      <select id="grv-module" class="ta" style="min-height:auto;padding:12px 14px;">
        <option value="">${t('grievanceModuleNone')}</option>
        ${activeModules.map((m) => `<option value="${m.id}">${pick(m.title)}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label for="grv-desc">${t('grievanceDescLabel')}</label>
      <textarea id="grv-desc" class="ta"></textarea>
    </div>

    <p class="hint" style="text-align:left;">${t('grievanceAnonHint')}</p>

    <div class="field">
      <label for="grv-name">${t('workerName')}</label>
      <input id="grv-name" type="text" value="${state.worker.name}" />
    </div>
    <div class="field">
      <label for="grv-id">${t('workerId')}</label>
      <input id="grv-id" type="text" value="${state.worker.id}" />
    </div>
    <div class="field">
      <label for="grv-contact">${t('grievanceContactLabel')}</label>
      <input id="grv-contact" type="text" />
    </div>

    <button class="btn btn-accent btn-block" id="submit-btn">${t('grievanceSubmitBtn')}</button>
    <div id="confirm-root"></div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  main.querySelector('#submit-btn').addEventListener('click', async () => {
    const btn = main.querySelector('#submit-btn')
    btn.disabled = true
    const entry = await ledger.append('GRIEVANCE_SUBMITTED', {
      category: main.querySelector('#grv-category').value,
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
      <div class="result-box result-valid">
        <h4>✅ ${t('grievanceSubmittedTitle')}</h4>
        <p>${t('grievanceSubmittedDetail')}</p>
        <p style="margin-top:8px;font-weight:700;">${t('grievanceRefLabel')}: GRV-${seq}</p>
      </div>
      <button class="btn btn-block" id="done-btn" style="margin-top:16px;">${t('backToModules')}</button>
    `
    main.querySelector('#done-btn').addEventListener('click', () => navigate('#/'))
  }
}

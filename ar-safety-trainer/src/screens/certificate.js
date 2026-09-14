import { getModule } from '../data/modules.js'
import { t, pick } from '../utils/i18n.js'
import { getResult, state, setWorker } from '../utils/state.js'
import { buildCertificatePayload, certificateToQrDataUrl } from '../utils/certificate.js'
import { playCertChime } from '../utils/sound.js'

export function renderCertificate(main, navigate, params) {
  const mod = getModule(params.id)
  const result = getResult(params.id)
  if (!mod || !result || !result.passed) {
    navigate('#/')
    return
  }

  renderForm()

  function renderForm() {
    main.innerHTML = `
      <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
      <h2 class="h2-title" style="margin:12px 0 16px;">${t('getCertificate')}</h2>

      <div class="field">
        <label for="worker-name">${t('workerName')}</label>
        <input id="worker-name" type="text" value="${state.worker.name}" placeholder="e.g. Sunita Murmu" />
      </div>
      <div class="field">
        <label for="worker-id">${t('workerId')}</label>
        <input id="worker-id" type="text" value="${state.worker.id}" placeholder="e.g. JH-MINE-00214" />
      </div>
      <div class="field">
        <label for="worker-uan">${t('workerUan')}</label>
        <input id="worker-uan" type="text" value="${state.worker.uan || ''}" placeholder="e.g. 12-3456-7890-1234" />
        <p class="hint" style="text-align:left;margin-top:4px;">${t('uanFieldHint')}</p>
      </div>

      <button class="btn btn-accent btn-block" id="gen-btn">${t('generateCert')}</button>
    `
    main.querySelector('#back').addEventListener('click', () => navigate(`#/module/${mod.id}/result`))
    main.querySelector('#gen-btn').addEventListener('click', async () => {
      const name = main.querySelector('#worker-name').value.trim()
      const id = main.querySelector('#worker-id').value.trim()
      const uan = main.querySelector('#worker-uan').value.trim()
      if (!name || !id) return
      setWorker(name, id, uan)
      await renderCert(name, id, uan)
    })
  }

  async function renderCert(name, id, uan) {
    main.innerHTML = `<p class="hint">…</p>`
    const cert = await buildCertificatePayload({
      workerName: name,
      workerId: id,
      uan,
      moduleId: mod.id,
      score: result.score,
      total: result.total,
      nsqf: mod.nsqf,
    })
    const qrUrl = await certificateToQrDataUrl(cert)
    const certJson = JSON.stringify(cert)
    const fields = cert.payload
    playCertChime()

    main.innerHTML = `
      <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
      <div class="cert-card" style="margin-top:14px;">
        <div class="cert-label">${t('certTitle')}</div>
        <div class="cert-value cert-value-lg">${name}</div>

        <img src="${qrUrl}" width="180" height="180" alt="${t('certScanNote')}" />

        <div class="cert-label">${t('certModule')}</div>
        <div class="cert-value">${pick(mod.title)}</div>

        <div class="cert-label">${t('certScore')}</div>
        <div class="cert-value">${result.score}/${result.total}</div>

        ${fields.uan ? `
          <div class="cert-label">${t('certUanLabel')}</div>
          <div class="cert-value">${fields.uan}</div>
          <p class="hint">${t('certUanNote')}</p>
        ` : ''}

        ${fields.nsqf ? `
          <div class="cert-label">${t('certNsqfLabel')}</div>
          <div class="cert-value">${fields.nsqf.level} — ${pick(fields.nsqf.competency)}</div>
        ` : ''}

        <div class="cert-label">${t('certIssued')}</div>
        <div class="cert-value">${new Date(cert.timestamp).toLocaleString()}</div>

        <div class="cert-label">${t('certLedgerEntry')}</div>
        <div class="cert-value">#${cert.seq}</div>

        <p class="hint">${t('certScanNote')}</p>
      </div>

      ${fields.nsqf ? `<div class="note">${t('nsqfDisclaimerNote')}</div>` : ''}
      <div class="note">${t('demoSignatureNote')}</div>

      <div class="module-card" style="margin-top:12px;">
        <span class="badge badge-locked">${t('digilockerStatusBadge')}</span>
        <button class="btn" disabled style="width:fit-content;">${t('digilockerBtn')}</button>
        <p>${t('digilockerNote')}</p>
      </div>

      <div class="stack" style="margin-top:16px;">
        <button class="btn" id="copy-btn">${t('certCopyJson')}</button>
        <button class="btn" id="verify-btn">${t('certGoVerify')}</button>
        <button class="btn btn-block" id="done-btn">${t('backToModules')}</button>
      </div>
    `
    main.querySelector('#back').addEventListener('click', () => navigate(`#/module/${mod.id}/result`))
    main.querySelector('#done-btn').addEventListener('click', () => navigate('#/'))
    main.querySelector('#verify-btn').addEventListener('click', () => navigate('#/verify'))
    main.querySelector('#copy-btn').addEventListener('click', async () => {
      const btn = main.querySelector('#copy-btn')
      try {
        await navigator.clipboard.writeText(certJson)
        btn.textContent = t('certCopied')
      } catch {
        // Clipboard API needs a secure context; fall back to a selectable textarea.
        const ta = document.createElement('textarea')
        ta.value = certJson
        ta.readOnly = true
        ta.style.cssText = 'width:100%;height:100px;margin-top:8px;'
        btn.after(ta)
        ta.select()
      }
      setTimeout(() => { btn.textContent = t('certCopyJson') }, 1500)
    })
  }
}

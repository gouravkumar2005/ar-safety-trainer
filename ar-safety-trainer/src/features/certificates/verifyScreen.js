import { t } from '../../core/i18n/index.js'
import { verifyStandalone, verifyOnChain } from './certificate.js'

// Paste-first verifier: reliable with zero extra dependency, works from
// just a certificate's QR/JSON text. This is the "watch it catch
// tampering live" demo screen — paste a real cert -> VALID, hand-edit one
// character -> TAMPERED.

export function renderVerify(main, navigate) {
  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
    <h2 class="h2-title" style="margin:12px 0 2px;">${t('verifyHeading')}</h2>
    <p class="subtitle-dim" style="margin:0 0 14px;">${t('verifySubheading')}</p>

    <div class="field">
      <label for="cert-input">${t('verifyPasteLabel')}</label>
      <textarea class="ta" id="cert-input" placeholder='{"certId": "...", "seq": 0, ...}'></textarea>
    </div>

    <button class="btn btn-primary btn-block" id="check-btn">${t('verifyBtn')}</button>

    <div id="result-root"></div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  main.querySelector('#check-btn').addEventListener('click', () => runCheck())

  async function runCheck() {
    const raw = main.querySelector('#cert-input').value.trim()
    const resultRoot = main.querySelector('#result-root')
    resultRoot.innerHTML = ''
    if (!raw) return

    let cert
    try {
      cert = JSON.parse(raw)
    } catch {
      resultRoot.innerHTML = boxHtml('warn', t('verifyResultTampered'), t('verifyParseError'))
      return
    }

    try {
      const standaloneOk = await verifyStandalone(cert)
      if (!standaloneOk) {
        resultRoot.innerHTML = boxHtml('tampered', `❌ ${t('verifyResultTampered')}`, t('verifyResultTamperedDetail'))
        return
      }

      const chain = await verifyOnChain(cert)
      if (!chain.onThisDevice) {
        resultRoot.innerHTML = boxHtml('warn', `✅ ${t('verifyResultValid')}`, `${t('verifyResultValidDetail')} ${t('verifyUnknownDevice')}`)
        return
      }
      if (!chain.valid) {
        resultRoot.innerHTML = boxHtml(
          'tampered',
          `❌ ${t('verifyResultTampered')}`,
          t('verifyChainBroken', { n: chain.brokenAtSeq })
        )
        return
      }

      resultRoot.innerHTML = boxHtml(
        'valid',
        `✅ ${t('verifyResultValid')}`,
        `${t('verifyResultValidDetail')} ${t('verifyChainIntact', { n: chain.totalEntries })}`
      )
    } catch {
      resultRoot.innerHTML = boxHtml('warn', t('verifyResultTampered'), t('verifyParseError'))
    }
  }
}

function boxHtml(kind, title, detail) {
  const cls = kind === 'valid' ? 'result-valid' : kind === 'tampered' ? 'result-tampered' : 'result-warn'
  return `
    <div class="result-box ${cls}">
      <h4>${title}</h4>
      <p>${detail}</p>
    </div>
  `
}

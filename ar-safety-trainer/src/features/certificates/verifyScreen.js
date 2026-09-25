import { t } from '../../core/i18n/index.js'
import { verifyStandalone, verifyOnChain } from './certificate.js'
import { icon } from '../../shared/ui/icon.js'

// Paste-first verifier: reliable with zero extra dependency, works from
// just a certificate's QR/JSON text. This is the "watch it catch
// tampering live" demo screen — paste a real cert -> VALID, hand-edit one
// character -> TAMPERED.

export function renderVerify(main, navigate) {
  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>
    <div class="page-head">
      <span class="head-icon is-green">${icon('scan-qr-code', { size: 30 })}</span>
      <div><h2>${t('verifyHeading')}</h2><p>${t('verifySubheading')}</p></div>
    </div>

    <div class="field">
      <label for="cert-input">${t('verifyPasteLabel')}</label>
      <textarea class="ta" id="cert-input" placeholder='{"certId": "...", "seq": 0, ...}'></textarea>
    </div>

    <button class="btn btn-primary btn-block" id="check-btn">${icon('shield-check', { size: 22 })} ${t('verifyBtn')}</button>

    <div id="result-root" aria-live="polite"></div>
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
      resultRoot.innerHTML = boxHtml('error', t('verifyParseErrorTitle'), t('verifyParseError'))
      return
    }

    try {
      const standaloneOk = await verifyStandalone(cert)
      if (!standaloneOk) {
        resultRoot.innerHTML = boxHtml('tampered', t('verifyResultTampered'), t('verifyResultTamperedDetail'))
        return
      }

      const chain = await verifyOnChain(cert)
      if (!chain.onThisDevice) {
        resultRoot.innerHTML = boxHtml('warn', t('verifyResultValid'), `${t('verifyResultValidDetail')} ${t('verifyUnknownDevice')}`)
        return
      }
      if (!chain.valid) {
        resultRoot.innerHTML = boxHtml(
          'tampered',
          t('verifyResultTampered'),
          t('verifyChainBroken', { n: chain.brokenAtSeq })
        )
        return
      }

      resultRoot.innerHTML = boxHtml(
        'valid',
        t('verifyResultValid'),
        `${t('verifyResultValidDetail')} ${t('verifyChainIntact', { n: chain.totalEntries })}`
      )
    } catch {
      resultRoot.innerHTML = boxHtml('error', t('verifyParseErrorTitle'), t('verifyParseError'))
    }
  }
}

// One big picture result: a shield (valid / tampered) or an alert icon,
// one word, and the detail in small text underneath.
function boxHtml(kind, title, detail) {
  const look = {
    valid: { cls: 'is-good', icon: 'shield-check' },
    warn: { cls: 'is-good', icon: 'shield-check' },
    tampered: { cls: 'is-bad', icon: 'shield-alert' },
    error: { cls: 'is-warn', icon: 'circle-alert' },
  }[kind]
  return `
    <div class="big-status ${look.cls}">
      <span class="big-icon">${icon(look.icon, { size: 52 })}</span>
      <strong>${title}</strong>
      <p>${detail}</p>
    </div>
  `
}
